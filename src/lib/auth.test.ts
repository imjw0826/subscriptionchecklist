import { describe, expect, it } from 'vitest'
import { LOGIN_DOMAIN, loginErrorMessage, toAuthEmail } from './auth'

describe('아이디 → 로그인 이메일', () => {
  it('아이디는 내부 주소로 바꾼다', () => {
    expect(toAuthEmail('garden')).toBe(`garden@${LOGIN_DOMAIN}`)
  })
  it('앞뒤 공백과 대소문자를 정리한다', () => {
    expect(toAuthEmail('  Garden ')).toBe(`garden@${LOGIN_DOMAIN}`)
  })
  it('이메일은 그대로 쓴다', () => {
    expect(toAuthEmail('me@example.com')).toBe('me@example.com')
  })
})

describe('로그인 오류 문구', () => {
  it('자격 증명 오류', () => {
    expect(loginErrorMessage('Invalid login credentials')).toBe('아이디 또는 비밀번호가 맞지 않아요.')
  })
  it('모르는 오류는 그대로', () => {
    expect(loginErrorMessage('boom')).toBe('boom')
  })
})
