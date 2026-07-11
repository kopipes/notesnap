import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { summarizeNote } from '@/lib/gemini'

const ALLOWED_BASE_URLS = /^https?:\/\//i
const MAX_TEXT_LENGTH = 100_000

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  try {
    const { text, title, apiKey, baseUrl } = await req.json() as {
      text: string
      title: string
      apiKey?: string
      baseUrl?: string
    }

    if (!text?.trim()) return NextResponse.json({ error: 'Catatan kosong' }, { status: 400 })
    if (text.length > MAX_TEXT_LENGTH) return NextResponse.json({ error: 'Catatan terlalu panjang' }, { status: 400 })

    // Validate baseUrl to prevent SSRF
    if (baseUrl && !ALLOWED_BASE_URLS.test(baseUrl)) {
      return NextResponse.json({ error: 'baseUrl tidak valid' }, { status: 400 })
    }

    const summary = await summarizeNote(text, title || 'Catatan', apiKey, baseUrl)
    return NextResponse.json({ summary })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
