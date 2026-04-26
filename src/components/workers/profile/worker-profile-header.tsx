'use client'

import Link from 'next/link'
import { ArrowLeft, Phone, Mail, Calendar, Building2, Sparkles, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProgressRing } from '@/components/ui/progress-ring'
import { complianceScoreColor } from '@/lib/brand'
import { useCopilot } from '@/providers/copilot-provider'
import { AnimatedShield } from '@/components/comply360/animated-shield'

/**
 * WorkerProfileHeader — sticky header del Super-Perfil.
 *
 * Muestra identidad, régimen, legajo score como anillo, y acciones rápidas
 * (calcular liquidación, enviar mensaje, abrir copilot).
 */

export interface WorkerSummary {
  id: string
  firstName: string
  lastName: string
  dni: string
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
}

const STATUS_META: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'neutral' | 'danger' }
> = {
  ACTIVE: { label: 'Activo', variant: 'success' },
  ON_LEAVE: { label: 'Licencia', variant: 'warning' },
  SUSPENDED: { label: 'Suspendido', variant: 'warning' },
  TERMINATED: { label: 'Cesado', variant: 'neutral' },
}

const pen = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  maximumFractionDigits: 0,
})

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '?'
}

export function WorkerProfileHeader({ worker }: { worker: WorkerSummary }) {
  const copilot = useCopilot()
  const legajoScore = worker.legajoScore ?? 0
  const scoreColor = complianceScoreColor(legajoScore)
  const statusMeta = STATUS_META[worker.status ?? 'ACTIVE'] ?? STATUS_META.ACTIVE

  return (
    <header className="rounded-2xl border border-[color:var(--border-default)] bg-white shadow-[var(--elevation-2)] motion-fade-in-up">
      <div className="px-6 py-5 flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Back + identity */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Link
            href="/dashboard/trabajadores"
            className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--border-default)] bg-white text-[color:var(--text-secondary)] hover:border-emerald-500 hover:text-[color:var(--text-primary)] hover:bg-[color:var(--neutral-50)] transition-colors"
            aria-label="Volver a Trabajadores"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {/* Avatar */}
          <div
            className="shrink-0 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white text-lg font-semibold shadow-[var(--elevation-1)]"
            aria-hidden="true"
          >
            {initials(worker.firstName, worker.lastName)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className="c360-page-title-editorial truncate"
                style={{ fontSize: 28, lineHeight: 1.15 }}
                dangerouslySetInnerHTML={{
                  __html: `${worker.lastName}, <em>${worker.firstName}</em>`,
                }}
              />
              <Badge variant={statusMeta.variant} size="sm" dot>
                {statusMeta.label}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-[color:var(--text-secondary)] truncate">
              {[worker.position, worker.department].filter(Boolean).join(' · ') || 'Sin cargo definido'}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[color:var(--text-tertiary)]">
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3 w-3" /> DNI {worker.dni}
              </span>
              {worker.regimenLaboral ? (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {worker.regimenLaboral}
                </span>
              ) : null}
              {worker.fechaIngreso ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Ingreso {fmtDate(worker.fechaIngreso)}
                </span>
              ) : null}
              {worker.email ? (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {worker.email}
                </span>
              ) : null}
              {worker.phone ? (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {worker.phone}
                </span>
              ) : null}
              {typeof worker.sueldoBruto === 'number' ? (
                <span className="inline-flex items-center gap-1 font-mono">
                  {pen.format(worker.sueldoBruto)} bruto
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Score + quick actions */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="relative text-center">
            <ProgressRing value={legajoScore} size={80} stroke={7}>
              <div className="text-center leading-none">
                <div
                  style={{
                    color: scoreColor,
                    fontFamily: 'var(--font-serif)',
                    fontSize: 24,
                    fontWeight: 400,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  {legajoScore}
                </div>
                <div className="mt-0.5 text-[9px] uppercase tracking-widest text-[color:var(--text-tertiary)]">
                  legajo
                </div>
              </div>
            </ProgressRing>
            {/* Escudo flotante top-right del ring — refuerza identidad */}
            <div style={{ position: 'absolute', top: -6, right: -6 }}>
              <AnimatedShield size={24} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              icon={<Sparkles className="h-3.5 w-3.5" />}
              onClick={() =>
                copilot.open(
                  `Quiero ver el estado integral del trabajador ${worker.firstName} ${worker.lastName} (DNI ${worker.dni}). Dame el top de acciones pendientes priorizadas.`
                )
              }
            >
              Consultar Asistente IA
            </Button>
            <Link
              href={`/dashboard/trabajadores/${worker.id}/cese`}
              className="text-xs text-center text-[color:var(--text-tertiary)] hover:text-crimson-600 transition-colors"
            >
              Iniciar cese →
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
