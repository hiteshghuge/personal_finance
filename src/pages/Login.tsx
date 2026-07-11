import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        const info = await signUp(email, password)
        if (info) setMessage(info)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-bold">Personal Finance</h1>
      <p className="mb-8 text-sm text-slate-400">Track every rupee — spends, borrows, lends.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-sky-500"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-sky-500"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-400">{message}</p>}
        <button
          disabled={busy}
          className="w-full rounded-xl bg-sky-500 py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <button
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        className="mt-4 text-sm text-sky-400"
      >
        {mode === 'signin' ? "First time? Create an account" : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
