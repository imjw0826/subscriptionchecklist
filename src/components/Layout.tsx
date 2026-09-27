import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { supabase } from '../store/supabase'
import { useSlidingPill } from './motion'
import { Avatar, Icon } from './ui'
import { diffDays } from '../lib/date'

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
  const bar = 'rounded-lg bg-sunken'
  return (
    <div className="t-skel space-y-5" aria-busy="true" aria-label="불러오는 중">
      <div className={`h-9 w-40 ${bar}`} />
      <div className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl ${bar}`} />
            <div className="flex-1 space-y-2">
              <div className={`h-3 w-20 ${bar}`} />
              <div className={`h-6 w-28 ${bar}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-3 rounded-3xl bg-sunken/70 p-3">
            <div className={`h-4 w-24 ${bar}`} />
            {[0, 1].map((j) => (
              <div key={j} className="card space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-full ${bar}`} />
                  <div className={`h-4 w-24 ${bar}`} />
                </div>
                <div className={`h-3 w-32 ${bar}`} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function SideLabel({ children, first }: { children: ReactNode; first?: boolean }) {
  return <p className={`${first ? '' : 'mt-6'} mb-1.5 px-3 text-sm text-ink-3`}>{children}</p>
}

/** 데스크탑 사이드바 — 활성 항목 아래로 초록 pill이 미끄러진다 (Tabs sliding의 세로 버전) */
function Sidebar({ pathname }: { pathname: string }) {
  const { data, today, mode } = useStore()
  const nav = useRef<HTMLElement>(null)
  const pill = useRef<HTMLSpanElement>(null)
  useSlidingPill(nav, pill, pathname + data.subscriptions.length)

  const item = ({ isActive }: { isActive: boolean }) =>
    `t-tab flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] ${isActive ? 'text-on-accent' : 'text-ink hover:bg-ink/5'}`
  const subs = [...data.subscriptions].sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-line px-4 py-6 lg:flex">
      <NavLink to="/" className="mb-8 flex items-center gap-2.5 px-3 text-lg font-medium">
        <img src="/favicon.svg" alt="" className="h-7 w-7" />
        구독 체크리스트
      </NavLink>

      <nav ref={nav} className="t-tabs flex flex-col gap-0.5" aria-label="주 메뉴">
        <span ref={pill} aria-hidden className="t-tabs-pill rounded-xl bg-accent" />
        <SideLabel first>관리</SideLabel>
        <NavLink to="/" end className={item}>
          <Icon name="home" />
          <span className="flex-1">대시보드</span>
        </NavLink>
        <NavLink to="/payment-methods" className={item}>
          <Icon name="card" />
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
              {s.status !== 'canceling' && days >= 0 && days <= 3 && <span className="count bg-danger-soft text-danger-ink">D-{days}</span>}
            </NavLink>
          )
        })}
        <NavLink to="/subscriptions/new" className={({ isActive }) => `${item({ isActive })} text-ink-2`}>
          <Icon name="plus" />
          <span className="flex-1">구독 추가</span>
        </NavLink>
      </nav>

      <div className="mt-auto space-y-0.5 pt-6">
        {mode === 'local' && <p className="mb-3 rounded-xl bg-sunken px-3 py-2 text-xs leading-relaxed text-ink-2">로컬 모드 — 이 브라우저에만 저장돼요.</p>}
        {supabase && (
          <button onClick={() => supabase!.auth.signOut()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[15px] text-ink hover:bg-ink/5">
            <Icon name="logout" />
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
  const item = ({ isActive }: { isActive: boolean }) => `t-tab rounded-xl px-3 py-1.5 text-sm ${isActive ? 'text-on-primary' : 'text-ink-2'}`
  return (
    <header className="sticky top-0 z-40 bg-app/85 backdrop-blur lg:hidden">
      <div className="flex h-14 items-center gap-2 px-4">
        <NavLink to="/" className="mr-auto flex items-center gap-2 font-medium">
          <img src="/favicon.svg" alt="" className="h-7 w-7" />
          <span className="hidden min-[400px]:inline">구독 체크리스트</span>
        </NavLink>
        <nav ref={bar} className="t-tabs flex gap-1 rounded-2xl bg-sunken p-1">
          <span ref={pill} aria-hidden className="t-tabs-pill rounded-xl bg-primary" />
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

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-dvh">
      <div className="flex min-h-dvh">
        <Sidebar pathname={pathname} />
        <div className="min-w-0 flex-1">
          <MobileHeader pathname={pathname} />

          {error && (
            <div className="flex items-start gap-2 px-4 pt-4 lg:px-8">
              <div className="t-reveal flex flex-1 items-center gap-2 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger-ink">
                <Icon name="alert" size={16} />
                저장 중 오류가 발생했어요: {error}
              </div>
              <button className="btn-ghost" onClick={dismissError}>
                닫기
              </button>
            </div>
          )}

          <main className="mx-auto max-w-[1400px] px-4 pt-4 pb-24 lg:px-10 lg:pt-8 lg:pb-12">
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
