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
    const { data: registrations, error: fetchErr } = await supabase
      .from('team_registrations')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    const now = new Date().toISOString()
    const backupData = {
      backup_timestamp: now,
      total_registrations: registrations.length,
      registrations
    }

    try {
      const fileName = `backup/team_registrations_backup_${now.replace(/[:.]/g, '-')}.json`
      await supabase.storage
        .from('payment-screenshots')
        .upload(fileName, Buffer.from(JSON.stringify(backupData, null, 2)), {
          contentType: 'application/json',
          upsert: true
        })
    } catch (storageErr) {
      console.warn('Could not save snapshot to storage bucket:', storageErr)
    }

    return NextResponse.json({
      success: true,
      timestamp: now,
      total_count: registrations.length,
      count: registrations.length,
      data: registrations
    })
  } catch (err: any) {
    console.error('Backup endpoint error:', err)
    return NextResponse.json({ error: err?.message || 'Backup failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
