import { Link } from 'react-router-dom'
import type { PaymentMethod, Subscription } from '../types'
import { costPerCycle, monthlyCost, monthlyCostAfterTrial } from '../lib/calc'
import { diffDays, formatDate, formatDday } from '../lib/date'
import { formatWon } from '../lib/format'
import { Avatar, ProgressRing, TimePill } from './ui'

export function paymentLabel(pm: PaymentMethod | undefined): string {
  if (!pm) return '결제수단 없음'
  return pm.last4 ? `${pm.nickname} ·${pm.last4}` : pm.nickname
}

export default function SubscriptionCard({
  sub,
  pm,
  pct,
  today,
}: {
  sub: Subscription
  pm: PaymentMethod | undefined
  pct: number | null
  today: string
}) {
  const isTrial = sub.status === 'trial'
  const muted = sub.status === 'canceling'
  const date = isTrial && sub.trialEndDate ? sub.trialEndDate : sub.nextBillingDate
  const days = diffDays(today, date)
  const monthly = isTrial ? monthlyCostAfterTrial(sub) : monthlyCost(sub)
  const soon = !muted && days <= 3

  return (
    <Link to={`/subscriptions/${sub.id}`} className={`card block p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${muted ? 'bg-surface/60 shadow-none' : ''}`}>
      <div className="flex items-center gap-2.5">
        <Avatar name={sub.name} muted={muted} />
        <div className="min-w-0 flex-1">
          <p className={`truncate ${muted ? 'text-ink-2' : ''}`}>{sub.name}</p>
          <p className="truncate text-xs text-ink-3">{pm?.nickname ?? '결제수단 없음'}</p>
        </div>
        <ProgressRing pct={pct} />
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-ink-3">
        <span>
          {isTrial ? '종료' : muted ? '해지' : '결제'} {formatDate(date).slice(5)}
        </span>
        <TimePill tone={days < 0 ? 'danger' : soon ? (isTrial ? 'warn' : 'danger') : 'neutral'}>{days < 0 ? '종료됨' : formatDday(days)}</TimePill>
        <span className="ml-auto text-right" title={sub.cycleMonths > 1 ? `${sub.cycleMonths}개월 ${formatWon(costPerCycle(sub))}` : undefined}>
          <b className={`text-sm font-medium ${muted ? 'text-ink-2' : 'text-ink'}`}>{formatWon(isTrial ? 0 : monthly)}</b>
          {isTrial ? ` → ${formatWon(monthly)}` : '/월'}
        </span>
      </div>
    </Link>
  )
}
