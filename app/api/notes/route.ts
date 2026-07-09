import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const PAGE_SIZE = 10

// GET /api/notes — list notes, newest first, with optional search and pagination
// ?q=search term (searches title + content)
// ?page=1 (1-indexed)
// ?limit=10 (override page size, max 1000)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
    const skip = (page - 1) * limit

    const where = q
      ? {
          OR: [
            { title: { contains: q } },
            { content: { contains: q } },
          ],
        }
      : {}

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
      prisma.note.count({ where }),
    ])

    return NextResponse.json({
      notes,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    })
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
