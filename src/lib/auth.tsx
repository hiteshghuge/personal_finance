import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { IS_DEMO } from './store'

interface AuthState {
  loading: boolean
  signedIn: boolean
  email: string | null
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string): Promise<string | null>
  signOut(): Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside provider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(!IS_DEMO)
  const [signedIn, setSignedIn] = useState(IS_DEMO)
  const [email, setEmail] = useState<string | null>(IS_DEMO ? 'demo@example.com' : null)

  useEffect(() => {
    if (IS_DEMO) return
    let unsub = () => {}
    void import('./supabase').then(({ getSupabase }) => {
      const db = getSupabase()
      void db.auth.getSession().then(({ data }) => {
        setSignedIn(!!data.session)
        setEmail(data.session?.user.email ?? null)
        setLoading(false)
      })
      const { data: sub } = db.auth.onAuthStateChange((_evt, session) => {
        setSignedIn(!!session)
        setEmail(session?.user.email ?? null)
      })
      unsub = () => sub.subscription.unsubscribe()
    })
    return () => unsub()
  }, [])

  const value: AuthState = {
    loading,
    signedIn,
    email,
    async signIn(email, password) {
      if (IS_DEMO) return
      const { getSupabase } = await import('./supabase')
      const { error } = await getSupabase().auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
    },
    async signUp(email, password) {
      if (IS_DEMO) return null
      const { getSupabase } = await import('./supabase')
      const { data, error } = await getSupabase().auth.signUp({ email, password })
      if (error) throw new Error(error.message)
      return data.session ? null : 'Check your email to confirm your account, then sign in.'
    },
    async signOut() {
      if (IS_DEMO) return
      const { getSupabase } = await import('./supabase')
      await getSupabase().auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
