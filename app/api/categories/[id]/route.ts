import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

interface Params { params: { id: string } }

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

// PATCH /api/categories/[id] — rename or recolor
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  try {
    const existing = await prisma.category.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 })
    if (existing.userId !== session.userId) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const data: { name?: string; color?: string } = {}

    if (typeof body.name === 'string') {
      const trimmed = body.name.trim()
      if (!trimmed) return NextResponse.json({ error: 'Nama tidak boleh kosong' }, { status: 400 })
      if (trimmed.length > 50) return NextResponse.json({ error: 'Nama maksimal 50 karakter' }, { status: 400 })
      data.name = trimmed
    }
    if (typeof body.color === 'string') {
      const trimmed = body.color.trim()
      if (!HEX_COLOR.test(trimmed)) return NextResponse.json({ error: 'Warna tidak valid (gunakan format #rrggbb)' }, { status: 400 })
      data.color = trimmed
    }

    if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Tidak ada perubahan' }, { status: 400 })

    const category = await prisma.category.update({
      where: { id: params.id },
      data,
      include: { _count: { select: { notes: true } } },
    })
    return NextResponse.json(category)
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error &&
      (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 })
    }
    console.error('[PATCH /api/categories/[id]]', error)
    return NextResponse.json({ error: 'Gagal memperbarui kategori' }, { status: 500 })
  }
}

// DELETE /api/categories/[id] — delete category (notes become uncategorized)
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  try {
    const existing = await prisma.category.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 })
    if (existing.userId !== session.userId) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

    await prisma.category.delete({ where: { id: params.id } })
    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error &&
      (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 })
    }
    console.error('[DELETE /api/categories/[id]]', error)
    return NextResponse.json({ error: 'Gagal menghapus kategori' }, { status: 500 })
  }
}
