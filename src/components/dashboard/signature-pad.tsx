'use client'

import { useRef, useState, useEffect, useCallback, type MouseEvent, type TouchEvent } from 'react'
import { Eraser, Undo2, PenTool, Type } from 'lucide-react'

// =============================================
// TYPES
// =============================================

interface SignaturePadProps {
  onSignature: (dataUrl: string) => void
  disabled?: boolean
  width?: number
  height?: number
}

type InputMode = 'draw' | 'type'

interface Point {
  x: number
  y: number
}

// =============================================
// SIGNATURE PAD COMPONENT
// =============================================

export default function SignaturePad({
  onSignature,
  disabled = false,
  width = 600,
  height = 200,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [mode, setMode] = useState<InputMode>('draw')
  const [typedName, setTypedName] = useState('')
  const [hasDrawing, setHasDrawing] = useState(false)
  const [history, setHistory] = useState<ImageData[]>([])
  const lastPoint = useRef<Point | null>(null)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  // Save state for undo
  const saveState = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory((prev) => [...prev.slice(-19), imageData]) // Keep max 20 states
  }, [])

  // Get canvas coordinates from event
  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number): Point => {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      }
    },
    []
  )

  // Drawing handlers
  const startDrawing = useCallback(
    (x: number, y: number) => {
      if (disabled || mode !== 'draw') return
      saveState()
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      setIsDrawing(true)
      setHasDrawing(true)
      lastPoint.current = { x, y }

      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y)
      ctx.stroke()
    },
    [disabled, mode, saveState]
  )

  const draw = useCallback(
    (x: number, y: number) => {
      if (!isDrawing || disabled) return
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx || !lastPoint.current) return

      ctx.beginPath()
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
      ctx.lineTo(x, y)
      ctx.stroke()
      lastPoint.current = { x, y }
    },
    [isDrawing, disabled]
  )

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
    lastPoint.current = null
  }, [])

  // Mouse events
  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e.clientX, e.clientY)
    startDrawing(point.x, point.y)
  }

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e.clientX, e.clientY)
    draw(point.x, point.y)
  }

  // Touch events
  const handleTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const touch = e.touches[0]
    const point = getCanvasPoint(touch.clientX, touch.clientY)
    startDrawing(point.x, point.y)
  }

  const handleTouchMove = (e: TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const touch = e.touches[0]
    const point = getCanvasPoint(touch.clientX, touch.clientY)
    draw(point.x, point.y)
  }

  // Clear canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    saveState()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasDrawing(false)
  }, [saveState])

  // Undo
  const undo = useCallback(() => {
    if (history.length === 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const prev = history[history.length - 1]
    ctx.putImageData(prev, 0, 0)
    setHistory((h) => h.slice(0, -1))

    // Check if canvas is empty after undo
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const isEmpty = imageData.data.every(
      (v, i) => i % 4 === 3 ? v === 255 : v === 255 // All white pixels
    )
    if (isEmpty) setHasDrawing(false)
  }, [history])

  // Render typed name as signature
  const renderTypedSignature = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !typedName.trim()) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    saveState()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = '#1a1a2e'
    ctx.font = 'italic 48px "Georgia", "Times New Roman", serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2)
    setHasDrawing(true)
  }, [typedName, saveState])

  // Export signature
  const handleSign = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    onSignature(dataUrl)
  }, [onSignature])

  const canSign = mode === 'draw' ? hasDrawing : typedName.trim().length > 0

  return (
    <div className="w-full space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('draw')}
          disabled={disabled}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${mode === 'draw'
              ? 'bg-blue-600 text-white'
              : 'bg-[color:var(--neutral-100)] text-gray-300 hover:bg-gray-200 bg-[color:var(--neutral-100)] hover:bg-[color:var(--neutral-100)]'
            }
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <PenTool className="h-4 w-4" />
          Dibujar
        </button>
        <button
          type="button"
          onClick={() => setMode('type')}
          disabled={disabled}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${mode === 'type'
              ? 'bg-blue-600 text-white'
              : 'bg-[color:var(--neutral-100)] text-gray-300 hover:bg-gray-200 bg-[color:var(--neutral-100)] hover:bg-[color:var(--neutral-100)]'
            }
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Type className="h-4 w-4" />
          Escribir nombre
        </button>
      </div>

      {/* Drawing canvas */}
      {mode === 'draw' && (
        <div className="space-y-2">
          <div className="relative border-2 border-dashed border-white/10 border-white/10 rounded-xl overflow-hidden bg-[#141824] bg-[#141824]">
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              className="w-full touch-none cursor-crosshair"
              style={{ maxWidth: `${width}px` }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={stopDrawing}
              onTouchCancel={stopDrawing}
            />
            {!hasDrawing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-gray-400 text-sm">
                  Dibuje su firma aqui
                </p>
              </div>
            )}
            {/* Signature line */}
            <div className="absolute bottom-8 left-8 right-8 border-b border-white/10 border-white/10 pointer-events-none" />
          </div>

          {/* Drawing toolbar */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={undo}
              disabled={disabled || history.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[color:var(--neutral-100)] text-gray-300 hover:bg-gray-200 bg-[color:var(--neutral-100)] hover:bg-[color:var(--neutral-100)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Deshacer
            </button>
            <button
              type="button"
              onClick={clearCanvas}
              disabled={disabled || !hasDrawing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[color:var(--neutral-100)] text-gray-300 hover:bg-gray-200 bg-[color:var(--neutral-100)] hover:bg-[color:var(--neutral-100)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Eraser className="h-3.5 w-3.5" />
              Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Type signature */}
      {mode === 'type' && (
        <div className="space-y-3">
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Escriba su nombre completo"
            disabled={disabled}
            className="w-full px-4 py-3 border border-white/10 border-white/10 rounded-xl bg-[#141824] bg-[#141824] text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {typedName.trim() && (
            <div className="border-2 border-dashed border-white/10 border-white/10 rounded-xl p-8 bg-[#141824] bg-[#141824] text-center">
              <p
                className="text-4xl text-white"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic' }}
              >
                {typedName}
              </p>
              <div className="mt-4 mx-8 border-b border-white/10 border-white/10" />
            </div>
          )}

          {/* Hidden canvas for typed signature export */}
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="hidden"
          />
        </div>
      )}

      {/* Sign button */}
      <button
        type="button"
        onClick={() => {
          if (mode === 'type') {
            renderTypedSignature()
            // Small delay to let canvas render
            setTimeout(() => handleSign(), 50)
          } else {
            handleSign()
          }
        }}
        disabled={disabled || !canSign}
        className="w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
      >
        <PenTool className="h-5 w-5" />
        Firmar
      </button>
    </div>
  )
}
