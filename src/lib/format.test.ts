import { describe, expect, it } from 'vitest'
import { formatINR, formatMonth, lastMonths, todayISO } from './format'
import { directionOf } from '../types'

describe('formatINR', () => {
  it('uses Indian digit grouping', () => {
    expect(formatINR(129476)).toBe('₹1,29,476')
    expect(formatINR(1000)).toBe('₹1,000')
  })

  it('keeps paise only when present', () => {
    expect(formatINR(99.5)).toBe('₹99.50')
    expect(formatINR(100)).toBe('₹100')
  })
})

describe('formatMonth', () => {
  it('renders YYYY-MM as a short label', () => {
    expect(formatMonth('2023-01')).toMatch(/Jan.*2023/)
  })
})

describe('lastMonths', () => {
  it('returns n months oldest-first ending with the current month', () => {
    const months = lastMonths(12)
    expect(months).toHaveLength(12)
    expect(months[11]).toBe(todayISO().slice(0, 7))
    expect(months.every((m) => /^\d{4}-\d{2}$/.test(m))).toBe(true)
    // strictly increasing
    expect([...months].sort()).toEqual(months)
  })
})

describe('directionOf', () => {
  it('classifies money-out vs money-in types', () => {
    expect(directionOf('expense')).toBe('out')
    expect(directionOf('lend')).toBe('out')
    expect(directionOf('repay_out')).toBe('out')
    expect(directionOf('income')).toBe('in')
    expect(directionOf('borrow')).toBe('in')
    expect(directionOf('repay_in')).toBe('in')
  })
})
