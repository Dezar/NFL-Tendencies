import React, { useState } from 'react'
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { getTier, DEFAULT_SCORING } from '../engine/scoring'
import stats2024data from '../data/stats_2024.json'
import stats2025data from '../data/stats_2025.json'
import tendencies from '../data/tendencies.json'
import injuryData from '../data/injuries.json'
import playoffData from '../data/playoff_schedule.json'

function getPlayoffSOS(team, pos) {
  if (!team || !pos) return null
  const rankKey = pos === 'QB' ? 'vsQB' : pos === 'RB' ? 'vsRB' : pos === 'WR' ? 'vsWR' : 'vsTE'
  const defRanks = playoffData.defenseRankings[rankKey]
  const weeks = [15, 16, 17].map(wk => {
    const opp = playoffData.matchups[String(wk)]?.[team]
    return opp ? defRanks[opp] : null
  }).filter(r => r !== null)
  if (weeks.length === 0) return null
  const avg = weeks.reduce((a, b) => a + b, 0) / weeks.length
  if (avg >= 22) return { label: '\ud83d\udfe2 Playoff Friendly', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30', wk15: playoffData.matchups['15']?.[team], wk16: playoffData.matchups['16']?.[team], wk17: playoffData.matchups['17']?.[team] }
  if (avg >= 14) return { label: '\ud83d\udfe1 Mixed Playoffs',   color: 'text-yellow-400',  bg: 'bg-yellow-400/10 border-yellow-400/30',  wk15: playoffData.matchups['15']?.[team], wk16: playoffData.matchups['16']?.[team], wk17: playoffData.matchups['17']?.[team] }
  return             { label: '\ud83d\udd34 Tough Playoffs',   color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30',   wk15: playoffData.matchups['15']?.[team], wk16: playoffData.matchups['16']?.[team], wk17: playoffData.matchups['17']?.[team] }
}

const INJURY_MAP = {}
injuryData.injuries.forEach(p => { INJURY_MAP[p.player_name] = p })

const S24 = {}
stats2024data.players.forEach(p => { S24[p.player_name] = p })
const S25 = {}
stats2025data.players.forEach(p => { S25[p.player_name] = p })

const SIGNAL_MAP = {}
tendencies.teams.forEach(team => {
  (team.keyPlayers||[]).forEach(kp => { SIGNAL_MAP[kp.name] = { signal:kp.signal, note:kp.note } })
})

function findStat(name, lookup) {
  if (lookup[name]) return lookup[name]
  const last = name.split(' ').pop().toLowerCase()
  return Object.values(lookup).find(p =>
    p.player_name.split(' ').pop().toLowerCase()===last && Math.abs(p.player_name.length-name.length)<12
  ) || null
}

function schemeLines(player, team) {
  if (!team) return []
  const { position:pos, depth_rank:depth } = player
  const lines = []
  lines.push(team.newCaller
    ? `${team.playCaller} is a first-time play-caller in 2026 — projections use league averages.`
    : `${team.playCaller} has ${team.rbSeasons||0} seasons of historical data.`)
  if (pos==='RB') {
    const s=team.avgRbShare??65
    lines.push(`${team.playCaller} gives RB1 ${s.toFixed(1)}% of carries (~${Math.round(430*s/100)} projected).`)
    if (team.avgRbRecShare) lines.push(`RBs get ${team.avgRbRecShare.toFixed(1)}% of team targets — ${team.avgRbRecShare>=18?'strong PPR value':team.avgRbRecShare>=12?'moderate receiving role':'minimal receiving role'}.`)
    if(s>=75) lines.push('Workhorse scheme — elite volume, minimal committee risk.')
    else if(s>=65) lines.push('Featured back — consistent carries and a strong floor.')
    else if(s<55) lines.push('True committee — both backs have real fantasy value.')
  }
  if (pos==='WR') {
    const s=team.avgWr1Share??23, ms=depth===1?s:depth===2?s*0.55:s*0.32
    lines.push(`${team.playCaller} directs WR${depth} ~${(ms).toFixed(1)}% of targets (~${Math.round(570*ms/100)} targets).`)
    if(s>=30&&depth===1) lines.push('WR1-dominant scheme — elite, consistent usage.')
    else if(s<20&&depth===1) lines.push('Spread scheme — WR1 ceiling capped but floor is reliable.')
    else if(s<20&&depth===2) lines.push('Spread scheme — WR2 gets meaningful targets too.')
  }
  if (pos==='TE') {
    const s=team.avgTeShare??22
    lines.push(`${team.playCaller} uses TEs at ${s.toFixed(1)}% of targets — TE1 gets ~${Math.round(570*s/100*0.84)} targets.`)
    if(s>=30) lines.push('TE-heavy scheme — one of the best TE situations in fantasy.')
    else if(s<20) lines.push('TE-averse — scheme suppresses ceiling regardless of talent.')
  }
  if (pos==='QB') lines.push('QB projection uses team pass-volume tendency and QB-specific rushing profile.')
  if (team.notes) lines.push(team.notes)
  return lines
}

const SIG_STYLE = { green:'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', yellow:'text-amber-400 bg-amber-400/10 border-amber-400/30', red:'text-red-400 bg-red-400/10 border-red-400/30' }
const SIG_LABEL = { green:'🔥 Green Flag', yellow:'⚠️ Monitor', red:'❌ Red Flag' }

function Trend({ a, b }) {
  if(!a||!b) return null
  const pct=(b-a)/a*100
  if(Math.abs(pct)<5) return <Minus size={11} className="text-slate-500 inline ml-1"/>
  return pct>0 ? <TrendingUp size={11} className="text-emerald-400 inline ml-1"/> : <TrendingDown size={11} className="text-red-400 inline ml-1"/>
}

// Bar graphic inline with numbers
function StatBar({ v, max, color }) {
  if (!v || !max) return <div className="h-2 w-full bg-nfl-dark rounded-full"/>
  return (
    <div className="h-2 w-full bg-nfl-dark rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{width:`${Math.min((v/max)*100,100)}%`, opacity:0.85}}/>
    </div>
  )
}

// Comparison row: label | 2024 bar+num | 2025 bar+num | 2026 bar+num
function CompRow({ label, v24, v25, v26, max, isKey }) {
  const fmt = v => v!=null&&v!==0 ? (typeof v==='number'&&!Number.isInteger(v)?v.toFixed(1):String(v)) : null
  const safeMax = max || Math.max(v24||0, v25||0, v26||0, 1) * 1.3
  return (
    <div className={`py-2.5 border-b border-nfl-border/20 ${isKey?'bg-nfl-blue/[0.04] -mx-6 px-6':''}`}>
      <div className="flex items-center mb-1.5">
        <span className={`text-xs w-28 flex-shrink-0 ${isKey?'text-white font-semibold':'text-slate-400'}`}>{label}</span>
        <div className="flex-1 grid grid-cols-3 gap-2 text-right">
          <span className="text-xs text-slate-500 font-medium">{fmt(v24)??'—'}</span>
          <span className="text-xs text-amber-300 font-semibold">
            {fmt(v25)??'—'}{v24&&v25?<Trend a={v24} b={v25}/>:null}
          </span>
          <span className={`text-xs font-black ${isKey?'text-blue-300':'text-blue-400'}`}>{fmt(v26)??'—'}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 ml-28">
        <StatBar v={v24} max={safeMax} color="bg-slate-400"/>
        <StatBar v={v25} max={safeMax} color="bg-amber-400"/>
        <StatBar v={v26} max={safeMax} color="bg-blue-500"/>
      </div>
    </div>
  )
}

function AdvBox({ label, v25, v24, unit='' }) {
  if(!v25&&!v24) return null
  const f = v => typeof v==='number'&&!Number.isInteger(v)?v.toFixed(1):v
  return (
    <div className="bg-nfl-dark rounded-xl p-3 text-center">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      {v25!=null&&<div className="text-base font-black text-amber-300">{f(v25)}{unit}</div>}
      {v24!=null&&<div className="text-xs text-slate-500 mt-0.5">2024: {f(v24)}{unit}</div>}
    </div>
  )
}

export default function PlayerModal({ player, team, onClose, scoring=DEFAULT_SCORING }) {
  if (!player) return null
  const tier = getTier(player.position, player.ppr||0)
  const a24  = findStat(player.player_name, S24)
  const a25  = findStat(player.player_name, S25)
  const sig  = SIGNAL_MAP[player.player_name]
  const pos  = player.position
  const lines = schemeLines(player, team)
  const sos = getPlayoffSOS(player.team, pos)
  const headshot = a25?.headshot_url || a24?.headshot_url || null
  const pprTrend = a25?.fantasy_ppr ? Math.round((player.ppr-a25.fantasy_ppr)/a25.fantasy_ppr*100) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"/>
      <div className="relative bg-nfl-card border border-nfl-border rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl"
           onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-nfl-card border-b border-nfl-border z-10 px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {headshot&&(
                <img src={headshot} alt={player.player_name}
                  className="w-14 h-14 rounded-xl object-cover bg-nfl-dark border border-nfl-border flex-shrink-0"
                  onError={e=>e.target.style.display='none'}/>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-white">{player.player_name}</h2>
                  <span className="text-xs font-bold bg-nfl-border/60 text-slate-300 px-2 py-0.5 rounded">{pos}</span>
                  {sig&&<span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${SIG_STYLE[sig.signal]||''}`}>{SIG_LABEL[sig.signal]||sig.signal}</span>}
                  {sos&&<span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${sos.bg} ${sos.color}`}>{sos.label}</span>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                  <span className="text-white font-semibold">{player.team}</span>
                  <span>Depth #{player.depth_rank}</span>
                  {team&&<span className="text-slate-300">{team.playCaller}{team.newCaller?' (New)':''}</span>}
                  {player.age&&<span>Age {player.age}</span>}
                  {player.years_exp!=null&&<span>{player.years_exp}yr exp</span>}
                </div>
                {sig?.note&&<div className="text-xs text-slate-400 mt-1 italic">"{sig.note}"</div>}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white ml-4 flex-shrink-0"><X size={20}/></button>
          </div>
          {/* Injury banner */}
          {INJURY_MAP[player.player_name] && (
            <div className={`mx-6 mb-3 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between ${
              INJURY_MAP[player.player_name].status === 'IR' || INJURY_MAP[player.player_name].status === 'OUT'
                ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                : INJURY_MAP[player.player_name].status === 'Q'
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
            }`}>
              <span>🏥 {INJURY_MAP[player.player_name].note}</span>
              <span className="font-bold ml-2">{INJURY_MAP[player.player_name].status_label}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* PPR Headline */}
          <div className="flex items-stretch gap-4">
            <div className="text-center flex-shrink-0 bg-nfl-dark rounded-xl px-5 py-4 flex flex-col items-center justify-center">
              <div className={`text-5xl font-black ${tier.color}`}>{player.ppr||0}</div>
              <div className="text-xs text-slate-400 mt-1">2026 PPR</div>
              <div className={`text-xs font-bold mt-1 ${tier.color}`}>{tier.label}</div>
              {pprTrend!=null&&(
                <div className={`text-xs mt-1 font-semibold ${pprTrend>=0?'text-emerald-400':'text-red-400'}`}>
                  {pprTrend>=0?'↑':'↓'}{Math.abs(pprTrend)}% vs 2025
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-amber-400 font-semibold">Floor {player.floor}</span>
                <span className="text-slate-400">{((player.ppr||0)/17).toFixed(1)} pts/gm</span>
                <span className="text-blue-400 font-semibold">Ceiling {player.ceiling}</span>
              </div>
              <div className="h-2 bg-nfl-dark rounded-full overflow-hidden mb-1">
                <div className="h-full bg-gradient-to-r from-amber-400 via-blue-500 to-emerald-400 rounded-full"
                     style={{width:`${Math.min(((player.ppr||0)/(player.ceiling||1))*100,100)}%`}}/>
              </div>
              <div className="text-xs text-slate-500 mb-3">Std: {player.std}</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-nfl-dark rounded-lg p-2 text-center">
                  <div className="text-xs text-slate-500">2024</div>
                  <div className="text-sm font-bold text-slate-300">{a24?.fantasy_ppr??'—'}</div>
                </div>
                <div className="bg-nfl-dark border border-amber-400/20 rounded-lg p-2 text-center">
                  <div className="text-xs text-amber-400/70">2025</div>
                  <div className="text-sm font-bold text-amber-300">{a25?.fantasy_ppr??'—'}</div>
                </div>
                <div className="bg-nfl-blue/10 border border-nfl-blue/20 rounded-lg p-2 text-center">
                  <div className="text-xs text-blue-400">2026 Proj</div>
                  <div className="text-sm font-bold text-blue-400">{player.ppr||0}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stat comparison with bar graphs */}
          <div>
            {/* Legend */}
            <div className="flex items-center gap-4 mb-3">
              <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Stats</span>
              <div className="flex items-center gap-3 ml-auto text-xs">
                <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-slate-400"/><span className="text-slate-500">2024</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-amber-400"/><span className="text-amber-400/80">2025</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-blue-500"/><span className="text-blue-400">2026 Proj</span></div>
              </div>
            </div>

            {pos==='RB'&&<>
              <CompRow label="Carries"    v24={a24?.carries}         v25={a25?.carries}         v26={player.carries}    max={450} isKey/>
              <CompRow label="Rush Yards" v24={a24?.rushing_yards}   v25={a25?.rushing_yards}   v26={player.rushYds}    max={2700} isKey/>
              <CompRow label="Rush TDs"   v24={a24?.rushing_tds}     v25={a25?.rushing_tds}     v26={player.rushTds}    max={22}/>
              <CompRow label="Yds/Carry"  v24={a24?.ypc}             v25={a25?.ypc}             v26={null}               max={7}/>
              <CompRow label="Targets"    v24={a24?.targets}         v25={a25?.targets}         v26={player.tgts}       max={130}/>
              <CompRow label="Receptions" v24={a24?.receptions}      v25={a25?.receptions}      v26={player.receptions} max={110}/>
              <CompRow label="Rec Yards"  v24={a24?.receiving_yards} v25={a25?.receiving_yards} v26={player.recYds}    max={700}/>
              <CompRow label="PPR Pts"    v24={a24?.fantasy_ppr}     v25={a25?.fantasy_ppr}     v26={player.ppr}        max={500} isKey/>
            </>}

            {(pos==='WR'||pos==='TE')&&<>
              <CompRow label="Targets"    v24={a24?.targets}          v25={a25?.targets}          v26={player.tgts}       max={200} isKey/>
              <CompRow label="Tgt Share%" v24={null}                  v25={null}                  v26={player.targetShare} max={45}/>
              <CompRow label="Receptions" v24={a24?.receptions}       v25={a25?.receptions}       v26={player.receptions} max={145}/>
              <CompRow label="Catch Rate" v24={a24?.catch_rate}       v25={a25?.catch_rate}       v26={null}               max={100}/>
              <CompRow label="Rec Yards"  v24={a24?.receiving_yards}  v25={a25?.receiving_yards}  v26={player.recYds}    max={1900} isKey/>
              <CompRow label="Yds/Target" v24={a24?.yards_per_target} v25={a25?.yards_per_target} v26={null}               max={14}/>
              <CompRow label="Yds/Rec"    v24={a24?.ypr}              v25={a25?.ypr}              v26={null}               max={18}/>
              <CompRow label="Rec TDs"    v24={a24?.receiving_tds}    v25={a25?.receiving_tds}    v26={player.recTds}    max={18}/>
              <CompRow label="Air Yards"  v24={a24?.air_yards}        v25={null}                  v26={null}               max={2000}/>
              <CompRow label="YAC"        v24={a24?.yac}              v25={null}                  v26={null}               max={900}/>
              <CompRow label="PPR Pts"    v24={a24?.fantasy_ppr}      v25={a25?.fantasy_ppr}      v26={player.ppr}        max={500} isKey/>
            </>}

            {pos==='QB'&&<>
              <CompRow label="Pass Att"   v24={a24?.pass_att}        v25={a25?.pass_att}        v26={player.passAtt}   max={650}/>
              <CompRow label="Comp %"     v24={a24?.comp_pct}        v25={a25?.comp_pct}        v26={null}              max={80}/>
              <CompRow label="Pass Yards" v24={a24?.passing_yards}   v25={a25?.passing_yards}   v26={player.passYds}   max={5200} isKey/>
              <CompRow label="Yds/Att"    v24={a24?.ypa}             v25={a25?.ypa}             v26={null}              max={10}/>
              <CompRow label="Pass TDs"   v24={a24?.passing_tds}     v25={a25?.passing_tds}     v26={player.passTds}   max={50} isKey/>
              <CompRow label="INTs"       v24={a24?.interceptions}   v25={a25?.interceptions}   v26={player.ints}      max={20}/>
              <CompRow label="Rush Yards" v24={a24?.rushing_yards}   v25={a25?.rushing_yards}   v26={player.rushYds}   max={700}/>
              <CompRow label="Rush TDs"   v24={a24?.rushing_tds}     v25={a25?.rushing_tds}     v26={player.rushTds}   max={18}/>
              <CompRow label="PPR Pts"    v24={a24?.fantasy_ppr}     v25={a25?.fantasy_ppr}     v26={player.ppr}       max={520} isKey/>
            </>}
          </div>

          {/* Advanced metrics */}
          {(pos==='WR'||pos==='TE')&&(a24?.wopr||a24?.yac)&&(
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Advanced Metrics</div>
              <div className="grid grid-cols-3 gap-3">
                <AdvBox label="WOPR" v25={null} v24={a24?.wopr}/>
                <AdvBox label="Air Yards" v25={null} v24={a24?.air_yards}/>
                <AdvBox label="YAC" v25={null} v24={a24?.yac}/>
                <AdvBox label="Catch Rate" v25={a25?.catch_rate} v24={a24?.catch_rate} unit="%"/>
                <AdvBox label="Yds/Target" v25={a25?.yards_per_target} v24={a24?.yards_per_target}/>
                <AdvBox label="Yds/Rec" v25={a25?.ypr} v24={a24?.ypr}/>
              </div>
            </div>
          )}
          {pos==='RB'&&(a24?.ypc||a25?.ypc)&&(
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Advanced Metrics</div>
              <div className="grid grid-cols-3 gap-3">
                <AdvBox label="Yds/Carry" v25={a25?.ypc} v24={a24?.ypc}/>
                <AdvBox label="Rush 1st Dns" v25={null} v24={a24?.rushing_first_downs}/>
                <AdvBox label="Rec 1st Dns" v25={null} v24={a24?.receiving_first_downs}/>
              </div>
            </div>
          )}

          {/* Playoff Schedule */}
          {sos&&(
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Playoff Schedule (Wks 15–17)</div>
              <div className={`rounded-xl border p-4 ${sos.bg}`}>
                <div className={`text-sm font-bold mb-3 ${sos.color}`}>{sos.label}</div>
                <div className="grid grid-cols-3 gap-3">
                  {[{wk:'Wk 15',opp:sos.wk15},{wk:'Wk 16',opp:sos.wk16},{wk:'Wk 17',opp:sos.wk17}].map(({wk,opp})=>{
                    if (!opp) return <div key={wk} className="bg-nfl-dark rounded-lg p-2 text-center"><div className="text-xs text-slate-500">{wk}</div><div className="text-sm font-bold text-slate-600">—</div></div>
                    const rankKey = pos==='QB'?'vsQB':pos==='RB'?'vsRB':pos==='WR'?'vsWR':'vsTE'
                    const rank = playoffData.defenseRankings[rankKey][opp]
                    const r = rank<=8?{e:'🔴',c:'text-red-400'}:rank<=18?{e:'🟡',c:'text-yellow-400'}:{e:'🟢',c:'text-emerald-400'}
                    return (
                      <div key={wk} className="bg-nfl-dark rounded-lg p-2 text-center">
                        <div className="text-xs text-slate-500 mb-1">{wk}</div>
                        <div className="text-sm font-bold text-white">vs {opp}</div>
                        <div className={`text-xs mt-0.5 ${r.c}`}>{r.e} #{rank} def</div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-3">Defense rank vs {pos}: 1=hardest, 32=easiest matchup</p>
              </div>
            </div>
          )}

          {/* Why */}
          {lines.length>0&&(
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Why We Project This</div>
              <div className="space-y-2">
                {lines.map((l,i)=><p key={i} className="text-sm text-slate-300 leading-relaxed">{l}</p>)}
              </div>
            </div>
          )}

          {/* Tendency bars */}
          {team&&(
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">{team.playCaller} — Scheme Tendencies</div>
              <div className="space-y-3">
                {[
                  {label:'RB1 Carry Share',   value:team.avgRbShare,    max:100,color:'bg-blue-500',   style:team.rbStyle, hi:pos==='RB'},
                  {label:'RB Reception Share', value:team.avgRbRecShare, max:25, color:'bg-sky-400',    style:'',           hi:pos==='RB'},
                  {label:'TE Target Share',    value:team.avgTeShare,    max:42, color:'bg-purple-500', style:team.teStyle, hi:pos==='TE'},
                  {label:'WR1 Target Share',   value:team.avgWr1Share,   max:42, color:'bg-emerald-500',style:team.wr1Style,hi:pos==='WR'},
                ].filter(t=>t.value!=null).map(({label,value,max,color,style,hi})=>(
                  <div key={label}>
                    <div className={`flex justify-between text-xs mb-1 ${hi?'font-semibold':''}`}>
                      <span className={hi?'text-white':'text-slate-400'}>{label}</span>
                      <span className={hi?'text-white':'text-slate-400'}>{value?.toFixed(1)}%{style?` · ${style}`:''}</span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${hi?'bg-nfl-border':'bg-nfl-dark'}`}>
                      <div className={`h-full rounded-full ${color} ${hi?'opacity-100':'opacity-35'}`}
                           style={{width:`${Math.min((value/max)*100,100)}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
              {team.notes&&<p className="text-xs text-slate-500 mt-3 leading-relaxed">{team.notes}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
