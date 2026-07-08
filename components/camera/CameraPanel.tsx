'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import CameraView from './CameraView'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ToggleSwitch from '@/components/ui/ToggleSwitch'
import { getSettings } from '@/lib/settings'

interface CameraPanelProps {
  onClose: () => void
  onResult: (markdown: string) => void
}

type Tab = 'camera' | 'upload'

export default function CameraPanel({ onClose, onResult }: CameraPanelProps) {
  const [tab, setTab] = useState<Tab>('camera')
  const [translate, setTranslate] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploadBase64, setUploadBase64] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = requestAnimationFrame(() => setIsOpen(true))
    return () => cancelAnimationFrame(t)
  }, [])

  const sendOcr = useCallback(async (base64Jpeg: string) => {
    setProcessing(true)
    setError(null)
    try {
      const { geminiApiKey, geminiBaseUrl } = getSettings()
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Jpeg,
          translate,
          apiKey: geminiApiKey || undefined,
          baseUrl: geminiBaseUrl || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'OCR gagal')
      onResult(data.markdown)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memproses gambar. Coba lagi.')
    } finally {
      setProcessing(false)
    }
  }, [translate, onResult])

  const handleCameraCapture = useCallback((base64Jpeg: string) => {
    sendOcr(base64Jpeg)
  }, [sendOcr])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setUploadPreview(null)
    setUploadBase64(null)

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      setUploadPreview(dataUrl)
      setUploadBase64(base64)
    }
    reader.readAsDataURL(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }, [])

  const handleUploadOcr = useCallback(() => {
    if (!uploadBase64) return
    sendOcr(uploadBase64)
  }, [uploadBase64, sendOcr])

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(onClose, 300)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="bg-white rounded-t-3xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">

          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-9 h-1 bg-slate-200 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">OCR</h3>
              <p className="text-xs text-slate-400 mt-0.5">Ekstrak teks dari gambar</p>
            </div>
            <button type="button" onClick={handleClose} aria-label="Tutup"
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex mx-4 mb-3 bg-slate-100 rounded-xl p-1 shrink-0">
            {(['camera', 'upload'] as Tab[]).map(t => (
              <button key={t} type="button" onClick={() => { setTab(t); setError(null) }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150
                  ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {t === 'camera' ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                      <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                    </svg>
                    Kamera
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                    </svg>
                    Upload Foto
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Translate toggle — shared between tabs */}
          <div className="flex items-center justify-between px-4 pb-3 shrink-0">
            <ToggleSwitch checked={translate} onChange={setTranslate} label="Terjemahkan ke Indonesia" />
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {tab === 'camera' ? (
              <CameraView
                active={isOpen && tab === 'camera'}
                translate={translate}
                onTranslateChange={setTranslate}
                onCapture={handleCameraCapture}
                onError={setError}
              />
            ) : (
              /* Upload tab */
              <div className="px-4 pb-4 space-y-4">
                {/* Drop / pick zone */}
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className={`w-full rounded-2xl border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2 py-8 px-4
                    ${uploadPreview ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-sky-50'}`}>
                  {uploadPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={uploadPreview} alt="Preview" className="max-h-48 rounded-xl object-contain shadow-sm" />
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-slate-400">
                          <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-slate-600">Pilih foto dari galeri</p>
                      <p className="text-xs text-slate-400">JPG, PNG, WEBP</p>
                    </>
                  )}
                </button>

                {/* Hidden file input */}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

                {uploadPreview && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setUploadPreview(null); setUploadBase64(null) }}
                      className="flex-1 h-10 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors">
                      Ganti Foto
                    </button>
                    <button type="button" onClick={handleUploadOcr} disabled={processing || !uploadBase64}
                      className="flex-1 h-10 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                      {processing
                        ? <LoadingSpinner size="sm" className="border-sky-200 border-t-white" />
                        : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5z" clipRule="evenodd" />
                          </svg>
                      }
                      {processing ? (translate ? 'Menerjemahkan…' : 'Mengekstrak…') : 'Ekstrak Teks'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Processing bar */}
          {processing && tab === 'camera' && (
            <div className="px-4 py-3 bg-sky-50 border-t border-sky-100 flex items-center gap-3 shrink-0">
              <LoadingSpinner size="sm" className="border-sky-200 border-t-sky-500" />
              <p className="text-sm text-sky-700 font-medium">
                {translate ? 'Mengekstrak dan menerjemahkan…' : 'Mengekstrak teks…'}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-4 mb-3 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl flex items-start justify-between gap-2 shrink-0">
              <p className="text-sm text-red-600 flex-1 leading-snug">{error}</p>
              <button type="button" onClick={() => setError(null)}
                className="text-red-300 hover:text-red-500 transition-colors shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          {/* Offline notice */}
          {typeof navigator !== 'undefined' && !navigator.onLine && (
            <div className="mx-4 mb-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl shrink-0">
              <p className="text-xs text-amber-600">Tidak ada koneksi internet — OCR tidak tersedia</p>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
