import { describe, expect, it } from 'vitest'
import { friendlyError, isTransient, withRetry } from './retry'

const noSleep = async () => {}

function sequence<T>(...results: ({ data: T; error: null } | { data: null; error: { message: string; code?: string } } | Error)[]) {
  let i = 0
  const calls = { count: 0 }
  const request = () => {
    calls.count++
    const r = results[Math.min(i++, results.length - 1)]
    return r instanceof Error ? Promise.reject(r) : Promise.resolve(r as { data: T; error: { message: string } | null })
  }
  return { request, calls }
}

describe('일시적 오류 다시 시도', () => {
  it('토큰 갱신 직후 "JWT issued at future"는 다시 시도해서 성공', async () => {
    const { request, calls } = sequence({ data: null, error: { message: 'JWT issued at future', code: 'PGRST303' } }, { data: [1, 2], error: null })
    await expect(withRetry(request, [10, 10], noSleep)).resolves.toEqual([1, 2])
    expect(calls.count).toBe(2)
  })
  it('fetch 자체가 던지는 네트워크 오류도 다시 시도', async () => {
    const { request, calls } = sequence<string>(new TypeError('Failed to fetch'), { data: 'ok', error: null })
    await expect(withRetry(request, [10], noSleep)).resolves.toBe('ok')
    expect(calls.count).toBe(2)
  })
  it('계속 실패하면 정해진 횟수만큼만 시도하고 오류', async () => {
    const { request, calls } = sequence({ data: null, error: { message: 'JWT issued at future' } })
    await expect(withRetry(request, [10, 10, 10], noSleep)).rejects.toThrow('JWT issued at future')
    expect(calls.count).toBe(4)
  })
  it('권한·검증 오류는 다시 시도하지 않음', async () => {
    const { request, calls } = sequence({ data: null, error: { message: 'new row violates row-level security policy', code: '42501' } })
    await expect(withRetry(request, [10, 10], noSleep)).rejects.toThrow('row-level security')
    expect(calls.count).toBe(1)
  })
  it('일시적 오류 판별', () => {
    expect(isTransient({ message: 'JWT issued at future' })).toBe(true)
    expect(isTransient({ message: 'x', code: 'PGRST303' })).toBe(true)
    expect(isTransient({ message: 'JWT expired' })).toBe(false)
    expect(isTransient({ message: 'duplicate key value' })).toBe(false)
  })
})

describe('오류 문구', () => {
  it('영어 오류를 한국어로', () => {
    expect(friendlyError('JWT issued at future')).toContain('로그인 정보')
    expect(friendlyError('TypeError: Failed to fetch')).toContain('인터넷 연결')
    expect(friendlyError('new row violates row-level security policy')).toContain('권한')
  })
})
