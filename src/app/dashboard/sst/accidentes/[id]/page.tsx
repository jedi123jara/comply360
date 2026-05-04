'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Download,
  ExternalLink,
  CheckCircle2,
  Building2,
  User,
  FileText,
  Copy,
  QrCode,
  Plus,
  Trash2,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { SealQRModal } from '@/components/sst/seal-qr-modal'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

type EstadoSat = 'PENDIENTE' | 'EN_PROCESO' | 'NOTIFICADO' | 'CONFIRMADO' | 'RECHAZADO'

interface AccidenteDetail {
  id: string
  tipo: string
  fechaHora: string
  descripcion: string
  plazoLegalHoras: number
  satEstado: EstadoSat
  satNumeroManual: string | null
  satFechaEnvioManual: string | null
  satCargoArchivoUrl: string | null
  sede: {
    id: string
    nombre: string
    tipoInstalacion: string
    direccion: string
  }
  worker: {
    id: string
    firstName: string
    lastName: string
    dni: string
    position: string | null
    fechaIngreso: string
  } | null
  investigaciones: Array<{
    id: string
    fechaInvestigacion: string
    causasInmediatas: unknown
    causasBasicas: unknown
    accionesCorrectivas: unknown
  }>
}

interface PlazoInfo {
  horas: number
  deadline: string
  descripcion: string
  baseLegal: string
  obligadoNotificar: 'EMPLEADOR' | 'CENTRO_MEDICO'
  formularioSat: string
}

const TIPO_LABEL: Record<string, string> = {
  MORTAL: 'Accidente Mortal',
  NO_MORTAL: 'Accidente No Mortal',
  INCIDENTE_PELIGROSO: 'Incidente Peligroso',
  ENFERMEDAD_OCUPACIONAL: 'Enfermedad Ocupacional',
}

const FORM_LABEL: Record<string, string> = {
  FORM_01_MORTAL: 'Formulario N° 1 — Accidente Mortal',
  FORM_02_INCIDENTE_PELIGROSO: 'Formulario N° 2 — Incidente Peligroso',
  FORM_03_NO_MORTAL: 'Formulario N° 3 — Accidente No Mortal',
  FORM_04_ENF_OCUPACIONAL: 'Formulario N° 4 — Enfermedad Ocupacional',
}

const ESTADO_LABEL: Record<EstadoSat, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  NOTIFICADO: 'Notificado',
  CONFIRMADO: 'Confirmado',
  RECHAZADO: 'Rechazado',
}

const ESTADO_VARIANT: Record<EstadoSat, 'warning' | 'info' | 'success' | 'danger'> = {
  PENDIENTE: 'warning',
  EN_PROCESO: 'info',
  NOTIFICADO: 'info',
  CONFIRMADO: 'success',
  RECHAZADO: 'danger',
}

export default function AccidenteDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [data, setData] = useState<{ accidente: AccidenteDetail; plazo: PlazoInfo } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form de tracking SAT manual
  const [satNumero, setSatNumero] = useState('')
  const [satFecha, setSatFecha] = useState('')
  const [satCargoUrl, setSatCargoUrl] = useState('')
  const [savingSat, setSavingSat] = useState(false)
  const [showSealModal, setShowSealModal] = useState(false)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sst/accidentes/${id}`, { cache: 'no-store' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'No se pudo cargar el accidente')
      }
      const json = await res.json()
      setData(json)
      setSatNumero(json.accidente.satNumeroManual ?? '')
      setSatFecha(
        json.accidente.satFechaEnvioManual
          ? new Date(json.accidente.satFechaEnvioManual).toISOString().slice(0, 10)
          : '',
      )
      setSatCargoUrl(json.accidente.satCargoArchivoUrl ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function guardarSat(e: FormEvent) {
    e.preventDefault()
    if (savingSat) return
    setSavingSat(true)
    try {
      const payload: Record<string, unknown> = {}
      payload.satNumeroManual = satNumero.trim() || null
      payload.satFechaEnvioManual = satFecha ? `${satFecha}T00:00:00.000Z` : null
      payload.satCargoArchivoUrl = satCargoUrl.trim() || null

      const res = await fetch(`/api/sst/accidentes/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json?.error || 'No se pudo guardar el tracking SAT')
        return
      }
      toast.success('Tracking SAT actualizado')
      reload()
    } finally {
      setSavingSat(false)
    }
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

  const { accidente, plazo } = data
  const deadline = new Date(plazo.deadline)
  const now = new Date()
  const ms = deadline.getTime() - now.getTime()
  const vencido = ms < 0
  const critico = ms > 0 && ms <= 4 * 60 * 60 * 1000
  const proximo = ms > 4 * 60 * 60 * 1000 && ms <= 24 * 60 * 60 * 1000
  const notificado = accidente.satEstado === 'NOTIFICADO' || accidente.satEstado === 'CONFIRMADO'

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/sst/accidentes"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-emerald-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver a accidentes
      </Link>

      <PageHeader
        eyebrow={`SST · ${TIPO_LABEL[accidente.tipo] ?? accidente.tipo}`}
        title={`Accidente del ${new Date(accidente.fechaHora).toLocaleDateString('es-PE')}`}
        subtitle={`${accidente.sede.nombre} · ${accidente.sede.direccion}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={ESTADO_VARIANT[accidente.satEstado]}>
              {ESTADO_LABEL[accidente.satEstado]}
            </Badge>
            {(accidente.satEstado === 'NOTIFICADO' || accidente.satEstado === 'CONFIRMADO') && (
              <Button size="sm" variant="secondary" onClick={() => setShowSealModal(true)}>
                <QrCode className="mr-2 h-4 w-4" />
                Sello QR
              </Button>
            )}
          </div>
        }
      />

      {/* Banner de plazo */}
      {!notificado && (
        <Card
          className={
            vencido
              ? 'border-rose-200 bg-rose-50/60'
              : critico
                ? 'border-amber-300 bg-amber-50/80'
                : proximo
                  ? 'border-amber-200 bg-amber-50/60'
                  : 'border-emerald-200 bg-emerald-50/40'
          }
        >
          <CardContent className="flex items-center gap-3 py-3">
            {vencido ? (
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            ) : critico ? (
              <AlertTriangle className="h-5 w-5 text-amber-700" />
            ) : (
              <Clock className="h-5 w-5 text-emerald-700" />
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {vencido
                  ? 'Plazo SAT VENCIDO'
                  : critico
                    ? 'Plazo SAT CRÍTICO (≤4h)'
                    : proximo
                      ? 'Plazo SAT próximo (≤24h)'
                      : 'Plazo SAT vigente'}
              </p>
              <p className="text-xs text-slate-700">
                {plazo.descripcion} · Vence: <strong>{deadline.toLocaleString('es-PE')}</strong>
                <span className="ml-2 font-mono text-[11px] text-slate-500">{plazo.baseLegal}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2 columnas: datos + wizard */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Datos del evento */}
        <Card>
          <CardContent className="py-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Datos del evento</h2>
            <dl className="space-y-2 text-sm">
              <DataRow icon={<FileText className="h-3.5 w-3.5" />} label="Tipo">
                <Badge variant="warning" size="xs">
                  {TIPO_LABEL[accidente.tipo] ?? accidente.tipo}
                </Badge>
              </DataRow>
              <DataRow icon={<Clock className="h-3.5 w-3.5" />} label="Fecha y hora">
                {new Date(accidente.fechaHora).toLocaleString('es-PE')}
              </DataRow>
              <DataRow icon={<Building2 className="h-3.5 w-3.5" />} label="Sede">
                {accidente.sede.nombre} ({accidente.sede.tipoInstalacion})
              </DataRow>
              {accidente.worker && (
                <DataRow icon={<User className="h-3.5 w-3.5" />} label="Trabajador">
                  {accidente.worker.firstName} {accidente.worker.lastName} · DNI{' '}
                  {accidente.worker.dni}
                  {accidente.worker.position && ` · ${accidente.worker.position}`}
                </DataRow>
              )}
            </dl>

            <div className="mt-4">
              <h3 className="text-xs font-medium text-slate-700">Descripción</h3>
              <p className="mt-1 whitespace-pre-line rounded-md bg-slate-50 p-3 text-xs text-slate-700">
                {accidente.descripcion}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Wizard SAT */}
        <Card>
          <CardContent className="py-5">
            <h2 className="mb-1 text-base font-semibold text-slate-900">
              Notificación SAT (manual)
            </h2>
            <p className="text-xs text-slate-600">
              Pasos sugeridos para notificar a SUNAFIL/MTPE.
            </p>

            <ol className="mt-4 space-y-3 text-sm">
              <Step number={1}>
                <strong>Descarga el documento de apoyo pre-llenado</strong> con todos los datos
                que vas a necesitar para la notificación oficial.
                <div className="mt-2">
                  <a
                    href={`/api/sst/accidentes/${id}/pdf-sat`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Descargar {FORM_LABEL[plazo.formularioSat] ?? 'PDF'}
                  </a>
                </div>
              </Step>
              <Step number={2}>
                <strong>Ingresa al portal SAT del MTPE</strong> con tu Clave SOL del empleador y
                completa el formulario que corresponde.
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    href="https://www.gob.pe/774-notificar-accidentes-de-trabajo-incidentes-peligrosos-y-enfermedades-ocupacionales"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir portal gob.pe/774
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const datos = [
                        `RUC empresa, razón social, domicilio fiscal`,
                        `Sede del evento: ${accidente.sede.nombre} — ${accidente.sede.direccion}`,
                        accidente.worker
                          ? `Trabajador: ${accidente.worker.firstName} ${accidente.worker.lastName} · DNI ${accidente.worker.dni}`
                          : 'Trabajador no especificado',
                        `Fecha y hora: ${new Date(accidente.fechaHora).toLocaleString('es-PE')}`,
                        `Tipo: ${TIPO_LABEL[accidente.tipo]}`,
                        `Descripción: ${accidente.descripcion}`,
                      ].join('\n')
                      navigator.clipboard.writeText(datos).then(
                        () => toast.success('Datos copiados al portapapeles'),
                        () => toast.error('No se pudo copiar'),
                      )
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar datos al portapapeles
                  </button>
                </div>
              </Step>
              <Step number={3}>
                <strong>Tras enviar el formulario, registra aquí el comprobante</strong>: el
                número que devuelve el SAT, la fecha de envío y opcionalmente el archivo del
                cargo. Esto cierra el ciclo y queda en tu audit log.
              </Step>
            </ol>

            <form onSubmit={guardarSat} className="mt-5 space-y-3 border-t border-slate-100 pt-4">
              <Field label="Número de cargo SAT (lo da el portal)">
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: SAT-2026-001234"
                  value={satNumero}
                  onChange={(e) => setSatNumero(e.target.value)}
                />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Fecha de envío al SAT">
                  <input
                    type="date"
                    className="input"
                    value={satFecha}
                    onChange={(e) => setSatFecha(e.target.value)}
                  />
                </Field>
                <Field label="URL del cargo escaneado (opcional)">
                  <input
                    type="url"
                    className="input"
                    placeholder="https://..."
                    value={satCargoUrl}
                    onChange={(e) => setSatCargoUrl(e.target.value)}
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={savingSat}>
                  {savingSat && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {notificado ? 'Actualizar tracking' : 'Guardar tracking'}
                </Button>
              </div>
              {notificado && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  Notificación SAT registrada el{' '}
                  {accidente.satFechaEnvioManual
                    ? new Date(accidente.satFechaEnvioManual).toLocaleDateString('es-PE')
                    : '—'}
                  {accidente.satNumeroManual && ` · N° ${accidente.satNumeroManual}`}
                </div>
              )}
            </form>

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
          </CardContent>
        </Card>
      </div>

      <SealQRModal
        kind="accidente"
        resourceId={id}
        label={`${TIPO_LABEL[accidente.tipo] ?? accidente.tipo} · ${accidente.sede.nombre}`}
        isOpen={showSealModal}
        onClose={() => setShowSealModal(false)}
      />

      {/* Investigación */}
      <InvestigacionSection
        accidenteId={id}
        investigaciones={accidente.investigaciones}
        onChanged={reload}
      />
    </div>
  )
}

// ── Sección Investigación ─────────────────────────────────────────────────

function InvestigacionSection({
  accidenteId,
  investigaciones,
  onChanged,
}: {
  accidenteId: string
  investigaciones: AccidenteDetail['investigaciones']
  onChanged: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Investigación del accidente
            </h2>
            <p className="text-xs text-slate-600">
              Ley 29783 Art. 58 obliga a investigar todo accidente de trabajo. Documenta causas
              inmediatas, básicas y acciones correctivas.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva investigación
          </Button>
        </div>

        {investigaciones.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/40 py-8 text-center text-sm text-slate-500">
            Aún no hay investigación registrada para este accidente.
          </div>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {investigaciones.map((inv) => (
              <InvestigacionItem key={inv.id} inv={inv} accidenteId={accidenteId} />
            ))}
          </div>
        )}

        {showForm && (
          <InvestigacionFormModal
            accidenteId={accidenteId}
            onClose={() => setShowForm(false)}
            onSaved={() => {
              setShowForm(false)
              onChanged()
            }}
          />
        )}
      </CardContent>
    </Card>
  )
}

function InvestigacionItem({
  inv,
  accidenteId,
}: {
  inv: AccidenteDetail['investigaciones'][number]
  accidenteId: string
}) {
  type Causa = { tipo: string; descripcion: string }
  type Accion = { accion: string; responsable?: string | null; plazo?: string | null; estado?: string }
  const inmediatas = (inv.causasInmediatas as Causa[] | null) ?? []
  const basicas = (inv.causasBasicas as Causa[] | null) ?? []
  const acciones = (inv.accionesCorrectivas as Accion[] | null) ?? []

  return (
    <div className="py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          Investigación del {new Date(inv.fechaInvestigacion).toLocaleDateString('es-PE')}
        </p>
        <a
          href={`/api/sst/accidentes/${accidenteId}/investigacion/${inv.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
        >
          <Download className="h-3 w-3" />
          PDF formal
        </a>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-900">
            Causas inmediatas ({inmediatas.length})
          </p>
          {inmediatas.length === 0 ? (
            <p className="mt-1 text-xs text-slate-500">Sin causas registradas</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {inmediatas.map((c, i) => (
                <li key={i} className="text-xs text-amber-900">
                  <Badge variant="warning" size="xs">
                    {c.tipo === 'ACTO_INSEGURO' ? 'Acto inseguro' : 'Condición insegura'}
                  </Badge>{' '}
                  {c.descripcion}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-900">
            Causas básicas ({basicas.length})
          </p>
          {basicas.length === 0 ? (
            <p className="mt-1 text-xs text-slate-500">Sin causas registradas</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {basicas.map((c, i) => (
                <li key={i} className="text-xs text-rose-900">
                  <Badge variant="danger" size="xs">
                    {c.tipo === 'FACTOR_PERSONAL' ? 'Factor personal' : 'Factor trabajo'}
                  </Badge>{' '}
                  {c.descripcion}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-900">
            Acciones correctivas ({acciones.length})
          </p>
          {acciones.length === 0 ? (
            <p className="mt-1 text-xs text-slate-500">Sin acciones registradas</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {acciones.map((a, i) => (
                <li key={i} className="text-xs text-emerald-900">
                  <p className="font-medium">{a.accion}</p>
                  {(a.responsable || a.plazo) && (
                    <p className="mt-0.5 text-[10px] text-emerald-700">
                      {a.responsable && `Resp.: ${a.responsable}`}
                      {a.responsable && a.plazo && ' · '}
                      {a.plazo &&
                        `Plazo: ${new Date(a.plazo).toLocaleDateString('es-PE')}`}
                      {a.estado && ` · ${a.estado}`}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

interface CausaForm {
  tipo: string
  descripcion: string
}
interface AccionForm {
  accion: string
  responsable: string
  plazo: string
}

function InvestigacionFormModal({
  accidenteId,
  onClose,
  onSaved,
}: {
  accidenteId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [fechaInvestigacion, setFechaInvestigacion] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [inmediatas, setInmediatas] = useState<CausaForm[]>([
    { tipo: 'ACTO_INSEGURO', descripcion: '' },
  ])
  const [basicas, setBasicas] = useState<CausaForm[]>([
    { tipo: 'FACTOR_PERSONAL', descripcion: '' },
  ])
  const [acciones, setAcciones] = useState<AccionForm[]>([
    { accion: '', responsable: '', plazo: '' },
  ])
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const causasInmediatas = inmediatas
        .filter((c) => c.descripcion.trim().length >= 3)
        .map((c) => ({ tipo: c.tipo, descripcion: c.descripcion.trim() }))
      const causasBasicas = basicas
        .filter((c) => c.descripcion.trim().length >= 3)
        .map((c) => ({ tipo: c.tipo, descripcion: c.descripcion.trim() }))
      const accionesCorrectivas = acciones
        .filter((a) => a.accion.trim().length >= 3)
        .map((a) => ({
          accion: a.accion.trim(),
          responsable: a.responsable.trim() || null,
          plazo: a.plazo ? `${a.plazo}T00:00:00.000Z` : null,
          estado: 'PENDIENTE' as const,
        }))

      const res = await fetch(`/api/sst/accidentes/${accidenteId}/investigacion`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fechaInvestigacion: `${fechaInvestigacion}T00:00:00.000Z`,
          causasInmediatas,
          causasBasicas,
          accionesCorrectivas,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(j?.error || 'No se pudo guardar la investigación')
        return
      }
      toast.success('Investigación registrada')
      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Nueva investigación de accidente" size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">
            Fecha de la investigación <span className="text-rose-500">*</span>
          </span>
          <input
            type="date"
            required
            className="input-inv"
            value={fechaInvestigacion}
            onChange={(e) => setFechaInvestigacion(e.target.value)}
          />
        </label>

        {/* Causas inmediatas */}
        <fieldset className="rounded-lg border border-amber-200 p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-amber-900">
            Causas inmediatas
          </legend>
          <p className="text-[11px] text-slate-600">
            Actos inseguros (lo que el trabajador hizo mal) o condiciones inseguras (lo que el
            ambiente no debió permitir).
          </p>
          <div className="mt-2 space-y-2">
            {inmediatas.map((c, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[160px_1fr_auto]">
                <select
                  className="input-inv"
                  value={c.tipo}
                  onChange={(e) =>
                    setInmediatas((arr) =>
                      arr.map((x, idx) => (idx === i ? { ...x, tipo: e.target.value } : x)),
                    )
                  }
                >
                  <option value="ACTO_INSEGURO">Acto inseguro</option>
                  <option value="CONDICION_INSEGURA">Condición insegura</option>
                </select>
                <input
                  type="text"
                  className="input-inv"
                  placeholder="Descripción de la causa"
                  value={c.descripcion}
                  onChange={(e) =>
                    setInmediatas((arr) =>
                      arr.map((x, idx) =>
                        idx === i ? { ...x, descripcion: e.target.value } : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setInmediatas((arr) => arr.filter((_, idx) => idx !== i))
                  }
                  className="text-xs text-rose-600 hover:text-rose-700"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setInmediatas((arr) => [...arr, { tipo: 'ACTO_INSEGURO', descripcion: '' }])
            }
            className="mt-2 text-xs font-medium text-emerald-700 hover:text-emerald-800"
          >
            + Agregar causa inmediata
          </button>
        </fieldset>

        {/* Causas básicas */}
        <fieldset className="rounded-lg border border-rose-200 p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-rose-900">
            Causas básicas
          </legend>
          <p className="text-[11px] text-slate-600">
            Factores personales (capacitación, motivación, capacidad) o factores de trabajo
            (procedimientos, mantenimiento, supervisión).
          </p>
          <div className="mt-2 space-y-2">
            {basicas.map((c, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[160px_1fr_auto]">
                <select
                  className="input-inv"
                  value={c.tipo}
                  onChange={(e) =>
                    setBasicas((arr) =>
                      arr.map((x, idx) => (idx === i ? { ...x, tipo: e.target.value } : x)),
                    )
                  }
                >
                  <option value="FACTOR_PERSONAL">Factor personal</option>
                  <option value="FACTOR_TRABAJO">Factor de trabajo</option>
                </select>
                <input
                  type="text"
                  className="input-inv"
                  placeholder="Descripción de la causa"
                  value={c.descripcion}
                  onChange={(e) =>
                    setBasicas((arr) =>
                      arr.map((x, idx) =>
                        idx === i ? { ...x, descripcion: e.target.value } : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() => setBasicas((arr) => arr.filter((_, idx) => idx !== i))}
                  className="text-xs text-rose-600 hover:text-rose-700"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setBasicas((arr) => [...arr, { tipo: 'FACTOR_PERSONAL', descripcion: '' }])
            }
            className="mt-2 text-xs font-medium text-emerald-700 hover:text-emerald-800"
          >
            + Agregar causa básica
          </button>
        </fieldset>

        {/* Acciones correctivas */}
        <fieldset className="rounded-lg border border-emerald-200 p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-emerald-900">
            Acciones correctivas
          </legend>
          <div className="mt-2 space-y-2">
            {acciones.map((a, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[1fr_140px_140px_auto]">
                <input
                  type="text"
                  className="input-inv"
                  placeholder="Acción a implementar"
                  value={a.accion}
                  onChange={(e) =>
                    setAcciones((arr) =>
                      arr.map((x, idx) => (idx === i ? { ...x, accion: e.target.value } : x)),
                    )
                  }
                />
                <input
                  type="text"
                  className="input-inv"
                  placeholder="Responsable"
                  value={a.responsable}
                  onChange={(e) =>
                    setAcciones((arr) =>
                      arr.map((x, idx) =>
                        idx === i ? { ...x, responsable: e.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  type="date"
                  className="input-inv"
                  value={a.plazo}
                  onChange={(e) =>
                    setAcciones((arr) =>
                      arr.map((x, idx) => (idx === i ? { ...x, plazo: e.target.value } : x)),
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() => setAcciones((arr) => arr.filter((_, idx) => idx !== i))}
                  className="text-xs text-rose-600 hover:text-rose-700"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setAcciones((arr) => [...arr, { accion: '', responsable: '', plazo: '' }])
            }
            className="mt-2 text-xs font-medium text-emerald-700 hover:text-emerald-800"
          >
            + Agregar acción
          </button>
        </fieldset>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar investigación
          </Button>
        </div>

        <style jsx>{`
          .input-inv {
            width: 100%;
            border-radius: 0.5rem;
            border: 1px solid rgb(226 232 240);
            background: white;
            padding: 0.4rem 0.6rem;
            font-size: 0.85rem;
          }
          .input-inv:focus {
            outline: none;
            border-color: rgb(16 185 129);
            box-shadow: 0 0 0 3px rgb(16 185 129 / 0.15);
          }
        `}</style>
      </form>
    </Modal>
  )
}

function DataRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-20 items-center gap-1 text-xs text-slate-500">
        {icon}
        {label}
      </span>
      <span className="flex-1 text-slate-800">{children}</span>
    </div>
  )
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
        {number}
      </span>
      <div className="flex-1 text-sm text-slate-700">{children}</div>
    </li>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
