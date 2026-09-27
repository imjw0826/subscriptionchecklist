/**
 * 서비스명 → 로고.
 * - simple-icons(CC0)에 있는 브랜드는 공식 아이콘 경로를 쓴다.
 * - 없는 서비스는 각 회사가 App Store에 올린 공식 앱 아이콘(public/logos/*.png, 128px)을 쓰고,
 *   이미지가 없거나 불러오지 못하면 브랜드 색과 글자로 만든 간단한 마크로 대신한다.
 * 이름에 브랜드가 여러 개면 이름에서 먼저 나오는 브랜드, 같은 위치면 더 길게 맞는 쪽을 고른다.
 */
import type { ReactNode } from 'react'
import {
  siAppletv,
  siApplemusic,
  siClaude,
  siDropbox,
  siDuolingo,
  siEvernote,
  siFigma,
  siGithub,
  siGoogledrive,
  siGooglegemini,
  siIcloud,
  siKakaotalk,
  siNaver,
  siNetflix,
  siNotion,
  siPerplexity,
  siSpotify,
  siTwitch,
  siYoutube,
  type SimpleIcon,
} from 'simple-icons'

export interface CustomMark {
  title: string
  /** 원형 배경 (CSS background) */
  bg: string
  /** viewBox 0 0 24 24 안에 그릴 내용. id는 그라데이션 등의 고유 ID 접두사 */
  draw: (id: string) => ReactNode
  /** 공식 앱 아이콘 경로 (있으면 우선 사용) */
  image?: string
}

export type Logo = { kind: 'simple'; icon: SimpleIcon } | { kind: 'custom'; mark: CustomMark }

/** 가운데 정렬 글자 마크 */
function letter(text: string, size: number, fill = '#fff', extra: Record<string, string | number> = {}) {
  return (
    <text
      x="12"
      y="12.6"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={size}
      fontWeight={900}
      fill={fill}
      fontFamily="'Pretendard Variable', Pretendard, system-ui, sans-serif"
      {...extra}
    >
      {text}
    </text>
  )
}

/** 여러 색이 이어지는 가로 그라데이션 글자 */
function gradientLetter(id: string, text: string, size: number, stops: string[], hard = false) {
  const n = stops.length
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          {stops.flatMap((c, i) =>
            hard
              ? [<stop key={`${i}a`} offset={i / n} stopColor={c} />, <stop key={`${i}b`} offset={(i + 1) / n} stopColor={c} />]
              : [<stop key={i} offset={n === 1 ? 0 : i / (n - 1)} stopColor={c} />],
          )}
        </linearGradient>
      </defs>
      {letter(text, size, `url(#${id})`)}
    </>
  )
}

const CUSTOM: [RegExp, CustomMark][] = [
  [/티빙|tving/i, { title: 'TVING', image: '/logos/tving.png', bg: '#FF153C', draw: () => letter('T', 14) }],
  [
    /웨이브|wavve/i,
    {
      title: 'Wavve',
      image: '/logos/wavve.png',
      bg: '#1351F9',
      draw: () => <path d="M4.5 13.5c1.6-3.6 3.4-3.6 5 0s3.4 3.6 5 0 3.2-3.4 5-.6" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" />,
    },
  ],
  [/디즈니|disney/i, { title: 'Disney+', image: '/logos/disney.png', bg: 'linear-gradient(135deg,#0B1541,#1D46B8)', draw: () => letter('D+', 10) }],
  [/왓챠|watcha/i, { title: 'WATCHA', image: '/logos/watcha.png', bg: '#FF0558', draw: () => letter('W', 12) }],
  [/라프텔|laftel/i, { title: 'Laftel', image: '/logos/laftel.png', bg: '#816BFF', draw: () => letter('L', 13) }],
  [/멜론|melon/i, { title: 'Melon', image: '/logos/melon.png', bg: '#00CD3C', draw: () => letter('m', 15) }],
  [/지니|genie/i, { title: 'genie', image: '/logos/genie.png', bg: 'linear-gradient(135deg,#34C4FF,#1F78FF)', draw: () => letter('g', 15, '#fff', { y: 11 }) }],
  [/(?<![a-z])flo(?![a-z])|^플로/i, { title: 'FLO', image: '/logos/flo.png', bg: '#3F3FFF', draw: () => letter('FLO', 7.5, '#fff', { letterSpacing: -0.3 }) }],
  [/네이버\s?vibe|바이브|vibe/i, { title: 'VIBE', image: '/logos/vibe.png', bg: '#000', draw: (id) => gradientLetter(id, 'V', 14, ['#FF3D8B', '#8A4DFF', '#2ED0FF']) }],
  [/벅스|bugs/i, { title: 'Bugs', image: '/logos/bugs.png', bg: '#FF3C28', draw: () => letter('b', 15) }],
  [
    /쿠팡|coupang/i,
    { title: 'Coupang', image: '/logos/coupang.png', bg: '#fff', draw: (id) => gradientLetter(id, 'c', 17, ['#9E4B2B', '#E83C2F', '#F5A623', '#35B34A', '#2E8BD8']) },
  ],
  [/배민|배달의민족/i, { title: '배민', image: '/logos/baemin.png', bg: '#2AC1BC', draw: () => letter('배민', 8) }],
  [/요기요|요기패스/i, { title: '요기요', image: '/logos/yogiyo.png', bg: '#FA0050', draw: () => letter('요', 12) }],
  [
    /신세계|유니버스 클럽|ssg|쓱/i,
    { title: '신세계 유니버스 클럽', image: '/logos/universe.png', bg: '#111', draw: (id) => gradientLetter(id, 'U', 13, ['#FF4E8A', '#8C5BFF', '#3DC5FF']) },
  ],
  [/컬리|kurly/i, { title: 'Kurly', image: '/logos/kurly.png', bg: '#5F0080', draw: () => letter('K', 12) }],
  [
    /t\s?우주|우주패스/i,
    {
      title: 'T 우주',
      image: '/logos/tuniverse.png',
      bg: 'linear-gradient(135deg,#7B3FF2,#3A1FB8)',
      draw: () => (
        <>
          <ellipse cx="12" cy="12" rx="9" ry="3.4" transform="rotate(-20 12 12)" fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={1.1} />
          {letter('T', 11)}
        </>
      ),
    },
  ],
  [/^밀리|밀리의\s?서재|millie/i, { title: '밀리의 서재', image: '/logos/millie.png', bg: '#FFE500', draw: () => letter('m', 15, '#1A1A1A') }],
  [/^리디|리디셀렉트|리디북스|ridi/i, { title: 'RIDI', image: '/logos/ridi.png', bg: '#1F8CE6', draw: () => letter('RIDI', 6.8, '#fff', { letterSpacing: -0.2 }) }],
  [/윌라|welaaa/i, { title: 'Welaaa', image: '/logos/welaaa.png', bg: '#222', draw: () => letter('W', 12) }],
  [
    /microsoft|마이크로소프트|ms\s?365|오피스/i,
    {
      title: 'Microsoft 365',
      bg: '#fff',
      draw: () => (
        <>
          <rect x="5" y="5" width="6.6" height="6.6" fill="#F25022" />
          <rect x="12.4" y="5" width="6.6" height="6.6" fill="#7FBA00" />
          <rect x="5" y="12.4" width="6.6" height="6.6" fill="#00A4EF" />
          <rect x="12.4" y="12.4" width="6.6" height="6.6" fill="#FFB900" />
        </>
      ),
    },
  ],
  [
    /구글\s?원|google\s?one/i,
    { title: 'Google One', image: '/logos/googleone.png', bg: '#fff', draw: (id) => gradientLetter(id, '1', 16, ['#4285F4', '#EA4335', '#FBBC04', '#34A853'], true) },
  ],
  [
    /chatgpt|챗\s?gpt|openai/i,
    {
      title: 'ChatGPT',
      image: '/logos/chatgpt.png',
      bg: '#000',
      draw: () => (
        <g fill="none" stroke="#fff" strokeWidth={1.5}>
          <ellipse cx="12" cy="12" rx="6.6" ry="3.1" />
          <ellipse cx="12" cy="12" rx="6.6" ry="3.1" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="6.6" ry="3.1" transform="rotate(120 12 12)" />
        </g>
      ),
    },
  ],
]

const SIMPLE: [RegExp, SimpleIcon][] = [
  [/넷플릭스|netflix/i, siNetflix],
  [/유튜브|youtube/i, siYoutube],
  [/네이버|naver/i, siNaver],
  [/icloud|아이클라우드/i, siIcloud],
  [/스포티파이|spotify/i, siSpotify],
  [/애플\s?뮤직|apple\s?music/i, siApplemusic],
  [/애플\s?tv|apple\s?tv/i, siAppletv],
  [/노션|notion/i, siNotion],
  [/피그마|figma/i, siFigma],
  [/구글\s?드라이브|google\s?drive/i, siGoogledrive],
  [/드롭박스|dropbox/i, siDropbox],
  [/깃허브|github|copilot/i, siGithub],
  [/듀오링고|duolingo/i, siDuolingo],
  [/카카오|kakao/i, siKakaotalk],
  [/트위치|twitch/i, siTwitch],
  [/클로드|claude/i, siClaude],
  [/제미나이|gemini/i, siGooglegemini],
  [/퍼플렉시티|perplexity/i, siPerplexity],
  [/에버노트|evernote/i, siEvernote],
]

export function logoFor(name: string): Logo | undefined {
  let best: { index: number; length: number; logo: Logo } | undefined
  const consider = (re: RegExp, logo: Logo) => {
    const m = re.exec(name)
    if (!m) return
    if (!best || m.index < best.index || (m.index === best.index && m[0].length > best.length)) best = { index: m.index, length: m[0].length, logo }
  }
  for (const [re, mark] of CUSTOM) consider(re, { kind: 'custom', mark })
  for (const [re, icon] of SIMPLE) consider(re, { kind: 'simple', icon })
  return best?.logo
}

/** 밝은 브랜드색(카카오 노랑 등)은 흰 바탕에서 안 보이므로 색 바탕 + 어두운 글리프로 그린다 */
export function isLightHex(hex: string): boolean {
  const n = parseInt(hex, 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.7
}
