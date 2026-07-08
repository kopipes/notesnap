import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/notes/by-date?date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const dateStr = searchParams.get('date')

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: 'date param required (YYYY-MM-DD)' }, { status: 400 })
  }

  // Build day range in UTC
  const start = new Date(`${dateStr}T00:00:00.000Z`)
  const end = new Date(`${dateStr}T23:59:59.999Z`)

  try {
    const notes = await prisma.note.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    })
    return NextResponse.json(notes)
  } catch (error) {
    console.error('[GET /api/notes/by-date]', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}
