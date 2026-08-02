// Site-admin context. There is no separate platform login in this app, so a
// site admin is identified by the boolean `site_admin` on users, verified via a
// shared bootstrap secret (SITE_ADMIN_SECRET). This is intentionally minimal:
// enough to operate a self-hosted instance (remove households/users).
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { parseCookie } from './current-user';

export type SiteAdminContext = { userId: string; email: string };

export async function getSiteAdminContext(req: Request): Promise<SiteAdminContext | null> {
  const secret = process.env.SITE_ADMIN_SECRET;
  if (!secret) return null; // site admin disabled until a secret is configured
  const header = req.headers.get('x-site-admin-secret');
  const cookie = parseCookie(req.headers.get('cookie') ?? '')[`he_sa_${secret.length}`] ?? '';
  const provided = header || cookie;
  if (provided !== secret) return null;

  // Resolve the acting admin user (first user flagged site_admin).
  const [admin] = await db
    .select({ userId: users.id, email: users.email })
    .from(users)
    .where(eq(users.siteAdmin, true))
    .limit(1);
  if (!admin) return null;
  return { userId: admin.userId, email: admin.email };
}
