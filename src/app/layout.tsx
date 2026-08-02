import './globals.css';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/session';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import LogoutButton from '@/components/LogoutButton';

export const metadata: Metadata = { title: 'Home Expense', description: 'Self-hosted household expense tracker' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let role: string | null = null;
  let siteAdmin = false;
  let authed = false;
  try {
    const token = (await cookies()).get('he_session')?.value;
    const userId = await getSessionUser(token);
    if (userId) {
      const [u] = await db.select({ role: users.role, siteAdmin: users.siteAdmin, deletedAt: users.deletedAt })
        .from(users).where(eq(users.id, userId)).limit(1);
      if (u && !u.deletedAt) { authed = true; role = u.role; siteAdmin = !!u.siteAdmin; }
    }
  } catch { /* not authed */ }

  const links: { href: string; label: string }[] = [
    { href: '/', label: '🏠 Home' },
    { href: '/transactions', label: '➕ Add Expense' },
    { href: '/reports', label: '📊 Reports' },
    { href: '/all-expenses', label: '📋 All Expenses' },
  ];
  if (role === 'owner') links.push({ href: '/manage', label: '⚙ Manage' });
  if (siteAdmin) links.push({ href: '/admin', label: '🛡 Admin' });

  return (
    <html lang="en">
      <body>
        <header className="header">
          <span className="brand">🏠 Home Expense</span>
          <nav className="nav">
            {links.map((l) => (<a key={l.href} href={l.href}>{l.label}</a>))}
            {authed ? <LogoutButton /> : <a href="/login">Log in</a>}
          </nav>
        </header>
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
