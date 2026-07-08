import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createSession, sessionCookieOptions } from '@/lib/auth'

// POST /api/auth/login
// Body: { username: string, password: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { username, password } = body as { username?: string; password?: string }

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan password diperlukan' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) {
      // Consistent timing to prevent user enumeration
      await bcrypt.compare(password, '$2b$12$invalidhashfortimingattackprevention')
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }

    const token = await createSession({
      userId: user.id,
      username: user.username,
      role: user.role,
    })

    const res = NextResponse.json({
      user: { id: user.id, username: user.username, role: user.role },
    })
    res.cookies.set(sessionCookieOptions(token))
    return res
  } catch (error) {
    console.error('[POST /api/auth/login]', error)
    return NextResponse.json({ error: 'Login gagal' }, { status: 500 })
  }
}
