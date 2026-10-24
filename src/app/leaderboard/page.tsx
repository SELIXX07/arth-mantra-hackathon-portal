'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Trophy, Medal, Search, RefreshCw, Download, ArrowLeft,
  Sparkles, TrendingUp, Users, ChevronRight, Award
} from 'lucide-react'
import { LocalDB, exportLeaderboardToExcel } from '@/lib/storage'
import { TeamRegistration, Hackathon } from '@/types'
import { useAuth } from '@/components/AuthProvider'

export default function LeaderboardPage() {
  const { user, isAdmin } = useAuth()
  const [hackathon, setHackathon] = useState<Hackathon | null>(null)
  const [registrations, setRegistrations] = useState<TeamRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const loadScores = async (background = false) => {
    if (!background) setLoading(true)
    setIsRefreshing(true)
    try {
      const [activeHack, allRegs] = await Promise.all([
        LocalDB.getActiveHackathon(),
        LocalDB.getRegistrationsAsync()
      ])
      setHackathon(activeHack)
      setRegistrations(allRegs)
    } finally {
      if (!background) setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadScores(false)
    const interval = setInterval(() => {
      loadScores(true)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Filter approved teams only, sorted by total score descending
  const approvedTeams = registrations.filter(r => r.status === 'approved')
  const rankedTeams = [...approvedTeams].sort((a, b) => (b.score || 0) - (a.score || 0))

  const filteredTeams = rankedTeams.filter(team => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      team.team_name.toLowerCase().includes(q) ||
      team.leader_email.toLowerCase().includes(q) ||
      team.members.some(m => m.name.toLowerCase().includes(q) || m.srn.toLowerCase().includes(q))
    )
  })

  const top1 = rankedTeams[0]
  const top2 = rankedTeams[1]
  const top3 = rankedTeams[2]

  const handleExport = () => {
    exportLeaderboardToExcel(rankedTeams, 'Arth_Mantra_Leaderboard')
  }

  return (
    <div className="min-h-screen text-slate-100 py-8 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FF7A00] bg-[#FF7A00]/15 px-2.5 py-0.5 rounded-full border border-[#FF7A00]/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(255,122,0,0.2)]">
                <Trophy className="w-3 h-3 text-[#FF7A00]" /> Live Score Tracker
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-cyan-400 font-semibold">{hackathon?.name || 'Arth Mantra Hackathon'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              Official Team Leaderboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Live evaluations across all 6 strategic rounds and real-time Innovation Credit (IC) treasury balances.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={() => loadScores(false)}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Refresh Scores"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#00D2FF]' : ''}`} />
            </button>
            {isAdmin && (
              <button
                onClick={handleExport}
                disabled={approvedTeams.length === 0}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-40"
              >
                <Download className="w-4 h-4" /> Export Rankings (.xlsx)
              </button>
            )}
          </div>
        </div>

        {/* Top 3 Podium (Shown if at least 1 team has scores) */}
        {rankedTeams.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Rank 2 - Silver */}
            {top2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[#0C1427]/80 rounded-3xl p-6 border border-slate-700/80 shadow-xl flex flex-col justify-between relative overflow-hidden order-2 md:order-1"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-200" />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-black text-slate-300">2nd</span>
                    <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/40">
                      Silver Medalist
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white">{top2.team_name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{top2.members?.length} Members • {top2.leader_email}</p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
                  <div className="grid grid-cols-6 gap-1 text-center text-[10px] bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <div><span className="text-slate-400 block text-[8px] uppercase font-bold">R1</span><span className="text-cyan-400 font-bold">{top2.round_1_score || 0}</span></div>
                    <div><span className="text-slate-400 block text-[8px] uppercase font-bold">R2</span><span className="text-cyan-400 font-bold">{top2.round_2_score || 0}</span></div>
                    <div><span className="text-slate-400 block text-[8px] uppercase font-bold">R3</span><span className="text-cyan-400 font-bold">{top2.round_3_score || 0}</span></div>
                    <div><span className="text-slate-400 block text-[8px] uppercase font-bold">R4</span><span className="text-cyan-400 font-bold">{top2.round_4_score || 0}</span></div>
                    <div><span className="text-slate-400 block text-[8px] uppercase font-bold">R5</span><span className="text-cyan-400 font-bold">{top2.round_5_score || 0}</span></div>
                    <div><span className="text-slate-400 block text-[8px] uppercase font-bold">R6</span><span className="text-cyan-400 font-bold">{top2.round_6_score || 0}</span></div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-amber-300 font-extrabold text-[11px] bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-800/40">
                        💰 {(top2.ic_balance !== undefined ? top2.ic_balance : 10000).toLocaleString()} IC
                      </span>
                      {(top2.brownie_points || 0) > 0 && (
                        <span className="text-fuchsia-400 font-bold text-[10px] bg-fuchsia-950/40 px-1.5 py-0.5 rounded-lg border border-fuchsia-800/40">
                          ★ +{top2.brownie_points} BP
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-black text-white">{top2.score || 0} <span className="text-xs font-normal text-slate-400">pts</span></div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Rank 1 - Gold (Elevated) */}
            {top1 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0E1A38] rounded-3xl p-6 sm:p-7 border border-[#FF7A00]/60 shadow-[0_0_30px_rgba(255,122,0,0.2)] flex flex-col justify-between relative overflow-hidden order-1 md:order-2 md:-mt-2"
              >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#FF7A00] via-[#FFD700] to-[#FF7A00]" />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl font-black text-[#FFD700] flex items-center gap-1.5">
                      <Trophy className="w-6 h-6 text-[#FFD700]" /> 1st
                    </span>
                    <span className="text-xs uppercase font-black px-3 py-1 rounded-full bg-[#FF7A00]/25 text-[#FFD700] border border-[#FF7A00]/50 shadow-[0_0_10px_rgba(255,215,0,0.3)]">
                      Grand Champion
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-white">{top1.team_name}</h3>
                  <p className="text-xs text-slate-300 mt-1">{top1.members?.length} Members • {top1.leader_email}</p>
                  {top1.judge_notes && (
                    <p className="text-xs text-amber-300/90 mt-2.5 bg-amber-950/40 p-2 rounded-xl border border-amber-800/40">
                      &quot;{top1.judge_notes}&quot;
                    </p>
                  )}
                </div>
                <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
                  <div className="grid grid-cols-6 gap-1 text-center text-[10px] bg-slate-900/70 p-2 rounded-xl border border-[#FF7A00]/30">
                    <div><span className="text-slate-400 block text-[8px] uppercase font-bold">R1</span><strong className="text-[#00D2FF]">{top1.round_1_score || 0}</strong></div>
                    <div><span className="text-slate-400 block text-[8px] uppercase font-bold">R2</span><strong className="text-[#00D2FF]">{top1.round_2_score || 0}</strong></div>
                    <div><span className="text-slate-400 block text-[8px] uppercase font-bold">R3</span><strong className="text-[#00D2FF]">{top1.round_3_score || 0}</strong></div>
                    <div><span className="text-slate-400 block text-[8px] uppercase font-bold">R4</span><strong className="text-[#00D2FF]">{top1.round_4_score || 0}</strong></div>
                    <div><span className="text-slate-400 block text-[8px] uppercase font-bold">R5</span><strong className="text-[#00D2FF]">{top1.round_5_score || 0}</strong></div>
                    <div><span className="text-slate-400 block text-[8px] uppercase font-bold">R6</span><strong className="text-[#00D2FF]">{top1.round_6_score || 0}</strong></div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-amber-300 font-extrabold text-[11px] bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-500/40 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                        💰 {(top1.ic_balance !== undefined ? top1.ic_balance : 10000).toLocaleString()} IC
                      </span>
                      {(top1.brownie_points || 0) > 0 && (
                        <span className="text-fuchsia-300 font-black text-[10px] bg-fuchsia-950/60 px-2 py-0.5 rounded-lg border border-fuchsia-500/40">
                          ★ +{top1.brownie_points} BP
                        </span>
                      )}
                    </div>
                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FF7A00]">
                      {top1.score || 0} <span className="text-xs font-normal text-slate-400">pts</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Rank 3 - Bronze */}
            {top3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[#0C1427]/80 rounded-3xl p-6 border border-slate-700/80 shadow-xl flex flex-col justify-between relative overflow-hidden order-3"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-700 to-amber-500" />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-black text-amber-500">3rd</span>
                    <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-amber-600/20 text-amber-400 border border-amber-600/40">
                      Bronze Medalist
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white">{top3.team_name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{top3.members?.length} Members • {top3.leader_email}</p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
                  <div className="grid grid-cols-6 gap-1 text-center text-[10px] bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <div><span className="text-slate-400 block text-[8px] uppercase font-bold">R1</span><span className="text-cyan-400 font-bold">{top3.round_1_score || 0}</span></div>
                    <div><span className="text-slate-400 block text-[8px] uppercase font-bold">R2</span><span className="text-cyan-400 font-bold">{top3.round_2_score || 0}</span></div>
                    <div><span className="text-slate-400 block text-[8px] uppercase font-bold">R3</span><span className="text-cyan-400 font-bold">{top3.round_3_score || 0}</span></div>
                    <div><span className="text-slate-400 block text-[8px] uppercase font-bold">R4</span><span className="text-cyan-400 font-bold">{top3.round_4_score || 0}</span></div>
                    <div><span className="text-slate-400 block text-[8px] uppercase font-bold">R5</span><span className="text-cyan-400 font-bold">{top3.round_5_score || 0}</span></div>
                    <div><span className="text-slate-400 block text-[8px] uppercase font-bold">R6</span><span className="text-cyan-400 font-bold">{top3.round_6_score || 0}</span></div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-amber-300 font-extrabold text-[11px] bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-800/40">
                        💰 {(top3.ic_balance !== undefined ? top3.ic_balance : 10000).toLocaleString()} IC
                      </span>
                      {(top3.brownie_points || 0) > 0 && (
                        <span className="text-fuchsia-400 font-bold text-[10px] bg-fuchsia-950/40 px-1.5 py-0.5 rounded-lg border border-fuchsia-800/40">
                          ★ +{top3.brownie_points} BP
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-black text-white">{top3.score || 0} <span className="text-xs font-normal text-slate-400">pts</span></div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-[#0C1222] p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search teams by team name, member name, or SRN..."
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Full Table */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-9 h-9 border-3 border-[#00D2FF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading live scores...</p>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="bg-[#0C1222] p-12 text-center rounded-3xl border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-800 text-[#00D2FF] flex items-center justify-center mx-auto mb-1">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No Scores Published Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {searchQuery
                ? 'No registered teams match your search criteria.'
                : 'Judges are reviewing the prototypes and presentations. Scores will appear here in real-time as evaluations conclude!'}
            </p>
          </div>
        ) : (
          <div className="bg-[#0C1222] rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#080E1C]/80 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                    <th className="py-4 px-3 sm:px-4">Rank</th>
                    <th className="py-4 px-3 sm:px-4">Team</th>
                    <th className="py-4 px-2 text-center" title="Round 1: The Industry Blueprint">R1 (Blueprint)</th>
                    <th className="py-4 px-2 text-center" title="Round 2: The Intelligence Drop">R2 (Intel)</th>
                    <th className="py-4 px-2 text-center" title="Round 3: Central Budget & Live Market">R3 (Market)</th>
                    <th className="py-4 px-2 text-center" title="Round 4: The Resource Auction">R4 (Auction)</th>
                    <th className="py-4 px-2 text-center" title="Round 5: Hidden Insider Challenge">R5 (Insider)</th>
                    <th className="py-4 px-2 text-center" title="Round 6: The Boardroom Showdown">R6 (Pitch)</th>
                    <th className="py-4 px-3 text-center" title="Innovation Credit Liquid Balance">Liquid IC</th>
                    <th className="py-4 px-3 sm:px-4 text-right">Total Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTeams.map((team, idx) => {
                    const rank = idx + 1
                    const isMyTeam = user && (team.leader_user_id === user.id || team.leader_email === user.email)

                    return (
                      <tr
                        key={team.id}
                        className={`transition-colors ${
                          isMyTeam
                            ? 'bg-cyan-950/30 hover:bg-cyan-950/50'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-4 px-3 sm:px-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                              rank === 1
                                ? 'bg-[#FF7A00] text-slate-950 shadow-[0_0_10px_rgba(255,122,0,0.4)]'
                                : rank === 2
                                ? 'bg-slate-300 text-slate-950 shadow-[0_0_8px_rgba(200,200,200,0.3)]'
                                : rank === 3
                                ? 'bg-amber-700 text-amber-100 shadow-[0_0_8px_rgba(180,83,9,0.3)]'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {rank}
                            </span>
                          </div>
                        </td>

                        {/* Team Name & Members */}
                        <td className="py-4 px-3 sm:px-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-white">{team.team_name}</span>
                              {isMyTeam && (
                                <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-cyan-500/20 text-[#00D2FF] border border-cyan-500/40">
                                  Your Team
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {team.members?.length} members • Leader: {team.leader_email}
                            </div>
                            {team.judge_notes && (
                              <div className="text-[11px] text-slate-400 mt-1 italic">
                                Remarks: &quot;{team.judge_notes}&quot;
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Round 1 */}
                        <td className="py-4 px-2 text-center font-bold text-slate-300">
                          {team.round_1_score !== undefined ? team.round_1_score : '—'}
                        </td>

                        {/* Round 2 */}
                        <td className="py-4 px-2 text-center font-bold text-slate-300">
                          {team.round_2_score !== undefined ? team.round_2_score : '—'}
                        </td>

                        {/* Round 3 */}
                        <td className="py-4 px-2 text-center font-bold text-slate-300">
                          {team.round_3_score !== undefined ? team.round_3_score : '—'}
                        </td>

                        {/* Round 4 */}
                        <td className="py-4 px-2 text-center font-bold text-slate-300">
                          {team.round_4_score !== undefined ? team.round_4_score : '—'}
                        </td>

                        {/* Round 5 */}
                        <td className="py-4 px-2 text-center font-bold text-slate-300">
                          {team.round_5_score !== undefined ? team.round_5_score : '—'}
                        </td>

                        {/* Round 6 */}
                        <td className="py-4 px-2 text-center font-bold text-slate-300">
                          {team.round_6_score !== undefined ? team.round_6_score : '—'}
                        </td>

                        {/* Liquid IC & Brownie Points */}
                        <td className="py-4 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-extrabold text-amber-300 text-xs bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40 whitespace-nowrap">
                              💰 {(team.ic_balance !== undefined ? team.ic_balance : 10000).toLocaleString()} IC
                            </span>
                            {(team.brownie_points || 0) > 0 && (
                              <span className="text-[10px] text-fuchsia-400 font-bold mt-0.5">
                                ★ +{team.brownie_points} BP
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total Score */}
                        <td className="py-4 px-3 sm:px-4 text-right">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-[#00D2FF] font-black text-sm shadow-[0_0_12px_rgba(0,210,255,0.2)]">
                            {team.score || 0} pts
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Optimized for Small Phone Screens) */}
            <div className="block md:hidden divide-y divide-slate-800/80">
              {filteredTeams.map((team, idx) => {
                const rank = idx + 1
                const isMyTeam = user && (team.leader_user_id === user.id || team.leader_email === user.email)

                return (
                  <div
                    key={team.id}
                    className={`p-4 space-y-2.5 transition-colors ${
                      isMyTeam ? 'bg-cyan-950/30' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 ${
                          rank === 1
                            ? 'bg-[#FF7A00] text-slate-950 shadow-[0_0_10px_rgba(255,122,0,0.4)]'
                            : rank === 2
                            ? 'bg-slate-300 text-slate-950'
                            : rank === 3
                            ? 'bg-amber-700 text-amber-100'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          #{rank}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-sm text-white truncate">{team.team_name}</span>
                            {isMyTeam && (
                              <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-cyan-500/20 text-[#00D2FF] border border-cyan-500/40 flex-shrink-0">
                                Your Team
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {team.members?.length} members • {team.leader_email}
                          </span>
                        </div>
                      </div>

                      <div className="px-2.5 py-1 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-[#00D2FF] font-black text-xs whitespace-nowrap shadow-[0_0_10px_rgba(0,210,255,0.2)] flex-shrink-0">
                        {team.score || 0} pts
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center bg-[#080E1C] p-2 rounded-xl border border-slate-800 text-[10px]">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">R1: Blueprint</span>
                        <span className="font-bold text-cyan-300">{team.round_1_score || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">R2: Intel</span>
                        <span className="font-bold text-cyan-300">{team.round_2_score || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">R3: Market</span>
                        <span className="font-bold text-cyan-300">{team.round_3_score || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">R4: Auction</span>
                        <span className="font-bold text-cyan-300">{team.round_4_score || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">R5: Insider</span>
                        <span className="font-bold text-cyan-300">{team.round_5_score || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">R6: Pitch</span>
                        <span className="font-bold text-cyan-300">{team.round_6_score || 0}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
                      <span className="text-amber-300 font-extrabold flex items-center gap-1">
                        💰 {(team.ic_balance !== undefined ? team.ic_balance : 10000).toLocaleString()} Liquid IC
                      </span>
                      {(team.brownie_points || 0) > 0 && (
                        <span className="text-fuchsia-400 font-bold bg-fuchsia-950/40 px-2 py-0.5 rounded border border-fuchsia-800/40">
                          ★ +{team.brownie_points} Brownie Points
                        </span>
                      )}
                    </div>

                    {team.judge_notes && (
                      <p className="text-[10px] text-amber-200/90 italic bg-amber-950/20 p-2 rounded-lg border border-amber-800/30">
                        Remarks: &quot;{team.judge_notes}&quot;
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
