'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Compass, ArrowRight, ArrowLeft, Upload, CheckCircle2, AlertCircle,
  Check, Clock, User, Phone, Mail, GraduationCap, Plus, X, Users,
  DollarSign, Sparkles, BookOpen, Layers, Bookmark, Building2,
  Scale, ChevronDown, ChevronUp, ShieldCheck, Award, FileText
} from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/ToastProvider'
import { LocalDB } from '@/lib/storage'
import { Hackathon, TeamMember, TeamRegistration, PES_DEPARTMENTS, SEMESTER_OPTIONS, SECTION_OPTIONS, RESIDENCE_OPTIONS } from '@/types'

interface MemberForm {
  name: string
  srn: string
  phone: string
  email: string
  department?: string
  semester?: string
  section?: string
  residence_type?: string
}

const emptyMember = (): MemberForm => ({
  name: '',
  srn: '',
  phone: '',
  email: '',
  department: '',
  semester: '',
  section: '',
  residence_type: 'Non-Hostelite'
})

export default function RegisterTeamPage() {
  const { user, loading: authLoading } = useAuth()
  const { showToast } = useToast()

  const [hackathon, setHackathon] = useState<Hackathon | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [existingReg, setExistingReg] = useState<TeamRegistration | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1 state
  const [teamName, setTeamName] = useState('')
  const [additionalMembers, setAdditionalMembers] = useState<MemberForm[]>([
    emptyMember(), emptyMember(), emptyMember()
  ])
  const [agreedToRules, setAgreedToRules] = useState(false)
  const [showFullRules, setShowFullRules] = useState(false)

  // Step 2 state
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string>('')
  const [utrNumber, setUtrNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Step 3 state
  const [submittedReg, setSubmittedReg] = useState<TeamRegistration | null>(null)

  useEffect(() => {
    if (authLoading) return
    async function loadData() {
      try {
        const active = await LocalDB.getActiveHackathon()
        setHackathon(active)
        if (active && user) {
          const reg = await LocalDB.getRegistrationByLeader(user.id, active.id)
          setExistingReg(reg)
        }
      } finally {
        setDataLoading(false)
      }
    }
    loadData()
  }, [user, authLoading])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file.', 'error')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('Image must be under 8MB.', 'error')
      return
    }
    setScreenshotFile(file)
    const reader = new FileReader()
    reader.onload = () => setScreenshotPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const addMember = () => {
    if (additionalMembers.length < 5) {
      setAdditionalMembers(prev => [...prev, emptyMember()])
    }
  }

  const removeMember = (idx: number) => {
    if (additionalMembers.length > 3) {
      setAdditionalMembers(prev => prev.filter((_, i) => i !== idx))
    }
  }

  const updateMember = (idx: number, field: keyof MemberForm, value: string) => {
    setAdditionalMembers(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: value }
      return updated
    })
  }

  const handleStep1Continue = (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) {
      showToast('Please enter a team name.', 'warning')
      return
    }
    if (additionalMembers.length < 3) {
      showToast('You need at least 3 additional members (minimum 4 total).', 'warning')
      return
    }
    for (let i = 0; i < additionalMembers.length; i++) {
      const m = additionalMembers[i]
      if (!m.name.trim() || !m.srn.trim() || !m.phone.trim() || !m.email.trim()) {
        showToast(`Please fill in all details for Member ${i + 2}.`, 'warning')
        return
      }
      if (!m.department || !m.semester || !m.section) {
        showToast(`Please select Department, Semester, and Section for Member ${i + 2}.`, 'warning')
        return
      }
    }
    if (!agreedToRules) {
      showToast('Please tick the box to agree to the Rules & Regulations to proceed to the next page.', 'warning')
      return
    }
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hackathon || !user) return

    if (!screenshotFile && !screenshotPreview) {
      showToast('Please upload your payment screenshot proof.', 'warning')
      return
    }

    setSubmitting(true)
    try {
      let finalScreenshotUrl = screenshotPreview

      if (screenshotFile) {
        try {
          const formData = new FormData()
          formData.append('file', screenshotFile)
          const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json()
            if (uploadData?.url) {
              finalScreenshotUrl = uploadData.url
            }
          }
        } catch (uploadErr) {
          console.warn('Upload error, using fallback preview URL:', uploadErr)
        }
      }

      const leaderMember: TeamMember = {
        name: user.full_name,
        srn: user.srn || '',
        phone: user.phone || '',
        email: user.email,
        department: user.department,
        semester: user.semester,
        section: user.section,
        residence_type: user.residence_type || 'Non-Hostelite'
      }
      const members: TeamMember[] = [leaderMember, ...additionalMembers]

      const newReg = await LocalDB.addRegistration({
        hackathon_id: hackathon.id,
        hackathon_name: hackathon.name,
        leader_user_id: user.id,
        leader_email: user.email,
        team_name: teamName.trim(),
        members,
        payment_screenshot_url: finalScreenshotUrl,
        utr_reference: utrNumber.trim() || undefined,
        status: 'pending'
      })

      setSubmittedReg(newReg)
      setStep(3)
      showToast('Registration submitted for approval!', 'success')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting registration'
      showToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#050814]">
        <div className="w-9 h-9 border-3 border-[#00D2FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center gap-5 bg-[#050814]">
        <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-800 text-[#00D2FF] flex items-center justify-center shadow-md">
          <Compass className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white mb-1.5">Authentication Required</h1>
          <p className="text-slate-400 text-sm max-w-sm">Please sign in to register your team for the Arth Mantra Hackathon.</p>
        </div>
        <Link
          href="/login"
          className="flex items-center gap-2 py-3 px-7 rounded-xl bg-gradient-to-r from-[#0072FF] to-[#00D2FF] text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(0,210,255,0.3)] transition-all"
        >
          Sign In
        </Link>
      </div>
    )
  }

  if (!hackathon) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center gap-5 bg-[#050814]">
        <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-800 text-[#00D2FF] flex items-center justify-center shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white mb-1.5">No Active Hackathon</h1>
          <p className="text-slate-400 text-sm">Registrations are currently closed. Check back soon!</p>
        </div>
        <Link href="/" className="text-[#00D2FF] font-bold text-sm hover:underline">← Back to Home</Link>
      </div>
    )
  }

  // Already registered
  if (existingReg && step !== 3) {
    const statusConfig = {
      pending: { bg: 'bg-amber-950/40', border: 'border-amber-700/60', text: 'text-amber-300', icon: <Clock className="w-5 h-5 text-amber-400" />, label: 'Under Review' },
      approved: { bg: 'bg-emerald-950/40', border: 'border-emerald-700/60', text: 'text-emerald-300', icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />, label: 'Approved' },
      rejected: { bg: 'bg-rose-950/40', border: 'border-rose-700/60', text: 'text-rose-300', icon: <AlertCircle className="w-5 h-5 text-rose-400" />, label: 'Not Approved' }
    }
    const cfg = statusConfig[existingReg.status]

    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 bg-[#050814]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className={`${cfg.bg} ${cfg.border} border rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl`}
        >
          <div className={`${cfg.text} flex items-center justify-center gap-2 text-lg font-black mb-2`}>
            {cfg.icon} Your team is {cfg.label}
          </div>
          <p className="text-white text-base font-bold mb-1">Team: <strong>{existingReg.team_name}</strong></p>
          <p className="text-slate-400 text-xs mb-5">
            Submitted on {new Date(existingReg.created_at).toLocaleDateString()}
          </p>
          {existingReg.rejection_comment && (
            <p className="text-rose-300 text-xs bg-rose-950/50 border border-rose-800 rounded-xl p-3 mb-5">
              Reason: {existingReg.rejection_comment}
            </p>
          )}
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-[#0072FF] to-[#00D2FF] text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,210,255,0.3)]"
          >
            View Full Team Dashboard →
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-slate-100 py-8 sm:py-12 px-3.5 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-[#0C1222] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0B1528] to-[#040814] border border-[#00D2FF]/40 flex items-center justify-center text-[#00D2FF] flex-shrink-0 shadow-[0_0_12px_rgba(0,210,255,0.2)]">
              <Compass className="w-6 h-6 text-[#00D2FF]" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest font-black text-[#00D2FF] block">
                PES University • Hackathon Registration
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{hackathon.name}</h1>
              <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-1 flex-wrap font-medium">
                <span>📅 {hackathon.date}</span>
                <span className="text-[#FF7A00] font-black">₹{hackathon.entry_fee} per team</span>
                <span>👥 4 to 6 members</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3 text-center">
          {[
            { num: 1, label: 'Team Roster' },
            { num: 2, label: 'Payment Proof' },
            { num: 3, label: 'Waitlist' }
          ].map(({ num, label }) => (
            <div key={num} className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all ${
              step === num
                ? 'bg-cyan-950/40 border-[#00D2FF] text-[#00D2FF] shadow-[0_0_15px_rgba(0,210,255,0.2)]'
                : step > num
                ? 'bg-emerald-950/40 border-emerald-700/80 text-emerald-300'
                : 'bg-[#0C1222] border-slate-800 text-slate-500'
            }`}>
              <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-widest block">Step 0{num}</span>
              <span className="text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 mt-0.5 truncate">
                {step > num && <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />} {label}
              </span>
            </div>
          ))}
        </div>

        {/* STEP 1: Team Details */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#0C1222] rounded-3xl p-4 sm:p-8 border border-slate-800 shadow-xl space-y-6"
          >
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00D2FF]" /> Squad Configuration
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your unique team name and member details. (Min 4, Max 6 total).
              </p>
            </div>

            {/* Team Leader Disclaimer */}
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-600/60 shadow-[0_0_15px_rgba(245,158,11,0.15)] flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xs">
                <span className="font-black uppercase tracking-wider text-amber-300 block mb-0.5">
                  ⚠️ Disclaimer for Participants
                </span>
                <p className="text-amber-100/90 leading-relaxed">
                  <strong>Only the Team Leader should register the team.</strong> The leader fills out the information for all remaining team members below. Other members should <strong>not</strong> submit duplicate registrations.
                </p>
              </div>
            </div>

            <form onSubmit={handleStep1Continue} className="space-y-6">
              {/* Team Name */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-300 font-bold mb-1.5">
                  Team Name <span className="text-[#FF7A00]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="Enter your team name"
                  className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none font-bold"
                />
              </div>

              {/* Team Leader (read-only) */}
              <div className="bg-[#080E1C] rounded-2xl p-4 sm:p-5 border border-slate-800/80">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Member 1: Team Leader (You)
                  </h3>
                  <span className="text-[9px] bg-cyan-950 text-[#00D2FF] border border-cyan-800 px-2 py-0.5 rounded font-black">
                    Auto-Filled
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { label: 'Name', value: user.full_name, icon: <User className="w-3 h-3 text-[#00D2FF]" /> },
                    { label: 'SRN', value: user.srn || 'Not set', icon: <GraduationCap className="w-3 h-3 text-[#00D2FF]" /> },
                    { label: 'Phone', value: user.phone || 'Not set', icon: <Phone className="w-3 h-3 text-[#00D2FF]" /> },
                    { label: 'Email', value: user.email, icon: <Mail className="w-3 h-3 text-[#00D2FF]" /> },
                    { label: 'Department', value: user.department || 'Not set', icon: <BookOpen className="w-3 h-3 text-[#00D2FF]" /> },
                    { label: 'Semester', value: user.semester ? `Semester ${user.semester}` : 'Not set', icon: <Layers className="w-3 h-3 text-[#00D2FF]" /> },
                    { label: 'Section', value: user.section ? `Section ${user.section}` : 'Not set', icon: <Bookmark className="w-3 h-3 text-[#00D2FF]" /> },
                    { label: 'Residence', value: user.residence_type || 'Non-Hostelite', icon: <Building2 className="w-3 h-3 text-[#00D2FF]" /> },
                  ].map(({ label, value, icon }) => (
                    <div key={label} className="bg-[#0C1222] border border-slate-800 rounded-xl p-2.5">
                      <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-slate-400 mb-0.5">
                        {icon} {label}
                      </div>
                      <div className="text-xs font-bold text-white truncate">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Members */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">Additional Team Members</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {additionalMembers.length} / 5 additional members (minimum 3 required)
                    </p>
                  </div>
                  {additionalMembers.length < 5 && (
                    <button
                      type="button"
                      onClick={addMember}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-800 text-[#00D2FF] text-xs font-bold hover:bg-cyan-900/40 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Member
                    </button>
                  )}
                </div>

                <div className="space-y-3.5">
                  <AnimatePresence>
                    {additionalMembers.map((member, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-[#080E1C] rounded-2xl p-4 border border-slate-800 relative"
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-xs font-black text-[#00D2FF] uppercase tracking-wider">
                            Member {idx + 2}
                          </span>
                          {additionalMembers.length > 3 && (
                            <button
                              type="button"
                              onClick={() => removeMember(idx)}
                              className="w-6 h-6 flex items-center justify-center rounded-lg bg-rose-950/50 border border-rose-800 text-rose-400 hover:bg-rose-900 transition-all cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <input
                            type="text"
                            required
                            value={member.name}
                            onChange={e => updateMember(idx, 'name', e.target.value)}
                            placeholder="Full Name *"
                            className="w-full bg-[#0C1222] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                          />
                          <input
                            type="text"
                            required
                            value={member.srn}
                            onChange={e => updateMember(idx, 'srn', e.target.value)}
                            placeholder="SRN / Roll No *"
                            className="w-full bg-[#0C1222] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none font-mono uppercase"
                          />
                          <input
                            type="tel"
                            required
                            maxLength={10}
                            value={member.phone}
                            onChange={e => updateMember(idx, 'phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="Phone Number *"
                            className="w-full bg-[#0C1222] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none font-mono"
                          />
                          <input
                            type="email"
                            required
                            value={member.email}
                            onChange={e => updateMember(idx, 'email', e.target.value)}
                            placeholder="Email Address *"
                            className="w-full bg-[#0C1222] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                          />
                          <div className="sm:col-span-2">
                            <select
                              required
                              value={member.department || ''}
                              onChange={e => updateMember(idx, 'department', e.target.value)}
                              className="w-full bg-[#0C1222] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                            >
                              <option value="" disabled className="bg-[#0C1222] text-slate-500">
                                -- Select Department / Course * --
                              </option>
                              {PES_DEPARTMENTS.map(dept => (
                                <option key={dept} value={dept} className="bg-[#0C1222] text-white">
                                  {dept}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <select
                              required
                              value={member.semester || ''}
                              onChange={e => updateMember(idx, 'semester', e.target.value)}
                              className="w-full bg-[#0C1222] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer font-bold"
                            >
                              <option value="" disabled className="bg-[#0C1222] text-slate-500">
                                -- Semester (1 to 7) * --
                              </option>
                              {SEMESTER_OPTIONS.map(sem => (
                                <option key={sem} value={sem} className="bg-[#0C1222] text-white">
                                  Semester {sem}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <select
                              required
                              value={member.section || ''}
                              onChange={e => updateMember(idx, 'section', e.target.value)}
                              className="w-full bg-[#0C1222] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer font-bold"
                            >
                              <option value="" disabled className="bg-[#0C1222] text-slate-500">
                                -- Section (A to G) * --
                              </option>
                              {SECTION_OPTIONS.map(sec => (
                                <option key={sec} value={sec} className="bg-[#0C1222] text-white">
                                  Section {sec}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <select
                              required
                              value={member.residence_type || 'Non-Hostelite'}
                              onChange={e => updateMember(idx, 'residence_type', e.target.value)}
                              className="w-full bg-[#0C1222] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer font-bold"
                            >
                              <option value="Non-Hostelite" className="bg-[#0C1222] text-white">
                                Non-Hostelite (Day Scholar)
                              </option>
                              <option value="Hostelite" className="bg-[#0C1222] text-white">
                                Hostelite (Campus Hostel)
                              </option>
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Rules and Regulations Section */}
              <div className="bg-[#080E1C] rounded-2xl p-4 sm:p-5 border border-cyan-900/60 shadow-lg space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-800 text-[#00D2FF] flex items-center justify-center flex-shrink-0">
                      <Scale className="w-4 h-4 text-[#00D2FF]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#00D2FF] block">
                        Official Participant Guidelines & Code of Conduct
                      </span>
                      <h3 className="text-sm font-black text-white">
                        ARTHMANTRA HACKATHON: THE BULL RUN (24-HOUR)
                      </h3>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300">
                    Mandatory
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  The Faculty of Management & Commerce, Institute of Commerce, PES University welcomes you to <strong>ARTHMANTRA: THE BULL RUN</strong>—a high-stakes, 24-hour techno-financial sprint where strategy meets code, markets trade live, and innovation drives capital. All participants must strictly adhere to the guidelines below.
                </p>

                {/* Key Summary Highlights (Concise by default) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="bg-[#0C1222] p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                    <div className="font-bold text-[#00D2FF] flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5" /> Schedule & Reporting
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Nov 6th–7th, 2026 (2:00 PM – 2:00 PM). Report to <strong>PESU 52 (13th Floor, B-Block)</strong> by <strong>1:30 PM sharp</strong> with physical PESU ID.
                    </div>
                  </div>

                  <div className="bg-[#0C1222] p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                    <div className="font-bold text-[#FF7A00] flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <Users className="w-3.5 h-3.5" /> Team & Hardware
                    </div>
                    <div className="text-[11px] text-slate-400">
                      4 to 6 members. All members must stay physically present. Minimum 2 functional laptops with webcams & chargers required.
                    </div>
                  </div>

                  <div className="bg-[#0C1222] p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                    <div className="font-bold text-amber-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <Award className="w-3.5 h-3.5" /> Strict Formal Dress Code
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Executive / Business formal attire mandatory. No shorts, gym wear, crop tops, or torn jeans permitted at any time.
                    </div>
                  </div>

                  <div className="bg-[#0C1222] p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5" /> Fair Play & Discipline
                    </div>
                    <div className="text-[11px] text-slate-400">
                      100% original work built during the sprint. Zero tolerance for market collusion, unauthorized aids, smoking, alcohol, or substances.
                    </div>
                  </div>
                </div>

                {/* Show More / Show Less Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowFullRules(prev => !prev)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00D2FF] hover:text-cyan-300 transition-colors cursor-pointer py-1"
                  >
                    {showFullRules ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Show Less</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Show More (Read Complete 6-Round Protocol, Dress Code, Venue Logistics & Contact Desk)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Full Guidelines Accordion Body */}
                <AnimatePresence>
                  {showFullRules && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 p-4 rounded-xl bg-[#0C1427] border border-cyan-800/70 text-xs text-slate-300 space-y-4 max-h-96 overflow-y-auto pr-2">
                        <div>
                          <h4 className="font-black text-white uppercase tracking-wider text-xs mb-1">
                            1. Event Schedule & Registration Check-In
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] pl-1">
                            <li><strong>Date & Duration:</strong> November 6th – 7th, 2026 | 2:00 PM to 2:00 PM (24 Hours Non-Stop).</li>
                            <li><strong>Venue:</strong> PESU 52 / B-Block, 13th Floor, PES University.</li>
                            <li><strong>Reporting Time:</strong> All teams must report to PESU 52 by <strong>1:30 PM sharp</strong> for team verification, security frisking, and terminal allocation. Late arrivals risk immediate forfeiture of their registration slot.</li>
                            <li><strong>Credentials:</strong> Physical PESU student ID cards and event badges issued at check-in must be visible around the neck at all times.</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-black text-white uppercase tracking-wider text-xs mb-1">
                            2. Team Composition & Hardware Setup
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] pl-1">
                            <li><strong>Team Size:</strong> Strictly 4 to 6 members per team. Cross-year collaboration is permitted, but all members must be physically present at the venue throughout the 24 hours.</li>
                            <li><strong>Mandatory Hardware:</strong> Every team must bring at least two fully functional laptops with working webcams and chargers. Multi-pin surge protectors/extension cords are highly recommended.</li>
                            <li><strong>Network & Development Environment:</strong> University Wi-Fi credentials will be issued at desk check-in. Hotspots are allowed only as emergency failovers.</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-black text-white uppercase tracking-wider text-xs mb-1">
                            3. The 6-Round Competition Protocol
                          </h4>
                          <p className="text-[11px] text-slate-400 mb-1.5">
                            Participants will operate across six progressive strategic phases, governed by a unified virtual currency system:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] pl-1">
                            <li><strong>Round 1 – The Industry Blueprint:</strong> Problem statement diagnosis, stakeholder mapping, and initial root-cause hypothesis.</li>
                            <li><strong>Round 2 – The Intelligence Drop:</strong> Financial statements, operational datasets, and ESG metrics released to refine solution models.</li>
                            <li><strong>Round 3 – Central Budget & Live Market:</strong> Simulation economy opens. Teams manage an allocation of 10,000 Innovation Credits (IC) across policy shifts and market assets.</li>
                            <li><strong>Round 4 – The Resource Auction:</strong> Live competitive bidding for premium data feeds, mentor sessions, and pilot frameworks paid exclusively from team IC balances. Stock trading terminates at the close of this round.</li>
                            <li><strong>Round 5 – Strategic Wager Challenge:</strong> High-stakes deduction and risk calculation with capped liquid IC wagers (maximum 20% of unspent liquid IC, capped at 1,000 IC).</li>
                            <li><strong>Round 6 – The Boardroom Showdown:</strong> Final deliverable defense (deck, working financial model/prototype, and implementation roadmap) presented live before executive judges.</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-black text-white uppercase tracking-wider text-xs mb-1">
                            4. Code of Conduct, Fair Play & Academic Integrity
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] pl-1">
                            <li><strong>Originality & Intellectual Property:</strong> All models, scripts, financial ledgers, and pitch collateral presented must be constructed during the 24-hour sprint. Pre-built templates, unauthorized repositories, or external contract work will result in immediate disqualification.</li>
                            <li><strong>Ledger Compliance:</strong> Tampering with virtual market logs, colluding across teams to manipulate auction bids, or falsifying Innovation Credit transactions will lead to an immediate ban.</li>
                            <li><strong>Professional Decorum:</strong> Treat faculty, mentors, judges, and competing teams with complete professional courtesy. Disruptive behavior, shouting, or harassment will result in immediate escort off campus.</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-black text-white uppercase tracking-wider text-xs mb-1">
                            5. Dress Code (Strict Business / Formal)
                          </h4>
                          <p className="text-[11px] text-slate-400 mb-1">
                            Because ARTHMANTRA simulates real boardroom environments and executive evaluations, all participants must remain in Formal / Business Attire throughout the event.
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] pl-1">
                            <li><strong>Permitted:</strong> Formal shirts, formal trousers, blazers, formal skirts/trousers, and formal footwear.</li>
                            <li><strong>Strictly Prohibited:</strong> Crop tops, bralettes, sleeveless outfits, cold-shoulder tops, shorts, gym sweatpants, and torn or ripped jeans.</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-black text-white uppercase tracking-wider text-xs mb-1">
                            6. Venue Regulations & Logistics
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] pl-1">
                            <li><strong>Food & Beverages:</strong> No outside meals are allowed inside PESU 52. Dedicated refreshments, midnight snacks, and meals will be provided at scheduled checkpoints, with external food stalls accessible outside the venue floor.</li>
                            <li><strong>Substance Policy:</strong> PES University maintains a strict zero-tolerance policy. Smoking, vaping, alcohol, or any controlled substances will result in immediate disqualification, campus debarment, and referral to university disciplinary authorities.</li>
                            <li><strong>Belongings:</strong> Teams are solely responsible for their personal electronic devices and belongings. Lock laptops when leaving tables unattended.</li>
                            <li><strong>Parking:</strong> Two-wheeler parking is strictly restricted to designated slots near the front gate.</li>
                          </ul>
                        </div>

                        <div className="pt-2 border-t border-slate-800">
                          <h4 className="font-black text-[#00D2FF] uppercase tracking-wider text-xs mb-1.5">
                            Contact & Support Desk
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <strong className="text-white">Student Coordinators:</strong>
                              <div className="text-slate-300">Vaishnavi AL: <a href="tel:+919449444149" className="text-cyan-400 hover:underline">+91 94494 44149</a></div>
                              <div className="text-slate-300">J Vikash: <a href="tel:+919345522187" className="text-cyan-400 hover:underline">+91 93455 22187</a></div>
                            </div>
                            <div>
                              <strong className="text-white">Faculty Coordinators:</strong>
                              <div className="text-slate-300">Bhoomika Urs: <a href="tel:+918073558315" className="text-cyan-400 hover:underline">+91 80735 58315</a></div>
                              <div className="text-slate-300">Sai Navajyot: <a href="tel:+919562535929" className="text-cyan-400 hover:underline">+91 95625 35929</a></div>
                            </div>
                          </div>
                          <div className="mt-3 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/80 text-[11px] text-cyan-300 font-mono italic">
                            “24 Hours on the Clock. The Market Never Sleeps, Neither Do We. Stay Sharp. Think Fast. Execute Smarter.”
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* The Mandatory Tick Mark Checkbox */}
                <div
                  onClick={() => setAgreedToRules(prev => !prev)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    agreedToRules
                      ? 'bg-emerald-950/50 border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'bg-[#0C1222] border-slate-700/80 hover:border-cyan-500/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    id="rulesAgreement"
                    checked={agreedToRules}
                    onChange={e => setAgreedToRules(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-700 text-[#00D2FF] focus:ring-0 focus:outline-none cursor-pointer accent-[#00D2FF]"
                  />
                  <label htmlFor="rulesAgreement" className="text-xs text-slate-200 cursor-pointer leading-relaxed">
                    <strong className="text-white">
                      I have read, understood, and accept the ARTHMANTRA 24-Hour Rules, Code of Conduct & Guidelines.
                    </strong>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      I confirm on behalf of my team that all members will adhere to the formal dress code, reporting schedule, 24-hour venue presence, and competition integrity rules. (Required to proceed to the next page).
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-[11px] text-slate-400">
                  {!agreedToRules ? (
                    <span className="text-amber-400 font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      Please tick the box above to unlock the next page
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      Rules accepted • Ready to continue
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!agreedToRules}
                  className={`w-full sm:w-auto justify-center py-3.5 px-7 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                    agreedToRules
                      ? 'bg-gradient-to-r from-[#0072FF] via-[#00D2FF] to-[#38BDF8] text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:brightness-110'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                  }`}
                >
                  Continue to Payment Proof <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* STEP 2: Payment */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Fee summary */}
            <div className="bg-[#0C1222] rounded-3xl p-5 sm:p-7 border border-[#FF7A00]/40 shadow-[0_0_20px_rgba(255,122,0,0.1)]">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FF7A00] block mb-1">
                Entry Fee Requirement
              </span>
              <div className="text-3xl font-black text-white">
                ₹{hackathon.entry_fee} <span className="text-xs text-slate-400 font-normal">/ team</span>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Please complete payment of <strong>₹{hackathon.entry_fee}</strong> for your entire team and upload the screenshot proof below.
              </p>
            </div>

            {/* Screenshot upload form */}
            <form onSubmit={handleFinalSubmit} className="bg-[#0C1222] rounded-3xl p-4 sm:p-8 border border-slate-800 shadow-xl space-y-6">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2 mb-1">
                  <Upload className="w-5 h-5 text-[#00D2FF]" /> Payment Proof Screenshot
                </h2>
                <p className="text-xs text-slate-400">Upload a screenshot showing the transaction amount & reference.</p>
              </div>

              {/* Dropzone */}
              <div className="relative border-2 border-dashed border-slate-700 hover:border-[#00D2FF] rounded-2xl p-6 sm:p-8 transition-colors bg-[#080E1C] flex flex-col items-center justify-center text-center cursor-pointer group">
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                {screenshotPreview ? (
                  <div className="space-y-4 w-full flex flex-col items-center">
                    <div className="relative max-h-72 max-w-sm rounded-xl overflow-hidden border border-cyan-500/40 shadow-xl">
                      <img
                        src={screenshotPreview}
                        alt="Payment Screenshot Preview"
                        className="object-contain max-h-72 w-auto"
                      />
                      <div className="absolute top-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] text-[#00D2FF] font-bold border border-cyan-800">
                        Uploaded
                      </div>
                    </div>
                    <div className="text-xs text-[#00D2FF] font-bold">Click or drop new image to replace</div>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-800 text-[#00D2FF] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-white">Click or drop payment screenshot here</p>
                    <p className="text-xs text-slate-500 mt-1">PNG, JPG, WebP (max 8MB)</p>
                  </>
                )}
              </div>

              {/* UTR */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-300 font-bold mb-1.5">
                  UTR / Transaction ID <span className="text-slate-500">(Recommended)</span>
                </label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={e => setUtrNumber(e.target.value)}
                  placeholder="Enter transaction reference / UTR"
                  className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none font-mono"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto justify-center flex items-center gap-2 py-3 px-5 rounded-xl border border-slate-800 bg-[#080E1C] hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#0072FF] via-[#00D2FF] to-[#38BDF8] text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,210,255,0.35)] disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" /> Submitting Team...</>
                  ) : (
                    <>Submit Team Registration →</>
                  )}
                </button>
              </div>

              {/* Submission Duration Disclaimer */}
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/50 shadow-sm flex items-center justify-center gap-2.5 text-center">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
                <p className="text-xs text-amber-200/95 font-medium leading-relaxed">
                  <strong>Notice:</strong> It might take up to <strong>60 seconds</strong> for the form to submit and process your screenshot upload. <strong>Please do not close or refresh the website.</strong>
                </p>
              </div>
            </form>
          </motion.div>
        )}

        {/* STEP 3: Confirmation */}
        {step === 3 && submittedReg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0C1222] rounded-3xl p-5 sm:p-8 border border-slate-800 shadow-2xl text-center space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-950/60 border border-emerald-500/80 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">Registration Submitted! 🎉</h2>
              <p className="text-slate-300 text-sm mt-1">
                Your team <strong className="text-[#00D2FF]">{submittedReg.team_name}</strong> is now waitlisted for review.
              </p>
              <p className="text-slate-400 text-xs mt-1">
                The organizing faculty will review your payment receipt. Once approved, you will unlock your spot & the official WhatsApp group link!
              </p>
            </div>

            <div className="bg-[#080E1C] rounded-2xl p-4 text-left border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Team Name</span>
                <span className="font-bold text-white">{submittedReg.team_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Roster</span>
                <span className="font-bold text-white">{submittedReg.members.length} members</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Leader</span>
                <span className="font-mono text-cyan-300">{submittedReg.leader_email}</span>
              </div>
            </div>

            <div>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 py-3.5 px-8 rounded-xl bg-gradient-to-r from-[#0072FF] to-[#00D2FF] text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,210,255,0.3)]"
              >
                Go to Team Dashboard →
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
