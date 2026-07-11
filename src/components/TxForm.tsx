import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { getStore } from '../lib/store'
import { useData } from '../lib/useData'
import { todayISO } from '../lib/format'
import { PERSON_TX_TYPES, TX_TYPE_LABELS, type NewTransaction, type Transaction, type TxType } from '../types'

const TYPE_ORDER: TxType[] = ['expense', 'income', 'lend', 'borrow', 'repay_out', 'repay_in']

interface Props {
  initial?: Transaction
  onSaved: () => void
  onCancel?: () => void
}

export default function TxForm({ initial, onSaved, onCancel }: Props) {
  const { data: methods } = useData((s) => s.listPaymentMethods())
  const { data: categories } = useData((s) => s.listCategories())
  const { data: people, reload: reloadPeople } = useData((s) => s.listPeople())

  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense')
  const [methodId, setMethodId] = useState<string | null>(initial?.payment_method_id ?? null)
  const [categoryId, setCategoryId] = useState<string | null>(initial?.category_id ?? null)
  const [personId, setPersonId] = useState<string | null>(initial?.person_id ?? null)
  const [note, setNote] = useState(initial?.note ?? '')
  const [date, setDate] = useState(initial?.occurred_on ?? todayISO())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const personTx = PERSON_TX_TYPES.includes(type)
  const activeMethods = useMemo(() => (methods ?? []).filter((m) => m.is_active), [methods])

  // Default to the first payment method once loaded
  useEffect(() => {
    if (!methodId && activeMethods.length > 0) setMethodId(activeMethods[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMethods.length])

  async function addPerson() {
    const name = prompt('Person name?')?.trim()
    if (!name) return
    const store = await getStore()
    const p = await store.createPerson(name)
    reloadPeople()
    setPersonId(p.id)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      setError('Enter a valid amount')
      return
    }
    if (personTx && !personId) {
      setError('Pick the person for this transaction')
      return
    }
    setBusy(true)
    setError(null)
    const tx: NewTransaction = {
      occurred_on: date,
      amount: amt,
      type,
      payment_method_id: methodId,
      category_id: personTx ? null : categoryId,
      person_id: personTx ? personId : null,
      note: note.trim() || null,
    }
    try {
      const store = await getStore()
      if (initial) {
        await store.updateTransaction(initial.id, tx)
      } else {
        await store.createTransaction(tx)
      }
      onSaved()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-3xl font-light text-slate-400">₹</span>
        <input
          inputMode="decimal"
          autoFocus={!initial}
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          className="w-full bg-transparent text-4xl font-bold outline-none placeholder:text-slate-600"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPE_ORDER.map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(t)}>
            {TX_TYPE_LABELS[t]}
          </Chip>
        ))}
      </div>

      <Section label="Paid via">
        <div className="flex flex-wrap gap-2">
          {activeMethods.map((m) => (
            <Chip key={m.id} active={methodId === m.id} onClick={() => setMethodId(m.id)}>
              {m.name}
            </Chip>
          ))}
        </div>
      </Section>

      {personTx ? (
        <Section label="Person">
          <div className="flex flex-wrap gap-2">
            {(people ?? []).map((p) => (
              <Chip key={p.id} active={personId === p.id} onClick={() => setPersonId(p.id)}>
                {p.name}
              </Chip>
            ))}
            <Chip active={false} onClick={addPerson}>
              + New person
            </Chip>
          </div>
        </Section>
      ) : (
        <Section label="Category">
          <div className="flex flex-wrap gap-2">
            {(categories ?? []).map((c) => (
              <Chip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)} dotColor={c.color}>
                {c.name}
              </Chip>
            ))}
          </div>
        </Section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
        />
        <input
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-700 py-3 font-semibold text-slate-300"
          >
            Cancel
          </button>
        )}
        <button disabled={busy} className="flex-1 rounded-xl bg-sky-500 py-3 font-semibold text-white disabled:opacity-50">
          {busy ? 'Saving…' : initial ? 'Save changes' : 'Save'}
        </button>
      </div>
    </form>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      {children}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
  dotColor,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  dotColor?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'border-sky-500 bg-sky-500/15 text-sky-300'
          : 'border-slate-700 bg-slate-800 text-slate-300'
      }`}
    >
      {dotColor && <span className="h-2 w-2 rounded-full" style={{ background: dotColor }} />}
      {children}
    </button>
  )
}
