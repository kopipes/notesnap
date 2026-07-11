'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import NoteList from '@/components/notes/NoteList'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useTheme } from '@/components/ui/ThemeProvider'

const VIEW_KEY = 'notesnap_view'
type ListMode = 'normal' | 'archived' | 'trash'

interface NoteCounts { normal: number; archived: number; trash: number }

export default function NotesTab() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [gridView, setGridView] = useState(false)
  const [listMode, setListMode] = useState<ListMode>('normal')
  const [counts, setCounts] = useState<NoteCounts | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { dark, toggle } = useTheme()

  useEffect(() => {
    try { setGridView(localStorage.getItem(VIEW_KEY) === 'grid') } catch {}
  }, [])

  // Load counts on mount and when visibility changes
  function fetchCounts() {
    fetch('/api/notes/counts')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCounts(d) })
      .catch(() => {})
  }

  useEffect(() => {
    fetchCounts()
    function handleVisibility() { if (document.visibilityState === 'visible') fetchCounts() }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  function toggleView() {
    setGridView(prev => {
      const next = !prev
      try { localStorage.setItem(VIEW_KEY, next ? 'grid' : 'list') } catch {}
      return next
    })
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearchQuery(searchInput), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchInput])

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
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-lg mx-auto px-5 safe-top">
          {/* Title row */}
          <div className="h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shrink-0 shadow-sm shadow-sky-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                  <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
                </svg>
              </div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-50 leading-none tracking-tight">NoteSnap</h1>
            </div>

            <div className="flex items-center gap-1">
              {/* View toggle (grid/list) — only for normal */}
              {listMode === 'normal' && (
                <button type="button" onClick={toggleView}
                  aria-label={gridView ? 'Switch to list view' : 'Switch to grid view'}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  {gridView ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M2.625 6.75a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875 0A.75.75 0 018.25 6h12a.75.75 0 010 1.5h-12a.75.75 0 01-.75-.75zM2.625 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zM7.5 12a.75.75 0 01.75-.75h12a.75.75 0 010 1.5h-12A.75.75 0 017.5 12zm-4.875 5.25a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875 0a.75.75 0 01.75-.75h12a.75.75 0 010 1.5h-12a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 6a3 3 0 013-3h2.25a3 3 0 013 3v2.25a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm9.75 0a3 3 0 013-3H18a3 3 0 013 3v2.25a3 3 0 01-3 3h-2.25a3 3 0 01-3-3V6zM3 15.75a3 3 0 013-3h2.25a3 3 0 013 3V18a3 3 0 01-3 3H6a3 3 0 01-3-3v-2.25zm9.75 0a3 3 0 013-3H18a3 3 0 013 3V18a3 3 0 01-3 3h-2.25a3 3 0 01-3-3v-2.25z" clipRule="evenodd" /></svg>
                  )}
                </button>
              )}

              {/* Dark mode toggle */}
              <button type="button" onClick={toggle}
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                {dark ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.166 17.834a.75.75 0 00-1.06 1.06l1.59 1.591a.75.75 0 001.061-1.06l-1.59-1.591zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.166 6.166a.75.75 0 00-1.06 1.06l1.59 1.591a.75.75 0 001.061-1.06L6.166 6.166z" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" /></svg>
                )}
              </button>
            </div>
          </div>

          {/* View mode tabs — Normal / Arsip / Sampah */}
          <div className="flex gap-1 pb-2">
            {([['normal', 'Catatan'], ['archived', 'Arsip'], ['trash', 'Sampah']] as [ListMode, string][]).map(([mode, label]) => {
              const count = counts?.[mode]
              return (
                <button key={mode} type="button" onClick={() => { setListMode(mode); setSearchInput(''); setSearchQuery('') }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${listMode === mode ? 'bg-sky-500 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  {label}
                  {count != null && count > 0 && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${listMode === mode ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Search bar — only for normal + archived */}
          {listMode !== 'trash' && (
            <div className="pb-3">
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
                </svg>
                <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                  placeholder="Cari catatan…" aria-label="Cari catatan"
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-sky-400 dark:focus:border-sky-600 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all" />
                {searchInput && (
                  <button type="button" onClick={() => { setSearchInput(''); setSearchQuery('') }}
                    aria-label="Hapus pencarian"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-300 dark:bg-slate-600 text-white hover:bg-slate-400 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* List */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4">
        <NoteList searchQuery={searchQuery} grid={gridView && listMode === 'normal'} view={listMode} onCountChange={fetchCounts} />
      </div>

      {/* FAB — only in normal mode */}
      {listMode === 'normal' && (
        <button onClick={createNote} disabled={creating} aria-label="Buat catatan baru"
          className="fixed right-5 z-20 w-14 h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white shadow-xl shadow-sky-500/40 flex items-center justify-center disabled:opacity-70 active:scale-95 transition-all duration-150"
          style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
          {creating
            ? <LoadingSpinner size="sm" className="border-sky-200 border-t-white" />
            : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>
          }
        </button>
      )}
    </div>
  )
}
