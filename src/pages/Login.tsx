import { useState, type FormEvent } from 'react'
import { supabase } from '../store/supabase'
import { Collapse, shakeErrors } from '../components/motion'
import { loginErrorMessage, signupError, toAuthEmail } from '../lib/auth'

type Mode = 'login' | 'signup'

/** 아이디·비밀번호 로그인과 회원가입 */
export default function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSignup = mode === 'signup'

  function switchMode() {
    setMode(isSignup ? 'login' : 'signup')
    setPassword('')
    setConfirm('')
    setError(null)
  }

  function fail(form: HTMLFormElement, message: string) {
    setError(message)
    requestAnimationFrame(() => shakeErrors(form))
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setError(null)
    if (isSignup) {
      const problem = signupError(loginId, password, confirm)
      if (problem) return fail(form, problem)
    }
    setSubmitting(true)
    const credentials = { email: toAuthEmail(loginId), password }
    // 성공하면 onAuthStateChange가 앱으로 전환한다
    if (isSignup) {
      const { data, error } = await supabase!.auth.signUp(credentials)
      if (error || !data.session) {
        setSubmitting(false)
        // 세션이 없으면 서버의 이메일 확인이 켜져 있어 이 아이디로는 로그인할 수 없다
        fail(form, error ? loginErrorMessage(error.message) : '지금은 가입을 끝낼 수 없어요. 서버의 이메일 확인 설정을 꺼 주세요.')
      }
      return
    }
    const { error: loginError } = await supabase!.auth.signInWithPassword(credentials)
    if (loginError) {
      setSubmitting(false)
      setPassword('')
      fail(form, loginErrorMessage(loginError.message))
    }
  }

  const invalid = error ? 'input-error' : ''

  return (
    <div className="flex min-h-dvh items-center justify-center bg-app px-4">
      <div className="panel t-reveal w-full max-w-sm p-8">
        <img src="/favicon.svg" alt="" className="mb-4 h-10 w-10" />
        <h1 className="text-2xl font-semibold">{isSignup ? '회원가입' : '구독 체크리스트'}</h1>

        <form onSubmit={submit} noValidate className="mt-5 space-y-4">
          <label className="block">
            <span className="label">아이디</span>
            <input
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              className={`input ${invalid}`}
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
            />
          </label>
          {/* Collapse의 음수 여백이 폼 간격을 없애지 않도록 비밀번호 칸과 한 묶음으로 둔다 */}
          <div>
            <label className="block">
              <span className="label">비밀번호</span>
              <input
                type="password"
                required
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                className={`input ${invalid}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <Collapse open={isSignup}>
              <label className="block pt-4">
                <span className="label">비밀번호 확인</span>
                <input type="password" autoComplete="new-password" className={`input ${invalid}`} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </label>
            </Collapse>
          </div>
          {error && (
            <p role="alert" className="t-error-msg text-sm text-danger-ink">
              {error}
            </p>
          )}
          <button className="btn-primary w-full" disabled={submitting || !loginId.trim() || !password || (isSignup && !confirm)}>
            {submitting ? '잠시만요…' : isSignup ? '가입하기' : '로그인'}
          </button>
          <button type="button" className="btn-ghost w-full" disabled={submitting} onClick={switchMode}>
            {isSignup ? '로그인으로 돌아가기' : '회원가입'}
          </button>
        </form>
      </div>
    </div>
  )
}
