import { useEffect, useMemo, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './store/supabase'
import { createLocalRepo, createSupabaseRepo } from './store/repo'
import { StoreProvider } from './store/StoreContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import SubscriptionForm from './pages/SubscriptionForm'
import SubscriptionDetail from './pages/SubscriptionDetail'
import PaymentMethods from './pages/PaymentMethods'
import Login from './pages/Login'
import { ToastProvider } from './components/Toast'

function AppRoutes() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="subscriptions/new" element={<SubscriptionForm />} />
          <Route path="subscriptions/:id" element={<SubscriptionDetail />} />
          <Route path="subscriptions/:id/edit" element={<SubscriptionForm />} />
          <Route path="payment-methods" element={<PaymentMethods />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}

function LocalApp() {
  const repo = useMemo(createLocalRepo, [])
  return (
    <StoreProvider repo={repo}>
      <AppRoutes />
    </StoreProvider>
  )
}

function CloudApp() {
  const client = supabase!
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const repo = useMemo(() => createSupabaseRepo(client), [client])

  useEffect(() => {
    client.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = client.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [client])

  if (session === undefined) return <div className="p-10 text-center text-ink-2">불러오는 중…</div>
  if (!session) return <Login />
  return (
    <StoreProvider key={session.user.id} repo={repo}>
      <AppRoutes />
    </StoreProvider>
  )
}

export default function App() {
  return supabase ? <CloudApp /> : <LocalApp />
}
