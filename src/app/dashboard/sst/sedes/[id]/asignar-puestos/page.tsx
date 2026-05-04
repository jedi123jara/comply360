'use client'

import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
  Search,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

/**
 * Bulk asignación de puestos a trabajadores para una sede.
 *
 * Flujo: el admin SST entra a la sede, ve todos los puestos en una tabla, y
 * por cada puesto elige a qué trabajador asignar (o desasignar). Guarda en
 * un solo click — un POST a /api/sst/puestos/bulk-assign aplica todo en
 * transacción.
 *
 * Reemplaza el flujo "abrir modal por cada puesto" — para 50 puestos eso son
 * 50 modales. Aquí es una sola pantalla con dropdowns + un botón guardar.
 */

interface PuestoRow {
  id: string
  nombre: string
  workerId: string | null
  worker: {
    id: string
    firstName: string
    lastName: string
    dni: string
  } | null
}

interface WorkerOption {
  id: string
  firstName: string
  lastName: string
  dni: string
  position: string | null
}

interface SedeMin {
  id: string
  nombre: string
}

export default function AsignarPuestosPage() {
  const params = useParams<{ id: string }>()
  const sedeId = params.id
  const router = useRouter()

  const [sede, setSede] = useState<SedeMin | null>(null)
  const [puestos, setPuestos] = useState<PuestoRow[]>([])
  const [workers, setWorkers] = useState<WorkerOption[]>([])
  // Estado local de cambios pendientes: puestoId → workerId | null
  const [pending, setPending] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!sedeId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [sedeRes, puestosRes, workersRes] = await Promise.all([
          fetch(`/api/sst/sedes/${sedeId}`, { cache: 'no-store' }),
          fetch(`/api/sst/puestos?sedeId=${sedeId}`, { cache: 'no-store' }),
          fetch('/api/workers?status=ACTIVE&limit=500', { cache: 'no-store' }),
        ])

        if (!sedeRes.ok) throw new Error('No se pudo cargar la sede')
        if (!puestosRes.ok) throw new Error('No se pudieron cargar los puestos')
        if (!workersRes.ok) throw new Error('No se pudieron cargar los trabajadores')

        const sedeJson = await sedeRes.json()
        const puestosJson = await puestosRes.json()
        const workersJson = await workersRes.json()

        if (cancelled) return
        setSede({ id: sedeJson.sede.id, nombre: sedeJson.sede.nombre })
        setPuestos(puestosJson.puestos ?? [])
        setWorkers(workersJson.workers ?? workersJson.data ?? [])
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
  }, [sedeId])

  // Workers filtrados por búsqueda
  const filteredWorkers = useMemo(() => {
    if (!search.trim()) return workers
    const q = search.trim().toLowerCase()
    return workers.filter(
      (w) =>
        w.firstName.toLowerCase().includes(q) ||
        w.lastName.toLowerCase().includes(q) ||
        w.dni.includes(q),
    )
  }, [workers, search])

  // Puestos filtrados por búsqueda (busca también en el worker actual)
  const filteredPuestos = useMemo(() => {
    if (!search.trim()) return puestos
    const q = search.trim().toLowerCase()
    return puestos.filter((p) => {
      if (p.nombre.toLowerCase().includes(q)) return true
      if (p.worker) {
        return (
          p.worker.firstName.toLowerCase().includes(q) ||
          p.worker.lastName.toLowerCase().includes(q) ||
          p.worker.dni.includes(q)
        )
      }
      return false
    })
  }, [puestos, search])

  // Resuelve el workerId actual (o pendiente) de un puesto
  function currentWorkerId(p: PuestoRow): string | null {
    if (p.id in pending) return pending[p.id]
    return p.workerId
  }

  function setAssignment(puestoId: string, workerId: string | null) {
    setPending((prev) => {
      const next = { ...prev }
      const original = puestos.find((p) => p.id === puestoId)?.workerId ?? null
      if (workerId === original) {
        delete next[puestoId]
      } else {
        next[puestoId] = workerId
      }
      return next
    })
  }

  const dirtyCount = Object.keys(pending).length

  const stats = useMemo(() => {
    let asignados = 0
    for (const p of puestos) {
      const wid = currentWorkerId(p)
      if (wid) asignados++
    }
    return {
      total: puestos.length,
      asignados,
      sinAsignar: puestos.length - asignados,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puestos, pending])

  async function handleSave() {
    if (dirtyCount === 0) return
    setSaving(true)
    setError(null)
    try {
      const assignments = Object.entries(pending).map(([puestoId, workerId]) => ({
        puestoId,
        workerId,
      }))
      const res = await fetch('/api/sst/puestos/bulk-assign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assignments }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'No se pudo guardar la asignación')

      // Actualizamos el estado local con los cambios aplicados
      setPuestos((prev) =>
        prev.map((p) => {
          if (!(p.id in pending)) return p
          const newWorkerId = pending[p.id]
          const newWorker = newWorkerId
            ? workers.find((w) => w.id === newWorkerId) ?? null
            : null
          return {
            ...p,
            workerId: newWorkerId,
            worker: newWorker
              ? {
                  id: newWorker.id,
                  firstName: newWorker.firstName,
                  lastName: newWorker.lastName,
                  dni: newWorker.dni,
                }
              : null,
          }
        }),
      )
      setPending({})

      const skippedNote =
        json.skippedCount > 0 ? ` (${json.skippedCount} omitidos por validación)` : ''
      toast.success(
        `${json.applied} asignaciones guardadas${
          json.unchanged > 0 ? `, ${json.unchanged} sin cambios` : ''
        }${skippedNote}`,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    setPending({})
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/sst/sedes/${sedeId}`}
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ChevronLeft className="w-4 h-4" />
        Volver a la sede
      </Link>

      <PageHeader
        title={sede ? `Asignar trabajadores · ${sede.nombre}` : 'Asignar trabajadores'}
        subtitle={`Asigna cada puesto a un trabajador activo. ${stats.asignados} de ${stats.total} asignados, ${stats.sinAsignar} sin asignar.`}
      />

      {error && (
        <Card>
          <CardContent className="p-4 flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="Buscar puesto, trabajador o DNI..."
              className="w-full pl-9 pr-9 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            )}
          </div>
          <div className="text-xs text-slate-500 shrink-0">
            <Users className="w-3.5 h-3.5 inline-block mr-1" />
            {workers.length} trabajadores activos
          </div>
        </CardContent>
      </Card>

      {/* Tabla puestos × workers */}
      {filteredPuestos.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-slate-500">
            {puestos.length === 0
              ? 'Esta sede aún no tiene puestos creados. Crea puestos primero.'
              : 'Sin resultados para tu búsqueda.'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Puesto</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-[400px]">
                      Trabajador asignado
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-700 w-32">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPuestos.map((p) => {
                    const currentWid = currentWorkerId(p)
                    const isPending = p.id in pending
                    return (
                      <tr key={p.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 align-middle">
                          <div className="font-medium text-slate-900">{p.nombre}</div>
                          {p.worker && currentWid !== p.workerId && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              Antes: {p.worker.firstName} {p.worker.lastName}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <select
                            value={currentWid ?? ''}
                            onChange={(e) =>
                              setAssignment(p.id, e.target.value || null)
                            }
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                            disabled={saving}
                          >
                            <option value="">— Sin asignar —</option>
                            {filteredWorkers.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.firstName} {w.lastName} (DNI {w.dni})
                                {w.position ? ` · ${w.position}` : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 align-middle text-right">
                          {isPending ? (
                            <Badge variant="warning">Pendiente</Badge>
                          ) : currentWid ? (
                            <Badge variant="success">Asignado</Badge>
                          ) : (
                            <Badge variant="neutral">Vacante</Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer sticky con acción de guardar */}
      {dirtyCount > 0 && (
        <div className="sticky bottom-4 z-10">
          <Card className="ring-2 ring-emerald-300 shadow-lg">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-slate-900">
                  {dirtyCount} {dirtyCount === 1 ? 'cambio pendiente' : 'cambios pendientes'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={handleDiscard} disabled={saving}>
                  Descartar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar {dirtyCount} {dirtyCount === 1 ? 'cambio' : 'cambios'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
