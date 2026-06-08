import { getDb } from '@/lib/db';
import Link from 'next/link';
import { Trophy, Dices } from 'lucide-react';

export default function LeaderboardPage() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT p.id, p.name, p.nickname,
      COUNT(DISTINCT CASE WHEN g.team1_p1=p.id OR g.team1_p2=p.id OR g.team2_p1=p.id OR g.team2_p2=p.id THEN g.id END) AS games,
      COUNT(DISTINCT CASE WHEN g.status='finished' AND ((g.winner=1 AND (g.team1_p1=p.id OR g.team1_p2=p.id)) OR (g.winner=2 AND (g.team2_p1=p.id OR g.team2_p2=p.id))) THEN g.id END) AS wins,
      COUNT(DISTINCT CASE WHEN g.status='finished' AND ((g.winner=2 AND (g.team1_p1=p.id OR g.team1_p2=p.id)) OR (g.winner=1 AND (g.team2_p1=p.id OR g.team2_p2=p.id))) THEN g.id END) AS losses,
      COUNT(CASE WHEN e.thrower_id=p.id THEN 1 END) AS throws,
      COUNT(CASE WHEN e.thrower_id=p.id AND e.throw_result='sink' THEN 1 END) AS sinks,
      COUNT(CASE WHEN e.thrower_id=p.id AND e.throw_result='island' THEN 1 END) AS islands,
      COUNT(CASE WHEN e.defender_id=p.id AND e.catch_result='caught' THEN 1 END) AS catches,
      COUNT(CASE WHEN e.defender_id=p.id AND e.catch_result='dropped' THEN 1 END) AS drops,
      COALESCE(SUM(CASE WHEN e.thrower_id=p.id THEN e.points_scored ELSE 0 END),0) AS points_scored
    FROM players p
    LEFT JOIN games g ON g.team1_p1=p.id OR g.team1_p2=p.id OR g.team2_p1=p.id OR g.team2_p2=p.id
    LEFT JOIN events e ON e.thrower_id=p.id OR e.defender_id=p.id
    GROUP BY p.id ORDER BY wins DESC, sinks DESC
  `).all() as any[];
  const players=rows.map(r=>({...r,win_pct:r.games>0?Math.round((r.wins/r.games)*100):0,sink_pct:r.throws>0?Math.round((r.sinks/r.throws)*100):0,catch_pct:(r.catches+r.drops)>0?Math.round((r.catches/(r.catches+r.drops))*100):0}));
  const pg=players.filter(p=>p.games>0);
  const cats=[
    {title:'Win Rate',icon:'🏆',key:'win_pct',fmt:(p:any)=>`${p.win_pct}%`,sub:(p:any)=>`${p.wins}W – ${p.losses}L`},
    {title:'Most Sinks',icon:'🎯',key:'sinks',fmt:(p:any)=>p.sinks,sub:(p:any)=>`${p.sink_pct}% rate`},
    {title:'Best Sink %',icon:'📊',key:'sink_pct',fmt:(p:any)=>`${p.sink_pct}%`,sub:(p:any)=>`${p.sinks}/${p.throws}`,filter:(p:any)=>p.throws>=10},
    {title:'Best Catch %',icon:'🤙',key:'catch_pct',fmt:(p:any)=>`${p.catch_pct}%`,sub:(p:any)=>`${p.catches}/${p.catches+p.drops}`,filter:(p:any)=>(p.catches+p.drops)>=5},
    {title:'Points Scored',icon:'⚡',key:'points_scored',fmt:(p:any)=>p.points_scored,sub:(p:any)=>`${p.games} games`},
    {title:'Islands',icon:'🏝️',key:'islands',fmt:(p:any)=>p.islands,sub:(p:any)=>`${p.throws} throws`},
  ];
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8"><Trophy className="w-7 h-7 text-amber-400" /><h1 className="text-2xl font-black text-white">Leaderboard</h1></div>
      {pg.length===0?(
        <div className="text-center py-16 text-slate-500">No games yet. <Link href="/game/new" className="text-amber-400 hover:underline">Start one!</Link></div>
      ):(
        <>
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2"><Dices className="w-4 h-4 text-amber-400" /><h2 className="font-bold text-slate-200">All Players</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-800">
                  {['#','Player','W','L','Win%','Throws','Sinks','Sink%','Catch%','Pts','🏝️'].map(h=>(<th key={h} className={`px-3 py-3 ${h==='Player'||h==='#'?'text-left':'text-center'}`}>{h}</th>))}
                </tr></thead>
                <tbody className="divide-y divide-slate-800/60">
                  {pg.map((p,i)=>(
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="px-3 py-3"><span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black inline-flex ${i===0?'bg-amber-500 text-black':i===1?'bg-slate-400 text-black':i===2?'bg-amber-700 text-white':'text-slate-500'}`}>{i+1}</span></td>
                      <td className="px-3 py-3"><Link href={`/players/${p.id}`} className="font-semibold text-white hover:text-amber-400">{p.nickname||p.name}</Link>{p.nickname&&<div className="text-xs text-slate-500">{p.name}</div>}</td>
                      <td className="px-3 py-3 text-center text-green-400 font-bold">{p.wins}</td>
                      <td className="px-3 py-3 text-center text-slate-500">{p.losses}</td>
                      <td className="px-3 py-3 text-center font-bold text-amber-400">{p.win_pct}%</td>
                      <td className="px-3 py-3 text-center text-slate-300">{p.throws}</td>
                      <td className="px-3 py-3 text-center text-amber-300 font-semibold">{p.sinks}</td>
                      <td className="px-3 py-3 text-center text-slate-300">{p.throws>0?`${p.sink_pct}%`:'—'}</td>
                      <td className="px-3 py-3 text-center text-slate-300">{(p.catches+p.drops)>0?`${p.catch_pct}%`:'—'}</td>
                      <td className="px-3 py-3 text-center text-slate-300">{p.points_scored}</td>
                      <td className="px-3 py-3 text-center text-purple-400">{p.islands}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cats.map(cat=>{
              const el=(cat.filter?pg.filter(cat.filter):pg).slice().sort((a:any,b:any)=>b[cat.key]-a[cat.key]).slice(0,3);
              if(!el.length) return null;
              return (
                <div key={cat.title} className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800 font-bold text-slate-200">{cat.icon} {cat.title}</div>
                  <div className="divide-y divide-slate-800/60">
                    {el.map((p:any,i:number)=>(
                      <Link key={p.id} href={`/players/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/40 transition-colors">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${i===0?'bg-amber-500 text-black':i===1?'bg-slate-400 text-black':'bg-amber-800 text-white'}`}>{i+1}</span>
                        <div className="flex-1 min-w-0"><div className="font-semibold text-white text-sm truncate">{p.nickname||p.name}</div><div className="text-xs text-slate-500">{cat.sub(p)}</div></div>
                        <div className="font-black text-amber-400 flex-shrink-0">{cat.fmt(p)}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
