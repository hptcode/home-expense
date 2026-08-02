// Owner-only: manage categories + subcategories.
'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Sub = { id: string; name: string };
type Cat = { id: string; name: string; subcategories: Sub[] };
type ChangeLine =
  | { kind: 'category'; text: string }
  | { kind: 'subcategory'; text: string };

export default function Manage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [role, setRole] = useState('');
  const [selected, setSelected] = useState('');
  const [catName, setCatName] = useState('');
  const [subName, setSubName] = useState('');
  const [error, setError] = useState('');
  const [change, setChange] = useState<ChangeLine | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invites, setInvites] = useState<{ id: string; email: string; token: string; expiresAt: string }[]>([]);
  const changeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  async function load() {
    const me = await (await fetch('/api/auth/me')).json();
    setRole(me.role);
    const c = await (await fetch('/api/categories')).json();
    setCats(c.categories ?? []);
    // Deliberately do NOT auto-select a category: dropdown defaults to "Select a category".
    const inv = await (await fetch('/api/invites')).json();
    setInvites(inv.invites ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // Show a change line for 20s, or until the next change replaces it.
  function flash(line: ChangeLine) {
    setChange(line);
    if (changeTimer.current) clearTimeout(changeTimer.current);
    changeTimer.current = setTimeout(() => setChange(null), 20000);
  }
  useEffect(() => () => { if (changeTimer.current) clearTimeout(changeTimer.current); }, []);

  if (role && role !== 'owner') {
    return <div className="card wide"><h2>Household Settings</h2><p className="muted">Only the household owner can manage categories and subcategories.</p></div>;
  }

  async function sendInvite() {
    setError('');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inviteEmail)) { setError('Enter a valid email'); return; }
    const res = await fetch('/api/invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail }) });
    const d = await res.json();
    if (res.ok) { setInviteEmail(''); await load(); }
    else { setError(d.error || 'Failed to send invite'); }
  }

  async function addCat() {
    setError('');
    if (!catName.trim()) { setError('Enter a category name'); return; }
    const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: catName }) });
    if (res.ok) {
      const d = await res.json();
      setCatName('');
      await load();
      setSelected(d.category.id);
      flash({ kind: 'category', text: `Added category "${d.category.name}"` });
      router.refresh();
    } else { const d = await res.json().catch(() => ({})); setError(d.error || 'Failed to add'); }
  }

  async function addSub() {
    setError('');
    if (!selected) { setError('Pick a category first'); return; }
    if (!subName.trim()) { setError('Enter a subcategory name'); return; }
    const res = await fetch('/api/subcategories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId: selected, name: subName }) });
    if (res.ok) { setSubName(''); await load(); flash({ kind: 'subcategory', text: `Added subcategory "${subName.trim()}"` }); }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Failed to add'); }
  }
  async function renameSub(id: string, name: string) {
    setError('');
    if (!name.trim()) { setError('Enter a subcategory name'); return; }
    const res = await fetch('/api/subcategories', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name }) });
    if (res.ok) { await load(); flash({ kind: 'subcategory', text: `Renamed subcategory to "${name.trim()}"` }); }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Failed to rename'); }
  }
  async function delSub(id: string, name: string) {
    await fetch(`/api/subcategories?id=${id}`, { method: 'DELETE' });
    await load();
    flash({ kind: 'subcategory', text: `Deleted subcategory "${name}"` });
  }

  const current = cats.find((c) => c.id === selected);

  return (
    <div>
      <div className="card wide">
        <h2>Household Settings</h2>
        <p className="muted">Add categories and subcategories for your household.</p>

        <h3>Categories</h3>
        {/* Dropdown defaults to "Select a category" — nothing is auto-selected. */}
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Select a category</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Only after a category is selected: its subcategories + add field. */}
        {current && (
          <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14 }}>
            <h4 style={{ marginTop: 0, color: 'var(--primary)' }}>
              Subcategories of “{current.name}”
            </h4>
            <ul className="manage-list">
              {current.subcategories.map((s) => (
                <li key={s.id}>
                  <input defaultValue={s.name}
                    onBlur={(e) => { if (e.target.value.trim() && e.target.value.trim() !== s.name) renameSub(s.id, e.target.value); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim() && e.currentTarget.value.trim() !== s.name) { renameSub(s.id, e.currentTarget.value); e.currentTarget.blur(); } }} />
                  <button className="btn secondary" style={{ width: 'auto', padding: '6px 14px' }} onClick={() => delSub(s.id, s.name)}>Delete</button>
                </li>
              ))}
              {current.subcategories.length === 0 && <li><span className="muted">No subcategories yet.</span></li>}
            </ul>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="New subcategory"
                onKeyDown={(e) => { if (e.key === 'Enter') addSub(); }} />
              <button className="btn" style={{ width: 'auto', padding: '10px 18px' }} onClick={addSub}>Add Subcategory</button>
            </div>
          </div>
        )}

        {/* Always visible: add a new category. */}
        <h3 style={{ marginTop: 18 }}>Add a Category</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="New category name"
            onKeyDown={(e) => { if (e.key === 'Enter') addCat(); }} />
          <button className="btn" style={{ width: 'auto', padding: '10px 18px' }} onClick={addCat}>Add Category</button>
        </div>

        {change && <p className="ok" style={{ marginTop: 12 }}>{change.text} <span className="muted">(shown for 20s)</span></p>}
        {error && <p className="error">{error}</p>}

        {/* Invite members last. */}
        <h3 style={{ marginTop: 22 }}>Invite Members</h3>
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
      </div>
    </div>
  );
}
