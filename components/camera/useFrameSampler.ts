'use client'

import { useRef, useEffect, useCallback, useState } from 'react'

export interface CaptureConfig {
  maxWidth: number
  jpegQuality: number
  sharpen: boolean
}

interface UseFrameSamplerOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  active: boolean
  onCapture: (base64Jpeg: string) => void
  captureConfig?: CaptureConfig
  /** Pixel diff threshold per channel (0–255). Default: 15 */
  diffThreshold?: number
  /** How many consecutive stable frames before auto-capture. Default: 3 */
  stableFramesRequired?: number
  /** Sample interval in ms. Default: 500 */
  interval?: number
  /** Number of grid sample points per axis (total = n²). Default: 10 → 100 pts */
  gridSize?: number
}

interface UseFrameSamplerResult {
  isStable: boolean
  isCapturing: boolean
  triggerManualCapture: () => void
  /** 0–3 stability level for UI indicator */
  stabilityLevel: number
}

export function useFrameSampler({
  videoRef,
  active,
  onCapture,
  captureConfig,
  diffThreshold = 15,
  stableFramesRequired = 3,
  interval = 500,
  gridSize = 10,
}: UseFrameSamplerOptions): UseFrameSamplerResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const prevDataRef = useRef<Uint8ClampedArray | null>(null)
  const stableCountRef = useRef(0)
  const isCapturingRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [isStable, setIsStable] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [stabilityLevel, setStabilityLevel] = useState(0)

  // Ensure hidden canvas exists
  useEffect(() => {
    if (!canvasRef.current) {
      const c = document.createElement('canvas')
      c.width = 320
      c.height = 240
      c.style.display = 'none'
      document.body.appendChild(c)
      canvasRef.current = c
    }
    return () => {
      canvasRef.current?.remove()
      canvasRef.current = null
    }
  }, [])

  const doCapture = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || isCapturingRef.current) return

    const maxWidth = captureConfig?.maxWidth ?? 800
    const jpegQuality = captureConfig?.jpegQuality ?? 0.6
    const sharpen = captureConfig?.sharpen ?? false

    const origWidth = video.videoWidth || 640
    const origHeight = video.videoHeight || 480
    const scale = Math.min(1, maxWidth / origWidth)

    const captureCanvas = document.createElement('canvas')
    captureCanvas.width = Math.round(origWidth * scale)
    captureCanvas.height = Math.round(origHeight * scale)
    const ctx = captureCanvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height)

    // Apply sharpening via convolution for Stage/HQ modes
    if (sharpen) {
      const imageData = ctx.getImageData(0, 0, captureCanvas.width, captureCanvas.height)
      const src = new Uint8ClampedArray(imageData.data)
      const w = captureCanvas.width, h = captureCanvas.height
      // Unsharp mask kernel
      const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0]
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          for (let c = 0; c < 3; c++) {
            let val = 0
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                val += src[((y + ky) * w + (x + kx)) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)]
              }
            }
            imageData.data[(y * w + x) * 4 + c] = Math.min(255, Math.max(0, val))
          }
        }
      }
      ctx.putImageData(imageData, 0, 0)
    }

    const dataUrl = captureCanvas.toDataURL('image/jpeg', jpegQuality)
    const base64 = dataUrl.split(',')[1]

    isCapturingRef.current = true
    setIsCapturing(true)
    stableCountRef.current = 0
    setIsStable(false)
    setStabilityLevel(0)
    prevDataRef.current = null

    onCapture(base64)

    // Reset capturing flag after a short delay
    setTimeout(() => {
      isCapturingRef.current = false
      setIsCapturing(false)
    }, 2000)
  }, [videoRef, onCapture])

  // Pixel-diff sampling on a uniform grid
  const sampleFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !active || video.readyState < 2) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const { data, width, height } = imageData

    const prev = prevDataRef.current

    if (prev) {
      let totalDiff = 0
      const stepX = Math.floor(width / gridSize)
      const stepY = Math.floor(height / gridSize)

      for (let gy = 0; gy < gridSize; gy++) {
        for (let gx = 0; gx < gridSize; gx++) {
          const x = gx * stepX
          const y = gy * stepY
          const idx = (y * width + x) * 4
          const dr = Math.abs(data[idx] - prev[idx])
          const dg = Math.abs(data[idx + 1] - prev[idx + 1])
          const db = Math.abs(data[idx + 2] - prev[idx + 2])
          totalDiff += (dr + dg + db) / 3
        }
      }

      const avgDiff = totalDiff / (gridSize * gridSize)
      const stable = avgDiff < diffThreshold

      if (stable) {
        stableCountRef.current = Math.min(stableCountRef.current + 1, stableFramesRequired)
      } else {
        stableCountRef.current = 0
      }

      setStabilityLevel(stableCountRef.current)
      const nowStable = stableCountRef.current >= stableFramesRequired
      setIsStable(nowStable)

      if (nowStable && !isCapturingRef.current) {
        doCapture()
      }
    }

    // Clone pixel data for next comparison
    prevDataRef.current = new Uint8ClampedArray(data)
  }, [videoRef, active, diffThreshold, stableFramesRequired, gridSize, doCapture])

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      stableCountRef.current = 0
      prevDataRef.current = null
      setIsStable(false)
      setStabilityLevel(0)
      setIsCapturing(false)
      isCapturingRef.current = false
      return
    }

    intervalRef.current = setInterval(sampleFrame, interval)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [active, interval, sampleFrame])

  return {
    isStable,
    isCapturing,
    stabilityLevel,
    triggerManualCapture: doCapture,
  }
}
