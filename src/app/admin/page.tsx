'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Household = { id: string; name: string; createdAt: string; users: number; transactions: number };
type User = { id: string; email: string; role: string; createdAt: string; householdName: string | null; deletedAt: string | null };
type AuditEntry = { id: string; tableName: string; rowId: string; action: string; oldValues: string | null; newValues: string | null; performedBy: string | null; createdAt: string };

export default function Admin() {
  const [role, setRole] = useState('');
  const [households, setHouseholds] = useState<Household[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditRows, setAuditRows] = useState<AuditEntry[]>([]);
  const [auditHid, setAuditHid] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const [h, u] = await Promise.all([
        (await fetch('/api/admin/households')).json(),
        (await fetch('/api/admin/users')).json(),
      ]);
      setHouseholds(h.households ?? []);
      setUsers(u.users ?? []);
    } catch { setError('Failed to load'); }
  }, []);

  useEffect(() => {
    (async () => {
      const me = await (await fetch('/api/auth/me')).json();
      if (me.role !== 'site_admin') { router.push('/admin/login'); return; }
      setRole(me.role);
      await load();
    })();
    // eslint-disable-next-line
  }, []);

  async function action(url: string, msgOk: string) {
    setBusy(true); setError(''); setMsg('');
    const res = await fetch(url, { method: 'POST' });
    if (res.ok) { setMsg(msgOk); await load(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Action failed'); }
    setBusy(false);
  }

  async function changeRole(userId: string, role: string) {
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    await load();
  }

  async function deactivateUser(userId: string) {
    if (!confirm('Deactivate this user? They will not be able to log in.')) return;
    await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    await load();
  }

  async function loadAudit(householdId: string) {
    setAuditHid(householdId);
    if (!householdId) { setAuditRows([]); return; }
    const res = await (await fetch(`/api/admin/audit-log?householdId=${householdId}`)).json();
    setAuditRows(res.rows ?? []);
  }

  const totalTxns = households.reduce((s, h) => s + h.transactions, 0);
  const totalUsers = users.length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Site Administration</h2>
        <button className="btn secondary" style={{ width: 'auto', padding: '8px 16px' }}
          onClick={async () => { await fetch('/api/auth/admin-logout', { method: 'POST' }); router.push('/admin/login'); }}>
          Logout
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {msg && <p className="ok">{msg}</p>}

      <div className="stat-row" style={{ marginTop: 14 }}>
        <div className="stat total">
          <div className="label">Households</div>
          <div className="value">{households.length}</div>
        </div>
        <div className="stat">
          <div className="label">Total Users</div>
          <div className="value">{totalUsers}</div>
        </div>
        <div className="stat">
          <div className="label">Total Transactions</div>
          <div className="value">{totalTxns}</div>
        </div>
      </div>

      <div className="card wide" style={{ marginTop: 14 }}>
        <h3>Households</h3>
        {households.length === 0 && <p className="muted">No households yet.</p>}
        {households.length > 0 && (
          <table className="exp-table">
            <thead>
              <tr>
                <th>Name</th><th>Users</th><th>Transactions</th><th>Created</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {households.map((h) => (
                <tr key={h.id}>
                  <td>{h.name}</td>
                  <td>{h.users}</td>
                  <td>{h.transactions}</td>
                  <td>{new Date(h.createdAt).toLocaleDateString()}</td>
                  <td className="row-actions">
                    <button className="btn" style={{ fontSize: 12, padding: '4px 8px', margin: 0 }}
                      onClick={() => action(`/api/admin/households/${h.id}/deactivate`, 'Household deactivated')}
                      disabled={busy}>Deactivate</button>
                    <button className="btn secondary" style={{ fontSize: 12, padding: '4px 8px', margin: 0 }}
                      onClick={() => action(`/api/admin/households/${h.id}/activate`, 'Household reactivated')}
                      disabled={busy}>Activate</button>
                    <button className="btn secondary" style={{ fontSize: 12, padding: '4px 8px', margin: 0, color: 'var(--danger)' }}
                      onClick={() => { if (confirm('Delete this household and ALL its data? This cannot be undone.')) action(`/api/admin/households/${h.id}/delete`, 'Household deleted'); }}
                      disabled={busy}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted" style={{ marginTop: 8 }}>
          <strong>Answer:</strong> Yes — deleting a household hard-deletes the household row, and all transactions, categories, budgets, recurring rules, invites, and audit logs are cascade-deleted from the database. Users are deleted first (bypassing the restrict FK). Deactivate only soft-deletes users so they cannot log in; data remains.
        </p>
      </div>

      <div className="card wide" style={{ marginTop: 14 }}>
        <h3>Users</h3>
        {users.length === 0 && <p className="muted">No users yet.</p>}
        {users.length > 0 && (
          <table className="exp-table">
            <thead>
              <tr>
                <th>Email</th><th>Role</th><th>Household</th><th>Joined</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>
                    <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}>
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                      <option value="owner">owner</option>
                    </select>
                  </td>
                  <td>{u.householdName || '—'}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>{u.deletedAt ? <span style={{ color: 'var(--danger)' }}>Deactivated</span> : <span style={{ color: 'var(--secondary)' }}>Active</span>}</td>
                  <td className="row-actions">
                    <button className="btn secondary" style={{ fontSize: 12, padding: '4px 8px', margin: 0 }}
                      onClick={() => deactivateUser(u.id)} disabled={busy || !!u.deletedAt}>
                      {u.deletedAt ? '—' : 'Deactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card wide" style={{ marginTop: 14 }}>
        <h3>Audit Log</h3>
        <label>Household</label>
        <select value={auditHid} onChange={(e) => loadAudit(e.target.value)} style={{ width: 'auto' }}>
          <option value="">Select a household</option>
          {households.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        {auditRows.length === 0 && auditHid && <p className="muted" style={{ marginTop: 12 }}>No audit entries for this household.</p>}
        {auditRows.length > 0 && (
          <table className="exp-table">
            <thead>
              <tr>
                <th>Table</th><th>Action</th><th>Row ID</th><th>Performed By</th><th>When</th>
              </tr>
            </thead>
            <tbody>
              {auditRows.map((a) => (
                <tr key={a.id}>
                  <td>{a.tableName}</td>
                  <td>{a.action}</td>
                  <td style={{ fontSize: 11 }}>{a.rowId?.slice(0, 8)}…</td>
                  <td>{a.performedBy?.slice(0, 8) || '—'}…</td>
                  <td>{new Date(a.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}