import React, { useState } from 'react'
import { X } from 'lucide-react'
import { getTier, DEFAULT_SCORING } from '../engine/scoring'
import stats2024 from '../data/stats_2024.json'

// Build lookup for 2024 stats
const STATS_2024 = {}
stats2024.players.forEach(p => {
  STATS_2024[p.player_name] = p
  // Also index by shortened name (e.g. "J.Chase" -> "Ja'Marr Chase")
})

function findStats(playerName) {
  // Direct match
  if (STATS_2024[playerName]) return STATS_2024[playerName]
  // Partial match - last name
  const lastName = playerName.split(' ').pop()
  return Object.values(STATS_2024).find(p =>
    p.player_name.includes(lastName) && Math.abs(p.player_name.length - playerName.length) < 8
  ) || null
}

function schemeLines(player, team) {
  if (!team) return ['No scheme data available.']
  const pos = player.position
  const depth = player.depth_rank
  const lines = []

  lines.push(`${team.playCaller} is the 2026 play-caller${team.newCaller ? ' — first year in this role' : ` with ${team.rbSeasons || 0} seasons of data`}.`)

  if (pos === 'RB') {
    const s = team.avgRbShare ?? 65
    const car = Math.round(430 * s / 100)
    lines.push(`${team.playCaller} historically gives RB1 ${s.toFixed(1)}% of team carries (${car} projected carries).`)
    if (s >= 75) lines.push(`This is a true workhorse scheme — one of the most valuable setups in fantasy.`)
    else if (s >= 65) lines.push(`Featured back scheme — RB1 gets consistent volume without sharing much.`)
    else if (s < 55) {
      lines.push(`True committee scheme — carries split across multiple backs.`)
      if (depth === 2) lines.push(`RB2 actually has real value here — both backs are relevant.`)
    }
  }
  if (pos === 'WR') {
    const s = team.avgWr1Share ?? 23
    const tgts = Math.round(570 * s / 100 * (depth === 1 ? 1 : depth === 2 ? 0.55 : 0.32))
    lines.push(`${team.playCaller} historically gives WR${depth} ~${s.toFixed(1)}% of team targets (projects to ~${tgts} targets).`)
    if (s >= 30 && depth === 1) lines.push(`WR1-dominant scheme — alpha receiver gets elite usage.`)
    else if (s < 20 && depth === 1) lines.push(`Spread scheme — targets distributed widely. WR1 ceiling is capped.`)
    else if (s < 20 && depth === 2) lines.push(`Spread scheme benefits WR2 — multiple receivers get meaningful targets.`)
  }
  if (pos === 'TE') {
    const s = team.avgTeShare ?? 22
    const tgts = Math.round(570 * s / 100 * 0.84)
    lines.push(`${team.playCaller} historically directs ${s.toFixed(1)}% of targets to TEs — TE1 projects to ~${tgts} targets.`)
    if (s >= 30) lines.push(`TE-heavy scheme — one of the best TE situations in the league.`)
    else if (s < 20) lines.push(`TE-averse scheme — even elite TE talent gets suppressed here.`)
  }
  if (pos === 'QB') {
    lines.push(`Pass volume adjusted for team run/pass tendency.`)
    lines.push(`QB projections reflect scheme volume, not individual talent.`)
  }
  return lines
}

function StatBox({ label, value, sub, color }) {
  return (
    <div className="bg-nfl-dark rounded-xl p-3 text-center">
      <div className={`text-xl font-black ${color || 'text-white'}`}>{value ?? '—'}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
    </div>
  )
}

function MiniBar({ label, proj, actual, max }) {
  const projPct = Math.min((proj / max) * 100, 100)
  const actPct = actual != null ? Math.min((actual / max) * 100, 100) : null
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-500">
          <span className="text-blue-400 font-semibold">{proj}</span> proj
          {actual != null && <> · <span className="text-slate-300">{actual}</span> actual 2024</>}
        </span>
      </div>
      <div className="relative h-2 bg-nfl-border rounded-full overflow-hidden">
        {actPct != null && (
          <div className="absolute h-full rounded-full bg-slate-500/40" style={{ width: `${actPct}%` }} />
        )}
        <div className="absolute h-full rounded-full bg-blue-500" style={{ width: `${projPct}%` }} />
      </div>
    </div>
  )
}

export default function PlayerModal({ player, team, onClose, scoring = DEFAULT_SCORING }) {
  if (!player) return null

  const tier = getTier(player.position, player.ppr || 0)
  const actual = findStats(player.player_name)
  const lines = schemeLines(player, team)
  const pos = player.position

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        className="relative bg-nfl-card border border-nfl-border rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-nfl-card border-b border-nfl-border px-6 py-4 flex items-start justify-between z-10">
          <div>
            <h2 className="text-xl font-black text-white">{player.player_name}</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs font-bold bg-nfl-border/60 text-slate-300 px-2 py-0.5 rounded">{pos}</span>
              <span className="text-sm text-slate-400">{player.team} · #{player.depth_rank} on depth chart</span>
              {player.age && <span className="text-xs text-slate-500">Age {player.age}</span>}
              {player.years_exp != null && <span className="text-xs text-slate-500">{player.years_exp}yr exp</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white ml-4 flex-shrink-0"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* 2026 Projection header */}
          <div className="flex items-center gap-6">
            <div className="text-center flex-shrink-0">
              <div className={`text-5xl font-black ${tier.color}`}>{player.ppr || 0}</div>
              <div className="text-xs text-slate-400 mt-1">2026 PPR Projection</div>
              <div className={`text-xs font-bold mt-1 ${tier.color}`}>{tier.label}</div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-amber-400 font-semibold">Floor: {player.floor}</span>
                <span className="text-slate-400">{(( player.ppr||0) / 17).toFixed(1)} pts/game</span>
                <span className="text-blue-400 font-semibold">Ceiling: {player.ceiling}</span>
              </div>
              <div className="w-full bg-nfl-dark rounded-full h-2.5 relative overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 via-blue-500 to-emerald-400 rounded-full"
                     style={{ width: `${Math.min(((player.ppr||0) / (player.ceiling||1)) * 100, 100)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Std: {player.std}</span>
                {actual && <span className="text-slate-400">2024 actual: <span className="text-white font-semibold">{actual.fantasy_ppr} PPR</span></span>}
              </div>
            </div>
          </div>

          {/* Projected vs Actual stat comparison */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">
              2026 Projected Stats {actual ? '(vs 2024 Actual)' : ''}
            </div>
            <div className="space-y-3">
              {pos === 'RB' && <>
                <MiniBar label="Carries" proj={player.carries} actual={actual?.carries} max={450} />
                <MiniBar label="Rush Yards" proj={player.rushYds} actual={actual?.rushing_yards} max={2600} />
                <MiniBar label="Rush TDs" proj={player.rushTds} actual={actual?.rushing_tds} max={25} />
                <MiniBar label="Targets" proj={player.tgts} actual={actual?.targets} max={120} />
                <MiniBar label="Receptions" proj={player.receptions} actual={actual?.receptions} max={100} />
                <MiniBar label="Rec Yards" proj={player.recYds} actual={actual?.receiving_yards} max={700} />
              </>}
              {(pos === 'WR' || pos === 'TE') && <>
                <MiniBar label="Targets" proj={player.tgts} actual={actual?.targets} max={185} />
                <MiniBar label="Receptions" proj={player.receptions} actual={actual?.receptions} max={140} />
                <MiniBar label="Rec Yards" proj={player.recYds} actual={actual?.receiving_yards} max={1800} />
                <MiniBar label="Rec TDs" proj={player.recTds} actual={actual?.receiving_tds} max={20} />
              </>}
              {pos === 'QB' && <>
                <MiniBar label="Pass Yards" proj={player.passYds} actual={actual?.passing_yards} max={5200} />
                <MiniBar label="Pass TDs" proj={player.passTds} actual={actual?.passing_tds} max={45} />
                <MiniBar label="Rush Yards" proj={player.rushYds} actual={actual?.rushing_yards} max={900} />
              </>}
            </div>
            {actual && (
              <div className="mt-2 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-blue-500" /><span className="text-slate-400">2026 projection</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-slate-500/40" /><span className="text-slate-400">2024 actual</span></div>
              </div>
            )}
          </div>

          {/* Key stat boxes */}
          <div className="grid grid-cols-3 gap-3">
            {pos === 'RB' && <>
              <StatBox label="Carries" value={player.carries} color="text-blue-400" />
              <StatBox label="Rush Yards" value={player.rushYds} color="text-white" />
              <StatBox label="Rush TDs" value={player.rushTds} color="text-emerald-400" />
              <StatBox label="Targets" value={player.tgts} />
              <StatBox label="Receptions" value={player.receptions} />
              <StatBox label="Rec Yards" value={player.recYds} />
            </>}
            {(pos === 'WR' || pos === 'TE') && <>
              <StatBox label="Tgt Share" value={player.targetShare != null ? player.targetShare + '%' : null} color="text-blue-400" />
              <StatBox label="Targets" value={player.tgts} color="text-white" />
              <StatBox label="Receptions" value={player.receptions} color="text-white" />
              <StatBox label="Rec Yards" value={player.recYds} color="text-emerald-400" />
              <StatBox label="Rec TDs" value={player.recTds} color="text-emerald-400" />
              <StatBox label="Pts/Game" value={(( player.ppr||0)/17).toFixed(1)} color="text-amber-400" />
            </>}
            {pos === 'QB' && <>
              <StatBox label="Pass Att" value={player.passAtt} />
              <StatBox label="Pass Yards" value={player.passYds} color="text-white" />
              <StatBox label="Pass TDs" value={player.passTds} color="text-emerald-400" />
              <StatBox label="INTs" value={player.ints} color="text-red-400" />
              <StatBox label="Rush Yards" value={player.rushYds} />
              <StatBox label="Pts/Game" value={((player.ppr||0)/17).toFixed(1)} color="text-amber-400" />
            </>}
          </div>

          {/* Scheme explanation */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Why We Project This</div>
            <div className="space-y-2">
              {lines.map((line, i) => <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>)}
            </div>
          </div>

          {/* Play-caller tendency bars */}
          {team && (
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">
                {team.playCaller} Scheme Tendencies
              </div>
              <div className="space-y-3">
                {[
                  { label: 'RB1 Carry Share', value: team.avgRbShare, max: 100, color: 'bg-blue-500', style: team.rbStyle, highlight: pos === 'RB' },
                  { label: 'TE Target Share', value: team.avgTeShare, max: 40, color: 'bg-purple-500', style: team.teStyle, highlight: pos === 'TE' },
                  { label: 'WR1 Target Share', value: team.avgWr1Share, max: 40, color: 'bg-emerald-500', style: team.wr1Style, highlight: pos === 'WR' },
                ].map(({ label, value, max, color, style, highlight }) => (
                  <div key={label}>
                    <div className={`flex justify-between text-xs mb-1 ${highlight ? 'text-white' : ''}`}>
                      <span className={highlight ? 'font-semibold text-white' : 'text-slate-400'}>{label}</span>
                      <span className={highlight ? 'text-white font-bold' : 'text-slate-400'}>
                        {value?.toFixed(1)}% · <span className="text-slate-500">{style}</span>
                      </span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${highlight ? 'bg-nfl-border' : 'bg-nfl-dark'}`}>
                      <div className={`h-full rounded-full ${color} ${highlight ? 'opacity-100' : 'opacity-50'}`}
                           style={{ width: `${Math.min((value/max)*100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {team.notes && <p className="text-xs text-slate-500 mt-3 leading-relaxed">{team.notes}</p>}
            </div>
          )}

          {/* Draft value if available */}
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
                  {player.diff != null && (
                    <div className={`text-xs mt-1 ${player.diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {player.diff > 0 ? '+' : ''}{player.diff} pts vs market
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
