// Client component: dashboard mirroring homeexpense.patrickho.ca
// (monthly total, counts, monthly+ yearly bar charts; no weekly).
'use client';
import { useEffect, useState } from 'react';

type Reports = {
  range: { from: string; to: string };
  totals: { income: number; expense: number; net: number };
  byCategory: { categoryId: string; category: string; amount: number }[];
  byPeriod: { period: string; income: number; expense: number; net: number }[];
  budgets: { categoryId: string; category: string; monthlyLimit: number; spent: number; remaining: number; pct: number }[];
  yearlyTrend: { month: number; income: number; expense: number }[];
  yearlyByCategory: { categoryId: string; category: string; amount: number }[];
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function money(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return sign + '$' + (Math.abs(cents) / 100).toFixed(2);
}

function Bar({ label, amount, max, colorClass }: { label: string; amount: number; max: number; colorClass?: string }) {
  const pct = max > 0 ? Math.round((amount / max) * 100) : 0;
  const cls = 'bar-fill' + (colorClass ? ' ' + colorClass : '');
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <span className="bar-track"><span className={cls} style={{ width: Math.max(pct, 2) + '%' }} /></span>
      <span className="bar-val">{money(amount)}</span>
    </div>
  );
}

export default function Reports() {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());
  const [data, setData] = useState<Reports | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true); setError('');
    const from = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    const to = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
    try {
      const res = await fetch(`/api/reports?from=${from}&to=${to}`);
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Failed to load'); setData(null); return; }
      setData(await res.json());
    } catch { setError('Failed to load'); }
    finally { setBusy(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  function exportCsv() {
    if (!data) return;
    const rows = ['Section,Key,Amount'];
    rows.push(`Totals,Income,${data.totals.income}`);
    rows.push(`Totals,Expense,${data.totals.expense}`);
    rows.push(`Totals,Net,${data.totals.net}`);
    for (const c of data.byCategory) rows.push(`ByCategory,${c.category},${c.amount}`);
    for (const p of data.byPeriod) rows.push(`ByMonth,${p.period},${p.expense}`);
    for (const y of data.yearlyTrend) rows.push(`YearlyMonth,${MONTHS[y.month - 1]},${y.expense}`);
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reports_${year}_${month + 1}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const maxCat = data ? Math.max(1, ...data.byCategory.map((c) => c.amount)) : 1;
  const maxYrCat = data ? Math.max(1, ...data.yearlyByCategory.map((c) => c.amount)) : 1;
  const maxYrMonth = data ? Math.max(1, ...data.yearlyTrend.map((m) => m.expense)) : 1;
  const catCount = data ? new Set(data.byCategory.map((c) => c.categoryId)).size : 0;
  const txnCount = data ? data.byPeriod.reduce((n, p) => n + 1, 0) : 0;

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label>Year</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {Array.from({ length: 10 }, (_, i) => now.getUTCFullYear() - 4 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Month</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
        </div>
        <button className="btn" style={{ width: 'auto', marginTop: 24, padding: '10px 18px' }} onClick={load} disabled={busy}>Apply</button>
        <button className="btn secondary" style={{ width: 'auto', marginTop: 24, padding: '10px 18px' }} onClick={exportCsv} disabled={!data}>Export CSV</button>
      </div>

      {error && <p className="error">{error}</p>}

      {data && (
        <>
          <div className="stat-row" style={{ marginTop: 14 }}>
            <div className="stat total">
              <div className="label">Monthly Total</div>
              <div className="value">{money(data.totals.expense)}</div>
            </div>
            <div className="stat">
              <div className="label">Transactions</div>
              <div className="value">{data.byPeriod.length}</div>
            </div>
            <div className="stat">
              <div className="label">Categories Used</div>
              <div className="value">{catCount}</div>
            </div>
          </div>

          <div className="chart">
            <h3>Monthly Breakdown by Category</h3>
            {data.byCategory.length === 0 && <p className="muted">No expense transactions this month.</p>}
            {data.byCategory.map((c) => <Bar key={c.categoryId} label={c.category} amount={c.amount} max={maxCat} />)}
          </div>

          <div className="chart">
            <h3>Yearly Trend</h3>
            {data.yearlyTrend.map((m) => <Bar key={m.month} label={MONTHS[m.month - 1]} amount={m.expense} max={maxYrMonth} colorClass={'c' + ((m.month - 1) % 12)} />)}
          </div>

          <div className="chart">
            <h3>Yearly Spending by Category</h3>
            {data.yearlyByCategory.length === 0 && <p className="muted">No expense transactions this year.</p>}
            {data.yearlyByCategory.map((c, i) => <Bar key={c.categoryId} label={c.category} amount={c.amount} max={maxYrCat} colorClass={'c' + (i % 12)} />)}
          </div>
        </>
      )}
    </div>
  );
}
