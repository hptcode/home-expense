import './globals.css';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/session';
import { db } from '@/db';
import { users, households } from '@/db/schema';
import { eq } from 'drizzle-orm';
import SiteHeader from '@/components/SiteHeader';
import AuthGate from '@/components/AuthGate';

export const metadata: Metadata = { title: 'Home Expense', description: 'Self-hosted household expense tracker' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let role: string | null = null;
  let email: string | null = null;
  let householdName: string | null = null;
  let siteAdmin = false;
  let authed = false;
  try {
    const token = (await cookies()).get('he_session')?.value;
    const userId = await getSessionUser(token);
    if (userId) {
      // Core auth MUST NOT depend on the optional site_admin column, so the
      // site_admin migration can never block login. Read only guaranteed
      // columns here; site_admin is read best-effort below.
      const [u] = await db
        .select({ role: users.role, email: users.email, householdId: users.householdId, deletedAt: users.deletedAt })
        .from(users).where(eq(users.id, userId)).limit(1);
      if (u && !u.deletedAt) {
        authed = true;
        role = u.role;
        email = u.email;
        // Look up household name from the user's household.
        try {
          const [hh] = await db
            .select({ name: households.name })
            .from(households).where(eq(households.id, u.householdId)).limit(1);
          householdName = hh?.name ?? null;
        } catch { /* ignore */ }
        // Check for stateless site admin cookie (env-based, no DB column needed).
        try {
          const adminCookie = (await cookies()).get('he_admin')?.value;
          if (adminCookie) {
            const { verifyAdminToken } = await import('@/lib/admin-auth');
            siteAdmin = await verifyAdminToken(adminCookie, process.env.SITE_ADMIN_SECRET);
          }
        } catch { /* admin cookie check failed — treat as false */ }
      }
    }
  } catch { /* not authed */ }

  return (
    <html lang="en">
      <body>
        <SiteHeader authed={authed} role={role} email={email} householdName={householdName} siteAdmin={siteAdmin} />
        <main className="main">
          <AuthGate authed={authed}>{children}</AuthGate>
        </main>
      </body>
    </html>
  );
}
