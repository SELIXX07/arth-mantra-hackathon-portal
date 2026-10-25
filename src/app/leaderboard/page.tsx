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

                    {(team.brownie_points || 0) > 0 && (
                      <div className="flex items-center justify-end text-[11px] bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
                        <span className="text-fuchsia-400 font-bold bg-fuchsia-950/40 px-2 py-0.5 rounded border border-fuchsia-800/40">
                          ★ +{team.brownie_points} Brownie Points
                        </span>
                      </div>
                    )}

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
