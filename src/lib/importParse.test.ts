import { describe, expect, it } from 'vitest'
import {
  guessMapping,
  mapRows,
  parseAmountCell,
  parseDateCell,
  parseTypeCell,
  type ColumnMapping,
} from './importParse'

// Headers exactly as they appear in the user's Google Sheet
const SHEET_HEADERS = [
  'Name',
  'Tags',
  'Payment medium',
  'Date',
  'Payment Type',
  'Ammount dr',
  'Ammount cr',
  'Credit Card',
  'Month',
  'Date_1',
  'Year',
]

describe('parseDateCell', () => {
  it('parses d-MMM-yyyy (Google Sheets format)', () => {
    expect(parseDateCell('1-Jan-2023')).toBe('2023-01-01')
    expect(parseDateCell('17-Dec-2025')).toBe('2025-12-17')
    expect(parseDateCell('6 Feb 2024')).toBe('2024-02-06')
  })

  it('parses dd/mm/yyyy day-first (Indian convention)', () => {
    expect(parseDateCell('05/01/2024')).toBe('2024-01-05')
    expect(parseDateCell('31/12/23')).toBe('2023-12-31')
    expect(parseDateCell('7-3-2024')).toBe('2024-03-07')
  })

  it('parses ISO yyyy-mm-dd', () => {
    expect(parseDateCell('2024-06-01')).toBe('2024-06-01')
    expect(parseDateCell('2024/6/1')).toBe('2024-06-01')
  })

  it('parses Date objects and Excel serials', () => {
    expect(parseDateCell(new Date(2023, 0, 15))).toBe('2023-01-15')
    // 45000 days after 1899-12-30 = 2023-03-15
    expect(parseDateCell(45000)).toBe('2023-03-15')
  })

  it('rejects garbage', () => {
    expect(parseDateCell('')).toBeNull()
    expect(parseDateCell(null)).toBeNull()
    expect(parseDateCell('not a date')).toBeNull()
  })
})

describe('parseAmountCell', () => {
  it('handles Indian formatted amounts', () => {
    expect(parseAmountCell('1,29,476.00')).toBe(129476)
    expect(parseAmountCell('₹ 1,299.50')).toBe(1299.5)
    expect(parseAmountCell('-3,138.00')).toBe(-3138)
  })

  it('handles numbers and rejects garbage', () => {
    expect(parseAmountCell(80)).toBe(80)
    expect(parseAmountCell('')).toBeNull()
    expect(parseAmountCell('abc')).toBeNull()
  })
})

describe('parseTypeCell', () => {
  it('maps the sheet vocabulary', () => {
    expect(parseTypeCell('debited')).toBe('expense')
    expect(parseTypeCell('credited')).toBe('income')
    expect(parseTypeCell('lent')).toBe('lend')
    expect(parseTypeCell('borrowed')).toBe('borrow')
    expect(parseTypeCell('got back')).toBe('repay_in')
    expect(parseTypeCell('paid back')).toBe('repay_out')
    expect(parseTypeCell('')).toBeNull()
    expect(parseTypeCell('unknown thing')).toBeNull()
  })
})

describe('guessMapping', () => {
  it("maps the user's real sheet headers correctly", () => {
    expect(guessMapping(SHEET_HEADERS)).toEqual({
      date: 'Date',
      amount: 'Ammount dr',
      creditCard: 'Credit Card',
      category: 'Tags',
      method: 'Payment medium',
      note: 'Name',
      type: 'Payment Type',
    })
  })

  it('maps a generic export', () => {
    const guess = guessMapping(['Date', 'Amount', 'Category', 'Mode', 'Note'])
    expect(guess.date).toBe('Date')
    expect(guess.amount).toBe('Amount')
    expect(guess.category).toBe('Category')
    expect(guess.method).toBe('Mode')
    expect(guess.note).toBe('Note')
  })

  it('never assigns one header to two fields', () => {
    const guess = guessMapping(['Payment Type', 'Ammount dr'])
    const values = Object.values(guess)
    expect(new Set(values).size).toBe(values.length)
  })
})

describe('mapRows', () => {
  const mapping: ColumnMapping = {
    date: 'Date',
    amount: 'Ammount dr',
    category: 'Tags',
    method: 'Payment medium',
    note: 'Name',
    type: 'Payment Type',
    creditCard: 'Credit Card',
  }

  const row = (over: Record<string, unknown>) => ({
    Name: 'thing',
    Tags: 'home',
    'Payment medium': 'gpay',
    Date: '1-Jan-2023',
    'Payment Type': 'debited',
    'Ammount dr': '100.00',
    'Ammount cr': '0.00',
    'Credit Card': '0.00',
    ...over,
  })

  it('maps a plain expense', () => {
    const [r] = mapRows([row({})], mapping, true)
    expect(r.error).toBeNull()
    expect(r.tx).toMatchObject({
      occurred_on: '2023-01-01',
      amount: 100,
      type: 'expense',
      categoryName: 'home',
      methodName: 'gpay',
      note: 'thing',
    })
  })

  it('maps credited rows with negative dr as positive income', () => {
    const [r] = mapRows(
      [row({ 'Payment Type': 'credited', 'Ammount dr': '-129,476.00' })],
      mapping,
      true,
    )
    expect(r.error).toBeNull()
    expect(r.tx.type).toBe('income')
    expect(r.tx.amount).toBe(129476)
  })

  it('falls back to the credit-card column and forces the method', () => {
    const [r] = mapRows(
      [row({ 'Ammount dr': '0.00', 'Credit Card': '1,299.00', 'Payment medium': '' })],
      mapping,
      true,
    )
    expect(r.error).toBeNull()
    expect(r.tx.amount).toBe(1299)
    expect(r.tx.methodName).toBe('Credit Card')
  })

  it('flags unreadable dates and zero amounts, with sheet row numbers', () => {
    const rows = mapRows(
      [row({ Date: '??' }), row({ 'Ammount dr': '0.00' })],
      mapping,
      true,
    )
    expect(rows[0].error).toBe('Unreadable date')
    expect(rows[0].rowIndex).toBe(2) // header is row 1 in the sheet
    expect(rows[1].error).toBe('Missing/zero amount')
    expect(rows[1].rowIndex).toBe(3)
  })

  it('requires a person for lend/borrow types', () => {
    const personMapping = { ...mapping, person: 'Person' }
    const [bad] = mapRows([row({ 'Payment Type': 'lent' })], personMapping, true)
    expect(bad.error).toMatch(/needs a person/)
    const [good] = mapRows([row({ 'Payment Type': 'lent', Person: 'Rahul' })], personMapping, true)
    expect(good.error).toBeNull()
    expect(good.tx.type).toBe('lend')
    expect(good.tx.personName).toBe('Rahul')
  })

  it('treats unmarked negative amounts per the toggle', () => {
    const noType = { ...mapping, type: undefined }
    const [asIncome] = mapRows([row({ 'Ammount dr': '-500' })], noType, true)
    expect(asIncome.tx.type).toBe('income')
    expect(asIncome.tx.amount).toBe(500)
    const [asExpense] = mapRows([row({ 'Ammount dr': '-500' })], noType, false)
    expect(asExpense.tx.type).toBe('expense')
    expect(asExpense.tx.amount).toBe(500)
  })
})
