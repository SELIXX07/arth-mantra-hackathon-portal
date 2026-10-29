'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Compass, UserPlus, Lock, Mail, Phone, User, GraduationCap, AlertCircle, BookOpen, Layers, Bookmark, Building2 } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/ToastProvider'
import { PES_DEPARTMENTS, SEMESTER_OPTIONS, SECTION_OPTIONS, RESIDENCE_OPTIONS, ResidenceType } from '@/types'

export default function RegisterPage() {
  const router = useRouter()
  const { signup } = useAuth()
  const { showToast } = useToast()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [srn, setSrn] = useState('')
  const [department, setDepartment] = useState('')
  const [semester, setSemester] = useState('')
  const [section, setSection] = useState('')
  const [residenceType, setResidenceType] = useState<ResidenceType>('Non-Hostelite')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!EMAIL_REGEX.test(email.trim().toLowerCase())) {
      setError('Please enter a valid email address.')
      return
    }

    if (!/^\d{10}$/.test(phone.trim())) {
      setError('Phone number must be exactly 10 digits.')
      return
    }

    if (!fullName.trim() || !srn.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    if (!department) {
      setError('Please select your department.')
      return
    }

    if (!semester) {
      setError('Please select your semester.')
      return
    }

    if (!section) {
      setError('Please select your section.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await signup({
        fullName,
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        srn: srn.trim().toUpperCase(),
        department,
        semester,
        section,
        residence_type: residenceType
      })

      if (res.success) {
        showToast('Account created successfully!', 'success')
        router.push('/')
      } else {
        setError(res.message || 'Registration failed. Please try again.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-[#0C1222] rounded-3xl p-4 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0072FF] via-[#00D2FF] to-[#FF7A00]" />

        <div className="text-center mb-8 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0B1528] to-[#040814] border border-[#00D2FF]/40 flex items-center justify-center text-[#00D2FF] mx-auto mb-3 shadow-[0_0_15px_rgba(0,210,255,0.25)]">
            <Compass className="w-7 h-7 text-[#00D2FF]" />
          </div>
          <span className="text-[10px] uppercase tracking-widest font-black text-[#00D2FF] bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-800">
            PES University • Arth Mantra
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-2.5">
            Create Account
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Register to form a team and compete in the hackathon
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Important Team Leader Disclaimer */}
        <div className="mb-6 p-4 rounded-2xl bg-amber-950/40 border border-amber-600/60 shadow-[0_0_15px_rgba(245,158,11,0.15)] flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xs">
            <span className="font-black uppercase tracking-wider text-amber-300 block mb-0.5">
              ⚠️ Important Registration Rule
            </span>
            <p className="text-amber-100/90 leading-relaxed">
              <strong>Only the Team Leader should register!</strong> Other team members do <span className="underline decoration-amber-400 font-bold">NOT</span> need to create an account. The Team Leader will enter all team member details directly when registering the team.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-bold mb-1.5">
                Full Name <span className="text-[#FF7A00]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none pl-9"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            {/* SRN */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-bold mb-1.5">
                SRN / Roll No <span className="text-[#FF7A00]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={srn}
                  onChange={e => setSrn(e.target.value)}
                  className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none pl-9 font-mono uppercase font-bold"
                />
                <GraduationCap className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-bold mb-1.5">
                Email Address <span className="text-[#FF7A00]">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value.trim())}
                  className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none pl-9"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            {/* Phone */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs uppercase tracking-wider text-slate-300 font-bold">
                  Phone Number <span className="text-[#FF7A00]">*</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">{phone.length}/10</span>
              </div>
              <div className="relative">
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none pl-9 font-mono"
                />
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            {/* Department */}
            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-bold mb-1.5">
                Department / Course <span className="text-[#FF7A00]">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-4 py-2.5 text-xs text-white outline-none pl-9 appearance-none cursor-pointer"
                >
                  <option value="" disabled className="bg-[#0C1222] text-slate-500">
                    -- Select Course / Department --
                  </option>
                  {PES_DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept} className="bg-[#0C1222] text-white">
                      {dept}
                    </option>
                  ))}
                </select>
                <BookOpen className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <div className="absolute right-3 top-3 pointer-events-none text-slate-500 text-xs">▼</div>
              </div>
            </div>

            {/* Semester */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-bold mb-1.5">
                Semester (1 to 7) <span className="text-[#FF7A00]">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={semester}
                  onChange={e => setSemester(e.target.value)}
                  className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-4 py-2.5 text-xs text-white outline-none pl-9 appearance-none cursor-pointer font-bold"
                >
                  <option value="" disabled className="bg-[#0C1222] text-slate-500">
                    -- Semester --
                  </option>
                  {SEMESTER_OPTIONS.map(sem => (
                    <option key={sem} value={sem} className="bg-[#0C1222] text-white">
                      Semester {sem}
                    </option>
                  ))}
                </select>
                <Layers className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <div className="absolute right-3 top-3 pointer-events-none text-slate-500 text-xs">▼</div>
              </div>
            </div>

            {/* Section */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-bold mb-1.5">
                Section (A to J) <span className="text-[#FF7A00]">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={section}
                  onChange={e => setSection(e.target.value)}
                  className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-4 py-2.5 text-xs text-white outline-none pl-9 appearance-none cursor-pointer font-bold"
                >
                  <option value="" disabled className="bg-[#0C1222] text-slate-500">
                    -- Section --
                  </option>
                  {SECTION_OPTIONS.map(sec => (
                    <option key={sec} value={sec} className="bg-[#0C1222] text-white">
                      Section {sec}
                    </option>
                  ))}
                </select>
                <Bookmark className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <div className="absolute right-3 top-3 pointer-events-none text-slate-500 text-xs">▼</div>
              </div>
            </div>

            {/* Residence Status */}
            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-bold mb-1.5">
                Residence Status <span className="text-[#FF7A00]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {RESIDENCE_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setResidenceType(opt)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      residenceType === opt
                        ? 'bg-[#00D2FF]/15 border-[#00D2FF] text-[#00D2FF] shadow-[0_0_12px_rgba(0,210,255,0.2)]'
                        : 'bg-[#080E1C] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-bold mb-1.5">
                Password <span className="text-[#FF7A00]">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none pl-9"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-bold mb-1.5">
                Confirm Password <span className="text-[#FF7A00]">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none pl-9"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0072FF] via-[#00D2FF] to-[#38BDF8] text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,210,255,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Creating Account...</span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Create Account
              </>
            )}
          </button>

          {/* Submission Notice */}
          <div className="flex items-center justify-center gap-1.5 pt-1 text-center text-[11px] text-amber-300/90 font-medium">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
            <span>It might take up to 60 seconds to process your registration. Please do not close the website.</span>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link href="/login" className="text-[#00D2FF] hover:underline font-bold">
            Sign In Here
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
