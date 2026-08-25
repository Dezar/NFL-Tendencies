import React, { useState, useMemo } from 'react'
import { Calendar, TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import rostersData from '../data/rosters_2026.json'
import tendencies from '../data/tendencies.json'
import playoffData from '../data/playoff_schedule.json'
import injuryData from '../data/injuries.json'
import { projectPlayer, applyExperience, DEFAULT_SCORING } from '../engine/scoring'

const INJURY_MAP = {}
injuryData.injuries.forEach(p => { INJURY_MAP[p.player_name] = p })

const teamMap = {}
tendencies.teams.forEach(t => { teamMap[t.team] = t })

// Full team name lookup
const TEAM_NAMES = {
  ARI:'Cardinals', ATL:'Falcons', BAL:'Ravens', BUF:'Bills',
  CAR:'Panthers', CHI:'Bears', CIN:'Bengals', CLE:'Browns',
  DAL:'Cowboys', DEN:'Broncos', DET:'Lions', GB:'Packers',
  HOU:'Texans', IND:'Colts', JAX:'Jaguars', KC:'Chiefs',
  LA:'Rams', LAC:'Chargers', LV:'Raiders', MIA:'Dolphins',
  MIN:'Vikings', NE:'Patriots', NO:'Saints', NYG:'Giants',
  NYJ:'Jets', PHI:'Eagles', PIT:'Steelers', SF:'49ers',
  SEA:'Seahawks', TB:'Buccaneers', TEN:'Titans', WAS:'Commanders'
}

function getRankLabel(rank) {
  if (rank <= 8)  return { label: 'Hard', color: 'text-red-400',   bg: 'bg-red-400/10 border-red-400/30',   icon: '🔴' }
  if (rank <= 18) return { label: 'Mid',  color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30', icon: '🟡' }
  return              { label: 'Easy', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30', icon: '🟢' }
}

function getPlayoffScore(ranks) {
  // Average rank across weeks — higher avg rank = easier schedule
  const avg = ranks.reduce((a, b) => a + b, 0) / ranks.length
  if (avg >= 22) return { label: 'Easy Playoffs', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30', score: Math.round(avg) }
  if (avg >= 14) return { label: 'Mixed',         color: 'text-yellow-400',  bg: 'bg-yellow-400/10 border-yellow-400/30',  score: Math.round(avg) }
  return             { label: 'Hard Playoffs',  color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30',   score: Math.round(avg) }
}

function SortTh({ label, field, sortBy, sortDir, onSort, right }) {
  const active = sortBy === field
  return (
    <th onClick={() => onSort(field)}
      className={`px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide cursor-pointer hover:text-white select-none ${right ? 'text-right' : 'text-left'}`}>
      <div className={`flex items-center gap-1 ${right ? 'justify-end' : ''}`}>
        {label}
        {active ? sortDir === 'desc' ? <ChevronDown size={11}/> : <ChevronUp size={11}/> : <ChevronsUpDown size={11} className="opacity-25"/>}
      </div>
    </th>
  )
}

export default function PlayoffSchedule() {
  const [posFilter, setPosFilter] = useState('ALL')
  const [sortBy, setSortBy]   = useState('score')
  const [sortDir, setSortDir] = useState('desc')

  function handleSort(field) {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(field); setSortDir('desc') }
  }

  const players = useMemo(() => {
    const result = []
    rostersData.players
      .filter(p => p.depth_rank === 1 && ['QB','RB','WR','TE'].includes(p.position))
      .forEach(p => {
        const team = teamMap[p.team] || {}
        const raw  = projectPlayer(p, team, DEFAULT_SCORING)
        const proj = applyExperience(p.player_name, raw)
        if (proj.ppr < 50) return

        const pos = p.position
        const rankKey = pos === 'QB' ? 'vsQB' : pos === 'RB' ? 'vsRB' : pos === 'WR' ? 'vsWR' : 'vsTE'
        const defRanks = playoffData.defenseRankings[rankKey]

        const weeks = [15, 16, 17].map(wk => {
          const opp = playoffData.matchups[String(wk)]?.[p.team] || null
          const rank = opp ? defRanks[opp] : null
          return { week: wk, opp, rank }
        })

        const validRanks = weeks.filter(w => w.rank !== null).map(w => w.rank)
        const schedule = validRanks.length > 0 ? getPlayoffScore(validRanks) : null
        const inj = INJURY_MAP[p.player_name]

        result.push({
          name: p.player_name,
          team: p.team,
          pos,
          ppr: proj.ppr,
          weeks,
          schedule,
          avgRank: validRanks.length > 0 ? validRanks.reduce((a,b)=>a+b,0)/validRanks.length : 16,
          injury: inj || null,
          newCaller: team.newCaller || false,
        })
      })
    return result
  }, [])

  const filtered = useMemo(() => {
    let rows = posFilter === 'ALL' ? players : players.filter(p => p.pos === posFilter)
    rows = [...rows].sort((a, b) => {
      let av, bv
      if (sortBy === 'score') { av = a.avgRank; bv = b.avgRank }
      else if (sortBy === 'ppr') { av = a.ppr; bv = b.ppr }
      else if (sortBy === 'name') { av = a.name; bv = b.name; return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av) }
      else if (sortBy === 'team') { av = a.team; bv = b.team; return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av) }
      else { av = a[sortBy] ?? 0; bv = b[sortBy] ?? 0 }
      return sortDir === 'desc' ? bv - av : av - bv
    })
    return rows
  }, [players, posFilter, sortBy, sortDir])

  // Summary counts
  const easy  = filtered.filter(p => p.avgRank >= 22).length
  const mid   = filtered.filter(p => p.avgRank >= 14 && p.avgRank < 22).length
  const hard  = filtered.filter(p => p.avgRank < 14).length

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="text-emerald-400" size={24}/>
          <h1 className="text-2xl font-bold text-white">Playoff Schedule Strength</h1>
        </div>
        <p className="text-slate-400 text-sm">
          Weeks 15–17 matchup difficulty by position — who do your players face when it matters most?
          Defense ranks: 1 = toughest matchup, 32 = easiest.
        </p>
      </div>

      {/* Summary badges */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{easy}</div>
          <div className="text-xs text-slate-400 mt-1">🟢 Easy Playoff Schedule</div>
        </div>
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{mid}</div>
          <div className="text-xs text-slate-400 mt-1">🟡 Mixed Schedule</div>
        </div>
        <div className="bg-red-400/10 border border-red-400/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{hard}</div>
          <div className="text-xs text-slate-400 mt-1">🔴 Hard Playoff Schedule</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['ALL','QB','RB','WR','TE'].map(p => (
          <button key={p} onClick={() => setPosFilter(p)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              posFilter === p
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
            }`}>{p}</button>
        ))}
        <div className="ml-auto text-xs text-slate-500 self-center">{filtered.length} players</div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60 border-b border-slate-700">
            <tr>
              <SortTh label="Player"   field="name"  sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <SortTh label="Pos"      field="pos"   sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <SortTh label="Team"     field="team"  sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <SortTh label="Proj PPR" field="ppr"   sortBy={sortBy} sortDir={sortDir} onSort={handleSort} right/>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide text-center">Wk 15</th>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide text-center">Wk 16</th>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide text-center">Wk 17</th>
              <SortTh label="Playoff SOS" field="score" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} right/>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map((p, i) => (
              <tr key={p.name} className="hover:bg-slate-800/40 transition-colors">

                {/* Player name */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{p.name}</span>
                    {p.injury && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                        {p.injury.status}
                      </span>
                    )}
                    {p.newCaller && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">NC</span>
                    )}
                  </div>
                </td>

                {/* Pos */}
                <td className="px-3 py-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    p.pos==='QB' ? 'bg-purple-500/20 text-purple-300' :
                    p.pos==='RB' ? 'bg-blue-500/20 text-blue-300' :
                    p.pos==='WR' ? 'bg-emerald-500/20 text-emerald-300' :
                    'bg-amber-500/20 text-amber-300'
                  }`}>{p.pos}</span>
                </td>

                {/* Team */}
                <td className="px-3 py-3 text-slate-300">{p.team}</td>

                {/* PPR */}
                <td className="px-3 py-3 text-right font-mono text-slate-200">{p.ppr}</td>

                {/* Week matchups */}
                {p.weeks.map(w => {
                  if (!w.opp || w.rank === null) return (
                    <td key={w.week} className="px-3 py-3 text-center text-slate-600">—</td>
                  )
                  const r = getRankLabel(w.rank)
                  return (
                    <td key={w.week} className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-xs font-medium ${r.color}`}>
                          vs {w.opp}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${r.bg} ${r.color}`}>
                          {r.icon} #{w.rank}
                        </span>
                      </div>
                    </td>
                  )
                })}

                {/* Overall playoff SOS */}
                <td className="px-3 py-3 text-right">
                  {p.schedule ? (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className={`text-xs font-semibold px-2 py-1 rounded border ${p.schedule.bg} ${p.schedule.color}`}>
                        {p.schedule.label}
                      </span>
                      <span className="text-xs text-slate-500">avg #{p.schedule.score}</span>
                    </div>
                  ) : <span className="text-slate-600 text-xs">—</span>}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-6 text-xs text-slate-500">
        <span>🟢 <span className="text-slate-400">Easy</span> = def rank 19–32 (weak defense vs position)</span>
        <span>🟡 <span className="text-slate-400">Mid</span> = def rank 9–18</span>
        <span>🔴 <span className="text-slate-400">Hard</span> = def rank 1–8 (elite defense vs position)</span>
        <span className="ml-auto">Defense rankings are preseason estimates — updated in-season</span>
      </div>
    </div>
  )
}
