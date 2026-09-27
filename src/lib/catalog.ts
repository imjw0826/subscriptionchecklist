/**
 * 구독 서비스 카탈로그 (src/data/catalog.md) 파서와 검색.
 * 문서 형식: `# N. 서비스` → `## 서비스 | 요금제` → `- 가격:` / `- 포함 혜택:` / `- 유의사항:` / `### 서비스 참고`
 * 문서를 고치면 앱의 검색 목록도 그대로 바뀐다.
 */
import type { DetailType, UsageUnit } from '../types'

export interface CatalogItem {
  text: string
  children: string[]
  /** 공식 페이지가 아닌 출처로 보완된 항목 */
  supplemented: boolean
}

export interface PriceOption {
  label: string
  price: number
  cycleMonths: number
}

export interface CatalogPlan {
  id: string
  serviceNo: number
  service: string
  plan: string
  group: string
  /** 구독 폼의 카테고리 값 */
  category: string
  priceText: string
  prices: PriceOption[]
  benefits: CatalogItem[]
  notes: CatalogItem[]
  supplemented: boolean
}

export interface CatalogService {
  no: number
  name: string
  fullName: string
  group: string
  category: string
  keywords: string
  remarks: string[]
  sources: string[]
  plans: CatalogPlan[]
}

export interface Catalog {
  researchedAt: string
  services: CatalogService[]
  plans: CatalogPlan[]
}

/** 앱에서 쓰는 짧은 서비스명과 검색 별칭 */
const SERVICE_META: Record<number, { name: string; category?: string; aliases?: string }> = {
  1: { name: '넷플릭스', aliases: 'netflix' },
  2: { name: '티빙', aliases: 'tving' },
  3: { name: '웨이브', aliases: 'wavve' },
  4: { name: '디즈니+', aliases: 'disney 디즈니플러스' },
  5: { name: '왓챠', aliases: 'watcha' },
  6: { name: '유튜브 프리미엄', aliases: 'youtube 유튜브뮤직 youtube music' },
  7: { name: 'Apple TV', aliases: '애플tv 애플티비 apple one 애플원' },
  8: { name: '라프텔', aliases: 'laftel 애니' },
  9: { name: '멜론', aliases: 'melon' },
  10: { name: '지니뮤직', aliases: 'genie 지니' },
  11: { name: '스포티파이', aliases: 'spotify' },
  12: { name: 'FLO', aliases: '플로' },
  13: { name: '네이버 VIBE', aliases: '바이브 vibe' },
  14: { name: '벅스', aliases: 'bugs' },
  15: { name: '쿠팡 와우', aliases: 'coupang wow 쿠팡플레이' },
  16: { name: '네이버플러스 멤버십', aliases: 'naver 네플멤 네이버 멤버십' },
  17: { name: '배민클럽', aliases: '배달의민족 배민' },
  18: { name: '요기패스X', aliases: '요기요 yogiyo' },
  19: { name: '신세계 유니버스 클럽', aliases: 'ssg 쓱 g마켓 지마켓 이마트 유니버스' },
  20: { name: '컬리멤버스', aliases: '마켓컬리 kurly 컬리' },
  21: { name: 'T우주', aliases: 'skt 우주패스 t우주패스' },
  22: { name: '밀리의 서재', aliases: '밀리 millie' },
  23: { name: '리디셀렉트', aliases: 'ridi 리디' },
  24: { name: '윌라', aliases: 'welaaa 오디오북' },
  25: { name: 'Microsoft 365', category: '생산성', aliases: 'ms365 오피스 office 마이크로소프트' },
  26: { name: 'iCloud+', category: '클라우드', aliases: 'icloud 아이클라우드 apple one' },
  27: { name: 'Google One', category: '클라우드', aliases: '구글원 구글 google ai gemini 제미나이' },
  28: { name: 'ChatGPT', category: 'AI', aliases: '챗gpt 챗지피티 openai gpt' },
  29: { name: '카카오 이모티콘 플러스', category: '메신저', aliases: '카톡 kakao 이모티콘' },
  30: { name: '카카오 톡클라우드', category: '클라우드', aliases: '톡서랍 카톡 kakao' },
}

const GROUP_CATEGORY: Record<string, string> = {
  OTT: 'OTT',
  음악: '음악',
  '쇼핑·배달 멤버십': '쇼핑',
  '도서·오디오북': '도서',
}

const SUPPLEMENT = /\[검색보완[^\]]*\]/

function stripTags(text: string): string {
  return text.replace(/\s*\[검색보완[^\]]*\]\s*/g, ' ').replace(/\s+/g, ' ').trim()
}

function item(text: string): CatalogItem {
  return { text: stripTags(text), children: [], supplemented: SUPPLEMENT.test(text) }
}

// ---------- 가격 ----------

const num = (s: string) => Number(s.replace(/,/g, ''))
/** ₩가 앞에 있거나 원이 뒤에 있는 금액만 인정 (US$ 가격·퍼센트 제외) */
const WON = String.raw`(?:₩\s*([\d,]{3,})|([\d,]{3,})\s*원)`

function wonAfter(text: string, prefix: string): number | null {
  const m = text.match(new RegExp(prefix + String.raw`\s*` + WON))
  return m ? num(m[1] ?? m[2]) : null
}

/**
 * 가격 문구에서 선택 가능한 금액 옵션을 뽑는다. 첫 번째가 기본값.
 * 문구가 제각각이라 정기결제 → 실결제 → 상시 프로모션 → `정가 X / Y`의 Y → `월 X` → 첫 금액 순으로 고른다.
 */
export function parsePrices(raw: string): PriceOption[] {
  const text = raw.replace(/\[[^\]]*\]/g, '')
  const options: PriceOption[] = []
  const add = (label: string, price: number | null, cycleMonths: number) => {
    if (price == null || price <= 0) return
    if (options.some((o) => o.price === price && o.cycleMonths === cycleMonths)) return
    options.push({ label, price, cycleMonths })
  }
  if (/추가 (구독료|비용) 없음/.test(text)) {
    options.push({ label: '추가 비용 없음', price: 0, cycleMonths: 1 })
    if (/구독료 없음/.test(text)) return options
  }
  // "23,880원/년"처럼 연 단위로만 적힌 경우
  const perYear = text.match(/^\s*([\d,]{3,})\s*원\s*\/\s*년/)
  if (perYear) {
    add('연간', num(perYear[1]), 12)
    return options
  }

  const slash = text.match(new RegExp(String.raw`^\s*정가\s*` + WON + String.raw`\s*/\s*` + WON))
  const monthly =
    (/회차/.test(text) ? wonAfter(text, '정상가') : null) ??
    wonAfter(text, String.raw`정기결제(?:\s*할인가)?\s*(?:월)?`) ??
    wonAfter(text, '실결제') ??
    (/상시/.test(text) ? wonAfter(text, String.raw`프로모션가\s*월`) : null) ??
    (slash ? num(slash[3] ?? slash[4]) : null) ??
    wonAfter(text, '월') ??
    (() => {
      const m = text.match(new RegExp(WON))
      return m ? num(m[1] ?? m[2]) : null
    })()
  add('월간', monthly, 1)
  add('3개월', wonAfter(text, String.raw`3개월(?:\s*정기결제)?`), 3)
  add('6개월', wonAfter(text, String.raw`6개월(?:\s*정기결제)?`), 6)
  // "기본 이용권 연 46,800원에 추가"처럼 다른 요금제의 연 요금은 제외
  if (!/에 추가/.test(text)) add('연간', wonAfter(text, String.raw`(?:연|12개월)(?:\s*정기결제)?`), 12)
  return options
}

// ---------- 파서 ----------

export function parseCatalog(md: string): Catalog {
  const lines = md.split('\n')
  const researchedAt = md.match(/조사일:\s*([\d-]+)/)?.[1] ?? ''

  // 목차에서 서비스 번호 → 그룹
  const groupOf = new Map<number, string>()
  let tocGroup = ''
  for (const line of lines) {
    const g = line.match(/^\*\*\[(.+)\]\*\*/)
    if (g) tocGroup = g[1]
    const s = line.match(/^- (\d+)\. /)
    if (s && tocGroup) groupOf.set(Number(s[1]), tocGroup)
    if (line.startsWith('---')) break
  }

  const services: CatalogService[] = []
  let service: CatalogService | null = null
  let plan: CatalogPlan | null = null
  let list: CatalogItem[] | null = null
  let priceLines: string[] | null = null
  let inRef = false

  for (const line of lines) {
    const svc = line.match(/^# (\d+)\. (.+)$/)
    if (svc) {
      const no = Number(svc[1])
      const meta = SERVICE_META[no] ?? { name: svc[2] }
      const group = groupOf.get(no) ?? ''
      service = {
        no,
        name: meta.name,
        fullName: svc[2].trim(),
        group,
        category: meta.category ?? GROUP_CATEGORY[group] ?? group,
        keywords: `${meta.name} ${svc[2]} ${meta.aliases ?? ''} ${group}`,
        remarks: [],
        sources: [],
        plans: [],
      }
      services.push(service)
      plan = null
      list = null
      inRef = false
      continue
    }
    if (!service) continue

    const p = line.match(/^## (.+?) \| (.+)$/)
    if (p) {
      const title = p[2].trim()
      plan = {
        id: `${service.no}:${stripTags(title)}`,
        serviceNo: service.no,
        service: service.name,
        plan: stripTags(title),
        group: service.group,
        category: service.category,
        priceText: '',
        prices: [],
        benefits: [],
        notes: [],
        supplemented: SUPPLEMENT.test(title),
      }
      service.plans.push(plan)
      list = null
      inRef = false
      continue
    }
    if (/^### /.test(line)) {
      plan = null
      list = null
      inRef = true
      continue
    }
    if (line.startsWith('※')) {
      service.remarks.push(line.replace(/^※\s*(참고:)?\s*/, ''))
      continue
    }

    if (inRef) {
      const src = line.match(/^- 출처:\s*(.+)$/)
      if (src) service.sources.push(...src[1].split(/\s*,\s*/).filter((u) => /^https?:\/\//.test(u)))
      else if (/^- /.test(line)) service.remarks.push(stripTags(line.slice(2)))
      continue
    }
    if (!plan) continue

    const price = line.match(/^- 가격:\s*(.*)$/)
    if (price) {
      list = null
      if (price[1]) {
        plan.priceText = stripTags(price[1])
        plan.prices = parsePrices(price[1])
      } else {
        priceLines = []
      }
      continue
    }
    // "- 가격:" 아래 하위 목록으로 적힌 가격 (결제 경로별 등)
    if (priceLines) {
      const sub = line.match(/^ {2,}- (.+)$/)
      if (sub) {
        priceLines.push(stripTags(sub[1]))
        continue
      }
      plan.priceText = priceLines.join('\n')
      plan.prices = parsePrices(priceLines[0] ?? '')
      priceLines = null
    }
    if (/^- 포함 혜택:/.test(line)) {
      list = plan.benefits
      continue
    }
    const notes = line.match(/^- 유의사항:\s*(.*)$/)
    if (notes) {
      list = plan.notes
      if (notes[1]) plan.notes.push(item(notes[1]))
      continue
    }
    const child = line.match(/^ {4,}- (.+)$/)
    if (child && list?.length) {
      list[list.length - 1].children.push(stripTags(child[1]))
      continue
    }
    const entry = line.match(/^ {2}- (.+)$/)
    if (entry && list) list.push(item(entry[1]))
  }

  return { researchedAt, services, plans: services.flatMap((s) => s.plans) }
}

// ---------- 검색 ----------

const normalize = (s: string) => s.toLowerCase().replace(/[\s·()+/\-_.,]/g, '')

/** 모든 검색어 조각이 서비스명·별칭·요금제명 어딘가에 들어 있는 요금제. 서비스명이 앞에서 맞을수록 위로. */
export function searchCatalog(catalog: Catalog, query: string, limit = 40): CatalogPlan[] {
  const tokens = query.split(/\s+/).map(normalize).filter(Boolean)
  if (tokens.length === 0) return []
  const byNo = new Map(catalog.services.map((s) => [s.no, s]))
  const scored: { plan: CatalogPlan; score: number }[] = []
  for (const plan of catalog.plans) {
    const svc = byNo.get(plan.serviceNo)!
    const hay = normalize(`${svc.keywords} ${plan.plan}`)
    if (!tokens.every((t) => hay.includes(t))) continue
    const name = normalize(svc.name)
    const first = tokens[0]
    const score = (name.startsWith(first) ? 0 : normalize(svc.keywords).includes(first) ? 1 : 2) * 1000 + plan.serviceNo * 10
    scored.push({ plan, score })
  }
  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((s) => s.plan)
}

// ---------- 구독으로 변환 ----------

/** "쿠팡 와우" + "와우 멤버십" → "쿠팡 와우 멤버십"처럼 겹치는 단어를 합친다 */
export function subscriptionName(plan: CatalogPlan): string {
  const s = plan.service
  const p = plan.plan
  if (normalize(p).includes(normalize(s))) return p
  if (normalize(s).includes(normalize(p))) return s
  const sw = s.split(' ')
  const pw = p.split(' ')
  for (let k = Math.min(sw.length, pw.length); k > 0; k--) {
    if (sw.slice(-k).join(' ') === pw.slice(0, k).join(' ')) return [...sw, ...pw.slice(k)].join(' ')
  }
  return `${s} ${p}`
}

/** 쇼핑·배달 멤버십과 T우주는 혜택 체크리스트형, 나머지는 이용 추적형 */
export function defaultDetail(plan: CatalogPlan): { detailType: DetailType; usageUnit: UsageUnit } {
  if (plan.group.startsWith('쇼핑')) return { detailType: 'benefit', usageUnit: 'count' }
  const minutes = plan.group === 'OTT' || plan.group === '음악' || plan.group.startsWith('도서')
  return { detailType: 'usage', usageUnit: minutes ? 'minutes' : 'count' }
}

/** 체크리스트용 짧은 혜택 이름 (40자). 하위 항목이 있으면 하위 항목을 각각 혜택으로 */
export function checklistNames(plan: CatalogPlan): string[] {
  const shorten = (t: string) => {
    const head = t.split(/\s[:：]\s|\s\(|\(/)[0].trim()
    return head.length > 40 ? head.slice(0, 39) + '…' : head
  }
  // 기간 한정 프로모션은 매달 쓰는 혜택이 아니므로 뺀다
  return plan.benefits
    .filter((b) => !b.text.startsWith('[프로모션'))
    .flatMap((b) => (b.children.length ? b.children.map(shorten) : [shorten(b.text)]))
}
