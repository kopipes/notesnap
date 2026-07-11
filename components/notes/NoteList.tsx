'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import NoteCard, { type NoteCardData } from './NoteCard'
import { notesCache, categoriesCache, invalidateNotesCache, type CachedCategory, type CategoryRef } from '@/lib/notesCache'

function NoteCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-3.5 animate-pulse">
      <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded-lg w-2/3 mb-2" />
      <div className="h-2.5 bg-slate-50 dark:bg-slate-800/60 rounded w-1/4" />
    </div>
  )
}

type Category = CachedCategory
type ViewMode = 'normal' | 'archived' | 'trash'

interface NoteListProps {
  searchQuery?: string
  grid?: boolean
  view?: ViewMode
  onCountChange?: () => void
}

interface NotesResponse {
  notes: Array<NoteCardData & { categories: CategoryRef[] }>
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default function NoteList({ searchQuery = '', grid = false, view = 'normal', onCountChange }: NoteListProps) {
  const [data, setData] = useState<NotesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState<Category[]>(categoriesCache.data ?? [])
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const isFirstLoad = useRef(true)

  // Load categories — only for normal view
  useEffect(() => {
    if (view !== 'normal') return
    if (categoriesCache.data) { setCategories(categoriesCache.data); return }
    fetch('/api/categories')
      .then(r => r.json())
      .then((d: Category[]) => { categoriesCache.data = d; setCategories(d) })
      .catch(() => {})
  }, [view])

  // Reset to page 1 when search, category or view changes
  useEffect(() => { setPage(1) }, [searchQuery, activeCategoryId, view])

  const fetchNotes = useCallback((pg: number) => {
    const cacheKey = `${view}|${searchQuery}|${activeCategoryId}|${pg}`
    const cached = notesCache.get(cacheKey)
    if (cached) { setData(cached as NotesResponse); isFirstLoad.current = false }
    else if (isFirstLoad.current) setLoading(true)

    setError(null)
    const params = new URLSearchParams()
    params.set('view', view)
    if (searchQuery.trim()) params.set('q', searchQuery.trim())
    if (activeCategoryId && view === 'normal') params.set('categoryId', activeCategoryId)
    params.set('page', String(pg))

    fetch(`/api/notes?${params.toString()}`)
      .then(res => { if (!res.ok) throw new Error('Gagal memuat catatan'); return res.json() })
      .then((d: NotesResponse) => { notesCache.set(cacheKey, d); setData(d); isFirstLoad.current = false })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Terjadi kesalahan'))
      .finally(() => setLoading(false))
  }, [view, searchQuery, activeCategoryId])

  useEffect(() => { fetchNotes(page) }, [fetchNotes, page])

  // Optimistic update — apply action immediately and refetch in background
  const handleAction = useCallback(async (action: 'pin' | 'archive' | 'trash' | 'restore' | 'purge', id: string) => {
    if (action === 'purge') {
      if (!confirm('Hapus catatan ini secara permanen? Tidak bisa dikembalikan.')) return
    }

    // Optimistic remove from current view
    setData(prev => {
      if (!prev) return prev
      return { ...prev, notes: prev.notes.filter(n => n.id !== id), total: prev.total - 1 }
    })
    invalidateNotesCache()

    try {
      if (action === 'purge') {
        await fetch(`/api/notes/${id}/purge`, { method: 'DELETE' })
      } else if (action === 'restore') {
        await fetch(`/api/notes/${id}/restore`, { method: 'POST' })
      } else if (action === 'trash') {
        await fetch(`/api/notes/${id}`, { method: 'DELETE' })
      } else if (action === 'pin') {
        // Get current pinned state from data
        const note = data?.notes.find(n => n.id === id)
        await fetch(`/api/notes/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pinned: !note?.pinned }),
        })
      } else if (action === 'archive') {
        const note = data?.notes.find(n => n.id === id)
        if (note?.archived) {
          await fetch(`/api/notes/${id}/restore`, { method: 'POST' })
        } else {
          await fetch(`/api/notes/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archived: true }),
          })
        }
      }
    } catch {
      // Revert on error by refetching
    } finally {
      fetchNotes(page)
      onCountChange?.()
    }
  }, [data, page, fetchNotes, onCountChange])

  const handleCategoryFilter = useCallback((id: string | null) => {
    setActiveCategoryId(prev => prev === id ? null : id)
  }, [])

  // Refetch when tab becomes visible
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        invalidateNotesCache()
        fetchNotes(page)
        if (view === 'normal') {
          fetch('/api/categories')
            .then(r => r.json())
            .then((d: Category[]) => { categoriesCache.data = d; setCategories(d) })
            .catch(() => {})
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [view, page, fetchNotes])

  const activeCategory = categories.find(c => c.id === activeCategoryId) ?? null

  const emptyMessage = {
    normal: { title: 'Belum ada catatan', sub: 'Ketuk tombol + di bawah untuk membuat catatan pertama' },
    archived: { title: 'Arsip kosong', sub: 'Catatan yang diarsipkan akan muncul di sini' },
    trash: { title: 'Tempat sampah kosong', sub: 'Catatan yang dihapus akan muncul di sini' },
  }[view]

  return (
    <div className="space-y-3">
      {/* Category filter chips — normal view only */}
      {view === 'normal' && categories.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          <button type="button" onClick={() => setActiveCategoryId(null)}
            className={`flex-none px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${!activeCategoryId ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-sky-300'}`}>
            Semua
          </button>
          {categories.map(cat => (
            <button key={cat.id} type="button" onClick={() => handleCategoryFilter(cat.id)}
              className={`flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${activeCategoryId === cat.id ? 'text-white shadow-sm' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'}`}
              style={activeCategoryId === cat.id ? { backgroundColor: cat.color } : {}}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activeCategoryId === cat.id ? 'rgba(255,255,255,0.7)' : cat.color }} />
              {cat.name}
              {cat._count.notes > 0 && <span className={`text-[10px] ${activeCategoryId === cat.id ? 'text-white/70' : 'text-slate-400'}`}>{cat._count.notes}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Active filter label */}
      {activeCategory && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Filter: <span className="font-semibold" style={{ color: activeCategory.color }}>{activeCategory.name}</span>
          </p>
          <button type="button" onClick={() => setActiveCategoryId(null)} className="text-slate-300 dark:text-slate-600 hover:text-slate-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>
          </button>
        </div>
      )}

      {/* Notes */}
      {loading ? (
        <div className="space-y-2.5">{[1, 2, 3, 4].map(i => <NoteCardSkeleton key={i} />)}</div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Gagal memuat</p>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{error}</p>
        </div>
      ) : !data || data.total === 0 ? (
        searchQuery.trim() || activeCategoryId ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Tidak ditemukan</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
              {searchQuery.trim() ? `Tidak ada catatan yang cocok dengan "${searchQuery}"` : 'Belum ada catatan dalam kategori ini'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-slate-700 dark:text-slate-300 font-semibold text-sm">{emptyMessage.title}</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1.5 max-w-[180px] leading-relaxed">{emptyMessage.sub}</p>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className={grid ? 'grid grid-cols-2 gap-2.5' : 'space-y-2.5'}>
            {data.notes.map(note => (
              <NoteCard key={note.id} {...note} grid={grid} view={view} searchQuery={searchQuery} onAction={handleAction} />
            ))}
          </div>
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-1 pb-2">
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" /></svg>
                Sebelumnya
              </button>
              <span className="text-xs text-slate-400 dark:text-slate-500">{page} / {data.totalPages}</span>
              <button type="button" onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors">
                Berikutnya
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" /></svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
