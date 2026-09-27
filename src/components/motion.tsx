/**
 * transitions.dev 트랜지션의 React 래퍼. 스타일과 타이밍은 index.css의 t-* 클래스가 담당한다.
 */
import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'

/** Number pop-in: 값이 바뀔 때마다 글자가 아래에서 블러와 함께 튀어오른다. 끝 두 자리는 시차를 둔다. */
export function AnimatedNumber({ value, format = String, className }: { value: number; format?: (v: number) => string; className?: string }) {
  const text = format(value)
  // 첫 값은 그대로 보여주고, 값이 한 번이라도 바뀐 뒤부터 바뀔 때마다 재생
  const initial = useRef(text)
  const changed = useRef(false)
  if (text !== initial.current) changed.current = true

  if (!changed.current) return <span className={className}>{text}</span>

  const chars = [...text]
  const digitIdx = chars.flatMap((c, i) => (/\d/.test(c) ? [i] : []))
  const [second, last] = digitIdx.slice(-2)
  return (
    <span key={text} className={`t-digit-group ${className ?? ''}`} aria-label={text}>
      {chars.map((c, i) => (
        <span key={i} className="t-digit" aria-hidden data-stagger={i === last ? 2 : i === second ? 1 : undefined}>
          {c}
        </span>
      ))}
    </span>
  )
}

/**
 * Tabs sliding: 컨테이너 안의 활성 요소([aria-selected=true] 또는 [aria-current=page]) 아래로 pill을 옮긴다.
 * 첫 배치와 리사이즈 때는 트랜지션 없이 제자리로 스냅한다.
 */
export function useSlidingPill(barRef: RefObject<HTMLElement | null>, pillRef: RefObject<HTMLElement | null>, activeKey: unknown) {
  const placed = useRef(false)

  // 활성 탭이 바뀌면 슬라이드 (첫 배치는 스냅)
  useLayoutEffect(() => {
    movePill(barRef.current, pillRef.current, placed.current)
    placed.current = true
  }, [barRef, pillRef, activeKey])

  // 크기가 바뀌면 스냅. observe() 직후의 첫 콜백은 건너뛴다
  useLayoutEffect(() => {
    const bar = barRef.current
    if (!bar) return
    let first = true
    const ro = new ResizeObserver(() => {
      if (first) first = false
      else movePill(bar, pillRef.current, false)
    })
    ro.observe(bar)
    return () => ro.disconnect()
  }, [barRef, pillRef])
}

function movePill(bar: HTMLElement | null, pill: HTMLElement | null, animate: boolean) {
  if (!bar || !pill) return
  const active = bar.querySelector<HTMLElement>('[aria-selected="true"], [aria-current="page"]')
  if (!active) {
    pill.style.opacity = '0'
    return
  }
  if (!animate) pill.style.transition = 'none'
  pill.style.opacity = '1'
  pill.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`
  pill.style.width = `${active.offsetWidth}px`
  pill.style.height = `${active.offsetHeight}px`
  if (!animate) {
    void pill.offsetWidth
    pill.style.transition = ''
  }
}

/** 세그먼트 컨트롤 (Tabs sliding) */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className = '',
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label?: string
  className?: string
}) {
  const bar = useRef<HTMLDivElement>(null)
  const pill = useRef<HTMLSpanElement>(null)
  useSlidingPill(bar, pill, value)
  return (
    <div ref={bar} role="tablist" aria-label={label} className={`t-tabs flex flex-wrap gap-1 rounded-2xl bg-sunken p-1 ${className}`}>
      <span ref={pill} aria-hidden className="t-tabs-pill rounded-xl bg-primary shadow-sm" />
      {options.map((o) => (
        <button
          type="button"
          role="tab"
          key={o.value}
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`t-tab flex-1 rounded-xl px-2.5 py-1.5 text-sm whitespace-nowrap ${value === o.value ? 'text-on-primary' : 'text-ink-2 hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Checkbox check: 박스가 채워진 뒤 체크 표시가 선으로 그려진다 */
export function Checkbox({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onClick}
      className={`t-check flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] text-on-accent ${
        checked ? 'border-accent bg-accent' : 'border-dashed border-ink-3 bg-transparent hover:border-solid hover:border-ink-2'
      }`}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </button>
  )
}

/** Accordion: 조건부 영역을 grid-rows 0fr → 1fr 로 펼친다. 닫힌 동안은 inert로 포커스를 막는다 */
export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className="t-acc" data-open={open} inert={!open}>
      <div>{children}</div>
    </div>
  )
}

/** Error state shake: root 안의 오류 입력란을 흔든다 */
export function shakeErrors(root: ParentNode = document) {
  const targets = [...root.querySelectorAll<HTMLElement>('.input-error, [data-error]')]
  // 이미 흔들리는 블록 안의 입력란은 제외 (이동량이 겹치지 않도록)
  targets.filter((el) => !el.parentElement?.closest('[data-error]')).forEach((el) => {
    el.classList.remove('t-shake')
    void el.offsetWidth
    el.classList.add('t-shake')
    el.addEventListener('animationend', () => el.classList.remove('t-shake'), { once: true })
  })
}
