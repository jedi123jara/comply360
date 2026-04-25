'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Calendar, CreditCard, Download, TrendingUp } from 'lucide-react'
import { fmtN, fmtPEN, Monogram } from '@/components/admin/primitives'

interface BillingData {
  mrr: number
  arr: number
  activeSubscriptions: number
  pastDue: number
  cancelledLast30: number
  newLast30: number
  byPlan: Array<{ plan: string; count: number; mrr: number }>
  recentSubscriptions: Array<{
    id: string
    orgName: string
    plan: string
    status: string
    currentPeriodEnd: string
  }>
}

function planBadgeClass(plan: string): string {
  const p = plan.toUpperCase()
  if (p === 'ENTERPRISE' || p === 'PRO') return 'a-badge-gold'
  if (p === 'EMPRESA') return 'a-badge-cyan'
  if (p === 'STARTER') return 'a-badge-emerald'
  return 'a-badge-neutral'
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase()
  if (s.includes('active')) return 'a-badge-emerald'
  if (s.includes('past') || s.includes('due') || s.includes('failed')) return 'a-badge-crimson'
  if (s.includes('trial')) return 'a-badge-amber'
  return 'a-badge-neutral'
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/billing')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div
        style={{
          height: 360,
          background: 'var(--neutral-100)',
          borderRadius: 12,
          animation: 'pulseEmerald 2s infinite',
        }}
      />
    )
  }
  if (!data) return null

  const totalByPlan = data.byPlan.reduce((s, p) => s + p.count, 0)
  const mrrByPlan = data.byPlan.reduce((s, p) => s + p.mrr, 0)

  return (
    <>
      <div className="a-page-head">
        <div>
          <div className="crumbs">Revenue · Billing</div>
          <h1>
            Billing & <em>Suscripciones</em>
          </h1>
          <div className="sub">
            Panorama financiero global de la plataforma. {fmtPEN(data.mrr)} MRR actual ·{' '}
            {fmtPEN(data.arr, { compact: true })} ARR proyectado.
          </div>
        </div>
        <div className="spacer" />
        <div className="actions">
          <button className="a-btn a-btn-secondary" type="button">
            <Download size={13} /> Export CSV
          </button>
          <button className="a-btn a-btn-primary" type="button">
            <CreditCard size={13} /> Configurar Culqi
          </button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="a-grid-4" style={{ marginBottom: 18 }}>
        <div className="a-kpi">
          <div className="a-kpi-label">
            <TrendingUp size={11} /> MRR
          </div>
          <div className="a-kpi-value">{fmtPEN(data.mrr)}</div>
          <div className="a-kpi-foot">
            +{fmtN(data.newLast30)} nuevas en 30d · -{fmtN(data.cancelledLast30)} canceladas
          </div>
        </div>
        <div className="a-kpi">
          <div className="a-kpi-label">ARR proyectado</div>
          <div className="a-kpi-value">{fmtPEN(data.arr, { compact: true })}</div>
          <div className="a-kpi-foot">MRR × 12</div>
        </div>
        <div className="a-kpi">
          <div className="a-kpi-label">Suscripciones activas</div>
          <div className="a-kpi-value">{fmtN(data.activeSubscriptions)}</div>
          <div className="a-kpi-foot">En {totalByPlan} planes</div>
        </div>
        <div className="a-kpi">
          <div className="a-kpi-label">
            <AlertCircle size={11} /> Vencidas
          </div>
          <div
            className="a-kpi-value"
            style={{ color: data.pastDue > 0 ? 'var(--crimson-600)' : 'var(--text-primary)' }}
          >
            {fmtN(data.pastDue)}
          </div>
          <div className="a-kpi-foot">
            {data.pastDue > 0 ? 'Dunning en curso' : 'Cero impagos'}
          </div>
        </div>
      </div>

      {/* Distribución por plan */}
      <div className="a-card" style={{ marginBottom: 18 }}>
        <div className="a-head">
          <div>
            <div className="a-head-title">Distribución por plan</div>
            <div className="a-head-sub">Contribución al MRR por segmento</div>
          </div>
        </div>
        <table className="a-table">
          <thead>
            <tr>
              <th>Plan</th>
              <th style={{ textAlign: 'right' }}>Suscripciones</th>
              <th style={{ textAlign: 'right' }}>% cartera</th>
              <th style={{ textAlign: 'right' }}>MRR</th>
              <th style={{ textAlign: 'right' }}>% MRR</th>
            </tr>
          </thead>
          <tbody>
            {data.byPlan.map((p) => {
              const pctCount = totalByPlan > 0 ? (p.count / totalByPlan) * 100 : 0
              const pctMrr = mrrByPlan > 0 ? (p.mrr / mrrByPlan) * 100 : 0
              return (
                <tr key={p.plan}>
                  <td className="primary">
                    <span className={`a-badge ${planBadgeClass(p.plan)}`}>{p.plan}</span>
                  </td>
                  <td className="num">{fmtN(p.count)}</td>
                  <td className="num" style={{ color: 'var(--text-tertiary)' }}>
                    {pctCount.toFixed(1)}%
                  </td>
                  <td className="num">{fmtPEN(p.mrr)}</td>
                  <td className="num" style={{ color: 'var(--text-tertiary)' }}>
                    {pctMrr.toFixed(1)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Renovaciones próximas */}
      <div className="a-card">
        <div className="a-head">
          <div>
            <div className="a-head-title">
              <Calendar size={14} style={{ color: 'var(--emerald-600)' }} /> Renovaciones próximas
            </div>
            <div className="a-head-sub">Outreach antes de la renovación automática</div>
          </div>
        </div>
        {data.recentSubscriptions.length === 0 ? (
          <div style={{ padding: 24, color: 'var(--text-tertiary)', fontSize: 13 }}>
            Sin renovaciones próximas.
          </div>
        ) : (
          <table className="a-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Plan</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Vence</th>
              </tr>
            </thead>
            <tbody>
              {data.recentSubscriptions.map((s) => (
                <tr key={s.id}>
                  <td className="primary">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Monogram name={s.orgName} size={26} />
                      {s.orgName}
                    </div>
                  </td>
                  <td>
                    <span className={`a-badge ${planBadgeClass(s.plan)}`}>{s.plan}</span>
                  </td>
                  <td>
                    <span className={`a-badge ${statusBadgeClass(s.status)}`}>{s.status}</span>
                  </td>
                  <td className="num" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(s.currentPeriodEnd).toLocaleDateString('es-PE', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
