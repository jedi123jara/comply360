'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building2, Users, CreditCard, AlertTriangle, TrendingUp, TrendingDown, Activity,
  Crown, ChevronRight, Sparkles, Zap, FileSearch, Bot, Target, Flame,
} from 'lucide-react'
import type { FounderMetrics } from '@/lib/metrics/founder-metrics'

interface AdminOverview {
  totals: {
    organizations: number
    users: number
    workers: number
    activeSubscriptions: number
  }
  mrr: number
  growth: {
    organizationsLast30: number
    usersLast30: number
  }
  planDistribution: Array<{ plan: string; count: number }>
  recentSignups: Array<{
    id: string
    name: string
    plan: string
    createdAt: string
    sizeRange: string | null
  }>
  alerts: {
    pastDueSubscriptions: number
    inactiveOrgs30d: number
    failedPayments: number
  }
  metrics: FounderMetrics
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/overview', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('No autorizado')
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <SkeletonGrid />
  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800">
        <p className="font-semibold">{error || 'Error al cargar la vista general'}</p>
      </div>
    )
  }

  const m = data.metrics

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Crown className="w-6 h-6 text-amber-500" />
          Vista general de la plataforma
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {new Date(m.generatedAt).toLocaleString('es-PE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {/* Narrativa hero — el TL;DR del día */}
      {m.narrative.length > 0 && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 border border-emerald-900/40 rounded-xl p-5 shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-emerald-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            Today at a glance
          </p>
          <ul className="space-y-2">
            {m.narrative.map((n, i) => (
              <li key={i} className="text-sm text-slate-100 leading-relaxed flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">▸</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KPIs principales — Business */}
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
          💰 Business
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            icon={CreditCard}
            color="emerald"
            label="MRR actual"
            value={`S/ ${m.business.mrr.toLocaleString('es-PE')}`}
            delta={
              m.business.mrrDeltaVsPrev30d !== 0
                ? `${m.business.mrrDeltaVsPrev30d > 0 ? '+' : ''}S/ ${m.business.mrrDeltaVsPrev30d.toLocaleString('es-PE')} · ${m.business.mrrDeltaPct ?? '—'}%`
                : undefined
            }
            deltaTrend={m.business.mrrDeltaVsPrev30d >= 0 ? 'up' : 'down'}
          />
          <KpiCard
            icon={TrendingUp}
            color="blue"
            label="ARR proyectado"
            value={`S/ ${m.business.arr.toLocaleString('es-PE')}`}
            subtitle={`${m.business.activeSubscriptions} subs activas`}
          />
          <KpiCard
            icon={Zap}
            color="purple"
            label="En trial"
            value={m.business.trialingCount}
            subtitle={`${m.health.trialsExpiring7d} expiran en 7d`}
          />
          <KpiCard
            icon={TrendingDown}
            color={m.business.cancelledLast30d > 0 ? 'red' : 'slate'}
            label="Churn 30d"
            value={m.business.cancelledLast30d}
            subtitle={m.business.churnRatePct !== null ? `${m.business.churnRatePct}% churn rate` : 'sin churn'}
          />
        </div>
      </section>

      {/* Growth + Engagement */}
      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
            <Target className="w-3 h-3" />
            📈 Growth
          </h3>
          <dl className="space-y-3">
            <MetricRow label="Empresas totales" value={m.growth.totalOrgs.toString()} />
            <MetricRow
              label="Nuevas últimos 7d"
              value={m.growth.newOrgs7d.toString()}
              hint={m.growth.newOrgsDeltaPct7d !== null ? `${m.growth.newOrgsDeltaPct7d > 0 ? '+' : ''}${m.growth.newOrgsDeltaPct7d}% vs semana anterior` : undefined}
            />
            <MetricRow
              label="Nuevas últimos 30d"
              value={m.growth.newOrgs30d.toString()}
            />
            <MetricRow
              label="Activation rate 7d"
              value={m.growth.activationRate7d !== null ? `${m.growth.activationRate7d}%` : '—'}
              hint={`${m.growth.activations7d}/${m.growth.totalOrgs > 0 ? m.growth.activations7d : 0} cohorte 7-14d activó ≥1 worker`}
            />
            <MetricRow
              label="Onboarding completado"
              value={m.growth.onboardingCompletedPct !== null ? `${m.growth.onboardingCompletedPct}%` : '—'}
            />
            <MetricRow label="Leads capturados 30d" value={m.growth.leadsCaptured30d.toString()} />
          </dl>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
            <Flame className="w-3 h-3" />
            🔥 Engagement
          </h3>
          <dl className="space-y-3">
            <MetricRow label="DAU" value={m.engagement.dau.toString()} hint="usuarios únicos ayer" />
            <MetricRow label="WAU" value={m.engagement.wau.toString()} hint="últimos 7d" />
            <MetricRow label="MAU" value={m.engagement.mau.toString()} hint="últimos 30d" />
            <MetricRow
              label="Stickiness (DAU/MAU)"
              value={m.engagement.stickinessPct !== null ? `${m.engagement.stickinessPct}%` : '—'}
              hint="benchmark SaaS: 20% bueno · 50% excelente"
            />
            <MetricRow
              label="Logins de trabajadores 7d"
              value={m.engagement.workerLoginsLast7d.toString()}
            />
          </dl>
        </section>
      </div>

      {/* Feature adoption */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4">
          ⚡ Feature adoption (% de orgs que usaron en 30d)
        </h3>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
          <AdoptionBar label="Diagnóstico SUNAFIL" pct={m.adoption.diagnosticPct} />
          <AdoptionBar label="Simulacro SUNAFIL" pct={m.adoption.simulacroPct} />
          <AdoptionBar label="AI Copilot" pct={m.adoption.copilotPct} />
          <AdoptionBar label="Generación de contratos" pct={m.adoption.contractGenPct} />
          <AdoptionBar label="Auto-verify IA (docs)" pct={m.adoption.aiVerifyPct} />
          <AdoptionBar label="Portal del trabajador" pct={m.adoption.workerPortalPct} />
        </div>
      </section>

      {/* AI Operations + Top Events */}
      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
            <Bot className="w-3 h-3" />
            🤖 AI Operations (30d)
          </h3>
          <dl className="space-y-3">
            <MetricRow
              label="Docs auto-verificados"
              value={m.aiOps.aiVerifyAutoVerified30d.toString()}
              hint="sin intervención humana"
            />
            <MetricRow
              label="Docs que necesitaron review"
              value={m.aiOps.aiVerifyNeedsReview30d.toString()}
            />
            <MetricRow
              label="Mismatches detectados"
              value={m.aiOps.aiVerifyMismatch30d.toString()}
              hint={m.aiOps.aiVerifyMismatch30d > 0 ? 'IA atrapó problemas' : 'sin problemas'}
            />
            <MetricRow
              label="Queries al copilot"
              value={m.aiOps.copilotQueries30d.toString()}
            />
          </dl>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
            <FileSearch className="w-3 h-3" />
            📊 Top eventos 7d
          </h3>
          {m.topEvents7d.length === 0 ? (
            <p className="text-sm text-slate-400">Sin eventos registrados todavía.</p>
          ) : (
            <ul className="space-y-2">
              {m.topEvents7d.map((e) => (
                <li key={e.action} className="flex items-center justify-between text-sm">
                  <code className="text-xs font-mono text-slate-700">{e.action}</code>
                  <span className="font-semibold text-slate-900 tabular-nums">{e.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Alertas + Health */}
      {(m.health.trialsExpiring7d > 0 ||
        m.health.churnRiskOrgs > 0 ||
        m.business.pastDueCount > 0 ||
        m.health.openComplaints > 0) && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Atención requerida
          </h3>
          <ul className="grid md:grid-cols-2 gap-2 text-sm text-amber-800">
            {m.business.pastDueCount > 0 && (
              <li className="flex items-start gap-2">
                <span>💳</span>
                <span>
                  <strong>{m.business.pastDueCount}</strong> suscripciones vencidas
                </span>
              </li>
            )}
            {m.health.trialsExpiring7d > 0 && (
              <li className="flex items-start gap-2">
                <span>⏰</span>
                <span>
                  <strong>{m.health.trialsExpiring7d}</strong> trials expiran en 7 días — outreach
                </span>
              </li>
            )}
            {m.health.churnRiskOrgs > 0 && (
              <li className="flex items-start gap-2">
                <span>🔥</span>
                <span>
                  <strong>{m.health.churnRiskOrgs}</strong> empresas sin login en 14+ días
                </span>
              </li>
            )}
            {m.health.openComplaints > 0 && (
              <li className="flex items-start gap-2">
                <span>📣</span>
                <span>
                  <strong>{m.health.openComplaints}</strong> denuncias abiertas
                </span>
              </li>
            )}
          </ul>
        </section>
      )}

      {/* Distribucion por plan + recientes */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Distribución por plan
          </h3>
          <div className="space-y-3">
            {data.planDistribution.map((p) => {
              const total = data.planDistribution.reduce((sum, x) => sum + x.count, 0)
              const pct = total > 0 ? (p.count / total) * 100 : 0
              return (
                <div key={p.plan}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{p.plan}</span>
                    <span className="text-slate-500">{p.count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Empresas recientes</h3>
            <Link href="/admin/empresas" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              Ver todas <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {data.recentSignups.length === 0 ? (
            <p className="text-sm text-slate-500">Ninguna empresa registrada recientemente.</p>
          ) : (
            <ul className="space-y-2">
              {data.recentSignups.map((org) => (
                <li key={org.id}>
                  <Link
                    href={`/admin/empresas/${org.id}`}
                    className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{org.name}</p>
                      <p className="text-xs text-slate-500">
                        {org.sizeRange || '—'} • {new Date(org.createdAt).toLocaleDateString('es-PE')}
                      </p>
                    </div>
                    <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {org.plan}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Totales raw */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Building2} color="blue" label="Empresas totales" value={data.totals.organizations} />
        <KpiCard icon={Users} color="green" label="Usuarios totales" value={data.totals.users} />
        <KpiCard icon={Activity} color="purple" label="Trabajadores gestionados" value={data.totals.workers} />
        <KpiCard icon={CreditCard} color="amber" label="Suscripciones activas" value={data.totals.activeSubscriptions} />
      </section>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Building blocks
// ────────────────────────────────────────────────────────────────────────────

const KPI_COLORS = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-green-50 text-green-700',
  purple: 'bg-purple-50 text-purple-700',
  amber: 'bg-amber-50 text-amber-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-700',
  slate: 'bg-slate-50 text-slate-700',
} as const

function KpiCard({
  icon: Icon, color, label, value, delta, deltaTrend, subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>
  color: keyof typeof KPI_COLORS
  label: string
  value: string | number
  delta?: string
  deltaTrend?: 'up' | 'down'
  subtitle?: string
}) {
  const deltaColor = deltaTrend === 'down' ? 'text-red-600' : 'text-emerald-600'
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className={`w-10 h-10 rounded-lg ${KPI_COLORS[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      {delta && <p className={`text-xs font-medium mt-1 ${deltaColor}`}>{delta}</p>}
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  )
}

function MetricRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-700">{label}</p>
        {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <p className="text-base font-semibold text-slate-900 tabular-nums shrink-0">{value}</p>
    </div>
  )
}

function AdoptionBar({ label, pct }: { label: string; pct: number | null }) {
  const value = pct ?? 0
  const color =
    value >= 50 ? 'bg-emerald-500' : value >= 20 ? 'bg-blue-500' : value > 0 ? 'bg-amber-500' : 'bg-slate-300'
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500 tabular-nums">{pct !== null ? `${pct}%` : '—'}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="space-y-4">
      <div className="h-12 bg-slate-200 rounded-lg animate-pulse w-1/3" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-200 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}
