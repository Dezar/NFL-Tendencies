// Default PPR scoring settings
// These match standard ESPN PPR league settings
export const DEFAULT_SCORING = {
  // Passing
  passTd: 4,
  passYd: 0.04,       // 1pt per 25 yds
  passInt: -2,
  pass2pt: 2,
  // Rushing
  rushTd: 6,
  rushYd: 0.1,        // 1pt per 10 yds
  rush2pt: 2,
  // Receiving
  recTd: 6,
  recYd: 0.1,         // 1pt per 10 yds
  reception: 1,       // PPR
  rec2pt: 2,
}

// Standard (non-PPR)
export const STD_SCORING = {
  ...DEFAULT_SCORING,
  reception: 0,
}

// Half PPR
export const HALF_PPR_SCORING = {
  ...DEFAULT_SCORING,
  reception: 0.5,
}

// Projection constants calibrated against 2024 actual stats
export const PROJECTION = {
  // Team volume
  teamCarries: 430,
  teamPassAttempts: 570,

  // WR efficiency (from 2024 actuals, min 80 targets)
  wrYardsPerTarget: 8.2,
  wrCatchRate: 0.655,
  wrTdPerTarget: 0.053,

  // RB efficiency
  rbYardsPerCarry: 4.4,
  rbTdPerCarry: 0.034,
  rbYardsPerTarget: 8.5,
  rbCatchRate: 0.72,
  rbTdPerTarget: 0.040,

  // TE efficiency
  teYardsPerTarget: 7.7,
  teCatchRate: 0.735,
  teTdPerTarget: 0.049,

  // QB efficiency
  qbYardsPerAttempt: 7.4,
  qbTdPerAttempt: 0.048,
  qbIntPerAttempt: 0.024,
  qbRushYards: 280,
  qbRushTds: 3.5,

  gamesPerSeason: 17,
}

export function calcPPR(stats, scoring = DEFAULT_SCORING) {
  return (
    (stats.passYds || 0) * scoring.passYd +
    (stats.passTds || 0) * scoring.passTd +
    (stats.ints || 0) * scoring.passInt +
    (stats.rushYds || 0) * scoring.rushYd +
    (stats.rushTds || 0) * scoring.rushTd +
    (stats.receptions || 0) * scoring.reception +
    (stats.recYds || 0) * scoring.recYd +
    (stats.recTds || 0) * scoring.recTd
  )
}

export function projectPlayer(player, team, scoring = DEFAULT_SCORING) {
  const pos = player.position
  const depth = player.depth_rank
  const P = PROJECTION

  const rbShare = team.avgRbShare ?? 65
  const teShare = team.avgTeShare ?? 22
  const wr1Share = team.avgWr1Share ?? 23

  // Pass attempts adjust for run-heavy vs pass-heavy teams
  const passAtt = team.avgRbShare
    ? Math.round(P.teamPassAttempts * (1 + (65 - team.avgRbShare) / 200))
    : P.teamPassAttempts

  if (pos === 'QB' && depth === 1) {
    const passYds = passAtt * P.qbYardsPerAttempt
    const passTds = passAtt * P.qbTdPerAttempt
    const ints = passAtt * P.qbIntPerAttempt
    const pts = calcPPR({ passYds, passTds, ints, rushYds: P.qbRushYards, rushTds: P.qbRushTds }, scoring)
    return {
      passAtt: Math.round(passAtt), passYds: Math.round(passYds),
      passTds: +passTds.toFixed(1), ints: +ints.toFixed(1),
      rushYds: Math.round(P.qbRushYards), rushTds: +P.qbRushTds.toFixed(1),
      carries: null, tgts: null, receptions: null, recYds: null, recTds: null, targetShare: null,
      ppr: Math.round(pts), std: Math.round(calcPPR({ passYds, passTds, ints, rushYds: P.qbRushYards, rushTds: P.qbRushTds }, { ...scoring, reception: 0 })),
      floor: Math.round(pts * 0.80), ceiling: Math.round(pts * 1.22),
      gpPPR: +(pts / P.gamesPerSeason).toFixed(1),
    }
  }

  if (pos === 'RB') {
    const split = depth === 1 ? rbShare / 100
      : depth === 2 ? (rbShare < 55 ? 0.28 : rbShare < 65 ? 0.18 : rbShare < 75 ? 0.10 : 0.05)
      : 0.03
    const tgtPct = depth === 1 ? 0.16 : depth === 2 ? 0.07 : 0.02
    const carries = P.teamCarries * split
    const rushYds = carries * P.rbYardsPerCarry
    const rushTds = carries * P.rbTdPerCarry
    const tgts = passAtt * tgtPct
    const receptions = tgts * P.rbCatchRate
    const recYds = tgts * P.rbYardsPerTarget
    const recTds = tgts * P.rbTdPerTarget
    const pts = calcPPR({ rushYds, rushTds, receptions, recYds, recTds }, scoring)
    const stdPts = calcPPR({ rushYds, rushTds, receptions, recYds, recTds }, { ...scoring, reception: 0 })
    return {
      carries: Math.round(carries), rushYds: Math.round(rushYds), rushTds: +rushTds.toFixed(1),
      tgts: Math.round(tgts), receptions: Math.round(receptions), recYds: Math.round(recYds), recTds: +recTds.toFixed(1),
      targetShare: +(tgtPct * 100).toFixed(1),
      passAtt: null, passYds: null, passTds: null, ints: null,
      ppr: Math.round(pts), std: Math.round(stdPts),
      floor: Math.round(pts * 0.72), ceiling: Math.round(pts * 1.38),
      gpPPR: +(pts / P.gamesPerSeason).toFixed(1),
    }
  }

  if (pos === 'WR') {
    const shareMap = { 1: wr1Share, 2: wr1Share * 0.55, 3: wr1Share * 0.32 }
    const tgtShareP = shareMap[depth] ?? wr1Share * 0.18
    const tgts = passAtt * (tgtShareP / 100)
    const receptions = tgts * P.wrCatchRate
    const recYds = tgts * P.wrYardsPerTarget
    const recTds = tgts * P.wrTdPerTarget
    const pts = calcPPR({ receptions, recYds, recTds }, scoring)
    const stdPts = calcPPR({ receptions, recYds, recTds }, { ...scoring, reception: 0 })
    return {
      carries: null, rushYds: null, rushTds: null, passAtt: null, passYds: null, passTds: null, ints: null,
      tgts: Math.round(tgts), receptions: Math.round(receptions), recYds: Math.round(recYds), recTds: +recTds.toFixed(1),
      targetShare: +tgtShareP.toFixed(1),
      ppr: Math.round(pts), std: Math.round(stdPts),
      floor: Math.round(pts * 0.70), ceiling: Math.round(pts * 1.42),
      gpPPR: +(pts / P.gamesPerSeason).toFixed(1),
    }
  }

  if (pos === 'TE') {
    const depthSplit = depth === 1 ? 0.84 : depth === 2 ? 0.13 : 0.03
    const tgts = passAtt * (teShare / 100) * depthSplit
    const receptions = tgts * P.teCatchRate
    const recYds = tgts * P.teYardsPerTarget
    const recTds = tgts * P.teTdPerTarget
    const pts = calcPPR({ receptions, recYds, recTds }, scoring)
    const stdPts = calcPPR({ receptions, recYds, recTds }, { ...scoring, reception: 0 })
    return {
      carries: null, rushYds: null, rushTds: null, passAtt: null, passYds: null, passTds: null, ints: null,
      tgts: Math.round(tgts), receptions: Math.round(receptions), recYds: Math.round(recYds), recTds: +recTds.toFixed(1),
      targetShare: +(teShare * depthSplit).toFixed(1),
      ppr: Math.round(pts), std: Math.round(stdPts),
      floor: Math.round(pts * 0.68), ceiling: Math.round(pts * 1.40),
      gpPPR: +(pts / P.gamesPerSeason).toFixed(1),
    }
  }

  return { ppr: 0, std: 0, floor: 0, ceiling: 0, gpPPR: 0 }
}

export function getTier(pos, ppr) {
  const tiers = { QB: [260, 310, 360], RB: [150, 230, 320], WR: [150, 230, 320], TE: [100, 160, 220] }
  const [low, mid, high] = tiers[pos] || [100, 150, 200]
  if (ppr >= high) return { label: 'Elite', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30' }
  if (ppr >= mid)  return { label: 'Starter', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' }
  if (ppr >= low)  return { label: 'Flex', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30' }
  return { label: 'Depth', color: 'text-slate-500', bg: 'bg-slate-500/10 border-slate-500/30' }
}
