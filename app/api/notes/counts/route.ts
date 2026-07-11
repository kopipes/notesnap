import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/notes/counts — returns { normal, archived, trash } counts for current user
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  try {
    const [normal, archived, trash] = await Promise.all([
      prisma.note.count({ where: { userId: session.userId, deletedAt: null, archived: false } }),
      prisma.note.count({ where: { userId: session.userId, deletedAt: null, archived: true } }),
      prisma.note.count({ where: { userId: session.userId, deletedAt: { not: null } } }),
    ])
    return NextResponse.json({ normal, archived, trash })
  } catch (error) {
    console.error('[GET /api/notes/counts]', error)
    return NextResponse.json({ error: 'Failed to fetch counts' }, { status: 500 })
  }
}
