import React, { useState } from 'react'
import { DollarSign, ChevronDown, ChevronUp, Target, AlertTriangle } from 'lucide-react'

// ─── YOUR DRAFT PLAN ────────────────────────────────────────────────────────
// Edit max bids here. You pick ONE player per slot on draft night.
const DRAFT_PLAN = [
  {
    slot: 'RB1', pos: 'RB', budget: { min: 55, max: 72 }, color: 'blue-500',
    note: 'Jeanty is the only true $70+ guy. Walk away above your max.',
    players: [
      { name: 'Ashton Jeanty',   team:'LV',  ppr:508, modelAV:75, espn:45, maxBid:72, why:'Bell cow, year-2 ×1.35 — room anchors on $45, you can go to $72' },
    ]
  },
  {
    slot: 'RB2', pos: 'RB', budget: { min: 40, max: 58 }, color: 'blue-400',
    note: 'Year-2 leapers the market is sleeping on. Pick one anchor.',
    players: [
      { name: 'Omarion Hampton',  team:'LAC', ppr:462, modelAV:60, espn:33, maxBid:58, why:'Year-2 ×1.30, McDaniel system — market $33, model $60' },
      { name: 'Cam Skattebo',     team:'NYG', ppr:438, modelAV:52, espn:20, maxBid:50, why:'Biggest gap on board — ESPN $20 vs model $52, NYG = no market love' },
      { name: "De'Von Achane",    team:'MIA', ppr:353, modelAV:45, espn:50, maxBid:44, why:'Alpha MIA, 40+ touch game plan — walk above $44 (Willis caps ceiling)' },
      { name: 'James Cook III',   team:'BUF', ppr:362, modelAV:42, espn:46, maxBid:44, why:'Reigning rushing champ — ESPN price is fair, buy at or below' },
    ]
  },
  {
    slot: 'RB3 / FLEX1', pos: 'RB', budget: { min: 20, max: 38 }, color: 'blue-300',
    note: 'Deep value tier — patience here. Room overpays on names, you grab the production.',
    players: [
      { name: 'Derrick Henry',    team:'BAL', ppr:371, modelAV:44, espn:36, maxBid:38, why:'True workhorse 76% share — never a bad deal at market' },
      { name: 'Jahmyr Gibbs',     team:'DET', ppr:362, modelAV:44, espn:57, maxBid:38, why:'Bell cow DET (Montgomery gone) — ESPN $57 is the trap, buy at $38' },
      { name: 'Quinshon Judkins', team:'CLE', ppr:367, modelAV:41, espn:21, maxBid:32, why:'Run-heavy CLE Monken scheme — room sleeping at $21, huge edge' },
      { name: 'Chase Brown',      team:'CIN', ppr:358, modelAV:39, espn:35, maxBid:34, why:'Featured CIN back — model/ESPN roughly even, fair at market' },
      { name: 'Bhayshul Tuten',   team:'JAX', ppr:402, modelAV:38, espn:9,  maxBid:28, why:'Year-2 ×1.08 + new Coen scheme — room has no idea at $9' },
      { name: 'Josh Jacobs',      team:'GB',  ppr:351, modelAV:30, espn:27, maxBid:28, why:'Steady GB workhorse — model slight edge, reliable floor' },
      { name: 'Breece Hall',      team:'NYJ', ppr:347, modelAV:30, espn:32, maxBid:28, why:'Featured NYJ back — model even with ESPN, buy at right price' },
      { name: 'Jaylen Warren',    team:'PIT', ppr:340, modelAV:20, espn:5,  maxBid:18, why:'PIT lead back with Harris gone — room sleeping at $5, steal' },
    ]
  },
  {
    slot: 'RB4 / FLEX2', pos: 'RB', budget: { min: 5, max: 20 }, color: 'blue-200',
    note: 'Upside lotto tickets and handcuffs. Cheap dart throws.',
    players: [
      { name: 'Jacory Croskey-Merritt', team:'WAS', ppr:391, modelAV:22, espn:2,  maxBid:20, why:'Blough tree (Johnson+OConnell) + year-2 — room at $2, model loves him' },
      { name: 'Saquon Barkley',  team:'PHI', ppr:347, modelAV:22, espn:37, maxBid:22, why:'NC, PHI featured — buy only if room sleeps way below ESPN price' },
      { name: 'Jadarian Price',  team:'SEA', ppr:306, modelAV:8,  espn:8,  maxBid:10, why:'Charbonnet PUP, path to RB1 — $10 lotto ticket' },
    ]
  },
  {
    slot: 'WR1', pos: 'WR', budget: { min: 20, max: 30 }, color: 'emerald-500',
    note: 'Skip top 3 (Chase/Nacua/Jefferson go $45-65). Start shopping at WR5+.',
    players: [
      { name: 'Emeka Egbuka',    team:'TB',  ppr:307, modelAV:35, espn:19, maxBid:30, why:'Year-2 ×1.25, Evans gone — ESPN $19 vs model $35, clear edge' },
      { name: 'DJ Moore',        team:'BUF', ppr:299, modelAV:33, espn:11, maxBid:28, why:'Biggest WR gap — ESPN $11 vs model $33, BUF play action' },
      { name: 'Garrett Wilson',  team:'NYJ', ppr:304, modelAV:32, espn:30, maxBid:26, why:'NC, featured NYJ WR — model slight edge over market' },
      { name: 'Nico Collins',    team:'HOU', ppr:302, modelAV:31, espn:31, maxBid:26, why:'Stroud top target — model/ESPN even, reliable WR1 production' },
    ]
  },
  {
    slot: 'WR2', pos: 'WR', budget: { min: 12, max: 22 }, color: 'emerald-400',
    note: 'Deep value layer — many names here will go cheap.',
    players: [
      { name: 'Terry McLaurin',  team:'WAS', ppr:297, modelAV:28, espn:17, maxBid:22, why:'Blough tree (Johnson+OConnell) boosts WAS targets — model +$11 over ESPN' },
      { name: 'Zay Flowers',     team:'BAL', ppr:279, modelAV:26, espn:23, maxBid:22, why:'New BAL motion system — model even with ESPN, new play caller upside' },
      { name: 'Brian Thomas Jr.',team:'JAX', ppr:299, modelAV:33, espn:4,  maxBid:20, why:'Model $33 vs ESPN $4 — massive gap, Lawrence connection is real' },
      { name: 'Malik Nabers',    team:'NYG', ppr:299, modelAV:33, espn:28, maxBid:20, why:'NC, model slight edge — Q flag, buy if healthy' },
      { name: 'Ladd McConkey',   team:'LAC', ppr:301, modelAV:33, espn:null,maxBid:18, why:'NC, Hampton offense creates play action — model likes him' },
    ]
  },
  {
    slot: 'TE', pos: 'TE', budget: { min: 1, max: 8 }, color: 'amber-500',
    note: 'Punting TE. Freiermuth at $1. Only upgrade if LaPorta falls cheap.',
    players: [
      { name: 'Sam LaPorta',     team:'DET', ppr:299, modelAV:25, espn:6,  maxBid:8,  why:'DET elite offense — ESPN only $6, grab if room sleeps' },
      { name: 'Pat Freiermuth',  team:'PIT', ppr:236, modelAV:1,  espn:null,maxBid:3,  why:'Punt TE — McCarthy system upside at minimum bid' },
    ]
  },
  {
    slot: 'QB', pos: 'QB', budget: { min: 1, max: 1 }, color: 'purple-500',
    note: 'Hard punt. Any $1 QB works. Never pay more.',
    players: [
      { name: 'Jalen Hurts',     team:'PHI', ppr:429, modelAV:11, espn:9,  maxBid:1,  why:'Punt QB — take any starter at $1' },
      { name: 'Cam Ward',        team:'TEN', ppr:368, modelAV:1,  espn:0,  maxBid:1,  why:'Year-2 candidate at $1 — free upside' },
    ]
  },
]

// Fade/nominate list
const FADES = [
  { name: 'Bijan Robinson',     espn:56, why:'New ATL OC uncertainty — ESPN anchored on old role' },
  { name: "Ja'Marr Chase",      espn:56, why:'Elite player, wrong price — walk above $50' },
  { name: 'Jonathan Taylor',    espn:52, why:'Injury history + IND offense — model only $26' },
  { name: 'Amon-Ra St. Brown',  espn:52, why:'New DET OC uncertainty — walk above $40' },
  { name: 'CeeDee Lamb',        espn:51, why:'DAL QB uncertainty — walk above $45' },
  { name: 'Christian McCaffrey',espn:53, why:'Age 30, 400+ touch hangover — history brutal at this spot' },
  { name: 'Trey McBride',       espn:38, why:'Punting TE — nominate to drain TE buyers' },
  { name: 'Puka Nacua',         espn:55, why:'Model actually likes him — let room bid first, buy if it stalls' },
]

const NOMINATE = ["Ja'Marr Chase",'Bijan Robinson','Jonathan Taylor','Christian McCaffrey','Trey McBride','CeeDee Lamb']

const POS_COLORS = { RB:'bg-blue-500/20 text-blue-300 border-blue-500/30', WR:'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', TE:'bg-amber-500/20 text-amber-300 border-amber-500/30', QB:'bg-purple-500/20 text-purple-300 border-purple-500/30' }

function GapBadge({ model, espn }) {
  if (!espn) return null
  const gap = model - espn
  if (gap > 10) return <span className="text-xs font-bold text-emerald-400 ml-1">+${gap} edge</span>
  if (gap < -8)  return <span className="text-xs font-bold text-red-400 ml-1">-${Math.abs(gap)} overpay</span>
  return <span className="text-xs text-slate-500 ml-1">~even</span>
}

function SlotSection({ slot, expanded, onToggle }) {
  const totalBudget = slot.budget.min + '-' + slot.budget.max
  const colorBg = `bg-${slot.color}`

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Slot header */}
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-800/40 transition-colors">
        <div className={`w-2 h-10 rounded-full ${colorBg} opacity-80 flex-shrink-0`}/>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-3">
            <span className="font-black text-white text-base">{slot.slot}</span>
            <span className="text-xs font-bold text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full">{slot.pos}</span>
            <span className="text-xs text-slate-400">Budget: <span className="text-white font-bold">${totalBudget}</span></span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{slot.note}</div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-slate-500">{slot.players.length} options</span>
          {expanded ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
        </div>
      </button>

      {/* Players */}
      {expanded && (
        <div className="border-t border-slate-800">
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 px-5 py-2 bg-slate-800/30 text-xs text-slate-500 font-medium uppercase tracking-wide">
            <div className="col-span-4">Player</div>
            <div className="col-span-1 text-right">PPR</div>
            <div className="col-span-2 text-right">Model $</div>
            <div className="col-span-2 text-right">ESPN $</div>
            <div className="col-span-1 text-center">Edge</div>
            <div className="col-span-2 text-center">Max Bid</div>
          </div>

          {slot.players.map((p, i) => (
            <div key={p.name} className={`grid grid-cols-12 gap-2 px-5 py-3 border-t border-slate-800/50 hover:bg-slate-800/20 transition-colors ${i === 0 ? 'bg-emerald-500/[0.02]' : ''}`}>
              {/* Player name */}
              <div className="col-span-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {i === 0 && <span className="text-xs text-emerald-400">★</span>}
                  <span className="font-semibold text-white text-sm">{p.name}</span>
                  <span className="text-xs text-slate-500">{p.team}</span>
                </div>
                <div className="text-xs text-slate-500 italic mt-0.5 leading-tight">{p.why}</div>
              </div>

              {/* PPR */}
              <div className="col-span-1 text-right font-mono text-slate-300 text-sm self-start pt-0.5">{p.ppr}</div>

              {/* Model $ */}
              <div className="col-span-2 text-right self-start pt-0.5">
                <span className="font-bold text-emerald-400">${p.modelAV}</span>
              </div>

              {/* ESPN $ */}
              <div className="col-span-2 text-right self-start pt-0.5">
                <span className="text-slate-400">{p.espn ? `$${p.espn}` : '—'}</span>
              </div>

              {/* Edge */}
              <div className="col-span-1 text-center self-start pt-0.5">
                <GapBadge model={p.modelAV} espn={p.espn} />
              </div>

              {/* Max bid */}
              <div className="col-span-2 text-center self-start">
                <span className={`inline-block font-black text-sm px-3 py-1 rounded-lg border ${
                  p.maxBid >= 50 ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' :
                  p.maxBid >= 30 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' :
                  p.maxBid >= 15 ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' :
                  'bg-slate-700/50 border-slate-600 text-slate-300'
                }`}>≤${p.maxBid}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CheatSheet() {
  const [expanded, setExpanded] = useState(
    Object.fromEntries(DRAFT_PLAN.map(s => [s.slot, true]))
  )
  const [showFades, setShowFades] = useState(true)

  const toggle = (slot) => setExpanded(e => ({...e, [slot]: !e[slot]}))

  const totalMin = DRAFT_PLAN.reduce((a,s) => a+s.budget.min, 0) + 2 // +2 for K+DST
  const totalMax = DRAFT_PLAN.reduce((a,s) => a+s.budget.max, 0) + 2

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Target className="text-emerald-400" size={22}/>
          <h1 className="text-2xl font-bold">My Auction Draft Plan</h1>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded ml-1">12-team PPR · $200 budget</span>
        </div>
        <p className="text-slate-400 text-sm">Pick <span className="text-white font-semibold">one player per slot</span> on draft night. Max bid is your walk-away price — don't chase above it.</p>
      </div>

      {/* Budget summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-white">${totalMin}–${totalMax}</div>
          <div className="text-xs text-slate-400 mt-1">Target spend range</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-emerald-400">${200 - totalMax}–${200 - totalMin}</div>
          <div className="text-xs text-slate-400 mt-1">Buffer remaining</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-blue-400">RB-Heavy</div>
          <div className="text-xs text-slate-400 mt-1">~$150–170 on 4 RBs</div>
        </div>
      </div>

      {/* Slot sections */}
      <div className="space-y-3 mb-6">
        {DRAFT_PLAN.map(slot => (
          <SlotSection
            key={slot.slot}
            slot={slot}
            expanded={expanded[slot.slot]}
            onToggle={() => toggle(slot.slot)}
          />
        ))}

        {/* K + DST — always collapsed, always $1 each */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 flex items-center gap-3">
          <div className="w-2 h-8 rounded-full bg-slate-600 flex-shrink-0"/>
          <div className="flex-1">
            <span className="font-black text-white">K + DST</span>
            <span className="text-xs text-slate-500 ml-3">$1 each · Always punt · Never pay more</span>
          </div>
          <span className="font-black text-slate-300 text-sm px-3 py-1 rounded-lg border border-slate-700 bg-slate-800">≤$1 each</span>
        </div>
      </div>

      {/* Fade / Nominate section */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl overflow-hidden">
        <button onClick={() => setShowFades(f => !f)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-red-500/5 transition-colors">
          <div>
            <span className="font-bold text-red-400">🎪 Nominate These — Drain Opponent Budgets</span>
            <span className="text-xs text-slate-500 ml-3">Throw these out early while budgets are hot</span>
          </div>
          {showFades ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
        </button>

        {showFades && (
          <div className="border-t border-red-500/20">
            {FADES.map(p => (
              <div key={p.name} className="flex items-center gap-3 px-5 py-2.5 border-b border-red-500/10 last:border-0 hover:bg-red-500/5">
                <span className={`text-sm font-semibold ${NOMINATE.includes(p.name) ? 'text-red-300' : 'text-slate-300'}`}>
                  {NOMINATE.includes(p.name) ? '🔴' : '🟡'} {p.name}
                </span>
                <span className="text-xs text-slate-500 flex-1">{p.why}</span>
                <span className="text-xs font-bold text-red-400 flex-shrink-0">ESPN ${p.espn}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-slate-700 text-center">
        NFL Tendency Engine · ESPN prices Aug 19, 2026 · ★ = top pick for that slot
      </div>
    </div>
  )
}
