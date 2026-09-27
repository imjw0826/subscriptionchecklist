import { Link, useParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { baselineMonthlyCost, monthlyCost, postTrialPrice } from '../lib/calc'
import { diffDays, formatDate, formatDday } from '../lib/date'
import { formatWon } from '../lib/format'
import { Avatar, Icon, PageHeader, Stat, StatGroup, StatusBadge } from '../components/ui'
import { paymentLabel } from '../components/SubscriptionCard'
import BenefitDetail from '../components/BenefitDetail'
import UsageDetail from '../components/UsageDetail'

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
  const monthly = baselineMonthlyCost(sub)
  const dateLabel = isTrial ? '체험 종료' : sub.status === 'canceling' ? '해지 예정' : '다음 결제'
  const date = isTrial && sub.trialEndDate ? sub.trialEndDate : sub.nextBillingDate
  const days = diffDays(today, date)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
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
      >
        <Link to={`/subscriptions/${sub.id}/edit`} className="btn-ghost">
          편집
        </Link>
      </PageHeader>
      <p className="-mt-3 text-sm text-ink-2">
        {sub.category ? `${sub.category} · ` : ''}
        {paymentLabel(pm)}
      </p>

      <StatGroup cols={3}>
        <Stat
          icon={<Icon name="card" />}
          label={isTrial ? '종료 후 정가' : '정가'}
          value={
            <>
              <span className="text-base text-ink-2">{sub.cycleMonths}개월 </span>
              {formatWon(price)}
            </>
          }
        />
        <Stat icon={<Icon name="wallet" />} label={isTrial ? '종료 후 월 실부담' : '월 실부담'} value={formatWon(isTrial ? monthly : monthlyCost(sub))} />
        <Stat
          icon={<Icon name="clock" />}
          label={dateLabel}
          value={formatDate(date).slice(5)}
          tag={<span className={days < 0 || days <= 3 ? 'tag-danger' : 'tag-neutral'}>{days >= 0 ? formatDday(days) : '종료됨'}</span>}
        />
      </StatGroup>

      {sub.memo && <p className="rounded-2xl bg-sunken px-4 py-3 text-sm whitespace-pre-wrap text-ink-2">{sub.memo}</p>}

      {sub.detailType === 'benefit' ? <BenefitDetail sub={sub} monthly={monthly} /> : <UsageDetail sub={sub} monthly={monthly} />}
    </div>
  )
}
