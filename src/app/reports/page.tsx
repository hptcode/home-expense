'use client';
import { useEffect, useState } from 'react';

type Reports = {
  range: { from: string; to: string };
  totals: { income: number; expense: number; net: number };
  byCategory: { categoryId: string; category: string; amount: number }[];
  byPeriod: { period: string; income: number; expense: number; net: number }[];
  budgets: { categoryId: string; category: string; monthlyLimit: number; spent: number; remaining: number; pct: number }[];
};

const sel: React.CSSProperties = {
  padding: '8px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#e2e8f0', marginTop: 4,
};
const card: React.CSSProperties = { background: '#0b1220', border: '1px solid #1e293b', borderRadius: 12, padding: 16, marginTop: 14 };

function money(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return sign + '$' + (Math.abs(cents) / 100).toFixed(2);
}

export default function Reports() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(monthEnd);
  const [data, setData] = useState<Reports | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/reports?from=${from}&to=${to}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Failed to load reports');
        setData(null);
        return;
      }
      setData(await res.json());
    } catch (e) {
      setError('Failed to load reports');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  function exportCsv() {
    if (!data) return;
    const rows: string[] = [];
    rows.push('Section,Key,Amount');
    rows.push(`Totals,Income,${data.totals.income}`);
    rows.push(`Totals,Expense,${data.totals.expense}`);
    rows.push(`Totals,Net,${data.totals.net}`);
    for (const c of data.byCategory) rows.push(`ByCategory,${c.category},${c.amount}`);
    for (const p of data.byPeriod) rows.push(`ByMonth,${p.period},${p.expense}`);
    for (const b of data.budgets) rows.push(`Budget,${b.category},${b.spent}/${b.monthlyLimit}`);
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reports_${data.range.from}_${data.range.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="card" style={{ maxWidth: 860 }}>
      <h1>Reports</h1>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div><label>From</label><br /><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={sel} /></div>
        <div><label>To</label><br /><input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={sel} /></div>
        <button onClick={load} disabled={busy}>Apply</button>
        <button onClick={exportCsv} disabled={!data}>Export CSV</button>
      </div>

      {error && <p style={{ color: '#f87171' }}>{error}</p>}

      {data && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
            <div style={card}><div className="muted">Income</div><div style={{ fontSize: 22 }}>{money(data.totals.income)}</div></div>
            <div style={card}><div className="muted">Expense</div><div style={{ fontSize: 22 }}>{money(data.totals.expense)}</div></div>
            <div style={card}><div className="muted">Net</div><div style={{ fontSize: 22 }}>{money(data.totals.net)}</div></div>
          </div>

          <div style={card}>
            <h3>By category (expense)</h3>
            {data.byCategory.length === 0 && <p className="muted">No expense transactions in range.</p>}
            {data.byCategory.map((c) => (
              <div key={c.categoryId} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
                <span>{c.category}</span><span>{money(c.amount)}</span>
              </div>
            ))}
          </div>

          <div style={card}>
            <h3>Monthly trend</h3>
            {data.byPeriod.length === 0 && <p className="muted">No transactions in range.</p>}
            {data.byPeriod.map((p) => (
              <div key={p.period} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
                <span>{p.period}</span>
                <span className="muted">exp {money(p.expense)} · inc {money(p.income)}</span>
              </div>
            ))}
          </div>

          <div style={card}>
            <h3>Budgets (current month)</h3>
            {data.budgets.length === 0 && <p className="muted">No budgets set. Add them from the Budgets page.</p>}
            {data.budgets.map((b) => (
              <div key={b.categoryId} style={{ padding: '6px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{b.category}</span>
                  <span className="muted">{money(b.spent)} / {money(b.monthlyLimit)} ({b.pct}%)</span>
                </div>
                <div style={{ height: 8, background: '#1e293b', borderRadius: 6, marginTop: 4, overflow: 'hidden' }}>
                  <div style={{ width: Math.min(b.pct, 100) + '%', height: '100%', background: b.pct > 100 ? '#ef4444' : '#22c55e' }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
