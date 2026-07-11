import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

// GET /api/categories — list all categories for current user
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  try {
    const categories = await prisma.category.findMany({
      where: { userId: session.userId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { notes: true } } },
    })
    return NextResponse.json(categories)
  } catch (error) {
    console.error('[GET /api/categories]', error)
    return NextResponse.json({ error: 'Gagal memuat kategori' }, { status: 500 })
  }
}

// POST /api/categories — create a new category
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const { name, color } = body as { name?: string; color?: string }

    if (!name?.trim()) return NextResponse.json({ error: 'Nama kategori diperlukan' }, { status: 400 })
    if (name.trim().length > 50) return NextResponse.json({ error: 'Nama kategori maksimal 50 karakter' }, { status: 400 })

    const safeColor = color?.trim() || '#64748b'
    if (!HEX_COLOR.test(safeColor)) return NextResponse.json({ error: 'Warna tidak valid (gunakan format #rrggbb)' }, { status: 400 })

    const existing = await prisma.category.findUnique({
      where: { userId_name: { userId: session.userId, name: name.trim() } },
    })
    if (existing) return NextResponse.json({ error: 'Kategori sudah ada' }, { status: 409 })

    const category = await prisma.category.create({
      data: { name: name.trim(), color: safeColor, userId: session.userId },
      include: { _count: { select: { notes: true } } },
    })
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('[POST /api/categories]', error)
    return NextResponse.json({ error: 'Gagal membuat kategori' }, { status: 500 })
  }
}
