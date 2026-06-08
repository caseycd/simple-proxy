import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const GAME_SELECT = `
  SELECT g.*, p1.name AS t1p1_name, p1.nickname AS t1p1_nick,
    p2.name AS t1p2_name, p2.nickname AS t1p2_nick,
    p3.name AS t2p1_name, p3.nickname AS t2p1_nick,
    p4.name AS t2p2_name, p4.nickname AS t2p2_nick
  FROM games g
  JOIN players p1 ON p1.id = g.team1_p1 JOIN players p2 ON p2.id = g.team1_p2
  JOIN players p3 ON p3.id = g.team2_p1 JOIN players p4 ON p4.id = g.team2_p2
  WHERE g.id = ?
`;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = getDb().prepare(GAME_SELECT).get(id);
  return game ? NextResponse.json(game) : NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(id) as any;
  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (body.action === 'finish') {
    const winner = game.team1_score >= game.team2_score ? 1 : 2;
    db.prepare('UPDATE games SET status=?, winner=?, ended_at=unixepoch() WHERE id=?').run('finished', winner, id);
  } else if (body.action === 'undo_last') {
    const last = db.prepare('SELECT * FROM events WHERE game_id=? ORDER BY id DESC LIMIT 1').get(id) as any;
    if (last) {
      db.prepare('UPDATE games SET team1_score=team1_score-?, team2_score=team2_score-? WHERE id=?')
        .run(last.team === 1 ? last.points_scored : 0, last.team === 2 ? last.points_scored : 0, id);
      db.prepare('DELETE FROM events WHERE id=?').run(last.id);
    }
  }
  return NextResponse.json(db.prepare(GAME_SELECT).get(id));
}
