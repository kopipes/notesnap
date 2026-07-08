import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/users — list all users (admin only)
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, username: true, role: true, createdAt: true },
  })
  return NextResponse.json(users)
}

// POST /api/users — create a new user (admin only)
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

  try {
    const body = await request.json().catch(() => ({}))
    const { username, password, role } = body as {
      username?: string
      password?: string
      role?: string
    }

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password diperlukan' }, { status: 400 })
    }
    if (username.length < 3) {
      return NextResponse.json({ error: 'Username minimal 3 karakter' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 })
    }

    const hash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        username,
        password: hash,
        role: role === 'admin' ? 'admin' : 'user',
      },
      select: { id: true, username: true, role: true, createdAt: true },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('[POST /api/users]', error)
    return NextResponse.json({ error: 'Gagal membuat pengguna' }, { status: 500 })
  }
}
