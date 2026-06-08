'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, PlusCircle } from 'lucide-react';

type Player = { id: number; name: string; nickname: string | null };

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState('');
  const [nick, setNick] = useState('');

  useEffect(() => { fetch('/api/players').then(r=>r.json()).then(setPlayers); }, []);

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch('/api/players', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:name.trim(),nickname:nick.trim()||null}) });
    setPlayers(prev=>[...prev,await res.json()].sort((a,b)=>a.name.localeCompare(b.name)));
    setName(''); setNick('');
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8"><Users className="w-7 h-7 text-amber-400" /><h1 className="text-2xl font-black text-white">Players</h1><span className="ml-auto bg-slate-800 text-slate-400 text-sm px-3 py-1 rounded-full">{players.length} players</span></div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 mb-6">
        <h2 className="font-bold text-slate-200 mb-4 flex items-center gap-2"><PlusCircle className="w-4 h-4 text-amber-400" />Add Player</h2>
        <form onSubmit={addPlayer} className="flex gap-2">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" required className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500" />
          <input value={nick} onChange={e=>setNick(e.target.value)} placeholder="Nickname" className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500" />
          <button type="submit" disabled={!name.trim()} className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold px-4 py-2.5 rounded-lg text-sm"><PlusCircle className="w-4 h-4" />Add</button>
        </form>
      </div>
      {players.length===0?<div className="text-center py-12 text-slate-500">No players yet. Add one above!</div>:(
        <div className="space-y-2">
          {players.map(p=>(
            <Link key={p.id} href={`/players/${p.id}`} className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800/80 p-4 transition-colors">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-black text-lg">{(p.nickname||p.name).charAt(0).toUpperCase()}</div>
              <div className="flex-1"><div className="font-bold text-white">{p.name}</div>{p.nickname&&<div className="text-sm text-slate-400">"{p.nickname}"</div>}</div>
              <span className="text-slate-500">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
