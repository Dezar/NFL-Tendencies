import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { projectPlayer, getTier, applyExperience, DEFAULT_SCORING, HALF_PPR_SCORING, STD_SCORING } from '../engine/scoring'
import tendencies from '../data/tendencies.json'
import rostersData from '../data/rosters_2026.json'
import stats2025data from '../data/stats_2025.json'
import injuryData from '../data/injuries.json'
import PlayerModal from '../components/PlayerModal'

// ── Lookups ───────────────────────────────────────────────────────────────────
const S25 = {}
stats2025data.players.forEach(p => { S25[p.player_name] = p })
const INJURY_MAP = {}
injuryData.injuries.forEach(p => { INJURY_MAP[p.player_name] = p })

// ── ESPN ADP (12-team PPR, August 2026) ──────────────────────────────────────
const ESPN_ADP = {
  'Saquon Barkley':1,"Ja'Marr Chase":2,'Christian McCaffrey':3,'Josh Allen':4,
  'Ashton Jeanty':5,'Lamar Jackson':6,'Jahmyr Gibbs':7,'Justin Jefferson':8,
  'Jonathan Taylor':9,'CeeDee Lamb':10,'Omarion Hampton':11,'Malik Nabers':12,
  "De'Von Achane":13,'Puka Nacua':14,'Sam LaPorta':15,'Amon-Ra St. Brown':16,
  'Jalen Hurts':18,'Kenneth Walker III':19,'Jaxon Smith-Njigba':20,
  'Brock Bowers':21,'Jayden Daniels':22,'DJ Moore':26,'Malik Washington':95,
  'Ladd McConkey':39,'Brian Thomas Jr.':47,'Bijan Robinson':27,'Breece Hall':29,
  'Travis Kelce':17,'Mark Andrews':25,'George Kittle':34,'Derrick Henry':46,
  'James Cook III':24,'Josh Jacobs':62,'Chase Brown':44,'Kyren Williams':48,
  'Cam Skattebo':55,'Rico Dowdle':72,'TreVeyon Henderson':80,
  "Aaron Jones Sr.":62,'Zay Flowers':31,'Stefon Diggs':43,
  'Terry McLaurin':54,'George Pickens':68,'Tee Higgins':33,
  'Drake London':78,'Davante Adams':85,'Rashee Rice':50,
  'Rome Odunze':36,'Colston Loveland':57,'T.J. Hockenson':32,'Kyle Pitts':70,
  'Courtland Sutton':60,'Xavier Worthy':75,'DeVonta Smith':55,
  'Javonte Williams':80,'Zach Charbonnet':42,'Isaiah Likely':49,
  'Trey McBride':53,'Pat Freiermuth':115,'David Njoku':76,'Tyler Warren':78,
  "D'Andre Swift":38,'Breece Hall':29,'Jaylen Warren':88,
  'Jaxson Dart':102,'Bo Nix':88,'Baker Mayfield':63,'Brock Purdy':48,
  'Trevor Lawrence':58,'Kyler Murray':42,'Caleb Williams':65,'Drake Maye':35,
  'Matthew Stafford':38,'Sam Darnold':90,'Jordan Love':55,'C.J. Stroud':80,
  'Patrick Mahomes':52,'Luther Burden III':82,'Blake Corum':120,
  'Tetairoa McMillan':65,'Emeka Egbuka':90,'Tyler Warren':78,
  'Harold Fannin Jr.':110,'Cam Ward':95,'Jayden Daniels':22,
  'Jeremiyah Love':75,'Omarion Hampton':11,
}

// ── League settings ───────────────────────────────────────────────────────────
// Your league: 12 teams, 1QB 2RB 2WR 2FLEX 1TE 1K 1DST
const REPLACEMENT_RANK = { QB:13, RB:37, WR:37, TE:13 }

const SCORING_PRESETS = [
  { label:'PPR',      scoring: DEFAULT_SCORING },
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
      className="px-3 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide cursor-pointer hover:text-white select-none text-right whitespace-nowrap">
      <div className="flex items-center justify-end gap-1">
        {label}
        {active ? sortDir==='desc'?<ChevronDown size={11}/>:<ChevronUp size={11}/> : <ChevronsUpDown size={11} className="opacity-25"/>}
      </div>
    </th>
  )
}

// Value signal
function valueBadge(vsEspn) {
  if (vsEspn == null) return { label:'Unranked', cls:'text-slate-400 bg-slate-400/10 border-slate-400/20' }
  if (vsEspn >= 60)  return { label:'🔥 Strong Buy', cls:'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' }
  if (vsEspn >= 25)  return { label:'✅ Buy',        cls:'text-green-400 bg-green-400/10 border-green-400/30' }
  if (vsEspn <= -60) return { label:'❌ Avoid',      cls:'text-red-400 bg-red-400/10 border-red-400/30' }
  if (vsEspn <= -25) return { label:'⚠️ Sell',       cls:'text-orange-400 bg-orange-400/10 border-orange-400/30' }
  return { label:'Fair Value', cls:'text-slate-300 bg-slate-300/10 border-slate-300/20' }
}

export default function DraftValue() {
  const [posFilter, setPosFilter]   = useState('ALL')
  const [sigFilter, setSigFilter]   = useState('ALL')
  const [scoringIdx, setScoringIdx] = useState(0)
  const [sortBy, setSortBy]         = useState('vor')
  const [sortDir, setSortDir]       = useState('desc')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [selectedTeam,   setSelectedTeamData] = useState(null)

  const scoring = SCORING_PRESETS[scoringIdx].scoring
  const teamMap = useMemo(() => { const m={}; tendencies.teams.forEach(t=>{m[t.team]=t}); return m },[])

  // Project all depth-1 players
  const projected = useMemo(() => {
    const byPos = { QB:[], RB:[], WR:[], TE:[] }

    rostersData.players
      .filter(p => p.depth_rank === 1 && ['QB','RB','WR','TE'].includes(p.position))
      .forEach(p => {
        const team = teamMap[p.team] || {}
        const projRaw = projectPlayer(p, team, scoring)
        const proj = applyExperience(p.player_name, projRaw)
        if (proj.ppr > 0) byPos[p.position].push({ ...p, ...proj,
          playCaller: team.playCaller||'?', newCaller: team.newCaller||false,
          rbStyle: team.rbStyle, avgRbShare: team.avgRbShare,
          avgTeShare: team.avgTeShare, avgWr1Share: team.avgWr1Share,
          injury: INJURY_MAP[p.player_name]||null,
        })
      })

    const result = []
    Object.entries(byPos).forEach(([pos, players]) => {
      players.sort((a,b) => b.ppr-a.ppr)
      const repRank = REPLACEMENT_RANK[pos]
      const repPPR = players[repRank-1]?.ppr || (players[players.length-1]?.ppr - 20) || 150
      players.forEach((p, i) => {
        const adp = ESPN_ADP[p.player_name] || null
        const vor = Math.round(p.ppr - repPPR)

        // vs ESPN: how much more/less we project vs what ADP implies
        // ADP 1 implies elite production, ADP 100+ implies waiver-wire value
        const adpImpliedPPR = adp
          ? Math.max(80, 520 - (adp * 3.8))
          : null
        const vsEspn = adpImpliedPPR ? Math.round(p.ppr - adpImpliedPPR) : null
        const badge  = valueBadge(vsEspn)

        // Is this a year-2 leap player not yet priced in?
        const isSleeper = vsEspn != null && vsEspn >= 25 && adp > 30
        const isAvoid   = vsEspn != null && vsEspn <= -25
        const ppr2025   = S25[p.player_name]?.fantasy_ppr ?? null

        result.push({ ...p, pos_rank:i+1, vor, repPPR,
          adp, adpRound:adpToRound(adp), vsEspn, badge, isSleeper, isAvoid, ppr2025 })
      })
    })
    return result
  }, [teamMap, scoring])

  const handleSort = (f) => {
    if (sortBy===f) setSortDir(d=>d==='desc'?'asc':'desc')
    else { setSortBy(f); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    return projected
      .filter(p => {
        if (posFilter!=='ALL' && p.position!==posFilter) return false
        if (sigFilter==='Buy'    && !p.isSleeper) return false
        if (sigFilter==='Avoid'  && !p.isAvoid)   return false
        if (sigFilter==='Year2'  && (p.expMult||1) <= 1) return false
        if (sigFilter==='NewCaller' && !p.newCaller) return false
        return true
      })
      .sort((a,b) => {
        const av = a[sortBy]??(sortDir==='desc'?-9999:9999)
        const bv = b[sortBy]??(sortDir==='desc'?-9999:9999)
        return sortDir==='desc'?bv-av:av-bv
      })
  }, [projected, posFilter, sigFilter, sortBy, sortDir])

  const buys   = projected.filter(p=>p.isSleeper)
  const avoids = projected.filter(p=>p.isAvoid)
  const year2  = projected.filter(p=>(p.expMult||1)>1)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Draft Value Finder</h1>
        <p className="text-slate-400 text-sm">
          Our scheme + year-2 leap projections vs ESPN ADP. Find players being drafted too early or too late
          in your 12-team PPR league (1QB 2RB 2WR 2FLEX 1TE).
        </p>
      </div>

      {/* How to use this */}
      <div className="bg-nfl-card border border-nfl-border rounded-xl p-5 mb-6">
        <div className="text-sm font-semibold text-white mb-3">How to Use This Page</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
          <div className="space-y-1.5">
            <div className="text-emerald-400 font-semibold">Finding Buys (undervalued)</div>
            <p>Sort by <span className="text-white">vs ESPN</span> descending — players at the top are ones we project significantly higher than their ADP suggests. Big positive = draft 1-2 rounds earlier than ADP.</p>
          </div>
          <div className="space-y-1.5">
            <div className="text-red-400 font-semibold">Avoiding Overpays</div>
            <p>Sort by <span className="text-white">vs ESPN</span> ascending — players at the top have the biggest gap where market prices them higher than our scheme model supports.</p>
          </div>
          <div className="space-y-1.5">
            <div className="text-purple-400 font-semibold">Year-2 Leap Targets</div>
            <p>Filter <span className="text-white">Year-2</span> — these rookies from 2025 should take a big step forward in 2026 but may not be fully priced in by ESPN ADP yet.</p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-nfl-card border border-emerald-400/20 rounded-xl p-4 cursor-pointer hover:border-emerald-400/40"
             onClick={() => setSigFilter(sigFilter==='Buy'?'ALL':'Buy')}>
          <div className="text-2xl font-black text-emerald-400">{buys.length}</div>
          <div className="text-xs text-slate-300 font-medium mt-1">🔥 Buys / Sleepers</div>
          <div className="text-xs text-slate-500 mt-0.5">We project significantly higher than ADP</div>
          <div className="mt-2 space-y-0.5">
            {buys.slice(0,3).map(p=>(
              <div key={p.player_name} className="flex justify-between text-xs">
                <span className="text-slate-300">{p.player_name.split(' ').pop()} <span className="text-slate-500">{p.position}</span></span>
                <span className="text-emerald-400 font-semibold">+{p.vsEspn} vs ADP {p.adp}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-nfl-card border border-red-400/20 rounded-xl p-4 cursor-pointer hover:border-red-400/40"
             onClick={() => setSigFilter(sigFilter==='Avoid'?'ALL':'Avoid')}>
          <div className="text-2xl font-black text-red-400">{avoids.length}</div>
          <div className="text-xs text-slate-300 font-medium mt-1">❌ Avoids / Overpays</div>
          <div className="text-xs text-slate-500 mt-0.5">ADP prices them higher than scheme supports</div>
          <div className="mt-2 space-y-0.5">
            {avoids.slice(0,3).map(p=>(
              <div key={p.player_name} className="flex justify-between text-xs">
                <span className="text-slate-300">{p.player_name.split(' ').pop()} <span className="text-slate-500">{p.position}</span></span>
                <span className="text-red-400 font-semibold">{p.vsEspn} vs ADP {p.adp}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-nfl-card border border-purple-400/20 rounded-xl p-4 cursor-pointer hover:border-purple-400/40"
             onClick={() => setSigFilter(sigFilter==='Year2'?'ALL':'Year2')}>
          <div className="text-2xl font-black text-purple-400">{year2.length}</div>
          <div className="text-xs text-slate-300 font-medium mt-1">🚀 Year-2 Leapers</div>
          <div className="text-xs text-slate-500 mt-0.5">2025 rookies projected to take big step forward</div>
          <div className="mt-2 space-y-0.5">
            {year2.sort((a,b)=>(b.expMult||1)-(a.expMult||1)).slice(0,3).map(p=>(
              <div key={p.player_name} className="flex justify-between text-xs">
                <span className="text-slate-300">{p.player_name.split(' ').pop()} <span className="text-slate-500">{p.position}</span></span>
                <span className="text-purple-400 font-semibold">{p.expLabel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1">
          {['ALL','QB','RB','WR','TE'].map(pos=>(
            <button key={pos} onClick={()=>setPosFilter(pos)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${posFilter===pos?'bg-nfl-blue text-white':'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'}`}>
              {pos}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {[
            ['ALL','All Players'],['Buy','🔥 Buys'],['Avoid','❌ Avoids'],
            ['Year2','🚀 Year-2'],['NewCaller','🆕 New Caller'],
          ].map(([val,label])=>(
            <button key={val} onClick={()=>setSigFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${sigFilter===val?'bg-nfl-purple text-white':'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {SCORING_PRESETS.map((p,i)=>(
            <button key={p.label} onClick={()=>setScoringIdx(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${scoringIdx===i?'bg-nfl-purple text-white ring-1 ring-purple-400':'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-slate-500 mb-3">
        {filtered.length} players · Sort by "vs ESPN" to find value · Click player for full profile
      </div>

      {/* Table */}
      <div className="bg-nfl-card border border-nfl-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-nfl-border">
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-left w-8">#</th>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-left">Player</th>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-center">Pos</th>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-left">Team</th>
              <SortTh label="Our PPR" field="ppr"        sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <SortTh label="2025 PPR" field="ppr2025"   sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <SortTh label="VOR"     field="vor"        sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <SortTh label="ESPN ADP" field="adp"       sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-center">Round</th>
              <SortTh label="vs ESPN" field="vsEspn"     sortBy={sortBy} sortDir={sortDir} onSort={handleSort}/>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-left">Signal</th>
              <th className="px-3 py-3 text-xs text-slate-400 font-medium uppercase text-left">Why</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p,i) => {
              const tier = getTier(p.position, p.ppr)
              return (
                <tr key={`${p.team}-${p.player_name}`}
                  onClick={()=>{setSelectedPlayer(p);setSelectedTeamData(teamMap[p.team]||null)}}
                  className={`border-b border-nfl-border/25 hover:bg-nfl-blue/5 cursor-pointer transition-colors ${
                    p.isSleeper?'bg-emerald-400/[0.02]':p.isAvoid?'bg-red-400/[0.02]':''}`}>
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
                    <div className="text-xs text-slate-600 mt-0.5">#{p.pos_rank}</div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300 font-medium">{p.team}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`text-sm font-black ${tier.color}`}>{p.ppr}</span>
                    {p.expMult>1 && <div className="text-xs text-purple-400">+{Math.round((p.expMult-1)*100)}% Y2</div>}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs text-amber-300">{p.ppr2025 ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`text-xs font-bold ${p.vor>=100?'text-emerald-400':p.vor>=50?'text-blue-400':p.vor>=0?'text-amber-400':'text-red-400'}`}>
                      {p.vor>=0?'+':''}{p.vor}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {p.adp ? <span className="text-slate-300 font-semibold">{p.adp}</span> : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-slate-500">{p.adpRound ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right">
                    {p.vsEspn != null
                      ? <span className={`text-xs font-bold ${p.vsEspn>=60?'text-emerald-400 text-sm':p.vsEspn>=25?'text-emerald-400':p.vsEspn<=-60?'text-red-400 text-sm':p.vsEspn<=-25?'text-red-400':'text-slate-400'}`}>
                          {p.vsEspn>=0?'+':''}{p.vsEspn}
                        </span>
                      : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${p.badge.cls}`}>
                      {p.badge.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-400 max-w-xs">
                    {p.expMult>1
                      ? p.expLabel
                      : p.newCaller
                      ? `New caller: ${p.playCaller}`
                      : p.injury?.note
                      ? p.injury.note
                      : p.rbStyle || ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-nfl-card border border-nfl-border rounded-xl text-xs text-slate-500 space-y-1.5">
        <p><span className="text-white font-semibold">VOR</span> = Value Over Replacement. Positive = better than what's on the waiver wire. Target players with high VOR at their ADP.</p>
        <p><span className="text-white font-semibold">vs ESPN</span> = our projection minus what ESPN's ADP implies for that slot. <span className="text-emerald-400">Positive = undervalued by the market.</span> <span className="text-red-400">Negative = overvalued.</span></p>
        <p><span className="text-purple-400 font-semibold">Y2</span> = Year-2 player (was a rookie in 2025). These projections include a leap factor based on historical year-over-year improvement rates.</p>
        <p><span className="text-white font-semibold">Draft tip:</span> Sort "vs ESPN" desc and look for Green Flags at ADP 30+. Those are players you can get 2 rounds later than they're worth. Avoid players with large negative vs ESPN early in the draft.</p>
      </div>

      {selectedPlayer && (
        <PlayerModal player={selectedPlayer} team={selectedTeam} scoring={SCORING_PRESETS[scoringIdx].scoring}
          onClose={()=>setSelectedPlayer(null)}/>
      )}
    </div>
  )
}
