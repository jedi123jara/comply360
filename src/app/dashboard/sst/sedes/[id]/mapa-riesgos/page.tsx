'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Save,
  Trash2,
  MousePointer2,
  Plus,
  ImageIcon,
  AlertTriangle,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { RiskMapLayout, MarkerKind, Severidad } from '@/components/sst/risk-map-editor'

// Konva no funciona en SSR, lo cargamos dinámicamente solo en cliente
const RiskMapEditor = dynamic(() => import('@/components/sst/risk-map-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-16 text-slate-500">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Cargando editor...
    </div>
  ),
})

const KIND_LABELS: Record<MarkerKind, string> = {
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

const KINDS: MarkerKind[] = [
  'PELIGRO',
  'EQUIPO_SEGURIDAD',
  'PUNTO_REUNION',
  'EXTINTOR',
  'BOTIQUIN',
  'SALIDA_EMERGENCIA',
  'RUTA_EVACUACION',
  'ZONA_RESTRINGIDA',
  'OTRO',
]

const SEVERIDADES: Severidad[] = [
  'TRIVIAL',
  'TOLERABLE',
  'MODERADO',
  'IMPORTANTE',
  'INTOLERABLE',
]

interface SedeInfo {
  id: string
  nombre: string
  planoArchivoUrl: string | null
}

const DEFAULT_LAYOUT: RiskMapLayout = {
  planoUrl: null,
  ancho: 1200,
  alto: 800,
  markers: [],
  notas: null,
}

export default function MapaRiesgosPage() {
  const params = useParams<{ id: string }>()
  const sedeId = params.id

  const [sede, setSede] = useState<SedeInfo | null>(null)
  const [layout, setLayout] = useState<RiskMapLayout>(DEFAULT_LAYOUT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  // Sidebar state
  const [mode, setMode] = useState<'add' | 'select'>('add')
  const [selectedKind, setSelectedKind] = useState<MarkerKind>('PELIGRO')
  const [selectedSev, setSelectedSev] = useState<Severidad>('MODERADO')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/sst/sedes/${sedeId}/mapa-riesgos`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j?.error || 'No se pudo cargar el mapa')
        }
        return r.json()
      })
      .then((j) => {
        if (cancelled) return
        setSede(j.sede)
        if (j.mapa) {
          setLayout({
            ...DEFAULT_LAYOUT,
            ...j.mapa,
            planoUrl: j.mapa.planoUrl ?? j.sede.planoArchivoUrl ?? null,
          })
        } else {
          setLayout({
            ...DEFAULT_LAYOUT,
            planoUrl: j.sede.planoArchivoUrl ?? null,
          })
        }
        if (j.updatedAt) setSavedAt(j.updatedAt)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error desconocido')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sedeId])

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/sst/sedes/${sedeId}/mapa-riesgos`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(layout),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(j?.error || 'No se pudo guardar')
        return
      }
      setSavedAt(j.savedAt)
      setDirty(false)
      toast.success('Mapa guardado')
    } finally {
      setSaving(false)
    }
  }

  function handleLayoutChange(next: RiskMapLayout) {
    setLayout(next)
    setDirty(true)
  }

  function eliminarMarker() {
    if (!selectedId) return
    setLayout((l) => ({ ...l, markers: l.markers.filter((m) => m.id !== selectedId) }))
    setSelectedId(null)
    setDirty(true)
  }

  if (loading && !sede) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Cargando...
      </div>
    )
  }

  if (error || !sede) {
    return (
      <Card className="border-rose-200 bg-rose-50/60">
        <CardContent className="py-6 text-sm text-rose-700">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          {error ?? 'Error desconocido'}
        </CardContent>
      </Card>
    )
  }

  const selectedMarker = layout.markers.find((m) => m.id === selectedId) ?? null

  return (
    <div className="space-y-4">
      <Link
        href={`/dashboard/sst/sedes/${sedeId}`}
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-emerald-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver a la sede
      </Link>

      <PageHeader
        eyebrow="SST · Sede"
        title={`Mapa de Riesgos · ${sede.nombre}`}
        subtitle="Editor visual del mapa de riesgos según Ley 29783 Art. 35.a (mapa exhibido en sede). Arrastra los marcadores sobre el plano para ubicar peligros y equipos de seguridad."
        actions={
          <div className="flex items-center gap-2">
            {dirty && <Badge variant="warning" size="xs">Sin guardar</Badge>}
            {savedAt && !dirty && (
              <span className="text-xs text-slate-500">
                Guardado {new Date(savedAt).toLocaleTimeString('es-PE')}
              </span>
            )}
            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <Card>
          <CardContent className="space-y-4 py-5">
            {/* Modo */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Herramienta
              </label>
              <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setMode('add')}
                  className={`flex flex-1 items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium ${
                    mode === 'add'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar
                </button>
                <button
                  type="button"
                  onClick={() => setMode('select')}
                  className={`flex flex-1 items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium ${
                    mode === 'select'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <MousePointer2 className="h-3.5 w-3.5" />
                  Mover
                </button>
              </div>
            </div>

            {/* Tipo de marker (solo en modo add) */}
            {mode === 'add' && (
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tipo
                </label>
                <div className="grid grid-cols-1 gap-1">
                  {KINDS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSelectedKind(k)}
                      className={`rounded px-2 py-1.5 text-left text-xs ${
                        selectedKind === k
                          ? 'bg-emerald-100 font-semibold text-emerald-900'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {KIND_LABELS[k]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Severidad (solo si tipo PELIGRO en modo add) */}
            {mode === 'add' && selectedKind === 'PELIGRO' && (
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Severidad del peligro
                </label>
                <select
                  value={selectedSev}
                  onChange={(e) => setSelectedSev(e.target.value as Severidad)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                >
                  {SEVERIDADES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Marker seleccionado */}
            {mode === 'select' && selectedMarker && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
                <p className="text-xs font-semibold text-emerald-900">
                  {KIND_LABELS[selectedMarker.tipo]}
                </p>
                <input
                  type="text"
                  placeholder="Etiqueta opcional"
                  className="mt-2 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                  value={selectedMarker.etiqueta ?? ''}
                  onChange={(e) =>
                    handleLayoutChange({
                      ...layout,
                      markers: layout.markers.map((m) =>
                        m.id === selectedId ? { ...m, etiqueta: e.target.value } : m,
                      ),
                    })
                  }
                  maxLength={80}
                />
                {selectedMarker.tipo === 'RUTA_EVACUACION' && (
                  <div className="mt-2">
                    <label className="text-[10px] text-emerald-900">Rotación (grados)</label>
                    <input
                      type="number"
                      step={15}
                      className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                      value={selectedMarker.rotacion ?? 0}
                      onChange={(e) =>
                        handleLayoutChange({
                          ...layout,
                          markers: layout.markers.map((m) =>
                            m.id === selectedId
                              ? { ...m, rotacion: Number(e.target.value) }
                              : m,
                          ),
                        })
                      }
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={eliminarMarker}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
                >
                  <Trash2 className="h-3 w-3" />
                  Eliminar
                </button>
              </div>
            )}

            {/* Plano de fondo */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Plano de fondo
              </label>
              {layout.planoUrl ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-2">
                  <p className="break-all text-[10px] text-slate-600">{layout.planoUrl}</p>
                  <button
                    type="button"
                    onClick={() => {
                      handleLayoutChange({ ...layout, planoUrl: null })
                    }}
                    className="mt-2 text-xs font-medium text-rose-600 hover:text-rose-700"
                  >
                    Quitar plano
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="url"
                    placeholder="https://...plano.png"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                    onBlur={(e) => {
                      const v = e.target.value.trim()
                      if (v) handleLayoutChange({ ...layout, planoUrl: v })
                    }}
                  />
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                    <ImageIcon className="h-3 w-3" />
                    JPG/PNG con dimensiones que coincidan con el área (ancho × alto).
                  </p>
                </div>
              )}
            </div>

            {/* Tamaño */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tamaño del lienzo
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs">
                  <span className="text-slate-500">Ancho</span>
                  <input
                    type="number"
                    min={400}
                    max={4000}
                    step={50}
                    className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                    value={layout.ancho}
                    onChange={(e) =>
                      handleLayoutChange({ ...layout, ancho: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="text-xs">
                  <span className="text-slate-500">Alto</span>
                  <input
                    type="number"
                    min={400}
                    max={4000}
                    step={50}
                    className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                    value={layout.alto}
                    onChange={(e) =>
                      handleLayoutChange({ ...layout, alto: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
            </div>

            {/* Stats */}
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500">
                {layout.markers.length} marcador
                {layout.markers.length === 1 ? '' : 'es'} en el plano
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Editor */}
        <Card>
          <CardContent className="overflow-hidden p-0">
            <RiskMapEditor
              initial={layout}
              onChange={handleLayoutChange}
              selectedKind={selectedKind}
              selectedSeveridad={selectedSev}
              mode={mode}
              onMarkerSelect={setSelectedId}
              selectedMarkerId={selectedId}
            />
          </CardContent>
        </Card>
      </div>

      {/* Disclaimer impresión */}
      <Card className="border-amber-200 bg-amber-50/40">
        <CardContent className="flex items-start gap-2 py-3 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
          <span>
            Ley 29783 Art. 35.a obliga a exhibir el mapa de riesgos en un lugar visible. Imprime
            la captura del editor en tamaño A2/A1. Recomendamos guardar versión impresa en la
            sede + versión digital en este sistema.
          </span>
        </CardContent>
      </Card>
    </div>
  )
}
