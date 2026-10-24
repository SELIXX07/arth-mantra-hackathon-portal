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

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 })
    }

    const body = await req.json()
    const { email, password, fullName, phone, srn, department, semester, section, residence_type } = body

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanFullName = fullName.trim()
    const cleanPhone = (phone || '').trim() || null
    const cleanSrn = (srn || '').trim().toUpperCase() || null
    const cleanDept = (department || '').trim() || null
    const cleanSem = (semester || '').trim() || null
    const cleanSec = (section || '').trim().toUpperCase() || null
    const cleanResidence = (residence_type || '').trim() || 'Non-Hostelite'

    let userId: string | null = null

    const metaData = {
      full_name: cleanFullName,
      phone: cleanPhone,
      srn: cleanSrn,
      department: cleanDept,
      semester: cleanSem,
      section: cleanSec,
      residence_type: cleanResidence
    }

    // 1. Try to create the user with admin API (automatically confirms email!)
    try {
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true,
        user_metadata: metaData
      })

      if (createError) {
        // If user already exists in auth, try to find their ID
        if (createError.message?.toLowerCase().includes('already registered')) {
          const { data: listData } = await supabase.auth.admin.listUsers()
          const existing = listData?.users?.find(u => u.email?.toLowerCase() === cleanEmail)
          if (existing) {
            userId = existing.id
            // Update password if they are registering
            await supabase.auth.admin.updateUserById(existing.id, {
              password: password,
              email_confirm: true,
              user_metadata: metaData
            })
          } else {
            return NextResponse.json({ error: 'An account with this email already exists. Please log in.' }, { status: 400 })
          }
        } else {
          return NextResponse.json({ error: createError.message }, { status: 400 })
        }
      } else if (createData?.user) {
        userId = createData.user.id
      }
    } catch (adminAuthErr: any) {
      console.warn('admin.createUser failed, trying fallback:', adminAuthErr?.message)
    }

    // 2. Fallback: if userId still null, try regular signUp
    if (!userId) {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: metaData
        }
      })
      if (signUpErr) {
        return NextResponse.json({ error: signUpErr.message }, { status: 400 })
      }
      userId = signUpData?.user?.id || null
    }

    if (!userId) {
      return NextResponse.json({ error: 'Failed to create user account. Please try again.' }, { status: 500 })
    }

    // 3. Upsert into public.profiles
    const isDev = cleanEmail === 'artharambachalil@gmail.com'

    // Check if user was pre-authorized as admin in admin_users
    let preAuthRole: string | null = null
    try {
      const { data: preAuthAdmin } = await supabase
        .from('admin_users')
        .select('role')
        .ilike('email', cleanEmail)
        .maybeSingle()
      if (preAuthAdmin?.role) {
        preAuthRole = preAuthAdmin.role
      }
    } catch (_) {}

    const assignedRole = isDev ? 'superadmin' : (preAuthRole || 'participant')

    const fullPayload = {
      id: userId,
      email: cleanEmail,
      full_name: cleanFullName,
      phone: cleanPhone,
      srn: cleanSrn,
      department: cleanDept,
      semester: cleanSem,
      section: cleanSec,
      residence_type: cleanResidence,
      role: assignedRole,
      must_reset_password: false,
      updated_at: new Date().toISOString()
    }

    // Try with new columns
    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert(fullPayload, { onConflict: 'id' })

    if (profileErr) {
      // If column doesn't exist yet, insert without department/semester/section/residence_type
      const safePayload = {
        id: userId,
        email: cleanEmail,
        full_name: cleanFullName,
        phone: cleanPhone,
        srn: cleanSrn,
        role: assignedRole,
        must_reset_password: false,
        updated_at: new Date().toISOString()
      }
      await supabase.from('profiles').upsert(safePayload, { onConflict: 'id' })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: cleanEmail,
        full_name: cleanFullName,
        phone: cleanPhone || undefined,
        srn: cleanSrn || undefined,
        department: cleanDept || undefined,
        semester: cleanSem || undefined,
        section: cleanSec || undefined,
        residence_type: cleanResidence,
        role: isDev ? 'superadmin' : 'participant'
      }
    })
  } catch (err: any) {
    console.error('Registration API error:', err)
    return NextResponse.json({ error: err?.message || 'Server error during registration' }, { status: 500 })
  }
}
