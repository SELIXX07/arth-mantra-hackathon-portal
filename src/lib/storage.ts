import { TeamRegistration, Hackathon, AdminUser, UserProfile, RegistrationStatus, UserRole, TeamMember, ProblemStatement, TeamDatasheet, AuctionSheet } from '@/types'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'

export const DEV_UUID = '1d2ed178-2db2-4f93-8d51-8ee51e17075c'
export const DEV_EMAIL = 'artharambachalil@gmail.com'
export const DEV_DEFAULT_PASSWORD = process.env.NEXT_PUBLIC_DEV_PASSWORD || 'ArthAdmin2026!'

export const INITIAL_SUPERADMIN: AdminUser = {
  id: 'admin-' + DEV_UUID.substring(0, 8),
  email: DEV_EMAIL,
  name: 'Arth',
  role: 'superadmin',
  added_by: 'system',
  first_login_pending: false,
  temporary_password: undefined,
  created_at: new Date('2026-01-01T00:00:00Z').toISOString()
}

// Preset template for optional one-click fill in Admin panel
export const PRESET_ARTH_MANTRA: Omit<Hackathon, 'id' | 'created_at' | 'created_by'> = {
  name: 'ARTH MANTRA HACKATHON',
  date: '13th November 2025 | 2:00 PM - 2:00 AM',
  entry_fee: 500,
  max_teams: 50,
  description: 'Unlocking Smarter Solutions for a Stronger Financial Tomorrow. Strategy Meets Finance — Ideas, Analyze, Build, Invest. Hosted at PES University, PESU 52.',
  poster_url: '/arth-mantra-poster.png',
  whatsapp_link: 'https://chat.whatsapp.com/ArthMantraHackathon',
  is_active: true,
  show_registered_teams: true
}

const STORAGE_KEYS = {
  REGISTRATIONS: 'hackathon_registrations_v1',
  ADMINS: 'hackathon_admins_v1',
  CURRENT_USER: 'hackathon_current_user_v1',
  HACKATHONS: 'hackathon_hackathons_v1'
}

const isBrowser = () => typeof window !== 'undefined'

const getSupabase = () => {
  if (!isBrowser()) return null
  try {
    return createClient()
  } catch (e) {
    console.error('Failed to get Supabase client:', e)
    return null
  }
}

// Helper to generate a unique, deterministic 4-digit PIN for each team
export function getTeamTraderPin(reg: { id: string; utr_reference?: string | null }): string {
  if (reg.utr_reference) {
    const digits = reg.utr_reference.replace(/\D/g, '')
    if (digits.length >= 4) {
      return digits.slice(-4)
    }
  }
  let hash = 0
  const str = reg.id || 'team'
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  const pin = 1000 + (Math.abs(hash) % 9000)
  return pin.toString()
}

// Helper to parse market config out of hackathon
function parseHackathon(data: any): Hackathon {
  let credentialsReleased = Boolean(data.credentials_released)
  let psReleased = Boolean(data.ps_released)
  let datasheetsReleased = Boolean(data.datasheets_released)
  let auctionReleased = Boolean(data.auction_released)
  let auctionSheet: AuctionSheet | undefined = data.auction_sheet || undefined
  if (data.upi_id && typeof data.upi_id === 'string' && data.upi_id.includes('MARKET_CONFIG:')) {
    try {
      const jsonStr = data.upi_id.substring(data.upi_id.indexOf('MARKET_CONFIG:') + 'MARKET_CONFIG:'.length)
      const parsed = JSON.parse(jsonStr)
      if (parsed) {
        if (parsed.credentials_released !== undefined) credentialsReleased = Boolean(parsed.credentials_released)
        if (parsed.ps_released !== undefined) psReleased = Boolean(parsed.ps_released)
        if (parsed.datasheets_released !== undefined) datasheetsReleased = Boolean(parsed.datasheets_released)
        if (parsed.auction_released !== undefined) auctionReleased = Boolean(parsed.auction_released)
        if (parsed.auction_sheet !== undefined) auctionSheet = parsed.auction_sheet || undefined
      }
    } catch (_) {}
  }
  return {
    ...data,
    credentials_released: credentialsReleased,
    ps_released: psReleased,
    datasheets_released: datasheetsReleased,
    auction_released: auctionReleased,
    auction_sheet: auctionSheet
  } as Hackathon
}

export const LocalDB = {
  // ── HACKATHONS (SUPABASE-FIRST) ────────────────────────────────
  async getHackathonsAsync(): Promise<Hackathon[]> {
    const supabase = getSupabase()
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('hackathons')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data) {
          const parsed = data.map(parseHackathon)
          this.saveHackathons(parsed)
          return parsed
        }
        if (error) console.error('Supabase fetch hackathons error:', error.message)
      } catch (err) {
        console.error('Supabase getHackathonsAsync exception:', err)
      }
    }
    return this.getHackathons().map(parseHackathon)
  },

  getHackathons(): Hackathon[] {
    if (!isBrowser()) return []
    const stored = localStorage.getItem(STORAGE_KEYS.HACKATHONS)
    if (!stored) return []
    try {
      const raw = JSON.parse(stored)
      return Array.isArray(raw) ? raw.map(parseHackathon) : []
    } catch { return [] }
  },

  saveHackathons(hackathons: Hackathon[]) {
    if (!isBrowser()) return
    localStorage.setItem(STORAGE_KEYS.HACKATHONS, JSON.stringify(hackathons))
  },

  async getActiveHackathon(): Promise<Hackathon | null> {
    const supabase = getSupabase()
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('hackathons')
          .select('*')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()

        if (!error && data) {
          const parsed = parseHackathon(data)
          const localOverride = isBrowser() ? localStorage.getItem(`hackreg_show_teams_${data.id}`) : null
          const effectiveShow = localOverride !== null
            ? (localOverride === 'true')
            : (data.show_registered_teams !== undefined && data.show_registered_teams !== null ? data.show_registered_teams : true)

          return {
            ...parsed,
            show_registered_teams: effectiveShow
          } as Hackathon
        }
      } catch (err) {
        console.error('Supabase getActiveHackathon exception:', err)
      }
    }
    // Fallback to localStorage
    const hackathons = this.getHackathons()
    const active = hackathons.find(h => h.is_active) || null
    if (active && isBrowser()) {
      const localOverride = localStorage.getItem(`hackreg_show_teams_${active.id}`)
      if (localOverride !== null) {
        active.show_registered_teams = localOverride === 'true'
      }
    }
    return active ? parseHackathon(active) : null
  },

  async updateMarketConfig(
    hackathonId: string,
    updates: { 
      credentials_released?: boolean; 
      ps_released?: boolean; 
      datasheets_released?: boolean;
      auction_released?: boolean;
      auction_sheet?: AuctionSheet | null;
    }
  ): Promise<boolean> {
    const supabase = getSupabase()
    let currentConfig: Record<string, boolean> = {}

    // First retrieve current config so we merge and do not overwrite
    if (supabase) {
      try {
        const { data } = await supabase.from('hackathons').select('upi_id').eq('id', hackathonId).maybeSingle()
        if (data && data.upi_id && typeof data.upi_id === 'string' && data.upi_id.includes('MARKET_CONFIG:')) {
          try {
            const jsonStr = data.upi_id.substring(data.upi_id.indexOf('MARKET_CONFIG:') + 'MARKET_CONFIG:'.length)
            currentConfig = JSON.parse(jsonStr) || {}
          } catch (_) {}
        }
      } catch (_) {}
    } else {
      const currentHack = this.getHackathons().find(h => h.id === hackathonId)
      if (currentHack && currentHack.upi_id && currentHack.upi_id.includes('MARKET_CONFIG:')) {
        try {
          const jsonStr = currentHack.upi_id.substring(currentHack.upi_id.indexOf('MARKET_CONFIG:') + 'MARKET_CONFIG:'.length)
          currentConfig = JSON.parse(jsonStr) || {}
        } catch (_) {}
      }
    }

    const merged = { ...currentConfig, ...updates }
    const configStr = `MARKET_CONFIG:${JSON.stringify(merged)}`

    if (supabase) {
      try {
        const { error } = await supabase
          .from('hackathons')
          .update({ upi_id: configStr })
          .eq('id', hackathonId)
        if (!error) {
          const hackathons = this.getHackathons()
          const idx = hackathons.findIndex(h => h.id === hackathonId)
          if (idx !== -1) {
            hackathons[idx].upi_id = configStr
            if (merged.credentials_released !== undefined) hackathons[idx].credentials_released = Boolean(merged.credentials_released)
            if (merged.ps_released !== undefined) hackathons[idx].ps_released = Boolean(merged.ps_released)
            if (merged.datasheets_released !== undefined) hackathons[idx].datasheets_released = Boolean(merged.datasheets_released)
            if (merged.auction_released !== undefined) hackathons[idx].auction_released = Boolean(merged.auction_released)
            if (merged.auction_sheet !== undefined) hackathons[idx].auction_sheet = merged.auction_sheet || undefined
            this.saveHackathons(hackathons)
          }
          return true
        }
      } catch (err) {
        console.error('Supabase updateMarketConfig exception:', err)
      }
    }

    // Local fallback
    const hackathons = this.getHackathons()
    const idx = hackathons.findIndex(h => h.id === hackathonId)
    if (idx !== -1) {
      hackathons[idx].upi_id = configStr
      if (merged.credentials_released !== undefined) hackathons[idx].credentials_released = Boolean(merged.credentials_released)
      if (merged.ps_released !== undefined) hackathons[idx].ps_released = Boolean(merged.ps_released)
      if (merged.datasheets_released !== undefined) hackathons[idx].datasheets_released = Boolean(merged.datasheets_released)
      this.saveHackathons(hackathons)
      return true
    }
    return false
  },

  async setCredentialsReleased(hackathonId: string, released: boolean): Promise<boolean> {
    return this.updateMarketConfig(hackathonId, { credentials_released: Boolean(released) })
  },

  async setPSReleased(hackathonId: string, released: boolean): Promise<boolean> {
    return this.updateMarketConfig(hackathonId, { ps_released: Boolean(released) })
  },

  async setDatasheetsReleased(hackathonId: string, released: boolean): Promise<boolean> {
    return this.updateMarketConfig(hackathonId, { datasheets_released: Boolean(released) })
  },

  async setAuctionReleased(hackathonId: string, released: boolean): Promise<boolean> {
    return this.updateMarketConfig(hackathonId, { auction_released: Boolean(released) })
  },

  async setAuctionSheet(hackathonId: string, sheet: AuctionSheet | null): Promise<boolean> {
    const success = await this.updateMarketConfig(hackathonId, { auction_sheet: sheet })
    // Also sync to all approved registrations locally
    try {
      const all = this.getRegistrations()
      let changed = false
      all.forEach((reg, i) => {
        if (reg.hackathon_id === hackathonId && reg.status === 'approved') {
          all[i].assigned_auction_sheet = sheet || undefined
          changed = true
        }
      })
      if (changed) {
        this.saveRegistrations(all)
      }
    } catch (_) {}
    return success
  },

  async addHackathon(hackathon: Omit<Hackathon, 'id' | 'created_at'>): Promise<Hackathon> {
    const newHackathon: Hackathon = {
      ...hackathon,
      id: 'hack-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      created_at: new Date().toISOString()
    }

    const supabase = getSupabase()
    if (supabase) {
      try {
        // If this hackathon is active, deactivate all others first
        if (newHackathon.is_active) {
          await supabase.from('hackathons').update({ is_active: false }).neq('id', newHackathon.id)
        }

        const { data, error } = await supabase
          .from('hackathons')
          .insert([newHackathon])
          .select()

        if (!error && data && data[0]) {
          const hackathons = this.getHackathons()
          if (newHackathon.is_active) {
            hackathons.forEach(h => { h.is_active = false })
          }
          hackathons.unshift(data[0] as Hackathon)
          this.saveHackathons(hackathons)
          return data[0] as Hackathon
        }
        if (error && newHackathon.show_registered_teams !== undefined) {
          const { show_registered_teams, ...restHack } = newHackathon
          const retryRes = await supabase.from('hackathons').insert([restHack]).select()
          if (!retryRes.error && retryRes.data && retryRes.data[0]) {
            const hackathons = this.getHackathons()
            if (newHackathon.is_active) {
              hackathons.forEach(h => { h.is_active = false })
            }
            const hackItem = { ...(retryRes.data[0] as Hackathon), show_registered_teams }
            hackathons.unshift(hackItem)
            this.saveHackathons(hackathons)
            return hackItem
          }
        }
        if (error) console.error('Supabase addHackathon error:', error.message)
      } catch (err) {
        console.error('Supabase addHackathon exception:', err)
      }
    }

    // Fallback: save locally
    const hackathons = this.getHackathons()
    if (newHackathon.is_active) {
      hackathons.forEach(h => { h.is_active = false })
    }
    hackathons.unshift(newHackathon)
    this.saveHackathons(hackathons)
    return newHackathon
  },

  async updateHackathon(id: string, updates: Partial<Hackathon>): Promise<Hackathon | null> {
    if (updates.show_registered_teams !== undefined && isBrowser()) {
      localStorage.setItem(`hackreg_show_teams_${id}`, String(updates.show_registered_teams))
    }

    const supabase = getSupabase()
    if (supabase) {
      try {
        // If setting is_active=true, deactivate all others first
        if (updates.is_active === true) {
          await supabase.from('hackathons').update({ is_active: false }).neq('id', id)
        }

        const { data, error } = await supabase
          .from('hackathons')
          .update(updates)
          .eq('id', id)
          .select()

        if (!error && data && data[0]) {
          const hackathons = this.getHackathons()
          if (updates.is_active === true) {
            hackathons.forEach(h => { if (h.id !== id) h.is_active = false })
          }
          const idx = hackathons.findIndex(h => h.id === id)
          if (idx !== -1) {
            hackathons[idx] = data[0] as Hackathon
          }
          this.saveHackathons(hackathons)
          return data[0] as Hackathon
        }
        if (error && updates.show_registered_teams !== undefined) {
          const { show_registered_teams, ...restUpdates } = updates
          const retryRes = await supabase.from('hackathons').update(restUpdates).eq('id', id).select()
          if (!retryRes.error && retryRes.data && retryRes.data[0]) {
            const hackathons = this.getHackathons()
            if (updates.is_active === true) {
              hackathons.forEach(h => { if (h.id !== id) h.is_active = false })
            }
            const idx = hackathons.findIndex(h => h.id === id)
            if (idx !== -1) {
              hackathons[idx] = { ...(retryRes.data[0] as Hackathon), show_registered_teams }
            }
            this.saveHackathons(hackathons)
            return hackathons[idx]
          }
        }
        if (error) console.error('Supabase updateHackathon error:', error.message)
      } catch (err) {
        console.error('Supabase updateHackathon exception:', err)
      }
    }

    // Fallback
    const hackathons = this.getHackathons()
    const idx = hackathons.findIndex(h => h.id === id)
    if (idx !== -1) {
      if (updates.is_active === true) {
        hackathons.forEach(h => { if (h.id !== id) h.is_active = false })
      }
      hackathons[idx] = { ...hackathons[idx], ...updates }
      this.saveHackathons(hackathons)
      return hackathons[idx]
    }
    return null
  },

  async deleteHackathon(id: string): Promise<boolean> {
    const hackathons = this.getHackathons()
    const filtered = hackathons.filter(h => h.id !== id)
    this.saveHackathons(filtered)

    const supabase = getSupabase()
    if (supabase) {
      try {
        const { error } = await supabase.from('hackathons').delete().eq('id', id)
        if (error) console.error('Supabase deleteHackathon error:', error.message)
      } catch (err) {
        console.error('Supabase deleteHackathon exception:', err)
      }
    }
    return true
  },

  // ── REGISTRATIONS (API-FIRST + SUPABASE FALLBACK) ───────────────
  async getRegistrationsAsync(): Promise<TeamRegistration[]> {
    // 1. Try server-side API route first
    if (isBrowser()) {
      try {
        const res = await fetch('/api/registrations', { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          if (json.success && Array.isArray(json.registrations)) {
            this.saveRegistrations(json.registrations)
            return json.registrations
          }
        }
      } catch (apiErr) {
        console.warn('[LocalDB] /api/registrations fetch failed, trying direct Supabase:', apiErr)
      }
    }

    // 2. Direct Supabase fallback
    const supabase = getSupabase()
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('team_registrations')
          .select('*')
          .limit(300)

        if (!error && data) {
          const sorted = data.sort((a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          )
          const parsed = sorted.map(parseRegistration)
          this.saveRegistrations(parsed)
          return parsed
        }
        if (error) console.error('[Supabase] getRegistrationsAsync FAILED:', error.code, error.message)
      } catch (err) {
        console.error('[Supabase] getRegistrationsAsync exception:', err)
      }
    }

    // 3. LocalStorage fallback
    return this.getRegistrations()
  },

  async getRegistrationByLeader(leaderUserId: string, hackathonId: string, email?: string): Promise<TeamRegistration | null> {
    const supabase = getSupabase()
    if (supabase) {
      try {
        let { data, error } = await supabase
          .from('team_registrations')
          .select('*')
          .eq('leader_user_id', leaderUserId)
          .eq('hackathon_id', hackathonId)
          .limit(1)
          .maybeSingle()

        // Fallback by email match for leader
        if ((!data || error) && email) {
          const res = await supabase
            .from('team_registrations')
            .select('*')
            .ilike('leader_email', email.trim())
            .eq('hackathon_id', hackathonId)
            .limit(1)
            .maybeSingle()
          if (res.data) data = res.data
        }

        // Fallback: check if user is a registered team member
        if ((!data || error) && email) {
          const res = await supabase
            .from('team_registrations')
            .select('*')
            .eq('hackathon_id', hackathonId)
          if (res.data && Array.isArray(res.data)) {
            const memberMatch = res.data.find((r: any) => {
              if (Array.isArray(r.members)) {
                return r.members.some((m: any) => m?.email?.toLowerCase() === email.trim().toLowerCase())
              }
              return false
            })
            if (memberMatch) data = memberMatch
          }
        }

        if (data) {
          return parseRegistration(data)
        }
      } catch (err) {
        console.error('Supabase getRegistrationByLeader error:', err)
      }
    }
    // Fallback to localStorage
    const all = this.getRegistrations()
    return all.find(r => 
      (r.leader_user_id === leaderUserId || (email && r.leader_email?.toLowerCase() === email.toLowerCase())) && 
      r.hackathon_id === hackathonId
    ) || null
  },

  async getRegistrationsByLeaderAsync(leaderUserId: string, email?: string): Promise<TeamRegistration[]> {
    const supabase = getSupabase()
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('team_registrations')
          .select('*')
          .eq('leader_user_id', leaderUserId)
          .order('created_at', { ascending: false })

        if (!error && data && data.length > 0) {
          return data.map(parseRegistration)
        }

        if (email) {
          const emailRes = await supabase
            .from('team_registrations')
            .select('*')
            .ilike('leader_email', email.trim())
            .order('created_at', { ascending: false })
          if (emailRes.data && emailRes.data.length > 0) {
            return emailRes.data.map(parseRegistration)
          }

          // Search members
          const allRes = await supabase.from('team_registrations').select('*')
          if (allRes.data && Array.isArray(allRes.data)) {
            const memberMatches = allRes.data.filter((r: any) => {
              if (Array.isArray(r.members)) {
                return r.members.some((m: any) => m?.email?.toLowerCase() === email.trim().toLowerCase())
              }
              return false
            })
            if (memberMatches.length > 0) {
              return memberMatches.map(parseRegistration)
            }
          }
        }
      } catch (err) {
        console.error('Supabase getRegistrationsByLeaderAsync error:', err)
      }
    }
    const all = this.getRegistrations()
    return all.filter(r => r.leader_user_id === leaderUserId || (email && r.leader_email?.toLowerCase() === email.toLowerCase()))
  },

  getRegistrations(): TeamRegistration[] {
    if (!isBrowser()) return []
    const stored = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS)
    if (!stored) return []
    try {
      const raw = JSON.parse(stored)
      return Array.isArray(raw) ? raw.map(parseRegistration) : []
    } catch { return [] }
  },

  saveRegistrations(registrations: TeamRegistration[]) {
    if (!isBrowser()) return
    try {
      localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations))
    } catch (e) {
      console.warn('localStorage save registrations failed:', e)
    }
  },

  async addRegistration(
    registration: Omit<TeamRegistration, 'id' | 'created_at' | 'updated_at'>
  ): Promise<TeamRegistration> {
    const newReg: TeamRegistration = {
      ...registration,
      id: 'reg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Save locally first (optimistic)
    const all = this.getRegistrations()
    all.unshift(newReg)
    this.saveRegistrations(all)

    // Save to Supabase
    const supabase = getSupabase()
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('team_registrations')
          .insert([newReg])
          .select()

        if (!error && data && data[0]) {
          const parsed = parseRegistration(data[0])
          const updated = this.getRegistrations()
          const idx = updated.findIndex(r => r.id === newReg.id)
          if (idx !== -1) {
            updated[idx] = parsed
          } else {
            updated.unshift(parsed)
          }
          this.saveRegistrations(updated)
          return parsed
        }
        if (error) {
          console.error('Supabase addRegistration error:', error.message)
        }
      } catch (err) {
        console.error('Failed to save registration in database:', err)
      }
    }

    return newReg
  },

  async updateRegistrationStatus(
    id: string,
    status: RegistrationStatus,
    comment?: string,
    reviewer: string = 'Admin'
  ): Promise<TeamRegistration | null> {
    const all = this.getRegistrations()
    const index = all.findIndex(r => r.id === id)
    const now = new Date().toISOString()
    const reviewerName = formatReviewerName(reviewer) || 'Admin'

    const updatePayload = {
      status,
      rejection_comment: status === 'rejected' ? (comment || 'Registration could not be approved.') : null,
      reviewed_by: reviewerName,
      reviewed_at: now,
      updated_at: now
    }

    if (index !== -1) {
      all[index] = {
        ...all[index],
        ...updatePayload,
        rejection_comment: updatePayload.rejection_comment || undefined
      }
      this.saveRegistrations(all)
    }

    // 1. Try server-side API first
    if (isBrowser()) {
      try {
        const res = await fetch('/api/registrations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            status,
            rejection_comment: updatePayload.rejection_comment,
            reviewed_by: reviewerName
          })
        })
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.registration) {
            return json.registration
          }
        }
      } catch (apiErr) {
        console.warn('[LocalDB] /api/registrations PATCH failed, trying direct Supabase:', apiErr)
      }
    }

    // 2. Direct Supabase fallback
    const supabase = getSupabase()
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('team_registrations')
          .update(updatePayload)
          .eq('id', id)
          .select()

        if (!error && data && data[0]) {
          return parseRegistration(data[0])
        }
        if (error) console.error('Supabase updateRegistrationStatus error:', error.message)
      } catch (err) {
        console.error('Supabase updateRegistrationStatus exception:', err)
      }
    }

    return index !== -1 ? all[index] : null
  },

  async updateTeamScore(
    id: string,
    scores: {
      score?: number
      round_1_score?: number
      round_2_score?: number
      round_3_score?: number
      round_4_score?: number
      round_5_score?: number
      round_6_score?: number
      ic_starting?: number
      ic_stock_trades?: number
      ic_auction_spent?: number
      ic_r5_wager?: number
      ic_r5_result?: 'won' | 'lost' | 'none'
      ic_balance?: number
      brownie_points?: number
      judge_notes?: string
    }
  ): Promise<TeamRegistration | null> {
    const all = this.getRegistrations()
    const index = all.findIndex(r => r.id === id)
    const now = new Date().toISOString()
    const existing = index !== -1 ? all[index] : null

    const r1 = scores.round_1_score !== undefined ? Number(scores.round_1_score) : Number(existing?.round_1_score || 0)
    const r2 = scores.round_2_score !== undefined ? Number(scores.round_2_score) : Number(existing?.round_2_score || 0)
    const r3 = scores.round_3_score !== undefined ? Number(scores.round_3_score) : Number(existing?.round_3_score || 0)
    const r4 = scores.round_4_score !== undefined ? Number(scores.round_4_score) : Number(existing?.round_4_score || 0)
    const r5 = scores.round_5_score !== undefined ? Number(scores.round_5_score) : Number(existing?.round_5_score || 0)
    const r6 = scores.round_6_score !== undefined ? Number(scores.round_6_score) : Number(existing?.round_6_score || 0)

    const icStarting = scores.ic_starting !== undefined ? Number(scores.ic_starting) : Number(existing?.ic_starting || 10000)
    const icStock = scores.ic_stock_trades !== undefined ? Number(scores.ic_stock_trades) : Number(existing?.ic_stock_trades || 0)
    const icAuction = scores.ic_auction_spent !== undefined ? Number(scores.ic_auction_spent) : Number(existing?.ic_auction_spent || 0)
    const icPreR5Liquid = Math.max(0, icStarting - icStock - icAuction)
    const maxAllowableWager = Math.max(0, Math.min(1000, Math.floor(icPreR5Liquid * 0.20)))

    const requestedWager = scores.ic_r5_wager !== undefined ? Number(scores.ic_r5_wager) : Number(existing?.ic_r5_wager || 0)
    const icWager = Math.min(maxAllowableWager, Math.max(0, requestedWager))
    const icResult = scores.ic_r5_result !== undefined ? scores.ic_r5_result : (existing?.ic_r5_result || 'none')

    let icBalance = icPreR5Liquid
    if (icResult === 'won') {
      icBalance += Math.floor(icWager * 0.5) // Returns stake + 50% bonus
    } else if (icResult === 'lost') {
      icBalance -= icWager // Stake is lost
    }
    if (scores.ic_balance !== undefined) {
      icBalance = Number(scores.ic_balance)
    }

    const browniePoints = scores.brownie_points !== undefined ? Number(scores.brownie_points) : Number(existing?.brownie_points || 0)

    const sumRounds = r1 + r2 + r3 + r4 + r5 + r6
    const total = scores.score !== undefined ? Number(scores.score) : sumRounds

    const updatePayload: any = {
      score: total,
      round_1_score: r1,
      round_2_score: r2,
      round_3_score: r3,
      round_4_score: r4,
      round_5_score: r5,
      round_6_score: r6,
      ic_starting: icStarting,
      ic_stock_trades: icStock,
      ic_auction_spent: icAuction,
      ic_r5_wager: icWager,
      ic_r5_result: icResult,
      ic_balance: icBalance,
      brownie_points: browniePoints,
      judge_notes: scores.judge_notes !== undefined ? scores.judge_notes : existing?.judge_notes,
      updated_at: now
    }

    if (index !== -1) {
      all[index] = {
        ...all[index],
        ...updatePayload
      }
      this.saveRegistrations(all)
    }

    // Server API route first
    if (isBrowser()) {
      try {
        const res = await fetch('/api/registrations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            ...updatePayload
          })
        })
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.registration) {
            return json.registration
          }
        }
      } catch (apiErr) {
        console.warn('[LocalDB] /api/registrations PATCH score failed, trying direct Supabase:', apiErr)
      }
    }

    // Direct Supabase fallback
    const supabase = getSupabase()
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('team_registrations')
          .update(updatePayload)
          .eq('id', id)
          .select()

        if (!error && data && data[0]) {
          return parseRegistration(data[0])
        }
      } catch (err) {
        console.error('Supabase updateTeamScore exception:', err)
      }
    }

    return index !== -1 ? all[index] : null
  },

  async updateTeamProblemStatement(
    id: string,
    ps: ProblemStatement | null
  ): Promise<TeamRegistration | null> {
    const all = this.getRegistrations()
    const index = all.findIndex(r => r.id === id)
    const now = new Date().toISOString()

    if (index === -1) return null
    const existing = all[index]

    const updatedMembers = existing.members ? [...existing.members] : []
    if (updatedMembers.length > 0) {
      if (ps) {
        updatedMembers[0] = {
          ...updatedMembers[0],
          assigned_problem_statement: {
            ...ps,
            assigned_at: ps.assigned_at || now
          }
        }
      } else {
        const copy = { ...updatedMembers[0] }
        delete (copy as any).assigned_problem_statement
        updatedMembers[0] = copy
      }
    }

    all[index] = {
      ...existing,
      members: updatedMembers,
      assigned_problem_statement: ps || undefined,
      updated_at: now
    }
    this.saveRegistrations(all)

    // 1. Server API route
    if (isBrowser()) {
      try {
        const res = await fetch('/api/registrations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            members: updatedMembers
          })
        })
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.registration) {
            return json.registration
          }
        }
      } catch (apiErr) {
        console.warn('[LocalDB] /api/registrations PATCH failed, trying Supabase direct:', apiErr)
      }
    }

    // 2. Direct Supabase fallback
    const supabase = getSupabase()
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('team_registrations')
          .update({
            members: updatedMembers,
            updated_at: now
          })
          .eq('id', id)
          .select()

        if (!error && data && data[0]) {
          return parseRegistration(data[0])
        }
      } catch (err) {
        console.error('Supabase updateTeamProblemStatement exception:', err)
      }
    }

    return all[index]
  },

  async updateTeamDatasheet(
    id: string,
    datasheet: TeamDatasheet | null
  ): Promise<TeamRegistration | null> {
    const all = this.getRegistrations()
    const index = all.findIndex(r => r.id === id)
    const now = new Date().toISOString()

    if (index === -1) return null
    const existing = all[index]

    const updatedMembers = existing.members ? [...existing.members] : []
    if (updatedMembers.length > 0) {
      if (datasheet) {
        updatedMembers[0] = {
          ...updatedMembers[0],
          assigned_datasheet: {
            ...datasheet,
            assigned_at: datasheet.assigned_at || now
          }
        }
      } else {
        const copy = { ...updatedMembers[0] }
        delete (copy as any).assigned_datasheet
        updatedMembers[0] = copy
      }
    }

    all[index] = {
      ...existing,
      members: updatedMembers,
      assigned_datasheet: datasheet || undefined,
      updated_at: now
    }
    this.saveRegistrations(all)

    // 1. Server API route
    if (isBrowser()) {
      try {
        const res = await fetch('/api/registrations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            members: updatedMembers
          })
        })
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.registration) {
            return json.registration
          }
        }
      } catch (apiErr) {
        console.warn('[LocalDB] /api/registrations PATCH datasheet failed, trying Supabase direct:', apiErr)
      }
    }

    // 2. Direct Supabase fallback
    const supabase = getSupabase()
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('team_registrations')
          .update({
            members: updatedMembers,
            updated_at: now
          })
          .eq('id', id)
          .select()

        if (!error && data && data[0]) {
          return parseRegistration(data[0])
        }
      } catch (err) {
        console.error('Supabase updateTeamDatasheet exception:', err)
      }
    }

    return all[index]
  },

  async deleteRegistration(id: string): Promise<boolean> {
    if (isBrowser()) {
      try {
        await fetch(`/api/registrations?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      } catch (e) {
        console.warn('[LocalDB] /api/registrations DELETE failed, trying direct Supabase:', e)
        const supabase = getSupabase()
        if (supabase) {
          try {
            await supabase.from('team_registrations').delete().eq('id', id)
          } catch (err) {
            console.error('Direct Supabase delete failed:', err)
          }
        }
      }
    } else {
      const supabase = getSupabase()
      if (supabase) {
        try {
          await supabase.from('team_registrations').delete().eq('id', id)
        } catch (err) {
          console.error('Direct Supabase delete failed:', err)
        }
      }
    }

    const all = this.getRegistrations()
    const filtered = all.filter(r => r.id !== id)
    this.saveRegistrations(filtered)
    return true
  },

  // ── ADMINS (SUPABASE-FIRST) ─────────────────────────────────────
  async getAdminsAsync(): Promise<AdminUser[]> {
    const supabase = getSupabase()
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('*')
          .order('created_at', { ascending: true })

        if (!error && data && data.length > 0) {
          this.saveAdmins(data as AdminUser[])
          return data as AdminUser[]
        }
      } catch (err) {
        console.error('Supabase getAdminsAsync error:', err)
      }
    }
    return this.getAdmins()
  },

  getAdmins(): AdminUser[] {
    if (!isBrowser()) return [INITIAL_SUPERADMIN]
    const stored = localStorage.getItem(STORAGE_KEYS.ADMINS)
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify([INITIAL_SUPERADMIN]))
      return [INITIAL_SUPERADMIN]
    }
    try {
      let parsed = JSON.parse(stored) as AdminUser[]
      // Remove deprecated placeholder admin
      parsed = parsed.filter(a => a.email.toLowerCase() !== 'admin@hackathon.com')
      if (!parsed.some(a => a.email.toLowerCase() === INITIAL_SUPERADMIN.email.toLowerCase())) {
        parsed.unshift(INITIAL_SUPERADMIN)
      }
      localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(parsed))
      return parsed
    } catch { return [INITIAL_SUPERADMIN] }
  },

  async getAllProfilesAsync(): Promise<UserProfile[]> {
    if (isBrowser()) {
      try {
        const res = await fetch('/api/admins')
        if (res.ok) {
          const json = await res.json()
          if (json.success && Array.isArray(json.profiles)) {
            return json.profiles
          }
        }
      } catch (e) {
        console.warn('API /api/admins fetch failed:', e)
      }
    }
    const supabase = getSupabase()
    if (supabase) {
      try {
        const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
        if (data) return data as UserProfile[]
      } catch (err) {
        console.error('Supabase getAllProfilesAsync error:', err)
      }
    }
    return []
  },

  async promoteUserToAdmin(email: string, name?: string, requesterEmail?: string): Promise<{ success: boolean; message?: string }> {
    const cleanEmail = email.trim().toLowerCase()
    if (isBrowser()) {
      try {
        const res = await fetch('/api/admins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'promote', email: cleanEmail, name, requesterEmail: requesterEmail || DEV_EMAIL })
        })
        const data = await res.json()
        if (res.ok && data.success) {
          const admins = this.getAdmins()
          if (!admins.some(a => a.email.toLowerCase() === cleanEmail)) {
            admins.push({
              id: 'admin-' + Date.now(),
              email: cleanEmail,
              name: name || cleanEmail.split('@')[0],
              role: 'admin',
              added_by: requesterEmail || DEV_EMAIL,
              first_login_pending: false,
              created_at: new Date().toISOString()
            })
            this.saveAdmins(admins)
          }
          // If current user is the promoted user, update local storage immediately!
          const current = this.getStoredUser()
          if (current && current.email.toLowerCase() === cleanEmail) {
            this.setCurrentUser({ ...current, role: 'admin' })
          }
          return { success: true, message: data.message }
        }
        if (data.error) return { success: false, message: data.error }
      } catch (e: any) {
        console.warn('/api/admins POST promote failed:', e)
      }
    }

    const supabase = getSupabase()
    if (supabase) {
      try {
        await supabase.from('profiles').update({ role: 'admin' }).ilike('email', cleanEmail)
        await supabase.from('admin_users').upsert({
          id: 'admin-' + Date.now(),
          email: cleanEmail,
          name: name || cleanEmail.split('@')[0],
          role: 'admin',
          added_by: requesterEmail || DEV_EMAIL,
          first_login_pending: false,
          created_at: new Date().toISOString()
        }, { onConflict: 'email' })
      } catch (err: any) {
        return { success: false, message: err?.message || 'Failed to promote' }
      }
    }
    const admins = this.getAdmins()
    if (!admins.some(a => a.email.toLowerCase() === cleanEmail)) {
      admins.push({
        id: 'admin-' + Date.now(),
        email: cleanEmail,
        name: name || cleanEmail.split('@')[0],
        role: 'admin',
        added_by: requesterEmail || DEV_EMAIL,
        first_login_pending: false,
        created_at: new Date().toISOString()
      })
      this.saveAdmins(admins)
    }
    return { success: true }
  },

  async removeAdminAccess(email: string, requesterEmail?: string): Promise<{ success: boolean; message?: string }> {
    const cleanEmail = email.trim().toLowerCase()
    if (cleanEmail === DEV_EMAIL) {
      return { success: false, message: 'Cannot remove Dev Superadmin account.' }
    }

    if (isBrowser()) {
      try {
        const res = await fetch('/api/admins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'demote', email: cleanEmail, requesterEmail: requesterEmail || DEV_EMAIL })
        })
        const data = await res.json()
        if (res.ok && data.success) {
          const admins = this.getAdmins().filter(a => a.email.toLowerCase() !== cleanEmail)
          this.saveAdmins(admins)
          const current = this.getStoredUser()
          if (current && current.email.toLowerCase() === cleanEmail) {
            this.setCurrentUser({ ...current, role: 'participant' })
          }
          return { success: true, message: data.message }
        }
        if (data.error) return { success: false, message: data.error }
      } catch (e: any) {
        console.warn('/api/admins POST demote failed:', e)
      }
    }

    const supabase = getSupabase()
    if (supabase) {
      try {
        await supabase.from('profiles').update({ role: 'participant' }).ilike('email', cleanEmail)
        await supabase.from('admin_users').delete().ilike('email', cleanEmail)
      } catch (err: any) {
        return { success: false, message: err?.message || 'Failed to remove' }
      }
    }
    const admins = this.getAdmins().filter(a => a.email.toLowerCase() !== cleanEmail)
    this.saveAdmins(admins)
    return { success: true }
  },

  saveAdmins(admins: AdminUser[]) {
    if (!isBrowser()) return
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(admins))
  },

  async addAdmin(name: string, email: string, addedBy: string): Promise<{ admin: AdminUser; temporaryPassword: string }> {
    const admins = this.getAdmins()
    const cleanEmail = email.trim().toLowerCase()
    if (admins.find(a => a.email.toLowerCase() === cleanEmail)) {
      throw new Error(`Admin with email ${cleanEmail} already exists.`)
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$'
    let tempPass = 'Hack-'
    for (let i = 0; i < 7; i++) tempPass += chars.charAt(Math.floor(Math.random() * chars.length))

    const newAdmin: AdminUser = {
      id: 'admin-' + Date.now(),
      email: cleanEmail,
      name: name.trim(),
      role: 'admin',
      added_by: addedBy,
      first_login_pending: true,
      temporary_password: tempPass,
      created_at: new Date().toISOString()
    }
    admins.push(newAdmin)
    this.saveAdmins(admins)

    // Call server API to promote user in profiles and admin_users table
    if (isBrowser()) {
      try {
        await fetch('/api/admins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'promote', email: cleanEmail, name: name.trim(), role: 'admin', requesterEmail: addedBy })
        })
      } catch (e) {
        console.warn('api/admins call from addAdmin warning:', e)
      }
    }

    const supabase = getSupabase()
    if (supabase) {
      try {
        await supabase.from('admin_users').upsert([newAdmin], { onConflict: 'email' })
        await supabase.from('profiles').update({ role: 'admin' }).ilike('email', cleanEmail)
      } catch (err) {
        console.error('Supabase addAdmin error:', err)
      }
    }

    // If current logged in user is this person, update local user immediately
    const current = this.getStoredUser()
    if (current && current.email.toLowerCase() === cleanEmail) {
      this.setCurrentUser({ ...current, role: 'admin' })
    }

    return { admin: newAdmin, temporaryPassword: tempPass }
  },

  async updateAdminRole(email: string, newRole: UserRole): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase()
    const admins = this.getAdmins()
    const index = admins.findIndex(a => a.email.toLowerCase() === cleanEmail)
    if (index !== -1) {
      admins[index] = { ...admins[index], role: newRole }
      this.saveAdmins(admins)
    }

    const current = this.getStoredUser()
    if (current && current.email.toLowerCase() === cleanEmail) {
      this.setCurrentUser({ ...current, role: newRole })
    }

    const supabase = getSupabase()
    if (supabase) {
      try {
        await supabase.from('admin_users').update({ role: newRole }).ilike('email', cleanEmail)
        await supabase.from('profiles').update({ role: newRole }).ilike('email', cleanEmail)
      } catch (err) {
        console.error('Database updateAdminRole error:', err)
      }
    }
    return true
  },

  async updateAdminCredentials(email: string, newPassword: string): Promise<boolean> {
    const admins = this.getAdmins()
    const index = admins.findIndex(a => a.email.toLowerCase() === email.trim().toLowerCase())
    if (index !== -1) {
      admins[index] = { ...admins[index], temporary_password: newPassword, first_login_pending: false }
      this.saveAdmins(admins)
    }

    const supabase = getSupabase()
    if (supabase) {
      try {
        await supabase.from('admin_users')
          .update({ temporary_password: newPassword, first_login_pending: false })
          .eq('email', email.trim().toLowerCase())
      } catch (err) {
        console.error('Supabase updateAdminCredentials error:', err)
      }
    }
    return true
  },

  // ── AUTH (SUPABASE AUTH) ─────────────────────────────────────────
  async login(email: string, password: string): Promise<{ success: boolean; message?: string; mustReset?: boolean }> {
    const cleanEmail = email.trim().toLowerCase()

    // 1. Direct Dev Superadmin authentication
    if (cleanEmail === DEV_EMAIL) {
      if (password === DEV_DEFAULT_PASSWORD) {
        const devProfile: UserProfile = {
          id: DEV_UUID,
          email: DEV_EMAIL,
          full_name: 'Arth',
          role: 'superadmin',
          created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
          must_reset_password: false
        }
        this.setCurrentUser(devProfile)
        return { success: true, mustReset: false }
      }
    }

    // Check admin_users table next
    const admins = await this.getAdminsAsync()
    const foundAdmin = admins.find(a => a.email.toLowerCase() === cleanEmail)

    if (foundAdmin) {
      // Dev login if password changed
      if (cleanEmail === DEV_EMAIL && (password === DEV_DEFAULT_PASSWORD || password === foundAdmin.temporary_password)) {
        const devProfile: UserProfile = {
          id: DEV_UUID,
          email: DEV_EMAIL,
          full_name: foundAdmin.name || 'Arth',
          role: 'superadmin',
          created_at: foundAdmin.created_at,
          must_reset_password: false
        }
        this.setCurrentUser(devProfile)
        return { success: true, mustReset: false }
      }
      // Admin login: check against temporary_password
      if (password && foundAdmin.temporary_password && password !== foundAdmin.temporary_password) {
        // Try Supabase Auth as fallback for admins who've reset password or logged in with existing password
        const supabase = getSupabase()
        if (supabase) {
          try {
            const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password
            })
            if (!authErr && authData.user) {
              const adminProfile: UserProfile = {
                id: authData.user.id,
                email: cleanEmail,
                full_name: foundAdmin.name,
                role: foundAdmin.role,
                created_at: foundAdmin.created_at,
                must_reset_password: false
              }
              this.setCurrentUser(adminProfile)
              return { success: true, mustReset: false }
            }
          } catch (_) {}
        }
        return { success: false, message: 'Invalid admin credentials.' }
      }

      const adminProfile: UserProfile = {
        id: foundAdmin.id,
        email: cleanEmail,
        full_name: foundAdmin.name,
        role: foundAdmin.role,
        created_at: foundAdmin.created_at,
        must_reset_password: foundAdmin.first_login_pending
      }
      this.setCurrentUser(adminProfile)
      return { success: true, mustReset: foundAdmin.first_login_pending }
    }

    // Regular participant login via Supabase Auth
    const supabase = getSupabase()
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
        if (error) {
          return { success: false, message: error.message }
        }
        if (data.user) {
          // Fetch profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()

          // Check admin_users table as well
          let adminRole: UserRole | null = null
          const { data: adminRecord } = await supabase
            .from('admin_users')
            .select('role, name')
            .ilike('email', cleanEmail)
            .maybeSingle()

          if (adminRecord?.role) {
            adminRole = adminRecord.role as UserRole
          } else if (profileData?.role === 'admin' || profileData?.role === 'superadmin') {
            adminRole = profileData.role as UserRole
          }

          const determinedRole: UserRole = cleanEmail === DEV_EMAIL
            ? 'superadmin'
            : (adminRole || (profileData?.role as UserRole) || 'participant')

          if (determinedRole === 'admin' || determinedRole === 'superadmin') {
            const admins = this.getAdmins()
            if (!admins.some(a => a.email.toLowerCase() === cleanEmail)) {
              admins.push({
                id: 'admin-' + Date.now(),
                email: cleanEmail,
                name: adminRecord?.name || profileData?.full_name || cleanEmail.split('@')[0],
                role: determinedRole,
                added_by: 'system',
                first_login_pending: false,
                created_at: new Date().toISOString()
              })
              this.saveAdmins(admins)
            }
          }

          const profile: UserProfile = profileData
            ? {
                id: profileData.id,
                email: profileData.email,
                full_name: profileData.full_name,
                phone: profileData.phone || undefined,
                srn: profileData.srn || undefined,
                department: profileData.department || undefined,
                semester: profileData.semester || undefined,
                section: profileData.section || undefined,
                residence_type: profileData.residence_type || undefined,
                role: determinedRole,
                created_at: profileData.created_at,
                must_reset_password: profileData.must_reset_password || false
              }
            : {
                id: data.user.id,
                email: cleanEmail,
                full_name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
                role: determinedRole,
                created_at: new Date().toISOString()
              }

          this.setCurrentUser(profile)
          return { success: true }
        }
      } catch (err: any) {
        return { success: false, message: err?.message || 'Login failed.' }
      }
    }

    return { success: false, message: 'Authentication service unavailable.' }
  },

  async logout(): Promise<void> {
    this.setCurrentUser(null)
    const supabase = getSupabase()
    if (supabase) {
      try {
        await supabase.auth.signOut()
      } catch (err) {
        console.error('Supabase signOut error:', err)
      }
    }
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    const stored = this.getStoredUser()
    if (stored) return stored

    const supabase = getSupabase()
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profileData) {
            const profile: UserProfile = {
              id: profileData.id,
              email: profileData.email,
              full_name: profileData.full_name,
              phone: profileData.phone || undefined,
              srn: profileData.srn || undefined,
              role: (profileData.role as UserRole) || 'participant',
              created_at: profileData.created_at,
              must_reset_password: profileData.must_reset_password || false
            }
            this.setCurrentUser(profile)
            return profile
          }
        }
      } catch (err) {
        console.error('Supabase getCurrentUser error:', err)
      }
    }
    return null
  },

  getStoredUser(): UserProfile | null {
    if (!isBrowser()) return null
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
    if (!stored) return null
    try {
      const parsed = JSON.parse(stored) as UserProfile
      if (parsed && (parsed.id === 'admin-dev' || parsed.email?.toLowerCase() === DEV_EMAIL)) {
        parsed.id = DEV_UUID
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(parsed))
      }
      return parsed
    } catch { return null }
  },

  setCurrentUser(user: UserProfile | null) {
    if (!isBrowser()) return
    if (!user) localStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
    else localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user))
  },

  async updateProfile(userId: string, data: Partial<UserProfile>, email?: string): Promise<boolean> {
    const current = this.getStoredUser()
    const targetEmail = (email || current?.email || '').trim().toLowerCase()
    const targetId = userId === 'admin-dev' ? DEV_UUID : userId

    // 1. Try server-side API (service-role safe execution)
    if (isBrowser()) {
      try {
        const res = await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: targetId,
            email: targetEmail,
            full_name: data.full_name,
            phone: data.phone,
            srn: data.srn,
            department: data.department,
            semester: data.semester,
            section: data.section,
            residence_type: data.residence_type
          })
        })
        if (res.ok) {
          const json = await res.json()
          if (json.success) {
            if (current) {
              const updated: UserProfile = {
                ...current,
                id: targetId,
                full_name: data.full_name || current.full_name,
                phone: data.phone !== undefined ? data.phone : current.phone,
                srn: data.srn !== undefined ? data.srn : current.srn,
                department: data.department !== undefined ? data.department : current.department,
                semester: data.semester !== undefined ? data.semester : current.semester,
                section: data.section !== undefined ? data.section : current.section,
                residence_type: data.residence_type !== undefined ? data.residence_type : current.residence_type
              }
              this.setCurrentUser(updated)
            }
            return true
          }
        }
      } catch (apiErr) {
        console.warn('API /api/profile call failed, attempting direct Supabase:', apiErr)
      }
    }

    // 2. Direct Supabase fallback
    const supabase = getSupabase()
    if (supabase) {
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)
        let query = supabase.from('profiles').update({
          full_name: data.full_name,
          phone: data.phone || null,
          srn: data.srn || null,
          updated_at: new Date().toISOString()
        })

        if (isUUID) {
          query = query.eq('id', targetId)
        } else if (targetEmail) {
          query = query.eq('email', targetEmail)
        } else {
          return false
        }

        const { error } = await query
        if (error) {
          console.error('Supabase updateProfile fallback error:', error.message)
        } else {
          if (current) {
            this.setCurrentUser({
              ...current,
              id: targetId,
              full_name: data.full_name || current.full_name,
              phone: data.phone !== undefined ? data.phone : current.phone,
              srn: data.srn !== undefined ? data.srn : current.srn,
              department: data.department !== undefined ? data.department : current.department,
              semester: data.semester !== undefined ? data.semester : current.semester,
              section: data.section !== undefined ? data.section : current.section
            })
          }
          return true
        }
      } catch (err) {
        console.error('Supabase updateProfile exception:', err)
      }
    }

    // Optimistic local update
    if (current) {
      this.setCurrentUser({
        ...current,
        full_name: data.full_name || current.full_name,
        phone: data.phone !== undefined ? data.phone : current.phone,
        srn: data.srn !== undefined ? data.srn : current.srn,
        department: data.department !== undefined ? data.department : current.department,
        semester: data.semester !== undefined ? data.semester : current.semester,
        section: data.section !== undefined ? data.section : current.section
      })
      return true
    }

    return false
  },

  async signUp(
    email: string,
    password: string,
    fullName: string,
    phone: string,
    srn: string,
    department?: string,
    semester?: string,
    section?: string,
    residence_type?: string
  ): Promise<{ success: boolean; message?: string }> {
    const cleanEmail = email.trim().toLowerCase()

    // 1. Try server-side registration API (auto-confirms email and creates profile)
    if (isBrowser()) {
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password,
            fullName: fullName.trim(),
            phone: phone.trim(),
            srn: srn.trim().toUpperCase(),
            department: (department || '').trim(),
            semester: (semester || '').trim(),
            section: (section || '').trim().toUpperCase(),
            residence_type: (residence_type || '').trim() || 'Non-Hostelite'
          })
        })

        const data = await res.json()
        if (!res.ok || data.error) {
          return { success: false, message: data.error || 'Registration failed' }
        }

        if (data.success && data.user) {
          // Immediately log in user so session is active
          const loginRes = await this.login(cleanEmail, password)
          if (!loginRes.success) {
            const profile: UserProfile = {
              id: data.user.id,
              email: cleanEmail,
              full_name: fullName.trim(),
              phone: phone.trim() || undefined,
              srn: srn.trim().toUpperCase() || undefined,
              department: (department || '').trim() || undefined,
              semester: (semester || '').trim() || undefined,
              section: (section || '').trim().toUpperCase() || undefined,
              residence_type: (residence_type || '').trim() || 'Non-Hostelite',
              role: 'participant',
              created_at: new Date().toISOString()
            }
            this.setCurrentUser(profile)
          }
          return { success: true }
        }
      } catch (apiErr: any) {
        console.warn('/api/auth/register failed, attempting direct Supabase:', apiErr)
      }
    }

    // 2. Direct Supabase Auth fallback
    const supabase = getSupabase()
    if (!supabase) {
      return { success: false, message: 'Authentication service unavailable.' }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            srn: srn.trim().toUpperCase(),
            department: (department || '').trim(),
            semester: (semester || '').trim(),
            section: (section || '').trim().toUpperCase(),
            residence_type: (residence_type || '').trim() || 'Non-Hostelite'
          }
        }
      })

      if (error) {
        return { success: false, message: error.message }
      }

      if (data.user) {
        // Try inserting into profiles table
        try {
          await supabase.from('profiles').insert([{
            id: data.user.id,
            email: cleanEmail,
            full_name: fullName.trim(),
            phone: phone.trim() || null,
            srn: srn.trim().toUpperCase() || null,
            department: (department || '').trim() || null,
            semester: (semester || '').trim() || null,
            section: (section || '').trim().toUpperCase() || null,
            residence_type: (residence_type || '').trim() || 'Non-Hostelite',
            role: 'participant',
            must_reset_password: false,
            created_at: new Date().toISOString()
          }])
        } catch (_) {}

        const profile: UserProfile = {
          id: data.user.id,
          email: cleanEmail,
          full_name: fullName.trim(),
          phone: phone.trim() || undefined,
          srn: srn.trim().toUpperCase() || undefined,
          department: (department || '').trim() || undefined,
          semester: (semester || '').trim() || undefined,
          section: (section || '').trim().toUpperCase() || undefined,
          residence_type: (residence_type || '').trim() || 'Non-Hostelite',
          role: 'participant',
          created_at: new Date().toISOString()
        }

        this.setCurrentUser(profile)
        return { success: true }
      }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Sign up failed.' }
    }

    return { success: false, message: 'Signup failed. Please try again.' }
  },

  async resetAdminPassword(email: string, newPassword: string): Promise<boolean> {
    return this.updateAdminCredentials(email, newPassword)
  },

  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; message?: string }> {
    const cleanEmail = email.trim().toLowerCase()
    // First try the server API route
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_email', email: cleanEmail })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        return { success: true, message: data.message || 'Password reset link sent to your email.' }
      }
      if (data.error) {
        return { success: false, message: data.error }
      }
    } catch (_) {}

    // Direct Supabase fallback
    const supabase = getSupabase()
    if (!supabase) {
      return { success: false, message: 'Authentication service unavailable.' }
    }

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://arth-mantra.vercel.app'
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${origin}/reset-password`
      })
      if (error) {
        return { success: false, message: error.message }
      }
      return { success: true, message: 'Password recovery email sent. Please check your inbox and spam folder.' }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to send recovery email.' }
    }
  },

  async adminResetPassword(email: string, newPassword?: string): Promise<{ success: boolean; temporaryPassword?: string; message?: string }> {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_reset', email, newPassword })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        return {
          success: true,
          temporaryPassword: data.temporaryPassword,
          message: data.message || `Password reset for ${email}`
        }
      }
      return { success: false, message: data.error || 'Failed to reset password' }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Server error resetting password' }
    }
  },

  async updateUserPassword(newPassword: string): Promise<{ success: boolean; message?: string }> {
    const supabase = getSupabase()
    if (!supabase) {
      return { success: false, message: 'Authentication service unavailable.' }
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        return { success: false, message: error.message }
      }
      return { success: true, message: 'Password updated successfully!' }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error updating password.' }
    }
  },

  async syncUserRoleAsync(email?: string | null): Promise<{ role: UserRole; isAdmin: boolean } | null> {
    if (!email) return null
    const cleanEmail = email.trim().toLowerCase()
    if (cleanEmail === DEV_EMAIL) {
      return { role: 'superadmin', isAdmin: true }
    }

    try {
      // 1. Check via API endpoint /api/profile
      const res = await fetch(`/api/profile?email=${encodeURIComponent(cleanEmail)}`, {
        cache: 'no-store'
      })
      if (res.ok) {
        const data = await res.json()
        if (data && data.role) {
          const role = data.role as UserRole
          const isAdmin = Boolean(data.isAdmin || role === 'admin' || role === 'superadmin')
          if (isAdmin) {
            const admins = this.getAdmins()
            const existingIdx = admins.findIndex(a => a.email.toLowerCase() === cleanEmail)
            if (existingIdx !== -1) {
              admins[existingIdx].role = role
            } else {
              admins.push({
                id: 'admin-' + Date.now(),
                email: cleanEmail,
                name: data.profile?.full_name || cleanEmail.split('@')[0],
                role,
                added_by: 'system',
                first_login_pending: false,
                created_at: new Date().toISOString()
              })
            }
            this.saveAdmins(admins)
          } else {
            // Remove from local admins if demoted
            const admins = this.getAdmins().filter(a => a.email.toLowerCase() !== cleanEmail)
            this.saveAdmins(admins)
          }
          return { role, isAdmin }
        }
      }
    } catch (_) {}

    // 2. Direct Supabase check
    const supabase = getSupabase()
    if (supabase) {
      try {
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('role, name')
          .ilike('email', cleanEmail)
          .maybeSingle()

        if (adminData && adminData.role) {
          const role = adminData.role as UserRole
          const admins = this.getAdmins()
          const existingIdx = admins.findIndex(a => a.email.toLowerCase() === cleanEmail)
          if (existingIdx !== -1) {
            admins[existingIdx].role = role
          } else {
            admins.push({
              id: 'admin-' + Date.now(),
              email: cleanEmail,
              name: adminData.name || cleanEmail.split('@')[0],
              role,
              added_by: 'system',
              first_login_pending: false,
              created_at: new Date().toISOString()
            })
          }
          this.saveAdmins(admins)
          return { role, isAdmin: true }
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .ilike('email', cleanEmail)
          .maybeSingle()

        if (profileData && profileData.role) {
          const role = profileData.role as UserRole
          const isAdmin = role === 'admin' || role === 'superadmin'
          return { role, isAdmin }
        }
      } catch (_) {}
    }

    return null
  },

  isAdmin(email?: string | null): boolean {
    if (!email) return false
    const clean = email.trim().toLowerCase()
    if (clean === DEV_EMAIL) return true
    const envAdmins = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
    if (envAdmins.includes(clean)) return true
    const admins = this.getAdmins()
    return admins.some(a => a.email.toLowerCase() === clean)
  },

  isDev(email?: string | null): boolean {
    if (!email) return false
    return email.trim().toLowerCase() === DEV_EMAIL
  }
}

function parseRegistration(raw: any): TeamRegistration {
  const members = Array.isArray(raw.members) ? raw.members : (typeof raw.members === 'string' ? JSON.parse(raw.members) : [])
  const assigned_problem_statement = raw.assigned_problem_statement || (members[0] && members[0].assigned_problem_statement) || undefined
  const assigned_datasheet = raw.assigned_datasheet || (members[0] && members[0].assigned_datasheet) || undefined
  const assigned_auction_sheet = raw.assigned_auction_sheet || (members[0] && members[0].assigned_auction_sheet) || undefined

  return {
    ...raw,
    score: Number(raw.score) || 0,
    round_1_score: Number(raw.round_1_score) || 0,
    round_2_score: Number(raw.round_2_score) || 0,
    round_3_score: Number(raw.round_3_score) || 0,
    judge_notes: raw.judge_notes || undefined,
    assigned_problem_statement,
    assigned_datasheet,
    assigned_auction_sheet,
    members
  }
}

export function formatReviewerName(reviewer?: string): string {
  if (!reviewer) return ''
  const trimmed = reviewer.trim()
  if (trimmed.includes('@')) {
    const local = trimmed.split('@')[0]
    return local.replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
  return trimmed.replace(/\+?\d[\d -]{8,}\d/g, '').replace(/[^\s]+@[^\s]+/g, '').trim()
}

export function exportRegistrationsToExcel(registrations: TeamRegistration[], filename: string = 'hackathon_registrations') {
  const rows: Record<string, string | number>[] = []

  registrations.forEach(reg => {
    reg.members.forEach((member: TeamMember, idx: number) => {
      rows.push({
        'Team Name': reg.team_name,
        'Team Leader Email': reg.leader_email,
        'Member Number': idx + 1,
        'Member Role': idx === 0 ? 'Leader' : 'Member',
        'Member Name': member.name,
        'Member SRN': member.srn,
        'Member Phone': member.phone,
        'Member Email': member.email,
        'Department': member.department || 'N/A',
        'Semester': member.semester || 'N/A',
        'Section': member.section || 'N/A',
        'Hostelite / Non-Hostelite': member.residence_type || 'Non-Hostelite',
        'UTR Reference': reg.utr_reference || 'N/A',
        'Status': reg.status.toUpperCase(),
        'Total Score': reg.score || 0,
        'R1: Blueprint': reg.round_1_score || 0,
        'R2: Intelligence': reg.round_2_score || 0,
        'R3: Live Market': reg.round_3_score || 0,
        'R4: Auction': reg.round_4_score || 0,
        'R5: Hidden Insider': reg.round_5_score || 0,
        'R6: Boardroom': reg.round_6_score || 0,
        'Brownie Points': reg.brownie_points || 0,
        'Judge Notes': reg.judge_notes || 'N/A',
        'Rejection Comment': reg.rejection_comment || 'N/A',
        'Hackathon': reg.hackathon_name,
        'Registered At': new Date(reg.created_at).toLocaleString()
      })
    })
  })

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [
    { wch: 24 }, { wch: 28 }, { wch: 14 }, { wch: 12 },
    { wch: 24 }, { wch: 18 }, { wch: 14 }, { wch: 28 },
    { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 24 },
    { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 35 },
    { wch: 24 }, { wch: 22 }
  ]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations')
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export function exportFilteredMembersToExcel(
  members: Array<{
    team_name?: string
    leader_email?: string
    member_role?: string
    name: string
    srn: string
    phone: string
    email: string
    department?: string
    semester?: string
    section?: string
    residence_type?: string
    status?: string
    registered_at?: string
  }>,
  filename: string = 'arth_mantra_filtered_members'
) {
  const rows = members.map(m => ({
    'Team Name': m.team_name || 'N/A',
    'Member Role': m.member_role || 'Member',
    'Name': m.name,
    'SRN': m.srn,
    'Email': m.email,
    'Phone': m.phone,
    'Hostelite / Non-Hostelite': m.residence_type || 'Non-Hostelite',
    'Department': m.department || 'N/A',
    'Semester': m.semester || 'N/A',
    'Section': m.section || 'N/A',
    'Registration Status': m.status ? m.status.toUpperCase() : 'N/A',
    'Team Leader': m.leader_email || 'N/A',
    'Registered At': m.registered_at ? new Date(m.registered_at).toLocaleString() : 'N/A'
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [
    { wch: 24 }, { wch: 14 }, { wch: 24 }, { wch: 18 },
    { wch: 28 }, { wch: 16 }, { wch: 24 }, { wch: 20 },
    { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 28 },
    { wch: 22 }
  ]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Members')
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export function exportProfilesToExcel(
  profiles: UserProfile[],
  filename: string = 'arth_mantra_registered_accounts'
) {
  const rows = profiles.map(p => ({
    'Full Name': p.full_name,
    'Email': p.email,
    'SRN': p.srn || 'N/A',
    'Phone': p.phone || 'N/A',
    'Hostelite / Non-Hostelite': p.residence_type || 'Non-Hostelite',
    'Department': p.department || 'N/A',
    'Semester': p.semester || 'N/A',
    'Section': p.section || 'N/A',
    'Role': p.role.toUpperCase(),
    'Registered At': p.created_at ? new Date(p.created_at).toLocaleString() : 'N/A'
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [
    { wch: 24 }, { wch: 28 }, { wch: 18 }, { wch: 16 },
    { wch: 24 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
    { wch: 14 }, { wch: 22 }
  ]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registered Accounts')
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export function exportLeaderboardToExcel(registrations: TeamRegistration[], filename: string = 'arth_mantra_leaderboard') {
  const approved = registrations.filter(r => r.status === 'approved')
  const sorted = [...approved].sort((a, b) => (b.score || 0) - (a.score || 0))

  const rows = sorted.map((reg, idx) => ({
    'Rank': idx + 1,
    'Team Name': reg.team_name,
    'Total Score': reg.score || 0,
    'R1: The Industry Blueprint': reg.round_1_score || 0,
    'R2: The Intelligence Drop': reg.round_2_score || 0,
    'R3: The Central Budget & Live Market': reg.round_3_score || 0,
    'R4: The Resource Auction': reg.round_4_score || 0,
    'R5: The Hidden Insider Challenge': reg.round_5_score || 0,
    'R6: The Boardroom Showdown': reg.round_6_score || 0,
    'Brownie Points': reg.brownie_points || 0,
    'Team Leader': reg.leader_email,
    'Members Count': reg.members?.length || 0,
    'Judge Remarks': reg.judge_notes || '',
    'Hackathon': reg.hackathon_name
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [
    { wch: 8 }, { wch: 28 }, { wch: 14 }, { wch: 26 },
    { wch: 26 }, { wch: 34 }, { wch: 24 }, { wch: 28 },
    { wch: 26 }, { wch: 20 }, { wch: 20 }, { wch: 24 },
    { wch: 18 }, { wch: 16 }, { wch: 26 }, { wch: 16 },
    { wch: 28 }, { wch: 14 }, { wch: 35 }, { wch: 28 }
  ]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leaderboard')
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
}
