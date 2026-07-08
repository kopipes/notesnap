import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

interface Params { params: { id: string } }

// PATCH /api/users/[id] — change password (admin, or own account)
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  // Only admin can edit others; any user can edit their own password
  const isSelf = session.userId === params.id
  if (!isSelf && session.role !== 'admin') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { password, role } = body as { password?: string; role?: string }

    const data: { password?: string; role?: string } = {}

    if (password !== undefined) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
      }
      data.password = await bcrypt.hash(password, 12)
    }

    // Only admin can change roles, and cannot demote themselves
    if (role !== undefined && session.role === 'admin' && !isSelf) {
      data.role = role === 'admin' ? 'admin' : 'user'
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Tidak ada data yang diperbarui' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, username: true, role: true },
    })
    return NextResponse.json(user)
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error &&
      (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 })
    }
    console.error('[PATCH /api/users/[id]]', error)
    return NextResponse.json({ error: 'Gagal memperbarui pengguna' }, { status: 500 })
  }
}

// DELETE /api/users/[id] — delete user (admin only, cannot delete self)
export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  if (session.userId === params.id) {
    return NextResponse.json({ error: 'Tidak dapat menghapus akun sendiri' }, { status: 400 })
  }

  try {
    await prisma.user.delete({ where: { id: params.id } })
    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error &&
      (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 })
    }
    console.error('[DELETE /api/users/[id]]', error)
    return NextResponse.json({ error: 'Gagal menghapus pengguna' }, { status: 500 })
  }
}
