'use client';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';

type Link = { href: string; label: string };
export default function SiteHeader({ authed, role, email, householdName, siteAdmin }: { authed: boolean; role: string | null; email: string | null; householdName: string | null; siteAdmin: boolean }) {
  const pathname = usePathname();
  // Auth pages show ONLY the brand (the form carries its own button).
  const isAuth = pathname === '/login' || pathname === '/signup' || pathname === '/invite';
  const isAdmin = pathname.startsWith('/admin');
  // Admin pages: show only the brand (no nav links — admin sees no household data).
  if (isAuth || isAdmin) {
    return (
      <header className="header">
        <a className="brand" href="/dashboard">🏠 Home Expense</a>
      </header>
    );
  }
  const links: Link[] = [
    { href: '/dashboard', label: '📊 Dashboard' },
    { href: '/transactions', label: '➕ Add Expense' },
    { href: '/all-expenses', label: '📋 All Expenses' },
  ];
  if (role === 'owner') links.push({ href: '/manage', label: '⚙ Manage' });
  if (role === 'owner') links.push({ href: '/budgets', label: '🎯 Budgets' });
  if (siteAdmin) links.push({ href: '/admin', label: '🛡 Admin' });
  return (
    <header className="header">
      <a className="brand" href="/dashboard">🏠 Home Expense</a>
      <nav className="nav">
        {links.map((l) => (<a key={l.href} href={l.href}>{l.label}</a>))}
        {authed ? <span className="muted" style={{ fontSize: 13, alignSelf: 'center' }}>{email?.split('@')[0]} · {householdName || 'Household=not set'}</span> : null}
        {authed ? <LogoutButton /> : null}
      </nav>
    </header>
  );
}
