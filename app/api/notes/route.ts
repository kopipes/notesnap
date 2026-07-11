import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

const PAGE_SIZE = 10

// GET /api/notes — list notes for current user, newest first, with optional search, category filter, and pagination
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() || ''
    const categoryId = searchParams.get('categoryId')?.trim() || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
    const skip = (page - 1) * limit

    const where = {
      userId: session.userId,
      ...(categoryId === 'uncategorized'
        ? { categoryId: null }
        : categoryId
          ? { categoryId }
          : {}),
      ...(q ? {
        OR: [
          { title: { contains: q } },
          { content: { contains: q } },
        ],
      } : {}),
    }

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
          categoryId: true,
          category: { select: { id: true, name: true, color: true } },
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

// POST /api/notes — create a new note owned by current user
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const title: string = body.title ?? 'Catatan Baru'
    const content: string = body.content ?? ''
    const categoryId: string | undefined = body.categoryId ?? undefined

    const note = await prisma.note.create({
      data: { title, content, userId: session.userId, categoryId: categoryId ?? null },
      include: { category: { select: { id: true, name: true, color: true } } },
    })
    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('[POST /api/notes]', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
