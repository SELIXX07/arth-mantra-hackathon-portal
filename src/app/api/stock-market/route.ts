import { NextRequest, NextResponse } from 'next/server'
import { STOCK_MARKET_URL } from '@/lib/config'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const endpoint = searchParams.get('endpoint') || '/api/market/state'
  try {
    const res = await fetch(`${STOCK_MARKET_URL}${endpoint}`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'ArthMantraPortal/1.0' },
      signal: AbortSignal.timeout(6000)
    })
    if (!res.ok) {
      return NextResponse.json({ error: `Remote returned ${res.status}` }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message, state: null }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const endpoint = searchParams.get('endpoint') || ''
  try {
    const body = await req.json().catch(() => ({}))
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    const adminSec = req.headers.get('x-admin-secret')
    if (adminSec) headers['x-admin-secret'] = adminSec
    const auth = req.headers.get('authorization')
    if (auth) headers['Authorization'] = auth

    const res = await fetch(`${STOCK_MARKET_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000)
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
