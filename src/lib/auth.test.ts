import { describe, expect, it } from 'vitest'
import { LOGIN_DOMAIN, loginErrorMessage, signupError, toAuthEmail } from './auth'

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
  it('이미 있는 아이디', () => {
    expect(loginErrorMessage('User already registered')).toBe('이미 사용 중인 아이디예요.')
  })
  it('가입이 꺼져 있을 때', () => {
    expect(loginErrorMessage('Signups not allowed for this instance')).toBe('지금은 회원가입을 받지 않아요.')
  })
  it('모르는 오류는 그대로', () => {
    expect(loginErrorMessage('boom')).toBe('boom')
  })
})

describe('회원가입 입력 검사', () => {
  it('올바른 입력', () => {
    expect(signupError('Garden_01', 'password1', 'password1')).toBeNull()
  })
  it('아이디 형식', () => {
    expect(signupError('ab', 'password1', 'password1')).toContain('아이디')
    expect(signupError('me@example.com', 'password1', 'password1')).toContain('아이디')
    expect(signupError('한글아이디', 'password1', 'password1')).toContain('아이디')
  })
  it('비밀번호 길이와 확인', () => {
    expect(signupError('garden', 'short', 'short')).toContain('8자')
    expect(signupError('garden', 'password1', 'password2')).toContain('서로 달라요')
  })
})
