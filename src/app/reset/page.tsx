'use client';
import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function ResetPasswordForm() {
  const params = useSearchParams(); const router = useRouter();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState(''); const [show, setShow] = useState(false); const [msg, setMsg] = useState(''); const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
    const d = await res.json();
    if (res.ok) { setMsg('Password reset successfully. You can now log in.'); setTimeout(() => router.push('/login'), 1200); } else setError(d.error || 'Reset failed');
  }
  return <div className="auth"><div className="card"><h1>Reset password</h1><form onSubmit={submit}><label>New password</label><div style={{ position: 'relative' }}><input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" style={{ paddingRight: 42 }} /><button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 4, top: 4, minHeight: 34, padding: '4px 8px', background: 'transparent', border: 0 }}>{show ? '👁' : '👁‍🗨'}</button></div><button className="btn" type="submit">Set new password</button></form>{msg && <p className="ok">{msg}</p>}{error && <p className="error">{error}</p>}</div></div>;
}

export default function ResetPassword() { return <Suspense fallback={<div className="auth"><div className="card">Loading…</div></div>}><ResetPasswordForm /></Suspense>; }
