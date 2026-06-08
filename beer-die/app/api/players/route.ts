import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'edge';

export async function GET() {
  const db = getDb();
  const { results } = await db.prepare('SELECT * FROM players ORDER BY name ASC').all();
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const { name, nickname } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  const db = getDb();
  const result = await db.prepare('INSERT INTO players (name, nickname) VALUES (?, ?)').bind(name.trim(), nickname?.trim() || null).run();
  const player = await db.prepare('SELECT * FROM players WHERE id = ?').bind(result.meta.last_row_id).first();
  return NextResponse.json(player, { status: 201 });
}
