import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'edge';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const player = await db.prepare('SELECT * FROM players WHERE id = ?').bind(id).first() as any;
  if (!player) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [statsRow, gamesResult] = await Promise.all([
    db.prepare(`
      SELECT
        COUNT(CASE WHEN e.thrower_id = p.id THEN 1 END) AS throws,
        COUNT(CASE WHEN e.thrower_id = p.id AND e.throw_result = 'sink' THEN 1 END) AS sinks,
        COUNT(CASE WHEN e.thrower_id = p.id AND e.throw_result = 'table' THEN 1 END) AS table_hits,
        COUNT(CASE WHEN e.thrower_id = p.id AND e.throw_result = 'off_table' THEN 1 END) AS off_tables,
        COUNT(CASE WHEN e.thrower_id = p.id AND e.throw_result = 'island' THEN 1 END) AS islands,
        COUNT(CASE WHEN e.defender_id = p.id AND e.catch_result = 'caught' THEN 1 END) AS catches,
        COUNT(CASE WHEN e.defender_id = p.id AND e.catch_result = 'dropped' THEN 1 END) AS drops,
        COALESCE(SUM(CASE WHEN e.thrower_id = p.id THEN e.points_scored ELSE 0 END), 0) AS points_scored
      FROM players p
      LEFT JOIN events e ON e.thrower_id = p.id OR e.defender_id = p.id
      WHERE p.id = ?
    `).bind(id).first(),
    db.prepare(`
      SELECT g.*,
        p1.name AS t1p1_name, p2.name AS t1p2_name,
        p3.name AS t2p1_name, p4.name AS t2p2_name
      FROM games g
      JOIN players p1 ON p1.id = g.team1_p1
      JOIN players p2 ON p2.id = g.team1_p2
      JOIN players p3 ON p3.id = g.team2_p1
      JOIN players p4 ON p4.id = g.team2_p2
      WHERE g.team1_p1 = ? OR g.team1_p2 = ? OR g.team2_p1 = ? OR g.team2_p2 = ?
      ORDER BY g.started_at DESC
      LIMIT 20
    `).bind(id, id, id, id).all(),
  ]);

  const stats = statsRow as any;
  const games = gamesResult.results as any[];

  const gamesCount = games.filter(g => g.status === 'finished').length;
  const wins = games.filter(g => g.status === 'finished' && (
    (g.winner === 1 && (g.team1_p1 == id || g.team1_p2 == id)) ||
    (g.winner === 2 && (g.team2_p1 == id || g.team2_p2 == id))
  )).length;

  return NextResponse.json({
    player,
    stats: {
      ...stats,
      games: gamesCount,
      wins,
      losses: gamesCount - wins,
      win_pct: gamesCount > 0 ? Math.round((wins / gamesCount) * 100) : 0,
      sink_pct: stats.throws > 0 ? Math.round((stats.sinks / stats.throws) * 100) : 0,
      table_pct: stats.throws > 0 ? Math.round((stats.table_hits / stats.throws) * 100) : 0,
      catch_pct: (stats.catches + stats.drops) > 0 ? Math.round((stats.catches / (stats.catches + stats.drops)) * 100) : 0,
    },
    recent_games: games,
  });
}
