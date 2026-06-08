'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Users, Dices } from 'lucide-react';

type Player = { id: number; name: string; nickname: string | null };

export default function NewGamePage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [newName, setNewName] = useState('');
  const [newNick, setNewNick] = useState('');
  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [t1p1, setT1p1] = useState('');
  const [t1p2, setT1p2] = useState('');
  const [t2p1, setT2p1] = useState('');
  const [t2p2, setT2p2] = useState('');
  const [scoreTo, setScoreTo] = useState('11');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetch('/api/players').then(r=>r.json()).then(setPlayers); }, []);

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch('/api/players', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:newName.trim(),nickname:newNick.trim()||null}) });
    setPlayers(prev=>[...prev,await res.json()]);
    setNewName(''); setNewNick('');
  }

  async function startGame(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!t1p1||!t1p2||!t2p1||!t2p2) { setError('Select all 4 players.'); return; }
    if (new Set([t1p1,t1p2,t2p1,t2p2]).size!==4) { setError('Each player must be unique.'); return; }
    setLoading(true);
    const res = await fetch('/api/games', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({team1_p1:+t1p1,team1_p2:+t1p2,team2_p1:+t2p1,team2_p2:+t2p2,team1_name:team1Name||'Team 1',team2_name:team2Name||'Team 2',score_to_win:+scoreTo}) });
    router.push(`/game/${(await res.json()).id}`);
  }

  const pName=(id:string)=>{const p=players.find(x=>x.id===+id);return p?(p.nickname||p.name):''};

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8"><Dices className="w-7 h-7 text-amber-400" /><h1 className="text-2xl font-black text-white">Start New Game</h1></div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4"><Users className="w-5 h-5 text-amber-400" /><h2 className="font-bold text-white">Players ({players.length})</h2></div>
        <form onSubmit={addPlayer} className="flex gap-2 mb-3">
          <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Name" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500" />
          <input value={newNick} onChange={e=>setNewNick(e.target.value)} placeholder="Nickname" className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500" />
          <button type="submit" disabled={!newName.trim()} className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold px-3 py-2 rounded-lg text-sm"><PlusCircle className="w-4 h-4" />Add</button>
        </form>
        {players.length>0&&<div className="flex flex-wrap gap-2">{players.map(p=><span key={p.id} className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-sm">{p.nickname?`${p.nickname} (${p.name})`:p.name}</span>)}</div>}
      </div>
      <form onSubmit={startGame} className="space-y-5">
        <div className="grid md:grid-cols-2 gap-5">
          {[{name:team1Name,setName:setTeam1Name,p1:t1p1,sp1:setT1p1,p2:t1p2,sp2:setT1p2,def:'Team 1'},{name:team2Name,setName:setTeam2Name,p1:t2p1,sp1:setT2p1,p2:t2p2,sp2:setT2p2,def:'Team 2'}].map((t,i)=>(
            <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <input value={t.name} onChange={e=>t.setName(e.target.value)} placeholder={t.def} className="w-full bg-transparent border-b border-slate-700 pb-2 mb-4 text-lg font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500" />
              {[{l:'Player 1',v:t.p1,s:t.sp1},{l:'Player 2',v:t.p2,s:t.sp2}].map(slot=>(
                <div key={slot.l} className="mb-3">
                  <label className="text-xs text-slate-400 mb-1 block">{slot.l}</label>
                  <select value={slot.v} onChange={e=>slot.s(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
                    <option value="">Select player…</option>
                    {players.map(p=><option key={p.id} value={p.id}>{p.nickname?`${p.nickname} (${p.name})`:p.name}</option>)}
                  </select>
                </div>
              ))}
              {(t.p1||t.p2)&&<div className="text-center text-amber-400 font-bold text-sm">{[t.p1,t.p2].filter(Boolean).map(pName).join(' & ')}</div>}
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <label className="text-sm font-semibold text-slate-300 block mb-2">Score to Win</label>
          <div className="flex gap-2">
            {['7','11','15','21'].map(n=>(
              <button key={n} type="button" onClick={()=>setScoreTo(n)} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${scoreTo===n?'bg-amber-500 text-black':'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>{n}</button>
            ))}
          </div>
        </div>
        {error&&<p className="text-red-400 text-sm text-center">{error}</p>}
        <button type="submit" disabled={loading||players.length<4} className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-black py-4 rounded-xl text-lg">
          <Dices className="w-6 h-6" />{loading?'Starting…':'Start Game!'}
        </button>
      </form>
    </div>
  );
}
