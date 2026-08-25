import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, DollarSign, Target, TrendingUp } from 'lucide-react'
import { projectPlayer, getTier, applyExperience, DEFAULT_SCORING, HALF_PPR_SCORING, STD_SCORING } from '../engine/scoring'
import tendencies from '../data/tendencies.json'
import rostersData from '../data/rosters_2026.json'
import injuryData from '../data/injuries.json'
import PlayerModal from '../components/PlayerModal'

const INJURY_MAP = {}
injuryData.injuries.forEach(p => { INJURY_MAP[p.player_name] = p })

const SCORING_PRESETS = [
  { label:'PPR',      scoring: DEFAULT_SCORING },
  { label:'Half PPR', scoring: HALF_PPR_SCORING },
  { label:'Standard', scoring: STD_SCORING },
]

// Replacement ranks for 12-team league
// QB:13, RB:37 (24 starters + ~13 flex), WR:37, TE:13
const REPLACEMENT_RANK = { QB:13, RB:37, WR:37, TE:13 }

function SortTh({ label, field, sortBy, sortDir, onSort, right }) {
  const active = sortBy === field
  return (
    <th onClick={() => onSort(field)}
      className={`px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide cursor-pointer hover:text-white select-none ${right?'text-right':'text-left'}`}>
      <div className={`flex items-center gap-1 ${right?'justify-end':''}`}>
        {label}
        {active ? sortDir==='desc'?<ChevronDown size={11}/>:<ChevronUp size={11}/> : <ChevronsUpDown size={11} className="opacity-25"/>}
      </div>
    </th>
  )
}

export default function Auction() {
  // League settings - all adjustable
  const [teams, setTeams]           = useState(12)
  const [budget, setBudget]         = useState(200)
  const [qbSlots, setQbSlots]       = useState(1)
  const [rbSlots, setRbSlots]       = useState(2)
  const [wrSlots, setWrSlots]       = useState(2)
  const [teSlots, setTeSlots]       = useState(1)
  const [flexSlots, setFlexSlots]   = useState(2)
  const [minBid, setMinBid]         = useState(1)
  const [scoringIdx, setScoringIdx] = useState(0)
  const [posFilter, setPosFilter]   = useState('ALL')
  const [sortBy, setSortBy]         = useState('auction_value')
  const [sortDir, setSortDir]       = useState('desc')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [selectedTeam,   setSelectedTeamData] = useState(null)

  const scoring = SCORING_PRESETS[scoringIdx].scoring

  // Derived league math
  const totalBudget    = teams * budget
  const draftableSpots = { QB: teams * qbSlots, RB: teams * (rbSlots + flexSlots * 0.35), WR: teams * (wrSlots + flexSlots * 0.55), TE: teams * (teSlots + flexSlots * 0.10) }
  const repRanks       = { QB: Math.round(draftableSpots.QB)+1, RB: Math.round(draftableSpots.RB)+1, WR: Math.round(draftableSpots.WR)+1, TE: Math.round(draftableSpots.TE)+1 }
  // Total roster spots per team (for min bid holdback)
  const totalRosterSpots = qbSlots + rbSlots + wrSlots + teSlots + flexSlots + 2 // +2 for K+DST
  const holdback = totalRosterSpots * minBid
  const spendableBudget = (budget - holdback) // per team

  const teamMap = useMemo(() => {
    const m = {}; tendencies.teams.forEach(t => { m[t.team] = t }); return m
  }, [])

  // Project all depth-1 players
  const projected = useMemo(() => {
    const byPos = { QB:[], RB:[], WR:[], TE:[] }
    rostersData.players
      .filter(p => p.depth_rank === 1 && byPos[p.position] !== undefined)
      .forEach(p => {
        const team = teamMap[p.team] || {}
        const raw  = projectPlayer(p, team, scoring)
        const proj = applyExperience(p.player_name, raw)
        if (proj.ppr > 0) byPos[p.position].push({
          ...p, ...proj,
          playCaller: team.playCaller||'?', newCaller: team.newCaller||false,
          rbStyle: team.rbStyle, avgRbShare: team.avgRbShare,
          avgWr1Share: team.avgWr1Share, avgTeShare: team.avgTeShare,
          injury: INJURY_MAP[p.player_name]||null,
        })
      })

    // Sort and assign pos_rank, VOR, auction value
    const result = []
    const posVOR = { QB:0, RB:0, WR:0, TE:0 }

    // First pass: get rep PPR for each position
    const repPPR = {}
    Object.entries(byPos).forEach(([pos, players]) => {
      players.sort((a,b) => b.ppr-a.ppr)
      const repRank = repRanks[pos] - 1
      repPPR[pos] = players[Math.min(repRank, players.length-1)]?.ppr || 150
    })

    // Sum total VOR by position
    Object.entries(byPos).forEach(([pos, players]) => {
      players.forEach(p => {
        const vor = Math.max(0, p.ppr - repPPR[pos])
        posVOR[pos] += vor
      })
    })

    const totalVOR = Object.values(posVOR).reduce((s,v)=>s+v,0)

    // Budget allocation per position (per team)
    const posbudget = {}
    Object.entries(posVOR).forEach(([pos, vor]) => {
      posbudget[pos] = spendableBudget * (vor / totalVOR)
    })

    // Second pass: calculate auction values
    Object.entries(byPos).forEach(([pos, players]) => {
      players.forEach((p, i) => {
        const vor = Math.max(0, p.ppr - repPPR[pos])
        // Auction value = (VOR / total_pos_VOR) × total_pos_budget_across_league
        const auctionVal = posVOR[pos] > 0
          ? Math.round(vor / posVOR[pos] * posbudget[pos] * teams)
          : 1
        const finalVal = Math.max(minBid, auctionVal)

        result.push({
          ...p,
          pos_rank: i+1,
          vor: Math.round(vor),
          rep_ppr: repPPR[pos],
          auction_value: finalVal,
          pos_budget: posbudget[pos],
          posVOR: posVOR[pos],
          totalVOR,
        })
      })
    })

    return result
  }, [teamMap, scoring, teams, budget, qbSlots, rbSlots, wrSlots, teSlots, flexSlots, minBid, spendableBudget])

  // Budget allocation summary
  const budgetByPos = useMemo(() => {
    const m = {}
    projected.forEach(p => {
      if (!m[p.position]) m[p.position] = { vor: 0, budget: 0, players: 0 }
      m[p.position].vor += p.vor
      m[p.position].budget = p.pos_budget
      m[p.position].players++
    })
    return m
  }, [projected])

  const handleSort = (f) => {
    if (sortBy===f) setSortDir(d=>d==='desc'?'asc':'desc')
    else { setSortBy(f); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    return projected
      .filter(p => posFilter==='ALL' || p.position===posFilter)
      .sort((a,b) => {
        const av=a[sortBy]??(sortDir==='desc'?-9999:9999)
        const bv=b[sortBy]??(sortDir==='desc'?-9999:9999)
        return sortDir==='desc'?bv-av:av-bv
      })
  }, [projected, posFilter, sortBy, sortDir])

  // Key strategy insight
  const topRB = projected.filter(p=>p.position==='RB').sort((a,b)=>b.auction_value-a.auction_value)[0]
  const topWR = projected.filter(p=>p.position==='WR').sort((a,b)=>b.auction_value-a.auction_value)[0]
  const topTE = projected.filter(p=>p.position==='TE').sort((a,b)=>b.auction_value-a.auction_value)[0]
  const topQB = projected.filter(p=>p.position==='QB').sort((a,b)=>b.auction_value-a.auction_value)[0]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Auction Draft Strategy</h1>
        <p className="text-slate-400 text-sm">
          Scheme-based auction values for your league. Adjust settings below — values recalculate instantly.
        </p>
      </div>

      {/* League settings */}
      <div className="bg-nfl-card border border-nfl-border rounded-xl p-5 mb-6">
        <div className="text-sm font-semibold text-white mb-4">Your League Settings</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label:'Teams', val:teams, set:setTeams, min:8, max:16 },
            { label:'Budget ($)', val:budget, set:setBudget, min:100, max:500, step:50 },
            { label:'QB Slots', val:qbSlots, set:setQbSlots, min:1, max:2 },
            { label:'RB Slots', val:rbSlots, set:setRbSlots, min:1, max:4 },
            { label:'WR Slots', val:wrSlots, set:setWrSlots, min:1, max:4 },
            { label:'TE Slots', val:teSlots, set:setTeSlots, min:1, max:2 },
            { label:'FLEX Slots', val:flexSlots, set:setFlexSlots, min:0, max:4 },
            { label:'Min Bid ($)', val:minBid, set:setMinBid, min:1, max:5 },
          ].map(({ label, val, set, min, max, step=1 }) => (
            <div key={label}>
              <label className="text-xs text-slate-400 block mb-1">{label}</label>
              <div className="flex items-center gap-2">
                <input type="range" min={min} max={max} step={step} value={val}
                  onChange={e => set(Number(e.target.value))}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-nfl-border"/>
                <span className="text-sm font-bold text-white w-8 text-right">{val}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-4">
          {SCORING_PRESETS.map((p,i) => (
            <button key={p.label} onClick={() => setScoringIdx(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${scoringIdx===i?'bg-nfl-purple text-white':'bg-nfl-dark border border-nfl-border text-slate-400 hover:text-white'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Budget breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {['QB','RB','WR','TE'].map(pos => {
          const bd = budgetByPos[pos]
          if (!bd) return null
          const pct = Math.round(bd.vor / (projected[0]?.totalVOR||1) * 100)
          const perTeam = Math.round(bd.budget)
          const colors = {QB:'text-blue-400 border-blue-400/20',RB:'text-emerald-400 border-emerald-400/20',WR:'text-purple-400 border-purple-400/20',TE:'text-amber-400 border-amber-400/20'}
          return (
            <div key={pos} className={`bg-nfl-card border rounded-xl p-4 ${colors[pos].split(' ')[1]}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-lg font-black ${colors[pos].split(' ')[0]}`}>{pos}</span>
                <span className="text-xs text-slate-500">{pct}% of VOR</span>
              </div>
              <div className={`text-3xl font-black ${colors[pos].split(' ')[0]}`}>${perTeam}</div>
              <div className="text-xs text-slate-400 mt-1">target spend per team</div>
              <div className="mt-2 h-1.5 bg-nfl-dark rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${pos==='QB'?'bg-blue-500':pos==='RB'?'bg-emerald-500':pos==='WR'?'bg-purple-500':'bg-amber-500'}`}
                     style={{width:`${pct*2}%`}}/>
              </div>
            </div>
          )
        })}
      </div>

      {/* Strategy summary */}
      <div className="bg-nfl-card border border-nfl-border rounded-xl p-5 mb-6">
        <div className="text-sm font-semibold text-white mb-3">
          Auction Strategy — ${budget} Budget, {teams}-Team League
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
          <div className="space-y-2">
            <p><span className="text-white font-semibold">Total spendable per team:</span> ${spendableBudget} (after ${holdback} held for minimum bids)</p>
            <p><span className="text-emerald-400 font-semibold">RB strategy:</span> ${Math.round(budgetByPos.RB?.budget||0)} target. RB scarcity is real — top backs like {topRB?.player_name} worth ${topRB?.auction_value}. Spend early and heavy on elite RBs, thin at back end.</p>
            <p><span className="text-purple-400 font-semibold">WR strategy:</span> ${Math.round(budgetByPos.WR?.budget||0)} target. WR stays deeper than RB. Can find value in rounds 5-8 equivalent ($8-15 range). Don't overpay for WR1 when WR4 gives similar VOR.</p>
          </div>
          <div className="space-y-2">
            <p><span className="text-amber-400 font-semibold">TE strategy:</span> ${Math.round(budgetByPos.TE?.budget||0)} target. TE is binary — top tier (LaPorta, Andrews, Kelce ~$20-25) vs streaming ($1-3). Either spend up or go $1.</p>
            <p><span className="text-blue-400 font-semibold">QB strategy:</span> ${Math.round(budgetByPos.QB?.budget||0)} target. QBs are cheap in auction. {topQB?.player_name} at ${topQB?.auction_value} is the only one worth real money. After that, $5-12 range for QB8-12 is plenty.</p>
            <p><span className="text-slate-300 font-semibold">Key rule:</span> Never go over auction value unless you have leftover budget late. The goal is $1 value plays — players who score above their price. Target new play-caller situations and year-2 leapers at $8-15.</p>
          </div>
        </div>
      </div>

      {/* Player price table */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1">
          {['ALL','QB','RB','WR','TE'].map(pos => (
            <button key={pos} onClick={() => setPosFilter(pos)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${posFilter===pos?'bg-nfl-blue text-white':'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'}`}>
              {pos}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500 flex items-center ml-auto">
          {filtered.length} players · Click player for full profile · Adjust settings above to recalculate
        </div>
      </div>

      <div className="bg-nfl-card border border-nfl-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-nfl-border">
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-left">#</th>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-left">Player</th>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-center">Pos</th>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-left">Team</th>
              <SortTh label="PPR Proj" field="ppr"           sortBy={sortBy} sortDir={sortDir} onSort={handleSort} right/>
              <SortTh label="VOR"      field="vor"           sortBy={sortBy} sortDir={sortDir} onSort={handleSort} right/>
              <SortTh label="$ Value"  field="auction_value" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} right/>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-center">Value Bar</th>
              <SortTh label="Pos Rank" field="pos_rank"      sortBy={sortBy} sortDir={sortDir} onSort={handleSort} right/>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-left">Play Caller</th>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const tier = getTier(p.position, p.ppr)
              const valColor = p.auction_value >= 40 ? 'text-emerald-400'
                : p.auction_value >= 20 ? 'text-blue-400'
                : p.auction_value >= 10 ? 'text-amber-400'
                : 'text-slate-400'
              const maxVal = Math.max(...filtered.map(x=>x.auction_value), 1)
              const barPct = Math.min((p.auction_value / maxVal) * 100, 100)
              const barColor = p.auction_value >= 40 ? 'bg-emerald-500'
                : p.auction_value >= 20 ? 'bg-blue-500'
                : p.auction_value >= 10 ? 'bg-amber-500'
                : 'bg-slate-600'

              return (
                <tr key={`${p.team}-${p.player_name}`}
                  onClick={() => { setSelectedPlayer(p); setSelectedTeamData(teamMap[p.team]||null) }}
                  className="border-b border-nfl-border/25 hover:bg-nfl-blue/5 cursor-pointer transition-colors">
                  <td className="px-3 py-2.5 text-xs text-slate-500">{i+1}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-white">{p.player_name}</span>
                      {p.expMult>1  && <span className="text-xs bg-purple-500/20 text-purple-400 px-1 rounded font-bold" title={p.expLabel}>Y2</span>}
                      {p.expMult<1  && <span className="text-xs bg-orange-500/20 text-orange-400 px-1 rounded font-bold">RC</span>}
                      {p.newCaller  && <span className="text-xs bg-blue-500/20 text-blue-400 px-1 rounded font-bold">NEW</span>}
                      {p.injury?.status==='IR'  && <span className="text-xs bg-red-500/20 text-red-400 px-1 rounded font-bold">IR</span>}
                      {p.injury?.status==='OUT' && <span className="text-xs bg-red-500/20 text-red-400 px-1 rounded font-bold">OUT</span>}
                      {p.injury?.status==='Q'   && <span className="text-xs bg-amber-500/20 text-amber-400 px-1 rounded font-bold">Q</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-xs font-bold bg-nfl-border/50 text-slate-300 px-1.5 py-0.5 rounded">{p.position}</span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300 font-medium">{p.team}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`text-sm font-bold ${tier.color}`}>{p.ppr}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`text-xs font-bold ${p.vor>0?'text-blue-400':'text-slate-500'}`}>
                      {p.vor>0?'+':''}{p.vor}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`text-lg font-black ${valColor}`}>${p.auction_value}</span>
                  </td>
                  <td className="px-3 py-2.5 w-28">
                    <div className="h-2 bg-nfl-dark rounded-full overflow-hidden w-24">
                      <div className={`h-full rounded-full ${barColor}`} style={{width:`${barPct}%`}}/>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-400">
                    {p.position}#{p.pos_rank}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">
                    {p.playCaller}
                    {p.newCaller && <span className="text-amber-400 ml-1">(New)</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-500 max-w-xs">
                    {p.expMult>1 ? p.expLabel
                     : p.injury?.note ? p.injury.note
                     : p.rbStyle || ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* How auction values work */}
      <div className="mt-4 p-5 bg-nfl-card border border-nfl-border rounded-xl text-xs text-slate-400 space-y-2">
        <div className="text-white font-semibold text-sm mb-2">How Auction Values Are Calculated</div>
        <p><span className="text-white font-semibold">Step 1 — VOR:</span> Each player's projection minus the last draftable player at their position (QB13, RB37, WR37, TE13 in a 12-team league). This is the true value above what's free.</p>
        <p><span className="text-white font-semibold">Step 2 — Position budget:</span> The total $200 × 12 teams = $2,400 pool is divided proportionally by how much VOR is available at each position. More VOR at a position = more budget should flow there.</p>
        <p><span className="text-white font-semibold">Step 3 — Player price:</span> Each player gets a slice of their position's budget proportional to their VOR share. Higher VOR = higher price.</p>
        <p><span className="text-white font-semibold">Key auction rules:</span></p>
        <p>• <span className="text-emerald-400">Spend to value, not to budget</span> — if you finish with $30 left, you left value on the table</p>
        <p>• <span className="text-amber-400">Stars and scrubs works</span> — pay up for 2-3 elite players, fill the rest with $1-3 value plays</p>
        <p>• <span className="text-blue-400">Nomination strategy matters</span> — nominate players you don't want early to drain others' budgets</p>
        <p>• <span className="text-purple-400">Year-2 players (Y2)</span> — these are projected higher than their market price. Target them at auction value or 20% below</p>
      </div>

      {selectedPlayer && (
        <PlayerModal player={selectedPlayer} team={selectedTeam} scoring={scoring}
          onClose={() => setSelectedPlayer(null)}/>
      )}
    </div>
  )
}
