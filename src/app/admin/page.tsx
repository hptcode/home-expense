'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Household = { id: string; name: string; createdAt: string; users: number; transactions: number };
type User = { id: string; email: string; role: string; createdAt: string; householdName: string | null };

export default function Admin() {
  const [role, setRole] = useState('');
  const [households, setHouseholds] = useState<Household[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const me = await (await fetch('/api/auth/me')).json();
      if (me.role !== 'site_admin') { router.push('/admin/login'); return; }
      setRole(me.role);
      try {
        const [h, u] = await Promise.all([
          (await fetch('/api/admin/households')).json(),
          (await fetch('/api/admin/users')).json(),
        ]);
        setHouseholds(h.households ?? []);
        setUsers(u.users ?? []);
      } catch { setError('Failed to load'); }
    })();
    // eslint-disable-next-line
  }, []);

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
                <th>Name</th><th>Users</th><th>Transactions</th><th>Created</th>
              </tr>
            </thead>
            <tbody>
              {households.map((h) => (
                <tr key={h.id}>
                  <td>{h.name}</td>
                  <td>{h.users}</td>
                  <td>{h.transactions}</td>
                  <td>{new Date(h.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card wide" style={{ marginTop: 14 }}>
        <h3>Users</h3>
        {users.length === 0 && <p className="muted">No users yet.</p>}
        {users.length > 0 && (
          <table className="exp-table">
            <thead>
              <tr>
                <th>Email</th><th>Role</th><th>Household</th><th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.householdName || '—'}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
