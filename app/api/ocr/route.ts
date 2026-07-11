import { NextRequest, NextResponse } from 'next/server'
import { ocrImage } from '@/lib/gemini'
import { getSessionFromRequest } from '@/lib/auth'

const ALLOWED_BASE_URLS = /^https?:\/\//i

// POST /api/ocr
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  try {
    const body = await request.json()

    const { image, translate, apiKey, baseUrl, model } = body as {
      image?: string
      translate?: boolean
      apiKey?: string
      baseUrl?: string
      model?: string
    }

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Missing required field: image (base64 string)' }, { status: 400 })
    }

    // Validate image size — base64 of 10MB = ~13.3MB string
    if (image.length > 14_000_000) {
      return NextResponse.json({ error: 'Gambar terlalu besar (max 10MB)' }, { status: 400 })
    }

    // Validate baseUrl to prevent SSRF
    if (baseUrl && !ALLOWED_BASE_URLS.test(baseUrl)) {
      return NextResponse.json({ error: 'baseUrl tidak valid' }, { status: 400 })
    }

    const markdown = await ocrImage(image, translate === true, apiKey, baseUrl, model)
    return NextResponse.json({ markdown })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'OCR processing failed'
    console.error('[POST /api/ocr]', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
