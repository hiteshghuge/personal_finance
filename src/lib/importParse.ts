import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { NewTransaction, TxType } from '../types'

export type RawRow = Record<string, unknown>

export interface ParsedSheet {
  headers: string[]
  rows: RawRow[]
  sheetNames: string[]
}

export async function parseFile(file: File, sheetName?: string): Promise<ParsedSheet> {
  if (file.name.toLowerCase().endsWith('.csv')) {
    const text = await file.text()
    const result = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true })
    const headers = result.meta.fields ?? []
    return { headers, rows: result.data, sheetNames: [] }
  }
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { cellDates: true })
  const name = sheetName ?? wb.SheetNames[0]
  const ws = wb.Sheets[name]
  const rows = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: '' })
  const headers = rows.length > 0 ? Object.keys(rows[0]) : []
  return { headers, rows, sheetNames: wb.SheetNames }
}

/** Accepts Date, Excel serials, dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd, "5 Jan 2024" etc. Returns YYYY-MM-DD or null. */
export function parseDateCell(v: unknown): string | null {
  if (v == null || v === '') return null
  if (v instanceof Date && !isNaN(v.getTime())) return toISO(v)
  if (typeof v === 'number' && v > 25000 && v < 60000) {
    // Excel serial date (1900 epoch)
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    return toISO(d)
  }
  const s = String(v).trim()
  // d-MMM-yyyy ("1-Jan-2023"), as Google Sheets formats dates
  const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
  let m = s.match(/^(\d{1,2})[/\-. ]([a-zA-Z]{3,})[/\-. ,]+(\d{2,4})$/)
  if (m) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()]
    if (mo) {
      const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
      return `${year}-${pad(mo)}-${pad(m[1])}`
    }
  }
  // dd/mm/yyyy or dd-mm-yyyy (Indian convention: day first)
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (m) {
    const [, d, mo, y] = m
    const year = y.length === 2 ? 2000 + Number(y) : Number(y)
    if (Number(mo) >= 1 && Number(mo) <= 12 && Number(d) >= 1 && Number(d) <= 31)
      return `${year}-${pad(mo)}-${pad(d)}`
  }
  // yyyy-mm-dd
  m = s.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/)
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`
  const d = new Date(s)
  if (!isNaN(d.getTime())) return toISO(d)
  return null
}

export function parseAmountCell(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return v
  const n = Number(String(v).replace(/[₹,\s]/g, ''))
  return isNaN(n) ? null : n
}

/** Map free-text type strings from a sheet onto our TxType. */
export function parseTypeCell(v: unknown): TxType | null {
  const s = String(v ?? '').trim().toLowerCase()
  if (!s) return null
  if (/(lend|lent|gave|given|udhar diya)/.test(s)) return 'lend'
  if (/(borrow|took|liya)/.test(s)) return 'borrow'
  if (/(repaid to|repay out|returned to|paid back)/.test(s)) return 'repay_out'
  if (/(received back|repay in|got back)/.test(s)) return 'repay_in'
  if (/(income|credit|salary|received|earn)/.test(s)) return 'income'
  if (/(expense|debit|spent|spend)/.test(s)) return 'expense'
  return null
}

export interface ColumnMapping {
  date: string
  amount: string
  category?: string
  method?: string
  person?: string
  note?: string
  type?: string
  /** Separate credit-card amount column: used when the main amount is 0/empty; forces method to "Credit Card". */
  creditCard?: string
}

export interface MappedRow {
  tx: Omit<NewTransaction, 'payment_method_id' | 'category_id' | 'person_id'> & {
    categoryName: string | null
    methodName: string | null
    personName: string | null
  }
  error: string | null
  rowIndex: number
}

/** negativeIsIncome: rows with negative amounts become income instead of being rejected. */
export function mapRows(rows: RawRow[], mapping: ColumnMapping, negativeIsIncome: boolean): MappedRow[] {
  return rows.map((row, i) => {
    const date = parseDateCell(row[mapping.date])
    let rawAmount = parseAmountCell(row[mapping.amount])
    const explicitType = mapping.type ? parseTypeCell(row[mapping.type]) : null
    const str = (key?: string) => {
      const v = key ? String(row[key] ?? '').trim() : ''
      return v || null
    }

    // Sheets with a separate credit-card amount column: main amount 0 + card amount set
    let viaCreditCard = false
    if (mapping.creditCard && (rawAmount == null || rawAmount === 0)) {
      const cc = parseAmountCell(row[mapping.creditCard])
      if (cc != null && cc !== 0) {
        rawAmount = cc
        viaCreditCard = true
      }
    }

    let error: string | null = null
    if (!date) error = 'Unreadable date'
    else if (rawAmount == null || rawAmount === 0) error = 'Missing/zero amount'

    let type: TxType = explicitType ?? 'expense'
    let amount = rawAmount ?? 0
    if (amount < 0) {
      amount = -amount
      if (!explicitType) type = negativeIsIncome ? 'income' : 'expense'
    }

    const personName = str(mapping.person)
    if ((type === 'lend' || type === 'borrow' || type === 'repay_out' || type === 'repay_in') && !personName) {
      error ??= `Type "${type}" needs a person`
    }

    return {
      rowIndex: i + 2, // 1-based + header row, matches what the user sees in Sheets
      error,
      tx: {
        occurred_on: date ?? '',
        amount,
        type,
        note: str(mapping.note),
        categoryName: str(mapping.category),
        methodName: viaCreditCard ? 'Credit Card' : str(mapping.method),
        personName,
      },
    }
  })
}

// Ordered candidate patterns per field: earlier patterns win (exact-ish before fuzzy).
const GUESS: Record<keyof ColumnMapping, RegExp[]> = {
  date: [/^date$/i, /date|^dt$|day/i],
  amount: [/am+ount\s*(dr)?$/i, /am+ount|amt|price|cost|debit amount|^rs$|inr|value/i],
  creditCard: [/credit\s*card/i],
  category: [/^tags?$/i, /tag|category|^cat$|head/i],
  method: [/payment\s*(medium|mode|method)/i, /medium|mode|method|via|paid|source|account|bank|upi/i],
  person: [/^person$|friend|^who$|party/i],
  note: [/^name$|^note s?$|desc|remark|detail|comment|item/i, /note/i],
  type: [/payment\s*type|^type$|txn type|transaction type/i, /kind|dr\/cr/i],
}

export function guessMapping(headers: string[]): Partial<ColumnMapping> {
  const out: Partial<ColumnMapping> = {}
  const taken = new Set<string>()
  // Two passes: first every field's precise pattern, then the fuzzy fallbacks.
  for (let pass = 0; pass < 2; pass++) {
    for (const key of Object.keys(GUESS) as Array<keyof ColumnMapping>) {
      if (out[key]) continue
      const pattern = GUESS[key][pass]
      if (!pattern) continue
      const hit = headers.find((h) => !taken.has(h) && pattern.test(h.trim()))
      if (hit) {
        out[key] = hit
        taken.add(hit)
      }
    }
  }
  return out
}

function pad(s: string | number) {
  return String(s).padStart(2, '0')
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
