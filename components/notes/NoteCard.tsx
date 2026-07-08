'use client'

import Link from 'next/link'

export interface NoteCardData {
  id: string
  title: string
  updatedAt: string
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Baru saja'
  if (diffMins < 60) return `${diffMins} menit lalu`
  if (diffHours < 24) return `${diffHours} jam lalu`
  if (diffDays < 7) return `${diffDays} hari lalu`
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function NoteCard({ id, title, updatedAt }: NoteCardData) {
  return (
    <Link
      href={`/notes/${id}`}
      className="
        group flex items-center justify-between
        bg-white rounded-2xl border border-slate-200
        px-4 py-3.5 shadow-sm
        hover:border-sky-300 hover:shadow-md hover:shadow-sky-100
        active:scale-[0.98] transition-all duration-150
      "
    >
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold text-slate-900 truncate text-sm leading-snug">
          {title || 'Catatan Tanpa Judul'}
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(updatedAt)}</p>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-4 h-4 text-slate-300 group-hover:text-sky-400 transition-colors shrink-0 ml-3"
      >
        <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
      </svg>
    </Link>
  )
}
