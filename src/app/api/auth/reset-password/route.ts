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
    const { action, email, newPassword } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()

    // Action 1: Send recovery email
    if (action === 'send_email') {
      const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://arth-mantra.vercel.app'
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${origin}/reset-password`
      })
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ success: true, message: 'Password recovery email sent successfully' })
    }

    // Action 2: Admin direct password reset
    if (action === 'admin_reset') {
      // Find user by email in Supabase auth
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      })

      if (listError) {
        return NextResponse.json({ error: listError.message }, { status: 500 })
      }

      const targetUser = usersData.users.find(u => u.email?.toLowerCase() === cleanEmail)
      if (!targetUser) {
        return NextResponse.json({ error: `User with email ${cleanEmail} not found in authentication system` }, { status: 404 })
      }

      // Generate temporary password if not provided
      const tempPass = newPassword || `Arth${Math.floor(100000 + Math.random() * 900000)}!`

      const { error: updateError } = await supabase.auth.admin.updateUserById(targetUser.id, {
        password: tempPass
      })

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // Also set must_reset_password in profiles table if possible
      try {
        await supabase.from('profiles').update({ must_reset_password: true }).eq('id', targetUser.id)
      } catch (_) {}

      return NextResponse.json({
        success: true,
        temporaryPassword: tempPass,
        message: `Password reset successfully for ${cleanEmail}`
      })
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
