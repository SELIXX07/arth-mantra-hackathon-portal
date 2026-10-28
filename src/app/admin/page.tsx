'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldAlert, Users, CheckCircle2, XCircle, Clock, Download, Search,
  Eye, EyeOff, X, UserPlus, Lock, RefreshCw, AlertCircle, MessageSquare,
  Sparkles, Plus, Trash2, Edit3, Calendar, Check, Filter,
  FileSpreadsheet, ExternalLink, Copy, Upload, Image as ImageIcon,
  ShieldCheck, DollarSign, Terminal, ChevronDown, ChevronUp, Link as LinkIcon,
  Trophy, Award, TrendingUp, Star, KeyRound, Activity, Play, Pause, Square, Database, BookOpen, FileText, Layers,
  UserCheck, Mail, Phone, GraduationCap, Building2, Gavel
} from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/ToastProvider'
import { LocalDB, getTeamTraderPin, exportRegistrationsToExcel, exportLeaderboardToExcel, exportFilteredMembersToExcel, exportProfilesToExcel, PRESET_ARTH_MANTRA } from '@/lib/storage'
import { STOCK_MARKET_URL } from '@/lib/config'
import { TeamRegistration, AdminUser, Hackathon, UserRole, UserProfile, PES_DEPARTMENTS, SEMESTER_OPTIONS, SECTION_OPTIONS, RESIDENCE_OPTIONS, ProblemStatement, TeamDatasheet, AuctionSheet } from '@/types'
import Link from 'next/link'

export const ARTH_MANTRA_PS_PRESETS: ProblemStatement[] = [
  {
    track: 'Algorithmic Trading & Arbitrage',
    title: 'High-Frequency Cross-Venue Arbitrage & Order-Book Liquidity Shield',
    description: 'Design and simulate an automated statistical arbitrage algorithm capable of capitalizing on 15-second price discrepancies across finite float equity pools while neutralizing sudden catalyst-driven volatility shocks.',
    deliverables: '1. Mathematical formulation of the spread model.\n2. Risk-management execution rules (Stop-loss, Float depletion threshold).\n3. Net Alpha & P&L simulation on historical trade books.',
    resources: 'https://pes.edu/arth-mantra/resources/ps-track-1.pdf'
  },
  {
    track: 'ESG & Clean Energy Finance',
    title: 'Renewable Energy Infrastructure Yield Arbitrage & Green Bond Structuring',
    description: 'Structure a diversified debt-equity hybrid asset financing package for large-scale solar/wind grids. Address regulatory yield compression, carbon offset credits, and volatile interest rate conditions.',
    deliverables: '1. Project IRR & sensitivity analysis under 3 tariff scenarios.\n2. Green Bond coupon structuring & credit enhancement strategy.\n3. Institutional investor pitch deck.',
    resources: 'https://pes.edu/arth-mantra/resources/ps-track-2.pdf'
  },
  {
    track: 'Defense & Aerospace Valuation',
    title: 'Deep-Tech Defense Supply-Chain Capitalization & Sovereign Procurement M&A',
    description: 'Perform a comprehensive DCF and multiples valuation for a dual-use autonomous aerospace vendor undergoing a hostile cross-border buyout amid export control restrictions.',
    deliverables: '1. 5-year discounted cash flow model with WACC breakdown.\n2. Synergies & supply-chain vulnerability matrix.\n3. Board recommendation memorandum.',
    resources: 'https://pes.edu/arth-mantra/resources/ps-track-3.pdf'
  },
  {
    track: 'Fintech & WealthTech Architecture',
    title: 'Autonomous Portfolio Rebalancing Engine for Multi-Asset Retail Liquidity',
    description: 'Build an autonomous algorithmic robo-advisory rebalancing framework that continuously optimizes capital between volatile equity instruments and liquid treasury cash reserves under slippage constraints.',
    deliverables: '1. Portfolio allocation algorithm & Sharpe ratio optimizer.\n2. Slippage & transaction cost mitigation protocol.\n3. Technical architecture diagram.',
    resources: 'https://pes.edu/arth-mantra/resources/ps-track-4.pdf'
  },
  {
    track: 'Sovereign Debt & Macro Trading',
    title: 'Emerging Market Currency Peg Defense & Liquidity Crisis Simulation',
    description: 'Act as the strategic advisors to a central reserve bank facing currency speculation and foreign exchange reserve depletion. Devise monetary market interventions and treasury auction rules.',
    deliverables: '1. FX reserve depletion timeline & stress test.\n2. Emergency liquidity injection & auction yield strategy.\n3. Policy briefing note for the Finance Ministry.',
    resources: 'https://pes.edu/arth-mantra/resources/ps-track-5.pdf'
  }
]

function getAdminLeaderName(reg: any): string {
  if (!reg) return 'Team Leader'
  if (reg.leader_name && typeof reg.leader_name === 'string' && reg.leader_name.trim()) {
    return reg.leader_name.trim()
  }
  let mems: any[] = []
  try {
    mems = Array.isArray(reg.members)
      ? reg.members
      : (typeof reg.members === 'string' ? JSON.parse(reg.members) : [])
  } catch {
    mems = []
  }
  if (Array.isArray(mems) && mems.length > 0) {
    if (reg.leader_email) {
      const match = mems.find(
        (m: any) => m?.email && m.email.trim().toLowerCase() === reg.leader_email.trim().toLowerCase()
      )
      if (match?.name && typeof match.name === 'string' && match.name.trim()) return match.name.trim()
    }
    if (mems[0]?.name && typeof mems[0].name === 'string' && mems[0].name.trim()) return mems[0].name.trim()
  }
  if (reg.leader_email && typeof reg.leader_email === 'string') {
    const raw = reg.leader_email.split('@')[0].replace(/[._0-9]/g, ' ').trim()
    if (raw) {
      return raw
        .split(' ')
        .filter(Boolean)
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
    }
  }
  return 'Team Leader'
}

export default function AdminDashboardPage() {
  const { user, isAdmin, isDev, isMarketAdmin, loading: authLoading } = useAuth()
  const { showToast } = useToast()

  const isSuperAdmin = Boolean(
    isDev ||
    (user && (user.role === 'superadmin' || user.email?.toLowerCase() === 'artharambachalil@gmail.com'))
  )

  const [activeTab, setActiveTab] = useState<'registrations' | 'members' | 'scores' | 'stock_market' | 'hackathons' | 'admins'>('registrations')
  const [registrations, setRegistrations] = useState<TeamRegistration[]>([])

  // Dedicated Members Tab Filter & Sort States
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [memberStatusFilter, setMemberStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all')
  const [memberRoleFilter, setMemberRoleFilter] = useState<'all' | 'leader' | 'member'>('all')
  const [memberResidenceFilter, setMemberResidenceFilter] = useState<string>('all')
  const [memberDeptFilter, setMemberDeptFilter] = useState<string>('all')
  const [memberSemFilter, setMemberSemFilter] = useState<string>('all')
  const [memberSecFilter, setMemberSecFilter] = useState<string>('all')
  const [memberSortBy, setMemberSortBy] = useState<'name_asc' | 'team_asc' | 'srn_asc' | 'date_desc'>('name_asc')
  const [adminsList, setAdminsList] = useState<AdminUser[]>([])
  const [hackathonsList, setHackathonsList] = useState<Hackathon[]>([])
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([])
  const [selectedHackathonFilter, setSelectedHackathonFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'dept_asc' | 'sem_asc' | 'sec_asc'>('date_desc')
  const [regDeptFilter, setRegDeptFilter] = useState<string>('all')
  const [regSemFilter, setRegSemFilter] = useState<string>('all')
  const [regSecFilter, setRegSecFilter] = useState<string>('all')
  const [regResidenceFilter, setRegResidenceFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [profileSortBy, setProfileSortBy] = useState<'name_asc' | 'date_desc' | 'dept_asc' | 'sem_asc' | 'sec_asc'>('name_asc')
  const [profileDeptFilter, setProfileDeptFilter] = useState<string>('all')
  const [profileSemFilter, setProfileSemFilter] = useState<string>('all')
  const [profileSecFilter, setProfileSecFilter] = useState<string>('all')
  const [profileResidenceFilter, setProfileResidenceFilter] = useState<string>('all')
  const [selectedUserToPromote, setSelectedUserToPromote] = useState<string>('')
  const [isPromoting, setIsPromoting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [dataLoading, setDataLoading] = useState(true)

  const [stockMarketState, setStockMarketState] = useState<{ 
    status: string; 
    remaining_secs: number; 
    round_duration_secs?: number;
    round_name?: string;
    credentials_released?: boolean | number;
    scheduled_open_at?: number | null;
    scheduled_close_at?: number | null;
  } | null>(null)
  const [stockSyncMsg, setStockSyncMsg] = useState<string | null>(null)

  const fetchStockMarketState = async () => {
    try {
      const res = await fetch(`${STOCK_MARKET_URL}/api/market/state`, { cache: 'no-store' })
      const data = await res.json()
      if (data.state) {
        setStockMarketState(data.state)
        return
      }
    } catch {
      // offline or disconnected
    }

    // Fallback from active hackathon
    try {
      const active = await LocalDB.getActiveHackathon()
      if (active) {
        setStockMarketState(prev => ({
          status: prev?.status || 'STANDBY',
          round_duration_secs: prev?.round_duration_secs || 3600,
          remaining_secs: prev?.remaining_secs || 0,
          credentials_released: active.credentials_released ? 1 : 0
        }))
      }
    } catch {}
  }

  const handleToggleCredentials = async (released: boolean) => {
    try {
      // 1. Immediately persist to database so teams immediately get access
      const active = hackathonsList.find(h => h.is_active) || (await LocalDB.getActiveHackathon())
      if (active) {
        await LocalDB.setCredentialsReleased(active.id, released)
      }

      // Optimistic local state update
      setStockMarketState(prev => prev ? { ...prev, credentials_released: released ? 1 : 0 } : {
        status: 'STANDBY',
        round_duration_secs: 3600,
        remaining_secs: 0,
        credentials_released: released ? 1 : 0
      })
      const msg = released ? 'Credentials revealed to all approved teams!' : 'Credentials hidden from teams.'
      setStockSyncMsg(msg)
      showToast(msg, released ? 'success' : 'info')
      setTimeout(() => setStockSyncMsg(null), 4000)

      // 2. Automatically sync approved teams if releasing
      if (released) {
        handleSyncTeamsToStockMarket().catch(() => {})
      }

      const portalSyncKey = process.env.NEXT_PUBLIC_PORTAL_SYNC_SECRET || 'ArthAdmin2026!'
      // 3. Notify stock market server
      const res = await fetch(`${STOCK_MARKET_URL}/api/portal/toggle-credentials`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-secret': portalSyncKey
        },
        body: JSON.stringify({ released, adminSecret: portalSyncKey })
      })
      const data = await res.json()
      if (data.success && data.state) {
        setStockMarketState(data.state)
      }
    } catch (err: any) {
      // Database is already updated, warn gracefully
      console.warn('Stock Market server relay notice:', err.message)
    }
  }

  const handleTogglePSRelease = async (released: boolean) => {
    try {
      const active = hackathonsList.find(h => h.is_active) || (await LocalDB.getActiveHackathon())
      if (!active) {
        showToast('No active hackathon found to update.', 'warning')
        return
      }
      await LocalDB.setPSReleased(active.id, released)
      setHackathonsList(prev => prev.map(h => h.id === active.id ? { ...h, ps_released: released } : h))
      const msg = released ? 'All Problem Statements revealed to approved teams!' : 'Problem Statements are now concealed from teams.'
      showToast(msg, released ? 'success' : 'info')
      await loadData(true)
    } catch (err: any) {
      showToast('Failed to toggle problem statements: ' + err.message, 'error')
    }
  }

  const handleToggleAuctionRelease = async (released: boolean) => {
    try {
      const active = hackathonsList.find(h => h.is_active) || (await LocalDB.getActiveHackathon())
      if (!active) {
        showToast('No active hackathon found to update.', 'warning')
        return
      }
      await LocalDB.setAuctionReleased(active.id, released)
      setHackathonsList(prev => prev.map(h => h.id === active.id ? { ...h, auction_released: released } : h))
      const msg = released ? 'Round 4 Auction Sheet revealed to all approved teams!' : 'Auction Sheet is now concealed from teams.'
      showToast(msg, released ? 'success' : 'info')
      await loadData(true)
    } catch (err: any) {
      showToast('Failed to toggle auction sheet: ' + err.message, 'error')
    }
  }

  const handleUploadAuctionFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingAuction(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      setAuctionFileUrl(data.url)
      setAuctionFileName(file.name)
      setAuctionFileSize(file.size)
      showToast('Auction file uploaded to cloud storage!', 'success')
    } catch (err: any) {
      showToast('Error uploading auction sheet: ' + err.message, 'error')
    } finally {
      setIsUploadingAuction(false)
    }
  }

  const handleSaveAuctionSheet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auctionFileUrl || !auctionFileName) {
      showToast('Please upload an auction list file first.', 'warning')
      return
    }
    setIsSubmittingAuction(true)
    try {
      const active = hackathonsList.find(h => h.is_active) || (await LocalDB.getActiveHackathon())
      if (!active) {
        showToast('No active hackathon found.', 'warning')
        return
      }
      const sheet: AuctionSheet = {
        file_url: auctionFileUrl,
        file_name: auctionFileName,
        file_size: auctionFileSize,
        uploaded_at: new Date().toISOString(),
        notes: auctionNotes.trim() || undefined
      }
      await LocalDB.setAuctionSheet(active.id, sheet)
      setHackathonsList(prev => prev.map(h => h.id === active.id ? { ...h, auction_sheet: sheet } : h))
      showToast(`Master Auction Sheet "${auctionFileName}" successfully assigned to all teams!`, 'success')
      setIsAuctionModalOpen(false)
      await loadData(true)
    } catch (err: any) {
      showToast('Error saving auction sheet: ' + err.message, 'error')
    } finally {
      setIsSubmittingAuction(false)
    }
  }

  const handleRemoveAuctionSheet = async () => {
    if (!confirm('Are you sure you want to remove the master auction sheet?')) return
    try {
      const active = hackathonsList.find(h => h.is_active) || (await LocalDB.getActiveHackathon())
      if (!active) return
      await LocalDB.setAuctionSheet(active.id, null)
      setHackathonsList(prev => prev.map(h => h.id === active.id ? { ...h, auction_sheet: undefined } : h))
      showToast('Master auction sheet removed.', 'info')
      setIsAuctionModalOpen(false)
      await loadData(true)
    } catch (err: any) {
      showToast('Error removing auction sheet: ' + err.message, 'error')
    }
  }

  const handleToggleDatasheetRelease = async (released: boolean) => {
    try {
      const active = hackathonsList.find(h => h.is_active) || (await LocalDB.getActiveHackathon())
      if (!active) {
        showToast('No active hackathon found to update.', 'warning')
        return
      }
      await LocalDB.setDatasheetsReleased(active.id, released)
      setHackathonsList(prev => prev.map(h => h.id === active.id ? { ...h, datasheets_released: released } : h))
      const msg = released ? 'All Datasheets revealed to approved teams!' : 'Datasheets are now concealed from teams.'
      showToast(msg, released ? 'success' : 'info')
      await loadData(true)
    } catch (err: any) {
      showToast('Failed to toggle datasheets: ' + err.message, 'error')
    }
  }

  const handleSyncTeamsToStockMarket = async () => {
    try {
      const approved = registrations.filter(r => r.status === 'approved')
      if (approved.length === 0) {
        alert('No approved teams found to sync yet. Approve teams first.')
        return
      }

      const teamsPayload = approved.map((r) => {
        const mems = Array.isArray(r.members) ? r.members : []
        const lMem = mems.find(m => m?.email && r.leader_email && m.email.trim().toLowerCase() === r.leader_email.trim().toLowerCase()) || mems[0]
        const leaderName = lMem?.name?.trim() || (r.leader_email ? r.leader_email.split('@')[0] : 'Leader')
        return {
          id: r.id,
          team_code: `ARTH-${r.id.slice(-4).toUpperCase()}`,
          team_name: r.team_name,
          password: getTeamTraderPin(r),
          leader_name: leaderName,
          leader_email: r.leader_email
        }
      })

      const portalSyncKey = process.env.NEXT_PUBLIC_PORTAL_SYNC_SECRET || 'ArthAdmin2026!'
      const res = await fetch(`${STOCK_MARKET_URL}/api/portal/sync-teams`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-secret': portalSyncKey
        },
        body: JSON.stringify({ teams: teamsPayload, adminSecret: portalSyncKey })
      })
      const data = await res.json()
      if (data.success) {
        setStockSyncMsg(`Successfully synced ${data.syncedCount} approved teams to Stock Market Platform!`)
        setTimeout(() => setStockSyncMsg(null), 4000)
      } else {
        alert('Sync rejected: ' + (data.error || 'Unknown error'))
      }
    } catch (err: any) {
      alert('Failed to sync teams. Make sure Stock Market server is running: ' + err.message)
    }
  }

  // Modals & expansions
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null)
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [rejectingReg, setRejectingReg] = useState<TeamRegistration | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmittingReject, setIsSubmittingReject] = useState(false)

  // Scoring Modal State - 6 Rounds
  const [scoringTeam, setScoringTeam] = useState<TeamRegistration | null>(null)
  const [scoreR1, setScoreR1] = useState<number>(0)
  const [scoreR2, setScoreR2] = useState<number>(0)
  const [scoreR3, setScoreR3] = useState<number>(0)
  const [scoreR4, setScoreR4] = useState<number>(0)
  const [scoreR5, setScoreR5] = useState<number>(0)
  const [scoreR6, setScoreR6] = useState<number>(0)

  // Evaluation Bonus State
  const [icStarting, setIcStarting] = useState<number>(10000)
  const [icStockTrades, setIcStockTrades] = useState<number>(0)
  const [icAuctionSpent, setIcAuctionSpent] = useState<number>(0)
  const [icR5Wager, setIcR5Wager] = useState<number>(0)
  const [icR5Result, setIcR5Result] = useState<'won' | 'lost' | 'none'>('none')
  const [browniePoints, setBrowniePoints] = useState<number>(0)

  const [scoreTotal, setScoreTotal] = useState<number>(0)
  const [scoreNotes, setScoreNotes] = useState<string>('')
  const [isSubmittingScore, setIsSubmittingScore] = useState(false)

  // Problem Statement Modal State
  const [psModalTeam, setPsModalTeam] = useState<TeamRegistration | null>(null)
  const [psTitle, setPsTitle] = useState('')
  const [psTrack, setPsTrack] = useState('')
  const [psDescription, setPsDescription] = useState('')
  const [psDeliverables, setPsDeliverables] = useState('')
  const [psResources, setPsResources] = useState('')
  const [psPdfUrl, setPsPdfUrl] = useState('')
  const [psPdfName, setPsPdfName] = useState('')
  const [psPdfUploading, setPsPdfUploading] = useState(false)
  const [isSubmittingPS, setIsSubmittingPS] = useState(false)

  // Auction Sheet State
  const [isAuctionModalOpen, setIsAuctionModalOpen] = useState(false)
  const [auctionFileUrl, setAuctionFileUrl] = useState('')
  const [auctionFileName, setAuctionFileName] = useState('')
  const [auctionFileSize, setAuctionFileSize] = useState<number | undefined>(undefined)
  const [auctionNotes, setAuctionNotes] = useState('')
  const [isUploadingAuction, setIsUploadingAuction] = useState(false)
  const [isSubmittingAuction, setIsSubmittingAuction] = useState(false)

  // Datasheet Modal State
  const [datasheetModalTeam, setDatasheetModalTeam] = useState<TeamRegistration | null>(null)
  const [datasheetFileUrl, setDatasheetFileUrl] = useState('')
  const [datasheetFileName, setDatasheetFileName] = useState('')
  const [datasheetNotes, setDatasheetNotes] = useState('')
  const [datasheetUploading, setDatasheetUploading] = useState(false)
  const [isSubmittingDatasheet, setIsSubmittingDatasheet] = useState(false)

  // Hackathon Form State
  const [isEditingHackathon, setIsEditingHackathon] = useState(false)
  const [editingHackathonId, setEditingHackathonId] = useState<string | null>(null)
  const [hackName, setHackName] = useState('')
  const [hackDate, setHackDate] = useState('')
  const [hackFee, setHackFee] = useState<number>(500)
  const [hackMaxTeams, setHackMaxTeams] = useState<number>(50)
  const [hackDescription, setHackDescription] = useState('')
  const [hackPosterUrl, setHackPosterUrl] = useState('')
  const [hackPosterFile, setHackPosterFile] = useState<File | null>(null)
  const [hackWhatsappLink, setHackWhatsappLink] = useState('')
  const [hackIsActive, setHackIsActive] = useState(true)
  const [hackShowRegisteredTeams, setHackShowRegisteredTeams] = useState(true)
  const [hackRegDeadline, setHackRegDeadline] = useState('')
  const [expandedHackathonTeamsId, setExpandedHackathonTeamsId] = useState<string | null>(null)
  const [isSubmittingHackathon, setIsSubmittingHackathon] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  // Add Admin state
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminRole, setNewAdminRole] = useState<UserRole>('admin')
  const [createdAdminResult, setCreatedAdminResult] = useState<{ admin: AdminUser; temporaryPassword: string } | null>(null)
  const [copiedCreds, setCopiedCreds] = useState(false)

  // User Password Reset State
  const [resetModalUser, setResetModalUser] = useState<{ email: string; name: string } | null>(null)
  const [customPasswordInput, setCustomPasswordInput] = useState('')
  const [showCustomPassword, setShowCustomPassword] = useState(false)
  const [resetPassResult, setResetPassResult] = useState<{ email: string; name: string; temporaryPassword: string } | null>(null)
  const [isResettingUserPass, setIsResettingUserPass] = useState(false)
  const [copiedResetPass, setCopiedResetPass] = useState(false)

  // Database Restore & Redundancy State
  const [showPortalRestoreModal, setShowPortalRestoreModal] = useState(false)
  const [isRestoringPortal, setIsRestoringPortal] = useState(false)
  const [portalRestoreFile, setPortalRestoreFile] = useState<File | null>(null)
  const [portalRestoreError, setPortalRestoreError] = useState<string | null>(null)

  // Direct Role Change State
  const [directChangeEmail, setDirectChangeEmail] = useState('')
  const [directChangeRole, setDirectChangeRole] = useState<UserRole>('admin')
  const [isChangingRole, setIsChangingRole] = useState(false)
  const [isLiveSyncing, setIsLiveSyncing] = useState(false)

  const loadData = async (isBackground: boolean = false) => {
    if (!isBackground) setDataLoading(true)
    setIsLiveSyncing(true)
    try {
      const [regs, admins, hacks, profiles] = await Promise.all([
        LocalDB.getRegistrationsAsync(),
        LocalDB.getAdminsAsync(),
        LocalDB.getHackathonsAsync(),
        LocalDB.getAllProfilesAsync()
      ])
      setRegistrations(regs)
      setAdminsList(admins)
      setHackathonsList(hacks)
      setAllProfiles(profiles)
      fetchStockMarketState().catch(() => {})
    } finally {
      if (!isBackground) setDataLoading(false)
      setIsLiveSyncing(false)
    }
  }

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadData(false)
      fetchStockMarketState().catch(() => {})
      const interval = setInterval(() => {
        loadData(true)
        fetchStockMarketState().catch(() => {})
      }, 15000)
      return () => clearInterval(interval)
    }
  }, [isAdmin, authLoading])

  // Check URL parameter for editing hackathon
  useEffect(() => {
    if (typeof window !== 'undefined' && hackathonsList.length > 0) {
      const params = new URLSearchParams(window.location.search)
      const editId = params.get('edit')
      if (editId) {
        const target = hackathonsList.find(h => h.id === editId)
        if (target) {
          handleEditHackathon(target)
        }
      }
    }
  }, [hackathonsList])

  // Filtered profiles for Dev user management
  const filteredProfiles = allProfiles
    .filter(p => {
      const q = userSearchQuery.toLowerCase().trim()
      const matchesSearch = !q || (
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        (p.srn && p.srn.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.department && p.department.toLowerCase().includes(q)) ||
        (p.semester && p.semester.includes(q)) ||
        (p.section && p.section.toLowerCase().includes(q)) ||
        (p.residence_type && p.residence_type.toLowerCase().includes(q))
      )
      const matchesDept = profileDeptFilter === 'all' || p.department === profileDeptFilter
      const matchesSem = profileSemFilter === 'all' || p.semester === profileSemFilter
      const matchesSec = profileSecFilter === 'all' || p.section === profileSecFilter
      const matchesResidence = profileResidenceFilter === 'all' || (p.residence_type || 'Non-Hostelite') === profileResidenceFilter
      return matchesSearch && matchesDept && matchesSem && matchesSec && matchesResidence
    })
    .sort((a, b) => {
      if (profileSortBy === 'dept_asc') {
        return (a.department || '').localeCompare(b.department || '')
      }
      if (profileSortBy === 'sem_asc') {
        return (a.semester || '').localeCompare(b.semester || '')
      }
      if (profileSortBy === 'sec_asc') {
        return (a.section || '').localeCompare(b.section || '')
      }
      if (profileSortBy === 'date_desc') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      return (a.full_name || '').localeCompare(b.full_name || '')
    })

  const activeHackathon = hackathonsList.find(h => h.is_active) || hackathonsList[0] || null

  // Scoped registrations
  const relevantRegistrations = selectedHackathonFilter === 'all'
    ? registrations
    : registrations.filter(r => r.hackathon_id === selectedHackathonFilter)

  const totalTeams = relevantRegistrations.length
  const approvedTeams = relevantRegistrations.filter(r => r.status === 'approved').length
  const pendingTeams = relevantRegistrations.filter(r => r.status === 'pending').length
  const rejectedTeams = relevantRegistrations.filter(r => r.status === 'rejected').length

  // Filtered & Sorted Registrations
  const filteredRegistrations = relevantRegistrations
    .filter(reg => {
      const matchesStatus = statusFilter === 'all' || reg.status === statusFilter
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        reg.team_name.toLowerCase().includes(q) ||
        reg.leader_email.toLowerCase().includes(q) ||
        (reg.utr_reference && reg.utr_reference.toLowerCase().includes(q)) ||
        reg.members.some(m =>
          m.name.toLowerCase().includes(q) ||
          m.srn.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          (m.department && m.department.toLowerCase().includes(q)) ||
          (m.semester && m.semester.includes(q)) ||
          (m.section && m.section.toLowerCase().includes(q)) ||
          (m.residence_type && m.residence_type.toLowerCase().includes(q))
        )

      const matchesDept = regDeptFilter === 'all' || reg.members.some(m => m.department === regDeptFilter)
      const matchesSem = regSemFilter === 'all' || reg.members.some(m => m.semester === regSemFilter)
      const matchesSec = regSecFilter === 'all' || reg.members.some(m => m.section === regSecFilter)
      const matchesResidence = regResidenceFilter === 'all' || reg.members.some(m => (m.residence_type || 'Non-Hostelite') === regResidenceFilter)

      return matchesStatus && matchesSearch && matchesDept && matchesSem && matchesSec && matchesResidence
    })
    .sort((a, b) => {
      if (sortBy === 'name_asc') {
        return a.team_name.localeCompare(b.team_name)
      }
      if (sortBy === 'date_asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      if (sortBy === 'dept_asc') {
        const deptA = a.members.find(m => m.department)?.department || ''
        const deptB = b.members.find(m => m.department)?.department || ''
        return deptA.localeCompare(deptB)
      }
      if (sortBy === 'sem_asc') {
        const semA = a.members.find(m => m.semester)?.semester || ''
        const semB = b.members.find(m => m.semester)?.semester || ''
        return semA.localeCompare(semB)
      }
      if (sortBy === 'sec_asc') {
        const secA = a.members.find(m => m.section)?.section || ''
        const secB = b.members.find(m => m.section)?.section || ''
        return secA.localeCompare(secB)
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  // Approved teams ranked by score for the Score Tracker
  const rankedApprovedTeams = [...relevantRegistrations.filter(r => r.status === 'approved')]
    .sort((a, b) => (b.score || 0) - (a.score || 0))

  // Flattened Members List across all relevant registrations
  const allMembersList = React.useMemo(() => {
    const list: Array<{
      id: string;
      team_id: string;
      team_name: string;
      leader_email: string;
      member_role: string;
      is_leader: boolean;
      name: string;
      srn: string;
      phone: string;
      email: string;
      department?: string;
      semester?: string;
      section?: string;
      residence_type?: string;
      status: string;
      registered_at: string;
      hackathon_name: string;
    }> = []

    relevantRegistrations.forEach(reg => {
      (reg.members || []).forEach((m, idx) => {
        const isLeader = idx === 0 || m.email?.toLowerCase() === reg.leader_email?.toLowerCase()
        list.push({
          id: `${reg.id}-mem-${idx}`,
          team_id: reg.id,
          team_name: reg.team_name,
          leader_email: reg.leader_email,
          member_role: isLeader ? 'Team Leader' : 'Team Member',
          is_leader: isLeader,
          name: m.name || 'Unnamed',
          srn: m.srn || 'N/A',
          phone: m.phone || 'N/A',
          email: m.email || 'N/A',
          department: m.department || 'N/A',
          semester: m.semester || 'N/A',
          section: m.section || 'N/A',
          residence_type: m.residence_type || 'Non-Hostelite',
          status: reg.status,
          registered_at: reg.created_at,
          hackathon_name: reg.hackathon_name || 'Arth Mantra'
        })
      })
    })

    return list
  }, [relevantRegistrations])

  // Filtered & Sorted Members for the Dedicated Members Tab
  const filteredMembers = React.useMemo(() => {
    return allMembersList.filter(m => {
      // 1. Text Search across name, srn, email, phone, team_name, department
      if (memberSearchQuery.trim()) {
        const q = memberSearchQuery.toLowerCase().trim()
        const matches =
          m.name.toLowerCase().includes(q) ||
          m.srn.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.phone.toLowerCase().includes(q) ||
          m.team_name.toLowerCase().includes(q) ||
          (m.department && m.department.toLowerCase().includes(q))
        if (!matches) return false
      }

      // 2. Status Filter
      if (memberStatusFilter !== 'all' && m.status !== memberStatusFilter) return false

      // 3. Role Filter
      if (memberRoleFilter === 'leader' && !m.is_leader) return false
      if (memberRoleFilter === 'member' && m.is_leader) return false

      // 4. Residence Filter
      if (memberResidenceFilter !== 'all') {
        const target = memberResidenceFilter.toLowerCase()
        const actual = (m.residence_type || 'non-hostelite').toLowerCase()
        if (actual !== target) return false
      }

      // 5. Dept Filter
      if (memberDeptFilter !== 'all' && m.department !== memberDeptFilter) return false

      // 6. Sem Filter
      if (memberSemFilter !== 'all' && String(m.semester) !== String(memberSemFilter)) return false

      // 7. Sec Filter
      if (memberSecFilter !== 'all' && String(m.section).toUpperCase() !== String(memberSecFilter).toUpperCase()) return false

      return true
    }).sort((a, b) => {
      if (memberSortBy === 'name_asc') return a.name.localeCompare(b.name)
      if (memberSortBy === 'team_asc') return a.team_name.localeCompare(b.team_name)
      if (memberSortBy === 'srn_asc') return a.srn.localeCompare(b.srn)
      if (memberSortBy === 'date_desc') return new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime()
      return 0
    })
  }, [allMembersList, memberSearchQuery, memberStatusFilter, memberRoleFilter, memberResidenceFilter, memberDeptFilter, memberSemFilter, memberSecFilter, memberSortBy])

  const handleExportMembersTabExcel = () => {
    if (filteredMembers.length === 0) {
      showToast('No members found matching current filters.', 'warning')
      return
    }
    const filterTag = memberStatusFilter !== 'all' ? `_${memberStatusFilter}` : ''
    const residenceTag = memberResidenceFilter !== 'all' ? `_${memberResidenceFilter.toLowerCase()}` : ''
    exportFilteredMembersToExcel(filteredMembers, `Arth_Mantra_Members${filterTag}${residenceTag}`)
    showToast(`Successfully exported ${filteredMembers.length} members to Excel (.xlsx)!`, 'success')
  }

  // Approval handler
  const handleApprove = async (reg: TeamRegistration) => {
    const reviewer = user?.full_name || 'Admin'
    setRegistrations(prev =>
      prev.map(r => r.id === reg.id ? { ...r, status: 'approved', reviewed_by: reviewer } : r)
    )
    const updated = await LocalDB.updateRegistrationStatus(reg.id, 'approved', undefined, reviewer)
    if (updated) {
      showToast(`Team "${reg.team_name}" approved successfully!`, 'success')
      await loadData(true)
    }
  }

  // Confirm Reject
  const handleConfirmDisapprove = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectingReg) return
    if (!rejectionReason.trim()) {
      showToast('Please enter a rejection reason.', 'warning')
      return
    }

    setIsSubmittingReject(true)
    try {
      const reviewer = user?.full_name || 'Admin'
      const updated = await LocalDB.updateRegistrationStatus(
        rejectingReg.id,
        'rejected',
        rejectionReason.trim(),
        reviewer
      )
      if (updated) {
        setRegistrations(prev =>
          prev.map(r => r.id === rejectingReg.id
            ? { ...r, status: 'rejected', rejection_comment: rejectionReason.trim(), reviewed_by: reviewer }
            : r
          )
        )
        showToast(`Team "${rejectingReg.team_name}" registration rejected.`, 'info')
        setRejectingReg(null)
        setRejectionReason('')
        await loadData(true)
      }
    } finally {
      setIsSubmittingReject(false)
    }
  }

  // Open Score Modal
  const handleOpenScoreModal = (team: TeamRegistration) => {
    setScoringTeam(team)
    const r1 = team.round_1_score || 0
    const r2 = team.round_2_score || 0
    const r3 = team.round_3_score || 0
    const r4 = team.round_4_score || 0
    const r5 = team.round_5_score || 0
    const r6 = team.round_6_score || 0
    setScoreR1(r1)
    setScoreR2(r2)
    setScoreR3(r3)
    setScoreR4(r4)
    setScoreR5(r5)
    setScoreR6(r6)

    const starting = team.ic_starting !== undefined ? team.ic_starting : 10000
    setIcStarting(starting)
    setIcStockTrades(team.ic_stock_trades || 0)
    setIcAuctionSpent(team.ic_auction_spent || 0)
    setIcR5Wager(team.ic_r5_wager || 0)
    setIcR5Result(team.ic_r5_result || 'none')
    setBrowniePoints(team.brownie_points || 0)

    const sumRounds = r1 + r2 + r3 + r4 + r5 + r6
    setScoreTotal(team.score !== undefined ? team.score : sumRounds)
    setScoreNotes(team.judge_notes || '')
  }

  // Save Score
  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scoringTeam) return

    setIsSubmittingScore(true)
    try {
      const updated = await LocalDB.updateTeamScore(scoringTeam.id, {
        score: scoreTotal,
        round_1_score: scoreR1,
        round_2_score: scoreR2,
        round_3_score: scoreR3,
        round_4_score: scoreR4,
        round_5_score: scoreR5,
        round_6_score: scoreR6,
        ic_starting: icStarting,
        ic_stock_trades: icStockTrades,
        ic_auction_spent: icAuctionSpent,
        ic_r5_wager: icR5Wager,
        ic_r5_result: icR5Result,
        brownie_points: browniePoints,
        judge_notes: scoreNotes.trim()
      })

      if (updated) {
        setRegistrations(prev =>
          prev.map(r => r.id === scoringTeam.id ? { ...r, ...updated } : r)
        )
        showToast(`Scores updated for team "${scoringTeam.team_name}"!`, 'success')
        setScoringTeam(null)
        await loadData(true)
      }
    } catch (err: any) {
      showToast(err?.message || 'Error updating scores', 'error')
    } finally {
      setIsSubmittingScore(false)
    }
  }

  // Open Problem Statement Modal
  const handleOpenPSModal = (team: TeamRegistration) => {
    setPsModalTeam(team)
    if (team.assigned_problem_statement) {
      setPsPdfUrl(team.assigned_problem_statement.pdf_url || '')
      setPsPdfName(team.assigned_problem_statement.pdf_name || '')
    } else {
      setPsPdfUrl('')
      setPsPdfName('')
    }
  }

  const handleSelectPSPreset = (idx: number) => {
    if (idx >= 0 && idx < ARTH_MANTRA_PS_PRESETS.length) {
      const p = ARTH_MANTRA_PS_PRESETS[idx]
      setPsTitle(p.title)
      setPsTrack(p.track)
      setPsDescription(p.description)
      setPsDeliverables(p.deliverables || '')
      setPsResources(p.resources || '')
    }
  }

  const handleUploadPSFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPsPdfUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (psPdfUrl) {
        formData.append('oldUrl', psPdfUrl)
      }
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.url) {
        setPsPdfUrl(data.url)
        setPsPdfName(file.name)
        showToast(`Uploaded PDF: ${file.name}`, 'success')
      } else {
        showToast(data.error || 'Failed to upload PDF', 'error')
      }
    } catch (err: any) {
      showToast('Error uploading PDF: ' + err.message, 'error')
    } finally {
      setPsPdfUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleSavePS = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!psModalTeam) return
    if (!psPdfUrl) {
      showToast('Please upload a Problem Statement PDF first.', 'warning')
      return
    }

    setIsSubmittingPS(true)
    try {
      const psPayload: ProblemStatement = {
        title: psPdfName || 'Official Problem Statement Briefing',
        track: 'Problem Statement Track',
        description: 'Official Problem Statement document assigned exclusively to your squad. Download the attached PDF briefing below to review your case.',
        pdf_url: psPdfUrl.trim(),
        pdf_name: psPdfName.trim() || 'Problem_Statement.pdf',
        assigned_at: new Date().toISOString()
      }

      const updated = await LocalDB.updateTeamProblemStatement(psModalTeam.id, psPayload)
      if (updated) {
        setRegistrations(prev =>
          prev.map(r => r.id === psModalTeam.id ? { ...r, assigned_problem_statement: psPayload } : r)
        )
      }
      showToast(`Problem Statement PDF assigned to "${psModalTeam.team_name}"!`, 'success')
      setPsModalTeam(null)
      await loadData(true)
    } catch (err: any) {
      showToast('Failed to save problem statement: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setIsSubmittingPS(false)
    }
  }

  const handleRemovePS = async () => {
    if (!psModalTeam) return
    if (!confirm(`Are you sure you want to remove the assigned problem statement from "${psModalTeam.team_name}"?`)) {
      return
    }

    setIsSubmittingPS(true)
    try {
      await LocalDB.updateTeamProblemStatement(psModalTeam.id, null)
      setRegistrations(prev =>
        prev.map(r => r.id === psModalTeam.id ? { ...r, assigned_problem_statement: undefined } : r)
      )
      showToast(`Problem Statement removed from "${psModalTeam.team_name}".`, 'info')
      setPsModalTeam(null)
      await loadData(true)
    } catch (err: any) {
      showToast('Failed to remove problem statement: ' + err.message, 'error')
    } finally {
      setIsSubmittingPS(false)
    }
  }

  // Open Datasheet Modal
  const handleOpenDatasheetModal = (team: TeamRegistration) => {
    setDatasheetModalTeam(team)
    if (team.assigned_datasheet) {
      setDatasheetFileUrl(team.assigned_datasheet.file_url || '')
      setDatasheetFileName(team.assigned_datasheet.file_name || '')
      setDatasheetNotes(team.assigned_datasheet.notes || '')
    } else {
      setDatasheetFileUrl('')
      setDatasheetFileName('')
      setDatasheetNotes('')
    }
  }

  const handleUploadDatasheetFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setDatasheetUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (datasheetFileUrl) {
        formData.append('oldUrl', datasheetFileUrl)
      }
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.url) {
        setDatasheetFileUrl(data.url)
        setDatasheetFileName(file.name)
        showToast(`Uploaded Datasheet: ${file.name}`, 'success')
      } else {
        showToast(data.error || 'Failed to upload spreadsheet', 'error')
      }
    } catch (err: any) {
      showToast('Error uploading spreadsheet: ' + err.message, 'error')
    } finally {
      setDatasheetUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleSaveDatasheet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!datasheetModalTeam) return
    if (!datasheetFileUrl) {
      showToast('Please upload an Excel / spreadsheet file first.', 'warning')
      return
    }

    setIsSubmittingDatasheet(true)
    try {
      const sheetPayload: TeamDatasheet = {
        file_url: datasheetFileUrl,
        file_name: datasheetFileName || 'Team_Datasheet.xlsx',
        notes: datasheetNotes.trim() || undefined,
        assigned_at: new Date().toISOString()
      }

      const updated = await LocalDB.updateTeamDatasheet(datasheetModalTeam.id, sheetPayload)
      if (updated) {
        setRegistrations(prev =>
          prev.map(r => r.id === datasheetModalTeam.id ? { ...r, assigned_datasheet: sheetPayload } : r)
        )
      }
      showToast(`Datasheet assigned to "${datasheetModalTeam.team_name}"!`, 'success')
      setDatasheetModalTeam(null)
      await loadData(true)
    } catch (err: any) {
      showToast('Failed to save datasheet: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setIsSubmittingDatasheet(false)
    }
  }

  const handleRemoveDatasheet = async () => {
    if (!datasheetModalTeam) return
    if (!confirm(`Are you sure you want to remove the assigned datasheet from "${datasheetModalTeam.team_name}"?`)) {
      return
    }

    setIsSubmittingDatasheet(true)
    try {
      await LocalDB.updateTeamDatasheet(datasheetModalTeam.id, null)
      setRegistrations(prev =>
        prev.map(r => r.id === datasheetModalTeam.id ? { ...r, assigned_datasheet: undefined } : r)
      )
      showToast(`Datasheet removed from "${datasheetModalTeam.team_name}".`, 'info')
      setDatasheetModalTeam(null)
      await loadData(true)
    } catch (err: any) {
      showToast('Failed to remove datasheet: ' + err.message, 'error')
    } finally {
      setIsSubmittingDatasheet(false)
    }
  }

  // Delete registration
  const handleDeleteRegistration = async (reg: TeamRegistration) => {
    if (!isSuperAdmin) {
      showToast('Only Super Administrators can delete team records.', 'error')
      return
    }
    if (!confirm(`Delete registration for "${reg.team_name}"?\nThis cannot be undone.`)) return

    setRegistrations(prev => prev.filter(r => r.id !== reg.id))
    showToast(`Deleted registration for "${reg.team_name}".`, 'info')
    try {
      await LocalDB.deleteRegistration(reg.id)
      setTimeout(() => loadData(true), 1000)
    } catch (err: any) {
      showToast(err?.message || 'Error deleting registration', 'error')
      setRegistrations(prev => [reg, ...prev])
    }
  }

  // Export Excel
  const handleExportExcel = (type: 'all' | 'approved' | 'rejected') => {
    let toExport = filteredRegistrations
    if (type === 'approved') toExport = filteredRegistrations.filter(r => r.status === 'approved')
    if (type === 'rejected') toExport = filteredRegistrations.filter(r => r.status === 'rejected')

    if (toExport.length === 0) {
      showToast('No matching team registrations to export.', 'warning')
      return
    }

    exportRegistrationsToExcel(toExport, `Arth_Mantra_Teams_${type.toUpperCase()}`)
    showToast(`Exported ${toExport.length} teams to Excel!`, 'success')
  }

  // Export Filtered Individual Members to Excel
  const handleExportFilteredMembersExcel = () => {
    const list: Array<{
      team_name: string
      leader_email: string
      member_role: string
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
    }> = []

    filteredRegistrations.forEach(reg => {
      reg.members.forEach((m, idx) => {
        const memResidence = m.residence_type || 'Non-Hostelite'
        if (regResidenceFilter !== 'all' && memResidence !== regResidenceFilter) {
          return
        }
        if (regDeptFilter !== 'all' && m.department !== regDeptFilter) {
          return
        }
        if (regSemFilter !== 'all' && m.semester !== regSemFilter) {
          return
        }
        if (regSecFilter !== 'all' && m.section !== regSecFilter) {
          return
        }
        list.push({
          team_name: reg.team_name,
          leader_email: reg.leader_email,
          member_role: idx === 0 ? 'Leader' : 'Member',
          name: m.name,
          srn: m.srn,
          phone: m.phone,
          email: m.email,
          department: m.department,
          semester: m.semester,
          section: m.section,
          residence_type: memResidence,
          status: reg.status,
          registered_at: reg.created_at
        })
      })
    })

    if (list.length === 0) {
      showToast('No members found matching current filters.', 'warning')
      return
    }

    const tag = regResidenceFilter !== 'all' ? `_${regResidenceFilter.toLowerCase()}` : ''
    exportFilteredMembersToExcel(list, `arth_mantra_members${tag}`)
    showToast(`Exported ${list.length} filtered members to Excel!`, 'success')
  }

  // Export Registered Profiles to Excel
  const handleExportProfilesExcel = () => {
    if (filteredProfiles.length === 0) {
      showToast('No user accounts found matching current filters.', 'warning')
      return
    }
    const tag = profileResidenceFilter !== 'all' ? `_${profileResidenceFilter.toLowerCase()}` : ''
    exportProfilesToExcel(filteredProfiles, `arth_mantra_accounts${tag}`)
    showToast(`Exported ${filteredProfiles.length} accounts to Excel!`, 'success')
  }

  const handleExportScores = () => {
    exportLeaderboardToExcel(rankedApprovedTeams, 'Arth_Mantra_Scores')
    showToast('Exported leaderboard scores to Excel!', 'success')
  }

  // Save / Update Hackathon
  const handleSaveHackathon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hackName.trim() || !hackDate.trim()) {
      showToast('Hackathon name and date are required.', 'warning')
      return
    }

    setIsSubmittingHackathon(true)
    try {
      let finalPosterUrl = hackPosterUrl.trim()
      if (hackPosterFile) {
        try {
          const formData = new FormData()
          formData.append('file', hackPosterFile)
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          })
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json()
            if (uploadData?.url) {
              finalPosterUrl = uploadData.url
            }
          }
        } catch (uploadErr) {
          console.warn('Poster upload error:', uploadErr)
        }
      }

      const deadlineIso = hackRegDeadline ? new Date(hackRegDeadline).toISOString() : null

      if (isEditingHackathon && editingHackathonId) {
        await LocalDB.updateHackathon(editingHackathonId, {
          name: hackName.trim(),
          date: hackDate.trim(),
          entry_fee: Number(hackFee) || 0,
          max_teams: Number(hackMaxTeams) || 50,
          description: hackDescription.trim(),
          poster_url: finalPosterUrl || undefined,
          whatsapp_link: hackWhatsappLink.trim() || undefined,
          is_active: hackIsActive,
          show_registered_teams: hackShowRegisteredTeams,
          registration_deadline: deadlineIso || undefined
        })
        await LocalDB.updateMarketConfig(editingHackathonId, {
          registration_deadline: deadlineIso
        })
        showToast(`Hackathon "${hackName}" updated!`, 'success')
      } else {
        const created = await LocalDB.addHackathon({
          name: hackName.trim(),
          date: hackDate.trim(),
          entry_fee: Number(hackFee) || 0,
          max_teams: Number(hackMaxTeams) || 50,
          description: hackDescription.trim(),
          poster_url: finalPosterUrl || undefined,
          whatsapp_link: hackWhatsappLink.trim() || undefined,
          is_active: hackIsActive,
          show_registered_teams: hackShowRegisteredTeams,
          registration_deadline: deadlineIso || undefined,
          created_by: user?.email || 'artharambachalil@gmail.com'
        })
        if (created && deadlineIso) {
          await LocalDB.updateMarketConfig(created.id, {
            registration_deadline: deadlineIso
          })
        }
        showToast(`Hackathon "${hackName}" published!`, 'success')
      }

      resetHackathonForm()
      await loadData()
    } catch (err: any) {
      showToast(err?.message || 'Error saving hackathon', 'error')
    } finally {
      setIsSubmittingHackathon(false)
    }
  }

  const resetHackathonForm = () => {
    setIsEditingHackathon(false)
    setEditingHackathonId(null)
    setHackName('')
    setHackDate('')
    setHackFee(500)
    setHackMaxTeams(50)
    setHackDescription('')
    setHackPosterUrl('')
    setHackPosterFile(null)
    setHackWhatsappLink('')
    setHackIsActive(true)
    setHackShowRegisteredTeams(true)
    setHackRegDeadline('')
  }

  const handleQuickFillArthMantra = () => {
    setHackName(PRESET_ARTH_MANTRA.name)
    setHackDate(PRESET_ARTH_MANTRA.date)
    setHackFee(PRESET_ARTH_MANTRA.entry_fee)
    setHackMaxTeams(PRESET_ARTH_MANTRA.max_teams)
    setHackDescription(PRESET_ARTH_MANTRA.description || '')
    setHackPosterUrl(PRESET_ARTH_MANTRA.poster_url || '')
    setHackWhatsappLink(PRESET_ARTH_MANTRA.whatsapp_link || '')
    setHackIsActive(true)
    setHackShowRegisteredTeams(true)
    setHackRegDeadline('')
    showToast('Loaded Arth Mantra details into form. Review and click "Publish Hackathon".', 'info')
  }

  const handlePromoteUser = async (email: string, name?: string) => {
    if (!isAdmin && !isSuperAdmin && !isDev) {
      showToast('Only Administrators can grant Admin privileges.', 'error')
      return
    }
    setIsPromoting(true)
    try {
      const res = await LocalDB.promoteUserToAdmin(email, name, user?.email)
      if (res.success) {
        showToast(res.message || `${email} has been granted Admin privileges!`, 'success')
        await loadData(true)
      } else {
        showToast(res.message || 'Failed to promote user', 'error')
      }
    } catch (e: any) {
      showToast(e?.message || 'Error promoting user', 'error')
    } finally {
      setIsPromoting(false)
    }
  }

  const handleDemoteUser = async (email: string) => {
    if (!isAdmin && !isSuperAdmin && !isDev) {
      showToast('Only Administrators can remove Admin privileges.', 'error')
      return
    }
    if (email.toLowerCase() === 'artharambachalil@gmail.com') {
      showToast('Cannot remove Dev Superadmin.', 'error')
      return
    }
    if (!confirm(`Are you sure you want to remove Admin privileges for ${email}?`)) {
      return
    }
    try {
      const res = await LocalDB.removeAdminAccess(email, user?.email)
      if (res.success) {
        showToast(res.message || `${email} has been demoted to regular participant.`, 'info')
        await loadData(true)
      } else {
        showToast(res.message || 'Failed to remove admin', 'error')
      }
    } catch (e: any) {
      showToast(e?.message || 'Error removing admin', 'error')
    }
  }

  const handleOpenResetModal = (email: string, name?: string) => {
    setResetModalUser({ email, name: name || email })
    setCustomPasswordInput('')
    setShowCustomPassword(false)
  }

  const handleGenerateRandomPass = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let rand = 'Arth'
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    rand += '!' + Math.floor(100 + Math.random() * 900)
    setCustomPasswordInput(rand)
  }

  const handleExecuteCustomPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetModalUser) return
    const pass = customPasswordInput.trim()
    if (!pass || pass.length < 6) {
      showToast('Password must be at least 6 characters long.', 'warning')
      return
    }

    setIsResettingUserPass(true)
    try {
      const res = await LocalDB.adminResetPassword(resetModalUser.email, pass)
      if (res.success) {
        setResetPassResult({
          email: resetModalUser.email,
          name: resetModalUser.name,
          temporaryPassword: pass
        })
        setResetModalUser(null)
        setCustomPasswordInput('')
        setCopiedResetPass(false)
        showToast(`Password successfully updated for ${resetModalUser.email}!`, 'success')
      } else {
        showToast(res.message || 'Failed to update password', 'error')
      }
    } catch (e: any) {
      showToast(e?.message || 'Error updating password', 'error')
    } finally {
      setIsResettingUserPass(false)
    }
  }

  const handleEditHackathon = (hack: Hackathon) => {
    setActiveTab('hackathons')
    setIsEditingHackathon(true)
    setEditingHackathonId(hack.id)
    setHackName(hack.name)
    setHackDate(hack.date)
    setHackFee(hack.entry_fee)
    setHackMaxTeams(hack.max_teams)
    setHackDescription(hack.description || '')
    setHackPosterUrl(hack.poster_url || '')
    setHackPosterFile(null)
    setHackWhatsappLink(hack.whatsapp_link || '')
    setHackIsActive(hack.is_active)
    setHackShowRegisteredTeams(hack.show_registered_teams !== false)
    if (hack.registration_deadline) {
      try {
        const d = new Date(hack.registration_deadline)
        if (!isNaN(d.getTime())) {
          const pad = (n: number) => String(n).padStart(2, '0')
          const localStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
          setHackRegDeadline(localStr)
        } else {
          setHackRegDeadline('')
        }
      } catch {
        setHackRegDeadline('')
      }
    } else {
      setHackRegDeadline('')
    }
    showToast(`Editing "${hack.name}". Update details and save below.`, 'info')
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleDeleteHackathon = async (id: string, name: string) => {
    if (confirm(`Delete hackathon "${name}"? This removes related settings.`)) {
      await LocalDB.deleteHackathon(id)
      await loadData()
      showToast(`Hackathon "${name}" deleted.`, 'info')
    }
  }

  const handleToggleHackActive = async (hack: Hackathon) => {
    const updated = await LocalDB.updateHackathon(hack.id, { is_active: !hack.is_active })
    if (updated) {
      await loadData()
      showToast(`Hackathon status set to ${!hack.is_active ? 'Active (Live)' : 'Draft (Inactive)'}`, 'success')
    }
  }

  const handleToggleRegisteredTeamsVisibility = async (hack: Hackathon) => {
    const current = hack.show_registered_teams !== false
    const nextVal = !current
    if (typeof window !== 'undefined') {
      localStorage.setItem(`hackreg_show_teams_${hack.id}`, String(nextVal))
    }
    setHackathonsList(prev => prev.map(h => h.id === hack.id ? { ...h, show_registered_teams: nextVal } : h))
    const updated = await LocalDB.updateHackathon(hack.id, { show_registered_teams: nextVal })
    if (updated) {
      await loadData()
      showToast(
        nextVal
          ? `Number of registered teams is now VISIBLE on "${hack.name}" homepage!`
          : `Number of registered teams is now REMOVED from "${hack.name}" homepage.`,
        'success'
      )
    }
  }

  // Create admin
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAdminName.trim() || !newAdminEmail.trim()) {
      showToast('Please enter both name and email.', 'warning')
      return
    }

    try {
      const addedBy = user?.email || 'artharambachalil@gmail.com'
      const result = await LocalDB.addAdmin(newAdminName.trim(), newAdminEmail.trim(), addedBy)
      if (newAdminRole !== 'admin') {
        await LocalDB.updateAdminRole(newAdminEmail.trim().toLowerCase(), newAdminRole)
        result.admin.role = newAdminRole
      }
      setCreatedAdminResult(result)
      setNewAdminName('')
      setNewAdminEmail('')
      await loadData()
      showToast(`Admin account created for ${result.admin.name}!`, 'success')
    } catch (err: any) {
      showToast(err?.message || 'Error adding admin', 'error')
    }
  }

  const copyCredentials = () => {
    if (!createdAdminResult) return
    const text = `Arth Mantra Admin Access:\nEmail: ${createdAdminResult.admin.email}\nTemporary Password: ${createdAdminResult.temporaryPassword}`
    navigator.clipboard.writeText(text)
    setCopiedCreds(true)
    showToast('Admin credentials copied to clipboard!', 'success')
    setTimeout(() => setCopiedCreds(false), 2500)
  }

  // Role change
  const handleRoleChange = async (targetEmail: string, newRole: UserRole) => {
    if (!isSuperAdmin) {
      showToast('Only Super Administrators can change roles.', 'error')
      return
    }
    try {
      const success = await LocalDB.updateAdminRole(targetEmail, newRole)
      if (success) {
        await loadData()
        showToast(`Role for ${targetEmail} updated to ${newRole.toUpperCase()}.`, 'success')
      }
    } catch (err: any) {
      showToast(err?.message || 'Error updating role', 'error')
    }
  }

  // JSON backup download
  const handleDownloadBackup = async () => {
    setIsBackingUp(true)
    try {
      const res = await fetch('/api/backup', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create database snapshot')
      const backupData = await res.json()

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Arth_Mantra_Backup_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast(`Backup downloaded! (${backupData.count || registrations.length} records)`, 'success')
    } catch (err: any) {
      showToast(err?.message || 'Database backup failed', 'error')
    } finally {
      setIsBackingUp(false)
    }
  }

  // JSON backup restore
  const handleExecutePortalRestore = async () => {
    if (!portalRestoreFile) {
      setPortalRestoreError('Please select a valid .json backup file.')
      return
    }
    setIsRestoringPortal(true)
    setPortalRestoreError(null)
    try {
      const text = await portalRestoreFile.text()
      const parsed = JSON.parse(text)
      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to restore database.')
      }
      showToast(data.message || 'Database restored successfully!', 'success')
      setShowPortalRestoreModal(false)
      setPortalRestoreFile(null)
      loadData(false)
    } catch (err: any) {
      setPortalRestoreError(err?.message || 'Restore error occurred')
    } finally {
      setIsRestoringPortal(false)
    }
  }

  // Guard: Unauthorized
  if (authLoading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center bg-[#050814]">
        <div className="w-9 h-9 border-3 border-[#00D2FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 bg-[#050814]">
        <div className="bg-[#0C1222] max-w-md w-full p-8 rounded-3xl border border-rose-900/60 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-[#DC2626] mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <div className="text-xs uppercase font-extrabold tracking-wider text-[#00D2FF] mb-1">
              Arth Mantra Portal
            </div>
            <h2 className="text-2xl font-black text-white">Access Denied</h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            This administration portal is restricted to authorized faculty coordinators and event administrators.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0072FF] to-[#00D2FF] text-slate-950 font-black text-xs uppercase tracking-wider transition-all block shadow-[0_0_15px_rgba(0,210,255,0.3)]"
            >
              Sign In with Admin Account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-slate-100 py-6 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase tracking-widest font-black text-[#00D2FF] bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-800 flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,210,255,0.15)]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00D2FF]" /> PES University • Admin Control
              </span>
              <span className="text-xs text-slate-600">•</span>
              <span className="text-xs text-slate-400 font-bold">{user?.full_name || 'Admin'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Arth Mantra Management & Evaluation Console
            </h1>
          </div>

          {/* Tab switchers & Quick Action */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 max-w-full no-scrollbar flex-nowrap sm:flex-wrap">
            <button
              onClick={() => setActiveTab('registrations')}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'registrations'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_15px_rgba(0,210,255,0.35)]'
                  : 'bg-[#0C1222] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              <Users className="w-4 h-4" /> Team Approvals ({registrations.length})
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 text-slate-950 font-black shadow-[0_0_15px_rgba(0,210,255,0.35)]'
                  : 'bg-[#0C1222] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              <UserCheck className="w-4 h-4 text-cyan-400" /> Members Directory ({allMembersList.length})
            </button>
            <button
              onClick={() => setActiveTab('scores')}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'scores'
                  ? 'bg-[#FF7A00] text-slate-950 font-black shadow-[0_0_15px_rgba(255,122,0,0.35)]'
                  : 'bg-[#0C1222] border border-slate-800 text-[#FF7A00] hover:bg-slate-800/60'
              }`}
            >
              <Trophy className="w-4 h-4" /> Score Tracker ({approvedTeams})
            </button>
            <button
              onClick={() => {
                setActiveTab('stock_market')
                fetchStockMarketState()
              }}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'stock_market'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                  : 'bg-[#0C1222] border border-slate-800 text-emerald-400 hover:text-white hover:border-emerald-600'
              }`}
            >
              <Activity className="w-4 h-4" /> Stock Market Round
            </button>
            <button
              onClick={() => setActiveTab('hackathons')}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'hackathons'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_15px_rgba(0,210,255,0.35)]'
                  : 'bg-[#0C1222] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              <Terminal className="w-4 h-4" /> Hackathons ({hackathonsList.length})
            </button>
            {isDev && (
              <button
                onClick={() => setActiveTab('admins')}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'admins'
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_15px_rgba(0,210,255,0.35)]'
                    : 'bg-[#0C1222] border border-cyan-800/60 text-[#00D2FF] hover:text-white hover:border-cyan-600'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-[#00D2FF]" /> Manage Admins (Dev)
              </button>
            )}

            {/* Global Header Reveal / Hide Credentials Button */}
            <button
              onClick={() => handleToggleCredentials(!Boolean(stockMarketState?.credentials_released))}
              title={stockMarketState?.credentials_released ? "Click to hide credentials from teams" : "Click to reveal credentials to approved teams"}
              className={`py-2 px-3 sm:px-3.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                stockMarketState?.credentials_released
                  ? 'bg-emerald-950/90 hover:bg-rose-950 text-emerald-300 hover:text-rose-300 border border-emerald-600 hover:border-rose-600 group'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white animate-pulse'
              }`}
            >
              {stockMarketState?.credentials_released ? (
                <>
                  <Eye className="w-4 h-4 text-emerald-400 group-hover:hidden" />
                  <EyeOff className="w-4 h-4 text-rose-400 hidden group-hover:inline" />
                  <span className="group-hover:hidden">Credentials Released</span>
                  <span className="hidden group-hover:inline">Hide Credentials</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" /> Reveal Credentials
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Stock Market Notification Alert */}
        {stockSyncMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-600 text-emerald-200 text-xs font-mono flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{stockSyncMsg}</span>
            </div>
            <button onClick={() => setStockSyncMsg(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── TAB 1: REGISTRATIONS & APPROVALS ──────────────────────── */}
        {activeTab === 'registrations' && (
          <div className="space-y-6">
            {/* ── ROUND RELEASE & REVEAL CONTROL CENTER ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-mono font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" /> Round Materials & Team Visibility Controls
                  </h3>
                  <p className="text-xs text-slate-400">
                    Control which round assets and credentials are released to approved teams on their profiles. All toggles are instantly reversible.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
                {/* 1. Problem Statements Release Card */}
                <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-lg ${
                  activeHackathon?.ps_released
                    ? 'bg-gradient-to-br from-indigo-950/90 via-[#0B132B] to-[#0A1020] border-indigo-500/80 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                    : 'bg-gradient-to-br from-[#0C1427] to-[#0A1220] border-slate-800'
                }`}>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                          activeHackathon?.ps_released ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}>
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <span className="font-mono font-black text-white text-xs uppercase tracking-wider">
                          Round 1: Problem Statements
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-black border uppercase ${
                        activeHackathon?.ps_released ? 'bg-indigo-950 text-indigo-300 border-indigo-600' : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}>
                        {activeHackathon?.ps_released ? '● Revealed' : '○ Hidden'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      {activeHackathon?.ps_released
                        ? 'Approved teams can view their assigned briefing & download their uploaded PDF on their profile.'
                        : 'Problem statements are concealed from teams. Clicking "Assign PS" only pre-assigns the brief without revealing it.'}
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => handleTogglePSRelease(!Boolean(activeHackathon?.ps_released))}
                      className={`w-full py-2 px-3 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        activeHackathon?.ps_released
                          ? 'bg-rose-950/90 hover:bg-rose-900 text-rose-300 border border-rose-800 hover:shadow-rose-900/30'
                          : 'bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-indigo-900/40'
                      }`}
                    >
                      {activeHackathon?.ps_released ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Hide PS from Teams
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Reveal All PS to Teams
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 2. Datasheets Release Card */}
                <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-lg ${
                  activeHackathon?.datasheets_released
                    ? 'bg-gradient-to-br from-emerald-950/90 via-[#071915] to-[#0A1220] border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                    : 'bg-gradient-to-br from-[#0C1427] to-[#0A1220] border-slate-800'
                }`}>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                          activeHackathon?.datasheets_released ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}>
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <span className="font-mono font-black text-white text-xs uppercase tracking-wider">
                          Round 2: Team Datasheets
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-black border uppercase ${
                        activeHackathon?.datasheets_released ? 'bg-emerald-950 text-emerald-300 border-emerald-600' : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}>
                        {activeHackathon?.datasheets_released ? '● Revealed' : '○ Hidden'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      {activeHackathon?.datasheets_released
                        ? 'Approved teams can view and download their assigned Excel spreadsheet (.xlsx) on their profile.'
                        : 'Datasheets are concealed. Clicking "Assign Datasheet" uploads & assigns the file without revealing it.'}
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => handleToggleDatasheetRelease(!Boolean(activeHackathon?.datasheets_released))}
                      className={`w-full py-2 px-3 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        activeHackathon?.datasheets_released
                          ? 'bg-rose-950/90 hover:bg-rose-900 text-rose-300 border border-rose-800 hover:shadow-rose-900/30'
                          : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-900/40'
                      }`}
                    >
                      {activeHackathon?.datasheets_released ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Hide Datasheets
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Reveal All Datasheets
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 3. Round 3 Stock Market Credentials Release Card */}
                <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-lg ${
                  stockMarketState?.credentials_released
                    ? 'bg-gradient-to-br from-cyan-950/90 via-[#071924] to-[#0A1220] border-cyan-500/80 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                    : 'bg-gradient-to-br from-[#0C1427] to-[#0A1220] border-slate-800'
                }`}>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                          stockMarketState?.credentials_released ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}>
                          <Activity className="w-4 h-4" />
                        </div>
                        <span className="font-mono font-black text-white text-xs uppercase tracking-wider">
                          Round 3: Stock Market Access
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-black border uppercase ${
                        stockMarketState?.credentials_released ? 'bg-cyan-950 text-cyan-300 border-cyan-600' : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}>
                        {stockMarketState?.credentials_released ? '● Revealed' : '○ Hidden'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      {stockMarketState?.credentials_released
                        ? 'Approved teams can view Team Codes, Trader PINs & 1-click Trading Link on their profile.'
                        : 'Trading credentials concealed from teams. Click Reveal when ready for teams to prepare terminal login.'}
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleCredentials(!Boolean(stockMarketState?.credentials_released))}
                      className={`flex-1 py-2 px-2.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        stockMarketState?.credentials_released
                          ? 'bg-rose-950/90 hover:bg-rose-900 text-rose-300 border border-rose-800 hover:shadow-rose-900/30'
                          : 'bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 text-white shadow-cyan-900/40'
                      }`}
                    >
                      {stockMarketState?.credentials_released ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Hide Creds
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Reveal Creds
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleSyncTeamsToStockMarket}
                      title="Force re-sync all approved teams to stock market"
                      className="py-2 px-2.5 rounded-xl font-mono font-bold text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Sync
                    </button>
                  </div>
                </div>

                {/* 4. Round 4 Resource Auction Sheet Release Card */}
                <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-lg ${
                  activeHackathon?.auction_released
                    ? 'bg-gradient-to-br from-purple-950/90 via-[#180B2B] to-[#0A0718] border-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                    : 'bg-gradient-to-br from-[#0C1427] to-[#0A1220] border-slate-800'
                }`}>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                          activeHackathon?.auction_released ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}>
                          <Gavel className="w-4 h-4" />
                        </div>
                        <span className="font-mono font-black text-white text-xs uppercase tracking-wider">
                          Round 4: Resource Auction
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-black border uppercase ${
                        activeHackathon?.auction_released ? 'bg-purple-950 text-purple-300 border-purple-600' : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}>
                        {activeHackathon?.auction_released ? '● Revealed' : '○ Hidden'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-snug">
                      {activeHackathon?.auction_sheet ? (
                        <>
                          <span className="text-white font-bold block truncate">
                            📄 {activeHackathon.auction_sheet.file_name}
                          </span>
                          {activeHackathon?.auction_released
                            ? 'Single master auction inventory is revealed and downloadable by all approved squads.'
                            : 'Master auction inventory is uploaded but concealed. Click Reveal to unlock.'}
                        </>
                      ) : (
                        'No auction list assigned yet. Upload the single master sheet to assign to all squads.'
                      )}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAuctionRelease(!Boolean(activeHackathon?.auction_released))}
                        className={`flex-1 py-2 px-2.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          activeHackathon?.auction_released
                            ? 'bg-rose-950/90 hover:bg-rose-900 text-rose-300 border border-rose-800 hover:shadow-rose-900/30'
                            : 'bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 text-white shadow-purple-900/40'
                        }`}
                      >
                        {activeHackathon?.auction_released ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" /> Hide Sheet
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" /> Reveal Sheet
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (activeHackathon?.auction_sheet) {
                            setAuctionFileUrl(activeHackathon.auction_sheet.file_url)
                            setAuctionFileName(activeHackathon.auction_sheet.file_name)
                            setAuctionFileSize(activeHackathon.auction_sheet.file_size)
                            setAuctionNotes(activeHackathon.auction_sheet.notes || '')
                          } else {
                            setAuctionFileUrl('')
                            setAuctionFileName('')
                            setAuctionFileSize(undefined)
                            setAuctionNotes('')
                          }
                          setIsAuctionModalOpen(true)
                        }}
                        className="py-2 px-3 rounded-xl font-mono font-bold text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                        title={activeHackathon?.auction_sheet ? 'Replace master auction sheet' : 'Upload master auction sheet'}
                      >
                        <Upload className="w-3 h-3 text-purple-400" />
                        <span>{activeHackathon?.auction_sheet ? 'Replace' : 'Upload'}</span>
                      </button>
                    </div>

                    {activeHackathon?.auction_sheet && (
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
                        <a
                          href={activeHackathon.auction_sheet.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={activeHackathon.auction_sheet.file_name}
                          className="text-purple-400 hover:underline flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Test Download
                        </a>
                        <button
                          type="button"
                          onClick={handleRemoveAuctionSheet}
                          className="text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-[#0C1222] p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
                <div className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#00D2FF]" /> Total Teams
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">{totalTeams}</div>
              </div>
              <div className="bg-emerald-950/40 p-4 sm:p-5 rounded-2xl border border-emerald-800/60 shadow-md">
                <div className="text-[10px] font-black uppercase text-emerald-400 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Approved
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-300">{approvedTeams}</div>
              </div>
              <div className="bg-amber-950/40 p-4 sm:p-5 rounded-2xl border border-amber-800/60 shadow-md">
                <div className="text-[10px] font-black uppercase text-amber-400 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Pending Review
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-300">{pendingTeams}</div>
              </div>
              <div className="bg-rose-950/40 p-4 sm:p-5 rounded-2xl border border-rose-800/60 shadow-md">
                <div className="text-[10px] font-black uppercase text-rose-400 mb-1 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-400" /> Rejected
                </div>
                <div className="text-2xl sm:text-3xl font-black text-rose-300">{rejectedTeams}</div>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="bg-[#0C1222] p-4 rounded-2xl border border-slate-800 shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search team, leader email, member, department, section..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#080E1C] border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-[#00D2FF]"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}
                    className="py-2 px-3 text-xs rounded-xl border border-slate-800 bg-[#080E1C] text-slate-200 focus:outline-none focus:border-[#00D2FF]"
                  >
                    <option value="all">All Statuses ({relevantRegistrations.length})</option>
                    <option value="pending">Pending ({pendingTeams})</option>
                    <option value="approved">Approved ({approvedTeams})</option>
                    <option value="rejected">Rejected ({rejectedTeams})</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="py-2 px-3 text-xs rounded-xl border border-slate-800 bg-[#080E1C] text-[#00D2FF] font-bold focus:outline-none focus:border-[#00D2FF]"
                  >
                    <option value="date_desc">Sort: Newest First</option>
                    <option value="date_asc">Sort: Oldest First</option>
                    <option value="name_asc">Sort: Team Name (A-Z)</option>
                    <option value="dept_asc">Sort: Department (A-Z)</option>
                    <option value="sem_asc">Sort: Semester (1 to 7)</option>
                    <option value="sec_asc">Sort: Section (A to G)</option>
                  </select>
                </div>

                {/* Export and Refresh */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => loadData(false)}
                    className="p-2 rounded-xl border border-slate-800 bg-[#080E1C] hover:bg-slate-800 text-slate-300 transition-all cursor-pointer"
                    title="Refresh list"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLiveSyncing ? 'animate-spin text-[#00D2FF]' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleExportExcel('all')}
                    className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    title="Export all matching teams"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Export Teams
                  </button>
                  <button
                    onClick={handleExportFilteredMembersExcel}
                    className="py-2 px-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    title="Export Excel of all filtered members"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Export Filtered Members
                  </button>
                  <button
                    onClick={handleDownloadBackup}
                    disabled={isBackingUp}
                    className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" /> Backup JSON
                  </button>
                  <button
                    onClick={() => {
                      setPortalRestoreError(null)
                      setPortalRestoreFile(null)
                      setShowPortalRestoreModal(true)
                    }}
                    className="py-2 px-3.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/80 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    title="Restore system database from a JSON backup file"
                  >
                    <Database className="w-4 h-4 text-amber-400" /> Restore JSON
                  </button>
                </div>
              </div>

              {/* Department, Semester, Section Filters */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-[#00D2FF]" /> Filter Teams:
                </span>

                <select
                  value={regDeptFilter}
                  onChange={e => setRegDeptFilter(e.target.value)}
                  className="py-1.5 px-2.5 rounded-xl border border-slate-800 bg-[#080E1C] text-xs text-slate-200 outline-none focus:border-[#00D2FF]"
                >
                  <option value="all">All Departments</option>
                  {PES_DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <select
                  value={regSemFilter}
                  onChange={e => setRegSemFilter(e.target.value)}
                  className="py-1.5 px-2.5 rounded-xl border border-slate-800 bg-[#080E1C] text-xs text-slate-200 outline-none focus:border-[#00D2FF] font-bold"
                >
                  <option value="all">All Semesters</option>
                  {SEMESTER_OPTIONS.map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>

                <select
                  value={regSecFilter}
                  onChange={e => setRegSecFilter(e.target.value)}
                  className="py-1.5 px-2.5 rounded-xl border border-slate-800 bg-[#080E1C] text-xs text-slate-200 outline-none focus:border-[#00D2FF] font-bold"
                >
                  <option value="all">All Sections</option>
                  {SECTION_OPTIONS.map(sec => (
                    <option key={sec} value={sec}>Section {sec}</option>
                  ))}
                </select>

                <select
                  value={regResidenceFilter}
                  onChange={e => setRegResidenceFilter(e.target.value)}
                  className="py-1.5 px-2.5 rounded-xl border border-slate-800 bg-[#080E1C] text-xs text-slate-200 outline-none focus:border-[#00D2FF] font-bold"
                >
                  <option value="all">All Residence</option>
                  <option value="Hostelite">Hostelites</option>
                  <option value="Non-Hostelite">Non-Hostelites</option>
                </select>

                {(regDeptFilter !== 'all' || regSemFilter !== 'all' || regSecFilter !== 'all' || regResidenceFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setRegDeptFilter('all')
                      setRegSemFilter('all')
                      setRegSecFilter('all')
                      setRegResidenceFilter('all')
                    }}
                    className="py-1 px-2 text-[11px] text-cyan-400 hover:underline font-bold cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}

                <span className="ml-auto text-[11px] text-slate-400 font-semibold">
                  Showing {filteredRegistrations.length} of {relevantRegistrations.length} teams
                </span>
              </div>
            </div>

            {/* Registrations List */}
            {dataLoading ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-3 border-[#00D2FF] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading registrations...</p>
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <div className="bg-[#0C1222] p-12 text-center rounded-3xl border border-slate-800 shadow-sm space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-800 text-[#00D2FF] flex items-center justify-center mx-auto mb-2">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">No Team Registrations Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'all'
                    ? 'No registrations match your search filters.'
                    : 'Teams will appear here once participants submit their registrations.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRegistrations.map((reg) => {
                  const isExpanded = expandedTeamId === reg.id
                  const isRejecting = rejectingReg?.id === reg.id

                  return (
                    <motion.div
                      key={reg.id}
                      layout
                      className="bg-[#0C1222] rounded-2xl border border-slate-800 shadow-lg overflow-hidden transition-all hover:border-slate-700"
                    >
                      {/* Top Status Bar */}
                      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-black text-white uppercase">{reg.team_name}</span>
                            <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${
                              reg.status === 'approved'
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                                : reg.status === 'rejected'
                                ? 'bg-rose-950/60 text-rose-400 border-rose-800'
                                : 'bg-amber-950/60 text-amber-400 border-amber-800'
                            }`}>
                              {reg.status}
                            </span>
                            {reg.score !== undefined && reg.score > 0 && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-950/60 text-[#00D2FF] border border-cyan-800">
                                {reg.score} pts
                              </span>
                            )}
                            {reg.assigned_problem_statement && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700 flex items-center gap-1">
                                <BookOpen className="w-3 h-3 text-indigo-400" />
                                <span>PS: {reg.assigned_problem_statement.track}</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-y-1 gap-x-3">
                            <span>Leader: <strong className="text-slate-200 font-semibold">{getAdminLeaderName(reg)}</strong> <span className="text-[11px] text-slate-500 font-mono">({reg.leader_email})</span></span>
                            <span>•</span>
                            <span>{reg.members?.length || 0} members</span>
                            <span>•</span>
                            <span>Registered: {new Date(reg.created_at).toLocaleDateString()}</span>
                          </div>
                          {reg.utr_reference && (
                            <div className="text-xs text-slate-300 mt-1">
                              UTR / Txn Ref: <code className="bg-[#080E1C] px-1.5 py-0.5 rounded text-[11px] font-mono text-[#00D2FF]">{reg.utr_reference}</code>
                            </div>
                          )}
                          {reg.assigned_problem_statement && (
                            <div className="text-xs text-indigo-300 mt-1.5 bg-indigo-950/40 px-2.5 py-1 rounded-xl border border-indigo-800/60 font-mono">
                              <strong>Assigned PS:</strong> {reg.assigned_problem_statement.title}
                            </div>
                          )}
                          {reg.rejection_comment && (
                            <div className="text-xs text-rose-400 mt-1 bg-rose-950/40 px-2 py-1 rounded-lg border border-rose-900/60 inline-block">
                              Rejection Reason: {reg.rejection_comment}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* View Screenshot */}
                          {reg.payment_screenshot_url && (
                            <button
                              onClick={() => setSelectedScreenshot(reg.payment_screenshot_url)}
                              className="py-1.5 px-3 rounded-xl border border-cyan-800/80 bg-cyan-950/40 hover:bg-cyan-900/50 text-[#00D2FF] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> Screenshot
                            </button>
                          )}

                          {/* Problem Statement Button (if approved) */}
                          {reg.status === 'approved' && (
                            <button
                              onClick={() => handleOpenPSModal(reg)}
                              className={`py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                reg.assigned_problem_statement
                                  ? 'border-indigo-500/80 bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/60 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                                  : 'border-slate-700 bg-slate-900/80 text-slate-400 hover:text-white hover:border-slate-600'
                              }`}
                              title={reg.assigned_problem_statement ? `PS: ${reg.assigned_problem_statement.title}` : 'Assign a Problem Statement to this team'}
                            >
                              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{reg.assigned_problem_statement ? 'Edit PS' : 'Assign PS'}</span>
                            </button>
                          )}

                          {/* Datasheet Button (if approved) */}
                          {reg.status === 'approved' && (
                            <button
                              onClick={() => handleOpenDatasheetModal(reg)}
                              className={`py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                reg.assigned_datasheet
                                  ? 'border-emerald-500/80 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                  : 'border-slate-700 bg-slate-900/80 text-slate-400 hover:text-white hover:border-slate-600'
                              }`}
                              title={reg.assigned_datasheet ? `Datasheet: ${reg.assigned_datasheet.file_name}` : 'Assign an Excel Datasheet to this team'}
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{reg.assigned_datasheet ? 'Edit Datasheet' : 'Assign Datasheet'}</span>
                            </button>
                          )}

                          {/* Quick Score Modal Button (if approved) */}
                          {reg.status === 'approved' && (
                            <button
                              onClick={() => handleOpenScoreModal(reg)}
                              className="py-1.5 px-3 rounded-xl border border-[#FF7A00]/60 bg-[#FF7A00]/15 hover:bg-[#FF7A00]/25 text-[#FF7A00] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Trophy className="w-3.5 h-3.5" /> Score Team
                            </button>
                          )}

                          {/* View Members Toggle */}
                          <button
                            onClick={() => setExpandedTeamId(isExpanded ? null : reg.id)}
                            className="py-1.5 px-3 rounded-xl border border-slate-800 bg-[#080E1C] hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Members ({reg.members?.length})</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {/* Approval button */}
                          {reg.status !== 'approved' && (
                            <button
                              onClick={() => handleApprove(reg)}
                              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                          )}

                          {/* Reject button */}
                          {reg.status !== 'rejected' && (
                            <button
                              onClick={() => {
                                setRejectingReg(isRejecting ? null : reg)
                                setRejectionReason('')
                              }}
                              className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          )}

                          {/* Delete (Superadmin only) */}
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDeleteRegistration(reg)}
                              className="p-1.5 rounded-xl border border-rose-900/60 text-rose-400 hover:bg-rose-950/40 transition-all cursor-pointer"
                              title="Delete Registration"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inline Rejection Reason Form */}
                      {isRejecting && (
                        <div className="bg-rose-950/30 p-4 border-t border-rose-900/50">
                          <form onSubmit={handleConfirmDisapprove} className="space-y-2">
                            <label className="text-xs font-bold text-rose-300 block">
                              Specify Rejection Reason (shown to the team leader in their profile):
                            </label>
                            <textarea
                              value={rejectionReason}
                              onChange={e => setRejectionReason(e.target.value)}
                              placeholder="e.g. Payment screenshot is unreadable / Invalid UTR / Incomplete team details..."
                              rows={2}
                              required
                              className="w-full p-2.5 text-xs rounded-xl border border-rose-800 bg-[#080E1C] text-white focus:outline-none focus:border-rose-500"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingReg(null)
                                  setRejectionReason('')
                                }}
                                className="py-1 px-3 text-xs text-slate-400 hover:text-white cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isSubmittingReject}
                                className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                              >
                                {isSubmittingReject ? 'Rejecting...' : 'Confirm Rejection'}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Expanded Members Details */}
                      {isExpanded && (
                        <div className="bg-[#080E1C] p-4 border-t border-slate-800">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                            Team Members Roster ({reg.members?.length} members)
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {reg.members?.map((member, idx) => (
                              <div
                                key={idx}
                                className="bg-[#0C1222] p-3 rounded-xl border border-slate-800 space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-white">{member.name}</span>
                                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                    idx === 0 ? 'bg-cyan-950/80 text-[#00D2FF] border border-cyan-800/80' : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {idx === 0 ? 'Leader' : `Member ${idx + 1}`}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400">SRN: <span className="font-mono text-cyan-300">{member.srn || 'N/A'}</span></div>
                                <div className="text-[11px] text-slate-400">Phone: <span className="text-slate-300">{member.phone || 'N/A'}</span></div>
                                <div className="text-[11px] text-slate-400 truncate" title={member.email}>Email: <span className="text-slate-300">{member.email || 'N/A'}</span></div>
                                {member.department && (
                                  <div className="text-[10px] text-slate-400 truncate" title={member.department}>
                                    Dept: <span className="font-semibold text-slate-200">{member.department}</span>
                                  </div>
                                )}
                                {(member.semester || member.section || member.residence_type) && (
                                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
                                    {member.semester && (
                                      <span className="bg-amber-950/60 text-amber-300 border border-amber-800/80 px-1.5 py-0.2 rounded font-bold">
                                        Sem {member.semester}
                                      </span>
                                    )}
                                    {member.section && (
                                      <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 px-1.5 py-0.2 rounded font-bold">
                                        Sec {member.section}
                                      </span>
                                    )}
                                    <span className={`px-1.5 py-0.2 rounded font-bold border ${
                                      member.residence_type === 'Hostelite'
                                        ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                                        : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                                    }`}>
                                      {member.residence_type || 'Non-Hostelite'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: DEDICATED SQUAD MEMBERS DIRECTORY & EXCEL EXPORT ── */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Header & Quick Export Card */}
            <div className="bg-[#0C1222] p-5 sm:p-7 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-teal-400" />
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-[#00D2FF]">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Individual Squad Members Directory
                  </h2>
                </div>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  Browse and audit every registered member individually. Filter by department, semester, section, hostel status, or squad state, and export high-fidelity tabular spreadsheets to Excel.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => loadData(false)}
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="Refresh Data"
                >
                  <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin text-[#00D2FF]' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleExportMembersTabExcel}
                  disabled={filteredMembers.length === 0}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer disabled:opacity-40"
                  title="Export currently filtered members to an Excel spreadsheet (.xlsx)"
                >
                  <Download className="w-4 h-4" /> Export Members (.xlsx)
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-[#0C1222] p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Members</span>
                <span className="text-xl font-mono font-black text-white mt-1">{allMembersList.length}</span>
              </div>
              <div className="bg-[#0C1222] p-3.5 rounded-2xl border border-emerald-900/50 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Approved Squads</span>
                <span className="text-xl font-mono font-black text-emerald-300 mt-1">
                  {allMembersList.filter(m => m.status === 'approved').length}
                </span>
              </div>
              <div className="bg-[#0C1222] p-3.5 rounded-2xl border border-amber-900/50 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Under Review</span>
                <span className="text-xl font-mono font-black text-amber-300 mt-1">
                  {allMembersList.filter(m => m.status === 'pending').length}
                </span>
              </div>
              <div className="bg-[#0C1222] p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">Hostelites</span>
                <span className="text-xl font-mono font-black text-amber-200 mt-1">
                  {allMembersList.filter(m => (m.residence_type || '').toLowerCase() === 'hostelite').length}
                </span>
              </div>
              <div className="bg-[#0C1222] p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-cyan-300 tracking-wider">Non-Hostelites</span>
                <span className="text-xl font-mono font-black text-cyan-200 mt-1">
                  {allMembersList.filter(m => (m.residence_type || '').toLowerCase() !== 'hostelite').length}
                </span>
              </div>
            </div>

            {/* Filter & Search Control Panel */}
            <div className="bg-[#0C1222] p-4 sm:p-5 rounded-3xl border border-slate-800 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono font-black text-white uppercase tracking-wider">Filter Member Roster</span>
                </div>
                {(memberSearchQuery || memberStatusFilter !== 'all' || memberRoleFilter !== 'all' || memberResidenceFilter !== 'all' || memberDeptFilter !== 'all' || memberSemFilter !== 'all' || memberSecFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setMemberSearchQuery('')
                      setMemberStatusFilter('all')
                      setMemberRoleFilter('all')
                      setMemberResidenceFilter('all')
                      setMemberDeptFilter('all')
                      setMemberSemFilter('all')
                      setMemberSecFilter('all')
                    }}
                    className="text-[11px] font-mono font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Clear Filters
                  </button>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={e => setMemberSearchQuery(e.target.value)}
                  placeholder="Search by member name, SRN, email, phone, squad name, or department..."
                  className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl py-2.5 px-3 pl-9 pr-8 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                {memberSearchQuery && (
                  <button
                    onClick={() => setMemberSearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Multi-Select Filters Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 text-xs">
                {/* Status Filter */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Squad Status</label>
                  <select
                    value={memberStatusFilter}
                    onChange={e => setMemberStatusFilter(e.target.value as any)}
                    className="w-full py-2 px-2.5 rounded-xl border border-slate-800 bg-[#080E1C] text-slate-200 focus:border-[#00D2FF] outline-none text-xs cursor-pointer font-medium"
                  >
                    <option value="all" className="bg-[#0C1222]">All Statuses</option>
                    <option value="approved" className="bg-[#0C1222]">Approved</option>
                    <option value="pending" className="bg-[#0C1222]">Pending</option>
                    <option value="rejected" className="bg-[#0C1222]">Rejected</option>
                  </select>
                </div>

                {/* Role Filter */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Member Role</label>
                  <select
                    value={memberRoleFilter}
                    onChange={e => setMemberRoleFilter(e.target.value as any)}
                    className="w-full py-2 px-2.5 rounded-xl border border-slate-800 bg-[#080E1C] text-slate-200 focus:border-[#00D2FF] outline-none text-xs cursor-pointer font-medium"
                  >
                    <option value="all" className="bg-[#0C1222]">All Roles</option>
                    <option value="leader" className="bg-[#0C1222]">Team Leaders Only</option>
                    <option value="member" className="bg-[#0C1222]">Squad Members Only</option>
                  </select>
                </div>

                {/* Residence Filter */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Residence Status</label>
                  <select
                    value={memberResidenceFilter}
                    onChange={e => setMemberResidenceFilter(e.target.value)}
                    className="w-full py-2 px-2.5 rounded-xl border border-slate-800 bg-[#080E1C] text-slate-200 focus:border-[#00D2FF] outline-none text-xs cursor-pointer font-medium"
                  >
                    <option value="all" className="bg-[#0C1222]">All Housing</option>
                    <option value="Hostelite" className="bg-[#0C1222]">Hostelite</option>
                    <option value="Non-Hostelite" className="bg-[#0C1222]">Non-Hostelite</option>
                  </select>
                </div>

                {/* Department Filter */}
                <div className="lg:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Department</label>
                  <select
                    value={memberDeptFilter}
                    onChange={e => setMemberDeptFilter(e.target.value)}
                    className="w-full py-2 px-2.5 rounded-xl border border-slate-800 bg-[#080E1C] text-slate-200 focus:border-[#00D2FF] outline-none text-xs cursor-pointer truncate font-medium"
                  >
                    <option value="all" className="bg-[#0C1222]">All Departments</option>
                    {PES_DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept} className="bg-[#0C1222]">{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Semester Filter */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Semester</label>
                  <select
                    value={memberSemFilter}
                    onChange={e => setMemberSemFilter(e.target.value)}
                    className="w-full py-2 px-2.5 rounded-xl border border-slate-800 bg-[#080E1C] text-slate-200 focus:border-[#00D2FF] outline-none text-xs cursor-pointer font-medium"
                  >
                    <option value="all" className="bg-[#0C1222]">All Sem</option>
                    {SEMESTER_OPTIONS.map(sem => (
                      <option key={sem} value={sem} className="bg-[#0C1222]">Sem {sem}</option>
                    ))}
                  </select>
                </div>

                {/* Section Filter */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Section</label>
                  <select
                    value={memberSecFilter}
                    onChange={e => setMemberSecFilter(e.target.value)}
                    className="w-full py-2 px-2.5 rounded-xl border border-slate-800 bg-[#080E1C] text-slate-200 focus:border-[#00D2FF] outline-none text-xs cursor-pointer font-medium"
                  >
                    <option value="all" className="bg-[#0C1222]">All Sec</option>
                    {SECTION_OPTIONS.map(sec => (
                      <option key={sec} value={sec} className="bg-[#0C1222]">Sec {sec}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Footer & Sort Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <span className="font-mono text-[11px] text-slate-400">
                  Showing <strong className="text-cyan-400 font-bold">{filteredMembers.length}</strong> of {allMembersList.length} members
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Sort By:</span>
                  <select
                    value={memberSortBy}
                    onChange={e => setMemberSortBy(e.target.value as any)}
                    className="py-1 px-2.5 rounded-lg border border-slate-800 bg-[#080E1C] text-cyan-300 font-mono text-xs focus:border-[#00D2FF] outline-none cursor-pointer"
                  >
                    <option value="name_asc" className="bg-[#0C1222]">Member Name (A-Z)</option>
                    <option value="team_asc" className="bg-[#0C1222]">Squad Name (A-Z)</option>
                    <option value="srn_asc" className="bg-[#0C1222]">SRN (Ascending)</option>
                    <option value="date_desc" className="bg-[#0C1222]">Registration Date (Newest)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Members Table (Desktop) */}
            {dataLoading ? (
              <div className="py-20 text-center">
                <div className="w-8 h-8 border-3 border-[#00D2FF] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading member directory...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="bg-[#0C1222] p-12 text-center rounded-3xl border border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-800 text-[#00D2FF] flex items-center justify-center mx-auto mb-2">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">No Members Match the Filter Criteria</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Try clearing your search query or adjusting your filters for status, department, and residence.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMemberSearchQuery('')
                      setMemberStatusFilter('all')
                      setMemberRoleFilter('all')
                      setMemberResidenceFilter('all')
                      setMemberDeptFilter('all')
                      setMemberSemFilter('all')
                      setMemberSecFilter('all')
                    }}
                    className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#0C1222] rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-[#080E1C]/80 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                        <th className="py-3.5 px-3">#</th>
                        <th className="py-3.5 px-3">Member & Role</th>
                        <th className="py-3.5 px-3">SRN</th>
                        <th className="py-3.5 px-3">Contact</th>
                        <th className="py-3.5 px-3">Department & Class</th>
                        <th className="py-3.5 px-3 text-center">Housing</th>
                        <th className="py-3.5 px-3 text-center">Squad Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {filteredMembers.map((m, idx) => {
                        return (
                          <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                            {/* Sequential Index */}
                            <td className="py-3.5 px-3 font-mono text-slate-500">
                              {idx + 1}
                            </td>

                            {/* Name, Role & Squad */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0072FF] to-[#00D2FF] text-slate-950 font-black text-xs uppercase flex items-center justify-center shrink-0">
                                  {m.name.charAt(0) || 'M'}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-white text-sm">{m.name}</span>
                                    <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase border ${
                                      m.is_leader
                                        ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                                        : 'bg-slate-900 text-slate-400 border-slate-800'
                                    }`}>
                                      {m.member_role}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-cyan-400 block truncate font-medium">
                                    Squad: {m.team_name}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* SRN */}
                            <td className="py-3.5 px-3">
                              <span className="font-mono font-bold text-xs text-slate-200 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-800">
                                {m.srn}
                              </span>
                            </td>

                            {/* Contact (Email + Phone) */}
                            <td className="py-3.5 px-3">
                              <div className="space-y-0.5">
                                <a
                                  href={`mailto:${m.email}`}
                                  className="text-slate-300 hover:text-[#00D2FF] flex items-center gap-1 font-mono text-[11px] transition-colors"
                                >
                                  <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="truncate max-w-[180px]">{m.email}</span>
                                </a>
                                {m.phone && m.phone !== 'N/A' && (
                                  <a
                                    href={`tel:${m.phone}`}
                                    className="text-slate-400 hover:text-white flex items-center gap-1 font-mono text-[11px] transition-colors"
                                  >
                                    <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                                    <span>{m.phone}</span>
                                  </a>
                                )}
                              </div>
                            </td>

                            {/* Department & Cohort */}
                            <td className="py-3.5 px-3">
                              <div className="font-medium text-slate-300 text-xs truncate max-w-[200px]" title={m.department}>
                                {m.department}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                                {m.semester !== 'N/A' ? `Sem ${m.semester}` : 'No Sem'} • {m.section !== 'N/A' ? `Sec ${m.section}` : 'No Sec'}
                              </div>
                            </td>

                            {/* Housing */}
                            <td className="py-3.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border uppercase inline-block ${
                                (m.residence_type || '').toLowerCase() === 'hostelite'
                                  ? 'bg-amber-950 text-amber-300 border-amber-700'
                                  : 'bg-slate-900 text-slate-400 border-slate-800'
                              }`}>
                                {m.residence_type || 'Non-Hostelite'}
                              </span>
                            </td>

                            {/* Squad Status */}
                            <td className="py-3.5 px-3 text-center">
                              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border uppercase inline-flex items-center gap-1 ${
                                m.status === 'approved'
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                                  : m.status === 'rejected'
                                  ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                                  : 'bg-amber-950/80 text-amber-300 border-amber-700'
                              }`}>
                                {m.status === 'approved' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                                {m.status === 'pending' && <Clock className="w-3 h-3 text-amber-400" />}
                                {m.status === 'rejected' && <XCircle className="w-3 h-3 text-rose-400" />}
                                <span>{m.status}</span>
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="block md:hidden divide-y divide-slate-800/80">
                  {filteredMembers.map((m, idx) => (
                    <div key={m.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-500 font-bold">#{idx + 1}</span>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white text-sm">{m.name}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase border ${
                                m.is_leader
                                  ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                                  : 'bg-slate-900 text-slate-400 border-slate-800'
                              }`}>
                                {m.member_role}
                              </span>
                            </div>
                            <span className="text-[11px] text-cyan-400 block font-medium">Squad: {m.team_name}</span>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border uppercase ${
                          m.status === 'approved'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            : m.status === 'rejected'
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : 'bg-amber-950 text-amber-300 border-amber-700'
                        }`}>
                          {m.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono bg-[#080E1C] p-2.5 rounded-xl border border-slate-800">
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase">SRN</span>
                          <span className="font-bold text-slate-200">{m.srn}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase">Class</span>
                          <span className="text-slate-300">Sem {m.semester} • Sec {m.section}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 block text-[9px] uppercase">Department</span>
                          <span className="text-slate-300 truncate block">{m.department}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 block text-[9px] uppercase">Contact</span>
                          <span className="text-slate-300 block truncate">{m.email} • {m.phone}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: LIVE SCORE TRACKER ────────────────────────────── */}
        {activeTab === 'scores' && (
          <div className="space-y-6">
            <div className="bg-[#0C1222] p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-5 h-5 text-[#FF7A00]" />
                  <h2 className="text-lg font-black text-white">Live Hackathon Score Tracker</h2>
                </div>
                <p className="text-xs text-slate-400">
                  Evaluate approved teams across Round 1 (Ideas & Concept), Round 2 (Prototype Build), and Round 3 (Pitch). Scores appear live on the public leaderboard.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <Link
                  href="/leaderboard"
                  target="_blank"
                  className="py-2 px-3.5 rounded-xl border border-cyan-800 bg-cyan-950/50 hover:bg-cyan-900/50 text-[#00D2FF] text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Public Board
                </Link>
                <button
                  onClick={handleExportScores}
                  disabled={rankedApprovedTeams.length === 0}
                  className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" /> Export Scores (.xlsx)
                </button>
              </div>
            </div>

            {rankedApprovedTeams.length === 0 ? (
              <div className="bg-[#0C1222] p-12 text-center rounded-3xl border border-slate-800 space-y-2">
                <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <h3 className="text-base font-bold text-white">No Approved Teams to Score</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Approve teams in the &quot;Team Approvals&quot; tab first, then return here to input their round scores!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {rankedApprovedTeams.map((team, idx) => {
                  const rank = idx + 1
                  return (
                    <div
                      key={team.id}
                      className="bg-[#0C1222] p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                          rank === 1
                            ? 'bg-[#FF7A00] text-slate-950 shadow-[0_0_10px_rgba(255,122,0,0.4)]'
                            : rank === 2
                            ? 'bg-slate-300 text-slate-950 shadow-[0_0_8px_rgba(200,200,200,0.3)]'
                            : rank === 3
                            ? 'bg-amber-700 text-amber-100 shadow-[0_0_8px_rgba(180,83,9,0.3)]'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          #{rank}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-white uppercase">{team.team_name}</span>
                            <span className="text-[10px] text-slate-400">({team.members?.length} members)</span>
                          </div>
                          <div className="text-xs text-slate-300">
                            Leader: <strong className="text-white font-semibold">{getAdminLeaderName(team)}</strong>
                          </div>
                          {team.judge_notes && (
                            <div className="text-xs text-amber-300/80 italic mt-0.5">
                              Remarks: &quot;{team.judge_notes}&quot;
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Scores Breakdown & Update Button */}
                      <div className="flex items-center gap-3 flex-wrap self-end md:self-auto">
                        <div className="flex items-center gap-2 bg-[#080E1C] px-3 py-1.5 rounded-xl border border-slate-800 text-xs flex-wrap">
                          <span className="text-slate-400">R1: <strong className="text-cyan-400">{team.round_1_score || 0}</strong></span>
                          <span className="text-slate-600">|</span>
                          <span className="text-slate-400">R2: <strong className="text-cyan-400">{team.round_2_score || 0}</strong></span>
                          <span className="text-slate-600">|</span>
                          <span className="text-slate-400">R3: <strong className="text-cyan-400">{team.round_3_score || 0}</strong></span>
                          <span className="text-slate-600">|</span>
                          <span className="text-slate-400">R4: <strong className="text-cyan-400">{team.round_4_score || 0}</strong></span>
                          <span className="text-slate-600">|</span>
                          <span className="text-slate-400">R5: <strong className="text-cyan-400">{team.round_5_score || 0}</strong></span>
                          <span className="text-slate-600">|</span>
                          <span className="text-slate-400">R6: <strong className="text-cyan-400">{team.round_6_score || 0}</strong></span>
                        </div>

                        {team.brownie_points ? (
                          <div className="flex items-center gap-2 bg-amber-950/40 px-2.5 py-1.5 rounded-xl border border-amber-800/80 text-xs">
                            <span className="text-amber-400 font-mono font-bold">★ +{team.brownie_points} BP</span>
                          </div>
                        ) : null}

                        <div className="bg-[#FF7A00]/15 px-3 py-1.5 rounded-xl border border-[#FF7A00]/40 text-xs">
                          <span className="text-[#FFD700] font-black text-sm">
                            {team.score || 0} pts
                          </span>
                        </div>

                        <button
                          onClick={() => handleOpenScoreModal(team)}
                          className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#0072FF] to-[#00D2FF] hover:brightness-110 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Evaluate
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: MANAGE HACKATHONS ─────────────────────────────── */}
        {activeTab === 'hackathons' && (
          <div className="space-y-8">
            <div ref={formRef} className="bg-[#0C1222] p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-6 border-b border-slate-800 gap-3">
                <div>
                  <h2 className="text-lg font-black text-white">
                    {isEditingHackathon ? `Edit Hackathon: ${hackName}` : 'Create New Hackathon'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Configure hackathon details, entry fee, poster image, or WhatsApp group link.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleQuickFillArthMantra}
                    className="py-1.5 px-3 rounded-xl border border-cyan-700/80 bg-cyan-950/60 hover:bg-cyan-900/60 text-[#00D2FF] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#00D2FF]" /> Quick Fill: Arth Mantra
                  </button>
                  {isEditingHackathon && (
                    <button
                      onClick={resetHackathonForm}
                      className="py-1.5 px-3 text-xs rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSaveHackathon} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Hackathon Name *</label>
                    <input
                      type="text"
                      value={hackName}
                      onChange={e => setHackName(e.target.value)}
                      placeholder="e.g. ARTH MANTRA HACKATHON"
                      required
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-800 bg-[#080E1C] text-white focus:outline-none focus:border-[#00D2FF]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Date & Time *</label>
                    <input
                      type="text"
                      value={hackDate}
                      onChange={e => setHackDate(e.target.value)}
                      placeholder="e.g. 13th November 2025 | 2:00 PM - 2:00 AM"
                      required
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-800 bg-[#080E1C] text-white focus:outline-none focus:border-[#00D2FF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Entry Fee per Team (₹) *</label>
                    <input
                      type="number"
                      value={hackFee}
                      onChange={e => setHackFee(Number(e.target.value))}
                      min={0}
                      required
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-800 bg-[#080E1C] text-white focus:outline-none focus:border-[#00D2FF]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Max Teams Allowed *</label>
                    <input
                      type="number"
                      value={hackMaxTeams}
                      onChange={e => setHackMaxTeams(Number(e.target.value))}
                      min={1}
                      required
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-800 bg-[#080E1C] text-white focus:outline-none focus:border-[#00D2FF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Description</label>
                  <textarea
                    value={hackDescription}
                    onChange={e => setHackDescription(e.target.value)}
                    placeholder="Strategy Meets Finance — Ideas, Analyze, Build, Invest. Hosted at PESU 52..."
                    rows={3}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-800 bg-[#080E1C] text-white focus:outline-none focus:border-[#00D2FF]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Poster Image */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Poster Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) setHackPosterFile(file)
                      }}
                      className="w-full p-2 text-xs rounded-xl border border-slate-800 bg-[#080E1C] text-slate-300 cursor-pointer"
                    />
                    {hackPosterUrl && !hackPosterFile && (
                      <div className="text-[11px] text-slate-400 mt-1 truncate">Current poster: {hackPosterUrl}</div>
                    )}
                  </div>

                  {/* WhatsApp Group Link */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      WhatsApp Group Link (revealed to approved teams)
                    </label>
                    <input
                      type="url"
                      value={hackWhatsappLink}
                      onChange={e => setHackWhatsappLink(e.target.value)}
                      placeholder="https://chat.whatsapp.com/..."
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-800 bg-[#080E1C] text-white focus:outline-none focus:border-[#00D2FF]"
                    />
                  </div>
                </div>

                {/* Active Toggle & Show Registered Teams Toggle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#080E1C] border border-slate-800">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#00D2FF]" /> Active Hackathon
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Show as the active live event on the homepage</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHackIsActive(prev => !prev)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        hackIsActive ? 'bg-[#00D2FF]' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-slate-950 transition-transform ${
                          hackIsActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#080E1C] border border-slate-800">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-cyan-400" /> Show Number of Registered Teams on Homepage
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Toggle on/off whether the team count (e.g. 12 / 50 Confirmed) is displayed on the homepage</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHackShowRegisteredTeams(prev => !prev)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        hackShowRegisteredTeams ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-slate-950 transition-transform ${
                          hackShowRegisteredTeams ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Registration Deadline (Closing Date & Time) */}
                <div className="p-4 rounded-2xl bg-[#080E1C] border border-cyan-800/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-black text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#FF7A00]" />
                        <span>Registration Deadline (Last Date & Time to Register)</span>
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Registrations will automatically close at this exact date & time. Leave empty to keep registrations open indefinitely.
                      </p>
                    </div>
                    {hackRegDeadline && (
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                        new Date(hackRegDeadline).getTime() <= Date.now()
                          ? 'bg-rose-950/80 text-rose-300 border-rose-700/80'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                      }`}>
                        {new Date(hackRegDeadline).getTime() <= Date.now() ? '🔴 Registrations Closed' : '🟢 Open Until Deadline'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="datetime-local"
                      value={hackRegDeadline}
                      onChange={e => setHackRegDeadline(e.target.value)}
                      className="p-2.5 text-xs rounded-xl border border-slate-700 bg-[#0C1222] text-white focus:outline-none focus:border-[#00D2FF] font-mono cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date()
                        now.setMinutes(now.getMinutes() - 1)
                        const pad = (n: number) => String(n).padStart(2, '0')
                        const str = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
                        setHackRegDeadline(str)
                      }}
                      className="px-3 py-2 text-xs font-bold rounded-xl border border-rose-800/80 bg-rose-950/40 hover:bg-rose-950 text-rose-300 transition-all cursor-pointer"
                    >
                      Close Registrations Now
                    </button>
                    {hackRegDeadline && (
                      <button
                        type="button"
                        onClick={() => setHackRegDeadline('')}
                        className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                      >
                        Clear Deadline (Keep Open)
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingHackathon}
                    className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#0072FF] to-[#00D2FF] text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,210,255,0.3)] cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingHackathon ? 'Saving...' : isEditingHackathon ? 'Update Hackathon' : 'Publish Hackathon'}
                  </button>
                </div>
              </form>
            </div>

            {/* List */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Existing Hackathons ({hackathonsList.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hackathonsList.map(hack => {
                  const hackRegs = registrations.filter(r => r.hackathon_id === hack.id)
                  const approvedHackRegs = hackRegs.filter(r => r.status === 'approved')
                  const isExpandedTeams = expandedHackathonTeamsId === hack.id
                  const isTeamsVisibleInListing = hack.show_registered_teams !== false

                  return (
                    <div
                      key={hack.id}
                      className={`bg-[#0C1222] p-5 rounded-2xl border ${
                        hack.is_active ? 'border-[#00D2FF] shadow-[0_0_15px_rgba(0,210,255,0.2)]' : 'border-slate-800'
                      } flex flex-col justify-between space-y-4`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                              hack.is_active ? 'bg-cyan-950/80 text-[#00D2FF] border border-cyan-800' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {hack.is_active ? 'Active on Homepage' : 'Inactive'}
                            </span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                              isTeamsVisibleInListing
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                                : 'bg-amber-950/60 text-amber-400 border-amber-800'
                            }`}>
                              Teams Count on Homepage: {isTeamsVisibleInListing ? 'Shown' : 'Hidden'}
                            </span>
                          </div>
                          <span className="text-xs font-black text-[#FF7A00]">₹{hack.entry_fee} / team</span>
                        </div>
                        <h4 className="text-base font-black text-white">{hack.name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{hack.date}</p>
                        {hack.description && (
                          <p className="text-xs text-slate-300 mt-2 line-clamp-2">{hack.description}</p>
                        )}

                        <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-[#00D2FF]" />
                          <span>
                            <strong>{approvedHackRegs.length}</strong> confirmed squads ({hackRegs.length} total submitted)
                          </span>
                        </div>
                      </div>

                      {/* Expanded registered teams list for this hackathon */}
                      {isExpandedTeams && (
                        <div className="p-3 bg-[#080E1C] rounded-xl border border-slate-800 space-y-2 text-xs">
                          <div className="font-bold text-slate-300 flex items-center justify-between">
                            <span>Registered Teams for {hack.name}</span>
                            <span className="text-[10px] text-cyan-400 font-mono">{hackRegs.length} entries</span>
                          </div>
                          {hackRegs.length === 0 ? (
                            <div className="text-[11px] text-slate-500 py-2 text-center">No registrations yet for this hackathon.</div>
                          ) : (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {hackRegs.map(r => (
                                <div key={r.id} className="p-2 bg-[#0C1222] rounded-lg border border-slate-800/80 flex items-center justify-between">
                                  <div>
                                    <div className="font-bold text-white text-[11px]">{r.team_name}</div>
                                    <div className="text-[10px] text-slate-400">
                                      {r.members?.length} members • Leader: <strong className="text-slate-200">{getAdminLeaderName(r)}</strong>
                                    </div>
                                  </div>
                                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                    r.status === 'approved'
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                      : r.status === 'rejected'
                                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                                  }`}>
                                    {r.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleHackActive(hack)}
                            className={`text-xs font-bold cursor-pointer ${
                              hack.is_active ? 'text-amber-400 hover:underline' : 'text-[#00D2FF] hover:underline'
                            }`}
                          >
                            {hack.is_active ? 'Deactivate' : 'Set Active'}
                          </button>
                          <span className="text-slate-700">|</span>
                          {/* Toggle Button for Registered Teams showing on homepage */}
                          <button
                            type="button"
                            onClick={() => handleToggleRegisteredTeamsVisibility(hack)}
                            className={`text-xs font-bold cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                              isTeamsVisibleInListing
                                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/50'
                                : 'bg-amber-950/40 border-amber-800 text-amber-300 hover:bg-amber-900/50'
                            }`}
                            title="Toggle whether the number of registered teams is shown on the homepage"
                          >
                            {isTeamsVisibleInListing ? (
                              <>
                                <Eye className="w-3.5 h-3.5" /> Teams Count: Shown (Toggle Off)
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5" /> Teams Count: Hidden (Toggle On)
                              </>
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedHackathonTeamsId(isExpandedTeams ? null : hack.id)}
                            className="py-1 px-2.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                            title="Toggle viewing registered teams in this card"
                          >
                            <Users className="w-3 h-3 text-[#00D2FF]" />
                            <span>{isExpandedTeams ? 'Hide Squads' : `Squads (${hackRegs.length})`}</span>
                          </button>
                          <button
                            onClick={() => handleEditHackathon(hack)}
                            className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 transition-all cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteHackathon(hack.id, hack.name)}
                            className="p-1.5 rounded-lg border border-rose-900/60 hover:bg-rose-950/40 text-rose-400 transition-all cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: STOCK MARKET SIMULATION CONTROLLER ──────────────────────── */}
        {activeTab === 'stock_market' && (
          <div className="space-y-6">
            {/* Header / Credential Hub Card */}
            <div className="bg-[#0C1222] p-6 sm:p-8 rounded-3xl border border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 flex items-center justify-center">
                    <Activity className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">
                      Round 3: Stock Market Simulation Credentials Hub
                    </h2>
                    <p className="text-xs text-slate-400">
                      Manage team credential reveals. All live trading bells, round duration timers, share inductions, base allocations, and live trade audits are operated exclusively from the Stock Market Terminal.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-4 bg-[#080E1C] px-5 py-3 rounded-2xl border border-slate-800 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Market Engine State</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        stockMarketState?.status === 'OPEN'
                          ? 'bg-emerald-400 animate-pulse'
                          : stockMarketState?.status === 'PAUSED'
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                    />
                    <span
                      className={`font-black font-mono text-base uppercase ${
                        stockMarketState?.status === 'OPEN'
                          ? 'text-emerald-400'
                          : stockMarketState?.status === 'PAUSED'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {stockMarketState?.status || 'OFFLINE / CLOSED'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={fetchStockMarketState}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Refresh state"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification alert banner if any */}
            {stockSyncMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{stockSyncMsg}</span>
              </div>
            )}

            {/* SEPARATE CARD: Credential Reveal & Participant Access Controller */}
            <div className="bg-[#0C1222] p-6 rounded-3xl border border-cyan-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_25px_rgba(0,210,255,0.1)]">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                  stockMarketState?.credentials_released
                    ? 'bg-emerald-950/80 border-emerald-600 text-emerald-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}>
                  {stockMarketState?.credentials_released ? <Eye className="w-6 h-6 text-emerald-400" /> : <EyeOff className="w-6 h-6 text-slate-400" />}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Participant Credentials Access
                    </h3>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                      stockMarketState?.credentials_released
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-700 animate-pulse'
                        : 'bg-rose-950 text-rose-400 border-rose-800'
                    }`}>
                      {stockMarketState?.credentials_released ? '🟢 REVEALED TO TEAMS' : '🔒 HIDDEN FROM TEAMS'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {stockMarketState?.credentials_released
                      ? 'Approved teams can currently view their Team Codes, Trader PINs, and direct trading link on their profile.'
                      : 'Credentials are currently concealed from teams. Click Reveal when ready for teams to prepare their login.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleToggleCredentials(!Boolean(stockMarketState?.credentials_released))}
                className={`py-3 px-6 rounded-2xl font-mono font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-lg ${
                  stockMarketState?.credentials_released
                    ? 'bg-rose-950/90 hover:bg-rose-900 text-rose-300 border border-rose-700 hover:shadow-rose-900/30'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-900/40'
                }`}
              >
                {stockMarketState?.credentials_released ? (
                  <>
                    <EyeOff className="w-4 h-4" /> 🔒 Hide Credentials from Teams
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" /> 🔓 Reveal Credentials to Teams
                  </>
                )}
              </button>
            </div>

            {/* Quick Launch & External Links Card */}
            <div className="bg-[#0C1222] p-6 sm:p-7 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Terminal className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Stock Market Application Portals & Command Center
                    </h3>
                    <p className="text-xs text-slate-400">
                      All live trading controls, bells, timers, inductions, capital settings, and live trade audits are operated exclusively in the Stock Market Center.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSyncTeamsToStockMarket}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
                >
                  <Database className="w-4 h-4 text-cyan-400" />
                  Sync Approved Teams to Engine
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href={`${STOCK_MARKET_URL}/admin`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col justify-between p-4 rounded-2xl bg-indigo-950/40 border border-indigo-700/60 hover:border-indigo-400 text-indigo-200 transition-all group shadow-lg shadow-indigo-950/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs uppercase text-white group-hover:text-indigo-300">
                        Stock Market Command Center →
                      </span>
                      <ExternalLink className="w-4 h-4 text-indigo-400 shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Market bells (Open/Close), 1-hr timed market, pre-scheduling, share inductions, breaking shocks, starting capital allocation, and live trade audit surveillance.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-indigo-900/40 font-mono text-[10px] text-indigo-400 font-bold uppercase">
                    Admin God Mode
                  </div>
                </a>

                <a
                  href={`${STOCK_MARKET_URL}/projector`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col justify-between p-4 rounded-2xl bg-cyan-950/40 border border-cyan-700/60 hover:border-cyan-400 text-cyan-200 transition-all group shadow-lg shadow-cyan-950/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs uppercase text-white group-hover:text-cyan-300">
                        Main Stage Projector Display →
                      </span>
                      <ExternalLink className="w-4 h-4 text-cyan-400 shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Auditorium screen with synchronized market tape, top 8 leaderboard, breaking catalysts, and audio bells.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-cyan-900/40 font-mono text-[10px] text-cyan-400 font-bold uppercase">
                    Auditorium Projector
                  </div>
                </a>

                <a
                  href={STOCK_MARKET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-700 hover:border-slate-500 text-slate-200 transition-all group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs uppercase text-white group-hover:text-cyan-300">
                        Participant Trading Floor →
                      </span>
                      <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      TradingView charts, live order books, finite float pool execution, and real-time portfolio tracker for teams.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800 font-mono text-[10px] text-slate-400 font-bold uppercase">
                    Trader View
                  </div>
                </a>
              </div>
            </div>

            {/* Approved Teams Roster Preview Table */}
            <div className="bg-[#0C1222] p-6 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    Approved Teams Trading Credentials ({registrations.filter(r => r.status === 'approved').length} Teams)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Teams copy their assigned Team Code and PIN to login on the trading platform once revealed.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#080E1C] text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Team Name</th>
                      <th className="py-2.5 px-3">Team Code</th>
                      <th className="py-2.5 px-3">Trader PIN</th>
                      <th className="py-2.5 px-3">Leader</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {registrations
                      .filter(r => r.status === 'approved')
                      .map((reg, idx) => {
                        const teamCode = `ARTH-${reg.id.slice(-4).toUpperCase()}`
                        const pin = getTeamTraderPin(reg)
                        return (
                          <tr key={reg.id} className="hover:bg-slate-900/40">
                            <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-white uppercase">{reg.team_name}</td>
                            <td className="py-2.5 px-3 font-bold text-cyan-400">{teamCode}</td>
                            <td className="py-2.5 px-3 text-slate-300">{pin}</td>
                            <td className="py-2.5 px-3 text-slate-300">
                              <div className="font-semibold text-white">{getAdminLeaderName(reg)}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{reg.leader_email}</div>
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">Authorized</td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: MANAGE ADMINS (DEV ONLY) ────────────────────────── */}
        {activeTab === 'admins' && isDev && (
          <div className="space-y-8">
            {/* Dev Superadmin Header Card */}
            <div className="bg-[#0C1222] p-6 rounded-3xl border border-cyan-500/40 shadow-[0_0_25px_rgba(0,210,255,0.15)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-800 text-[#00D2FF] flex items-center justify-center font-black">
                  <ShieldCheck className="w-6 h-6 text-[#00D2FF]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-white">Dev Admin Control Panel</h2>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-cyan-950 text-[#00D2FF] border border-cyan-800">
                      Superadmin Access
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Logged in as <strong className="text-cyan-300 font-mono">artharambachalil@gmail.com</strong>. Only you have permission to promote and remove administrators.
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 1: Registered User Accounts (Select & Promote) */}
            <div className="bg-[#0C1222] p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-5">
              <div className="flex flex-col gap-3 pb-3 border-b border-slate-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#00D2FF]" /> Platform Registered Accounts ({allProfiles.length})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Filter, sort, and manage students or organizers to grant or revoke Admin permissions.
                    </p>
                  </div>

                  {/* Search Box */}
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={e => setUserSearchQuery(e.target.value)}
                      placeholder="Search name, email, SRN, dept..."
                      className="w-full bg-[#080E1C] border border-slate-800 focus:border-[#00D2FF] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  </div>
                </div>

                {/* Filters and Sorting for People */}
                <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-[#00D2FF]" /> Sort & Filter People:
                  </span>

                  <select
                    value={profileSortBy}
                    onChange={e => setProfileSortBy(e.target.value as any)}
                    className="py-1.5 px-2.5 rounded-xl border border-slate-800 bg-[#080E1C] text-xs text-[#00D2FF] font-bold outline-none focus:border-[#00D2FF]"
                  >
                    <option value="name_asc">Sort: Name (A-Z)</option>
                    <option value="date_desc">Sort: Newest First</option>
                    <option value="dept_asc">Sort: Department (A-Z)</option>
                    <option value="sem_asc">Sort: Semester (1 to 7)</option>
                    <option value="sec_asc">Sort: Section (A to G)</option>
                  </select>

                  <select
                    value={profileDeptFilter}
                    onChange={e => setProfileDeptFilter(e.target.value)}
                    className="py-1.5 px-2.5 rounded-xl border border-slate-800 bg-[#080E1C] text-xs text-slate-200 outline-none focus:border-[#00D2FF]"
                  >
                    <option value="all">All Departments</option>
                    {PES_DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  <select
                    value={profileSemFilter}
                    onChange={e => setProfileSemFilter(e.target.value)}
                    className="py-1.5 px-2.5 rounded-xl border border-slate-800 bg-[#080E1C] text-xs text-slate-200 outline-none focus:border-[#00D2FF] font-bold"
                  >
                    <option value="all">All Semesters</option>
                    {SEMESTER_OPTIONS.map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>

                  <select
                    value={profileSecFilter}
                    onChange={e => setProfileSecFilter(e.target.value)}
                    className="py-1.5 px-2.5 rounded-xl border border-slate-800 bg-[#080E1C] text-xs text-slate-200 outline-none focus:border-[#00D2FF] font-bold"
                  >
                    <option value="all">All Sections</option>
                    {SECTION_OPTIONS.map(sec => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>

                  <select
                    value={profileResidenceFilter}
                    onChange={e => setProfileResidenceFilter(e.target.value)}
                    className="py-1.5 px-2.5 rounded-xl border border-slate-800 bg-[#080E1C] text-xs text-slate-200 outline-none focus:border-[#00D2FF] font-bold"
                  >
                    <option value="all">All Residence</option>
                    <option value="Hostelite">Hostelites</option>
                    <option value="Non-Hostelite">Non-Hostelites</option>
                  </select>

                  {(profileDeptFilter !== 'all' || profileSemFilter !== 'all' || profileSecFilter !== 'all' || profileResidenceFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setProfileDeptFilter('all')
                        setProfileSemFilter('all')
                        setProfileSecFilter('all')
                        setProfileResidenceFilter('all')
                      }}
                      className="py-1 px-2 text-[11px] text-cyan-400 hover:underline font-bold cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleExportProfilesExcel}
                    className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ml-auto"
                    title="Export filtered accounts to Excel sheet"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Export Accounts (.xlsx)
                  </button>

                  <span className="text-[11px] text-slate-400 font-semibold">
                    Showing {filteredProfiles.length} of {allProfiles.length} people
                  </span>
                </div>
              </div>

              {/* Quick Select Dropdown */}
              <div className="bg-[#080E1C] p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <span className="text-xs font-bold text-slate-300 whitespace-nowrap">Quick Promote:</span>
                <select
                  value={selectedUserToPromote}
                  onChange={e => setSelectedUserToPromote(e.target.value)}
                  className="flex-1 bg-[#0C1222] border border-slate-800 focus:border-[#00D2FF] text-xs text-slate-200 rounded-xl p-2.5 outline-none"
                >
                  <option value="">Select a registered account...</option>
                  {allProfiles
                    .filter(p => p.role !== 'admin' && p.role !== 'superadmin' && p.email?.toLowerCase() !== 'artharambachalil@gmail.com')
                    .map(p => (
                      <option key={p.id} value={p.email}>
                        {p.full_name} ({p.email}) {p.srn ? `— SRN: ${p.srn}` : ''}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedUserToPromote || isPromoting}
                  onClick={() => {
                    const target = allProfiles.find(p => p.email === selectedUserToPromote)
                    if (target) {
                      handlePromoteUser(target.email, target.full_name)
                      setSelectedUserToPromote('')
                    }
                  }}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#0072FF] to-[#00D2FF] text-slate-950 font-black text-xs uppercase tracking-wider disabled:opacity-40 cursor-pointer shadow-md flex items-center justify-center gap-1.5 transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Make Admin
                </button>
              </div>

              {/* List of Registered Accounts */}
              <div className="divide-y divide-slate-800 border border-slate-800/80 rounded-2xl overflow-hidden bg-[#080E1C]">
                {filteredProfiles.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No registered accounts found matching your search.
                  </div>
                ) : (
                  filteredProfiles.map(p => {
                    const isAccountDev = p.email?.toLowerCase() === 'artharambachalil@gmail.com'
                    const isAccountAdmin =
                      p.role === 'admin' ||
                      p.role === 'superadmin' ||
                      adminsList.some(a => a.email.toLowerCase() === p.email.toLowerCase())

                    return (
                      <div
                        key={p.id}
                        className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[#0C1427]/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                            isAccountDev
                              ? 'bg-gradient-to-br from-[#0072FF] to-[#00D2FF] text-slate-950 shadow-[0_0_10px_rgba(0,210,255,0.4)]'
                              : isAccountAdmin
                              ? 'bg-cyan-950 border border-cyan-800 text-[#00D2FF]'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {p.full_name?.substring(0, 2).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{p.full_name}</span>
                              {isAccountDev ? (
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-950 text-[#00D2FF] border border-cyan-800">
                                  Dev Superadmin
                                </span>
                              ) : isAccountAdmin ? (
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-900/40 text-cyan-300 border border-cyan-700/60">
                                  Admin / Judge
                                </span>
                              ) : (
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                                  Participant
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1">
                              <span className="font-mono text-slate-300">{p.email}</span>
                              {p.srn && <span className="font-mono text-cyan-400">SRN: {p.srn}</span>}
                              {p.phone && <span>Tel: {p.phone}</span>}
                              {p.department && (
                                <span className="text-[10px] font-bold bg-[#0C1222] border border-cyan-800/60 text-[#00D2FF] px-2 py-0.5 rounded">
                                  {p.department}
                                </span>
                              )}
                              {p.semester && (
                                <span className="text-[10px] font-bold bg-[#0C1222] border border-amber-800/60 text-amber-300 px-1.5 py-0.5 rounded">
                                  Sem {p.semester}
                                </span>
                              )}
                              {p.section && (
                                <span className="text-[10px] font-bold bg-[#0C1222] border border-emerald-800/60 text-emerald-300 px-1.5 py-0.5 rounded">
                                  Sec {p.section}
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                p.residence_type === 'Hostelite'
                                  ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                                  : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                              }`}>
                                {p.residence_type || 'Non-Hostelite'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {!isAccountDev && (
                            <button
                              type="button"
                              disabled={isResettingUserPass}
                              onClick={() => handleOpenResetModal(p.email, p.full_name)}
                              className="py-1.5 px-2.5 rounded-lg border border-cyan-800 bg-cyan-950/60 hover:bg-cyan-900/70 text-[#00D2FF] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                              title="Set a custom password or generate credentials for this user"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-[#00D2FF]" /> Reset Password
                            </button>
                          )}

                          {isAccountDev ? (
                            <span className="text-[11px] text-slate-500 font-semibold italic">Root Protected</span>
                          ) : isAccountAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleDemoteUser(p.email)}
                              className="py-1.5 px-3 rounded-lg border border-rose-900/80 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-400" /> Remove as Admin
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isPromoting}
                              onClick={() => handlePromoteUser(p.email, p.full_name)}
                              className="py-1.5 px-3.5 rounded-lg border border-cyan-800 bg-cyan-950/70 hover:bg-cyan-900 text-[#00D2FF] text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#00D2FF]" /> Make Admin
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* SECTION 2: Active Admins Summary */}
            <div className="bg-[#0C1222] p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00D2FF]" /> Current Active Administrators ({adminsList.length})
              </h3>
              <div className="divide-y divide-slate-800">
                {adminsList.map(admin => {
                  const isThisDev = admin.email.toLowerCase() === 'artharambachalil@gmail.com'

                  return (
                    <div key={admin.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          {admin.name}
                          {isThisDev && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-950 text-[#00D2FF] border border-cyan-800">
                              Dev
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{admin.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSuperAdmin && !isThisDev ? (
                          <select
                            value={admin.role}
                            onChange={async (e) => {
                              const newRole = e.target.value as UserRole;
                              try {
                                await LocalDB.updateAdminRole(admin.email, newRole);
                                showToast(`Updated ${admin.name}'s role to ${newRole}`, 'success');
                                loadData();
                              } catch (err: any) {
                                showToast('Failed to update role: ' + err.message, 'error');
                              }
                            }}
                            className="text-[10px] font-mono uppercase font-bold px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 focus:outline-none cursor-pointer"
                          >
                            <option value="admin">Admin / Judge</option>
                            <option value="market_admin">Market Controller</option>
                            <option value="superadmin">Superadmin</option>
                          </select>
                        ) : (
                          <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                            admin.role === 'superadmin'
                              ? 'bg-cyan-950/80 text-[#00D2FF] border border-cyan-800'
                              : admin.role === 'market_admin'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {admin.role === 'market_admin' ? 'Market Controller' : admin.role}
                          </span>
                        )}

                        {!isThisDev && (
                          <button
                            type="button"
                            onClick={() => handleDemoteUser(admin.email)}
                            className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer ml-2"
                          >
                            Remove Admin
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* SECTION 3: Create Admin Account with Temporary Password */}
            <div className="bg-[#0C1222] p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl">
              <h3 className="text-base font-black text-white mb-1">Create Admin Credentials Manually</h3>
              <p className="text-xs text-slate-400 mb-6">
                Generate an admin account with a temporary password for an external judge or coordinator who hasn&apos;t registered yet.
              </p>

              <form onSubmit={handleCreateAdmin} className="space-y-4 max-w-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={newAdminName}
                      onChange={e => setNewAdminName(e.target.value)}
                      required
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-800 bg-[#080E1C] text-white focus:outline-none focus:border-[#00D2FF]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={newAdminEmail}
                      onChange={e => setNewAdminEmail(e.target.value)}
                      required
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-800 bg-[#080E1C] text-white focus:outline-none focus:border-[#00D2FF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Role *</label>
                  <select
                    value={newAdminRole}
                    onChange={e => setNewAdminRole(e.target.value as UserRole)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-800 bg-[#080E1C] text-slate-200 focus:outline-none focus:border-[#00D2FF]"
                  >
                    <option value="admin">Admin / Judge (Evaluate scores & approve teams)</option>
                    <option value="market_admin">Market Controller (Manage Stock Simulation, Bells & Credentials)</option>
                    <option value="superadmin">Superadmin (Full privileges)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#0072FF] to-[#00D2FF] text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,210,255,0.3)] cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" /> Generate Admin Account
                </button>
              </form>

              {createdAdminResult && (
                <div className="mt-6 p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#00D2FF] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Admin Account Generated
                    </span>
                    <button
                      onClick={copyCredentials}
                      className="py-1 px-2.5 rounded-lg bg-cyan-900/60 border border-cyan-700 text-[#00D2FF] text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" /> {copiedCreds ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="text-xs font-mono text-slate-300 space-y-1">
                    <div>Email: <strong>{createdAdminResult.admin.email}</strong></div>
                    <div>Temporary Password: <strong>{createdAdminResult.temporaryPassword}</strong></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MODAL: EDIT TEAM SCORES ───────────────────────────────── */}
        <AnimatePresence>
          {scoringTeam && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0C1427] max-w-2xl w-full rounded-3xl p-5 sm:p-7 border border-[#FF7A00]/50 shadow-[0_0_40px_rgba(255,122,0,0.25)] relative my-8"
              >
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-[#FF7A00]" />
                      <div>
                        <span className="text-sm font-black uppercase text-white block">
                          Evaluation: {scoringTeam.team_name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          6-Round Strategic Competition Protocol
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setScoringTeam(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveScore} className="space-y-4">
                    {/* SECTION 1: 6-Round Deliverable Scores */}
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#00D2FF] mb-2 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" /> 1. The 6-Round Competition Deliverables (0–100 pts)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        <div className="bg-[#080E1C] p-2.5 rounded-xl border border-slate-800">
                          <label className="text-[10px] font-bold text-slate-300 block mb-1 truncate" title="Round 1: Problem diagnosis, root-cause, ecosystem map">
                            R1: Industry Blueprint
                          </label>
                          <input
                            type="number"
                            value={scoreR1}
                            onChange={e => {
                              const val = Number(e.target.value) || 0
                              setScoreR1(val)
                              setScoreTotal(val + scoreR2 + scoreR3 + scoreR4 + scoreR5 + scoreR6)
                            }}
                            min={0}
                            max={100}
                            className="w-full p-2 text-center text-sm font-black rounded-lg border border-slate-800 bg-[#0C1222] text-[#00D2FF] focus:outline-none focus:border-[#00D2FF]"
                          />
                        </div>

                        <div className="bg-[#080E1C] p-2.5 rounded-xl border border-slate-800">
                          <label className="text-[10px] font-bold text-slate-300 block mb-1 truncate" title="Round 2: Datasets, financial/operating analysis">
                            R2: Intelligence Drop
                          </label>
                          <input
                            type="number"
                            value={scoreR2}
                            onChange={e => {
                              const val = Number(e.target.value) || 0
                              setScoreR2(val)
                              setScoreTotal(scoreR1 + val + scoreR3 + scoreR4 + scoreR5 + scoreR6)
                            }}
                            min={0}
                            max={100}
                            className="w-full p-2 text-center text-sm font-black rounded-lg border border-slate-800 bg-[#0C1222] text-[#00D2FF] focus:outline-none focus:border-[#00D2FF]"
                          />
                        </div>

                        <div className="bg-[#080E1C] p-2.5 rounded-xl border border-slate-800">
                          <label className="text-[10px] font-bold text-slate-300 block mb-1 truncate" title="Round 3: Capital allocation plan, stock trading">
                            R3: Budget & Market
                          </label>
                          <input
                            type="number"
                            value={scoreR3}
                            onChange={e => {
                              const val = Number(e.target.value) || 0
                              setScoreR3(val)
                              setScoreTotal(scoreR1 + scoreR2 + val + scoreR4 + scoreR5 + scoreR6)
                            }}
                            min={0}
                            max={100}
                            className="w-full p-2 text-center text-sm font-black rounded-lg border border-slate-800 bg-[#0C1222] text-[#00D2FF] focus:outline-none focus:border-[#00D2FF]"
                          />
                        </div>

                        <div className="bg-[#080E1C] p-2.5 rounded-xl border border-slate-800">
                          <label className="text-[10px] font-bold text-slate-300 block mb-1 truncate" title="Round 4: Resource selection, auction bids & justification">
                            R4: Resource Auction
                          </label>
                          <input
                            type="number"
                            value={scoreR4}
                            onChange={e => {
                              const val = Number(e.target.value) || 0
                              setScoreR4(val)
                              setScoreTotal(scoreR1 + scoreR2 + scoreR3 + val + scoreR5 + scoreR6)
                            }}
                            min={0}
                            max={100}
                            className="w-full p-2 text-center text-sm font-black rounded-lg border border-slate-800 bg-[#0C1222] text-[#00D2FF] focus:outline-none focus:border-[#00D2FF]"
                          />
                        </div>

                        <div className="bg-[#080E1C] p-2.5 rounded-xl border border-slate-800">
                          <label className="text-[10px] font-bold text-slate-300 block mb-1 truncate" title="Round 5: Concealed identity deduction">
                            R5: Hidden Insider
                          </label>
                          <input
                            type="number"
                            value={scoreR5}
                            onChange={e => {
                              const val = Number(e.target.value) || 0
                              setScoreR5(val)
                              setScoreTotal(scoreR1 + scoreR2 + scoreR3 + scoreR4 + val + scoreR6)
                            }}
                            min={0}
                            max={100}
                            className="w-full p-2 text-center text-sm font-black rounded-lg border border-slate-800 bg-[#0C1222] text-[#00D2FF] focus:outline-none focus:border-[#00D2FF]"
                          />
                        </div>

                        <div className="bg-[#080E1C] p-2.5 rounded-xl border border-slate-800">
                          <label className="text-[10px] font-bold text-slate-300 block mb-1 truncate" title="Round 6: Final deck, working model, ESG, executive defense">
                            R6: Boardroom Showdown
                          </label>
                          <input
                            type="number"
                            value={scoreR6}
                            onChange={e => {
                              const val = Number(e.target.value) || 0
                              setScoreR6(val)
                              setScoreTotal(scoreR1 + scoreR2 + scoreR3 + scoreR4 + scoreR5 + val)
                            }}
                            min={0}
                            max={100}
                            className="w-full p-2 text-center text-sm font-black rounded-lg border border-slate-800 bg-[#0C1222] text-[#00D2FF] focus:outline-none focus:border-[#00D2FF]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: Bonus & Brownie Points */}
                    <div className="bg-[#080E1C] p-3.5 rounded-2xl border border-amber-900/40 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5" /> 2. Special Commendation & Bonus Points
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <label className="text-xs font-bold text-amber-400 block mb-0.5">Brownie Points:</label>
                          <span className="text-[10px] text-slate-400 block">Exceptional innovation, teamwork, or defense bonus</span>
                        </div>
                        <input
                          type="number"
                          value={browniePoints}
                          onChange={e => setBrowniePoints(Number(e.target.value) || 0)}
                          min={0}
                          className="w-24 p-2 text-center text-sm font-bold rounded-xl border border-slate-800 bg-[#0C1222] text-amber-300 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* SECTION 3: Final Score Calculation & Judge Remarks */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-300">Total Score (pts)</label>
                          <span className="text-[10px] text-slate-400">Auto-summed from 6 rounds</span>
                        </div>
                        <input
                          type="number"
                          value={scoreTotal}
                          onChange={e => setScoreTotal(Number(e.target.value) || 0)}
                          min={0}
                          className="w-full p-2 text-center text-2xl font-black rounded-xl border border-[#FF7A00]/60 bg-[#080E1C] text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FF7A00] focus:outline-none focus:border-[#FF7A00]"
                        />
                        {/* Quick adjustments */}
                        <div className="flex items-center justify-center gap-1.5 mt-2">
                          <button
                            type="button"
                            onClick={() => setScoreTotal(prev => prev + 5)}
                            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() => setScoreTotal(prev => prev + 10)}
                            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            onClick={() => setScoreTotal(prev => Math.max(0, prev - 5))}
                            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                          >
                            -5
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-300 block mb-1">Judge Remarks / Evaluation Notes</label>
                        <textarea
                          value={scoreNotes}
                          onChange={e => setScoreNotes(e.target.value)}
                          placeholder="e.g. Flawless capital allocation, robust prototype, and compelling executive defense..."
                          rows={3}
                          className="w-full p-2 text-xs rounded-xl border border-slate-800 bg-[#080E1C] text-white focus:outline-none focus:border-[#00D2FF]"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setScoringTeam(null)}
                        className="py-2.5 px-5 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingScore}
                        className="py-2.5 px-7 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FFA500] text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,122,0,0.3)] cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingScore ? 'Saving...' : 'Save & Publish Evaluation'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
        </AnimatePresence>

        {/* ── MODAL: ASSIGN PROBLEM STATEMENT TO TEAM ───────────────── */}
        <AnimatePresence>
          {psModalTeam && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0C1427] max-w-xl w-full rounded-3xl p-5 sm:p-7 border border-indigo-500/50 shadow-[0_0_40px_rgba(99,102,241,0.25)] relative my-8"
              >
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-black uppercase text-white block">
                        Assign Problem Statement: {psModalTeam.team_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Round 1 Brief • Upload Problem Statement PDF (.pdf) for this squad
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setPsModalTeam(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSavePS} className="space-y-4">
                  {/* Upload PDF Section */}
                  <div className="bg-[#080E1C] p-4 rounded-2xl border border-slate-800 space-y-2.5">
                    <label className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-400" /> Problem Statement PDF Document (.pdf) *
                      </span>
                      {psPdfUploading && <span className="text-indigo-400 text-[10px] animate-pulse">Uploading PDF...</span>}
                    </label>

                    {psPdfUrl ? (
                      <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-700/60 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="w-6 h-6 text-indigo-400 shrink-0" />
                          <div className="truncate">
                            <span className="text-xs font-mono font-bold text-indigo-200 block truncate">
                              {psPdfName || 'Problem_Statement.pdf'}
                            </span>
                            <span className="text-[10px] text-indigo-400/80 font-mono">
                              PDF ready for team assignment
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={psPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-3 rounded-lg bg-indigo-900/60 text-indigo-300 hover:text-white text-xs font-mono hover:bg-indigo-800/60 flex items-center gap-1.5 transition-all"
                          >
                            <Download className="w-3.5 h-3.5" /> Preview PDF
                          </a>
                          <button
                            type="button"
                            onClick={() => { setPsPdfUrl(''); setPsPdfName(''); }}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 transition-all cursor-pointer"
                            title="Replace / Remove PDF"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl bg-slate-900/40 cursor-pointer transition-colors group">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform mb-3">
                          <Upload className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-mono font-bold text-slate-200 group-hover:text-white">
                          Click to select and upload Problem Statement PDF (.pdf)
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1">
                          PDF will be assigned exclusively to this squad and downloadable once revealed
                        </span>
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={handleUploadPSFile}
                          disabled={psPdfUploading}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-[11px] text-indigo-300 font-mono flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>
                      <strong>Concealed by Default:</strong> Assigning saves this PDF for {psModalTeam.team_name}. It will only become visible and downloadable on their profile once &quot;Reveal All PS&quot; is activated.
                    </span>
                  </div>

                  <div className="pt-3 flex items-center justify-between border-t border-slate-800">
                    {psModalTeam.assigned_problem_statement ? (
                      <button
                        type="button"
                        onClick={handleRemovePS}
                        disabled={isSubmittingPS}
                        className="py-2.5 px-4 rounded-xl border border-rose-900/80 bg-rose-950/40 text-rose-300 text-xs font-bold hover:bg-rose-900/60 cursor-pointer transition-all"
                      >
                        Remove Assignment
                      </button>
                    ) : <div />}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPsModalTeam(null)}
                        className="py-2.5 px-4 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingPS || !psPdfUrl}
                        className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingPS ? 'Saving...' : 'Assign PDF to Team'}
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── MODAL: ASSIGN SINGLE MASTER AUCTION LIST TO ALL PARTICIPANTS ── */}
        <AnimatePresence>
          {isAuctionModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-[#0C1222] border border-purple-500/60 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                      <Gavel className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-mono font-black text-white text-base uppercase tracking-wider">
                        Assign Round 4 Auction Sheet
                      </h3>
                      <p className="text-xs text-purple-300/80 font-mono">
                        Upload 1 master auction inventory distributed to all squads
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAuctionModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveAuctionSheet} className="space-y-4">
                  {/* File Upload Box */}
                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
                      Auction Inventory File (.xlsx, .xls, .pdf, .csv, .docx)
                    </label>
                    
                    <div className="border-2 border-dashed border-purple-800/80 hover:border-purple-500 rounded-2xl p-5 text-center bg-purple-950/20 transition-colors">
                      <input
                        type="file"
                        accept=".xlsx,.xls,.pdf,.csv,.docx"
                        onChange={handleUploadAuctionFile}
                        disabled={isUploadingAuction}
                        className="hidden"
                        id="auction-sheet-upload"
                      />
                      <label htmlFor="auction-sheet-upload" className="cursor-pointer block">
                        <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2 animate-bounce" />
                        <span className="text-xs font-mono font-bold text-white block">
                          {isUploadingAuction ? 'Uploading to cloud storage...' : 'Click to select master auction sheet'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans mt-1 block">
                          Excel (.xlsx / .xls), PDF catalog, or CSV tables (Max 25MB)
                        </span>
                      </label>
                    </div>

                    {auctionFileName && (
                      <div className="mt-2.5 p-3 rounded-xl bg-purple-950/60 border border-purple-800 flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2 truncate">
                          <FileSpreadsheet className="w-4 h-4 text-purple-400 shrink-0" />
                          <span className="text-white font-bold truncate">{auctionFileName}</span>
                          {auctionFileSize && (
                            <span className="text-slate-400 text-[10px]">
                              ({Math.round(auctionFileSize / 1024)} KB)
                            </span>
                          )}
                        </div>
                        <a
                          href={auctionFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#00D2FF] hover:underline text-[11px] shrink-0"
                        >
                          Preview
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Notes / Instructions */}
                  <div>
                    <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
                      Auction Instructions / Guidelines (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={auctionNotes}
                      onChange={(e) => setAuctionNotes(e.target.value)}
                      placeholder="e.g. Starting bids for all assets are listed on Sheet 1. Review multiplier rules before bidding."
                      className="w-full bg-[#080E1C] border border-slate-800 focus:border-purple-500 rounded-xl p-3 text-xs text-white outline-none resize-none font-sans"
                    />
                  </div>

                  {/* Policy reminder */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>
                      This sheet will be assigned to <strong>all approved teams ({approvedTeams} squads)</strong> at once.
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAuctionModalOpen(false)}
                      className="py-2.5 px-4 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingAuction || isUploadingAuction || !auctionFileUrl}
                      className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingAuction ? 'Assigning to All Teams...' : 'Assign Master Auction Sheet'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── MODAL: ASSIGN DATASHEET TO TEAM (EXCEL) ────────────────── */}
        <AnimatePresence>
          {datasheetModalTeam && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0C1427] max-w-xl w-full rounded-3xl p-5 sm:p-7 border border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.25)] relative my-8"
              >
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-black uppercase text-white block">
                        Assign Datasheet: {datasheetModalTeam.team_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Round 2 Intel • Upload Excel (.xlsx, .xls, .csv) for this squad
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDatasheetModalTeam(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveDatasheet} className="space-y-4">
                  {/* Upload Excel Section */}
                  <div className="bg-[#080E1C] p-4 rounded-2xl border border-slate-800 space-y-2.5">
                    <label className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Excel Spreadsheet File (.xlsx, .xls, .csv) *
                      </span>
                      {datasheetUploading && <span className="text-emerald-400 text-[10px] animate-pulse">Uploading Excel...</span>}
                    </label>

                    {datasheetFileUrl ? (
                      <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/60 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 truncate">
                          <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                          <div className="truncate">
                            <span className="text-xs font-mono font-bold text-emerald-200 block truncate">
                              {datasheetFileName || 'Team_Datasheet.xlsx'}
                            </span>
                            <span className="text-[10px] text-emerald-400/80 font-mono">
                              File ready for team assignment
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={datasheetFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1 px-2.5 rounded-lg bg-emerald-900/60 text-emerald-300 hover:text-white text-xs font-mono hover:bg-emerald-800/60 flex items-center gap-1 transition-all"
                          >
                            <Download className="w-3.5 h-3.5" /> Preview
                          </a>
                          <button
                            type="button"
                            onClick={() => { setDatasheetFileUrl(''); setDatasheetFileName(''); }}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 transition-all cursor-pointer"
                            title="Replace / Remove File"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl bg-slate-900/40 cursor-pointer transition-colors group">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform mb-2">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-200 group-hover:text-white">
                          Click to select and upload team Excel datasheet
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">
                          Supported formats: .xlsx, .xls, .csv
                        </span>
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                          onChange={handleUploadDatasheetFile}
                          disabled={datasheetUploading}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Notes / Description */}
                  <div>
                    <label className="font-bold text-slate-300 block mb-1 text-xs font-mono">
                      Dataset Title or Operating Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={datasheetNotes}
                      onChange={e => setDatasheetNotes(e.target.value)}
                      placeholder="e.g. Q4 Audited Balance Sheets, EBITDA Schedules & Cap Table"
                      className="w-full p-2.5 rounded-xl border border-slate-800 bg-[#080E1C] text-white focus:outline-none focus:border-emerald-400 text-xs font-mono"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-[11px] text-emerald-300 font-mono flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong>Concealed by Default:</strong> Assigning saves this spreadsheet for {datasheetModalTeam.team_name}. The team can only download it once &quot;Reveal All Datasheets&quot; is activated.
                    </span>
                  </div>

                  <div className="pt-3 flex items-center justify-between border-t border-slate-800">
                    {datasheetModalTeam.assigned_datasheet ? (
                      <button
                        type="button"
                        onClick={handleRemoveDatasheet}
                        disabled={isSubmittingDatasheet}
                        className="py-2.5 px-4 rounded-xl border border-rose-900/80 bg-rose-950/40 text-rose-300 text-xs font-bold hover:bg-rose-900/60 cursor-pointer transition-all"
                      >
                        Remove Datasheet
                      </button>
                    ) : <div />}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDatasheetModalTeam(null)}
                        className="py-2.5 px-4 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingDatasheet || !datasheetFileUrl}
                        className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingDatasheet ? 'Saving...' : 'Assign Datasheet to Team'}
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── MODAL: PAYMENT SCREENSHOT PROOF ───────────────────────── */}
        <AnimatePresence>
          {selectedScreenshot && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0C1222] max-w-2xl w-full rounded-3xl p-5 border border-slate-800 shadow-2xl relative"
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase text-slate-300">Payment Screenshot Proof</span>
                  <button
                    onClick={() => setSelectedScreenshot(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="max-h-[70vh] overflow-auto flex items-center justify-center rounded-2xl bg-[#080E1C] p-2">
                  <img
                    src={selectedScreenshot}
                    alt="Payment Screenshot"
                    className="max-h-[65vh] w-auto object-contain rounded-xl shadow-md"
                  />
                </div>
                <div className="pt-3 text-right">
                  <a
                    href={selectedScreenshot}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[#00D2FF] hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open full image in new tab
                  </a>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── MODAL: SET CUSTOM PASSWORD FOR USER ─────────────────────── */}
        <AnimatePresence>
          {resetModalUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-[#0C1222] rounded-3xl p-6 sm:p-7 border border-cyan-600/60 shadow-[0_0_25px_rgba(0,210,255,0.2)] max-w-md w-full relative space-y-4"
              >
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center absolute top-5 right-5 cursor-pointer transition-all"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-950/80 border border-cyan-700/80 text-[#00D2FF] flex items-center justify-center shadow-sm">
                    <KeyRound className="w-5 h-5 text-[#00D2FF]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Set User Password</h3>
                    <p className="text-xs text-slate-400 truncate max-w-[280px]">
                      {resetModalUser.name} ({resetModalUser.email})
                    </p>
                  </div>
                </div>

                <form onSubmit={handleExecuteCustomPasswordReset} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs uppercase font-bold tracking-wider text-slate-300">
                        Custom Password
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateRandomPass}
                        className="text-[11px] font-bold text-[#00D2FF] hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> Auto-fill random
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showCustomPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={customPasswordInput}
                        onChange={e => setCustomPasswordInput(e.target.value)}
                        placeholder="Type custom password (min 6 chars)"
                        className="w-full bg-[#080E1C] border border-slate-700 focus:border-[#00D2FF] rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white placeholder-slate-500 outline-none font-mono tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCustomPassword(prev => !prev)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {showCustomPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      The user will be able to log in immediately using this password.
                    </span>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setResetModalUser(null)}
                      className="py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isResettingUserPass || customPasswordInput.trim().length < 6}
                      className="flex-1 py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#0072FF] via-[#00D2FF] to-[#38BDF8] text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,210,255,0.3)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isResettingUserPass ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Saving Password...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Set Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── MODAL: PASSWORD RESET RESULT ───────────────────────────── */}
        <AnimatePresence>
          {resetPassResult && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-[#0C1222] rounded-3xl p-6 sm:p-7 border border-emerald-600/60 shadow-[0_0_25px_rgba(16,185,129,0.2)] max-w-md w-full relative space-y-4"
              >
                <button
                  type="button"
                  onClick={() => setResetPassResult(null)}
                  className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center absolute top-5 right-5 cursor-pointer transition-all"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Password Successfully Set!</h3>
                    <p className="text-xs text-slate-400">{resetPassResult.name} ({resetPassResult.email})</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#080E1C] border border-slate-800 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Active Password</div>
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-[#0C1222] rounded-xl border border-slate-800 font-mono text-sm text-cyan-300 font-bold">
                    <span>{resetPassResult.temporaryPassword}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(resetPassResult.temporaryPassword)
                        setCopiedResetPass(true)
                        showToast('Copied password to clipboard!', 'success')
                        setTimeout(() => setCopiedResetPass(false), 2000)
                      }}
                      className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-[#00D2FF] hover:bg-cyan-900 transition-all cursor-pointer flex items-center gap-1 text-xs"
                    >
                      {copiedResetPass ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedResetPass ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Provide this password to the participant. They can sign in immediately at <strong className="text-white">arth-mantra.vercel.app/login</strong>.
                </p>

                <button
                  type="button"
                  onClick={() => setResetPassResult(null)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0072FF] to-[#00D2FF] text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  Done
                </button>
              </motion.div>
            </div>
          )}

          {/* Database Restore Modal */}
          {showPortalRestoreModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0C1222] border border-amber-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative"
              >
                <button
                  onClick={() => setShowPortalRestoreModal(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Restore Hackathon Database</h3>
                    <p className="text-xs text-slate-400">Recover registrations, teams, and scores from a JSON snapshot.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 font-mono space-y-1 mb-4">
                  <p className="font-bold">⚠️ Warning & Safeguards:</p>
                  <p>Restoring will upsert team registrations, member rosters, and evaluations from the selected backup file into the Supabase database.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-300 font-bold mb-1.5">
                      Select Backup File (.json)
                    </label>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setPortalRestoreFile(e.target.files[0])
                          setPortalRestoreError(null)
                        }
                      }}
                      className="w-full bg-[#080E1C] border border-slate-700 rounded-xl p-2.5 text-xs text-slate-300 font-mono file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-500 cursor-pointer"
                    />
                  </div>

                  {portalRestoreError && (
                    <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs font-mono">
                      {portalRestoreError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPortalRestoreModal(false)}
                      disabled={isRestoringPortal}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExecutePortalRestore}
                      disabled={isRestoringPortal || !portalRestoreFile}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-900/30 flex items-center gap-1.5"
                    >
                      {isRestoringPortal && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      <span>{isRestoringPortal ? 'Restoring System...' : 'Confirm & Restore'}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
