// Client component: add a transaction (merchant, category, subcategory, line type,
// amount, description, date), then list recent transactions.
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Sub = { id: string; name: string; type: string | null };
type Cat = { id: string; name: string; subcategories: Sub[] };
type Txn = {
  id: string;
  direction: 'income' | 'expense';
  merchant: string | null;
  transactedAt: string;
  total: number; // cents
  categoryName?: string;
};

// Default date in America/Los_Angeles (PDT/PST) for the Add form.
function pdtToday(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(new Date()); // YYYY-MM-DD
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

export default function Transactions() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [direction, setDirection] = useState<'expense' | 'income'>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [lineType, setLineType] = useState<'item' | 'tax' | 'discount' | 'deposit'>('item');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactedAt, setTransactedAt] = useState(pdtToday());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const subs = cats.find((c) => c.id === categoryId)?.subcategories ?? [];

  async function load() {
    const c = await (await fetch('/api/categories')).json();
    setCats(c.categories ?? []);
    const t = await (await fetch('/api/transactions')).json();
    setTxns(t.transactions ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const cents = Math.round(parseFloat(amount || '0') * 100);
    if (!categoryId) { setError('Pick a category'); setBusy(false); return; }
    if (!cents || cents <= 0) { setError('Enter an amount greater than 0'); setBusy(false); return; }
    const payload = {
      direction,
      merchant: merchant || description || null,
      transactedAt,
      lines: [{ categoryId, subcategoryId: subcategoryId || '', amount: String(cents), lineType }],
    };
    const url = editingId ? `/api/transactions/${editingId}` : '/api/transactions';
    const res = await fetch(url, {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setEditingId(null); setCategoryId(''); setSubcategoryId(''); setLineType('item');
      setMerchant(''); setAmount(''); setDescription(''); setError('');
      setTransactedAt(pdtToday());
      await load(); router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Failed to save');
    }
    setBusy(false);
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  function startEdit(t: Txn) {
    setEditingId(t.id);
    setDirection(t.direction);
    setMerchant(t.merchant ?? '');
    setDescription(t.merchant ?? '');
    setTransactedAt(t.transactedAt.slice(0, 10));
    setAmount((Math.abs(t.total) / 100).toFixed(2));
    fetch(`/api/transactions/${t.id}`).then((r) => r.json()).then((d) => {
      const line = d.transaction?.lines?.[0];
      if (line) {
        setCategoryId(line.categoryId);
        setSubcategoryId(line.subcategoryId ?? '');
        setLineType(line.lineType ?? 'item');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  async function del(t: Txn) {
    if (!confirm('Delete this transaction?')) return;
    const res = await fetch(`/api/transactions/${t.id}`, { method: 'DELETE' });
    if (res.ok) await load(); else setError('Delete failed');
  }

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

          <label>Category</label>
          <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setSubcategoryId(''); }}>
            <option value="">Select a category</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <label>Subcategory</label>
          <select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} disabled={subs.length === 0}>
            <option value="">{subs.length === 0 ? 'No subcategories' : 'None'}</option>
            {subs.map((s) => <option key={s.id} value={s.id}>{s.name}{s.type ? ` (${s.type})` : ''}</option>)}
          </select>

          <label>Line Type</label>
          <select value={lineType} onChange={(e) => setLineType(e.target.value as any)}>
            <option value="item">Item</option>
            <option value="tax">Tax</option>
            <option value="discount">Discount</option>
            <option value="deposit">Deposit</option>
          </select>

          <label>Amount ($)</label>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />

          <label>Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="optional note" />

          <label>Date</label>
          <input type="date" value={transactedAt} onChange={(e) => setTransactedAt(e.target.value)} />

          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>{editingId ? 'Update Transaction' : 'Add Expense'}</button>
          {editingId && <button className="btn secondary" type="button" onClick={() => setEditingId(null)}>Cancel</button>}
        </form>
      </div>

      <div className="card wide" style={{ marginTop: 14 }}>
        <h3>Recent Transactions</h3>
        {txns.length === 0 && <p className="muted">No transactions yet.</p>}
        {txns.length > 0 && (
          <table className="exp-table">
            <thead>
              <tr><th>Date</th><th>Description</th><th>Category</th><th style={{ textAlign: 'right' }}>Amount</th><th></th></tr>
            </thead>
            <tbody>
              {txns.map((t) => (
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
      </div>
    </div>
  );
}
