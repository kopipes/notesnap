'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { BibleVerseExtension } from './BibleVerseExtension'
import { createSlashCommandExtension } from './SlashCommandExtension'
import AyatDialog from './AyatDialog'
import CameraPanel from '@/components/camera/CameraPanel'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import CategoryPicker from '@/components/ui/CategoryPicker'
import { getSettings } from '@/lib/settings'
import type { Editor } from '@tiptap/react'

// ─── Offline save queue ───────────────────────────────────────────────────────
const QUEUE_KEY = 'notesnap_save_queue'

interface QueuedSave {
  noteId: string
  field: 'content' | 'title'
  value: string
  ts: number
}

function enqueueSave(item: QueuedSave) {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const queue: QueuedSave[] = raw ? JSON.parse(raw) : []
    // Replace existing entry for same noteId+field
    const filtered = queue.filter(q => !(q.noteId === item.noteId && q.field === item.field))
    filtered.push(item)
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered))
  } catch { /* storage full or unavailable */ }
}

function dequeueAll(): QueuedSave[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const queue: QueuedSave[] = JSON.parse(raw)
    localStorage.removeItem(QUEUE_KEY)
    return queue
  } catch { return [] }
}

async function flushQueue() {
  const queue = dequeueAll()
  for (const item of queue) {
    try {
      await fetch(`/api/notes/${item.noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [item.field]: item.value }),
      })
    } catch { /* re-enqueue on failure */ enqueueSave(item) }
  }
}

/** Extract plain text from a Tiptap JSON node, preserving bibleVerse references. */
function extractTextFromNode(node: Record<string, unknown>): string {
  if (node.type === 'bibleVerse') {
    const ref = (node.attrs as Record<string, string>)?.reference ?? ''
    const verseText = ((node.content as Record<string, unknown>[]) ?? [])
      .map(n => extractTextFromNode(n)).join('')
    return ref ? `${verseText} (${ref})\n` : `${verseText}\n`
  }
  if (node.type === 'text') return (node.text as string) ?? ''
  if (node.content) {
    const children = (node.content as Record<string, unknown>[]).map(n => extractTextFromNode(n)).join('')
    const BLOCK_TYPES = ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote']
    return BLOCK_TYPES.includes(node.type as string) ? children + '\n' : children
  }
  return ''
}

interface NoteEditorProps {
  noteId: string
  initialContent: string
  initialTitle: string
  initialSummary?: string | null
  initialCreatedAt?: string | null
  initialCategoryId?: string | null
  onTitleChange?: (title: string) => void
  onSummaryTrigger?: (fn: () => void) => void
  onCopyNoteTrigger?: (fn: () => void) => void
  onNoteCopied?: () => void
}

const AUTOSAVE_DELAY = 1000

export default function NoteEditor({
  noteId, initialContent, initialTitle, initialSummary, initialCreatedAt, initialCategoryId, onTitleChange, onSummaryTrigger, onCopyNoteTrigger, onNoteCopied,
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle)
  const [categoryId, setCategoryId] = useState<string | null>(initialCategoryId ?? null)
  const [createdAt, setCreatedAt] = useState<string>(initialCreatedAt ?? new Date().toISOString())
  const [editingDate, setEditingDate] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [ayatOpen, setAyatOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [toolbarBottom, setToolbarBottom] = useState(0)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summary, setSummary] = useState<string | null>(initialSummary ?? null)
  const [summarizing, setSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [confirmPending, setConfirmPending] = useState<'new' | 'retry' | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)
  const editorRef = useRef<Editor | null>(null)

  // Online/offline detection — flush queued saves when back online
  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => { setIsOnline(true); flushQueue() }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Track visual viewport to follow keyboard on mobile
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    function onResize() {
      const kbHeight = window.innerHeight - (vv!.height + vv!.offsetTop)
      setToolbarBottom(Math.max(0, kbHeight))
    }
    vv.addEventListener('resize', onResize)
    vv.addEventListener('scroll', onResize)
    onResize()
    return () => {
      vv.removeEventListener('resize', onResize)
      vv.removeEventListener('scroll', onResize)
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => { if (isMountedRef.current) setToast(null) }, 3000)
  }, [])

  const saveContent = useCallback(async (content: string) => {
    if (!isMountedRef.current) return
    if (!navigator.onLine) {
      enqueueSave({ noteId, field: 'content', value: content, ts: Date.now() })
      if (isMountedRef.current) setSaveStatus('unsaved')
      return
    }
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan')
      if (isMountedRef.current) setSaveStatus('saved')
    } catch {
      if (isMountedRef.current) {
        enqueueSave({ noteId, field: 'content', value: content, ts: Date.now() })
        setSaveStatus('unsaved')
        showToast('Offline — tersimpan lokal')
      }
    }
  }, [noteId, showToast])

  const saveTitle = useCallback(async (val: string) => {
    if (!navigator.onLine) {
      enqueueSave({ noteId, field: 'title', value: val, ts: Date.now() })
      return
    }
    try {
      await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: val }),
      })
      onTitleChange?.(val)
    } catch {
      enqueueSave({ noteId, field: 'title', value: val, ts: Date.now() })
    }
  }, [noteId, onTitleChange])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current)
    titleTimerRef.current = setTimeout(() => saveTitle(e.target.value), AUTOSAVE_DELAY)
  }

  const handleCategoryChange = useCallback(async (newCategoryId: string | null) => {
    setCategoryId(newCategoryId)
    try {
      await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: newCategoryId }),
      })
    } catch {
      showToast('Gagal menyimpan kategori')
    }
  }, [noteId, showToast])

  const handleDateChange = useCallback(async (newDate: string) => {
    // newDate is from <input type="date"> — format YYYY-MM-DD
    // Preserve original time, just change the date
    const orig = new Date(createdAt)
    const [year, month, day] = newDate.split('-').map(Number)
    orig.setFullYear(year, month - 1, day)
    const iso = orig.toISOString()
    setCreatedAt(iso)
    setEditingDate(false)
    try {
      await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createdAt: iso }),
      })
      showToast('Tanggal diperbarui')
    } catch {
      showToast('Gagal menyimpan tanggal')
    }
  }, [noteId, createdAt, showToast])

  const slashExt = useMemo(() => createSlashCommandExtension(() => setAyatOpen(true)), [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Mulai menulis… ketuk / untuk perintah' }),
      BibleVerseExtension,
      slashExt,
    ],
    content: initialContent
      ? (() => { try { return JSON.parse(initialContent) } catch { return initialContent } })()
      : '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor focus:outline-none min-h-[40vh]',
      },
    },
    onUpdate: ({ editor: ed }) => {
      setSaveStatus('unsaved')
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => saveContent(JSON.stringify(ed.getJSON())), AUTOSAVE_DELAY)
    },
  })

  // Keep ref in sync with the latest editor instance
  useEffect(() => {
    editorRef.current = editor ?? null
  }, [editor])

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current)
  }, [])

  // Manual save — fires immediately, cancels any pending debounce
  const handleManualSave = useCallback(async () => {
    const ed = editorRef.current
    if (!ed || saveStatus === 'saving') return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    await saveContent(JSON.stringify(ed.getJSON()))
    showToast('Catatan disimpan')
  }, [saveStatus, saveContent, showToast])

  // Summarize the note using AI — actually runs the API call
  const runSummarize = useCallback(async () => {
    const ed = editorRef.current
    if (!ed) return

    // Extract plain text preserving bibleVerse references
    const plainText = extractTextFromNode(ed.getJSON() as Record<string, unknown>).trim()

    if (!plainText) {
      showToast('Catatan masih kosong')
      return
    }
    setSummaryOpen(true)
    setSummarizing(true)
    setSummaryError(null)
    setSummary(null)
    setCopied(false)
    try {
      const settings = getSettings()
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: plainText,
          title,
          apiKey: settings.geminiApiKey || undefined,
          baseUrl: settings.geminiBaseUrl || undefined,
        }),
      })
      const data = await res.json() as { summary?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Gagal membuat ringkasan')
      const newSummary = data.summary ?? ''
      setSummary(newSummary)
      // Persist to DB
      await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: newSummary }),
      })
    } catch (err: unknown) {
      setSummaryError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSummarizing(false)
    }
  }, [title, noteId, showToast])

  // handleOpenSummary — called from top nav: open modal if summary exists, else confirm
  const handleOpenSummary = useCallback(() => {
    if (summary) {
      setSummaryOpen(true)
    } else {
      const ed = editorRef.current
      if (!ed || !ed.getText().trim()) { showToast('Catatan masih kosong'); return }
      setConfirmPending('new')
    }
  }, [summary, showToast])

  const handleConfirmYes = useCallback(() => {
    const mode = confirmPending
    setConfirmPending(null)
    if (mode) runSummarize()
  }, [confirmPending, runSummarize])

  const handleConfirmNo = useCallback(() => {
    setConfirmPending(null)
  }, [])

  const handleCopySummary = useCallback(async () => {
    if (!summary) return
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      showToast('Gagal menyalin')
    }
  }, [summary, showToast])

  const handleShareSummary = useCallback(async () => {
    if (!summary) return

    // Parse ===SECTION=== format into clean readable text for sharing
    const sectionOrder = ['JUDUL', 'PESAN UTAMA', 'POIN PENTING', 'AYAT REFERENSI', 'LANGKAH PRAKTIS']
    const sectionLabels: Record<string, string> = {
      'JUDUL': '📖',
      'PESAN UTAMA': '💡 Pesan Utama',
      'POIN PENTING': '📝 Poin Penting',
      'AYAT REFERENSI': '📜 Ayat Referensi',
      'LANGKAH PRAKTIS': '✅ Langkah Praktis',
    }
    const sectionRegex = /===([^=]+)===/g
    const sections: Record<string, string> = {}
    let lastKey = ''
    let lastIndex = 0
    let match
    while ((match = sectionRegex.exec(summary)) !== null) {
      if (lastKey) sections[lastKey] = summary.slice(lastIndex, match.index).trim()
      lastKey = match[1].trim().toUpperCase()
      lastIndex = match.index + match[0].length
    }
    if (lastKey) sections[lastKey] = summary.slice(lastIndex).trim()

    let shareText: string
    if (Object.keys(sections).length === 0) {
      // No sections — share as-is
      shareText = `${title}\n\n${summary}`
    } else {
      const parts: string[] = []
      for (const key of sectionOrder) {
        const content = sections[key]
        if (!content) continue
        const label = sectionLabels[key] ?? key
        if (key === 'JUDUL') {
          parts.push(`${label} ${content}`)
        } else {
          parts.push(`${label}\n${content}`)
        }
      }
      shareText = parts.join('\n\n')
    }

    if (navigator.share) {
      try {
        // Try sharing as a text file — avoids WhatsApp character truncation
        const blob = new Blob([shareText], { type: 'text/plain' })
        const file = new File([blob], `${title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`, { type: 'text/plain' })
        const canShareFile = navigator.canShare && navigator.canShare({ files: [file] })
        if (canShareFile) {
          await navigator.share({ title, files: [file] })
        } else {
          await navigator.share({ title, text: shareText })
        }
        setShared(true)
        setTimeout(() => setShared(false), 2500)
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') showToast('Gagal berbagi')
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText)
        setShared(true)
        setTimeout(() => setShared(false), 2500)
        showToast('Disalin ke clipboard')
      } catch {
        showToast('Gagal berbagi')
      }
    }
  }, [summary, title, showToast])

  // Expose handleOpenSummary to parent (top nav button)
  useEffect(() => {
    onSummaryTrigger?.(handleOpenSummary)
  }, [onSummaryTrigger, handleOpenSummary])

  // Copy full note (title + plain text) to clipboard
  const handleCopyNote = useCallback(async () => {
    const ed = editorRef.current
    if (!ed) return
    const bodyText = extractTextFromNode(ed.getJSON() as Record<string, unknown>).trim()
    const fullText = title ? `${title}\n\n${bodyText}` : bodyText
    try {
      await navigator.clipboard.writeText(fullText)
      onNoteCopied?.()
    } catch {
      showToast('Gagal menyalin catatan')
    }
  }, [title, showToast, onNoteCopied])

  // Expose handleCopyNote to parent (top nav button)
  useEffect(() => {
    onCopyNoteTrigger?.(handleCopyNote)
  }, [onCopyNoteTrigger, handleCopyNote])

  // OCR result — use ref so it always has a live editor reference
  // Insert as plain text paragraphs, not raw markdown
  const handleOcrResult = useCallback((text: string) => {
    const ed = editorRef.current
    if (!ed) return
    // Split into lines, filter blanks, insert each as a paragraph
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    const content = lines.map(line => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    }))
    ed.chain().focus().insertContentAt(ed.state.doc.content.size, content).run()
    setCameraOpen(false)
    showToast('Teks berhasil ditambahkan')
  }, [showToast])

  const insertBibleVerse = useCallback((text: string, reference: string) => {
    const ed = editorRef.current
    if (!ed) return
    ed.chain().focus().insertContent({
      type: 'bibleVerse', attrs: { reference }, content: [{ type: 'text', text }],
    }).run()
  }, [])

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-slate-950">

      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs font-semibold text-center py-1.5 px-4 flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
          </svg>
          Offline — perubahan tersimpan lokal, akan disinkronkan saat online
        </div>
      )}

      {/* Scrollable content — title + body */}
      <div className="px-4 pt-5 pb-4 max-w-2xl mx-auto w-full space-y-3">
        {/* Title card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm px-5 pt-5 pb-4">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Judul catatan"
            className="w-full text-2xl font-bold leading-snug bg-transparent border-none outline-none text-slate-900 dark:text-slate-50 placeholder-slate-200 dark:placeholder-slate-700 tracking-tight"
          />
          {/* Date — tappable to edit */}
          {editingDate ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="date"
                defaultValue={new Date(createdAt).toISOString().slice(0, 10)}
                autoFocus
                onBlur={(e) => { if (e.target.value) handleDateChange(e.target.value); else setEditingDate(false) }}
                onChange={(e) => { if (e.target.value) handleDateChange(e.target.value) }}
                className="text-xs rounded-lg border border-sky-400 bg-white dark:bg-slate-800 px-2 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
              <button type="button" onClick={() => setEditingDate(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                Batal
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingDate(true)}
              className="mt-2 text-[11px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1.5 hover:text-sky-500 dark:hover:text-sky-400 transition-colors group"
              title="Ketuk untuk ubah tanggal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
              </svg>
              {new Date(createdAt).toLocaleDateString('id-ID', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
              </svg>
            </button>
          )}
          {/* Category picker — sits below date in title card */}
          <div className="mt-3">
            <CategoryPicker value={categoryId} onChange={handleCategoryChange} />
          </div>
        </div>

        {/* Content card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm px-5 py-5 min-h-[50vh]">
          <EditorContent editor={editor} />
        </div>

        {/* Bottom padding for toolbar */}
        <div style={{ height: `calc(3.5rem + env(safe-area-inset-bottom, 12px) + ${toolbarBottom}px)` }} />
      </div>

      {/* Floating bottom toolbar — follows keyboard via visualViewport */}
      <div
        className="fixed left-0 right-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200/70 dark:border-slate-800/70 shadow-lg"
        style={{
          bottom: toolbarBottom,
          paddingBottom: `max(env(safe-area-inset-bottom, 12px), 12px)`,
        }}
      >
        <div className="max-w-2xl mx-auto px-4 pt-2.5 flex items-center justify-between gap-2">
          {/* Save status — dot only to save space */}
          <div className="flex items-center gap-1.5 select-none shrink-0">
            {!isOnline && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-500 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                Offline
              </span>
            )}
            {isOnline && saveStatus === 'saving' && (
              <span title="Menyimpan…">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
              </span>
            )}
            {isOnline && saveStatus === 'saved' && (
              <span title="Tersimpan">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              </span>
            )}
            {isOnline && saveStatus === 'unsaved' && (
              <button type="button" onClick={handleManualSave} aria-label="Simpan sekarang"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white transition-colors shadow-sm shadow-emerald-500/25">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                </svg>
                Simpan
              </button>
            )}
          </div>

          {/* Category picker + action buttons */}
          <div className="flex items-center gap-0.5 shrink-0">

            {/* Bold */}
            <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} aria-label="Bold"
              className={`w-8 h-8 rounded-xl text-sm font-bold transition-colors flex items-center justify-center ${editor?.isActive('bold') ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              B
            </button>

            {/* Italic */}
            <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} aria-label="Italic"
              className={`w-8 h-8 rounded-xl text-sm italic font-serif transition-colors flex items-center justify-center ${editor?.isActive('italic') ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              I
            </button>

            {/* Wrap — join selected paragraphs into one */}
            <button type="button" aria-label="Wrap paragraphs"
              onClick={() => {
                if (!editor) return
                const { state, dispatch } = editor.view
                const { from, to } = state.selection
                const texts: string[] = []
                state.doc.nodesBetween(from, to, (node) => {
                  if (node.isText) texts.push(node.text ?? '')
                  else if (node.isBlock && texts.length > 0) texts.push(' ')
                })
                const joined = texts.join('').replace(/\s+/g, ' ').trim()
                if (!joined) return
                const { tr } = state
                tr.replaceWith(from, to, state.schema.nodes.paragraph.create(null, state.schema.text(joined)))
                dispatch(tr)
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M3 6a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6zm0 4.5a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 10.5zm0 4.5a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H3.75A.75.75 0 013 15z" clipRule="evenodd" />
              </svg>
              Wrap
            </button>

            {/* Divider */}
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

            {/* Bible verse */}
            <button type="button" onClick={() => setAyatOpen(true)} aria-label="Sisipkan ayat"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
              </svg>
              Ayat
            </button>

            {/* Camera / Upload */}
            <button type="button" onClick={() => setCameraOpen(v => !v)} aria-label="Kamera OCR"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                cameraOpen
                  ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50'
              }`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
              Kamera
            </button>
          </div>
        </div>
      </div>

      {/* Camera */}
      {cameraOpen && <CameraPanel onClose={() => setCameraOpen(false)} onResult={handleOcrResult} />}
      {/* Ayat */}
      {ayatOpen && <AyatDialog onClose={() => setAyatOpen(false)} onInsert={insertBibleVerse} />}

      {/* Summary modal */}
      {summaryOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSummaryOpen(false)} />
          {/* Panel */}
          <div className="relative w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-violet-500">
                  <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a3.375 3.375 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a3.375 3.375 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
                </svg>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">Ringkasan Khotbah</h2>
              </div>
              <button type="button" onClick={() => setSummaryOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {summarizing && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <LoadingSpinner size="md" className="border-slate-200 dark:border-slate-700 border-t-violet-500" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">Membuat ringkasan…</p>
                </div>
              )}
              {summaryError && (
                <div className="flex items-start gap-2 px-3 py-3 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-400 shrink-0 mt-0.5">
                    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-red-600 dark:text-red-400">{summaryError}</p>
                </div>
              )}
              {summary && (
                <div className="space-y-4">
                  {(() => {
                    // Parse ===SECTION=== format into blocks
                    const sectionOrder = ['JUDUL','PESAN UTAMA','POIN PENTING','AYAT REFERENSI','LANGKAH PRAKTIS']
                    const sectionRegex = /===([^=]+)===/g
                    const sections: Record<string, string> = {}
                    let lastKey = ''
                    let lastIndex = 0
                    let match
                    const raw = summary
                    while ((match = sectionRegex.exec(raw)) !== null) {
                      if (lastKey) {
                        sections[lastKey] = raw.slice(lastIndex, match.index).trim()
                      }
                      lastKey = match[1].trim().toUpperCase()
                      lastIndex = match.index + match[0].length
                    }
                    if (lastKey) sections[lastKey] = raw.slice(lastIndex).trim()

                    // If no sections found, fall back to plain text
                    if (Object.keys(sections).length === 0) {
                      return <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{summary}</p>
                    }

                    const sectionLabels: Record<string, string> = {
                      'JUDUL': 'Judul',
                      'PESAN UTAMA': 'Pesan Utama',
                      'POIN PENTING': 'Poin Penting',
                      'AYAT REFERENSI': 'Ayat Referensi',
                      'LANGKAH PRAKTIS': 'Langkah Praktis',
                    }

                    return sectionOrder.map(key => {
                      const content = sections[key]
                      if (!content) return null
                      const label = sectionLabels[key] ?? key

                      if (key === 'JUDUL') {
                        return (
                          <div key={key} className="pb-3 border-b border-slate-100 dark:border-slate-800">
                            <p className="text-base font-bold text-slate-900 dark:text-slate-50 leading-snug">{content}</p>
                          </div>
                        )
                      }

                      if (key === 'AYAT REFERENSI') {
                        const lines = content.split('\n').filter(l => l.trim() && l.trim() !== '(tidak ada ayat yang dikutip)')
                        if (lines.length === 0) return null
                        return (
                          <div key={key}>
                            <p className="text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400 mb-2">{label}</p>
                            <div className="space-y-2">
                              {lines.map((line, i) => (
                                <div key={i} className="pl-3 border-l-2 border-violet-300 dark:border-violet-700">
                                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">{line.trim()}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }

                      if (key === 'LANGKAH PRAKTIS') {
                        return (
                          <div key={key} className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl px-4 py-3 border border-emerald-100 dark:border-emerald-900">
                            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">{label}</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{content}</p>
                          </div>
                        )
                      }

                      if (key === 'PESAN UTAMA') {
                        return (
                          <div key={key} className="bg-violet-50 dark:bg-violet-950/30 rounded-xl px-4 py-3 border border-violet-100 dark:border-violet-900">
                            <p className="text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400 mb-1">{label}</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{content}</p>
                          </div>
                        )
                      }

                      // POIN PENTING
                      const lines = content.split('\n').filter(l => l.trim())
                      return (
                        <div key={key}>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">{label}</p>
                          <div className="space-y-1.5">
                            {lines.map((line, i) => (
                              <p key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{line.trim()}</p>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              )}
            </div>

            {/* Footer */}
            {summary && !summarizing && (
              <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                {confirmPending === 'retry' ? (
                  /* Inline confirm for Ulangi */
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">Ringkasan yang sudah ada akan diganti. Yakin?</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={handleConfirmNo}
                        className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        Batal
                      </button>
                      <button type="button" onClick={handleConfirmYes}
                        className="flex-1 h-10 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition-colors">
                        Ya, Ulangi
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button type="button" onClick={handleCopySummary}
                      className="flex-1 h-10 rounded-xl bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                      {copied ? (
                        <><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg>Tersalin!</>
                      ) : (
                        <><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5zM4.875 6H7.5v-.375A3.375 3.375 0 0110.875 2.25h4.25A3.375 3.375 0 0118.5 5.625V6h2.625a.75.75 0 010 1.5H4.875a.75.75 0 010-1.5zM5.625 7.5c-.621 0-1.125.504-1.125 1.125v10.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V8.625c0-.621-.504-1.125-1.125-1.125H5.625z" clipRule="evenodd" /></svg>Salin Ringkasan</>
                      )}
                    </button>
                    <button type="button" onClick={() => setConfirmPending('retry')}
                      className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm">
                      Ulangi
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm dialog — only for 'new' (first time generate), retry is inline in modal */}
      {confirmPending === 'new' && (
        <div className="fixed inset-0 z-60 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleConfirmNo} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-5 w-full max-w-xs">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-1">Buat ringkasan khotbah?</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              AI akan meringkas catatan ini menggunakan API yang sudah dikonfigurasi.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={handleConfirmNo}
                className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Batal
              </button>
              <button type="button" onClick={handleConfirmYes}
                className="flex-1 h-10 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition-colors">
                Ya, Buat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg pointer-events-none whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
