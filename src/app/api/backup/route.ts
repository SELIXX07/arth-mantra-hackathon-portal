import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Database service not configured' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey)

    // 1. Fetch team registrations
    const { data: registrations, error: regErr } = await supabase
      .from('team_registrations')
      .select('*')
      .order('created_at', { ascending: false })

    if (regErr) {
      return NextResponse.json({ error: regErr.message }, { status: 500 })
    }

    // 2. Fetch hackathons
    const { data: hackathons } = await supabase
      .from('hackathons')
      .select('*')

    // 3. Fetch admin users
    const { data: admins } = await supabase
      .from('admin_users')
      .select('*')

    const now = new Date().toISOString()
    const backupData = {
      version: '2.0',
      system: 'arth-mantra-hackathon-portal',
      backup_timestamp: now,
      metrics: {
        total_registrations: registrations?.length || 0,
        total_hackathons: hackathons?.length || 0,
        total_admins: admins?.length || 0
      },
      data: {
        team_registrations: registrations || [],
        hackathons: hackathons || [],
        admin_users: admins || []
      },
      // Backward compatibility fields
      total_registrations: registrations?.length || 0,
      registrations: registrations || []
    }

    // Redundancy: save snapshot to Supabase storage bucket
    try {
      const timestampedFile = `backup/portal_backup_${now.replace(/[:.]/g, '-')}.json`
      const latestFile = `backup/latest_portal_backup.json`

      const payload = Buffer.from(JSON.stringify(backupData, null, 2))

      await Promise.allSettled([
        supabase.storage.from('payment-screenshots').upload(timestampedFile, payload, {
          contentType: 'application/json',
          upsert: true
        }),
        supabase.storage.from('payment-screenshots').upload(latestFile, payload, {
          contentType: 'application/json',
          upsert: true
        })
      ])
    } catch (storageErr) {
      console.warn('Could not save snapshot to storage bucket:', storageErr)
    }

    return NextResponse.json({
      success: true,
      timestamp: now,
      total_count: registrations?.length || 0,
      count: registrations?.length || 0,
      metrics: backupData.metrics,
      data: backupData.data,
      registrations: registrations || []
    })
  } catch (err: any) {
    console.error('Backup endpoint error:', err)
    return NextResponse.json({ error: err?.message || 'Backup failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
