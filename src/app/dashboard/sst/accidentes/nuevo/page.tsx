'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { calcularPlazoSat, formularioSatLabel, type TipoAccidente } from '@/lib/sst/sat-deadline'

interface SedeLite {
  id: string
  nombre: string
  tipoInstalacion: string
}
interface WorkerLite {
  id: string
  firstName: string
  lastName: string
  dni: string
}

const TIPOS: { value: TipoAccidente; label: string; descripcion: string }[] = [
  {
    value: 'MORTAL',
    label: 'Accidente MORTAL',
    descripcion: 'Trabajador fallecido. Notificación al SAT en 24 horas (empleador).',
  },
  {
    value: 'INCIDENTE_PELIGROSO',
    label: 'Incidente peligroso',
    descripcion:
      'Evento de alto potencial sin lesión grave (ej: explosión, derrame mayor). 24 horas (empleador).',
  },
  {
    value: 'NO_MORTAL',
    label: 'Accidente NO MORTAL',
    descripcion:
      'Lesión que generó descanso médico. Centro médico notifica el último día hábil del mes siguiente.',
  },
  {
    value: 'ENFERMEDAD_OCUPACIONAL',
    label: 'Enfermedad ocupacional',
    descripcion:
      'Diagnóstico de enfermedad por agente ocupacional. Centro médico notifica en 5 días hábiles.',
  },
]

export default function NuevoAccidentePage() {
  const router = useRouter()
  const [sedes, setSedes] = useState<SedeLite[]>([])
  const [workers, setWorkers] = useState<WorkerLite[]>([])
  const [loadingResources, setLoadingResources] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [tipo, setTipo] = useState<TipoAccidente>('NO_MORTAL')
  const [sedeId, setSedeId] = useState('')
  const [workerId, setWorkerId] = useState('')
  const [fechaHora, setFechaHora] = useState('')
  const [descripcion, setDescripcion] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/sst/sedes', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { sedes: [] })),
      fetch('/api/workers?limit=200', { cache: 'no-store' }).then((r) =>
        r.ok ? r.json() : { workers: [] },
      ),
    ]).then(([s, w]) => {
      if (cancelled) return
      const sedeList = (s.sedes ?? []) as SedeLite[]
      setSedes(sedeList)
      if (sedeList.length === 1) setSedeId(sedeList[0].id)
      const workerListRaw = (w.workers ?? w.data?.workers ?? []) as Array<{
        id: string
        firstName: string
        lastName: string
        dni: string
      }>
      setWorkers(workerListRaw.map((x) => ({ id: x.id, firstName: x.firstName, lastName: x.lastName, dni: x.dni })))
      setLoadingResources(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const plazoPreview = useMemo(() => {
    if (!fechaHora) return null
    try {
      const d = new Date(fechaHora)
      if (isNaN(d.getTime())) return null
      return calcularPlazoSat(tipo, d)
    } catch {
      return null
    }
  }, [tipo, fechaHora])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        sedeId,
        tipo,
        fechaHora: new Date(fechaHora).toISOString(),
        descripcion: descripcion.trim(),
      }
      if (workerId) payload.workerId = workerId

      const res = await fetch('/api/sst/accidentes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail = json?.details?.fieldErrors
          ? Object.entries(json.details.fieldErrors)
              .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
              .join('. ')
          : json?.error || 'No se pudo registrar el accidente'
        toast.error(detail)
        return
      }
      toast.success('Accidente registrado')
      router.push(`/dashboard/sst/accidentes/${json.accidente.id}`)
    } finally {
      setSubmitting(false)
    }
  }

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
        eyebrow="SST · Accidentes"
        title="Registrar accidente"
        subtitle="Activa el contador del plazo SAT y prepara el documento pre-llenado para notificar."
      />

      {loadingResources ? (
        <div className="flex items-center justify-center py-10 text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando sedes y trabajadores...
        </div>
      ) : sedes.length === 0 ? (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-start gap-2 py-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              No tienes sedes registradas. Antes de registrar un accidente,{' '}
              <Link
                href="/dashboard/sst/sedes/nueva"
                className="font-medium underline"
              >
                crea al menos una sede
              </Link>
              .
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6">
            <form onSubmit={onSubmit} className="space-y-5">
              {/* Tipo de evento */}
              <fieldset className="space-y-2">
                <legend className="block text-xs font-medium text-slate-700">
                  Tipo de evento <span className="text-rose-500">*</span>
                </legend>
                <div className="grid gap-2 md:grid-cols-2">
                  {TIPOS.map((t) => (
                    <label
                      key={t.value}
                      className={`cursor-pointer rounded-lg border p-3 transition ${
                        tipo === t.value
                          ? 'border-emerald-300 bg-emerald-50/40'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tipo"
                        value={t.value}
                        checked={tipo === t.value}
                        onChange={() => setTipo(t.value)}
                        className="sr-only"
                      />
                      <div className="text-sm font-semibold text-slate-900">{t.label}</div>
                      <p className="mt-1 text-xs text-slate-600">{t.descripcion}</p>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Sede + Trabajador */}
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Sede del evento" required>
                  <select
                    required
                    className="input"
                    value={sedeId}
                    onChange={(e) => setSedeId(e.target.value)}
                  >
                    <option value="">— Elegir sede —</option>
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} ({s.tipoInstalacion})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Trabajador afectado (opcional)">
                  <select
                    className="input"
                    value={workerId}
                    onChange={(e) => setWorkerId(e.target.value)}
                  >
                    <option value="">— Sin trabajador específico —</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.firstName} {w.lastName} · DNI {w.dni}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Fecha y hora */}
              <Field label="Fecha y hora del evento" required>
                <input
                  type="datetime-local"
                  required
                  className="input"
                  value={fechaHora}
                  onChange={(e) => setFechaHora(e.target.value)}
                  max={new Date().toISOString().slice(0, 16)}
                />
              </Field>

              {/* Descripción */}
              <Field label="Descripción del evento" required>
                <textarea
                  required
                  rows={5}
                  minLength={10}
                  className="input"
                  placeholder="Descripción detallada: lugar exacto, secuencia de hechos, equipos involucrados, parte del cuerpo afectada, primer auxilio aplicado, traslado..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </Field>

              {/* Preview del plazo */}
              {plazoPreview && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                  <div className="text-sm font-semibold text-amber-900">
                    Plazo legal calculado
                  </div>
                  <p className="mt-1 text-xs text-amber-800">
                    <strong>{formularioSatLabel(plazoPreview.formularioSat)}</strong>
                  </p>
                  <p className="mt-2 text-xs text-amber-800">
                    Plazo: <strong>{plazoPreview.descripcion}</strong>
                  </p>
                  <p className="text-xs text-amber-800">
                    Fecha límite:{' '}
                    <strong>{plazoPreview.deadline.toLocaleString('es-PE')}</strong>
                  </p>
                  <p className="text-xs text-amber-800">
                    Obligado: <strong>{plazoPreview.obligadoNotificar.replace('_', ' ')}</strong>{' '}
                    · Base legal:{' '}
                    <span className="font-mono text-[11px]">{plazoPreview.baseLegal}</span>
                  </p>
                  <Badge variant="warning" size="xs" className="mt-2">
                    Tras crear el registro tendrás un wizard pre-llenado para apoyarte en la notificación.
                  </Badge>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <Link href="/dashboard/sst/accidentes">
                  <Button type="button" variant="secondary">
                    Cancelar
                  </Button>
                </Link>
                <Button type="submit" disabled={submitting || !sedeId || !fechaHora || descripcion.length < 10}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar accidente
                </Button>
              </div>
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
      )}
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  )
}
