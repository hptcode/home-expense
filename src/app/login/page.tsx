'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) { router.push('/dashboard'); router.refresh(); }
    else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Login failed');
      setBusy(false);
    }
  }

  return (
    <div className="auth"><div className="card">
      <h1>Log in</h1>
      <form onSubmit={submit}>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="login-submit" type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      {error && <p className="error">{error}</p>}
      <button type="button" className="forgot-button" onClick={() => setForgot(!forgot)}>{forgot ? 'Cancel password reset' : 'Forgot password?'}</button>
      {forgot && <form onSubmit={async (e) => { e.preventDefault(); setForgotMsg(''); const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); const d = await res.json(); setForgotMsg(d.message || 'If that email is registered, a reset link has been sent.'); }}><label>Account email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /><button className="btn" type="submit">Send reset link</button></form>}
      {forgotMsg && <p className="ok">{forgotMsg}</p>}
      <p className="muted">No account? <a href="/signup">Create one</a></p>
    </div></div>
  );
}
