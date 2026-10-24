'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Compass, LogIn, Lock, Mail, AlertCircle, CheckCircle2, X, KeyRound, Send } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/ToastProvider'
import { LocalDB } from '@/lib/storage'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const { showToast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [forgotError, setForgotError] = useState('')

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    setForgotSuccess(false)

    const clean = forgotEmail.trim().toLowerCase()
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setForgotError('Please enter a valid email address.')
      return
    }

    setForgotLoading(true)
    try {
      const res = await LocalDB.sendPasswordResetEmail(clean)
      if (res.success) {
        setForgotSuccess(true)
        showToast('Password reset link sent! Check your inbox.', 'success')
      } else {
        setForgotError(res.message || 'Failed to send reset link. Please try again.')
      }
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : 'Error sending reset email')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const cleanEmail = email.trim().toLowerCase()
    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)

    try {
      const res = await login(cleanEmail, password)
      if (!res.success) {
        setError(res.message || 'Login failed. Please check your credentials.')
      } else {
        showToast('Logged in successfully!', 'success')
        if (cleanEmail.includes('admin')) {
          router.push('/admin')
        } else {
          router.push('/')
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#0C1222] rounded-3xl p-5 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden"
      >
        {/* Accent top bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0072FF] via-[#00D2FF] to-[#FF7A00]" />

        <div className="text-center mb-8 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0B1528] to-[#040814] border border-[#00D2FF]/40 flex items-center justify-center text-[#00D2FF] mx-auto mb-3 shadow-[0_0_15px_rgba(0,210,255,0.25)]">
            <Compass className="w-7 h-7 text-[#00D2FF]" />
          </div>
          <span className="text-[10px] uppercase tracking-widest font-black text-[#00D2FF] bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-800">
            Arth Mantra Hackathon
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-2.5">
            Sign In to Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Access your team registration & live scores
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-300 font-bold mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all pl-9"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs uppercase tracking-wider text-slate-300 font-bold">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email)
                  setForgotError('')
                  setForgotSuccess(false)
                  setShowForgotModal(true)
                }}
                className="text-[11px] text-[#00D2FF] hover:underline font-bold cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all pl-9"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#0072FF] via-[#00D2FF] to-[#38BDF8] text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,210,255,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Signing In...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          New participant?{' '}
          <Link href="/register" className="text-[#00D2FF] hover:underline font-bold">
            Create an Account
          </Link>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#0C1222] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-2xl max-w-md w-full relative"
            >
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center absolute top-5 right-5 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-800 text-[#00D2FF] flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Reset Your Password</h3>
                  <p className="text-[11px] text-slate-400">We&apos;ll send a recovery link to your inbox</p>
                </div>
              </div>

              {forgotError && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs space-y-1.5">
                    <div className="font-bold flex items-center gap-2 text-sm text-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      Recovery Link Sent!
                    </div>
                    <p className="leading-relaxed">
                      We sent a secure password reset link to <strong className="text-white">{forgotEmail}</strong>. Click the link in your email to choose a new password.
                    </p>
                    <p className="text-[10px] text-emerald-400/80">
                      Be sure to check your spam/junk folder if you don&apos;t see it within a minute.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#080E1C] border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <span className="font-bold text-slate-300 block">💡 At the Hackathon Venue?</span>
                    <span>An organizing faculty or admin can also reset your password in 5 seconds at the help desk.</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4 mt-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-300 font-bold mb-1.5">
                      Your Registered Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="e.g. name@pesu.pes.edu"
                        className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none pl-9"
                      />
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#080E1C] border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                    A recovery link will be dispatched immediately. When clicked, you will be taken to a page to enter your new password.
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0072FF] to-[#00D2FF] text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {forgotLoading ? 'Sending...' : 'Send Recovery Link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
