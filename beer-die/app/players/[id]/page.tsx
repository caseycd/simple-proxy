import { getDb } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Trophy, Target, Dices } from 'lucide-react';

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const player = db.prepare('SELECT * FROM players WHERE id=?').get(id) as any;
  if (!player) notFound();

  const s = db.prepare(`
    SELECT COUNT(CASE WHEN e.thrower_id=p.id THEN 1 END) AS throws,
      COUNT(CASE WHEN e.thrower_id=p.id AND e.throw_result='sink' THEN 1 END) AS sinks,
      COUNT(CASE WHEN e.thrower_id=p.id AND e.throw_result='table' THEN 1 END) AS table_hits,
      COUNT(CASE WHEN e.thrower_id=p.id AND e.throw_result='off_table' THEN 1 END) AS off_tables,
      COUNT(CASE WHEN e.thrower_id=p.id AND e.throw_result='island' THEN 1 END) AS islands,
      COUNT(CASE WHEN e.defender_id=p.id AND e.catch_result='caught' THEN 1 END) AS catches,
      COUNT(CASE WHEN e.defender_id=p.id AND e.catch_result='dropped' THEN 1 END) AS drops,
      COALESCE(SUM(CASE WHEN e.thrower_id=p.id THEN e.points_scored ELSE 0 END),0) AS points_scored
    FROM players p LEFT JOIN events e ON e.thrower_id=p.id OR e.defender_id=p.id WHERE p.id=?
  `).get(id) as any;

  const games = db.prepare(`
    SELECT g.*, p1.name AS t1p1_name, p2.name AS t1p2_name, p3.name AS t2p1_name, p4.name AS t2p2_name
    FROM games g JOIN players p1 ON p1.id=g.team1_p1 JOIN players p2 ON p2.id=g.team1_p2
    JOIN players p3 ON p3.id=g.team2_p1 JOIN players p4 ON p4.id=g.team2_p2
    WHERE g.team1_p1=? OR g.team1_p2=? OR g.team2_p1=? OR g.team2_p2=?
    ORDER BY g.started_at DESC LIMIT 20
  `).all(id,id,id,id) as any[];

  const finished=games.filter((g:any)=>g.status==='finished');
  const wins=finished.filter((g:any)=>(g.winner===1&&(g.team1_p1==id||g.team1_p2==id))||(g.winner===2&&(g.team2_p1==id||g.team2_p2==id))).length;
  const wp=finished.length>0?Math.round((wins/finished.length)*100):0;
  const sp=s.throws>0?Math.round((s.sinks/s.throws)*100):0;
  const cp=(s.catches+s.drops)>0?Math.round((s.catches/(s.catches+s.drops))*100):0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/players" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-6"><ArrowLeft className="w-4 h-4" />All Players</Link>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 font-black text-3xl">{(player.nickname||player.name).charAt(0).toUpperCase()}</div>
        <div><h1 className="text-3xl font-black text-white">{player.nickname||player.name}</h1>{player.nickname&&<p className="text-slate-400">{player.name}</p>}</div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[{l:'Win Rate',v:`${wp}%`,s:`${wins}W – ${finished.length-wins}L`},{l:'Sink %',v:`${sp}%`,s:`${s.sinks}/${s.throws}`},{l:'Catch %',v:`${cp}%`,s:`${s.catches} caught`}].map(x=>(
          <div key={x.l} className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
            <div className="text-2xl font-black text-white">{x.v}</div>
            <div className="text-xs text-slate-400 mt-0.5">{x.l}</div>
            <div className="text-xs text-amber-400/70 mt-0.5">{x.s}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 mb-6">
        <h2 className="font-bold text-slate-200 mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-amber-400" />Throwing</h2>
        {[['Total Throws',s.throws],['Points Scored',s.points_scored],['🏆 Sinks',s.sinks],['🏝️ Islands',s.islands],['🎯 On Table',s.table_hits],['❌ Off Table',s.off_tables]].map(([l,v])=>(
          <div key={l as string} className="flex justify-between py-2 border-b border-slate-800/60 last:border-0"><span className="text-slate-400 text-sm">{l}</span><span className="font-bold text-white">{v}</span></div>
        ))}
        <h2 className="font-bold text-slate-200 mt-5 mb-4 flex items-center gap-2"><Dices className="w-4 h-4 text-amber-400" />Defense</h2>
        {[['Defended',(s.catches+s.drops)],['Catch Rate',`${cp}%`],['🤙 Catches',s.catches],['💧 Drops',s.drops]].map(([l,v])=>(
          <div key={l as string} className="flex justify-between py-2 border-b border-slate-800/60 last:border-0"><span className="text-slate-400 text-sm">{l}</span><span className="font-bold text-white">{v}</span></div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 font-bold text-slate-200 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-400" />Game History</div>
        {games.length===0?<div className="p-6 text-center text-slate-500">No games yet</div>:(
          <div className="divide-y divide-slate-800/60">
            {games.map((g:any)=>{
              const on1=g.team1_p1==id||g.team1_p2==id;
              const won=g.status==='finished'&&((g.winner===1&&on1)||(g.winner===2&&!on1));
              const ms=on1?g.team1_score:g.team2_score, os=on1?g.team2_score:g.team1_score;
              const mp=on1?(g.team1_p1==id?g.t1p2_name:g.t1p1_name):(g.team2_p1==id?g.t2p2_name:g.t2p1_name);
              const opp=on1?`${g.t2p1_name} & ${g.t2p2_name}`:`${g.t1p1_name} & ${g.t1p2_name}`;
              return (
                <Link key={g.id} href={`/game/${g.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/40 transition-colors">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${g.status==='active'?'bg-amber-900/50 text-amber-400':won?'bg-green-900/50 text-green-400':'bg-slate-800 text-slate-500'}`}>{g.status==='active'?'L':won?'W':'L'}</span>
                  <div className="flex-1 min-w-0"><div className="text-sm font-medium text-slate-200 truncate">w/ {mp} vs {opp}</div><div className="text-xs text-slate-500">{formatDate(g.ended_at??g.started_at)}</div></div>
                  <div className={`text-sm font-bold flex-shrink-0 ${won?'text-green-400':g.status==='active'?'text-amber-400':'text-slate-400'}`}>{ms}–{os}</div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
