import React, { useState } from 'react'
import data from '../data/tendencies.json'

const allPlayers = data.teams.flatMap(team =>
  (team.keyPlayers || []).map(p => ({
    ...p,
    team: team.team,
    playCaller: team.playCaller,
    newCaller: team.newCaller,
  }))
)

const green = allPlayers.filter(p => p.signal === 'green')
const red = allPlayers.filter(p => p.signal === 'red')
const unknown = allPlayers.filter(p => p.signal === 'yellow' && allPlayers.find(x => x.team === p.team)?.newCaller)

const POS_ORDER = { QB: 0, RB: 1, WR: 2, TE: 3 }

function sortByPos(players) {
  return [...players].sort((a, b) => {
    const posA = POS_ORDER[a.pos] ?? 9
    const posB = POS_ORDER[b.pos] ?? 9
    if (posA !== posB) return posA - posB
    return a.depth - b.depth
  })
}

function PlayerRow({ p, index }) {
  return (
    <tr className={`border-b border-nfl-border/40 ${index % 2 === 0 ? '' : 'bg-white/[0.015]'}`}>
      <td className="px-4 py-2.5 font-semibold text-white text-sm">{p.name}</td>
      <td className="px-4 py-2.5">
        <span className="text-xs font-bold bg-nfl-border/50 text-slate-300 px-1.5 py-0.5 rounded">{p.pos}</span>
      </td>
      <td className="px-4 py-2.5 text-slate-300 text-sm font-medium">{p.team}</td>
      <td className="px-4 py-2.5 text-slate-500 text-xs">#{p.depth}</td>
      <td className="px-4 py-2.5 text-slate-400 text-xs">
        {p.playCaller}
        {p.newCaller && <span className="ml-1 text-amber-400">(New)</span>}
      </td>
      <td className="px-4 py-2.5 text-slate-400 text-xs max-w-xs">{p.note}</td>
    </tr>
  )
}

function Section({ title, emoji, players, headerColor, emptyMsg }) {
  const sorted = sortByPos(players)
  const byPos = ['QB', 'RB', 'WR', 'TE'].map(pos => ({
    pos,
    players: sorted.filter(p => p.pos === pos)
  })).filter(g => g.players.length > 0)

  return (
    <div className="mb-10">
      <div className={`flex items-center gap-2 mb-4`}>
        <span className="text-2xl">{emoji}</span>
        <h2 className={`text-lg font-bold ${headerColor}`}>{title}</h2>
        <span className="text-sm text-slate-500 font-medium">({players.length} players)</span>
      </div>

      {players.length === 0 ? (
        <div className="text-slate-500 text-sm py-4">{emptyMsg}</div>
      ) : (
        <div className="bg-nfl-card border border-nfl-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-nfl-border">
                <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium uppercase tracking-wide">Player</th>
                <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium uppercase tracking-wide">Pos</th>
                <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium uppercase tracking-wide">Team</th>
                <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium uppercase tracking-wide">Depth</th>
                <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium uppercase tracking-wide">Play Caller</th>
                <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium uppercase tracking-wide">Why</th>
              </tr>
            </thead>
            <tbody>
              {byPos.map(({ pos, players: posPlayers }) => (
                <React.Fragment key={pos}>
                  <tr className="bg-nfl-dark/60">
                    <td colSpan={6} className="px-4 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest">{pos}</td>
                  </tr>
                  {posPlayers.map((p, i) => <PlayerRow key={`${p.team}-${p.name}`} p={p} index={i} />)}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function CheatSheet() {
  const [posFilter, setPosFilter] = useState('ALL')

  const filterByPos = (players) =>
    posFilter === 'ALL' ? players : players.filter(p => p.pos === posFilter)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">2026 Draft Cheat Sheet</h1>
        <p className="text-slate-400 text-sm">Scheme-based flags for every relevant player. Use this on draft day.</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-nfl-card border border-emerald-400/20 rounded-xl p-5">
          <div className="text-3xl font-black text-emerald-400">{green.length}</div>
          <div className="text-sm text-slate-400 mt-1">🔥 Green Flags</div>
          <div className="text-xs text-slate-500 mt-0.5">Strong scheme fit</div>
        </div>
        <div className="bg-nfl-card border border-red-400/20 rounded-xl p-5">
          <div className="text-3xl font-black text-red-400">{red.length}</div>
          <div className="text-sm text-slate-400 mt-1">❌ Red Flags</div>
          <div className="text-xs text-slate-500 mt-0.5">Scheme works against them</div>
        </div>
        <div className="bg-nfl-card border border-amber-400/20 rounded-xl p-5">
          <div className="text-3xl font-black text-amber-400">{data.teams.filter(t => t.newCaller).length}</div>
          <div className="text-sm text-slate-400 mt-1">❓ New Callers</div>
          <div className="text-xs text-slate-500 mt-0.5">Teams with unknown schemes</div>
        </div>
      </div>

      {/* Position filter */}
      <div className="flex gap-2 mb-8">
        {['ALL', 'QB', 'RB', 'WR', 'TE'].map(pos => (
          <button
            key={pos}
            onClick={() => setPosFilter(pos)}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
              posFilter === pos ? 'bg-nfl-blue text-white' : 'bg-nfl-card border border-nfl-border text-slate-400 hover:text-white'
            }`}
          >
            {pos}
          </button>
        ))}
      </div>

      <Section
        title="Green Flags — Target at Value"
        emoji="🔥"
        players={filterByPos(green)}
        headerColor="text-emerald-400"
        emptyMsg="No green flags for this position."
      />

      <Section
        title="Red Flags — Avoid or Discount"
        emoji="❌"
        players={filterByPos(red)}
        headerColor="text-red-400"
        emptyMsg="No red flags for this position."
      />

      {/* New callers box */}
      <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-6 mt-4">
        <h2 className="text-lg font-bold text-amber-400 mb-2">❓ New Play-Callers — Buy the Uncertainty</h2>
        <p className="text-sm text-slate-400 mb-4">
          These teams have first-time or newly installed play-callers with no data in our system.
          Early-season usage will tell the story — monitor weeks 1–4 before committing.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {data.teams.filter(t => t.newCaller).map(t => (
            <div key={t.team} className="bg-nfl-card border border-nfl-border rounded-lg p-3">
              <div className="font-bold text-white text-sm">{t.team}</div>
              <div className="text-xs text-slate-400 mt-0.5">{t.playCaller}</div>
              <div className="text-xs text-amber-400 mt-1">First-time caller</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
