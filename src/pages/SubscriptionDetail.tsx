import { Link, useParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { costPerCycle, monthlyCost, monthlyCostAfterTrial, postTrialPrice } from '../lib/calc'
import { diffDays, formatDate, formatDday } from '../lib/date'
import { formatWon, paymentLabel } from '../lib/format'
import { Avatar, Icon, MetricCard, PageHeader, StatusBadge, TimePill } from '../components/ui'
import PlanInfo from '../components/PlanInfo'

export default function SubscriptionDetail() {
  const { id } = useParams()
  const { data, today } = useStore()
  const sub = data.subscriptions.find((s) => s.id === id)

  if (!sub) {
    return (
      <p className="py-20 text-center text-ink-2">
        구독을 찾을 수 없어요.{' '}
        <Link to="/" className="link">
          대시보드로
        </Link>
      </p>
    )
  }

  const pm = data.paymentMethods.find((p) => p.id === sub.paymentMethodId)
  const isTrial = sub.status === 'trial'
  const price = isTrial ? postTrialPrice(sub) : sub.listPrice
  const monthly = isTrial ? monthlyCostAfterTrial(sub) : monthlyCost(sub)
  const perCycle = costPerCycle(sub, price)
  const dateLabel = isTrial ? '체험 종료' : sub.status === 'canceling' ? '해지 예정' : '다음 결제'
  const date = isTrial && sub.trialEndDate ? sub.trialEndDate : sub.nextBillingDate
  const days = diffDays(today, date)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        back={
          <Link to="/" className="link mb-2 inline-flex items-center gap-1 text-sm">
            <Icon name="back" size={14} />
            대시보드
          </Link>
        }
        title={
          <span className="flex items-center gap-3">
            <Avatar name={sub.name} size={36} muted={sub.status === 'canceling'} />
            <span className="truncate">{sub.name}</span>
            <StatusBadge status={sub.status} />
          </span>
        }
        description={[sub.category, paymentLabel(pm)].filter(Boolean).join(' · ')}
      >
        <Link to={`/subscriptions/${sub.id}/edit`} className="btn-ghost">
          편집
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        <MetricCard label={isTrial ? '종료 후 정가' : '정가'} value={formatWon(price)} context={`${sub.cycleMonths}개월마다 결제`} />
        <MetricCard label={isTrial ? '종료 후 월 실부담' : '월 실부담'} value={formatWon(monthly)} context={sub.cycleMonths > 1 ? `${sub.cycleMonths}개월 ${formatWon(perCycle)}` : '매달 결제'} />
        <MetricCard
          label={dateLabel}
          value={formatDate(date).slice(5)}
          context={`${formatDate(date).slice(0, 4)}년`}
          chip={<TimePill tone={days <= 3 ? 'danger' : 'neutral'}>{days >= 0 ? formatDday(days) : '종료됨'}</TimePill>}
        />
      </div>

      {sub.memo && <p className="rounded-lg bg-sunken px-4 py-3 text-sm whitespace-pre-wrap text-ink-2">{sub.memo}</p>}

      {sub.catalogId && <PlanInfo catalogId={sub.catalogId} />}
    </div>
  )
}
