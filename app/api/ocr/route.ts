import { NextRequest, NextResponse } from 'next/server'
import { ocrImage } from '@/lib/gemini'

// POST /api/ocr
// Body: {
//   image: string       — base64 JPEG, no data-URI prefix
//   translate: boolean
//   apiKey?: string     — from client settings (optional, falls back to GEMINI_API_KEY env)
//   baseUrl?: string    — custom base URL / proxy (optional)
// }
// Returns: { markdown: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { image, translate, apiKey, baseUrl } = body as {
      image?: string
      translate?: boolean
      apiKey?: string
      baseUrl?: string
    }

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: image (base64 string)' },
        { status: 400 }
      )
    }

    const markdown = await ocrImage(
      image,
      translate === true,
      apiKey,
      baseUrl
    )
    return NextResponse.json({ markdown })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'OCR processing failed'
    console.error('[POST /api/ocr]', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
