import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { Subscription } from '../types'
import { paymentsInMonth, type CalendarPayment } from '../lib/calc'
import { formatDate, monthCells, monthKey, parseISO, toISO, weekday } from '../lib/date'
import { formatWon } from '../lib/format'
import { Avatar } from './ui'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MARK_SIZE = 34

function dayLabel(date: string, payments: CalendarPayment[]): string {
  const day = `${parseISO(date).d}일`
  if (payments.length === 0) return day
  const names = payments.map((p) => p.subscription.name).join(', ')
  return `${day}, 결제 ${payments.length}건: ${names}`
}

function DayCell({
  date,
  payments,
  today,
  selected,
  index,
  onSelect,
}: {
  date: string
  payments: CalendarPayment[]
  today: string
  selected: boolean
  index: number
  onSelect: () => void
}) {
  const isToday = date === today
  const isPast = date < today
  const ring = selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : isToday ? 'ring-1 ring-line-strong ring-offset-2 ring-offset-surface' : ''

  if (payments.length === 0) {
    return (
      <div className="flex aspect-square max-h-14 w-full items-center justify-center" aria-label={dayLabel(date, payments)}>
        <span className={`num flex h-[34px] w-[34px] items-center justify-center rounded-full text-sm ${ring} ${isToday ? 'font-semibold text-ink' : isPast ? 'text-ink-3' : 'text-ink-2'}`}>{parseISO(date).d}</span>
      </div>
    )
  }

  return (
    <div className="t-tip-host relative flex aspect-square max-h-14 w-full items-center justify-center">
      <button type="button" aria-label={dayLabel(date, payments)} aria-pressed={selected} onClick={onSelect} style={{ '--i': index } as CSSProperties} className={`t-pop rounded-full ${ring}`}>
        {payments.length === 1 ? (
          <Avatar name={payments[0].subscription.name} size={MARK_SIZE} muted={isPast} />
        ) : (
          <span className={`num flex h-[34px] w-[34px] items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary ${isPast ? 'opacity-50' : ''}`}>{payments.length}</span>
        )}
      </button>
      {/* Tooltip open / close: 어떤 구독인지는 칸에 다 못 보여주므로 올리면 알려준다 */}
      <div aria-hidden className="t-tip w-max max-w-56 space-y-1 rounded-lg border border-line bg-surface px-2.5 py-2 text-xs shadow-raised">
        {payments.map((p) => (
          <p key={p.subscription.id} className="flex items-center justify-between gap-4">
            <span className="truncate">{p.subscription.name}</span>
            <span className="num font-medium">{formatWon(p.amount)}</span>
          </p>
        ))}
      </div>
    </div>
  )
}

/** 이번 달 결제 달력: 결제일은 숫자 대신 로고, 두 건 이상이면 건수를 동그랗게 표시한다 */
export default function PaymentCalendar({ subscriptions, today }: { subscriptions: Subscription[]; today: string }) {
  const { y, m } = parseISO(today)
  const month = monthKey(today)
  const payments = useMemo(() => paymentsInMonth(subscriptions, month), [subscriptions, month])
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarPayment[]>()
    for (const p of payments) map.set(p.date, [...(map.get(p.date) ?? []), p])
    return map
  }, [payments])
  const [selected, setSelected] = useState<string | null>(null)

  // 달이 바뀌거나 결제가 사라져 선택한 날에 결제가 없으면 전체 목록으로 돌아간다
  const activeDate = selected && byDate.has(selected) ? selected : null
  const visible = activeDate ? byDate.get(activeDate)! : payments
  const total = visible.reduce((sum, p) => sum + p.amount, 0)
  let markIndex = 0

  return (
    <section className="panel" aria-label={`${m}월 결제 달력`}>
      <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="p-5">
          <h2 className="mb-4 text-base font-semibold">
            <span className="num">{m}</span>월 결제 달력
          </h2>
          <div className="grid grid-cols-7 text-center text-xs text-ink-3">
            {WEEKDAYS.map((w) => (
              <span key={w} className="pb-1">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthCells(y, m).map((d, i) => {
              if (d == null) return <span key={`blank-${i}`} />
              const date = toISO(y, m, d)
              const list = byDate.get(date) ?? []
              return (
                <DayCell
                  key={date}
                  date={date}
                  payments={list}
                  today={today}
                  selected={activeDate === date}
                  index={list.length ? markIndex++ : 0}
                  onSelect={() => setSelected(activeDate === date ? null : date)}
                />
              )
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-col rounded-b-xl border-t border-line bg-sunken/60 p-5 lg:rounded-r-xl lg:rounded-bl-none lg:border-t-0 lg:border-l">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{activeDate ? `${parseISO(activeDate).d}일 결제` : '이번 달 결제'}</h3>
            {activeDate && (
              <button type="button" className="link text-xs" onClick={() => setSelected(null)}>
                전체 보기
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <p className="flex-1 py-8 text-center text-sm text-ink-3">이번 달 결제가 없어요</p>
          ) : (
            <ul key={activeDate ?? 'all'} className="t-reveal flex-1 divide-y divide-line">
              {visible.map((p) => {
                const past = p.date < today
                return (
                  <li key={p.subscription.id}>
                    <Link to={`/subscriptions/${p.subscription.id}`} className="flex items-center gap-3 py-2.5 text-sm transition-opacity hover:opacity-70">
                      <Avatar name={p.subscription.name} size={28} muted={past} />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate font-medium ${past ? 'text-ink-2' : ''}`}>{p.subscription.name}</span>
                        <span className="block text-xs text-ink-3">
                          <span className="num">{formatDate(p.date).slice(5)}</span> ({weekday(p.date)}){p.kind === 'trial' ? ' · 체험 종료 후 첫 결제' : ''}
                        </span>
                      </span>
                      <span className={`num font-medium ${past ? 'text-ink-2' : ''}`}>{formatWon(p.amount)}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          <p className="mt-2 flex items-center justify-between border-t border-line pt-3 text-sm">
            <span className="font-medium text-ink-2">{activeDate ? '합계' : '이번 달 합계'}</span>
            <b className="num font-semibold">{formatWon(total)}</b>
          </p>
        </div>
      </div>
    </section>
  )
}
