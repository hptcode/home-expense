// Site admin: list + remove households and users. Gated by SITE_ADMIN_SECRET.
'use client';
import { useEffect, useState } from 'react';

type HH = { id: string; name: string; baseCurrency: string; createdAt: string; members: number };
type U = { id: string; email: string; role: string; householdId: string; householdName: string | null; createdAt: string };

export default function Admin() {
  const [ok, setOk] = useState<boolean | null>(null);
  const [households, setHouseholds] = useState<HH[]>([]);
  const [users, setUsers] = useState<U[]>([]);

  async function load() {
    const h = await fetch('/api/admin/households');
    if (h.status === 403) { setOk(false); return; }
    setOk(true);
    const hd = await h.json(); setHouseholds(hd.households ?? []);
    const u = await (await fetch('/api/admin/users')).json(); setUsers(u.users ?? []);
  }
  useEffect(() => { load(); }, []);

  if (ok === false) return <div className="card wide"><h2>Site Admin</h2><p className="error">Access denied. Site admin is disabled or the secret is missing.</p></div>;
  if (ok === null) return <div className="card wide"><h2>Site Admin</h2><p className="muted">Loading...</p></div>;

  async function removeHH(id: string) {
    if (!confirm('Remove this household and ALL its data (members, transactions, categories)?')) return;
    await fetch('/api/admin/households?id=' + id, { method: 'DELETE' });
    await load();
  }
  async function removeU(id: string) {
    if (!confirm('Remove this user? Their household remains if others belong to it.')) return;
    await fetch('/api/admin/users?id=' + id, { method: 'DELETE' });
    await load();
  }

  return (
    <div>
      <div className="card wide">
        <h2>Site Admin - Households</h2>
        <table className="exp-table">
          <thead><tr><th>Name</th><th>Currency</th><th>Members</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {households.map((h) => (
              <tr key={h.id}>
                <td>{h.name}</td><td>{h.baseCurrency}</td><td>{h.members}</td>
                <td>{new Date(h.createdAt).toLocaleDateString()}</td>
                <td><button className="btn secondary" onClick={() => removeHH(h.id)}>Remove</button></td>
              </tr>
            ))}
            {households.length === 0 && <tr><td colSpan={5} className="muted">No households.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card wide" style={{ marginTop: 14 }}>
        <h2>Site Admin - Users</h2>
        <table className="exp-table">
          <thead><tr><th>Email</th><th>Role</th><th>Household</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td><td>{u.role}</td><td>{u.householdName ?? '—'}</td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td><button className="btn secondary" onClick={() => removeU(u.id)}>Remove</button></td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={5} className="muted">No users.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
