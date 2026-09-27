/**
 * 금액·달성률 계산 규칙 (PRD "데이터 모델과 계산 규칙").
 * UI와 분리된 순수 함수만 둔다.
 */
import type { AppData, BenefitUse, ISODate, PaymentMethod, Subscription, UsageLog } from '../types'
import { addMonths, diffDays, isSameMonth } from './date'

type PriceFields = Pick<
  Subscription,
  'listPrice' | 'discountType' | 'discountValue' | 'shareCount' | 'myShareOverride' | 'cycleMonths'
>

/** 할인 금액 (정가를 넘지 않음) */
export function discountAmount(sub: Pick<Subscription, 'discountType' | 'discountValue'>, price: number): number {
  const v = Math.max(0, sub.discountValue || 0)
  if (sub.discountType === 'amount') return Math.min(v, price)
  if (sub.discountType === 'percent') return Math.round((price * Math.min(v, 100)) / 100)
  return 0
}

/** 주기당 실부담액 = (정가 − 할인) ÷ 공유 인원. myShareOverride가 있으면 그 값 */
export function costPerCycle(sub: PriceFields, price: number = sub.listPrice): number {
  if (sub.myShareOverride != null) return sub.myShareOverride
  const share = Math.max(1, sub.shareCount || 1)
  return Math.round((price - discountAmount(sub, price)) / share)
}

/** 월 환산 실부담액 = 주기당 실부담액 ÷ cycleMonths, 원 단위 반올림 */
export function monthlyCost(sub: PriceFields, price: number = sub.listPrice): number {
  return Math.round(costPerCycle(sub, price) / Math.max(1, sub.cycleMonths || 1))
}

/** 무료체험 종료 후 적용될 가격 (priceAfterTrial 우선, 없으면 정가) */
export function postTrialPrice(sub: Subscription): number {
  return sub.priceAfterTrial ?? sub.listPrice
}

/** 무료체험 종료 후 월 환산 실부담액 */
export function monthlyCostAfterTrial(sub: Subscription): number {
  return monthlyCost(sub, postTrialPrice(sub))
}

/**
 * 달성률 계산에 쓰는 기준 월 부담액.
 * 체험 중이면 0원이라 달성률이 무의미하므로 체험 종료 후 금액을 기준으로 삼는다.
 */
export function baselineMonthlyCost(sub: Subscription): number {
  return sub.status === 'trial' ? monthlyCostAfterTrial(sub) : monthlyCost(sub)
}

export interface Totals {
  /** active 구독의 월 환산 실부담액 합계 */
  monthly: number
  /** active 구독의 연 환산 합계 (주기당 금액 × 12/주기) */
  yearly: number
  /** trial 구독이 체험 종료 후 추가될 월 금액 */
  trialMonthly: number
}

export function computeTotals(subs: Subscription[]): Totals {
  let monthly = 0
  let yearlyExact = 0
  let trialMonthly = 0
  for (const s of subs) {
    if (s.status === 'active') {
      monthly += monthlyCost(s)
      yearlyExact += (costPerCycle(s) * 12) / Math.max(1, s.cycleMonths)
    } else if (s.status === 'trial') {
      trialMonthly += monthlyCostAfterTrial(s)
    }
  }
  return { monthly, yearly: Math.round(yearlyExact), trialMonthly }
}

export interface PaymentSubtotal {
  paymentMethodId: string | null
  monthly: number
  subscriptionIds: string[]
}

/** 결제수단별 월 소계 (active만 합산, 연결된 구독 목록은 전체 상태 포함) */
export function subtotalsByPaymentMethod(subs: Subscription[], methods: PaymentMethod[]): PaymentSubtotal[] {
  const map = new Map<string | null, PaymentSubtotal>()
  for (const m of methods) map.set(m.id, { paymentMethodId: m.id, monthly: 0, subscriptionIds: [] })
  for (const s of subs) {
    const key = s.paymentMethodId && map.has(s.paymentMethodId) ? s.paymentMethodId : null
    if (!map.has(key)) map.set(key, { paymentMethodId: key, monthly: 0, subscriptionIds: [] })
    const entry = map.get(key)!
    entry.subscriptionIds.push(s.id)
    if (s.status === 'active') entry.monthly += monthlyCost(s)
  }
  return [...map.values()]
}

/** 이번 달 혜택 절약액 합계 */
export function monthlySavings(uses: BenefitUse[], subscriptionId: string, today: ISODate): number {
  return uses
    .filter((u) => u.subscriptionId === subscriptionId && isSameMonth(u.date, today))
    .reduce((sum, u) => sum + u.savedAmount, 0)
}

/** 이번 달 이용량 합계 (횟수 또는 분) */
export function monthlyUsage(logs: UsageLog[], subscriptionId: string, today: ISODate): number {
  return logs
    .filter((l) => l.subscriptionId === subscriptionId && isSameMonth(l.date, today))
    .reduce((sum, l) => sum + l.amount, 0)
}

/** 혜택형 달성률 = 이번 달 절약액 ÷ 월 환산 실부담액 × 100. 부담액이 0이면 null */
export function benefitAchievement(savings: number, monthly: number): number | null {
  if (monthly <= 0) return null
  return Math.round((savings / monthly) * 100)
}

/** 이용형 달성률 = 이번 달 이용량 ÷ usageTarget × 100. 목표가 0이면 null */
export function usageAchievement(usage: number, target: number): number | null {
  if (target <= 0) return null
  return Math.round((usage / target) * 100)
}

/** 구독 하나의 이번 달 달성률 */
export function achievementFor(sub: Subscription, data: Pick<AppData, 'benefitUses' | 'usageLogs'>, today: ISODate): number | null {
  if (sub.detailType === 'benefit') {
    return benefitAchievement(monthlySavings(data.benefitUses, sub.id, today), baselineMonthlyCost(sub))
  }
  return usageAchievement(monthlyUsage(data.usageLogs, sub.id, today), sub.usageTarget)
}

export type AchievementLevel = 'low' | 'mid' | 'high' | 'none'

/** 50% 미만 빨강, 50~99% 노랑, 100% 이상 초록 */
export function achievementLevel(pct: number | null): AchievementLevel {
  if (pct == null) return 'none'
  if (pct < 50) return 'low'
  if (pct < 100) return 'mid'
  return 'high'
}

/**
 * 다음 결제일이 오늘보다 과거면 주기만큼 넘겨 오늘 이후(오늘 포함) 첫 결제일을 돌려준다.
 * 월말 날짜가 밀리지 않도록 원래 날짜를 기준으로 k×주기를 더한다 (1/31 → 2/28 → 3/31).
 */
export function rollBillingDate(date: ISODate, cycleMonths: number, today: ISODate): ISODate {
  const cycle = Math.max(1, cycleMonths)
  if (date >= today) return date
  let k = 1
  let next = addMonths(date, cycle)
  while (next < today) {
    k++
    next = addMonths(date, cycle * k)
  }
  return next
}

/** 결제일 자동 갱신이 필요한 구독만 새 날짜와 함께 반환 (체험 중인 구독은 체험 종료일이 기준이라 제외) */
export function subscriptionsToRoll(subs: Subscription[], today: ISODate): Subscription[] {
  return subs
    .filter((s) => s.status !== 'trial' && s.nextBillingDate && s.nextBillingDate < today)
    .map((s) => ({ ...s, nextBillingDate: rollBillingDate(s.nextBillingDate, s.cycleMonths, today) }))
}

export interface Alert {
  subscription: Subscription
  kind: 'billing' | 'trial'
  date: ISODate
  days: number
  amount: number
}

/** 대시보드 배너: 결제 D-3 이내(active), 무료체험 종료 D-3 이내 */
export function upcomingAlerts(subs: Subscription[], today: ISODate, withinDays = 3): Alert[] {
  const alerts: Alert[] = []
  for (const s of subs) {
    if (s.status === 'active') {
      const days = diffDays(today, s.nextBillingDate)
      if (days >= 0 && days <= withinDays) {
        alerts.push({ subscription: s, kind: 'billing', date: s.nextBillingDate, days, amount: costPerCycle(s) })
      }
    } else if (s.status === 'trial' && s.trialEndDate) {
      const days = diffDays(today, s.trialEndDate)
      if (days <= withinDays) {
        alerts.push({ subscription: s, kind: 'trial', date: s.trialEndDate, days, amount: costPerCycle(s, postTrialPrice(s)) })
      }
    }
  }
  return alerts.sort((a, b) => a.days - b.days)
}

/** 다가오는 결제 (active + trial 종료), 날짜순 */
export function nextPayments(subs: Subscription[], today: ISODate, limit = 3): Alert[] {
  const list: Alert[] = []
  for (const s of subs) {
    if (s.status === 'active') {
      list.push({ subscription: s, kind: 'billing', date: s.nextBillingDate, days: diffDays(today, s.nextBillingDate), amount: costPerCycle(s) })
    } else if (s.status === 'trial' && s.trialEndDate) {
      list.push({ subscription: s, kind: 'trial', date: s.trialEndDate, days: diffDays(today, s.trialEndDate), amount: costPerCycle(s, postTrialPrice(s)) })
    }
  }
  return list.filter((a) => a.days >= 0).sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit)
}

/** 혜택 체크 상태: monthly는 이번 달 사용 기록이 있으면, none은 한 번이라도 사용했으면 체크 */
export function isBenefitChecked(resetCycle: 'monthly' | 'none', usesOfBenefit: BenefitUse[], today: ISODate): boolean {
  if (resetCycle === 'monthly') return usesOfBenefit.some((u) => isSameMonth(u.date, today))
  return usesOfBenefit.length > 0
}

/** 이용형: 회당 비용 또는 시간당 비용. 이용량이 0이면 null */
export function costPerUnit(monthly: number, usage: number, unit: 'count' | 'minutes'): number | null {
  if (usage <= 0) return null
  return Math.round(unit === 'count' ? monthly / usage : monthly / (usage / 60))
}
