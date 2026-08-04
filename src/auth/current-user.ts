// Resolves the authenticated user + household for a request. Every query in
// the app MUST route tenant scoping through the returned householdId (ADR-0001).
import { db } from '../db';
import { users, households } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getSessionUser, SESSION_COOKIE } from '../lib/session';

export type AuthContext = {
  userId: string;
  householdId: string;
  role: 'owner' | 'member' | 'site_admin';
  email: string;
};

export async function getAuthContext(req: Request): Promise<AuthContext | null> {
  // Check for site admin cookie first (stateless, no DB).
  const adminCookie = parseCookie(req.headers.get('cookie') ?? '')['he_admin'];
  if (adminCookie) {
    const { verifyAdminToken } = await import('@/lib/admin-auth');
    if (await verifyAdminToken(adminCookie, process.env.SITE_ADMIN_SECRET)) {
      // Site admin — no household/user context, just the role.
      return { userId: '', householdId: '', role: 'site_admin', email: '' };
    }
  }
  const cookie = req.headers.get('cookie') ?? '';
  const token = parseCookie(cookie)[SESSION_COOKIE];
  const userId = await getSessionUser(token);
  if (!userId) return null;
  const [u] = await db
    .select({ householdId: users.householdId, role: users.role, email: users.email, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u || u.deletedAt) return null;
  return { userId, householdId: u.householdId, role: u.role, email: u.email };
}

export function parseCookie(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k) out[k] = decodeURIComponent(v.join('='));
  }
  return out;
}

