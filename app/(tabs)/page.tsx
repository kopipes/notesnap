'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import NoteList from '@/components/notes/NoteList'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function NotesTab() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  async function createNote() {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Catatan Baru' }),
      })
      if (!res.ok) throw new Error('Gagal membuat catatan')
      const note = await res.json()
      router.push(`/notes/${note.id}`)
    } catch (err) {
      console.error(err)
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center justify-between safe-top">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-none">NoteSnap</h1>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">Catatan Khotbah</p>
            </div>
          </div>
        </div>
      </header>

      {/* List */}
      <div className="flex-1 max-w-lg mx-auto w-full px-5 py-4">
        <NoteList />
      </div>

      {/* FAB */}
      <button
        onClick={createNote}
        disabled={creating}
        aria-label="Buat catatan baru"
        className="
          fixed right-5 z-20 w-14 h-14 rounded-2xl
          bg-sky-500 hover:bg-sky-600 active:bg-sky-700
          text-white shadow-xl shadow-sky-500/30
          flex items-center justify-center
          disabled:opacity-70 active:scale-95
          transition-all duration-150
        "
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {creating
          ? <LoadingSpinner size="sm" className="border-sky-200 border-t-white" />
          : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
            </svg>
        }
      </button>
    </div>
  )
}
