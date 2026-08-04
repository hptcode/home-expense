'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    });
    if (res.ok) router.push('/admin');
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Invalid secret'); }
    setBusy(false);
  }

  return (
    <div className="auth">
      <div className="card">
        <h2>Site Admin Login</h2>
        <form onSubmit={login}>
          <label>Admin Secret</label>
          <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Enter the SITE_ADMIN_SECRET" />
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>Login</button>
        </form>
      </div>
    </div>
  );
}
