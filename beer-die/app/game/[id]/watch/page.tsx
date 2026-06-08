'use client';
import { useState, useEffect, useCallback, use } from 'react';
import { Dices, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

type Event = { id:number; team:1|2; throw_result:string; catch_result:string|null; points_scored:number; thrower_name:string; thrower_nick:string|null };
type Game = { id:number; team1_name:string; team2_name:string; score_to_win:number; team1_score:number; team2_score:number; status:string; winner:number|null; t1p1_name:string; t1p2_name:string; t2p1_name:string; t2p2_name:string };

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [game, setGame] = useState<Game|null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [scoreAnim, setScoreAnim] = useState(false);

  const poll = useCallback(async () => {
    const [gr, er] = await Promise.all([
      fetch(`/api/games/${id}`,{cache:'no-store'}).then(r=>r.json()),
      fetch(`/api/games/${id}/events`,{cache:'no-store'}).then(r=>r.json()),
    ]);
    setGame(prev => {
      if (prev && (prev.team1_score!==gr.team1_score||prev.team2_score!==gr.team2_score)) {
        setScoreAnim(true); setTimeout(()=>setScoreAnim(false),1000);
      }
      return gr;
    });
    setEvents(er); setLastUpdate(new Date());
  }, [id]);

  useEffect(() => { poll(); const t=setInterval(poll,3000); return ()=>clearInterval(t); }, [poll]);

  if (!game) return <div className="flex items-center justify-center min-h-screen bg-[#080c18]"><Dices className="w-6 h-6 text-amber-400 animate-spin" /></div>;

  const total=game.team1_score+game.team2_score;
  const pct1=total===0?50:Math.round((game.team1_score/total)*100);
  const done=game.status==='finished';
  const recent=events.slice(0,8);

  return (
    <div className="min-h-screen bg-[#080c18] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2"><Dices className="w-5 h-5 text-amber-400" /><span className="font-bold text-white">BeerDie</span></div>
        {done?<span className="text-slate-400 text-sm font-medium">FINAL</span>:(
          <div className="flex items-center gap-1.5"><Wifi className="w-4 h-4 text-green-400" /><span className="text-green-400 text-sm font-bold">LIVE</span><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /></div>
        )}
        <span className="text-slate-600 text-xs">{lastUpdate.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>
      </div>
      <div className="flex-1 flex flex-col items-center px-4 py-8 gap-6">
        <div className="w-full max-w-lg">
          <div className={cn('grid grid-cols-3 rounded-2xl overflow-hidden border',done?'border-slate-700':'border-amber-500/20')}>
            {([1,2] as const).map(t=>{
              const isT1=t===1;
              const score=isT1?game.team1_score:game.team2_score;
              const opp=isT1?game.team2_score:game.team1_score;
              const names=isT1?`${game.t1p1_name} & ${game.t1p2_name}`:`${game.t2p1_name} & ${game.t2p2_name}`;
              const tname=isT1?game.team1_name:game.team2_name;
              const won=game.winner===t;
              if (!isT1) return null;
              return (
                <div key={t} className={cn('p-6 text-center flex flex-col items-center',won&&'bg-green-900/25',!isT1&&'order-3')}>
                  <div className="text-slate-400 text-xs truncate w-full text-center mb-1">{names}</div>
                  <div className="text-base font-black text-white mb-2">{tname}</div>
                  <div className={cn('font-black leading-none text-8xl transition-all duration-300',scoreAnim&&'scale-110',won?'text-green-400':score>opp?'text-amber-400':'text-white')}>{score}</div>
                  {won&&<div className="text-green-400 font-bold text-sm mt-2">🏆 WINNER</div>}
                </div>
              );
            })}
            <div className="bg-slate-950 flex flex-col items-center justify-center p-4 gap-2 order-2">
              <span className="text-slate-500 text-xs">to {game.score_to_win}</span>
              <Dices className="w-8 h-8 text-amber-400" />
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{width:`${pct1}%`}} /></div>
            </div>
            <div className={cn('p-6 text-center flex flex-col items-center order-3',game.winner===2&&'bg-green-900/25')}>
              <div className="text-slate-400 text-xs truncate w-full text-center mb-1">{game.t2p1_name} & {game.t2p2_name}</div>
              <div className="text-base font-black text-white mb-2">{game.team2_name}</div>
              <div className={cn('font-black leading-none text-8xl transition-all duration-300',scoreAnim&&'scale-110',game.winner===2?'text-green-400':game.team2_score>game.team1_score?'text-amber-400':'text-white')}>{game.team2_score}</div>
              {game.winner===2&&<div className="text-green-400 font-bold text-sm mt-2">🏆 WINNER</div>}
            </div>
          </div>
        </div>
        {recent[0]&&(
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Last Play</div>
            <div className="flex items-center gap-3">
              <span className={cn('w-3 h-3 rounded-full',recent[0].team===1?'bg-blue-500':'bg-rose-500')} />
              <div className="flex-1">
                <span className="font-bold text-white">{recent[0].thrower_nick||recent[0].thrower_name}</span>
                <span className="text-slate-400 text-sm ml-2">
                  {recent[0].throw_result==='sink'?'— SINK! 🏆':recent[0].throw_result==='island'?'— ISLAND! 🏝️':recent[0].throw_result==='table'?'— On Table 🎯':'— Off Table ❌'}
                  {recent[0].catch_result==='caught'?' → caught 🤙':recent[0].catch_result==='dropped'?' → dropped 💧':''}
                </span>
              </div>
              {recent[0].points_scored>0&&<span className="text-amber-400 font-black text-xl">+{recent[0].points_scored}</span>}
            </div>
          </div>
        )}
        {recent.length>0&&(
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 text-sm font-bold text-slate-300">Play-by-Play</div>
            <div className="divide-y divide-slate-800/60">
              {recent.map((e,i)=>(
                <div key={e.id} className={cn('flex items-center gap-3 px-4 py-3',i===0&&'bg-slate-800/40')}>
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0',e.team===1?'bg-blue-500':'bg-rose-500')} />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-200 text-sm">{e.thrower_nick||e.thrower_name}</span>
                    <span className={cn('text-sm ml-2',e.throw_result==='sink'||e.throw_result==='island'?'text-amber-400 font-semibold':e.throw_result==='off_table'?'text-slate-500':'text-slate-300')}>
                      {e.throw_result==='sink'?'🏆 Sink!':e.throw_result==='island'?'🏝️ Island!':e.throw_result==='table'?'🎯 Table':'❌ Off'}
                    </span>
                    {e.catch_result&&<span className={cn('text-xs ml-1',e.catch_result==='caught'?'text-green-400':'text-red-400')}>{e.catch_result==='caught'?'→ 🤙':'→ 💧'}</span>}
                  </div>
                  {e.points_scored>0&&<span className="text-amber-400 font-bold text-sm flex-shrink-0">+{e.points_scored}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
