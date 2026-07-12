import { formatINR } from '../lib/format'
import { TX_TYPE_LABELS, type Category, type PaymentMethod, type Person, type Transaction } from '../types'

interface Props {
  tx: Transaction
  categories: Map<string, Category>
  methods: Map<string, PaymentMethod>
  people: Map<string, Person>
  onClick?: () => void
}

export default function TxRow({ tx, categories, methods, people, onClick }: Props) {
  const tags = tx.tag_ids.map((id) => categories.get(id)).filter(Boolean) as NonNullable<
    ReturnType<typeof categories.get>
  >[]
  const cat = tags[0] ?? null
  const person = tx.person_id ? people.get(tx.person_id) : null
  const method = tx.payment_method_id ? methods.get(tx.payment_method_id) : null
  const isOut = tx.direction === 'out'

  const title = person
    ? `${TX_TYPE_LABELS[tx.type]} · ${person.name}`
    : tags.length > 0
      ? tags.map((t) => t.name).join(' · ')
      : tx.type === 'income'
        ? 'Income'
        : 'Untagged'

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-slate-800/60"
    >
      <span
        className="h-9 w-9 shrink-0 rounded-full"
        style={{ background: (cat?.color ?? (person ? '#f59e0b' : '#64748b')) + '33', border: `2px solid ${cat?.color ?? (person ? '#f59e0b' : '#64748b')}` }}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-slate-400">
          {[method?.name, tx.note].filter(Boolean).join(' · ') || '—'}
        </span>
      </span>
      <span className={`text-sm font-semibold ${isOut ? 'text-red-400' : 'text-emerald-400'}`}>
        {isOut ? '−' : '+'}
        {formatINR(tx.amount)}
      </span>
    </button>
  )
}
