'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

interface SedeLite {
  id: string
  nombre: string
  tipoInstalacion: string
}

interface ColaboradorLite {
  id: string
  nombre: string
  apellido: string
  dni: string
  especialidades: string[]
  vigenciaContratoHasta: string | null
  activo: boolean
}

export default function NuevaVisitaPage() {
  const router = useRouter()
  const [sedes, setSedes] = useState<SedeLite[]>([])
  const [colaboradores, setColaboradores] = useState<ColaboradorLite[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [sedeId, setSedeId] = useState('')
  const [colaboradorId, setColaboradorId] = useState('')
  const [fechaProgramada, setFechaProgramada] = useState('')
  const [notas, setNotas] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/sst/sedes', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { sedes: [] })),
      fetch('/api/sst/colaboradores?activo=true', { cache: 'no-store' }).then((r) =>
        r.ok ? r.json() : { colaboradores: [] },
      ),
    ]).then(([s, c]) => {
      if (cancelled) return
      const sedeList = (s.sedes ?? []) as SedeLite[]
      setSedes(sedeList)
      if (sedeList.length === 1) setSedeId(sedeList[0].id)
      setColaboradores((c.colaboradores ?? []) as ColaboradorLite[])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/sst/visitas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sedeId,
          colaboradorId,
          fechaProgramada: new Date(fechaProgramada).toISOString(),
          notasInspector: notas.trim() || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json?.error || 'No se pudo programar la visita')
        return
      }
      toast.success('Visita programada')
      router.push(`/dashboard/sst/visitas/${json.visita.id}`)
    } finally {
      setSubmitting(false)
    }
  }

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
        title="Programar visita"
        subtitle="Asigna un colaborador SST interno COMPLY360 a una sede de la empresa."
      />

      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando recursos...
        </div>
      ) : sedes.length === 0 ? (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-start gap-2 py-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div>
              No tienes sedes registradas.{' '}
              <Link href="/dashboard/sst/sedes/nueva" className="font-medium underline">
                Crea al menos una sede
              </Link>{' '}
              antes de programar una visita.
            </div>
          </CardContent>
        </Card>
      ) : colaboradores.length === 0 ? (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-start gap-2 py-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            No hay colaboradores SST activos en COMPLY360. Contacta al equipo para asignar uno.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="Sede a inspeccionar" required>
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

              <Field label="Colaborador SST asignado" required>
                <select
                  required
                  className="input"
                  value={colaboradorId}
                  onChange={(e) => setColaboradorId(e.target.value)}
                >
                  <option value="">— Elegir colaborador —</option>
                  {colaboradores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.apellido} · DNI {c.dni}
                      {c.especialidades.length > 0 && ` · ${c.especialidades.join(', ')}`}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Fecha y hora programada" required>
                <input
                  type="datetime-local"
                  required
                  className="input"
                  min={new Date().toISOString().slice(0, 16)}
                  value={fechaProgramada}
                  onChange={(e) => setFechaProgramada(e.target.value)}
                />
              </Field>

              <Field label="Notas para el inspector (opcional)">
                <textarea
                  rows={3}
                  className="input"
                  placeholder="Áreas a priorizar, contactos en sede, equipos críticos a inspeccionar..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                />
              </Field>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <Link href="/dashboard/sst/visitas">
                  <Button type="button" variant="secondary">
                    Cancelar
                  </Button>
                </Link>
                <Button type="submit" disabled={submitting || !sedeId || !colaboradorId || !fechaProgramada}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Programar visita
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
