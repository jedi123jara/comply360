'use client'

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Camera,
  Plus,
  Trash2,
  Upload,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Save,
  Image as ImageIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from 'sonner'
import {
  ensureDraft,
  saveDraft,
  getDraft,
  savePhoto,
  getPhoto,
  deletePhoto,
  genId,
  summaryStats,
  syncDraftToServer,
  type VisitaDraft,
  type HallazgoOffline,
  type Severidad,
  type TipoHallazgo,
} from '@/lib/sst/field-audit-offline'

/**
 * Página de captura offline para visitas Field Audit.
 *
 * El inspector va a obra/planta sin garantía de wifi, captura hallazgos +
 * fotos directamente a IndexedDB. Al regresar a la oficina, el botón
 * "Sincronizar con servidor" sube todo al backend en una sola operación.
 *
 * Auto-save: cada cambio en el form se persiste a IndexedDB inmediatamente
 * (sin debouncing complicado — IDB es rápido). El inspector puede cerrar la
 * pestaña / quedarse sin batería y al volver todo sigue ahí.
 */

const TIPO_LABEL: Record<TipoHallazgo, string> = {
  PELIGRO_NUEVO: 'Peligro nuevo',
  PROCEDIMIENTO_INCUMPLIDO: 'Procedimiento incumplido',
  EPP_AUSENTE: 'EPP ausente',
  SENALIZACION_FALTANTE: 'Señalización faltante',
  EXTINTOR_VENCIDO: 'Extintor vencido',
  RUTA_EVACUACION_BLOQUEADA: 'Ruta de evacuación bloqueada',
  OTRO: 'Otro',
}

const SEVERIDAD_VARIANT: Record<Severidad, 'success' | 'info' | 'warning' | 'high' | 'critical'> = {
  TRIVIAL: 'success',
  TOLERABLE: 'info',
  MODERADO: 'warning',
  IMPORTANTE: 'high',
  INTOLERABLE: 'critical',
}

export default function CapturaOfflinePage() {
  const params = useParams<{ id: string }>()
  const visitaId = params.id

  const [draft, setDraft] = useState<VisitaDraft | null>(null)
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [loading, setLoading] = useState(true)
  const [showAddHallazgo, setShowAddHallazgo] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{
    creados: number
    fallidos: number
    errors: string[]
  } | null>(null)

  // ── Online/Offline detection ─────────────────────────────────────────────
  useEffect(() => {
    function update() {
      setOnline(navigator.onLine)
    }
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  // ── Load draft from IndexedDB on mount ───────────────────────────────────
  useEffect(() => {
    if (!visitaId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const d = await ensureDraft(visitaId)
        if (cancelled) return
        setDraft(d)
        await refreshPhotoUrls(d)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error cargando draft local')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [visitaId])

  // ── Convert IDB Blobs to object URLs for <img src> ───────────────────────
  async function refreshPhotoUrls(d: VisitaDraft) {
    const ids: string[] = []
    if (d.fotoFachadaPhotoId) ids.push(d.fotoFachadaPhotoId)
    for (const h of d.hallazgos) if (h.photoId) ids.push(h.photoId)
    const urls: Record<string, string> = {}
    for (const id of ids) {
      const photo = await getPhoto(id)
      if (photo) urls[id] = URL.createObjectURL(photo.blob)
    }
    setPhotoUrls(urls)
  }

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      for (const url of Object.values(photoUrls)) URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function persistDraft(next: VisitaDraft) {
    setDraft(next)
    await saveDraft(next)
  }

  // ── Update notas (auto-save) ─────────────────────────────────────────────
  async function setNotas(value: string) {
    if (!draft) return
    await persistDraft({ ...draft, notasInspector: value })
  }

  // ── Set foto fachada ─────────────────────────────────────────────────────
  async function setFotoFachada(file: File) {
    if (!draft) return
    const photoId = genId()
    await savePhoto({
      id: photoId,
      blob: file,
      mimeType: file.type || 'image/jpeg',
      sizeBytes: file.size,
      capturedAt: new Date().toISOString(),
    })
    // Borramos la anterior si había
    if (draft.fotoFachadaPhotoId) {
      await deletePhoto(draft.fotoFachadaPhotoId)
      const oldUrl = photoUrls[draft.fotoFachadaPhotoId]
      if (oldUrl) URL.revokeObjectURL(oldUrl)
    }
    const next: VisitaDraft = { ...draft, fotoFachadaPhotoId: photoId }
    await persistDraft(next)
    await refreshPhotoUrls(next)
  }

  async function clearFotoFachada() {
    if (!draft || !draft.fotoFachadaPhotoId) return
    await deletePhoto(draft.fotoFachadaPhotoId)
    const url = photoUrls[draft.fotoFachadaPhotoId]
    if (url) URL.revokeObjectURL(url)
    await persistDraft({ ...draft, fotoFachadaPhotoId: null })
  }

  // ── Add hallazgo ─────────────────────────────────────────────────────────
  async function addHallazgo(h: HallazgoOffline) {
    if (!draft) return
    const next: VisitaDraft = { ...draft, hallazgos: [...draft.hallazgos, h] }
    await persistDraft(next)
    await refreshPhotoUrls(next)
  }

  async function deleteHallazgo(hallazgoId: string) {
    if (!draft) return
    const h = draft.hallazgos.find((x) => x.id === hallazgoId)
    if (h?.photoId) {
      await deletePhoto(h.photoId)
      const url = photoUrls[h.photoId]
      if (url) URL.revokeObjectURL(url)
    }
    const next: VisitaDraft = {
      ...draft,
      hallazgos: draft.hallazgos.filter((x) => x.id !== hallazgoId),
    }
    await persistDraft(next)
  }

  // ── Sync to server ───────────────────────────────────────────────────────
  async function handleSync() {
    if (!draft) return
    if (!online) {
      toast.error('No hay conexión. Vuelve cuando tengas wifi para sincronizar.')
      return
    }
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await syncDraftToServer(visitaId)
      setSyncResult({
        creados: result.hallazgosCreados,
        fallidos: result.hallazgosFallidos,
        errors: result.errors,
      })
      if (result.hallazgosFallidos === 0 && result.errors.length === 0) {
        toast.success(`${result.hallazgosCreados} hallazgos sincronizados con éxito`)
        // Reload empty draft
        const fresh = await ensureDraft(visitaId)
        setDraft(fresh)
        await refreshPhotoUrls(fresh)
      } else {
        toast.warning(
          `Sincronizado parcialmente: ${result.hallazgosCreados} OK, ${result.hallazgosFallidos} con errores`,
        )
        // Reload draft to reflect what's still pending
        const updated = await getDraft(visitaId)
        if (updated) {
          setDraft(updated)
          await refreshPhotoUrls(updated)
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  if (loading || !draft) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  const stats = summaryStats(draft)
  const lastModif = new Date(draft.lastModified).toLocaleString('es-PE')

  return (
    <div className="space-y-5">
      <Link
        href={`/dashboard/sst/visitas/${visitaId}`}
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ChevronLeft className="w-4 h-4" />
        Volver a la visita
      </Link>

      <PageHeader
        title="Captura offline · Field Audit"
        subtitle={`Captura hallazgos + fotos sin conexión. Todo se guarda en este dispositivo y se sube al servidor cuando tengas wifi.`}
        actions={
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ring-1 ${
                online
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-amber-50 text-amber-700 ring-amber-200'
              }`}
            >
              {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {online ? 'En línea' : 'Sin conexión'}
            </div>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-white ring-1 ring-slate-200 p-3 text-center">
          <div className="text-2xl font-bold tabular-nums">{stats.hallazgosCount}</div>
          <div className="text-[11px] uppercase font-semibold text-slate-500 tracking-wide">
            Hallazgos
          </div>
        </div>
        <div className="rounded-lg bg-white ring-1 ring-slate-200 p-3 text-center">
          <div className="text-2xl font-bold tabular-nums">{stats.fotosTotal}</div>
          <div className="text-[11px] uppercase font-semibold text-slate-500 tracking-wide">
            Fotos
          </div>
        </div>
        <div className="rounded-lg bg-white ring-1 ring-slate-200 p-3 text-center">
          <div className="text-xs font-medium tabular-nums">{lastModif}</div>
          <div className="text-[11px] uppercase font-semibold text-slate-500 tracking-wide">
            Último guardado
          </div>
        </div>
      </div>

      {/* Foto Fachada */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Foto de la fachada</h3>
            {draft.fotoFachadaPhotoId && (
              <button
                type="button"
                onClick={clearFotoFachada}
                className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Quitar
              </button>
            )}
          </div>
          {draft.fotoFachadaPhotoId && photoUrls[draft.fotoFachadaPhotoId] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrls[draft.fotoFachadaPhotoId]}
              alt="Fachada"
              className="rounded-lg w-full max-h-64 object-cover ring-1 ring-slate-200"
            />
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:bg-slate-100">
              <Camera className="w-8 h-8 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">
                Tomar foto de la fachada
              </span>
              <span className="text-xs text-slate-500">
                Cámara o seleccionar desde galería
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const f = e.target.files?.[0]
                  if (f) setFotoFachada(f)
                }}
              />
            </label>
          )}
        </CardContent>
      </Card>

      {/* Notas */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Notas del inspector</h3>
          <textarea
            value={draft.notasInspector}
            onChange={(e) => setNotas(e.target.value)}
            rows={4}
            placeholder="Observaciones generales de la visita..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
          />
          <p className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
            <Save className="w-3 h-3" /> Guardado automático en este dispositivo.
          </p>
        </CardContent>
      </Card>

      {/* Hallazgos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            Hallazgos ({draft.hallazgos.length})
          </h3>
          <Button size="sm" onClick={() => setShowAddHallazgo(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Agregar
          </Button>
        </div>

        {draft.hallazgos.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-slate-500">
              Aún no has capturado hallazgos. Toca "Agregar" para comenzar.
            </CardContent>
          </Card>
        ) : (
          draft.hallazgos.map((h) => (
            <Card key={h.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={SEVERIDAD_VARIANT[h.severidad]}>{h.severidad}</Badge>
                      <span className="text-xs font-semibold text-slate-700">
                        {TIPO_LABEL[h.tipo]}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">{h.descripcion}</p>
                    {h.lat !== null && h.lng !== null && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                        <MapPin className="w-3 h-3" />
                        {h.lat.toFixed(5)}, {h.lng.toFixed(5)}
                      </p>
                    )}
                    {h.accionPropuesta && (
                      <p className="text-xs text-slate-600 mt-1">
                        <strong>Acción:</strong> {h.accionPropuesta}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteHallazgo(h.id)}
                    className="shrink-0 p-2 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                    aria-label="Eliminar hallazgo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {h.photoId && photoUrls[h.photoId] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrls[h.photoId]}
                    alt="Hallazgo"
                    className="mt-3 rounded-lg w-full max-h-48 object-cover ring-1 ring-slate-200"
                  />
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Sync footer */}
      <div className="sticky bottom-4 z-10">
        <Card className="ring-2 ring-emerald-300 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-semibold text-slate-900">
                  {stats.hallazgosCount} {stats.hallazgosCount === 1 ? 'hallazgo' : 'hallazgos'} listos
                </div>
                <div className="text-xs text-slate-600">
                  {stats.fotosTotal} {stats.fotosTotal === 1 ? 'foto' : 'fotos'} pendientes de subida
                </div>
              </div>
              <Button onClick={handleSync} disabled={syncing || !online || stats.hallazgosCount === 0}>
                {syncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Sincronizar ahora
                  </>
                )}
              </Button>
            </div>
            {syncResult && syncResult.errors.length > 0 && (
              <div className="mt-3 rounded-lg bg-red-50 ring-1 ring-red-200 p-3 text-xs text-red-800">
                <div className="font-semibold mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {syncResult.fallidos} hallazgo(s) con error
                </div>
                <ul className="list-disc list-inside space-y-0.5">
                  {syncResult.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {!online && (
              <p className="mt-2 text-xs text-amber-700 flex items-center gap-1">
                <WifiOff className="w-3.5 h-3.5" />
                Sin conexión. Vuelve a este link cuando tengas wifi para sincronizar.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal agregar hallazgo */}
      {showAddHallazgo && (
        <AddHallazgoModal
          onClose={() => setShowAddHallazgo(false)}
          onAdd={async (h) => {
            await addHallazgo(h)
            setShowAddHallazgo(false)
          }}
        />
      )}
    </div>
  )
}

// ─── Modal: Agregar hallazgo ────────────────────────────────────────────────

function AddHallazgoModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (h: HallazgoOffline) => Promise<void>
}) {
  const [tipo, setTipo] = useState<TipoHallazgo>('OTRO')
  const [severidad, setSeveridad] = useState<Severidad>('MODERADO')
  const [descripcion, setDescripcion] = useState('')
  const [accionPropuesta, setAccionPropuesta] = useState('')
  const [responsable, setResponsable] = useState('')
  const [plazoCierre, setPlazoCierre] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [requestingGPS, setRequestingGPS] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFoto(f)
    if (fotoPreview) URL.revokeObjectURL(fotoPreview)
    setFotoPreview(URL.createObjectURL(f))
  }

  function clearFoto() {
    setFoto(null)
    if (fotoPreview) URL.revokeObjectURL(fotoPreview)
    setFotoPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function captureGPS() {
    if (!('geolocation' in navigator)) {
      toast.error('GPS no disponible en este dispositivo')
      return
    }
    setRequestingGPS(true)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        }),
      )
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      toast.success('Ubicación capturada')
    } catch (err) {
      toast.error(
        err instanceof GeolocationPositionError
          ? 'Permiso GPS denegado'
          : err instanceof Error
          ? err.message
          : 'Error al capturar GPS',
      )
    } finally {
      setRequestingGPS(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (descripcion.length < 5) {
      toast.error('Describe el hallazgo con al menos 5 caracteres')
      return
    }
    setSubmitting(true)
    try {
      let photoId: string | null = null
      if (foto) {
        photoId = genId()
        await savePhoto({
          id: photoId,
          blob: foto,
          mimeType: foto.type || 'image/jpeg',
          sizeBytes: foto.size,
          capturedAt: new Date().toISOString(),
        })
      }
      const hallazgo: HallazgoOffline = {
        id: genId(),
        tipo,
        severidad,
        descripcion,
        photoId,
        accionPropuesta,
        responsable: responsable || null,
        plazoCierre: plazoCierre || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        capturedAt: new Date().toISOString(),
      }
      await onAdd(hallazgo)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error guardando hallazgo')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Nuevo hallazgo">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-slate-700 mb-1">Tipo</span>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoHallazgo)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {Object.entries(TIPO_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-slate-700 mb-1">Severidad</span>
            <select
              value={severidad}
              onChange={(e) => setSeveridad(e.target.value as Severidad)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="TRIVIAL">Trivial</option>
              <option value="TOLERABLE">Tolerable</option>
              <option value="MODERADO">Moderado</option>
              <option value="IMPORTANTE">Importante</option>
              <option value="INTOLERABLE">Intolerable</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="block text-xs font-medium text-slate-700 mb-1">
            Descripción <span className="text-red-500">*</span>
          </span>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            required
            placeholder="Qué observaste exactamente..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-slate-700 mb-1">Acción propuesta</span>
          <input
            type="text"
            value={accionPropuesta}
            onChange={(e) => setAccionPropuesta(e.target.value)}
            placeholder="Qué se debe hacer..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-slate-700 mb-1">Responsable</span>
            <input
              type="text"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              placeholder="Opcional"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-700 mb-1">Plazo</span>
            <input
              type="date"
              value={plazoCierre}
              onChange={(e) => setPlazoCierre(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        {/* Foto */}
        <div>
          <span className="block text-xs font-medium text-slate-700 mb-1">Foto</span>
          {fotoPreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotoPreview}
                alt="Hallazgo"
                className="rounded-lg w-full max-h-48 object-cover ring-1 ring-slate-200"
              />
              <button
                type="button"
                onClick={clearFoto}
                className="absolute top-2 right-2 p-1 rounded-full bg-white/90 text-red-600 ring-1 ring-red-200"
                aria-label="Quitar foto"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-1 p-4 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:bg-slate-100">
              <ImageIcon className="w-6 h-6 text-slate-400" />
              <span className="text-xs font-medium text-slate-600">Tomar foto</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFile}
              />
            </label>
          )}
        </div>

        {/* GPS */}
        <div className="rounded-lg bg-slate-50 ring-1 ring-slate-200 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-slate-500" />
            {coords ? (
              <span className="text-slate-700 tabular-nums">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
            ) : (
              <span className="text-slate-500">Sin ubicación</span>
            )}
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={captureGPS} disabled={requestingGPS}>
            {requestingGPS ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MapPin className="w-3.5 h-3.5" />
            )}
            {coords ? 'Recapturar' : 'Capturar GPS'}
          </Button>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
            Guardar localmente
          </Button>
        </div>
      </form>
    </Modal>
  )
}
