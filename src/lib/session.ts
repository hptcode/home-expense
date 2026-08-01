// DB-backed sessions. The token (32 bytes hex) is generated here, stored
// hashed in sessions.id. The plaintext token is set ONLY as an HTTP-only
// Secure cookie by the caller. Revocation = delete the row (ADR-0002).
import { db } from '../db';
import { sessions } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { randomToken, sha256Hex } from './ids';

export const SESSION_COOKIE = 'he_session';
const SESSION_TTL_DAYS = 30;

export async function createSession(userId: string): Promise<string> {
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  await db.insert(sessions).values({ id: tokenHash, userId, expiresAt });
  return token; // caller sets this as the cookie value (NEVER the hash)
}

export async function getSessionUser(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const [row] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.id, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row?.userId ?? null;
}

export async function destroySession(token: string): Promise<void> {
  if (!token) return;
  const tokenHash = await sha256Hex(token);
  await db.delete(sessions).where(eq(sessions.id, tokenHash));
}
