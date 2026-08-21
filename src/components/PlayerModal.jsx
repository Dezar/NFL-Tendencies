import React from 'react'
import { X } from 'lucide-react'
import { getTier, DEFAULT_SCORING } from '../engine/scoring'
import stats2024data from '../data/stats_2024.json'
import stats2025data from '../data/stats_2025.json'

const S2024 = {}
stats2024data.players.forEach(p => { S2024[p.player_name] = p })
const S2025 = {}
stats2025data.players.forEach(p => { S2025[p.player_name] = p })

function find(name, lookup) {
  if (lookup[name]) return lookup[name]
  const last = name.split(' ').pop().toLowerCase()
  return Object.values(lookup).find(p =>
    p.player_name.toLowerCase().includes(last) &&
    Math.abs(p.player_name.length - name.length) < 10
  ) || null
}

function schemeLines(player, team) {
  if (!team) return ['No scheme data available.']
  const { position: pos, depth_rank: depth } = player
  const lines = []
  const nc = team.newCaller
  lines.push(nc
    ? `${team.playCaller} is a first-time play-caller in 2026 — projections use league averages.`
    : `${team.playCaller} has ${team.rbSeasons||0} seasons of historical data in our system.`)
  if (pos==='RB') {
    const s = team.avgRbShare??65, car = Math.round(430*s/100)
    lines.push(`${team.playCaller} gives RB1 ${s.toFixed(1)}% of carries historically — ~${car} projected carries.`)
    const recShare = team.avgRbRecShare
    if (recShare) lines.push(`RB target share averages ${recShare.toFixed(1)}% under ${team.playCaller}.`)
    if(s>=75) lines.push('Workhorse scheme — elite RB1 value, minimal committee risk.')
    else if(s>=65) lines.push('Featured back — consistent volume and strong floor.')
    else if(s<55) { lines.push('True committee — targets split. RB2 has real value.'); if(depth===1) lines.push('Avoid paying RB1 premium here.') }
  }
  if (pos==='WR') {
    const s = team.avgWr1Share??23
    const myShare = depth===1?s:depth===2?s*0.55:s*0.32
    const tgts = Math.round(570*(myShare/100))
    lines.push(`${team.playCaller} directs ~${tgts} targets to WR${depth} (${myShare.toFixed(1)}% share).`)
    if(s>=30&&depth===1) lines.push('WR1-dominant — alpha receiver gets elite, consistent usage.')
    else if(s<20&&depth===2) lines.push('Spread scheme benefits WR2 — multiple receivers share meaningful targets.')
  }
  if (pos==='TE') {
    const s = team.avgTeShare??22
    const tgts = Math.round(570*(s/100)*0.84)
    lines.push(`${team.playCaller} uses TEs at ${s.toFixed(1)}% of targets — TE1 projects to ~${tgts} targets.`)
    if(s>=30) lines.push('TE-heavy scheme — one of the best TE situations in the league.')
    else if(s<20) lines.push('TE-averse — talent gets suppressed by scheme volume.')
  }
  if (pos==='QB') {
    lines.push('QB projection uses team pass-volume tendency and 2025 league-average efficiency.')
  }
  if (team.notes) lines.push(team.notes)
  return lines
}

// Side-by-side stat comparison row
function CompRow({ label, v2024, v2025, v2026, unit='' }) {
  const vals = [v2024, v2025, v2026].map(v => v!=null ? (typeof v==='number'&&!Number.isInteger(v) ? v.toFixed(1) : v) : null)
  return (
    <div className="grid grid-cols-4 gap-2 items-center py-2 border-b border-nfl-border/30">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-center text-xs text-slate-500 font-medium">{vals[0]!=null ? vals[0]+unit : <span className="text-slate-700">—</span>}</div>
      <div className="text-center text-xs text-amber-300 font-semibold">{vals[1]!=null ? vals[1]+unit : <span className="text-slate-700">—</span>}</div>
      <div className="text-center text-sm font-black text-blue-400">{vals[2]!=null ? vals[2]+unit : <span className="text-slate-700">—</span>}</div>
    </div>
  )
}

function StatBox({ label, value, color }) {
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
  const a24  = find(player.player_name, S2024)
  const a25  = find(player.player_name, S2025)
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
              {/* PPR history */}
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="text-center bg-nfl-dark rounded-lg p-2">
                  <div className="text-xs text-slate-500">2024 PPR</div>
                  <div className="text-sm font-bold text-slate-300">{a24?.fantasy_ppr ?? '—'}</div>
                </div>
                <div className="text-center bg-nfl-dark rounded-lg p-2">
                  <div className="text-xs text-amber-400/70">2025 PPR</div>
                  <div className="text-sm font-bold text-amber-300">{a25?.fantasy_ppr ?? '—'}</div>
                </div>
                <div className="text-center bg-nfl-blue/10 border border-nfl-blue/20 rounded-lg p-2">
                  <div className="text-xs text-blue-400">2026 Proj</div>
                  <div className="text-sm font-bold text-blue-400">{player.ppr||0}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-side stat comparison */}
          <div>
            <div className="grid grid-cols-4 gap-2 mb-1 px-0">
              <div className="text-xs text-slate-600 font-medium uppercase tracking-wide">Stat</div>
              <div className="text-center text-xs text-slate-500 font-medium">2024</div>
              <div className="text-center text-xs text-amber-400/80 font-medium">2025</div>
              <div className="text-center text-xs text-blue-400 font-semibold">2026 Proj</div>
            </div>
            {pos==='RB' && <>
              <CompRow label="Carries"    v2024={a24?.carries}          v2025={a25?.carries}          v2026={player.carries} />
              <CompRow label="Rush Yards" v2024={a24?.rushing_yards}    v2025={a25?.rushing_yards}    v2026={player.rushYds} />
              <CompRow label="Rush TDs"   v2024={a24?.rushing_tds}      v2025={a25?.rushing_tds}      v2026={player.rushTds} />
              <CompRow label="Targets"    v2024={a24?.targets}          v2025={a25?.targets}           v2026={player.tgts} />
              <CompRow label="Receptions" v2024={a24?.receptions}       v2025={a25?.receptions}        v2026={player.receptions} />
              <CompRow label="Rec Yards"  v2024={a24?.receiving_yards}  v2025={a25?.receiving_yards}   v2026={player.recYds} />
              <CompRow label="PPR Pts"    v2024={a24?.fantasy_ppr}      v2025={a25?.fantasy_ppr}       v2026={player.ppr} />
            </>}
            {(pos==='WR'||pos==='TE') && <>
              <CompRow label="Targets"    v2024={a24?.targets}          v2025={a25?.targets}           v2026={player.tgts} />
              <CompRow label="Tgt Share"  v2024={null}                  v2025={null}                   v2026={player.targetShare} unit="%" />
              <CompRow label="Receptions" v2024={a24?.receptions}       v2025={a25?.receptions}        v2026={player.receptions} />
              <CompRow label="Rec Yards"  v2024={a24?.receiving_yards}  v2025={a25?.receiving_yards}   v2026={player.recYds} />
              <CompRow label="Rec TDs"    v2024={a24?.receiving_tds}    v2025={a25?.receiving_tds}     v2026={player.recTds} />
              <CompRow label="PPR Pts"    v2024={a24?.fantasy_ppr}      v2025={a25?.fantasy_ppr}       v2026={player.ppr} />
            </>}
            {pos==='QB' && <>
              <CompRow label="Pass Att"   v2024={a24?.pass_att}         v2025={a25?.pass_att}          v2026={player.passAtt} />
              <CompRow label="Pass Yards" v2024={a24?.passing_yards}    v2025={a25?.passing_yards}     v2026={player.passYds} />
              <CompRow label="Pass TDs"   v2024={a24?.passing_tds}      v2025={a25?.passing_tds}       v2026={player.passTds} />
              <CompRow label="INTs"       v2024={a24?.interceptions}    v2025={a25?.interceptions}     v2026={player.ints} />
              <CompRow label="Rush Yards" v2024={a24?.rushing_yards}    v2025={a25?.rushing_yards}     v2026={player.rushYds} />
              <CompRow label="Rush TDs"   v2024={a24?.rushing_tds}      v2025={a25?.rushing_tds}       v2026={player.rushTds} />
              <CompRow label="PPR Pts"    v2024={a24?.fantasy_ppr}      v2025={a25?.fantasy_ppr}       v2026={player.ppr} />
            </>}
          </div>

          {/* Why */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Why We Project This</div>
            <div className="space-y-2">
              {lines.map((l,i) => <p key={i} className="text-sm text-slate-300 leading-relaxed">{l}</p>)}
            </div>
          </div>

          {/* Tendency bars — including RB reception share */}
          {team && (
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">
                {team.playCaller} — Scheme Tendencies
              </div>
              <div className="space-y-3">
                {[
                  { label:'RB1 Carry Share',     value:team.avgRbShare,    max:100, color:'bg-blue-500',   style:team.rbStyle,  hi:pos==='RB' },
                  { label:'RB Reception Share',   value:team.avgRbRecShare, max:25,  color:'bg-sky-400',    style:'',            hi:pos==='RB' },
                  { label:'TE Target Share',       value:team.avgTeShare,    max:42,  color:'bg-purple-500', style:team.teStyle,  hi:pos==='TE' },
                  { label:'WR1 Target Share',     value:team.avgWr1Share,   max:42,  color:'bg-emerald-500',style:team.wr1Style, hi:pos==='WR' },
                ].filter(t => t.value != null).map(({ label, value, max, color, style, hi }) => (
                  <div key={label}>
                    <div className={`flex justify-between text-xs mb-1 ${hi?'font-semibold text-white':''}`}>
                      <span className={hi?'text-white':'text-slate-400'}>{label}</span>
                      <span className={hi?'text-white':'text-slate-400'}>
                        {value?.toFixed(1)}%{style ? ` · ${style}` : ''}
                      </span>
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
