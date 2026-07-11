import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getStore } from '../lib/store'
import { useData } from '../lib/useData'
import { formatDate, formatINR } from '../lib/format'
import TxForm from '../components/TxForm'
import { TX_TYPE_LABELS, type Transaction } from '../types'

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editing, setEditing] = useState<Transaction | null>(null)

  const { data: people, reload: reloadPeople } = useData((s) => s.listPeople())
  const { data: balances } = useData((s) => s.personBalances())
  const { data, reload } = useData((s) => s.listTransactions({ personId: id, limit: 200 }), [id])

  const person = useMemo(() => (people ?? []).find((p) => p.id === id), [people, id])
  const balance = (balances ?? []).find((b) => b.person_id === id)?.balance ?? 0

  async function rename() {
    const name = prompt('Rename person', person?.name)?.trim()
    if (!name || !id) return
    const store = await getStore()
    await store.updatePerson(id, { name })
    reloadPeople()
  }

  async function removePerson() {
    if (!id) return
    if (!confirm('Delete this person? Their transactions stay but lose the person link.')) return
    const store = await getStore()
    await store.deletePerson(id)
    navigate('/people')
  }

  if (editing) {
    return (
      <div>
        <h1 className="mb-4 text-xl font-bold">Edit transaction</h1>
        <TxForm initial={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />
      </div>
    )
  }

  return (
    <div>
      <Link to="/people" className="text-sm text-sky-400">← People</Link>
      <div className="mt-2 mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{person?.name ?? '…'}</h1>
        <div className="flex gap-2 text-xs">
          <button onClick={rename} className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-slate-300">Rename</button>
          <button onClick={removePerson} className="rounded-lg border border-red-800 px-2.5 py-1.5 text-red-400">Delete</button>
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-slate-800 bg-slate-800/50 p-4">
        <p className="text-xs text-slate-400">Net balance</p>
        <p className={`text-2xl font-bold ${balance > 0 ? 'text-emerald-400' : balance < 0 ? 'text-red-400' : 'text-slate-300'}`}>
          {balance > 0 ? `${person?.name ?? 'They'} owes you ${formatINR(balance)}` : balance < 0 ? `You owe ${formatINR(-balance)}` : 'All settled'}
        </p>
      </div>

      <h2 className="mb-2 text-sm font-semibold text-slate-400">History</h2>
      <div className="space-y-1">
        {(data?.rows ?? []).map((tx) => (
          <button
            key={tx.id}
            onClick={() => setEditing(tx)}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-slate-800/60"
          >
            <span>
              <span className="block text-sm font-medium">{TX_TYPE_LABELS[tx.type]}</span>
              <span className="block text-xs text-slate-400">
                {formatDate(tx.occurred_on)}
                {tx.note ? ` · ${tx.note}` : ''}
              </span>
            </span>
            <span className={`text-sm font-semibold ${tx.direction === 'out' ? 'text-red-400' : 'text-emerald-400'}`}>
              {tx.direction === 'out' ? '−' : '+'}
              {formatINR(tx.amount)}
            </span>
          </button>
        ))}
        {(data?.rows ?? []).length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">No transactions with this person yet.</p>
        )}
      </div>
    </div>
  )
}
