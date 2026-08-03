'use client';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';

type Link = { href: string; label: string };
export default function SiteHeader({ authed, role, siteAdmin }: { authed: boolean; role: string | null; siteAdmin: boolean }) {
  const pathname = usePathname();
  // Auth pages show ONLY the brand (the form carries its own button).
  const isAuth = pathname === '/login' || pathname === '/signup' || pathname === '/invite';
  if (isAuth) {
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
        {authed ? <LogoutButton /> : null}
      </nav>
    </header>
  );
}
