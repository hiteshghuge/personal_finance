import { getSupabase } from './supabase'
import type { DataStore } from './store'
import type {
  Category,
  NewTransaction,
  PaymentMethod,
  Person,
  PersonBalance,
  Transaction,
  TxFilter,
} from '../types'

function throwIf(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

export class SupabaseStore implements DataStore {
  private db = getSupabase()

  async listPaymentMethods(): Promise<PaymentMethod[]> {
    const { data, error } = await this.db.from('payment_methods').select('*').order('created_at')
    throwIf(error)
    return data ?? []
  }

  async createPaymentMethod(name: string, kind: PaymentMethod['kind']): Promise<PaymentMethod> {
    const { data, error } = await this.db.from('payment_methods').insert({ name, kind }).select().single()
    throwIf(error)
    return data
  }

  async updatePaymentMethod(id: string, patch: Partial<PaymentMethod>): Promise<void> {
    const { error } = await this.db.from('payment_methods').update(patch).eq('id', id)
    throwIf(error)
  }

  async deletePaymentMethod(id: string): Promise<void> {
    const { error } = await this.db.from('payment_methods').delete().eq('id', id)
    throwIf(error)
  }

  async listCategories(): Promise<Category[]> {
    const { data, error } = await this.db.from('categories').select('*').order('name')
    throwIf(error)
    return data ?? []
  }

  async createCategory(name: string, color = '#64748b'): Promise<Category> {
    const { data, error } = await this.db.from('categories').insert({ name, color }).select().single()
    throwIf(error)
    return data
  }

  async updateCategory(id: string, patch: Partial<Category>): Promise<void> {
    const { error } = await this.db.from('categories').update(patch).eq('id', id)
    throwIf(error)
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await this.db.from('categories').delete().eq('id', id)
    throwIf(error)
  }

  async listPeople(): Promise<Person[]> {
    const { data, error } = await this.db.from('people').select('*').order('name')
    throwIf(error)
    return data ?? []
  }

  async createPerson(name: string, note?: string): Promise<Person> {
    const { data, error } = await this.db.from('people').insert({ name, note }).select().single()
    throwIf(error)
    return data
  }

  async updatePerson(id: string, patch: Partial<Person>): Promise<void> {
    const { error } = await this.db.from('people').update(patch).eq('id', id)
    throwIf(error)
  }

  async deletePerson(id: string): Promise<void> {
    const { error } = await this.db.from('people').delete().eq('id', id)
    throwIf(error)
  }

  async listTransactions(filter: TxFilter): Promise<{ rows: Transaction[]; total: number }> {
    let q = this.db.from('transactions').select('*', { count: 'exact' })
    if (filter.from) q = q.gte('occurred_on', filter.from)
    if (filter.to) q = q.lte('occurred_on', filter.to)
    if (filter.categoryId) q = q.eq('category_id', filter.categoryId)
    if (filter.methodId) q = q.eq('payment_method_id', filter.methodId)
    if (filter.personId) q = q.eq('person_id', filter.personId)
    if (filter.type) q = q.eq('type', filter.type)
    if (filter.search) q = q.ilike('note', `%${filter.search}%`)
    q = q.order('occurred_on', { ascending: false }).order('created_at', { ascending: false })
    const limit = filter.limit ?? 50
    const offset = filter.offset ?? 0
    q = q.range(offset, offset + limit - 1)
    const { data, error, count } = await q
    throwIf(error)
    return { rows: (data ?? []).map(normalizeTx), total: count ?? 0 }
  }

  async createTransaction(tx: NewTransaction): Promise<Transaction> {
    const { data, error } = await this.db.from('transactions').insert(tx).select().single()
    throwIf(error)
    return normalizeTx(data)
  }

  async updateTransaction(id: string, patch: Partial<NewTransaction>): Promise<void> {
    const { error } = await this.db.from('transactions').update(patch).eq('id', id)
    throwIf(error)
  }

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await this.db.from('transactions').delete().eq('id', id)
    throwIf(error)
  }

  async bulkInsertTransactions(txs: NewTransaction[]): Promise<number> {
    // Insert in chunks to stay under request size limits.
    let inserted = 0
    for (let i = 0; i < txs.length; i += 500) {
      const chunk = txs.slice(i, i + 500)
      const { error, count } = await this.db.from('transactions').insert(chunk, { count: 'exact' })
      throwIf(error)
      inserted += count ?? chunk.length
    }
    return inserted
  }

  async personBalances(): Promise<PersonBalance[]> {
    const { data, error } = await this.db.from('person_balances').select('person_id, name, balance')
    throwIf(error)
    return (data ?? []).map((r) => ({ ...r, balance: Number(r.balance) }))
  }
}

function normalizeTx(row: Record<string, unknown>): Transaction {
  return { ...(row as unknown as Transaction), amount: Number(row.amount) }
}
