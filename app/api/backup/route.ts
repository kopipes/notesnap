import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { readFile } from 'fs/promises'
import path from 'path'

// GET /api/backup — download the SQLite database file (admin only)
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

  try {
    const dbUrl = process.env.DATABASE_URL ?? 'file:./dev.db'
    const dbPath = dbUrl.replace('file:', '')
    const absolutePath = path.isAbsolute(dbPath)
      ? dbPath
      : path.join(process.cwd(), 'prisma', dbPath)

    const fileBuffer = await readFile(absolutePath)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `notesnap-backup-${timestamp}.db`

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(fileBuffer.length),
      },
    })
  } catch (error) {
    console.error('[GET /api/backup]', error)
    return NextResponse.json({ error: 'Gagal membuat backup' }, { status: 500 })
  }
}
