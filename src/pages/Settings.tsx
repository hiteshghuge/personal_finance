import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getStore, IS_DEMO } from '../lib/store'
import { useData } from '../lib/useData'
import { useAuth } from '../lib/auth'
import { daysUntil, nextDueDate } from '../lib/cycles'
import { formatDate } from '../lib/format'
import type { CreditCard } from '../types'

export default function Settings() {
  const { email, signOut } = useAuth()
  const { data: methods, reload: reloadMethods } = useData((s) => s.listPaymentMethods())

  async function addMethod() {
    const name = prompt('Payment method name? (e.g. Paytm, HDFC Card)')?.trim()
    if (!name) return
    const kind = /upi|gpay|phonepe|paytm/i.test(name) ? 'upi' : /card/i.test(name) ? 'card' : /cash/i.test(name) ? 'cash' : 'other'
    const store = await getStore()
    await store.createPaymentMethod(name, kind)
    reloadMethods()
  }

  async function toggleMethod(id: string, active: boolean) {
    const store = await getStore()
    await store.updatePaymentMethod(id, { is_active: !active })
    reloadMethods()
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Settings</h1>

      {IS_DEMO && (
        <div className="mb-4 rounded-xl border border-amber-700 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300">
          Demo mode — data is in-memory sample data and resets on refresh.
        </div>
      )}

      <Link
        to="/import"
        className="mb-6 flex items-center justify-between rounded-xl border border-sky-800 bg-sky-500/10 px-4 py-3.5 text-sm font-semibold text-sky-300"
      >
        📥 Import from Google Sheet export <span>→</span>
      </Link>

      <h2 className="mb-3 text-xs font-semibold tracking-widest text-slate-500 uppercase">Configure</h2>

      <Section title="Payment methods" action={{ label: '+ Add', onClick: addMethod }}>
        {(methods ?? []).map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-800/60">
            <span className={`flex-1 text-sm ${m.is_active ? '' : 'text-slate-500 line-through'}`}>
              {m.name} <span className="text-xs text-slate-500">({m.kind})</span>
            </span>
            <button onClick={() => toggleMethod(m.id, m.is_active)} className="text-xs text-slate-400">
              {m.is_active ? 'Hide' : 'Show'}
            </button>
          </div>
        ))}
      </Section>

      <SalaryCycleCard />
      <CreditCardsCard />

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-800/50 p-4">
        <p className="text-xs text-slate-400">Signed in as</p>
        <p className="mb-3 text-sm">{email}</p>
        <button onClick={() => void signOut()} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300">
          Sign out
        </button>
      </div>
    </div>
  )
}

function SalaryCycleCard() {
  const { data: settings, reload } = useData((s) => s.getSettings())
  const [day, setDay] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDay(settings?.salary_day ? String(settings.salary_day) : '')
  }, [settings])

  async function save(e: FormEvent) {
    e.preventDefault()
    const n = Number(day)
    if (day !== '' && (!Number.isInteger(n) || n < 1 || n > 31)) return
    const store = await getStore()
    await store.updateSettings({ salary_day: day === '' ? null : n })
    reload()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Section title="Salary cycle">
      <p className="mb-3 px-2 text-xs text-slate-400">
        Optional. Set the day of the month your salary lands and Analytics gains "This cycle / Last
        cycle" views that run salary-day to salary-day instead of calendar months.
      </p>
      <form onSubmit={save} className="flex items-center gap-2 px-2 pb-1">
        <label className="text-sm text-slate-300" htmlFor="salary-day">
          Salary day of month
        </label>
        <input
          id="salary-day"
          inputMode="numeric"
          placeholder="—"
          value={day}
          onChange={(e) => setDay(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
          className="w-16 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-center text-sm outline-none focus:border-sky-500"
        />
        <button className="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white">Save</button>
        {settings?.salary_day != null && (
          <button
            type="button"
            onClick={async () => {
              const store = await getStore()
              await store.updateSettings({ salary_day: null })
              reload()
            }}
            className="text-xs text-slate-400"
          >
            Clear
          </button>
        )}
        {saved && <span className="text-xs text-emerald-400">Saved ✓</span>}
      </form>
      {settings?.salary_day != null && (
        <p className="px-2 pb-1 text-xs text-emerald-400">
          Active: cycles run from the {ordinal(settings.salary_day)} to the {ordinal(settings.salary_day)}.
        </p>
      )}
    </Section>
  )
}

function CreditCardsCard() {
  const { data: cards, reload } = useData((s) => s.listCreditCards())
  const [adding, setAdding] = useState(false)
  const today = new Date()

  async function remove(card: CreditCard) {
    if (!confirm(`Remove card "${card.name}"?`)) return
    const store = await getStore()
    await store.deleteCreditCard(card.id)
    reload()
  }

  return (
    <Section title="Credit cards" action={{ label: adding ? 'Close' : '+ Add card', onClick: () => setAdding(!adding) }}>
      <p className="mb-2 px-2 text-xs text-slate-400">
        Add each card's billing cycle to see upcoming due dates (payment reminders coming later).
      </p>
      {adding && <CardForm onDone={() => { setAdding(false); reload() }} />}
      {(cards ?? []).length === 0 && !adding && (
        <p className="px-2 py-2 text-xs text-slate-500">No cards yet.</p>
      )}
      {(cards ?? []).map((card) => {
        const due = nextDueDate(card.due_day, today)
        const days = daysUntil(due, today)
        return (
          <div key={card.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-800/60">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{card.name}</p>
              <p className="text-xs text-slate-400">
                Statement on the {ordinal(card.statement_day)} · due on the {ordinal(card.due_day)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-300">{formatDate(due)}</p>
              <p className={`text-xs font-semibold ${days <= 3 ? 'text-red-400' : days <= 7 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {days === 0 ? 'due today' : days === 1 ? 'due tomorrow' : `due in ${days} days`}
              </p>
            </div>
            <button onClick={() => remove(card)} className="text-xs text-red-400">✕</button>
          </div>
        )
      })}
    </Section>
  )
}

function CardForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [statementDay, setStatementDay] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const s = Number(statementDay)
    const d = Number(dueDay)
    if (!name.trim()) return setError('Card name required')
    if (!Number.isInteger(s) || s < 1 || s > 31) return setError('Statement day must be 1-31')
    if (!Number.isInteger(d) || d < 1 || d > 31) return setError('Due day must be 1-31')
    setBusy(true)
    setError(null)
    try {
      const store = await getStore()
      await store.createCreditCard({ name: name.trim(), statement_day: s, due_day: d })
      onDone()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  const input = 'rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm outline-none focus:border-sky-500'
  return (
    <form onSubmit={submit} className="mb-2 space-y-2 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
      <input placeholder="Card name (e.g. HDFC Millennia)" value={name} onChange={(e) => setName(e.target.value)} className={`${input} w-full`} />
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-400">Statement day</label>
        <input inputMode="numeric" placeholder="16" value={statementDay} onChange={(e) => setStatementDay(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} className={`${input} w-14 text-center`} />
        <label className="text-xs text-slate-400">Due day</label>
        <input inputMode="numeric" placeholder="5" value={dueDay} onChange={(e) => setDueDay(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} className={`${input} w-14 text-center`} />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-sky-500 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? 'Saving…' : 'Save card'}
      </button>
    </form>
  )
}

function ordinal(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${suffix}`
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: { label: string; onClick: () => void }
  children: React.ReactNode
}) {
  return (
    <div className="mb-5">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{title}</p>
        {action && (
          <button onClick={action.onClick} className="text-xs font-semibold text-sky-400">
            {action.label}
          </button>
        )}
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-2">{children}</div>
    </div>
  )
}
