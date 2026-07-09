import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface Params {
  params: { id: string }
}

// GET /api/notes/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const note = await prisma.note.findUnique({ where: { id: params.id } })
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }
    return NextResponse.json(note)
  } catch (error) {
    console.error('[GET /api/notes/[id]]', error)
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 })
  }
}

// PATCH /api/notes/[id] — update title, content, and/or summary
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json().catch(() => ({}))
    const data: { title?: string; content?: string; summary?: string | null } = {}
    if (typeof body.title === 'string') data.title = body.title
    if (typeof body.content === 'string') data.content = body.content
    if (typeof body.summary === 'string') data.summary = body.summary
    if (body.summary === null) data.summary = null

    const note = await prisma.note.update({
      where: { id: params.id },
      data,
    })
    return NextResponse.json(note)
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }
    console.error('[PATCH /api/notes/[id]]', error)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

// DELETE /api/notes/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await prisma.note.delete({ where: { id: params.id } })
    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }
    console.error('[DELETE /api/notes/[id]]', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}
