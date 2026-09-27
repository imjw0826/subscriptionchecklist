import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type ShowToast = (message: string) => void

const Ctx = createContext<ShowToast>(() => {})

/** Toast open / close: 아래에서 페이드·블러·스케일로 떠오르고 2초 뒤 사라진다 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const [open, setOpen] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback<ShowToast>((msg) => {
    window.clearTimeout(timer.current)
    setMessage(msg)
    setOpen(true)
    timer.current = window.setTimeout(() => setOpen(false), 2000)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4" role="status" aria-live="polite">
        <div className={`t-toast flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-on-primary shadow-lg shadow-black/10 ${open ? 'is-open' : ''}`}>
          <svg className="text-accent" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          {message}
        </div>
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): ShowToast {
  return useContext(Ctx)
}
