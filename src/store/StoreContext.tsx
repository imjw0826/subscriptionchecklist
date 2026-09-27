import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppData, Benefit, BenefitUse, PaymentMethod, Subscription, TableName, UsageLog } from '../types'
import { emptyData, type Repository } from './repo'
import { subscriptionsToRoll } from '../lib/calc'
import { todayISO } from '../lib/date'

interface Store {
  data: AppData
  loading: boolean
  error: string | null
  today: string
  mode: Repository['kind']
  saveSubscription(sub: Subscription, benefits?: Benefit[]): Promise<void>
  deleteSubscription(id: string): Promise<void>
  savePaymentMethod(pm: PaymentMethod): Promise<void>
  deletePaymentMethod(id: string): Promise<void>
  addBenefitUse(use: BenefitUse): Promise<void>
  deleteBenefitUse(id: string): Promise<void>
  saveUsageLog(log: UsageLog): Promise<void>
  deleteUsageLog(id: string): Promise<void>
  dismissError(): void
}

const Ctx = createContext<Store | null>(null)

type Row = { id: string }

function upsertList<T extends Row>(list: T[], rows: T[]): T[] {
  const next = [...list]
  for (const row of rows) {
    const i = next.findIndex((r) => r.id === row.id)
    if (i >= 0) next[i] = row
    else next.push(row)
  }
  return next
}

export function StoreProvider({ repo, children }: { repo: Repository; children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [today, setToday] = useState(todayISO)
  const dataRef = useRef(data)
  dataRef.current = data

  // 자정이 지나면 "오늘"을 갱신 (월 초 체크 리셋, D-day 계산)
  useEffect(() => {
    const t = setInterval(() => setToday(todayISO()), 60_000)
    return () => clearInterval(t)
  }, [])

  const run = useCallback(async (fn: () => Promise<void>) => {
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      throw e
    }
  }, [])

  // 로컬 상태를 먼저 바꾸고(낙관적 업데이트) 저장소에 반영
  const apply = useCallback(
    async (changes: { upsert?: Partial<{ [K in TableName]: AppData[K] }>; remove?: Partial<Record<TableName, string[]>> }) => {
      setData((prev) => {
        const next = { ...prev }
        for (const [t, rows] of Object.entries(changes.upsert ?? {})) {
          const table = t as TableName
          ;(next[table] as Row[]) = upsertList(prev[table] as Row[], rows as Row[])
        }
        for (const [t, ids] of Object.entries(changes.remove ?? {})) {
          const table = t as TableName
          ;(next[table] as Row[]) = (next[table] as Row[]).filter((r) => !ids!.includes(r.id))
        }
        return next
      })
      await run(async () => {
        // 부모 → 자식 순서로 저장, 자식 → 부모 순서로 삭제
        const order: TableName[] = ['paymentMethods', 'subscriptions', 'benefits', 'benefitUses', 'usageLogs']
        for (const t of order) {
          const rows = changes.upsert?.[t]
          if (rows?.length) await repo.upsert(t, rows as unknown as ({ id: string } & Record<string, unknown>)[])
        }
        for (const t of [...order].reverse()) {
          const ids = changes.remove?.[t]
          if (ids?.length) await repo.remove(t, ids)
        }
      })
    },
    [repo, run],
  )

  useEffect(() => {
    let cancelled = false
    repo
      .loadAll()
      .then(async (loaded) => {
        if (cancelled) return
        setData(loaded)
        setLoading(false)
        const rolled = subscriptionsToRoll(loaded.subscriptions, todayISO())
        if (rolled.length) await apply({ upsert: { subscriptions: rolled } })
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [repo, apply])

  // 날짜가 바뀌면 지난 결제일 다시 갱신
  useEffect(() => {
    if (loading) return
    const rolled = subscriptionsToRoll(dataRef.current.subscriptions, today)
    if (rolled.length) apply({ upsert: { subscriptions: rolled } }).catch(() => {})
  }, [today, loading, apply])

  const store = useMemo<Store>(() => {
    const d = () => dataRef.current
    return {
      data,
      loading,
      error,
      today,
      mode: repo.kind,
      async saveSubscription(sub, benefits) {
        if (!benefits) return apply({ upsert: { subscriptions: [sub] } })
        const keep = new Set(benefits.map((b) => b.id))
        const removed = d().benefits.filter((b) => b.subscriptionId === sub.id && !keep.has(b.id)).map((b) => b.id)
        const removedUses = d().benefitUses.filter((u) => removed.includes(u.benefitId)).map((u) => u.id)
        return apply({
          upsert: { subscriptions: [sub], benefits },
          remove: { benefits: removed, benefitUses: removedUses },
        })
      },
      async deleteSubscription(id) {
        const cur = d()
        return apply({
          remove: {
            subscriptions: [id],
            benefits: cur.benefits.filter((b) => b.subscriptionId === id).map((b) => b.id),
            benefitUses: cur.benefitUses.filter((u) => u.subscriptionId === id).map((u) => u.id),
            usageLogs: cur.usageLogs.filter((l) => l.subscriptionId === id).map((l) => l.id),
          },
        })
      },
      async savePaymentMethod(pm) {
        return apply({ upsert: { paymentMethods: [pm] } })
      },
      async deletePaymentMethod(id) {
        const unlinked = d()
          .subscriptions.filter((s) => s.paymentMethodId === id)
          .map((s) => ({ ...s, paymentMethodId: null }))
        await apply({ upsert: { subscriptions: unlinked } })
        return apply({ remove: { paymentMethods: [id] } })
      },
      async addBenefitUse(use) {
        return apply({ upsert: { benefitUses: [use] } })
      },
      async deleteBenefitUse(id) {
        return apply({ remove: { benefitUses: [id] } })
      },
      async saveUsageLog(log) {
        return apply({ upsert: { usageLogs: [log] } })
      },
      async deleteUsageLog(id) {
        return apply({ remove: { usageLogs: [id] } })
      },
      dismissError() {
        setError(null)
      },
    }
  }, [data, loading, error, today, repo, apply, run])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('StoreProvider 밖에서 useStore를 호출했습니다')
  return s
}
