/** 날짜는 모두 'YYYY-MM-DD' 문자열, 금액은 원 단위 정수 */
export type ISODate = string

export type SubscriptionStatus = 'active' | 'trial' | 'canceling'
export type DiscountType = 'none' | 'amount' | 'percent'

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

export interface AppData {
  subscriptions: Subscription[]
  paymentMethods: PaymentMethod[]
}

export type TableName = keyof AppData
