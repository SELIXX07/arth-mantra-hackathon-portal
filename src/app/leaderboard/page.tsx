'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, Medal, Search, RefreshCw, Download, ArrowLeft,
  Sparkles, TrendingUp, Users, ChevronRight, Award,
  Crown, Flame, Zap, Shield, Star, UserCheck, Activity, Target
} from 'lucide-react'
import { LocalDB, exportLeaderboardToExcel } from '@/lib/storage'
import { TeamRegistration, Hackathon } from '@/types'
import { useAuth } from '@/components/AuthProvider'

// Helper to extract the leader's real name cleanly (guaranteed NEVER to show raw email)
function getLeaderName(team: TeamRegistration): string {
  if (!team) return 'Squad Leader'

  // 1. Check direct leader_name property if valid non-email string
  const directName = (team as any).leader_name
  if (directName && typeof directName === 'string' && directName.trim() && !directName.includes('@')) {
    return directName.trim()
  }

  const members = Array.isArray(team.members)
    ? team.members
    : (typeof (team as any).members === 'string' ? (() => { try { return JSON.parse((team as any).members) } catch { return [] } })() : [])

  // 2. Match member whose email matches leader_email
  if (team.leader_email && Array.isArray(members)) {
    const matched = members.find(
      m => m?.email && m.email.trim().toLowerCase() === team.leader_email.trim().toLowerCase()
    )
    if (matched?.name && typeof matched.name === 'string' && matched.name.trim() && !matched.name.includes('@')) {
      return matched.name.trim()
    }
  }

  // 3. Member 0 is the designated leader by schema
  if (Array.isArray(members) && members[0]?.name && typeof members[0].name === 'string' && members[0].name.trim() && !members[0].name.includes('@')) {
    return members[0].name.trim()
  }

  // 4. Fallback to clean capitalized words from username prefix
  if (team.leader_email && typeof team.leader_email === 'string') {
    const raw = team.leader_email.split('@')[0].replace(/[._0-9]/g, ' ').trim()
    if (raw) {
      return raw
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
    }
  }

  return 'Squad Leader'
}

// Get 2-letter uppercase team initials for avatars
function getTeamInitials(name: string): string {
  if (!name) return 'TM'
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export default function LeaderboardPage() {
  const { user, isAdmin } = useAuth()
  const [hackathon, setHackathon] = useState<Hackathon | null>(null)
  const [registrations, setRegistrations] = useState<TeamRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'top3' | 'myteam'>('all')

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
  const approvedTeams = useMemo(() => {
    return registrations.filter(r => r.status === 'approved')
  }, [registrations])

  const rankedTeams = useMemo(() => {
    return [...approvedTeams].sort((a, b) => (b.score || 0) - (a.score || 0))
  }, [approvedTeams])

  // Top 3 Podium contenders
  const top1 = rankedTeams[0] || null
  const top2 = rankedTeams[1] || null
  const top3 = rankedTeams[2] || null
  const highestScore = rankedTeams[0]?.score || 0

  const filteredTeams = useMemo(() => {
    return rankedTeams.filter((team, idx) => {
      // Filter tab
      if (selectedFilter === 'top3' && idx >= 3) return false
      if (selectedFilter === 'myteam') {
        const isMyTeam = user && (team.leader_user_id === user.id || team.leader_email === user.email)
        if (!isMyTeam) return false
      }

      // Search query
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      const leader = getLeaderName(team).toLowerCase()

      return (
        team.team_name.toLowerCase().includes(q) ||
        leader.includes(q) ||
        team.members?.some(m => m.name?.toLowerCase().includes(q) || m.srn?.toLowerCase().includes(q))
      )
    })
  }, [rankedTeams, searchQuery, selectedFilter, user])

  const handleExport = () => {
    exportLeaderboardToExcel(rankedTeams, 'Arth_Mantra_Leaderboard')
  }

  return (
    <div className="relative min-h-screen text-slate-100 py-8 sm:py-12 px-3 sm:px-6 lg:px-8 overflow-hidden bg-[#060A14]">
      {/* Ambient Cyber Light Beams & Glow Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-cyan-500/12 to-blue-600/0 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-32 right-1/4 w-[550px] h-[550px] bg-gradient-to-bl from-amber-500/10 via-orange-600/5 to-transparent rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[450px] h-[450px] bg-indigo-600/8 rounded-full blur-[160px] pointer-events-none" />

      {/* Cyber Grid Accent */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(0, 210, 255, 0.4) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto space-y-8 sm:space-y-10">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FF7A00] bg-gradient-to-r from-[#FF7A00]/20 to-orange-500/10 px-3 py-1 rounded-full border border-[#FF7A00]/40 flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,122,0,0.25)]">
                <span className="w-2 h-2 rounded-full bg-[#FF7A00] animate-ping" />
                <Trophy className="w-3.5 h-3.5 text-[#FF7A00]" /> Live Tournament Scoreboard
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-cyan-400 font-bold tracking-wide">
                {hackathon?.name || 'Arth Mantra 2026'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-300 flex items-center gap-3">
              Official Team Leaderboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-2xl font-medium">
              Real-time strategic evaluations across all 6 rounds. Watch your squad rise to the top of the leaderboard!
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            <button
              onClick={() => loadScores(false)}
              className="p-3 rounded-2xl border border-slate-800 bg-slate-900/90 hover:bg-slate-800/90 text-slate-300 hover:text-white transition-all cursor-pointer shadow-lg hover:border-slate-700 flex items-center gap-2 text-xs font-bold"
              title="Refresh Live Scores"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#00D2FF]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {isAdmin && (
              <button
                onClick={handleExport}
                disabled={approvedTeams.length === 0}
                className="py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer disabled:opacity-40"
              >
                <Download className="w-4 h-4" /> Export Rankings (.xlsx)
              </button>
            )}
          </div>
        </div>

        {/* Telemetry Stats Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-[#0c1427]/80 to-[#070b16]/90 border border-slate-800/90 p-4 rounded-2xl shadow-xl backdrop-blur-xl">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
              Active Contenders
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                {approvedTeams.length}
              </span>
              <div className="w-8 h-8 rounded-xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <span className="text-[11px] text-cyan-400/80 font-medium mt-1 block">Approved Squads</span>
          </div>

          <div className="bg-gradient-to-br from-[#0c1427]/80 to-[#070b16]/90 border border-slate-800/90 p-4 rounded-2xl shadow-xl backdrop-blur-xl">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
              Current Benchmark
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                {highestScore.toLocaleString()}
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400">
                <Crown className="w-4 h-4" />
              </div>
            </div>
            <span className="text-[11px] text-amber-300/80 font-medium mt-1 block">Peak Squad Score</span>
          </div>

          <div className="bg-gradient-to-br from-[#0c1427]/80 to-[#070b16]/90 border border-slate-800/90 p-4 rounded-2xl shadow-xl backdrop-blur-xl">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
              Tournament Rounds
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                6 Rounds
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <span className="text-[11px] text-emerald-300/80 font-medium mt-1 block">R1 Blueprint → R6 Pitch</span>
          </div>

          <div className="bg-gradient-to-br from-[#0c1427]/80 to-[#070b16]/90 border border-slate-800/90 p-4 rounded-2xl shadow-xl backdrop-blur-xl">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
              Live Evaluation Feed
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-lg sm:text-xl font-black text-[#00D2FF] font-mono flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Auto-syncing every 30s</span>
          </div>
        </div>

        {/* TOP 3 PODIUM ARENA (CHAMPIONS SHOWCASE) */}
        {!loading && rankedTeams.length > 0 && (
          <div className="pt-2">
            <div className="text-center mb-6">
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 bg-amber-950/50 border border-amber-800/60 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Crown className="w-3.5 h-3.5" /> Champions Arena • Top 3 Contenders
              </span>
            </div>

            {/* 3-Pedestal Grid: Center is #1 (tallest), Left is #2, Right is #3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-end max-w-5xl mx-auto">
              {/* #2 SILVER PODIUM (Left) */}
              {top2 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="order-2 md:order-1 relative rounded-3xl p-5 sm:p-6 bg-gradient-to-b from-slate-900/90 via-[#0d1629]/90 to-[#070b16]/95 border-2 border-slate-400/40 shadow-[0_0_35px_rgba(148,163,184,0.18)] backdrop-blur-2xl text-center group hover:border-slate-300 transition-all hover:-translate-y-1"
                >
                  <div className="w-12 h-12 rounded-2xl mx-auto mb-3 bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-[0_0_15px_rgba(200,220,240,0.4)] border border-white">
                    <Medal className="w-6 h-6" />
                  </div>

                  <span className="inline-block text-[10px] font-black uppercase tracking-wider text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700 mb-2">
                    🥈 Rank 2 • Silver
                  </span>

                  <h3 className="text-lg font-black text-white truncate max-w-full">
                    {top2.team_name}
                  </h3>

                  <div className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-300 font-medium">
                    <UserCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">Leader: <strong className="text-white">{getLeaderName(top2)}</strong></span>
                  </div>

                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {top2.members?.length || 0} Members
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-cyan-200 to-white font-mono">
                      {(top2.score || 0).toLocaleString()} <span className="text-xs text-cyan-400">PTS</span>
                    </span>
                  </div>
                </motion.div>
              )}

              {/* #1 GOLD CHAMPION PODIUM (Center, Elevated) */}
              {top1 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="order-1 md:order-2 relative rounded-3xl p-6 sm:p-7 bg-gradient-to-b from-[#1c180b]/95 via-[#131109]/95 to-[#090804]/98 border-2 border-amber-400 shadow-[0_0_50px_rgba(255,170,0,0.35)] backdrop-blur-2xl text-center md:-translate-y-4 group hover:border-amber-300 transition-all hover:scale-[1.02]"
                >
                  {/* Floating Crown Aura */}
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-[0_0_20px_rgba(255,170,0,0.6)] border border-amber-200 animate-pulse">
                    <Crown className="w-3.5 h-3.5" /> Reigning Champion
                  </div>

                  <div className="w-16 h-16 rounded-2xl mx-auto mb-3.5 mt-2 bg-gradient-to-br from-amber-300 via-orange-400 to-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-[0_0_25px_rgba(255,170,0,0.5)] border-2 border-amber-200">
                    <Trophy className="w-8 h-8" />
                  </div>

                  <span className="inline-block text-[11px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/80 px-3 py-0.5 rounded-full border border-amber-800/80 mb-2">
                    👑 Rank 1 • Gold
                  </span>

                  <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400 truncate max-w-full">
                    {top1.team_name}
                  </h3>

                  <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-amber-200 font-medium">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">Leader: <strong className="text-white font-bold">{getLeaderName(top1)}</strong></span>
                  </div>

                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {top1.members?.length || 0} Members
                  </div>

                  <div className="mt-4 pt-3 border-t border-amber-900/60">
                    <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-amber-400 font-mono">
                      {(top1.score || 0).toLocaleString()} <span className="text-xs text-amber-400 font-bold">PTS</span>
                    </span>
                  </div>
                </motion.div>
              )}

              {/* #3 BRONZE PODIUM (Right) */}
              {top3 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="order-3 relative rounded-3xl p-5 sm:p-6 bg-gradient-to-b from-[#18110b]/90 via-[#100d07]/90 to-[#070b16]/95 border-2 border-amber-700/60 shadow-[0_0_30px_rgba(217,119,6,0.18)] backdrop-blur-2xl text-center group hover:border-amber-600 transition-all hover:-translate-y-1"
                >
                  <div className="w-12 h-12 rounded-2xl mx-auto mb-3 bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100 flex items-center justify-center font-black text-lg shadow-[0_0_15px_rgba(217,119,6,0.4)] border border-amber-500/50">
                    <Medal className="w-6 h-6" />
                  </div>

                  <span className="inline-block text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-900 mb-2">
                    🥉 Rank 3 • Bronze
                  </span>

                  <h3 className="text-lg font-black text-white truncate max-w-full">
                    {top3.team_name}
                  </h3>

                  <div className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-300 font-medium">
                    <UserCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">Leader: <strong className="text-white">{getLeaderName(top3)}</strong></span>
                  </div>

                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {top3.members?.length || 0} Members
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-amber-100 font-mono">
                      {(top3.score || 0).toLocaleString()} <span className="text-xs text-amber-400">PTS</span>
                    </span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gradient-to-r from-[#0C1222] via-[#09101f] to-[#0C1222] p-3.5 sm:p-4 rounded-2xl border border-slate-800/90 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Search className="w-4 h-4 text-cyan-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by team name, leader name, or member SRN..."
              className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-500 hover:text-white text-xs font-bold px-2 py-0.5 rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800 font-mono text-xs">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                selectedFilter === 'all'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({rankedTeams.length})
            </button>
            <button
              onClick={() => setSelectedFilter('top3')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                selectedFilter === 'top3'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Top 3
            </button>
            {user && (
              <button
                onClick={() => setSelectedFilter('myteam')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  selectedFilter === 'myteam'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                My Squad
              </button>
            )}
          </div>
        </div>

        {/* Full Table */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-3 border-[#00D2FF] border-t-transparent rounded-full animate-spin mx-auto mb-3 shadow-[0_0_20px_rgba(0,210,255,0.4)]" />
            <p className="text-xs text-slate-400 font-mono font-medium tracking-wider uppercase">Synchronizing Live Evaluations...</p>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="bg-[#0C1222]/90 p-12 text-center rounded-3xl border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-800 text-[#00D2FF] flex items-center justify-center mx-auto mb-1 shadow-[0_0_20px_rgba(0,210,255,0.2)]">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No Matching Teams</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {searchQuery
                ? `No registered squads match "${searchQuery}". Try searching by team name or member name.`
                : 'Judges are actively scoring the hackathon rounds. Scores will appear in real-time as evaluations conclude!'}
            </p>
          </div>
        ) : (
          <div className="bg-gradient-to-b from-[#0B1120]/95 via-[#080E1C]/95 to-[#050811]/98 rounded-3xl border border-slate-800/90 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden backdrop-blur-2xl">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#080E1C]/90 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold font-mono">
                    <th className="py-4 px-4 text-center w-16">Rank</th>
                    <th className="py-4 px-4">Squad & Leader</th>
                    <th className="py-4 px-2 text-center" title="Round 1: The Industry Blueprint">R1: Blueprint</th>
                    <th className="py-4 px-2 text-center" title="Round 2: The Intelligence Drop">R2: Intel</th>
                    <th className="py-4 px-2 text-center" title="Round 3: Central Budget & Live Market">R3: Market</th>
                    <th className="py-4 px-2 text-center" title="Round 4: The Resource Auction">R4: Auction</th>
                    <th className="py-4 px-2 text-center" title="Round 5: Hidden Insider Challenge">R5: Insider</th>
                    <th className="py-4 px-2 text-center" title="Round 6: The Boardroom Showdown">R6: Pitch</th>
                    <th className="py-4 px-4 text-right">Total Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredTeams.map((team, idx) => {
                    // Actual index in overall rankedTeams
                    const rank = rankedTeams.findIndex(t => t.id === team.id) + 1
                    const isMyTeam = user && (team.leader_user_id === user.id || team.leader_email === user.email)
                    const leaderName = getLeaderName(team)
                    const initials = getTeamInitials(team.team_name)

                    return (
                      <motion.tr
                        key={team.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.4) }}
                        className={`transition-all group ${
                          isMyTeam
                            ? 'bg-gradient-to-r from-cyan-950/40 via-cyan-950/20 to-transparent hover:bg-cyan-950/50 border-l-4 border-l-[#00D2FF]'
                            : rank === 1
                            ? 'bg-gradient-to-r from-amber-950/20 via-transparent to-transparent hover:bg-amber-950/30'
                            : rank === 2
                            ? 'bg-gradient-to-r from-slate-800/20 via-transparent to-transparent hover:bg-slate-800/30'
                            : rank === 3
                            ? 'bg-gradient-to-r from-orange-950/20 via-transparent to-transparent hover:bg-orange-950/30'
                            : 'hover:bg-slate-800/30'
                        }`}
                      >
                        {/* Rank Badge */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center">
                            <span
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs font-mono transition-transform group-hover:scale-110 shadow-md ${
                                rank === 1
                                  ? 'bg-gradient-to-br from-amber-300 via-orange-400 to-amber-500 text-slate-950 shadow-[0_0_15px_rgba(255,170,0,0.5)] border border-amber-200'
                                  : rank === 2
                                  ? 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-950 shadow-[0_0_12px_rgba(200,220,240,0.4)] border border-white'
                                  : rank === 3
                                  ? 'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-amber-100 shadow-[0_0_12px_rgba(217,119,6,0.35)] border border-amber-500/60'
                                  : 'bg-slate-900 text-slate-400 border border-slate-800'
                              }`}
                            >
                              {rank === 1 ? <Crown className="w-4 h-4 text-slate-950" /> : rank}
                            </span>
                          </div>
                        </td>

                        {/* Team Name & Leader Name */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {/* Team Avatar Roundel */}
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border ${
                                rank === 1
                                  ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                                  : rank === 2
                                  ? 'bg-slate-800 border-slate-600 text-slate-200'
                                  : rank === 3
                                  ? 'bg-orange-950/80 border-orange-700/50 text-orange-300'
                                  : 'bg-slate-900 border-slate-800 text-cyan-400'
                              }`}
                            >
                              {initials}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-sm text-white group-hover:text-cyan-300 transition-colors tracking-tight font-sans">
                                  {team.team_name}
                                </span>
                                {isMyTeam && (
                                  <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-[#00D2FF] border border-cyan-500/50 animate-pulse">
                                    ★ YOUR SQUAD
                                  </span>
                                )}
                              </div>

                              {/* Leader & Member count: ZERO raw email */}
                              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span className="text-slate-400">{team.members?.length || 0} Members</span>
                                <span className="text-slate-600">•</span>
                                <span className="flex items-center gap-1 text-slate-300 font-medium">
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Leader: <strong className="text-white font-semibold">{leaderName}</strong></span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Round 1: Blueprint */}
                        <td className="py-4 px-2 text-center">
                          {(team.round_1_score || 0) > 0 ? (
                            <span className="px-2 py-0.5 rounded-lg bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 font-bold text-xs shadow-sm">
                              {team.round_1_score}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-medium">—</span>
                          )}
                        </td>

                        {/* Round 2: Intel */}
                        <td className="py-4 px-2 text-center">
                          {(team.round_2_score || 0) > 0 ? (
                            <span className="px-2 py-0.5 rounded-lg bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 font-bold text-xs shadow-sm">
                              {team.round_2_score}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-medium">—</span>
                          )}
                        </td>

                        {/* Round 3: Market */}
                        <td className="py-4 px-2 text-center">
                          {(team.round_3_score || 0) > 0 ? (
                            <span className="px-2 py-0.5 rounded-lg bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 font-bold text-xs shadow-sm">
                              {team.round_3_score}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-medium">—</span>
                          )}
                        </td>

                        {/* Round 4: Auction */}
                        <td className="py-4 px-2 text-center">
                          {(team.round_4_score || 0) > 0 ? (
                            <span className="px-2 py-0.5 rounded-lg bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 font-bold text-xs shadow-sm">
                              {team.round_4_score}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-medium">—</span>
                          )}
                        </td>

                        {/* Round 5: Insider */}
                        <td className="py-4 px-2 text-center">
                          {(team.round_5_score || 0) > 0 ? (
                            <span className="px-2 py-0.5 rounded-lg bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 font-bold text-xs shadow-sm">
                              {team.round_5_score}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-medium">—</span>
                          )}
                        </td>

                        {/* Round 6: Pitch */}
                        <td className="py-4 px-2 text-center">
                          {(team.round_6_score || 0) > 0 ? (
                            <span className="px-2 py-0.5 rounded-lg bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 font-bold text-xs shadow-sm">
                              {team.round_6_score}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-medium">—</span>
                          )}
                        </td>

                        {/* Total Score */}
                        <td className="py-4 px-4 text-right">
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-blue-950/80 border border-cyan-500/40 text-[#00D2FF] font-black text-sm shadow-[0_0_15px_rgba(0,210,255,0.2)] group-hover:border-cyan-400 group-hover:shadow-[0_0_22px_rgba(0,210,255,0.35)] transition-all">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{(team.score || 0).toLocaleString()} pts</span>
                          </span>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Optimized with high graphical intensity) */}
            <div className="block md:hidden divide-y divide-slate-800/80 font-mono">
              {filteredTeams.map((team, idx) => {
                const rank = rankedTeams.findIndex(t => t.id === team.id) + 1
                const isMyTeam = user && (team.leader_user_id === user.id || team.leader_email === user.email)
                const leaderName = getLeaderName(team)
                const initials = getTeamInitials(team.team_name)

                return (
                  <div
                    key={team.id}
                    className={`p-4 space-y-3 transition-colors ${
                      isMyTeam ? 'bg-cyan-950/40 border-l-4 border-l-[#00D2FF]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-md ${
                            rank === 1
                              ? 'bg-gradient-to-br from-amber-300 via-orange-400 to-amber-500 text-slate-950 shadow-[0_0_15px_rgba(255,170,0,0.5)] border border-amber-200'
                              : rank === 2
                              ? 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-950'
                              : rank === 3
                              ? 'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-amber-100'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          #{rank}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-sm text-white truncate font-sans">{team.team_name}</span>
                            {isMyTeam && (
                              <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-cyan-500/20 text-[#00D2FF] border border-cyan-500/50">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Leader: <strong className="text-white font-semibold">{leaderName}</strong></span>
                          </span>
                        </div>
                      </div>

                      <div className="px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-[#00D2FF] font-black text-xs whitespace-nowrap shadow-[0_0_12px_rgba(0,210,255,0.25)] shrink-0">
                        {(team.score || 0).toLocaleString()} pts
                      </div>
                    </div>

                    {/* 6 Round Telemetry Grid */}
                    <div className="grid grid-cols-3 gap-1.5 text-center bg-[#080E1C] p-2.5 rounded-xl border border-slate-800/90 text-[10px]">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">R1: Blueprint</span>
                        <span className="font-bold text-cyan-300">{team.round_1_score || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">R2: Intel</span>
                        <span className="font-bold text-cyan-300">{team.round_2_score || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">R3: Market</span>
                        <span className="font-bold text-cyan-300">{team.round_3_score || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">R4: Auction</span>
                        <span className="font-bold text-cyan-300">{team.round_4_score || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">R5: Insider</span>
                        <span className="font-bold text-cyan-300">{team.round_5_score || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">R6: Pitch</span>
                        <span className="font-bold text-cyan-300">{team.round_6_score || 0}</span>
                      </div>
                    </div>
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
