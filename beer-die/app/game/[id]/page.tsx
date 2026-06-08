'use client';
import { useState, useEffect, useCallback, use } from 'react';
import { Undo2, Trophy, Eye, Target, Dices } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Player = { id: number; name: string; nickname: string | null };
type Event = { id:number; team:1|2; throw_result:string; catch_result:string|null; points_scored:number; thrower_name:string; thrower_nick:string|null };
type Game = { id:number; team1_p1:number; team1_p2:number; team2_p1:number; team2_p2:number; team1_name:string; team2_name:string; score_to_win:number; team1_score:number; team2_score:number; status:string; winner:number|null; t1p1_name:string; t1p2_name:string; t2p1_name:string; t2p2_name:string; t1p1_nick?:string; t1p2_nick?:string; t2p1_nick?:string; t2p2_nick?:string };
type Step = {phase:'pick_thrower'}|{phase:'pick_result';tid:number;team:1|2}|{phase:'pick_catch';tid:number;team:1|2;defenders:Player[]};

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [game, setGame] = useState<Game|null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [step, setStep] = useState<Step>({phase:'pick_thrower'});
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string|null>(null);
  const [pm, setPm] = useState<{[id:number]:Player}>({});

  const load = useCallback(async () => {
    const [g,e] = await Promise.all([fetch(`/api/games/${id}`).then(r=>r.json()), fetch(`/api/games/${id}/events`).then(r=>r.json())]);
    setGame(g); setEvents(e);
  },[id]);

  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    if(!game) return;
    const m:{[id:number]:Player}={};
    [{id:game.team1_p1,name:game.t1p1_name,nickname:game.t1p1_nick??null},{id:game.team1_p2,name:game.t1p2_name,nickname:game.t1p2_nick??null},{id:game.team2_p1,name:game.t2p1_name,nickname:game.t2p1_nick??null},{id:game.team2_p2,name:game.t2p2_name,nickname:game.t2p2_nick??null}].forEach(p=>{m[p.id]=p;});
    setPm(m);
  },[game]);

  const showFlash=(msg:string)=>{setFlash(msg);setTimeout(()=>setFlash(null),2500);};

  async function record(opts:{tid:number;team:1|2;result:string;catch?:'caught'|'dropped';did?:number}) {
    setBusy(true);
    try {
      const res=await fetch(`/api/games/${id}/events`,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({thrower_id:opts.tid,defender_id:opts.did??null,team:opts.team,throw_result:opts.result,catch_result:opts.catch??null})});
      const {game:g}=await res.json(); setGame(g); await load();
      const labels:Record<string,string>={sink:'🏆 SINK! +2',island:'🏝️ ISLAND! +2',off_table:'❌ Off Table',table_dropped:'💧 Dropped! +1',table_caught:'🤙 Caught!'};
      showFlash(labels[opts.result==='table'?`table_${opts.catch}`:opts.result]??opts.result);
    } finally { setBusy(false); setStep({phase:'pick_thrower'}); }
  }

  async function undo(){setBusy(true);await fetch(`/api/games/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'undo_last'})});await load();setStep({phase:'pick_thrower'});setBusy(false);}
  async function end(){if(!confirm('End the game now?'))return;setBusy(true);await fetch(`/api/games/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'finish'})});await load();setBusy(false);}

  if(!game) return <div className="flex items-center justify-center min-h-64 text-slate-500">Loading…</div>;

  const t1p:Player[]=[{id:game.team1_p1,name:game.t1p1_name,nickname:game.t1p1_nick??null},{id:game.team1_p2,name:game.t1p2_name,nickname:game.t1p2_nick??null}];
  const t2p:Player[]=[{id:game.team2_p1,name:game.t2p1_name,nickname:game.t2p1_nick??null},{id:game.team2_p2,name:game.t2p2_name,nickname:game.t2p2_nick??null}];
  const done=game.status==='finished';
  const tot=game.team1_score+game.team2_score;
  const pct=tot===0?50:Math.round((game.team1_score/tot)*100);
  const pd=(p:Player)=>p.nickname||p.name;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {flash&&<div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-amber-500 text-white text-2xl font-black px-8 py-4 rounded-2xl shadow-2xl">{flash}</div>}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="grid grid-cols-3">
          <div className={cn('p-5 text-center',game.winner===1&&'bg-green-900/20')}>
            <div className="text-xs text-slate-400 mb-1 truncate">{game.t1p1_name} & {game.t1p2_name}</div>
            <div className="text-base font-black text-white truncate">{game.team1_name}</div>
            <div className={cn('text-7xl font-black mt-1 leading-none tabular-nums',game.winner===1?'text-green-400':game.team1_score>game.team2_score?'text-amber-400':'text-white')}>{game.team1_score}</div>
            {game.winner===1&&<div className="text-green-400 text-sm font-bold mt-1">🏆 WIN</div>}
          </div>
          <div className="flex flex-col items-center justify-center p-3 border-x border-slate-800 gap-1">
            <span className="text-slate-500 text-xs">First to {game.score_to_win}</span>
            <Dices className="w-7 h-7 text-amber-400" />
            {done?<span className="text-xs font-bold text-slate-400 bg-slate-700 px-2 py-0.5 rounded">FINAL</span>:<span className="text-xs font-bold text-green-400 bg-green-900/40 px-2 py-0.5 rounded animate-pulse">LIVE</span>}
            <div className="w-full mt-1 h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{width:`${pct}%`}} /></div>
          </div>
          <div className={cn('p-5 text-center',game.winner===2&&'bg-green-900/20')}>
            <div className="text-xs text-slate-400 mb-1 truncate">{game.t2p1_name} & {game.t2p2_name}</div>
            <div className="text-base font-black text-white truncate">{game.team2_name}</div>
            <div className={cn('text-7xl font-black mt-1 leading-none tabular-nums',game.winner===2?'text-green-400':game.team2_score>game.team1_score?'text-amber-400':'text-white')}>{game.team2_score}</div>
            {game.winner===2&&<div className="text-green-400 text-sm font-bold mt-1">🏆 WIN</div>}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Link href={`/game/${id}/watch`} target="_blank" className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium py-2.5 rounded-xl"><Eye className="w-4 h-4" />Share Live</Link>
        {!done&&events.length>0&&<button onClick={undo} disabled={busy} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-sm px-4 py-2.5 rounded-xl"><Undo2 className="w-4 h-4" />Undo</button>}
        {!done&&<button onClick={end} disabled={busy} className="flex items-center gap-2 bg-red-900/40 hover:bg-red-800/60 disabled:opacity-40 text-red-400 text-sm px-4 py-2.5 rounded-xl"><Trophy className="w-4 h-4" />End</button>}
      </div>
      {!done&&(
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          {step.phase==='pick_thrower'&&(
            <div>
              <p className="text-center text-slate-400 text-sm mb-4 font-medium">Who is throwing?</p>
              <div className="grid grid-cols-2 gap-4">
                {([{players:t1p,team:1,name:game.team1_name,c:'blue'},{players:t2p,team:2,name:game.team2_name,c:'rose'}] as const).map(t=>(
                  <div key={t.team}>
                    <div className={`text-xs uppercase tracking-widest text-${t.c}-400/70 mb-2 text-center font-semibold`}>{t.name}</div>
                    {t.players.map(p=>(
                      <button key={p.id} onClick={()=>setStep({phase:'pick_result',tid:p.id,team:t.team as 1|2})}
                        className={`w-full mb-2 py-4 rounded-xl bg-${t.c}-900/30 hover:bg-${t.c}-800/50 border border-${t.c}-800/40 text-white font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.98]`}>
                        {pd(p)}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          {step.phase==='pick_result'&&(
            <div>
              <div className="flex items-center justify-between mb-4">
                <button onClick={()=>setStep({phase:'pick_thrower'})} className="text-slate-500 hover:text-slate-300 text-sm px-2 py-1">← Back</button>
                <span className="text-amber-400 font-bold">{pd(pm[step.tid]??{name:'',nickname:null})} throws</span>
                <span className="w-16" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {r:'sink',e:'🏆',l:'SINK!',p:'+2 pts',c:'amber',fn:()=>record({tid:step.tid,team:step.team,result:'sink'})},
                  {r:'table',e:'🎯',l:'ON TABLE',p:'catch required',c:'blue',fn:()=>setStep({phase:'pick_catch',tid:step.tid,team:step.team,defenders:step.team===1?t2p:t1p})},
                  {r:'off_table',e:'❌',l:'OFF TABLE',p:'0 pts',c:'slate',fn:()=>record({tid:step.tid,team:step.team,result:'off_table'})},
                  {r:'island',e:'🏝️',l:'ISLAND!',p:'+2 pts',c:'purple',fn:()=>record({tid:step.tid,team:step.team,result:'island'})},
                ].map(b=>(
                  <button key={b.r} onClick={b.fn} disabled={busy}
                    className={`flex flex-col items-center gap-1.5 py-6 rounded-xl bg-${b.c}-500/20 hover:bg-${b.c}-500/30 border border-${b.c}-500/50 text-${b.c}-200 font-black text-xl disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.97]`}>
                    {b.e} <span>{b.l}</span><span className={`text-xs font-normal text-${b.c}-400/70`}>{b.p}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {step.phase==='pick_catch'&&(
            <div>
              <div className="flex items-center justify-between mb-4">
                <button onClick={()=>setStep({phase:'pick_result',tid:step.tid,team:step.team})} className="text-slate-500 hover:text-slate-300 text-sm px-2 py-1">← Back</button>
                <span className="text-blue-400 font-bold">🎯 On Table — who defends?</span>
                <span className="w-16" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {step.defenders.map(p=>(
                  <div key={p.id} className="space-y-2">
                    <div className="text-center font-bold text-slate-200 text-sm">{pd(p)}</div>
                    <button onClick={()=>record({tid:step.tid,team:step.team,result:'table',catch:'caught',did:p.id})} disabled={busy}
                      className="w-full py-4 rounded-xl bg-green-900/40 hover:bg-green-800/60 border border-green-700/50 text-green-300 font-bold disabled:opacity-50">
                      🤙 Caught
                    </button>
                    <button onClick={()=>record({tid:step.tid,team:step.team,result:'table',catch:'dropped',did:p.id})} disabled={busy}
                      className="w-full py-4 rounded-xl bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 text-red-300 font-bold disabled:opacity-50">
                      💧 Dropped
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {done&&(
        <div className="rounded-xl border border-green-700/40 bg-green-900/15 p-6 text-center">
          <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-2" />
          <h2 className="text-2xl font-black text-white">{game.winner===1?game.team1_name:game.team2_name} Wins!</h2>
          <p className="text-slate-400 mt-1">Final: {game.team1_score} – {game.team2_score}</p>
          <Link href="/game/new" className="inline-flex items-center gap-2 mt-4 bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-2.5 rounded-xl"><Dices className="w-4 h-4" />New Game</Link>
        </div>
      )}
      {events.length>0&&(
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center gap-2 mb-3"><Target className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-bold text-slate-300">Throw Log</h3><span className="text-xs text-slate-600 ml-auto">{events.length}</span></div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto scrollbar-none">
            {events.map(e=>(
              <div key={e.id} className="flex items-center gap-2 text-sm py-1 border-b border-slate-800/60 last:border-0">
                <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0',e.team===1?'bg-blue-500':'bg-rose-500')} />
                <span className="font-medium text-slate-200 min-w-0 truncate">{e.thrower_nick||e.thrower_name}</span>
                <span className={cn('font-semibold flex-shrink-0',e.throw_result==='sink'||e.throw_result==='island'?'text-amber-400':e.throw_result==='off_table'?'text-slate-600':'text-slate-300')}>
                  {e.throw_result==='sink'?'🏆':e.throw_result==='island'?'🏝️':e.throw_result==='table'?'🎯':'❌'}
                </span>
                {e.catch_result&&<span className={cn('text-xs flex-shrink-0',e.catch_result==='caught'?'text-green-400':'text-red-400')}>{e.catch_result==='caught'?'🤙':'💧'}</span>}
                {e.points_scored>0&&<span className="ml-auto text-amber-400 font-bold flex-shrink-0">+{e.points_scored}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
