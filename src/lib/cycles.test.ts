import { describe, expect, it } from 'vitest'
import { clampDay, daysUntil, nextDueDate, salaryCycleRange } from './cycles'

describe('salaryCycleRange', () => {
  it('starts the cycle on salary day when today is past it', () => {
    // salary on the 6th, today the 12th July -> cycle 6 Jul .. 5 Aug
    expect(salaryCycleRange(6, new Date(2026, 6, 12))).toEqual({ from: '2026-07-06', to: '2026-08-05' })
  })

  it('uses the previous month when today is before salary day', () => {
    // today 3rd July, salary on the 6th -> still in the June cycle
    expect(salaryCycleRange(6, new Date(2026, 6, 3))).toEqual({ from: '2026-06-06', to: '2026-07-05' })
  })

  it('offset -1 returns the previous cycle', () => {
    expect(salaryCycleRange(6, new Date(2026, 6, 12), -1)).toEqual({ from: '2026-06-06', to: '2026-07-05' })
  })

  it('crosses year boundaries', () => {
    expect(salaryCycleRange(25, new Date(2026, 0, 2))).toEqual({ from: '2025-12-25', to: '2026-01-24' })
  })

  it('salary day 1 gives calendar months', () => {
    expect(salaryCycleRange(1, new Date(2026, 6, 12))).toEqual({ from: '2026-07-01', to: '2026-07-31' })
  })

  it('clamps day 31 in short months', () => {
    // salary day 31, today 15 Feb -> cycle started 31 Jan, ends 27 Feb (day before Feb's clamped 28th)
    expect(salaryCycleRange(31, new Date(2026, 1, 15))).toEqual({ from: '2026-01-31', to: '2026-02-27' })
  })
})

describe('nextDueDate', () => {
  it('same month when due day is ahead', () => {
    expect(nextDueDate(15, new Date(2026, 6, 12))).toBe('2026-07-15')
  })
  it('today counts as due today', () => {
    expect(nextDueDate(12, new Date(2026, 6, 12))).toBe('2026-07-12')
  })
  it('rolls to next month when passed', () => {
    expect(nextDueDate(5, new Date(2026, 6, 12))).toBe('2026-08-05')
  })
  it('rolls across year end', () => {
    expect(nextDueDate(5, new Date(2026, 11, 20))).toBe('2027-01-05')
  })
  it('clamps day 31 in short months', () => {
    expect(nextDueDate(31, new Date(2026, 1, 10))).toBe('2026-02-28')
  })
})

describe('daysUntil / clampDay', () => {
  it('counts whole days', () => {
    const today = new Date(2026, 6, 12)
    expect(daysUntil('2026-07-12', today)).toBe(0)
    expect(daysUntil('2026-07-15', today)).toBe(3)
    expect(daysUntil('2026-08-05', today)).toBe(24)
  })
  it('clamps to month length', () => {
    expect(clampDay(2026, 1, 31)).toBe(28)
    expect(clampDay(2024, 1, 31)).toBe(29) // leap year
    expect(clampDay(2026, 0, 31)).toBe(31)
  })
})
