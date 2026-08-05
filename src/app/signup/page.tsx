'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [nextPath, setNextPath] = useState('/dashboard');
  const [inviteToken, setInviteToken] = useState('');
  const router = useRouter();
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const next = p.get('next');
    if (next) setNextPath(next);
    // Extract token from a ?next=/invite?token=XYZ redirect target
    const tokenFromNext = next ? new URLSearchParams(next.split('?')[1] || '').get('token') : '';
    setInviteToken(tokenFromNext ?? '');
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, householdName, inviteToken: inviteToken || null }),
    });
    if (res.ok) { router.push(nextPath); router.refresh(); }
    else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Signup failed');
      setBusy(false);
    }
  }

  return (
    <div className="auth"><div className="card">
      <h1>{inviteToken ? 'Join household' : 'Create your account'}</h1>
      <form onSubmit={submit}>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Password</label>
        <div style={{ position: 'relative' }}>
          <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} style={{ paddingRight: 36, width: '100%' }} />
          <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16, padding: '4px 6px' }}>{showPw ? '👁' : '👁‍🗨'}</button>
        </div>
        {!inviteToken && (
          <>
            <label>Household name (optional)</label>
            <input value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="My Household" />
          </>
        )}
        <button type="submit" disabled={busy}>{busy ? 'Creating…' : (inviteToken ? 'Join household' : 'Create account')}</button>
      </form>
      {error && <p className="error">{error}</p>}
      <p className="muted">Already have an account? <a href="/login">Log in</a></p>
    </div></div>
  );
}
