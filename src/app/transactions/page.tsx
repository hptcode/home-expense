// Client component: add a transaction with multiple line items (merchant,
// category, subcategory, line type, amount per line), then show the just
// entered transaction for 10 seconds.
'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Sub = { id: string; name: string };
type Cat = { id: string; name: string; direction: 'income' | 'expense'; subcategories: Sub[] };
type LineItem = { categoryId: string; subcategoryId: string | null; amount: number };
type Txn = {
  id: string;
  direction: 'income' | 'expense';
  merchant: string | null;
  transactedAt: string;
  note?: string | null;
  lines?: LineItem[];
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
  const [merchants, setMerchants] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [showOnly, setShowOnly] = useState<Txn | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleClear() {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setShowOnly(null), 10000);
  }
  const router = useRouter();

  async function load() {
    const c = await (await fetch('/api/categories')).json();
    const m = await (await fetch('/api/merchants')).json();
    setMerchants(m.merchants ?? []);
    const dirRank = (d: string) => (d === 'income' ? 1 : 0); // empty/undefined -> expense group
    const sorted = [...(c.categories ?? [])].sort((a, b) =>
      dirRank(a.direction) - dirRank(b.direction) || a.name.localeCompare(b.name))
      .map((cat) => ({ ...cat, subcategories: [...(cat.subcategories ?? [])].sort((a, b) =>
        dirRank(a.direction) - dirRank(b.direction) || a.name.localeCompare(b.name)) }));
    setCats(sorted);
  }
  useEffect(() => {
    (async () => {
      await load();
      const editId = (typeof window !== 'undefined')
        ? new URLSearchParams(window.location.search).get('edit')
        : null;
      if (editId) {
        const d = await (await fetch(`/api/transactions/${editId}`)).json();
        if (!d.transaction) return;
        const txn = d.transaction;
        setEditingId(editId);
        setDirection(txn.direction);
        setMerchant(txn.merchant ?? '');
        setDescription(txn.note ?? '');
        setTransactedAt((txn.transactedAt || '').slice(0, 10));
        const ls = (txn.lines ?? []).map((l: any) => ({
          categoryId: l.categoryId,
          subcategoryId: l.subcategoryId ?? '',
          amount: (Math.abs(Number(l.amount)) / 100).toFixed(2),
        }));
        setLines(ls.length ? ls : [emptyLine()]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    })();
  // eslint-disable-next-line
  }, []);

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
      const saveId = editingId ? editingId : (await res.json()).id;
      setEditingId(null);
      setDirection('expense'); setMerchant(''); setDescription(''); setTransactedAt(pdtToday());
      setLines([emptyLine()]); setError('');
      await load();
      router.refresh();
      // Show the just-saved transaction (added or edited), then auto-clear in 10s.
      if (saveId) {
        const d = await (await fetch(`/api/transactions/${saveId}`)).json();
        if (d.transaction) {
          setShowOnly(d.transaction);
          scheduleClear();
        }
      }
      if (typeof window !== 'undefined') {
        const u = new URL(window.location.href);
        u.searchParams.delete('edit');
        window.history.replaceState({}, '', u.pathname);
      }
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Failed to save');
    }
    setBusy(false);
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  async function startEdit(t: Txn) {
    if (clearTimer.current) clearTimeout(clearTimer.current);
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
    if (clearTimer.current) clearTimeout(clearTimer.current);
    if (!confirm('Delete this transaction?')) return;
    const res = await fetch(`/api/transactions/${t.id}`, { method: 'DELETE' });
    if (res.ok) setShowOnly(null); else setError('Delete failed');
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
          <input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Supermarket" list="merchant-list" />
          <datalist id="merchant-list">{merchants.map((m) => <option key={m} value={m} />)}</datalist>

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
                  {cats.filter((c) => c.direction === direction).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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

      {showOnly && (
        <div className="card wide" style={{ marginTop: 14 }}>
          <h3>Entry added</h3>
          <p className="muted">Saved just now — this panel clears in 10 seconds.</p>
          <div style={{ margin: '6px 0' }}>
            <div style={{ fontWeight: 600 }}>
              {showOnly.merchant || '—'} · {showOnly.direction === 'income' ? 'Income' : 'Expense'} · {fmtDate(showOnly.transactedAt)}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
              {(showOnly.lines ?? []).map((l, i) => {
                const cn = cats.find((c) => c.id === l.categoryId)?.name ?? '—';
                const sn = l.subcategoryId
                  ? (cats.find((c) => c.id === l.categoryId)?.subcategories.find((s) => s.id === l.subcategoryId)?.name ?? '')
                  : '';
                return (
                  <li key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span>{cn}{sn ? ' › ' + sn : ''}</span>
                    <span>{money(Number(l.amount))}</span>
                  </li>
                );
              })}
            </ul>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 8 }}>
              <span>Total</span>
              <span>{money((showOnly.lines ?? []).reduce((s, l) => s + Number(l.amount), 0))}</span>
            </div>
          </div>
          <div className="row-actions" style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => startEdit(showOnly)}>Edit</button>
            <button className="btn secondary" onClick={() => del(showOnly)}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}
