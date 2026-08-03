// Client component: every transaction LINE for a selected month or whole year.
// Defaults to the current month (PDT). Each row has Edit (opens Add Expense pre-filled)
// and Delete (removes the whole transaction from the DB).
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Row = {
  id: string;
  transactionId: string;
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
  const router = useRouter();

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

  function editRow(r: Row) {
    router.push(`/transactions?edit=${r.transactionId}`);
  }
  async function deleteRow(r: Row) {
    if (!confirm(`Delete this transaction (${r.merchant || 'entry'} — ${money(r.amount)})? This cannot be undone.`)) return;
    const res = await fetch(`/api/transactions/${r.transactionId}`, { method: 'DELETE' });
    if (res.ok) { await load(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Delete failed'); }
  }

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
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Total expenses</span>
          <span style={{ fontSize: 38, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{money(total)}</span>
          <span className="muted" style={{ fontSize: 14 }}>· {rows.length} line {rows.length === 1 ? 'entry' : 'entries'}</span>
        </div>
      </div>

      <div className="card wide" style={{ marginTop: 14 }}>
        {rows.length === 0 && <p className="muted">No expenses for this period.</p>}
        {rows.length > 0 && (
          <table className="exp-table">
            <thead>
              <tr>
                <th>Date</th><th>Merchant</th><th>Category</th><th>Subcategory</th><th style={{ textAlign: 'right' }}>Amount</th><th></th>
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
                  <td className="row-actions">
                    <button className="btn" onClick={() => editRow(r)}>Edit</button>
                    <button className="btn secondary" onClick={() => deleteRow(r)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
