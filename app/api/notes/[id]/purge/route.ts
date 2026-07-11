import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

interface Params { params: { id: string } }

// DELETE /api/notes/[id]/purge — permanently delete a note from trash
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  try {
    const existing = await prisma.note.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

    if (existing.userId && existing.userId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    if (!existing.deletedAt) {
      return NextResponse.json({ error: 'Catatan harus di tempat sampah dulu' }, { status: 400 })
    }

    await prisma.note.delete({ where: { id: params.id } })
    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error &&
      (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }
    console.error('[DELETE /api/notes/[id]/purge]', error)
    return NextResponse.json({ error: 'Failed to purge note' }, { status: 500 })
  }
}
