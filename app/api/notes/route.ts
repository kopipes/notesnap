import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/notes
// ?q=         — search title+content
// ?categoryId= — filter by category (any-match) or 'uncategorized'
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

    const where: Record<string, unknown> = {
      userId: session.userId,
      ...viewFilter,
      ...(q ? {
        OR: [
          { title: { contains: q } },
          { content: { contains: q } },
        ],
      } : {}),
    }

    // Category filter via join table
    if (categoryId === 'uncategorized') {
      where.categories = { none: {} }
    } else if (categoryId) {
      where.categories = { some: { categoryId } }
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
          pinned: true,
          archived: true,
          categories: {
            select: {
              category: { select: { id: true, name: true, color: true } },
            },
          },
        },
      }),
      prisma.note.count({ where }),
    ])

    // Auto-purge trash older than 30 days (fire-and-forget)
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    prisma.note.deleteMany({ where: { userId: session.userId, deletedAt: { not: null, lt: cutoff } } }).catch(() => {})

    // Flatten categories for the client
    const notesFlat = notes.map(n => ({
      ...n,
      categories: n.categories.map(nc => nc.category),
    }))

    return NextResponse.json({ notes: notesFlat, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) })
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
    const categoryIds: string[] = Array.isArray(body.categoryIds) ? body.categoryIds : []

    // Validate ownership — all supplied IDs must belong to this user
    if (categoryIds.length > 0) {
      const owned = await prisma.category.count({
        where: { id: { in: categoryIds }, userId: session.userId },
      })
      if (owned !== categoryIds.length) {
        return NextResponse.json({ error: 'Kategori tidak valid' }, { status: 400 })
      }
    }

    const note = await prisma.note.create({
      data: {
        title,
        content,
        userId: session.userId,
        categories: categoryIds.length > 0
          ? { create: categoryIds.map((cid: string) => ({ categoryId: cid })) }
          : undefined,
      },
      include: {
        categories: {
          select: { category: { select: { id: true, name: true, color: true } } },
        },
      },
    })

    return NextResponse.json({
      ...note,
      categories: note.categories.map(nc => nc.category),
      categoryIds: note.categories.map(nc => nc.category.id),
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/notes]', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
