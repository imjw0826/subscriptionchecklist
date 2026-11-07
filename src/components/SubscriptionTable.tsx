import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Subscription } from '../types'
import { formatDate } from '../lib/date'
import { formatWon } from '../lib/format'
import { Avatar } from './ui'

export interface TableRow {
  sub: Subscription
  paymentName: string
  date: string
  /** 표의 금액 칸 값이자 합계에 더해지는 값 */
  amount: number
  /** 이름 옆 상태 태그 */
  badge?: ReactNode
  /** D-day 등 날짜 옆 표시 */
  dateTag: ReactNode
}

const headCell = 'h-10 px-3 text-left text-xs font-medium text-ink-2 first:pl-5 last:pr-5 last:text-right'
const bodyCell = 'px-3 py-2.5 first:pl-5 last:pr-5 last:text-right'

const cycleLabel = (months: number) => (months === 1 ? '매달' : months === 12 ? '매년' : `${months}개월`)

/** 구독 목록 표 (shadcn Table). 좁은 화면에서는 부가 칸을 숨기고 날짜를 이름 아래로 옮긴다 */
export default function SubscriptionTable({
  title,
  rows,
  dateLabel,
  amountLabel,
  totalLabel,
  empty,
}: {
  title: string
  rows: TableRow[]
  dateLabel: string
  amountLabel: string
  totalLabel: string
  empty: string
}) {
  const total = rows.reduce((sum, r) => sum + r.amount, 0)

  return (
    <section className="panel overflow-hidden" aria-label={title}>
      <header className="flex h-12 items-center gap-2 px-5">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="count">{rows.length}</span>
      </header>

      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="border-y border-line bg-sunken/60">
            <th scope="col" className={headCell}>
              서비스
            </th>
            <th scope="col" className={`${headCell} hidden w-40 lg:table-cell`}>
              결제수단
            </th>
            <th scope="col" className={`${headCell} hidden w-24 lg:table-cell`}>
              주기
            </th>
            <th scope="col" className={`${headCell} hidden w-44 sm:table-cell`}>
              {dateLabel}
            </th>
            <th scope="col" className={`${headCell} w-[8.5rem]`}>
              {amountLabel}
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-line">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-5 py-8 text-center text-ink-3">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const muted = r.sub.status === 'canceling'
              return (
                <tr key={r.sub.id} className="relative transition-colors duration-150 hover:bg-sunken/60">
                  <td className={bodyCell}>
                    <div className="flex items-center gap-3">
                      <Avatar name={r.sub.name} muted={muted} />
                      <div className="min-w-0 flex-1">
                        <p className="flex min-w-0 items-center gap-1.5">
                          {/* 링크 영역을 행 전체로 넓힌다 */}
                          <Link
                            to={`/subscriptions/${r.sub.id}`}
                            className={`min-w-0 truncate font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ink/30 focus-visible:after:ring-inset ${muted ? 'text-ink-2' : ''}`}
                          >
                            {r.sub.name}
                          </Link>
                          {r.badge}
                        </p>
                        <p className="truncate text-xs text-ink-3 sm:hidden">
                          {dateLabel} <span className="num">{formatDate(r.date).slice(5)}</span>
                        </p>
                        <p className="hidden truncate text-xs text-ink-3 sm:block">{r.sub.category || '기타'}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`${bodyCell} hidden truncate text-ink-2 lg:table-cell`}>{r.paymentName}</td>
                  <td className={`${bodyCell} hidden text-ink-2 lg:table-cell`}>{cycleLabel(r.sub.cycleMonths)}</td>
                  <td className={`${bodyCell} hidden whitespace-nowrap sm:table-cell`}>
                    <span className="flex items-center gap-2">
                      <span className="num w-10 text-ink-2">{formatDate(r.date).slice(5)}</span>
                      {r.dateTag}
                    </span>
                  </td>
                  <td className={`${bodyCell} num font-medium whitespace-nowrap`}>{formatWon(r.amount)}</td>
                </tr>
              )
            })
          )}
        </tbody>

        <tfoot>
          <tr className="border-t border-line bg-sunken/60">
            <th scope="row" className={`${bodyCell} text-left font-medium`}>
              {totalLabel}
            </th>
            <td className="hidden lg:table-cell" />
            <td className="hidden lg:table-cell" />
            <td className="hidden sm:table-cell" />
            <td className={`${bodyCell} num font-semibold whitespace-nowrap`}>{formatWon(total)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  )
}
