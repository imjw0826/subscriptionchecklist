import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

/** 구독 목록 표 (shadcn Table). 표가 좁으면 부가 칸을 숨기고 날짜를 이름 아래로 옮긴다. 화면이 아니라 표의 폭을 기준으로 한다 */
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
  const navigate = useNavigate()
  const total = rows.reduce((sum, r) => sum + r.amount, 0)

  return (
    <section className="panel @container overflow-hidden" aria-label={title}>
      <header className="flex h-12 items-center gap-2 px-5">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="count">{rows.length}</span>
      </header>

      {rows.length === 0 ? (
        // 표를 그리지 않는다. 숨긴 칸까지 합친 colSpan은 좁은 폭에서 빈 칸을 만든다
        <>
          <p className="border-t border-line px-5 py-8 text-center text-sm text-ink-3">{empty}</p>
          <div className="flex items-center justify-between gap-4 border-t border-line bg-sunken/60 px-5 py-2.5 text-sm">
            <span className="font-medium whitespace-nowrap">{totalLabel}</span>
            <span className="num font-semibold whitespace-nowrap">{formatWon(total)}</span>
          </div>
        </>
      ) : (
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="border-y border-line bg-sunken/60">
              <th scope="col" className={headCell}>
                서비스
              </th>
              <th scope="col" className={`${headCell} hidden w-36 @3xl:table-cell`}>
                결제수단
              </th>
              <th scope="col" className={`${headCell} hidden w-20 @3xl:table-cell`}>
                주기
              </th>
              <th scope="col" className={`${headCell} hidden w-36 @lg:table-cell`}>
                {dateLabel}
              </th>
              <th scope="col" className={`${headCell} w-[8.5rem]`}>
                {amountLabel}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const muted = r.sub.status === 'canceling'
              const href = `/subscriptions/${r.sub.id}`
              return (
                // 행 어디를 눌러도 이동한다. 링크를 행 크기로 늘리는 방식은 tr의 position: relative가 필요한데, WebKit에서는 페이지 전체를 덮을 수 있다
                <tr
                  key={r.sub.id}
                  className="cursor-pointer transition-colors duration-150 hover:bg-sunken/60"
                  onClick={(e) => {
                    if (!(e.target as HTMLElement).closest('a')) navigate(href)
                  }}
                >
                  <td className={bodyCell}>
                    <div className="flex items-center gap-3">
                      <Avatar name={r.sub.name} muted={muted} />
                      <div className="min-w-0 flex-1">
                        <p className="flex min-w-0 items-center gap-1.5">
                          <Link to={href} className={`min-w-0 truncate font-medium ${muted ? 'text-ink-2' : ''}`}>
                            {r.sub.name}
                          </Link>
                          {r.badge}
                        </p>
                        <p className="truncate text-xs text-ink-3 @lg:hidden">
                          {dateLabel} <span className="num">{formatDate(r.date).slice(5)}</span>
                        </p>
                        <p className="hidden truncate text-xs text-ink-3 @lg:block">{r.sub.category || '기타'}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`${bodyCell} hidden truncate text-ink-2 @3xl:table-cell`}>{r.paymentName}</td>
                  <td className={`${bodyCell} hidden text-ink-2 @3xl:table-cell`}>{cycleLabel(r.sub.cycleMonths)}</td>
                  <td className={`${bodyCell} hidden whitespace-nowrap @lg:table-cell`}>
                    <span className="flex items-center gap-2">
                      <span className="num w-10 text-ink-2">{formatDate(r.date).slice(5)}</span>
                      {r.dateTag}
                    </span>
                  </td>
                  <td className={`${bodyCell} num font-medium whitespace-nowrap`}>{formatWon(r.amount)}</td>
                </tr>
              )
            })}
          </tbody>

          <tfoot>
            <tr className="border-t border-line bg-sunken/60">
              <th scope="row" className={`${bodyCell} text-left font-medium whitespace-nowrap`}>
                {totalLabel}
              </th>
              <td className="hidden @3xl:table-cell" />
              <td className="hidden @3xl:table-cell" />
              <td className="hidden @lg:table-cell" />
              <td className={`${bodyCell} num font-semibold whitespace-nowrap`}>{formatWon(total)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  )
}
