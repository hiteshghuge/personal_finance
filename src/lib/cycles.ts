/** Date math for salary cycles and credit-card billing cycles. */

function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate()
}

/** Day-of-month clamped to what the month actually has (31st in Feb -> 28/29). */
export function clampDay(year: number, month0: number, day: number): number {
  return Math.min(day, daysInMonth(year, month0))
}

function iso(year: number, month0: number, day: number): string {
  return `${year}-${String(month0 + 1).padStart(2, '0')}-${String(clampDay(year, month0, day)).padStart(2, '0')}`
}

export interface DateRange {
  from: string
  to: string
}

/**
 * The salary cycle containing `today`: starts on salary_day, ends the day
 * before the next salary_day. `offset` shifts whole cycles back (-1 = previous).
 */
export function salaryCycleRange(salaryDay: number, today: Date, offset = 0): DateRange {
  let year = today.getFullYear()
  let month0 = today.getMonth()
  if (today.getDate() < clampDay(year, month0, salaryDay)) month0 -= 1
  month0 += offset
  // normalize month overflow/underflow
  year += Math.floor(month0 / 12)
  month0 = ((month0 % 12) + 12) % 12
  const from = iso(year, month0, salaryDay)
  const endMonth0 = month0 + 1
  const endYear = year + Math.floor(endMonth0 / 12)
  const endM = endMonth0 % 12
  const endDay = clampDay(endYear, endM, salaryDay) - 1
  const to =
    endDay >= 1
      ? iso(endYear, endM, endDay)
      : iso(year, month0, daysInMonth(year, month0)) // salary day 1 -> cycle ends on month's last day
  return { from, to }
}

/**
 * Next payment due date for a credit card, on or after `today`.
 * due_day may fall in the month after the statement — we only need the next
 * occurrence of due_day from today's perspective.
 */
export function nextDueDate(dueDay: number, today: Date): string {
  const year = today.getFullYear()
  const month0 = today.getMonth()
  if (today.getDate() <= clampDay(year, month0, dueDay)) return iso(year, month0, dueDay)
  const nextM = month0 + 1
  return iso(year + Math.floor(nextM / 12), nextM % 12, dueDay)
}

/** Whole days from `today` to an ISO date (0 = today). */
export function daysUntil(isoDate: string, today: Date): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((target.getTime() - base.getTime()) / 86400000)
}

/** Current statement window for a card: last statement date -> next one. */
export function currentStatementWindow(statementDay: number, today: Date): DateRange {
  return salaryCycleRange(statementDay, today, 0)
}
