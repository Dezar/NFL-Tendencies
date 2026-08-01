import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { RefreshCw, Sliders, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { projectTeam, getFantasyTier } from '../engine/projections'
import tendencies from '../data/tendencies.json'

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE']
const STORAGE_KEY = 'nfl_projections_v1'
const OVERRIDES_KEY = 'nfl_overrides_v1'

// Default players from tendencies.json as fallback
const defaultPlayers = tendencies.teams.flatMap(team =>
  (team.keyPlayers || []).map(p => ({
    team: team.team,
    position: p.pos,
    player_name: p.name,
    depth_rank: p.depth,
    years_exp: null,
    age: null,
  }))
)

function Slider({ label, value, min, max, step = 1, onChange, color = 'blue', unit = '%' }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`text-xs font-bold text-${color}-400`}>{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${((value-min)/(max-min))*100}%, rgb(31 41 55) ${((value-min)/(max-min))*100}%, rgb(31 41 55) 100%)`
        }}
      />
    </div>
  )
}

function TierBadge({ pos, ppr }) {
  const tier = getFantasyTier(pos, ppr)
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${tier.bg} ${tier.color}`}>
      {tier.label}
    </span>
  )
}

function PlayerRow({ player, onOverride, overrides }) {
  const [expanded, setExpanded] = useState(false)
  const tier = getFantasyTier(player.position, player.ppr || 0)

  return (
    <>
      <tr
        className="border-b border-nfl-border/40 hover:bg-white/[0.02] cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            <span className="font-semibold text-white text-sm">{player.player_name}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs font-bold bg-nfl-border/50 text-slate-300 px-1.5 py-0.5 rounded">{player.position}</span>
        </td>
        <td className="px-4 py-3 text-slate-300 text-sm font-medium">{player.team}</td>
        <td className="px-4 py-3 text-slate-400 text-xs">#{player.depth_rank}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-black ${tier.color}`}>{player.ppr || 0}</span>
            <span className="text-xs text-slate-500">pts</span>
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-slate-500">{player.floor || 0} – {player.ceiling || 0}</td>
        <td className="px-4 py-3">
          <TierBadge pos={player.position} ppr={player.ppr || 0} />
        </td>
        <td className="px-4 py-3 text-xs text-slate-500">
          {player.position === 'RB' && `${player.carries || 0} car / ${player.targets || 0} tgt`}
          {player.position === 'WR' && `${player.targets || 0} tgt / ${player.recYds || 0} yds`}
          {player.position === 'TE' && `${player.targets || 0} tgt / ${player.recYds || 0} yds`}
          {player.position === 'QB' && `${player.passYds || 0} yds / ${player.passTds || 0} TD`}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-nfl-border/40 bg-nfl-dark/40">
          <td colSpan={8} className="px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Stat breakdown */}
              <div className="space-y-2">
                <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Projected Stats</div>
                {player.position === 'RB' && <>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Carries</span><span className="text-white font-semibold">{player.carries}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Rush Yds</span><span className="text-white font-semibold">{player.rushYds}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Rush TDs</span><span className="text-white font-semibold">{player.rushTds}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Targets</span><span className="text-white font-semibold">{player.targets}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Receptions</span><span className="text-white font-semibold">{player.receptions}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Rec Yds</span><span className="text-white font-semibold">{player.recYds}</span></div>
                </>}
                {(player.position === 'WR' || player.position === 'TE') && <>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Target Share</span><span className="text-white font-semibold">{player.targetShare}%</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Targets</span><span className="text-white font-semibold">{player.targets}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Receptions</span><span className="text-white font-semibold">{player.receptions}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Rec Yds</span><span className="text-white font-semibold">{player.recYds}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Rec TDs</span><span className="text-white font-semibold">{player.recTds}</span></div>
                </>}
                {player.position === 'QB' && <>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Pass Att</span><span className="text-white font-semibold">{player.passAttempts}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Pass Yds</span><span className="text-white font-semibold">{player.passYds}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Pass TDs</span><span className="text-white font-semibold">{player.passTds}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Rush Yds</span><span className="text-white font-semibold">{player.rushYds}</span></div>
                </>}
              </div>

              {/* Scoring */}
              <div className="space-y-2">
                <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Fantasy Points</div>
                <div className="flex justify-between text-xs"><span className="text-slate-400">PPR</span><span className="text-emerald-400 font-black text-base">{player.ppr}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-400">Standard</span><span className="text-white font-semibold">{player.std}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-400">Floor</span><span className="text-amber-400 font-semibold">{player.floor}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-400">Ceiling</span><span className="text-blue-400 font-semibold">{player.ceiling}</span></div>
              </div>

              {/* Player overrides */}
              <div className="col-span-2 space-y-3">
                <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Your Overrides</div>
                {player.position === 'RB' && (
                  <Slider
                    label="Role adjustment (carry share %)"
                    value={overrides[`${player.team}_${player.player_name}_rbShare`] ?? Math.round((player.carries / 420) * 100)}
                    min={5} max={95}
                    onChange={v => onOverride(`${player.team}_${player.player_name}_rbShare`, v)}
                    color="blue"
                  />
                )}
                {(player.position === 'WR') && (
                  <Slider
                    label="Target share %"
                    value={overrides[`${player.team}_${player.player_name}_tgtShare`] ?? Math.round(player.targetShare || 20)}
                    min={5} max={40}
                    onChange={v => onOverride(`${player.team}_${player.player_name}_tgtShare`, v)}
                    color="emerald"
                  />
                )}
                {player.position === 'TE' && (
                  <Slider
                    label="Target share %"
                    value={overrides[`${player.team}_${player.player_name}_tgtShare`] ?? Math.round(player.targetShare || 15)}
                    min={2} max={35}
                    onChange={v => onOverride(`${player.team}_${player.player_name}_tgtShare`, v)}
                    color="purple"
                  />
                )}
                <div className="text-xs text-slate-600 mt-1">Overrides are saved automatically in your browser.</div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function Projections() {
  const [players, setPlayers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : defaultPlayers
    } catch { return defaultPlayers }
  })

  const [overrides, setOverrides] = useState(() => {
    try {
      const saved = localStorage.getItem(OVERRIDES_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch { return {} }
  })

  // Team-level sliders (apply to all players on that team)
  const [teamOverrides, setTeamOverrides] = useState({})

  const [posFilter, setPosFilter] = useState('ALL')
  const [teamFilter, setTeamFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('ppr')
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [showTeamSliders, setShowTeamSliders] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState('BAL')

  // Save overrides to localStorage
  useEffect(() => {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides))
  }, [overrides])

  const handleOverride = useCallback((key, value) => {
    setOverrides(prev => ({ ...prev, [key]: value }))
  }, [])

  // Refresh rosters from API
  const refreshRosters = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/rosters')
      const data = await res.json()
      if (data.success && data.players.length > 0) {
        setPlayers(data.players)
        setLastUpdated(data.lastUpdated)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.players))
      }
    } catch (e) {
      console.error('Roster refresh failed:', e)
    }
    setLoading(false)
  }

  // Build coach lookup
  const coachByTeam = useMemo(() => {
    const map = {}
    tendencies.teams.forEach(t => {
      map[t.team] = {
        avgRbShare: t.avgRbShare,
        avgTeShare: t.avgTeShare,
        avgWr1Share: t.avgWr1Share,
        newCaller: t.newCaller,
        playCaller: t.playCaller,
      }
    })
    return map
  }, [])

  // Run projections
  const projected = useMemo(() => {
    const byTeam = {}
    players.forEach(p => {
      if (!byTeam[p.team]) byTeam[p.team] = []
      byTeam[p.team].push(p)
    })

    const results = []
    Object.entries(byTeam).forEach(([team, teamPlayers]) => {
      const coach = coachByTeam[team] || {}
      const to = teamOverrides[team] || {}
      const projected = projectTeam(teamPlayers, coach, to)
      results.push(...projected)
    })
    return results
  }, [players, coachByTeam, teamOverrides, overrides])

  // Filter + sort
  const filtered = useMemo(() => {
    return projected
      .filter(p => {
        if (posFilter !== 'ALL' && p.position !== posFilter) return false
        if (teamFilter !== 'ALL' && p.team !== teamFilter) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'ppr') return (b.ppr || 0) - (a.ppr || 0)
        if (sortBy === 'ceiling') return (b.ceiling || 0) - (a.ceiling || 0)
        if (sortBy === 'floor') return (b.floor || 0) - (a.floor || 0)
        if (sortBy === 'name') return a.player_name.localeCompare(b.player_name)
        if (sortBy === 'team') return a.team.localeCompare(b.team)
        return 0
      })
  }, [projected, posFilter, teamFilter, sortBy])

  const teams = useMemo(() => ['ALL', ...new Set(players.map(p => p.team).sort())], [players])
  const selectedCoach = coachByTeam[selectedTeam] || {}

  // Export CSV
  const exportCSV = () => {
    const rows = [
      ['Player', 'Position', 'Team', 'Depth', 'PPR', 'Std', 'Floor', 'Ceiling', 'Carries/Targets', 'Yds', 'TDs'],
      ...filtered.map(p => [
        p.player_name, p.position, p.team, p.depth_rank,
        p.ppr, p.std, p.floor, p.ceiling,
        p.position === 'RB' ? p.carries : p.targets,
        p.position === 'QB' ? p.passYds : p.recYds,
        p.position === 'RB' ? p.rushTds : p.recTds,
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nfl_projections_2026_${posFilter}.csv`
    a.click()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">2026 Fantasy Projections</h1>
          <p className="text-slate-400 text-sm">
            Scheme-based projections. Click any player to expand and adjust their role.
            {lastUpdated && <span className="ml-2 text-slate-500">Rosters: {lastUpdated}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refreshRosters}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-nfl-card border border-nfl-border rounded-lg text-sm text-slate-300 hover:text-white hover:border-nfl-blue transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Pulling rosters...' : 'Refresh Rosters'}
          </button>
          <button
            onClick={() => setShowTeamSliders(!showTeamSliders)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              showTeamSliders ? 'bg-nfl-blue text-white' : 'bg-nfl-card border border-nfl-border text-slate-300 hover:text-white'
            }`}
          >
            <Sliders size={14} />
            Team Adjustments
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-nfl-card border border-nfl-border rounded-lg text-sm text-slate-300 hover:text-white transition-all"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Team-level sliders panel */}
      {showTeamSliders && (
        <div className="bg-nfl-card border border-nfl-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-sm font-semibold text-white">Adjust team assumptions for:</div>
            <select
              value={selectedTeam}
              onChange={e => setSelectedTeam(e.target.value)}
              className="bg-nfl-dark border border-nfl-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
            >
              {tendencies.teams.map(t => (
                <option key={t.team} value={t.team}>{t.team} — {t.playCaller}</option>
              ))}
            </select>
            <span className="text-xs text-slate-500 ml-auto">
              Historical avg: RB {selectedCoach.avgRbShare?.toFixed(1)}% · TE {selectedCoach.avgTeShare?.toFixed(1)}% · WR1 {selectedCoach.avgWr1Share?.toFixed(1)}%
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Slider
              label="RB1 Carry Share %"
              value={teamOverrides[selectedTeam]?.rbShare ?? Math.round(selectedCoach.avgRbShare || 65)}
              min={30} max={95}
              onChange={v => setTeamOverrides(prev => ({ ...prev, [selectedTeam]: { ...prev[selectedTeam], rbShare: v } }))}
              color="blue"
            />
            <Slider
              label="TE Target Share %"
              value={teamOverrides[selectedTeam]?.teShare ?? Math.round(selectedCoach.avgTeShare || 22)}
              min={10} max={40}
              onChange={v => setTeamOverrides(prev => ({ ...prev, [selectedTeam]: { ...prev[selectedTeam], teShare: v } }))}
              color="purple"
            />
            <Slider
              label="WR1 Target Share %"
              value={teamOverrides[selectedTeam]?.wr1Share ?? Math.round(selectedCoach.avgWr1Share || 23)}
              min={10} max={40}
              onChange={v => setTeamOverrides(prev => ({ ...prev, [selectedTeam]: { ...prev[selectedTeam], wr1Share: v } }))}
              color="emerald"
            />
            <Slider
              label="Team Pass Attempts"
              value={teamOverrides[selectedTeam]?.teamPassAttempts ?? 560}
              min={400} max={700} step={10}
              onChange={v => setTeamOverrides(prev => ({ ...prev, [selectedTeam]: { ...prev[selectedTeam], teamPassAttempts: v } }))}
              color="amber"
              unit=""
            />
            <Slider
              label="Team Rush Attempts"
              value={teamOverrides[selectedTeam]?.teamCarries ?? 420}
              min={280} max={560} step={10}
              onChange={v => setTeamOverrides(prev => ({ ...prev, [selectedTeam]: { ...prev[selectedTeam], teamCarries: v } }))}
              color="red"
              unit=""
            />
            <div className="flex items-end">
              <button
                onClick={() => setTeamOverrides(prev => { const n = {...prev}; delete n[selectedTeam]; return n })}
                className="w-full px-3 py-2 bg-nfl-dark border border-nfl-border rounded-lg text-xs text-slate-400 hover:text-white transition-all"
              >
                Reset {selectedTeam} to historical defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1">
          {POSITIONS.map(pos => (
            <button key={pos} onClick={() => setPosFilter(pos)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                posFilter === pos ? 'bg-nfl-blue text-white' : 'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'
              }`}>{pos}</button>
          ))}
        </div>
        <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
          className="bg-nfl-card border border-nfl-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="bg-nfl-card border border-nfl-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none ml-auto">
          <option value="ppr">Sort: PPR Points</option>
          <option value="ceiling">Sort: Ceiling</option>
          <option value="floor">Sort: Floor</option>
          <option value="name">Sort: Name</option>
          <option value="team">Sort: Team</option>
        </select>
      </div>

      <div className="text-xs text-slate-500 mb-3">{filtered.length} players · Click any row to expand stats and override projections</div>

      {/* Table */}
      <div className="bg-nfl-card border border-nfl-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nfl-border">
              <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Player</th>
              <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Pos</th>
              <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Team</th>
              <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Depth</th>
              <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">PPR Pts</th>
              <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Range</th>
              <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Tier</th>
              <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Key Stats</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <PlayerRow
                key={`${p.team}-${p.player_name}`}
                player={p}
                onOverride={handleOverride}
                overrides={overrides}
              />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">No players match that filter.</div>
        )}
      </div>

      <div className="mt-4 text-xs text-slate-600">
        Projections are scheme-based estimates using historical play-caller tendencies × league-average efficiency.
        They reflect coaching tendency, not individual talent adjustments. Use the sliders to incorporate your own scouting.
      </div>
    </div>
  )
}
