'use client'

import { useEffect, useState, type FormEvent } from 'react'
import {
  Plus,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { toast } from 'sonner'

type Tipo = 'ACCESO' | 'RECTIFICACION' | 'CANCELACION' | 'OPOSICION' | 'PORTABILIDAD'
type Estado = 'RECIBIDA' | 'EN_PROCESO' | 'RESPONDIDA' | 'VENCIDA'

interface SolicitudListItem {
  id: string
  solicitanteDni: string
  solicitanteName: string
  tipo: Tipo
  estado: Estado
  slaHasta: string
  dpoAsignadoId: string | null
  respuestaAt: string | null
  respuestaArchivoUrl: string | null
  createdAt: string
}

interface ListResponse {
  solicitudes: SolicitudListItem[]
  total: number
  counts: { vencidas: number; proximas: number }
}

const TIPO_LABEL: Record<Tipo, string> = {
  ACCESO: 'Acceso',
  RECTIFICACION: 'Rectificación',
  CANCELACION: 'Cancelación',
  OPOSICION: 'Oposición',
  PORTABILIDAD: 'Portabilidad',
}

const ESTADO_LABEL: Record<Estado, string> = {
  RECIBIDA: 'Recibida',
  EN_PROCESO: 'En proceso',
  RESPONDIDA: 'Respondida',
  VENCIDA: 'Vencida',
}

const ESTADO_VARIANT: Record<Estado, 'neutral' | 'info' | 'success' | 'danger'> = {
  RECIBIDA: 'neutral',
  EN_PROCESO: 'info',
  RESPONDIDA: 'success',
  VENCIDA: 'danger',
}

export default function ArcoPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sst/derechos-arco', { cache: 'no-store' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'No se pudieron cargar las solicitudes')
      }
      const json = (await res.json()) as ListResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SST · Privacidad"
        title="Derechos ARCO + Portabilidad"
        subtitle="Solicitudes Ley 29733 + D.S. 016-2024-JUS. Plazo SLA 20 días hábiles. El detalle se cifra con pgcrypto y solo se descifra bajo audit log."
        actions={
          <Button onClick={() => setShowNew(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva solicitud
          </Button>
        }
      />

      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardContent className="flex items-start gap-3 py-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
          <div className="text-xs text-emerald-900">
            <strong>Workflow del DPO.</strong> Cada solicitud tiene SLA legal de 20 días hábiles
            (Art. 41 Ley 29733). El detalle del solicitante se almacena cifrado; cada vez que un
            usuario lo revela queda registrado en el audit log con su userId y timestamp.
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-rose-200 bg-rose-50/60">
          <CardContent className="flex items-center gap-2 py-4 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      )}

      {data && (data.counts.vencidas > 0 || data.counts.proximas > 0) && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            {data.counts.vencidas > 0 && (
              <span>
                <strong>{data.counts.vencidas}</strong> solicitudes con SLA vencido (riesgo
                multa ANPDP).
              </span>
            )}
            {data.counts.proximas > 0 && (
              <span>
                {' '}
                <strong>{data.counts.proximas}</strong> solicitudes vencen en los próximos 7 días.
              </span>
            )}
          </CardContent>
        </Card>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando...
        </div>
      ) : !data || data.solicitudes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ShieldCheck className="h-10 w-10 text-slate-400" />
            <div>
              <p className="font-medium text-slate-700">Sin solicitudes ARCO registradas</p>
              <p className="text-sm text-slate-500">
                Cualquier titular de datos personales (trabajador, ex-trabajador, postulante)
                puede ejercer derechos ARCO. Cuando llegue una, regístrala aquí para activar el
                contador SLA.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                <tr>
                  <th className="px-3 py-3 text-left">Solicitante</th>
                  <th className="px-3 py-3 text-left">Tipo</th>
                  <th className="px-3 py-3 text-left">Estado</th>
                  <th className="px-3 py-3 text-left">SLA</th>
                  <th className="px-3 py-3 text-left">Recibida</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.solicitudes.map((s) => (
                  <ArcoRow key={s.id} sol={s} onOpen={() => setOpenId(s.id)} />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {showNew && (
        <NewSolicitudModal onClose={() => setShowNew(false)} onSaved={() => {
          setShowNew(false)
          reload()
        }} />
      )}

      {openId && (
        <DetalleModal id={openId} onClose={() => setOpenId(null)} onChanged={reload} />
      )}
    </div>
  )
}

function ArcoRow({ sol, onOpen }: { sol: SolicitudListItem; onOpen: () => void }) {
  const sla = new Date(sol.slaHasta)
  const now = new Date()
  const ms = sla.getTime() - now.getTime()
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  const isVencida = sol.estado !== 'RESPONDIDA' && ms < 0
  const isProxima = sol.estado !== 'RESPONDIDA' && ms >= 0 && days <= 7
  return (
    <tr className="hover:bg-slate-50/50">
      <td className="px-3 py-3 text-slate-700">
        <div className="font-medium">{sol.solicitanteName}</div>
        <div className="text-xs text-slate-500">DNI {sol.solicitanteDni}</div>
      </td>
      <td className="px-3 py-3">
        <Badge variant="info" size="xs">
          {TIPO_LABEL[sol.tipo]}
        </Badge>
      </td>
      <td className="px-3 py-3">
        <Badge variant={ESTADO_VARIANT[sol.estado]} size="xs">
          {ESTADO_LABEL[sol.estado]}
        </Badge>
      </td>
      <td className="px-3 py-3 text-xs">
        {sol.estado === 'RESPONDIDA' ? (
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Cumplida
          </span>
        ) : isVencida ? (
          <span className="inline-flex items-center gap-1 text-rose-700">
            <Clock className="h-3 w-3" />
            Vencida hace {Math.abs(days)}d
          </span>
        ) : isProxima ? (
          <span className="inline-flex items-center gap-1 text-amber-700">
            <Clock className="h-3 w-3" />
            {days}d restantes
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-slate-600">
            <Clock className="h-3 w-3" />
            {days}d restantes
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-xs text-slate-700">
        {new Date(sol.createdAt).toLocaleDateString('es-PE')}
      </td>
      <td className="px-3 py-3 text-right">
        <button
          type="button"
          onClick={onOpen}
          className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          Atender →
        </button>
      </td>
    </tr>
  )
}

function NewSolicitudModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const [solicitanteDni, setDni] = useState('')
  const [solicitanteName, setName] = useState('')
  const [tipo, setTipo] = useState<Tipo>('ACCESO')
  const [detalle, setDetalle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/sst/derechos-arco', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          solicitanteDni,
          solicitanteName: solicitanteName.trim(),
          tipo,
          detalle: detalle.trim(),
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(j?.error || 'No se pudo registrar la solicitud')
        return
      }
      toast.success('Solicitud registrada · SLA activado')
      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Registrar solicitud ARCO">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">
              DNI <span className="text-rose-500">*</span>
            </span>
            <input
              type="text"
              required
              pattern="\d{8}"
              maxLength={8}
              inputMode="numeric"
              className="input-arco"
              value={solicitanteDni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">
              Nombre completo <span className="text-rose-500">*</span>
            </span>
            <input
              type="text"
              required
              className="input-arco"
              value={solicitanteName}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">
            Tipo de derecho <span className="text-rose-500">*</span>
          </span>
          <select
            required
            className="input-arco"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as Tipo)}
          >
            <option value="ACCESO">Acceso — conocer qué datos se tratan</option>
            <option value="RECTIFICACION">Rectificación — corregir datos</option>
            <option value="CANCELACION">Cancelación — eliminar datos</option>
            <option value="OPOSICION">Oposición — limitar tratamiento</option>
            <option value="PORTABILIDAD">Portabilidad — exportar datos en formato estructurado</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">
            Detalle de la solicitud <span className="text-rose-500">*</span>
          </span>
          <textarea
            required
            rows={4}
            minLength={10}
            maxLength={5000}
            className="input-arco"
            placeholder="Describe lo que solicita el titular. Se cifra antes de persistir."
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
          />
        </label>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar (SLA 20 días)
          </Button>
        </div>

        <style jsx>{`
          .input-arco {
            width: 100%;
            border-radius: 0.5rem;
            border: 1px solid rgb(226 232 240);
            background: white;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
          }
          .input-arco:focus {
            outline: none;
            border-color: rgb(16 185 129);
            box-shadow: 0 0 0 3px rgb(16 185 129 / 0.15);
          }
        `}</style>
      </form>
    </Modal>
  )
}

interface DetalleData {
  id: string
  solicitanteDni: string
  solicitanteName: string
  tipo: Tipo
  estado: Estado
  slaHasta: string
  respuestaAt: string | null
  respuestaArchivoUrl: string | null
  createdAt: string
  tieneDetalle: boolean
  detalle?: string
  detalleError?: string
}

function DetalleModal({
  id,
  onClose,
  onChanged,
}: {
  id: string
  onClose: () => void
  onChanged: () => void
}) {
  const [data, setData] = useState<DetalleData | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [estadoNuevo, setEstadoNuevo] = useState<Estado>('EN_PROCESO')
  const [respuestaUrl, setRespuestaUrl] = useState('')
  const [saving, setSaving] = useState(false)

  async function load(descifrar: boolean) {
    setLoading(true)
    try {
      const url = descifrar
        ? `/api/sst/derechos-arco/${id}?descifrar=1`
        : `/api/sst/derechos-arco/${id}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        toast.error('No se pudo cargar la solicitud')
        return
      }
      const j = await res.json()
      setData(j.solicitud)
      setEstadoNuevo(j.solicitud.estado)
      setRespuestaUrl(j.solicitud.respuestaArchivoUrl ?? '')
      if (descifrar) {
        setRevealed(true)
        toast.success('Detalle revelado · acceso registrado en audit log')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function actualizar() {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/sst/derechos-arco/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          estado: estadoNuevo,
          respuestaArchivoUrl: respuestaUrl.trim() || null,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(j?.error || 'No se pudo actualizar')
        return
      }
      toast.success('Solicitud actualizada')
      onChanged()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Solicitud ARCO" size="lg">
      {loading && !data ? (
        <div className="flex items-center justify-center py-8 text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando...
        </div>
      ) : !data ? null : (
        <div className="space-y-4 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Solicitante
              </div>
              <p className="font-semibold">{data.solicitanteName}</p>
              <p className="text-xs text-slate-500">DNI {data.solicitanteDni}</p>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Tipo</div>
              <Badge variant="info">{TIPO_LABEL[data.tipo]}</Badge>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                SLA hasta
              </div>
              <p>{new Date(data.slaHasta).toLocaleDateString('es-PE')}</p>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Recibida</div>
              <p>{new Date(data.createdAt).toLocaleDateString('es-PE')}</p>
            </div>
          </div>

          {/* Detalle cifrado */}
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Detalle de la solicitud
              </span>
              {data.tieneDetalle && !revealed && (
                <Button size="xs" variant="secondary" onClick={() => load(true)}>
                  <Eye className="mr-1 h-3 w-3" />
                  Revelar
                </Button>
              )}
              {revealed && (
                <Button size="xs" variant="secondary" onClick={() => load(false)}>
                  <EyeOff className="mr-1 h-3 w-3" />
                  Ocultar
                </Button>
              )}
            </div>
            {!data.tieneDetalle ? (
              <p className="mt-2 text-xs text-slate-500">Sin detalle registrado.</p>
            ) : data.detalle ? (
              <p className="mt-2 whitespace-pre-line text-sm text-slate-800">{data.detalle}</p>
            ) : data.detalleError ? (
              <p className="mt-2 text-xs text-rose-700">{data.detalleError}</p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Detalle cifrado · click en <strong>Revelar</strong> para descifrarlo (queda en audit log).
              </p>
            )}
          </div>

          {/* Workflow */}
          <fieldset className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-emerald-900">
              Atender solicitud
            </legend>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-700">Estado</span>
                <select
                  className="input-d"
                  value={estadoNuevo}
                  onChange={(e) => setEstadoNuevo(e.target.value as Estado)}
                >
                  <option value="RECIBIDA">Recibida</option>
                  <option value="EN_PROCESO">En proceso</option>
                  <option value="RESPONDIDA">Respondida</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-700">
                  URL de respuesta (PDF firmado)
                </span>
                <input
                  type="url"
                  className="input-d"
                  placeholder="https://..."
                  value={respuestaUrl}
                  onChange={(e) => setRespuestaUrl(e.target.value)}
                />
              </label>
            </div>
            {data.respuestaAt && (
              <p className="mt-2 text-xs text-emerald-800">
                <CheckCircle2 className="mr-1 inline h-3 w-3" />
                Respondida el {new Date(data.respuestaAt).toLocaleDateString('es-PE')}
              </p>
            )}
          </fieldset>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
            <Button onClick={actualizar} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          </div>

          <style jsx>{`
            .input-d {
              width: 100%;
              border-radius: 0.5rem;
              border: 1px solid rgb(226 232 240);
              background: white;
              padding: 0.4rem 0.6rem;
              font-size: 0.875rem;
            }
            .input-d:focus {
              outline: none;
              border-color: rgb(16 185 129);
              box-shadow: 0 0 0 3px rgb(16 185 129 / 0.15);
            }
          `}</style>
        </div>
      )}
    </Modal>
  )
}
