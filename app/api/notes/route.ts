import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/notes
// ?q=         — search title+content
// ?categoryId= — filter by category (or 'uncategorized')
// ?view=       — 'normal' (default) | 'archived' | 'trash'
// ?page=, ?limit=
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() || ''
    const categoryId = searchParams.get('categoryId')?.trim() || ''
    const view = searchParams.get('view') || 'normal' // normal | archived | trash
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
    const skip = (page - 1) * limit

    // Base filter by view
    const viewFilter =
      view === 'trash'
        ? { deletedAt: { not: null } }
        : view === 'archived'
          ? { deletedAt: null, archived: true }
          : { deletedAt: null, archived: false } // normal: exclude deleted and archived

    const where = {
      userId: session.userId,
      ...viewFilter,
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

    // Pinned notes first, then by createdAt desc (only for normal view)
    const orderBy = view === 'normal'
      ? [{ pinned: 'desc' as const }, { createdAt: 'desc' as const }]
      : [{ createdAt: 'desc' as const }]

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          createdAt: true,
          deletedAt: true,
          categoryId: true,
          pinned: true,
          archived: true,
          category: { select: { id: true, name: true, color: true } },
        },
      }),
      prisma.note.count({ where }),
    ])

    // Auto-purge trash older than 30 days (fire-and-forget)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    prisma.note.deleteMany({
      where: { userId: session.userId, deletedAt: { not: null, lt: thirtyDaysAgo } },
    }).catch(() => {})

    return NextResponse.json({ notes, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('[GET /api/notes]', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

// POST /api/notes — create a new note
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
