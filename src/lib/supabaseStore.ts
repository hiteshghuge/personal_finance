import { getSupabase } from './supabase'
import type { DataStore } from './store'
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
    // Filtering by tag needs an inner join so only matching transactions survive;
    // otherwise a left join brings every transaction with all its tags.
    const tagJoin = filter.categoryId ? 'transaction_tags!inner(category_id)' : 'transaction_tags(category_id)'
    let q = this.db.from('transactions').select(`*, ${tagJoin}`, { count: 'exact' })
    if (filter.categoryId) q = q.eq('transaction_tags.category_id', filter.categoryId)
    if (filter.from) q = q.gte('occurred_on', filter.from)
    if (filter.to) q = q.lte('occurred_on', filter.to)
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
    let rows = (data ?? []).map(normalizeTx)
    if (filter.categoryId) {
      // The inner join only returned the matching tag row; refetch full tag
      // lists for the page so chips render completely.
      rows = await this.attachAllTags(rows)
    }
    return { rows, total: count ?? 0 }
  }

  private async attachAllTags(rows: Transaction[]): Promise<Transaction[]> {
    if (rows.length === 0) return rows
    const ids = rows.map((r) => r.id)
    const { data, error } = await this.db
      .from('transaction_tags')
      .select('transaction_id, category_id')
      .in('transaction_id', ids)
    throwIf(error)
    const byTx = new Map<string, string[]>()
    for (const row of data ?? []) {
      const list = byTx.get(row.transaction_id) ?? []
      list.push(row.category_id)
      byTx.set(row.transaction_id, list)
    }
    return rows.map((r) => ({ ...r, tag_ids: byTx.get(r.id) ?? [] }))
  }

  async createTransaction(tx: NewTransaction): Promise<Transaction> {
    const { tag_ids, ...row } = tx
    const { data, error } = await this.db.from('transactions').insert(row).select().single()
    throwIf(error)
    await this.setTags(data.id, tag_ids)
    return { ...normalizeTx(data), tag_ids }
  }

  async updateTransaction(id: string, patch: Partial<NewTransaction>): Promise<void> {
    const { tag_ids, ...row } = patch
    if (Object.keys(row).length > 0) {
      const { error } = await this.db.from('transactions').update(row).eq('id', id)
      throwIf(error)
    }
    if (tag_ids) {
      const { error } = await this.db.from('transaction_tags').delete().eq('transaction_id', id)
      throwIf(error)
      await this.setTags(id, tag_ids)
    }
  }

  private async setTags(transactionId: string, tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return
    const { error } = await this.db
      .from('transaction_tags')
      .insert(tagIds.map((category_id) => ({ transaction_id: transactionId, category_id })))
    throwIf(error)
  }

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await this.db.from('transactions').delete().eq('id', id)
    throwIf(error)
  }

  async bulkInsertTransactions(txs: NewTransaction[]): Promise<number> {
    let inserted = 0
    for (let i = 0; i < txs.length; i += 500) {
      const chunk = txs.slice(i, i + 500)
      const { data, error } = await this.db
        .from('transactions')
        .insert(chunk.map(({ tag_ids: _tags, ...row }) => row))
        .select('id')
      throwIf(error)
      const joins = (data ?? []).flatMap((row, idx) =>
        chunk[idx].tag_ids.map((category_id) => ({ transaction_id: row.id, category_id })),
      )
      if (joins.length > 0) {
        const { error: tagError } = await this.db.from('transaction_tags').insert(joins)
        throwIf(tagError)
      }
      inserted += data?.length ?? chunk.length
    }
    return inserted
  }

  async personBalances(): Promise<PersonBalance[]> {
    const { data, error } = await this.db.from('person_balances').select('person_id, name, balance')
    throwIf(error)
    return (data ?? []).map((r) => ({ ...r, balance: Number(r.balance) }))
  }

  async getSettings(): Promise<UserSettings> {
    const { data, error } = await this.db.from('user_settings').select('salary_day, salary_bank').maybeSingle()
    throwIf(error)
    return { salary_day: data?.salary_day ?? null, salary_bank: data?.salary_bank ?? null }
  }

  async updateSettings(patch: Partial<UserSettings>): Promise<void> {
    const { data: session } = await this.db.auth.getSession()
    const userId = session.session?.user.id
    const { error } = await this.db
      .from('user_settings')
      .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() })
    throwIf(error)
  }

  async listCreditCards(): Promise<CreditCard[]> {
    const { data, error } = await this.db.from('credit_cards').select('*').order('name')
    throwIf(error)
    return data ?? []
  }

  async createCreditCard(card: Omit<CreditCard, 'id'>): Promise<CreditCard> {
    const { data, error } = await this.db.from('credit_cards').insert(card).select().single()
    throwIf(error)
    return data
  }

  async updateCreditCard(id: string, patch: Partial<Omit<CreditCard, 'id'>>): Promise<void> {
    const { error } = await this.db.from('credit_cards').update(patch).eq('id', id)
    throwIf(error)
  }

  async deleteCreditCard(id: string): Promise<void> {
    const { error } = await this.db.from('credit_cards').delete().eq('id', id)
    throwIf(error)
  }
}

function normalizeTx(row: Record<string, unknown>): Transaction {
  const joins = (row.transaction_tags ?? []) as Array<{ category_id: string }>
  const { transaction_tags: _joins, ...rest } = row
  return {
    ...(rest as unknown as Transaction),
    amount: Number(row.amount),
    tag_ids: joins.map((j) => j.category_id),
  }
}
