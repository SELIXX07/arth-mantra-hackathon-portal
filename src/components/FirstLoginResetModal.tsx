'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, KeyRound, Check, AlertCircle } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { useToast } from './ToastProvider'

export function FirstLoginResetModal() {
  const { user, resetAdminPassword } = useAuth()
  const { showToast } = useToast()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user?.must_reset_password) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const ok = await resetAdminPassword(newPassword)
      if (ok) {
        showToast('Password updated successfully! Welcome to Arth Mantra Admin Console.', 'success')
      } else {
        setError('Failed to update password. Please try again.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-md bg-[#0C1222] border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0072FF] via-[#00D2FF] to-[#FF7A00]" />

          <div className="flex items-center gap-3 mb-4 pt-1">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-800 text-[#00D2FF] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">First-Time Admin Setup</h3>
              <p className="text-xs text-slate-400">Please set your permanent password to continue</p>
            </div>
          </div>

          <p className="text-xs text-cyan-300 bg-cyan-950/40 border border-cyan-800/60 rounded-xl p-3 mb-5 leading-relaxed font-medium">
            Welcome to the <strong className="text-white">Arth Mantra Admin Console</strong>, <strong className="text-white">{user.full_name}</strong>. Your account was initialized with a temporary key. Please set your permanent security password now.
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-300 mb-1.5 font-bold">
                New Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all pl-9"
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-300 mb-1.5 font-bold">
                Confirm Password
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
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0072FF] to-[#00D2FF] text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,210,255,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Updating Password...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Save Password &amp; Enter Console
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
