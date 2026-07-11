import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

interface Params { params: { id: string; versionId: string } }

// GET /api/notes/[id]/versions/[versionId] — get full content of a version
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  try {
    const version = await prisma.noteVersion.findUnique({
      where: { id: params.versionId },
      include: { note: { select: { userId: true } } },
    })
    if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    if (version.note.userId && version.note.userId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }
    return NextResponse.json(version)
  } catch (error) {
    console.error('[GET /api/notes/[id]/versions/[versionId]]', error)
    return NextResponse.json({ error: 'Failed to fetch version' }, { status: 500 })
  }
}
