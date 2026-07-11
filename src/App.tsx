import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import QuickAdd from './pages/QuickAdd'
import Transactions from './pages/Transactions'
import People from './pages/People'
import PersonDetail from './pages/PersonDetail'
import Settings from './pages/Settings'

const Analytics = lazy(() => import('./pages/Analytics'))
const ImportPage = lazy(() => import('./pages/ImportPage'))

export default function App() {
  const { loading, signedIn } = useAuth()

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center text-slate-400">Loading…</div>
  }

  if (!signedIn) {
    return <Login />
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <main className="flex-1 px-4 pt-4 pb-24">
        <Suspense fallback={<p className="py-12 text-center text-sm text-slate-500">Loading…</p>}>
        <Routes>
          <Route path="/" element={<QuickAdd />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/people" element={<People />} />
          <Route path="/people/:id" element={<PersonDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>
      <BottomNav />
    </div>
  )
}
