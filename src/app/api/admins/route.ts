import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DEV_EMAIL = 'artharambachalil@gmail.com'

const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false }
  })
}

// GET: fetch all registered profiles and active admins
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database service not configured' }, { status: 500 })
    }

    const [profilesRes, adminsRes, authUsersRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('admin_users').select('*').order('created_at', { ascending: true }),
      supabase.auth.admin.listUsers().catch(() => ({ data: { users: [] } }))
    ])

    const authUsers = authUsersRes.data?.users || []
    const rawProfiles = profilesRes.data || []

    const mergedProfiles = rawProfiles.map((p: any) => {
      const match = authUsers.find(u => u.email?.toLowerCase() === p.email?.toLowerCase() || u.id === p.id)
      const meta = match?.user_metadata || {}
      return {
        ...p,
        phone: p.phone || meta.phone,
        srn: p.srn || meta.srn,
        department: p.department || meta.department,
        semester: p.semester || meta.semester,
        section: p.section || meta.section,
        residence_type: p.residence_type || meta.residence_type || 'Non-Hostelite'
      }
    })

    // Also include any auth users not yet in profiles table
    authUsers.forEach(u => {
      if (u.email && !mergedProfiles.some(p => p.email.toLowerCase() === u.email!.toLowerCase())) {
        const meta = u.user_metadata || {}
        mergedProfiles.push({
          id: u.id,
          email: u.email,
          full_name: meta.full_name || u.email.split('@')[0],
          phone: meta.phone,
          srn: meta.srn,
          department: meta.department,
          semester: meta.semester,
          section: meta.section,
          residence_type: meta.residence_type || 'Non-Hostelite',
          role: u.email === DEV_EMAIL ? 'superadmin' : 'participant',
          created_at: u.created_at
        })
      }
    })

    return NextResponse.json({
      success: true,
      profiles: mergedProfiles,
      admins: adminsRes.data || []
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

// POST: Promote user to Admin or Demote/Remove admin
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database service not configured' }, { status: 500 })
    }

    const body = await req.json()
    const { action, email, role = 'admin', name, requesterEmail } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()

    // Enforce Admin / Dev permissions
    let isAuthorized = false
    const cleanRequester = (requesterEmail || '').trim().toLowerCase()
    if (!cleanRequester || cleanRequester === DEV_EMAIL) {
      isAuthorized = true
    } else {
      const { data: reqAdmin } = await supabase
        .from('admin_users')
        .select('role')
        .ilike('email', cleanRequester)
        .maybeSingle()
      if (reqAdmin) {
        isAuthorized = true
      }
    }
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized: Only administrators can manage admin accounts.' }, { status: 403 })
    }

    // PROMOTE USER TO ADMIN
    if (action === 'promote') {
      const assignedRole = role === 'superadmin' ? 'superadmin' : 'admin'

      // 1. Update profiles table (case-insensitive email matching)
      const { data: profile } = await supabase
        .from('profiles')
        .update({ role: assignedRole })
        .ilike('email', cleanEmail)
        .select()
        .maybeSingle()

      const adminName = name || profile?.full_name || cleanEmail.split('@')[0]

      // 2. Check if already in admin_users
      const { data: existingAdmin } = await supabase
        .from('admin_users')
        .select('id')
        .ilike('email', cleanEmail)
        .maybeSingle()

      if (existingAdmin) {
        await supabase
          .from('admin_users')
          .update({ role: assignedRole, name: adminName })
          .ilike('email', cleanEmail)
      } else {
        await supabase
          .from('admin_users')
          .insert([{
            id: 'admin-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            email: cleanEmail,
            name: adminName,
            role: assignedRole,
            added_by: cleanRequester || DEV_EMAIL,
            first_login_pending: false,
            created_at: new Date().toISOString()
          }])
      }

      return NextResponse.json({
        success: true,
        message: `${adminName} has been granted Admin privileges.`
      })
    }

    // DEMOTE / REMOVE ADMIN ACCESS
    if (action === 'demote') {
      if (cleanEmail === DEV_EMAIL) {
        return NextResponse.json({ error: 'Cannot remove the Dev account from admin privileges.' }, { status: 400 })
      }

      // 1. Revert role in profiles to participant
      await supabase
        .from('profiles')
        .update({ role: 'participant' })
        .ilike('email', cleanEmail)

      // 2. Remove from admin_users
      await supabase
        .from('admin_users')
        .delete()
        .ilike('email', cleanEmail)

      return NextResponse.json({
        success: true,
        message: `${cleanEmail} has been demoted to regular participant.`
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
