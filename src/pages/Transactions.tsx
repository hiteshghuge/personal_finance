import { useMemo, useState } from 'react'
import { getStore } from '../lib/store'
import { useData } from '../lib/useData'
import { formatDate, formatINR, lastMonths, formatMonth } from '../lib/format'
import TxRow from '../components/TxRow'
import TxForm from '../components/TxForm'
import { TX_TYPE_LABELS, type Transaction, type TxType } from '../types'

const PAGE = 50

export default function Transactions() {
  const months = useMemo(() => lastMonths(36).reverse(), [])
  const [month, setMonth] = useState<string>(months[0]) // '' = all time
  const [categoryId, setCategoryId] = useState('')
  const [methodId, setMethodId] = useState('')
  const [type, setType] = useState<TxType | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const { data: categories } = useData((s) => s.listCategories())
  const { data: methods } = useData((s) => s.listPaymentMethods())
  const { data: people } = useData((s) => s.listPeople())

  const filter = useMemo(() => {
    const [y, m] = month ? month.split('-').map(Number) : [0, 0]
    return {
      from: month ? `${month}-01` : undefined,
      to: month ? `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}` : undefined,
      categoryId: categoryId || undefined,
      methodId: methodId || undefined,
      type: (type || undefined) as TxType | undefined,
      search: search || undefined,
      limit: PAGE,
      offset: page * PAGE,
    }
  }, [month, categoryId, methodId, type, search, page])

  const { data, reload } = useData((s) => s.listTransactions(filter), [filter])

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const tx of data?.rows ?? []) {
      const list = map.get(tx.occurred_on) ?? []
      list.push(tx)
      map.set(tx.occurred_on, list)
    }
    return [...map.entries()]
  }, [data])

  const catMap = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories])
  const methodMap = useMemo(() => new Map((methods ?? []).map((m) => [m.id, m])), [methods])
  const peopleMap = useMemo(() => new Map((people ?? []).map((p) => [p.id, p])), [people])

  const totalOut = (data?.rows ?? []).filter((t) => t.direction === 'out' && t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  async function remove(tx: Transaction) {
    if (!confirm(`Delete this ${TX_TYPE_LABELS[tx.type].toLowerCase()} of ${formatINR(tx.amount)}?`)) return
    const store = await getStore()
    await store.deleteTransaction(tx.id)
    setEditing(null)
    reload()
  }

  if (editing) {
    return (
      <div>
        <h1 className="mb-4 text-xl font-bold">Edit transaction</h1>
        <TxForm
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
        <button onClick={() => remove(editing)} className="mt-6 w-full rounded-xl border border-red-800 py-3 text-sm font-semibold text-red-400">
          Delete transaction
        </button>
      </div>
    )
  }

  const select =
    'rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-2 text-xs outline-none focus:border-sky-500'

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h1 className="text-xl font-bold">History</h1>
        <span className="text-xs text-slate-400">
          {month ? formatMonth(month) : 'All time'} spend: <span className="font-semibold text-slate-200">{formatINR(totalOut)}</span>
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <select value={month} onChange={(e) => { setMonth(e.target.value); setPage(0) }} className={select}>
          <option value="">All time</option>
          {months.map((m) => (
            <option key={m} value={m}>{formatMonth(m)}</option>
          ))}
        </select>
        <select value={type} onChange={(e) => { setType(e.target.value as TxType | ''); setPage(0) }} className={select}>
          <option value="">All types</option>
          {Object.entries(TX_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(0) }} className={select}>
          <option value="">All categories</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={methodId} onChange={(e) => { setMethodId(e.target.value); setPage(0) }} className={select}>
          <option value="">All methods</option>
          {(methods ?? []).map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
      <input
        placeholder="Search notes…"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0) }}
        className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-sky-500"
      />

      {grouped.length === 0 && <p className="py-12 text-center text-sm text-slate-500">No transactions found.</p>}

      {grouped.map(([date, txs]) => (
        <div key={date} className="mb-3">
          <p className="mb-1 px-2 text-xs font-medium text-slate-500">{formatDate(date)}</p>
          {txs.map((tx) => (
            <TxRow key={tx.id} tx={tx} categories={catMap} methods={methodMap} people={peopleMap} onClick={() => setEditing(tx)} />
          ))}
        </div>
      ))}

      {data && data.total > PAGE && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-40">
            ← Newer
          </button>
          <span className="text-xs text-slate-500">
            {page * PAGE + 1}–{Math.min((page + 1) * PAGE, data.total)} of {data.total}
          </span>
          <button disabled={(page + 1) * PAGE >= data.total} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-40">
            Older →
          </button>
        </div>
      )}
    </div>
  )
}
