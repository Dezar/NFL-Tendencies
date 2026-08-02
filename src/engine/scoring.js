// Fantasy scoring settings and projection engine
// Calibrated against 2025 actual NFL stats

export const DEFAULT_SCORING = {
  passTd: 4, passYd: 0.04, passInt: -2, pass2pt: 2,
  rushTd: 6, rushYd: 0.1, rush2pt: 2,
  recTd: 6, recYd: 0.1, reception: 1,  // PPR
  rec2pt: 2,
}
export const STD_SCORING = { ...DEFAULT_SCORING, reception: 0 }
export const HALF_PPR_SCORING = { ...DEFAULT_SCORING, reception: 0.5 }

// Projection constants calibrated against 2025 actuals
export const PROJECTION = {
  teamCarries: 430,
  teamPassAttempts: 570,
  // WR - from 2025 actuals (n=9, min 80 targets)
  wrYardsPerTarget: 9.5,
  wrCatchRate: 0.682,
  wrTdPerTarget: 0.057,
  // RB - from 2025 actuals (n=19, min 150 carries)
  rbYardsPerCarry: 4.65,
  rbTdPerCarry: 0.036,
  rbTargetRate: 0.155,   // RB1 targets as share of team pass attempts
  rbYardsPerTarget: 8.2,
  rbCatchRate: 0.72,
  rbTdPerTarget: 0.038,
  // TE - calibrated from 2024+2025 averages
  teYardsPerTarget: 7.9,
  teCatchRate: 0.735,
  teTdPerTarget: 0.060,
  // QB
  qbYardsPerAttempt: 7.5,
  qbTdPerAttempt: 0.050,
  qbIntPerAttempt: 0.023,
  qbRushYards: 300,      // avg includes mobile QBs
  qbRushTds: 4.0,
  gamesPerSeason: 17,
}

export function calcPPR(stats, scoring = DEFAULT_SCORING) {
  return (
    (stats.passYds   || 0) * scoring.passYd +
    (stats.passTds   || 0) * scoring.passTd +
    (stats.ints      || 0) * scoring.passInt +
    (stats.rushYds   || 0) * scoring.rushYd +
    (stats.rushTds   || 0) * scoring.rushTd +
    (stats.receptions|| 0) * scoring.reception +
    (stats.recYds    || 0) * scoring.recYd +
    (stats.recTds    || 0) * scoring.recTd
  )
}

export function projectPlayer(player, team, scoring = DEFAULT_SCORING) {
  const pos = player.position
  const depth = player.depth_rank
  const P = PROJECTION
  const rbShare  = team.avgRbShare  ?? 65
  const teShare  = team.avgTeShare  ?? 22
  const wr1Share = team.avgWr1Share ?? 23
  const newCaller = team.newCaller ?? false

  // Pass attempts: run-heavy teams throw less
  const passAtt = Math.round(P.teamPassAttempts * (1 + (65 - rbShare) / 220))

  if (pos === 'QB' && depth === 1) {
    const passYds = passAtt * P.qbYardsPerAttempt
    const passTds = passAtt * P.qbTdPerAttempt
    const ints    = passAtt * P.qbIntPerAttempt
    const rushYds = P.qbRushYards
    const rushTds = P.qbRushTds
    const pts = calcPPR({ passYds, passTds, ints, rushYds, rushTds }, scoring)
    return {
      passAtt: Math.round(passAtt), passYds: Math.round(passYds),
      passTds: +passTds.toFixed(1), ints: +ints.toFixed(1),
      rushYds: Math.round(rushYds), rushTds: +rushTds.toFixed(1),
      carries: null, tgts: null, receptions: null, recYds: null, recTds: null, targetShare: null,
      ppr: Math.round(pts),
      std: Math.round(calcPPR({ passYds, passTds, ints, rushYds, rushTds }, { ...scoring, reception: 0 })),
      floor: Math.round(pts * 0.78), ceiling: Math.round(pts * 1.25),
      gpPPR: +(pts / P.gamesPerSeason).toFixed(1),
    }
  }

  if (pos === 'RB') {
    const split = depth === 1 ? rbShare / 100
      : depth === 2 ? (rbShare < 55 ? 0.30 : rbShare < 65 ? 0.20 : rbShare < 75 ? 0.11 : 0.05)
      : 0.03
    const tgtRate = depth === 1 ? P.rbTargetRate : depth === 2 ? 0.065 : 0.018
    const carries    = P.teamCarries * split
    const rushYds    = carries * P.rbYardsPerCarry
    const rushTds    = carries * P.rbTdPerCarry
    const tgts       = passAtt * tgtRate
    const receptions = tgts * P.rbCatchRate
    const recYds     = tgts * P.rbYardsPerTarget
    const recTds     = tgts * P.rbTdPerTarget
    const pts = calcPPR({ rushYds, rushTds, receptions, recYds, recTds }, scoring)
    return {
      carries: Math.round(carries), rushYds: Math.round(rushYds), rushTds: +rushTds.toFixed(1),
      tgts: Math.round(tgts), receptions: Math.round(receptions), recYds: Math.round(recYds), recTds: +recTds.toFixed(1),
      targetShare: +(tgtRate * 100).toFixed(1),
      passAtt: null, passYds: null, passTds: null, ints: null,
      ppr: Math.round(pts),
      std: Math.round(calcPPR({ rushYds, rushTds, receptions, recYds, recTds }, { ...scoring, reception: 0 })),
      floor: Math.round(pts * 0.70), ceiling: Math.round(pts * 1.40),
      gpPPR: +(pts / P.gamesPerSeason).toFixed(1),
    }
  }

  if (pos === 'WR') {
    const shareMap   = { 1: wr1Share, 2: wr1Share * 0.55, 3: wr1Share * 0.32 }
    const tgtShareP  = shareMap[depth] ?? wr1Share * 0.18
    const tgts       = passAtt * (tgtShareP / 100)
    const receptions = tgts * P.wrCatchRate
    const recYds     = tgts * P.wrYardsPerTarget
    const recTds     = tgts * P.wrTdPerTarget
    const pts = calcPPR({ receptions, recYds, recTds }, scoring)
    return {
      carries: null, rushYds: null, rushTds: null, passAtt: null, passYds: null, passTds: null, ints: null,
      tgts: Math.round(tgts), receptions: Math.round(receptions), recYds: Math.round(recYds), recTds: +recTds.toFixed(1),
      targetShare: +tgtShareP.toFixed(1),
      ppr: Math.round(pts),
      std: Math.round(calcPPR({ receptions, recYds, recTds }, { ...scoring, reception: 0 })),
      floor: Math.round(pts * 0.68), ceiling: Math.round(pts * 1.45),
      gpPPR: +(pts / P.gamesPerSeason).toFixed(1),
    }
  }

  if (pos === 'TE') {
    const depthSplit = depth === 1 ? 0.84 : depth === 2 ? 0.13 : 0.03
    const tgts       = passAtt * (teShare / 100) * depthSplit
    const receptions = tgts * P.teCatchRate
    const recYds     = tgts * P.teYardsPerTarget
    const recTds     = tgts * P.teTdPerTarget
    const pts = calcPPR({ receptions, recYds, recTds }, scoring)
    return {
      carries: null, rushYds: null, rushTds: null, passAtt: null, passYds: null, passTds: null, ints: null,
      tgts: Math.round(tgts), receptions: Math.round(receptions), recYds: Math.round(recYds), recTds: +recTds.toFixed(1),
      targetShare: +(teShare * depthSplit).toFixed(1),
      ppr: Math.round(pts),
      std: Math.round(calcPPR({ receptions, recYds, recTds }, { ...scoring, reception: 0 })),
      floor: Math.round(pts * 0.66), ceiling: Math.round(pts * 1.42),
      gpPPR: +(pts / P.gamesPerSeason).toFixed(1),
    }
  }

  return { ppr: 0, std: 0, floor: 0, ceiling: 0, gpPPR: 0 }
}

export function getTier(pos, ppr) {
  // Tiers calibrated against 2025 actual scoring ranges
  const tiers = {
    QB:  [300, 370, 430],
    RB:  [160, 250, 340],
    WR:  [160, 250, 340],
    TE:  [110, 180, 260],
  }
  const [low, mid, high] = tiers[pos] || [150, 250, 350]
  if (ppr >= high) return { label: 'Elite',   color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30' }
  if (ppr >= mid)  return { label: 'Starter', color: 'text-blue-400',    bg: 'bg-blue-400/10 border-blue-400/30' }
  if (ppr >= low)  return { label: 'Flex',    color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/30' }
  return                  { label: 'Depth',   color: 'text-slate-500',   bg: 'bg-slate-500/10 border-slate-500/30' }
}
