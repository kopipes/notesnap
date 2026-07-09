import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/notes — list all notes, newest first
export async function GET() {
  try {
    const notes = await prisma.note.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        createdAt: true,
        // Omit full content for list view performance
      },
    })
    return NextResponse.json(notes)
  } catch (error) {
    console.error('[GET /api/notes]', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

// POST /api/notes — create a new note
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const title: string = body.title ?? 'Catatan Baru'
    const content: string = body.content ?? ''

    const note = await prisma.note.create({
      data: { title, content },
    })
    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('[POST /api/notes]', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
