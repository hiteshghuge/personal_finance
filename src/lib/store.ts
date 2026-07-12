import type {
  Category,
  CreditCard,
  NewTransaction,
  PaymentMethod,
  Person,
  PersonBalance,
  Transaction,
  TxFilter,
  UserSettings,
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

  getSettings(): Promise<UserSettings>
  updateSettings(patch: Partial<UserSettings>): Promise<void>

  listCreditCards(): Promise<CreditCard[]>
  createCreditCard(card: Omit<CreditCard, 'id'>): Promise<CreditCard>
  updateCreditCard(id: string, patch: Partial<Omit<CreditCard, 'id'>>): Promise<void>
  deleteCreditCard(id: string): Promise<void>
}

export const IS_DEMO = import.meta.env.VITE_DEMO === '1'

// First-login starter data, so a fresh account is usable immediately.
// Colors come from the validated categorical palette (dataviz).
export const DEFAULT_TAGS: Array<[string, string]> = [
  ['home', '#3987e5'],
  ['lunch', '#e66767'],
  ['dinner', '#c98500'],
  ['hotel', '#199e70'],
  ['travel', '#9085e9'],
  ['fastfood', '#d55181'],
  ['petrol', '#d95926'],
  ['misc', '#008300'],
]

export const DEFAULT_METHODS: Array<[string, 'upi' | 'card' | 'cash' | 'bank' | 'other']> = [
  ['gpay', 'upi'],
  ['phonepe', 'upi'],
  ['imobile', 'bank'],
  ['Debit Card', 'card'],
  ['Credit Card', 'card'],
  ['cash', 'cash'],
]

async function ensureDefaults(store: DataStore): Promise<DataStore> {
  try {
    const [tags, methods] = await Promise.all([store.listCategories(), store.listPaymentMethods()])
    if (tags.length === 0) {
      for (const [name, color] of DEFAULT_TAGS) await store.createCategory(name, color)
    }
    if (methods.length === 0) {
      for (const [name, kind] of DEFAULT_METHODS) await store.createPaymentMethod(name, kind)
    }
  } catch {
    // Seeding is best-effort — a transient failure here shouldn't block the app.
  }
  return store
}

let storePromise: Promise<DataStore> | null = null

export function getStore(): Promise<DataStore> {
  if (!storePromise) {
    storePromise = IS_DEMO
      ? import('./demoStore').then((m) => new m.DemoStore())
      : import('./supabaseStore').then((m) => ensureDefaults(new m.SupabaseStore()))
  }
  return storePromise
}
