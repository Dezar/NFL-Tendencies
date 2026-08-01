import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { Activity, Users, UserCheck, Star, TrendingUp, BarChart2, Target } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Players from './pages/Players'
import Coaches from './pages/Coaches'
import CheatSheet from './pages/CheatSheet'
import Projections from './pages/Projections'
import StatProjections from './pages/StatProjections'
import DraftValue from './pages/DraftValue'

const navItems = [
  { to: '/', label: 'Dashboard', icon: Activity },
  { to: '/players', label: 'Players', icon: Users },
  { to: '/coaches', label: 'Coaches', icon: UserCheck },
  { to: '/projections', label: 'Projections', icon: TrendingUp },
  { to: '/stats', label: 'Stat Lines', icon: BarChart2 },
  { to: '/draft', label: 'Draft Value', icon: Target },
  { to: '/cheatsheet', label: 'Cheat Sheet', icon: Star },
]

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-nfl-border bg-nfl-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nfl-blue to-nfl-purple flex items-center justify-center">
              <Activity size={16} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight">NFL Tendency Engine</span>
              <span className="ml-2 text-xs text-slate-500 font-medium">2026 Season</span>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-nfl-blue/20 text-nfl-blue'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/players" element={<Players />} />
          <Route path="/coaches" element={<Coaches />} />
          <Route path="/projections" element={<Projections />} />
          <Route path="/stats" element={<StatProjections />} />
          <Route path="/draft" element={<DraftValue />} />
          <Route path="/cheatsheet" element={<CheatSheet />} />
        </Routes>
      </main>

      <footer className="border-t border-nfl-border py-4 text-center text-xs text-slate-600">
        NFL Tendency Engine · Data through 2025 season · Rosters as of August 2026
      </footer>
    </div>
  )
}
