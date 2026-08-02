import React from 'react'
import { X } from 'lucide-react'
import { getTier, DEFAULT_SCORING } from '../engine/scoring'
import stats2024data from '../data/stats_2024.json'
import stats2025data from '../data/stats_2025.json'

// Build lookup by player name for both seasons
function buildLookup(data) {
  const m = {}
  data.players.forEach(p => { m[p.player_name] = p })
  return m
}
const S2024 = buildLookup(stats2024data)
const S2025 = buildLookup(stats2025data)

function findPlayer(name, lookup) {
  if (lookup[name]) return lookup[name]
  // Try last name match
  const last = name.split(' ').pop()
  return Object.values(lookup).find(p => p.player_name.endsWith(last)) || null
}

function schemeLines(player, team) {
  if (!team) return ['No scheme data available.']
  const pos = player.position, depth = player.depth_rank
  const lines = []
  const newCaller = team.newCaller
  lines.push(newCaller
    ? `${team.playCaller} is a first-time play-caller in 2026 — no historical tendency data. Using league averages.`
    : `${team.playCaller} is the 2026 play-caller with ${team.rbSeasons||0} seasons of historical data.`)
  if (pos==='RB') {
    const s=team.avgRbShare??65, car=Math.round(430*s/100)
    lines.push(`${team.playCaller} gives RB1 ${s.toFixed(1)}% of carries on average — projects to ~${car} carries.`)
    if(s>=75) lines.push('Workhorse scheme — one of the most valuable RB situations in fantasy.')
    else if(s>=65) lines.push('Featured back scheme — consistent volume, strong floor.')
    else if(s<55) { lines.push('True committee — volume is split. Both backs have value.'); if(depth===1) lines.push('Avoid paying RB1 premium in this scheme.') }
  }
  if (pos==='WR') {
    const s=team.avgWr1Share??23, tgts=Math.round(570*(depth===1?s:depth===2?s*0.55:s*0.32)/100)
    lines.push(`${team.playCaller} directs WR${depth} ~${tgts} targets (${(depth===1?s:depth===2?s*0.55:s*0.32).toFixed(1)}% share).`)
    if(s>=30&&depth===1) lines.push('WR1-dominant scheme — alpha WR gets elite, consistent usage.')
    else if(s<20&&depth===1) lines.push('Spread scheme — WR1 ceiling is capped but floor is real.')
    else if(s<20&&depth===2) lines.push('Spread scheme benefits WR2 — multiple targets spread around.')
  }
  if (pos==='TE') {
    const s=team.avgTeShare??22, tgts=Math.round(570*s/100*0.84)
    lines.push(`${team.playCaller} uses TEs at ${s.toFixed(1)}% of targets — TE1 projects to ~${tgts} targets.`)
    if(s>=30) lines.push('TE-heavy scheme — top-tier TE opportunity.')
    else if(s<20) lines.push('TE-averse scheme — even elite TEs get suppressed volume here.')
  }
  if (pos==='QB') {
    lines.push('QB projection uses team pass-volume tendency and 2025 league-average efficiency.')
    lines.push('Does not include individual talent adjustment — pure scheme model.')
  }
  if (team.notes) lines.push(team.notes)
  return lines
}

function Bar({ label, proj, actual2025, actual2024, max }) {
  const pct  = v => Math.min((v/max)*100, 100)
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-slate-400">{label}</span>
        <div className="flex items-center gap-3">
          {actual2024!=null && <span className="text-slate-500">2024: <span className="text-slate-300">{actual2024}</span></span>}
          {actual2025!=null && <span className="text-amber-400/80">2025: <span className="text-amber-300 font-semibold">{actual2025}</span></span>}
          <span className="text-blue-400 font-bold">2026: {proj}</span>
        </div>
      </div>
      <div className="relative h-3 bg-nfl-dark rounded-full overflow-hidden">
        {actual2024!=null && <div className="absolute h-full rounded-full bg-slate-600/50" style={{width:`${pct(actual2024)}%`}} />}
        {actual2025!=null && <div className="absolute h-full rounded-full bg-amber-500/40" style={{width:`${pct(actual2025)}%`}} />}
        <div className="absolute h-full rounded-full bg-blue-500" style={{width:`${pct(proj)}%`, opacity:0.85}} />
      </div>
    </div>
  )
}

function StatBox({label, value, color}) {
  return (
    <div className="bg-nfl-dark rounded-xl p-3 text-center">
      <div className={`text-xl font-black ${color||'text-white'}`}>{value??'—'}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  )
}

export default function PlayerModal({ player, team, onClose, scoring=DEFAULT_SCORING }) {
  if (!player) return null
  const tier = getTier(player.position, player.ppr||0)
  const p24  = findPlayer(player.player_name, S2024)
  const p25  = findPlayer(player.player_name, S2025)
  const pos  = player.position
  const lines = schemeLines(player, team)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div className="relative bg-nfl-card border border-nfl-border rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl"
           onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-nfl-card border-b border-nfl-border px-6 py-4 flex items-start justify-between z-10">
          <div>
            <h2 className="text-xl font-black text-white">{player.player_name}</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs font-bold bg-nfl-border/60 text-slate-300 px-2 py-0.5 rounded">{pos}</span>
              <span className="text-sm text-slate-400">{player.team} · #{player.depth_rank} depth</span>
              {player.age && <span className="text-xs text-slate-500">Age {player.age}</span>}
              {player.years_exp!=null && <span className="text-xs text-slate-500">{player.years_exp}yr exp</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white ml-4"><X size={20}/></button>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* PPR headline */}
          <div className="flex items-center gap-6">
            <div className="text-center flex-shrink-0">
              <div className={`text-5xl font-black ${tier.color}`}>{player.ppr||0}</div>
              <div className="text-xs text-slate-400 mt-1">2026 PPR Proj</div>
              <div className={`text-xs font-bold mt-1 ${tier.color}`}>{tier.label}</div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-amber-400 font-semibold">Floor {player.floor}</span>
                <span className="text-slate-400">{((player.ppr||0)/17).toFixed(1)} pts/gm</span>
                <span className="text-blue-400 font-semibold">Ceiling {player.ceiling}</span>
              </div>
              <div className="h-2.5 bg-nfl-dark rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 via-blue-500 to-emerald-400 rounded-full"
                     style={{width:`${Math.min(((player.ppr||0)/(player.ceiling||1))*100,100)}%`}} />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Std: {player.std}</span>
                <div className="flex gap-3">
                  {p24 && <span>2024: <span className="text-slate-300">{p24.fantasy_ppr} PPR</span></span>}
                  {p25 && <span className="text-amber-400/80">2025: <span className="text-amber-300 font-semibold">{p25.fantasy_ppr} PPR</span></span>}
                </div>
              </div>
            </div>
          </div>

          {/* Bar chart: proj vs 2024 vs 2025 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Stat Comparison</div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1"><div className="w-2.5 h-2 rounded bg-slate-600/50"/><span className="text-slate-500">2024</span></div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2 rounded bg-amber-500/40"/><span className="text-amber-400/80">2025</span></div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2 rounded bg-blue-500"/><span className="text-blue-400">2026 proj</span></div>
              </div>
            </div>
            <div className="space-y-3">
              {pos==='RB' && <>
                <Bar label="Carries"    proj={player.carries}    actual2025={p25?.carries}         actual2024={p24?.carries}         max={450} />
                <Bar label="Rush Yards" proj={player.rushYds}    actual2025={p25?.rushing_yards}   actual2024={p24?.rushing_yards}   max={2700} />
                <Bar label="Rush TDs"   proj={player.rushTds}    actual2025={p25?.rushing_tds}     actual2024={p24?.rushing_tds}     max={22} />
                <Bar label="Targets"    proj={player.tgts}       actual2025={p25?.targets}         actual2024={p24?.targets}         max={140} />
                <Bar label="Receptions" proj={player.receptions} actual2025={p25?.receptions}      actual2024={p24?.receptions}      max={110} />
                <Bar label="Rec Yards"  proj={player.recYds}     actual2025={p25?.receiving_yards} actual2024={p24?.receiving_yards} max={1000} />
              </>}
              {(pos==='WR'||pos==='TE') && <>
                <Bar label="Targets"    proj={player.tgts}       actual2025={p25?.targets}         actual2024={p24?.targets}         max={200} />
                <Bar label="Receptions" proj={player.receptions} actual2025={p25?.receptions}      actual2024={p24?.receptions}      max={145} />
                <Bar label="Rec Yards"  proj={player.recYds}     actual2025={p25?.receiving_yards} actual2024={p24?.receiving_yards} max={1900} />
                <Bar label="Rec TDs"    proj={player.recTds}     actual2025={p25?.receiving_tds}   actual2024={p24?.receiving_tds}   max={18} />
              </>}
              {pos==='QB' && <>
                <Bar label="Pass Yards" proj={player.passYds} actual2025={p25?.passing_yards} actual2024={p24?.passing_yards} max={5200} />
                <Bar label="Pass TDs"   proj={player.passTds} actual2025={p25?.passing_tds}   actual2024={p24?.passing_tds}   max={50} />
                <Bar label="Rush Yards" proj={player.rushYds} actual2025={p25?.rushing_yards} actual2024={p24?.rushing_yards} max={700} />
              </>}
            </div>
          </div>

          {/* Stat boxes */}
          <div className="grid grid-cols-3 gap-3">
            {pos==='RB' && <>
              <StatBox label="Carries"    value={player.carries}    color="text-blue-400" />
              <StatBox label="Rush Yards" value={player.rushYds}    color="text-white" />
              <StatBox label="Rush TDs"   value={player.rushTds}    color="text-emerald-400" />
              <StatBox label="Targets"    value={player.tgts} />
              <StatBox label="Receptions" value={player.receptions} />
              <StatBox label="Rec Yards"  value={player.recYds} />
            </>}
            {(pos==='WR'||pos==='TE') && <>
              <StatBox label="Tgt Share"  value={player.targetShare!=null?player.targetShare+'%':null} color="text-blue-400" />
              <StatBox label="Targets"    value={player.tgts}       color="text-white" />
              <StatBox label="Receptions" value={player.receptions} color="text-white" />
              <StatBox label="Rec Yards"  value={player.recYds}     color="text-emerald-400" />
              <StatBox label="Rec TDs"    value={player.recTds}     color="text-emerald-400" />
              <StatBox label="Pts/Game"   value={((player.ppr||0)/17).toFixed(1)} color="text-amber-400" />
            </>}
            {pos==='QB' && <>
              <StatBox label="Pass Att"   value={player.passAtt} />
              <StatBox label="Pass Yards" value={player.passYds}  color="text-white" />
              <StatBox label="Pass TDs"   value={player.passTds}  color="text-emerald-400" />
              <StatBox label="INTs"       value={player.ints}     color="text-red-400" />
              <StatBox label="Rush Yards" value={player.rushYds} />
              <StatBox label="Pts/Game"   value={((player.ppr||0)/17).toFixed(1)} color="text-amber-400" />
            </>}
          </div>

          {/* Why */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Why We Project This</div>
            <div className="space-y-2">
              {lines.map((l,i)=><p key={i} className="text-sm text-slate-300 leading-relaxed">{l}</p>)}
            </div>
          </div>

          {/* Tendency bars */}
          {team && (
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">
                {team.playCaller} — Historical Tendencies
              </div>
              <div className="space-y-3">
                {[
                  {label:'RB1 Carry Share', value:team.avgRbShare, max:100, color:'bg-blue-500',   style:team.rbStyle,  hi:pos==='RB'},
                  {label:'TE Target Share', value:team.avgTeShare, max:42,  color:'bg-purple-500', style:team.teStyle,  hi:pos==='TE'},
                  {label:'WR1 Target Share',value:team.avgWr1Share,max:42,  color:'bg-emerald-500',style:team.wr1Style, hi:pos==='WR'},
                ].map(({label,value,max,color,style,hi})=>(
                  <div key={label}>
                    <div className={`flex justify-between text-xs mb-1 ${hi?'text-white font-semibold':''}`}>
                      <span>{label}</span>
                      <span>{value?.toFixed(1)}% · <span className="text-slate-500 font-normal">{style}</span></span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${hi?'bg-nfl-border':'bg-nfl-dark'}`}>
                      <div className={`h-full rounded-full ${color} ${hi?'opacity-100':'opacity-40'}`}
                           style={{width:`${Math.min((value/max)*100,100)}%`}} />
                    </div>
                  </div>
                ))}
              </div>
              {team.notes && <p className="text-xs text-slate-500 mt-3 leading-relaxed">{team.notes}</p>}
            </div>
          )}

          {/* ADP */}
          {player.adp && (
            <div className="bg-nfl-dark rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 mb-1">ESPN ADP</div>
                <div className="text-2xl font-black text-white">#{player.adp}</div>
                <div className="text-xs text-slate-400">{player.espnRound}</div>
              </div>
              {player.signal && (
                <div className="text-right">
                  <div className="text-xs text-slate-500 mb-1">Our Signal</div>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full border ${player.signal.bg} ${player.signal.color}`}>
                    {player.signal.label}
                  </span>
                  {player.diff!=null && (
                    <div className={`text-xs mt-1 ${player.diff>0?'text-emerald-400':'text-red-400'}`}>
                      {player.diff>0?'+':''}{player.diff} pts vs market
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
