import { useState, type FormEvent } from 'react'
import { supabase } from '../store/supabase'
import { shakeErrors } from '../components/motion'

type Step = 'email' | 'sending' | 'code' | 'verifying'

function friendly(message: string): string {
  if (/signups not allowed|user not found/i.test(message)) return '등록되지 않은 이메일이에요.'
  if (/expired|invalid/i.test(message)) return '코드가 틀렸거나 만료됐어요. 다시 받아 주세요.'
  if (/rate limit|security purposes/i.test(message)) return '잠시 후 다시 시도해 주세요. (메일은 1분에 한 번만 보낼 수 있어요)'
  return message
}

/**
 * 이메일 매직링크 로그인. 링크를 누르거나, 다른 기기에서 메일을 열었을 때는 메일의 6자리 코드를 입력한다.
 * 개인용이라 새 계정은 만들지 않는다 (계정은 Supabase 대시보드에서 1개만 만든다).
 */
export default function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<Step>('email')
  const [error, setError] = useState<string | null>(null)
  // 기본 메일 템플릿에는 코드가 없어서 코드 입력은 접어 둔다 (커스텀 SMTP로 템플릿에 {{ .Token }}을 넣으면 사용)
  const [showCode, setShowCode] = useState(false)

  const fail = (form: HTMLFormElement, message: string) => {
    setError(friendly(message))
    requestAnimationFrame(() => shakeErrors(form))
  }

  async function sendLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setError(null)
    setStep('sending')
    const { error } = await supabase!.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    })
    if (error) {
      setStep('email')
      fail(form, error.message)
    } else {
      setStep('code')
    }
  }

  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setError(null)
    setStep('verifying')
    const { error } = await supabase!.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    if (error) {
      setStep('code')
      fail(form, error.message)
    }
    // 성공하면 onAuthStateChange가 앱으로 전환한다
  }

  const inCodeStep = step === 'code' || step === 'verifying'

  return (
    <div className="flex min-h-dvh items-center justify-center bg-app px-4">
      <div className="panel w-full max-w-sm p-8">
        <img src="/favicon.svg" alt="" className="mb-4 h-10 w-10" />
        <h1 className="text-2xl tracking-tight">구독 체크리스트</h1>

        {!inCodeStep ? (
          <form key="email" onSubmit={sendLink} noValidate className="t-reveal mt-5 space-y-4">
            <p className="text-sm text-ink-2">이메일로 로그인 링크를 보내드려요.</p>
            <input
              type="email"
              required
              autoComplete="email"
              autoFocus
              className={`input ${error ? 'input-error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="t-error-msg text-sm text-danger-ink">{error}</p>}
            <button className="btn-primary w-full" disabled={step === 'sending' || !email.includes('@')}>
              {step === 'sending' ? '보내는 중…' : '로그인 메일 받기'}
            </button>
          </form>
        ) : (
          <form key="code" onSubmit={verify} noValidate className="t-reveal mt-5 space-y-4">
            <p className="rounded-xl bg-ok-soft p-3 text-sm text-ok-ink">
              <b className="font-medium">{email}</b>로 로그인 메일을 보냈어요. 메일의 <b className="font-medium">Sign in</b> 링크를 누르면, 링크를 연 브라우저에서 로그인돼요.
            </p>
            {!showCode && (
              <button type="button" className="link w-full text-center text-sm" onClick={() => setShowCode(true)}>
                메일에 6자리 코드가 있다면 입력하기
              </button>
            )}
            {showCode && (
              <>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={10}
                  className={`input text-center text-2xl tracking-[0.4em] ${error ? 'input-error' : ''}`}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  aria-label="인증 코드"
                />
                {error && <p className="t-error-msg text-sm text-danger-ink">{error}</p>}
                <button className="btn-primary w-full" disabled={step === 'verifying' || code.length < 6}>
                  {step === 'verifying' ? '확인 중…' : '로그인'}
                </button>
              </>
            )}
            <button
              type="button"
              className="link w-full text-center text-sm"
              onClick={() => {
                setStep('email')
                setCode('')
                setError(null)
              }}
            >
              다른 이메일로 / 다시 받기
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
