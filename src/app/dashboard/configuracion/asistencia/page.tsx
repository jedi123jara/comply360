'use client'

/**
 * Configuración de Asistencia — Geofences (zonas permitidas para marcar).
 *
 * MVP Sprint 3: editor sin mapa, solo formulario lat/lng + radio. El mapa
 * Leaflet/MapBox se añade en Sprint 5+.
 *
 * Casos de uso:
 *   - Oficina única: 1 fence circular con radio ~50m alrededor del centro
 *   - Multi-sede: N fences uno por local
 *   - Obra de construcción: fence polygon con los vértices del lote
 *
 * Cómo obtener lat/lng:
 *   1. Abre Google Maps en la dirección del local
 *   2. Click derecho sobre el punto exacto
 *   3. Copia las coordenadas (la primera es lat, la segunda lng)
 */

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, Plus, Trash2, Loader2, ExternalLink } from 'lucide-react'

interface FenceCircle {
  id: string
  name: string
  type: 'circle'
  center: { lat: number; lng: number }
  radiusMeters: number
  locationId?: string
}

export default function ConfiguracionAsistenciaPage() {
  const [fences, setFences] = useState<FenceCircle[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [radius, setRadius] = useState('100')

  const loadFences = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/attendance/fences')
      const data = await res.json()
      setFences((data.fences ?? []).filter((f: { type?: string }) => f.type === 'circle'))
    } catch {
      setError('No se pudieron cargar las zonas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadFences()
  }, [loadFences])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name || !lat || !lng || !radius) {
      setError('Completa todos los campos')
      return
    }
    const latN = parseFloat(lat)
    const lngN = parseFloat(lng)
    const radiusN = parseInt(radius, 10)
    if (isNaN(latN) || isNaN(lngN) || isNaN(radiusN)) {
      setError('Lat/lng/radio deben ser números válidos')
      return
    }
    if (latN < -18.5 || latN > 0 || lngN < -82 || lngN > -68) {
      setError('Las coordenadas no parecen estar en Perú. Verifica.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/attendance/fences', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          type: 'circle',
          center: { lat: latN, lng: lngN },
          radiusMeters: radiusN,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? 'No se pudo crear la zona')
      }
      setName('')
      setLat('')
      setLng('')
      setRadius('100')
      void loadFences()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta zona? Los trabajadores no podrán marcar asistencia desde aquí.')) {
      return
    }
    try {
      await fetch(`/api/attendance/fences?id=${id}`, { method: 'DELETE' })
      void loadFences()
    } catch {
      setError('No se pudo eliminar')
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/dashboard/configuracion"
        className="inline-flex items-center gap-1.5 text-sm text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Configuración
      </Link>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-emerald-50">
            <MapPin className="w-6 h-6 text-emerald-700" />
          </div>
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">
            Zonas permitidas para marcar asistencia
          </h1>
        </div>
        <p className="text-sm text-[color:var(--text-secondary)] max-w-2xl">
          Define los lugares geográficos desde donde tus trabajadores pueden marcar
          asistencia. Si la lista está vacía, la asistencia se acepta desde
          cualquier lugar (sin geofencing).
        </p>
      </div>

      {/* Form crear nueva zona */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
      >
        <h2 className="text-base font-semibold text-[color:var(--text-primary)] flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-700" />
          Agregar zona circular
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">
              Nombre de la zona
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Oficina principal · Sede Miraflores"
              className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm text-[color:var(--text-primary)] focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">
              Latitud
            </label>
            <input
              type="text"
              value={lat}
              onChange={e => setLat(e.target.value)}
              placeholder="-12.0464"
              className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm font-mono text-[color:var(--text-primary)] focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">
              Longitud
            </label>
            <input
              type="text"
              value={lng}
              onChange={e => setLng(e.target.value)}
              placeholder="-77.0428"
              className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm font-mono text-[color:var(--text-primary)] focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">
              Radio (metros)
              <span className="ml-1 text-[10px] text-[color:var(--text-tertiary)]">
                — recomendado 50-200m
              </span>
            </label>
            <input
              type="number"
              value={radius}
              onChange={e => setRadius(e.target.value)}
              min={20}
              max={5000}
              className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm text-[color:var(--text-primary)] focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900">
          <strong className="font-semibold">¿Cómo obtener lat/lng?</strong>{' '}
          Abre <a
            href="https://maps.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline inline-flex items-center gap-0.5"
          >
            Google Maps
            <ExternalLink className="w-3 h-3" />
          </a>, busca tu local, click derecho sobre el punto exacto y copia las coordenadas
          (primero latitud, luego longitud).
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2.5 transition-colors"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Agregar zona
        </button>
      </form>

      {/* Lista de zonas existentes */}
      <section>
        <h2 className="text-base font-semibold text-[color:var(--text-primary)] mb-3">
          Zonas activas ({fences.length})
        </h2>
        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
          </div>
        ) : fences.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-[color:var(--neutral-50)] p-8 text-center">
            <MapPin className="w-10 h-10 text-[color:var(--text-tertiary)] mx-auto mb-2" />
            <p className="text-sm text-[color:var(--text-secondary)]">
              Aún no hay zonas. Sin zonas, los trabajadores pueden marcar desde cualquier lugar.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
            {fences.map(f => (
              <div key={f.id} className="flex items-start justify-between gap-3 p-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="shrink-0 p-2 rounded-lg bg-emerald-50">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--text-primary)] truncate">
                      {f.name}
                    </p>
                    <p className="text-xs text-[color:var(--text-tertiary)] font-mono mt-0.5">
                      {f.center.lat.toFixed(6)}, {f.center.lng.toFixed(6)} · radio{' '}
                      {f.radiusMeters}m
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(f.id)}
                  className="shrink-0 p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  aria-label="Eliminar zona"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
