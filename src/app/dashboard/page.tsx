// Client component: dashboard mirroring homeexpense.patrickho.ca
// (monthly total, counts, monthly+ yearly bar charts; no weekly).
'use client';
import { useEffect, useState } from 'react';

type BudgetStatus = {
  id: string;
  kind: 'limit' | 'goal';
  period: 'monthly' | 'yearly';
  category: string | null;
  label: string;
  periodLabel: string;
  amount: number;
  actual: number;
  pct: number;
  over: boolean;
  behind: boolean;
};

type Reports = {
  range: { from: string; to: string };
  totals: { income: number; expense: number; net: number };
  byCategory: { categoryId: string; category: string; direction: 'income' | 'expense'; amount: number }[];
  byPeriod: { period: string; income: number; expense: number; net: number }[];
  budgets: { categoryId: string; category: string; monthlyLimit: number; spent: number; remaining: number; pct: number; period?: string; kind?: string }[];
  yearlyTrend: { month: number; income: number; expense: number }[];
  yearlyByCategory: { categoryId: string; category: string; direction: 'income' | 'expense'; amount: number }[];
  byExpenseType: { type: string; amount: number }[];
  yearlyByExpenseType: { type: string; amount: number }[];
  byMerchant: { merchant: string; amount: number }[];
  yearlyByMerchant: { merchant: string; amount: number }[];
  transactionCount: number;
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function money(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return sign + '$' + (Math.abs(cents) / 100).toFixed(2);
}

function Bar({ label, amount, max, colorClass, credit }: { label: string; amount: number; max: number; colorClass?: string; credit?: boolean }) {
  const pct = max > 0 ? Math.round((amount / max) * 100) : 0;
  const cls = 'bar-fill' + (colorClass ? ' ' + colorClass : '');
  // Net totals: a negative bar is a credit/income, a positive bar is net spend.
  const isCredit = credit ?? amount < 0;
  const sign = isCredit ? '\u25B2' : '\u25BC'; // ▲ / ▼
  const signColor = isCredit ? '#2563eb' : '#64748b';
  return (
    <div className="bar-row bar-tip" title={`${label}: ${money(amount)}`}>
      <span className="bar-label"><span style={{ color: signColor, marginRight: 4, fontWeight: 700 }}>{sign}</span>{label}</span>
      <span className="bar-track">
        <span className={cls} style={{ width: Math.max(pct, 2) + '%' }}>
          <span className="tip">{money(amount)}</span>
        </span>
      </span>
      <span className="bar-val">{money(amount)}</span>
    </div>
  );
}

export default function Reports() {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());
  const monthLabel = MONTHS[month];
  const [data, setData] = useState<Reports | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [budgetData, setBudgetData] = useState<BudgetStatus[]>([]);

  async function load(y = year, m = month) {
    setBusy(true); setError('');
    const from = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
    const to = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
    try {
      const res = await fetch(`/api/reports?from=${from}&to=${to}`);
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Failed to load'); setData(null); return; }
      setData(await res.json());
      // Budget status widget: same month as the report, same API as the Budgets page.
      const bm = `${y}-${String(m + 1).padStart(2, '0')}`;
      try {
        const b = await (await fetch(`/api/budgets?month=${bm}`)).json();
        setBudgetData(b.budgets ?? []);
      } catch { setBudgetData([]); }
    } catch { setError('Failed to load'); }
    finally { setBusy(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  function exportCsv() {
    if (!data) return;
    const mName = MONTHS[month];
    const rows = [];
    rows.push(`${mName} ${year},Total Expenses,${data.totals.expense}`);
    rows.push(`${mName} ${year},Total Income,${data.totals.income}`);
    rows.push(`Year ${year},Total Expenses,${data.yearlyTrend.reduce((s, m) => s + m.expense, 0)}`);
    rows.push(`Year ${year},Total Income,${data.yearlyTrend.reduce((s, m) => s + m.income, 0)}`);
    rows.push('');
    rows.push(`${mName} Breakdown by Category,,`);
    for (const c of data.byCategory) rows.push(`${c.category},${c.amount}`);
    rows.push('');
    rows.push(`${mName} Breakdown by Subcategory,,`);
    for (const t of data.byExpenseType) rows.push(`${t.type},${t.amount}`);
    rows.push('');
    rows.push(`Year ${year} Breakdown by Category,,`);
    for (const c of data.yearlyByCategory) rows.push(`${c.category},${c.amount}`);
    rows.push('');
    rows.push(`Year ${year} Breakdown by Subcategory,,`);
    for (const t of data.yearlyByExpenseType) rows.push(`${t.type},${t.amount}`);
    rows.push('');
    rows.push(`${mName} Income by Category,,`);
    for (const c of monthIncome) rows.push(`${c.category},${Math.abs(c.amount)}`);
    rows.push('');
    rows.push(`Year ${year} Income by Category,,`);
    for (const c of yearIncome) rows.push(`${c.category},${Math.abs(c.amount)}`);
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reports_${year}_${month + 1}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const maxCat = data ? Math.max(1, ...data.byCategory.map((c) => c.amount)) : 1;
  const maxYrCat = data ? Math.max(1, ...data.yearlyByCategory.map((c) => c.amount)) : 1;
  const maxTypeMonth = data ? Math.max(1, ...data.byExpenseType.map((t) => t.amount)) : 1;
  const maxTypeYear = data ? Math.max(1, ...data.yearlyByExpenseType.map((t) => t.amount)) : 1;
  const maxYrMonth = data ? Math.max(1, ...data.yearlyTrend.map((m) => m.expense)) : 1;
  const monthIncome = data ? data.byCategory.filter((c) => c.direction === 'income') : [];
  const yearIncome = data ? data.yearlyByCategory.filter((c) => c.direction === 'income') : [];
  const maxMonthIncome = data ? Math.max(1, ...monthIncome.map((c) => Math.abs(c.amount))) : 1;
  const maxYearIncome = data ? Math.max(1, ...yearIncome.map((c) => Math.abs(c.amount))) : 1;
  const maxMerch = data ? Math.max(1, ...data.byMerchant.map((m) => Math.abs(m.amount))) : 1;
  const maxYMerch = data ? Math.max(1, ...data.yearlyByMerchant.map((m) => Math.abs(m.amount))) : 1;
  const catCount = data ? new Set(data.byCategory.map((c) => c.categoryId)).size : 0;
  const txnCount = data ? data.byPeriod.reduce((n, p) => n + 1, 0) : 0;

  return (
    <div>
      <h2>Dashboard</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label>Year</label>
          <select value={year} onChange={(e) => { const y = Number(e.target.value); setYear(y); load(y, month); }}>
            {Array.from({ length: 10 }, (_, i) => now.getUTCFullYear() - 4 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Month</label>
          <select value={month} onChange={(e) => { const m = Number(e.target.value); setMonth(m); load(year, m); }}>
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
        </div>
        <button className="btn secondary" style={{ width: 'auto', marginTop: 24, padding: '10px 18px' }} onClick={exportCsv} disabled={!data}>Export CSV</button>
      </div>

      {error && <p className="error">{error}</p>}

      {data && (
        <>
          <div className="stat-row" style={{ marginTop: 14 }}>
            <div className="stat total">
              <div className="label">Net Monthly Total</div>
              <div className="value">{money(data.totals.expense - data.totals.income)}</div>
            </div>
            <div className="stat">
              <div className="label">Transactions</div>
              <div className="value">{data.transactionCount ?? 0}</div>
            </div>
            <div className="stat">
              <div className="label">Categories Used</div>
              <div className="value">{catCount}</div>
            </div>
          </div>

          <p className="muted" style={{ marginTop: 6 }}>▼ = net spend &nbsp;·&nbsp; ▲ = net income/credit (e.g. refunds)</p>

          <div className="chart">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 0 }}>
              <h3 style={{ margin: 0 }}>Budget Status</h3>
              <a href="/budgets" className="muted" style={{ fontSize: 13, textDecoration: 'none' }}>Manage budgets →</a>
            </div>
            {budgetData.length === 0 && <p className="muted">No budgets set for this month. Add one on the Budgets page.</p>}
            {budgetData.map((b) => {
              const isGoal = b.kind === 'goal';
              const name = isGoal ? `${b.period === 'yearly' ? 'Yearly' : 'Monthly'} savings goal` : b.category;
              const bad = b.over || b.behind;
              const barColor = isGoal ? (b.behind ? 'var(--danger)' : 'var(--secondary)') : (b.over ? 'var(--danger)' : b.pct > 80 ? '#e0a700' : 'var(--primary)');
              return (
                <div key={b.id} style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '45%' }}>{name}</span>
                    <span style={{ color: bad ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      {money(b.actual)} / {money(b.amount)} · {b.pct}%
                    </span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 6, height: 8, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, b.pct)}%`, height: '100%', background: barColor }} />
                  </div>
                </div>
              );
            })}

          </div>

          <div className="chart">
            <h3>{monthLabel} Breakdown by Category<span className="muted"> · Expenses: {money(data.byCategory.filter((c) => c.amount > 0).reduce((s, c) => s + c.amount, 0))} · Income: {money(data.byCategory.filter((c) => c.amount < 0).reduce((s, c) => s + Math.abs(c.amount), 0))}</span></h3>
            {data.byCategory.length === 0 && <p className="muted">No expense transactions this month.</p>}
            {data.byCategory.map((c) => <Bar key={c.categoryId} label={c.category} amount={c.amount} max={maxCat} />)}
          </div>

          <div className="chart">
            <h3>{monthLabel} Breakdown by Subcategory<span className="muted"> · {money(data.byExpenseType.reduce((s, t) => s + t.amount, 0))}</span></h3>
            <p className="muted" style={{ marginTop: 0 }}>Subcategories with the same name grouped across categories.</p>
            {data.byExpenseType.length === 0 && <p className="muted">No categorized expenses this month.</p>}
            {data.byExpenseType.map((t, i) => <Bar key={t.type} label={t.type} amount={t.amount} max={maxTypeMonth} colorClass={'c' + (i % 12)} />)}
          </div>

          <div className="chart">
            <h3>{year} Breakdown by Category<span className="muted"> · Expenses: {money(data.yearlyByCategory.filter((c) => c.amount > 0).reduce((s, c) => s + c.amount, 0))} · Income: {money(data.yearlyByCategory.filter((c) => c.amount < 0).reduce((s, c) => s + Math.abs(c.amount), 0))}</span></h3>
            {data.yearlyByCategory.length === 0 && <p className="muted">No expense transactions this year.</p>}
            {data.yearlyByCategory.map((c, i) => <Bar key={c.categoryId} label={c.category} amount={c.amount} max={maxYrCat} colorClass={'c' + (i % 12)} />)}
          </div>

          <div className="chart">
            <h3>{year} Breakdown by Subcategory<span className="muted"> · {money(data.yearlyByExpenseType.reduce((s, t) => s + t.amount, 0))}</span></h3>
            <p className="muted" style={{ marginTop: 0 }}>Same grouping, across all 12 months.</p>
            {data.yearlyByExpenseType.length === 0 && <p className="muted">No categorized expenses this year.</p>}
            {data.yearlyByExpenseType.map((t, i) => <Bar key={t.type} label={t.type} amount={t.amount} max={maxTypeYear} colorClass={'c' + (i % 12)} />)}
          </div>

          <div className="chart">
            <h3>{year} Trend<span className="muted"> · Net: {money(data.yearlyTrend.reduce((s, m) => s + m.expense - m.income, 0))}</span></h3>
            {data.yearlyTrend.map((m) => <Bar key={m.month} label={MONTHS[m.month - 1]} amount={m.expense} max={maxYrMonth} colorClass={'c' + ((m.month - 1) % 12)} />)}
          </div>

          <div className="chart">
            <h3>{monthLabel} Breakdown by Merchant<span className="muted"> · {money(data.byMerchant.reduce((s, m) => s + Math.abs(m.amount), 0))}</span></h3>
            {data.byMerchant.length === 0 && <p className="muted">No transactions this month.</p>}
            {data.byMerchant.map((m, i) => <Bar key={m.merchant} label={m.merchant} amount={Math.abs(m.amount)} max={maxMerch} colorClass={'c' + (i % 12)} />)}
          </div>

          <div className="chart">
            <h3>{year} Breakdown by Merchant<span className="muted"> · {money(data.yearlyByMerchant.reduce((s, m) => s + Math.abs(m.amount), 0))}</span></h3>
            {data.yearlyByMerchant.length === 0 && <p className="muted">No transactions this year.</p>}
            {data.yearlyByMerchant.map((m, i) => <Bar key={m.merchant} label={m.merchant} amount={Math.abs(m.amount)} max={maxYMerch} colorClass={'c' + (i % 12)} />)}
          </div>

          <div className="chart">
            <h3>{monthLabel} Income by Category<span className="muted"> · {money(monthIncome.reduce((s, c) => s + Math.abs(c.amount), 0))}</span></h3>
            {monthIncome.length === 0 && <p className="muted">No income this month.</p>}
            {monthIncome.map((c) => <Bar key={c.categoryId} label={c.category} amount={Math.abs(c.amount)} max={maxMonthIncome} credit colorClass="c1" />)}
          </div>

          <div className="chart">
            <h3>{year} Income by Category<span className="muted"> · {money(yearIncome.reduce((s, c) => s + Math.abs(c.amount), 0))}</span></h3>
            {yearIncome.length === 0 && <p className="muted">No income this year.</p>}
            {yearIncome.map((c) => <Bar key={c.categoryId} label={c.category} amount={Math.abs(c.amount)} max={maxYearIncome} credit colorClass="c1" />)}
          </div>
        </>
      )}
    </div>
  );
}
