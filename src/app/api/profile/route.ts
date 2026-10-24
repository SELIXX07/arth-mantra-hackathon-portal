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

const isUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

// GET: Fetch real-time profile, role, and admin verification
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    const userId = searchParams.get('userId')

    if (!email && !userId) {
      return NextResponse.json({ error: 'Email or User ID is required' }, { status: 400 })
    }

    const cleanEmail = (email || '').trim().toLowerCase()

    // 1. Check admin_users table first
    let adminRecord: any = null
    if (cleanEmail) {
      const { data } = await supabase
        .from('admin_users')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle()
      adminRecord = data
    }

    // 2. Fetch profile from profiles table
    let profileRecord: any = null
    if (cleanEmail) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle()
      profileRecord = data
    } else if (userId && isUUID(userId)) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      profileRecord = data
    }

    const isDev = cleanEmail === 'artharambachalil@gmail.com'
    const determinedRole = isDev
      ? 'superadmin'
      : (adminRecord?.role || profileRecord?.role || 'participant')
    const isAdmin = determinedRole === 'admin' || determinedRole === 'superadmin' || isDev

    // If role in profiles table is out of sync with admin_users, synchronize it automatically!
    if (adminRecord && profileRecord && profileRecord.role !== determinedRole) {
      await supabase
        .from('profiles')
        .update({ role: determinedRole })
        .eq('id', profileRecord.id)
    }

    return NextResponse.json({
      success: true,
      role: determinedRole,
      isAdmin,
      isSuperAdmin: determinedRole === 'superadmin' || isDev,
      profile: profileRecord || {
        email: cleanEmail,
        role: determinedRole,
        full_name: adminRecord?.name || cleanEmail.split('@')[0]
      }
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 })
    }

    const body = await req.json()
    const { userId, email, full_name, phone, srn, department, semester, section, residence_type } = body

    if (!email && !userId) {
      return NextResponse.json({ error: 'Email or User ID is required' }, { status: 400 })
    }

    const cleanEmail = (email || '').trim().toLowerCase()
    const updatePayload: Record<string, any> = {
      full_name: (full_name || '').trim(),
      phone: (phone || '').trim() || null,
      srn: (srn || '').trim().toUpperCase() || null,
      department: (department || '').trim() || null,
      semester: (semester || '').trim() || null,
      section: (section || '').trim().toUpperCase() || null,
      residence_type: (residence_type || '').trim() || null,
      updated_at: new Date().toISOString()
    }

    // Also update auth.users metadata if auth user is found
    try {
      const { data: usersData } = await supabase.auth.admin.listUsers()
      const matched = usersData?.users?.find(u => u.email?.toLowerCase() === cleanEmail || u.id === userId)
      if (matched) {
        await supabase.auth.admin.updateUserById(matched.id, {
          user_metadata: {
            ...matched.user_metadata,
            full_name: updatePayload.full_name,
            phone: updatePayload.phone,
            srn: updatePayload.srn,
            department: updatePayload.department,
            semester: updatePayload.semester,
            section: updatePayload.section,
            residence_type: updatePayload.residence_type
          }
        })
      }
    } catch (_) {}

    // 1. If email is provided, check if user exists in profiles by email
    let existingProfile: any = null
    if (cleanEmail) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle()
      existingProfile = data
    }

    // 2. If not found by email and userId is a valid UUID, search by id
    if (!existingProfile && userId && isUUID(userId)) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      existingProfile = data
    }

    let savedProfile: any = null

    if (existingProfile) {
      // Update existing record
      const { data, error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', existingProfile.id)
        .select()
        .single()

      if (error) {
        // Fallback without new columns if not yet migrated in Postgres
        const safeUpdate = {
          full_name: updatePayload.full_name,
          phone: updatePayload.phone,
          srn: updatePayload.srn,
          updated_at: updatePayload.updated_at
        }
        const { data: safeData } = await supabase
          .from('profiles')
          .update(safeUpdate)
          .eq('id', existingProfile.id)
          .select()
          .single()
        savedProfile = safeData
      } else {
        savedProfile = data
      }
    } else {
      // Create profile row if it doesn't exist yet
      let authUserId = userId && isUUID(userId) ? userId : null

      if (!authUserId && cleanEmail) {
        try {
          const { data: usersData } = await supabase.auth.admin.listUsers()
          const matchedAuth = usersData?.users?.find(u => u.email?.toLowerCase() === cleanEmail)
          if (matchedAuth) authUserId = matchedAuth.id
        } catch (_) {}
      }

      if (authUserId) {
        const fullInsert = {
          id: authUserId,
          email: cleanEmail,
          role: cleanEmail === 'artharambachalil@gmail.com' ? 'superadmin' : 'participant',
          ...updatePayload,
          created_at: new Date().toISOString()
        }

        const { data, error } = await supabase
          .from('profiles')
          .insert([fullInsert])
          .select()
          .single()

        if (error) {
          const safeInsert = {
            id: authUserId,
            email: cleanEmail,
            role: cleanEmail === 'artharambachalil@gmail.com' ? 'superadmin' : 'participant',
            full_name: updatePayload.full_name,
            phone: updatePayload.phone,
            srn: updatePayload.srn,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          const { data: safeData } = await supabase
            .from('profiles')
            .insert([safeInsert])
            .select()
            .single()
          savedProfile = safeData
        } else {
          savedProfile = data
        }
      }
    }

    // 3. Also update admin_users table if user is an admin
    if (cleanEmail) {
      try {
        await supabase
          .from('admin_users')
          .update({ name: (full_name || '').trim() })
          .eq('email', cleanEmail)
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      profile: {
        ...(savedProfile || {}),
        id: userId,
        email: cleanEmail,
        full_name: updatePayload.full_name,
        phone: updatePayload.phone,
        srn: updatePayload.srn,
        department: updatePayload.department,
        semester: updatePayload.semester,
        section: updatePayload.section
      }
    })
  } catch (err: any) {
    console.error('Profile API error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to update profile' }, { status: 500 })
  }
}
