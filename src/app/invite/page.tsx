// Accept a household invite. If logged in with the invited email -> accept.
// Otherwise show the link / prompt to sign up or log in with that email.
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Invite() {
  const [token, setToken] = useState('');
  const [me, setMe] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token') ?? '';
    setToken(t);
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setMe(d.userId ? d : null));
  }, []);

  async function accept() {
    setStatus('busy'); setMessage('');
    const res = await fetch('/api/invites/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    const d = await res.json();
    if (res.ok) { setStatus('done'); setMessage('You have joined the household. Redirecting...'); setTimeout(() => router.push('/'), 1200); }
    else { setStatus('error'); setMessage(d.error || 'Could not accept invite'); }
  }

  return (
    <div className="card wide auth">
      <h2>Household Invitation</h2>
      {!token && <p className="error">This invitation link is missing its token.</p>}
      {token && !me && (
        <div>
          <p>You have been invited to join a household. Sign in or create an account with the invited email address to accept.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => router.push('/login?next=/invite?token=' + encodeURIComponent(token))}>Log in</button>
            <button className="btn secondary" onClick={() => router.push('/signup?next=/invite?token=' + encodeURIComponent(token))}>Sign up</button>
          </div>
        </div>
      )}
      {token && me && status !== 'done' && (
        <div>
          <p>Signed in as <strong>{me.email}</strong>.</p>
          <button className="btn" disabled={status === 'busy'} onClick={accept}>
            {status === 'busy' ? 'Joining...' : 'Accept invitation and join household'}
          </button>
        </div>
      )}
      {status === 'done' && <p className="ok">{message}</p>}
      {status === 'error' && <p className="error">{message}</p>}
    </div>
  );
}
