'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef, useCallback, useState } from 'react'
import { BibleVerseExtension } from './BibleVerseExtension'
import { createSlashCommandExtension } from './SlashCommandExtension'
import AyatDialog from './AyatDialog'
import CameraPanel from '@/components/camera/CameraPanel'
import type { Editor } from '@tiptap/react'

interface NoteEditorProps {
  noteId: string
  initialContent: string
  initialTitle: string
  onTitleChange?: (title: string) => void
}

const AUTOSAVE_DELAY = 1000

export default function NoteEditor({
  noteId, initialContent, initialTitle, onTitleChange,
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [ayatOpen, setAyatOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [toolbarBottom, setToolbarBottom] = useState(0)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)
  // Always-current reference to the editor instance
  const editorRef = useRef<Editor | null>(null)

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
      if (isMountedRef.current) { setSaveStatus('unsaved'); showToast('Gagal menyimpan') }
    }
  }, [noteId, showToast])

  const saveTitle = useCallback(async (val: string) => {
    try {
      await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: val }),
      })
      onTitleChange?.(val)
    } catch { /* non-blocking */ }
  }, [noteId, onTitleChange])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current)
    titleTimerRef.current = setTimeout(() => saveTitle(e.target.value), AUTOSAVE_DELAY)
  }

  const slashExt = createSlashCommandExtension(() => setAyatOpen(true))

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
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">

      {/* Scrollable content — title + body */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 max-w-2xl mx-auto w-full space-y-3">
        {/* Title card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm px-5 pt-5 pb-4">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Judul catatan"
            className="w-full text-2xl font-bold leading-snug bg-transparent border-none outline-none text-slate-900 dark:text-slate-50 placeholder-slate-200 dark:placeholder-slate-700 tracking-tight"
          />
        </div>

        {/* Content card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm px-5 py-5 min-h-[40vh]">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Bottom toolbar — follows keyboard via visualViewport */}
      <div
        className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-4 py-3 max-w-2xl mx-auto w-full transition-all duration-100"
        style={{
          paddingBottom: `max(env(safe-area-inset-bottom, 12px), 12px)`,
          marginBottom: toolbarBottom,
        }}>
        <div className="flex items-center justify-between">
          {/* Save status */}
          <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 select-none">
            {saveStatus === 'saving' && <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />Menyimpan…</>}
            {saveStatus === 'saved'  && <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Tersimpan</>}
            {saveStatus === 'unsaved'&& <><span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />Belum tersimpan</>}
          </span>

          <div className="flex items-center gap-1">
            {/* Manual save */}
            {saveStatus === 'unsaved' && (
              <button type="button" onClick={handleManualSave} aria-label="Simpan sekarang"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white transition-colors shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                </svg>
                Simpan
              </button>
            )}
            {/* Bible verse */}
            <button type="button" onClick={() => setAyatOpen(true)} aria-label="Sisipkan ayat"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 active:bg-sky-100 dark:active:bg-sky-900/40 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
              </svg>
              Ayat
            </button>
            {/* Camera / Upload */}
            <button type="button" onClick={() => setCameraOpen(v => !v)} aria-label="Kamera OCR"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors
                ${cameraOpen ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 active:bg-sky-100 dark:active:bg-sky-900/40'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
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
