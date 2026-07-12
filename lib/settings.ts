// Client-side settings stored in localStorage.
// Never stored on the server — API key stays in the browser only.

export type CameraMode = 'fast' | 'balanced' | 'stage' | 'hq'

export interface CameraModeConfig {
  id: CameraMode
  label: string
  description: string
  maxWidth: number
  jpegQuality: number
  model: string
  sharpen: boolean
}

export const CAMERA_MODES: CameraModeConfig[] = [
  {
    id: 'fast',
    label: 'Cepat',
    description: 'Jarak dekat, cahaya baik. Paling cepat.',
    maxWidth: 800,
    jpegQuality: 0.6,
    model: 'gemini/gemini-2.5-flash-lite',
    sharpen: false,
  },
  {
    id: 'balanced',
    label: 'Seimbang',
    description: 'Untuk kebanyakan situasi. Kecepatan & kualitas seimbang.',
    maxWidth: 1200,
    jpegQuality: 0.75,
    model: 'gemini/gemini-2.5-flash-lite',
    sharpen: false,
  },
  {
    id: 'stage',
    label: 'Panggung',
    description: 'LED/proyektor dari jarak jauh. Resolusi penuh + sharpening.',
    maxWidth: 9999,
    jpegQuality: 0.85,
    model: 'gemini/gemini-2.5-flash',
    sharpen: true,
  },
  {
    id: 'hq',
    label: 'Kualitas Tinggi',
    description: 'Detail maksimal. Paling lambat.',
    maxWidth: 9999,
    jpegQuality: 0.92,
    model: 'gemini/gemini-2.5-flash',
    sharpen: false,
  },
]

export function getCameraModeConfig(mode: CameraMode): CameraModeConfig {
  return CAMERA_MODES.find(m => m.id === mode) ?? CAMERA_MODES[1]
}

export type UiScale = 'normal' | 'large' | 'larger'

export const UI_SCALE_VALUES: Record<UiScale, number> = {
  normal: 1,
  large: 1.15,
  larger: 1.30,
}

export interface AppSettings {
  geminiApiKey: string
  geminiBaseUrl: string
  cameraMode: CameraMode
  darkMode: boolean
  uiScale: UiScale
}

const STORAGE_KEY = 'notesnap_settings'

const DEFAULTS: AppSettings = {
  geminiApiKey: '',
  geminiBaseUrl: 'https://ai.sumopod.com',
  cameraMode: 'balanced',
  darkMode: false,
  uiScale: 'normal',
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
      cameraMode: (parsed.cameraMode as CameraMode) || DEFAULTS.cameraMode,
      darkMode: parsed.darkMode ?? DEFAULTS.darkMode,
      uiScale: (parsed.uiScale as UiScale) || DEFAULTS.uiScale,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

/** Read dark mode preference directly (no full settings parse needed) */
export function getDarkMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    return (JSON.parse(raw) as Partial<AppSettings>).darkMode ?? false
  } catch {
    return false
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
