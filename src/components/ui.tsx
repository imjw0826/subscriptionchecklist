import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { SubscriptionStatus } from '../types'
import { isLightHex, logoFor } from '../lib/brandLogos'

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  if (status === 'trial') return <span className="tag-warn">체험</span>
  if (status === 'canceling') return <span className="tag-neutral">해지예정</span>
  return null
}

type ModalState = 'closed' | 'open' | 'closing'

/** Modal open / close: 중앙에서 scale 0.96 → 1로 열리고, 닫힐 때는 더 짧게 줄어들며 사라진다 */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const [state, setState] = useState<ModalState>('closed')
  const [mounted, setMounted] = useState(open)
  // 닫히는 동안 부모가 내용을 비워도 마지막 화면을 유지
  const last = useRef({ title, children })
  if (open) last.current = { title, children }

  if (open && !mounted) setMounted(true)

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setState('open'))
      return () => cancelAnimationFrame(raf)
    }
    setState((s) => (s === 'closed' ? s : 'closing'))
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--modal-close-dur')) || 150
    const t = setTimeout(() => {
      setState('closed')
      setMounted(false)
    }, ms)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-state={state} onClick={onClose}>
      <div className="t-modal-backdrop absolute inset-0 bg-black/30 backdrop-blur-[2px]" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={last.current.title}
        className="t-modal relative w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-floating"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 text-base font-semibold">{last.current.title}</h2>
        {last.current.children}
      </div>
    </div>
  )
}

export function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error ? <span className="t-error-msg mt-1.5 block text-xs text-danger">{error}</span> : hint ? <span className="mt-1.5 block text-xs text-ink-3">{hint}</span> : null}
    </label>
  )
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** 첫 화면·빈 목록: 아이콘, 제목, 설명, 행동 하나 (Arc Empty state) */
export function EmptyState({ icon, title, description, action }: { icon: keyof typeof ICONS; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="t-reveal flex flex-col items-center px-5 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-sunken text-ink-2">
        <Icon name={icon} size={20} />
      </span>
      <h3 className="mt-5 text-base font-medium">{title}</h3>
      <p className="mt-1.5 max-w-[20rem] text-sm text-balance text-ink-2">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-ink-3">{children}</p>
}

/** 숫자만 받는 입력 (빈 값은 '') */
export function NumberInput({
  value,
  onChange,
  invalid,
  suffix,
  ...rest
}: {
  value: number | '' | null
  onChange: (v: number | '') => void
  invalid?: boolean
  suffix?: string
  placeholder?: string
  min?: number
  step?: number
  id?: string
  autoFocus?: boolean
}) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="numeric"
        className={`input ${suffix ? 'pr-10' : ''} ${invalid ? 'input-error' : ''}`}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        {...rest}
      />
      {suffix && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-3">{suffix}</span>}
    </div>
  )
}

/** 서비스 로고 아바타 — 알려진 브랜드는 로고, 아니면 이름 이니셜(색은 이름으로 고정) */
const AVATAR_COLORS = ['#e8793a', '#d9577a', '#8b6cf0', '#5b95ef', '#34a98a', '#d6a13c', '#c9564a', '#4aa3c2']
export function Avatar({ name, size = 32, muted }: { name: string; size?: number; muted?: boolean }) {
  const logo = logoFor(name)
  const gradientId = useId()
  const [imageFailed, setImageFailed] = useState(false)
  if (logo?.kind === 'custom' && logo.mark.image && !imageFailed) {
    return (
      <img
        src={logo.mark.image}
        alt=""
        aria-hidden
        title={logo.mark.title}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setImageFailed(true)}
        className={`shrink-0 rounded-full object-cover ring-1 ring-black/5 ${muted ? 'opacity-50' : ''}`}
        style={{ width: size, height: size }}
      />
    )
  }
  if (logo?.kind === 'custom') {
    return (
      <span
        aria-hidden
        title={logo.mark.title}
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-black/5 ${muted ? 'opacity-50' : ''}`}
        style={{ width: size, height: size, background: logo.mark.bg }}
      >
        <svg viewBox="0 0 24 24" width={size} height={size}>
          {logo.mark.draw(gradientId)}
        </svg>
      </span>
    )
  }
  if (logo) {
    const brand = logo.icon
    const light = isLightHex(brand.hex)
    return (
      <span
        aria-hidden
        title={brand.title}
        className={`inline-flex shrink-0 items-center justify-center rounded-full ring-1 ring-black/5 ${muted ? 'opacity-50' : ''}`}
        style={{ width: size, height: size, background: light ? `#${brand.hex}` : '#fff' }}
      >
        <svg viewBox="0 0 24 24" width={size * 0.56} height={size * 0.56} fill={light ? '#191919' : `#${brand.hex}`}>
          <path d={brand.path} />
        </svg>
      </span>
    )
  }
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white ${muted ? 'opacity-50' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.4, background: AVATAR_COLORS[h % AVATAR_COLORS.length] }}
    >
      {[...name.trim()][0] ?? '?'}
    </span>
  )
}

/** 페이지 제목 + 오른쪽 액션 */
export function PageHeader({ title, description, children, back }: { title: ReactNode; description?: ReactNode; children?: ReactNode; back?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <div className="t-rise" style={{ '--i': 0 } as CSSProperties}>
            {back}
          </div>
        )}
        <h1 className="num t-rise truncate text-xl font-semibold lg:text-2xl" style={{ '--i': 1 } as CSSProperties}>
          {title}
        </h1>
        {description && (
          <p className="t-rise mt-0.5 text-sm text-ink-2" style={{ '--i': 2 } as CSSProperties}>
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="t-rise flex shrink-0 items-center gap-2" style={{ '--i': 2 } as CSSProperties}>
          {children}
        </div>
      )}
    </div>
  )
}

/** 지표 카드: 라벨, 큰 숫자, 맥락 한 줄 (Arc Metric card) */
export function MetricCard({ label, value, context, chip }: { label: string; value: ReactNode; context?: ReactNode; chip?: ReactNode }) {
  return (
    <article className="card min-w-0 p-4 lg:p-5">
      <div className="flex min-h-[22px] items-center justify-between gap-2">
        <h2 className="truncate text-sm font-normal text-ink-2">{label}</h2>
        {chip}
      </div>
      <div className="num mt-2.5 truncate text-[1.625rem] leading-tight font-semibold tracking-[-0.03em]">{value}</div>
      {context && <p className="mt-1.5 truncate text-[13px] text-ink-3">{context}</p>}
    </article>
  )
}

// Tailwind가 찾을 수 있도록 클래스 이름을 조합하지 않고 그대로 적는다
const TONES = { neutral: 'tag-neutral', warn: 'tag-warn', danger: 'tag-danger', ok: 'tag-ok' }

/** D-day 태그 */
export function TimePill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warn' | 'danger' | 'ok' }) {
  return <span className={`num ${TONES[tone]}`}>{children}</span>
}

const ICONS: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  card: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 10h18M7 15h3" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  wallet: (
    <>
      <path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4h-12A2.5 2.5 0 0 0 3 6.5v11A2.5 2.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" />
      <path d="M21 9h-5a3 3 0 0 0 0 6h5z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  logout: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5M12 16h.01" />
    </>
  ),
  back: <path d="M15 18l-6-6 6-6" />,
}

export function Icon({ name, size = 18 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  )
}
