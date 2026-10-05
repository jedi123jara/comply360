'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { WorkerProfile } from '@/components/workers/profile'
import type { WorkerSummary } from '@/components/workers/profile/worker-profile-header'
import type { LegajoDoc } from '@/components/workers/profile/tabs/tab-legajo'
import type { WorkerAlertSummary } from '@/components/workers/profile/worker-alerts-card'
import { SkeletonCard, SkeletonStats } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * Worker [id] — Super-Perfil v2 (Fase C Sprint 2).
 *
 * Reemplaza la página legacy de 1,624 líneas por `<WorkerProfile>` (9 tabs).
 * La legacy se preservó como `.page-legacy.tsx.bak` para referencia.
 *
 * Los datos se cargan en el cliente; por eso `router.refresh()` NO los
 * recarga. Las tabs que modifican datos (p. ej. subir un documento al legajo)
 * llaman a `onReload`, que vuelve a pedir trabajador + documentos sin
 * desmontar el perfil (la pestaña activa se mantiene).
 */

interface RawWorker {
  id: string
  dni: string
  firstName: string
  lastName: string | null
  email?: string | null
  phone?: string | null
  position?: string | null
  department?: string | null
  regimenLaboral?: string | null
  tipoContrato?: string | null
  fechaIngreso?: string | null
  status?: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED' | string
  legajoScore?: number | null
  sueldoBruto?: number | null
  asignacionFamiliar?: boolean | null
  flagTRegistroPresentado?: boolean | null
  flagTRegistroFecha?: string | null
  deletedAt?: string | null
  alerts?: Array<{
    id: string
    type: string
    severity: string
    title: string
    description?: string | null
    dueDate?: string | null
    multaEstimada?: number | string | null
  }>
  documents?: RawDocument[]
}

interface RawDocument {
  id: string
  category: string
  documentType: string
  title?: string | null
  status?: string | null
  isRequired?: boolean
  expiresAt?: string | null
  createdAt?: string | null
  verifiedBy?: string | null
  aiVerification?: LegajoDoc['aiVerification']
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export default function WorkerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''

  const [worker, setWorker] = useState<WorkerSummary | null>(null)
  const [docs, setDocs] = useState<LegajoDoc[]>([])
  const [alerts, setAlerts] = useState<WorkerAlertSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Descarta respuestas viejas si el id cambia o si hay recargas solapadas.
  const requestIdRef = useRef(0)
  const hasDataRef = useRef(false)

  const loadWorker = useCallback(async (): Promise<void> => {
    if (!id) return
    const requestId = ++requestIdRef.current
    try {
      // Fetch en paralelo: worker detail + docs enriquecidos con AI verification
      const [workerPayload, docsPayload] = await Promise.all([
        fetch(`/api/workers/${id}`, { cache: 'no-store' }).then((r) => {
          if (!r.ok) throw new Error(`Status ${r.status}`)
          return r.json() as Promise<{ data?: RawWorker } | RawWorker>
        }),
        fetch(`/api/workers/${id}/documents`, { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : { data: undefined }))
          .catch(() => ({ data: undefined })) as Promise<{ data?: RawDocument[] }>,
      ])
      if (requestId !== requestIdRef.current) return

      const raw: RawWorker =
        'data' in workerPayload && workerPayload.data
          ? workerPayload.data
          : (workerPayload as RawWorker)
      setWorker({
        id: raw.id,
        firstName: raw.firstName ?? '',
        lastName: raw.lastName ?? '',
        dni: raw.dni,
        email: raw.email ?? null,
        phone: raw.phone ?? null,
        position: raw.position ?? null,
        department: raw.department ?? null,
        regimenLaboral: raw.regimenLaboral ?? null,
        tipoContrato: raw.tipoContrato ?? null,
        fechaIngreso: raw.fechaIngreso ?? null,
        status: raw.status ?? 'ACTIVE',
        legajoScore: raw.legajoScore ?? null,
        sueldoBruto: typeof raw.sueldoBruto === 'number' ? raw.sueldoBruto : null,
        asignacionFamiliar: raw.asignacionFamiliar ?? false,
        flagTRegistroPresentado: raw.flagTRegistroPresentado ?? false,
        flagTRegistroFecha: raw.flagTRegistroFecha ?? null,
        deletedAt: raw.deletedAt ?? null,
      })
      setAlerts(
        (raw.alerts ?? []).map((a) => ({
          id: a.id,
          type: a.type,
          severity: a.severity,
          title: a.title,
          description: a.description ?? null,
          dueDate: a.dueDate ?? null,
          multaEstimada: toNumberOrNull(a.multaEstimada),
        })),
      )
      // Usar docs enriquecidos si están disponibles, si no caer a raw.documents
      const enrichedDocs = docsPayload.data ?? raw.documents ?? []
      setDocs(
        enrichedDocs.map((d) => ({
          id: d.id,
          category: d.category,
          documentType: d.documentType,
          title: d.title ?? d.documentType ?? 'Documento',
          required: !!d.isRequired,
          status: d.status ?? 'PENDING',
          expiresAt: d.expiresAt ?? null,
          createdAt: d.createdAt ?? null,
          verifiedBy: d.verifiedBy ?? null,
          aiVerification: d.aiVerification ?? null,
        })),
      )
      hasDataRef.current = true
      setError(null)
    } catch (e: unknown) {
      if (requestId !== requestIdRef.current) return
      if (hasDataRef.current) {
        // Recarga fallida: conservamos lo que ya se veía en pantalla.
        toast.error('No pudimos actualizar los datos del trabajador. Revisa tu conexión.')
      } else {
        setError(e instanceof Error ? e.message : 'Error desconocido')
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) void loadWorker()
    })
    return () => {
      cancelled = true
    }
  }, [loadWorker])

  if (loading) {
    return (
      <div className="space-y-5">
        <SkeletonCard className="h-48" />
        <SkeletonStats count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  if (error || !worker) {
    return (
      <Card padding="lg" variant="crimson" className="max-w-xl mx-auto text-center">
        <div className="flex flex-col items-center gap-3 py-4">
          <AlertTriangle className="h-8 w-8 text-crimson-700" />
          <h2 className="text-lg font-bold">No se pudo cargar el trabajador</h2>
          <p className="text-sm text-[color:var(--text-secondary)]">
            {error ?? 'Verifica tu conexión y vuelve a intentar.'}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.back()}>
              Volver
            </Button>
            <Button onClick={() => window.location.reload()}>Reintentar</Button>
          </div>
        </div>
      </Card>
    )
  }

  return <WorkerProfile worker={worker} legajoDocs={docs} alerts={alerts} onReload={loadWorker} />
}
