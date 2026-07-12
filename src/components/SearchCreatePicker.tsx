import { useMemo, useState } from 'react'

interface Item {
  id: string
  name: string
  color?: string
}

interface Props {
  items: Item[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: (name: string) => Promise<void>
  placeholder: string
  /** chips shown before searching */
  maxVisible?: number
}

/**
 * Chip picker with type-ahead: typing filters existing items; if nothing
 * matches exactly, a "create" chip appears so new tags/methods/people can be
 * added right from the form.
 */
export default function SearchCreatePicker({
  items,
  selectedId,
  onSelect,
  onCreate,
  placeholder,
  maxVisible = 12,
}: Props) {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    const list = q ? items.filter((it) => it.name.toLowerCase().includes(q)) : items
    // Keep the selected item visible even when the list is truncated
    const visible = list.slice(0, maxVisible)
    const selected = items.find((it) => it.id === selectedId)
    if (selected && !visible.some((it) => it.id === selected.id) && !q) visible.unshift(selected)
    return visible
  }, [items, q, maxVisible, selectedId])

  const exactMatch = items.some((it) => it.name.toLowerCase() === q)
  const showCreate = q.length > 0 && !exactMatch

  async function create() {
    const name = query.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      await onCreate(name)
      setQuery('')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="mb-2 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-sky-500"
      />

      <div className="flex flex-wrap gap-2">
        {filtered.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => {
              onSelect(it.id)
              setQuery('')
            }}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
              selectedId === it.id
                ? 'border-sky-500 bg-sky-500/15 text-sky-300'
                : 'border-slate-700 bg-slate-800 text-slate-300'
            }`}
          >
            {it.color && <span className="h-2 w-2 rounded-full" style={{ background: it.color }} />}
            {it.name}
          </button>
        ))}
        {filtered.length === 0 && !showCreate && (
          <p className="px-1 py-1 text-xs text-slate-500">Nothing found</p>
        )}
        {showCreate && (
          <button
            type="button"
            onClick={create}
            disabled={creating}
            className="rounded-full border border-dashed border-emerald-600 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-300 disabled:opacity-50"
          >
            {creating ? 'Adding…' : `＋ Add "${query.trim()}"`}
          </button>
        )}
      </div>
    </div>
  )
}
