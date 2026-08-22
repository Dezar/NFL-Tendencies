import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { projectPlayer, DEFAULT_SCORING } from '../engine/scoring'
import tendencies from '../data/tendencies.json'
import rostersData from '../data/rosters_2026.json'
import stats2025data from '../data/stats_2025.json'
import stats2024data from '../data/stats_2024.json'
import PlayerModal from '../components/PlayerModal'

// ── Build stat lookups ────────────────────────────────────────────────────────
const S25 = {}
stats2025data.players.forEach(p => { if (p.position==='RB') S25[p.player_name] = p })
const S24 = {}
stats2024data.players.forEach(p => { if (p.position==='RB') S24[p.player_name] = p })

// ── Why the model is flat — explanation data ──────────────────────────────────
const MODEL_EXPLANATION = [
  { label: 'Committee (52%)', carries: 224, rushYds: 1041, ppr: 350 },
  { label: 'Lean (61%)',      carries: 262, rushYds: 1218, ppr: 379 },
  { label: 'Featured (65%)', carries: 280, rushYds: 1302, ppr: 390 },
  { label: 'Featured (70%)', carries: 301, rushYds: 1400, ppr: 404 },
  { label: 'Workhorse (74%)',carries: 318, rushYds: 1479, ppr: 415 },
  { label: 'Workhorse (80%)',carries: 344, rushYds: 1600, ppr: 432 },
]

// ── Mini bar ─────────────────────────────────────────────────────────────────
function MiniBar({ value, max, color, width = 'w-24' }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className={`h-2 ${width} bg-nfl-dark rounded-full overflow-hidden inline-block align-middle`}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Sort header ───────────────────────────────────────────────────────────────
function SortTh({ label, field, sortBy, sortDir, onSort, center }) {
  const active = sortBy === field
  return (
    <th onClick={() => onSort(field)}
      className={`px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide cursor-pointer hover:text-white select-none ${center?'text-center':'text-left'}`}>
      <div className={`flex items-center gap-1 ${center?'justify-center':''}`}>
        {label}
        {active ? sortDir==='desc' ? <ChevronDown size={11}/> : <ChevronUp size={11}/> : <ChevronsUpDown size={11} className="opacity-25"/>}
      </div>
    </th>
  )
}

export default function RBAnalysis() {
  const [sortBy, setSortBy] = useState('ppr_2025')
  const [sortDir, setSortDir] = useState('desc')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [selectedTeam, setSelectedTeamData] = useState(null)
  const [viewMode, setViewMode] = useState('comparison') // 'comparison' | 'why_flat'

  const teamMap = useMemo(() => {
    const m = {}; tendencies.teams.forEach(t => { m[t.team] = t }); return m
  }, [])

  // Build RB comparison data
  const rbs = useMemo(() => {
    const depth1 = rostersData.players.filter(p => p.position==='RB' && p.depth_rank===1)
    return depth1.map(p => {
      const team = teamMap[p.team] || {}
      const proj = projectPlayer(p, team, DEFAULT_SCORING)
      const a25 = S25[p.player_name]
      const a24 = S24[p.player_name]

      // Diff: projection vs 2025 actual
      const diff_vs_25 = a25 ? Math.round(proj.ppr - a25.fantasy_ppr) : null
      const diff_vs_24 = a24 ? Math.round(proj.ppr - a24.fantasy_ppr) : null

      // Carry efficiency: actual YPC
      const ypc_25 = a25?.carries ? +(a25.rushing_yards / a25.carries).toFixed(1) : null
      const ypc_24 = a24?.carries ? +(a24.rushing_yards / a24.carries).toFixed(1) : null

      // Reception value: how much of PPR came from receiving in 2025
      const rec_ppr_25 = a25 ? a25.receptions + a25.receiving_yards*0.1 + a25.receiving_tds*6 : null
      const rec_pct_25 = a25 && rec_ppr_25 ? Math.round(rec_ppr_25 / a25.fantasy_ppr * 100) : null

      // TD variance: TDs are fluky - normalize
      const td_25 = a25 ? a25.rushing_tds + a25.receiving_tds : null
      const td_per_touch_25 = a25 && a25.carries ? +((a25.rushing_tds + a25.receiving_tds) / (a25.carries + a25.targets)).toFixed(3) : null

      return {
        ...p, ...proj,
        playCaller: team.playCaller || '?',
        newCaller: team.newCaller || false,
        rbStyle: team.rbStyle,
        avgRbShare: team.avgRbShare,
        // 2025 actuals
        ppr_2025: a25?.fantasy_ppr || null,
        carries_25: a25?.carries || null,
        rush_yds_25: a25?.rushing_yards || null,
        rush_tds_25: a25?.rushing_tds || null,
        targets_25: a25?.targets || null,
        rec_25: a25?.receptions || null,
        rec_yds_25: a25?.receiving_yards || null,
        rec_tds_25: a25?.receiving_tds || null,
        ypc_25, rec_pct_25, td_25, td_per_touch_25,
        // 2024 actuals
        ppr_2024: a24?.fantasy_ppr || null,
        carries_24: a24?.carries || null,
        ypc_24,
        // Diffs
        diff_vs_25, diff_vs_24,
      }
    }).filter(p => p.ppr > 0 || p.ppr_2025)
  }, [teamMap])

  const handleSort = (field) => {
    if (sortBy===field) setSortDir(d => d==='desc'?'asc':'desc')
    else { setSortBy(field); setSortDir('desc') }
  }

  const sorted = useMemo(() => {
    return [...rbs].sort((a,b) => {
      const av = a[sortBy] ?? (sortDir==='desc' ? -9999 : 9999)
      const bv = b[sortBy] ?? (sortDir==='desc' ? -9999 : 9999)
      return sortDir==='desc' ? bv-av : av-bv
    })
  }, [rbs, sortBy, sortDir])

  // Stats for the insight boxes
  const hasActual = rbs.filter(p => p.ppr_2025)
  const avgActual = Math.round(hasActual.reduce((s,p) => s+(p.ppr_2025||0),0) / hasActual.length)
  const avgProj = Math.round(rbs.reduce((s,p) => s+p.ppr,0) / rbs.length)
  const spread_actual = hasActual.length ? Math.round(hasActual[0].ppr_2025 - hasActual[hasActual.length-1].ppr_2025) : 0
  const proj_sorted = [...rbs].sort((a,b) => b.ppr-a.ppr)
  const spread_proj = proj_sorted.length ? proj_sorted[0].ppr - proj_sorted[proj_sorted.length-1].ppr : 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">RB Deep Dive — Scheme vs Reality</h1>
        <p className="text-slate-400 text-sm">
          Why are all projected RBs so close together? 2025 actuals vs 2026 projections.
          Click any player for full profile.
        </p>
      </div>

      {/* The key insight */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-nfl-card border border-nfl-border rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">2025 Actual PPR Spread</div>
          <div className="text-2xl font-black text-white">{spread_actual} pts</div>
          <div className="text-xs text-amber-400 mt-1">RB1 to RB24: real gap exists</div>
        </div>
        <div className="bg-nfl-card border border-nfl-border rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">Our Projected Spread</div>
          <div className="text-2xl font-black text-slate-300">{spread_proj} pts</div>
          <div className="text-xs text-red-400 mt-1">Model compresses talent</div>
        </div>
        <div className="bg-nfl-card border border-nfl-border rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">Avg 2025 Actual PPR</div>
          <div className="text-2xl font-black text-amber-300">{avgActual}</div>
          <div className="text-xs text-slate-500 mt-1">Across tracked RBs</div>
        </div>
        <div className="bg-nfl-card border border-nfl-border rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">Avg 2026 Projected PPR</div>
          <div className="text-2xl font-black text-blue-400">{avgProj}</div>
          <div className="text-xs text-slate-500 mt-1">Our model</div>
        </div>
      </div>

      {/* Why it's flat explanation */}
      <div className="bg-nfl-card border border-amber-400/20 rounded-xl p-5 mb-6">
        <div className="text-sm font-semibold text-amber-400 mb-2">⚠️ Why RBs Project So Close Together</div>
        <p className="text-sm text-slate-300 mb-4">
          Our model only knows scheme — it assigns carries based on play-caller's historical RB share,
          then applies the same league-average YPC (4.65) and TD rate (3.6%) to everyone.
          Real-world RBs differ dramatically by talent: McCaffrey averages 5.7 YPC, Henry 5.2, while
          committee backs average 4.0-4.2. The model also can't account for TD regression/luck — Henry
          scored 16 TDs on 307 carries (5.2%), way above league average, which likely regresses.
        </p>
        <div className="grid grid-cols-6 gap-2">
          {MODEL_EXPLANATION.map(row => (
            <div key={row.label} className="bg-nfl-dark rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500 mb-1">{row.label}</div>
              <div className="text-sm font-black text-white">{row.ppr}</div>
              <div className="text-xs text-slate-500">PPR</div>
              <div className="text-xs text-slate-600 mt-1">{row.carries} car</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Only a 82-point range across all scheme types. Real 2025 range was 267 points.
          The missing piece: talent adjustments for YPC, TD red zone efficiency, and receiving ability.
          Use our projections as a <strong className="text-slate-300">floor/scheme baseline</strong> —
          players who outperformed it in 2025 likely have genuine talent advantages.
        </p>
      </div>

      {/* View toggle */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setViewMode('comparison')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${viewMode==='comparison'?'bg-nfl-blue text-white':'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'}`}>
          📊 Projection vs Actual
        </button>
        <button onClick={() => setViewMode('efficiency')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${viewMode==='efficiency'?'bg-nfl-blue text-white':'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'}`}>
          ⚡ Efficiency Stats
        </button>
      </div>

      <div className="text-xs text-slate-500 mb-3">
        {sorted.length} RB1s · Click headers to sort · Click player for full profile
      </div>

      {/* Comparison table */}
      {viewMode==='comparison' && (
        <div className="bg-nfl-card border border-nfl-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-nfl-border">
                <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">#</th>
                <SortTh label="Player" field="player_name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
                <SortTh label="Team" field="team" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
                <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide text-center">Scheme</th>
                <SortTh label="2024 PPR" field="ppr_2024" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center/>
                <SortTh label="2025 PPR" field="ppr_2025" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center/>
                <SortTh label="2026 Proj" field="ppr" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center/>
                <SortTh label="vs 2025" field="diff_vs_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center/>
                <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">3yr PPR Trend</th>
                <SortTh label="Carries 25" field="carries_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center/>
                <SortTh label="Proj Carries" field="carries" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center/>
                <SortTh label="RbShare%" field="avgRbShare" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center/>
                <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Play Caller</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const diffColor = p.diff_vs_25 == null ? 'text-slate-500'
                  : p.diff_vs_25 > 50 ? 'text-emerald-400 font-bold'
                  : p.diff_vs_25 > 15 ? 'text-emerald-400'
                  : p.diff_vs_25 < -50 ? 'text-red-400 font-bold'
                  : p.diff_vs_25 < -15 ? 'text-red-400'
                  : 'text-slate-400'

                // Mini trend visualization
                const maxPPR = 460
                return (
                  <tr key={`${p.team}-${p.player_name}`}
                    onClick={() => { setSelectedPlayer(p); setSelectedTeamData(teamMap[p.team]||null) }}
                    className="border-b border-nfl-border/30 hover:bg-nfl-blue/5 cursor-pointer transition-colors">
                    <td className="px-3 py-2.5 text-xs text-slate-500">{i+1}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white">{p.player_name}</span>
                        {p.newCaller && <span className="text-xs bg-blue-500/20 text-blue-400 px-1 rounded font-bold">NEW</span>}
                        {(p.years_exp===0||p.years_exp==='0') && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1 rounded font-bold">RC</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 font-medium">{p.team}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs font-semibold ${
                        p.avgRbShare>=75?'text-emerald-400':p.avgRbShare>=65?'text-blue-400':p.avgRbShare<55?'text-red-400':'text-amber-400'
                      }`}>{p.avgRbShare?.toFixed(0)}%</span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-slate-500">{p.ppr_2024 ?? '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-sm font-bold text-amber-300">{p.ppr_2025 ?? '—'}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-sm font-bold text-blue-400">{p.ppr}</span>
                    </td>
                    <td className={`px-3 py-2.5 text-center text-xs ${diffColor}`}>
                      {p.diff_vs_25 != null ? (p.diff_vs_25>0?'+':'')+p.diff_vs_25 : '—'}
                    </td>
                    {/* 3-year trend bars */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-end gap-0.5 h-6">
                        {[p.ppr_2024, p.ppr_2025, p.ppr].map((val, vi) => {
                          const ht = val ? Math.round((val/maxPPR)*24) : 2
                          const col = vi===0?'bg-slate-500':vi===1?'bg-amber-400':'bg-blue-500'
                          return <div key={vi} className={`w-2 rounded-t ${col}`} style={{height:`${ht}px`}} title={val?.toString()}/>
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-slate-400">{p.carries_25 ?? '—'}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-blue-400 font-semibold">{p.carries}</td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center gap-1.5">
                        <MiniBar value={p.avgRbShare||0} max={100} color={p.avgRbShare>=75?'bg-emerald-500':p.avgRbShare>=65?'bg-blue-500':p.avgRbShare<55?'bg-red-500':'bg-amber-500'} width="w-16"/>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-400">
                      {p.playCaller}{p.newCaller&&<span className="text-amber-400 ml-1">(New)</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Efficiency table */}
      {viewMode==='efficiency' && (
        <div className="bg-nfl-card border border-nfl-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-nfl-border">
                <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">#</th>
                <SortTh label="Player" field="player_name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
                <SortTh label="Team" field="team" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
                <SortTh label="2025 PPR" field="ppr_2025" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center/>
                <SortTh label="Carries" field="carries_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center/>
                <SortTh label="Rush Yds" field="rush_yds_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center/>
                <SortTh label="YPC" field="ypc_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center/>
                <SortTh label="Rush TDs" field="rush_tds_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center/>
                <SortTh label="Targets" field="targets_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center/>
                <SortTh label="Rec Yds" field="rec_yds_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center/>
                <SortTh label="Rec%" field="rec_pct_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center/>
                <SortTh label="TDs" field="td_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center/>
                <SortTh label="TD/Touch" field="td_per_touch_25" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} center/>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr key={`${p.team}-${p.player_name}`}
                  onClick={() => { setSelectedPlayer(p); setSelectedTeamData(teamMap[p.team]||null) }}
                  className="border-b border-nfl-border/30 hover:bg-nfl-blue/5 cursor-pointer transition-colors">
                  <td className="px-3 py-2.5 text-xs text-slate-500">{i+1}</td>
                  <td className="px-3 py-2.5 font-semibold text-white">{p.player_name}</td>
                  <td className="px-3 py-2.5 text-slate-300">{p.team}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-amber-300">{p.ppr_2025 ?? '—'}</td>
                  <td className="px-3 py-2.5 text-center text-xs text-slate-300">{p.carries_25 ?? '—'}</td>
                  <td className="px-3 py-2.5 text-center text-xs text-slate-300">{p.rush_yds_25 ?? '—'}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-xs font-bold ${p.ypc_25>=5.0?'text-emerald-400':p.ypc_25>=4.5?'text-blue-400':p.ypc_25>=4.0?'text-amber-400':'text-red-400'}`}>
                      {p.ypc_25 ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-slate-300">{p.rush_tds_25 ?? '—'}</td>
                  <td className="px-3 py-2.5 text-center text-xs text-slate-300">{p.targets_25 ?? '—'}</td>
                  <td className="px-3 py-2.5 text-center text-xs text-slate-300">{p.rec_yds_25 ?? '—'}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-xs font-bold ${p.rec_pct_25>=30?'text-emerald-400':p.rec_pct_25>=20?'text-blue-400':'text-slate-400'}`}>
                      {p.rec_pct_25 != null ? p.rec_pct_25+'%' : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-slate-300">{p.td_25 ?? '—'}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-xs font-bold ${p.td_per_touch_25>=0.05?'text-emerald-400':p.td_per_touch_25>=0.035?'text-blue-400':'text-slate-400'}`}>
                      {p.td_per_touch_25 ?? '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 p-4 bg-nfl-card border border-nfl-border rounded-xl text-xs text-slate-500 space-y-1.5">
        <p><span className="text-white font-semibold">vs 2025:</span> How much our 2026 projection differs from what they actually scored in 2025. Large positive = we're bullish (new scheme, more carries projected). Large negative = we think they regress.</p>
        <p><span className="text-white font-semibold">Rec%:</span> What % of their 2025 PPR came from receiving (receptions + rec yards + rec TDs). High Rec% = PPR value depends heavily on pass game.</p>
        <p><span className="text-white font-semibold">TD/Touch:</span> TDs per carry+target in 2025. High numbers (0.05+) often regress — TDs are the luckiest stat in fantasy.</p>
        <p><span className="text-amber-400 font-semibold">The real insight:</span> Our model treats all RBs the same efficiency-wise. Players like Bijan Robinson (5.1 YPC, elite receiver) and Gibbs (5.0 YPC, 77 rec) are genuinely more valuable than the model shows. Use the efficiency tab to find the talent differences our model misses.</p>
      </div>

      {selectedPlayer && (
        <PlayerModal player={selectedPlayer} team={selectedTeam} scoring={DEFAULT_SCORING} onClose={() => setSelectedPlayer(null)}/>
      )}
    </div>
  )
}
