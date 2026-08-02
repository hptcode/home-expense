// Invite creation + acceptance (ADR-0001). Only the invited email may accept.
import { db } from '@/db';
import { invites, users, households } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { randomToken } from './ids';

export const INVITE_TTL_DAYS = 7;

export async function createInvite(householdId: string, invitedByUserId: string, email: string) {
  const token = randomToken(24);
  await db.insert(invites).values({
    householdId,
    invitedByUserId,
    email: email.toLowerCase().trim(),
    token,
    expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
  });
  return token;
}

export async function acceptInvite(token: string, userId: string): Promise<{ ok: boolean; error?: string }> {
  const [inv] = await db
    .select()
    .from(invites)
    .where(eq(invites.token, token))
    .limit(1);
  if (!inv) return { ok: false, error: 'Invite not found' };
  if (inv.acceptedAt) return { ok: false, error: 'Invite already used' };
  if (!inv.expiresAt || inv.expiresAt < new Date()) return { ok: false, error: 'Invite expired' };

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return { ok: false, error: 'User not found' };
  if (user.email.toLowerCase() !== inv.email.toLowerCase()) {
    return { ok: false, error: 'This invite was sent to a different email address' };
  }
  // Join: move user into the household as a member.
  await db.update(users).set({ householdId: inv.householdId, role: 'member' }).where(eq(users.id, userId));
  await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.token, token));
  return { ok: true };
}

export async function listInvites(householdId: string) {
  return db
    .select()
    .from(invites)
    .where(and(eq(invites.householdId, householdId), isNull(invites.acceptedAt)))
    .orderBy(invites.createdAt);
}
