'use client'

import Link from 'next/link'
import type { CategoryRef } from '@/lib/notesCache'

export interface NoteCardData {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  categories?: CategoryRef[]
  pinned?: boolean
  archived?: boolean
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Baru saja'
  if (diffMins < 60) return `${diffMins}m lalu`
  if (diffHours < 24) return `${diffHours}j lalu`
  if (diffDays < 7) return `${diffDays}h lalu`
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function highlight(text: string, q: string): React.ReactNode {
  if (!q.trim()) return text
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-700/60 text-inherit rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}

function CategoryBadges({ categories }: { categories: CategoryRef[] }) {
  if (!categories || categories.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {categories.map(cat => (
        <span
          key={cat.id}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
          style={{ backgroundColor: cat.color + '22', color: cat.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
          {cat.name}
        </span>
      ))}
    </div>
  )
}

interface NoteCardProps extends NoteCardData {
  grid?: boolean
  view?: 'normal' | 'archived' | 'trash'
  searchQuery?: string
  onAction?: (action: 'pin' | 'archive' | 'trash' | 'restore' | 'purge', id: string) => void
}

export default function NoteCard({ id, title, createdAt, updatedAt, deletedAt, categories = [], pinned, archived, grid, view = 'normal', searchQuery = '', onAction }: NoteCardProps) {
  function handleAction(e: React.MouseEvent, action: 'pin' | 'archive' | 'trash' | 'restore' | 'purge') {
    e.preventDefault()
    e.stopPropagation()
    onAction?.(action, id)
  }

  const isTrash = view === 'trash'
  const isArchived = view === 'archived'

  if (grid) {
    return (
      <Link
        href={isTrash ? '#' : `/notes/${id}`}
        onClick={isTrash ? (e) => e.preventDefault() : undefined}
        className={`group relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 px-3 py-3 shadow-sm hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-md transition-all duration-200 ${isTrash ? 'opacity-60 cursor-default' : ''}`}
      >
        {pinned && !isTrash && (
          <span className="absolute top-2.5 right-2.5 text-sky-400 dark:text-sky-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" />
            </svg>
          </span>
        )}
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 pr-4">
          {highlight(title || 'Catatan Tanpa Judul', searchQuery)}
        </p>
        <CategoryBadges categories={categories} />
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
            {isTrash && deletedAt ? `Dihapus ${formatRelativeTime(deletedAt)}` : formatRelativeTime(updatedAt)}
          </span>
          {!isTrash && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isArchived && (
                <button onClick={(e) => handleAction(e, 'pin')} className={`p-1.5 rounded-lg transition-colors ${pinned ? 'text-sky-500' : 'text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/50'}`} title={pinned ? 'Lepas pin' : 'Pin'}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" /></svg>
                </button>
              )}
              <button onClick={(e) => handleAction(e, 'archive')} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" title={isArchived ? 'Batalkan arsip' : 'Arsip'}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" /><path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>
              </button>
              <button onClick={(e) => handleAction(e, 'trash')} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500 transition-colors" title="Hapus">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" /></svg>
              </button>
            </div>
          )}
          {isTrash && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => handleAction(e, 'restore')} className="p-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/50 text-slate-400 hover:text-sky-500 transition-colors" title="Pulihkan">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z" clipRule="evenodd" /></svg>
              </button>
              <button onClick={(e) => handleAction(e, 'purge')} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500 transition-colors" title="Hapus permanen">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" /></svg>
              </button>
            </div>
          )}
        </div>
      </Link>
    )
  }

  // List layout
  return (
    <div className={`group relative ${isTrash ? 'opacity-60' : ''}`}>
      <Link
        href={isTrash ? '#' : `/notes/${id}`}
        onClick={isTrash ? (e) => e.preventDefault() : undefined}
        className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 px-4 py-3.5 shadow-sm hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-md transition-all duration-200"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {pinned && !isTrash && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 shrink-0 text-sky-400 dark:text-sky-500">
                  <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" />
                </svg>
              )}
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug truncate">
                {highlight(title || 'Catatan Tanpa Judul', searchQuery)}
              </p>
            </div>
            <CategoryBadges categories={categories} />
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0 mt-0.5">
            {isTrash && deletedAt ? `Dihapus ${formatRelativeTime(deletedAt)}` : formatRelativeTime(updatedAt)}
          </span>
        </div>
      </Link>
      {!isTrash && (
        <div className="absolute right-3 bottom-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isArchived && (
            <button onClick={(e) => handleAction(e, 'pin')} className={`p-1.5 rounded-lg transition-colors ${pinned ? 'text-sky-500' : 'text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/50'}`} title={pinned ? 'Lepas pin' : 'Pin'}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" /></svg>
            </button>
          )}
          <button onClick={(e) => handleAction(e, 'archive')} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" title={isArchived ? 'Batalkan arsip' : 'Arsip'}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" /><path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>
          </button>
          <button onClick={(e) => handleAction(e, 'trash')} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500 transition-colors" title="Hapus"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" /></svg></button>
        </div>
      )}
      {isTrash && (
        <div className="absolute right-3 bottom-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => handleAction(e, 'restore')} className="p-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/50 text-slate-400 hover:text-sky-500 transition-colors" title="Pulihkan"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z" clipRule="evenodd" /></svg></button>
          <button onClick={(e) => handleAction(e, 'purge')} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500 transition-colors" title="Hapus permanen"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" /></svg></button>
        </div>
      )}
    </div>
  )
}
