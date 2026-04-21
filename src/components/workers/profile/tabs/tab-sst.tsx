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
  ArrowRight,
} from 'lucide-react'
import type { LegajoDoc } from './tab-legajo'

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
              fontFamily: 'var(--font-serif)',
              fontSize: 26,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              lineHeight: 1.2,
            }}
            dangerouslySetInnerHTML={{
              __html: `Seguridad y salud de <em style="color: var(--emerald-700); font-style: italic">${workerFirstName}</em>.`,
            }}
          />
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
          const statusIcon = missing ? (
            <XCircle className="h-4 w-4 text-red-600" />
          ) : expired > 0 ? (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          )

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
                <div className="flex-shrink-0">{statusIcon}</div>
              </div>

              <div className="mt-3 pt-3 border-t border-[color:var(--border-subtle)]">
                <div className="flex items-baseline gap-2">
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 28,
                      color: missing
                        ? 'var(--crimson-700, #b91c1c)'
                        : expired > 0
                          ? 'var(--amber-700, #b45309)'
                          : 'var(--emerald-700)',
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
                <span
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    color:
                      doc.status === 'VERIFIED' || doc.status === 'UPLOADED'
                        ? 'var(--emerald-700)'
                        : doc.status === 'EXPIRED'
                          ? 'var(--crimson-700, #b91c1c)'
                          : 'var(--text-tertiary)',
                  }}
                >
                  {doc.status}
                </span>
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

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'VERIFIED' || status === 'UPLOADED'
      ? 'var(--emerald-500)'
      : status === 'EXPIRED'
        ? 'var(--crimson-500, #ef4444)'
        : 'var(--amber-500)'
  return (
    <span
      aria-hidden="true"
      style={{
        width: 8,
        height: 8,
        borderRadius: 9999,
        background: color,
        boxShadow: `0 0 0 3px color-mix(in srgb, ${color} 14%, transparent)`,
        flexShrink: 0,
      }}
    />
  )
}
