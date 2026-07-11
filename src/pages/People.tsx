import { Link } from 'react-router-dom'
import { getStore } from '../lib/store'
import { useData } from '../lib/useData'
import { formatINR } from '../lib/format'

export default function People() {
  const { data: balances, reload } = useData((s) => s.personBalances())

  async function addPerson() {
    const name = prompt('Person name?')?.trim()
    if (!name) return
    const store = await getStore()
    await store.createPerson(name)
    reload()
  }

  const totalOwedToMe = (balances ?? []).filter((b) => b.balance > 0).reduce((s, b) => s + b.balance, 0)
  const totalIOwe = (balances ?? []).filter((b) => b.balance < 0).reduce((s, b) => s - b.balance, 0)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">People</h1>
        <button onClick={addPerson} className="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white">
          + Add
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-3">
          <p className="text-xs text-slate-400">Owed to me</p>
          <p className="text-lg font-bold text-emerald-400">{formatINR(totalOwedToMe)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-3">
          <p className="text-xs text-slate-400">I owe</p>
          <p className="text-lg font-bold text-red-400">{formatINR(totalIOwe)}</p>
        </div>
      </div>

      {(balances ?? []).length === 0 && (
        <p className="py-12 text-center text-sm text-slate-500">
          No people yet. Add friends/family you borrow from or lend to.
        </p>
      )}

      <div className="space-y-1">
        {(balances ?? [])
          .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
          .map((b) => (
            <Link
              key={b.person_id}
              to={`/people/${b.person_id}`}
              className="flex items-center justify-between rounded-xl px-3 py-3 hover:bg-slate-800/60"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-bold">
                  {b.name[0]?.toUpperCase()}
                </span>
                <span className="text-sm font-medium">{b.name}</span>
              </span>
              <span
                className={`text-sm font-semibold ${
                  b.balance > 0 ? 'text-emerald-400' : b.balance < 0 ? 'text-red-400' : 'text-slate-500'
                }`}
              >
                {b.balance > 0 ? `owes you ${formatINR(b.balance)}` : b.balance < 0 ? `you owe ${formatINR(-b.balance)}` : 'settled'}
              </span>
            </Link>
          ))}
      </div>
    </div>
  )
}
