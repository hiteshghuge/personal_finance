import { Link } from 'react-router-dom'
import { getStore, IS_DEMO } from '../lib/store'
import { useData } from '../lib/useData'
import { useAuth } from '../lib/auth'

const PALETTE = ['#3987e5', '#e66767', '#c98500', '#199e70', '#9085e9', '#d55181', '#d95926', '#008300']

export default function Settings() {
  const { email, signOut } = useAuth()
  const { data: categories, reload: reloadCats } = useData((s) => s.listCategories())
  const { data: methods, reload: reloadMethods } = useData((s) => s.listPaymentMethods())

  async function addCategory() {
    const name = prompt('Category name?')?.trim()
    if (!name) return
    const store = await getStore()
    await store.createCategory(name, PALETTE[(categories?.length ?? 0) % PALETTE.length])
    reloadCats()
  }

  async function renameCategory(id: string, current: string) {
    const name = prompt('Rename category', current)?.trim()
    if (!name) return
    const store = await getStore()
    await store.updateCategory(id, { name })
    reloadCats()
  }

  async function deleteCategory(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? Its transactions become uncategorised.`)) return
    const store = await getStore()
    await store.deleteCategory(id)
    reloadCats()
  }

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
        className="mb-5 flex items-center justify-between rounded-xl border border-sky-800 bg-sky-500/10 px-4 py-3.5 text-sm font-semibold text-sky-300"
      >
        📥 Import from Google Sheet export <span>→</span>
      </Link>

      <Section title="Categories" onAdd={addCategory}>
        {(categories ?? []).map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-800/60">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
            <span className="flex-1 text-sm">{c.name}</span>
            <button onClick={() => renameCategory(c.id, c.name)} className="text-xs text-slate-400">Rename</button>
            <button onClick={() => deleteCategory(c.id, c.name)} className="text-xs text-red-400">Delete</button>
          </div>
        ))}
      </Section>

      <Section title="Payment methods" onAdd={addMethod}>
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

function Section({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{title}</p>
        <button onClick={onAdd} className="text-xs font-semibold text-sky-400">+ Add</button>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-2">{children}</div>
    </div>
  )
}
