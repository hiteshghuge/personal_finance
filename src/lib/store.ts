import type {
  Category,
  NewTransaction,
  PaymentMethod,
  Person,
  PersonBalance,
  Transaction,
  TxFilter,
} from '../types'

export interface DataStore {
  listPaymentMethods(): Promise<PaymentMethod[]>
  createPaymentMethod(name: string, kind: PaymentMethod['kind']): Promise<PaymentMethod>
  updatePaymentMethod(id: string, patch: Partial<Pick<PaymentMethod, 'name' | 'kind' | 'is_active'>>): Promise<void>
  deletePaymentMethod(id: string): Promise<void>

  listCategories(): Promise<Category[]>
  createCategory(name: string, color?: string): Promise<Category>
  updateCategory(id: string, patch: Partial<Pick<Category, 'name' | 'color'>>): Promise<void>
  deleteCategory(id: string): Promise<void>

  listPeople(): Promise<Person[]>
  createPerson(name: string, note?: string): Promise<Person>
  updatePerson(id: string, patch: Partial<Pick<Person, 'name' | 'note'>>): Promise<void>
  deletePerson(id: string): Promise<void>

  listTransactions(filter: TxFilter): Promise<{ rows: Transaction[]; total: number }>
  createTransaction(tx: NewTransaction): Promise<Transaction>
  updateTransaction(id: string, patch: Partial<NewTransaction>): Promise<void>
  deleteTransaction(id: string): Promise<void>
  bulkInsertTransactions(txs: NewTransaction[]): Promise<number>

  personBalances(): Promise<PersonBalance[]>
}

export const IS_DEMO = import.meta.env.VITE_DEMO === '1'

let storePromise: Promise<DataStore> | null = null

export function getStore(): Promise<DataStore> {
  if (!storePromise) {
    storePromise = IS_DEMO
      ? import('./demoStore').then((m) => new m.DemoStore())
      : import('./supabaseStore').then((m) => new m.SupabaseStore())
  }
  return storePromise
}
