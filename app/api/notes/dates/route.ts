import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/notes/dates?month=YYYY-MM
// Returns array of date strings (YYYY-MM-DD) that have at least one note
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month param required (YYYY-MM)' }, { status: 400 })
  }

  const [year, mon] = month.split('-').map(Number)
  const start = new Date(Date.UTC(year, mon - 1, 1))
  const end = new Date(Date.UTC(year, mon, 1))

  try {
    const notes = await prisma.note.findMany({
      where: {
        userId: session.userId,
        createdAt: { gte: start, lt: end },
      },
      select: { createdAt: true },
    })

    // Return unique YYYY-MM-DD strings in UTC
    const dates = Array.from(new Set(
      notes.map(n => n.createdAt.toISOString().slice(0, 10))
    ))
    return NextResponse.json(dates)
  } catch (error) {
    console.error('[GET /api/notes/dates]', error)
    return NextResponse.json({ error: 'Failed to fetch dates' }, { status: 500 })
  }
}
