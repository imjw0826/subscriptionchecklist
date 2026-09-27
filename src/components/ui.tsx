import { useEffect, useRef, useState, type ReactNode } from 'react'
import { achievementLevel } from '../lib/calc'
import type { SubscriptionStatus } from '../types'
import { AnimatedNumber } from './motion'
import { brandFor, isLightHex } from '../lib/brands'

const LEVEL_STROKE = {
  low: 'stroke-danger',
  mid: 'stroke-warn',
  high: 'stroke-ok',
  none: 'stroke-ink-3',
}

/** 상세페이지용 원형 게이지 */
export function AchievementGauge({ pct, caption }: { pct: number | null; caption?: string }) {
  const level = achievementLevel(pct)
  const r = 52
  const c = 2 * Math.PI * r
  const filled = (Math.min(pct ?? 0, 100) / 100) * c
  return (
    <div className="relative mx-auto h-40 w-40">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-sunken" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
          className={LEVEL_STROKE[level]}
          style={{ transition: 'stroke-dasharray 600ms var(--ease-out-expo), stroke 250ms' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {pct == null ? <span className="text-3xl font-medium text-ink-3">—</span> : <AnimatedNumber value={pct} format={(v) => `${v}%`} className="text-3xl font-medium tracking-tight" />}
        <span className="text-xs text-ink-2">{caption ?? '이번 달 본전'}</span>
      </div>
    </div>
  )
}

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
        className="t-modal relative w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl shadow-black/10"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 text-lg font-medium">{last.current.title}</h2>
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
      {error ? <span className="t-error-msg mt-1.5 block text-xs text-danger-ink">{error}</span> : hint ? <span className="mt-1.5 block text-xs text-ink-3">{hint}</span> : null}
    </label>
  )
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-medium">{title}</h2>
        {action}
      </div>
      {children}
    </section>
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
  const brand = brandFor(name)
  if (brand) {
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

/** 원형 진행률 — 달성률과 관계없이 한 가지 색. 100%를 넘으면 링은 가득 찬 상태 */
export function ProgressRing({ pct, size = 40 }: { pct: number | null; size?: number }) {
  const r = 15
  const c = 2 * Math.PI * r
  const filled = (Math.min(Math.max(pct ?? 0, 0), 100) / 100) * c
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} aria-label={pct == null ? '달성률 없음' : `이번 달 본전 ${pct}%`}>
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" className="stroke-sunken" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
          className="stroke-ok"
          style={{ transition: 'stroke-dasharray 600ms var(--ease-out-expo)', opacity: pct ? 1 : 0 }}
        />
      </svg>
      <span className={`relative text-[10px] font-medium tracking-tight ${pct == null ? 'text-ink-3' : 'text-ink-2'}`}>{pct == null ? '—' : `${pct}%`}</span>
    </span>
  )
}

/** 페이지 제목 + 오른쪽 액션 */
export function PageHeader({ title, children, back }: { title: ReactNode; children?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back}
        <h1 className="truncate text-2xl font-normal tracking-tight lg:text-3xl">{title}</h1>
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  )
}

/** 통계 카드 한 칸: 어두운 아이콘 박스 + 라벨 + 큰 숫자 + 상태 태그 */
export function Stat({ icon, label, value, tag, large }: { icon: ReactNode; label: string; value: ReactNode; tag?: ReactNode; large?: boolean }) {
  return (
    <div className="flex items-center gap-3 bg-surface p-4 lg:px-5 lg:py-5">
      <span className="icon-box hidden sm:flex">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm text-ink-2">{label}</p>
          {tag && <span className="shrink-0">{tag}</span>}
        </div>
        <div className={`truncate font-normal tracking-tight ${large ? 'mt-0.5 text-3xl lg:text-4xl' : 'text-xl lg:text-2xl'}`}>{value}</div>
      </div>
    </div>
  )
}

/** 통계 카드 묶음 — 칸 사이에 세로 구분선 */
export function StatGroup({ children, cols = 4 }: { children: ReactNode; cols?: 3 | 4 }) {
  // 홀수 개면 모바일에서 마지막 칸이 두 칸을 차지해 빈 칸이 생기지 않게 한다
  return (
    <div
      className={`grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-line shadow-card [&>*:last-child:nth-child(odd)]:col-span-2 ${cols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} lg:[&>*]:col-span-1!`}
    >
      {children}
    </div>
  )
}

/** 시계 아이콘이 붙은 D-day 알약 */
export function TimePill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warn' | 'danger' | 'ok' }) {
  return (
    <span className={`tag-${tone}`}>
      <Icon name="clock" size={12} />
      {children}
    </span>
  )
}

const ICONS: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  card: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 10h18M7 15h3" />
    </>
  ),
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
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  logout: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5M12 16h.01" />
    </>
  ),
  back: <path d="M15 18l-6-6 6-6" />,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  upload: <path d="M12 20V9M7 14l5-5 5 5M5 4h14" />,
}

export function Icon({ name, size = 18 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  )
}
