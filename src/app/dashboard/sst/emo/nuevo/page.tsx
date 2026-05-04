'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

interface WorkerLite {
  id: string
  firstName: string
  lastName: string
  dni: string
}

const TIPOS = [
  { value: 'PRE_EMPLEO', label: 'Pre-empleo (antes del ingreso)' },
  { value: 'PERIODICO', label: 'Periódico (anual o semestral)' },
  { value: 'RETIRO', label: 'Retiro (al cesar el vínculo)' },
  { value: 'REINTEGRO_LARGA_AUSENCIA', label: 'Reintegro tras larga ausencia' },
] as const

const APTITUDES = [
  { value: 'APTO', label: 'APTO — sin restricciones' },
  { value: 'APTO_CON_RESTRICCIONES', label: 'APTO con restricciones laborales' },
  { value: 'NO_APTO', label: 'NO APTO para el puesto' },
  { value: 'OBSERVADO', label: 'OBSERVADO — pendiente revaluación' },
] as const

export default function NuevoEmoPage() {
  const router = useRouter()
  const [workers, setWorkers] = useState<WorkerLite[]>([])
  const [loadingWorkers, setLoadingWorkers] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    workerId: '',
    tipoExamen: 'PERIODICO' as (typeof TIPOS)[number]['value'],
    fechaExamen: '',
    centroMedicoNombre: '',
    centroMedicoRuc: '',
    aptitud: 'APTO' as (typeof APTITUDES)[number]['value'],
    restricciones: '',
    proximoExamenAntes: '',
    certificadoUrl: '',
    consentimientoLey29733: false,
  })

  useEffect(() => {
    let cancelled = false
    fetch('/api/workers?limit=200', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { workers: [] }))
      .then((j) => {
        if (cancelled) return
        const list = (j.workers ?? j.data?.workers ?? []) as WorkerLite[]
        setWorkers(list.map((w) => ({ id: w.id, firstName: w.firstName, lastName: w.lastName, dni: w.dni })))
      })
      .finally(() => {
        if (!cancelled) setLoadingWorkers(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (!form.consentimientoLey29733) {
      toast.error('Debes confirmar el consentimiento Ley 29733 antes de registrar el EMO')
      return
    }
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        workerId: form.workerId,
        tipoExamen: form.tipoExamen,
        fechaExamen: form.fechaExamen,
        centroMedicoNombre: form.centroMedicoNombre.trim(),
        aptitud: form.aptitud,
        consentimientoLey29733: form.consentimientoLey29733,
        fechaConsentimiento: new Date().toISOString(),
      }
      if (form.centroMedicoRuc.trim()) payload.centroMedicoRuc = form.centroMedicoRuc.trim()
      if (form.restricciones.trim()) payload.restricciones = form.restricciones.trim()
      if (form.proximoExamenAntes) payload.proximoExamenAntes = form.proximoExamenAntes
      if (form.certificadoUrl.trim()) payload.certificadoUrl = form.certificadoUrl.trim()

      const res = await fetch('/api/sst/emo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail =
          json?.code === 'FORBIDDEN_MEDICAL_FIELD'
            ? json.error
            : json?.details?.fieldErrors
              ? Object.entries(json.details.fieldErrors)
                  .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
                  .join('. ')
              : json?.error || 'No se pudo registrar el EMO'
        toast.error(detail)
        return
      }
      toast.success('EMO registrado')
      router.push(`/dashboard/sst/emo/${json.emo.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/sst/emo"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-emerald-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver a EMO
      </Link>

      <PageHeader
        eyebrow="SST · EMO"
        title="Registrar examen médico ocupacional"
        subtitle="Solo registramos lo necesario: tipo, fecha, centro médico, aptitud y, si aplica, restricciones laborales."
      />

      <Card className="border-amber-200 bg-amber-50/40">
        <CardContent className="flex items-start gap-3 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
          <div className="text-xs text-amber-900">
            <strong>NO ingreses diagnósticos médicos.</strong> El sistema rechaza payloads con
            campos como <code>diagnóstico</code>, <code>CIE-10</code>, <code>historia clínica</code>,
            <code> tratamiento</code>, etc. (Ley 29733 + D.S. 016-2024-JUS). Si necesitas
            documentar limitaciones operativas, usa solo el campo <em>Restricciones laborales</em>{' '}
            de abajo (se cifra automáticamente).
          </div>
        </CardContent>
      </Card>

      {loadingWorkers ? (
        <div className="flex items-center justify-center py-10 text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando trabajadores...
        </div>
      ) : workers.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-slate-600">
            No hay trabajadores activos. Registra al menos uno antes de cargar EMO.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="Trabajador" required>
                <select
                  required
                  className="input"
                  value={form.workerId}
                  onChange={(e) => update('workerId', e.target.value)}
                >
                  <option value="">— Elegir trabajador —</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.firstName} {w.lastName} · DNI {w.dni}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Tipo de examen" required>
                  <select
                    required
                    className="input"
                    value={form.tipoExamen}
                    onChange={(e) =>
                      update('tipoExamen', e.target.value as (typeof TIPOS)[number]['value'])
                    }
                  >
                    {TIPOS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Fecha del examen" required>
                  <input
                    type="date"
                    required
                    className="input"
                    max={new Date().toISOString().slice(0, 10)}
                    value={form.fechaExamen}
                    onChange={(e) => update('fechaExamen', e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Centro médico DIGESA" required>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="Centro Médico San Felipe"
                    value={form.centroMedicoNombre}
                    onChange={(e) => update('centroMedicoNombre', e.target.value)}
                  />
                </Field>
                <Field label="RUC del centro médico (opcional)">
                  <input
                    type="text"
                    pattern="\d{11}"
                    inputMode="numeric"
                    maxLength={11}
                    className="input"
                    placeholder="20512345678"
                    value={form.centroMedicoRuc}
                    onChange={(e) =>
                      update('centroMedicoRuc', e.target.value.replace(/\D/g, ''))
                    }
                  />
                </Field>
              </div>

              <Field label="Aptitud" required>
                <select
                  required
                  className="input"
                  value={form.aptitud}
                  onChange={(e) =>
                    update('aptitud', e.target.value as (typeof APTITUDES)[number]['value'])
                  }
                >
                  {APTITUDES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Restricciones laborales (opcional · se cifra)">
                <textarea
                  rows={4}
                  maxLength={2000}
                  className="input"
                  placeholder="Ej: No levantar cargas mayores a 10 kg. No trabajos en altura por 90 días. Pausas activas cada 2h."
                  value={form.restricciones}
                  onChange={(e) => update('restricciones', e.target.value)}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Texto libre con limitaciones operativas. <strong>Sin diagnósticos.</strong> Se
                  cifra con pgcrypto antes de tocar la base de datos.
                </p>
              </Field>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Próximo examen (recordatorio)">
                  <input
                    type="date"
                    className="input"
                    min={new Date().toISOString().slice(0, 10)}
                    value={form.proximoExamenAntes}
                    onChange={(e) => update('proximoExamenAntes', e.target.value)}
                  />
                </Field>
                <Field label="URL del certificado (opcional)">
                  <input
                    type="url"
                    className="input"
                    placeholder="https://..."
                    value={form.certificadoUrl}
                    onChange={(e) => update('certificadoUrl', e.target.value)}
                  />
                </Field>
              </div>

              {/* Consentimiento */}
              <fieldset className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
                <legend className="px-1 text-xs font-medium text-emerald-900">
                  <ShieldCheck className="mr-1 inline h-3 w-3" />
                  Consentimiento Ley 29733 (obligatorio)
                </legend>
                <label className="flex cursor-pointer items-start gap-2 text-xs text-emerald-900">
                  <input
                    type="checkbox"
                    checked={form.consentimientoLey29733}
                    onChange={(e) => update('consentimientoLey29733', e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    Confirmo que el trabajador firmó el consentimiento expreso para el
                    tratamiento de sus datos médicos según Ley 29733 de Protección de Datos
                    Personales y D.S. 016-2024-JUS, y que el certificado original (con
                    diagnóstico) queda archivado en el centro médico DIGESA, no en COMPLY360.
                  </span>
                </label>
              </fieldset>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <Link href="/dashboard/sst/emo">
                  <Button type="button" variant="secondary">
                    Cancelar
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    !form.workerId ||
                    !form.fechaExamen ||
                    !form.centroMedicoNombre ||
                    !form.consentimientoLey29733
                  }
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar EMO
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
