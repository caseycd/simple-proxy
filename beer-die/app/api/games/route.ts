import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const WITH_PLAYERS = `
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
`;

export async function GET(req: NextRequest) {
  const status = new URL(req.url).searchParams.get('status');
  const db = getDb();
  const sql = WITH_PLAYERS + (status ? 'WHERE g.status = ? ' : '') + 'ORDER BY g.started_at DESC LIMIT 50';
  return NextResponse.json(status ? db.prepare(sql).all(status) : db.prepare(sql).all());
}

export async function POST(req: NextRequest) {
  const { team1_p1, team1_p2, team2_p1, team2_p2, team1_name, team2_name, score_to_win } = await req.json();
  if (!team1_p1 || !team1_p2 || !team2_p1 || !team2_p2)
    return NextResponse.json({ error: 'All 4 players required' }, { status: 400 });
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO games (team1_p1, team1_p2, team2_p1, team2_p2, team1_name, team2_name, score_to_win) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(team1_p1, team1_p2, team2_p1, team2_p2, team1_name?.trim() || 'Team 1', team2_name?.trim() || 'Team 2', score_to_win || 11);
  return NextResponse.json(db.prepare('SELECT * FROM games WHERE id = ?').get(result.lastInsertRowid), { status: 201 });
}
