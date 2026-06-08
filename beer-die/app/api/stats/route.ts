import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT p.id, p.name, p.nickname,
      COUNT(DISTINCT CASE WHEN g.team1_p1=p.id OR g.team1_p2=p.id OR g.team2_p1=p.id OR g.team2_p2=p.id THEN g.id END) AS games,
      COUNT(DISTINCT CASE WHEN g.status='finished' AND ((g.winner=1 AND (g.team1_p1=p.id OR g.team1_p2=p.id)) OR (g.winner=2 AND (g.team2_p1=p.id OR g.team2_p2=p.id))) THEN g.id END) AS wins,
      COUNT(CASE WHEN e.thrower_id=p.id THEN 1 END) AS throws,
      COUNT(CASE WHEN e.thrower_id=p.id AND e.throw_result='sink' THEN 1 END) AS sinks,
      COUNT(CASE WHEN e.thrower_id=p.id AND e.throw_result='island' THEN 1 END) AS islands,
      COUNT(CASE WHEN e.defender_id=p.id AND e.catch_result='caught' THEN 1 END) AS catches,
      COUNT(CASE WHEN e.defender_id=p.id AND e.catch_result='dropped' THEN 1 END) AS drops,
      COALESCE(SUM(CASE WHEN e.thrower_id=p.id THEN e.points_scored ELSE 0 END),0) AS points_scored
    FROM players p
    LEFT JOIN events e ON e.thrower_id=p.id OR e.defender_id=p.id
    LEFT JOIN games g ON g.id=e.game_id
    GROUP BY p.id ORDER BY wins DESC, sinks DESC
  `).all() as any[];
  return NextResponse.json(rows.map(r => ({
    ...r,
    win_pct: r.games>0 ? Math.round((r.wins/r.games)*100) : 0,
    sink_pct: r.throws>0 ? Math.round((r.sinks/r.throws)*100) : 0,
    catch_pct: (r.catches+r.drops)>0 ? Math.round((r.catches/(r.catches+r.drops))*100) : 0,
  })));
}
