import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Settings } from 'lucide-react'
import { projectPlayer, getTier, DEFAULT_SCORING, HALF_PPR_SCORING, STD_SCORING, calcPPR } from '../engine/scoring'
import tendencies from '../data/tendencies.json'
import rostersData from '../data/rosters_2026.json'
import PlayerModal from '../components/PlayerModal'

const POS_TABS = ['ALL','QB','RB','WR','TE']

// Identify "hidden gem" situations from tendencies data
const GEM_FLAGS = {}
tendencies.teams.forEach(team => {
  const isNewCaller = team.newCaller
  ;(team.keyPlayers||[]).forEach(kp => {
    const flags = []
    if (isNewCaller) flags.push('New Play-Caller')
    GEM_FLAGS[`${team.team}_${kp.name}`] = flags
  })
})

function SortHeader({ label, field, sortBy, sortDir, onSort, center }) {
  const active = sortBy === field
  return (
    <th onClick={() => onSort(field)}
        className={`px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide cursor-pointer hover:text-white select-none ${center ? 'text-center' : 'text-left'}`}>
      <div className={`flex items-center gap-1 ${center ? 'justify-center' : ''}`}>
        {label}
        {active ? (sortDir==='desc' ? <ChevronDown size={11}/> : <ChevronUp size={11}/>) : <ChevronsUpDown size={11} className="opacity-25"/>}
      </div>
    </th>
  )
}

const SCORING_PRESETS = [
  { label: 'PPR', scoring: DEFAULT_SCORING },
  { label: 'Half PPR', scoring: HALF_PPR_SCORING },
  { label: 'Standard', scoring: STD_SCORING },
]

export default function StatProjections() {
  const [posFilter, setPosFilter] = useState('ALL')
  const [teamFilter, setTeamFilter] = useState('ALL')
  const [tierFilter, setTierFilter] = useState('ALL')
  const [depthMax, setDepthMax] = useState(2)
  const [sortBy, setSortBy] = useState('ppr')
  const [sortDir, setSortDir] = useState('desc')
  const [situationFilter, setSituationFilter] = useState('all')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [selectedTeamData, setSelectedTeamData] = useState(null)
  // Always default to PPR - clear any cached scoring state
  const [scoringPreset, setScoringPreset] = useState(0)
  const [showScoring, setShowScoring] = useState(false)
  const [customScoring, setCustomScoring] = useState({ ...DEFAULT_SCORING })

  // Always use customScoring when panel is open, otherwise use preset
  const scoring = showScoring ? customScoring : SCORING_PRESETS[scoringPreset].scoring

  const teamMap = useMemo(() => {
    const m = {}
    tendencies.teams.forEach(t => { m[t.team] = t })
    return m
  }, [])

  const allProjected = useMemo(() => {
    return rostersData.players
      .filter(p => p.depth_rank <= depthMax)
      .map(p => {
        const team = teamMap[p.team] || {}
        const proj = projectPlayer(p, team, scoring)
        return {
          ...p, ...proj,
          playCaller: team.playCaller || '?',
          rbSeasons: team.rbSeasons ?? 0,
          newCaller: team.newCaller ?? false,
          rbSeasons: team.rbSeasons ?? 0,
          rbStyle: team.rbStyle, teStyle: team.teStyle, wr1Style: team.wr1Style,
        }
      })
      .filter(p => p.ppr > 0)
  }, [teamMap, depthMax, scoring])

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d==='desc'?'asc':'desc')
    else { setSortBy(field); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    return allProjected
      .filter(p => {
        if (posFilter !== 'ALL' && p.position !== posFilter) return false
        if (teamFilter !== 'ALL' && p.team !== teamFilter) return false
        if (tierFilter !== 'ALL' && getTier(p.position, p.ppr).label !== tierFilter) return false
        if (situationFilter === 'new_caller' && !p.newCaller) return false
        if (situationFilter === 'rookie' && (p.years_exp == null || parseInt(p.years_exp) > 0)) return false
        if (situationFilter === 'new_team' && parseInt(p.years_exp) <= 1 && p.depth_rank > 1) return false
        return true
      })
      .sort((a, b) => {
        const av = a[sortBy] ?? 0, bv = b[sortBy] ?? 0
        return sortDir === 'desc' ? bv - av : av - bv
      })
  }, [allProjected, posFilter, teamFilter, tierFilter, sortBy, sortDir, situationFilter])

  const teams = useMemo(() => ['ALL', ...new Set(rostersData.players.map(p => p.team).sort())], [])
  const summary = useMemo(() => ({
    elite: filtered.filter(p => getTier(p.position, p.ppr).label === 'Elite').length,
    starter: filtered.filter(p => getTier(p.position, p.ppr).label === 'Starter').length,
    total: filtered.length,
  }), [filtered])

  const exportCSV = () => {
    const rows = [
      ['Rank','Player','Pos','Depth','Team','PlayCaller','PPR','Std','Floor','Ceiling','Pts/Gm',
       'Carries','RushYds','RushTDs','Targets','Receptions','RecYds','RecTDs','PassYds','PassTDs','Tier'],
      ...filtered.map((p, i) => [
        i+1, p.player_name, p.position, p.depth_rank, p.team, p.playCaller,
        p.ppr, p.std, p.floor, p.ceiling, p.gpPPR,
        p.carries??'', p.rushYds??'', p.rushTds??'',
        p.tgts??'', p.receptions??'', p.recYds??'', p.recTds??'',
        p.passYds??'', p.passTds??'', getTier(p.position, p.ppr).label,
      ])
    ]
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')], { type:'text/csv' }))
    a.download = `nfl_projections_2026.csv`
    a.click()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">2026 Projected Stats</h1>
        <p className="text-slate-400 text-sm">
          Full-season projections from play-caller tendency × depth chart. Calibrated against 2025 actuals. Click any player for 2024 + 2025 stat comparison.
          Click any player for breakdown + 2024 actuals. Rosters: {rostersData.lastUpdated}.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-nfl-card border border-nfl-border rounded-xl p-4">
          <div className="text-2xl font-black text-white">{summary.total}</div>
          <div className="text-xs text-slate-400 mt-1">Players projected</div>
        </div>
        <div className="bg-nfl-card border border-emerald-400/20 rounded-xl p-4">
          <div className="text-2xl font-black text-emerald-400">{summary.elite}</div>
          <div className="text-xs text-slate-400 mt-1">Elite tier</div>
        </div>
        <div className="bg-nfl-card border border-blue-400/20 rounded-xl p-4">
          <div className="text-2xl font-black text-blue-400">{summary.starter}</div>
          <div className="text-xs text-slate-400 mt-1">Starter tier</div>
        </div>
      </div>

      {/* Scoring selector */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <span className="text-xs text-slate-500 font-medium">Scoring:</span>
        {SCORING_PRESETS.map((p, i) => (
          <button key={p.label} onClick={() => { setScoringPreset(i); setShowScoring(false) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              scoringPreset === i && !showScoring ? 'bg-nfl-purple text-white' : 'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'
            }`}>{p.label}</button>
        ))}
        <button onClick={() => setShowScoring(s => !s)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            showScoring ? 'bg-nfl-purple text-white' : 'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'
          }`}>
          <Settings size={12} /> Custom
        </button>
      </div>

      {/* Custom scoring panel */}
      {showScoring && (
        <div className="bg-nfl-card border border-nfl-border rounded-xl p-5 mb-4">
          <div className="text-sm font-semibold text-white mb-4">Custom Scoring Settings</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'reception', label: 'Reception (PPR)' },
              { key: 'recYd', label: 'Rec Yard (per yd)' },
              { key: 'recTd', label: 'Rec TD' },
              { key: 'rushYd', label: 'Rush Yard (per yd)' },
              { key: 'rushTd', label: 'Rush TD' },
              { key: 'passTd', label: 'Pass TD' },
              { key: 'passYd', label: 'Pass Yard (per yd)' },
              { key: 'passInt', label: 'Interception' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-slate-400 block mb-1">{label}</label>
                <input
                  type="number" step="0.1"
                  value={customScoring[key]}
                  onChange={e => setCustomScoring(s => ({ ...s, [key]: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-nfl-dark border border-nfl-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-nfl-blue"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            {SCORING_PRESETS.map((p, i) => (
              <button key={p.label} onClick={() => setCustomScoring({ ...p.scoring })}
                className="px-3 py-1 bg-nfl-dark border border-nfl-border rounded-lg text-xs text-slate-400 hover:text-white">
                Load {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1">
          {POS_TABS.map(pos => (
            <button key={pos} onClick={() => setPosFilter(pos)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                posFilter === pos ? 'bg-nfl-blue text-white' : 'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'
              }`}>{pos}</button>
          ))}
        </div>
        <div className="flex gap-1">
          {['ALL','Elite','Starter','Flex','Depth'].map(t => (
            <button key={t} onClick={() => setTierFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tierFilter === t ? 'bg-nfl-purple text-white' : 'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'
              }`}>{t}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-nfl-card border border-nfl-border rounded-lg px-3 py-1.5">
          <span className="text-xs text-slate-400">Depth:</span>
          {[1,2,3].map(d => (
            <button key={d} onClick={() => setDepthMax(d)}
              className={`w-6 h-6 rounded text-xs font-bold ${depthMax===d?'bg-nfl-blue text-white':'text-slate-400 hover:text-white'}`}>{d}</button>
          ))}
        </div>
        <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
          className="bg-nfl-card border border-nfl-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {/* Situation / Gem filter */}
        <div className="flex gap-1">
          {[
            { val:'all',        label:'All Situations' },
            { val:'new_caller', label:'🆕 New Play-Caller' },
            { val:'rookie',     label:'🌟 Rookie (0yr)' },
            { val:'new_team',   label:'🔄 New Team' },
          ].map(({val, label}) => (
            <button key={val} onClick={() => setSituationFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                situationFilter===val?'bg-amber-500 text-black':'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'
              }`}>{label}</button>
          ))}
        </div>
        <button onClick={exportCSV}
          className="px-3 py-1.5 bg-nfl-card border border-nfl-border rounded-lg text-xs text-slate-300 hover:text-white ml-auto">
          ↓ CSV
        </button>
      </div>

      <div className="text-xs text-slate-500 mb-3">{filtered.length} players · Click any row for full breakdown + 2024 actuals · Click headers to sort</div>

      {/* Table */}
      <div className="bg-nfl-card border border-nfl-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-nfl-border">
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide w-8 text-center">#</th>
              <SortHeader label="Player" field="player_name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide text-center">Pos</th>
              <SortHeader label="Team" field="team" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide text-center">D</th>
              <SortHeader label={`${SCORING_PRESETS[scoringPreset].label} Pts`} field="ppr" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center />
              <SortHeader label="Std" field="std" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center />
              <SortHeader label="Floor" field="floor" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center />
              <SortHeader label="Ceiling" field="ceiling" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center />
              <SortHeader label="Pt/Gm" field="gpPPR" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center />
              <SortHeader label="Car" field="carries" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center />
              <SortHeader label="RYds" field="rushYds" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center />
              <SortHeader label="Tgt" field="tgts" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center />
              <SortHeader label="Rec" field="receptions" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center />
              <SortHeader label="RecYds" field="recYds" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center />
              <SortHeader label="TDs" field="recTds" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center />
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Tier</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const tier = getTier(p.position, p.ppr)
              return (
                <tr key={`${p.team}-${p.player_name}`}
                  onClick={() => { setSelectedPlayer(p); setSelectedTeamData(teamMap[p.team] || null) }}
                  className={`border-b border-nfl-border/40 hover:bg-nfl-blue/5 cursor-pointer transition-colors ${tier.label==='Elite'?'bg-emerald-400/[0.02]':''}`}>
                  <td className="px-3 py-2.5 text-xs text-slate-500 text-center">{i+1}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-white hover:text-nfl-blue">{p.player_name}</span>
                      {p.newCaller && <span className="text-xs bg-amber-500/20 text-amber-400 px-1 rounded font-bold">NEW</span>}
                      {(p.years_exp===0||p.years_exp==='0') && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1 rounded font-bold">RC</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-xs font-bold bg-nfl-border/50 text-slate-300 px-1.5 py-0.5 rounded">{p.position}</span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300 font-medium">{p.team}</td>
                  <td className="px-3 py-2.5 text-slate-500 text-xs text-center">#{p.depth_rank}</td>
                  <td className="px-3 py-2.5 text-center"><span className={`font-black text-base ${tier.color}`}>{p.ppr}</span></td>
                  <td className="px-3 py-2.5 text-center text-slate-400 text-sm">{p.std}</td>
                  <td className="px-3 py-2.5 text-center text-amber-400 text-xs font-semibold">{p.floor}</td>
                  <td className="px-3 py-2.5 text-center text-blue-400 text-xs font-semibold">{p.ceiling}</td>
                  <td className="px-3 py-2.5 text-center text-slate-400 text-xs">{p.gpPPR}</td>
                  <td className="px-3 py-2.5 text-center text-slate-400 text-xs">{p.carries??'—'}</td>
                  <td className="px-3 py-2.5 text-center text-slate-400 text-xs">{p.rushYds??'—'}</td>
                  <td className="px-3 py-2.5 text-center text-slate-400 text-xs">{p.tgts??'—'}</td>
                  <td className="px-3 py-2.5 text-center text-slate-400 text-xs">{p.receptions??'—'}</td>
                  <td className="px-3 py-2.5 text-center text-slate-400 text-xs">{p.recYds??'—'}</td>
                  <td className="px-3 py-2.5 text-center text-slate-400 text-xs">{p.rushTds??p.recTds??'—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${tier.bg} ${tier.color}`}>{tier.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-slate-500">No players match.</div>}
      </div>

      <div className="mt-3 text-xs text-slate-600">
        Projections calibrated against 2024 actuals. Based on play-caller historical scheme tendencies, not individual talent. New callers use league averages.
      </div>

      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          team={selectedTeamData}
          scoring={scoring}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  )
}
