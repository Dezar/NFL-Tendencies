import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { projectPlayer, getTier, applyExperience, DEFAULT_SCORING, HALF_PPR_SCORING, STD_SCORING } from '../engine/scoring'
import tendencies from '../data/tendencies.json'
import rostersData from '../data/rosters_2026.json'
import injuryData from '../data/injuries.json'
import PlayerModal from '../components/PlayerModal'

// ── ESPN ADP (12-team PPR, August 2026) ──────────────────────────────────────
const ESPN_ADP = {
  'Saquon Barkley':9,'Christian McCaffrey':3,'Ja\'Marr Chase':2,'Justin Jefferson':8,
  'CeeDee Lamb':10,'Jahmyr Gibbs':7,'Malik Nabers':12,'Puka Nacua':14,
  'Amon-Ra St. Brown':16,'Jonathan Taylor':9,'Ashton Jeanty':5,
  'Sam LaPorta':15,'Travis Kelce':17,'Mark Andrews':25,'George Kittle':34,
  'Derrick Henry':46,'De\'Von Achane':13,'James Cook III':24,
  'Josh Allen':4,'Lamar Jackson':6,'Jayden Daniels':22,'Patrick Mahomes':52,
  'Jalen Hurts':18,'DJ Moore':26,'Ladd McConkey':39,'Brian Thomas Jr.':47,
  'Bijan Robinson':27,'Breece Hall':29,'Kenneth Walker III':19,
  'Chase Brown':44,'Kyren Williams':48,'Omarion Hampton':11,
  'Josh Jacobs':62,'Aaron Jones Sr.':62,'Zay Flowers':31,
  'Terry McLaurin':54,'George Pickens':68,'Tee Higgins':33,
  'Jaxon Smith-Njigba':20,'Stefon Diggs':43,'Drake London':78,
  'Davante Adams':85,'Rashee Rice':50,'Rome Odunze':36,
  'Colston Loveland':57,'T.J. Hockenson':32,'Kyle Pitts':70,
  'Courtland Sutton':60,'Xavier Worthy':75,'Malik Washington':95,
  'DeVonta Smith':55,'Rico Dowdle':72,'Cam Skattebo':55,
  'Travis Etienne Jr.':65,'D\'Andre Swift':38,'Rachaad White':72,
  'Jaylen Warren':88,'TreVeyon Henderson':80,'Zach Charbonnet':42,
  'Jadarian Price':140,'Isaiah Likely':49,'Trey McBride':53,
  'Pat Freiermuth':115,'David Njoku':76,'Tyler Warren':78,
  'Brock Bowers':21,'Jaxson Dart':102,'Bo Nix':88,'Baker Mayfield':63,
  'Brock Purdy':48,'Trevor Lawrence':58,'Kyler Murray':42,
  'Caleb Williams':65,'Drake Maye':35,'Matthew Stafford':38,
  'Sam Darnold':90,'Jordan Love':55,'C.J. Stroud':80,
  'Luther Burden III':82,'Javonte Williams':80,'Blake Corum':120,
}

// ── Injury lookup ─────────────────────────────────────────────────────────────
const INJURY_MAP = {}
injuryData.injuries.forEach(p => { INJURY_MAP[p.player_name] = p })

// ── League settings ───────────────────────────────────────────────────────────
const LEAGUE = { teams: 12, QB:1, RB:2, WR:2, TE:1, FLEX:2 }

// Replacement rank = (teams * starters) + flex estimate + 1
const REPLACEMENT = { QB:13, RB:37, WR:37, TE:13 }

const SCORING_PRESETS = [
  { label:'PPR', scoring: DEFAULT_SCORING },
  { label:'Half PPR', scoring: HALF_PPR_SCORING },
  { label:'Standard', scoring: STD_SCORING },
]

function adpToRound(adp) {
  if (!adp) return null
  return `R${Math.ceil(adp/12)}.${((adp-1)%12)+1}`
}

function SortTh({ label, field, sortBy, sortDir, onSort }) {
  const active = sortBy === field
  return (
    <th onClick={() => onSort(field)}
      className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide cursor-pointer hover:text-white select-none text-left">
      <div className="flex items-center gap-1">
        {label}
        {active ? sortDir==='desc' ? <ChevronDown size={11}/> : <ChevronUp size={11}/> : <ChevronsUpDown size={11} className="opacity-25"/>}
      </div>
    </th>
  )
}

export default function DraftBoard() {
  const [scoringIdx, setScoringIdx] = useState(0)
  const [posFilter, setPosFilter] = useState('ALL')
  const [tierFilter, setTierFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('ppr')
  const [sortDir, setSortDir] = useState('desc')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [selectedTeam, setSelectedTeamData] = useState(null)
  const [showSleepers, setShowSleepers] = useState(false)

  const scoring = SCORING_PRESETS[scoringIdx].scoring
  const teamMap = useMemo(() => { const m={}; tendencies.teams.forEach(t=>{m[t.team]=t}); return m }, [])

  // Project all depth-1 starters
  const allProjected = useMemo(() => {
    const byPos = { QB:[], RB:[], WR:[], TE:[] }

    rostersData.players
      .filter(p => p.depth_rank === 1 && ['QB','RB','WR','TE'].includes(p.position))
      .forEach(p => {
        const team = teamMap[p.team] || {}
        const projRaw = projectPlayer(p, team, scoring)
        const proj = applyExperience(p.player_name, projRaw)
        if (proj.ppr > 0) {
          byPos[p.position].push({
            ...p, ...proj,
            playCaller: team.playCaller||'?',
            newCaller: team.newCaller||false,
            rbStyle: team.rbStyle, teStyle: team.teStyle, wr1Style: team.wr1Style,
            rbSeasons: team.rbSeasons??0,
            injury: INJURY_MAP[p.player_name] || null,
          })
        }
      })

    // Assign overall rank by PPR across all positions
    const allForRank = Object.values(byPos).flat().sort((a,b) => b.ppr - a.ppr)
    allForRank.forEach((p, i) => { p.overall_rank = i + 1 })

    // Sort each position and assign pos_rank + VOR
    const result = []
    Object.entries(byPos).forEach(([pos, players]) => {
      players.sort((a,b) => b.ppr - a.ppr)
      const repRank = REPLACEMENT[pos]
      const repPPR = players[repRank-1]?.ppr || players[players.length-1]?.ppr - 20 || 150
      players.forEach((p, i) => {
        const adp = ESPN_ADP[p.player_name] || null
        const vor = p.ppr - repPPR
        // Value vs ADP: positive = we like more than ESPN
        const adpImpliedPPR = adp ? Math.max(50, 500 - adp * 3.5) : null
        const vsEspn = adpImpliedPPR ? Math.round(p.ppr - adpImpliedPPR) : null
        const isSleeper = vsEspn != null && vsEspn > 40 && adp > 36
        result.push({
          ...p, pos_rank: i+1, vor: Math.round(vor),
          rep_ppr: repPPR, adp, adpRound: adpToRound(adp),
          vsEspn, isSleeper,
        })
      })
    })
    return result
  }, [teamMap, scoring])

  const handleSort = (field) => {
    if (sortBy===field) setSortDir(d=>d==='desc'?'asc':'desc')
    else { setSortBy(field); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    return allProjected
      .filter(p => {
        if (posFilter!=='ALL' && p.position!==posFilter) return false
        if (showSleepers && !p.isSleeper) return false
        if (tierFilter==='Elite' && p.vor < 100) return false
        if (tierFilter==='Starter' && (p.vor < 50 || p.vor >= 100)) return false
        if (tierFilter==='Flex' && (p.vor < 0 || p.vor >= 50)) return false
        if (tierFilter==='Avoid' && p.vor >= 0) return false
        return true
      })
      .sort((a,b) => {
        const av = a[sortBy]??-999, bv = b[sortBy]??-999
        return sortDir==='desc' ? bv-av : av-bv
      })
  }, [allProjected, posFilter, showSleepers, tierFilter, sortBy, sortDir])

  // Summary stats
  const sleepers = allProjected.filter(p=>p.isSleeper)
  const elites = allProjected.filter(p=>p.vor>=100)

  // VOR bar max
  const maxVOR = Math.max(...allProjected.map(p=>p.vor), 1)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">2026 Draft Board</h1>
        <p className="text-slate-400 text-sm">
          Value Over Replacement (VOR) for 12-team league · 1QB 2RB 2WR 2FLEX 1TE ·
          Replacement = QB13, RB37, WR37, TE13
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-nfl-card border border-emerald-400/20 rounded-xl p-4">
          <div className="text-2xl font-black text-emerald-400">{elites.length}</div>
          <div className="text-xs text-slate-400 mt-1">Elite VOR (100+)</div>
          <div className="text-xs text-slate-500 mt-0.5">Must-start value</div>
        </div>
        <div className="bg-nfl-card border border-blue-400/20 rounded-xl p-4">
          <div className="text-2xl font-black text-blue-400">{allProjected.filter(p=>p.vor>=50&&p.vor<100).length}</div>
          <div className="text-xs text-slate-400 mt-1">Starter VOR (50-99)</div>
          <div className="text-xs text-slate-500 mt-0.5">Reliable starters</div>
        </div>
        <div className="bg-nfl-card border border-amber-400/20 rounded-xl p-4">
          <div className="text-2xl font-black text-amber-400">{sleepers.length}</div>
          <div className="text-xs text-slate-400 mt-1">Sleepers</div>
          <div className="text-xs text-slate-500 mt-0.5">We project higher than ESPN ADP</div>
        </div>
        <div className="bg-nfl-card border border-nfl-border rounded-xl p-4">
          <div className="text-2xl font-black text-slate-300">{allProjected.length}</div>
          <div className="text-xs text-slate-400 mt-1">Total starters</div>
          <div className="text-xs text-slate-500 mt-0.5">All 32 teams depth-1</div>
        </div>
      </div>

      {/* Position scarcity insight */}
      <div className="bg-nfl-card border border-nfl-border rounded-xl p-5 mb-6">
        <div className="text-sm font-semibold text-white mb-3">Position Scarcity — When to Draft</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-amber-400 font-bold mb-1">QB Strategy</div>
            <div className="text-slate-300">Allen is the only Tier 1 (+88 VOR gap to #2). After Allen, wait — QB2-12 are within 46 pts of each other. Take Allen early or wait until Rd 8+.</div>
          </div>
          <div>
            <div className="text-blue-400 font-bold mb-1">RB Strategy</div>
            <div className="text-slate-300">Top 14 RBs all VOR 147+. The cliff hits at RB15 (Swift, -45 pts drop). Load up RBs in rounds 1-4. Replacement RBs have real value.</div>
          </div>
          <div>
            <div className="text-emerald-400 font-bold mb-1">WR Strategy</div>
            <div className="text-slate-300">Nacua, Jefferson, Chase are Tier 1. DJ Moore is a solid Tier 2. WR stays deep — 20 WRs with VOR 50+. Can wait longer than RB.</div>
          </div>
          <div>
            <div className="text-purple-400 font-bold mb-1">TE Strategy</div>
            <div className="text-slate-300">LaPorta is the only Tier 1 TE (+36 VOR gap to Kelce). After top 5, TE drops sharply. Grab LaPorta/Kelce/Andrews early or use a late pick on upside.</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Scoring */}
        <div className="flex gap-1">
          {SCORING_PRESETS.map((p,i) => (
            <button key={p.label} onClick={() => setScoringIdx(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${scoringIdx===i?'bg-nfl-purple text-white ring-1 ring-purple-400':'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'}`}>
              {p.label}
            </button>
          ))}
        </div>
        {/* Position */}
        <div className="flex gap-1">
          {['ALL','QB','RB','WR','TE'].map(pos => (
            <button key={pos} onClick={() => setPosFilter(pos)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${posFilter===pos?'bg-nfl-blue text-white':'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'}`}>
              {pos}
            </button>
          ))}
        </div>
        {/* VOR tier */}
        <div className="flex gap-1">
          {[['ALL','All'],['Elite','🔥 Elite'],['Starter','✅ Starter'],['Flex','⚠️ Flex'],['Avoid','❌ Avoid']].map(([val,label]) => (
            <button key={val} onClick={() => setTierFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tierFilter===val?'bg-nfl-purple text-white':'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
        {/* Sleepers toggle */}
        <button onClick={() => setShowSleepers(s=>!s)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showSleepers?'bg-amber-500 text-black':'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'}`}>
          💤 Sleepers Only
        </button>
      </div>

      <div className="text-xs text-slate-500 mb-3">
        {filtered.length} players · VOR = value above replacement-level starter ·
        vs ESPN = our projection vs what ADP implies · Click any player for full profile
      </div>

      {/* Table */}
      <div className="bg-nfl-card border border-nfl-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-nfl-border">
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide w-8">#</th>
              <SortTh label="OVR" field="overall_rank" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <SortTh label="Player" field="player_name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Pos</th>
              <SortTh label="Team" field="team" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <SortTh label="PPR" field="ppr" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <SortTh label="VOR" field="vor" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">VOR Bar</th>
              <SortTh label="Pos Rank" field="pos_rank" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <SortTh label="ESPN ADP" field="adp" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <SortTh label="vs ESPN" field="vsEspn" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Play Caller</th>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const vorPct = Math.max(0, Math.min((p.vor / maxVOR) * 100, 100))
              const vorColor = p.vor >= 100 ? 'bg-emerald-500' : p.vor >= 50 ? 'bg-blue-500' : p.vor >= 0 ? 'bg-amber-500' : 'bg-red-500'
              const vsColor = !p.vsEspn ? 'text-slate-500' : p.vsEspn > 40 ? 'text-emerald-400 font-bold' : p.vsEspn > 15 ? 'text-emerald-400' : p.vsEspn < -40 ? 'text-red-400 font-bold' : p.vsEspn < -15 ? 'text-red-400' : 'text-slate-400'
              return (
                <tr key={`${p.team}-${p.player_name}`}
                  onClick={() => { setSelectedPlayer(p); setSelectedTeamData(teamMap[p.team]||null) }}
                  className={`border-b border-nfl-border/30 hover:bg-nfl-blue/5 cursor-pointer transition-colors ${p.isSleeper?'bg-amber-400/[0.03]':''}`}>
                  <td className="px-3 py-2.5 text-center text-xs font-bold text-slate-400">#{p.overall_rank}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-white">{p.player_name}</span>
                      {p.isSleeper && <span className="text-xs bg-amber-500/20 text-amber-400 px-1 rounded font-bold">💤</span>}
                      {p.newCaller && <span className="text-xs bg-blue-500/20 text-blue-400 px-1 rounded font-bold">NEW</span>}
                      {(p.years_exp===0||p.years_exp==='0') && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1 rounded font-bold">RC</span>}
                      {p.injury?.status==='IR' && <span className="text-xs bg-red-500/20 text-red-400 px-1 rounded font-bold">IR</span>}
                      {p.injury?.status==='OUT' && <span className="text-xs bg-red-500/20 text-red-400 px-1 rounded font-bold">OUT</span>}
                      {p.injury?.status==='Q' && <span className="text-xs bg-amber-500/20 text-amber-400 px-1 rounded font-bold">Q</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-xs font-bold bg-nfl-border/50 text-slate-300 px-1.5 py-0.5 rounded">{p.position}</span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300 font-medium">{p.team}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`font-black text-base ${p.vor>=100?'text-emerald-400':p.vor>=50?'text-blue-400':p.vor>=0?'text-amber-400':'text-slate-500'}`}>{p.ppr}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-sm font-black ${p.vor>=100?'text-emerald-400':p.vor>=50?'text-blue-400':p.vor>=0?'text-amber-400':'text-red-400'}`}>
                      {p.vor >= 0 ? '+' : ''}{p.vor}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 w-32">
                    <div className="h-2 bg-nfl-dark rounded-full overflow-hidden w-28">
                      <div className={`h-full rounded-full ${vorColor}`} style={{width:`${vorPct}%`}}/>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center text-slate-400 text-xs font-bold">
                    {p.position} #{p.pos_rank}
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-slate-400">
                    {p.adp ? <><span className="font-semibold">{p.adp}</span><br/><span className="text-slate-600">{p.adpRound}</span></> : <span className="text-slate-600">—</span>}
                  </td>
                  <td className={`px-3 py-2.5 text-center text-xs ${vsColor}`}>
                    {p.vsEspn != null ? (p.vsEspn >= 0 ? '+' : '') + p.vsEspn : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">
                    {p.playCaller}
                    {p.newCaller && <span className="text-amber-400 ml-1">(New)</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">
                    {p.injury?.status_label || 'Active'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-nfl-card border border-nfl-border rounded-xl text-xs text-slate-500 leading-relaxed">
        <span className="text-white font-semibold">VOR explained: </span>
        Value Over Replacement = your player's PPR projection minus what you'd get from a freely-available
        replacement (QB13, RB37, WR37, TE13 in a 12-team league). Higher VOR = more value above what's
        sitting on the waiver wire. <span className="text-amber-400">💤 Sleepers</span> = players where
        our scheme model projects significantly more production than ESPN's ADP implies.
      </div>

      {selectedPlayer && (
        <PlayerModal player={selectedPlayer} team={selectedTeam} scoring={scoring} onClose={() => setSelectedPlayer(null)}/>
      )}
    </div>
  )
}
