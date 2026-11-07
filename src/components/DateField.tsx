import { useEffect, useId, useRef, useState } from 'react'
import { addMonths, formatDate, monthCells, toISO, todayISO, weekday } from '../lib/date'
import { Collapse } from './motion'
import { Icon } from './ui'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const navButton = 'flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-sunken active:bg-sunken'

/**
 * 날짜 입력. iPad의 기본 날짜 선택창은 접힘 영역과 본문 스크롤 안에서 잘 열리지 않아 달력을 직접 그린다.
 * 안의 버튼을 누르면 <label>이 토글을 다시 누르므로 Field로 감싸지 않는다.
 */
export default function DateField({ label, value, onChange, error, hint }: { label: string; value: string; onChange: (date: string) => void; error?: string; hint?: string }) {
  const labelId = useId()
  const today = todayISO()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => (value || today).slice(0, 7))
  const [y, m] = view.split('-').map(Number)
  const panel = useRef<HTMLDivElement>(null)

  // 펼쳐진 뒤 달력 전체를 화면 가운데로 옮긴다. 아래쪽 날짜가 떠 있는 저장 버튼에 가려지지 않게 한다
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => panel.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 260)
    return () => clearTimeout(timer)
  }, [open])

  const move = (months: number) => setView(addMonths(`${view}-01`, months).slice(0, 7))

  function toggle() {
    if (!open) setView((value || today).slice(0, 7))
    setOpen(!open)
  }

  return (
    <div onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <span id={labelId} className="label">
        {label}
      </span>
      <button type="button" aria-labelledby={labelId} aria-expanded={open} onClick={toggle} className={`input flex items-center justify-between gap-2 text-left ${error ? 'input-error' : ''}`}>
        {value ? (
          <span className="num">
            {formatDate(value)} <span className="text-ink-3">({weekday(value)})</span>
          </span>
        ) : (
          <span className="text-ink-3">날짜 선택</span>
        )}
        <span className="text-ink-3">
          <Icon name="calendar" size={16} />
        </span>
      </button>

      <Collapse open={open}>
        <div ref={panel} className="mt-2 rounded-lg border border-line p-2.5">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex">
              <button type="button" aria-label="이전 해" className={navButton} onClick={() => move(-12)}>
                <Icon name="backDouble" size={16} />
              </button>
              <button type="button" aria-label="이전 달" className={navButton} onClick={() => move(-1)}>
                <Icon name="back" size={16} />
              </button>
            </div>
            <p className="num text-sm font-semibold" aria-live="polite">
              {y}년 {m}월
            </p>
            <div className="flex">
              <button type="button" aria-label="다음 달" className={navButton} onClick={() => move(1)}>
                <span className="rotate-180">
                  <Icon name="back" size={16} />
                </span>
              </button>
              <button type="button" aria-label="다음 해" className={navButton} onClick={() => move(12)}>
                <span className="rotate-180">
                  <Icon name="backDouble" size={16} />
                </span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 text-center text-xs text-ink-3">
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-1">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthCells(y, m).map((d, i) => {
              if (d == null) return <span key={`blank-${i}`} />
              const date = toISO(y, m, d)
              const selected = date === value
              return (
                <button
                  key={date}
                  type="button"
                  aria-label={`${y}년 ${m}월 ${d}일`}
                  aria-pressed={selected}
                  onClick={() => {
                    onChange(date)
                    setOpen(false)
                  }}
                  className="flex h-10 items-center justify-center"
                >
                  <span
                    className={`num flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors duration-150 ${selected ? 'bg-primary font-semibold text-on-primary' : date === today ? 'font-semibold ring-1 ring-line-strong' : 'text-ink-2'}`}
                  >
                    {d}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </Collapse>

      {error ? <span className="t-error-msg mt-1.5 block text-xs text-danger">{error}</span> : hint ? <span className="mt-1.5 block text-xs text-ink-3">{hint}</span> : null}
    </div>
  )
}
