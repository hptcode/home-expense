import { NextResponse } from 'next/server';
import { db } from '@/db';
import { auditLog } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { isSiteAdmin } from '@/lib/admin-auth';

export async function GET(req: Request) {
  if (!(await isSiteAdmin(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const url = new URL(req.url);
  const householdId = url.searchParams.get('householdId');
  if (!householdId) return NextResponse.json({ error: 'householdId required' }, { status: 400 });

  const rows = await db.select()
    .from(auditLog)
    .where(eq(auditLog.householdId, householdId))
    .orderBy(desc(auditLog.createdAt))
    .limit(200);

  return NextResponse.json({ rows });
}
