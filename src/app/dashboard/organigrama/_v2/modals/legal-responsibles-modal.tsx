/**
 * Modal — Responsables legales designados (vista global).
 *
 * Lista todos los roles de compliance del catálogo agrupados por tipo
 * (Comité SST, Hostigamiento, Brigada de emergencia, Individuales).
 * Para cada rol muestra titulares, vencimientos, base legal, y CTA para
 * designar a alguien si está sin cubrir.
 *
 * Construido sobre `buildLegalResponsiblesSummary()` que ya existe en
 * src/lib/orgchart/legal-responsibles.ts. Usa el mismo tree que carga el
 * canvas, así que no necesita un fetch extra.
 */
'use client'

import { useMemo } from 'react'
import { ShieldCheck, UserPlus, ExternalLink, AlertTriangle, FileCheck2 } from 'lucide-react'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'
import { useTreeQuery } from '../data/queries/use-tree'
import {
  buildLegalResponsiblesSummary,
  type LegalResponsibilityGroup,
  type LegalResponsibilityItem,
} from '@/lib/orgchart/legal-responsibles'

const STATUS_TONE = {
  covered: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  missing: 'border-amber-200 bg-amber-50 text-amber-800',
  expiring: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  expired: 'border-rose-200 bg-rose-50 text-rose-800',
  orphaned: 'border-slate-200 bg-slate-100 text-slate-700',
} as const

const STATUS_LABEL = {
  covered: 'Cubierto',
  missing: 'Sin designar',
  expiring: 'Vence pronto',
  expired: 'Vencido',
  orphaned: 'Sin cargo activo',
} as const

export function LegalResponsiblesModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const closeModal = useOrgStore((s) => s.closeModal)
  const openModal = useOrgStore((s) => s.openModal)
  const open = activeModal === 'legal-responsibles'

  const treeQuery = useTreeQuery(null)
  const summary = useMemo(() => {
    if (!treeQuery.data) return null
    return buildLegalResponsiblesSummary(treeQuery.data)
  }, [treeQuery.data])

  return (
    <ModalShell
      open={open}
      onClose={closeModal}
      title="Responsables legales"
      subtitle="Comités, brigadas y roles individuales designados según ley peruana"
      icon={<ShieldCheck className="h-4 w-4" />}
      width="xl"
      footer={
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      }
    >
      {!summary ? (
        <p className="py-8 text-center text-sm text-slate-500">Cargando responsables…</p>
      ) : (
        <div className="space-y-5">
          {/* Resumen total */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <SummaryStat label="Roles asignados" value={summary.totals.assignedRoles} tone="emerald" />
            <SummaryStat label="Sin designar" value={summary.totals.missingRoleTypes} tone={summary.totals.missingRoleTypes > 0 ? 'amber' : 'slate'} />
            <SummaryStat label="Vencen pronto" value={summary.totals.expiringSoon} tone={summary.totals.expiringSoon > 0 ? 'yellow' : 'slate'} />
            <SummaryStat label="Vencidos" value={summary.totals.expired} tone={summary.totals.expired > 0 ? 'rose' : 'slate'} />
            <SummaryStat label="Sin cargo activo" value={summary.totals.orphaned} tone={summary.totals.orphaned > 0 ? 'slate-warn' : 'slate'} />
          </div>

          {summary.groups.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No hay roles legales en el catálogo de compliance todavía.
            </div>
          )}

          {summary.groups.map((group) => (
            <GroupSection
              key={group.key}
              group={group}
              onDesignate={(roleType) => openModal('assign-role', { roleType })}
            />
          ))}
        </div>
      )}
    </ModalShell>
  )
}

function GroupSection({
  group,
  onDesignate,
}: {
  group: LegalResponsibilityGroup
  onDesignate: (roleType: string) => void
}) {
  return (
    <section>
      <header className="mb-2 flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{group.label}</h3>
          <p className="text-[11px] text-slate-500">{group.description}</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-700">
            {group.totals.covered} cubiertos
          </span>
          {group.totals.missing > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-bold text-amber-700">
              {group.totals.missing} faltan
            </span>
          )}
        </div>
      </header>
      <ul className="space-y-1.5">
        {group.items.map((item) => (
          <RoleRow key={item.roleType} item={item} onDesignate={() => onDesignate(item.roleType)} />
        ))}
      </ul>
    </section>
  )
}

function RoleRow({ item, onDesignate }: { item: LegalResponsibilityItem; onDesignate: () => void }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-900">{item.label}</span>
            <span
              className={`flex-shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_TONE[item.status]}`}
            >
              {STATUS_LABEL[item.status]}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{item.description}</p>
          <p className="mt-1 font-mono text-[10px] text-slate-400">{item.baseLegal}</p>

          {item.holders.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {item.holders.map((holder) => (
                <li key={holder.roleId} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="font-semibold text-slate-700">{holder.workerName}</span>
                  {holder.unitName && (
                    <span className="text-slate-500">· {holder.unitName}</span>
                  )}
                  {holder.endsAt && holder.daysToExpiry !== null && (
                    <span
                      className={`rounded px-1 py-0.5 text-[10px] font-bold ${
                        holder.isExpired
                          ? 'bg-rose-100 text-rose-700'
                          : holder.isExpiringSoon
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {holder.isExpired
                        ? `Vencida hace ${Math.abs(holder.daysToExpiry)} d`
                        : `${holder.daysToExpiry} d`}
                    </span>
                  )}
                  {!holder.hasActivePosition && (
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-medium text-slate-600">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Sin cargo activo
                    </span>
                  )}
                  {holder.actaUrl ? (
                    <a
                      href={holder.actaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 hover:underline"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      Ver acta
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-700">
                      <FileCheck2 className="h-2.5 w-2.5" />
                      Sin acta
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[11px] italic text-amber-700">No hay nadie designado para este rol.</p>
          )}
        </div>
        <button
          type="button"
          onClick={onDesignate}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
          title="Designar responsable para este rol"
        >
          <UserPlus className="h-3 w-3" />
          Designar
        </button>
      </div>
    </li>
  )
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'emerald' | 'amber' | 'yellow' | 'rose' | 'slate' | 'slate-warn'
}) {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    yellow: 'border-yellow-200 bg-yellow-50 text-yellow-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
    slate: 'border-slate-200 bg-white text-slate-700',
    'slate-warn': 'border-slate-300 bg-slate-100 text-slate-700',
  }
  return (
    <div className={`rounded-lg border px-3 py-2 ${tones[tone]}`}>
      <div className="text-[10px] font-medium uppercase tracking-wide">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums">{value}</div>
    </div>
  )
}
