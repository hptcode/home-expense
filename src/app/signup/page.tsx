'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, householdName }),
    });
    if (res.ok) { router.push('/'); router.refresh(); }
    else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Signup failed');
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h1>Create your account</h1>
      <form onSubmit={submit}>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        <label>Household name (optional)</label>
        <input value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="My Household" />
        <button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      {error && <p className="error">{error}</p>}
      <p className="muted">Already have an account? <a href="/login">Log in</a></p>
    </div>
  );
}
