'use client'

import Link from 'next/link'

export interface NoteCardData {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  categoryId?: string | null
  category?: { id: string; name: string; color: string } | null
  pinned?: boolean
  archived?: boolean
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
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

interface NoteCardProps extends NoteCardData {
  grid?: boolean
  view?: 'normal' | 'archived' | 'trash'
  searchQuery?: string
  onAction?: (action: 'pin' | 'archive' | 'trash' | 'restore' | 'purge', id: string) => void
}

export default function NoteCard({ id, title, createdAt, updatedAt, deletedAt, category, pinned, archived, grid, view = 'normal', searchQuery = '', onAction }: NoteCardProps) {
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
        className={`group relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 px-3 py-3 shadow-sm hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-md active:scale-[0.97] transition-all duration-150 min-h-[80px] ${isTrash ? 'cursor-default opacity-75' : ''}`}
      >
        {pinned && !isTrash && <span className="absolute top-2 right-2 text-amber-400"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" /></svg></span>}
        {category && (
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md self-start mb-1.5" style={{ backgroundColor: category.color + '22', color: category.color }}>
            <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
            {category.name}
          </span>
        )}
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-xs leading-snug line-clamp-3 flex-1">
          {highlight(title || 'Catatan Tanpa Judul', searchQuery)}
        </h2>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">{formatDate(createdAt)}</p>
        {/* Action buttons — bottom-right corner, away from card tap area */}
        {onAction && (
          <div className="absolute bottom-2 right-2 rounded-2xl bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2 py-1.5">
            {isTrash ? (
              <>
                <button onClick={(e) => handleAction(e, 'restore')} className="p-1.5 bg-white/20 hover:bg-emerald-500 rounded-lg text-white transition-colors" title="Pulihkan"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z" clipRule="evenodd" /></svg></button>
                <button onClick={(e) => handleAction(e, 'purge')} className="p-1.5 bg-white/20 hover:bg-red-500 rounded-lg text-white transition-colors" title="Hapus permanen"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" /></svg></button>
              </>
            ) : (
              <>
                <button onClick={(e) => handleAction(e, 'pin')} className="p-1.5 bg-white/20 hover:bg-amber-400 rounded-lg text-white transition-colors" title={pinned ? 'Lepas pin' : 'Pin'}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" /></svg></button>
                <button onClick={(e) => handleAction(e, 'archive')} className="p-1.5 bg-white/20 hover:bg-sky-500 rounded-lg text-white transition-colors" title={isArchived ? 'Pulihkan' : 'Arsip'}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" /><path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg></button>
                <button onClick={(e) => handleAction(e, 'trash')} className="p-1.5 bg-white/20 hover:bg-red-500 rounded-lg text-white transition-colors" title="Hapus"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" /></svg></button>
              </>
            )}
          </div>
        )}
      </Link>
    )
  }

  // List card
  return (
    <div className="group relative">
      <Link
        href={isTrash ? '#' : `/notes/${id}`}
        onClick={isTrash ? (e) => e.preventDefault() : undefined}
        className={`flex items-center gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 px-4 py-4 shadow-sm hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-md active:scale-[0.985] transition-all duration-150 ${isTrash ? 'cursor-default opacity-75' : ''} ${pinned && !isTrash ? 'border-l-2 border-l-amber-400 dark:border-l-amber-500' : ''}`}
      >
        {/* Icon */}
        <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center shrink-0">
          {pinned && !isTrash
            ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-amber-400"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" /></svg>
            : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-sky-400 dark:text-sky-500"><path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" /></svg>
          }
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 truncate text-sm leading-snug">
            {highlight(title || 'Catatan Tanpa Judul', searchQuery)}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {category && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: category.color + '22', color: category.color }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                {category.name}
              </span>
            )}
            {isTrash && deletedAt && (
              <span className="text-[10px] text-red-400 dark:text-red-500">Dihapus {formatRelativeTime(deletedAt)}</span>
            )}
            {!isTrash && <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(createdAt)}</span>}
            {!isTrash && <><span className="text-slate-200 dark:text-slate-700 text-xs">·</span><span className="text-xs text-slate-400 dark:text-slate-500">diedit {formatRelativeTime(updatedAt)}</span></>}
          </div>
        </div>

        {/* Chevron (hidden in trash) */}
        {!isTrash && (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-slate-200 dark:text-slate-700 group-hover:text-sky-400 transition-colors shrink-0">
            <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
          </svg>
        )}
      </Link>

      {/* Hover action buttons — bottom-right corner, away from card tap area */}
      {onAction && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 px-1.5 py-1">
          {isTrash ? (
            <>
              <button onClick={(e) => handleAction(e, 'restore')} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-400 hover:text-emerald-500 transition-colors" title="Pulihkan"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z" clipRule="evenodd" /></svg></button>
              <button onClick={(e) => handleAction(e, 'purge')} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500 transition-colors" title="Hapus permanen"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" /></svg></button>
            </>
          ) : (
            <>
              <button onClick={(e) => handleAction(e, 'pin')} className={`p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors ${pinned ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'}`} title={pinned ? 'Lepas pin' : 'Pin'}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" /></svg></button>
              <button onClick={(e) => handleAction(e, 'archive')} className="p-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/50 text-slate-400 hover:text-sky-500 transition-colors" title={isArchived ? 'Pulihkan dari arsip' : 'Arsip'}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" /><path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg></button>
              <button onClick={(e) => handleAction(e, 'trash')} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500 transition-colors" title="Hapus"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" /></svg></button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
