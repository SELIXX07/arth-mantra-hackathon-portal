import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false }
  })
}

let cache: { [key: string]: { timestamp: number; data: any } } = {}

const resolveLeaderName = (raw: any, members: any[]): string => {
  if (Array.isArray(members) && members.length > 0) {
    if (raw.leader_email) {
      const match = members.find(
        (m: any) => m?.email && m.email.trim().toLowerCase() === raw.leader_email.trim().toLowerCase()
      )
      if (match?.name && typeof match.name === 'string' && match.name.trim()) {
        return match.name.trim()
      }
    }
    if (members[0]?.name && typeof members[0].name === 'string' && members[0].name.trim()) {
      return members[0].name.trim()
    }
  }

  if (raw.leader_name && typeof raw.leader_name === 'string' && raw.leader_name.trim()) {
    return raw.leader_name.trim()
  }

  if (raw.leader_email && typeof raw.leader_email === 'string') {
    const rawName = raw.leader_email.split('@')[0].replace(/[._0-9]/g, ' ').trim()
    if (rawName) {
      return rawName
        .split(' ')
        .filter(Boolean)
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
    }
  }

  return 'Team Leader'
}

const parseRow = (raw: any) => {
  let members: any[] = []
  try {
    members = Array.isArray(raw.members)
      ? raw.members
      : (typeof raw.members === 'string' ? JSON.parse(raw.members) : [])
  } catch {
    members = []
  }

  const leader_name = resolveLeaderName(raw, members)

  return {
    ...raw,
    members,
    leader_name
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const hackathonId = searchParams.get('hackathonId')
    const leaderEmail = searchParams.get('leaderEmail')
    const leaderUserId = searchParams.get('leaderUserId')
    const id = searchParams.get('id')

    const cacheKey = req.url
    const cached = cache[cacheKey]
    if (cached && Date.now() - cached.timestamp < 3000) {
      return NextResponse.json(cached.data, {
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      })
    }

    let query = supabase.from('team_registrations').select('*').limit(200)

    if (id) {
      query = query.eq('id', id)
      const { data, error } = await query.single()
      if (error) return NextResponse.json({ error: error.message }, { status: 404 })
      return NextResponse.json({ success: true, registration: parseRow(data) })
    }

    if (hackathonId && hackathonId !== 'all') {
      query = query.eq('hackathon_id', hackathonId)
    }

    if (leaderEmail || leaderUserId) {
      const filters: string[] = []
      if (leaderEmail) filters.push(`leader_email.ilike.${leaderEmail.trim()}`)
      if (leaderUserId) filters.push(`leader_user_id.eq.${leaderUserId.trim()}`)
      query = query.or(filters.join(','))
    }

    const { data, error } = await query

    if (error) {
      console.error('[API /api/registrations GET error]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const sorted = (data || []).sort((a, b) => {
      const tA = new Date(a.created_at || 0).getTime()
      const tB = new Date(b.created_at || 0).getTime()
      return tB - tA
    })

    const registrations = sorted.map(parseRow)

    const responseData = {
      success: true,
      count: registrations.length,
      registrations
    }

    cache[cacheKey] = { timestamp: Date.now(), data: responseData }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    })
  } catch (err: any) {
    console.error('[API /api/registrations GET exception]:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Registration ID required' }, { status: 400 })
    }

    const { error } = await supabase.from('team_registrations').delete().eq('id', id)
    if (error) {
      console.error('[API /api/registrations DELETE error]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    cache = {}

    return NextResponse.json({ success: true, message: `Registration ${id} deleted` })
  } catch (err: any) {
    console.error('[API /api/registrations DELETE exception]:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 })
    }

    const body = await req.json()
    const {
      id,
      status,
      rejection_comment,
      reviewed_by,
      score,
      round_1_score,
      round_2_score,
      round_3_score,
      round_4_score,
      round_5_score,
      round_6_score,
      ic_starting,
      ic_stock_trades,
      ic_auction_spent,
      ic_r5_wager,
      ic_r5_result,
      ic_balance,
      brownie_points,
      judge_notes
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Registration ID required' }, { status: 400 })
    }

    const payload: any = {
      updated_at: new Date().toISOString()
    }
    if (status) payload.status = status
    if (rejection_comment !== undefined) payload.rejection_comment = rejection_comment
    if (reviewed_by) {
      payload.reviewed_by = reviewed_by
      payload.reviewed_at = new Date().toISOString()
    }
    if (score !== undefined) payload.score = Number(score) || 0
    if (round_1_score !== undefined) payload.round_1_score = Number(round_1_score) || 0
    if (round_2_score !== undefined) payload.round_2_score = Number(round_2_score) || 0
    if (round_3_score !== undefined) payload.round_3_score = Number(round_3_score) || 0
    if (round_4_score !== undefined) payload.round_4_score = Number(round_4_score) || 0
    if (round_5_score !== undefined) payload.round_5_score = Number(round_5_score) || 0
    if (round_6_score !== undefined) payload.round_6_score = Number(round_6_score) || 0
    if (ic_starting !== undefined) payload.ic_starting = Number(ic_starting) || 10000
    if (ic_stock_trades !== undefined) payload.ic_stock_trades = Number(ic_stock_trades) || 0
    if (ic_auction_spent !== undefined) payload.ic_auction_spent = Number(ic_auction_spent) || 0
    if (ic_r5_wager !== undefined) payload.ic_r5_wager = Number(ic_r5_wager) || 0
    if (ic_r5_result !== undefined) payload.ic_r5_result = ic_r5_result
    if (ic_balance !== undefined) payload.ic_balance = Number(ic_balance) || 0
    if (brownie_points !== undefined) payload.brownie_points = Number(brownie_points) || 0
    if (judge_notes !== undefined) payload.judge_notes = judge_notes
    if (body.members !== undefined) payload.members = body.members

    const { data, error } = await supabase
      .from('team_registrations')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[API /api/registrations PATCH error]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    cache = {}

    return NextResponse.json({ success: true, registration: parseRow(data) })
  } catch (err: any) {
    console.error('[API /api/registrations PATCH exception]:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
