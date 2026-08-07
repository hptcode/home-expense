import { NextResponse } from 'next/server';
import { db } from '@/db';
import { households } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthContext } from '@/auth/current-user';

export async function PATCH(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (ctx.role !== 'owner') return NextResponse.json({ error: 'only the owner can change household settings' }, { status: 403 });
  const { timezone } = await req.json();
  try { Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(); }
  catch { return NextResponse.json({ error: 'invalid timezone' }, { status: 400 }); }
  const [household] = await db.update(households).set({ timezone }).where(eq(households.id, ctx.householdId)).returning({ timezone: households.timezone });
  return NextResponse.json({ timezone: household.timezone });
}
