// Fantasy scoring + projection engine
// Calibrated against 2025 actual NFL stats

export const DEFAULT_SCORING = {
  passTd: 6, passYd: 0.04, passInt: -2, pass2pt: 2,
  rushTd: 6, rushYd: 0.1, rush2pt: 2,
  recTd: 6, recYd: 0.1, reception: 1,  // PPR
  rec2pt: 2,
}
export const STD_SCORING    = { ...DEFAULT_SCORING, reception: 0 }
export const HALF_PPR_SCORING = { ...DEFAULT_SCORING, reception: 0.5 }

// QB-specific rushing profiles (from 2025 actuals + slight projection uptick)
// Per-QB passing profile — ypa, td%, int% based on 2025 actuals + 2026 projection
// Attempts come from team pass volume tendency; efficiency is player-specific
const QB_PASS = {
  'Josh Allen':       { ypa: 8.1,  tdPct: 0.056, intPct: 0.012 },  // elite efficiency
  'Drake Maye':       { ypa: 8.5,  tdPct: 0.062, intPct: 0.013 },  // elite 2025, year-2 upside
  'Jalen Hurts':      { ypa: 7.1,  tdPct: 0.055, intPct: 0.014 },  // solid but not elite passer
  'Jayden Daniels':   { ypa: 7.6,  tdPct: 0.055, intPct: 0.012 },  // accurate, efficient
  'Joe Burrow':       { ypa: 7.8,  tdPct: 0.060, intPct: 0.011 },  // elite when healthy
  'Patrick Mahomes':  { ypa: 7.4,  tdPct: 0.050, intPct: 0.013 },  // volume + clutch, moderate ypa
  'Lamar Jackson':    { ypa: 7.2,  tdPct: 0.046, intPct: 0.013 },  // passing efficiency, rushing separate
  'Bo Nix':           { ypa: 7.0,  tdPct: 0.048, intPct: 0.017 },  // volume scheme, modest efficiency
  'Caleb Williams':   { ypa: 7.6,  tdPct: 0.054, intPct: 0.016 },  // improving, Ben Johnson boost
  'Jaxson Dart':      { ypa: 7.0,  tdPct: 0.046, intPct: 0.016 },  // partial 2025, upside
  'Cam Ward':         { ypa: 6.8,  tdPct: 0.038, intPct: 0.015 },  // 2025: 5.9ypa/15td rookie, Y2 Daboll improvement
  'Baker Mayfield':   { ypa: 6.9,  tdPct: 0.049, intPct: 0.015 },  // solid floor
  'Justin Herbert':   { ypa: 7.8,  tdPct: 0.056, intPct: 0.013 },  // efficient, McDaniel upside
  'Matthew Stafford': { ypa: 7.9,  tdPct: 0.072, intPct: 0.014 },  // elite TD rate when healthy
  'Jordan Love':      { ypa: 7.7,  tdPct: 0.053, intPct: 0.013 },  // bounce back candidate
  'Sam Darnold':      { ypa: 7.8,  tdPct: 0.052, intPct: 0.014 },  // surprisingly efficient 2025
  'Kyler Murray':     { ypa: 7.5,  tdPct: 0.052, intPct: 0.014 },
  'Jared Goff':       { ypa: 7.9,  tdPct: 0.059, intPct: 0.012 },  // 2025: 4564yds/34td, elite efficiency in McVay-style offense  // solid when healthy
  'Dak Prescott':     { ypa: 7.6,  tdPct: 0.058, intPct: 0.013 },  // volume + efficiency
  'Shedeur Sanders':  { ypa: 6.8,  tdPct: 0.044, intPct: 0.018 },  // rookie estimate
  'Tyler Shough':     { ypa: 6.6,  tdPct: 0.042, intPct: 0.018 },  // rookie estimate
  'Trevor Lawrence':  { ypa: 7.2,  tdPct: 0.052, intPct: 0.014 },  // 2025: 417 PPR real
  'Bryce Young':      { ypa: 6.8,  tdPct: 0.042, intPct: 0.018 },
  'default':          { ypa: 7.0,  tdPct: 0.047, intPct: 0.015 },
}

const QB_RUSH = {
  'Josh Allen':      { rushYds: 610, rushTds: 14.5 },  // BUF monster rusher
  'Jayden Daniels':  { rushYds: 450, rushTds: 6.5  },  // WAS
  'Jalen Hurts':     { rushYds: 440, rushTds: 8.5  },  // PHI
  'Caleb Williams':  { rushYds: 420, rushTds: 3.5  },  // CHI 2025: 383/3, year-2 uptick
  'Bo Nix':          { rushYds: 375, rushTds: 5.5  },  // DEN
  'Lamar Jackson':   { rushYds: 350, rushTds: 4.5  },  // BAL (injury-reduced 2025)
  'Sam Darnold':     { rushYds: 95,  rushTds: 0.5  },  // SEA 2025: 95 yds, pocket passer
  'Jaxson Dart':     { rushYds: 350, rushTds: 5.5  },  // NYG mobile - recalibrated
  'Drake Maye':      { rushYds: 475, rushTds: 4.5  },  // NE
  'Baker Mayfield':  { rushYds: 420, rushTds: 5.0  },  // TB 2025: 422/5 actual
  'Trevor Lawrence': { rushYds: 360, rushTds: 9.0  },  // JAX 2025: 359/9 actual
  'Patrick Mahomes': { rushYds: 420, rushTds: 5.0  },  // KC 2025: 422/5 actual
  'Bryce Young':     { rushYds: 220, rushTds: 2.0  },  // CAR
  'Joe Burrow':      { rushYds: 115, rushTds: 1.5  },  // CIN pocket passer
  'Kirk Cousins':    { rushYds: 120, rushTds: 1.0  },  // LV
  'Matthew Stafford':{ rushYds: 30,  rushTds: 0.5  },  // LAR pocket passer
  'Kyler Murray':    { rushYds: 480, rushTds: 5.0  },  // MIN
  'C.J. Stroud':     { rushYds: 360, rushTds: 2.5  },  // HOU
  'Jordan Love':     { rushYds: 210, rushTds: 0.5  },  // GB
  'Cam Ward':        { rushYds: 200, rushTds: 2.5  },  // TEN 2025: 159/2 rookie, Y2 improvement
  'Jared Goff':      { rushYds: 20,  rushTds: 0.0  },  // MIN pocket passer
  'Dak Prescott':    { rushYds: 180, rushTds: 2.0  },  // DAL 2025: 177/2 actual
  'Justin Herbert':  { rushYds: 380, rushTds: 1.5  },  // LAC 2025: 382/1 actual
  'default':         { rushYds: 280, rushTds: 3.5  },
}

// Projection constants calibrated against 2025 actuals
export const PROJECTION = {
  teamCarries: 430,
  teamPassAttempts: 570,
  wrYardsPerTarget: 9.5,
  wrCatchRate: 0.682,
  wrTdPerTarget: 0.057,
  rbYardsPerCarry: 4.65,
  rbTdPerCarry: 0.036,
  rbTargetRate: 0.155,
  rbYardsPerTarget: 8.2,
  rbCatchRate: 0.72,
  rbTdPerTarget: 0.038,
  teYardsPerTarget: 7.9,
  teCatchRate: 0.735,
  teTdPerTarget: 0.060,
  // QB passing efficiency
  qbYardsPerAttempt: 7.5,
  qbTdPerAttempt: 0.048,
  qbIntPerAttempt: 0.013,  // fixed: was 0.023 (too high)
  gamesPerSeason: 17,
}

// Year-2 leap and rookie discount factors
// Applied as a multiplier on top of scheme projections
const EXPERIENCE_MULT = {
  // 2nd year players (were rookies in 2025) - year-2 leap
  'Ashton Jeanty':          1.35,
  'Jaxson Dart':            1.15,  // QB Y2 leap less dramatic than RB
  'Omarion Hampton':        1.30,
  'Tetairoa McMillan':      1.28,
  'Tyler Warren':           1.28,
  'Cam Skattebo':           1.25,
  'Emeka Egbuka':           1.25,
  'Colston Loveland':       1.25,
  'Cam Ward':               1.25,
  'Luther Burden III':      1.22,
  'Harold Fannin Jr.':      1.22,
  'Oronde Gadsden II':      1.20,
  'Shedeur Sanders':        1.20,
  'Gunnar Helm':            1.18,
  'Jacory Croskey-Merritt': 1.15,
  'Bhayshul Tuten':         1.15,
  'Tyler Shough':           1.15,
  // 2026 true rookies - learning curve discount
  'Jeremiyah Love':         0.75,
  'Carnell Tate':           0.70,
}

export function calcPPR(stats, scoring = DEFAULT_SCORING) {
  return (
    (stats.passYds   || 0) * scoring.passYd   +
    (stats.passTds   || 0) * scoring.passTd   +
    (stats.ints      || 0) * scoring.passInt  +
    (stats.rushYds   || 0) * scoring.rushYd   +
    (stats.rushTds   || 0) * scoring.rushTd   +
    (stats.receptions|| 0) * scoring.reception+
    (stats.recYds    || 0) * scoring.recYd    +
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

  // Pass attempts: run-heavy teams throw less
  const passAtt = Math.round(P.teamPassAttempts * (1 + (65 - rbShare) / 220))

  if (pos === 'QB' && depth === 1) {
    const qbPass  = QB_PASS[player.player_name] || QB_PASS['default']
    const passYds = passAtt * qbPass.ypa
    const passTds = passAtt * qbPass.tdPct
    const ints    = passAtt * qbPass.intPct
    // Use QB-specific rushing profile
    const rushProfile = QB_RUSH[player.player_name] || QB_RUSH['default']
    const rushYds = rushProfile.rushYds
    const rushTds = rushProfile.rushTds
    const pts = calcPPR({ passYds, passTds, ints, rushYds, rushTds }, scoring)
    const stdPts = calcPPR({ passYds, passTds, ints, rushYds, rushTds }, { ...scoring, reception: 0 })
    return {
      passAtt: Math.round(passAtt), passYds: Math.round(passYds),
      passTds: +passTds.toFixed(1), ints: +ints.toFixed(1),
      rushYds: Math.round(rushYds), rushTds: +rushTds.toFixed(1),
      carries: null, tgts: null, receptions: null, recYds: null, recTds: null, targetShare: null,
      ppr: Math.round(pts), std: Math.round(stdPts),
      floor: Math.round(pts * 0.78), ceiling: Math.round(pts * 1.25),
      gpPPR: +(pts / P.gamesPerSeason).toFixed(1),
    }
  }

  if (pos === 'RB') {
    const split = depth === 1 ? rbShare / 100
      : depth === 2 ? (rbShare < 55 ? 0.30 : rbShare < 65 ? 0.20 : rbShare < 75 ? 0.11 : 0.05)
      : 0.03
    const tgtRate    = depth === 1 ? P.rbTargetRate : depth === 2 ? 0.065 : 0.018
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

// Apply experience adjustment to a projection result
export function applyExperience(playerName, proj) {
  const mult = EXPERIENCE_MULT[playerName]
  if (!mult || mult === 1) return proj
  const isLeap = mult > 1
  return {
    ...proj,
    ppr:     Math.round(proj.ppr     * mult),
    std:     Math.round(proj.std     * mult),
    floor:   Math.round(proj.floor   * mult),
    ceiling: Math.round(proj.ceiling * mult),
    gpPPR:   +(proj.gpPPR * mult).toFixed(1),
    carries:    proj.carries    ? Math.round(proj.carries    * mult) : null,
    rushYds:    proj.rushYds    ? Math.round(proj.rushYds    * mult) : null,
    rushTds:    proj.rushTds    ? +(proj.rushTds    * mult).toFixed(1) : null,
    tgts:       proj.tgts       ? Math.round(proj.tgts       * mult) : null,
    receptions: proj.receptions ? Math.round(proj.receptions * mult) : null,
    recYds:     proj.recYds     ? Math.round(proj.recYds     * mult) : null,
    recTds:     proj.recTds     ? +(proj.recTds     * mult).toFixed(1) : null,
    passYds:    proj.passYds    ? Math.round(proj.passYds    * mult) : null,
    passTds:    proj.passTds    ? +(proj.passTds    * mult).toFixed(1) : null,
    expMult: mult,
    expLabel: mult > 1 ? `Year-2 leap (+${Math.round((mult-1)*100)}%)` : `Rookie discount (-${Math.round((1-mult)*100)}%)`,
  }
}

export function getTier(pos, ppr) {
  const tiers = {
    QB:  [300, 370, 430],
    RB:  [160, 250, 340],
    WR:  [160, 250, 340],
    TE:  [110, 180, 260],
  }
  const [low, mid, high] = tiers[pos] || [150, 250, 350]
  if (ppr >= high) return { label:'Elite',   color:'text-emerald-400', bg:'bg-emerald-400/10 border-emerald-400/30' }
  if (ppr >= mid)  return { label:'Starter', color:'text-blue-400',    bg:'bg-blue-400/10 border-blue-400/30' }
  if (ppr >= low)  return { label:'Flex',    color:'text-amber-400',   bg:'bg-amber-400/10 border-amber-400/30' }
  return               { label:'Depth',   color:'text-slate-500',   bg:'bg-slate-500/10 border-slate-500/30' }
}
