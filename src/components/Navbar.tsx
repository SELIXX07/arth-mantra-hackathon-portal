'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Compass, Trophy, User, LogOut, ChevronDown, ShieldAlert,
  LogIn, UserPlus, TrendingUp, Menu, X, Sparkles
} from 'lucide-react'
import { useAuth } from './AuthProvider'
import { motion, AnimatePresence } from 'framer-motion'

export function Navbar() {
  const { user, isAdmin, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/leaderboard', label: 'Scoreboard', icon: Trophy, isAccent: true },
    ...(user && !isAdmin ? [{ href: '/register-team', label: 'Register Team' }] : []),
    ...(user ? [{ href: '/profile', label: 'My Registration' }] : []),
  ]

  return (
    <header className="sticky top-0 z-50 w-full bg-[#060A14]/85 backdrop-blur-xl border-b border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
      {/* Sleek top multi-color neon gradient stripe matching the poster */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[#0072FF] via-[#00D2FF] via-[#FFD700] to-[#FF7A00]" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-17 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3.5 group select-none min-w-0 flex-shrink">
          <div className="relative">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#0B1528] via-[#050B16] to-[#040814] border border-[#00D2FF]/40 flex items-center justify-center text-[#00D2FF] group-hover:border-[#00D2FF] transition-all duration-300 shadow-[0_0_18px_rgba(0,210,255,0.3)] group-hover:shadow-[0_0_24px_rgba(0,210,255,0.5)] flex-shrink-0">
              <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-[#00D2FF] group-hover:rotate-45 transition-transform duration-500" />
            </div>
            {/* Ambient pulse dot */}
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D2FF] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00D2FF]"></span>
            </span>
          </div>

          <div className="min-w-0 flex-shrink">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
              <span className="font-display font-black text-sm sm:text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-[#00D2FF] uppercase whitespace-nowrap">
                ARTH MANTRA
              </span>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-[#FF7A00]/20 to-[#FFB703]/20 text-[#FF7A00] px-1.5 py-0.5 rounded-md border border-[#FF7A00]/40 whitespace-nowrap shadow-[0_0_10px_rgba(255,122,0,0.25)]">
                PESU
              </span>
            </div>
            <p className="hidden sm:block text-[10px] text-slate-400 font-semibold tracking-wider uppercase truncate">
              Strategy Meets Finance • Hackathon Portal
            </p>
          </div>
        </Link>

        {/* Center Pill Navigation (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 bg-[#091020]/70 p-1.5 rounded-2xl border border-slate-800/80 shadow-inner">
          {navLinks.map((link) => {
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
            const Icon = link.icon

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                  isActive
                    ? link.isAccent
                      ? 'bg-[#FF7A00]/20 text-[#FF7A00] border border-[#FF7A00]/50 shadow-[0_0_14px_rgba(255,122,0,0.25)]'
                      : 'bg-cyan-500/20 text-[#00D2FF] border border-cyan-500/50 shadow-[0_0_14px_rgba(0,210,255,0.25)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
                <span>{link.label}</span>
                {isActive && (
                  <span className={`w-1.5 h-1.5 rounded-full ${link.isAccent ? 'bg-[#FF7A00]' : 'bg-[#00D2FF]'} shadow-sm`} />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Right side Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Admin portal shortcut for admins */}
          {isAdmin && (
            <Link
              href="/admin"
              className={`hidden sm:flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-black transition-all border whitespace-nowrap shadow-md cursor-pointer ${
                pathname.startsWith('/admin')
                  ? 'bg-gradient-to-r from-[#0072FF] to-[#00D2FF] text-slate-950 border-cyan-300 shadow-[0_0_18px_rgba(0,210,255,0.45)]'
                  : 'bg-cyan-950/60 border-cyan-500/50 text-[#00D2FF] hover:bg-cyan-900/50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Admin Console</span>
            </Link>
          )}

          {/* User Profile dropdown OR Auth buttons */}
          {user ? (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="User Profile Menu"
                className={`flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-2xl border transition-all duration-200 cursor-pointer min-h-[38px] ${
                  dropdownOpen
                    ? 'border-[#00D2FF] bg-cyan-950/50 shadow-[0_0_16px_rgba(0,210,255,0.25)]'
                    : 'border-slate-800 bg-slate-900/80 hover:bg-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-[#0072FF] via-[#00D2FF] to-[#38BDF8] text-slate-950 font-black flex items-center justify-center flex-shrink-0 text-xs uppercase shadow-md ring-1 ring-white/20">
                  {user.full_name?.[0] || 'U'}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-slate-100 leading-tight max-w-[120px] truncate">
                    {user.full_name}
                  </div>
                  <div className="text-[10px] text-[#00D2FF] font-semibold">
                    {user.role === 'superadmin' ? 'Superadmin' : user.role === 'admin' ? 'Admin' : 'Participant'}
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180 text-[#00D2FF]' : ''}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-64 sm:w-72 z-50 rounded-3xl bg-[#0B1222]/95 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.7)] overflow-hidden"
                    >
                      <div className="h-1 w-full bg-gradient-to-r from-[#00D2FF] to-[#FF7A00]" />

                      {/* User Header */}
                      <div className="p-4 border-b border-slate-800 bg-[#070D1A]/80">
                        <p className="text-white text-sm font-black truncate">{user.full_name}</p>
                        <p className="text-slate-400 text-xs font-mono truncate mt-0.5">{user.email}</p>
                        {user.srn && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-cyan-950/70 border border-cyan-800 text-[11px] font-mono text-[#00D2FF] font-bold">
                            SRN: {user.srn}
                          </div>
                        )}
                      </div>

                      {/* Dropdown Items */}
                      <div className="p-2 space-y-1">
                        <Link
                          href="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:text-[#00D2FF] hover:bg-cyan-950/40 font-medium text-xs transition-all group"
                        >
                          <div className="w-8 h-8 rounded-xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-[#00D2FF] group-hover:scale-105 transition-transform flex-shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-white block group-hover:text-[#00D2FF]">My Profile & Team</span>
                            <span className="text-[10px] text-slate-400 block truncate">Team status & WhatsApp</span>
                          </div>
                        </Link>

                        <Link
                          href="/leaderboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:text-[#FF7A00] hover:bg-[#FF7A00]/10 font-medium text-xs transition-all group"
                        >
                          <div className="w-8 h-8 rounded-xl bg-[#FF7A00]/15 border border-[#FF7A00]/40 flex items-center justify-center text-[#FF7A00] group-hover:scale-105 transition-transform flex-shrink-0">
                            <Trophy className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-white block group-hover:text-[#FF7A00]">Score Tracker</span>
                            <span className="text-[10px] text-slate-400 block truncate">Live rankings & round scores</span>
                          </div>
                        </Link>

                        {!isAdmin && (
                          <Link
                            href="/register-team"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:text-[#00D2FF] hover:bg-cyan-950/40 font-medium text-xs transition-all group"
                          >
                            <div className="w-8 h-8 rounded-xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-[#00D2FF] group-hover:scale-105 transition-transform flex-shrink-0">
                              <TrendingUp className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-white block group-hover:text-[#00D2FF]">Register Team</span>
                              <span className="text-[10px] text-slate-400 block truncate">Submit team info & payment</span>
                            </div>
                          </Link>
                        )}

                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:text-[#00D2FF] hover:bg-cyan-950/40 font-medium text-xs transition-all group"
                          >
                            <div className="w-8 h-8 rounded-xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-[#00D2FF] group-hover:scale-105 transition-transform flex-shrink-0">
                              <ShieldAlert className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-white block">Admin Console</span>
                              <span className="text-[10px] text-slate-400 block truncate">Approvals, scores & setup</span>
                            </div>
                          </Link>
                        )}

                        <div className="h-px bg-slate-800/80 my-1.5" />

                        <button
                          onClick={() => {
                            setDropdownOpen(false)
                            logout()
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-950/40 font-medium text-xs transition-colors w-full text-left cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-xl bg-rose-950/50 border border-rose-800/50 flex items-center justify-center text-rose-400 flex-shrink-0">
                            <LogOut className="w-4 h-4" />
                          </div>
                          <span className="font-bold">Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800/70 text-xs font-bold transition-all border border-slate-700/80 whitespace-nowrap min-h-[36px]"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>Log In</span>
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0072FF] via-[#00D2FF] to-[#38BDF8] hover:brightness-110 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_18px_rgba(0,210,255,0.4)] whitespace-nowrap min-h-[36px]"
              >
                <UserPlus className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Create Account</span>
              </Link>
            </div>
          )}

          {/* Mobile Menu Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#00D2FF]" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-slate-800/80 bg-[#070D1A]/95 backdrop-blur-2xl overflow-hidden px-4 py-4 space-y-3"
          >
            <div className="space-y-1">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-xl text-xs font-bold ${
                  pathname === '/' ? 'bg-cyan-950/70 text-[#00D2FF] border border-cyan-800' : 'text-slate-300'
                }`}
              >
                Home
              </Link>
              <Link
                href="/leaderboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold ${
                  pathname.startsWith('/leaderboard')
                    ? 'bg-[#FF7A00]/20 text-[#FF7A00] border border-[#FF7A00]/40'
                    : 'text-slate-300'
                }`}
              >
                <Trophy className="w-4 h-4 text-[#FF7A00]" />
                <span>Scoreboard</span>
              </Link>
              {user && !isAdmin && (
                <Link
                  href="/register-team"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2.5 rounded-xl text-xs font-bold ${
                    pathname.startsWith('/register-team') ? 'bg-cyan-950/70 text-[#00D2FF] border border-cyan-800' : 'text-slate-300'
                  }`}
                >
                  Register Team
                </Link>
              )}
              {user && (
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2.5 rounded-xl text-xs font-bold ${
                    pathname.startsWith('/profile') ? 'bg-cyan-950/70 text-[#00D2FF] border border-cyan-800' : 'text-slate-300'
                  }`}
                >
                  My Profile & Team
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black ${
                    pathname.startsWith('/admin') ? 'bg-cyan-500 text-slate-950' : 'text-[#00D2FF] bg-cyan-950/40 border border-cyan-800'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Admin Console</span>
                </Link>
              )}
            </div>

            {user ? (
              <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
                <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                  <span className="font-bold text-white block truncate">{user.full_name}</span>
                  <span className="text-[10px] text-slate-400 block truncate font-mono">{user.email}</span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    logout()
                  }}
                  className="w-full py-2.5 rounded-xl border border-rose-900/80 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-400" /> Log Out
                </button>
              </div>
            ) : (
              <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0072FF] via-[#00D2FF] to-[#38BDF8] text-slate-950 font-black text-xs uppercase tracking-wider text-center shadow-md flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" /> Create Account
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" /> Log In
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
