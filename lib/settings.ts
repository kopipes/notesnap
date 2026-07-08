// Client-side settings stored in localStorage.
// Never stored on the server — API key stays in the browser only.

export interface AppSettings {
  geminiApiKey: string
  geminiBaseUrl: string
}

const STORAGE_KEY = 'notesnap_settings'

const DEFAULTS: AppSettings = {
  geminiApiKey: '',
  geminiBaseUrl: 'https://generativelanguage.googleapis.com',
}

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      geminiApiKey: parsed.geminiApiKey ?? DEFAULTS.geminiApiKey,
      geminiBaseUrl: parsed.geminiBaseUrl || DEFAULTS.geminiBaseUrl,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function clearSettings(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
