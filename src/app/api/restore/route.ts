import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Database service not configured' }, { status: 500 })
    }

    const body = await req.json()
    if (!body) {
      return NextResponse.json({ error: 'Empty payload provided.' }, { status: 400 })
    }

    // Support both format v2.0 (data.team_registrations) and v1.0 (registrations)
    const registrations = body?.data?.team_registrations || body?.registrations || body?.data || []
    const hackathons = body?.data?.hackathons || []
    const adminUsers = body?.data?.admin_users || []

    if (!Array.isArray(registrations) || registrations.length === 0) {
      return NextResponse.json({ error: 'No valid registration records found in backup payload.' }, { status: 400 })
    }

    const supabase = createClient(url, serviceKey)

    // 1. Restore team registrations with upsert
    const { error: regErr } = await supabase
      .from('team_registrations')
      .upsert(registrations, { onConflict: 'id' })

    if (regErr) {
      console.error('Registration restore error:', regErr)
      return NextResponse.json({ error: 'Failed to restore registrations: ' + regErr.message }, { status: 500 })
    }

    // 2. Restore hackathons if present
    let restoredHackathons = 0
    if (Array.isArray(hackathons) && hackathons.length > 0) {
      const { error: hackErr } = await supabase
        .from('hackathons')
        .upsert(hackathons, { onConflict: 'id' })
      if (!hackErr) restoredHackathons = hackathons.length
    }

    // 3. Restore admin users if present
    let restoredAdmins = 0
    if (Array.isArray(adminUsers) && adminUsers.length > 0) {
      const { error: admErr } = await supabase
        .from('admin_users')
        .upsert(adminUsers, { onConflict: 'id' })
      if (!admErr) restoredAdmins = adminUsers.length
    }

    return NextResponse.json({
      success: true,
      message: `Database successfully restored! Restored ${registrations.length} team registrations.`,
      metrics: {
        restored_registrations: registrations.length,
        restored_hackathons: restoredHackathons,
        restored_admins: restoredAdmins
      }
    })
  } catch (err: any) {
    console.error('Restore endpoint error:', err)
    return NextResponse.json({ error: err?.message || 'Restore failed' }, { status: 500 })
  }
}
