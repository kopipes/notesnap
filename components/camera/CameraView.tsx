'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useFrameSampler } from './useFrameSampler'
import CameraControls from './CameraControls'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface CameraViewProps {
  active: boolean
  translate: boolean
  onTranslateChange: (v: boolean) => void
  onCapture: (base64Jpeg: string) => void
  onError: (msg: string) => void
}

export default function CameraView({
  active,
  translate,
  onTranslateChange,
  onCapture,
  onError,
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [camReady, setCamReady] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)

  // Start/stop camera stream
  useEffect(() => {
    if (!active) {
      // Stop stream when panel closes
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setCamReady(false)
      return
    }

    let cancelled = false

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const isDenied =
          err instanceof DOMException &&
          (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')

        const msg = isDenied
          ? 'Akses kamera ditolak. Buka Pengaturan browser untuk mengizinkan kamera.'
          : 'Kamera tidak tersedia di perangkat ini.'

        setPermissionError(msg)
        onError(msg)
      })

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [active, onError])

  const handleVideoReady = useCallback(() => {
    setCamReady(true)
  }, [])

  const { isStable, isCapturing, stabilityLevel, triggerManualCapture } =
    useFrameSampler({
      videoRef,
      active: active && camReady,
      onCapture,
    })

  if (permissionError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
        <div className="text-4xl">🔒</div>
        <p className="text-sm text-white/80">{permissionError}</p>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col">
      {/* Video */}
      <div className="relative aspect-video bg-black overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedData={handleVideoReady}
          className="w-full h-full object-cover"
        />

        {/* Corner marker overlay */}
        {camReady && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Top-left */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/70 rounded-tl-sm" />
            {/* Top-right */}
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/70 rounded-tr-sm" />
            {/* Bottom-left */}
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white/70 rounded-bl-sm" />
            {/* Bottom-right */}
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white/70 rounded-br-sm" />
          </div>
        )}

        {/* Loading overlay */}
        {!camReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <LoadingSpinner size="lg" className="border-gray-600 border-t-white" />
          </div>
        )}

        {/* Capturing flash overlay */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Controls */}
      <CameraControls
        translate={translate}
        onTranslateChange={onTranslateChange}
        onManualCapture={triggerManualCapture}
        isCapturing={isCapturing}
        isStable={isStable}
        stabilityLevel={stabilityLevel}
        disabled={!camReady}
      />
    </div>
  )
}
