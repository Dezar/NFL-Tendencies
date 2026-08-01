import React, { useState } from 'react'
import data from '../data/tendencies.json'

const RB_COLORS = {
  'Workhorse (75%+)': 'text-emerald-400',
  'Featured (65-74%)': 'text-blue-400',
  'Lean RB1 (55-64%)': 'text-amber-400',
  'Committee (<55%)': 'text-red-400',
}

const TE_COLORS = {
  'TE-Heavy (30%+)': 'text-emerald-400',
  'TE-Friendly (25-29%)': 'text-blue-400',
  'Neutral (20-24%)': 'text-amber-400',
  'TE-Averse (<20%)': 'text-red-400',
}

const WR_COLORS = {
  'WR1-Dominant (30%+)': 'text-emerald-400',
  'Alpha-Lean (25-29%)': 'text-blue-400',
  'Balanced (20-24%)': 'text-amber-400',
  'Spread (WR1 <20%)': 'text-red-400',
}

function SignalDot({ value, colorMap }) {
  const color = colorMap[value] || 'text-slate-400'
  return (
    <span className={`text-xs font-semibold ${color}`}>
      {value || 'Unknown'}
    </span>
  )
}

function StatBar({ value, max = 100, color }) {
  return (
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      />
    </div>
  )
}

export default function Dashboard() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('team')

  const filtered = data.teams
    .filter(t => {
      if (search) {
        const q = search.toLowerCase()
        return t.team.toLowerCase().includes(q) ||
          t.fullName.toLowerCase().includes(q) ||
          t.playCaller.toLowerCase().includes(q)
      }
      if (filter === 'workhorse') return t.avgRbShare >= 75
      if (filter === 'committee') return t.avgRbShare < 55
      if (filter === 'te-heavy') return t.avgTeShare >= 28
      if (filter === 'wr1-dom') return t.avgWr1Share >= 28
      if (filter === 'new') return t.newCaller
      return true
    })
    .sort((a, b) => {
      if (sort === 'team') return a.team.localeCompare(b.team)
      if (sort === 'rb') return b.avgRbShare - a.avgRbShare
      if (sort === 'te') return b.avgTeShare - a.avgTeShare
      if (sort === 'wr') return b.avgWr1Share - a.avgWr1Share
      return 0
    })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">2026 Team Tendency Dashboard</h1>
        <p className="text-slate-400 text-sm">
          Historical play-caller fingerprints mapped to current rosters. {data.teams.length} teams · Data through 2025.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search team or coach..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-nfl-card border border-nfl-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-nfl-blue w-56"
        />
        <div className="flex gap-2 flex-wrap">
          {[
            ['all', 'All Teams'],
            ['workhorse', '🔥 Workhorse RB'],
            ['committee', '❌ Committee RB'],
            ['te-heavy', '🔥 TE-Heavy'],
            ['wr1-dom', '🔥 WR1 Dominant'],
            ['new', '❓ New Caller'],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === val
                  ? 'bg-nfl-blue text-white'
                  : 'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="bg-nfl-card border border-nfl-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none ml-auto"
        >
          <option value="team">Sort: Team</option>
          <option value="rb">Sort: RB Share ↓</option>
          <option value="te">Sort: TE Share ↓</option>
          <option value="wr">Sort: WR1 Share ↓</option>
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(team => (
          <div key={team.team} className="bg-nfl-card border border-nfl-border rounded-xl p-5 hover:border-nfl-blue/40 transition-all">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-white">{team.team}</span>
                  {team.newCaller && (
                    <span className="text-xs bg-amber-400/10 text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded-full font-medium">
                      New Caller
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{team.fullName}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Play Caller</div>
                <div className="text-sm font-semibold text-white">{team.playCaller}</div>
              </div>
            </div>

            {/* Tendency bars */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-400">RB Carry Share</span>
                  <SignalDot value={team.rbStyle} colorMap={RB_COLORS} />
                </div>
                <StatBar value={team.avgRbShare} max={100} color="bg-blue-500" />
                <div className="text-right text-xs text-slate-500 mt-0.5">{team.avgRbShare?.toFixed(1)}% avg RB1</div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-400">TE Target Share</span>
                  <SignalDot value={team.teStyle} colorMap={TE_COLORS} />
                </div>
                <StatBar value={team.avgTeShare} max={45} color="bg-purple-500" />
                <div className="text-right text-xs text-slate-500 mt-0.5">{team.avgTeShare?.toFixed(1)}% avg TE</div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-400">WR1 Target Share</span>
                  <SignalDot value={team.wr1Style} colorMap={WR_COLORS} />
                </div>
                <StatBar value={team.avgWr1Share} max={40} color="bg-emerald-500" />
                <div className="text-right text-xs text-slate-500 mt-0.5">{team.avgWr1Share?.toFixed(1)}% avg WR1</div>
              </div>
            </div>

            {/* Key players */}
            {team.keyPlayers && (
              <div className="mt-4 pt-4 border-t border-nfl-border">
                <div className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Key Players</div>
                <div className="flex flex-wrap gap-1.5">
                  {team.keyPlayers.slice(0, 4).map(p => (
                    <span
                      key={p.name}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${p.signal === 'green' ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20' :
                          p.signal === 'red' ? 'bg-red-400/10 text-red-400 border border-red-400/20' :
                          'bg-slate-400/10 text-slate-300 border border-slate-400/20'}
                      `}
                    >
                      {p.pos} {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {team.notes && (
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">{team.notes}</p>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500">No teams match that filter.</div>
      )}
    </div>
  )
}
