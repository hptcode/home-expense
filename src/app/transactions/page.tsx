// Client component: add a transaction with multiple line items (merchant,
// category, subcategory, line type, amount per line), then show the just
// entered transaction for 20 seconds.
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Sub = { id: string; name: string };
type Cat = { id: string; name: string; subcategories: Sub[] };
type Txn = {
  id: string;
  direction: 'income' | 'expense';
  merchant: string | null;
  transactedAt: string;
  total: number; // cents
  categoryName?: string;
};
type Line = { categoryId: string; subcategoryId: string; amount: string };

function pdtToday(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(new Date());
}
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

const emptyLine = (): Line => ({ categoryId: '', subcategoryId: '', amount: '' });

export default function Transactions() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [direction, setDirection] = useState<'expense' | 'income'>('expense');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [transactedAt, setTransactedAt] = useState(pdtToday());
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showOnly, setShowOnly] = useState<Txn | null>(null);
  const router = useRouter();

  async function load() {
    const c = await (await fetch('/api/categories')).json();
    setCats(c.categories ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (!showOnly) return;
    const id = setTimeout(() => { setShowOnly(null); }, 20000);
    return () => clearTimeout(id);
  }, [showOnly]);

  function subsFor(catId: string): Sub[] {
    return cats.find((c) => c.id === catId)?.subcategories ?? [];
  }
  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() { setLines((prev) => [...prev, emptyLine()]); }
  function removeLine(i: number) { setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const clean: { categoryId: string; subcategoryId: string | null; amount: number }[] = [];
    for (const l of lines) {
      if (!l.categoryId) { setError('Every line needs a category'); setBusy(false); return; }
      const cents = Math.round(parseFloat(l.amount || '0') * 100);
      if (!cents || cents <= 0) { setError('Every line needs an amount greater than 0'); setBusy(false); return; }
      clean.push({ categoryId: l.categoryId, subcategoryId: l.subcategoryId || null, amount: cents });
    }
    const payload = {
      direction,
      merchant: merchant || description || null,
      transactedAt,
      note: description || null,
      lines: clean.map((l) => ({ ...l, amount: String(l.amount) })),
    };
    const url = editingId ? `/api/transactions/${editingId}` : '/api/transactions';
    const res = await fetch(url, {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const created = editingId ? null : (await res.json()).id;
      setEditingId(null);
      setDirection('expense'); setMerchant(''); setDescription(''); setTransactedAt(pdtToday());
      setLines([emptyLine()]); setError('');
      await load();
      router.refresh();
      if (created) {
        const d = await (await fetch(`/api/transactions/${created}`)).json();
        if (d.transaction) setShowOnly({ ...d.transaction, total: d.transaction.total ?? 0 });
      }
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Failed to save');
    }
    setBusy(false);
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  async function startEdit(t: Txn) {
    setShowOnly(null);
    const d = await (await fetch(`/api/transactions/${t.id}`)).json();
    const txn = d.transaction;
    if (!txn) return;
    setEditingId(t.id);
    setDirection(txn.direction);
    setMerchant(txn.merchant ?? '');
    setDescription(txn.note ?? '');
    setTransactedAt((txn.transactedAt || '').slice(0, 10));
    const ls: Line[] = (txn.lines ?? []).map((l: any) => ({
      categoryId: l.categoryId,
      subcategoryId: l.subcategoryId ?? '',
      amount: (Math.abs(Number(l.amount)) / 100).toFixed(2),
    }));
    setLines(ls.length ? ls : [emptyLine()]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function del(t: Txn) {
    if (!confirm('Delete this transaction?')) return;
    const res = await fetch(`/api/transactions/${t.id}`, { method: 'DELETE' });
    if (res.ok) setShowOnly(null); else setError('Delete failed');
  }

  const displayTxns = showOnly ? [showOnly] : [];

  return (
    <div>
      <div className="card wide">
        <h2>{editingId ? 'Edit Transaction' : 'Add New Expense'}</h2>
        <form onSubmit={submit}>
          <label>Type</label>
          <select value={direction} onChange={(e) => setDirection(e.target.value as any)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>

          <label>Merchant</label>
          <input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Supermarket" />

          <label>Date</label>
          <input type="date" value={transactedAt} onChange={(e) => setTransactedAt(e.target.value)} />

          <h3 style={{ marginTop: 18, color: 'var(--primary)' }}>Line Items</h3>
          {lines.map((l, i) => {
            const subs = subsFor(l.categoryId);
            return (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, margin: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Line {i + 1}</strong>
                  {lines.length > 1 && (
                    <button type="button" className="btn secondary" style={{ width: 'auto', padding: '4px 10px', marginTop: 0 }} onClick={() => removeLine(i)}>Remove</button>
                  )}
                </div>
                <label>Category</label>
                <select value={l.categoryId} onChange={(e) => updateLine(i, { categoryId: e.target.value, subcategoryId: '' })}>
                  <option value="">Select a category</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <label>Subcategory</label>
                <select value={l.subcategoryId} onChange={(e) => updateLine(i, { subcategoryId: e.target.value })} disabled={subs.length === 0}>
                  <option value="">{subs.length === 0 ? 'No subcategories' : 'None'}</option>
                  {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>

                <label>Amount ($)</label>
                <input type="number" step="0.01" value={l.amount} onChange={(e) => updateLine(i, { amount: e.target.value })} placeholder="0.00" />
              </div>
            );
          })}
          <button type="button" className="btn secondary" style={{ width: 'auto', padding: '10px 18px', marginTop: 8 }} onClick={addLine}>+ Add another line</button>

          <label style={{ marginTop: 14 }}>Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="optional note" />

          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>{editingId ? 'Update Transaction' : 'Add Expense'}</button>
          {editingId && <button className="btn secondary" type="button" onClick={() => { setEditingId(null); setLines([emptyLine()]); }}>Cancel</button>}
        </form>
      </div>

      <div className="card wide" style={{ marginTop: 14 }}>
        <h3>{showOnly ? 'Just Added' : 'Last Entry'}</h3>
        {displayTxns.length === 0 && <p className="muted">Add an expense above — the entry you just made appears here for 20 seconds.</p>}
        {displayTxns.length > 0 && (
          <table className="exp-table">
            <thead>
              <tr><th>Date</th><th>Description</th><th>Category</th><th style={{ textAlign: 'right' }}>Amount</th><th></th></tr>
            </thead>
            <tbody>
              {displayTxns.map((t) => (
                <tr key={t.id}>
                  <td>{fmtDate(t.transactedAt)}</td>
                  <td>{t.merchant || '—'}</td>
                  <td>{t.categoryName || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{t.direction === 'income' ? '+' : '-'}{money(t.total)}</td>
                  <td className="row-actions">
                    <button className="btn" onClick={() => startEdit(t)}>Edit</button>
                    <button className="btn secondary" onClick={() => del(t)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {showOnly && <p className="muted">Shows the just-added transaction for 20 seconds, then it clears.</p>}
      </div>
    </div>
  );
}
