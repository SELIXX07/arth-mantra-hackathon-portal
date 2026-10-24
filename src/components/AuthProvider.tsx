'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { UserProfile, UserRole } from '@/types'
import { LocalDB, INITIAL_SUPERADMIN } from '@/lib/storage'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  isMarketAdmin: boolean
  isDev: boolean
  isParticipant: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; mustReset?: boolean }>
  signup: (data: {
    fullName: string
    email: string
    password: string
    phone: string
    srn: string
    department?: string
    semester?: string
    section?: string
    residence_type?: string
  }) => Promise<{ success: boolean; message?: string }>
  logout: () => void
  resetAdminPassword: (newPassword: string) => Promise<boolean>
  updateProfile: (data: Partial<UserProfile>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // 1. Load stored user from localStorage immediately
    const stored = LocalDB.getStoredUser()
    if (stored) {
      setUser(stored)
      // 2. Real-time background sync with database to ensure role changes (e.g. participant -> admin) take effect instantly
      LocalDB.syncUserRoleAsync(stored.email).then(result => {
        if (result && result.role) {
          if (result.role !== stored.role) {
            const updatedUser: UserProfile = { ...stored, role: result.role }
            setUser(updatedUser)
            LocalDB.setCurrentUser(updatedUser)
          }
        }
      }).catch(err => console.warn('Role sync warning:', err))
    }
    setLoading(false)
  }, [])

  // Auto-sync role when user focuses window or returns to the browser tab
  useEffect(() => {
    const handleFocus = () => {
      const stored = LocalDB.getStoredUser()
      if (stored && stored.email) {
        LocalDB.syncUserRoleAsync(stored.email).then(result => {
          if (result && result.role && result.role !== stored.role) {
            const updatedUser: UserProfile = { ...stored, role: result.role }
            setUser(updatedUser)
            LocalDB.setCurrentUser(updatedUser)
          }
        }).catch(() => {})
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const isDev = Boolean(user && LocalDB.isDev(user.email))
  const isAdmin = Boolean(user && (user.role === 'admin' || user.role === 'market_admin' || user.role === 'superadmin' || isDev || LocalDB.isAdmin(user.email)))
  const isSuperAdmin = Boolean(user && (user.role === 'superadmin' || isDev || user.email === INITIAL_SUPERADMIN.email))
  const isMarketAdmin = Boolean(user && (user.role === 'market_admin' || isSuperAdmin || isDev))
  const isParticipant = Boolean(user && user.role === 'participant' && !isAdmin)

  const login = async (email: string, password: string) => {
    const result = await LocalDB.login(email, password)
    if (result.success) {
      const stored = LocalDB.getStoredUser()
      if (stored) {
        setUser(stored)
        // Background verify role
        LocalDB.syncUserRoleAsync(stored.email).then(res => {
          if (res && res.role && res.role !== stored.role) {
            const updatedUser: UserProfile = { ...stored, role: res.role }
            setUser(updatedUser)
            LocalDB.setCurrentUser(updatedUser)
          }
        }).catch(() => {})
      }
    }
    return result
  }

  const signup = async (data: {
    fullName: string
    email: string
    password: string
    phone: string
    srn: string
    department?: string
    semester?: string
    section?: string
    residence_type?: string
  }) => {
    const result = await LocalDB.signUp(
      data.email,
      data.password,
      data.fullName,
      data.phone,
      data.srn,
      data.department,
      data.semester,
      data.section,
      data.residence_type
    )
    if (result.success) {
      const stored = LocalDB.getStoredUser()
      if (stored) {
        setUser(stored)
      }
    }
    return result
  }

  const logout = () => {
    setUser(null)
    LocalDB.logout()
    router.push('/login')
  }

  const resetAdminPassword = async (newPassword: string) => {
    if (!user || !user.email) return false
    const ok = await LocalDB.resetAdminPassword(user.email, newPassword)
    if (ok) {
      const updated = { ...user, must_reset_password: false }
      setUser(updated)
      LocalDB.setCurrentUser(updated)
    }
    return ok
  }

  const updateProfile = (data: Partial<UserProfile>) => {
    if (!user) return
    const updated = { ...user, ...data }
    setUser(updated)
    LocalDB.setCurrentUser(updated)
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAdmin,
      isSuperAdmin,
      isMarketAdmin,
      isDev,
      isParticipant,
      login,
      signup,
      logout,
      resetAdminPassword,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
