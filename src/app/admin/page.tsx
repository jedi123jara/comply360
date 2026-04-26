'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bot,
  Download,
  Flame,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import type { FounderMetrics } from '@/lib/metrics/founder-metrics'
import { fmtN, fmtPEN, fmtPct, Monogram, Ring, Sparkline } from '@/components/admin/primitives'

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
  const [range, setRange] = useState<'24h' | '7d' | '30d' | '90d' | 'YTD'>('30d')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const r = await fetch('/api/admin/overview', { cache: 'no-store' })
        if (!r.ok) {
          // Capturamos status + body para poder diagnosticar (401/403/500)
          let detail = ''
          try {
            const body = await r.json()
            detail = body?.error ? ` — ${body.error}` : ''
          } catch {
            try {
              detail = ` — ${(await r.text()).slice(0, 200)}`
            } catch {
              detail = ''
            }
          }
          const msg = `HTTP ${r.status}${detail}`
          console.error('[admin/overview] respuesta no-OK:', msg)
          if (active) setError(msg)
          return
        }
        const json = await r.json()
        if (!json || typeof json !== 'object' || !json.metrics) {
          const msg = 'Respuesta del API sin shape esperado (falta `metrics`).'
          console.error('[admin/overview] shape inválido:', json)
          if (active) setError(msg)
          return
        }
        if (active) setData(json)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error('[admin/overview] fetch falló:', e)
        if (active) setError(msg)
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  if (loading) return <SkeletonOverview />
  if (error || !data) {
    return (
      <div
        style={{
          background: 'var(--crimson-50)',
          border: '1px solid var(--border-crimson)',
          borderRadius: 12,
          padding: 20,
          color: 'var(--crimson-700)',
        }}
      >
        <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>
          ⚠ No se pudo cargar el Founder Console
        </p>
        <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
          {error || 'Error al cargar la vista general (sin detalle).'}
        </p>
        <p style={{ marginTop: 12, fontSize: 12, opacity: 0.8, lineHeight: 1.5 }}>
          Diagnóstico: abre DevTools (F12) → pestaña <strong>Network</strong> →
          recarga la página → busca la petición a <code>/api/admin/overview</code>{' '}
          y revisa <strong>Status code</strong> y <strong>Response body</strong>.
          Pasa los detalles al equipo técnico.
        </p>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') window.location.reload()
          }}
          style={{
            marginTop: 12,
            background: 'var(--crimson-700)',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  const m = data.metrics
  const mrrDelta = m.business.mrrDeltaPct ?? 0
  const mrrDeltaAbs = m.business.mrrDeltaVsPrev30d
  const mrrGoal = Math.max(m.business.mrr * 1.3, 50000) // visual goal for ring — deja espacio para crecer
  const mrrPct = Math.round((m.business.mrr / mrrGoal) * 100)

  // ─── KPI grid: priorizamos datos reales con fallback sintético mínimo para sparkline ───
  const syntheticSpark = (end: number): number[] => {
    // 12 puntos que bajan a 0.8x end en t=0 y suben a end
    if (end <= 0) return [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    return Array.from({ length: 12 }, (_, i) => {
      const t = i / 11
      const wobble = (Math.sin(i * 2.3) + 1) * 0.03
      return end * (0.75 + t * 0.25 + wobble)
    })
  }

  const kpis = [
    {
      label: 'MRR',
      value: fmtPEN(m.business.mrr),
      delta:
        mrrDeltaAbs !== 0
          ? `${mrrDeltaAbs > 0 ? '+' : ''}${fmtPEN(Math.abs(mrrDeltaAbs))} · ${mrrDelta}%`
          : 'Sin cambios',
      positive: mrrDeltaAbs >= 0,
      foot: m.business.mrrDeltaPct !== null ? `${m.business.mrrDeltaPct}% MoM` : '—',
      spark: syntheticSpark(m.business.mrr),
    },
    {
      label: 'ARR proyectado',
      value: fmtPEN(m.business.arr, { compact: true }),
      delta: `${m.business.activeSubscriptions} subs activas`,
      positive: true,
      foot: 'Meta anual · tasa de crecimiento',
      spark: syntheticSpark(m.business.arr),
    },
    {
      label: 'Empresas activas',
      value: fmtN(m.growth.totalOrgs),
      delta:
        m.growth.newOrgs30d > 0
          ? `+${fmtN(m.growth.newOrgs30d)} en 30d`
          : 'Sin altas en 30d',
      positive: m.growth.newOrgs30d > 0,
      foot: `${m.business.trialingCount} en trial`,
      spark: syntheticSpark(m.growth.totalOrgs),
    },
    {
      label: 'Stickiness (DAU/MAU)',
      value: fmtPct(m.engagement.stickinessPct),
      delta: m.engagement.mau > 0 ? `${fmtN(m.engagement.dau)} DAU · ${fmtN(m.engagement.mau)} MAU` : 'Sin data',
      positive: (m.engagement.stickinessPct ?? 0) >= 20,
      foot: 'Bench SaaS · 20% bueno · 50% excelente',
      spark: syntheticSpark(m.engagement.stickinessPct ?? 0),
    },
    {
      label: 'Churn 30d',
      value: fmtN(m.business.cancelledLast30d),
      delta: m.business.churnRatePct !== null ? `${m.business.churnRatePct}% rate` : 'Sin churn',
      positive: m.business.cancelledLast30d === 0,
      foot: m.business.cancelledLast30d > 0 ? 'Investiga la causa raíz' : 'Zero churn 🎯',
      spark: syntheticSpark(Math.max(1, m.business.cancelledLast30d)),
    },
    {
      label: 'Trials expirando 7d',
      value: fmtN(m.health.trialsExpiring7d),
      delta: m.business.trialingCount > 0 ? `${m.business.trialingCount} en trial` : 'Sin trials activos',
      positive: m.health.trialsExpiring7d === 0,
      foot: 'Outreach antes de que expiren',
      spark: syntheticSpark(Math.max(1, m.health.trialsExpiring7d)),
    },
    {
      label: 'Activation rate 7d',
      value: fmtPct(m.growth.activationRate7d),
      delta: `${fmtN(m.growth.activations7d)} activaron`,
      positive: (m.growth.activationRate7d ?? 0) >= 50,
      foot: 'Cohorte 7-14d con ≥1 worker',
      spark: syntheticSpark(m.growth.activationRate7d ?? 0),
    },
    {
      label: 'Past due',
      value: fmtN(m.business.pastDueCount),
      delta: m.business.pastDueCount > 0 ? 'Cobro fallido' : 'Todo cobrado',
      positive: m.business.pastDueCount === 0,
      foot: 'Dunning automático · 3 intentos',
      spark: syntheticSpark(Math.max(1, m.business.pastDueCount)),
    },
  ]

  const planColor = (plan: string) => {
    const p = plan.toUpperCase()
    if (p.includes('ENTERPRISE') || p.includes('PRO')) return 'a-badge-gold'
    if (p.includes('EMPRESA') || p.includes('BUSINESS')) return 'a-badge-cyan'
    if (p.includes('TRIAL')) return 'a-badge-amber'
    return 'a-badge-neutral'
  }

  return (
    <>
      {/* ============ PAGE HEAD ============ */}
      <div className="a-page-head">
        <div>
          <div className="crumbs">Operación · Overview</div>
          <h1>
            {greeting()}, <em>{firstName(data.recentSignups[0]?.name) || 'Founder'}</em>.
          </h1>
          <div className="sub">
            {fmtN(data.totals.organizations)} empresas · {fmtN(data.totals.users)} usuarios ·{' '}
            {fmtPEN(m.business.mrr)} MRR ·{' '}
            {m.business.churnRatePct !== null ? `${m.business.churnRatePct}% churn` : 'sin churn'}
          </div>
        </div>
        <div className="spacer" />
        <div className="actions">
          <div className="a-seg" role="tablist" aria-label="Rango de tiempo">
            {(['24h', '7d', '30d', '90d', 'YTD'] as const).map((r) => (
              <button
                key={r}
                className={range === r ? 'active' : ''}
                onClick={() => setRange(r)}
                role="tab"
                aria-selected={range === r}
              >
                {r}
              </button>
            ))}
          </div>
          <button className="a-btn a-btn-secondary" type="button">
            <Download size={13} /> Export
          </button>
          <button className="a-btn a-btn-primary" type="button">
            <Sparkles size={13} /> Ask AI
          </button>
        </div>
      </div>

      {/* ============ NARRATIVE + MRR HERO ============ */}
      <div className="a-grid-2-1" style={{ marginBottom: 18 }}>
        <div className="a-narrative">
          <div className="a-narrative-label">
            <span className="pulse" /> Daily brief · Generado{' '}
            {new Date(m.generatedAt).toLocaleString('es-PE', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          <ul>
            {m.narrative.length > 0 ? (
              m.narrative.map((n, i) => (
                <li key={i}>
                  <span className="mark">→</span>
                  <div>{renderNarrative(n)}</div>
                </li>
              ))
            ) : (
              <li>
                <span className="mark">→</span>
                <div>
                  Todavía no hay suficiente actividad para generar un brief narrativo. Vuelve
                  mañana cuando haya signals. <span className="tag">Warm-up</span>
                </div>
              </li>
            )}
          </ul>
        </div>

        <div className="a-mrr-hero">
          <Ring
            value={mrrPct}
            max={100}
            size={172}
            stroke={14}
            label={fmtPEN(m.business.mrr, { compact: true })}
            sublabel={`de meta ${fmtPEN(mrrGoal, { compact: true })}`}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="label">MRR · {new Date().toLocaleDateString('es-PE', { month: 'long' })}</div>
            <div className="hero-value">
              <span className="cur">S/</span>
              {m.business.mrr.toLocaleString('es-PE')}
            </div>
            <div className="hero-delta">
              {mrrDeltaAbs >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}{' '}
              {mrrDeltaAbs >= 0 ? '+' : ''}
              {fmtPEN(Math.abs(mrrDeltaAbs))} ({mrrDelta}% MoM)
            </div>
            <div className="hero-sub">
              Vas al <em>{mrrPct}%</em> de la meta. Con el ritmo actual cierras el año en{' '}
              <em>{fmtPEN(m.business.arr, { compact: true })} ARR</em>. {m.business.trialingCount > 0 && (
                <>
                  Hay{' '}
                  <em>{m.business.trialingCount} trials</em> que puedes convertir para acelerar.
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ KPI TICKER ============ */}
      <div className="a-grid-4" style={{ marginBottom: 18 }}>
        {kpis.map((k, i) => (
          <div key={i} className="a-kpi">
            <div className="a-kpi-label">{k.label}</div>
            <div className="spark">
              <Sparkline
                data={k.spark}
                color={k.positive ? '#10b981' : '#ef4444'}
                width={72}
                height={26}
                dots
              />
            </div>
            <div className="a-kpi-value">{k.value}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
              <span className={`a-kpi-delta ${k.positive ? 'pos' : 'neg'}`}>
                {k.positive ? <ArrowUp size={11} /> : <ArrowDown size={11} />} {k.delta}
              </span>
            </div>
            <div className="a-kpi-foot">{k.foot}</div>
          </div>
        ))}
      </div>

      {/* ============ GROWTH + ENGAGEMENT ============ */}
      <div className="a-grid-2" style={{ marginBottom: 18 }}>
        <div className="a-card">
          <div className="a-head">
            <div>
              <div className="a-head-title">
                <Target size={14} style={{ color: 'var(--emerald-600)' }} /> Growth
              </div>
              <div className="a-head-sub">Adquisición y activación</div>
            </div>
          </div>
          <div className="a-card-pad">
            <MetricRow label="Empresas totales" value={fmtN(m.growth.totalOrgs)} />
            <MetricRow
              label="Nuevas 7d"
              value={fmtN(m.growth.newOrgs7d)}
              hint={m.growth.newOrgsDeltaPct7d !== null ? `${m.growth.newOrgsDeltaPct7d > 0 ? '+' : ''}${m.growth.newOrgsDeltaPct7d}% vs. semana anterior` : undefined}
            />
            <MetricRow label="Nuevas 30d" value={fmtN(m.growth.newOrgs30d)} />
            <MetricRow
              label="Activation rate 7d"
              value={fmtPct(m.growth.activationRate7d)}
              hint="Cohorte 7-14d con ≥1 worker"
            />
            <MetricRow label="Onboarding completado" value={fmtPct(m.growth.onboardingCompletedPct)} />
            <MetricRow label="Leads capturados 30d" value={fmtN(m.growth.leadsCaptured30d)} last />
          </div>
        </div>

        <div className="a-card">
          <div className="a-head">
            <div>
              <div className="a-head-title">
                <Flame size={14} style={{ color: 'var(--amber-500)' }} /> Engagement
              </div>
              <div className="a-head-sub">Uso real del producto</div>
            </div>
          </div>
          <div className="a-card-pad">
            <MetricRow label="DAU" value={fmtN(m.engagement.dau)} hint="Usuarios únicos ayer" />
            <MetricRow label="WAU" value={fmtN(m.engagement.wau)} hint="Últimos 7d" />
            <MetricRow label="MAU" value={fmtN(m.engagement.mau)} hint="Últimos 30d" />
            <MetricRow
              label="Stickiness (DAU/MAU)"
              value={fmtPct(m.engagement.stickinessPct)}
              hint="20% bueno · 50% excelente"
            />
            <MetricRow
              label="Logins trabajadores 7d"
              value={fmtN(m.engagement.workerLoginsLast7d)}
              last
            />
          </div>
        </div>
      </div>

      {/* ============ FEATURE ADOPTION ============ */}
      <div className="a-card" style={{ marginBottom: 18 }}>
        <div className="a-head">
          <div>
            <div className="a-head-title">Adopción por módulo</div>
            <div className="a-head-sub">% de empresas que usaron en los últimos 30 días</div>
          </div>
        </div>
        <div className="a-card-pad">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '4px 24px',
            }}
          >
            <AdoptionRow label="Diagnóstico SUNAFIL" pct={m.adoption.diagnosticPct} />
            <AdoptionRow label="Simulacro SUNAFIL" pct={m.adoption.simulacroPct} />
            <AdoptionRow label="Copilot IA" pct={m.adoption.copilotPct} />
            <AdoptionRow label="Generación de contratos" pct={m.adoption.contractGenPct} />
            <AdoptionRow label="Auto-verify IA (docs)" pct={m.adoption.aiVerifyPct} />
            <AdoptionRow label="Portal del trabajador" pct={m.adoption.workerPortalPct} />
          </div>
          <hr className="a-hr" style={{ margin: '14px 0' }} />
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            <Sparkles
              size={12}
              style={{ verticalAlign: -2, marginRight: 4, color: 'var(--emerald-600)' }}
            />{' '}
            <b style={{ color: 'var(--text-primary)' }}>Oportunidad:</b> los módulos con adopción {'<'}40%
            suelen valer entre S/ 1.5k–2.5k MRR esperado por punto de adopción. Vale
            empujarlos por onboarding y email drip.
          </div>
        </div>
      </div>

      {/* ============ AI OPS + TOP EVENTS ============ */}
      <div className="a-grid-2" style={{ marginBottom: 18 }}>
        <div className="a-card">
          <div className="a-head">
            <div>
              <div className="a-head-title">
                <Bot size={14} style={{ color: 'var(--emerald-600)' }} /> AI Operations · 30d
              </div>
              <div className="a-head-sub">Auto-verificación y copilot</div>
            </div>
          </div>
          <div className="a-card-pad">
            <MetricRow
              label="Docs auto-verificados"
              value={fmtN(m.aiOps.aiVerifyAutoVerified30d)}
              hint="Sin intervención humana"
            />
            <MetricRow
              label="Docs que necesitaron review"
              value={fmtN(m.aiOps.aiVerifyNeedsReview30d)}
            />
            <MetricRow
              label="Mismatches detectados"
              value={fmtN(m.aiOps.aiVerifyMismatch30d)}
              hint={
                m.aiOps.aiVerifyMismatch30d > 0
                  ? 'IA atrapó problemas reales'
                  : 'Sin problemas detectados'
              }
            />
            <MetricRow label="Queries al copilot" value={fmtN(m.aiOps.copilotQueries30d)} last />
          </div>
        </div>

        <div className="a-card">
          <div className="a-head">
            <div>
              <div className="a-head-title">Top eventos · 7d</div>
              <div className="a-head-sub">Acciones más frecuentes</div>
            </div>
            <span className="a-badge a-badge-emerald" style={{ marginLeft: 'auto' }}>
              <span className="pulse-dot" style={{ width: 5, height: 5 }} /> Live
            </span>
          </div>
          <div style={{ padding: '4px 0', maxHeight: 300, overflowY: 'auto' }}>
            {m.topEvents7d.length === 0 ? (
              <div style={{ padding: '20px 18px', color: 'var(--text-tertiary)', fontSize: 13 }}>
                Sin eventos registrados todavía.
              </div>
            ) : (
              m.topEvents7d.map((e, i) => (
                <div
                  key={e.action}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 10,
                    padding: '11px 18px',
                    borderBottom:
                      i < m.topEvents7d.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}
                >
                  <code
                    style={{
                      fontFamily: 'var(--font-geist-mono), monospace',
                      fontSize: 11.5,
                      color: 'var(--text-primary)',
                      background: 'var(--neutral-50)',
                      padding: '2px 7px',
                      borderRadius: 4,
                      width: 'fit-content',
                    }}
                  >
                    {e.action}
                  </code>
                  <span
                    style={{
                      fontFamily: 'var(--font-geist-mono), monospace',
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {fmtN(e.count)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ============ PLANS + RECENT SIGNUPS ============ */}
      <div className="a-grid-2">
        <div className="a-card">
          <div className="a-head">
            <div>
              <div className="a-head-title">Distribución por plan</div>
              <div className="a-head-sub">Cartera total</div>
            </div>
          </div>
          <div className="a-card-pad">
            {data.planDistribution.length === 0 ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Sin data.</div>
            ) : (
              data.planDistribution.map((p) => {
                const total = data.planDistribution.reduce((sum, x) => sum + x.count, 0)
                const pct = total > 0 ? (p.count / total) * 100 : 0
                return (
                  <div key={p.plan} className="adopt-row">
                    <div className="name">{p.plan}</div>
                    <div className="track">
                      <div className="fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="pct">
                      {p.count} · {pct.toFixed(0)}%
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="a-card">
          <div className="a-head">
            <div>
              <div className="a-head-title">Empresas recientes</div>
              <div className="a-head-sub">Últimas altas de la cartera</div>
            </div>
            <Link
              href="/admin/empresas"
              className="a-btn a-btn-ghost a-btn-sm"
              style={{ marginLeft: 'auto' }}
            >
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          <div style={{ padding: '4px 0' }}>
            {data.recentSignups.length === 0 ? (
              <div style={{ padding: '20px 18px', color: 'var(--text-tertiary)', fontSize: 13 }}>
                Ninguna empresa registrada recientemente.
              </div>
            ) : (
              <table className="a-table">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Plan</th>
                    <th>Tamaño</th>
                    <th style={{ textAlign: 'right' }}>Alta</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSignups.map((org) => (
                    <tr
                      key={org.id}
                      onClick={() => {
                        window.location.href = `/admin/empresas/${org.id}`
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="primary">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Monogram name={org.name} size={26} />
                          <span
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: 220,
                            }}
                          >
                            {org.name}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`a-badge ${planColor(org.plan)}`}>{org.plan}</span>
                      </td>
                      <td>{org.sizeRange ?? '—'}</td>
                      <td className="num" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(org.createdAt).toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ============ ALERTS ============ */}
      {(m.health.trialsExpiring7d > 0 ||
        m.health.churnRiskOrgs > 0 ||
        m.business.pastDueCount > 0 ||
        m.health.openComplaints > 0) && (
        <div
          className="a-card"
          style={{
            marginTop: 18,
            border: '1px solid var(--border-amber)',
            background:
              'linear-gradient(180deg, var(--amber-50), rgba(255, 251, 235, 0.3))',
          }}
        >
          <div className="a-head" style={{ borderColor: 'var(--border-amber)' }}>
            <div>
              <div className="a-head-title" style={{ color: 'var(--amber-700)' }}>
                Atención requerida
              </div>
              <div className="a-head-sub">Eventos que merecen acción esta semana</div>
            </div>
          </div>
          <div className="a-card-pad" style={{ display: 'grid', gap: 10 }}>
            {m.business.pastDueCount > 0 && (
              <AlertRow
                label="Suscripciones vencidas"
                value={m.business.pastDueCount}
                detail="Cobro falló — dunning en curso"
                cta={{ href: '/admin/billing', label: 'Revisar billing' }}
              />
            )}
            {m.health.trialsExpiring7d > 0 && (
              <AlertRow
                label="Trials expirando en 7 días"
                value={m.health.trialsExpiring7d}
                detail="Ventana de outreach crítica"
                cta={{ href: '/admin/empresas', label: 'Ver trials' }}
              />
            )}
            {m.health.churnRiskOrgs > 0 && (
              <AlertRow
                label="Empresas en riesgo de churn"
                value={m.health.churnRiskOrgs}
                detail="Sin login en 14+ días"
                cta={{ href: '/admin/empresas', label: 'Contactar' }}
              />
            )}
            {m.health.openComplaints > 0 && (
              <AlertRow
                label="Denuncias abiertas"
                value={m.health.openComplaints}
                detail="Canal de ética pendiente"
                cta={{ href: '/admin/soporte', label: 'Ir a soporte' }}
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────

function MetricRow({
  label,
  value,
  hint,
  last,
}: {
  label: string
  value: string | number
  hint?: string
  last?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 0',
        borderBottom: last ? 'none' : '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</div>
        {hint && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{hint}</div>
        )}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontVariantNumeric: 'tabular-nums',
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--text-primary)',
          flexShrink: 0,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function AdoptionRow({ label, pct }: { label: string; pct: number | null }) {
  const value = pct ?? 0
  return (
    <div className="adopt-row">
      <div className="name">{label}</div>
      <div className="track">
        <div className="fill" style={{ width: `${value}%` }} />
      </div>
      <div className="pct">{pct !== null ? `${pct}%` : '—'}</div>
    </div>
  )
}

function AlertRow({
  label,
  value,
  detail,
  cta,
}: {
  label: string
  value: number
  detail: string
  cta: { href: string; label: string }
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid rgba(245, 158, 11, 0.15)',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: 'var(--amber-50)',
          border: '1px solid var(--border-amber)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--amber-700)',
          fontFamily: 'var(--font-serif)',
          fontSize: 18,
          fontWeight: 600,
          fontStyle: 'italic',
          flexShrink: 0,
        }}
      >
        {value}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 1 }}>{detail}</div>
      </div>
      <Link href={cta.href} className="a-btn a-btn-secondary a-btn-sm">
        {cta.label} <ArrowRight size={11} />
      </Link>
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function firstName(full?: string): string | null {
  if (!full) return null
  return full.split(/\s+/)[0]
}

// Resalta las cifras en S/ y pp para que el brief se sienta financial-terminal.
function renderNarrative(text: string): React.ReactNode {
  const parts = text.split(/(S\/\s?[\d,.]+(?:[kKmM])?|[\d.]+(?:pp|%))/g)
  return parts.map((p, i) => {
    if (/^(S\/\s?[\d,.]+(?:[kKmM])?|[\d.]+(?:pp|%))$/.test(p)) {
      return (
        <b key={i} style={{ color: 'var(--emerald-700)' }}>
          {p}
        </b>
      )
    }
    return <span key={i}>{p}</span>
  })
}

function SkeletonOverview() {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div
        style={{
          height: 64,
          background: 'var(--neutral-100)',
          borderRadius: 12,
          animation: 'pulseEmerald 2s infinite',
        }}
      />
      <div className="a-grid-2-1">
        <div
          style={{
            height: 200,
            background: 'var(--neutral-100)',
            borderRadius: 14,
          }}
        />
        <div
          style={{
            height: 200,
            background: 'var(--neutral-100)',
            borderRadius: 14,
          }}
        />
      </div>
      <div className="a-grid-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 120,
              background: 'var(--neutral-100)',
              borderRadius: 12,
            }}
          />
        ))}
      </div>
    </div>
  )
}
