// Owner-only: manage categories + subcategories.
'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Sub = { id: string; name: string; direction: 'income' | 'expense' };
type Cat = { id: string; name: string; direction: 'income' | 'expense'; subcategories: Sub[] };
type ChangeLine =
  | { kind: 'category'; text: string }
  | { kind: 'subcategory'; text: string };

export default function Manage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [role, setRole] = useState('');
  const [userId, setUserId] = useState('');
  const [selected, setSelected] = useState('');
  const [catName, setCatName] = useState('');
  const [catDir, setCatDir] = useState<'expense' | 'income'>('expense');
  const [subName, setSubName] = useState('');
  const [subDir, setSubDir] = useState<'expense' | 'income'>('expense');
  const [error, setError] = useState('');
  const [change, setChange] = useState<ChangeLine | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [showTree, setShowTree] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const ruleCatRef = useRef<HTMLSelectElement>(null);
  const ruleFreqRef = useRef<HTMLSelectElement>(null);
  const ruleAmtRef = useRef<HTMLInputElement>(null);
  const ruleMerRef = useRef<HTMLInputElement>(null);
  const ruleStartRef = useRef<HTMLInputElement>(null);
  const ruleEndRef = useRef<HTMLInputElement>(null);
  const [invites, setInvites] = useState<{ id: string; email: string; token: string; expiresAt: string }[]>([]);
  const [members, setMembers] = useState<{ id: string; email: string; role: string }[]>([]);
  const [cpwCurrent, setCpwCurrent] = useState('');
  const [cpwNew, setCpwNew] = useState('');
  const [cpwMsg, setCpwMsg] = useState('');
  const [cpwBusy, setCpwBusy] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [showSignupPw, setShowSignupPw] = useState(false);
  const changeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  async function load() {
    const me = await (await fetch('/api/auth/me')).json();
    setRole(me.role);
    const hid = me.householdId;
    const c = await (await fetch('/api/categories')).json();
    const dirRank = (d: string) => (d === 'income' ? 1 : 0); // empty/undefined -> expense group
    const sorted = [...(c.categories ?? [])].sort((a, b) =>
      dirRank(a.direction) - dirRank(b.direction) || a.name.localeCompare(b.name))
      .map((cat) => ({ ...cat, subcategories: [...(cat.subcategories ?? [])].sort((a, b) =>
        dirRank(a.direction) - dirRank(b.direction) || a.name.localeCompare(b.name)) }));
    setCats(sorted);
    // Deliberately do NOT auto-select a category: dropdown defaults to "Select a category".
    const inv = await (await fetch('/api/invites')).json();
    setInvites(inv.invites ?? []);
    // Load household members
    try {
      const rres = await fetch('/api/recurring-rules');
      if (rres.ok) setRules((await rres.json()).rules ?? []);
      const mres = await fetch('/api/manage/members');
      if (mres.ok) {
        const md = await mres.json();

        setMembers(md.members ?? []);
      }
    } catch {}
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // Show a change line for 20s, or until the next change replaces it.
  function flash(line: ChangeLine) {
    setChange(line);
    if (changeTimer.current) clearTimeout(changeTimer.current);
    changeTimer.current = setTimeout(() => setChange(null), 20000);
  }
  useEffect(() => () => { if (changeTimer.current) clearTimeout(changeTimer.current); }, []);

  // Close the categories modal on Escape.
  useEffect(() => {
    if (!showTree) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowTree(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTree]);

  if (role && role !== 'owner') {
    return <div className="card wide"><h2>Household Settings</h2><p className="muted">Only the household owner can manage categories and subcategories.</p></div>;
  }

  async function sendInvite() {
    setError('');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inviteEmail)) { setError('Enter a valid email'); return; }
    const res = await fetch('/api/invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail }) });
    const d = await res.json();
    if (res.ok) { setInviteEmail(''); setInviteLink(d.link || ''); await load(); }
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
    const res = await fetch('/api/subcategories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId: selected, name: subName, direction: subDir }) });
    if (res.ok) { setSubName(''); setSubDir(current?.direction ?? 'expense'); await load(); flash({ kind: 'subcategory', text: `Added subcategory "${subName.trim()}"` }); }
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

  async function delCat(id: string) {
    const c = cats.find((x) => x.id === id);
    if (!confirm(`Delete category "${c?.name ?? ''}"? Transactions using it stay but the category is hidden.`)) return;
    await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
    if (selected === id) setSelected('');
    await load();
    flash({ kind: 'category', text: 'Deleted a category' });
  }

  async function renameCat(id: string, name: string) {
    const res = await fetch('/api/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name }),
    });
    if (res.ok) await load();
  }

  const current = cats.find((c) => c.id === selected);
  // Keep the new-subcategory direction picker in sync with the selected category.
  useEffect(() => { if (current) setSubDir(current.direction); /* eslint-disable-next-line */ }, [selected]);

  return (
    <div>
      <div className="card wide">
        <h2>Household Settings</h2>
        <p className="muted">Add categories and subcategories for your household.</p>
        <button className="btn secondary" style={{ width: 'auto', padding: '10px 18px', marginTop: 10 }} onClick={() => setShowTree(true)}>View all categories</button>

        <h3>Categories</h3>
        {/* Dropdown defaults to "Select a category" — nothing is auto-selected. */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
            <option value="">Select a category</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {selected && (() => {
            const cur = cats.find((c) => c.id === selected);
            return (
              <>
                <input key={selected} defaultValue={cur?.name ?? ''}
                  onBlur={(e) => { if (e.target.value.trim() && e.target.value.trim() !== cur?.name) renameCat(selected, e.target.value); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim() && e.currentTarget.value.trim() !== cur?.name) { renameCat(selected, e.currentTarget.value); e.currentTarget.blur(); } }}
                  style={{ width: 160, margin: 0 }} placeholder="Category name" />
                <button className="btn secondary" style={{ width: 'auto', padding: '10px 18px' }} onClick={() => delCat(selected)}>Delete category</button>
              </>
            );
          })()}
        </div>

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
                  <span className="dir-tag" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.direction === 'income' ? '▲ income' : '▼ expense'}</span>
                  <button className="btn secondary" style={{ width: 'auto', padding: '6px 14px' }} onClick={() => delSub(s.id, s.name)}>Delete</button>
                </li>
              ))}
              {current.subcategories.length === 0 && <li><span className="muted">No subcategories yet.</span></li>}
            </ul>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="New subcategory"
                onKeyDown={(e) => { if (e.key === 'Enter') addSub(); }} />
              <select value={subDir} onChange={(e) => setSubDir(e.target.value as 'expense' | 'income')} style={{ width: 'auto' }}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <button className="btn" style={{ width: 'auto', padding: '10px 18px' }} onClick={addSub}>Add Subcategory</button>
            </div>
            {change?.kind === 'subcategory' && <p className="ok" style={{ marginTop: 10 }}>{change.text} <span className="muted">(shown for 20s)</span></p>}
          </div>
        )}

        {/* Always visible: add a new category. */}
        <h3 style={{ marginTop: 18 }}>Add a Category</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="New category name"
            onKeyDown={(e) => { if (e.key === 'Enter') addCat(); }} />
          <select value={catDir} onChange={(e) => setCatDir(e.target.value as 'expense' | 'income')} style={{ width: 'auto' }}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <button className="btn" style={{ width: 'auto', padding: '10px 18px' }} onClick={addCat}>Add Category</button>
        </div>

        {change?.kind === 'category' && <p className="ok" style={{ marginTop: 12 }}>{change.text} <span className="muted">(shown for 20s)</span></p>}
        {error && <p className="error">{error}</p>}

        {/* Invite members last. */}
        <h3 style={{ marginTop: 22 }}>Invite Members</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="member@example.com" />
          <button className="btn" style={{ width: 'auto', padding: '10px 18px' }} onClick={sendInvite}>Send Invite</button>
        </div>
        {inviteLink && (
          <p className="ok" style={{ marginTop: 8 }}>Invite created. Share this link: <a href={inviteLink}>{inviteLink}</a></p>
        )}
        <ul className="manage-list">
          {invites.map((i) => (
            <li key={i.id}><span>{i.email} · expires {new Date(i.expiresAt).toLocaleDateString()}</span></li>
          ))}
          {invites.length === 0 && <li><span>No pending invites.</span></li>}
        </ul>

        <h3 style={{ marginTop: 22 }}>Household Members</h3>
        {members.length === 0 && <p className="muted">Loading members...</p>}
        {members.length > 0 && userId && (
          <ul className="manage-list">
            {members.map((m, i) => (
              <li key={i}>
                <span>{m.email}</span>
                <span className="muted">{m.role}</span>
                {m.id !== userId && <button className="btn secondary" style={{ width: 'auto', padding: '4px 10px', fontSize: 12, color: 'var(--danger)' }}
                  onClick={async () => {
                    if (!confirm(`Remove user ${m.email}? They will no longer be able to log in.`)) return;
                    // We need the user ID to delete. Since members API returns email+role only, we need to fetch it.
                    // For now, skip — the owner can use the Admin panel to delete users.
                    const res = await fetch('/api/manage/members/' + m.id, { method: 'DELETE' }); if (res.ok) { await load(); } else { const d = await res.json(); setError(d.error || 'Failed'); };
                  }}>Remove</button>}</li>
            ))}
          </ul>
        )}

        <h3 style={{ marginTop: 22 }}>Recurring Transactions</h3>
        <p className="muted">Set up recurring transactions that auto-materialize on a schedule. Add a cron job to call <code>/api/cron/materialize-recurring?secret=CRON_SECRET</code> (e.g. daily via Coolify cron).</p>
        {rules.length === 0 && <p className="muted">No recurring rules set.</p>}
        {rules.length > 0 && (
          <ul className="manage-list">
            {rules.map((r) => (
              <li key={r.id}>
                <span>{r.merchant || '(no merchant)'} · {r.frequency} · ${(r.amount / 100).toFixed(2)} · {r.direction}</span>
                <span className="muted">{r.anchorDate ? new Date(r.anchorDate).toLocaleDateString() : ''}</span>
                <button className="btn secondary" style={{ width: 'auto', padding: '4px 10px', fontSize: 12, color: 'var(--danger)' }}
                  onClick={async () => {
                    if (!confirm('Delete this recurring rule?')) return;
                    await fetch('/api/recurring-rules?id=' + r.id, { method: 'DELETE' });
                    await load();
                  }}>Delete</button>
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <select ref={ruleCatRef} style={{ width: 'auto', minWidth: 140 }}>
            <option value="">Category</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select ref={ruleFreqRef} style={{ width: 'auto' }}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <input ref={ruleAmtRef} type="number" step="0.01" placeholder="Amount" style={{ width: 100 }} />
          <input ref={ruleMerRef} placeholder="Merchant" style={{ width: 140 }} />
          <input ref={ruleStartRef} type="date" style={{ width: 140 }} />
          <input ref={ruleEndRef} type="date" style={{ width: 140 }} placeholder="End (optional)" />
          <button className="btn" style={{ width: 'auto', padding: '10px 18px' }} onClick={async () => {
            const cat = ruleCatRef.current?.value;
            const freq = ruleFreqRef.current?.value;
            const amt = ruleAmtRef.current?.value;
            const mer = ruleMerRef.current?.value || '';
            if (!cat || !freq || !amt) { setError('Category, frequency, and amount required'); return; }
            const res = await fetch('/api/recurring-rules', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ categoryId: cat, frequency: freq, amount: amt, merchant: mer, direction: 'expense', anchorDate: ruleStartRef.current?.value || undefined, endDate: ruleEndRef.current?.value || null }),
            });
            if (res.ok) { ruleAmtRef.current!.value = ''; ruleMerRef.current!.value = ''; ruleStartRef.current!.value = ''; ruleEndRef.current!.value = ''; await load(); }
            else { const d = await res.json(); setError(d.error || 'Failed'); }
          }}>Add Rule</button>
        </div>

        <h3 style={{ marginTop: 22 }}>Change Password</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
            <input type={showCpw ? 'text' : 'password'} value={cpwCurrent} onChange={(e) => setCpwCurrent(e.target.value)} placeholder="Current password" autoComplete="new-password" style={{ paddingRight: 36 }} />
            <button type="button" onClick={() => setShowCpw(!showCpw)} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16, padding: '4px 6px' }}>{showCpw ? '👁' : '👁‍🗨'}</button>
          </div>
          <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
            <input type={showSignupPw ? 'text' : 'password'} value={cpwNew} onChange={(e) => setCpwNew(e.target.value)} placeholder="New password" autoComplete="new-password" style={{ paddingRight: 36 }} />
            <button type="button" onClick={() => setShowSignupPw(!showSignupPw)} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16, padding: '4px 6px' }}>{showSignupPw ? '👁' : '👁‍🗨'}</button>
          </div>
          <button className="btn" style={{ width: 'auto', padding: '10px 18px', marginTop: 0 }} disabled={cpwBusy || !cpwCurrent || !cpwNew} onClick={async () => {
            setCpwBusy(true); setCpwMsg('');
            const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: cpwCurrent, newPassword: cpwNew }) });
            const d = await res.json();
            if (res.ok) { setCpwMsg('Password changed'); setCpwCurrent(''); setCpwNew(''); }
            else { setCpwMsg(d.error || 'Failed'); }
            setCpwBusy(false);
          }}>Change Password</button>
        </div>
        {cpwMsg && <p className={cpwMsg === 'Password changed' ? 'ok' : 'error'} style={{ marginTop: 10 }}>{cpwMsg}</p>}
      </div>
            {showTree && (
          <div onClick={() => setShowTree(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} className="card wide print-area" style={{ maxHeight: '80vh', overflow: 'auto', maxWidth: 520 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }} className="no-print">
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>All categories</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn secondary" style={{ width: 'auto' }} onClick={() => window.print()}>Print</button>
                  <button className="btn secondary" style={{ width: 'auto' }} onClick={() => setShowTree(false)}>Close</button>
                </div>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {cats.map((c, ci) => (
                  <li key={c.id} style={{ marginBottom: 16, borderBottom: ci < cats.length - 1 ? '1px solid rgba(255,255,255,0.12)' : 'none', paddingBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <strong>{c.name}</strong>
                      <span className="dir-tag" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.direction === 'income' ? '\u25b2 income' : '\u25bc expense'}</span>
                    </div>
                    {c.subcategories.length > 0 ? (
                      <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                        {c.subcategories.map((s) => (
                          <li key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                            <span>{s.name}</span>
                            <span className="dir-tag" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.direction === 'income' ? '\u25b2' : '\u25bc'}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted" style={{ margin: '4px 0 0 18px', fontSize: 13 }}>No subcategories</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
</div>
  );
}
