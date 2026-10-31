/**
 * Supabase 요청의 일시적 실패를 잠시 뒤 다시 시도한다.
 *
 * - "JWT issued at future"(PGRST303): 로그인 토큰이 갱신된 직후, 토큰을 발급한 인증 서버와
 *   데이터 서버(PostgREST)의 시계가 몇 분의 1초 어긋나 새 토큰이 '미래에 발급된 것'으로 거부되는 경우.
 *   잠깐 기다리면 통과한다.
 * - 네트워크 끊김·타임아웃, 일시 정지 후 재시작 중인 프로젝트(502/503/504).
 */
export interface RequestError {
  message: string
  code?: string
}

const TRANSIENT = /JWT issued at future|PGRST303|Failed to fetch|NetworkError|Load failed|fetch failed|timeout|ECONNRESET|503|502|504/i

export function isTransient(error: RequestError): boolean {
  return TRANSIENT.test(error.message) || TRANSIENT.test(error.code ?? '')
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * request는 매번 새 요청을 만드는 함수여야 한다 (Supabase 쿼리 빌더는 한 번 await하면 끝).
 * 일시적 오류면 delays 간격으로 다시 시도하고, 그래도 실패하거나 다른 오류면 Error를 던진다.
 */
export async function withRetry<T>(
  request: () => PromiseLike<{ data: T; error: RequestError | null }>,
  delays: number[] = [400, 1000, 2500],
  sleep: (ms: number) => Promise<void> = wait,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    let result: { data: T; error: RequestError | null }
    try {
      result = await request()
    } catch (e) {
      // fetch 자체가 던지는 네트워크 오류
      result = { data: null as T, error: { message: e instanceof Error ? e.message : String(e) } }
    }
    if (!result.error) return result.data
    if (attempt >= delays.length || !isTransient(result.error)) throw new Error(result.error.message)
    await sleep(delays[attempt])
  }
}

/** 화면에 보여줄 한국어 오류 문구 */
export function friendlyError(message: string): string {
  if (/JWT|PGRST30|token|expired/i.test(message)) return '로그인 정보를 확인하지 못했어요. 새로고침하거나 다시 로그인해 주세요.'
  if (/Failed to fetch|NetworkError|Load failed|fetch failed|timeout/i.test(message)) return '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'
  if (/row-level security|permission denied|42501/i.test(message)) return '이 데이터에 접근할 권한이 없어요. 다시 로그인해 주세요.'
  if (/50[234]/.test(message)) return '서버가 잠시 응답하지 않아요. 잠시 후 다시 시도해 주세요.'
  return message
}
