import { NextResponse } from 'next/server'
import { clearCookieOptions } from '@/lib/auth'

// POST /api/auth/logout
export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(clearCookieOptions())
  return res
}
