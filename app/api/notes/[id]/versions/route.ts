import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

interface Params { params: { id: string } }

const MAX_VERSIONS = 10 // keep at most 10 versions per note

// GET /api/notes/[id]/versions — list versions (newest first)
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  try {
    const note = await prisma.note.findUnique({ where: { id: params.id }, select: { userId: true } })
    if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    if (note.userId && note.userId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const versions = await prisma.noteVersion.findMany({
      where: { noteId: params.id },
      orderBy: { createdAt: 'desc' },
      take: MAX_VERSIONS,
      select: { id: true, title: true, label: true, createdAt: true },
    })
    return NextResponse.json(versions)
  } catch (error) {
    console.error('[GET /api/notes/[id]/versions]', error)
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 })
  }
}

// POST /api/notes/[id]/versions — save a snapshot
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  try {
    const note = await prisma.note.findUnique({
      where: { id: params.id },
      select: { userId: true, title: true, content: true },
    })
    if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    if (note.userId && note.userId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const label: string = body.label ?? 'Disimpan otomatis'

    // Skip if content is empty
    if (!note.content || note.content === '' || note.content === '{}') {
      return NextResponse.json({ skipped: true })
    }

    // Skip if content is identical to the most recent version
    const lastVersion = await prisma.noteVersion.findFirst({
      where: { noteId: params.id },
      orderBy: { createdAt: 'desc' },
      select: { content: true },
    })
    if (lastVersion && lastVersion.content === note.content) {
      return NextResponse.json({ skipped: true })
    }

    const version = await prisma.noteVersion.create({
      data: {
        noteId: params.id,
        title: note.title,
        content: note.content,
        label,
      },
    })

    // Prune old versions — keep only MAX_VERSIONS newest
    const allVersions = await prisma.noteVersion.findMany({
      where: { noteId: params.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })
    if (allVersions.length > MAX_VERSIONS) {
      const toDelete = allVersions.slice(MAX_VERSIONS).map(v => v.id)
      await prisma.noteVersion.deleteMany({ where: { id: { in: toDelete } } })
    }

    return NextResponse.json(version, { status: 201 })
  } catch (error) {
    console.error('[POST /api/notes/[id]/versions]', error)
    return NextResponse.json({ error: 'Failed to save version' }, { status: 500 })
  }
}
