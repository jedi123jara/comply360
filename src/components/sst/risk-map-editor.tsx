'use client'

import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Rect, Text, Image as KonvaImage, Circle, Group, Arrow } from 'react-konva'
import type Konva from 'konva'

export type MarkerKind =
  | 'PELIGRO'
  | 'EQUIPO_SEGURIDAD'
  | 'PUNTO_REUNION'
  | 'EXTINTOR'
  | 'BOTIQUIN'
  | 'SALIDA_EMERGENCIA'
  | 'RUTA_EVACUACION'
  | 'ZONA_RESTRINGIDA'
  | 'OTRO'

export type Severidad = 'TRIVIAL' | 'TOLERABLE' | 'MODERADO' | 'IMPORTANTE' | 'INTOLERABLE'

export interface Marker {
  id: string
  tipo: MarkerKind
  x: number
  y: number
  rotacion?: number
  etiqueta?: string | null
  severidad?: Severidad | null
}

export interface RiskMapLayout {
  planoUrl: string | null
  ancho: number
  alto: number
  markers: Marker[]
  notas?: string | null
}

const MARKER_COLOR: Record<MarkerKind, string> = {
  PELIGRO: '#dc2626',
  EQUIPO_SEGURIDAD: '#16a34a',
  PUNTO_REUNION: '#2563eb',
  EXTINTOR: '#dc2626',
  BOTIQUIN: '#16a34a',
  SALIDA_EMERGENCIA: '#2563eb',
  RUTA_EVACUACION: '#f59e0b',
  ZONA_RESTRINGIDA: '#7c3aed',
  OTRO: '#64748b',
}

const SEVERIDAD_COLOR: Record<Severidad, string> = {
  TRIVIAL: '#16a34a',
  TOLERABLE: '#06b6d4',
  MODERADO: '#f59e0b',
  IMPORTANTE: '#ef4444',
  INTOLERABLE: '#b91c1c',
}

const MARKER_LABEL: Record<MarkerKind, string> = {
  PELIGRO: 'Peligro',
  EQUIPO_SEGURIDAD: 'Equipo seguridad',
  PUNTO_REUNION: 'Punto reunión',
  EXTINTOR: 'Extintor',
  BOTIQUIN: 'Botiquín',
  SALIDA_EMERGENCIA: 'Salida emergencia',
  RUTA_EVACUACION: 'Ruta evacuación',
  ZONA_RESTRINGIDA: 'Zona restringida',
  OTRO: 'Otro',
}

// SVG simple para los iconos NTP — emoji-equivalente porque no tenemos SVGs propios
const MARKER_GLYPH: Record<MarkerKind, string> = {
  PELIGRO: '⚠',
  EQUIPO_SEGURIDAD: '🛡',
  PUNTO_REUNION: '★',
  EXTINTOR: '🧯',
  BOTIQUIN: '✚',
  SALIDA_EMERGENCIA: '↗',
  RUTA_EVACUACION: '➜',
  ZONA_RESTRINGIDA: '⛔',
  OTRO: '◆',
}

interface Props {
  initial: RiskMapLayout
  onChange: (layout: RiskMapLayout) => void
  selectedKind: MarkerKind
  selectedSeveridad: Severidad
  /** Modo: agregar marker / mover marker. */
  mode: 'add' | 'select'
  onMarkerSelect?: (id: string | null) => void
  selectedMarkerId?: string | null
}

/**
 * Editor visual de Mapa de Riesgos con Konva.js.
 *
 * - Click en zona vacía con `mode=add` → agrega un marker del kind seleccionado
 * - Click en marker con `mode=select` → selecciona y permite moverlo (drag)
 * - Doble click en marker → elimina (con confirmación del padre)
 *
 * Carga el plano de fondo si `initial.planoUrl` está presente.
 */
export default function RiskMapEditor({
  initial,
  onChange,
  selectedKind,
  selectedSeveridad,
  mode,
  onMarkerSelect,
  selectedMarkerId,
}: Props) {
  const [layout, setLayout] = useState<RiskMapLayout>(initial)
  const [planoImage, setPlanoImage] = useState<HTMLImageElement | null>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)

  // Cargar plano de fondo
  useEffect(() => {
    if (!layout.planoUrl) {
      setPlanoImage(null)
      return
    }
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => setPlanoImage(img)
    img.onerror = () => setPlanoImage(null)
    img.src = layout.planoUrl
  }, [layout.planoUrl])

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setContainerWidth(e.contentRect.width)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Sync incoming initial prop changes (e.g. after save)
  useEffect(() => {
    setLayout(initial)
  }, [initial])

  function emit(next: RiskMapLayout) {
    setLayout(next)
    onChange(next)
  }

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    if (mode !== 'add') return
    const stage = stageRef.current
    if (!stage) return
    // Solo si el target es el Stage o el Layer, no un marker
    const target = e.target
    if (target !== stage && target.getParent()?.attrs?.name !== 'background-layer') return

    const pos = stage.getPointerPosition()
    if (!pos) return

    // Convertir a coordenadas reales del layout (deshacer escalado)
    const scale = containerWidth / layout.ancho
    const x = pos.x / scale
    const y = pos.y / scale

    const newMarker: Marker = {
      id: `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      tipo: selectedKind,
      x,
      y,
      rotacion: 0,
      severidad: selectedKind === 'PELIGRO' ? selectedSeveridad : null,
    }
    emit({ ...layout, markers: [...layout.markers, newMarker] })
  }

  function handleMarkerDragEnd(id: string, x: number, y: number) {
    const next = {
      ...layout,
      markers: layout.markers.map((m) => (m.id === id ? { ...m, x, y } : m)),
    }
    emit(next)
  }

  const scale = containerWidth / layout.ancho
  const stageHeight = layout.alto * scale

  return (
    <div ref={containerRef} className="w-full">
      <Stage
        width={containerWidth}
        height={stageHeight}
        scaleX={scale}
        scaleY={scale}
        ref={stageRef}
        onClick={handleStageClick}
        style={{ cursor: mode === 'add' ? 'crosshair' : 'default' }}
      >
        {/* Fondo */}
        <Layer name="background-layer">
          <Rect width={layout.ancho} height={layout.alto} fill="#f8fafc" stroke="#cbd5e1" />
          {planoImage && (
            <KonvaImage
              image={planoImage}
              width={layout.ancho}
              height={layout.alto}
              opacity={0.85}
            />
          )}
        </Layer>

        {/* Markers */}
        <Layer>
          {layout.markers.map((m) => {
            const isSelected = m.id === selectedMarkerId
            const fill =
              m.tipo === 'PELIGRO' && m.severidad
                ? SEVERIDAD_COLOR[m.severidad]
                : MARKER_COLOR[m.tipo]
            const isRoute = m.tipo === 'RUTA_EVACUACION'

            return (
              <Group
                key={m.id}
                x={m.x}
                y={m.y}
                draggable={mode === 'select'}
                onClick={(e) => {
                  e.cancelBubble = true
                  onMarkerSelect?.(m.id)
                }}
                onDragEnd={(e) =>
                  handleMarkerDragEnd(m.id, e.target.x(), e.target.y())
                }
              >
                {isRoute ? (
                  <Arrow
                    points={[0, 0, 60, 0]}
                    pointerLength={10}
                    pointerWidth={10}
                    fill={fill}
                    stroke={fill}
                    strokeWidth={4}
                    rotation={m.rotacion ?? 0}
                  />
                ) : (
                  <>
                    <Circle
                      radius={isSelected ? 16 : 14}
                      fill={fill}
                      stroke={isSelected ? '#0f172a' : '#ffffff'}
                      strokeWidth={isSelected ? 3 : 2}
                      shadowColor="#000000"
                      shadowOpacity={0.2}
                      shadowBlur={4}
                      shadowOffsetY={1}
                    />
                    <Text
                      text={MARKER_GLYPH[m.tipo]}
                      x={-10}
                      y={-9}
                      width={20}
                      height={20}
                      align="center"
                      verticalAlign="middle"
                      fontSize={14}
                      fill="#ffffff"
                      fontStyle="bold"
                    />
                  </>
                )}
                {m.etiqueta && (
                  <Text
                    text={m.etiqueta}
                    x={-40}
                    y={20}
                    width={80}
                    align="center"
                    fontSize={9}
                    fill="#0f172a"
                    fontStyle="bold"
                  />
                )}
              </Group>
            )
          })}
        </Layer>
      </Stage>
    </div>
  )
}

export { MARKER_LABEL, MARKER_COLOR, SEVERIDAD_COLOR }
