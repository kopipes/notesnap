'use client'

import { useState } from 'react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface AyatDialogProps {
  onClose: () => void
  onInsert: (text: string, reference: string) => void
}

// Parse input like "Yohanes 3:16" or "Yohanes 3:16-18"
function parseReference(input: string): {
  book: string
  chapter: number
  verse: number
  verseEnd?: number
} | null {
  const trimmed = input.trim()
  // Match: "BookName Chapter:Verse" or "BookName Chapter:VerseStart-VerseEnd"
  const match = trimmed.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/)
  if (!match) return null
  return {
    book: match[1].trim(),
    chapter: parseInt(match[2], 10),
    verse: parseInt(match[3], 10),
    verseEnd: match[4] ? parseInt(match[4], 10) : undefined,
  }
}

export default function AyatDialog({ onClose, onInsert }: AyatDialogProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ text: string; reference: string } | null>(null)

  async function handleSearch() {
    const parsed = parseReference(query)
    if (!parsed) {
      setError('Format: "Nama Kitab Pasal:Ayat" — contoh: Yohanes 3:16')
      return
    }

    setLoading(true)
    setError(null)
    setPreview(null)

    try {
      const params = new URLSearchParams({
        book: parsed.book,
        chapter: String(parsed.chapter),
        verse: String(parsed.verse),
      })
      if (parsed.verseEnd) params.set('verseEnd', String(parsed.verseEnd))

      const res = await fetch(`/api/bible?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Ayat tidak ditemukan')
        return
      }

      if (data.verses) {
        // Range response
        const combined = (data.verses as { text: string; verse: number }[])
          .map((v) => `${v.verse}. ${v.text}`)
          .join(' ')
        const ref = `${parsed.book} ${parsed.chapter}:${parsed.verse}-${parsed.verseEnd}`
        setPreview({ text: combined, reference: ref })
      } else {
        setPreview({
          text: data.verse.text,
          reference: `${data.verse.book} ${data.verse.chapter}:${data.verse.verse}`,
        })
      }
    } catch {
      setError('Gagal mengambil ayat. Periksa koneksi.')
    } finally {
      setLoading(false)
    }
  }

  function handleInsert() {
    if (!preview) return
    onInsert(preview.text, preview.reference)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 z-10">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
          Cari Ayat Alkitab
        </h2>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="cth: Yohanes 3:16 atau Roma 8:28-30"
            className="
              flex-1 rounded-xl border border-gray-300 dark:border-gray-700
              bg-white dark:bg-gray-800 px-3 py-2.5 text-sm
              text-gray-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-brand-500
            "
            autoFocus
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="
              px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium
              hover:bg-brand-600 active:bg-brand-700
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            "
          >
            {loading ? <LoadingSpinner size="sm" className="border-white border-t-transparent" /> : 'Cari'}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-500 dark:text-red-400 mb-3">{error}</p>
        )}

        {preview && (
          <div className="mb-4 rounded-xl border-l-4 border-brand-500 bg-blue-50 dark:bg-blue-950/30 px-4 py-3">
            <p className="text-sm italic text-gray-700 dark:text-gray-300 mb-1">
              {preview.text}
            </p>
            <cite className="text-xs font-semibold text-brand-600 dark:text-brand-400 not-italic">
              {preview.reference}
            </cite>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Batal
          </button>
          {preview && (
            <button
              type="button"
              onClick={handleInsert}
              className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
            >
              Sisipkan
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
