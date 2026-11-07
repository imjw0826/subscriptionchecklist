import type { PaymentMethod } from '../types'

export function formatWon(value: number): string {
  return `${Math.round(value).toLocaleString('ko-KR')}원`
}

export function newId(): string {
  return crypto.randomUUID()
}

export function paymentLabel(pm: PaymentMethod | undefined): string {
  if (!pm) return '결제수단 없음'
  return pm.last4 ? `${pm.nickname} ·${pm.last4}` : pm.nickname
}
