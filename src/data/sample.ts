import type { AppData, Subscription } from '../types'
import { addMonths, toISO, todayISO } from '../lib/date'
import { newId } from '../lib/format'

const base: Omit<Subscription, 'id' | 'name' | 'category' | 'listPrice' | 'nextBillingDate'> = {
  cycleMonths: 1,
  paymentMethodId: null,
  status: 'active',
  trialEndDate: null,
  priceAfterTrial: null,
  discountType: 'none',
  discountValue: 0,
  shareCount: 1,
  myShareOverride: null,
  detailType: 'usage',
  usageUnit: 'minutes',
  usageTarget: 0,
  memo: '',
  catalogId: null,
}

/** 로컬 모드 첫 실행 시 보여줄 샘플 데이터 (오늘 날짜 기준으로 생성) */
export function createSampleData(today = todayISO()): AppData {
  // Supabase로 가져올 수 있도록 실제 UUID를 쓴다
  const ids: Record<string, string> = {}
  const id = (key: string) => (ids[key] ??= newId())
  const [y, m] = today.split('-').map(Number)
  const day = (d: number) => toISO(y, m, Math.min(d, Number(today.slice(8))))
  const inDays = (n: number) => {
    const t = new Date(y, m - 1, Number(today.slice(8)) + n)
    return toISO(t.getFullYear(), t.getMonth() + 1, t.getDate())
  }

  const subscriptions: Subscription[] = [
    { ...base, id: id('sample-netflix'), name: '넷플릭스', category: 'OTT', listPrice: 17000, nextBillingDate: inDays(2), paymentMethodId: id('sample-pm-shinhan'), shareCount: 4, usageUnit: 'minutes', usageTarget: 600, memo: '프리미엄 4인 공유' },
    { ...base, id: id('sample-coupang'), name: '쿠팡 와우', category: '쇼핑', listPrice: 7890, nextBillingDate: inDays(12), paymentMethodId: id('sample-pm-naverpay'), detailType: 'benefit', catalogId: '15:와우 멤버십' },
    { ...base, id: id('sample-naver'), name: '네이버플러스 멤버십', category: '쇼핑', listPrice: 4900, nextBillingDate: inDays(20), paymentMethodId: id('sample-pm-naverpay'), detailType: 'benefit', catalogId: '16:정기 이용권' },
    { ...base, id: id('sample-youtube'), name: '유튜브 프리미엄', category: 'OTT', listPrice: 14900, nextBillingDate: inDays(8), paymentMethodId: id('sample-pm-shinhan'), discountType: 'percent', discountValue: 10, usageUnit: 'minutes', usageTarget: 1200, memo: '카드 청구할인 10%' },
    { ...base, id: id('sample-icloud'), name: 'iCloud+ 200GB', category: '클라우드', listPrice: 44000, cycleMonths: 12, nextBillingDate: addMonths(day(15), 5), paymentMethodId: id('sample-pm-shinhan'), usageUnit: 'count', usageTarget: 4, memo: '연 결제' },
    { ...base, id: id('sample-millie'), name: '밀리의 서재', category: '도서', listPrice: 9900, nextBillingDate: inDays(3), status: 'trial', trialEndDate: inDays(3), priceAfterTrial: 9900, paymentMethodId: id('sample-pm-kb'), usageUnit: 'count', usageTarget: 4 },
  ]

  return {
    subscriptions,
    paymentMethods: [
      { id: id('sample-pm-shinhan'), nickname: '신한 딥드림', type: 'card', last4: '1234' },
      { id: id('sample-pm-kb'), nickname: 'KB 국민', type: 'card', last4: '5678' },
      { id: id('sample-pm-naverpay'), nickname: '네이버페이', type: 'easypay', last4: '' },
    ],
    benefits: [],
    usageLogs: [
      { id: id('sample-l1'), subscriptionId: id('sample-youtube'), date: day(1), amount: 120 },
      { id: id('sample-l2'), subscriptionId: id('sample-youtube'), date: day(4), amount: 90 },
      { id: id('sample-l3'), subscriptionId: id('sample-youtube'), date: day(6), amount: 300 },
      { id: id('sample-l4'), subscriptionId: id('sample-netflix'), date: day(2), amount: 140 },
      { id: id('sample-l5'), subscriptionId: id('sample-netflix'), date: day(5), amount: 200 },
      { id: id('sample-l6'), subscriptionId: id('sample-netflix'), date: day(6), amount: 330 },
      { id: id('sample-l7'), subscriptionId: id('sample-icloud'), date: day(1), amount: 1 },
    ],
  }
}
