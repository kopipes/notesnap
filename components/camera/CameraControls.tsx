'use client'

import ToggleSwitch from '@/components/ui/ToggleSwitch'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface CameraControlsProps {
  translate: boolean
  onTranslateChange: (v: boolean) => void
  onManualCapture: () => void
  isCapturing: boolean
  isStable: boolean
  stabilityLevel: number
  disabled?: boolean
}

const STABILITY_COLORS = [
  'bg-gray-400 dark:bg-gray-600',  // 0 — moving
  'bg-yellow-400',                  // 1 — steadying
  'bg-yellow-300',                  // 2 — almost stable
  'bg-green-400',                   // 3 — stable / capturing
]

export default function CameraControls({
  translate,
  onTranslateChange,
  onManualCapture,
  isCapturing,
  isStable,
  stabilityLevel,
  disabled = false,
}: CameraControlsProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
      {/* Stability indicator */}
      <div className="flex items-center gap-2">
        <span
          title={
            isCapturing
              ? 'Mengambil gambar…'
              : isStable
              ? 'Stabil — mengambil gambar'
              : 'Gerakkan kamera ke teks'
          }
          className={`
            w-3 h-3 rounded-full transition-colors duration-300
            ${isCapturing ? 'bg-green-400 animate-pulse' : STABILITY_COLORS[stabilityLevel]}
          `}
        />
        <span className="text-xs text-gray-300">
          {isCapturing
            ? 'Mengambil…'
            : isStable
            ? 'Stabil'
            : 'Mendeteksi…'}
        </span>
      </div>

      {/* Translate toggle */}
      <ToggleSwitch
        checked={translate}
        onChange={onTranslateChange}
        label="Terjemahkan"
        disabled={disabled}
      />

      {/* Manual capture */}
      <button
        type="button"
        onClick={onManualCapture}
        disabled={isCapturing || disabled}
        className="
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg
          bg-white/20 hover:bg-white/30 active:bg-white/40
          text-white text-xs font-medium
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        "
      >
        {isCapturing ? (
          <LoadingSpinner size="sm" className="border-white border-t-transparent" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
            <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
          </svg>
        )}
        Ambil Sekarang
      </button>
    </div>
  )
}
