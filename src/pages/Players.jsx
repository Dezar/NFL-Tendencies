import React, { useState, useMemo } from 'react'
import data from '../data/tendencies.json'

// Flatten all players from all teams
const allPlayers = data.teams.flatMap(team =>
  (team.keyPlayers || []).map(p => ({
    ...p,
    team: team.team,
    fullTeamName: team.fullName,
    playCaller: team.playCaller,
    newCaller: team.newCaller,
    rbStyle: team.rbStyle,
    teStyle: team.teStyle,
    wr1Style: team.wr1Style,
    avgRbShare: team.avgRbShare,
    avgTeShare: team.avgTeShare,
    avgWr1Share: team.avgWr1Share,
  }))
)

const SIGNAL_LABELS = { green: '🔥 Green Flag', yellow: '⚠️ Monitor', red: '❌ Red Flag' }
const SIGNAL_STYLES = {
  green: 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/30',
  yellow: 'bg-amber-400/10 text-amber-400 border border-amber-400/30',
  red: 'bg-red-400/10 text-red-400 border border-red-400/30',
}

export default function Players() {
  const [search, setSearch] = useState('')
  const [posFilter, setPosFilter] = useState('ALL')
  const [signalFilter, setSignalFilter] = useState('all')
  const [sort, setSort] = useState('signal')

  const filtered = useMemo(() => {
    return allPlayers
      .filter(p => {
        if (posFilter !== 'ALL' && p.pos !== posFilter) return false
        if (signalFilter !== 'all' && p.signal !== signalFilter) return false
        if (search) {
          const q = search.toLowerCase()
          return p.name.toLowerCase().includes(q) ||
            p.team.toLowerCase().includes(q) ||
            p.playCaller.toLowerCase().includes(q)
        }
        return true
      })
      .sort((a, b) => {
        if (sort === 'signal') {
          const order = { green: 0, yellow: 1, red: 2 }
          return (order[a.signal] ?? 3) - (order[b.signal] ?? 3)
        }
        if (sort === 'name') return a.name.localeCompare(b.name)
        if (sort === 'team') return a.team.localeCompare(b.team)
        if (sort === 'pos') return a.pos.localeCompare(b.pos)
        if (sort === 'depth') return a.depth - b.depth
        return 0
      })
  }, [search, posFilter, signalFilter, sort])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Player Scheme Fits</h1>
        <p className="text-slate-400 text-sm">Every skill position player flagged by their 2026 play-caller's historical tendency.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search player, team, or coach..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-nfl-card border border-nfl-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-nfl-blue w-64"
        />

        {/* Position filters */}
        <div className="flex gap-1">
          {['ALL', 'QB', 'RB', 'WR', 'TE'].map(pos => (
            <button
              key={pos}
              onClick={() => setPosFilter(pos)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                posFilter === pos ? 'bg-nfl-blue text-white' : 'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Signal filters */}
        <div className="flex gap-1">
          {[['all', 'All'], ['green', '🔥 Green'], ['yellow', '⚠️ Monitor'], ['red', '❌ Red']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSignalFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                signalFilter === val ? 'bg-nfl-blue text-white' : 'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'
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
          <option value="signal">Sort: Signal</option>
          <option value="name">Sort: Name</option>
          <option value="team">Sort: Team</option>
          <option value="pos">Sort: Position</option>
          <option value="depth">Sort: Depth</option>
        </select>
      </div>

      {/* Results count */}
      <div className="text-xs text-slate-500 mb-4">{filtered.length} players</div>

      {/* Table */}
      <div className="bg-nfl-card border border-nfl-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nfl-border">
              <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Player</th>
              <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Pos</th>
              <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Team</th>
              <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Depth</th>
              <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Play Caller</th>
              <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Signal</th>
              <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Note</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr
                key={`${p.team}-${p.name}`}
                className={`border-b border-nfl-border/50 hover:bg-white/2 transition-colors ${
                  i % 2 === 0 ? '' : 'bg-white/[0.02]'
                }`}
              >
                <td className="px-4 py-3 font-semibold text-white">{p.name}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-bold bg-nfl-border/50 text-slate-300 px-2 py-0.5 rounded">{p.pos}</span>
                </td>
                <td className="px-4 py-3 text-slate-300 font-medium">{p.team}</td>
                <td className="px-4 py-3 text-slate-400">#{p.depth}</td>
                <td className="px-4 py-3 text-slate-400">
                  {p.playCaller}
                  {p.newCaller && <span className="ml-1 text-amber-400 text-xs">(New)</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SIGNAL_STYLES[p.signal] || 'text-slate-400'}`}>
                    {SIGNAL_LABELS[p.signal] || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 max-w-xs">{p.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">No players match that filter.</div>
        )}
      </div>
    </div>
  )
}
