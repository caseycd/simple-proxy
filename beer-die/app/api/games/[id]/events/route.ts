import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(getDb().prepare(`
    SELECT e.*, pt.name AS thrower_name, pt.nickname AS thrower_nick,
      pd.name AS defender_name, pd.nickname AS defender_nick
    FROM events e
    JOIN players pt ON pt.id = e.thrower_id
    LEFT JOIN players pd ON pd.id = e.defender_id
    WHERE e.game_id = ? ORDER BY e.id DESC LIMIT 100
  `).all(id));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const game = db.prepare('SELECT * FROM games WHERE id=?').get(id) as any;
  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (game.status === 'finished') return NextResponse.json({ error: 'Game finished' }, { status: 400 });

  const { thrower_id, defender_id, team, throw_result, catch_result, note } = await req.json();
  if (!thrower_id || !team || !throw_result)
    return NextResponse.json({ error: 'thrower_id, team, throw_result required' }, { status: 400 });

  const points = throw_result === 'sink' || throw_result === 'island' ? 2
    : throw_result === 'table' && catch_result === 'dropped' ? 1 : 0;

  const event = db.transaction(() => {
    const ev = db.prepare(
      'INSERT INTO events (game_id,thrower_id,defender_id,team,throw_result,catch_result,points_scored,note) VALUES (?,?,?,?,?,?,?,?)'
    ).run(id, thrower_id, defender_id||null, team, throw_result, catch_result||null, points, note||null);
    db.prepare(team===1
      ? 'UPDATE games SET team1_score=team1_score+? WHERE id=?'
      : 'UPDATE games SET team2_score=team2_score+? WHERE id=?'
    ).run(points, id);
    const updated = db.prepare('SELECT * FROM games WHERE id=?').get(id) as any;
    if ((updated.team1_score >= updated.score_to_win || updated.team2_score >= updated.score_to_win)
        && Math.abs(updated.team1_score - updated.team2_score) >= 2) {
      db.prepare('UPDATE games SET status=?,winner=?,ended_at=unixepoch() WHERE id=?')
        .run('finished', updated.team1_score > updated.team2_score ? 1 : 2, id);
    }
    return db.prepare('SELECT * FROM events WHERE id=?').get(ev.lastInsertRowid);
  })();

  return NextResponse.json({ event, game: db.prepare('SELECT * FROM games WHERE id=?').get(id) }, { status: 201 });
}
