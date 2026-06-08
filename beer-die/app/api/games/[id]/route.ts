import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'edge';

const GAME_SELECT = `
  SELECT g.*,
    p1.name AS t1p1_name, p1.nickname AS t1p1_nick,
    p2.name AS t1p2_name, p2.nickname AS t1p2_nick,
    p3.name AS t2p1_name, p3.nickname AS t2p1_nick,
    p4.name AS t2p2_name, p4.nickname AS t2p2_nick
  FROM games g
  JOIN players p1 ON p1.id = g.team1_p1
  JOIN players p2 ON p2.id = g.team1_p2
  JOIN players p3 ON p3.id = g.team2_p1
  JOIN players p4 ON p4.id = g.team2_p2
  WHERE g.id = ?
`;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const game = await db.prepare(GAME_SELECT).bind(id).first();
  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(game);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();
  const game = await db.prepare('SELECT * FROM games WHERE id = ?').bind(id).first() as any;
  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (body.action === 'finish') {
    const winner = game.team1_score > game.team2_score ? 1 : 2;
    await db.prepare('UPDATE games SET status = ?, winner = ?, ended_at = unixepoch() WHERE id = ?')
      .bind('finished', winner, id).run();
  } else if (body.action === 'undo_last') {
    const last = await db.prepare('SELECT * FROM events WHERE game_id = ? ORDER BY id DESC LIMIT 1').bind(id).first() as any;
    if (last) {
      await db.batch([
        db.prepare('UPDATE games SET team1_score = team1_score - ?, team2_score = team2_score - ? WHERE id = ?')
          .bind(last.team === 1 ? last.points_scored : 0, last.team === 2 ? last.points_scored : 0, id),
        db.prepare('DELETE FROM events WHERE id = ?').bind(last.id),
      ]);
    }
  }

  const updated = await db.prepare(GAME_SELECT).bind(id).first();
  return NextResponse.json(updated);
}
