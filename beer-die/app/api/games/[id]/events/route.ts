import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'edge';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const { results } = await db.prepare(`
    SELECT e.*,
      pt.name AS thrower_name, pt.nickname AS thrower_nick,
      pd.name AS defender_name, pd.nickname AS defender_nick
    FROM events e
    JOIN players pt ON pt.id = e.thrower_id
    LEFT JOIN players pd ON pd.id = e.defender_id
    WHERE e.game_id = ?
    ORDER BY e.id DESC
    LIMIT 100
  `).bind(id).all();
  return NextResponse.json(results);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const game = await db.prepare('SELECT * FROM games WHERE id = ?').bind(id).first() as any;
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  if (game.status === 'finished') return NextResponse.json({ error: 'Game already finished' }, { status: 400 });

  const { thrower_id, defender_id, team, throw_result, catch_result, note } = await req.json();
  if (!thrower_id || !team || !throw_result) {
    return NextResponse.json({ error: 'thrower_id, team, throw_result required' }, { status: 400 });
  }

  let points = 0;
  if (throw_result === 'sink') points = 2;
  else if (throw_result === 'island') points = 2;
  else if (throw_result === 'table' && catch_result === 'dropped') points = 1;

  const newT1 = game.team1_score + (team === 1 ? points : 0);
  const newT2 = game.team2_score + (team === 2 ? points : 0);
  const diff = Math.abs(newT1 - newT2);
  const gameOver = (newT1 >= game.score_to_win || newT2 >= game.score_to_win) && diff >= 2;
  const winner = gameOver ? (newT1 > newT2 ? 1 : 2) : null;

  const stmts: D1PreparedStatement[] = [
    db.prepare(`
      INSERT INTO events (game_id, thrower_id, defender_id, team, throw_result, catch_result, points_scored, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, thrower_id, defender_id || null, team, throw_result, catch_result || null, points, note || null),
    team === 1
      ? db.prepare('UPDATE games SET team1_score = team1_score + ? WHERE id = ?').bind(points, id)
      : db.prepare('UPDATE games SET team2_score = team2_score + ? WHERE id = ?').bind(points, id),
  ];

  if (gameOver && winner !== null) {
    stmts.push(
      db.prepare('UPDATE games SET status = ?, winner = ?, ended_at = unixepoch() WHERE id = ?')
        .bind('finished', winner, id)
    );
  }

  const batchResults = await db.batch(stmts);
  const eventId = batchResults[0].meta.last_row_id;

  const [event, updatedGame] = await Promise.all([
    db.prepare('SELECT * FROM events WHERE id = ?').bind(eventId).first(),
    db.prepare('SELECT * FROM games WHERE id = ?').bind(id).first(),
  ]);

  return NextResponse.json({ event, game: updatedGame }, { status: 201 });
}
