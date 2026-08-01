'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Me = { email: string; role: string } | null;

export default function Home() {
  const [me, setMe] = useState<Me>(null);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setMe(d); setLoaded(true); })
      .catch(() => { setLoaded(true); });
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setMe(null);
    router.refresh();
  }

  return (
    <div className="card">
      <h1>Home Expense</h1>
      {!loaded && <p className="muted">Loading…</p>}
      {loaded && !me && (
        <>
          <p>You are not signed in.</p>
          <p className="muted"><a href="/login">Log in</a> &nbsp;·&nbsp; <a href="/signup">Create an account</a></p>
        </>
      )}
      {me && (
        <>
          <p>Signed in as <strong>{me.email}</strong> ({me.role}).</p>
          <p className="muted">This is the foundation. Transactions, categories and reports come next.</p>
          <p className="muted"><a href="/transactions">View transactions</a></p>
          <button onClick={logout}>Log out</button>
        </>
      )}
    </div>
  );
}
