const OCR_PROMPT_EXTRACT = `You are an OCR assistant. Extract only the sermon text or bullet points visible in this image.
Ignore backgrounds, decorations, speaker names, and church logos.
Fix any typos or distortions caused by projector glare or camera angle.
Return clean, formatted Markdown. Return only the Markdown — no explanation, no preamble.`

const OCR_PROMPT_TRANSLATE = `You are an OCR and translation assistant. Extract the sermon text or bullet points from this image,
then translate them accurately into Indonesian (Bahasa Indonesia).
Ignore backgrounds, decorations, and logos. Fix glare-related distortions.
Return clean, formatted Markdown in Indonesian. Return only the Markdown — no explanation, no preamble.`

// Default model — works on ai.sumopod.com and other OpenAI-compatible Gemini proxies
const DEFAULT_MODEL = 'gemini/gemini-2.5-flash'
const DEFAULT_BASE_URL = 'https://ai.sumopod.com'

/**
 * Send a base64-encoded JPEG image for OCR using an OpenAI-compatible API.
 * Works with ai.sumopod.com and any OpenAI-compatible vision proxy.
 *
 * @param base64Image - Raw base64 string (no data URI prefix)
 * @param translate   - If true, also translate extracted text to Indonesian
 * @param apiKey      - Optional: override key (falls back to GEMINI_API_KEY env)
 * @param baseUrl     - Optional: override base URL (falls back to DEFAULT_BASE_URL)
 */
export async function ocrImage(
  base64Image: string,
  translate: boolean,
  apiKey?: string,
  baseUrl?: string
): Promise<string> {
  const key = apiKey?.trim() || process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error(
      'Gemini API key belum diatur. Buka Pengaturan untuk menambahkan kunci API.'
    )
  }

  const endpoint = (baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/$/, '')
  const prompt = translate ? OCR_PROMPT_TRANSLATE : OCR_PROMPT_EXTRACT

  const body = {
    model: DEFAULT_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 4096,
  }

  const res = await fetch(`${endpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    throw new Error(`OCR API error ${res.status}: ${errText}`)
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>
    error?: { message?: string }
  }

  if (data.error?.message) {
    throw new Error(`OCR API error: ${data.error.message}`)
  }

  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) {
    throw new Error('OCR API returned an empty response')
  }

  return text
}
