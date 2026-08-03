// Owner-only: set monthly budgets per category, see spent vs limit.
'use client';
import { useEffect, useState } from 'react';

type Cat = { id: string; name: string; direction: 'income' | 'expense' };
type Budget = {
  id: string;
  categoryId: string;
  category: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  pct: number;
  over: boolean;
};

function money(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return sign + '$' + (Math.abs(cents) / 100).toFixed(2);
}

export default function Budgets() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // add form
  const [catId, setCatId] = useState('');
  const [amount, setAmount] = useState('');

  async function load() {
    setBusy(true);
    try {
      const me = await (await fetch('/api/auth/me')).json();
      setRole(me.role);
      const c = await (await fetch('/api/categories')).json();
      const dirRank = (d: string) => (d === 'income' ? 1 : 0);
      setCats([...(c.categories ?? [])]
        .sort((a: any, b: any) => dirRank(a.direction) - dirRank(b.direction) || a.name.localeCompare(b.name))
        .map((x: any) => ({ id: x.id, name: x.name, direction: x.direction })));
      const b = await (await fetch('/api/budgets')).json();
      setBudgets(b.budgets ?? []);
    } catch {
      setError('Failed to load');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  if (role && role !== 'owner') {
    return <div className="card wide"><h2>Budgets</h2><p className="muted">Only the household owner can manage budgets.</p></div>;
  }

  async function addBudget() {
    setError('');
    if (!catId) { setError('Pick a category'); return; }
    const cents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents < 0) { setError('Enter a valid amount (e.g. 500)'); return; }
    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: catId, monthlyLimit: cents }),
    });
    if (res.ok) {
      setAmount('');
      setCatId('');
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Failed to save budget');
    }
  }

  async function removeBudget(id: string) {
    await fetch(`/api/budgets?id=${id}`, { method: 'DELETE' });
    await load();
  }

  // categories without a budget yet (for the dropdown)
  const used = new Set(budgets.map((b) => b.categoryId));
  const available = cats.filter((c) => !used.has(c.id));

  return (
    <div>
      <div className="card wide">
        <h2>Monthly Budgets</h2>
        <p className="muted">Set a monthly spending limit per category. Progress is tracked against the current month (PDT).</p>

        {budgets.length === 0 && !busy && (
          <p className="muted">No budgets yet. Add one below to start tracking.</p>
        )}

        {budgets.map((b) => (
          <div key={b.id} style={{ marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <strong>{b.category}</strong>
              <span className="muted" style={{ fontSize: 14 }}>
                {money(b.spent)} / {money(b.monthlyLimit)}
              </span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, height: 12, marginTop: 8, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, b.pct)}%`,
                  height: '100%',
                  background: b.over ? 'var(--danger)' : b.pct > 80 ? '#e0a700' : 'var(--primary)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 13 }}>
              <span style={{ color: b.over ? 'var(--danger)' : 'var(--text-secondary)' }}>
                {b.over ? `Over by ${money(-b.remaining)}` : `${money(b.remaining)} left`} · {b.pct}%
              </span>
              <button className="btn secondary" style={{ width: 'auto', padding: '4px 12px' }} onClick={() => removeBudget(b.id)}>Remove</button>
            </div>
          </div>
        ))}

        {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

        <h3 style={{ marginTop: 22 }}>Add a Budget</h3>
        {available.length === 0 && (
          <p className="muted">Every category already has a budget, or there are no categories yet.</p>
        )}
        {available.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={catId} onChange={(e) => setCatId(e.target.value)} style={{ flex: 1, minWidth: 200 }}>
              <option value="">Select a category</option>
              {available.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Limit (e.g. 500)"
              onKeyDown={(e) => { if (e.key === 'Enter') addBudget(); }}
              style={{ width: 160 }}
            />
            <button className="btn" style={{ width: 'auto', padding: '10px 18px' }} onClick={addBudget}>Add Budget</button>
          </div>
        )}
      </div>
    </div>
  );
}
