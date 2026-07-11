'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Note {
  id: string
  title: string
  updatedAt: string
  createdAt: string
}

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

// Cache dot dates per month to avoid refetching on re-render
const dotCache = new Map<string, Set<string>>()

export default function CalendarTab() {
  const router = useRouter()
  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(today)
  const [notes, setNotes] = useState<Note[]>([])
  const [dotDates, setDotDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`

  // Load dot indicators for the current month view — lightweight dates-only endpoint
  useEffect(() => {
    if (dotCache.has(monthKey)) {
      setDotDates(dotCache.get(monthKey)!)
      return
    }
    fetch(`/api/notes/dates?month=${monthKey}`)
      .then(r => r.ok ? r.json() : [])
      .then((dates: string[]) => {
        const s = new Set(dates)
        dotCache.set(monthKey, s)
        setDotDates(s)
      })
      .catch(() => {})
  }, [monthKey])

  // Load notes for selected date
  const loadNotesForDate = useCallback(async (date: Date) => {
    setLoading(true)
    try {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const res = await fetch(`/api/notes/by-date?date=${dateStr}`)
      if (!res.ok) { setNotes([]); return }
      const data = await res.json()
      setNotes(Array.isArray(data) ? data : [])
    } catch { setNotes([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadNotesForDate(selectedDate) }, [selectedDate, loadNotesForDate])

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function hasDot(day: number) {
    const utcDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return dotDates.has(utcDate)
  }

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1))
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1))
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 safe-top">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center">
          <h1 className="text-sm font-bold text-slate-900 dark:text-slate-50">Kalender</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {/* Calendar card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-3 pt-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wide py-1">{d}</div>
            ))}
          </div>

          {/* Date grid */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />
              const thisDate = new Date(year, month, day)
              const isToday = isSameDay(thisDate, today)
              const isSelected = isSameDay(thisDate, selectedDate)
              const dot = hasDot(day)
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(thisDate)}
                  className={`
                    relative flex flex-col items-center justify-center h-9 w-full rounded-xl text-sm font-medium transition-colors
                    ${isSelected ? 'bg-sky-500 text-white' : isToday ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}
                  `}
                >
                  {day}
                  {dot && (
                    <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white/70' : 'bg-sky-400'}`} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes for selected date */}
        <div>
          <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 px-1">
            {selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" className="border-slate-200 border-t-sky-500" />
            </div>
          ) : notes.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-8 text-center">
              <p className="text-slate-400 dark:text-slate-500 text-sm">Tidak ada catatan pada hari ini</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map(note => (
                <button
                  key={note.id}
                  onClick={() => router.push(`/notes/${note.id}`)}
                  className="w-full text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-3.5 shadow-sm hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{note.title || 'Catatan Tanpa Judul'}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {new Date(note.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 ml-3">
                    <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
