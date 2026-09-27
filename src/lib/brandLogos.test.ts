import { describe, expect, it } from 'vitest'
import md from '../data/catalog.md?raw'
import { parseCatalog, subscriptionName } from './catalog'
import { logoFor } from './brandLogos'

const catalog = parseCatalog(md)
const title = (name: string) => {
  const logo = logoFor(name)
  return logo?.kind === 'custom' ? logo.mark.title : logo?.icon.title
}

describe('서비스 로고', () => {
  it('카탈로그의 모든 요금제에 로고가 있음', () => {
    const missing = catalog.plans.map((p) => subscriptionName(p)).filter((n) => !logoFor(n))
    expect(missing).toEqual([])
  })
  it('서비스마다 로고가 겹치지 않음 (네이버플러스·VIBE, 카카오 두 서비스 제외)', () => {
    const titles = catalog.services.map((s) => title(s.name))
    const shared = new Set(['Naver', 'KakaoTalk'])
    const counts = titles.filter((t) => !shared.has(t!)).reduce<Record<string, number>>((m, t) => ({ ...m, [t!]: (m[t!] ?? 0) + 1 }), {})
    expect(Object.entries(counts).filter(([, c]) => c > 1)).toEqual([])
  })
  it('여러 브랜드가 들어간 이름은 앞쪽 브랜드', () => {
    expect(title('배민클럽+유튜브 프리미엄 결합상품')).toBe('배민')
    expect(title('네이버플러스 멤버십 넷플릭스 스탠다드 업그레이드')).toBe('Naver')
    expect(title('T 우주패스 with Disney+ (스탠다드)')).toBe('T 우주')
    expect(title('지니뮤직 지니 X 밀리의 서재')).toBe('genie')
  })
  it('같은 위치면 더 길게 맞는 브랜드', () => {
    expect(title('네이버 VIBE 무제한 듣기')).toBe('VIBE')
    expect(title('Google One Basic (100GB)')).toBe('Google One')
  })
  it('공식 아이콘 경로는 모두 실제 파일', () => {
    const files = Object.keys(import.meta.glob('/public/logos/*.png')).map((f) => f.replace('/public', ''))
    const images = catalog.services.flatMap((s) => {
      const logo = logoFor(s.name)
      return logo?.kind === 'custom' && logo.mark.image ? [logo.mark.image] : []
    })
    expect(images).toHaveLength(21)
    expect(images.filter((i) => !files.includes(i))).toEqual([])
  })
  it('다른 단어 속 글자에는 걸리지 않음', () => {
    expect(title('네이버플러스 멤버십 패밀리 멤버십')).toBe('Naver')
    expect(logoFor('패밀리 요금제')).toBeUndefined()
    expect(logoFor('Webflow')).toBeUndefined()
  })
})
