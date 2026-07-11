'use client'

import Link from 'next/link'

export interface NoteCardData {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  categoryId?: string | null
  category?: { id: string; name: string; color: string } | null
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

export default function NoteCard({ id, title, createdAt, updatedAt, category }: NoteCardData) {
  return (
    <Link
      href={`/notes/${id}`}
      className="group flex items-center gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 px-4 py-4 shadow-sm hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-md hover:shadow-sky-100/60 dark:hover:shadow-sky-900/20 active:scale-[0.985] transition-all duration-150"
    >
      {/* Icon accent */}
      <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center shrink-0 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/60 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-sky-400 dark:text-sky-500">
          <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
        </svg>
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 truncate text-sm leading-snug">
          {title || 'Catatan Tanpa Judul'}
        </h2>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {category && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
              style={{ backgroundColor: category.color + '22', color: category.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
              {category.name}
            </span>
          )}
          <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(createdAt)}</span>
          <span className="text-slate-200 dark:text-slate-700 text-xs">·</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">diedit {formatRelativeTime(updatedAt)}</span>
        </div>
      </div>

      {/* Chevron */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-4 h-4 text-slate-200 dark:text-slate-700 group-hover:text-sky-400 dark:group-hover:text-sky-500 transition-colors shrink-0"
      >
        <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
      </svg>
    </Link>
  )
}
