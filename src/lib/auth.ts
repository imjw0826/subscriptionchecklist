/**
 * 아이디 로그인. Supabase 비밀번호 로그인은 이메일이나 전화번호만 받으므로,
 * 아이디를 메일이 오가지 않는 내부 주소로 바꿔서 쓴다. '@'가 있으면 이메일 그대로 로그인한다.
 */
export const LOGIN_DOMAIN = 'subscriptionchecklist.vercel.app'

export function toAuthEmail(loginId: string): string {
  const id = loginId.trim().toLowerCase()
  return id.includes('@') ? id : `${id}@${LOGIN_DOMAIN}`
}

const LOGIN_ID = /^[a-z0-9][a-z0-9._-]{2,19}$/
const MIN_PASSWORD = 8

/** 회원가입 입력 검사. 문제가 없으면 null */
export function signupError(loginId: string, password: string, confirm: string): string | null {
  if (!LOGIN_ID.test(loginId.trim().toLowerCase())) return '아이디는 영문 소문자·숫자로 시작하는 3~20자로 입력해 주세요. (. _ - 사용 가능)'
  if (password.length < MIN_PASSWORD) return `비밀번호는 ${MIN_PASSWORD}자 이상으로 입력해 주세요.`
  if (password !== confirm) return '비밀번호가 서로 달라요.'
  return null
}

export function loginErrorMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) return '아이디 또는 비밀번호가 맞지 않아요.'
  if (/already registered|already exists/i.test(message)) return '이미 사용 중인 아이디예요.'
  if (/signups? not allowed|signups? (are |is )?disabled/i.test(message)) return '지금은 회원가입을 받지 않아요.'
  if (/password should|weak password/i.test(message)) return '더 안전한 비밀번호를 입력해 주세요.'
  if (/email address .*invalid/i.test(message)) return '이 아이디로는 가입할 수 없어요. 다른 아이디를 입력해 주세요.'
  if (/email not confirmed/i.test(message)) return '아직 사용할 수 없는 계정이에요. 계정 설정을 확인해 주세요.'
  if (/rate limit|too many|security purposes/i.test(message)) return '시도가 너무 많아요. 잠시 후 다시 시도해 주세요.'
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) return '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'
  return message
}
