import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

interface Params {
  params: { id: string }
}

// GET /api/notes/[id]
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  try {
    const note = await prisma.note.findUnique({ where: { id: params.id } })
    if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

    // Allow access if owner OR legacy note (empty userId) OR admin
    if (note.userId && note.userId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    return NextResponse.json(note)
  } catch (error) {
    console.error('[GET /api/notes/[id]]', error)
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 })
  }
}

// PATCH /api/notes/[id] — update title, content, and/or summary
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  try {
    const existing = await prisma.note.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

    if (existing.userId && existing.userId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const data: { title?: string; content?: string; summary?: string | null; categoryId?: string | null; createdAt?: Date } = {}
    if (typeof body.title === 'string') data.title = body.title
    if (typeof body.content === 'string') data.content = body.content
    if (typeof body.summary === 'string') data.summary = body.summary
    if (body.summary === null) data.summary = null
    if (typeof body.categoryId === 'string') data.categoryId = body.categoryId
    if (body.categoryId === null) data.categoryId = null
    if (typeof body.createdAt === 'string') {
      const d = new Date(body.createdAt)
      if (!isNaN(d.getTime())) data.createdAt = d
    }

    const note = await prisma.note.update({
      where: { id: params.id },
      data,
      include: { category: { select: { id: true, name: true, color: true } } },
    })
    return NextResponse.json(note)
  } catch (error: unknown) {
    if (
      typeof error === 'object' && error !== null && 'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }
    console.error('[PATCH /api/notes/[id]]', error)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

// DELETE /api/notes/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  try {
    const existing = await prisma.note.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

    if (existing.userId && existing.userId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    await prisma.note.delete({ where: { id: params.id } })
    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    if (
      typeof error === 'object' && error !== null && 'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }
    console.error('[DELETE /api/notes/[id]]', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}
