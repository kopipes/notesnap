'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useFrameSampler } from './useFrameSampler'
import CameraControls from './CameraControls'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface CameraViewProps {
  active: boolean
  onCapture: (base64Jpeg: string) => void
  onError: (msg: string) => void
}

export default function CameraView({
  active,
  onCapture,
  onError,
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [camReady, setCamReady] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)

  // Zoom state — 1.0 to maxZoom
  const [zoom, setZoom] = useState(1)
  const [maxZoom, setMaxZoom] = useState(4)
  const [supportsNativeZoom, setSupportsNativeZoom] = useState(false)

  // Start/stop camera stream
  useEffect(() => {
    if (!active) {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setCamReady(false)
      setZoom(1)
      return
    }

    let cancelled = false

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }

        // Check native zoom support via MediaStreamTrack capabilities
        const videoTrack = stream.getVideoTracks()[0]
        if (videoTrack) {
          const caps = videoTrack.getCapabilities() as MediaTrackCapabilities & { zoom?: { min: number; max: number; step: number } }
          if (caps.zoom) {
            setSupportsNativeZoom(true)
            setMaxZoom(Math.min(caps.zoom.max, 8))
          }
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

  // Apply zoom whenever it changes
  useEffect(() => {
    if (!camReady || !streamRef.current) return
    const videoTrack = streamRef.current.getVideoTracks()[0]
    if (!videoTrack) return

    if (supportsNativeZoom) {
      // Hardware zoom — apply via applyConstraints
      videoTrack.applyConstraints({ advanced: [{ zoom } as MediaTrackConstraintSet] } ).catch(() => {})
    }
    // CSS scale zoom is applied inline on the video element (see below)
  }, [zoom, camReady, supportsNativeZoom])

  const handleVideoReady = useCallback(() => { setCamReady(true) }, [])

  const handleZoomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setZoom(Number(e.target.value))
  }, [])

  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(+(z + 0.5).toFixed(1), maxZoom))
  }, [maxZoom])

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(+(z - 0.5).toFixed(1), 1))
  }, [])

  const { isCapturing, triggerManualCapture } =
    useFrameSampler({ videoRef, active: false, onCapture })

  if (permissionError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
        <div className="text-4xl">🔒</div>
        <p className="text-sm text-white/80">{permissionError}</p>
      </div>
    )
  }

  // CSS zoom transform when native zoom not available
  const cssScale = supportsNativeZoom ? 1 : zoom

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
          className="w-full h-full object-cover transition-transform duration-150"
          style={{ transform: `scale(${cssScale})`, transformOrigin: 'center center' }}
        />

        {/* Corner markers */}
        {camReady && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/70 rounded-tl-sm" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/70 rounded-tr-sm" />
            <div className="absolute bottom-14 left-4 w-8 h-8 border-b-2 border-l-2 border-white/70 rounded-bl-sm" />
            <div className="absolute bottom-14 right-4 w-8 h-8 border-b-2 border-r-2 border-white/70 rounded-br-sm" />
          </div>
        )}

        {/* Loading overlay */}
        {!camReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <LoadingSpinner size="lg" className="border-gray-600 border-t-white" />
          </div>
        )}

        {/* Capturing flash */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
        )}

        {/* Zoom controls — overlay at bottom of video */}
        {camReady && (
          <div className="absolute bottom-0 inset-x-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent flex items-center gap-2">
            {/* Zoom out */}
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 1}
              aria-label="Zoom out"
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white disabled:opacity-40 transition-colors shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5zm4.5 0a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Slider */}
            <input
              type="range"
              min={1}
              max={maxZoom}
              step={0.1}
              value={zoom}
              onChange={handleZoomChange}
              aria-label="Zoom level"
              className="flex-1 h-1 accent-white cursor-pointer"
            />

            {/* Zoom in */}
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= maxZoom}
              aria-label="Zoom in"
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white disabled:opacity-40 transition-colors shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5zm4.5 0a.75.75 0 01.75-.75h3v-3a.75.75 0 011.5 0v3h3a.75.75 0 010 1.5h-3v3a.75.75 0 01-1.5 0v-3h-3a.75.75 0 01-.75-.75z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Zoom level label */}
            <span className="text-white text-xs font-medium w-8 text-right shrink-0">
              {zoom.toFixed(1)}×
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <CameraControls
        onCapture={triggerManualCapture}
        isCapturing={isCapturing}
        disabled={!camReady}
      />
    </div>
  )
}
