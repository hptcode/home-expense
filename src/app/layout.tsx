import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Home Expense', description: 'Self-hosted household expense tracker' };

const links = [
  { href: '/', label: '🏠 Home' },
  { href: '/transactions', label: '📋 Transactions' },
  { href: '/reports', label: '📊 Reports' },
  { href: '/login', label: 'Log in' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <span className="brand">🏠 Home Expense</span>
          <nav className="nav">
            {links.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </nav>
        </header>
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
