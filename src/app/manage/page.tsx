// Owner-only: manage categories + subcategories.
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Sub = { id: string; name: string; type: string | null };
type Cat = { id: string; name: string; subcategories: Sub[] };

export default function Manage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [role, setRole] = useState('');
  const [catName, setCatName] = useState('');
  const [selected, setSelected] = useState('');
  const [subName, setSubName] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invites, setInvites] = useState<{ id: string; email: string; token: string; expiresAt: string }[]>([]);
  const router = useRouter();

  async function load() {
    const me = await (await fetch('/api/auth/me')).json();
    setRole(me.role);
    const c = await (await fetch('/api/categories')).json();
    setCats(c.categories ?? []);
    if (!selected && (c.categories ?? []).length) setSelected(c.categories[0].id);
    const inv = await (await fetch('/api/invites')).json();
    setInvites(inv.invites ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  if (role && role !== 'owner') {
    return <div className="card wide"><h2>Household Settings</h2><p className="muted">Only the household owner can manage categories and subcategories.</p></div>;
  }

  async function sendInvite() {
    setError(''); setMsg('');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inviteEmail)) { setError('Enter a valid email'); return; }
    const res = await fetch('/api/invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail }) });
    const d = await res.json();
    if (res.ok) {
      setInviteEmail(''); setMsg('Invite sent. Link: ' + (d.link || '(email sent)'));
      await load();
    } else { setError(d.error || 'Failed to send invite'); }
  }

  async function addCat() {
    setError(''); setMsg('');
    if (!catName.trim()) { setError('Enter a category name'); return; }
    const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: catName }) });
    if (res.ok) { setCatName(''); setMsg('Category added'); await load(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Failed to add'); }
  }
  async function delCat(id: string) {
    if (!confirm('Delete this category? Transactions using it stay but the category is hidden.')) return;
    await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
    if (selected === id) setSelected(''); await load();
  }
  async function addSub() {
    setError(''); setMsg('');
    if (!selected) { setError('Pick a category first'); return; }
    if (!subName.trim()) { setError('Enter a subcategory name'); return; }
    const res = await fetch('/api/subcategories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId: selected, name: subName }) });
    if (res.ok) { setSubName(''); setMsg('Subcategory added'); await load(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Failed to add'); }
  }
  async function delSub(id: string) {
    await fetch(`/api/subcategories?id=${id}`, { method: 'DELETE' });
    await load();
  }

  const current = cats.find((c) => c.id === selected);

  return (
    <div>
      <div className="card wide">
        <h2>Household Settings</h2>
        <p className="muted">Add categories and subcategories for your household.</p>

        <h3>Categories</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="New category name" />
          <button className="btn" style={{ width: 'auto', padding: '10px 18px' }} onClick={addCat}>Add Category</button>
        </div>
        <ul className="manage-list">
          {cats.map((c) => (
            <li key={c.id}>
              <span>{c.name}</span>
              <button className="btn secondary" style={{ width: 'auto', padding: '6px 14px' }} onClick={() => delCat(c.id)}>Delete</button>
            </li>
          ))}
        </ul>

        <h3 style={{ marginTop: 18 }}>Invite Members</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="member@example.com" />
          <button className="btn" style={{ width: 'auto', padding: '10px 18px' }} onClick={sendInvite}>Send Invite</button>
        </div>
        <ul className="manage-list">
          {invites.map((i) => (
            <li key={i.id}><span>{i.email} · expires {new Date(i.expiresAt).toLocaleDateString()}</span></li>
          ))}
          {invites.length === 0 && <li><span>No pending invites.</span></li>}
        </ul>

        <h3 style={{ marginTop: 18 }}>Subcategories</h3>
        <label>Category</label>
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Select a category</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="New subcategory" />
          <button className="btn" style={{ width: 'auto', padding: '10px 18px' }} onClick={addSub}>Add Subcategory</button>
        </div>
        {current && (
          <ul className="manage-list">
            {current.subcategories.map((s) => (
              <li key={s.id}>
                <span>{s.name}</span>
                <button className="btn secondary" style={{ width: 'auto', padding: '6px 14px' }} onClick={() => delSub(s.id)}>Delete</button>
              </li>
            ))}
            {current.subcategories.length === 0 && <li><span className="muted">No subcategories yet.</span></li>}
          </ul>
        )}
        {error && <p className="error">{error}</p>}
        {msg && <p className="ok">{msg}</p>}
      </div>
    </div>
  );
}
