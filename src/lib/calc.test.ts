import { describe, expect, it } from 'vitest'
import type { Subscription } from '../types'
import {
  achievementLevel,
  benefitAchievement,
  computeTotals,
  costPerCycle,
  costPerUnit,
  isBenefitChecked,
  monthlyCost,
  monthlySavings,
  monthlyUsage,
  rollBillingDate,
  subscriptionsToRoll,
  subtotalsByPaymentMethod,
  upcomingAlerts,
  usageAchievement,
} from './calc'
import { addMonths, diffDays } from './date'

function sub(p: Partial<Subscription> = {}): Subscription {
  return {
    id: 's1',
    name: '테스트',
    category: '',
    listPrice: 10000,
    cycleMonths: 1,
    nextBillingDate: '2026-10-01',
    paymentMethodId: null,
    status: 'active',
    trialEndDate: null,
    priceAfterTrial: null,
    discountType: 'none',
    discountValue: 0,
    shareCount: 1,
    myShareOverride: null,
    detailType: 'benefit',
    usageUnit: 'count',
    usageTarget: 0,
    memo: '',
    catalogId: null,
    ...p,
  }
}

describe('실부담액', () => {
  it('할인·공유 없음이면 정가', () => {
    expect(costPerCycle(sub())).toBe(10000)
  })
  it('정액 할인', () => {
    expect(costPerCycle(sub({ discountType: 'amount', discountValue: 3000 }))).toBe(7000)
  })
  it('정액 할인은 정가를 넘지 않음', () => {
    expect(costPerCycle(sub({ discountType: 'amount', discountValue: 20000 }))).toBe(0)
  })
  it('정률 할인', () => {
    expect(costPerCycle(sub({ discountType: 'percent', discountValue: 15 }))).toBe(8500)
  })
  it('공유 1/n (반올림)', () => {
    expect(costPerCycle(sub({ listPrice: 17000, shareCount: 3 }))).toBe(5667)
  })
  it('할인 후 공유', () => {
    expect(costPerCycle(sub({ listPrice: 17000, discountType: 'amount', discountValue: 1000, shareCount: 4 }))).toBe(4000)
  })
  it('myShareOverride가 있으면 그 값', () => {
    expect(costPerCycle(sub({ listPrice: 17000, shareCount: 4, myShareOverride: 5000 }))).toBe(5000)
  })
})

describe('월 환산', () => {
  it('연 60,000원 → 월 5,000원', () => {
    expect(monthlyCost(sub({ listPrice: 60000, cycleMonths: 12 }))).toBe(5000)
  })
  it('원 단위 반올림', () => {
    expect(monthlyCost(sub({ listPrice: 10000, cycleMonths: 3 }))).toBe(3333)
    expect(monthlyCost(sub({ listPrice: 20000, cycleMonths: 3 }))).toBe(6667)
  })
})

describe('월 총액', () => {
  const subs = [
    sub({ id: 'a', listPrice: 10000, paymentMethodId: 'p1' }),
    sub({ id: 'b', listPrice: 60000, cycleMonths: 12, paymentMethodId: 'p1' }),
    sub({ id: 'c', listPrice: 9900, status: 'canceling', paymentMethodId: 'p2' }),
    sub({ id: 'd', listPrice: 14900, status: 'trial', priceAfterTrial: 14900, paymentMethodId: 'p2' }),
  ]
  it('active만 합산하고 trial은 따로, canceling은 제외', () => {
    expect(computeTotals(subs)).toEqual({ monthly: 15000, yearly: 180000, trialMonthly: 14900 })
  })
  it('연 환산은 월 반올림 오차 없이 계산', () => {
    expect(computeTotals([sub({ listPrice: 10000, cycleMonths: 3 })]).yearly).toBe(40000)
  })
  it('결제수단별 소계', () => {
    const result = subtotalsByPaymentMethod(subs, [
      { id: 'p1', nickname: 'A', type: 'card', last4: '1234' },
      { id: 'p2', nickname: 'B', type: 'card', last4: '5678' },
    ])
    expect(result.find((r) => r.paymentMethodId === 'p1')).toMatchObject({ monthly: 15000, subscriptionIds: ['a', 'b'] })
    expect(result.find((r) => r.paymentMethodId === 'p2')).toMatchObject({ monthly: 0, subscriptionIds: ['c', 'd'] })
  })
  it('결제수단 미지정은 null 그룹', () => {
    const result = subtotalsByPaymentMethod([sub()], [])
    expect(result).toEqual([{ paymentMethodId: null, monthly: 10000, subscriptionIds: ['s1'] }])
  })
})

describe('달성률', () => {
  const uses = [
    { id: 'u1', benefitId: 'b1', subscriptionId: 's1', date: '2026-09-02', savedAmount: 3000, note: '' },
    { id: 'u2', benefitId: 'b1', subscriptionId: 's1', date: '2026-09-20', savedAmount: 4000, note: '' },
    { id: 'u3', benefitId: 'b1', subscriptionId: 's1', date: '2026-08-31', savedAmount: 9999, note: '' },
    { id: 'u4', benefitId: 'b2', subscriptionId: 's2', date: '2026-09-10', savedAmount: 1000, note: '' },
  ]
  it('이번 달(달력 기준) 절약액만 합산', () => {
    expect(monthlySavings(uses, 's1', '2026-09-30')).toBe(7000)
  })
  it('혜택형 달성률', () => {
    expect(benefitAchievement(7000, 7890)).toBe(89)
    expect(benefitAchievement(0, 0)).toBeNull()
  })
  it('이용형 달성률', () => {
    const logs = [
      { id: 'l1', subscriptionId: 's1', date: '2026-09-01', amount: 600 },
      { id: 'l2', subscriptionId: 's1', date: '2026-09-15', amount: 900 },
      { id: 'l3', subscriptionId: 's1', date: '2026-10-01', amount: 900 },
    ]
    const usage = monthlyUsage(logs, 's1', '2026-09-26')
    expect(usage).toBe(1500)
    expect(usageAchievement(usage, 1200)).toBe(125)
    expect(usageAchievement(usage, 0)).toBeNull()
  })
  it('색 구간', () => {
    expect(achievementLevel(49)).toBe('low')
    expect(achievementLevel(50)).toBe('mid')
    expect(achievementLevel(99)).toBe('mid')
    expect(achievementLevel(100)).toBe('high')
    expect(achievementLevel(null)).toBe('none')
  })
  it('회당·시간당 비용', () => {
    expect(costPerUnit(12000, 4, 'count')).toBe(3000)
    expect(costPerUnit(12000, 90, 'minutes')).toBe(8000)
    expect(costPerUnit(12000, 0, 'count')).toBeNull()
  })
})

describe('혜택 체크 초기화', () => {
  const uses = [{ id: 'u', benefitId: 'b', subscriptionId: 's', date: '2026-08-15', savedAmount: 1000, note: '' }]
  it('매월 리셋 혜택은 새 달이 되면 체크 해제', () => {
    expect(isBenefitChecked('monthly', uses, '2026-08-31')).toBe(true)
    expect(isBenefitChecked('monthly', uses, '2026-09-01')).toBe(false)
  })
  it('리셋 없음은 계속 체크', () => {
    expect(isBenefitChecked('none', uses, '2026-12-01')).toBe(true)
  })
})

describe('날짜', () => {
  it('월말 보정', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2026-08-31', 1)).toBe('2026-09-30')
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15')
    expect(addMonths('2028-02-29', 12)).toBe('2029-02-28')
  })
  it('일수 차이 (윤년 포함)', () => {
    expect(diffDays('2028-02-28', '2028-03-01')).toBe(2)
    expect(diffDays('2026-02-28', '2026-03-01')).toBe(1)
    expect(diffDays('2026-09-26', '2026-09-23')).toBe(-3)
  })
})

describe('다음 결제일 자동 갱신', () => {
  it('지나지 않았으면 그대로', () => {
    expect(rollBillingDate('2026-09-26', 1, '2026-09-26')).toBe('2026-09-26')
  })
  it('한 주기 넘김', () => {
    expect(rollBillingDate('2026-09-10', 1, '2026-09-26')).toBe('2026-10-10')
  })
  it('여러 주기가 지났으면 여러 번 넘김', () => {
    expect(rollBillingDate('2026-01-10', 1, '2026-09-26')).toBe('2026-10-10')
    expect(rollBillingDate('2025-03-01', 12, '2026-09-26')).toBe('2027-03-01')
  })
  it('월말 결제일이 계속 밀리지 않음', () => {
    expect(rollBillingDate('2026-01-31', 1, '2026-02-01')).toBe('2026-02-28')
    expect(rollBillingDate('2026-01-31', 1, '2026-03-01')).toBe('2026-03-31')
  })
  it('체험 중인 구독은 제외', () => {
    const rolled = subscriptionsToRoll(
      [sub({ id: 'a', nextBillingDate: '2026-09-01' }), sub({ id: 'b', status: 'trial', nextBillingDate: '2026-09-01' })],
      '2026-09-26',
    )
    expect(rolled.map((s) => [s.id, s.nextBillingDate])).toEqual([['a', '2026-10-01']])
  })
})

describe('배너', () => {
  it('결제 D-3 이내와 체험 종료 임박', () => {
    const alerts = upcomingAlerts(
      [
        sub({ id: 'a', nextBillingDate: '2026-09-29' }),
        sub({ id: 'b', nextBillingDate: '2026-09-30' }),
        sub({ id: 'c', status: 'trial', trialEndDate: '2026-09-27', priceAfterTrial: 5000 }),
        sub({ id: 'd', status: 'canceling', nextBillingDate: '2026-09-27' }),
      ],
      '2026-09-26',
    )
    expect(alerts.map((a) => [a.subscription.id, a.kind, a.days, a.amount])).toEqual([
      ['c', 'trial', 1, 5000],
      ['a', 'billing', 3, 10000],
    ])
  })
})
