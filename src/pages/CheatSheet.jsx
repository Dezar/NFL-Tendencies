import React, { useState, useMemo } from 'react'
import { DollarSign, ChevronDown, ChevronUp, Target } from 'lucide-react'
import rostersData from '../data/rosters_2026.json'
import tendencies from '../data/tendencies.json'
import injuryData from '../data/injuries.json'
import experienceData from '../data/experience.json'
import { projectPlayer, applyExperience, DEFAULT_SCORING } from '../engine/scoring'

const INJURY_MAP = {}
injuryData.injuries.forEach(p => { INJURY_MAP[p.player_name] = p })
const teamMap = {}
tendencies.teams.forEach(t => { teamMap[t.team] = t })

const ESPN = {
  'Josh Allen':22,'Jayden Daniels':10,'Drake Maye':10,'Jalen Hurts':9,'Joe Burrow':5,
  'Jaxson Dart':5,'Patrick Mahomes':3,'Bo Nix':4,
  'Jahmyr Gibbs':57,'Bijan Robinson':56,'Christian McCaffrey':53,'Jonathan Taylor':52,
  "De'Von Achane":50,'James Cook III':46,'Ashton Jeanty':45,'Saquon Barkley':37,
  'Derrick Henry':36,'Chase Brown':35,'Omarion Hampton':33,'Breece Hall':32,
  'Josh Jacobs':27,'Javonte Williams':26,'Kyren Williams':21,'Quinshon Judkins':21,
  'Cam Skattebo':20,'Jeremiyah Love':42,'Bhayshul Tuten':9,'Jacory Croskey-Merritt':2,
  "Ja'Marr Chase":56,'Puka Nacua':55,'Jaxon Smith-Njigba':54,'Amon-Ra St. Brown':52,
  'CeeDee Lamb':51,'Justin Jefferson':48,'Drake London':43,'Rashee Rice':40,
  'Garrett Wilson':30,'Nico Collins':31,'A.J. Brown':29,'Malik Nabers':28,
  'George Pickens':25,'Tetairoa McMillan':24,'Zay Flowers':23,'Emeka Egbuka':19,
  'Terry McLaurin':17,'DJ Moore':11,'Luther Burden III':11,'Brian Thomas Jr.':4,'DK Metcalf':6,
  'Trey McBride':38,'Brock Bowers':32,'Colston Loveland':13,'Tyler Warren':13,
  'Sam LaPorta':6,'Harold Fannin Jr.':6,'Travis Kelce':2,'Mark Andrews':2,'George Kittle':2,
}

const TARGETS = {
  'Ashton Jeanty':     { slot:'RB1', maxBid:72, why:'Bell cow LV, year-2 ×1.35 — biggest market gap on board' },
  'Omarion Hampton':   { slot:'RB2', maxBid:58, why:'Year-2 ×1.30, McDaniel system, market way behind at $33' },
  'Cam Skattebo':      { slot:'RB2', maxBid:50, why:'Model $63 vs ESPN $20 — single biggest gap, NYG = low appeal' },
  "De'Von Achane":     { slot:'RB2', maxBid:44, why:'Alpha of MIA offense, Hafley 40+ touch game plan' },
  'James Cook III':    { slot:'RB3', maxBid:44, why:'Reigning rushing champ, Brady expanding receiving role' },
  'Derrick Henry':     { slot:'RB3', maxBid:38, why:'Workhorse BAL — if room sleeps below $38' },
  'Bhayshul Tuten':    { slot:'RB3', maxBid:35, why:'Year-2 ×1.08 + new Coen scheme JAX, invisible to room' },
  'Quinshon Judkins':  { slot:'RB3', maxBid:30, why:'Run-heavy CLE, Monken scheme, model +$12 over ESPN' },
  'Jacory Croskey-Merritt': { slot:'RB4', maxBid:20, why:'Blough tree (Johnson+OConnell), year-2, WAS receiving role' },
  'Jadarian Price':    { slot:'RB4', maxBid:10, why:'Charbonnet PUP, path to SEA RB1 early season' },
  'Emeka Egbuka':      { slot:'WR1', maxBid:30, why:'Year-2 ×1.25, Evans gone from TB, ESPN $19 vs model $41' },
  'DJ Moore':          { slot:'WR1', maxBid:28, why:'Model $37 vs ESPN $11 — biggest WR market gap, BUF play action' },
  'Terry McLaurin':    { slot:'WR2', maxBid:22, why:'Blough tree benefits WAS volume, model +$19 over ESPN' },
  'Zay Flowers':       { slot:'WR2', maxBid:22, why:'New BAL motion system, manufactured touches — even with ESPN' },
  'Brian Thomas Jr.':  { slot:'WR2', maxBid:20, why:'Model $37 vs ESPN $4 — massive gap, Lawrence connection' },
  'Sam LaPorta':       { slot:'TE',  maxBid:8,  why:'DET offense elite, if room sleeps — ESPN only $6' },
  'Pat Freiermuth':    { slot:'TE',  maxBid:3,  why:'Punt TE — McCarthy system upside at minimum bid' },
  'Jalen Hurts':       { slot:'QB',  maxBid:1,  why:'Punt QB — any $1 starter works' },
}

const FADES = {
  'Jahmyr Gibbs':      { why:'ESPN $57 vs model $45 — nominate early, let room bleed' },
  'Bijan Robinson':    { why:'ESPN $56 vs model $39 — new OC uncertainty, walk above $45' },
  "Ja'Marr Chase":     { why:'ESPN $56 vs model $54 — walk above $50, nominate to drain budgets' },
  'Jonathan Taylor':   { why:'ESPN $52 vs model $26 — injury history, IND offense overhyped' },
  'Amon-Ra St. Brown': { why:'ESPN $52 vs model $34 — new OC uncertainty DET, walk above $40' },
  'CeeDee Lamb':       { why:'ESPN $51 vs model $43 — DAL QB uncertainty, walk above $45' },
  'Christian McCaffrey': { why:'ESPN $53 — age 30, 400+ touch hangover, history brutal at this spot' },
  'Trey McBride':      { why:'ESPN $38 vs model $19 — punting TE, nominate to drain TE buyers' },
}

const NOMINATE_EARLY = ['Jahmyr Gibbs','Bijan Robinson',"Ja'Marr Chase",'Jonathan Taylor','Trey McBride','CeeDee Lamb','Amon-Ra St. Brown','Christian McCaffrey']

const BUDGET_PLAN = [
  { slot:'RB1',   min:55, max:72, color:'bg-blue-500',    desc:'Jeanty only — walk above $72' },
  { slot:'RB2',   min:40, max:58, color:'bg-blue-400',    desc:'Hampton, Skattebo, or Achane' },
  { slot:'RB3',   min:25, max:44, color:'bg-blue-300',    desc:'Cook, Henry, Tuten, Judkins' },
  { slot:'RB4',   min:5,  max:20, color:'bg-blue-200',    desc:'JCM, Price, value plays' },
  { slot:'WR1',   min:20, max:30, color:'bg-emerald-500', desc:'Skip top 3, buy WR5–15' },
  { slot:'WR2',   min:12, max:22, color:'bg-emerald-400', desc:'Flowers, McLaurin, Thomas Jr.' },
  { slot:'TE',    min:1,  max:8,  color:'bg-amber-500',   desc:'Punt — Freiermuth or LaPorta' },
  { slot:'QB',    min:1,  max:1,  color:'bg-purple-500',  desc:'Punt — any $1 starter' },
  { slot:'K+DST', min:2,  max:2,  color:'bg-slate-600',   desc:'$1 each, always' },
]

function useProjections() {
  return useMemo(() => {
    const fullPool = {QB:[],RB:[],WR:[],TE:[]}
    const d1Pool   = {QB:[],RB:[],WR:[],TE:[]}
    const expMults = experienceData.year2_leaps || {}

    rostersData.players
      .filter(p => ['QB','RB','WR','TE'].includes(p.position) && p.depth_rank <= 2)
      .forEach(p => {
        const team = teamMap[p.team] || {}
        const raw  = projectPlayer(p, team, DEFAULT_SCORING)
        const proj = applyExperience(p.player_name, raw)
        if (proj.ppr < 50) return
        const entry = {
          name: p.player_name, team: p.team, pos: p.position,
          ppr: Math.round(proj.ppr), depth: p.depth_rank,
          mult: expMults[p.player_name] || 1.0,
          newCaller: team.newCaller || false,
          injury: INJURY_MAP[p.player_name] || null,
        }
        fullPool[p.position].push(entry)
        if (p.depth_rank === 1) d1Pool[p.position].push({...entry})
      })

    const REP = {QB:13,RB:36,WR:36,TE:13}
    const repPPR = {}
    Object.entries(fullPool).forEach(([pos,players]) => {
      players.sort((a,b)=>b.ppr-a.ppr)
      repPPR[pos] = players[Math.min(REP[pos]-1,players.length-1)]?.ppr||150
    })

    const WEIGHTS = {QB:0.06,RB:0.42,WR:0.44,TE:0.08}
    const spendable = 188
    const posVOR = {QB:0,RB:0,WR:0,TE:0}
    Object.entries(d1Pool).forEach(([pos,players]) => {
      players.forEach(p => { p.vor = Math.max(0,p.ppr-repPPR[pos]); posVOR[pos]+=p.vor })
    })
    Object.entries(d1Pool).forEach(([pos,players]) => {
      const budget = spendable*WEIGHTS[pos]
      players.forEach(p => {
        p.av = p.vor>0 ? Math.max(1,Math.round((p.vor/posVOR[pos])*budget*12)) : 1
        p.espn = ESPN[p.name]??null
        p.gap = p.espn!==null ? p.av-p.espn : null
        p.target = TARGETS[p.name]||null
        p.fade = FADES[p.name]||null
        p.nominate = NOMINATE_EARLY.includes(p.name)
      })
      players.sort((a,b)=>b.av-a.av)
    })
    return d1Pool
  }, [])
}

export default function CheatSheet() {
  const pools = useProjections()
  const [showWhy, setShowWhy] = useState(true)
  const [posFilter, setPosFilter] = useState('ALL')
  const [viewFilter, setViewFilter] = useState('ALL')

  const allPlayers = useMemo(()=>{
    return Object.values(pools).flat().sort((a,b)=>b.av-a.av)
  },[pools])

  const filtered = useMemo(()=>{
    let rows = posFilter==='ALL' ? allPlayers : allPlayers.filter(p=>p.pos===posFilter)
    if (viewFilter==='TARGETS') rows=rows.filter(p=>p.target)
    if (viewFilter==='FADES') rows=rows.filter(p=>p.fade)
    return rows
  },[allPlayers,posFilter,viewFilter])

  const targets = allPlayers.filter(p=>p.target)
  const fades = allPlayers.filter(p=>p.fade)
  const maxSpend = targets.reduce((a,p)=>a+(p.target?.maxBid||0),0)

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Target className="text-emerald-400" size={22}/>
          <h1 className="text-2xl font-bold">My Auction Cheat Sheet</h1>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded ml-1">12-team PPR · $200</span>
        </div>
        <p className="text-slate-400 text-sm">Personal targets, max bids, and fades — driven by model vs ESPN market gaps.</p>
      </div>

      {/* Budget Blueprint */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <DollarSign size={12} className="text-emerald-400"/> Budget Blueprint
          </h2>
          <div className="text-xs text-slate-500">
            Max target spend: <span className="text-emerald-400 font-bold">${maxSpend}</span>
            <span className="text-slate-600 ml-1">/ $200</span>
          </div>
        </div>
        <div className="space-y-2">
          {BUDGET_PLAN.map(slot=>(
            <div key={slot.slot} className="flex items-center gap-3">
              <div className="w-14 text-xs font-bold text-slate-400 flex-shrink-0 text-right">{slot.slot}</div>
              <div className="flex-1 relative h-7 bg-slate-800 rounded overflow-hidden">
                <div className={`absolute left-0 top-0 h-full ${slot.color} opacity-60 rounded transition-all`}
                     style={{width:`${(slot.max/72)*100}%`}}/>
                <div className="absolute inset-0 flex items-center px-3 gap-3">
                  <span className="text-xs font-bold text-white">${slot.min}–${slot.max}</span>
                  <span className="text-xs text-slate-400">{slot.desc}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Year-2 edge strip */}
      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 mb-5">
        <div className="text-xs font-bold text-yellow-400 uppercase tracking-wide mb-2">⚡ Year-2 Leapers — Your Biggest Market Edges</div>
        <div className="flex flex-wrap gap-2">
          {allPlayers.filter(p=>p.mult>1&&p.target).map(p=>(
            <div key={p.name} className="flex items-center gap-2 bg-slate-900/80 border border-yellow-500/20 rounded-lg px-3 py-1.5 text-xs">
              <span className="font-bold text-white">{p.name.split(' ').slice(-1)[0]}</span>
              <span className="text-yellow-400">×{p.mult}</span>
              <span className="text-emerald-400 font-bold">${p.av}</span>
              {p.espn!==null&&<span className="text-slate-500">ESPN ${p.espn}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex gap-1">
          {['ALL','QB','RB','WR','TE'].map(p=>(
            <button key={p} onClick={()=>setPosFilter(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                posFilter===p?'bg-emerald-500 border-emerald-500 text-white':'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
              }`}>{p}</button>
          ))}
        </div>
        <div className="w-px h-5 bg-slate-700"/>
        {[['ALL','All'],['TARGETS','🎯 Targets'],['FADES','🚫 Fades']].map(([v,l])=>(
          <button key={v} onClick={()=>setViewFilter(v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              viewFilter===v?'bg-slate-700 border-slate-600 text-white':'border-slate-700 text-slate-400 hover:text-white'
            }`}>{l}</button>
        ))}
        <button onClick={()=>setShowWhy(w=>!w)}
          className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
          {showWhy?<ChevronUp size={12}/>:<ChevronDown size={12}/>}
          {showWhy?'Hide':'Show'} reasoning
        </button>
        <span className="text-xs text-slate-600">{filtered.length} players</span>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60 border-b border-slate-700">
            <tr>
              <th className="px-3 py-3 w-8"/>
              <th className="px-3 py-3 text-left text-xs text-slate-400 font-medium uppercase tracking-wide">Player</th>
              <th className="px-3 py-3 text-center text-xs text-slate-400 font-medium uppercase tracking-wide">Slot</th>
              <th className="px-3 py-3 text-right text-xs text-slate-400 font-medium uppercase tracking-wide">PPR</th>
              <th className="px-3 py-3 text-right text-xs text-slate-400 font-medium uppercase tracking-wide">Model $</th>
              <th className="px-3 py-3 text-right text-xs text-slate-400 font-medium uppercase tracking-wide">ESPN $</th>
              <th className="px-3 py-3 text-right text-xs text-slate-400 font-medium uppercase tracking-wide">Edge</th>
              <th className="px-3 py-3 text-center text-xs text-slate-400 font-medium uppercase tracking-wide">Max Bid</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p=>{
              const isTarget=!!p.target; const isFade=!!p.fade
              const inj=p.injury
              const gap=p.gap
              return (
                <tr key={`${p.pos}-${p.name}`}
                  className={`border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors ${
                    isFade?'bg-red-500/[0.03]':isTarget?'bg-emerald-500/[0.03]':''
                  }`}>
                  <td className="px-3 py-2.5 text-center">
                    {isFade?'🚫':isTarget?'🎯':'·'}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`font-semibold ${isTarget?'text-white':isFade?'text-slate-400':'text-slate-300'}`}>{p.name}</span>
                      <span className="text-xs text-slate-600">{p.team}</span>
                      {p.mult>1&&<span className="text-xs px-1 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Y2×{p.mult}</span>}
                      {p.newCaller&&<span className="text-xs px-1 rounded bg-blue-500/20 text-blue-400">NC</span>}
                      {inj&&<span className={`text-xs px-1.5 rounded border font-bold ${
                        inj.status==='PUP'||inj.status==='OUT'?'bg-red-500/20 text-red-300 border-red-500/30':'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>{inj.status}</span>}
                      {p.nominate&&<span className="text-xs px-1 rounded bg-red-500/20 text-red-400 border border-red-500/30">Nominate</span>}
                    </div>
                    {showWhy&&(p.target?.why||p.fade?.why)&&(
                      <div className="text-xs text-slate-500 mt-0.5 italic">{p.target?.why||p.fade?.why}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {p.target?<span className="text-xs font-bold text-emerald-400">{p.target.slot}</span>:'—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-300">{p.ppr}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`font-bold ${isTarget?'text-emerald-400':isFade?'text-red-400':'text-slate-300'}`}>${p.av}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-400">{p.espn!==null?`$${p.espn}`:'—'}</td>
                  <td className="px-3 py-2.5 text-right">
                    {gap===null?<span className="text-slate-600 text-xs">—</span>
                      :gap>10?<span className="text-xs font-bold text-emerald-400">+${gap}</span>
                      :gap<-10?<span className="text-xs font-bold text-red-400">-${Math.abs(gap)}</span>
                      :<span className="text-xs text-slate-500">~even</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {p.target?<span className="text-xs font-black text-white bg-emerald-600/30 border border-emerald-600/50 px-2 py-1 rounded">≤${p.target.maxBid}</span>
                      :isFade?<span className="text-xs text-red-400 font-bold">PASS</span>
                      :'—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Nominate early */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
        <div className="text-xs font-bold text-red-400 uppercase tracking-wide mb-3">
          🎪 Nominate These Early — Drain Budgets While You Sit On Your Hands
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {fades.filter(p=>p.nominate).map(p=>(
            <div key={p.name} className="flex items-center gap-2 bg-slate-900/60 rounded px-3 py-2 text-xs">
              <span className="text-slate-200 font-bold w-36 flex-shrink-0">{p.name}</span>
              <span className="text-slate-500 flex-1">{p.fade.why}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 text-xs text-slate-700 text-center">
        NFL Tendency Engine · ESPN prices Aug 19, 2026 · 12-team $200 adjusted from ESPN 10-team
      </div>
    </div>
  )
}
