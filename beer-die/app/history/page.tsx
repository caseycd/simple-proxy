import { getDb } from '@/lib/db';
import Link from 'next/link';
import { formatDate, formatDuration } from '@/lib/utils';
import { History, Zap } from 'lucide-react';

export const runtime = 'edge';

export default async function HistoryPage() {
  const db = getDb();
  const { results: games } = await db.prepare(`
    SELECT g.*,
      p1.name AS t1p1_name, p2.name AS t1p2_name,
      p3.name AS t2p1_name, p4.name AS t2p2_name,
      p1.nickname AS t1p1_nick, p2.nickname AS t1p2_nick,
      p3.nickname AS t2p1_nick, p4.nickname AS t2p2_nick,
      (SELECT COUNT(*) FROM events WHERE game_id = g.id) AS throw_count,
      (SELECT COUNT(*) FROM events WHERE game_id = g.id AND throw_result = 'sink') AS sink_count
    FROM games g
    JOIN players p1 ON p1.id = g.team1_p1
    JOIN players p2 ON p2.id = g.team1_p2
    JOIN players p3 ON p3.id = g.team2_p1
    JOIN players p4 ON p4.id = g.team2_p2
    ORDER BY g.started_at DESC
    LIMIT 100
  `).all() as any;

  const active = (games as any[]).filter(g => g.status === 'active');
  const finished = (games as any[]).filter(g => g.status === 'finished');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <History className="w-7 h-7 text-amber-400" />
        <h1 className="text-2xl font-black text-white">Game History</h1>
        <span className="ml-auto text-slate-400 text-sm">{finished.length} games played</span>
      </div>

      {/* Active */}
      {active.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="font-bold text-slate-200">Active Games</h2>
          </div>
          <div className="space-y-2">
            {active.map((g: any) => (
              <GameRow key={g.id} g={g} />
            ))}
          </div>
        </section>
      )}

      {/* Finished */}
      <section>
        <h2 className="font-bold text-slate-200 mb-3">Completed Games</h2>
        {finished.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No completed games yet.</div>
        ) : (
          <div className="space-y-2">
            {finished.map((g: any) => (
              <GameRow key={g.id} g={g} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function GameRow({ g }: { g: any }) {
  const isActive = g.status === 'active';
  return (
    <Link
      href={`/game/${g.id}`}
      className="block rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800/70 p-4 transition-colors"
    >
      <div className="flex items-center gap-4">
        {/* Score */}
        <div className="text-center min-w-[80px]">
          <div className="text-2xl font-black text-white tabular-nums">
            <span className={g.winner === 1 ? 'text-green-400' : g.team1_score > g.team2_score && isActive ? 'text-amber-400' : ''}>{g.team1_score}</span>
            <span className="text-slate-700 mx-1">–</span>
            <span className={g.winner === 2 ? 'text-green-400' : g.team2_score > g.team1_score && isActive ? 'text-amber-400' : ''}>{g.team2_score}</span>
          </div>
          {isActive
            ? <span className="text-xs text-green-400 font-bold animate-pulse">LIVE</span>
            : <span className="text-xs text-slate-500">FINAL</span>
          }
        </div>

        {/* Teams */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className={`font-bold truncate ${g.winner === 1 ? 'text-green-400' : 'text-slate-200'}`}>{g.team1_name}</span>
            <span className="text-slate-600 flex-shrink-0">vs</span>
            <span className={`font-bold truncate ${g.winner === 2 ? 'text-green-400' : 'text-slate-200'}`}>{g.team2_name}</span>
          </div>
          <div className="text-xs text-slate-500 truncate mt-0.5">
            {g.t1p1_nick || g.t1p1_name} &amp; {g.t1p2_nick || g.t1p2_name}
            {' · '}
            {g.t2p1_nick || g.t2p1_name} &amp; {g.t2p2_nick || g.t2p2_name}
          </div>
        </div>

        {/* Meta */}
        <div className="text-right flex-shrink-0 text-xs text-slate-500 space-y-0.5">
          <div>{formatDate(g.started_at)}</div>
          <div>{g.throw_count} throws · {g.sink_count} sinks</div>
          {g.ended_at && <div>{formatDuration(g.started_at, g.ended_at)}</div>}
        </div>
      </div>
    </Link>
  );
}
