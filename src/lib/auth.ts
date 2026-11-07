/**
 * 아이디 로그인. Supabase 비밀번호 로그인은 이메일이나 전화번호만 받으므로,
 * 아이디를 메일이 오가지 않는 내부 주소로 바꿔서 쓴다. '@'가 있으면 이메일 그대로 로그인한다.
 */
export const LOGIN_DOMAIN = 'subscriptionchecklist.vercel.app'

export function toAuthEmail(loginId: string): string {
  const id = loginId.trim().toLowerCase()
  return id.includes('@') ? id : `${id}@${LOGIN_DOMAIN}`
}

export function loginErrorMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) return '아이디 또는 비밀번호가 맞지 않아요.'
  if (/email not confirmed/i.test(message)) return '아직 사용할 수 없는 계정이에요. 계정 설정을 확인해 주세요.'
  if (/rate limit|too many|security purposes/i.test(message)) return '시도가 너무 많아요. 잠시 후 다시 시도해 주세요.'
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) return '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'
  return message
}
