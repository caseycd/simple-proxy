import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  return NextResponse.json(db.prepare('SELECT * FROM players ORDER BY name ASC').all());
}

export async function POST(req: NextRequest) {
  const { name, nickname } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  const db = getDb();
  const result = db.prepare('INSERT INTO players (name, nickname) VALUES (?, ?)').run(name.trim(), nickname?.trim() || null);
  return NextResponse.json(db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid), { status: 201 });
}
