import type { DataStore } from './store'
import { directionOf } from '../types'
import type {
  Category,
  CreditCard,
  NewTransaction,
  PaymentMethod,
  Person,
  PersonBalance,
  Transaction,
  TxFilter,
  TxType,
  UserSettings,
} from '../types'

let seq = 0
const uid = () => `demo-${++seq}`

/** In-memory store used when VITE_DEMO=1 — lets the app run without Supabase. */
export class DemoStore implements DataStore {
  private methods: PaymentMethod[] = [
    { id: uid(), name: 'GPay', kind: 'upi', is_active: true },
    { id: uid(), name: 'PhonePe', kind: 'upi', is_active: true },
    { id: uid(), name: 'Debit Card', kind: 'card', is_active: true },
    { id: uid(), name: 'Credit Card', kind: 'card', is_active: true },
    { id: uid(), name: 'Cash', kind: 'cash', is_active: true },
  ]

  private categories: Category[] = [
    { id: uid(), name: 'Home', color: '#3987e5' },
    { id: uid(), name: 'Doctor', color: '#e66767' },
    { id: uid(), name: 'Hotel/FastFood', color: '#c98500' },
    { id: uid(), name: 'Groceries', color: '#199e70' },
    { id: uid(), name: 'Travel', color: '#9085e9' },
    { id: uid(), name: 'Shopping', color: '#d55181' },
    { id: uid(), name: 'Bills', color: '#d95926' },
    { id: uid(), name: 'Salary', color: '#008300' },
  ]

  private people: Person[] = [
    { id: uid(), name: 'Rahul', note: 'college friend' },
    { id: uid(), name: 'Amit', note: null },
    { id: uid(), name: 'Mom', note: null },
  ]

  private txs: Transaction[] = []

  constructor() {
    this.seedTransactions()
  }

  private seedTransactions() {
    const cat = (name: string) => this.categories.find((c) => c.name === name)!.id
    const method = (name: string) => this.methods.find((m) => m.name === name)!.id
    const person = (name: string) => this.people.find((p) => p.name === name)!.id
    const now = new Date()

    const monthlyTemplate: Array<[string, number, string, string, string]> = [
      ['05', 1200, 'Groceries', 'GPay', 'weekly veggies'],
      ['07', 450, 'Hotel/FastFood', 'PhonePe', 'dinner outside'],
      ['09', 2500, 'Home', 'Debit Card', 'electricity + gas'],
      ['12', 800, 'Doctor', 'Cash', 'clinic visit'],
      ['15', 3200, 'Shopping', 'Credit Card', 'clothes'],
      ['18', 600, 'Travel', 'GPay', 'cab + metro'],
      ['21', 1500, 'Groceries', 'PhonePe', 'monthly staples'],
      ['24', 350, 'Hotel/FastFood', 'GPay', 'fast food'],
      ['27', 999, 'Bills', 'Credit Card', 'mobile + ott'],
    ]

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      // salary
      this.push({
        occurred_on: `${ym}-01`,
        amount: 55000,
        type: 'income',
        payment_method_id: method('Debit Card'),
        tag_ids: [cat('Salary')],
        person_id: null,
        note: 'salary',
      })
      for (const [day, amount, c, m, note] of monthlyTemplate) {
        // Skip a few rows in the current month so it looks in-progress
        if (i === 0 && Number(day) > now.getDate()) continue
        this.push({
          occurred_on: `${ym}-${day}`,
          amount: amount + ((i * 37) % 200),
          type: 'expense',
          payment_method_id: method(m),
          tag_ids: [cat(c)],
          person_id: null,
          note,
        })
      }
    }

    // borrow/lend history
    const m3 = new Date(now.getFullYear(), now.getMonth() - 3, 10)
    const ym3 = `${m3.getFullYear()}-${String(m3.getMonth() + 1).padStart(2, '0')}`
    const m1 = new Date(now.getFullYear(), now.getMonth() - 1, 20)
    const ym1 = `${m1.getFullYear()}-${String(m1.getMonth() + 1).padStart(2, '0')}`
    this.push({ occurred_on: `${ym3}-10`, amount: 5000, type: 'lend', payment_method_id: method('GPay'), tag_ids: [], person_id: person('Rahul'), note: 'emergency' })
    this.push({ occurred_on: `${ym1}-20`, amount: 2000, type: 'repay_in', payment_method_id: method('GPay'), tag_ids: [], person_id: person('Rahul'), note: 'part repayment' })
    this.push({ occurred_on: `${ym3}-15`, amount: 3000, type: 'borrow', payment_method_id: method('Cash'), tag_ids: [], person_id: person('Mom'), note: 'for trip' })
    this.push({ occurred_on: `${ym1}-05`, amount: 3000, type: 'repay_out', payment_method_id: method('GPay'), tag_ids: [], person_id: person('Mom'), note: 'returned' })
    this.push({ occurred_on: `${ym1}-25`, amount: 1500, type: 'lend', payment_method_id: method('PhonePe'), tag_ids: [], person_id: person('Amit'), note: 'movie + dinner' })
  }

  private push(tx: Omit<NewTransaction, 'type'> & { type: TxType }) {
    this.txs.push({
      ...tx,
      id: uid(),
      direction: directionOf(tx.type),
      created_at: new Date().toISOString(),
    })
  }

  async listPaymentMethods() {
    return [...this.methods]
  }
  async createPaymentMethod(name: string, kind: PaymentMethod['kind']) {
    const pm: PaymentMethod = { id: uid(), name, kind, is_active: true }
    this.methods.push(pm)
    return pm
  }
  async updatePaymentMethod(id: string, patch: Partial<PaymentMethod>) {
    Object.assign(this.methods.find((m) => m.id === id) ?? {}, patch)
  }
  async deletePaymentMethod(id: string) {
    this.methods = this.methods.filter((m) => m.id !== id)
  }

  async listCategories() {
    return [...this.categories].sort((a, b) => a.name.localeCompare(b.name))
  }
  async createCategory(name: string, color = '#64748b') {
    const c: Category = { id: uid(), name, color }
    this.categories.push(c)
    return c
  }
  async updateCategory(id: string, patch: Partial<Category>) {
    Object.assign(this.categories.find((c) => c.id === id) ?? {}, patch)
  }
  async deleteCategory(id: string) {
    this.categories = this.categories.filter((c) => c.id !== id)
  }

  async listPeople() {
    return [...this.people].sort((a, b) => a.name.localeCompare(b.name))
  }
  async createPerson(name: string, note?: string) {
    const p: Person = { id: uid(), name, note: note ?? null }
    this.people.push(p)
    return p
  }
  async updatePerson(id: string, patch: Partial<Person>) {
    Object.assign(this.people.find((p) => p.id === id) ?? {}, patch)
  }
  async deletePerson(id: string) {
    this.people = this.people.filter((p) => p.id !== id)
  }

  async listTransactions(filter: TxFilter) {
    let rows = this.txs.filter((t) => {
      if (filter.from && t.occurred_on < filter.from) return false
      if (filter.to && t.occurred_on > filter.to) return false
      if (filter.categoryId && !t.tag_ids.includes(filter.categoryId)) return false
      if (filter.methodId && t.payment_method_id !== filter.methodId) return false
      if (filter.personId && t.person_id !== filter.personId) return false
      if (filter.type && t.type !== filter.type) return false
      if (filter.search && !(t.note ?? '').toLowerCase().includes(filter.search.toLowerCase())) return false
      return true
    })
    rows = rows.sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : a.occurred_on > b.occurred_on ? -1 : 0))
    const total = rows.length
    const offset = filter.offset ?? 0
    const limit = filter.limit ?? 50
    return { rows: rows.slice(offset, offset + limit), total }
  }

  async createTransaction(tx: NewTransaction) {
    const full: Transaction = {
      ...tx,
      id: uid(),
      direction: directionOf(tx.type),
      created_at: new Date().toISOString(),
    }
    this.txs.push(full)
    return full
  }

  async updateTransaction(id: string, patch: Partial<NewTransaction>) {
    const t = this.txs.find((x) => x.id === id)
    if (t) {
      Object.assign(t, patch)
      t.direction = directionOf(t.type)
    }
  }

  async deleteTransaction(id: string) {
    this.txs = this.txs.filter((t) => t.id !== id)
  }

  async deleteAllTransactions() {
    this.txs = []
  }

  async bulkInsertTransactions(txs: NewTransaction[]) {
    for (const tx of txs) await this.createTransaction(tx)
    return txs.length
  }

  private settings: UserSettings = { salary_day: 6, salary_bank: 'ICICI' }
  private creditCards: CreditCard[] = [
    { id: uid(), name: 'HDFC Millennia', statement_day: 16, due_day: 5 },
    { id: uid(), name: 'ICICI Amazon Pay', statement_day: 28, due_day: 15 },
  ]

  async getSettings() {
    return { ...this.settings }
  }
  async updateSettings(patch: Partial<UserSettings>) {
    Object.assign(this.settings, patch)
  }

  async listCreditCards() {
    return [...this.creditCards].sort((a, b) => a.name.localeCompare(b.name))
  }
  async createCreditCard(card: Omit<CreditCard, 'id'>) {
    const c: CreditCard = { id: uid(), ...card }
    this.creditCards.push(c)
    return c
  }
  async updateCreditCard(id: string, patch: Partial<Omit<CreditCard, 'id'>>) {
    Object.assign(this.creditCards.find((c) => c.id === id) ?? {}, patch)
  }
  async deleteCreditCard(id: string) {
    this.creditCards = this.creditCards.filter((c) => c.id !== id)
  }

  async personBalances(): Promise<PersonBalance[]> {
    return this.people.map((p) => {
      let balance = 0
      for (const t of this.txs) {
        if (t.person_id !== p.id) continue
        if (t.type === 'lend' || t.type === 'repay_out') balance += t.amount
        if (t.type === 'borrow' || t.type === 'repay_in') balance -= t.amount
      }
      return { person_id: p.id, name: p.name, balance }
    })
  }
}
