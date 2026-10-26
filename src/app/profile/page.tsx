'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  User, Mail, Phone, GraduationCap, Edit3, Save, X, CheckCircle2, Clock, AlertCircle,
  ExternalLink, Users, Trophy, Compass, ArrowRight, MessageSquare, BookOpen, Layers, Bookmark, Building2,
  Activity, Copy, Check, ShieldCheck, Lock, Eye, EyeOff, Download, FileSpreadsheet, Gavel, Award
} from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/ToastProvider'
import { LocalDB, getTeamTraderPin } from '@/lib/storage'
import { STOCK_MARKET_URL } from '@/lib/config'
import { Hackathon, TeamRegistration, PES_DEPARTMENTS, SEMESTER_OPTIONS, SECTION_OPTIONS, RESIDENCE_OPTIONS, ResidenceType } from '@/types'

export default function ProfilePage() {
  const router = useRouter()
  const { user, isAdmin, isDev, isMarketAdmin, loading: authLoading, updateProfile } = useAuth()
  const { showToast } = useToast()

  const [hackathon, setHackathon] = useState<Hackathon | null>(null)
  const [registration, setRegistration] = useState<TeamRegistration | null>(null)
  const [dataLoading, setDataLoading] = useState(true)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editSrn, setEditSrn] = useState('')
  const [editDepartment, setEditDepartment] = useState('')
  const [editSemester, setEditSemester] = useState('')
  const [editSection, setEditSection] = useState('')
  const [editResidenceType, setEditResidenceType] = useState<ResidenceType>('Non-Hostelite')
  const [saving, setSaving] = useState(false)
  const [stockMarketState, setStockMarketState] = useState<{ 
    status: string; 
    remaining_secs: number; 
    credentials_released?: boolean | number;
  } | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedPin, setCopiedPin] = useState(false)
  const [togglingCreds, setTogglingCreds] = useState(false)

  const handleToggleCredentials = async (released: boolean) => {
    setTogglingCreds(true)
    try {
      // 1. Persist directly to Supabase
      const active = hackathon || (await LocalDB.getActiveHackathon())
      if (active) {
        await LocalDB.setCredentialsReleased(active.id, released)
        setHackathon({ ...active, credentials_released: released })
      }

      // Optimistic local update
      setStockMarketState(prev => prev ? { ...prev, credentials_released: released ? 1 : 0 } : {
        status: 'STANDBY',
        round_duration_secs: 3600,
        remaining_secs: 0,
        credentials_released: released ? 1 : 0
      })

      showToast(released ? 'Credentials revealed to all approved teams!' : 'Credentials hidden from teams.', released ? 'success' : 'info')

      // 2. Relay to stock market engine
      const portalSyncKey = process.env.NEXT_PUBLIC_PORTAL_SYNC_SECRET || 'ArthAdmin2026!'
      fetch(`${STOCK_MARKET_URL}/api/portal/toggle-credentials`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-secret': portalSyncKey
        },
        body: JSON.stringify({ released, adminSecret: portalSyncKey })
      }).then(r => r.json()).then(data => {
        if (data.state) setStockMarketState(data.state)
      }).catch(() => {})
    } catch (err: any) {
      showToast('Error updating credentials: ' + err.message, 'error')
    } finally {
      setTogglingCreds(false)
    }
  }

  useEffect(() => {
    const checkMarket = async () => {
      try {
        const res = await fetch(`${STOCK_MARKET_URL}/api/market/state`, { cache: 'no-store' })
        const data = await res.json()
        if (data.state) setStockMarketState(data.state)
      } catch {
        // Stock market server offline or spinning up
      }
      // Direct database verification
      try {
        const active = await LocalDB.getActiveHackathon()
        if (active) setHackathon(active)
      } catch {}
    }
    checkMarket()
    const interval = setInterval(checkMarket, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }

    async function loadData() {
      try {
        const active = await LocalDB.getActiveHackathon()
        setHackathon(active)
        if (active && user) {
          const reg = await LocalDB.getRegistrationByLeader(user.id, active.id, user.email)
          setRegistration(reg)
          if (!reg) {
            const allMyRegs = await LocalDB.getRegistrationsByLeaderAsync(user.id, user.email)
            if (allMyRegs.length > 0) {
              setRegistration(allMyRegs[0])
            }
          }
        } else if (user) {
          const allMyRegs = await LocalDB.getRegistrationsByLeaderAsync(user.id, user.email)
          if (allMyRegs.length > 0) {
            setRegistration(allMyRegs[0])
          }
        }
      } finally {
        setDataLoading(false)
      }
    }
    loadData()
  }, [user, authLoading, router])

  const startEdit = () => {
    if (!user) return
    setEditName(user.full_name)
    setEditPhone(user.phone || '')
    setEditSrn(user.srn || '')
    setEditDepartment(user.department || '')
    setEditSemester(user.semester || '')
    setEditSection(user.section || '')
    setEditResidenceType((user.residence_type as ResidenceType) || 'Non-Hostelite')
    setEditing(true)
  }

  const cancelEdit = () => setEditing(false)

  const saveEdit = async () => {
    if (!user) return
    setSaving(true)
    try {
      const ok = await LocalDB.updateProfile(user.id, {
        full_name: editName.trim(),
        phone: editPhone.trim(),
        srn: editSrn.trim().toUpperCase(),
        department: editDepartment.trim() || undefined,
        semester: editSemester.trim() || undefined,
        section: editSection.trim() || undefined,
        residence_type: editResidenceType
      }, user.email)
      if (ok) {
        updateProfile({
          full_name: editName.trim(),
          phone: editPhone.trim() || undefined,
          srn: editSrn.trim().toUpperCase() || undefined,
          department: editDepartment.trim() || undefined,
          semester: editSemester.trim() || undefined,
          section: editSection.trim() || undefined,
          residence_type: editResidenceType
        })
        showToast('Profile updated successfully!', 'success')
        setEditing(false)
      } else {
        showToast('Failed to update profile. Please try again.', 'error')
      }
    } catch {
      showToast('Error updating profile.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#050814]">
        <div className="w-9 h-9 border-3 border-[#00D2FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const statusConfig = {
    pending: {
      banner: 'bg-amber-950/40 border-amber-700/60 text-amber-300',
      icon: <Clock className="w-5 h-5 text-amber-400" />,
      label: 'Under Review (Waitlisted)',
      message: 'Your team registration is currently being verified by the organizers.'
    },
    approved: {
      banner: 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      label: 'Registration Approved & Confirmed!',
      message: 'Your team is officially registered for Arth Mantra Hackathon!'
    },
    rejected: {
      banner: 'bg-rose-950/40 border-rose-700/60 text-rose-300',
      icon: <AlertCircle className="w-5 h-5 text-rose-400" />,
      label: 'Registration Not Approved',
      message: 'Your registration could not be verified.'
    }
  }

  return (
    <div className="min-h-screen text-slate-100 py-8 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Participant Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage your personal credentials & view your team&apos;s status</p>
        </div>

        {/* Admin Quick Control Banner (visible to Admins/Superadmins/Market Admins) */}
        {(isAdmin || isMarketAdmin || isDev) && (
          <div className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl ${
            stockMarketState?.credentials_released || hackathon?.credentials_released
              ? 'bg-gradient-to-r from-emerald-950/90 via-[#0B211E] to-[#0A1220] border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.25)]'
              : 'bg-gradient-to-r from-[#0C1427] via-[#0E1726] to-[#0A1220] border-slate-700 shadow-md'
          }`}>
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                stockMarketState?.credentials_released || hackathon?.credentials_released
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400'
              }`}>
                {stockMarketState?.credentials_released || hackathon?.credentials_released ? (
                  <Eye className="w-6 h-6 text-emerald-400 animate-pulse" />
                ) : (
                  <EyeOff className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#00D2FF] bg-cyan-950/80 border border-cyan-800 px-2 py-0.5 rounded-full">
                    Admin Quick Control
                  </span>
                  <h3 className="font-mono font-black text-white text-sm sm:text-base uppercase tracking-wider">
                    Stock Market Credentials
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black border uppercase ${
                    stockMarketState?.credentials_released || hackathon?.credentials_released
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-600 animate-pulse'
                      : 'bg-rose-950 text-rose-400 border-rose-800'
                  }`}>
                    {stockMarketState?.credentials_released || hackathon?.credentials_released ? '● Revealed to Teams' : '○ Hidden from Teams'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {stockMarketState?.credentials_released || hackathon?.credentials_released
                    ? 'All approved teams can currently see their Team Codes, Trader PINs, and 1-click Trading Link.'
                    : 'Credentials are currently concealed from teams. Click Reveal when ready for teams to prepare.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                type="button"
                disabled={togglingCreds}
                onClick={() => handleToggleCredentials(!Boolean(stockMarketState?.credentials_released || hackathon?.credentials_released))}
                className={`py-2.5 px-5 rounded-xl font-mono font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50 ${
                  stockMarketState?.credentials_released || hackathon?.credentials_released
                    ? 'bg-rose-950/90 hover:bg-rose-900 text-rose-300 border border-rose-700 hover:shadow-rose-900/30'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-900/40'
                }`}
              >
                {stockMarketState?.credentials_released || hackathon?.credentials_released ? (
                  <>
                    <EyeOff className="w-4 h-4" /> Hide Credentials from Teams
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" /> Reveal Credentials to Teams
                  </>
                )}
              </button>
              <Link
                href="/admin"
                className="py-2.5 px-4 rounded-xl font-mono font-bold text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-[#00D2FF]" /> Admin Console
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left — Profile Card */}
          <div className="lg:col-span-2">
            <div className="bg-[#0C1222] rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0072FF] to-[#00D2FF]" />

              {/* Avatar */}
              <div className="flex items-center gap-4 mb-6 pt-1">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0072FF] to-[#00D2FF] text-slate-950 flex items-center justify-center font-black text-2xl uppercase shadow-[0_0_15px_rgba(0,210,255,0.3)]">
                  {user.full_name?.[0] || 'U'}
                </div>
                <div>
                  <h2 className="font-black text-white text-lg leading-tight">{user.full_name}</h2>
                  <div className="text-xs text-[#00D2FF] font-bold capitalize mt-0.5">{user.role}</div>
                </div>
              </div>

              {!editing ? (
                <>
                  <div className="space-y-3 mb-5">
                    {[
                      { icon: <Mail className="w-4 h-4" />, label: 'Email', value: user.email },
                      { icon: <GraduationCap className="w-4 h-4" />, label: 'SRN', value: user.srn || 'Not set' },
                      { icon: <Phone className="w-4 h-4" />, label: 'Phone', value: user.phone || 'Not set' },
                      { icon: <BookOpen className="w-4 h-4" />, label: 'Department', value: user.department || 'Not set' },
                      { icon: <Layers className="w-4 h-4" />, label: 'Semester', value: user.semester ? `Semester ${user.semester}` : 'Not set' },
                      { icon: <Bookmark className="w-4 h-4" />, label: 'Section', value: user.section ? `Section ${user.section}` : 'Not set' },
                      { icon: <Building2 className="w-4 h-4" />, label: 'Residence Status', value: user.residence_type || 'Non-Hostelite' },
                    ].map(({ icon, label, value }) => (
                      <div key={label} className="flex items-start gap-3 text-sm">
                        <div className="w-8 h-8 rounded-xl bg-cyan-950/60 border border-cyan-800/80 flex items-center justify-center text-[#00D2FF] flex-shrink-0 mt-0.5">
                          {icon}
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">{label}</div>
                          <div className="font-semibold text-slate-200">{value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={startEdit}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-cyan-800/80 bg-cyan-950/40 hover:bg-cyan-900/50 text-[#00D2FF] font-bold text-xs transition-all cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" /> Edit Profile
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Full Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-3 py-2 text-xs text-white outline-none pl-8"
                      />
                      <User className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Phone</label>
                    <div className="relative">
                      <input
                        type="tel"
                        maxLength={10}
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-3 py-2 text-xs text-white outline-none pl-8 font-mono"
                      />
                      <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">SRN</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editSrn}
                        onChange={e => setEditSrn(e.target.value)}
                        className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-3 py-2 text-xs text-white outline-none pl-8 uppercase font-mono font-bold"
                      />
                      <GraduationCap className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Department / Course</label>
                    <div className="relative">
                      <select
                        value={editDepartment}
                        onChange={e => setEditDepartment(e.target.value)}
                        className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-3 py-2 text-xs text-white outline-none pl-8 cursor-pointer"
                      >
                        <option value="" disabled className="bg-[#0C1222] text-slate-500">Select Department</option>
                        {PES_DEPARTMENTS.map(d => (
                          <option key={d} value={d} className="bg-[#0C1222] text-white">{d}</option>
                        ))}
                      </select>
                      <BookOpen className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Semester (1-7)</label>
                      <div className="relative">
                        <select
                          value={editSemester}
                          onChange={e => setEditSemester(e.target.value)}
                          className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-3 py-2 text-xs text-white outline-none pl-8 cursor-pointer font-bold"
                        >
                          <option value="" disabled className="bg-[#0C1222] text-slate-500">Sem</option>
                          {SEMESTER_OPTIONS.map(s => (
                            <option key={s} value={s} className="bg-[#0C1222] text-white">Sem {s}</option>
                          ))}
                        </select>
                        <Layers className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Section (A-G)</label>
                      <div className="relative">
                        <select
                          value={editSection}
                          onChange={e => setEditSection(e.target.value)}
                          className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-3 py-2 text-xs text-white outline-none pl-8 cursor-pointer font-bold"
                        >
                          <option value="" disabled className="bg-[#0C1222] text-slate-500">Sec</option>
                          {SECTION_OPTIONS.map(sec => (
                            <option key={sec} value={sec} className="bg-[#0C1222] text-white">Sec {sec}</option>
                          ))}
                        </select>
                        <Bookmark className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Residence Status</label>
                    <div className="relative">
                      <select
                        value={editResidenceType}
                        onChange={e => setEditResidenceType(e.target.value as ResidenceType)}
                        className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-3 py-2 text-xs text-white outline-none pl-8 cursor-pointer font-bold"
                      >
                        {RESIDENCE_OPTIONS.map(opt => (
                          <option key={opt} value={opt} className="bg-[#0C1222] text-white">{opt}</option>
                        ))}
                      </select>
                      <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-gradient-to-r from-[#0072FF] to-[#00D2FF] text-slate-950 font-black text-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right — My Registration */}
          <div className="lg:col-span-3">
            <div className="bg-[#0C1222] rounded-3xl p-4 sm:p-7 border border-slate-800 shadow-xl">
              <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#00D2FF]" />
                My Team Registration
              </h3>

              {!registration ? (
                <div className="text-center py-10 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-800 text-[#00D2FF] flex items-center justify-center mx-auto mb-2">
                    <Users className="w-7 h-7" />
                  </div>
                  <p className="text-white text-base font-bold">You haven&apos;t registered a team yet.</p>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto">
                    Form a squad of 4 to 6 members and secure your slot for the Arth Mantra Hackathon!
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/register-team"
                      className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-[#0072FF] via-[#00D2FF] to-[#38BDF8] text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,210,255,0.3)]"
                    >
                      Register Your Team →
                    </Link>
                  </div>
                </div>
              ) : (
                (() => {
                  const cfg = statusConfig[registration.status]
                  return (
                    <div className="space-y-4">
                      {/* Status banner */}
                      <div className={`flex items-center gap-3 p-4 rounded-2xl border ${cfg.banner}`}>
                        <div>{cfg.icon}</div>
                        <div>
                          <div className="font-black text-sm">{cfg.label}</div>
                          <div className="text-xs opacity-90">{cfg.message}</div>
                        </div>
                      </div>

                      {/* Rejection comment */}
                      {registration.status === 'rejected' && registration.rejection_comment && (
                        <div className="bg-rose-950/40 border border-rose-800/80 rounded-2xl p-4 text-xs text-rose-300">
                          <strong>Admin Feedback:</strong> {registration.rejection_comment}
                        </div>
                      )}

                      {/* WhatsApp Button for approved */}
                      {registration.status === 'approved' && (
                        <a
                          href={hackathon?.whatsapp_link || 'https://chat.whatsapp.com/ArthMantraHackathon'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-3.5 px-5 rounded-2xl bg-[#25D366] hover:bg-[#20BA5A] text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(37,211,102,0.3)]"
                        >
                          <MessageSquare className="w-4 h-4" /> Join Official Participant WhatsApp Group
                        </a>
                      )}

                      {/* ASSIGNED PROBLEM STATEMENT (CONFIDENTIAL - ONLY VIEWABLE ONCE REVEALED BY ADMIN) */}
                      {registration.status === 'approved' && Boolean(hackathon?.ps_released) && (
                          registration.assigned_problem_statement ? (
                            <div className="bg-gradient-to-br from-[#0C1222] via-[#0E162A] to-[#0A1020] border-2 border-indigo-500/50 rounded-3xl p-5 sm:p-6 shadow-[0_0_35px_rgba(99,102,241,0.2)] space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-900/50">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                                    <BookOpen className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-mono font-black text-white text-sm uppercase tracking-wider">
                                        Assigned Problem Statement
                                      </h4>
                                      <span className="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 text-[10px] font-mono font-black border border-indigo-700 uppercase">
                                        {registration.assigned_problem_statement.track}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-indigo-300/80 font-mono">
                                      Confidential Briefing • Allocated exclusively to your squad
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/60 border border-rose-800 text-rose-300 text-[10px] font-mono font-bold self-start sm:self-auto">
                                  <Lock className="w-3 h-3 text-rose-400" /> Private Team Briefing
                                </div>
                              </div>

                              <div className="space-y-2">
                                <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                                  {registration.assigned_problem_statement.title}
                                </h3>
                                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                                  {registration.assigned_problem_statement.description}
                                </p>
                              </div>

                              {registration.assigned_problem_statement.deliverables && (
                                <div className="p-3.5 rounded-2xl bg-[#080E1C] border border-slate-800 space-y-1.5">
                                  <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Key Deliverables Expected:
                                  </span>
                                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                                    {registration.assigned_problem_statement.deliverables}
                                  </p>
                                </div>
                              )}

                              {registration.assigned_problem_statement.pdf_url && (
                                <div className="pt-2">
                                  <a
                                    href={registration.assigned_problem_statement.pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={registration.assigned_problem_statement.pdf_name || 'Problem_Statement.pdf'}
                                    className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] cursor-pointer"
                                  >
                                    <Download className="w-4 h-4" /> Download Problem Statement PDF ({registration.assigned_problem_statement.pdf_name || 'Document'})
                                  </a>
                                </div>
                              )}

                              {registration.assigned_problem_statement.resources && (
                                <div className="pt-1">
                                  <a
                                    href={registration.assigned_problem_statement.resources}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 hover:underline"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" /> Problem Briefing Documentation & Reference Material →
                                  </a>
                                </div>
                              )}

                              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 font-mono flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>
                                  <strong>Confidentiality Policy:</strong> Sharing your assigned statement or valuation models with other squads leads to immediate disqualification.
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-[#080E1C]/90 border border-slate-800 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                  <BookOpen className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div>
                                  <div className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                                    Round 1: Problem Statement Briefing
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-sans">
                                    Your squad&apos;s confidential problem statement is currently being assigned by the organizing committee.
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-500 shrink-0">
                                Awaiting Allocation
                              </span>
                            </div>
                          )

                      )}

                      {/* ASSIGNED DATASHEET (EXCEL/CSV - CONFIDENTIAL - ONLY VIEWABLE ONCE REVEALED BY ADMIN) */}
                      {registration.status === 'approved' && Boolean(hackathon?.datasheets_released) && (
                          registration.assigned_datasheet ? (
                            <div className="bg-gradient-to-br from-[#071915] via-[#0A1F1B] to-[#081512] border-2 border-emerald-500/60 rounded-3xl p-5 sm:p-6 shadow-[0_0_35px_rgba(16,185,129,0.2)] space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-900/50">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                                    <FileSpreadsheet className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-mono font-black text-white text-sm uppercase tracking-wider">
                                        Assigned Financial & Operating Datasheet
                                      </h4>
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-mono font-black border border-emerald-700 uppercase">
                                        Round 2 Intel
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-emerald-300/80 font-mono">
                                      Confidential Dataset • Allocated exclusively to your squad
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[10px] font-mono font-bold self-start sm:self-auto">
                                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> Team Specific
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="text-sm font-bold text-white font-mono flex items-center gap-2">
                                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                                  <span>{registration.assigned_datasheet.file_name}</span>
                                </div>
                                {registration.assigned_datasheet.notes && (
                                  <p className="text-xs text-slate-300 leading-relaxed font-sans pt-1">
                                    {registration.assigned_datasheet.notes}
                                  </p>
                                )}
                              </div>

                              <div className="pt-2">
                                <a
                                  href={registration.assigned_datasheet.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={registration.assigned_datasheet.file_name || 'Team_Datasheet.xlsx'}
                                  className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-mono font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
                                >
                                  <Download className="w-4 h-4" /> Download Assigned Datasheet (.xlsx)
                                </a>
                              </div>

                              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 font-mono flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>
                                  <strong>Confidentiality Policy:</strong> This dataset is tailored to your case track. Sharing across teams will result in disqualification.
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-[#080E1C]/90 border border-slate-800 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div>
                                  <div className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                                    Round 2: Operational & Financial Datasheets
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-sans">
                                    Your squad&apos;s specific dataset will be uploaded shortly by the evaluators.
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-500 shrink-0">
                                Awaiting Upload
                              </span>
                            </div>
                          )

                      )}

                      {/* Round 3: Stock Market Trading Portal (ONLY POPS UP ONCE ADMIN RELEASES CREDENTIALS) */}
                      {(() => {
                        const isCredentialsUnlocked = Boolean(stockMarketState?.credentials_released || hackathon?.credentials_released);
                        const isApproved = String(registration?.status || '').toLowerCase().trim() === 'approved';
                        const teamCode = `ARTH-${registration.id.slice(-4).toUpperCase()}`;
                        const traderPin = getTeamTraderPin(registration);
                        const directLaunchUrl = `${STOCK_MARKET_URL}?code=${encodeURIComponent(teamCode)}&pin=${encodeURIComponent(traderPin)}`;

                        if (isApproved && isCredentialsUnlocked) {
                          return (
                            <div className="bg-gradient-to-br from-[#07131B] via-[#0B1A28] to-[#0A1220] border-2 border-emerald-500 rounded-3xl p-5 sm:p-6 shadow-[0_0_35px_rgba(16,185,129,0.3)] space-y-4">
                              <div className="flex items-center justify-between pb-3 border-b border-emerald-900/60">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                                    <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                                  </div>
                                  <div>
                                    <h4 className="font-mono font-black text-white text-sm uppercase tracking-wider">
                                      ROUND 3: STOCK MARKET TRADING ACCESS
                                    </h4>
                                    <span className="text-[11px] text-emerald-300 font-mono">
                                      {stockMarketState?.status === 'OPEN' 
                                        ? 'Trading floor is currently OPEN & LIVE' 
                                        : stockMarketState?.status === 'PAUSED'
                                        ? 'Trading floor is currently PAUSED'
                                        : 'Credentials Released — Ready for Trading'}
                                    </span>
                                  </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-black border uppercase ${
                                  stockMarketState?.status === 'OPEN'
                                    ? 'bg-emerald-950 text-emerald-400 border-emerald-600 animate-pulse'
                                    : stockMarketState?.status === 'PAUSED'
                                    ? 'bg-amber-950 text-amber-400 border-amber-600'
                                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                                }`}>
                                  {stockMarketState?.status || 'UNLOCKED'}
                                </span>
                              </div>

                              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                                Your squad has been authorized for market access. Copy your credentials below to enter the terminal:
                              </p>

                              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
                                  <div>
                                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Your Team Code</span>
                                    <span className="text-cyan-400 font-extrabold text-sm tracking-wider">
                                      {teamCode}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(teamCode)
                                      setCopiedCode(true)
                                      setTimeout(() => setCopiedCode(false), 2000)
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                    title="Copy Team Code"
                                  >
                                    {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                  </button>
                                </div>

                                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
                                  <div>
                                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Trader PIN</span>
                                    <span className="text-emerald-400 font-extrabold text-sm tracking-wider">
                                      {traderPin}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(traderPin)
                                      setCopiedPin(true)
                                      setTimeout(() => setCopiedPin(false), 2000)
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                    title="Copy Trader PIN"
                                  >
                                    {copiedPin ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>

                              <div className="text-[11px] text-amber-300 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/60 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                                <span>
                                  <strong>Trading Rule:</strong> Only the designated <strong>Team Leader</strong> can execute buy/sell orders.
                                </span>
                              </div>

                              <a
                                href={directLaunchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 font-black font-mono text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer"
                              >
                                <span>Enter Stock Market Floor →</span>
                              </a>
                            </div>
                          );
                        }



                        return null;
                      })()}

                      {/* ROUND 4: THE RESOURCE AUCTION SHEET (OFFICIAL MASTER INVENTORY) */}
                      {registration.status === 'approved' && Boolean(hackathon?.auction_released) && (
                          (hackathon?.auction_sheet || (registration as any).assigned_auction_sheet) ? (
                            <div className="bg-gradient-to-br from-[#180D2E] via-[#140B26] to-[#0A0718] border-2 border-purple-500/70 rounded-3xl p-5 sm:p-6 shadow-[0_0_35px_rgba(168,85,247,0.25)] space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-purple-900/50">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                                    <Gavel className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-mono font-black text-white text-sm uppercase tracking-wider">
                                        ROUND 4: THE RESOURCE AUCTION SHEET
                                      </h4>
                                      <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 text-[10px] font-mono font-black border border-purple-700 uppercase">
                                        Master Auction Catalog
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-purple-300/80 font-mono">
                                      Official Bidding Inventory • Uniformly assigned to all approved teams
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/80 border border-purple-800 text-purple-300 text-[10px] font-mono font-bold self-start sm:self-auto">
                                  <Award className="w-3 h-3 text-purple-400" /> All Squads Catalog
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="text-sm font-bold text-white font-mono flex items-center gap-2">
                                  <FileSpreadsheet className="w-4 h-4 text-purple-400 shrink-0" />
                                  <span>{(hackathon?.auction_sheet || (registration as any).assigned_auction_sheet)?.file_name}</span>
                                </div>
                                {(hackathon?.auction_sheet || (registration as any).assigned_auction_sheet)?.notes && (
                                  <p className="text-xs text-slate-300 leading-relaxed font-sans pt-1">
                                    {(hackathon?.auction_sheet || (registration as any).assigned_auction_sheet)?.notes}
                                  </p>
                                )}
                              </div>

                              <div className="pt-2">
                                <a
                                  href={(hackathon?.auction_sheet || (registration as any).assigned_auction_sheet)?.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={(hackathon?.auction_sheet || (registration as any).assigned_auction_sheet)?.file_name || 'Round4_Auction_Sheet.xlsx'}
                                  className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 text-white font-mono font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] cursor-pointer"
                                >
                                  <Download className="w-4 h-4" /> Download Official Auction Sheet
                                </a>
                              </div>

                              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 font-mono flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                                <span>
                                  <strong>Auction Rules:</strong> Review the lots, asset valuations, and starting base prices carefully before the live auctioneer gavel begins.
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-[#080E1C]/90 border border-slate-800 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                  <Gavel className="w-4 h-4 text-purple-400" />
                                </div>
                                <div>
                                  <div className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                                    Round 4: Resource Auction Sheet
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-sans">
                                    The master auction inventory sheet will be uploaded here shortly by the auction coordinators.
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-500 shrink-0">
                                Awaiting Upload
                              </span>
                            </div>
                          )

                      )}

                      {/* Live Scorecard (if approved) */}
                      {registration.status === 'approved' && (
                        <div className="bg-[#080E1C] p-4 sm:p-5 rounded-2xl border border-[#FF7A00]/40 shadow-[0_0_15px_rgba(255,122,0,0.1)] space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Trophy className="w-4 h-4 text-[#FF7A00]" />
                              <span className="text-xs font-black uppercase text-white tracking-wider">
                                Live Scorecard
                              </span>
                            </div>
                            <Link
                              href="/leaderboard"
                              className="text-[11px] font-bold text-cyan-400 hover:underline flex items-center gap-1"
                            >
                              Leaderboard <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                            <div className="bg-[#0C1222] p-2.5 rounded-xl border border-slate-800">
                              <div className="text-[10px] text-slate-400">R1: Ideas</div>
                              <div className="text-base font-black text-cyan-400">{registration.round_1_score || 0}</div>
                            </div>
                            <div className="bg-[#0C1222] p-2.5 rounded-xl border border-slate-800">
                              <div className="text-[10px] text-slate-400">R2: Build</div>
                              <div className="text-base font-black text-cyan-400">{registration.round_2_score || 0}</div>
                            </div>
                            <div className="bg-[#0C1222] p-2.5 rounded-xl border border-slate-800">
                              <div className="text-[10px] text-slate-400">R3: Pitch</div>
                              <div className="text-base font-black text-cyan-400">{registration.round_3_score || 0}</div>
                            </div>
                            <div className="bg-[#0C1222] p-2.5 rounded-xl border border-[#FF7A00]/40">
                              <div className="text-[10px] text-[#FF7A00] font-bold">Total</div>
                              <div className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FF7A00]">
                                {registration.score || 0}
                              </div>
                            </div>
                          </div>

                          {registration.judge_notes && (
                            <div className="text-xs text-amber-200/90 italic bg-amber-950/30 p-2.5 rounded-xl border border-amber-800/40">
                              Judge Notes: &quot;{registration.judge_notes}&quot;
                            </div>
                          )}
                        </div>
                      )}

                      {/* Registration details */}
                      <div className="bg-[#080E1C] rounded-2xl p-4 border border-slate-800 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Hackathon</span>
                          <span className="font-bold text-white">{registration.hackathon_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Team Name</span>
                          <span className="font-bold text-[#00D2FF]">{registration.team_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Submitted</span>
                          <span className="font-bold text-slate-300">{new Date(registration.created_at).toLocaleDateString()}</span>
                        </div>
                        {registration.utr_reference && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">UTR Reference</span>
                            <span className="font-mono text-cyan-300">{registration.utr_reference}</span>
                          </div>
                        )}
                      </div>

                      {/* Members list */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-[#00D2FF]" />
                          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                            Team Members ({registration.members.length})
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {registration.members.map((m, i) => (
                            <div key={i} className="flex items-center gap-3 py-2.5 px-3.5 bg-[#080E1C] rounded-xl border border-slate-800">
                              <div className="w-6 h-6 rounded-lg bg-cyan-950/80 text-[#00D2FF] border border-cyan-800 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-white text-xs truncate">{m.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {m.srn} • {m.phone}
                                  {m.department && ` • ${m.department}`}
                                  {m.semester && ` (Sem ${m.semester}${m.section ? `-${m.section}` : ''})`}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className={`text-[9px] px-2 py-0.5 rounded font-bold border ${
                                  m.residence_type === 'Hostelite'
                                    ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                                    : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                                }`}>
                                  {m.residence_type || 'Non-Hostelite'}
                                </span>
                                {i === 0 && (
                                  <span className="text-[10px] bg-cyan-950/80 text-[#00D2FF] border border-cyan-800 px-2 py-0.5 rounded font-black">
                                    Leader
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })()
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
