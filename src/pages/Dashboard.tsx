import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Subscription } from '../types'
import { useStore } from '../store/StoreContext'
import { computeTotals, costPerCycle, monthlyCost, monthlyCostAfterTrial, postTrialPrice, upcomingAlerts } from '../lib/calc'
import { diffDays, formatDate, formatDday } from '../lib/date'
import { formatWon } from '../lib/format'
import PaymentCalendar from '../components/PaymentCalendar'
import SubscriptionTable, { type TableRow } from '../components/SubscriptionTable'
import { Icon, PageHeader, Stat, StatusBadge, TimePill } from '../components/ui'
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

function cycleNote(sub: Subscription, perCycle: number): string | undefined {
  return sub.cycleMonths > 1 ? `${sub.cycleMonths}개월 ${formatWon(perCycle)}` : undefined
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

  const totals = computeTotals(data.subscriptions)
  const alerts = upcomingAlerts(data.subscriptions, today)

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
        amountNote: isTrial ? cycleNote(sub, costPerCycle(sub, postTrialPrice(sub))) : sub.status === 'active' ? cycleNote(sub, costPerCycle(sub)) : undefined,
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

      {data.subscriptions.length === 0 ? (
        <div className="panel t-reveal p-6 text-center">
          <p className="text-lg font-semibold">아직 등록된 구독이 없어요</p>
          <p className="mt-1 text-sm text-ink-2">쓰고 있는 구독을 추가하면 이번 달 실부담과 결제일을 한눈에 볼 수 있어요.</p>
          <Link to="/subscriptions/new" className="btn-primary mt-4">
            <Icon name="plus" size={16} />첫 구독 추가
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented label="정렬" value={sort} onChange={setSort} options={SORTS} className="w-full sm:w-auto" />
            <p className="text-sm text-ink-2">구독 {data.subscriptions.length}개</p>
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-2">
            <SubscriptionTable title="구독중" rows={current} dateLabel="다음 결제" amountLabel="월 실부담" totalLabel="월 합계" empty="구독중인 서비스가 없어요" />
            <SubscriptionTable title="무료체험·임시구독" rows={temporary} dateLabel="종료일" amountLabel="종료 후 월 금액" totalLabel="종료 후 월 합계" empty="무료체험이나 임시구독이 없어요" />
          </div>
        </>
      )}

      <PaymentCalendar subscriptions={data.subscriptions} today={today} />
    </div>
  )
}
