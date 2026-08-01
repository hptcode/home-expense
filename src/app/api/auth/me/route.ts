import { NextResponse } from 'next/server';
import { getAuthContext } from '@/auth/current-user';
export async function GET(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  return NextResponse.json({ userId: ctx.userId, email: ctx.email, role: ctx.role, householdId: ctx.householdId });
}
