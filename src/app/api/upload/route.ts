import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function extractFilePathFromUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null
  const bucketMarker = '/payment-screenshots/'
  const idx = fileUrl.indexOf(bucketMarker)
  if (idx !== -1) {
    const after = fileUrl.substring(idx + bucketMarker.length)
    return decodeURIComponent(after.split('?')[0])
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const oldUrl = formData.get('oldUrl') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Cloud storage service not configured' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey)

    // If an old screenshot URL is provided for replacement, delete it
    if (oldUrl) {
      const oldPath = extractFilePathFromUrl(oldUrl)
      if (oldPath) {
        try {
          const { error: delErr } = await supabase.storage
            .from('payment-screenshots')
            .remove([oldPath])
          if (delErr) {
            console.warn('Old screenshot removal warning:', delErr)
          }
        } catch (delEx) {
          console.warn('Old file removal exception:', delEx)
        }
      }
    }

    const fileExt = file.name.split('.').pop() || 'bin'
    const fileName = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { data, error } = await supabase.storage
      .from('payment-screenshots')
      .upload(fileName, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('payment-screenshots')
      .getPublicUrl(fileName)

    return NextResponse.json({ url: publicUrl, path: data.path })
  } catch (err: any) {
    console.error('Upload endpoint error:', err)
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const fileUrl = body?.url
    if (!fileUrl) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Cloud storage service not configured' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey)
    const oldPath = extractFilePathFromUrl(fileUrl)
    if (oldPath) {
      const { error } = await supabase.storage
        .from('payment-screenshots')
        .remove([oldPath])
      if (error) {
        console.warn('Storage deletion error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, deleted: oldPath })
  } catch (err: any) {
    console.error('Delete endpoint error:', err)
    return NextResponse.json({ error: err?.message || 'Delete failed' }, { status: 500 })
  }
}
