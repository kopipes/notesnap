'use client'

import { useState, useEffect, useRef } from 'react'

export interface Category {
  id: string
  name: string
  color: string
  _count?: { notes: number }
}

interface CategoryPickerProps {
  value: string | null
  onChange: (categoryId: string | null) => void
}

const PRESET_COLORS = [
  '#64748b', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6',
  '#ec4899', '#06b6d4',
]

export default function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [addError, setAddError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const selected = categories.find(c => c.id === value) ?? null

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/categories')
      .then(r => r.json())
      .then((data: Category[]) => setCategories(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    setAddError(null)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      })
      const data = await res.json()
      if (!res.ok) { setAddError(data.error ?? 'Gagal membuat kategori'); return }
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      onChange(data.id)
      setNewName('')
      setNewColor(PRESET_COLORS[0])
      setCreating(false)
      setOpen(false)
    } catch {
      setAddError('Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(cat: Category, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Hapus kategori "${cat.name}"? Catatan tidak akan terhapus.`)) return
    const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' })
    if (res.ok) {
      setCategories(prev => prev.filter(c => c.id !== cat.id))
      if (value === cat.id) onChange(null)
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
          selected
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        {selected ? (
          <>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
            <span className="max-w-[80px] truncate">{selected.name}</span>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M5.25 2.25a3 3 0 00-3 3v4.318a3 3 0 00.879 2.121l9.58 9.581c.92.92 2.39 1.011 3.405.19l5.034-4.028a2.25 2.25 0 00.19-3.405l-9.58-9.58a3 3 0 00-2.121-.879H5.25zM6.375 7.5a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z" clipRule="evenodd" />
            </svg>
            Kategori
          </>
        )}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-slate-400">
          <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-56 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl z-50 overflow-hidden">
          {/* None option */}
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false) }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-left transition-colors ${
              !value
                ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
            <span className="font-medium">Tanpa Kategori</span>
            {!value && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 ml-auto"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg>}
          </button>

          {/* Divider */}
          {(loading || categories.length > 0) && (
            <div className="border-t border-slate-100 dark:border-slate-800" />
          )}

          {loading && (
            <div className="px-3.5 py-3 text-xs text-slate-400 dark:text-slate-500">Memuat…</div>
          )}

          {/* Category list */}
          {categories.map(cat => (
            <div key={cat.id} className="group flex items-center">
              <button
                type="button"
                onClick={() => { onChange(cat.id); setOpen(false) }}
                className={`flex-1 flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-left transition-colors ${
                  value === cat.id
                    ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="font-medium truncate">{cat.name}</span>
                {value === cat.id && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 ml-auto shrink-0"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg>}
              </button>
              <button
                type="button"
                onClick={(e) => handleDelete(cat, e)}
                className="opacity-0 group-hover:opacity-100 pr-2.5 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-all"
                aria-label={`Hapus kategori ${cat.name}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}

          {/* Add new category */}
          <div className="border-t border-slate-100 dark:border-slate-800">
            {!creating ? (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                </svg>
                Kategori Baru
              </button>
            ) : (
              <div className="px-3 py-3 space-y-2">
                {/* Color picker */}
                <div className="flex gap-1 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`w-5 h-5 rounded-full transition-transform ${newColor === c ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                      aria-label={`Pilih warna ${c}`}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setAddError(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreate() } if (e.key === 'Escape') setCreating(false) }}
                  placeholder="Nama kategori…"
                  maxLength={50}
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 transition-colors"
                />
                {addError && <p className="text-[10px] text-red-500">{addError}</p>}
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => setCreating(false)}
                    className="flex-1 h-7 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    Batal
                  </button>
                  <button type="button" onClick={handleCreate} disabled={saving || !newName.trim()}
                    className="flex-1 h-7 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold disabled:opacity-50 transition-colors">
                    {saving ? '…' : 'Simpan'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
