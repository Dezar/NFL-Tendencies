import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { BarChart2 } from 'lucide-react'
import StatProjections from './pages/StatProjections'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-nfl-border bg-nfl-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nfl-blue to-nfl-purple flex items-center justify-center">
            <BarChart2 size={16} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight">NFL Tendency Engine</span>
            <span className="ml-2 text-xs text-slate-500 font-medium">2026 Season · Stat Projections</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <Routes>
          <Route path="/*" element={<StatProjections />} />
        </Routes>
      </main>

      <footer className="border-t border-nfl-border py-4 text-center text-xs text-slate-600">
        NFL Tendency Engine · Calibrated against 2025 actuals · Rosters August 2026
      </footer>
    </div>
  )
}
