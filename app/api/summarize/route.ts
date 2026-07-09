import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { summarizeNote } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { text, title, apiKey, baseUrl } = await req.json() as {
      text: string
      title: string
      apiKey?: string
      baseUrl?: string
    }

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Catatan kosong' }, { status: 400 })
    }

    const summary = await summarizeNote(text, title || 'Catatan', apiKey, baseUrl)
    return NextResponse.json({ summary })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
