import Link from 'next/link';
import { getDb } from '@/lib/db';
import { formatDate, formatDuration } from '@/lib/utils';
import { PlusCircle, Dices, ArrowRight, Trophy, Zap } from 'lucide-react';

export const runtime = 'edge';

async function getHomeData() {
  const db = getDb();
  const [activeResult, recentResult, topPlayersResult, totals] = await Promise.all([
    db.prepare(`
      SELECT g.*,
        p1.name AS t1p1_name, p2.name AS t1p2_name,
        p3.name AS t2p1_name, p4.name AS t2p2_name
      FROM games g
      JOIN players p1 ON p1.id = g.team1_p1
      JOIN players p2 ON p2.id = g.team1_p2
      JOIN players p3 ON p3.id = g.team2_p1
      JOIN players p4 ON p4.id = g.team2_p2
      WHERE g.status = 'active'
      ORDER BY g.started_at DESC
    `).all(),
    db.prepare(`
      SELECT g.*,
        p1.name AS t1p1_name, p2.name AS t1p2_name,
        p3.name AS t2p1_name, p4.name AS t2p2_name
      FROM games g
      JOIN players p1 ON p1.id = g.team1_p1
      JOIN players p2 ON p2.id = g.team1_p2
      JOIN players p3 ON p3.id = g.team2_p1
      JOIN players p4 ON p4.id = g.team2_p2
      WHERE g.status = 'finished'
      ORDER BY g.ended_at DESC
      LIMIT 5
    `).all(),
    db.prepare(`
      SELECT p.*,
        COUNT(DISTINCT CASE WHEN g.status='finished' AND (
          (g.winner=1 AND (g.team1_p1=p.id OR g.team1_p2=p.id)) OR
          (g.winner=2 AND (g.team2_p1=p.id OR g.team2_p2=p.id))
        ) THEN g.id END) AS wins,
        COUNT(DISTINCT CASE WHEN g.team1_p1=p.id OR g.team1_p2=p.id OR g.team2_p1=p.id OR g.team2_p2=p.id THEN g.id END) AS games,
        COUNT(CASE WHEN e.thrower_id=p.id AND e.throw_result='sink' THEN 1 END) AS sinks
      FROM players p
      LEFT JOIN games g ON g.team1_p1=p.id OR g.team1_p2=p.id OR g.team2_p1=p.id OR g.team2_p2=p.id
      LEFT JOIN events e ON e.thrower_id=p.id
      GROUP BY p.id
      HAVING games > 0
      ORDER BY wins DESC, sinks DESC
      LIMIT 5
    `).all(),
    db.prepare(`
      SELECT COUNT(*) AS total_games,
        COUNT(CASE WHEN status='active' THEN 1 END) AS active_games,
        (SELECT COUNT(*) FROM events WHERE throw_result='sink') AS total_sinks,
        (SELECT COUNT(*) FROM players) AS total_players
      FROM games
    `).first(),
  ]);

  return {
    activeGames: activeResult.results as any[],
    recentGames: recentResult.results as any[],
    topPlayers: topPlayersResult.results as any[],
    totals: totals as any,
  };
}

export default async function HomePage() {
  const { activeGames, recentGames, topPlayers, totals } = await getHomeData();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Hero */}
      <div className="text-center py-6">
        <div className="inline-flex items-center gap-3 mb-3">
          <Dices className="w-10 h-10 text-amber-400" />
          <h1 className="text-4xl font-black text-white">BeerDie</h1>
        </div>
        <p className="text-slate-400 text-lg">The ultimate beer die stat tracker. Every throw. Every sink. Every catch.</p>
        <div className="flex justify-center gap-3 mt-6">
          <Link href="/game/new" className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 rounded-xl transition-colors">
            <PlusCircle className="w-5 h-5" /> Start New Game
          </Link>
          <Link href="/leaderboard" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
            <Trophy className="w-5 h-5" /> Leaderboard
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Games Played', value: totals?.total_games ?? 0 },
          { label: 'Active Games', value: totals?.active_games ?? 0, highlight: true },
          { label: 'Total Sinks', value: totals?.total_sinks ?? 0 },
          { label: 'Players', value: totals?.total_players ?? 0 },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 text-center border ${s.highlight ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-900 border-slate-800'}`}>
            <div className={`text-3xl font-black ${s.highlight ? 'text-amber-400' : 'text-white'}`}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Active Games */}
      {activeGames.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold">Live Games</h2>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
          <div className="space-y-3">
            {activeGames.map((g: any) => (
              <Link key={g.id} href={`/game/${g.id}`} className="block rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 p-4 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-white">{g.team1_name}</span>
                      <span className="text-slate-400 text-xs">{g.t1p1_name} &amp; {g.t1p2_name}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-semibold text-white">{g.team2_name}</span>
                      <span className="text-slate-400 text-xs">{g.t2p1_name} &amp; {g.t2p2_name}</span>
                    </div>
                  </div>
                  <div className="text-center px-4">
                    <div className="text-3xl font-black text-white">
                      <span className={g.team1_score > g.team2_score ? 'text-amber-400' : ''}>{g.team1_score}</span>
                      <span className="text-slate-600 mx-2">—</span>
                      <span className={g.team2_score > g.team1_score ? 'text-amber-400' : ''}>{g.team2_score}</span>
                    </div>
                    <div className="text-xs text-green-400 mt-1">LIVE · {formatDuration(g.started_at)}</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-500 ml-2" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Games */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Recent Games</h2>
            <Link href="/history" className="text-sm text-amber-400 hover:text-amber-300">View all →</Link>
          </div>
          {recentGames.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-500">
              No games yet. <Link href="/game/new" className="text-amber-400 hover:underline">Start one!</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentGames.map((g: any) => (
                <Link key={g.id} href={`/game/${g.id}`} className="block rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800/80 p-3 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex gap-2 text-sm">
                        <span className={g.winner === 1 ? 'font-bold text-green-400' : 'text-slate-300'}>{g.team1_name}</span>
                        <span className="text-slate-600">vs</span>
                        <span className={g.winner === 2 ? 'font-bold text-green-400' : 'text-slate-300'}>{g.team2_name}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{g.t1p1_name} &amp; {g.t1p2_name} · {g.t2p1_name} &amp; {g.t2p2_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-white">{g.team1_score} – {g.team2_score}</div>
                      <div className="text-xs text-slate-500">{formatDate(g.ended_at ?? g.started_at)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Top Players */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Top Players</h2>
            <Link href="/leaderboard" className="text-sm text-amber-400 hover:text-amber-300">Full board →</Link>
          </div>
          {topPlayers.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-500">
              No players yet. <Link href="/players" className="text-amber-400 hover:underline">Add players!</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {topPlayers.map((p: any, i: number) => (
                <Link key={p.id} href={`/players/${p.id}`} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800/80 p-3 transition-colors">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black ${i === 0 ? 'bg-amber-500 text-black' : i === 1 ? 'bg-slate-400 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-300'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold text-white">{p.nickname || p.name}</div>
                    <div className="text-xs text-slate-400">{p.wins}W · {p.games - p.wins}L · {p.sinks} sinks</div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400 font-bold">{p.games > 0 ? Math.round((p.wins / p.games) * 100) : 0}%</div>
                    <div className="text-xs text-slate-500">win rate</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
