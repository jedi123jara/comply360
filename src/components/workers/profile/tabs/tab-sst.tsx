'use client'

import Link from 'next/link'
import {
  HardHat,
  HeartPulse,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
} from 'lucide-react'
import type { LegajoDoc } from './tab-legajo'

/**
 * Estado SST con palabra + ícono; el color solo refuerza (WCAG 1.4.1).
 * Tintas de los tokens semánticos: ≥ 4,5:1 sobre blanco y sobre su fondo.
 */
type SstTone = 'ok' | 'warn' | 'danger' | 'neutral'

const SST_TONE: Record<
  SstTone,
  { icon: React.ComponentType<{ className?: string }>; ink: string; bg: string; border: string }
> = {
  ok: {
    icon: CheckCircle2,
    ink: 'var(--color-success-text)',
    bg: 'var(--color-success-bg)',
    border: 'var(--color-success-border)',
  },
  warn: {
    icon: AlertTriangle,
    ink: 'var(--color-warning-text)',
    bg: 'var(--color-warning-bg)',
    border: 'var(--color-warning-border)',
  },
  danger: {
    icon: XCircle,
    ink: 'var(--color-danger-text)',
    bg: 'var(--color-danger-bg)',
    border: 'var(--color-danger-border)',
  },
  neutral: {
    icon: Clock,
    ink: 'var(--text-secondary)',
    bg: 'var(--bg-inset)',
    border: 'var(--border-default)',
  },
}

function docTone(status: string): SstTone {
  if (status === 'VERIFIED' || status === 'UPLOADED') return 'ok'
  if (status === 'EXPIRED' || status === 'MISSING') return 'danger'
  if (status === 'PENDING') return 'warn'
  return 'neutral'
}

function SstStatePill({
  tone,
  label,
  icon,
}: {
  tone: SstTone
  label: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  const t = SST_TONE[tone]
  const Icon = icon ?? t.icon
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
      style={{ color: t.ink, background: t.bg, borderColor: t.border }}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

/**
 * TabSST — documentos SST del trabajador (exámenes médicos, capacitaciones, EPP).
 *
 * Filtra los docs del legajo con `category === 'SST'` y los clasifica por
 * tipo (EMO, capacitación, EPP) mostrando estado y vencimiento.
 */

interface TabSstProps {
  workerId: string
  workerFirstName: string
  legajoDocs: LegajoDoc[]
}

interface ClassifiedGroup {
  key: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  pattern: RegExp
}

const GROUPS: ClassifiedGroup[] = [
  {
    key: 'emo',
    label: 'Examen médico ocupacional',
    description: 'Anual (Ley 29783, Art. 71 c). Obligatorio.',
    icon: HeartPulse,
    pattern: /examen|emo|med|salud/i,
  },
  {
    key: 'capacitacion',
    label: 'Capacitaciones SST',
    description: 'Mínimo 4 al año (D.S. 005-2012-TR, Art. 27).',
    icon: GraduationCap,
    pattern: /capac|induc|entrena/i,
  },
  {
    key: 'epp',
    label: 'Entrega de EPP',
    description: 'Registro de entrega firmado por trabajador.',
    icon: ShieldCheck,
    pattern: /epp|equipo|implemento/i,
  },
]

const STATUS_LABELS: Record<string, string> = {
  VERIFIED: 'Verificado',
  UPLOADED: 'Subido',
  PENDING: 'Por revisar',
  EXPIRED: 'Vencido',
  MISSING: 'Falta',
}

export function TabSST({ workerId, workerFirstName, legajoDocs }: TabSstProps) {
  const sstDocs = legajoDocs.filter((d) => d.category === 'SST')

  return (
    <div className="space-y-6">
      {/* Header editorial */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-700 mb-2">
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              style={{ boxShadow: '0 0 0 3px rgba(16,185,129,0.15)' }}
            />
            <span>Ley 29783 · SST</span>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              lineHeight: 1.2,
            }}
          >
            {/* Texto escapado por React: el nombre viene de datos del usuario. */}
            Seguridad y salud de <span style={{ color: 'var(--brand-primary-text, #2563eb)' }}>{workerFirstName}</span>.
          </h2>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1 max-w-2xl">
            Exámenes médicos, capacitaciones obligatorias y entrega de EPP — todo consolidado
            desde los documentos del legajo.
          </p>
        </div>
        <Link
          href="/dashboard/sst"
          className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs font-semibold hover:border-emerald-500/60 transition-colors"
        >
          <HardHat className="w-3.5 h-3.5" />
          Abrir módulo SST
        </Link>
      </div>

      {/* Groups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {GROUPS.map((group) => {
          const matching = sstDocs.filter((d) => group.pattern.test(d.title))
          const verified = matching.filter(
            (d) => d.status === 'VERIFIED' || d.status === 'UPLOADED',
          ).length
          const expired = matching.filter((d) => d.status === 'EXPIRED').length
          const missing = matching.length === 0

          const GroupIcon = group.icon
          const groupTone: SstTone = missing ? 'danger' : expired > 0 ? 'warn' : 'ok'
          const groupLabel = missing ? 'Falta' : expired > 0 ? 'Con vencidos' : 'Vigente'

          return (
            <div
              key={group.key}
              className="rounded-xl border border-[color:var(--border-default)] bg-white p-5"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 bg-emerald-50 text-emerald-700"
                >
                  <GroupIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                    {group.label}
                  </p>
                  <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">
                    {group.description}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <SstStatePill tone={groupTone} label={groupLabel} />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[color:var(--border-subtle)]">
                <div className="flex items-baseline gap-2">
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 28,
                      color: SST_TONE[groupTone].ink,
                      lineHeight: 1,
                    }}
                  >
                    {matching.length}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)] font-bold">
                    documento{matching.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-[color:var(--text-secondary)]">
                  {missing
                    ? 'Ningún documento — riesgo de multa grave'
                    : expired > 0
                      ? `${verified} vigentes · ${expired} vencido${expired === 1 ? '' : 's'}`
                      : `${verified} vigente${verified === 1 ? '' : 's'}`}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Individual docs list */}
      {sstDocs.length > 0 ? (
        <div className="rounded-2xl border border-[color:var(--border-default)] bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)]">
            <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-secondary)]">
              Documentos SST en legajo ({sstDocs.length})
            </p>
          </div>
          <ul className="divide-y divide-[color:var(--border-subtle)]">
            {sstDocs.slice(0, 10).map((doc) => (
              <li key={doc.id} className="px-5 py-3 flex items-center gap-3">
                <StatusDot status={doc.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[color:var(--text-primary)] truncate">
                    {doc.title}
                  </p>
                  {doc.expiresAt ? (
                    <p className="text-xs text-[color:var(--text-tertiary)]">
                      Vence {new Date(doc.expiresAt).toLocaleDateString('es-PE')}
                    </p>
                  ) : null}
                </div>
                <SstStatePill
                  tone={docTone(doc.status)}
                  icon={doc.status === 'PENDING' ? Clock : undefined}
                  label={STATUS_LABELS[doc.status] ?? doc.status}
                />
              </li>
            ))}
          </ul>
          {sstDocs.length > 10 ? (
            <div className="px-5 py-3 border-t border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)] text-center">
              <Link
                href={`/dashboard/trabajadores/${workerId}?tab=legajo`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Ver {sstDocs.length - 10} documentos más en Legajo{' '}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Indicador a la izquierda de cada documento: un ícono distinto por estado
 * (no solo un punto de color). Es decorativo porque la pastilla de la derecha
 * ya dice el estado con palabras.
 */
function StatusDot({ status }: { status: string }) {
  const t = SST_TONE[docTone(status)]
  // "Por revisar" no es una alerta: reloj en vez de triángulo.
  const Icon = status === 'PENDING' ? Clock : t.icon
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
      style={{ color: t.ink, background: t.bg }}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  )
}
