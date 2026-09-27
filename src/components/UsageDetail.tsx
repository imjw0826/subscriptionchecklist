import { useState, type FormEvent } from 'react'
import type { Subscription, UsageLog } from '../types'
import { useStore } from '../store/StoreContext'
import { costPerUnit, monthlyUsage, usageAchievement } from '../lib/calc'
import { formatDate, isSameMonth, weekday } from '../lib/date'
import { formatMinutes, formatNumber, formatWon, newId } from '../lib/format'
import { AchievementGauge, Empty, Field, Modal, NumberInput, Section } from './ui'
import { AnimatedNumber } from './motion'
import { useToast } from './Toast'

export default function UsageDetail({ sub, monthly }: { sub: Subscription; monthly: number }) {
  const { data, today, saveUsageLog, deleteUsageLog } = useStore()
  const toast = useToast()
  const isMinutes = sub.usageUnit === 'minutes'
  const fmt = (v: number) => (isMinutes ? formatMinutes(v) : `${formatNumber(v)}회`)

  const logs = data.usageLogs.filter((l) => l.subscriptionId === sub.id).sort((a, b) => b.date.localeCompare(a.date))
  const usage = monthlyUsage(data.usageLogs, sub.id, today)
  const pct = usageAchievement(usage, sub.usageTarget)
  const unitCost = costPerUnit(monthly, usage, sub.usageUnit)

  const [logDate, setLogDate] = useState(today)
  const [customMinutes, setCustomMinutes] = useState<number | ''>('')
  const [editing, setEditing] = useState<UsageLog | null>(null)
  const [editAmount, setEditAmount] = useState<number | ''>('')
  const [editDate, setEditDate] = useState('')
  const [showAll, setShowAll] = useState(false)

  async function add(amount: number) {
    if (!(amount > 0)) return
    await saveUsageLog({ id: newId(), subscriptionId: sub.id, date: logDate || today, amount: Math.round(amount) })
    toast(`+${fmt(amount)} 기록됨`)
  }

  function openEdit(l: UsageLog) {
    setEditing(l)
    setEditAmount(l.amount)
    setEditDate(l.date)
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault()
    if (!editing || editAmount === '' || editAmount <= 0 || !editDate) return
    await saveUsageLog({ ...editing, amount: Math.round(editAmount), date: editDate })
    setEditing(null)
    toast('기록을 수정했어요')
  }

  const visible = showAll ? logs : logs.filter((l) => isSameMonth(l.date, today))
  const byDay = new Map<string, UsageLog[]>()
  for (const l of visible) byDay.set(l.date, [...(byDay.get(l.date) ?? []), l])

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <section className="panel p-5 md:self-start">
        <AchievementGauge pct={pct} />
        <div className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-2">이번 달 누적</span>
            <AnimatedNumber value={usage} format={fmt} className="font-medium" />
          </div>
          <div className="flex justify-between">
            <span className="text-ink-2">본전 기준</span>
            <b>{sub.usageTarget > 0 ? fmt(sub.usageTarget) : '미설정'}</b>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-2">{isMinutes ? '시간당 비용' : '회당 비용'}</span>
            <b>{unitCost == null ? '—' : formatWon(unitCost)}</b>
          </div>
          {sub.usageTarget > usage && <p className="pt-2 text-center text-xs text-ink-2">본전까지 {fmt(sub.usageTarget - usage)} 남았어요</p>}
        </div>
      </section>

      <div className="space-y-4">
        <Section title="빠른 기록">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-ink-2">날짜</span>
              <input type="date" className="input w-auto py-1.5" value={logDate} max={today} onChange={(e) => setLogDate(e.target.value)} />
            </div>
            {isMinutes ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 60].map((m) => (
                    <button key={m} className="btn-accent py-3 text-base" onClick={() => add(m)}>
                      +{m}분
                    </button>
                  ))}
                </div>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (customMinutes !== '' && customMinutes > 0) {
                      add(customMinutes)
                      setCustomMinutes('')
                    }
                  }}
                >
                  <div className="flex-1">
                    <NumberInput value={customMinutes} onChange={setCustomMinutes} suffix="분" min={1} placeholder="직접 입력 (스크린타임 참고)" />
                  </div>
                  <button className="btn-ghost" disabled={customMinutes === '' || customMinutes <= 0}>
                    기록
                  </button>
                </form>
              </>
            ) : (
              <button className="btn-accent w-full py-4 text-lg" onClick={() => add(1)}>
                +1회
              </button>
            )}
          </div>
        </Section>

        <Section
          title="일별 기록"
          action={
            <button className="text-sm link" onClick={() => setShowAll((v) => !v)}>
              {showAll ? '이번 달만' : '전체 보기'}
            </button>
          }
        >
          {byDay.size === 0 ? (
            <Empty>{showAll ? '기록이 없어요.' : '이번 달 기록이 없어요.'}</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {[...byDay.entries()].map(([date, list]) => (
                <li key={date} className="t-reveal py-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {formatDate(date)} <span className="font-normal text-ink-2">({weekday(date)})</span>
                    </span>
                    <b>{fmt(list.reduce((s, l) => s + l.amount, 0))}</b>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {list.map((l) => (
                      <button key={l.id} className="t-reveal rounded-md bg-sunken px-2 py-1 text-xs text-ink-2 hover:bg-ink/10" onClick={() => openEdit(l)}>
                        {fmt(l.amount)} ✎
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="기록 수정">
        <form onSubmit={submitEdit} className="space-y-4">
          <Field label={isMinutes ? '이용시간' : '횟수'} error={editAmount !== '' && editAmount <= 0 ? '0보다 크게 입력' : undefined}>
            <NumberInput value={editAmount} onChange={setEditAmount} suffix={isMinutes ? '분' : '회'} min={1} autoFocus />
          </Field>
          <Field label="날짜">
            <input type="date" className="input" value={editDate} max={today} onChange={(e) => setEditDate(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-danger"
              onClick={async () => {
                if (editing && confirm('이 기록을 삭제할까요?')) {
                  await deleteUsageLog(editing.id)
                  setEditing(null)
                  toast('기록을 삭제했어요')
                }
              }}
            >
              삭제
            </button>
            <button type="button" className="btn-ghost flex-1" onClick={() => setEditing(null)}>
              취소
            </button>
            <button className="btn-primary flex-1" disabled={editAmount === '' || editAmount <= 0 || !editDate}>
              저장
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
