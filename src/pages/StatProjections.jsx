import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import tendencies from '../data/tendencies.json'
import rostersData from '../data/rosters_2026.json'
import PlayerModal from '../components/PlayerModal'

const LEAGUE = {
  teamCarries: 430,
  teamPassAttempts: 575,
  yardsPerCarry: 4.4,
  yardsPerTarget: 8.0,
  catchRate: 0.67,
  tdPerCarry: 0.043,
  tdPerTarget: 0.056,
}
const SCORING = { rushYd:0.1, recYd:0.1, rushTd:6, recTd:6, rec:1, passTd:4, passYd:0.04, passInt:-2 }

function projectPlayer(player, team) {
  const pos = player.position
  const depth = player.depth_rank
  const rbShare = team.avgRbShare ?? 65
  const teShare = team.avgTeShare ?? 22
  const wr1Share = team.avgWr1Share ?? 23
  // Pass attempts vary by team pass-rate tendency
  const passAtt = team.avgRbShare
    ? Math.round(LEAGUE.teamPassAttempts * (1 + (65 - team.avgRbShare) / 200))
    : LEAGUE.teamPassAttempts

  if (pos === 'QB' && depth === 1) {
    const py = passAtt * 7.4
    const ptd = passAtt * 0.048
    const ints = passAtt * 0.024
    const ry = 280, rtd = 3.5
    const pts = py*SCORING.passYd + ptd*SCORING.passTd + ints*SCORING.passInt + ry*SCORING.rushYd + rtd*SCORING.rushTd
    return { passAtt:Math.round(passAtt), passYds:Math.round(py), passTds:+ptd.toFixed(1), ints:+ints.toFixed(1),
             rushYds:Math.round(ry), rushTds:+rtd.toFixed(1), carries:null, tgts:null, receptions:null, recYds:null, recTds:null, targetShare:null,
             ppr:Math.round(pts), std:Math.round(pts), floor:Math.round(pts*0.80), ceiling:Math.round(pts*1.22), gpPPR:+(pts/17).toFixed(1) }
  }
  if (pos === 'RB') {
    const split = depth===1 ? rbShare/100
      : depth===2 ? (rbShare<55?0.28:rbShare<65?0.18:rbShare<75?0.10:0.05) : 0.03
    const tgtPct = depth===1?0.17:depth===2?0.07:0.02
    const car = LEAGUE.teamCarries*split
    const ry = car*LEAGUE.yardsPerCarry, rtd = car*LEAGUE.tdPerCarry
    const tgts = passAtt*tgtPct, rec = tgts*LEAGUE.catchRate
    const recy = tgts*LEAGUE.yardsPerTarget, rectd = tgts*LEAGUE.tdPerTarget
    const ppr = ry*SCORING.rushYd+rtd*SCORING.rushTd+rec*SCORING.rec+recy*SCORING.recYd+rectd*SCORING.recTd
    return { carries:Math.round(car), rushYds:Math.round(ry), rushTds:+rtd.toFixed(1),
             tgts:Math.round(tgts), receptions:Math.round(rec), recYds:Math.round(recy), recTds:+rectd.toFixed(1),
             targetShare:+(tgtPct*100).toFixed(1), passAtt:null, passYds:null, passTds:null, ints:null,
             ppr:Math.round(ppr), std:Math.round(ppr-rec*SCORING.rec),
             floor:Math.round(ppr*0.72), ceiling:Math.round(ppr*1.38), gpPPR:+(ppr/17).toFixed(1) }
  }
  if (pos === 'WR') {
    const shareMap = {1:wr1Share, 2:wr1Share*0.55, 3:wr1Share*0.32}
    const tgtShareP = shareMap[depth] ?? wr1Share*0.18
    const tgts = passAtt*(tgtShareP/100)
    const rec = tgts*LEAGUE.catchRate, recy = tgts*LEAGUE.yardsPerTarget, rectd = tgts*LEAGUE.tdPerTarget
    const ppr = rec*SCORING.rec+recy*SCORING.recYd+rectd*SCORING.recTd
    return { carries:null, rushYds:null, rushTds:null, passAtt:null, passYds:null, passTds:null, ints:null,
             tgts:Math.round(tgts), receptions:Math.round(rec), recYds:Math.round(recy), recTds:+rectd.toFixed(1),
             targetShare:+tgtShareP.toFixed(1),
             ppr:Math.round(ppr), std:Math.round(ppr-rec*SCORING.rec),
             floor:Math.round(ppr*0.70), ceiling:Math.round(ppr*1.42), gpPPR:+(ppr/17).toFixed(1) }
  }
  if (pos === 'TE') {
    const depthSplit = depth===1?0.84:depth===2?0.13:0.03
    const tgts = passAtt*(teShare/100)*depthSplit
    const rec = tgts*0.71, recy = tgts*6.9, rectd = tgts*0.067
    const ppr = rec*SCORING.rec+recy*SCORING.recYd+rectd*SCORING.recTd
    return { carries:null, rushYds:null, rushTds:null, passAtt:null, passYds:null, passTds:null, ints:null,
             tgts:Math.round(tgts), receptions:Math.round(rec), recYds:Math.round(recy), recTds:+rectd.toFixed(1),
             targetShare:+(teShare*depthSplit).toFixed(1),
             ppr:Math.round(ppr), std:Math.round(ppr-rec*SCORING.rec),
             floor:Math.round(ppr*0.68), ceiling:Math.round(ppr*1.40), gpPPR:+(ppr/17).toFixed(1) }
  }
  return { ppr:0, std:0, floor:0, ceiling:0, gpPPR:0 }
}

function getTier(pos, ppr) {
  const t = { QB:[260,310,360], RB:[110,170,230], WR:[120,175,235], TE:[75,125,175] }
  const [low,mid,high] = t[pos]||[100,150,200]
  if (ppr>=high) return { label:'Elite', color:'text-emerald-400', bg:'bg-emerald-400/10 border-emerald-400/30' }
  if (ppr>=mid)  return { label:'Starter', color:'text-blue-400', bg:'bg-blue-400/10 border-blue-400/30' }
  if (ppr>=low)  return { label:'Flex', color:'text-amber-400', bg:'bg-amber-400/10 border-amber-400/30' }
  return { label:'Depth', color:'text-slate-500', bg:'bg-slate-500/10 border-slate-500/30' }
}

function SortHeader({ label, field, sortBy, sortDir, onSort }) {
  const active = sortBy === field
  return (
    <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide cursor-pointer hover:text-white select-none"
        onClick={() => onSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        {active ? (sortDir==='desc' ? <ChevronDown size={12}/> : <ChevronUp size={12}/>) : <ChevronsUpDown size={12} className="opacity-30"/>}
      </div>
    </th>
  )
}

const POS_TABS = ['ALL','QB','RB','WR','TE']

export default function StatProjections() {
  const [posFilter, setPosFilter] = useState('ALL')
  const [teamFilter, setTeamFilter] = useState('ALL')
  const [tierFilter, setTierFilter] = useState('ALL')
  const [depthMax, setDepthMax] = useState(2)
  const [sortBy, setSortBy] = useState('ppr')
  const [sortDir, setSortDir] = useState('desc')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [selectedTeam, setSelectedTeamData] = useState(null)

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
        const proj = projectPlayer(p, team)
        return { ...p, ...proj,
          playCaller: team.playCaller||'?',
          rbSeasons: team.rbSeasons??0,
          newCaller: team.newCaller??false,
          rbStyle: team.rbStyle, teStyle: team.teStyle, wr1Style: team.wr1Style }
      })
      .filter(p => p.ppr > 0)
  }, [teamMap, depthMax])

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d==='desc'?'asc':'desc')
    else { setSortBy(field); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    return allProjected
      .filter(p => {
        if (posFilter!=='ALL' && p.position!==posFilter) return false
        if (teamFilter!=='ALL' && p.team!==teamFilter) return false
        if (tierFilter!=='ALL' && getTier(p.position,p.ppr).label!==tierFilter) return false
        return true
      })
      .sort((a,b) => {
        const av = a[sortBy]??0, bv = b[sortBy]??0
        return sortDir==='desc' ? bv-av : av-bv
      })
  }, [allProjected, posFilter, teamFilter, tierFilter, sortBy, sortDir])

  const teams = useMemo(() => ['ALL',...new Set(rostersData.players.map(p=>p.team).sort())],[])
  const summary = useMemo(() => ({
    elite: filtered.filter(p=>getTier(p.position,p.ppr).label==='Elite').length,
    starter: filtered.filter(p=>getTier(p.position,p.ppr).label==='Starter').length,
    total: filtered.length
  }),[filtered])

  const handlePlayerClick = (p) => {
    setSelectedPlayer(p)
    setSelectedTeamData(teamMap[p.team]||null)
  }

  const exportCSV = () => {
    const rows = [['Rank','Player','Pos','Depth','Team','PlayCaller','PPR','Std','Floor','Ceiling','PtsPerGm',
                   'Carries','RushYds','RushTDs','Targets','Receptions','RecYds','RecTDs','PassYds','PassTDs','Tier'],
      ...filtered.map((p,i)=>[i+1,p.player_name,p.position,p.depth_rank,p.team,p.playCaller,
        p.ppr,p.std,p.floor,p.ceiling,p.gpPPR,p.carries??'',p.rushYds??'',p.rushTds??'',
        p.tgts??'',p.receptions??'',p.recYds??'',p.recTds??'',p.passYds??'',p.passTds??'',
        getTier(p.position,p.ppr).label])]
    const csv = rows.map(r=>r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download = `nfl_projections_2026_${posFilter}.csv`
    a.click()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">2026 Projected Stats</h1>
        <p className="text-slate-400 text-sm">
          Full-season stat projections based on play-caller tendency × depth chart × league efficiency.
          Click any player for a detailed breakdown. Rosters as of {rostersData.lastUpdated}.
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

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1">
          {POS_TABS.map(pos => (
            <button key={pos} onClick={() => setPosFilter(pos)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                posFilter===pos?'bg-nfl-blue text-white':'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'}`}>{pos}</button>
          ))}
        </div>
        <div className="flex gap-1">
          {['ALL','Elite','Starter','Flex','Depth'].map(t => (
            <button key={t} onClick={() => setTierFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tierFilter===t?'bg-nfl-purple text-white':'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'}`}>{t}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-nfl-card border border-nfl-border rounded-lg px-3 py-1.5">
          <span className="text-xs text-slate-400">Depth:</span>
          {[1,2,3].map(d => (
            <button key={d} onClick={() => setDepthMax(d)}
              className={`w-6 h-6 rounded text-xs font-bold ${depthMax===d?'bg-nfl-blue text-white':'text-slate-400 hover:text-white'}`}>{d}</button>
          ))}
        </div>
        <select value={teamFilter} onChange={e=>setTeamFilter(e.target.value)}
          className="bg-nfl-card border border-nfl-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
          {teams.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={exportCSV}
          className="px-3 py-1.5 bg-nfl-card border border-nfl-border rounded-lg text-xs text-slate-300 hover:text-white ml-auto">
          ↓ Export CSV
        </button>
      </div>

      <div className="text-xs text-slate-500 mb-3">{filtered.length} players · Click any row for full breakdown · Click column headers to sort</div>

      <div className="bg-nfl-card border border-nfl-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-nfl-border">
              <th className="px-3 py-3 text-left text-xs text-slate-400 font-medium uppercase tracking-wide w-8">#</th>
              <SortHeader label="Player" field="player_name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Pos</th>
              <SortHeader label="Team" field="team" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">D</th>
              <SortHeader label="PPR" field="ppr" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Std" field="std" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Floor" field="floor" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Ceiling" field="ceiling" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Pts/Gm" field="gpPPR" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Carries" field="carries" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="RushYds" field="rushYds" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Targets" field="tgts" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Rec" field="receptions" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="RecYds" field="recYds" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="TDs" field="recTds" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Tier</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const tier = getTier(p.position, p.ppr)
              return (
                <tr key={`${p.team}-${p.player_name}`}
                  onClick={() => handlePlayerClick(p)}
                  className={`border-b border-nfl-border/40 hover:bg-nfl-blue/5 cursor-pointer transition-colors ${
                    tier.label==='Elite'?'bg-emerald-400/[0.02]':''}`}>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{i+1}</td>
                  <td className="px-3 py-2.5">
                    <span className="font-semibold text-white hover:text-nfl-blue transition-colors">{p.player_name}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-xs font-bold bg-nfl-border/50 text-slate-300 px-1.5 py-0.5 rounded">{p.position}</span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300 font-medium">{p.team}</td>
                  <td className="px-3 py-2.5 text-slate-500 text-xs">#{p.depth_rank}</td>
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
        {filtered.length===0 && <div className="text-center py-12 text-slate-500">No players match.</div>}
      </div>

      <div className="mt-3 text-xs text-slate-600">
        Projections = play-caller historical tendency × depth chart slot × league-average efficiency. Not talent adjustments — pure scheme-based model.
      </div>

      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          team={selectedTeam}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  )
}
