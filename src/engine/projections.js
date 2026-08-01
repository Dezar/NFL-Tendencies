/**
 * NFL Tendency Engine — Fantasy Projection Calculator
 * All math runs client-side. Inputs are coach tendencies + roster depth.
 * Outputs are projected fantasy points with PPR and standard scoring.
 */

// League-average assumptions for 2026
const LEAGUE = {
  teamCarries: 420,        // avg rushing attempts per team per season
  teamPassAttempts: 560,   // avg pass attempts per team per season
  yardsPerCarry: 4.3,
  yardsPerTarget: 7.8,
  tdPerCarry: 0.042,       // TDs per rushing attempt (league avg)
  tdPerTarget: 0.055,      // TDs per target (league avg)
  catchRate: 0.68,         // league avg catch rate
}

// PPR scoring
const SCORING = {
  rushYd: 0.1,
  recYd: 0.1,
  rushTd: 6,
  recTd: 6,
  reception: 1,   // PPR
  passTd: 4,
  passYd: 0.04,
  passInt: -2,
}

/**
 * Project RB fantasy points
 * @param {object} player - { depthRank, yearsExp }
 * @param {object} coach - { avgRbShare, rbSeasons }
 * @param {object} overrides - user slider values
 */
export function projectRB(player, coach, overrides = {}) {
  const rbShare = overrides.rbShare ?? coach.avgRbShare ?? 65
  const teamCarries = overrides.teamCarries ?? LEAGUE.teamCarries
  const targetShare = overrides.rbTargetShare ?? getRbTargetShare(player.depthRank, coach)
  const teamTargets = overrides.teamPassAttempts ?? LEAGUE.teamPassAttempts

  // Depth chart split
  const depthSplit = getDepthSplit(player.depthRank, rbShare, 'RB')

  const carries = (rbShare / 100) * teamCarries * depthSplit
  const targets = (targetShare / 100) * teamTargets

  const rushYds = carries * LEAGUE.yardsPerCarry
  const rushTds = carries * LEAGUE.tdPerCarry
  const receptions = targets * LEAGUE.catchRate
  const recYds = targets * LEAGUE.yardsPerTarget
  const recTds = targets * LEAGUE.tdPerTarget

  const ppr = (rushYds * SCORING.rushYd) +
               (rushTds * SCORING.rushTd) +
               (receptions * SCORING.reception) +
               (recYds * SCORING.recYd) +
               (recTds * SCORING.recTd)

  const std = ppr - (receptions * SCORING.reception)

  return {
    carries: Math.round(carries),
    targets: Math.round(targets),
    rushYds: Math.round(rushYds),
    rushTds: parseFloat(rushTds.toFixed(1)),
    receptions: Math.round(receptions),
    recYds: Math.round(recYds),
    recTds: parseFloat(recTds.toFixed(1)),
    ppr: Math.round(ppr),
    std: Math.round(std),
    floor: Math.round(ppr * 0.75),
    ceiling: Math.round(ppr * 1.35),
  }
}

/**
 * Project WR fantasy points
 */
export function projectWR(player, coach, overrides = {}) {
  const wr1Share = overrides.wr1Share ?? coach.avgWr1Share ?? 23
  const teamTargets = overrides.teamPassAttempts ?? LEAGUE.teamPassAttempts

  const targetShare = getWrTargetShare(player.depthRank, wr1Share, coach)
  const targets = (targetShare / 100) * teamTargets
  const receptions = targets * LEAGUE.catchRate
  const recYds = targets * LEAGUE.yardsPerTarget
  const recTds = targets * LEAGUE.tdPerTarget

  const ppr = (receptions * SCORING.reception) +
               (recYds * SCORING.recYd) +
               (recTds * SCORING.recTd)

  const std = ppr - (receptions * SCORING.reception)

  return {
    targets: Math.round(targets),
    receptions: Math.round(receptions),
    recYds: Math.round(recYds),
    recTds: parseFloat(recTds.toFixed(1)),
    targetShare: parseFloat(targetShare.toFixed(1)),
    ppr: Math.round(ppr),
    std: Math.round(std),
    floor: Math.round(ppr * 0.72),
    ceiling: Math.round(ppr * 1.40),
  }
}

/**
 * Project TE fantasy points
 */
export function projectTE(player, coach, overrides = {}) {
  const teShare = overrides.teShare ?? coach.avgTeShare ?? 22
  const teamTargets = overrides.teamPassAttempts ?? LEAGUE.teamPassAttempts

  const depthSplit = player.depthRank === 1 ? 0.85 : player.depthRank === 2 ? 0.12 : 0.03
  const targets = (teShare / 100) * teamTargets * depthSplit
  const receptions = targets * (LEAGUE.catchRate + 0.04) // TEs catch slightly higher %
  const recYds = targets * (LEAGUE.yardsPerTarget - 1.2) // TEs gain fewer YAC
  const recTds = targets * (LEAGUE.tdPerTarget + 0.01)   // TEs score slightly more per target

  const ppr = (receptions * SCORING.reception) +
               (recYds * SCORING.recYd) +
               (recTds * SCORING.recTd)

  const std = ppr - (receptions * SCORING.reception)

  return {
    targets: Math.round(targets),
    receptions: Math.round(receptions),
    recYds: Math.round(recYds),
    recTds: parseFloat(recTds.toFixed(1)),
    targetShare: parseFloat((teShare * depthSplit).toFixed(1)),
    ppr: Math.round(ppr),
    std: Math.round(std),
    floor: Math.round(ppr * 0.70),
    ceiling: Math.round(ppr * 1.38),
  }
}

/**
 * Project QB fantasy points
 */
export function projectQB(player, coach, overrides = {}) {
  if (player.depthRank !== 1) return { ppr: 0, std: 0, floor: 0, ceiling: 0 }

  const passAttempts = overrides.teamPassAttempts ?? LEAGUE.teamPassAttempts
  const passYds = passAttempts * 7.4
  const passTds = passAttempts * 0.048
  const ints = passAttempts * 0.024
  const rushYds = 280  // avg QB rush yards
  const rushTds = 3.5

  const pts = (passYds * SCORING.passYd) +
               (passTds * SCORING.passTd) +
               (ints * SCORING.passInt) +
               (rushYds * SCORING.rushYd) +
               (rushTds * SCORING.rushTd)

  return {
    passAttempts: Math.round(passAttempts),
    passYds: Math.round(passYds),
    passTds: parseFloat(passTds.toFixed(1)),
    rushYds: Math.round(rushYds),
    ppr: Math.round(pts),
    std: Math.round(pts),
    floor: Math.round(pts * 0.80),
    ceiling: Math.round(pts * 1.20),
  }
}

// --- Helpers ---

function getDepthSplit(depthRank, rb1Share, pos) {
  // How much of RB1's projected share does this depth slot get
  if (depthRank === 1) return 1.0
  if (depthRank === 2) {
    // In committee schemes, RB2 gets more
    if (rb1Share < 55) return 0.65  // true committee
    if (rb1Share < 65) return 0.40
    if (rb1Share < 75) return 0.22
    return 0.12  // workhorse — RB2 barely touches ball
  }
  return 0.05
}

function getRbTargetShare(depthRank, coach) {
  // RBs get 18-22% of targets on average; depth affects this
  if (depthRank === 1) return 18
  if (depthRank === 2) return 8
  return 2
}

function getWrTargetShare(depthRank, wr1Share, coach) {
  // WR1 gets wr1Share% of ALL targets (not just WR targets)
  // WR2 gets roughly half, WR3 roughly a third
  if (depthRank === 1) return wr1Share
  if (depthRank === 2) return wr1Share * 0.55
  if (depthRank === 3) return wr1Share * 0.32
  return wr1Share * 0.15
}

/**
 * Run projections for all players on a team
 */
export function projectTeam(players, coach, overrides = {}) {
  return players.map(p => {
    let proj = {}
    if (p.position === 'RB') proj = projectRB(p, coach, overrides)
    else if (p.position === 'WR') proj = projectWR(p, coach, overrides)
    else if (p.position === 'TE') proj = projectTE(p, coach, overrides)
    else if (p.position === 'QB') proj = projectQB(p, coach, overrides)
    return { ...p, ...proj }
  })
}

/**
 * Signal from projected PPR points
 */
export function getFantasyTier(pos, ppr) {
  const tiers = {
    QB:  [280, 320, 360],
    RB:  [120, 180, 240],
    WR:  [130, 185, 240],
    TE:  [80,  130, 180],
  }
  const [low, mid, high] = tiers[pos] || [100, 150, 200]
  if (ppr >= high) return { label: 'Elite', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30' }
  if (ppr >= mid)  return { label: 'Starter', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' }
  if (ppr >= low)  return { label: 'Flex', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30' }
  return { label: 'Depth', color: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-400/30' }
}
