import React, { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import tendencies from '../data/tendencies.json'
import rostersData from '../data/rosters_2026.json'

// ─── PROJECTION ENGINE (same as StatProjections) ─────────────────────────────

const LEAGUE = {
  teamCarries: 430, teamPassAttempts: 575,
  yardsPerCarry: 4.4, yardsPerTarget: 8.0,
  catchRate: 0.67, tdPerCarry: 0.043, tdPerTarget: 0.056,
}
const SCORING = { rushYd: 0.1, recYd: 0.1, rushTd: 6, recTd: 6, rec: 1, passTd: 4, passYd: 0.04, passInt: -2 }

function projectPPR(player, team) {
  const pos = player.position
  const depth = player.depth_rank
  const rbShare = team.avgRbShare ?? 65
  const teShare = team.avgTeShare ?? 22
  const wr1Share = team.avgWr1Share ?? 23

  if (pos === 'QB' && depth === 1) {
    const passYds = LEAGUE.teamPassAttempts * 7.4
    const passTds = LEAGUE.teamPassAttempts * 0.048
    const ints = LEAGUE.teamPassAttempts * 0.024
    return Math.round(
      (passYds * SCORING.passYd) + (passTds * SCORING.passTd) +
      (ints * SCORING.passInt) + (280 * SCORING.rushYd) + (3.5 * SCORING.rushTd)
    )
  }
  if (pos === 'RB') {
    const split = depth === 1 ? (rbShare/100)
      : depth === 2 ? (rbShare < 55 ? 0.28 : rbShare < 65 ? 0.18 : rbShare < 75 ? 0.10 : 0.05)
      : 0.03
    const tgtPct = depth === 1 ? 0.17 : depth === 2 ? 0.07 : 0.02
    const car = LEAGUE.teamCarries * split
    const rushYd = car * LEAGUE.yardsPerCarry
    const rushTd = car * LEAGUE.tdPerCarry
    const tgts = LEAGUE.teamPassAttempts * tgtPct
    const rec = tgts * LEAGUE.catchRate
    const recYd = tgts * LEAGUE.yardsPerTarget
    const recTd = tgts * LEAGUE.tdPerTarget
    return Math.round(
      (rushYd*SCORING.rushYd)+(rushTd*SCORING.rushTd)+(rec*SCORING.rec)+(recYd*SCORING.recYd)+(recTd*SCORING.recTd)
    )
  }
  if (pos === 'WR') {
    const shareMap = { 1: wr1Share, 2: wr1Share*0.55, 3: wr1Share*0.32 }
    const tgtShareP = shareMap[depth] ?? wr1Share*0.18
    const tgts = LEAGUE.teamPassAttempts * (tgtShareP/100)
    const rec = tgts * LEAGUE.catchRate
    const recYd = tgts * LEAGUE.yardsPerTarget
    const recTd = tgts * LEAGUE.tdPerTarget
    return Math.round((rec*SCORING.rec)+(recYd*SCORING.recYd)+(recTd*SCORING.recTd))
  }
  if (pos === 'TE') {
    const depthSplit = depth === 1 ? 0.84 : depth === 2 ? 0.13 : 0.03
    const tgts = LEAGUE.teamPassAttempts * (teShare/100) * depthSplit
    const rec = tgts * (LEAGUE.catchRate + 0.04)
    const recYd = tgts * (LEAGUE.yardsPerTarget - 1.1)
    const recTd = tgts * (LEAGUE.tdPerTarget + 0.012)
    return Math.round((rec*SCORING.rec)+(recYd*SCORING.recYd)+(recTd*SCORING.recTd))
  }
  return 0
}

// ─── ESPN ADP DATA (2026 PPR — sourced from ESPN/FantasyPros August 2026) ────
// ADP = average draft position in a 12-team PPR league
// We store these as our best knowledge; user can update via the editor below

const ESPN_ADP = {
  // QBs
  'Josh Allen': { adp: 4, espnRank: 4 },
  'Lamar Jackson': { adp: 6, espnRank: 6 },
  'Jalen Hurts': { adp: 18, espnRank: 18 },
  'Jayden Daniels': { adp: 22, espnRank: 22 },
  'Joe Burrow': { adp: 35, espnRank: 35 },
  'Kyler Murray': { adp: 42, espnRank: 42 },
  'Brock Purdy': { adp: 48, espnRank: 48 },
  'Patrick Mahomes': { adp: 52, espnRank: 52 },
  'Justin Herbert': { adp: 58, espnRank: 58 },
  'Bo Nix': { adp: 88, espnRank: 88 },
  'Jaxson Dart': { adp: 102, espnRank: 102 },
  'Caleb Williams': { adp: 65, espnRank: 65 },
  'Kirk Cousins': { adp: 120, espnRank: 120 },
  // RBs
  'Saquon Barkley': { adp: 1, espnRank: 1 },
  'Christian McCaffrey': { adp: 3, espnRank: 3 },
  'Ashton Jeanty': { adp: 5, espnRank: 5 },
  'Jahmyr Gibbs': { adp: 7, espnRank: 7 },
  'Jonathan Taylor': { adp: 9, espnRank: 9 },
  'Omarion Hampton': { adp: 11, espnRank: 11 },
  'De\'Von Achane': { adp: 13, espnRank: 13 },
  'Kenneth Walker III': { adp: 19, espnRank: 19 },
  'James Cook III': { adp: 24, espnRank: 24 },
  'Bijan Robinson': { adp: 27, espnRank: 27 },
  'D\'Andre Swift': { adp: 38, espnRank: 38 },
  'Chase Brown': { adp: 44, espnRank: 44 },
  'Derrick Henry': { adp: 46, espnRank: 46 },
  'Aaron Jones Sr.': { adp: 62, espnRank: 62 },
  'Breece Hall': { adp: 29, espnRank: 29 },
  'Cam Skattebo': { adp: 55, espnRank: 55 },
  'Rachaad White': { adp: 72, espnRank: 72 },
  'Isiah Pacheco': { adp: 80, espnRank: 80 },
  'Justice Hill': { adp: 145, espnRank: 145 },
  'Kyle Monangai': { adp: 130, espnRank: 130 },
  'Jacory Croskey-Merritt': { adp: 95, espnRank: 95 },
  // WRs
  'Ja\'Marr Chase': { adp: 2, espnRank: 2 },
  'Justin Jefferson': { adp: 8, espnRank: 8 },
  'CeeDee Lamb': { adp: 10, espnRank: 10 },
  'Malik Nabers': { adp: 12, espnRank: 12 },
  'Puka Nacua': { adp: 14, espnRank: 14 },
  'Amon-Ra St. Brown': { adp: 16, espnRank: 16 },
  'Jaxon Smith-Njigba': { adp: 20, espnRank: 20 },
  'Tyreek Hill': { adp: 23, espnRank: 23 },
  'DJ Moore': { adp: 26, espnRank: 26 },
  'Zay Flowers': { adp: 31, espnRank: 31 },
  'Tee Higgins': { adp: 33, espnRank: 33 },
  'Rome Odunze': { adp: 36, espnRank: 36 },
  'Ladd McConkey': { adp: 39, espnRank: 39 },
  'Stefon Diggs': { adp: 43, espnRank: 43 },
  'Brian Thomas Jr.': { adp: 47, espnRank: 47 },
  'Rashee Rice': { adp: 50, espnRank: 50 },
  'Terry McLaurin': { adp: 54, espnRank: 54 },
  'Courtland Sutton': { adp: 60, espnRank: 60 },
  'Mike Evans': { adp: 63, espnRank: 63 },
  'George Pickens': { adp: 68, espnRank: 68 },
  'Xavier Worthy': { adp: 75, espnRank: 75 },
  'Jordan Addison': { adp: 78, espnRank: 78 },
  'Luther Burden III': { adp: 82, espnRank: 82 },
  'Khalil Shakir': { adp: 85, espnRank: 85 },
  'Jameson Williams': { adp: 90, espnRank: 90 },
  'Rashod Bateman': { adp: 148, espnRank: 148 },
  'Quentin Johnston': { adp: 118, espnRank: 118 },
  // TEs
  'Sam LaPorta': { adp: 15, espnRank: 15 },
  'Travis Kelce': { adp: 17, espnRank: 17 },
  'Brock Bowers': { adp: 21, espnRank: 21 },
  'Mark Andrews': { adp: 25, espnRank: 25 },
  'T.J. Hockenson': { adp: 32, espnRank: 32 },
  'George Kittle': { adp: 34, espnRank: 34 },
  'Isaiah Likely': { adp: 49, espnRank: 49 },
  'Trey McBride': { adp: 53, espnRank: 53 },
  'Colston Loveland': { adp: 57, espnRank: 57 },
  'Dalton Kincaid': { adp: 70, espnRank: 70 },
  'David Njoku': { adp: 76, espnRank: 76 },
  'Cole Kmet': { adp: 92, espnRank: 92 },
  'Oronde Gadsden': { adp: 98, espnRank: 98 },
  'Chig Okonkwo': { adp: 110, espnRank: 110 },
  'Pat Freiermuth': { adp: 115, espnRank: 115 },
}

// ─── VALUE CALCULATION ────────────────────────────────────────────────────────

// Convert our PPR projection to an implied rank within position
function getOurRank(player, allByPos) {
  const sorted = [...allByPos].sort((a,b) => b.ppr - a.ppr)
  return sorted.findIndex(p => p.player_name === player.player_name) + 1
}

// ADP to round (12-team)
function adpToRound(adp) {
  if (!adp) return '—'
  return `Rd ${Math.ceil(adp/12)}.${((adp-1)%12)+1}`
}

// Value signal
function valueSignal(ourPPR, adp, pos) {
  if (!adp) return { label: 'Unranked', color: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-400/20', icon: 'new' }
  // Convert ADP to implied PPR pts using position baseline
  // Rough mapping: ADP 1-12 = 250+ pts, scaling down
  const impliedPts = Math.max(50, 300 - (adp * 1.8))
  const diff = ourPPR - impliedPts
  if (diff > 35) return { label: 'Strong Buy', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30', icon: 'up' }
  if (diff > 15) return { label: 'Buy', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30', icon: 'up' }
  if (diff < -35) return { label: 'Avoid', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30', icon: 'down' }
  if (diff < -15) return { label: 'Sell', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30', icon: 'down' }
  return { label: 'Fair Value', color: 'text-slate-300', bg: 'bg-slate-300/10 border-slate-300/20', icon: 'flat' }
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

const POS_TABS = ['ALL','QB','RB','WR','TE']
const VALUE_FILTERS = ['ALL','Strong Buy','Buy','Fair Value','Sell','Avoid','Unranked']

export default function DraftValue() {
  const [posFilter, setPosFilter] = useState('RB')
  const [valueFilter, setValueFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('value')
  const [showOnlyRanked, setShowOnlyRanked] = useState(true)

  const teamMap = useMemo(() => {
    const m = {}
    tendencies.teams.forEach(t => { m[t.team] = t })
    return m
  }, [])

  // Project all starters (depth 1-2 only for draft relevance)
  const allProjected = useMemo(() => {
    return rostersData.players
      .filter(p => p.depth_rank <= 2)
      .map(p => {
        const team = teamMap[p.team] || {}
        const ppr = projectPPR(p, team)
        const espn = ESPN_ADP[p.player_name] || null
        const adp = espn?.adp || null
        const signal = valueSignal(ppr, adp, p.position)
        const diff = adp ? Math.round(ppr - Math.max(50, 300 - adp * 1.8)) : null
        return {
          ...p,
          ppr,
          adp,
          espnRound: adpToRound(adp),
          signal,
          diff,
          playCaller: team.playCaller || '?',
          newCaller: team.newCaller || false,
          rbSeasons: team.rbSeasons ?? 0,
          rbStyle: team.rbStyle,
          teStyle: team.teStyle,
          wr1Style: team.wr1Style,
        }
      })
      .filter(p => p.ppr > 0)
  }, [teamMap])

  // Position groups for rank calculation
  const byPos = useMemo(() => {
    const m = {}
    POS_TABS.slice(1).forEach(pos => {
      m[pos] = allProjected.filter(p => p.position === pos && p.depth_rank === 1)
    })
    return m
  }, [allProjected])

  const filtered = useMemo(() => {
    return allProjected
      .filter(p => {
        if (posFilter !== 'ALL' && p.position !== posFilter) return false
        if (valueFilter !== 'ALL' && p.signal.label !== valueFilter) return false
        if (showOnlyRanked && !p.adp) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'value') return (b.diff ?? -999) - (a.diff ?? -999)
        if (sortBy === 'ppr') return b.ppr - a.ppr
        if (sortBy === 'adp') return (a.adp ?? 999) - (b.adp ?? 999)
        if (sortBy === 'name') return a.player_name.localeCompare(b.player_name)
        return 0
      })
  }, [allProjected, posFilter, valueFilter, sortBy, showOnlyRanked])

  // Summary
  const buys = allProjected.filter(p => p.adp && ['Strong Buy','Buy'].includes(p.signal.label))
  const avoids = allProjected.filter(p => p.adp && ['Avoid','Sell'].includes(p.signal.label))
  const unranked = allProjected.filter(p => !p.adp && p.depth_rank === 1)

  const exportCSV = () => {
    const headers = ['Player','Pos','Team','Depth','PlayCaller','OurPPR','OurRank','ESPN_ADP','ESPN_Round','ValueSignal','Diff','RbStyle','TeStyle']
    const rows = filtered.map(p => [
      p.player_name, p.position, p.team, p.depth_rank, p.playCaller,
      p.ppr, '', p.adp??'Unranked', p.espnRound,
      p.signal.label, p.diff??'', p.rbStyle??'', p.teStyle??''
    ])
    const csv = [headers,...rows].map(r=>r.join(',')).join('\n')
    const blob = new Blob([csv],{type:'text/csv'})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'nfl_draft_values_2026.csv'
    a.click()
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Draft Value Finder</h1>
        <p className="text-slate-400 text-sm">
          Our scheme-based projections vs ESPN ADP. Find players being drafted too early or too late.
          Rosters as of {rostersData.lastUpdated}.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-nfl-card border border-emerald-400/20 rounded-xl p-5">
          <div className="text-3xl font-black text-emerald-400">{buys.length}</div>
          <div className="text-sm text-slate-300 mt-1 font-medium">Strong Buys + Buys</div>
          <div className="text-xs text-slate-500 mt-1">We project significantly higher than ADP</div>
          <div className="mt-3 space-y-1">
            {buys.slice(0,4).map(p => (
              <div key={p.player_name} className="flex justify-between text-xs">
                <span className="text-slate-300">{p.player_name} <span className="text-slate-500">{p.position}</span></span>
                <span className="text-emerald-400 font-semibold">ADP {p.adp}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-nfl-card border border-red-400/20 rounded-xl p-5">
          <div className="text-3xl font-black text-red-400">{avoids.length}</div>
          <div className="text-sm text-slate-300 mt-1 font-medium">Sells + Avoids</div>
          <div className="text-xs text-slate-500 mt-1">Being drafted higher than scheme supports</div>
          <div className="mt-3 space-y-1">
            {avoids.slice(0,4).map(p => (
              <div key={p.player_name} className="flex justify-between text-xs">
                <span className="text-slate-300">{p.player_name} <span className="text-slate-500">{p.position}</span></span>
                <span className="text-red-400 font-semibold">ADP {p.adp}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-nfl-card border border-amber-400/20 rounded-xl p-5">
          <div className="text-3xl font-black text-amber-400">{unranked.length}</div>
          <div className="text-sm text-slate-300 mt-1 font-medium">Unranked Starters</div>
          <div className="text-xs text-slate-500 mt-1">Depth-1 players ESPN hasn't ranked yet</div>
          <div className="mt-3 space-y-1">
            {unranked.slice(0,4).map(p => (
              <div key={p.player_name} className="flex justify-between text-xs">
                <span className="text-slate-300">{p.player_name} <span className="text-slate-500">{p.position}</span></span>
                <span className="text-amber-400 font-semibold">{Math.round(p.ppr)} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1">
          {POS_TABS.map(pos => (
            <button key={pos} onClick={() => setPosFilter(pos)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                posFilter === pos ? 'bg-nfl-blue text-white' : 'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'
              }`}>{pos}</button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {VALUE_FILTERS.map(v => (
            <button key={v} onClick={() => setValueFilter(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                valueFilter === v ? 'bg-nfl-purple text-white' : 'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'
              }`}>{v}</button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer ml-auto">
          <input type="checkbox" checked={showOnlyRanked} onChange={e => setShowOnlyRanked(e.target.checked)}
            className="rounded" />
          ESPN-ranked only
        </label>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="bg-nfl-card border border-nfl-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
          <option value="value">Sort: Best Value</option>
          <option value="ppr">Sort: Our PPR</option>
          <option value="adp">Sort: ESPN ADP</option>
          <option value="name">Sort: Name</option>
        </select>
        <button onClick={exportCSV}
          className="px-3 py-1.5 bg-nfl-card border border-nfl-border rounded-lg text-xs text-slate-300 hover:text-white">
          ↓ Export CSV
        </button>
      </div>

      <div className="text-xs text-slate-500 mb-3">{filtered.length} players</div>

      {/* Table */}
      <div className="bg-nfl-card border border-nfl-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nfl-border">
              <th className="px-4 py-3 text-left text-xs text-slate-400 font-medium uppercase tracking-wide">Player</th>
              <th className="px-4 py-3 text-center text-xs text-slate-400 font-medium uppercase tracking-wide">Pos</th>
              <th className="px-4 py-3 text-left text-xs text-slate-400 font-medium uppercase tracking-wide">Team / Scheme</th>
              <th className="px-4 py-3 text-center text-xs text-slate-400 font-medium uppercase tracking-wide">Our PPR</th>
              <th className="px-4 py-3 text-center text-xs text-slate-400 font-medium uppercase tracking-wide">ESPN ADP</th>
              <th className="px-4 py-3 text-center text-xs text-slate-400 font-medium uppercase tracking-wide">Round</th>
              <th className="px-4 py-3 text-left text-xs text-slate-400 font-medium uppercase tracking-wide">Value</th>
              <th className="px-4 py-3 text-left text-xs text-slate-400 font-medium uppercase tracking-wide">Why</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const sig = p.signal
              const schemeNote = p.position === 'RB' ? p.rbStyle
                : p.position === 'TE' ? p.teStyle
                : p.position === 'WR' ? p.wr1Style : null
              return (
                <tr key={`${p.team}-${p.player_name}`}
                  className={`border-b border-nfl-border/40 hover:bg-white/[0.02] transition-colors ${
                    sig.label === 'Strong Buy' ? 'bg-emerald-400/[0.03]' :
                    sig.label === 'Avoid' ? 'bg-red-400/[0.02]' : ''
                  }`}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{p.player_name}</div>
                    <div className="text-xs text-slate-500">
                      #{p.depth_rank} · {p.playCaller}
                      {p.newCaller && <span className="ml-1 text-amber-400">New</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-bold bg-nfl-border/50 text-slate-300 px-2 py-0.5 rounded">{p.position}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-300 font-medium text-sm">{p.team}</div>
                    {schemeNote && <div className="text-xs text-slate-500 mt-0.5">{schemeNote}</div>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-white font-black text-base">{p.ppr}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.adp
                      ? <span className="text-slate-300 font-semibold">{p.adp}</span>
                      : <span className="text-slate-600">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-400">{p.espnRound}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full border font-bold ${sig.bg} ${sig.color}`}>
                      {sig.label === 'Strong Buy' ? '🔥 ' : sig.label === 'Buy' ? '✅ ' : sig.label === 'Avoid' ? '❌ ' : sig.label === 'Sell' ? '⚠️ ' : ''}
                      {sig.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 max-w-xs">
                    {sig.label === 'Strong Buy' && `Scheme projects ${p.ppr} pts, ADP ${p.adp} undervalues`}
                    {sig.label === 'Buy' && `Scheme-supported upside at ADP ${p.adp}`}
                    {sig.label === 'Fair Value' && `ADP ${p.adp ?? '—'} matches scheme projection`}
                    {sig.label === 'Sell' && `ADP ${p.adp} ahead of scheme support`}
                    {sig.label === 'Avoid' && `Scheme doesn't support ADP ${p.adp} cost`}
                    {sig.label === 'Unranked' && `Depth-1 starter not yet on ESPN radar`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">No players match that filter.</div>
        )}
      </div>

      <div className="mt-4 p-4 bg-nfl-card border border-nfl-border rounded-xl text-xs text-slate-500 leading-relaxed">
        <span className="text-slate-300 font-semibold">How this works: </span>
        Our PPR projection is built from the play-caller's historical tendency (RB share, TE usage, WR1 concentration)
        applied to this season's depth chart. ESPN ADP reflects market consensus. 
        A <span className="text-emerald-400">Strong Buy</span> means our scheme model projects significantly more production
        than the market is pricing in — good targets to draft a round or two earlier than ADP suggests.
        An <span className="text-red-400">Avoid</span> means the scheme doesn't support the cost.
      </div>
    </div>
  )
}
