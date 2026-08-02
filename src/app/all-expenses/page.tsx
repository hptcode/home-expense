// Client component: every transaction LINE for a selected month or whole year.
// Defaults to the current month (PDT).
'use client';
import { useEffect, useState } from 'react';

type Row = {
  id: string;
  transactedAt: string;
  merchant: string | null;
  direction: 'income' | 'expense';
  category: string;
  subcategory: string;
  amount: number; // cents
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function money(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return sign + '$' + (Math.abs(cents) / 100).toFixed(2);
}
function fmtDate(iso: string): string {
  const ymd = (iso || '').slice(0, 10);
  if (!ymd) return '';
  const d = new Date(ymd + 'T00:00:00');
  return isNaN(d.getTime()) ? ymd : d.toLocaleDateString();
}

export default function AllExpenses() {
  const now = new Date();
  const pdt = (opt: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', ...opt }).format(now);
  const [year, setYear] = useState(Number(pdt({ year: 'numeric' })));
  const [month, setMonth] = useState<string>(String(Number(pdt({ month: 'numeric' })))); // current month by default
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load(y = year, m = month) {
    setBusy(true); setError('');
    try {
      const q = `/api/expenses?year=${y}${m ? `&month=${m}` : ''}`;
      const res = await fetch(q);
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Failed to load'); return; }
      const d = await res.json();
      setRows(d.rows ?? []); setTotal(d.total ?? 0);
    } catch { setError('Failed to load'); }
    finally { setBusy(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const years = Array.from({ length: 10 }, (_, i) => now.getUTCFullYear() - 4 + i);

  return (
    <div>
      <div className="card wide">
        <h2>All Expenses</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label>Year</label>
            <select value={year} onChange={(e) => { const y = Number(e.target.value); setYear(y); load(y, month); }}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label>Month</label>
            <select value={month} onChange={(e) => { const m = e.target.value; setMonth(m); load(year, m); }}>
              <option value="">Whole year</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <p className="muted" style={{ marginTop: 12 }}>Total expenses: <strong>{money(total)}</strong> · {rows.length} line entries</p>
      </div>

      <div className="card wide" style={{ marginTop: 14 }}>
        {rows.length === 0 && <p className="muted">No expenses for this period.</p>}
        {rows.length > 0 && (
          <table className="exp-table">
            <thead>
              <tr>
                <th>Date</th><th>Merchant</th><th>Category</th><th>Subcategory</th><th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.transactedAt)}</td>
                  <td>{r.merchant || '—'}</td>
                  <td>{r.category}</td>
                  <td>{r.subcategory || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{r.direction === 'income' ? '+' : '-'}{money(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
