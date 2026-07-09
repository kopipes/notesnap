'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface User {
  id: string
  username: string
  role: string
  createdAt: string
}

interface ChangePwState {
  userId: string
  username: string
  password: string
  loading: boolean
  error: string | null
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [me, setMe] = useState<{ userId: string; role: string } | null>(null)

  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [changePw, setChangePw] = useState<ChangePwState | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error('Gagal memuat pengguna')
      setUsers(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(setMe).catch(() => {})
    fetchUsers()
  }, [fetchUsers])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true); setAddError(null)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword, role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) { setAddError(data.error ?? 'Gagal menambahkan'); return }
      setNewUsername(''); setNewPassword(''); setNewRole('user')
      await fetchUsers()
    } catch { setAddError('Terjadi kesalahan') }
    finally { setAdding(false) }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Hapus pengguna "${user.username}"?`)) return
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
    if (res.ok) fetchUsers()
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!changePw) return
    setChangePw(p => p ? { ...p, loading: true, error: null } : null)
    try {
      const res = await fetch(`/api/users/${changePw.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: changePw.password }),
      })
      const data = await res.json()
      if (!res.ok) { setChangePw(p => p ? { ...p, loading: false, error: data.error } : null); return }
      setChangePw(null)
    } catch { setChangePw(p => p ? { ...p, loading: false, error: 'Terjadi kesalahan' } : null) }
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Nav */}
      <nav className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 safe-top">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center gap-3">
          <button type="button" onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
            </svg>
          </button>
          <h1 className="text-sm font-bold text-slate-900 dark:text-slate-50">Kelola Pengguna</h1>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        <div className="pt-1 pb-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Pengguna</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tambah, ubah password, atau hapus pengguna.</p>
        </div>

        {/* User list */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Daftar Pengguna</p>
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><LoadingSpinner size="md" className="border-slate-200 dark:border-slate-700 border-t-sky-500" /></div>
          ) : error ? (
            <p className="px-5 py-4 text-sm text-red-500">{error}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map(user => (
                <li key={user.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.username}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wide ${user.role === 'admin' ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                        {user.role}
                      </span>
                      {me?.userId === user.id && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Saya</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    <button type="button"
                      onClick={() => setChangePw({ userId: user.id, username: user.username, password: '', loading: false, error: null })}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors">
                      Ubah Password
                    </button>
                    {me?.userId !== user.id && me?.role === 'admin' && (
                      <button type="button" onClick={() => handleDelete(user)}
                        className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.499.058l.346-9z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add user — admin only */}
        {me?.role === 'admin' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tambah Pengguna Baru</p>
            </div>
            <form onSubmit={handleAdd} className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Username</label>
                  <input type="text" value={newUsername} onChange={e => { setNewUsername(e.target.value); setAddError(null) }}
                    placeholder="username" required minLength={3}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 transition-colors" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Password</label>
                  <input type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setAddError(null) }}
                    placeholder="min. 6 karakter" required minLength={6}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 transition-colors" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Role</label>
                <div className="flex gap-2">
                  {(['user', 'admin'] as const).map(r => (
                    <button key={r} type="button" onClick={() => setNewRole(r)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border capitalize transition-colors ${newRole === r ? 'bg-sky-500 border-sky-500 text-white' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-sky-300 dark:hover:border-sky-700'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {addError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900 rounded-xl px-3 py-2">{addError}</p>}
              <button type="submit" disabled={adding}
                className="w-full h-10 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {adding ? <LoadingSpinner size="sm" className="border-sky-200 border-t-white" /> : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                  </svg>
                )}
                Tambah Pengguna
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Change password modal */}
      {changePw && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setChangePw(null)} />
          <div className="relative w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 z-10">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-1">Ubah Password</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Pengguna: <span className="font-medium text-slate-700 dark:text-slate-300">{changePw.username}</span></p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Password Baru</label>
                <input type="password" value={changePw.password}
                  onChange={e => setChangePw(p => p ? { ...p, password: e.target.value, error: null } : null)}
                  placeholder="min. 6 karakter" required minLength={6} autoFocus
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 transition-colors" />
              </div>
              {changePw.error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900 rounded-xl px-3 py-2">{changePw.error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setChangePw(null)}
                  className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Batal</button>
                <button type="submit" disabled={changePw.loading || changePw.password.length < 6}
                  className="flex-1 h-10 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center">
                  {changePw.loading ? <LoadingSpinner size="sm" className="border-sky-200 border-t-white" /> : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
