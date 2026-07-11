'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import NoteCard, { type NoteCardData } from './NoteCard'
import { notesCache, categoriesCache, invalidateNotesCache, type CachedCategory } from '@/lib/notesCache'

function NoteCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-3.5 animate-pulse">
      <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded-lg w-2/3 mb-2" />
      <div className="h-2.5 bg-slate-50 dark:bg-slate-800/60 rounded w-1/4" />
    </div>
  )
}

type Category = CachedCategory

interface NoteListProps {
  searchQuery?: string
}

interface NotesResponse {
  notes: NoteCardData[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default function NoteList({ searchQuery = '' }: NoteListProps) {
  const [data, setData] = useState<NotesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState<Category[]>(categoriesCache.data ?? [])
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const isFirstLoad = useRef(true)

  // Load categories — use cache if available
  useEffect(() => {
    if (categoriesCache.data) {
      setCategories(categoriesCache.data)
      return
    }
    fetch('/api/categories')
      .then(r => r.json())
      .then((d: Category[]) => {
        categoriesCache.data = d
        setCategories(d)
      })
      .catch(() => {})
  }, [])

  // Reset to page 1 when search or category filter changes
  useEffect(() => {
    setPage(1)
  }, [searchQuery, activeCategoryId])

  useEffect(() => {
    const cacheKey = `${searchQuery}|${activeCategoryId}|${page}`
    const cached = notesCache.get(cacheKey)

    // Show cached data immediately — no skeleton flash on back-navigation
    if (cached) {
      setData(cached as NotesResponse)
      isFirstLoad.current = false
    } else if (isFirstLoad.current) {
      setLoading(true)
    }

    setError(null)
    const params = new URLSearchParams()
    if (searchQuery.trim()) params.set('q', searchQuery.trim())
    if (activeCategoryId) params.set('categoryId', activeCategoryId)
    params.set('page', String(page))

    fetch(`/api/notes?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat catatan')
        return res.json()
      })
      .then((d: NotesResponse) => {
        notesCache.set(cacheKey, d)
        setData(d)
        isFirstLoad.current = false
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Terjadi kesalahan'))
      .finally(() => setLoading(false))
  }, [searchQuery, activeCategoryId, page])

  const handleCategoryFilter = useCallback((id: string | null) => {
    setActiveCategoryId(prev => prev === id ? null : id)
  }, [])

  // Refetch when tab becomes visible (e.g. switching back from another app)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        invalidateNotesCache()
        const params = new URLSearchParams()
        if (searchQuery.trim()) params.set('q', searchQuery.trim())
        if (activeCategoryId) params.set('categoryId', activeCategoryId)
        params.set('page', String(page))
        const cacheKey = `${searchQuery}|${activeCategoryId}|${page}`
        fetch(`/api/notes?${params.toString()}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d) { notesCache.set(cacheKey, d); setData(d) } })
          .catch(() => {})
        fetch('/api/categories')
          .then(r => r.json())
          .then((d: Category[]) => { categoriesCache.data = d; setCategories(d) })
          .catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [searchQuery, activeCategoryId, page])

  const activeCategory = categories.find(c => c.id === activeCategoryId) ?? null

  return (
    <div className="space-y-3">
      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {/* All */}
          <button
            type="button"
            onClick={() => setActiveCategoryId(null)}
            className={`flex-none px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              activeCategoryId === null
                ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-sky-300 dark:hover:border-sky-700'
            }`}
          >
            Semua
          </button>

          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryFilter(cat.id)}
              className={`flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                activeCategoryId === cat.id
                  ? 'text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
              style={activeCategoryId === cat.id ? { backgroundColor: cat.color, boxShadow: `0 1px 4px ${cat.color}55` } : {}}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: activeCategoryId === cat.id ? 'rgba(255,255,255,0.7)' : cat.color }}
              />
              {cat.name}
              {cat._count.notes > 0 && (
                <span className={`text-[10px] ${activeCategoryId === cat.id ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>
                  {cat._count.notes}
                </span>
              )}
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
          <button
            type="button"
            onClick={() => setActiveCategoryId(null)}
            className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
            aria-label="Hapus filter"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Notes */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((i) => <NoteCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-400">
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Gagal memuat</p>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{error}</p>
        </div>
      ) : !data || data.total === 0 ? (
        searchQuery.trim() || activeCategoryId ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-slate-400 dark:text-slate-500">
                <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Tidak ditemukan</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
              {searchQuery.trim()
                ? `Tidak ada catatan yang cocok dengan "${searchQuery}"`
                : `Belum ada catatan dalam kategori ini`}
            </p>
          </div>
        ) : (
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
      ) : (
        <div className="space-y-4">
          <div className="space-y-2.5">
            {data.notes.map((note) => (
              <NoteCard key={note.id} {...note} />
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-1 pb-2">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
                </svg>
                Sebelumnya
              </button>
              <span className="text-xs text-slate-400 dark:text-slate-500">{page} / {data.totalPages}</span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Berikutnya
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
