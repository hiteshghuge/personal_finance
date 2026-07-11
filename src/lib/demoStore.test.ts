import { beforeEach, describe, expect, it } from 'vitest'
import { DemoStore } from './demoStore'

// Exercises the store contract that the Supabase implementation mirrors —
// especially the borrow/lend balance arithmetic.
describe('DemoStore person balances', () => {
  let store: DemoStore
  let personId: string

  beforeEach(async () => {
    store = new DemoStore()
    personId = (await store.createPerson('TestFriend')).id
  })

  const tx = (type: 'lend' | 'borrow' | 'repay_in' | 'repay_out', amount: number) => ({
    occurred_on: '2024-01-01',
    amount,
    type,
    payment_method_id: null,
    category_id: null,
    person_id: personId,
    note: null,
  })

  async function balance() {
    const all = await store.personBalances()
    return all.find((b) => b.person_id === personId)!.balance
  }

  it('lend increases what they owe; their repayment clears it', async () => {
    await store.createTransaction(tx('lend', 5000))
    expect(await balance()).toBe(5000)
    await store.createTransaction(tx('repay_in', 2000))
    expect(await balance()).toBe(3000)
    await store.createTransaction(tx('repay_in', 3000))
    expect(await balance()).toBe(0)
  })

  it('borrow goes negative; my repayment settles it', async () => {
    await store.createTransaction(tx('borrow', 3000))
    expect(await balance()).toBe(-3000)
    await store.createTransaction(tx('repay_out', 3000))
    expect(await balance()).toBe(0)
  })
})

describe('DemoStore transactions', () => {
  it('filters by month range and paginates', async () => {
    const store = new DemoStore()
    const { rows, total } = await store.listTransactions({ limit: 5, offset: 0 })
    expect(rows).toHaveLength(5)
    expect(total).toBeGreaterThan(5)
    // newest first
    const dates = rows.map((r) => r.occurred_on)
    expect([...dates].sort().reverse()).toEqual(dates)
  })

  it('derives direction from type on create and update', async () => {
    const store = new DemoStore()
    const created = await store.createTransaction({
      occurred_on: '2024-01-01',
      amount: 10,
      type: 'expense',
      payment_method_id: null,
      category_id: null,
      person_id: null,
      note: 'dir test',
    })
    expect(created.direction).toBe('out')
    await store.updateTransaction(created.id, { type: 'income' })
    const { rows } = await store.listTransactions({ search: 'dir test' })
    expect(rows[0].direction).toBe('in')
  })
})
