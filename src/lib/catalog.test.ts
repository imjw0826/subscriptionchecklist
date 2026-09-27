import { describe, expect, it } from 'vitest'
import md from '../data/catalog.md?raw'
import { checklistNames, defaultDetail, parseCatalog, parsePrices, searchCatalog, subscriptionName } from './catalog'

const catalog = parseCatalog(md)
const plan = (service: number, name: string) => catalog.plans.find((p) => p.serviceNo === service && p.plan === name)!

describe('카탈로그 파싱', () => {
  it('서비스 30개, 요금제 191개', () => {
    expect(catalog.services).toHaveLength(30)
    expect(catalog.plans).toHaveLength(191)
    expect(catalog.researchedAt).toBe('2026-09-27')
  })
  it('모든 요금제에 혜택과 가격 문구가 있음', () => {
    for (const p of catalog.plans) {
      expect(p.benefits.length, p.id).toBeGreaterThan(0)
      expect(p.priceText, p.id).not.toBe('')
    }
  })
  it('하위 목록은 부모 혜택의 children', () => {
    const core = plan(20, '멤버스 코어 (무배형)')
    expect(core.benefits.some((b) => b.children.includes('무료배송 쿠폰 31장 (2만원 이상 구매 시 사용, 매일 1장씩 사용 가능한 구성)'))).toBe(true)
  })
  it('[검색보완] 태그는 표시에서 빼고 플래그로 남김', () => {
    const wow = plan(15, '와우 멤버십')
    const play = wow.benefits.find((b) => b.text.startsWith('쿠팡플레이 광고형'))!
    expect(play.supplemented).toBe(true)
    expect(play.text).not.toContain('[검색보완')
  })
  it('가격이 하위 목록으로 적힌 요금제', () => {
    const millie = plan(22, '전자책 정기구독')
    expect(millie.priceText.split('\n')).toHaveLength(7)
    expect(millie.prices[0]).toEqual({ label: '월간', price: 11900, cycleMonths: 1 })
  })
  it('서비스 참고의 출처 URL', () => {
    expect(catalog.services[0].sources).toEqual(['https://help.netflix.com/ko/node/24926'])
  })
})

describe('가격 문구 해석', () => {
  const first = (t: string) => parsePrices(t)[0]
  it('월 / 연', () => {
    expect(parsePrices('월 9,900원 / 연 99,000원')).toEqual([
      { label: '월간', price: 9900, cycleMonths: 1 },
      { label: '연간', price: 99000, cycleMonths: 12 },
    ])
    expect(parsePrices('월 ₩2,900 / 연 ₩29,900').map((o) => o.price)).toEqual([2900, 29900])
  })
  it('정기결제 할인가와 3·6·12개월', () => {
    const o = parsePrices('정가 8,800원 / 정기결제 할인가 8,690원 (3개월 정기결제 24,550원=월 8,183원 환산, 6개월 46,990원=월 7,832원 환산, 12개월 89,760원=월 7,480원 환산)')
    expect(o.map((x) => [x.cycleMonths, x.price])).toEqual([
      [1, 8690],
      [3, 24550],
      [6, 46990],
      [12, 89760],
    ])
  })
  it('실결제, 상시 프로모션, 정가 / 할인가', () => {
    expect(first('정가 13,090원 → 실결제 9,000원').price).toBe(9000)
    expect(first('정가 월 3,990원 / 프로모션가 월 1,990원 (상시 적용 중)').price).toBe(1990)
    expect(first('정가 20,040원 / 13,498원').price).toBe(13498)
  })
  it('정상가는 회차 할인 문구에서만 우선', () => {
    expect(first('첫 1~3회차 6,960원(20% 할인) / 4회차부터 정상가 8,700원').price).toBe(8700)
    expect(first('월 6,500원 (정상가 7,000원)').price).toBe(6500)
  })
  it('연 단위로만 적힌 가격', () => {
    expect(parsePrices('23,880원/년 (월환산 약 1,990원)')).toEqual([{ label: '연간', price: 23880, cycleMonths: 12 }])
  })
  it('다른 요금제에 추가되는 상품은 기본 요금제의 연 요금을 옵션으로 쓰지 않음', () => {
    expect(parsePrices('월 6,500원 (정기 이용권 월 4,900원/연 46,800원에 추가)')).toEqual([{ label: '월간', price: 6500, cycleMonths: 1 }])
  })
  it('추가 비용 없음', () => {
    expect(first('추가 구독료 없음 (토스 회원 대상)')).toEqual({ label: '추가 비용 없음', price: 0, cycleMonths: 1 })
  })
  it('원화가 아니거나 금액이 없으면 옵션 없음', () => {
    expect(parsePrices('US$100/월')).toEqual([])
    expect(parsePrices('최대 43% 할인')).toEqual([])
    expect(parsePrices('한국 미제공')).toEqual([])
  })
})

describe('검색', () => {
  const names = (q: string) => searchCatalog(catalog, q).map((p) => subscriptionName(p))
  it('한글 서비스명 일부', () => {
    // 넷플릭스 요금제가 먼저, 넷플릭스를 포함하는 네이버플러스 업그레이드 상품이 그 뒤
    expect(names('넷플')).toEqual([
      '넷플릭스 광고형 스탠다드',
      '넷플릭스 스탠다드',
      '넷플릭스 프리미엄',
      '네이버플러스 멤버십 넷플릭스 스탠다드 업그레이드',
      '네이버플러스 멤버십 넷플릭스 프리미엄 업그레이드',
    ])
  })
  it('영문·별칭', () => {
    expect(searchCatalog(catalog, 'netflix')[0].serviceNo).toBe(1)
    expect(searchCatalog(catalog, '배달의민족')[0].serviceNo).toBe(17)
    expect(searchCatalog(catalog, 'wow')[0].serviceNo).toBe(15)
  })
  it('서비스 + 요금제 조합, 띄어쓰기 무시', () => {
    expect(names('티빙 프리미엄')[0]).toBe('티빙 프리미엄')
    expect(names('유튜브프리미엄 lite')).toEqual(['유튜브 프리미엄 Premium Lite'])
  })
  it('서비스명이 앞에서 맞는 결과가 먼저', () => {
    // '티빙'은 웨이브·디즈니+·배민 결합상품에도 나오지만 티빙 요금제가 먼저
    expect(searchCatalog(catalog, '티빙')[0].serviceNo).toBe(2)
  })
  it('빈 검색어는 결과 없음', () => {
    expect(searchCatalog(catalog, '  ')).toEqual([])
  })
})

describe('구독으로 변환', () => {
  it('겹치는 단어를 합친 이름', () => {
    expect(subscriptionName(plan(15, '와우 멤버십'))).toBe('쿠팡 와우 멤버십')
    expect(subscriptionName(plan(1, '프리미엄'))).toBe('넷플릭스 프리미엄')
    expect(subscriptionName(plan(29, '이모티콘 플러스'))).toBe('카카오 이모티콘 플러스')
  })
  it('쇼핑 멤버십은 혜택형, OTT는 분 단위 이용형', () => {
    expect(defaultDetail(plan(17, '월간 이용권'))).toEqual({ detailType: 'benefit', usageUnit: 'count' })
    expect(defaultDetail(plan(1, '프리미엄'))).toEqual({ detailType: 'usage', usageUnit: 'minutes' })
    expect(defaultDetail(plan(28, 'Plus'))).toEqual({ detailType: 'usage', usageUnit: 'count' })
  })
  it('체크리스트 이름: 40자 이내, 하위 항목 펼침, 기간 한정 프로모션 제외', () => {
    const names = checklistNames(plan(20, '멤버스 코어 (무배형)'))
    expect(names).toContain('무료배송 쿠폰 31장')
    expect(names.some((n) => n.startsWith('[프로모션'))).toBe(false)
    expect(names.every((n) => n.length <= 40)).toBe(true)
    expect(checklistNames(plan(15, '와우 멤버십'))[0]).toBe('로켓배송 상품 무료배송')
  })
})
