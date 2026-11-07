import { describe, expect, it } from 'vitest'
import type { Subscription } from '../types'
import {
  costPerCycle,
  monthlyCost,
  paymentsInMonth,
  rollBillingDate,
  subscriptionsToRoll,
  subtotalsByPaymentMethod,
  upcomingAlerts,
} from './calc'
import { addMonths, diffDays, monthCells } from './date'

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

describe('결제수단별 소계', () => {
  const subs = [
    sub({ id: 'a', listPrice: 10000, paymentMethodId: 'p1' }),
    sub({ id: 'b', listPrice: 60000, cycleMonths: 12, paymentMethodId: 'p1' }),
    sub({ id: 'c', listPrice: 9900, status: 'canceling', paymentMethodId: 'p2' }),
    sub({ id: 'd', listPrice: 14900, status: 'trial', priceAfterTrial: 14900, paymentMethodId: 'p2' }),
  ]
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

describe('달력 결제 목록', () => {
  const dates = (p: Partial<Subscription>, month = '2026-11') => paymentsInMonth([sub(p)], month).map((x) => x.date)

  it('다음 결제일이 이번 달이면 그 날', () => {
    expect(dates({ nextBillingDate: '2026-11-20' })).toEqual(['2026-11-20'])
  })
  it('이미 지나 다음 달로 넘어간 결제일도 이번 달에 표시', () => {
    expect(dates({ nextBillingDate: '2026-12-03' })).toEqual(['2026-11-03'])
  })
  it('없는 날짜는 말일로', () => {
    expect(dates({ nextBillingDate: '2026-12-31' })).toEqual(['2026-11-30'])
  })
  it('주기가 맞는 달에만 표시', () => {
    expect(dates({ cycleMonths: 3, nextBillingDate: '2027-02-15' })).toEqual(['2026-11-15'])
    expect(dates({ cycleMonths: 3, nextBillingDate: '2027-01-15' })).toEqual([])
    expect(dates({ cycleMonths: 12, nextBillingDate: '2027-11-15' })).toEqual(['2026-11-15'])
  })
  it('체험은 종료일에 종료 후 금액으로, 다른 달에는 표시하지 않음', () => {
    const trial = sub({ status: 'trial', trialEndDate: '2026-11-09', nextBillingDate: '2026-11-09', priceAfterTrial: 9900 })
    expect(paymentsInMonth([trial], '2026-11')).toMatchObject([{ kind: 'trial', date: '2026-11-09', amount: 9900 }])
    expect(paymentsInMonth([trial], '2026-12')).toEqual([])
  })
  it('해지예정과 0원 구독은 제외', () => {
    expect(dates({ status: 'canceling', nextBillingDate: '2026-11-20' })).toEqual([])
    expect(dates({ myShareOverride: 0, nextBillingDate: '2026-11-20' })).toEqual([])
  })
  it('주기 금액을 실부담으로 표시하고 날짜순 정렬', () => {
    const list = paymentsInMonth(
      [sub({ id: 'a', nextBillingDate: '2026-11-20' }), sub({ id: 'b', listPrice: 44000, cycleMonths: 12, nextBillingDate: '2027-11-05' })],
      '2026-11',
    )
    expect(list.map((p) => [p.subscription.id, p.amount])).toEqual([
      ['b', 44000],
      ['a', 10000],
    ])
  })
})

describe('달력 칸', () => {
  it('1일 앞에 요일만큼 빈칸', () => {
    const cells = monthCells(2026, 11) // 2026-11-01은 일요일
    expect(cells[0]).toBe(1)
    expect(cells).toHaveLength(30)
    const dec = monthCells(2026, 12) // 2026-12-01은 화요일
    expect(dec.slice(0, 3)).toEqual([null, null, 1])
    expect(dec).toHaveLength(33)
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
