import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Subscription, SubscriptionStatus } from '../types'
import { useStore } from '../store/StoreContext'
import { achievementFor, computeTotals, monthlyCost, monthlyCostAfterTrial, nextPayments, upcomingAlerts } from '../lib/calc'
import { formatDate, formatDday, weekday } from '../lib/date'
import { formatWon } from '../lib/format'
import SubscriptionCard from '../components/SubscriptionCard'
import Backup from '../components/Backup'
import { Avatar, Icon, PageHeader, Stat, TimePill } from '../components/ui'
import { AnimatedNumber, Segmented } from '../components/motion'

type SortKey = 'date' | 'amount'
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'date', label: '결제일순' },
  { value: 'amount', label: '금액순' },
]

const COLUMNS: { status: SubscriptionStatus; title: string }[] = [
  { status: 'active', title: '구독중' },
  { status: 'trial', title: '무료체험' },
  { status: 'canceling', title: '해지예정' },
]

function readSort(): SortKey {
  try {
    return localStorage.getItem('dashboard-sort') === 'amount' ? 'amount' : 'date'
  } catch {
    return 'date'
  }
}

/** 보드 칼럼: 회색 바탕, 제목 + 개수 + 오른쪽 메타, 카드 목록, 하단 추가 버튼 */
function Column({ title, count, meta, tint, children, footer }: { title: string; count?: number; meta?: string; tint?: boolean; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className={`flex flex-col gap-2.5 rounded-3xl p-2.5 ${tint ? 'bg-accent-soft' : 'bg-sunken/70'}`}>
      <header className="flex items-center gap-2 px-1.5 pt-1">
        <h2 className="font-medium">{title}</h2>
        {count != null && <span className="count">{count}</span>}
        {meta && <span className="ml-auto text-xs text-ink-2">{meta}</span>}
      </header>
      {children}
      {footer}
    </section>
  )
}

function AddButton() {
  return (
    <Link to="/subscriptions/new" className="rounded-2xl py-2.5 text-center text-sm text-ink-2 transition hover:bg-ink/5 hover:text-ink">
      + 구독 추가
    </Link>
  )
}

export default function Dashboard() {
  const { data, today } = useStore()
  const [sort, setSortState] = useState<SortKey>(readSort)
  const setSort = (k: SortKey) => {
    setSortState(k)
    try {
      localStorage.setItem('dashboard-sort', k)
    } catch {
      /* 무시 */
    }
  }

  const pmById = useMemo(() => new Map(data.paymentMethods.map((p) => [p.id, p])), [data.paymentMethods])
  const totals = computeTotals(data.subscriptions)
  const alerts = upcomingAlerts(data.subscriptions, today)
  const upcoming = nextPayments(data.subscriptions, today)

  const rows = useMemo(() => {
    const list = data.subscriptions.map((sub) => ({
      sub,
      pct: achievementFor(sub, data, today),
      monthly: sub.status === 'trial' ? monthlyCostAfterTrial(sub) : monthlyCost(sub),
      date: sub.status === 'trial' && sub.trialEndDate ? sub.trialEndDate : sub.nextBillingDate,
    }))
    return list.sort((a, b) => {
      if (sort === 'amount') return b.monthly - a.monthly
      return a.date.localeCompare(b.date)
    })
  }, [data, today, sort])

  const card = (sub: Subscription, pct: number | null) => (
    <SubscriptionCard key={sub.id} sub={sub} pct={pct} pm={sub.paymentMethodId ? pmById.get(sub.paymentMethodId) : undefined} today={today} />
  )

  return (
    <div className="space-y-5">
      <PageHeader title="대시보드">
        <Link to="/subscriptions/new" className="btn-primary">
          <Icon name="plus" size={16} />새 구독
        </Link>
      </PageHeader>

      {/* 이번 달 실부담 총액 */}
      <div className="overflow-hidden rounded-3xl shadow-card">
        <Stat
          icon={<Icon name="wallet" />}
          label="이번 달 실부담"
          large
          value={<AnimatedNumber value={totals.monthly} format={formatWon} />}
          tag={totals.trialMonthly > 0 ? <span className="tag-warn">체험 종료 후 +{formatWon(totals.trialMonthly)}</span> : undefined}
        />
      </div>

      {/* 결제 D-3 이내·체험 종료 임박 배너 */}
      {alerts.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2" role="status">
          {alerts.map((a) => (
            <Link
              key={a.subscription.id + a.kind}
              to={`/subscriptions/${a.subscription.id}`}
              className="t-reveal flex items-start gap-2.5 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn-ink transition hover:brightness-[0.98]"
            >
              <span className="mt-0.5">
                <Icon name="alert" size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <b className="font-medium">
                  {a.subscription.name} · {a.days < 0 ? '종료됨' : formatDday(a.days)}
                </b>
                <br />
                {a.kind === 'trial'
                  ? a.days < 0
                    ? `무료체험이 ${formatDate(a.date)}에 끝났어요. 상태를 바꿔주세요.`
                    : `무료체험이 ${formatDate(a.date)}에 끝나고 ${formatWon(a.amount)}이 결제돼요.`
                  : `${formatDate(a.date)}에 ${formatWon(a.amount)}이 결제돼요.`}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="정렬" value={sort} onChange={setSort} options={SORTS} className="w-full sm:w-auto" />
        <p className="text-sm text-ink-2">구독 {data.subscriptions.length}개</p>
      </div>

      {/* 보드 */}
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const list = rows.filter((r) => r.sub.status === col.status)
          const sum = list.reduce((s, r) => s + r.monthly, 0)
          return (
            <Column
              key={col.status}
              title={col.title}
              count={list.length}
              meta={list.length ? `${col.status === 'trial' ? '종료 후 ' : ''}월 ${formatWon(sum)}` : undefined}
              footer={<AddButton />}
            >
              {list.length === 0 ? <p className="py-4 text-center text-sm text-ink-3">비어 있어요</p> : list.map((r) => card(r.sub, r.pct))}
            </Column>
          )
        })}

        {/* 다음 결제 3건 — 모바일에서는 맨 위로 */}
        <div className="order-first md:order-none">
          <Column title="다음 결제" count={upcoming.length} meta={`오늘 ${formatDate(today).slice(5)}`} tint>
            {upcoming.map((a) => (
              <Link key={a.subscription.id} to={`/subscriptions/${a.subscription.id}`} className="card block p-4 transition hover:-translate-y-0.5">
                <div className="flex items-center gap-2.5">
                  <Avatar name={a.subscription.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{a.subscription.name}</p>
                    <p className="truncate text-xs text-ink-3">
                      {a.kind === 'trial' ? '체험 종료 후 첫 결제' : (pmById.get(a.subscription.paymentMethodId ?? '')?.nickname ?? '정기 결제')}
                    </p>
                  </div>
                  <p className="font-medium">{formatWon(a.amount)}</p>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-ink-3">
                  {formatDate(a.date).slice(5)} ({weekday(a.date)})<TimePill tone={a.days <= 3 ? 'danger' : 'neutral'}>{formatDday(a.days)}</TimePill>
                </div>
              </Link>
            ))}
          </Column>
        </div>
      </div>

      <div className="pt-4">
        <Backup />
      </div>
    </div>
  )
}
