import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Home Expense', description: 'Self-hosted household expense tracker' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav style={{ display: 'flex', gap: 16, padding: '12px 16px', borderBottom: '1px solid #1e293b', alignItems: 'center' }}>
          <strong>Home Expense</strong>
          <a href="/">Home</a>
          <a href="/transactions">Transactions</a>
          <a href="/reports">Reports</a>
          <a href="/login">Log in</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
