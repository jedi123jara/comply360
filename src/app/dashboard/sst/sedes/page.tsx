'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Building2, MapPin, Users, Loader2, AlertCircle } from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface SedeListItem {
  id: string
  nombre: string
  direccion: string
  departamento: string
  provincia: string
  distrito: string
  tipoInstalacion: string
  activa: boolean
  areaM2: number | null
  numeroPisos: number | null
  createdAt: string
  _count: {
    puestos: number
    iperBases: number
    accidentes: number
    visitas: number
  }
}

const TIPO_LABELS: Record<string, string> = {
  OFICINA: 'Oficina',
  PLANTA: 'Planta',
  OBRA: 'Obra',
  SUCURSAL: 'Sucursal',
  TALLER: 'Taller',
  ALMACEN: 'Almacén',
  CAMPO: 'Campo',
}

export default function SedesPage() {
  const [sedes, setSedes] = useState<SedeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/sst/sedes', { cache: 'no-store' })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j?.error || 'No se pudieron cargar las sedes')
        }
        const json = await res.json()
        if (!cancelled) setSedes(json.sedes ?? [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SST · Fase 5"
        title="Sedes"
        subtitle="Centros de trabajo registrados. Cada sede agrupa puestos, IPERC, accidentes y visitas Field Audit."
        actions={
          <Link href="/dashboard/sst/sedes/nueva">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva sede
            </Button>
          </Link>
        }
      />

      {error && (
        <Card className="border-rose-200 bg-rose-50/60">
          <CardContent className="flex items-center gap-2 py-4 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando sedes...
        </div>
      ) : sedes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Building2 className="h-10 w-10 text-slate-400" />
            <div>
              <p className="font-medium text-slate-700">Aún no tienes sedes registradas</p>
              <p className="text-sm text-slate-500">
                Crea tu primera sede para empezar a gestionar puestos y matrices IPERC.
              </p>
            </div>
            <Link href="/dashboard/sst/sedes/nueva">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Crear primera sede
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sedes.map((s) => (
            <Link
              key={s.id}
              href={`/dashboard/sst/sedes/${s.id}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-emerald-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                    <h3 className="truncate text-base font-semibold text-slate-900 group-hover:text-emerald-700">
                      {s.nombre}
                    </h3>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" />
                    {s.distrito}, {s.provincia}
                  </p>
                </div>
                <Badge variant={s.activa ? 'success' : 'neutral'}>
                  {s.activa ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="neutral">{TIPO_LABELS[s.tipoInstalacion] ?? s.tipoInstalacion}</Badge>
                {s.areaM2 ? <span className="text-slate-500">{s.areaM2.toLocaleString('es-PE')} m²</span> : null}
                {s.numeroPisos ? <span className="text-slate-500">· {s.numeroPisos} pisos</span> : null}
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2 border-t border-slate-100 pt-3 text-center text-xs text-slate-500">
                <div>
                  <div className="flex items-center justify-center gap-1 font-semibold text-slate-700">
                    <Users className="h-3 w-3" />
                    {s._count.puestos}
                  </div>
                  <div>Puestos</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-700">{s._count.iperBases}</div>
                  <div>IPERC</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-700">{s._count.accidentes}</div>
                  <div>Accidentes</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-700">{s._count.visitas}</div>
                  <div>Visitas</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
