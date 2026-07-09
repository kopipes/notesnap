const OCR_PROMPT_EXTRACT = `You are an OCR assistant. Extract only the sermon text or bullet points visible in this image.
Ignore backgrounds, decorations, speaker names, and church logos.
Fix any typos or distortions caused by projector glare or camera angle.
Return plain text only. Do NOT use Markdown formatting — no asterisks, no hashes, no bullet symbols.
Each line or point on its own line. Return only the text — no explanation, no preamble.`

const OCR_PROMPT_TRANSLATE = `You are an OCR and translation assistant. Extract the sermon text or bullet points from this image,
then translate them accurately into Indonesian (Bahasa Indonesia).
Ignore backgrounds, decorations, and logos. Fix glare-related distortions.
Return plain text only. Do NOT use Markdown formatting — no asterisks, no hashes, no bullet symbols.
Each line or point on its own line. Return only the text — no explanation, no preamble.`

const SUMMARY_PROMPT = `Kamu adalah asisten cerdas, ramah, dan profesional yang bertugas merapikan catatan ibadah atau seminar.
Tugasmu adalah mengubah catatan mentah menjadi rangkuman yang enak dibaca, tidak kaku, dan penuh manfaat.

PANDUAN GAYA BAHASA:
- Bersahabat & Hangat: Gunakan nada yang merangkul, layaknya teman diskusi yang suportif.
- Profesional & Jelas: Susun kalimat dengan tata bahasa Indonesia modern yang rapi dan lugas.
- Tidak Kaku: Hindari gaya bahasa akademis yang membosankan. Buat alurnya mengalir natural.
- Bermanfaat: Pastikan setiap poin mudah dicerna dan bisa langsung diterapkan.

PENTING — KELENGKAPAN ISI:
- Baca seluruh catatan secara menyeluruh sebelum mulai merangkum.
- SETIAP topik, heading, sub-judul, atau bagian utama yang ada di catatan WAJIB dibahas dalam ringkasan. Jangan ada yang terlewat.
- Jika catatan memiliki beberapa bagian bernama (misal: "THE GIFT OF COMMUNITY", "Point 1", "Bagian 2", dll.), pastikan setiap bagian tersebut tercermin di Poin Penting.
- Jumlah poin tidak dibatasi — tulis sebanyak yang diperlukan agar semua isi catatan tersampaikan. Lebih baik detail daripada melewatkan informasi penting.

PENTING — VERIFIKASI AYAT ALKITAB:
Gunakan pengetahuanmu tentang Alkitab Terjemahan Baru (TB) Indonesia untuk memverifikasi setiap ayat yang disebut dalam catatan.
- Jika isi ayat dalam catatan sudah benar atau mendekati benar → salin persis seperti di catatan.
- Jika isi ayat dalam catatan salah, tidak lengkap, atau hasil OCR yang cacat → KOREKSI dengan teks TB yang benar.
- Jika catatan hanya menyebut referensi tanpa isi ayat (misal: "Yohanes 3:16") → tulis isi ayat TB yang lengkap.
- Selalu sertakan referensi lengkap dalam tanda kurung di akhir setiap ayat, contoh: (Yohanes 3:16).
- JANGAN singkat, JANGAN parafrase, JANGAN potong isi ayat.

FORMAT OUTPUT — ikuti persis struktur ini, gunakan "===" sebagai pemisah antar bagian:

===JUDUL===
Tulis judul singkat yang menarik dan hangat (maksimal 6 kata).

===PESAN UTAMA===
Tulis 1-2 kalimat padat yang merangkum inti catatan dengan gaya bersahabat dan menginspirasi.

===POIN PENTING===
Tulis semua poin yang diperlukan untuk mencakup SELURUH isi catatan — tidak ada batas maksimum. Gunakan penomoran. Jika catatan memiliki bagian/heading, kelompokkan poin sesuai bagian tersebut dengan sub-judul yang jelas. Setiap poin ditulis dengan bahasa luwes, profesional, dan mudah dicerna.

===AYAT REFERENSI===
Jika ada ayat, tulis setiap ayat lengkap (sudah diverifikasi/dikoreksi) diikuti referensi dalam tanda kurung. Satu ayat per baris. Jika tidak ada ayat, tulis: (tidak ada ayat yang dikutip)

===LANGKAH PRAKTIS===
Tulis 1 tindakan nyata yang bisa langsung diaplikasikan minggu ini, dengan nada menyemangati.`

// Default model for OCR — works on ai.sumopod.com and other OpenAI-compatible Gemini proxies
// Can be overridden per-request via the model parameter
const DEFAULT_MODEL = 'gemini/gemini-2.5-flash-lite'
const SUMMARY_MODEL = 'gemini/gemini-2.5-flash'
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
  baseUrl?: string,
  modelOverride?: string
): Promise<string> {
  const key = apiKey?.trim() || process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error(
      'Gemini API key belum diatur. Buka Pengaturan untuk menambahkan kunci API.'
    )
  }

  const endpoint = (baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/$/, '')
  const prompt = translate ? OCR_PROMPT_TRANSLATE : OCR_PROMPT_EXTRACT
  const model = modelOverride?.trim() || DEFAULT_MODEL

  const body = {
    model,
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
    max_tokens: 512,
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

/**
 * Summarize sermon notes using an OpenAI-compatible API.
 *
 * @param noteText  - Plain text content of the note
 * @param title     - Title of the note
 * @param apiKey    - Optional: override key (falls back to GEMINI_API_KEY env)
 * @param baseUrl   - Optional: override base URL
 */
export async function summarizeNote(
  noteText: string,
  title: string,
  apiKey?: string,
  baseUrl?: string,
): Promise<string> {
  const key = apiKey?.trim() || process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error(
      'Gemini API key belum diatur. Buka Pengaturan untuk menambahkan kunci API.'
    )
  }

  const endpoint = (baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/$/, '')

  const userMessage = `Judul: ${title}\n\nCatatan:\n${noteText}`

  const body = {
    model: SUMMARY_MODEL,
    messages: [
      { role: 'system', content: SUMMARY_PROMPT },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 8192,
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
    throw new Error(`Summary API error ${res.status}: ${errText}`)
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>
    error?: { message?: string }
  }

  if (data.error?.message) {
    throw new Error(`Summary API error: ${data.error.message}`)
  }

  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) {
    throw new Error('Summary API returned an empty response')
  }

  return text
}

