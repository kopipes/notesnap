'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSettings, saveSettings, clearSettings, type AppSettings } from '@/lib/settings'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

async function triggerBackup() {
  const res = await fetch('/api/backup')
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? 'Backup gagal')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const cd = res.headers.get('Content-Disposition') ?? ''
  const match = cd.match(/filename="([^"]+)"/)
  a.download = match?.[1] ?? 'notesnap-backup.db'
  a.click()
  URL.revokeObjectURL(url)
}

export default function SettingsTab() {
  const router = useRouter()
  const [form, setForm] = useState<AppSettings>({
    geminiApiKey: '',
    geminiBaseUrl: 'https://ai.sumopod.com',
  })
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [backing, setBacking] = useState(false)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [me, setMe] = useState<{ username: string; role: string } | null>(null)

  useEffect(() => {
    setForm(getSettings())
    fetch('/api/auth/me').then(r => r.json()).then(setMe).catch(() => {})
  }, [])

  function handleChange(field: keyof AppSettings, value: string) {
    setSaved(false)
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    saveSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
  }

  async function handleBackup() {
    setBacking(true)
    setBackupError(null)
    try {
      await triggerBackup()
    } catch (e: unknown) {
      setBackupError(e instanceof Error ? e.message : 'Backup gagal')
    } finally {
      setBacking(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/60 safe-top">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center">
          <h1 className="text-sm font-bold text-slate-900">Pengaturan</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto w-full px-4 py-5 space-y-5">

        {/* Account info */}
        {me && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
              <span className="text-sky-600 font-bold text-sm uppercase">{me.username[0]}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{me.username}</p>
              <p className="text-xs text-slate-400 capitalize">{me.role}</p>
            </div>
          </div>
        )}

        {/* Gemini API section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-sky-500">
                <path fillRule="evenodd" d="M15.75 1.5a6.75 6.75 0 00-6.651 7.906c.067.39-.032.717-.221.906l-6.5 6.499a3 3 0 000 4.243 3 3 0 004.242 0 3 3 0 00.878-2.121v-2.129a.75.75 0 01.75-.75H12a.75.75 0 000-1.5H9a.75.75 0 01-.75-.75V9a.75.75 0 00-.75-.75H5.379a.75.75 0 01-.53-.22l-.879-.879A5.25 5.25 0 0115.75 1.5zm0 3a.75.75 0 000 1.5A2.25 2.25 0 0118 8.25a.75.75 0 001.5 0 3.75 3.75 0 00-3.75-3.75z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Gemini API</p>
              <p className="text-xs text-slate-400">Untuk fitur OCR kamera</p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-4">
            {/* API Key */}
            <div className="space-y-1.5">
              <label htmlFor="apiKey" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">API Key</label>
              <div className="relative">
                <input id="apiKey" type={showKey ? 'text' : 'password'} value={form.geminiApiKey}
                  onChange={e => handleChange('geminiApiKey', e.target.value)}
                  placeholder="AIzaSy…" autoComplete="off" spellCheck={false}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-11 text-sm font-mono text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 transition-colors"
                />
                <button type="button" onClick={() => setShowKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showKey
                    ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577a11.217 11.217 0 014.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113z" /><path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0115.75 12zM10.53 8.72l-4.899-4.9A11.26 11.26 0 001.323 11.44a1.45 1.45 0 000 1.12C2.813 16.776 7.027 20 12 20c1.84 0 3.567-.48 5.062-1.32l-3.584-3.584A3.75 3.75 0 018.25 12c0-.18.013-.357.037-.53z" /></svg>
                    : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113C21.186 17.023 16.97 20.25 12 20.25c-4.97 0-9.184-3.222-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" /></svg>
                  }
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Dapatkan kunci di{' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline font-medium">Google AI Studio</a>
              </p>
            </div>
            {/* Base URL */}
            <div className="space-y-1.5">
              <label htmlFor="baseUrl" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Base URL <span className="normal-case font-normal text-slate-400">(opsional)</span>
              </label>
              <input id="baseUrl" type="url" value={form.geminiBaseUrl}
                onChange={e => handleChange('geminiBaseUrl', e.target.value)}
                placeholder="https://ai.sumopod.com"
                autoComplete="off" spellCheck={false}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 transition-colors"
              />
            </div>
          </div>
          <div className="px-5 pb-5">
            <button type="button" onClick={handleSave}
              className="w-full h-10 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5">
              {saved
                ? <><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg>Tersimpan</>
                : 'Simpan'
              }
            </button>
          </div>
        </div>

        {/* Account & Users */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">Akun</p>
          </div>
          <div className="divide-y divide-slate-100">
            <button type="button" onClick={() => router.push('/users')}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-slate-400">
                  <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-slate-700">Kelola Pengguna</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-slate-300">
                <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Backup */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">Data</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-xs text-slate-500">Unduh salinan database SQLite sebagai cadangan.</p>
            {backupError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{backupError}</p>
            )}
            <button type="button" onClick={handleBackup} disabled={backing}
              className="w-full h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {backing
                ? <LoadingSpinner size="sm" className="border-slate-300 border-t-slate-600" />
                : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-slate-500">
                    <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                  </svg>
              }
              Backup Database
            </button>
          </div>
        </div>

        {/* Logout */}
        <button type="button" onClick={handleLogout}
          className="w-full h-11 rounded-2xl border border-red-100 bg-red-50 hover:bg-red-100 text-red-500 text-sm font-semibold transition-colors">
          Keluar
        </button>

      </div>
    </div>
  )
}
