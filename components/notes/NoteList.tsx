'use client'

import { useEffect, useState } from 'react'
import NoteCard, { type NoteCardData } from './NoteCard'

function NoteCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-3.5 animate-pulse">
      <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded-lg w-2/3 mb-2" />
      <div className="h-2.5 bg-slate-50 dark:bg-slate-800/60 rounded w-1/4" />
    </div>
  )
}

export default function NoteList() {
  const [notes, setNotes] = useState<NoteCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/notes')
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat catatan')
        return res.json()
      })
      .then((data: NoteCardData[]) => setNotes(data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Terjadi kesalahan'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-2.5">
        {[1, 2, 3, 4].map((i) => <NoteCardSkeleton key={i} />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-400">
            <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Gagal memuat</p>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{error}</p>
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-3xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-sky-300 dark:text-sky-700">
            <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
          </svg>
        </div>
        <p className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Belum ada catatan</p>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1.5 max-w-[180px] leading-relaxed">
          Ketuk tombol + di bawah untuk membuat catatan pertama
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {notes.map((note) => (
        <NoteCard key={note.id} {...note} />
      ))}
    </div>
  )
}
