'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Sub = { id: string; name: string; type: string | null };
type Cat = { id: string; name: string; subcategories: Sub[] };

type Line = {
  categoryId: string;
  subcategoryId: string;
  amount: string; // cents as string in the input
  lineType: 'item' | 'tax' | 'discount' | 'deposit';
};

export default function Transactions() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [direction, setDirection] = useState<'expense' | 'income'>('expense');
  const [merchant, setMerchant] = useState('');
  const [transactedAt, setTransactedAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<Line[]>([
    { categoryId: '', subcategoryId: '', amount: '', lineType: 'item' },
  ]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  async function load() {
    const [c, t] = await Promise.all([
      fetch('/api/categories').then((r) => (r.ok ? r.json() : { categories: [] })),
      fetch('/api/transactions').then((r) => (r.ok ? r.json() : { transactions: [] })),
    ]);
    setCats(c.categories || []);
    setTxns(t.transactions || []);
  }

  useEffect(() => { load(); }, []);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }
  function addLine() {
    setLines((ls) => [...ls, { categoryId: '', subcategoryId: '', amount: '', lineType: 'item' }]);
  }
  function removeLine(i: number) {
    setLines((ls) => (ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls));
  }


  function subsFor(catId: string): Sub[] {
    return cats.find((c) => c.id === catId)?.subcategories ?? [];
  }

  function startEdit(t: any) {
    setEditingId(t.id);
    setDirection(t.direction);
    setMerchant(t.merchant || '');
    setTransactedAt((t.transactedAt || '').slice(0, 10));
    setNote(t.note || '');
    setLines(
      (t.lines || []).map((l: any) => ({
        categoryId: l.categoryId,
        subcategoryId: l.subcategoryId || '',
        amount: (l.amount / 100).toFixed(2),
        lineType: l.lineType,
      })),
    );
  }

  async function cancelEdit() {
    setEditingId(null);
    setMerchant(''); setNote('');
    setLines([{ categoryId: '', subcategoryId: '', amount: '', lineType: 'item' }]);
  }

  async function removeTxn(id: string) {
    if (!confirm('Delete this transaction?')) return;
    setBusy(true);
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) { await load(); router.refresh(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Delete failed'); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const payload = {
      direction,
      merchant: merchant || null,
      transactedAt,
      note: note || null,
      lines: lines.map((l) => ({
        categoryId: l.categoryId,
        subcategoryId: l.subcategoryId || null,
        amount: Math.round(parseFloat(l.amount || '0') * 100), // dollars -> cents
        lineType: l.lineType,
      })),
    };
    const res = await fetch('/api/transactions', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setEditingId(null);
      setMerchant(''); setNote(''); setLines([{ categoryId: '', subcategoryId: '', amount: '', lineType: 'item' }]);
      await load();
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Failed to save');
    }
    setBusy(false);
  }

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h1>Transactions {editingId ? '(editing)' : ''}</h1>

      <form onSubmit={submit}>
        <label>Type</label>
        <select value={direction} onChange={(e) => setDirection(e.target.value as any)} style={sel}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>

        <label>Merchant</label>
        <input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Supermarket" />

        <label>Date</label>
        <input type="date" value={transactedAt} onChange={(e) => setTransactedAt(e.target.value)} />

        <label>Lines</label>
        {lines.map((l, i) => (
          <div key={i} style={{ borderTop: '1px solid #334155', marginTop: 10, paddingTop: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={l.categoryId} onChange={(e) => updateLine(i, { categoryId: e.target.value, subcategoryId: '' })} style={{ ...sel, flex: 2 }}>
                <option value="">Category…</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={l.subcategoryId} onChange={(e) => updateLine(i, { subcategoryId: e.target.value })} style={{ ...sel, flex: 2 }} disabled={!l.categoryId || subsFor(l.categoryId).length === 0}>
                <option value="">{subsFor(l.categoryId).length ? 'Subcategory…' : '—'}</option>
                {subsFor(l.categoryId).map((s) => <option key={s.id} value={s.id}>{s.name}{s.type ? ` (${s.type})` : ''}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', flex: 2, border: '1px solid #334155', borderRadius: 8, background: '#0f172a', paddingLeft: 10 }}>
                <span style={{ opacity: 0.7 }}>$</span>
                <input type="number" step="0.01" value={l.amount} onChange={(e) => updateLine(i, { amount: e.target.value })} placeholder="0.00" style={{ flex: 1, border: 0, background: 'transparent' }} />
              </div>
              <select value={l.lineType} onChange={(e) => updateLine(i, { lineType: e.target.value as any })} style={{ ...sel, flex: 2 }}>
                <option value="item">Item (purchase)</option>
                <option value="tax">Tax</option>
                <option value="discount">Discount</option>
                <option value="deposit">Deposit</option>
              </select>
              <button type="button" onClick={() => removeLine(i)} disabled={lines.length === 1} style={{ ...btn, flex: 1 }}>Remove</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addLine} style={btn}>+ Add line</button>

        <label>Note</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} />

        <button type="submit" disabled={busy} style={btn}>{busy ? 'Saving…' : editingId ? 'Update transaction' : 'Save transaction'}</button>
        {editingId && <button type="button" onClick={cancelEdit} style={{ ...btn, background: '#334155', color: 'var(--fg)' }}>Cancel</button>}
        {error && <p className="error">{error}</p>}
      </form>

      <h1 style={{ marginTop: 24 }}>Recent</h1>
      {txns.length === 0 && <p className="muted">No transactions yet.</p>}
      <ul style={{ paddingLeft: 18 }}>
        {txns.map((t) => (
          <li key={t.id} style={{ marginBottom: 8 }}>
            <strong>{t.direction === 'income' ? '+' : '-'} {t.merchant || '(no merchant)'}</strong>
            {' '}{new Date(t.transactedAt).toLocaleDateString()}
            <ul style={{ opacity: 0.8 }}>
              {t.lines.map((l: any, i: number) => <li key={i}>{l.lineType}: ${(l.amount / 100).toFixed(2)}</li>)}
            </ul>
            <p style={{ marginTop: 4, fontWeight: 600 }}>Total: ${(t.lines.reduce((s: number, l: any) => s + (l.amount || 0), 0) / 100).toFixed(2)}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button type="button" onClick={() => startEdit(t)} style={{ ...btn, flex: 1, background: '#334155', color: 'var(--fg)' }}>Edit</button>
              <button type="button" onClick={() => removeTxn(t.id)} disabled={busy} style={{ ...btn, flex: 1, background: '#7f1d1d', color: '#fff' }}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
      <p className="muted"><a href="/">Home</a></p>
    </div>
  );
}

const sel: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: 'var(--fg)', fontSize: 14 };
const btn: React.CSSProperties = { marginTop: 12, padding: '11px', borderRadius: 8, border: 0, background: 'var(--accent)', color: '#06283d', fontWeight: 600, cursor: 'pointer' };
