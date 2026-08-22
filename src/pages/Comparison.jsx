import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { projectPlayer, DEFAULT_SCORING, HALF_PPR_SCORING, STD_SCORING } from '../engine/scoring'
import tendencies from '../data/tendencies.json'
import rostersData from '../data/rosters_2026.json'
import stats2025data from '../data/stats_2025.json'
import stats2024data from '../data/stats_2024.json'
import injuryData from '../data/injuries.json'
import PlayerModal from '../components/PlayerModal'

// ── Lookups ───────────────────────────────────────────────────────────────────
const S25 = {}
stats2025data.players.forEach(p => { S25[p.player_name] = p })
const S24 = {}
stats2024data.players.forEach(p => { S24[p.player_name] = p })
const INJURY_MAP = {}
injuryData.injuries.forEach(p => { INJURY_MAP[p.player_name] = p })

const SCORING_PRESETS = [
  { label: 'PPR', scoring: DEFAULT_SCORING },
  { label: 'Half', scoring: HALF_PPR_SCORING },
  { label: 'Std',  scoring: STD_SCORING },
]

function SortTh({ label, field, sortBy, sortDir, onSort }) {
  const active = sortBy === field
  return (
    <th onClick={() => onSort(field)}
      className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide cursor-pointer hover:text-white select-none text-right">
      <div className="flex items-center justify-end gap-1">
        {label}
        {active
          ? sortDir === 'desc' ? <ChevronDown size={11}/> : <ChevronUp size={11}/>
          : <ChevronsUpDown size={11} className="opacity-25"/>}
      </div>
    </th>
  )
}

function DiffBadge({ val }) {
  if (val == null) return <span className="text-slate-600">—</span>
  const color = val > 60 ? 'text-emerald-400 font-bold'
    : val > 20 ? 'text-emerald-400'
    : val < -60 ? 'text-red-400 font-bold'
    : val < -20 ? 'text-red-400'
    : 'text-slate-400'
  return <span className={color}>{val > 0 ? '+' : ''}{val}</span>
}

function TrendBars({ v24, v25, v26 }) {
  const max = Math.max(v24 || 0, v25 || 0, v26 || 0, 1)
  const bar = (v, color) => v
    ? <div className={`rounded-t ${color}`} style={{ width: 10, height: Math.round((v / max) * 28) }} />
    : <div className="rounded-t bg-nfl-dark" style={{ width: 10, height: 4 }} />
  return (
    <div className="flex items-end gap-0.5 h-7">
      {bar(v24, 'bg-slate-500')}
      {bar(v25, 'bg-amber-400')}
      {bar(v26, 'bg-blue-500')}
    </div>
  )
}

export default function Comparison() {
  const [posFilter, setPosFilter]       = useState('RB')
  const [scoringIdx, setScoringIdx]     = useState(0)
  const [depthFilter, setDepthFilter]   = useState(1)
  const [sortBy, setSortBy]             = useState('ppr_2025')
  const [sortDir, setSortDir]           = useState('desc')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [selectedTeam, setSelectedTeamData] = useState(null)

  const scoring = SCORING_PRESETS[scoringIdx].scoring
  const teamMap = useMemo(() => {
    const m = {}; tendencies.teams.forEach(t => { m[t.team] = t }); return m
  }, [])

  // Build all players with projections + actuals
  const allPlayers = useMemo(() => {
    return rostersData.players
      .filter(p => p.depth_rank <= depthFilter &&
        (posFilter === 'ALL' || p.position === posFilter))
      .map(p => {
        const team = teamMap[p.team] || {}
        const proj = projectPlayer(p, team, scoring)
        const a25  = S25[p.player_name] || Object.values(S25).find(x =>
          x.player_name.split(' ').pop() === p.player_name.split(' ').pop() &&
          Math.abs(x.player_name.length - p.player_name.length) < 10)
        const a24  = S24[p.player_name] || Object.values(S24).find(x =>
          x.player_name.split(' ').pop() === p.player_name.split(' ').pop() &&
          Math.abs(x.player_name.length - p.player_name.length) < 10)

        const ppr_2025 = a25?.fantasy_ppr ?? null
        const ppr_2024 = a24?.fantasy_ppr ?? null
        const diff_25  = ppr_2025 != null ? Math.round(proj.ppr - ppr_2025) : null
        const diff_24  = ppr_2024 != null ? Math.round(proj.ppr - ppr_2024) : null

        // Position-specific actual stats
        const carries_25   = a25?.carries ?? null
        const rush_yds_25  = a25?.rushing_yards ?? null
        const rush_tds_25  = a25?.rushing_tds ?? null
        const targets_25   = a25?.targets ?? null
        const rec_25       = a25?.receptions ?? null
        const rec_yds_25   = a25?.receiving_yards ?? null
        const rec_tds_25   = a25?.receiving_tds ?? null
        const ypc_25       = carries_25 ? +(rush_yds_25/carries_25).toFixed(1) : null
        const pass_yds_25  = a25?.passing_yards ?? null
        const pass_tds_25  = a25?.passing_tds ?? null
        const pass_att_25  = a25?.pass_att ?? null

        return {
          ...p, ...proj,
          playCaller: team.playCaller || '?',
          newCaller: team.newCaller || false,
          avgRbShare: team.avgRbShare,
          avgTeShare: team.avgTeShare,
          avgWr1Share: team.avgWr1Share,
          rbStyle: team.rbStyle,
          injury: INJURY_MAP[p.player_name] || null,
          // Actuals
          ppr_2025, ppr_2024, diff_25, diff_24,
          carries_25, rush_yds_25, rush_tds_25, ypc_25,
          targets_25, rec_25, rec_yds_25, rec_tds_25,
          pass_yds_25, pass_tds_25, pass_att_25,
        }
      })
  }, [teamMap, posFilter, depthFilter, scoring])

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d==='desc'?'asc':'desc')
    else { setSortBy(field); setSortDir('desc') }
  }

  const sorted = useMemo(() => [...allPlayers].sort((a, b) => {
    const av = a[sortBy] ?? (sortDir==='desc'?-9999:9999)
    const bv = b[sortBy] ?? (sortDir==='desc'?-9999:9999)
    return sortDir==='desc' ? bv-av : av-bv
  }), [allPlayers, sortBy, sortDir])

  // Summary
  const withActual = sorted.filter(p => p.ppr_2025 != null)
  const avgActual  = withActual.length ? Math.round(withActual.reduce((s,p)=>s+p.ppr_2025,0)/withActual.length) : 0
  const avgProj    = sorted.length ? Math.round(sorted.reduce((s,p)=>s+p.ppr,0)/sorted.length) : 0
  const bigBulls   = sorted.filter(p => p.diff_25 != null && p.diff_25 > 50)
  const bigBears   = sorted.filter(p => p.diff_25 != null && p.diff_25 < -50)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Sanity Check — Projections vs Actuals</h1>
        <p className="text-slate-400 text-sm">
          Compare our 2026 scheme projections directly against 2024 and 2025 actual fantasy scores.
          Sortable by any column. Click any player for full profile.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-nfl-card border border-nfl-border rounded-xl p-4">
          <div className="text-2xl font-black text-amber-300">{avgActual}</div>
          <div className="text-xs text-slate-400 mt-1">Avg 2025 PPR</div>
          <div className="text-xs text-slate-500 mt-0.5">{posFilter} starters</div>
        </div>
        <div className="bg-nfl-card border border-nfl-border rounded-xl p-4">
          <div className="text-2xl font-black text-blue-400">{avgProj}</div>
          <div className="text-xs text-slate-400 mt-1">Avg 2026 Proj</div>
          <div className="text-xs text-slate-500 mt-0.5">Our model</div>
        </div>
        <div className="bg-nfl-card border border-emerald-400/20 rounded-xl p-4">
          <div className="text-2xl font-black text-emerald-400">{bigBulls.length}</div>
          <div className="text-xs text-slate-400 mt-1">We project 50+ higher</div>
          <div className="text-xs text-slate-500 mt-0.5">Bullish vs 2025</div>
        </div>
        <div className="bg-nfl-card border border-red-400/20 rounded-xl p-4">
          <div className="text-2xl font-black text-red-400">{bigBears.length}</div>
          <div className="text-xs text-slate-400 mt-1">We project 50+ lower</div>
          <div className="text-xs text-slate-500 mt-0.5">Bearish vs 2025</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Position */}
        <div className="flex gap-1">
          {['ALL','QB','RB','WR','TE'].map(pos => (
            <button key={pos} onClick={() => setPosFilter(pos)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                posFilter===pos?'bg-nfl-blue text-white':'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'
              }`}>{pos}</button>
          ))}
        </div>

        {/* Depth */}
        <div className="flex items-center gap-2 bg-nfl-card border border-nfl-border rounded-lg px-3 py-1.5">
          <span className="text-xs text-slate-400">Depth ≤</span>
          {[1,2,3].map(d => (
            <button key={d} onClick={() => setDepthFilter(d)}
              className={`w-6 h-6 rounded text-xs font-bold transition-all ${
                depthFilter===d?'bg-nfl-blue text-white':'text-slate-400 hover:text-white'
              }`}>{d}</button>
          ))}
        </div>

        {/* Scoring */}
        <div className="flex gap-1">
          {SCORING_PRESETS.map((p,i) => (
            <button key={p.label} onClick={() => setScoringIdx(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                scoringIdx===i?'bg-nfl-purple text-white':'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'
              }`}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
        <span>{sorted.length} players · Click headers to sort · Click player for full profile</span>
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-slate-500"/><span>2024</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-amber-400"/><span>2025 actual</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-blue-500"/><span>2026 proj</span></div>
        </div>
      </div>

      {/* Main table */}
      <div className="bg-nfl-card border border-nfl-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-nfl-border bg-nfl-dark/40">
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-left">#</th>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-left">Player</th>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-center">Pos</th>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-left">Team</th>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-center">Scheme</th>
              {/* PPR columns */}
              <SortTh label="2024 PPR" field="ppr_2024" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <SortTh label="2025 PPR" field="ppr_2025" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <SortTh label="2026 Proj" field="ppr" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <SortTh label="vs 2025" field="diff_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <SortTh label="vs 2024" field="diff_24" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-center">Trend</th>
              {/* Position-specific 2025 stats */}
              {(posFilter==='RB'||posFilter==='ALL') && <>
                <SortTh label="Car 25" field="carries_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
                <SortTh label="RYds 25" field="rush_yds_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
                <SortTh label="YPC" field="ypc_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
                <SortTh label="RTD" field="rush_tds_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              </>}
              {(posFilter==='WR'||posFilter==='TE') && <>
                <SortTh label="Tgt 25" field="targets_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
                <SortTh label="Rec 25" field="rec_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
                <SortTh label="RcYds 25" field="rec_yds_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
                <SortTh label="RcTD" field="rec_tds_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              </>}
              {posFilter==='QB' && <>
                <SortTh label="PAtt 25" field="pass_att_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
                <SortTh label="PYds 25" field="pass_yds_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
                <SortTh label="PTD" field="pass_tds_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              </>}
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-left">Play Caller</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => {
              const schemeColor = p.position==='RB'
                ? (p.avgRbShare>=75?'text-emerald-400':p.avgRbShare>=65?'text-blue-400':p.avgRbShare<55?'text-red-400':'text-amber-400')
                : p.position==='TE'
                ? (p.avgTeShare>=30?'text-emerald-400':p.avgTeShare>=25?'text-blue-400':p.avgTeShare<20?'text-red-400':'text-amber-400')
                : (p.avgWr1Share>=30?'text-emerald-400':p.avgWr1Share>=25?'text-blue-400':p.avgWr1Share<20?'text-red-400':'text-amber-400')

              const schemeVal = p.position==='RB' ? p.avgRbShare
                : p.position==='TE' ? p.avgTeShare : p.avgWr1Share

              return (
                <tr key={`${p.team}-${p.player_name}-${p.depth_rank}`}
                  onClick={() => { setSelectedPlayer(p); setSelectedTeamData(teamMap[p.team]||null) }}
                  className="border-b border-nfl-border/25 hover:bg-nfl-blue/5 cursor-pointer transition-colors">
                  <td className="px-3 py-2.5 text-xs text-slate-500">{i+1}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-white">{p.player_name}</span>
                      {p.newCaller && <span className="text-xs bg-blue-500/20 text-blue-400 px-1 rounded font-bold">NEW</span>}
                      {(p.years_exp===0||p.years_exp==='0') && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1 rounded font-bold">RC</span>}
                      {p.injury?.status==='IR'  && <span className="text-xs bg-red-500/20 text-red-400 px-1 rounded font-bold">IR</span>}
                      {p.injury?.status==='OUT' && <span className="text-xs bg-red-500/20 text-red-400 px-1 rounded font-bold">OUT</span>}
                      {p.injury?.status==='Q'   && <span className="text-xs bg-amber-500/20 text-amber-400 px-1 rounded font-bold">Q</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-bold bg-nfl-border/50 text-slate-300 px-1.5 py-0.5 rounded">{p.position}</span>
                      <span className="text-xs text-slate-600">#{p.depth_rank}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300 font-medium">{p.team}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-xs font-semibold ${schemeColor}`}>
                      {schemeVal?.toFixed(0)}%
                    </span>
                    <div className="text-xs text-slate-600">{p.rbStyle||''}</div>
                  </td>

                  {/* PPR columns */}
                  <td className="px-3 py-2.5 text-right text-xs text-slate-500">{p.ppr_2024 ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-sm font-bold text-amber-300">{p.ppr_2025 ?? '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-sm font-bold text-blue-400">{p.ppr}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs">
                    <DiffBadge val={p.diff_25}/>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs">
                    <DiffBadge val={p.diff_24}/>
                  </td>
                  <td className="px-3 py-2.5">
                    <TrendBars v24={p.ppr_2024} v25={p.ppr_2025} v26={p.ppr}/>
                  </td>

                  {/* RB stats */}
                  {(posFilter==='RB'||posFilter==='ALL') && <>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-400">{p.carries_25 ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-400">{p.rush_yds_25 ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`text-xs font-semibold ${p.ypc_25>=5.0?'text-emerald-400':p.ypc_25>=4.5?'text-blue-400':p.ypc_25>=4.0?'text-amber-400':p.ypc_25?'text-red-400':'text-slate-600'}`}>
                        {p.ypc_25 ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-400">{p.rush_tds_25 ?? '—'}</td>
                  </>}

                  {/* WR/TE stats */}
                  {(posFilter==='WR'||posFilter==='TE') && <>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-400">{p.targets_25 ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-400">{p.rec_25 ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-400">{p.rec_yds_25 ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-400">{p.rec_tds_25 ?? '—'}</td>
                  </>}

                  {/* QB stats */}
                  {posFilter==='QB' && <>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-400">{p.pass_att_25 ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-400">{p.pass_yds_25 ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-400">{p.pass_tds_25 ?? '—'}</td>
                  </>}

                  <td className="px-3 py-2.5 text-xs text-slate-400">
                    {p.playCaller}
                    {p.newCaller && <span className="text-amber-400 ml-1">(New)</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-nfl-card border border-nfl-border rounded-xl text-xs text-slate-500 space-y-1">
        <p><span className="text-emerald-400 font-semibold">Green vs 2025</span> = we project more than they scored last year (new scheme, more opportunity, or scheme upgrade).</p>
        <p><span className="text-red-400 font-semibold">Red vs 2025</span> = we project less (regression candidate, fewer carries/targets projected, or lost scheme advantage).</p>
        <p><span className="text-white font-semibold">YPC color:</span> Green = elite (5.0+), Blue = good (4.5+), Amber = average (4.0+), Red = below average. Use this to see who the model undersells by talent.</p>
      </div>

      {selectedPlayer && (
        <PlayerModal player={selectedPlayer} team={selectedTeam} scoring={SCORING_PRESETS[scoringIdx].scoring} onClose={() => setSelectedPlayer(null)}/>
      )}
    </div>
  )
}
