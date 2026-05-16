'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Plus,
  ShieldAlert,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  HardHat,
  Building2,
  Calendar,
  MapPin,
  QrCode,
  Download,
} from 'lucide-react'
import { SealQRModal } from '@/components/sst/seal-qr-modal'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { confirm } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'

type Estado = 'PROGRAMADA' | 'EN_CAMPO' | 'PENDIENTE_INGESTA' | 'EN_INGESTA' | 'CERRADA' | 'CANCELADA'
type Severidad = 'TRIVIAL' | 'TOLERABLE' | 'MODERADO' | 'IMPORTANTE' | 'INTOLERABLE'
type TipoHallazgo =
  | 'PELIGRO_NUEVO'
  | 'PROCEDIMIENTO_INCUMPLIDO'
  | 'EPP_AUSENTE'
  | 'SENALIZACION_FALTANTE'
  | 'EXTINTOR_VENCIDO'
  | 'RUTA_EVACUACION_BLOQUEADA'
  | 'OTRO'

interface Hallazgo {
  id: string
  tipo: TipoHallazgo
  severidad: Severidad
  descripcion: string
  fotoUrl: string | null
  accionPropuesta: string
  responsable: string | null
  plazoCierre: string | null
  createdAt: string
}

interface VisitaDetail {
  id: string
  estado: Estado
  fechaProgramada: string
  fechaInicioCampo: string | null
  fechaCierreOficina: string | null
  notasInspector: string | null
  fotoFachadaUrl: string | null
  sede: { id: string; nombre: string; tipoInstalacion: string; direccion: string; distrito: string }
  colaborador: {
    id: string
    nombre: string
    apellido: string
    dni: string
    email: string
    telefono: string | null
    especialidades: string[]
  }
  hallazgos: Hallazgo[]
}

const ESTADO_LABEL: Record<Estado, string> = {
  PROGRAMADA: 'Programada',
  EN_CAMPO: 'En campo',
  PENDIENTE_INGESTA: 'Pendiente ingesta',
  EN_INGESTA: 'En ingesta',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
}

const ESTADO_VARIANT: Record<Estado, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  PROGRAMADA: 'neutral',
  EN_CAMPO: 'info',
  PENDIENTE_INGESTA: 'warning',
  EN_INGESTA: 'info',
  CERRADA: 'success',
  CANCELADA: 'danger',
}

const TIPO_HALLAZGO_LABEL: Record<TipoHallazgo, string> = {
  PELIGRO_NUEVO: 'Peligro nuevo identificado',
  PROCEDIMIENTO_INCUMPLIDO: 'Procedimiento no cumplido',
  EPP_AUSENTE: 'EPP ausente o inadecuado',
  SENALIZACION_FALTANTE: 'Señalización faltante',
  EXTINTOR_VENCIDO: 'Extintor vencido',
  RUTA_EVACUACION_BLOQUEADA: 'Ruta de evacuación bloqueada',
  OTRO: 'Otro',
}

const SEV_VARIANT: Record<Severidad, 'success' | 'info' | 'warning' | 'danger' | 'critical'> = {
  TRIVIAL: 'success',
  TOLERABLE: 'info',
  MODERADO: 'warning',
  IMPORTANTE: 'danger',
  INTOLERABLE: 'critical',
}

const SEV_LABEL: Record<Severidad, string> = {
  TRIVIAL: 'Trivial',
  TOLERABLE: 'Tolerable',
  MODERADO: 'Moderado',
  IMPORTANTE: 'Importante',
  INTOLERABLE: 'Intolerable',
}

export default function VisitaDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [data, setData] = useState<{ visita: VisitaDetail; summary: Record<string, number> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showHallazgo, setShowHallazgo] = useState(false)
  const [showSealModal, setShowSealModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sst/visitas/${id}`, { cache: 'no-store' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'No se pudo cargar la visita')
      }
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      if (id) reload()
    })
    return () => {
      cancelled = true
    }
  }, [id, reload])

  async function cambiarEstado(estado: Estado, mensaje: string) {
    if (actionLoading) return
    setActionLoading(estado)
    try {
      const payload: Record<string, unknown> = { estado }
      if (estado === 'EN_CAMPO') payload.fechaInicioCampo = new Date().toISOString()
      if (estado === 'CERRADA') payload.fechaCierreOficina = new Date().toISOString()

      const res = await fetch(`/api/sst/visitas/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(j?.error || 'No se pudo cambiar el estado')
        return
      }
      toast.success(mensaje)
      reload()
    } finally {
      setActionLoading(null)
    }
  }

  async function eliminarHallazgo(hallazgoId: string) {
    const ok = await confirm({
      title: '¿Eliminar hallazgo?',
      description: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    })
    if (!ok) return
    const res = await fetch(`/api/sst/hallazgos/${hallazgoId}`, { method: 'DELETE' })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(j?.error || 'No se pudo eliminar')
      return
    }
    toast.success('Hallazgo eliminado')
    reload()
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Cargando...
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-rose-200 bg-rose-50/60">
        <CardContent className="flex items-center gap-2 py-6 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {error ?? 'Error desconocido'}
        </CardContent>
      </Card>
    )
  }

  const { visita, summary } = data
  const editable = visita.estado !== 'CERRADA' && visita.estado !== 'CANCELADA'

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/sst/visitas"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-emerald-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver a visitas
      </Link>

      <PageHeader
        eyebrow="SST · Field Audit"
        title={`Visita en ${visita.sede.nombre}`}
        subtitle={`${visita.sede.direccion} · ${visita.sede.distrito} · Programada para ${new Date(visita.fechaProgramada).toLocaleString('es-PE')}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={ESTADO_VARIANT[visita.estado]}>{ESTADO_LABEL[visita.estado]}</Badge>
            {visita.estado === 'CERRADA' && (
              <>
                <a href={`/api/sst/visitas/${id}/pdf`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="secondary">
                    <Download className="mr-2 h-4 w-4" />
                    Informe PDF
                  </Button>
                </a>
                <Button size="sm" variant="secondary" onClick={() => setShowSealModal(true)}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Sello QR
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Acciones de estado */}
      {editable && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 py-3">
            <span className="mr-2 text-xs font-medium text-slate-500">Acciones rápidas:</span>
            {(visita.estado === 'EN_CAMPO' || visita.estado === 'PROGRAMADA' || visita.estado === 'PENDIENTE_INGESTA') && (
              <Link href={`/dashboard/sst/visitas/${id}/captura-offline`}>
                <Button size="sm" variant="secondary">
                  <HardHat className="mr-2 h-4 w-4" />
                  Captura offline (campo)
                </Button>
              </Link>
            )}
            {visita.estado === 'PROGRAMADA' && (
              <Button
                size="sm"
                variant="emerald-soft"
                onClick={() => cambiarEstado('EN_CAMPO', 'Visita iniciada')}
                disabled={actionLoading === 'EN_CAMPO'}
              >
                {actionLoading === 'EN_CAMPO' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                Iniciar visita
              </Button>
            )}
            {(visita.estado === 'EN_CAMPO' || visita.estado === 'PENDIENTE_INGESTA') && (
              <Button
                size="sm"
                variant="emerald-soft"
                onClick={() => cambiarEstado('EN_INGESTA', 'Ingesta en oficina iniciada')}
                disabled={actionLoading === 'EN_INGESTA'}
              >
                {actionLoading === 'EN_INGESTA' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Marcar en ingesta
              </Button>
            )}
            {visita.estado !== 'PROGRAMADA' && (
              <Button
                size="sm"
                onClick={() => cambiarEstado('CERRADA', 'Visita cerrada')}
                disabled={actionLoading === 'CERRADA'}
              >
                {actionLoading === 'CERRADA' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Cerrar visita
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => cambiarEstado('CANCELADA', 'Visita cancelada')}
              disabled={actionLoading === 'CANCELADA'}
            >
              {actionLoading === 'CANCELADA' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Cancelar
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sede */}
        <Card>
          <CardContent className="py-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
              <Building2 className="h-4 w-4 text-emerald-600" />
              Sede
            </h2>
            <dl className="space-y-2 text-sm">
              <Row label="Nombre">{visita.sede.nombre}</Row>
              <Row label="Tipo">{visita.sede.tipoInstalacion}</Row>
              <Row label="Dirección">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  {visita.sede.direccion}
                </span>
              </Row>
              <Row label="Distrito">{visita.sede.distrito}</Row>
            </dl>
          </CardContent>
        </Card>

        {/* Inspector */}
        <Card>
          <CardContent className="py-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
              <HardHat className="h-4 w-4 text-amber-600" />
              Inspector asignado
            </h2>
            <dl className="space-y-2 text-sm">
              <Row label="Nombre">
                {visita.colaborador.nombre} {visita.colaborador.apellido}
              </Row>
              <Row label="DNI">{visita.colaborador.dni}</Row>
              <Row label="Email">
                <a
                  href={`mailto:${visita.colaborador.email}`}
                  className="text-emerald-700 hover:text-emerald-800"
                >
                  {visita.colaborador.email}
                </a>
              </Row>
              {visita.colaborador.telefono && <Row label="Teléfono">{visita.colaborador.telefono}</Row>}
              {visita.colaborador.especialidades.length > 0 && (
                <Row label="Especialidades">
                  {visita.colaborador.especialidades.join(', ')}
                </Row>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Cronología */}
      <Card>
        <CardContent className="py-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Calendar className="h-4 w-4 text-emerald-600" />
            Cronología
          </h2>
          <div className="space-y-2 text-sm">
            <Row label="Programada">{new Date(visita.fechaProgramada).toLocaleString('es-PE')}</Row>
            <Row label="Inicio en campo">
              {visita.fechaInicioCampo ? new Date(visita.fechaInicioCampo).toLocaleString('es-PE') : '— pendiente'}
            </Row>
            <Row label="Cierre en oficina">
              {visita.fechaCierreOficina ? new Date(visita.fechaCierreOficina).toLocaleString('es-PE') : '— pendiente'}
            </Row>
            {visita.notasInspector && <Row label="Notas">{visita.notasInspector}</Row>}
          </div>
        </CardContent>
      </Card>

      {/* Hallazgos */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
                Hallazgos ({visita.hallazgos.length})
              </h2>
              <p className="text-xs text-slate-500">
                Cada hallazgo se clasifica con la matriz oficial SUNAFIL R.M. 050-2013-TR.
              </p>
            </div>
            {editable && (
              <Button size="sm" onClick={() => setShowHallazgo(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar hallazgo
              </Button>
            )}
          </div>

          {/* Stats por severidad */}
          {visita.hallazgos.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {(['INTOLERABLE', 'IMPORTANTE', 'MODERADO', 'TOLERABLE', 'TRIVIAL'] as const).map((sev) => (
                <Badge key={sev} variant={SEV_VARIANT[sev]} size="xs">
                  {SEV_LABEL[sev]}: {summary[sev] ?? 0}
                </Badge>
              ))}
            </div>
          )}

          {visita.hallazgos.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/40 py-10 text-center text-sm text-slate-500">
              {editable
                ? 'Aún no hay hallazgos registrados. Agrega el primero al regresar de campo.'
                : 'Esta visita se cerró sin hallazgos registrados.'}
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {visita.hallazgos.map((h) => (
                <div key={h.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={SEV_VARIANT[h.severidad]} size="xs">
                          {SEV_LABEL[h.severidad]}
                        </Badge>
                        <span className="text-sm font-semibold text-slate-900">
                          {TIPO_HALLAZGO_LABEL[h.tipo]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{h.descripcion}</p>
                      <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                        <p className="text-[11px] font-medium text-emerald-900">Acción propuesta:</p>
                        <p className="text-xs text-emerald-900">{h.accionPropuesta}</p>
                      </div>
                      {(h.responsable || h.plazoCierre) && (
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                          {h.responsable && <span>Responsable: {h.responsable}</span>}
                          {h.plazoCierre && (
                            <span>
                              Plazo cierre: {new Date(h.plazoCierre).toLocaleDateString('es-PE')}
                            </span>
                          )}
                        </div>
                      )}
                      {h.fotoUrl && (
                        <a
                          href={h.fotoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex text-xs font-medium text-emerald-700 hover:text-emerald-800"
                        >
                          Ver foto evidencia →
                        </a>
                      )}
                    </div>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => eliminarHallazgo(h.id)}
                        className="text-rose-600 hover:text-rose-700"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showHallazgo && editable && (
        <HallazgoModal
          visitaId={id}
          onClose={() => setShowHallazgo(false)}
          onCreated={() => {
            setShowHallazgo(false)
            reload()
          }}
        />
      )}

      <SealQRModal
        kind="visita"
        resourceId={id}
        label={`Visita ${visita.sede.nombre} · ${new Date(visita.fechaProgramada).toLocaleDateString('es-PE')}`}
        isOpen={showSealModal}
        onClose={() => setShowSealModal(false)}
      />
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="w-32 shrink-0 text-xs text-slate-500">{label}</dt>
      <dd className="flex-1 text-sm text-slate-800">{children}</dd>
    </div>
  )
}

// ── Modal agregar hallazgo ────────────────────────────────────────────────

function HallazgoModal({
  visitaId,
  onClose,
  onCreated,
}: {
  visitaId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [tipo, setTipo] = useState<TipoHallazgo>('PELIGRO_NUEVO')
  const [severidad, setSeveridad] = useState<Severidad>('MODERADO')
  const [descripcion, setDescripcion] = useState('')
  const [accion, setAccion] = useState('')
  const [responsable, setResponsable] = useState('')
  const [plazo, setPlazo] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        tipo,
        severidad,
        descripcion: descripcion.trim(),
        accionPropuesta: accion.trim(),
      }
      if (responsable.trim()) payload.responsable = responsable.trim()
      if (plazo) payload.plazoCierre = `${plazo}T00:00:00.000Z`
      if (fotoUrl.trim()) payload.fotoUrl = fotoUrl.trim()

      const res = await fetch(`/api/sst/visitas/${visitaId}/hallazgos`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(j?.error || 'No se pudo crear el hallazgo')
        return
      }
      toast.success('Hallazgo registrado')
      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Agregar hallazgo">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">Tipo *</span>
            <select
              required
              className="input"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoHallazgo)}
            >
              {(Object.keys(TIPO_HALLAZGO_LABEL) as TipoHallazgo[]).map((t) => (
                <option key={t} value={t}>
                  {TIPO_HALLAZGO_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">Severidad *</span>
            <select
              required
              className="input"
              value={severidad}
              onChange={(e) => setSeveridad(e.target.value as Severidad)}
            >
              {(Object.keys(SEV_LABEL) as Severidad[]).map((s) => (
                <option key={s} value={s}>
                  {SEV_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Descripción *</span>
          <textarea
            required
            rows={3}
            minLength={5}
            maxLength={1000}
            className="input"
            placeholder="Qué se observó, dónde y cuándo"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Acción propuesta *</span>
          <textarea
            required
            rows={2}
            minLength={5}
            maxLength={1000}
            className="input"
            placeholder="Qué se debe hacer para corregir"
            value={accion}
            onChange={(e) => setAccion(e.target.value)}
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">Responsable</span>
            <input
              type="text"
              className="input"
              placeholder="Nombre o cargo"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">Plazo de cierre</span>
            <input
              type="date"
              className="input"
              min={new Date().toISOString().slice(0, 10)}
              value={plazo}
              onChange={(e) => setPlazo(e.target.value)}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">URL de foto evidencia (opcional)</span>
          <input
            type="url"
            className="input"
            placeholder="https://..."
            value={fotoUrl}
            onChange={(e) => setFotoUrl(e.target.value)}
          />
        </label>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar hallazgo
          </Button>
        </div>

        <style jsx>{`
          .input {
            width: 100%;
            border-radius: 0.5rem;
            border: 1px solid rgb(226 232 240);
            background: white;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            color: rgb(15 23 42);
          }
          .input:focus {
            outline: none;
            border-color: rgb(16 185 129);
            box-shadow: 0 0 0 3px rgb(16 185 129 / 0.15);
          }
        `}</style>
      </form>
    </Modal>
  )
}
