'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Calendar, Users, ArrowRight, Compass, Edit3, CheckCircle2,
  Clock, XCircle, Trophy, TrendingUp, BarChart3, LineChart,
  ShieldCheck, MapPin, Sparkles, DollarSign, Award, ChevronRight,
  Eye, EyeOff
} from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/ToastProvider'
import { LocalDB } from '@/lib/storage'
import { Hackathon, TeamRegistration } from '@/types'

export default function HomePage() {
  const { user, isAdmin } = useAuth()
  const { showToast } = useToast()
  const [hackathon, setHackathon] = useState<Hackathon | null>(null)
  const [approvedCount, setApprovedCount] = useState(0)
  const [myRegistration, setMyRegistration] = useState<TeamRegistration | null>(null)
  const [loading, setLoading] = useState(true)

  const handleToggleShowTeamsCount = async () => {
    if (!hackathon) return
    const nextVal = hackathon.show_registered_teams === false ? true : false
    if (typeof window !== 'undefined') {
      localStorage.setItem(`hackreg_show_teams_${hackathon.id}`, String(nextVal))
    }
    // Update local UI immediately so it flips without waiting
    setHackathon(prev => prev ? { ...prev, show_registered_teams: nextVal } : null)
    const updated = await LocalDB.updateHackathon(hackathon.id, { show_registered_teams: nextVal })
    if (updated) {
      setHackathon(prev => prev ? { ...prev, show_registered_teams: nextVal } : null)
      showToast(
        nextVal
          ? 'Registered teams count is now VISIBLE on the homepage!'
          : 'Registered teams count is now REMOVED from the homepage.',
        'success'
      )
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        const active = await LocalDB.getActiveHackathon()
        if (active && typeof window !== 'undefined') {
          const override = localStorage.getItem(`hackreg_show_teams_${active.id}`)
          if (override !== null) {
            active.show_registered_teams = override === 'true'
          }
        }
        setHackathon(active)

        const regs = await LocalDB.getRegistrationsAsync()
        const approved = regs.filter(r => (active ? r.hackathon_id === active.id : true) && r.status === 'approved')
        setApprovedCount(approved.length)

        if (user && !isAdmin && active) {
          const myReg = await LocalDB.getRegistrationByLeader(user.id, active.id)
          setMyRegistration(myReg)
        }
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user, isAdmin])

  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center bg-[#050814]">
        <div className="w-9 h-9 border-3 border-[#00D2FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const statusBadge = () => {
    if (!myRegistration) return null
    const badges = {
      pending: (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-700/80 text-amber-300 text-xs font-bold">
          <Clock className="w-3.5 h-3.5 text-amber-400" /> Waitlisted (Under Review)
        </div>
      ),
      approved: (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-700/80 text-emerald-300 text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.25)]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Approved & Registered!
        </div>
      ),
      rejected: (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-700/80 text-rose-300 text-xs font-bold">
          <XCircle className="w-3.5 h-3.5 text-rose-400" /> Registration Rejected
        </div>
      )
    }
    return badges[myRegistration.status]
  }

  return (
    <div className="min-h-screen text-slate-100 py-6 sm:py-10 px-3 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {!hackathon ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto my-12 text-center bg-[#0C1222]/90 backdrop-blur-md rounded-3xl p-8 sm:p-12 border border-slate-800 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0072FF] via-[#00D2FF] to-[#FF7A00]" />
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-cyan-950/70 border border-cyan-800/80 text-[#00D2FF] flex items-center justify-center shadow-[0_0_25px_rgba(0,210,255,0.2)]">
              <Sparkles className="w-8 h-8" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase mb-3">
              No Hackathon Live Right Now
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mb-8 leading-relaxed font-medium">
              {isAdmin
                ? 'No hackathon is currently active. Use the Admin Console to create, customize, and publish your hackathon to open registrations.'
                : 'The event committee has not opened registrations yet. Create your account now so your team is ready to register the moment it goes live!'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {isAdmin ? (
                <Link
                  href="/admin"
                  className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-gradient-to-r from-[#0072FF] via-[#00D2FF] to-[#38BDF8] text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,210,255,0.4)] hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" /> Open Admin Console & Create Hackathon
                </Link>
              ) : !user ? (
                <>
                  <Link
                    href="/register"
                    className="w-full sm:w-auto py-3.5 px-7 rounded-xl bg-gradient-to-r from-[#0072FF] via-[#00D2FF] to-[#38BDF8] text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,210,255,0.4)] hover:brightness-110 transition-all"
                  >
                    Create Account
                  </Link>
                  <Link
                    href="/login"
                    className="w-full sm:w-auto py-3.5 px-7 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Sign In
                  </Link>
                </>
              ) : (
                <Link
                  href="/leaderboard"
                  className="w-full sm:w-auto py-3.5 px-7 rounded-xl border border-[#FF7A00]/50 bg-[#FF7A00]/10 hover:bg-[#FF7A00]/20 text-[#FF7A00] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <Trophy className="w-4 h-4" /> View Leaderboard
                </Link>
              )}
            </div>
          </motion.div>
        ) : (
          <>
            {/* Poster Showcase Header Bar with Quick Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-[#00D2FF]">
                  Official Event Poster • PES University
                </span>
              </div>
              <Link
                href={user ? (myRegistration ? "/profile" : "/register-team") : "/register"}
                className="group"
              >
                <div className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl bg-gradient-to-r from-[#FF7A00] via-[#FFA500] to-[#FFD700] hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(255,122,0,0.6)] border border-white/50 active:scale-95 transition-all cursor-pointer">
                  <Sparkles className="w-4 h-4 text-slate-950 fill-current" />
                  <span>REGISTER NOW!!!</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>

            {/* Poster Showcase (Full-Bleed, Uncropped 16:9 Display) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl sm:rounded-3xl border border-cyan-500/40 shadow-[0_0_35px_rgba(0,210,255,0.18)] bg-[#040814] overflow-hidden"
            >
              {hackathon.poster_url ? (
                <img
                  src={hackathon.poster_url}
                  alt={hackathon.name}
                  className="w-full h-auto block select-none"
                />
              ) : (
                <div className="h-64 sm:h-80 flex flex-col items-center justify-center bg-gradient-to-br from-[#0B1528] via-[#050814] to-[#0A1220] p-6 text-center">
                  <Trophy className="w-16 h-16 text-[#FF7A00] mb-3 opacity-80" />
                  <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">{hackathon.name}</h2>
                </div>
              )}
            </motion.div>

            {/* Hackathon Info & Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#0C1222]/90 backdrop-blur-md rounded-3xl p-6 sm:p-9 border border-slate-800 shadow-2xl relative overflow-hidden"
            >
              {/* Top Cyan to Orange accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0072FF] via-[#00D2FF] to-[#FF7A00]" />

              <div className="space-y-6">
                {/* Admin Quick Control Pill for registered teams count */}
                {isAdmin && (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 px-4 rounded-2xl bg-[#080E1C] border border-cyan-800/80 shadow-md">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-cyan-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#00D2FF]" /> Registered Teams Count on Homepage:
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        hackathon.show_registered_teams === false
                          ? 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                      }`}>
                        {hackathon.show_registered_teams === false ? 'HIDDEN FROM PUBLIC' : 'SHOWN TO PUBLIC'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleShowTeamsCount}
                      className={`text-xs font-black px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                        hackathon.show_registered_teams === false
                          ? 'bg-amber-950/70 border-amber-600 text-amber-200 hover:bg-amber-900'
                          : 'bg-cyan-950/70 border-cyan-700 text-[#00D2FF] hover:bg-cyan-900'
                      }`}
                      title="Toggle showing/hiding number of registered teams on the homepage"
                    >
                      {hackathon.show_registered_teams === false ? (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Toggle ON (Show Number)
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Toggle OFF (Remove Number)
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Tagline & Department */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#00D2FF] bg-cyan-950/70 px-3 py-1 rounded-full border border-cyan-800/80 shadow-[0_0_10px_rgba(0,210,255,0.2)]">
                      Faculty of Management & Commerce
                    </span>
                  </div>
                  <div className="text-[11px] font-black tracking-widest text-[#FF7A00] uppercase bg-[#FF7A00]/15 px-3 py-1 rounded-full border border-[#FF7A00]/30 shadow-[0_0_10px_rgba(255,122,0,0.2)]">
                    Strategy Meets Finance
                  </div>
                </div>

                <div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight uppercase">
                    {hackathon.name}
                  </h1>
                  {hackathon.description && (
                    <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-3xl leading-relaxed font-medium">
                      {hackathon.description}
                    </p>
                  )}
                </div>

                {/* High-Visibility "REGISTER NOW!!!" Callout Banner */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#FF7A00]/25 via-[#FFD700]/20 to-[#00D2FF]/20 border-2 border-[#FF7A00]/80 shadow-[0_0_30px_rgba(255,122,0,0.35)] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#FFA500] text-slate-950 flex items-center justify-center font-black text-xl shadow-[0_0_15px_rgba(255,122,0,0.5)] flex-shrink-0 animate-bounce">
                      🔥
                    </div>
                    <div>
                      <div className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                        <span>ARTHMANTRA: THE BULL RUN IS LIVE!</span>
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#FF7A00] text-slate-950 shadow-sm animate-pulse">
                          SLOTS FILLING FAST
                        </span>
                      </div>
                      <p className="text-xs text-amber-200/90 font-medium mt-0.5">
                        24-Hour Techno-Financial Sprint • PESU 52 • 4 to 6 members / squad • Entry ₹{hackathon.entry_fee}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={user ? (myRegistration ? "/profile" : "/register-team") : "/register"}
                    className="w-full sm:w-auto py-3 px-8 rounded-xl bg-gradient-to-r from-[#FF7A00] via-[#FFA500] to-[#FFD700] hover:brightness-110 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(255,122,0,0.6)] transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap active:scale-95 group"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950 fill-current" />
                    <span>REGISTER NOW!!!</span>
                    <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* Core Pillars Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-[#080E1C] p-3.5 rounded-2xl border border-slate-800/80 hover:border-cyan-500/40 transition-all">
                    <div className="text-[11px] font-black uppercase text-[#FF7A00] mb-0.5 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" /> Investing
                    </div>
                    <div className="text-xs text-slate-400">Build smarter strategies</div>
                  </div>

                  <div className="bg-[#080E1C] p-3.5 rounded-2xl border border-slate-800/80 hover:border-cyan-500/40 transition-all">
                    <div className="text-[11px] font-black uppercase text-[#00D2FF] mb-0.5 flex items-center gap-1.5">
                      <LineChart className="w-3.5 h-3.5" /> Finance
                    </div>
                    <div className="text-xs text-slate-400">Decode markets</div>
                  </div>

                  <div className="bg-[#080E1C] p-3.5 rounded-2xl border border-slate-800/80 hover:border-cyan-500/40 transition-all">
                    <div className="text-[11px] font-black uppercase text-emerald-400 mb-0.5 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5" /> Analytics
                    </div>
                    <div className="text-xs text-slate-400">Turn data into insights</div>
                  </div>

                  <div className="bg-[#080E1C] p-3.5 rounded-2xl border border-slate-800/80 hover:border-cyan-500/40 transition-all">
                    <div className="text-[11px] font-black uppercase text-amber-400 mb-0.5 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" /> Wealth
                    </div>
                    <div className="text-xs text-slate-400">Create lasting impact</div>
                  </div>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="bg-[#080E1C] p-4 rounded-2xl border border-slate-800">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#00D2FF]" /> Date & Time
                    </div>
                    <div className="text-sm font-black text-white">{hackathon.date}</div>
                    <div className="text-[11px] text-cyan-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> Venue: PESU 52
                    </div>
                  </div>

                  <div className="bg-[#080E1C] p-4 rounded-2xl border border-[#FF7A00]/40 shadow-[0_0_15px_rgba(255,122,0,0.1)]">
                    <div className="text-[10px] font-black uppercase tracking-wider text-[#FF7A00] mb-1 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" /> Entry Fee
                    </div>
                    <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FF7A00]">
                      ₹{hackathon.entry_fee} <span className="text-xs text-slate-400 font-normal">/ team</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">4 to 6 members per team</div>
                  </div>

                  {hackathon.show_registered_teams === false ? (
                    /* When teams count is toggled OFF: NO registered team numbers are shown anywhere on the homescreen! */
                    <div className="bg-[#080E1C] p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#00D2FF]" /> Squad Capacity
                          </span>
                          {isAdmin && (
                            <span className="text-[9px] bg-amber-950/90 text-amber-300 border border-amber-700/80 px-2 py-0.5 rounded font-black flex items-center gap-1">
                              <EyeOff className="w-2.5 h-2.5 text-amber-400" /> Count Hidden from Homepage
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-black text-white">
                          4 to 6 Members / Team
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-emerald-400 font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Registrations Active & Open</span>
                        </div>
                      </div>
                      <div className="mt-3 text-[10px] text-slate-500 font-medium">
                        Limited squad slots available • Register your team early
                      </div>

                      {isAdmin && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={handleToggleShowTeamsCount}
                            className="w-full py-1.5 px-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-cyan-950/70 border-cyan-700 text-[#00D2FF] hover:bg-cyan-900"
                            title="Turn on showing the number of registered teams"
                          >
                            <Eye className="w-3 h-3 text-[#00D2FF]" />
                            <span>Toggle ON (Show Team Count)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* WHEN TOGGLED ON: Registered Teams count is shown */
                    <div className="bg-[#080E1C] p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#00D2FF]" /> Registered Teams
                          </span>
                          {isAdmin && (
                            <span className="text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 px-2 py-0.5 rounded font-black flex items-center gap-1">
                              <Eye className="w-2.5 h-2.5 text-emerald-400" /> Visible to Public
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-black text-white">
                          {approvedCount} / {hackathon.max_teams} Confirmed
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-[#0072FF] to-[#00D2FF] h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (approvedCount / (hackathon.max_teams || 50)) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="mt-3 text-[10px] text-slate-400">
                        {Math.max(0, (hackathon.max_teams || 50) - approvedCount)} slots remaining
                      </div>

                      {/* Controls in Spec Card */}
                      {isAdmin && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={handleToggleShowTeamsCount}
                            className="w-full py-1.5 px-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-slate-900 border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-300"
                            title="Remove the number of registered teams from homepage"
                          >
                            <EyeOff className="w-3 h-3 text-slate-400" />
                            <span>Toggle OFF (Remove Number)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* CTAs */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {!user ? (
                    <Link
                      href="/register"
                      className="flex items-center justify-center gap-2 py-4 px-8 rounded-xl bg-gradient-to-r from-[#FF7A00] via-[#FFA500] to-[#FFD700] hover:brightness-110 text-slate-950 font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(255,122,0,0.5)] group"
                    >
                      <Sparkles className="w-4 h-4 text-slate-950 fill-current" />
                      <span>REGISTER NOW!!! (Create Account & Squad)</span>
                      <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  ) : myRegistration ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      {statusBadge()}
                      <Link
                        href="/profile"
                        className="py-3 px-5 rounded-xl border border-cyan-800 bg-cyan-950/50 hover:bg-cyan-900/50 text-[#00D2FF] font-black text-xs uppercase tracking-wider transition-all"
                      >
                        View Team Status & WhatsApp Group →
                      </Link>
                    </div>
                  ) : (
                    <Link
                      href="/register-team"
                      className="flex items-center justify-center gap-2 py-4 px-8 rounded-xl bg-gradient-to-r from-[#FF7A00] via-[#FFA500] to-[#FFD700] hover:brightness-110 text-slate-950 font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(255,122,0,0.5)] group"
                    >
                      <Sparkles className="w-4 h-4 text-slate-950 fill-current" />
                      <span>REGISTER NOW!!! (₹{hackathon.entry_fee} / Team)</span>
                      <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  )}

                  <Link
                    href="/leaderboard"
                    className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl border border-[#FF7A00]/50 bg-[#FF7A00]/10 hover:bg-[#FF7A00]/20 text-[#FF7A00] font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,122,0,0.15)]"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>Live Score Tracker</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Admin Console</span>
                    </Link>
                  )}
                </div>

                {/* Team Leader disclaimer notice */}
                <div className="flex items-center gap-2 pt-1 text-xs text-amber-300/90 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                  <span>
                    <strong>Registration Rule:</strong> Only the <strong>Team Leader</strong> needs to register the squad. Other members are added in the form.
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  )
}
