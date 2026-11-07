import { useState, type FormEvent } from 'react'
import { supabase } from '../store/supabase'
import { shakeErrors } from '../components/motion'
import { loginErrorMessage, toAuthEmail } from '../lib/auth'

/** 아이디·비밀번호 로그인. 개인용이라 가입 화면은 없다 (계정 설정은 README 참고) */
export default function Login() {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setError(null)
    setSubmitting(true)
    const { error } = await supabase!.auth.signInWithPassword({ email: toAuthEmail(loginId), password })
    // 성공하면 onAuthStateChange가 앱으로 전환한다
    if (error) {
      setSubmitting(false)
      setPassword('')
      setError(loginErrorMessage(error.message))
      requestAnimationFrame(() => shakeErrors(form))
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-app px-4">
      <div className="panel t-reveal w-full max-w-sm p-8">
        <img src="/favicon.svg" alt="" className="mb-4 h-10 w-10" />
        <h1 className="text-2xl font-semibold">구독 체크리스트</h1>

        <form onSubmit={submit} noValidate className="mt-5 space-y-4">
          <label className="block">
            <span className="label">아이디</span>
            <input
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              className={`input ${error ? 'input-error' : ''}`}
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label">비밀번호</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              className={`input ${error ? 'input-error' : ''}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="t-error-msg text-sm text-danger-ink">
              {error}
            </p>
          )}
          <button className="btn-primary w-full" disabled={submitting || !loginId.trim() || !password}>
            {submitting ? '로그인 중…' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
