'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUp,
  Briefcase,
  Building2,
  Download,
  Filter,
  Plus,
  Search,
  Users,
} from 'lucide-react'
import { fmtN, Monogram } from '@/components/admin/primitives'

interface OrgItem {
  id: string
  name: string
  ruc: string | null
  sector: string | null
  sizeRange: string | null
  plan: string
  onboardingCompleted: boolean
  createdAt: string
  _count: { users: number; workers: number }
}

const PLANS = ['ALL', 'FREE', 'STARTER', 'EMPRESA', 'PRO', 'ENTERPRISE'] as const
type PlanFilter = (typeof PLANS)[number]

function planBadgeClass(plan: string): string {
  const p = plan.toUpperCase()
  if (p === 'ENTERPRISE' || p === 'PRO') return 'a-badge-gold'
  if (p === 'EMPRESA') return 'a-badge-cyan'
  if (p === 'STARTER') return 'a-badge-emerald'
  return 'a-badge-neutral'
}

export default function EmpresasPage() {
  const router = useRouter()
  const [orgs, setOrgs] = useState<OrgItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<PlanFilter>('ALL')
  const [sizeFilter, setSizeFilter] = useState<string>('ALL')

  useEffect(() => {
    fetch('/api/admin/empresas')
      .then((r) => r.json())
      .then((d) => setOrgs(d.organizations || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return orgs.filter((o) => {
      if (planFilter !== 'ALL' && o.plan !== planFilter) return false
      if (sizeFilter !== 'ALL' && (o.sizeRange ?? '—') !== sizeFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          o.name.toLowerCase().includes(q) ||
          (o.ruc?.includes(q) ?? false) ||
          (o.sector?.toLowerCase().includes(q) ?? false)
        )
      }
      return true
    })
  }, [orgs, planFilter, sizeFilter, search])

  const stats = useMemo(() => {
    const planCounts: Record<string, number> = {}
    for (const o of orgs) planCounts[o.plan] = (planCounts[o.plan] ?? 0) + 1
    return {
      total: orgs.length,
      onboarded: orgs.filter((o) => o.onboardingCompleted).length,
      trial: planCounts.FREE ?? 0,
      paid: orgs.length - (planCounts.FREE ?? 0),
      workers: orgs.reduce((s, o) => s + o._count.workers, 0),
    }
  }, [orgs])

  const sizes = useMemo(() => {
    const set = new Set<string>()
    for (const o of orgs) set.add(o.sizeRange ?? '—')
    return Array.from(set).sort()
  }, [orgs])

  return (
    <>
      <div className="a-page-head">
        <div>
          <div className="crumbs">Operación · Empresas</div>
          <h1>
            Portfolio de <em>{fmtN(stats.total)} cuentas</em>
          </h1>
          <div className="sub">
            {fmtN(stats.onboarded)} con onboarding completo · {fmtN(stats.paid)} pagas ·{' '}
            {fmtN(stats.workers)} trabajadores gestionados
          </div>
        </div>
        <div className="spacer" />
        <div className="actions">
          <button className="a-btn a-btn-secondary" type="button">
            <Filter size={13} /> Filtros
          </button>
          <button className="a-btn a-btn-secondary" type="button">
            <Download size={13} /> Export
          </button>
          <button className="a-btn a-btn-primary" type="button">
            <Plus size={13} /> Nueva empresa
          </button>
        </div>
      </div>

      {/* KPI summary */}
      <div className="a-grid-4" style={{ marginBottom: 18 }}>
        <div className="a-kpi">
          <div className="a-kpi-label">Total activas</div>
          <div className="a-kpi-value">{fmtN(stats.total)}</div>
          <div className="a-kpi-foot">
            <span className="a-kpi-delta pos">
              <ArrowUp size={11} /> +{fmtN(stats.paid)} pagas
            </span>
          </div>
        </div>
        <div className="a-kpi">
          <div className="a-kpi-label">Onboarding completo</div>
          <div className="a-kpi-value">{fmtN(stats.onboarded)}</div>
          <div className="a-kpi-foot">
            {stats.total > 0 ? `${Math.round((stats.onboarded / stats.total) * 100)}% de la cartera` : '—'}
          </div>
        </div>
        <div className="a-kpi">
          <div className="a-kpi-label">Plan FREE (trial/freemium)</div>
          <div className="a-kpi-value">{fmtN(stats.trial)}</div>
          <div className="a-kpi-foot">Oportunidad de upgrade</div>
        </div>
        <div className="a-kpi">
          <div className="a-kpi-label">Workers gestionados</div>
          <div className="a-kpi-value">{fmtN(stats.workers)}</div>
          <div className="a-kpi-foot">
            {stats.total > 0 ? `${Math.round(stats.workers / stats.total)} por empresa promedio` : '—'}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <div className="a-seg" role="tablist" aria-label="Filtro por plan">
          {PLANS.map((p) => (
            <button
              key={p}
              className={planFilter === p ? 'active' : ''}
              onClick={() => setPlanFilter(p)}
              role="tab"
              aria-selected={planFilter === p}
            >
              {p === 'ALL' ? 'Todas' : p}
            </button>
          ))}
        </div>

        {sizes.length > 1 && (
          <select
            value={sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value)}
            className="a-input"
            style={{ width: 160 }}
            aria-label="Filtrar por tamaño"
          >
            <option value="ALL">Cualquier tamaño</option>
            {sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}

        <div style={{ flex: 1, position: 'relative', minWidth: 240, maxWidth: 380 }}>
          <Search
            size={13}
            style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-tertiary)' }}
          />
          <input
            type="text"
            placeholder="Buscar por nombre, RUC o sector…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="a-input"
            style={{ paddingLeft: 32 }}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div
          style={{
            height: 360,
            background: 'var(--neutral-100)',
            borderRadius: 12,
            animation: 'pulseEmerald 2s infinite',
          }}
        />
      ) : filtered.length === 0 ? (
        <div
          className="a-card"
          style={{
            padding: 48,
            textAlign: 'center',
          }}
        >
          <Building2
            size={40}
            style={{ color: 'var(--neutral-300)', margin: '0 auto 10px', display: 'block' }}
          />
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            No se encontraron empresas con los filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="a-card" style={{ padding: 0 }}>
          <table className="a-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Plan</th>
                <th style={{ textAlign: 'right' }}>Usuarios</th>
                <th style={{ textAlign: 'right' }}>Workers</th>
                <th>RUC</th>
                <th>Sector</th>
                <th style={{ textAlign: 'right' }}>Alta</th>
                <th style={{ textAlign: 'right' }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => router.push(`/admin/empresas/${o.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="primary">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Monogram name={o.name} size={28} />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 240,
                          }}
                        >
                          {o.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          {o.sizeRange ?? '—'}
                          {!o.onboardingCompleted && ' · sin onboarding'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`a-badge ${planBadgeClass(o.plan)}`}>{o.plan}</span>
                  </td>
                  <td className="num">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Users size={11} style={{ color: 'var(--text-tertiary)' }} />
                      {fmtN(o._count.users)}
                    </span>
                  </td>
                  <td className="num">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Briefcase size={11} style={{ color: 'var(--text-tertiary)' }} />
                      {fmtN(o._count.workers)}
                    </span>
                  </td>
                  <td className="a-mono" style={{ fontSize: 11.5 }}>
                    {o.ruc ?? '—'}
                  </td>
                  <td>{o.sector ?? '—'}</td>
                  <td className="num" style={{ color: 'var(--text-tertiary)' }}>
                    {new Date(o.createdAt).toLocaleDateString('es-PE', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      href={`/admin/empresas/${o.id}`}
                      className="a-btn a-btn-ghost a-btn-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Ver <ArrowRight size={11} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
