import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStore } from '../lib/store'
import { formatINR } from '../lib/format'
import {
  guessMapping,
  mapRows,
  parseFile,
  type ColumnMapping,
  type ParsedSheet,
} from '../lib/importParse'
import type { NewTransaction } from '../types'

const FIELDS: Array<{ key: keyof ColumnMapping; label: string; required?: boolean }> = [
  { key: 'date', label: 'Date', required: true },
  { key: 'amount', label: 'Amount', required: true },
  { key: 'category', label: 'Category / Tag' },
  { key: 'method', label: 'Payment method' },
  { key: 'person', label: 'Person (borrow/lend)' },
  { key: 'note', label: 'Note / Description' },
  { key: 'type', label: 'Type (expense/income/lend/…)' },
]

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [sheet, setSheet] = useState<ParsedSheet | null>(null)
  const [sheetName, setSheetName] = useState<string>('')
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({})
  const [negativeIsIncome, setNegativeIsIncome] = useState(true)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadFile(f: File, name?: string) {
    setError(null)
    setResult(null)
    try {
      const parsed = await parseFile(f, name)
      setFile(f)
      setSheet(parsed)
      setSheetName(name ?? parsed.sheetNames[0] ?? '')
      setMapping(guessMapping(parsed.headers))
    } catch (e) {
      setError(`Could not read file: ${(e as Error).message}`)
    }
  }

  const mapped = useMemo(() => {
    if (!sheet || !mapping.date || !mapping.amount) return null
    return mapRows(sheet.rows, mapping as ColumnMapping, negativeIsIncome)
  }, [sheet, mapping, negativeIsIncome])

  const good = useMemo(() => (mapped ?? []).filter((r) => !r.error), [mapped])
  const bad = useMemo(() => (mapped ?? []).filter((r) => r.error), [mapped])

  async function runImport() {
    if (!good.length) return
    setBusy(true)
    setError(null)
    try {
      const store = await getStore()
      const [cats, methods, people] = await Promise.all([
        store.listCategories(),
        store.listPaymentMethods(),
        store.listPeople(),
      ])
      const catIds = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]))
      const methodIds = new Map(methods.map((m) => [m.name.toLowerCase(), m.id]))
      const personIds = new Map(people.map((p) => [p.name.toLowerCase(), p.id]))

      async function categoryId(name: string | null) {
        if (!name) return null
        const key = name.toLowerCase()
        if (!catIds.has(key)) catIds.set(key, (await store.createCategory(name)).id)
        return catIds.get(key)!
      }
      async function methodId(name: string | null) {
        if (!name) return null
        const key = name.toLowerCase()
        if (!methodIds.has(key)) {
          const kind = /upi|gpay|phonepe|paytm/i.test(name) ? 'upi' : /card/i.test(name) ? 'card' : /cash/i.test(name) ? 'cash' : 'other'
          methodIds.set(key, (await store.createPaymentMethod(name, kind)).id)
        }
        return methodIds.get(key)!
      }
      async function personId(name: string | null) {
        if (!name) return null
        const key = name.toLowerCase()
        if (!personIds.has(key)) personIds.set(key, (await store.createPerson(name)).id)
        return personIds.get(key)!
      }

      const txs: NewTransaction[] = []
      for (const r of good) {
        txs.push({
          occurred_on: r.tx.occurred_on,
          amount: r.tx.amount,
          type: r.tx.type,
          note: r.tx.note,
          category_id: await categoryId(r.tx.categoryName),
          payment_method_id: await methodId(r.tx.methodName),
          person_id: await personId(r.tx.personName),
        })
      }
      const n = await store.bulkInsertTransactions(txs)
      setResult(`Imported ${n} transactions ✓${bad.length ? ` (${bad.length} rows skipped)` : ''}`)
      setSheet(null)
      setFile(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const select =
    'w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs outline-none focus:border-sky-500'

  return (
    <div>
      <Link to="/settings" className="text-sm text-sky-400">← Settings</Link>
      <h1 className="mt-2 mb-1 text-xl font-bold">Import from sheet</h1>
      <p className="mb-4 text-xs text-slate-400">
        Export your Google Sheet as <b>.xlsx</b> or <b>.csv</b> (File → Download), upload it here, map the columns, and import.
        Unknown tags, payment methods, and people are created automatically.
      </p>

      {result && <div className="mb-4 rounded-xl border border-emerald-700 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">{result}</div>}
      {error && <div className="mb-4 rounded-xl border border-red-800 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</div>}

      <label className="mb-4 block cursor-pointer rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/40 p-6 text-center text-sm text-slate-400 hover:border-sky-600">
        {file ? file.name : 'Tap to choose a .xlsx / .csv file'}
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
        />
      </label>

      {sheet && sheet.sheetNames.length > 1 && (
        <div className="mb-4">
          <p className="mb-1 text-xs text-slate-400">Sheet tab</p>
          <select value={sheetName} onChange={(e) => file && loadFile(file, e.target.value)} className={select}>
            {sheet.sheetNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      )}

      {sheet && (
        <>
          <div className="mb-4 rounded-xl border border-slate-800 bg-slate-800/50 p-4">
            <p className="mb-3 text-xs font-medium tracking-wide text-slate-400 uppercase">Map columns · {sheet.rows.length} rows found</p>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <p className="mb-1 text-xs text-slate-400">
                    {f.label}
                    {f.required && <span className="text-red-400"> *</span>}
                  </p>
                  <select
                    value={mapping[f.key] ?? ''}
                    onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value || undefined })}
                    className={select}
                  >
                    <option value="">— not in sheet —</option>
                    {sheet.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={negativeIsIncome} onChange={(e) => setNegativeIsIncome(e.target.checked)} />
              Treat negative amounts as income
            </label>
          </div>

          {mapped && (
            <>
              <div className="mb-4 rounded-xl border border-slate-800 bg-slate-800/50 p-4">
                <p className="mb-2 text-xs font-medium tracking-wide text-slate-400 uppercase">Preview</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="py-1 pr-3">Date</th>
                        <th className="py-1 pr-3">Amount</th>
                        <th className="py-1 pr-3">Type</th>
                        <th className="py-1 pr-3">Tag</th>
                        <th className="py-1 pr-3">Via</th>
                        <th className="py-1">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mapped.slice(0, 8).map((r) => (
                        <tr key={r.rowIndex} className={r.error ? 'text-red-400' : 'text-slate-300'}>
                          <td className="py-1 pr-3 whitespace-nowrap">{r.tx.occurred_on || '—'}</td>
                          <td className="py-1 pr-3">{r.tx.amount ? formatINR(r.tx.amount) : '—'}</td>
                          <td className="py-1 pr-3">{r.tx.type}</td>
                          <td className="py-1 pr-3">{r.tx.categoryName ?? '—'}</td>
                          <td className="py-1 pr-3">{r.tx.methodName ?? '—'}</td>
                          <td className="max-w-32 truncate py-1">{r.error ?? r.tx.note ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  <span className="text-emerald-400">{good.length} rows ready</span>
                  {bad.length > 0 && <span className="text-red-400"> · {bad.length} rows will be skipped (first skipped: row {bad[0].rowIndex} — {bad[0].error})</span>}
                </p>
              </div>

              <button
                disabled={busy || good.length === 0}
                onClick={runImport}
                className="w-full rounded-xl bg-sky-500 py-3 font-semibold text-white disabled:opacity-50"
              >
                {busy ? 'Importing…' : `Import ${good.length} transactions`}
              </button>
              <p className="mt-2 text-center text-[11px] text-slate-500">
                Importing the same file twice creates duplicates — import once, then add new spends in the app.
              </p>
            </>
          )}
        </>
      )}
    </div>
  )
}
