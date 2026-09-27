import type { ISODate } from '../types'

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(y: number, m: number, d: number): ISODate {
  return `${y}-${pad(m)}-${pad(d)}`
}

export function parseISO(date: ISODate): { y: number; m: number; d: number } {
  const [y, m, d] = date.split('-').map(Number)
  return { y, m, d }
}

/** 로컬 시간대 기준 오늘 */
export function todayISO(now: Date = new Date()): ISODate {
  return toISO(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

/** N개월 뒤 같은 날짜. 해당 월에 그 날이 없으면 말일로 맞춘다 (1/31 + 1개월 → 2/28 또는 2/29) */
export function addMonths(date: ISODate, months: number): ISODate {
  const { y, m, d } = parseISO(date)
  const total = y * 12 + (m - 1) + months
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return toISO(ny, nm, Math.min(d, daysInMonth(ny, nm)))
}

/** a → b 까지 남은 일수 (b가 미래면 양수) */
export function diffDays(from: ISODate, to: ISODate): number {
  const a = parseISO(from)
  const b = parseISO(to)
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000)
}

/** 'YYYY-MM' */
export function monthKey(date: ISODate): string {
  return date.slice(0, 7)
}

export function isSameMonth(a: ISODate, b: ISODate): boolean {
  return monthKey(a) === monthKey(b)
}

/** YYYY.MM.DD */
export function formatDate(date: ISODate | null | undefined): string {
  return date ? date.replaceAll('-', '.') : '-'
}

export function formatDday(days: number): string {
  if (days === 0) return 'D-DAY'
  return days > 0 ? `D-${days}` : `D+${-days}`
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
export function weekday(date: ISODate): string {
  const { y, m, d } = parseISO(date)
  return WEEKDAYS[new Date(y, m - 1, d).getDay()]
}
