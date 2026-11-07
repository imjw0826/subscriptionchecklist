import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { supabase } from '../store/supabase'
import { useSlidingPill } from './motion'
import { Avatar, Icon } from './ui'
import { diffDays } from '../lib/date'
import { friendlyError } from '../store/retry'

/** 경로 깊이로 페이지 진입 방향을 정한다: 깊어지면 오른쪽에서(1), 얕아지면 왼쪽에서(-1) */
function usePageDirection(pathname: string): number {
  const prev = useRef({ path: pathname, dir: 0 })
  if (prev.current.path !== pathname) {
    const depth = (p: string) => p.split('/').filter(Boolean).length
    const d = depth(pathname) - depth(prev.current.path)
    prev.current = { path: pathname, dir: Math.sign(d) }
  }
  return prev.current.dir
}

/** Skeleton loader: 데이터를 불러오는 동안 대시보드 모양의 자리표시자를 깜빡인다 */
function Skeleton() {
  const bar = 'rounded-md bg-sunken'
  return (
    <div className="t-skel space-y-6" aria-busy="true" aria-label="불러오는 중">
      <div className={`h-8 w-32 ${bar}`} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card space-y-3 p-5">
            <div className={`h-4 w-20 ${bar}`} />
            <div className={`h-7 w-28 ${bar}`} />
          </div>
        ))}
      </div>
      <div className="card space-y-4 p-5">
        {[0, 1, 2, 3].map((j) => (
          <div key={j} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-sunken" />
            <div className={`h-4 flex-1 ${bar}`} />
            <div className={`h-4 w-16 ${bar}`} />
          </div>
        ))}
      </div>
    </div>
  )
}

function SideLabel({ children, first }: { children: ReactNode; first?: boolean }) {
  return <p className={`${first ? '' : 'mt-6'} mb-1 px-2.5 text-xs font-medium text-ink-3`}>{children}</p>
}

/** 데스크탑 사이드바 — 활성 항목 아래로 pill이 미끄러진다 (Tabs sliding의 세로 버전) */
function Sidebar({ pathname }: { pathname: string }) {
  const { data, today, mode } = useStore()
  const nav = useRef<HTMLElement>(null)
  const pill = useRef<HTMLSpanElement>(null)
  useSlidingPill(nav, pill, pathname + data.subscriptions.length)

  const item = ({ isActive }: { isActive: boolean }) =>
    `t-tab flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm ${isActive ? 'font-medium text-ink' : 'text-ink-2 hover:text-ink'}`
  const subs = [...data.subscriptions].sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col overflow-y-auto px-3 py-4 lg:flex">
      <NavLink to="/" className="mb-6 flex h-9 items-center gap-2 px-2.5 text-sm font-semibold">
        <img src="/favicon.svg" alt="" className="h-6 w-6" />
        구독 체크리스트
      </NavLink>

      <nav ref={nav} className="t-tabs flex flex-col gap-0.5" aria-label="주 메뉴">
        <span ref={pill} aria-hidden className="t-tabs-pill rounded-lg bg-surface shadow-card ring-1 ring-line" />
        <SideLabel first>관리</SideLabel>
        <NavLink to="/" end className={item}>
          <Icon name="home" size={16} />
          <span className="flex-1">대시보드</span>
        </NavLink>
        <NavLink to="/payment-methods" className={item}>
          <Icon name="card" size={16} />
          <span className="flex-1">결제수단</span>
          <span className="count">{data.paymentMethods.length}</span>
        </NavLink>

        <SideLabel>구독</SideLabel>
        {subs.map((s) => {
          const days = diffDays(today, s.status === 'trial' && s.trialEndDate ? s.trialEndDate : s.nextBillingDate)
          return (
            <NavLink key={s.id} to={`/subscriptions/${s.id}`} className={item}>
              <Avatar name={s.name} size={20} muted={s.status === 'canceling'} />
              <span className="flex-1 truncate">{s.name}</span>
              {s.status !== 'canceling' && days >= 0 && days <= 3 && <span className="count bg-danger-soft text-danger">D-{days}</span>}
            </NavLink>
          )
        })}
        <NavLink to="/subscriptions/new" className={({ isActive }) => `${item({ isActive })} text-ink-2`}>
          <Icon name="plus" size={16} />
          <span className="flex-1">구독 추가</span>
        </NavLink>
      </nav>

      <div className="mt-auto space-y-0.5 pt-6">
        {mode === 'local' && <p className="mb-3 rounded-lg bg-sunken px-2.5 py-2 text-xs leading-relaxed text-ink-2">로컬 모드 — 이 브라우저에만 저장돼요.</p>}
        {supabase && (
          <button onClick={() => supabase!.auth.signOut()} className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm text-ink-2 transition-colors hover:text-ink">
            <Icon name="logout" size={16} />
            로그아웃
          </button>
        )}
      </div>
    </aside>
  )
}

/** 모바일 상단 바 */
function MobileHeader({ pathname }: { pathname: string }) {
  const { mode } = useStore()
  const bar = useRef<HTMLElement>(null)
  const pill = useRef<HTMLSpanElement>(null)
  useSlidingPill(bar, pill, pathname)
  const item = ({ isActive }: { isActive: boolean }) => `t-tab rounded-md px-2.5 py-1 text-sm font-medium ${isActive ? 'text-ink' : 'text-ink-2'}`
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur lg:hidden">
      <div className="flex h-13 items-center gap-2 px-4">
        <NavLink to="/" className="mr-auto flex items-center gap-2 font-semibold">
          <img src="/favicon.svg" alt="" className="h-6 w-6" />
          <span className="hidden min-[400px]:inline">구독 체크리스트</span>
        </NavLink>
        <nav ref={bar} className="t-tabs flex gap-0.5 rounded-lg bg-sunken p-0.5">
          <span ref={pill} aria-hidden className="t-tabs-pill rounded-md bg-surface shadow-[0_1px_2px_oklch(0%_0_0/0.08)] ring-1 ring-line" />
          <NavLink to="/" end className={item}>
            대시보드
          </NavLink>
          <NavLink to="/payment-methods" className={item}>
            결제수단
          </NavLink>
        </nav>
      </div>
      {mode === 'local' && <p className="px-4 pb-2 text-center text-xs text-ink-3">로컬 모드 — 이 브라우저에만 저장돼요.</p>}
    </header>
  )
}

export default function Layout() {
  const { error, dismissError, loading } = useStore()
  const { pathname } = useLocation()
  const dir = usePageDirection(pathname)

  const pane = useRef<HTMLDivElement>(null)

  useEffect(() => {
    pane.current?.scrollTo(0, 0)
  }, [pathname])

  return (
    // 화면 높이를 고정하고 본문만 스크롤한다. 문서 전체가 스크롤되면 iPad(WebKit)에서 사이드바와 저장 버튼의 sticky가 흔들린다
    <div className="h-dvh overflow-hidden">
      <div className="flex h-full">
        <Sidebar pathname={pathname} />
        {/* shadcn sidebar의 inset 구성: 회색 바탕 위에 본문 판을 올린다 */}
        <div ref={pane} className="min-w-0 flex-1 overflow-y-auto overscroll-contain bg-surface lg:my-2 lg:mr-2 lg:rounded-xl lg:border lg:border-line lg:shadow-card">
          <MobileHeader pathname={pathname} />

          {error && (
            <div className="flex items-start gap-2 px-4 pt-4 lg:px-8">
              <div className="t-reveal flex flex-1 items-center gap-2 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger" role="alert" title={error}>
                <Icon name="alert" size={16} />
                {friendlyError(error)}
              </div>
              <button className="btn-ghost" onClick={() => window.location.reload()}>
                새로고침
              </button>
              <button className="btn-ghost" onClick={dismissError}>
                닫기
              </button>
            </div>
          )}

          <main className="mx-auto max-w-[1160px] px-4 pt-5 pb-20 lg:px-8 lg:pt-8 lg:pb-12">
            {loading ? (
              <Skeleton />
            ) : (
              // Page side-by-side: 경로가 바뀔 때마다 방향에 맞춰 살짝 밀려 들어온다
              <div key={pathname} className="t-page" style={{ '--page-dir': dir } as CSSProperties}>
                <Outlet />
              </div>
            )}
          </main>

          {supabase && (
            <footer className="pb-8 text-center lg:hidden">
              <button className="link text-xs" onClick={() => supabase!.auth.signOut()}>
                로그아웃
              </button>
            </footer>
          )}
        </div>
      </div>
    </div>
  )
}
