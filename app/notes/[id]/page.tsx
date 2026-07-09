'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import NoteEditor from '@/components/editor/NoteEditor'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Note {
  id: string
  title: string
  content: string
  summary: string | null
  updatedAt: string
}

export default function NotePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [note, setNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const triggerSummaryRef = useRef<(() => void) | null>(null)
  const triggerCopyNoteRef = useRef<(() => void) | null>(null)
  const [copiedNote, setCopiedNote] = useState(false)

  useEffect(() => {
    fetch(`/api/notes/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Catatan tidak ditemukan' : 'Gagal memuat')
        return res.json()
      })
      .then((data: Note) => setNote(data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Terjadi kesalahan'))
      .finally(() => setLoading(false))
  }, [params.id])

  async function handleDelete() {
    if (!note || !confirm('Hapus catatan ini?')) return
    await fetch(`/api/notes/${note.id}`, { method: 'DELETE' })
    router.push('/')
  }

  return (
    <main className="fixed inset-0 flex flex-col bg-white dark:bg-slate-950">
      {/* Top nav bar */}
      <nav className="flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm safe-top shrink-0 h-12">
        <button type="button" onClick={() => router.push('/')}
          className="flex items-center gap-1 px-2 py-1.5 -ml-1 rounded-xl text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/50 active:bg-sky-100 dark:active:bg-sky-900/50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">Catatan</span>
        </button>

        <div className="flex items-center gap-1">
          {/* Copy note button */}
          {note && (
            <button type="button"
              onClick={() => triggerCopyNoteRef.current?.()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition-colors">
              {copiedNote ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-emerald-500">
                    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                  </svg>
                  <span className="text-emerald-500">Tersalin!</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5zM4.875 6H7.5v-.375A3.375 3.375 0 0110.875 2.25h4.25A3.375 3.375 0 0118.5 5.625V6h2.625a.75.75 0 010 1.5H4.875a.75.75 0 010-1.5zM5.625 7.5c-.621 0-1.125.504-1.125 1.125v10.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V8.625c0-.621-.504-1.125-1.125-1.125H5.625z" clipRule="evenodd" />
                  </svg>
                  Salin
                </>
              )}
            </button>
          )}

          {/* Summary button */}
          {note && (
            <button type="button"
              onClick={() => triggerSummaryRef.current?.()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/50 active:bg-violet-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a3.375 3.375 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a3.375 3.375 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
              </svg>
              Ringkasan
            </button>
          )}

          {/* Delete button */}
          {note && (
            <button type="button" onClick={handleDelete} aria-label="Hapus catatan"
              className="p-2 rounded-xl text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 active:bg-red-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.499.058l.346-9z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </nav>

      <div className="flex-1 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size="md" className="border-slate-200 dark:border-slate-700 border-t-sky-500" />
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-400">
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-slate-700 dark:text-slate-300 font-medium text-sm">{error}</p>
            <button onClick={() => router.push('/')} className="text-sm text-sky-500 font-medium">Kembali</button>
          </div>
        )}
        {note && !loading && (
          <NoteEditor
            noteId={note.id}
            initialContent={note.content}
            initialTitle={note.title}
            initialSummary={note.summary}
            onSummaryTrigger={(fn) => { triggerSummaryRef.current = fn }}
            onCopyNoteTrigger={(fn) => { triggerCopyNoteRef.current = fn }}
            onNoteCopied={() => { setCopiedNote(true); setTimeout(() => setCopiedNote(false), 2500) }}
          />
        )}
      </div>
    </main>
  )
}
