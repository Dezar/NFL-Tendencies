import React, { useState, useMemo } from 'react'
import tendencies from '../data/tendencies.json'
import rostersData from '../data/rosters_2026.json'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const LEAGUE = {
  teamCarries: 430,         // avg team rushing attempts per season
  teamPassAttempts: 575,    // avg team pass attempts per season  
  yardsPerCarry: 4.4,       // league avg yards per carry
  yardsPerTarget: 8.0,      // league avg yards per target
  catchRate: 0.67,          // league avg catch rate
  tdPerCarry: 0.043,        // TDs per carry
  tdPerTarget: 0.056,       // TDs per target
  gamesPerSeason: 17,
}

const SCORING = { rushYd: 0.1, recYd: 0.1, rushTd: 6, recTd: 6, rec: 1, passTd: 4, passYd: 0.04, passInt: -2 }

// Confidence label based on seasons of data
function confidence(seasons) {
  if (!seasons || seasons === 0) return { label: 'Unknown', color: 'text-slate-400', tip: 'First-time caller — no data' }
  if (seasons >= 5) return { label: 'High', color: 'text-emerald-400', tip: `${seasons} seasons of data` }
  if (seasons >= 3) return { label: 'Medium', color: 'text-amber-400', tip: `${seasons} seasons of data` }
  return { label: 'Low', color: 'text-red-400', tip: `Only ${seasons} season(s) of data` }
}

// ─── PROJECTION MATH ──────────────────────────────────────────────────────────

function projectPlayer(player, team) {
  const pos = player.position
  const depth = player.depth_rank
  const carries = LEAGUE.teamCarries
  const targets = LEAGUE.teamPassAttempts
  const rbShare = team.avgRbShare ?? 65
  const teShare = team.avgTeShare ?? 22
  const wr1Share = team.avgWr1Share ?? 23

  if (pos === 'QB' && depth === 1) {
    const passAtt   = targets
    const passYds   = passAtt * 7.4
    const passTds   = passAtt * 0.048
    const ints      = passAtt * 0.024
    const rushYds   = 280
    const rushTds   = 3.5
    const pts = (passYds * SCORING.passYd) + (passTds * SCORING.passTd) +
                (ints * SCORING.passInt) + (rushYds * SCORING.rushYd) + (rushTds * SCORING.rushTd)
    return {
      passAtt: Math.round(passAtt), passYds: Math.round(passYds),
      passTds: +passTds.toFixed(1), ints: +ints.toFixed(1),
      rushYds: Math.round(rushYds), rushTds: +rushTds.toFixed(1),
      carries: null, recYds: null, receptions: null, recTds: null,
      tgts: null, targetShare: null,
      ppr: Math.round(pts), std: Math.round(pts),
      floor: Math.round(pts * 0.80), ceiling: Math.round(pts * 1.22),
      gpPPR: +(pts / 17).toFixed(1),
    }
  }

  if (pos === 'RB') {
    // Depth splits: how much of team's rushing does each slot get
    const rbSplit  = depth === 1 ? (rbShare / 100)
                   : depth === 2 ? (rbShare < 55 ? 0.28 : rbShare < 65 ? 0.18 : rbShare < 75 ? 0.10 : 0.05)
                   : 0.03
    const tgtShare = depth === 1 ? 0.17 : depth === 2 ? 0.07 : 0.02

    const car    = carries * rbSplit
    const rushYd = car * LEAGUE.yardsPerCarry
    const rushTd = car * LEAGUE.tdPerCarry
    const tgts   = targets * tgtShare
    const rec    = tgts * LEAGUE.catchRate
    const recYd  = tgts * LEAGUE.yardsPerTarget
    const recTd  = tgts * LEAGUE.tdPerTarget
    const ppr    = (rushYd * SCORING.rushYd) + (rushTd * SCORING.rushTd) +
                   (rec * SCORING.rec) + (recYd * SCORING.recYd) + (recTd * SCORING.recTd)
    const std    = ppr - (rec * SCORING.rec)
    return {
      carries: Math.round(car), rushYds: Math.round(rushYd), rushTds: +rushTd.toFixed(1),
      tgts: Math.round(tgts), receptions: Math.round(rec), recYds: Math.round(recYd), recTds: +recTd.toFixed(1),
      targetShare: +(tgtShare * 100).toFixed(1),
      passAtt: null, passYds: null, passTds: null, ints: null,
      ppr: Math.round(ppr), std: Math.round(std),
      floor: Math.round(ppr * 0.72), ceiling: Math.round(ppr * 1.38),
      gpPPR: +(ppr / 17).toFixed(1),
    }
  }

  if (pos === 'WR') {
    // WR1 gets wr1Share of ALL targets; WR2 ~55% of that; WR3 ~32%
    const shareMap  = { 1: wr1Share, 2: wr1Share * 0.55, 3: wr1Share * 0.32 }
    const tgtShareP = shareMap[depth] ?? wr1Share * 0.18
    const tgts      = targets * (tgtShareP / 100)
    const rec       = tgts * LEAGUE.catchRate
    const recYd     = tgts * LEAGUE.yardsPerTarget
    const recTd     = tgts * LEAGUE.tdPerTarget
    const ppr       = (rec * SCORING.rec) + (recYd * SCORING.recYd) + (recTd * SCORING.recTd)
    const std       = ppr - (rec * SCORING.rec)
    return {
      carries: null, rushYds: null, rushTds: null,
      tgts: Math.round(tgts), receptions: Math.round(rec), recYds: Math.round(recYd), recTds: +recTd.toFixed(1),
      targetShare: +tgtShareP.toFixed(1), // stored as percentage e.g. 31.9
      passAtt: null, passYds: null, passTds: null, ints: null,
      ppr: Math.round(ppr), std: Math.round(std),
      floor: Math.round(ppr * 0.70), ceiling: Math.round(ppr * 1.42),
      gpPPR: +(ppr / 17).toFixed(1),
    }
  }

  if (pos === 'TE') {
    const depthSplit = depth === 1 ? 0.84 : depth === 2 ? 0.13 : 0.03
    const tgts  = targets * (teShare / 100) * depthSplit
    const rec   = tgts * (LEAGUE.catchRate + 0.04)
    const recYd = tgts * (LEAGUE.yardsPerTarget - 1.1)
    const recTd = tgts * (LEAGUE.tdPerTarget + 0.012)
    const ppr   = (rec * SCORING.rec) + (recYd * SCORING.recYd) + (recTd * SCORING.recTd)
    const std   = ppr - (rec * SCORING.rec)
    return {
      carries: null, rushYds: null, rushTds: null,
      tgts: Math.round(tgts), receptions: Math.round(rec), recYds: Math.round(recYd), recTds: +recTd.toFixed(1),
      targetShare: +(teShare * depthSplit).toFixed(1),
      passAtt: null, passYds: null, passTds: null, ints: null,
      ppr: Math.round(ppr), std: Math.round(std),
      floor: Math.round(ppr * 0.68), ceiling: Math.round(ppr * 1.40),
      gpPPR: +(ppr / 17).toFixed(1),
    }
  }

  return { ppr: 0, std: 0, floor: 0, ceiling: 0, gpPPR: 0 }
}

// ─── TIER HELPERS ─────────────────────────────────────────────────────────────

function getTier(pos, ppr) {
  const tiers = { QB: [260,310,360], RB: [110,170,230], WR: [120,175,235], TE: [75,125,175] }
  const [low, mid, high] = tiers[pos] || [100,150,200]
  if (ppr >= high) return { label: 'Elite', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30', rank: 0 }
  if (ppr >= mid)  return { label: 'Starter', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30', rank: 1 }
  if (ppr >= low)  return { label: 'Flex', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30', rank: 2 }
  return { label: 'Depth', color: 'text-slate-500', bg: 'bg-slate-500/10 border-slate-500/30', rank: 3 }
}

// ─── STAT CELL ────────────────────────────────────────────────────────────────

function Stat({ label, value, highlight }) {
  if (value == null || value === 0) return (
    <div className="text-center">
      <div className="text-xs text-slate-600">—</div>
      <div className="text-xs text-slate-600 mt-0.5">{label}</div>
    </div>
  )
  return (
    <div className="text-center">
      <div className={`text-sm font-bold ${highlight ? 'text-white' : 'text-slate-300'}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

// ─── PLAYER ROW ───────────────────────────────────────────────────────────────

function PlayerRow({ p, rank }) {
  const tier = getTier(p.position, p.ppr)
  const conf = confidence(p.rbSeasons)
  const isElite = tier.rank === 0
  const isStarter = tier.rank <= 1

  return (
    <tr className={`border-b border-nfl-border/40 transition-colors hover:bg-white/[0.03] ${isElite ? 'bg-emerald-400/[0.03]' : ''}`}>
      {/* Rank */}
      <td className="px-3 py-3 text-center">
        <span className={`text-sm font-black ${isElite ? 'text-emerald-400' : isStarter ? 'text-blue-400' : 'text-slate-500'}`}>
          {rank}
        </span>
      </td>

      {/* Player */}
      <td className="px-3 py-3">
        <div className="font-semibold text-white text-sm leading-tight">{p.player_name}</div>
        <div className="text-xs text-slate-500 mt-0.5">{p.team} · Age {p.age ?? '?'} · Yr {p.years_exp ?? '?'}</div>
      </td>

      {/* Pos + Depth */}
      <td className="px-3 py-3 text-center">
        <div className="text-xs font-bold bg-nfl-border/60 text-slate-300 px-2 py-0.5 rounded inline-block">{p.position}</div>
        <div className="text-xs text-slate-500 mt-1">#{p.depth_rank}</div>
      </td>

      {/* Play caller */}
      <td className="px-3 py-3">
        <div className="text-xs text-slate-300">{p.playCaller}</div>
        <div className="text-xs text-slate-600 mt-0.5">{p.rbSeasons > 0 ? `${p.rbSeasons} seasons data` : '⚠️ New caller'}</div>
      </td>

      {/* Stat line — varies by position */}
      {p.position === 'QB' ? <>
        <td className="px-3 py-3"><Stat label="Pass Att" value={p.passAtt} /></td>
        <td className="px-3 py-3"><Stat label="Pass Yds" value={p.passYds} highlight /></td>
        <td className="px-3 py-3"><Stat label="Pass TDs" value={p.passTds} highlight /></td>
        <td className="px-3 py-3"><Stat label="Rush Yds" value={p.rushYds} /></td>
        <td className="px-3 py-3"><Stat label="INTs" value={p.ints} /></td>
        <td className="px-3 py-3"><Stat label="Rec Yds" value="—" /></td>
      </> : p.position === 'RB' ? <>
        <td className="px-3 py-3"><Stat label="Carries" value={p.carries} /></td>
        <td className="px-3 py-3"><Stat label="Rush Yds" value={p.rushYds} highlight /></td>
        <td className="px-3 py-3"><Stat label="Rush TDs" value={p.rushTds} highlight /></td>
        <td className="px-3 py-3"><Stat label="Targets" value={p.tgts} /></td>
        <td className="px-3 py-3"><Stat label="Receptions" value={p.receptions} /></td>
        <td className="px-3 py-3"><Stat label="Rec Yds" value={p.recYds} /></td>
      </> : <>
        <td className="px-3 py-3"><Stat label="Tgt Share" value={p.targetShare != null ? p.targetShare + '%' : null} /></td>
        <td className="px-3 py-3"><Stat label="Targets" value={p.tgts} /></td>
        <td className="px-3 py-3"><Stat label="Receptions" value={p.receptions} highlight /></td>
        <td className="px-3 py-3"><Stat label="Rec Yds" value={p.recYds} highlight /></td>
        <td className="px-3 py-3"><Stat label="Rec TDs" value={p.recTds} highlight /></td>
        <td className="px-3 py-3"><Stat label="Carries" value="—" /></td>
      </>}

      {/* PPR */}
      <td className="px-3 py-3 text-center">
        <div className={`text-lg font-black ${tier.color}`}>{p.ppr}</div>
        <div className="text-xs text-slate-500">{p.gpPPR}/gm</div>
      </td>

      {/* Floor / Ceiling */}
      <td className="px-3 py-3 text-center">
        <div className="text-xs text-amber-400 font-semibold">{p.floor}</div>
        <div className="text-xs text-slate-600">floor</div>
      </td>
      <td className="px-3 py-3 text-center">
        <div className="text-xs text-blue-400 font-semibold">{p.ceiling}</div>
        <div className="text-xs text-slate-600">ceiling</div>
      </td>

      {/* Tier */}
      <td className="px-3 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${tier.bg} ${tier.color}`}>
          {tier.label}
        </span>
      </td>

      {/* Confidence */}
      <td className="px-3 py-3">
        <span className={`text-xs font-semibold ${conf.color}`} title={conf.tip}>
          {conf.label}
        </span>
      </td>
    </tr>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const POS_TABS = ['ALL', 'QB', 'RB', 'WR', 'TE']
const SORT_OPTIONS = [
  { value: 'ppr', label: 'PPR Points' },
  { value: 'ceiling', label: 'Ceiling' },
  { value: 'floor', label: 'Floor' },
  { value: 'gpPPR', label: 'Pts/Game' },
  { value: 'rushYds', label: 'Rush Yds' },
  { value: 'recYds', label: 'Rec Yds' },
  { value: 'carries', label: 'Carries' },
  { value: 'tgts', label: 'Targets' },
]

export default function StatProjections() {
  const [posFilter, setPosFilter] = useState('ALL')
  const [teamFilter, setTeamFilter] = useState('ALL')
  const [tierFilter, setTierFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('ppr')
  const [depthMax, setDepthMax] = useState(2)

  // Build team lookup
  const teamMap = useMemo(() => {
    const m = {}
    tendencies.teams.forEach(t => { m[t.team] = t })
    return m
  }, [])

  // Run projections on every player
  const allProjected = useMemo(() => {
    return rostersData.players
      .filter(p => p.depth_rank <= depthMax)
      .map(p => {
        const team = teamMap[p.team] || {}
        const proj = projectPlayer(p, team)
        return {
          ...p,
          ...proj,
          playCaller: team.playCaller || '?',
          rbSeasons: team.rbSeasons ?? 0,
          newCaller: team.newCaller ?? false,
          rbStyle: team.rbStyle,
          teStyle: team.teStyle,
          wr1Style: team.wr1Style,
        }
      })
      .filter(p => p.ppr > 0)
  }, [teamMap, depthMax])

  // Filter + sort
  const filtered = useMemo(() => {
    return allProjected
      .filter(p => {
        if (posFilter !== 'ALL' && p.position !== posFilter) return false
        if (teamFilter !== 'ALL' && p.team !== teamFilter) return false
        if (tierFilter !== 'ALL') {
          const t = getTier(p.position, p.ppr)
          if (t.label !== tierFilter) return false
        }
        return true
      })
      .sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0))
  }, [allProjected, posFilter, teamFilter, tierFilter, sortBy])

  const teams = useMemo(() => ['ALL', ...new Set(rostersData.players.map(p => p.team).sort())], [])

  // Summary stats for current filter
  const summary = useMemo(() => {
    const elite   = filtered.filter(p => getTier(p.position, p.ppr).label === 'Elite').length
    const starter = filtered.filter(p => getTier(p.position, p.ppr).label === 'Starter').length
    const avgPPR  = filtered.length ? Math.round(filtered.reduce((s, p) => s + p.ppr, 0) / filtered.length) : 0
    return { elite, starter, avgPPR, total: filtered.length }
  }, [filtered])

  // Column headers vary by position
  const statHeaders = posFilter === 'QB'
    ? ['Pass Att', 'Pass Yds', 'Pass TDs', 'Rush Yds', 'INTs', 'Rec Yds']
    : posFilter === 'RB'
    ? ['Carries', 'Rush Yds', 'Rush TDs', 'Targets', 'Receptions', 'Rec Yds']
    : ['Tgt Share', 'Targets', 'Receptions', 'Rec Yds', 'Rec TDs', '—']

  // Export CSV
  const exportCSV = () => {
    const headers = ['Rank','Player','Pos','Depth','Team','PlayCaller','PPR','Std','Floor','Ceiling','Pts/Gm',
      'Carries','RushYds','RushTDs','Targets','Receptions','RecYds','RecTDs','PassYds','PassTDs','Tier','Confidence']
    const rows = filtered.map((p, i) => {
      const tier = getTier(p.position, p.ppr)
      const conf = confidence(p.rbSeasons)
      return [i+1, p.player_name, p.position, p.depth_rank, p.team, p.playCaller,
        p.ppr, p.std, p.floor, p.ceiling, p.gpPPR,
        p.carries??'', p.rushYds??'', p.rushTds??'', p.tgts??'', p.receptions??'', p.recYds??'', p.recTds??'',
        p.passYds??'', p.passTds??'', tier.label, conf.label]
    })
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `nfl_stat_projections_2026_${posFilter}.csv`
    a.click()
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">2026 Stat Projections</h1>
        <p className="text-slate-400 text-sm">
          Full season stat lines projected from coaching tendency data × depth chart × league averages.
          Based on {rostersData.lastUpdated} depth charts.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
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
        <div className="bg-nfl-card border border-nfl-border rounded-xl p-4">
          <div className="text-2xl font-black text-slate-300">{summary.avgPPR}</div>
          <div className="text-xs text-slate-400 mt-1">Avg PPR pts</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Position tabs */}
        <div className="flex gap-1">
          {POS_TABS.map(pos => (
            <button key={pos} onClick={() => setPosFilter(pos)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                posFilter === pos ? 'bg-nfl-blue text-white' : 'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'
              }`}>{pos}</button>
          ))}
        </div>

        {/* Tier filter */}
        <div className="flex gap-1">
          {['ALL','Elite','Starter','Flex','Depth'].map(t => (
            <button key={t} onClick={() => setTierFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tierFilter === t ? 'bg-nfl-purple text-white' : 'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'
              }`}>{t}</button>
          ))}
        </div>

        {/* Depth filter */}
        <div className="flex items-center gap-2 bg-nfl-card border border-nfl-border rounded-lg px-3 py-1.5">
          <span className="text-xs text-slate-400">Show depth:</span>
          {[1,2,3].map(d => (
            <button key={d} onClick={() => setDepthMax(d)}
              className={`w-6 h-6 rounded text-xs font-bold transition-all ${
                depthMax === d ? 'bg-nfl-blue text-white' : 'text-slate-400 hover:text-white'
              }`}>
              {d === 3 ? '3' : d}
            </button>
          ))}
        </div>

        {/* Team filter */}
        <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
          className="bg-nfl-card border border-nfl-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="bg-nfl-card border border-nfl-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none ml-auto">
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
        </select>

        {/* Export */}
        <button onClick={exportCSV}
          className="px-3 py-1.5 bg-nfl-card border border-nfl-border rounded-lg text-xs text-slate-300 hover:text-white transition-all">
          ↓ Export CSV
        </button>
      </div>

      <div className="text-xs text-slate-500 mb-3">
        {filtered.length} players · Projections based on historical coaching tendencies × depth chart × league efficiency
      </div>

      {/* Table */}
      <div className="bg-nfl-card border border-nfl-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-nfl-border">
              <th className="px-3 py-3 text-center text-xs text-slate-400 font-medium uppercase tracking-wide">#</th>
              <th className="px-3 py-3 text-left text-xs text-slate-400 font-medium uppercase tracking-wide">Player</th>
              <th className="px-3 py-3 text-center text-xs text-slate-400 font-medium uppercase tracking-wide">Pos</th>
              <th className="px-3 py-3 text-left text-xs text-slate-400 font-medium uppercase tracking-wide">Caller</th>
              {statHeaders.map(h => (
                <th key={h} className="px-3 py-3 text-center text-xs text-slate-400 font-medium uppercase tracking-wide">{h}</th>
              ))}
              <th className="px-3 py-3 text-center text-xs text-slate-400 font-medium uppercase tracking-wide">PPR</th>
              <th className="px-3 py-3 text-center text-xs text-slate-400 font-medium uppercase tracking-wide">Floor</th>
              <th className="px-3 py-3 text-center text-xs text-slate-400 font-medium uppercase tracking-wide">Ceiling</th>
              <th className="px-3 py-3 text-left text-xs text-slate-400 font-medium uppercase tracking-wide">Tier</th>
              <th className="px-3 py-3 text-left text-xs text-slate-400 font-medium uppercase tracking-wide">Conf</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <PlayerRow key={`${p.team}-${p.player_name}`} p={p} rank={i + 1} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">No players match that filter.</div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-500">
        <div><span className="text-emerald-400 font-semibold">Elite</span> — top-tier fantasy asset, target early</div>
        <div><span className="text-blue-400 font-semibold">Starter</span> — reliable weekly starter</div>
        <div><span className="text-amber-400 font-semibold">Flex</span> — viable flex, matchup dependent</div>
        <div><span className="text-slate-400 font-semibold">Depth</span> — bench/waiver wire range</div>
      </div>
      <div className="mt-2 text-xs text-slate-600">
        Confidence = how many seasons of play-caller tendency data backs the projection.
        New callers default to league averages — treat those projections with caution.
      </div>
    </div>
  )
}
