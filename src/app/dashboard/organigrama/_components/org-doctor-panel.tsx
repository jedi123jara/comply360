'use client'

import { useState } from 'react'
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X, Sparkles, Plus } from 'lucide-react'
import type { DoctorReport, DoctorFinding } from '@/lib/orgchart/types'

const SEV_CONFIG = {
  CRITICAL: {
    label: 'Crítico',
    icon: AlertCircle,
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    badge: 'bg-rose-600 text-white',
  },
  HIGH: {
    label: 'Alto',
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badge: 'bg-amber-500 text-white',
  },
  MEDIUM: {
    label: 'Medio',
    icon: AlertTriangle,
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    badge: 'bg-yellow-400 text-yellow-900',
  },
  LOW: {
    label: 'Bajo',
    icon: Info,
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
    badge: 'bg-sky-500 text-white',
  },
}

export interface OrgDoctorPanelProps {
  report: DoctorReport | null
  loading: boolean
  onRun: () => void
  onCreateTasks: () => Promise<void>
  onClose?: () => void
}

export default function OrgDoctorPanel({ report, loading, onRun, onCreateTasks, onClose }: OrgDoctorPanelProps) {
  const [creating, setCreating] = useState(false)

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <div>
            <div className="text-sm font-semibold text-slate-900">AI Org Doctor</div>
            <div className="text-xs text-slate-500">Comités, vacantes, MOF y subordinación</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {!report && !loading && (
          <div className="space-y-4 py-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-slate-300" />
            <div className="text-sm text-slate-600">
              Corre el diagnóstico para detectar gaps de cumplimiento y riesgos de subordinación.
            </div>
            <button
              onClick={onRun}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Diagnosticar ahora
            </button>
          </div>
        )}

        {loading && (
          <div className="py-8 text-center text-sm text-slate-500">Analizando organigrama…</div>
        )}

        {report && (
          <>
            <ScoreCard score={report.scoreOrgHealth} totals={report.totals} />
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                onClick={onRun}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Volver a correr
              </button>
              {(report.totals.critical + report.totals.high) > 0 && (
                <button
                  disabled={creating}
                  onClick={async () => {
                    setCreating(true)
                    try {
                      await onCreateTasks()
                    } finally {
                      setCreating(false)
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                  {creating ? 'Creando…' : 'Crear tareas'}
                </button>
              )}
            </div>
            <div className="mt-5 space-y-3">
              {report.findings.length === 0 ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                  <CheckCircle2 className="mb-2 h-5 w-5" />
                  Sin hallazgos. Tu organigrama cumple con los requisitos legales evaluados.
                </div>
              ) : (
                report.findings.map((f, i) => <FindingCard key={i} finding={f} />)
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ScoreCard({
  score,
  totals,
}: {
  score: number
  totals: { critical: number; high: number; medium: number; low: number }
}) {
  const color = score >= 80 ? 'emerald' : score >= 60 ? 'amber' : 'rose'
  const COLORS = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'stroke-emerald-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'stroke-amber-500' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-700', ring: 'stroke-rose-500' },
  }
  const c = COLORS[color]

  const circumference = 2 * Math.PI * 40
  const offset = circumference * (1 - score / 100)

  return (
    <div className={`rounded-2xl ${c.bg} p-5`}>
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" className="stroke-slate-200" />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              className={c.ring}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 800ms ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-2xl font-bold ${c.text}`}>{score}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">salud</div>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-900">Salud del organigrama</div>
          <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-slate-600">Crítico</span>
              <span className="ml-auto font-semibold text-slate-900">{totals.critical}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-slate-600">Alto</span>
              <span className="ml-auto font-semibold text-slate-900">{totals.high}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              <span className="text-slate-600">Medio</span>
              <span className="ml-auto font-semibold text-slate-900">{totals.medium}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span className="text-slate-600">Bajo</span>
              <span className="ml-auto font-semibold text-slate-900">{totals.low}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FindingCard({ finding }: { finding: DoctorFinding }) {
  const cfg = SEV_CONFIG[finding.severity]
  const Icon = cfg.icon
  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3`}>
      <div className="flex items-start gap-2">
        <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${cfg.text}`} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${cfg.badge}`}>
              {cfg.label}
            </span>
            <span className="text-sm font-semibold text-slate-900">{finding.title}</span>
          </div>
          <div className="mt-1.5 text-xs leading-relaxed text-slate-600">{finding.description}</div>
          {finding.baseLegal && (
            <div className="mt-2 text-[11px] font-mono text-slate-500">📜 {finding.baseLegal}</div>
          )}
          {finding.suggestedFix && (
            <div className="mt-2 rounded-md bg-white/70 p-2 text-[11px] text-slate-700">
              💡 {finding.suggestedFix}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
