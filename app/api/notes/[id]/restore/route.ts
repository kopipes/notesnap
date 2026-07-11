import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

interface Params { params: { id: string } }

// POST /api/notes/[id]/restore — restore from trash or archive
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  try {
    const existing = await prisma.note.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

    if (existing.userId && existing.userId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const note = await prisma.note.update({
      where: { id: params.id },
      data: { deletedAt: null, archived: false },
    })
    return NextResponse.json(note)
  } catch (error) {
    console.error('[POST /api/notes/[id]/restore]', error)
    return NextResponse.json({ error: 'Failed to restore note' }, { status: 500 })
  }
}
