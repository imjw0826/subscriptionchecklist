import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Subscription } from '../types'
import { useStore } from '../store/StoreContext'
import { computeTotals, monthlyCost, monthlyCostAfterTrial, paymentsInMonth, upcomingAlerts } from '../lib/calc'
import { diffDays, formatDate, formatDday, monthKey, parseISO } from '../lib/date'
import { formatWon } from '../lib/format'
import PaymentCalendar from '../components/PaymentCalendar'
import SubscriptionTable, { type TableRow } from '../components/SubscriptionTable'
import { Avatar, EmptyState, Icon, MetricCard, PageHeader, StatusBadge, TimePill } from '../components/ui'
import { AnimatedNumber, Segmented } from '../components/motion'

type SortKey = 'date' | 'amount'
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'date', label: '결제일순' },
  { value: 'amount', label: '금액순' },
]

function readSort(): SortKey {
  try {
    return localStorage.getItem('dashboard-sort') === 'amount' ? 'amount' : 'date'
  } catch {
    return 'date'
  }
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

  const { y, m } = parseISO(today)
  const totals = computeTotals(data.subscriptions)
  const alerts = upcomingAlerts(data.subscriptions, today)
  const remaining = useMemo(() => paymentsInMonth(data.subscriptions, monthKey(today)).filter((p) => p.date >= today), [data.subscriptions, today])
  const remainingTotal = remaining.reduce((sum, p) => sum + p.amount, 0)

  const { current, temporary } = useMemo(() => {
    const pmName = new Map(data.paymentMethods.map((p) => [p.id, p.nickname]))
    const toRow = (sub: Subscription): TableRow => {
      const isTrial = sub.status === 'trial'
      const date = isTrial && sub.trialEndDate ? sub.trialEndDate : sub.nextBillingDate
      const days = diffDays(today, date)
      const soon = days <= 3
      return {
        sub,
        paymentName: pmName.get(sub.paymentMethodId ?? '') ?? '결제수단 없음',
        date,
        // 구독중은 지금 내는 월 금액, 체험은 종료 후 금액. 해지예정은 끝나면 더 내지 않으므로 0원
        amount: isTrial ? monthlyCostAfterTrial(sub) : sub.status === 'canceling' ? 0 : monthlyCost(sub),
        badge: <StatusBadge status={sub.status} />,
        dateTag: <TimePill tone={days < 0 || (soon && !isTrial) ? 'danger' : soon ? 'warn' : 'neutral'}>{days < 0 ? '종료됨' : formatDday(days)}</TimePill>,
      }
    }
    const rows = data.subscriptions.map(toRow).sort((a, b) => (sort === 'amount' ? b.amount - a.amount : a.date.localeCompare(b.date)))
    return {
      current: rows.filter((r) => r.sub.status === 'active'),
      temporary: rows.filter((r) => r.sub.status !== 'active'),
    }
  }, [data.subscriptions, data.paymentMethods, today, sort])

  const trialCount = data.subscriptions.filter((s) => s.status === 'trial').length
  const next = remaining[0]

  return (
    <div className="space-y-6">
      <PageHeader title="대시보드" description={`${y}년 ${m}월`}>
        <Link to="/subscriptions/new" className="btn-primary">
          <Icon name="plus" size={16} />새 구독
        </Link>
      </PageHeader>

      {data.subscriptions.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon="list"
            title="아직 등록된 구독이 없어요"
            description="쓰고 있는 구독을 추가하면 이번 달 결제일과 합계를 한눈에 볼 수 있어요."
            action={
              <Link to="/subscriptions/new" className="btn-primary">
                <Icon name="plus" size={16} />첫 구독 추가
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="월 실부담" value={<AnimatedNumber value={totals.monthly} format={formatWon} />} context={`구독중 ${current.length}개`} />
            <MetricCard label="연 환산" value={<AnimatedNumber value={totals.yearly} format={formatWon} />} context="지금 구독 기준 1년" />
            <MetricCard
              label="이번 달 남은 결제"
              value={<AnimatedNumber value={remainingTotal} format={formatWon} />}
              context={next ? `다음 ${formatDate(next.date).slice(5)} ${next.subscription.name}` : '남은 결제가 없어요'}
            />
            <MetricCard label="체험 후 추가" value={<AnimatedNumber value={totals.trialMonthly} format={formatWon} />} context={trialCount ? `무료체험 ${trialCount}개 · 월 금액` : '무료체험 없음'} />
          </div>

          {/* 결제 D-3 이내·체험 종료 임박 */}
          {alerts.length > 0 && (
            <section className="panel divide-y divide-line overflow-hidden" role="status" aria-label="곧 결제되는 구독">
              {alerts.map((a) => (
                <Link key={a.subscription.id + a.kind} to={`/subscriptions/${a.subscription.id}`} className="t-reveal flex items-center gap-3 px-5 py-2.5 transition-colors duration-150 hover:bg-sunken/60">
                  <Avatar name={a.subscription.name} size={24} />
                  <span className="min-w-0 flex-1 text-sm">
                    <b className="font-medium">{a.subscription.name}</b>{' '}
                    <span className="text-ink-2">
                      {a.kind === 'trial'
                        ? a.days < 0
                          ? '무료체험이 끝났어요. 상태를 바꿔 주세요.'
                          : `무료체험이 끝나면 ${formatWon(a.amount)}이 결제돼요.`
                        : `${formatWon(a.amount)}이 결제돼요.`}
                    </span>
                  </span>
                  <TimePill tone={a.kind === 'trial' ? 'warn' : 'danger'}>{a.days < 0 ? '종료됨' : formatDday(a.days)}</TimePill>
                </Link>
              ))}
            </section>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold">구독 목록</h2>
              <Segmented label="정렬" value={sort} onChange={setSort} options={SORTS} />
            </div>
            <SubscriptionTable title="구독중" rows={current} dateLabel="다음 결제" amountLabel="월 실부담" totalLabel="월 합계" empty="구독중인 서비스가 없어요" />
            <SubscriptionTable title="무료체험·임시구독" rows={temporary} dateLabel="종료일" amountLabel="종료 후 월 금액" totalLabel="종료 후 월 합계" empty="무료체험이나 임시구독이 없어요" />
          </div>
        </>
      )}

      <PaymentCalendar subscriptions={data.subscriptions} today={today} />
    </div>
  )
}
