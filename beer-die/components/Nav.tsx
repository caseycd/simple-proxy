'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dices, Trophy, Users, History, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/', label: 'Home', icon: Dices },
  { href: '/game/new', label: 'New Game', icon: PlusCircle },
  { href: '/players', label: 'Players', icon: Users },
  { href: '/history', label: 'History', icon: History },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#080c18]/95 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 h-14">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-amber-400 mr-4">
          <Dices className="w-6 h-6" />
          <span className="hidden sm:inline">BeerDie</span>
        </Link>
        <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-none flex-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                path === href ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              )}>
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
