import './globals.css';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/session';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import SiteHeader from '@/components/SiteHeader';
import AuthGate from '@/components/AuthGate';

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

  return (
    <html lang="en">
      <body>
        <SiteHeader authed={authed} role={role} siteAdmin={siteAdmin} />
        <main className="main">
          <AuthGate authed={authed}>{children}</AuthGate>
        </main>
      </body>
    </html>
  );
}
