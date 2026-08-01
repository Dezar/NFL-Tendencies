import React, { useState } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import data from '../data/tendencies.json'

const coaches = data.coachTendencies
const teams2026 = data.teams

function getTeam(coachName) {
  return teams2026.find(t => t.playCaller === coachName)
}

function ScoreBadge({ value, thresholds, labels }) {
  // thresholds: [low, mid, high] — labels: [red, yellow, green]
  const color = value >= thresholds[1] ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
    : value >= thresholds[0] ? 'text-amber-400 bg-amber-400/10 border-amber-400/30'
    : 'text-red-400 bg-red-400/10 border-red-400/30'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${color}`}>
      {value != null ? `${value.toFixed(1)}%` : 'N/A'}
    </span>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-nfl-card border border-nfl-border rounded-lg px-3 py-2 text-xs text-white">
        <div className="font-semibold mb-1">{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value?.toFixed(1)}%</div>
        ))}
      </div>
    )
  }
  return null
}

export default function Coaches() {
  const [selected, setSelected] = useState(coaches[0]?.coach || '')
  const [compareWith, setCompareWith] = useState('')

  const coach = coaches.find(c => c.coach === selected)
  const comp = coaches.find(c => c.coach === compareWith)
  const team = getTeam(selected)

  const radarData = coach ? [
    { metric: 'RB Share', value: coach.avgRbShare || 0, comp: comp?.avgRbShare || 0 },
    { metric: 'TE Share', value: (coach.avgTeShare || 0) * 2, comp: (comp?.avgTeShare || 0) * 2 },
    { metric: 'WR1 Share', value: (coach.avgWr1Share || 0) * 2.5, comp: (comp?.avgWr1Share || 0) * 2.5 },
  ] : []

  const barData = coaches
    .filter(c => c.avgRbShare != null)
    .sort((a, b) => b.avgRbShare - a.avgRbShare)
    .map(c => ({
      name: c.coach.split(' ').pop(),
      fullName: c.coach,
      rb: c.avgRbShare,
      te: c.avgTeShare,
      wr: c.avgWr1Share,
    }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Coach Tendency Fingerprints</h1>
        <p className="text-slate-400 text-sm">Historical scheme data for every 2026 play-caller with data in our system.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coach list */}
        <div className="bg-nfl-card border border-nfl-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-nfl-border">
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Select Coach</div>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {coaches.map(c => {
              const t = getTeam(c.coach)
              return (
                <button
                  key={c.coach}
                  onClick={() => setSelected(c.coach)}
                  className={`w-full text-left px-4 py-3 border-b border-nfl-border/50 hover:bg-white/5 transition-all ${
                    selected === c.coach ? 'bg-nfl-blue/10 border-l-2 border-l-nfl-blue' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">{c.coach}</div>
                      <div className="text-xs text-slate-400">{t ? t.team : 'N/A'} · {c.seasons} season{c.seasons !== 1 ? 's' : ''} data</div>
                    </div>
                    {c.avgRbShare == null && (
                      <span className="text-xs text-amber-400">New</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2 space-y-4">
          {coach && (
            <>
              {/* Header */}
              <div className="bg-nfl-card border border-nfl-border rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{coach.coach}</h2>
                    {team && (
                      <div className="text-sm text-slate-400 mt-0.5">
                        2026: {team.team} {team.fullTeamName} · {team.hc !== coach.coach ? `HC: ${team.hc}` : 'HC/Play-Caller'}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 mt-1">{coach.seasons} seasons of historical data</div>
                  </div>
                  <select
                    value={compareWith}
                    onChange={e => setCompareWith(e.target.value)}
                    className="bg-nfl-dark border border-nfl-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">Compare with...</option>
                    {coaches.filter(c => c.coach !== selected && c.avgRbShare != null).map(c => (
                      <option key={c.coach} value={c.coach}>{c.coach}</option>
                    ))}
                  </select>
                </div>

                {coach.avgRbShare != null ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-nfl-dark rounded-xl p-4">
                      <div className="text-xs text-slate-400 mb-2">RB1 Carry Share</div>
                      <div className="text-2xl font-black text-white">{coach.avgRbShare.toFixed(1)}%</div>
                      <div className={`text-xs font-semibold mt-1 ${
                        coach.avgRbShare >= 75 ? 'text-emerald-400' :
                        coach.avgRbShare >= 65 ? 'text-blue-400' :
                        coach.avgRbShare >= 55 ? 'text-amber-400' : 'text-red-400'
                      }`}>{coach.rbStyle}</div>
                      {comp && comp.avgRbShare && (
                        <div className="text-xs text-slate-500 mt-1">vs {comp.coach.split(' ').pop()}: {comp.avgRbShare.toFixed(1)}%</div>
                      )}
                    </div>
                    <div className="bg-nfl-dark rounded-xl p-4">
                      <div className="text-xs text-slate-400 mb-2">TE Target Share</div>
                      <div className="text-2xl font-black text-white">{coach.avgTeShare.toFixed(1)}%</div>
                      <div className={`text-xs font-semibold mt-1 ${
                        coach.avgTeShare >= 30 ? 'text-emerald-400' :
                        coach.avgTeShare >= 25 ? 'text-blue-400' :
                        coach.avgTeShare >= 20 ? 'text-amber-400' : 'text-red-400'
                      }`}>{coach.teStyle}</div>
                      {comp && comp.avgTeShare && (
                        <div className="text-xs text-slate-500 mt-1">vs {comp.coach.split(' ').pop()}: {comp.avgTeShare.toFixed(1)}%</div>
                      )}
                    </div>
                    <div className="bg-nfl-dark rounded-xl p-4">
                      <div className="text-xs text-slate-400 mb-2">WR1 Target Share</div>
                      <div className="text-2xl font-black text-white">{coach.avgWr1Share.toFixed(1)}%</div>
                      <div className={`text-xs font-semibold mt-1 ${
                        coach.avgWr1Share >= 30 ? 'text-emerald-400' :
                        coach.avgWr1Share >= 25 ? 'text-blue-400' :
                        coach.avgWr1Share >= 20 ? 'text-amber-400' : 'text-red-400'
                      }`}>{coach.wr1Style}</div>
                      {comp && comp.avgWr1Share && (
                        <div className="text-xs text-slate-500 mt-1">vs {comp.coach.split(' ').pop()}: {comp.avgWr1Share.toFixed(1)}%</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-4 text-amber-400 text-sm">
                    ⚠️ First-time play-caller — no historical tendency data available. Watch early-season usage patterns.
                  </div>
                )}
              </div>

              {/* Bar chart: RB share across all coaches */}
              <div className="bg-nfl-card border border-nfl-border rounded-xl p-6">
                <div className="text-sm font-semibold text-white mb-4">RB1 Carry Share — All Play-Callers</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-45} textAnchor="end" />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="rb" name="RB Share" radius={[3, 3, 0, 0]}>
                      {barData.map((entry) => (
                        <Cell
                          key={entry.fullName}
                          fill={entry.fullName === selected ? '#3b82f6' : entry.fullName === compareWith ? '#8b5cf6' : '#1f2937'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Team notes */}
              {team && team.notes && (
                <div className="bg-nfl-card border border-nfl-border rounded-xl p-5">
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">2026 Context</div>
                  <p className="text-sm text-slate-300 leading-relaxed">{team.notes}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
