'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Compass, Lock, CheckCircle2, AlertCircle, ArrowRight, KeyRound } from 'lucide-react'
import { LocalDB } from '@/lib/storage'
import { useToast } from '@/components/ToastProvider'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { showToast } = useToast()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

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
      const res = await LocalDB.updateUserPassword(password)
      if (res.success) {
        setSuccess(true)
        showToast('Password updated successfully!', 'success')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } else {
        setError(res.message || 'Failed to update password. Recovery link may have expired.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#0C1222] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden"
      >
        {/* Accent top bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0072FF] via-[#00D2FF] to-[#FF7A00]" />

        <div className="text-center mb-6 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-800 flex items-center justify-center text-[#00D2FF] mx-auto mb-3 shadow-[0_0_15px_rgba(0,210,255,0.25)]">
            <KeyRound className="w-7 h-7 text-[#00D2FF]" />
          </div>
          <span className="text-[10px] uppercase tracking-widest font-black text-[#00D2FF] bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-800">
            Security Reset
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-2.5">
            Set New Password
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Choose a new, secure password for your Arth Mantra account
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Password Updated!</h3>
            <p className="text-xs text-slate-400">
              Your password has been reset successfully. Redirecting you to sign in...
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-[#00D2FF] hover:underline font-bold pt-2"
            >
              Sign in now <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-bold mb-1.5">
                New Password <span className="text-[#FF7A00]">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all pl-9"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-bold mb-1.5">
                Confirm New Password <span className="text-[#FF7A00]">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
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
              {loading ? <span>Updating Password...</span> : <span>Update Password & Sign In</span>}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-slate-400">
          Remember your password?{' '}
          <Link href="/login" className="text-[#00D2FF] hover:underline font-bold">
            Back to Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
