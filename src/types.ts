/** 날짜는 모두 'YYYY-MM-DD' 문자열, 금액은 원 단위 정수 */
export type ISODate = string

export type SubscriptionStatus = 'active' | 'trial' | 'canceling'
export type DiscountType = 'none' | 'amount' | 'percent'
export type DetailType = 'benefit' | 'usage'
export type UsageUnit = 'count' | 'minutes'

export interface Subscription {
  id: string
  name: string
  category: string
  listPrice: number
  cycleMonths: number
  nextBillingDate: ISODate
  paymentMethodId: string | null
  status: SubscriptionStatus
  trialEndDate: ISODate | null
  priceAfterTrial: number | null
  discountType: DiscountType
  discountValue: number
  shareCount: number
  myShareOverride: number | null
  detailType: DetailType
  usageUnit: UsageUnit
  /** 이 만큼 쓰면 본전 (횟수 또는 분) */
  usageTarget: number
  memo: string
  /** 카탈로그(src/data/catalog.md)에서 고른 요금제 ID. 직접 입력한 구독은 null */
  catalogId: string | null
}

export type PaymentMethodType = 'card' | 'account' | 'easypay'

export interface PaymentMethod {
  id: string
  nickname: string
  type: PaymentMethodType
  last4: string
}

export type ResetCycle = 'monthly' | 'none'

export interface Benefit {
  id: string
  subscriptionId: string
  name: string
  resetCycle: ResetCycle
  estimatedValue: number
}

export interface BenefitUse {
  id: string
  benefitId: string
  subscriptionId: string
  date: ISODate
  savedAmount: number
  note: string
}

export interface UsageLog {
  id: string
  subscriptionId: string
  date: ISODate
  amount: number
}

export interface AppData {
  subscriptions: Subscription[]
  paymentMethods: PaymentMethod[]
  benefits: Benefit[]
  benefitUses: BenefitUse[]
  usageLogs: UsageLog[]
}

export type TableName = keyof AppData
