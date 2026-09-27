import { useState, type FormEvent } from 'react'
import { supabase } from '../store/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setState('sending')
    const { error } = await supabase!.auth.signInWithOtp({
      email: email.trim(),
      // 개인용: 새 계정 생성을 막는다. 계정은 Supabase 대시보드에서 1개만 만들어 둔다.
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    })
    if (error) {
      setError(error.message.includes('Signups not allowed') ? '허용되지 않은 이메일입니다.' : error.message)
      setState('idle')
    } else {
      setState('sent')
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-page px-4">
      <form onSubmit={submit} className="panel w-full max-w-sm space-y-5 p-8">
        <div>
          <img src="/favicon.svg" alt="" className="mb-4 h-10 w-10" />
          <h1 className="text-2xl tracking-tight">구독 체크리스트</h1>
          <p className="mt-1 text-sm text-ink-2">이메일로 로그인 링크를 보내드려요.</p>
        </div>
        {state === 'sent' ? (
          <p className="rounded-xl bg-ok-soft p-4 text-sm text-ok-ink">
            <b>{email}</b>로 로그인 링크를 보냈어요. 메일함을 확인하세요.
          </p>
        ) : (
          <>
            <input
              type="email"
              required
              autoComplete="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="text-sm text-danger-ink">{error}</p>}
            <button className="btn-primary w-full" disabled={state === 'sending'}>
              {state === 'sending' ? '보내는 중…' : '매직링크 받기'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
