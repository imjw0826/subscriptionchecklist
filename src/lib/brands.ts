/**
 * 서비스명 → 브랜드 로고 (simple-icons, CC0).
 * 이름에 키워드가 들어 있으면 매칭한다. 목록에 없는 서비스는 이니셜 아바타로 표시.
 */
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

const BRANDS: [RegExp, SimpleIcon][] = [
  [/넷플릭스|netflix/i, siNetflix],
  [/유튜브|youtube/i, siYoutube],
  [/네이버|naver/i, siNaver],
  [/icloud|아이클라우드/i, siIcloud],
  [/스포티파이|spotify/i, siSpotify],
  [/애플\s?뮤직|apple\s?music/i, siApplemusic],
  [/애플\s?tv|apple\s?tv/i, siAppletv],
  [/노션|notion/i, siNotion],
  [/피그마|figma/i, siFigma],
  [/구글\s?(드라이브|원)|google\s?(drive|one)/i, siGoogledrive],
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

export function brandFor(name: string): SimpleIcon | undefined {
  return BRANDS.find(([re]) => re.test(name))?.[1]
}

/** 밝은 브랜드색(카카오 노랑 등)은 흰 바탕에서 안 보이므로 색 바탕 + 어두운 글리프로 그린다 */
export function isLightHex(hex: string): boolean {
  const n = parseInt(hex, 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.7
}
