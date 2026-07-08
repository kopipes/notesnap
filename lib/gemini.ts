import { GoogleGenerativeAI, Part } from '@google/generative-ai'

const OCR_PROMPT_EXTRACT = `You are an OCR assistant. Extract only the sermon text or bullet points visible in this image.
Ignore backgrounds, decorations, speaker names, and church logos.
Fix any typos or distortions caused by projector glare or camera angle.
Return clean, formatted Markdown. Return only the Markdown — no explanation, no preamble.`

const OCR_PROMPT_TRANSLATE = `You are an OCR and translation assistant. Extract the sermon text or bullet points from this image,
then translate them accurately into Indonesian (Bahasa Indonesia).
Ignore backgrounds, decorations, and logos. Fix glare-related distortions.
Return clean, formatted Markdown in Indonesian. Return only the Markdown — no explanation, no preamble.`

/**
 * Build a Gemini client using the provided key, falling back to the env var.
 * Optionally accepts a custom base URL for proxy/custom endpoint support.
 */
function getClient(apiKey?: string): GoogleGenerativeAI {
  const key = apiKey?.trim() || process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error(
      'Gemini API key belum diatur. Buka Pengaturan untuk menambahkan kunci API.'
    )
  }
  return new GoogleGenerativeAI(key)
}

/**
 * Send a base64-encoded JPEG image to Gemini 2.5 Flash for OCR.
 * @param base64Image - Raw base64 string (no data URI prefix)
 * @param translate   - If true, also translate extracted text to Indonesian
 * @param apiKey      - Optional: override key from settings (falls back to env)
 * @param baseUrl     - Optional: custom base URL / proxy endpoint
 */
export async function ocrImage(
  base64Image: string,
  translate: boolean,
  apiKey?: string,
  baseUrl?: string
): Promise<string> {
  const client = getClient(apiKey)
  // Pass custom baseUrl via request options if provided
  const requestOptions = baseUrl?.trim() ? { baseUrl: baseUrl.trim() } : undefined
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' }, requestOptions)

  const prompt = translate ? OCR_PROMPT_TRANSLATE : OCR_PROMPT_EXTRACT

  const imagePart: Part = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image,
    },
  }

  const result = await model.generateContent([prompt, imagePart])
  const response = result.response
  const text = response.text()

  if (!text) {
    throw new Error('Gemini returned an empty response')
  }

  return text.trim()
}
