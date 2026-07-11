'use client'

import { useState, useEffect, useRef } from 'react'

export interface Category {
  id: string
  name: string
  color: string
  _count?: { notes: number }
}

interface CategoryPickerProps {
  value: string[]
  onChange: (categoryIds: string[]) => void
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const selectedCategories = categories.filter(c => value.includes(c.id))

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
        setEditingId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function toggleCategory(id: string) {
    if (value.includes(id)) {
      onChange(value.filter(v => v !== id))
    } else {
      onChange([...value, id])
    }
  }

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
      if (!res.ok) { setAddError(data.error ?? 'Gagal membuat'); return }
      setCategories(prev => [...prev, data])
      setNewName('')
      setNewColor(PRESET_COLORS[0])
      setCreating(false)
      // Auto-select the newly created category
      onChange([...value, data.id])
    } finally {
      setSaving(false)
    }
  }

  async function handleEditSave(cat: Category) {
    if (!editName.trim() || editName.trim() === cat.name) { setEditingId(null); return }
    setEditSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setEditError(data.error ?? 'Gagal menyimpan'); return }
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, name: editName.trim() } : c))
      setEditingId(null)
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus kategori ini?')) return
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCategories(prev => prev.filter(c => c.id !== id))
      onChange(value.filter(v => v !== id))
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex flex-wrap items-center gap-1.5 min-h-[28px] w-full text-left"
      >
        {selectedCategories.length === 0 ? (
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 hover:text-sky-500 dark:hover:text-sky-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M5.25 2.25a3 3 0 00-3 3v4.318a3 3 0 00.879 2.121l9.58 9.581c.92.92 2.39 1.013 3.38.204a18.785 18.785 0 005.89-7.125 2.25 2.25 0 00-.256-2.428L12.27 3.202a3 3 0 00-2.12-.879H5.25zm1.5 3.75a.75.75 0 100 1.5.75.75 0 000-1.5z" clipRule="evenodd" />
            </svg>
            Tambah kategori
          </span>
        ) : (
          <>
            {selectedCategories.map(cat => (
              <span
                key={cat.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium"
                style={{ backgroundColor: cat.color + '22', color: cat.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                {cat.name}
              </span>
            ))}
            <span className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-sky-500 transition-colors ml-0.5">+</span>
          </>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-2 max-h-72 overflow-y-auto">
            {loading ? (
              <p className="text-center text-xs text-slate-400 py-4">Memuat…</p>
            ) : categories.length === 0 && !creating ? (
              <p className="text-center text-xs text-slate-400 py-4">Belum ada kategori</p>
            ) : (
              <ul className="space-y-0.5">
                {categories.map(cat => (
                  <li key={cat.id} className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                    {/* Checkbox toggle */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-colors`}
                        style={value.includes(cat.id)
                          ? { backgroundColor: cat.color, borderColor: cat.color }
                          : { borderColor: cat.color + '88' }
                        }
                      >
                        {value.includes(cat.id) && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-2.5 h-2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </span>
                      {editingId === cat.id ? (
                        <input
                          autoFocus
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleEditSave(cat)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          onClick={e => e.stopPropagation()}
                          className="flex-1 text-xs bg-transparent border-b border-slate-300 dark:border-slate-600 outline-none text-slate-800 dark:text-slate-100"
                        />
                      ) : (
                        <span className="text-xs text-slate-700 dark:text-slate-200 truncate">{cat.name}</span>
                      )}
                    </button>

                    {/* Edit / delete actions */}
                    {editingId === cat.id ? (
                      <button type="button" onClick={() => handleEditSave(cat)} disabled={editSaving}
                        className="text-[10px] text-sky-500 font-semibold px-1 shrink-0">
                        {editSaving ? '…' : 'OK'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEditingId(cat.id); setEditName(cat.name); setEditError(null) }}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                            <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
                          </svg>
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(cat.id) }}
                          className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                            <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    )}
                    {editError && editingId === cat.id && (
                      <p className="text-[10px] text-red-500 px-2">{editError}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add new category */}
          <div className="border-t border-slate-100 dark:border-slate-800 p-2">
            {!creating ? (
              <button type="button" onClick={() => { setCreating(true); setNewName(''); setAddError(null) }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                </svg>
                Buat kategori baru
              </button>
            ) : (
              <div className="space-y-2 px-1 py-1">
                {/* Color swatches */}
                <div className="flex gap-1.5 flex-wrap">
                  {PRESET_COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setNewColor(color)}
                      className={`w-5 h-5 rounded-full border-2 transition-transform ${newColor === color ? 'scale-125 border-slate-400 dark:border-slate-300' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                  placeholder="Nama kategori…"
                  className="w-full h-8 px-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none ring-0 focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 transition-colors"
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
