'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { WorkerProfile } from '@/components/workers/profile'
import type { WorkerSummary } from '@/components/workers/profile/worker-profile-header'
import type { LegajoDoc } from '@/components/workers/profile/tabs/tab-legajo'
import { SkeletonCard, SkeletonStats } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * Worker [id] — Super-Perfil v2 (Fase C Sprint 2).
 *
 * Reemplaza la página legacy de 1,624 líneas por `<WorkerProfile>` (8 tabs).
 * La legacy se preservó como `.page-legacy.tsx.bak` para referencia.
 *
 * Tabs con data real: Información · Legajo.
 * Tabs con TabPlaceholder (CTA al módulo): Contratos · Remuneraciones ·
 * Vacaciones · SST · Beneficios · Historial — integración profunda en
 * sprints siguientes.
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
  documents?: Array<{
    id: string
    category: string
    documentType: string
    title?: string | null
    status?: string | null
    isRequired?: boolean
    expiresAt?: string | null
    verifiedBy?: string | null
    aiVerification?: {
      decision?: string | null
      confidence?: number | null
      summary?: string | null
      issues?: string[]
      verifiedByAI?: boolean
    } | null
  }>
}

export default function WorkerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''

  const [worker, setWorker] = useState<WorkerSummary | null>(null)
  const [docs, setDocs] = useState<LegajoDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let mounted = true
    // Fetch en paralelo: worker detail + docs enriquecidos con AI verification
    Promise.all([
      fetch(`/api/workers/${id}`).then((r) => {
        if (!r.ok) throw new Error(`Status ${r.status}`)
        return r.json() as Promise<{ data?: RawWorker } | RawWorker>
      }),
      fetch(`/api/workers/${id}/documents`)
        .then((r) => (r.ok ? r.json() : Promise.resolve({ data: [] })))
        .catch(() => ({ data: [] })) as Promise<{ data?: RawWorker['documents'] }>,
    ])
      .then(([workerPayload, docsPayload]) => {
        if (!mounted) return
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
        })
        // Usar docs enriquecidos si están disponibles, si no caer a raw.documents
        const enrichedDocs = docsPayload.data ?? raw.documents ?? []
        setDocs(
          enrichedDocs.map((d) => ({
            id: d.id,
            category: d.category,
            title: d.title ?? d.documentType ?? 'Documento',
            required: !!d.isRequired,
            status: d.status ?? 'PENDING',
            expiresAt: d.expiresAt ?? null,
            verifiedBy: d.verifiedBy ?? null,
            aiVerification: d.aiVerification ?? null,
          })),
        )
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (!mounted) return
        setError(e instanceof Error ? e.message : 'Error desconocido')
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [id])

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

  return <WorkerProfile worker={worker} legajoDocs={docs} />
}
