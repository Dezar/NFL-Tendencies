import React from 'react'
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const LEAGUE = {
  teamCarries: 430,
  teamPassAttempts: 575,
  yardsPerCarry: 4.4,
  yardsPerTarget: 8.0,
  catchRate: 0.67,
  tdPerCarry: 0.043,
  tdPerTarget: 0.056,
}

function schemeExplain(player, team) {
  if (!team) return { lines: ['No scheme data available for this team.'], signals: [] }

  const pos = player.position
  const depth = player.depth_rank
  const lines = []
  const signals = []

  // Play caller context
  lines.push(`${team.playCaller} is the 2026 play-caller for ${team.fullName || team.team}.`)
  if (team.newCaller) {
    lines.push(`⚠️ First-time play-caller — no historical tendency data. Projections use league averages.`)
  } else if (team.rbSeasons >= 5) {
    lines.push(`Strong data confidence: ${team.rbSeasons} seasons of play-caller history in our system.`)
  } else if (team.rbSeasons >= 2) {
    lines.push(`Moderate data: ${team.rbSeasons} seasons of play-caller history.`)
  }

  if (pos === 'RB') {
    const rbShare = team.avgRbShare ?? 65
    lines.push(`${team.playCaller} historically gives RB1 an average of ${rbShare.toFixed(1)}% of team carries.`)
    if (rbShare >= 75) {
      signals.push({ text: 'Workhorse scheme', color: 'text-emerald-400' })
      if (depth === 1) lines.push(`With ~430 team carries, that projects to ~${Math.round(430 * rbShare/100)} carries for the RB1.`)
      if (depth === 1) lines.push(`This is a league-winner setup — true workhorse backs are rare and extremely valuable.`)
      if (depth === 2) lines.push(`RB2 in a workhorse scheme gets very few touches — limited fantasy value.`)
    } else if (rbShare >= 65) {
      signals.push({ text: 'Featured back scheme', color: 'text-blue-400' })
      if (depth === 1) lines.push(`Projects to ~${Math.round(430 * rbShare/100)} carries — a true featured back role.`)
      if (depth === 2) lines.push(`RB2 in a featured-back scheme gets spot duty — handle-dependent value.`)
    } else if (rbShare < 55) {
      signals.push({ text: 'True committee', color: 'text-red-400' })
      if (depth === 1) lines.push(`Only ~${Math.round(430 * rbShare/100)} projected carries — ${team.playCaller} spreads the ball.`)
      if (depth === 1) lines.push(`Committee RB1s rarely return top-12 value. Avoid paying up.`)
      if (depth === 2) lines.push(`RB2 in a committee scheme has real value — both backs are relevant.`)
    } else {
      signals.push({ text: 'Lean RB1 scheme', color: 'text-amber-400' })
      if (depth === 1) lines.push(`Moderate carry share — viable RB1 but not elite workload.`)
    }
  }

  if (pos === 'WR') {
    const wr1Share = team.avgWr1Share ?? 23
    const tgts = Math.round(575 * wr1Share/100)
    lines.push(`${team.playCaller} historically concentrates ${wr1Share.toFixed(1)}% of team targets to WR1.`)
    if (wr1Share >= 30) {
      signals.push({ text: 'WR1-dominant scheme', color: 'text-emerald-400' })
      if (depth === 1) lines.push(`That projects to ~${tgts} targets — alpha receiver usage.`)
      if (depth === 1) lines.push(`Top-5 WR ceiling in this scheme. Prioritize on draft day.`)
      if (depth === 2) lines.push(`WR2 in a WR1-dominant scheme has a suppressed ceiling.`)
    } else if (wr1Share >= 25) {
      signals.push({ text: 'Alpha-lean scheme', color: 'text-blue-400' })
      if (depth === 1) lines.push(`Projects to ~${tgts} targets — strong alpha role.`)
    } else if (wr1Share < 20) {
      signals.push({ text: 'Spread scheme', color: 'text-red-400' })
      if (depth === 1) lines.push(`Only ~${tgts} targets projected for WR1 — targets spread widely.`)
      if (depth === 2) lines.push(`WR2 in a spread scheme has genuine PPR value.`)
    } else {
      signals.push({ text: 'Balanced scheme', color: 'text-amber-400' })
      if (depth === 1) lines.push(`~${tgts} projected targets — reliable but not dominant.`)
    }
  }

  if (pos === 'TE') {
    const teShare = team.avgTeShare ?? 22
    const tgts = Math.round(575 * teShare/100 * 0.84)
    lines.push(`${team.playCaller} historically directs ${teShare.toFixed(1)}% of targets to TEs.`)
    if (teShare >= 30) {
      signals.push({ text: 'TE-heavy scheme', color: 'text-emerald-400' })
      if (depth === 1) lines.push(`TE1 projects to ~${tgts} targets — elite usage.`)
      if (depth === 1) lines.push(`Top-3 TE ceiling. One of the most valuable scheme fits in fantasy.`)
    } else if (teShare >= 25) {
      signals.push({ text: 'TE-friendly scheme', color: 'text-blue-400' })
      if (depth === 1) lines.push(`TE1 projects to ~${tgts} targets — above-average usage.`)
    } else if (teShare < 20) {
      signals.push({ text: 'TE-averse scheme', color: 'text-red-400' })
      if (depth === 1) lines.push(`Low TE usage — scheme suppresses ceiling regardless of talent.`)
    } else {
      signals.push({ text: 'Neutral TE scheme', color: 'text-amber-400' })
      if (depth === 1) lines.push(`Average TE usage — ~${tgts} projected targets.`)
    }
  }

  if (pos === 'QB') {
    lines.push(`Projections use team pass-rate tendency and league-average efficiency.`)
    lines.push(`QB value in this model reflects scheme volume, not individual talent adjustments.`)
  }

  return { lines, signals }
}

function StatLine({ label, value, sub, highlight }) {
  if (!value && value !== 0) return null
  return (
    <div className={`bg-nfl-dark rounded-xl p-4 text-center ${highlight ? 'border border-nfl-blue/30' : ''}`}>
      <div className={`text-2xl font-black ${highlight ? 'text-white' : 'text-slate-200'}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
      {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function PlayerModal({ player, team, onClose }) {
  if (!player) return null

  const { lines, signals } = schemeExplain(player, team)
  const pos = player.position

  // PPR tier
  const tiers = { QB:[260,310,360], RB:[110,170,230], WR:[120,175,235], TE:[75,125,175] }
  const [low, mid, high] = tiers[pos] || [100,150,200]
  const ppr = player.ppr || 0
  const tierLabel = ppr >= high ? 'Elite' : ppr >= mid ? 'Starter' : ppr >= low ? 'Flex' : 'Depth'
  const tierColor = ppr >= high ? 'text-emerald-400' : ppr >= mid ? 'text-blue-400' : ppr >= low ? 'text-amber-400' : 'text-slate-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-nfl-card border border-nfl-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-nfl-card border-b border-nfl-border px-6 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-white">{player.player_name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-bold bg-nfl-border/60 text-slate-300 px-2 py-0.5 rounded">{pos}</span>
              <span className="text-sm text-slate-400">{player.team} · Depth #{player.depth_rank}</span>
              {player.age && <span className="text-xs text-slate-500">Age {player.age}</span>}
              {player.years_exp != null && <span className="text-xs text-slate-500">Yr {player.years_exp}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors ml-4">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* PPR Score */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={`text-5xl font-black ${tierColor}`}>{ppr}</div>
              <div className="text-xs text-slate-400 mt-1">Projected PPR</div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Floor</span>
                <span className="text-amber-400 font-bold">{player.floor}</span>
              </div>
              <div className="w-full bg-nfl-dark rounded-full h-2">
                <div className="h-2 rounded-full bg-gradient-to-r from-amber-400 via-blue-400 to-emerald-400"
                     style={{width:`${Math.min(((ppr-player.floor)/(player.ceiling-player.floor))*100,100)}%`}} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Ceiling</span>
                <span className="text-blue-400 font-bold">{player.ceiling}</span>
              </div>
              <div className="text-center">
                <span className={`text-sm font-bold ${tierColor}`}>{tierLabel} Tier</span>
                <span className="text-slate-500 text-xs ml-2">· {(ppr/17).toFixed(1)} pts/game</span>
              </div>
            </div>
          </div>

          {/* Stat line */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Projected 2026 Stats</div>
            <div className="grid grid-cols-3 gap-3">
              {pos === 'RB' && <>
                <StatLine label="Carries" value={player.carries} highlight />
                <StatLine label="Rush Yards" value={player.rushYds} highlight />
                <StatLine label="Rush TDs" value={player.rushTds} />
                <StatLine label="Targets" value={player.tgts} />
                <StatLine label="Receptions" value={player.receptions} />
                <StatLine label="Rec Yards" value={player.recYds} />
              </>}
              {(pos === 'WR' || pos === 'TE') && <>
                <StatLine label="Target Share" value={player.targetShare != null ? player.targetShare+'%' : null} highlight />
                <StatLine label="Targets" value={player.tgts} highlight />
                <StatLine label="Receptions" value={player.receptions} highlight />
                <StatLine label="Rec Yards" value={player.recYds} highlight />
                <StatLine label="Rec TDs" value={player.recTds} />
                <StatLine label="Pts/Game" value={(ppr/17).toFixed(1)} />
              </>}
              {pos === 'QB' && <>
                <StatLine label="Pass Att" value={player.passAtt} />
                <StatLine label="Pass Yards" value={player.passYds} highlight />
                <StatLine label="Pass TDs" value={player.passTds} highlight />
                <StatLine label="INTs" value={player.ints} />
                <StatLine label="Rush Yards" value={player.rushYds} />
                <StatLine label="Pts/Game" value={(ppr/17).toFixed(1)} />
              </>}
            </div>
          </div>

          {/* Scheme signals */}
          {signals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {signals.map((s,i) => (
                <span key={i} className={`text-xs font-bold px-3 py-1 rounded-full bg-nfl-dark border border-nfl-border ${s.color}`}>
                  {s.text}
                </span>
              ))}
            </div>
          )}

          {/* Scheme explanation */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Why We Project This</div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>
              ))}
            </div>
          </div>

          {/* Team tendency bars */}
          {team && (
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">
                {team.playCaller} Historical Tendencies ({team.rbSeasons || 0} seasons)
              </div>
              <div className="space-y-3">
                {[
                  { label: 'RB1 Carry Share', value: team.avgRbShare, max: 100, color: 'bg-blue-500', style: team.rbStyle },
                  { label: 'TE Target Share', value: team.avgTeShare, max: 40, color: 'bg-purple-500', style: team.teStyle },
                  { label: 'WR1 Target Share', value: team.avgWr1Share, max: 40, color: 'bg-emerald-500', style: team.wr1Style },
                ].map(({ label, value, max, color, style }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{label}</span>
                      <span className="text-slate-300 font-semibold">{value?.toFixed(1)}% <span className="text-slate-500">· {style}</span></span>
                    </div>
                    <div className="h-1.5 bg-nfl-dark rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`}
                           style={{width:`${Math.min((value/max)*100,100)}%`}} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ESPN ADP if available */}
          {player.adp && (
            <div className="bg-nfl-dark rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 mb-1">ESPN ADP (12-team PPR)</div>
                <div className="text-2xl font-black text-white">#{player.adp}</div>
                <div className="text-xs text-slate-400">{player.espnRound}</div>
              </div>
              {player.signal && (
                <div className={`text-right`}>
                  <div className="text-xs text-slate-500 mb-1">Our Take</div>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full border ${player.signal.bg} ${player.signal.color}`}>
                    {player.signal.label}
                  </span>
                  <div className="text-xs text-slate-500 mt-1">
                    {player.diff > 0 ? `+${player.diff} pts above market` : `${player.diff} pts below market`}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
