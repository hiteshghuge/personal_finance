import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useData } from '../lib/useData'
import { formatDate, formatINR, formatMonth, lastMonths, todayISO } from '../lib/format'
import { salaryCycleRange, type DateRange } from '../lib/cycles'
import type { Transaction } from '../types'

interface PeriodDef {
  key: string
  label: string
  range: DateRange
  /** same-length window before this one, for the delta; null = no comparison */
  prev: DateRange | null
}

const INK = { primary: '#f1f5f9', secondary: '#94a3b8', muted: '#64748b', grid: '#1e293b' }
const SERIES_1 = '#3987e5'

function monthRange(months: string[]): DateRange {
  const [y, m] = months[months.length - 1].split('-').map(Number)
  return { from: `${months[0]}-01`, to: `${months[months.length - 1]}-${new Date(y, m, 0).getDate()}` }
}

export default function Analytics() {
  const [period, setPeriod] = useState<string>('this')
  const months12 = useMemo(() => lastMonths(12), [])

  // One fetch covers every widget: all transactions in the last 12 months.
  const { data } = useData(
    (s) => s.listTransactions({ from: `${months12[0]}-01`, to: todayISO(), limit: 10000 }),
    [],
  )
  const { data: categories } = useData((s) => s.listCategories())
  const { data: methods } = useData((s) => s.listPaymentMethods())
  const { data: balances } = useData((s) => s.personBalances())
  const { data: settings } = useData((s) => s.getSettings())

  const txs = useMemo(() => data?.rows ?? [], [data])

  const periods = useMemo<PeriodDef[]>(() => {
    const defs: PeriodDef[] = []
    const salaryDay = settings?.salary_day
    if (salaryDay) {
      // Salary-cycle views come first when configured — they answer
      // "how much of this salary have I spent" directly.
      const now = new Date()
      defs.push(
        { key: 'cycle', label: 'This cycle', range: salaryCycleRange(salaryDay, now, 0), prev: salaryCycleRange(salaryDay, now, -1) },
        { key: 'lastcycle', label: 'Last cycle', range: salaryCycleRange(salaryDay, now, -1), prev: salaryCycleRange(salaryDay, now, -2) },
      )
    }
    defs.push(
      { key: 'this', label: 'This month', range: monthRange(months12.slice(-1)), prev: monthRange(months12.slice(-2, -1)) },
      { key: 'last', label: 'Last month', range: monthRange(months12.slice(-2, -1)), prev: monthRange(months12.slice(-3, -2)) },
      { key: '3m', label: '3 months', range: monthRange(months12.slice(-3)), prev: monthRange(months12.slice(-6, -3)) },
      { key: '12m', label: '12 months', range: monthRange(months12), prev: null },
    )
    return defs
  }, [months12, settings])

  const active = periods.find((p) => p.key === period) ?? periods[0]

  const inPeriod = useMemo(
    () => txs.filter((t) => t.occurred_on >= active.range.from && t.occurred_on <= active.range.to),
    [txs, active],
  )
  const expenses = useMemo(() => inPeriod.filter((t) => t.type === 'expense'), [inPeriod])

  // Headline: period spend + delta vs the same-length window before it
  const spend = expenses.reduce((s, t) => s + t.amount, 0)
  const prevSpend = useMemo(() => {
    if (!active.prev) return null
    const { from, to } = active.prev
    return txs
      .filter((t) => t.type === 'expense' && t.occurred_on >= from && t.occurred_on <= to)
      .reduce((s, t) => s + t.amount, 0)
  }, [txs, active])
  const delta = prevSpend != null && prevSpend > 0 ? ((spend - prevSpend) / prevSpend) * 100 : null

  const trend = useMemo(
    () =>
      months12.map((ym) => ({
        ym,
        label: formatMonth(ym).split(' ')[0],
        spend: sumExpenses(txs, [ym]),
      })),
    [txs, months12],
  )

  const byCategory = useMemo(() => {
    // A transaction counts its full amount under each of its tags,
    // so a multi-tagged spend shows in every tag it carries.
    const map = new Map<string | null, number>()
    for (const t of expenses) {
      if (t.tag_ids.length === 0) {
        map.set(null, (map.get(null) ?? 0) + t.amount)
      } else {
        for (const id of t.tag_ids) map.set(id, (map.get(id) ?? 0) + t.amount)
      }
    }
    const catMap = new Map((categories ?? []).map((c) => [c.id, c]))
    return [...map.entries()]
      .map(([id, total]) => ({
        name: id ? (catMap.get(id)?.name ?? 'Unknown') : 'Untagged',
        color: id ? (catMap.get(id)?.color ?? '#64748b') : '#64748b',
        total,
      }))
      .sort((a, b) => b.total - a.total)
  }, [expenses, categories])

  const byMethod = useMemo(() => {
    const map = new Map<string | null, number>()
    // Every outgoing rupee counts here (expense + lend + repay_out)
    for (const t of inPeriod.filter((x) => x.direction === 'out'))
      map.set(t.payment_method_id, (map.get(t.payment_method_id) ?? 0) + t.amount)
    const mMap = new Map((methods ?? []).map((m) => [m.id, m]))
    return [...map.entries()]
      .map(([id, total]) => ({ name: id ? (mMap.get(id)?.name ?? 'Unknown') : 'Unknown', total }))
      .sort((a, b) => b.total - a.total)
  }, [inPeriod, methods])
  const maxMethod = byMethod[0]?.total ?? 1

  const owed = (balances ?? []).filter((b) => b.balance !== 0).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Analytics</h1>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${
              active.key === p.key ? 'border-sky-500 bg-sky-500/15 text-sky-300' : 'border-slate-700 bg-slate-800 text-slate-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Headline stat */}
      <div className="mb-4 rounded-xl border border-slate-800 bg-slate-800/50 p-4">
        <p className="text-xs text-slate-400">Spend · {active.label.toLowerCase()}</p>
        <p className="text-3xl font-bold">{formatINR(spend)}</p>
        <p className="text-[11px] text-slate-500">
          {formatDate(active.range.from)} – {formatDate(active.range.to)}
        </p>
        {delta != null && (
          <p className={`mt-1 text-xs ${delta > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}% vs previous{' '}
            {active.key.includes('cycle') ? 'cycle' : active.key === 'this' || active.key === 'last' ? 'month' : 'period'}
          </p>
        )}
      </div>

      {/* 12-month trend */}
      <Card title="Monthly spend, last 12 months">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={trend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fill: INK.muted, fontSize: 10 }} axisLine={{ stroke: INK.grid }} tickLine={false} interval={1} />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: '#ffffff10' }}
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-lg">
                    <p className="text-slate-400">{formatMonth((payload[0].payload as { ym: string }).ym)}</p>
                    <p className="font-semibold text-slate-100">{formatINR(payload[0].value as number)}</p>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="spend" fill={SERIES_1} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Category breakdown */}
      <Card title="Where it went">
        {byCategory.length === 0 ? (
          <Empty />
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="total"
                  nameKey="name"
                  innerRadius={36}
                  outerRadius={56}
                  paddingAngle={2}
                  isAnimationActive={false}
                  stroke="#0f172a"
                  strokeWidth={2}
                >
                  {byCategory.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.[0] ? (
                      <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-lg">
                        <p className="font-semibold text-slate-100">{payload[0].name}</p>
                        <p className="text-slate-300">{formatINR(payload[0].value as number)}</p>
                      </div>
                    ) : null
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="min-w-0 flex-1 space-y-1.5">
              {byCategory.slice(0, 6).map((c) => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                  <span className="min-w-0 flex-1 truncate text-slate-300">{c.name}</span>
                  <span className="font-semibold text-slate-100">{formatINR(c.total)}</span>
                  <span className="w-9 text-right text-slate-500">{spend > 0 ? Math.round((c.total / spend) * 100) : 0}%</span>
                </div>
              ))}
              {byCategory.length > 6 && (
                <p className="text-[11px] text-slate-500">+ {byCategory.length - 6} more in History filters</p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Payment method split */}
      <Card title="Paid via">
        {byMethod.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-2">
            {byMethod.map((m) => (
              <div key={m.name} className="flex items-center gap-2 text-xs">
                <span className="w-20 shrink-0 truncate text-slate-300">{m.name}</span>
                <div className="h-3.5 flex-1 overflow-hidden rounded-sm bg-slate-800">
                  <div className="h-full rounded-sm" style={{ width: `${(m.total / maxMethod) * 100}%`, background: SERIES_1 }} />
                </div>
                <span className="w-20 text-right font-semibold text-slate-100">{formatINR(m.total)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Borrow / lend */}
      <Card title="Borrow / lend">
        {owed.length === 0 ? (
          <p className="py-2 text-xs text-slate-500">All settled — nobody owes anybody.</p>
        ) : (
          <div className="space-y-1">
            {owed.map((b) => (
              <Link key={b.person_id} to={`/people/${b.person_id}`} className="flex items-center justify-between rounded-lg px-1 py-1.5 text-sm hover:bg-slate-800/60">
                <span className="text-slate-300">{b.name}</span>
                <span className={`font-semibold ${b.balance > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {b.balance > 0 ? `owes you ${formatINR(b.balance)}` : `you owe ${formatINR(-b.balance)}`}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function sumExpenses(txs: Transaction[], months: string[]): number {
  return txs
    .filter((t) => t.type === 'expense' && months.includes(t.occurred_on.slice(0, 7)))
    .reduce((s, t) => s + t.amount, 0)
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-xl border border-slate-800 bg-slate-800/50 p-4">
      <p className="mb-3 text-xs font-medium tracking-wide text-slate-400 uppercase">{title}</p>
      {children}
    </div>
  )
}

function Empty() {
  return <p className="py-2 text-xs text-slate-500">No data for this period.</p>
}
