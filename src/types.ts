export type TxType = 'expense' | 'income' | 'lend' | 'borrow' | 'repay_out' | 'repay_in'
export type Direction = 'out' | 'in'

export const TX_TYPE_LABELS: Record<TxType, string> = {
  expense: 'Expense',
  income: 'Income',
  lend: 'Lent to person',
  borrow: 'Borrowed from person',
  repay_out: 'I repaid them',
  repay_in: 'They repaid me',
}

export const PERSON_TX_TYPES: TxType[] = ['lend', 'borrow', 'repay_out', 'repay_in']

export function directionOf(type: TxType): Direction {
  return type === 'expense' || type === 'lend' || type === 'repay_out' ? 'out' : 'in'
}

export interface PaymentMethod {
  id: string
  name: string
  kind: 'card' | 'upi' | 'cash' | 'bank' | 'other'
  is_active: boolean
}

export interface Category {
  id: string
  name: string
  color: string
}

export interface Person {
  id: string
  name: string
  note: string | null
}

export interface Transaction {
  id: string
  occurred_on: string // YYYY-MM-DD
  amount: number
  type: TxType
  direction: Direction
  payment_method_id: string | null
  category_id: string | null
  person_id: string | null
  note: string | null
  created_at: string
}

export type NewTransaction = Omit<Transaction, 'id' | 'direction' | 'created_at'>

export interface TxFilter {
  from?: string
  to?: string
  categoryId?: string
  methodId?: string
  personId?: string
  type?: TxType
  search?: string
  limit?: number
  offset?: number
}

export interface PersonBalance {
  person_id: string
  name: string
  /** positive: they owe me; negative: I owe them */
  balance: number
}
