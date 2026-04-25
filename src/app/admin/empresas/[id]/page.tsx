'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Calendar,
  FileText,
  Flag,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { fmtN, Monogram } from '@/components/admin/primitives'

interface OrgDetail {
  id: string
  name: string
  ruc: string | null
  razonSocial: string | null
  sector: string | null
  sizeRange: string | null
  plan: string
  planExpiresAt: string | null
  onboardingCompleted: boolean
  createdAt: string
  alertEmail: string | null
  regimenPrincipal: string | null
  stats: {
    users: number
    workers: number
    contracts: number
    payslips: number
    diagnostics: number
    complaints: number
    auditLogs: number
  }
  subscription: {
    status: string
    currentPeriodStart: string
    currentPeriodEnd: string
  } | null
  recentUsers: Array<{
    id: string
    email: string
    role: string
    firstName: string | null
    lastName: string | null
    createdAt: string
  }>
}

function planBadge(plan: string): string {
  const p = plan.toUpperCase()
  if (p === 'ENTERPRISE' || p === 'PRO') return 'a-badge-gold'
  if (p === 'EMPRESA') return 'a-badge-cyan'
  if (p === 'STARTER') return 'a-badge-emerald'
  return 'a-badge-neutral'
}

export default function EmpresaDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [pendingPlan, setPendingPlan] = useState<string | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/admin/empresas/${id}`)
      .then((r) => r.json())
      .then(setOrg)
      .finally(() => setLoading(false))
  }, [id])

  const handlePlanChange = async (newPlan: string) => {
    if (!org) return
    setActionLoading(true)
    setPlanError(null)
    try {
      const res = await fetch(`/api/admin/empresas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 422) setPlanError(data.error)
        else setPlanError('No se pudo actualizar el plan')
        return
      }
      setOrg({ ...org, plan: data.plan })
      setPendingPlan(null)
    } catch {
      setPlanError('Error de conexión al actualizar el plan')
    } finally {
      setActionLoading(false)
    }
  }

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
  if (!org) {
    return (
      <div
        style={{
          padding: 48,
          textAlign: 'center',
          color: 'var(--text-tertiary)',
        }}
      >
        Empresa no encontrada.
      </div>
    )
  }

  return (
    <>
      <Link
        href="/admin/empresas"
        className="a-btn a-btn-ghost a-btn-sm"
        style={{ marginBottom: 14, display: 'inline-flex' }}
      >
        <ArrowLeft size={12} /> Volver a empresas
      </Link>

      {/* Hero */}
      <div className="a-card" style={{ marginBottom: 18 }}>
        <div className="a-card-pad-lg">
          <div
            style={{
              display: 'flex',
              gap: 18,
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0, flex: 1 }}>
              <Monogram name={org.name} size={48} />
              <div style={{ minWidth: 0 }}>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {org.name}
                </h1>
                {org.razonSocial && (
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      margin: '4px 0 0',
                    }}
                  >
                    {org.razonSocial}
                  </p>
                )}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px 16px',
                    marginTop: 8,
                    fontSize: 11.5,
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {org.ruc && (
                    <span>
                      RUC:{' '}
                      <span
                        style={{
                          fontFamily: 'var(--font-geist-mono), monospace',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {org.ruc}
                      </span>
                    </span>
                  )}
                  {org.sector && <span>Sector: {org.sector}</span>}
                  {org.sizeRange && <span>Tamaño: {org.sizeRange}</span>}
                  {org.regimenPrincipal && <span>Régimen: {org.regimenPrincipal}</span>}
                  <span>
                    Alta:{' '}
                    {new Date(org.createdAt).toLocaleDateString('es-PE', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
              <span className={`a-badge ${planBadge(org.plan)}`} style={{ fontSize: 12, padding: '4px 10px' }}>
                Plan actual: {org.plan}
              </span>

              <div style={{ position: 'relative' }}>
                <select
                  value={org.plan}
                  onChange={(e) => {
                    setPendingPlan(e.target.value)
                    setPlanError(null)
                  }}
                  disabled={actionLoading}
                  className="a-input"
                  style={{ fontWeight: 600, width: 200 }}
                  aria-label="Cambiar plan"
                >
                  <option value="FREE">FREE</option>
                  <option value="STARTER">STARTER</option>
                  <option value="EMPRESA">EMPRESA</option>
                  <option value="PRO">PRO</option>
                </select>

                {pendingPlan && pendingPlan !== org.plan && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: 300,
                      background: '#fff',
                      border: '1px solid var(--border-amber)',
                      borderRadius: 12,
                      boxShadow: 'var(--shadow-card-lift)',
                      padding: 14,
                      zIndex: 10,
                      fontSize: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--amber-700)',
                        marginBottom: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <AlertTriangle size={11} /> Confirmar cambio de plan
                    </div>
                    <p
                      style={{
                        color: 'var(--text-secondary)',
                        marginBottom: 10,
                        lineHeight: 1.5,
                      }}
                    >
                      Cambiar de{' '}
                      <b style={{ color: 'var(--text-primary)' }}>{org.plan}</b> a{' '}
                      <b style={{ color: 'var(--text-primary)' }}>{pendingPlan}</b>.
                      {['FREE', 'STARTER'].includes(pendingPlan) &&
                        !['FREE', 'STARTER'].includes(org.plan) && (
                          <>
                            {' '}
                            El downgrade se aplica de inmediato. Verifica que los trabajadores
                            activos estén dentro del nuevo límite.
                          </>
                        )}
                    </p>
                    {planError && (
                      <p
                        style={{
                          color: 'var(--crimson-600)',
                          fontSize: 11.5,
                          marginBottom: 8,
                          fontWeight: 600,
                        }}
                      >
                        {planError}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handlePlanChange(pendingPlan)}
                        disabled={actionLoading}
                        className="a-btn a-btn-primary a-btn-sm"
                        style={{ flex: 1 }}
                      >
                        {actionLoading ? 'Guardando…' : 'Confirmar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingPlan(null)
                          setPlanError(null)
                        }}
                        disabled={actionLoading}
                        className="a-btn a-btn-secondary a-btn-sm"
                        style={{ flex: 1 }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="a-grid-4" style={{ marginBottom: 18 }}>
        <div className="a-kpi">
          <div className="a-kpi-label">
            <Users size={11} /> Usuarios
          </div>
          <div className="a-kpi-value">{fmtN(org.stats.users)}</div>
          <div className="a-kpi-foot">Admins + workers con cuenta</div>
        </div>
        <div className="a-kpi">
          <div className="a-kpi-label">
            <Briefcase size={11} /> Trabajadores
          </div>
          <div className="a-kpi-value">{fmtN(org.stats.workers)}</div>
          <div className="a-kpi-foot">Registrados en planilla</div>
        </div>
        <div className="a-kpi">
          <div className="a-kpi-label">
            <FileText size={11} /> Contratos
          </div>
          <div className="a-kpi-value">{fmtN(org.stats.contracts)}</div>
          <div className="a-kpi-foot">{fmtN(org.stats.payslips)} boletas emitidas</div>
        </div>
        <div className="a-kpi">
          <div className="a-kpi-label">
            <ShieldAlert size={11} /> Diagnósticos
          </div>
          <div className="a-kpi-value">{fmtN(org.stats.diagnostics)}</div>
          <div className="a-kpi-foot">
            {org.stats.complaints > 0
              ? `${fmtN(org.stats.complaints)} denuncias abiertas`
              : 'Sin denuncias'}
          </div>
        </div>
      </div>

      <div className="a-grid-2-1" style={{ marginBottom: 18 }}>
        {/* Suscripción */}
        <div className="a-card">
          <div className="a-head">
            <div>
              <div className="a-head-title">
                <Calendar size={14} style={{ color: 'var(--emerald-600)' }} /> Suscripción
              </div>
              <div className="a-head-sub">Plan + ciclo de facturación</div>
            </div>
          </div>
          <div className="a-card-pad">
            {org.subscription ? (
              <div className="a-grid-3">
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--text-tertiary)',
                      fontWeight: 600,
                    }}
                  >
                    Estado
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <span className={`a-badge ${org.subscription.status.toLowerCase() === 'active' ? 'a-badge-emerald' : 'a-badge-amber'}`}>
                      {org.subscription.status}
                    </span>
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--text-tertiary)',
                      fontWeight: 600,
                    }}
                  >
                    Periodo actual
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      marginTop: 4,
                      fontFamily: 'var(--font-geist-mono), monospace',
                    }}
                  >
                    {new Date(org.subscription.currentPeriodStart).toLocaleDateString('es-PE', {
                      day: '2-digit',
                      month: 'short',
                    })}{' '}
                    →{' '}
                    {new Date(org.subscription.currentPeriodEnd).toLocaleDateString('es-PE', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--text-tertiary)',
                      fontWeight: 600,
                    }}
                  >
                    Onboarding
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <span
                      className={`a-badge ${org.onboardingCompleted ? 'a-badge-emerald' : 'a-badge-amber'}`}
                    >
                      {org.onboardingCompleted ? 'Completo' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
                Sin suscripción activa · Plan {org.plan}
              </div>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="a-card">
          <div className="a-head">
            <div>
              <div className="a-head-title">Señales</div>
              <div className="a-head-sub">Eventos destacados</div>
            </div>
          </div>
          <div className="a-card-pad" style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Audit logs totales</span>
              <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontWeight: 600 }}>
                {fmtN(org.stats.auditLogs)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Email de alertas</span>
              <span
                style={{
                  fontFamily: 'var(--font-geist-mono), monospace',
                  color: 'var(--text-primary)',
                  fontSize: 11.5,
                }}
              >
                {org.alertEmail ?? '—'}
              </span>
            </div>
            {org.stats.complaints > 0 && (
              <div
                style={{
                  marginTop: 4,
                  padding: '8px 10px',
                  background: 'var(--crimson-50)',
                  border: '1px solid var(--border-crimson)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--crimson-700)',
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                }}
              >
                <Flag size={12} /> {fmtN(org.stats.complaints)} denuncias requieren atención
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Usuarios */}
      <div className="a-card">
        <div className="a-head">
          <div>
            <div className="a-head-title">
              Usuarios de la organización{' '}
              <span className="a-tab-count">{fmtN(org.stats.users)}</span>
            </div>
            <div className="a-head-sub">Miembros con acceso al dashboard</div>
          </div>
        </div>
        {org.recentUsers.length === 0 ? (
          <div style={{ padding: 24, color: 'var(--text-tertiary)', fontSize: 13 }}>
            Sin usuarios registrados.
          </div>
        ) : (
          <table className="a-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th style={{ textAlign: 'right' }}>Alta</th>
              </tr>
            </thead>
            <tbody>
              {org.recentUsers.map((u) => {
                const name =
                  [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email.split('@')[0]
                return (
                  <tr key={u.id}>
                    <td className="primary">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Monogram name={name} size={26} />
                        {name}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td>
                      <span className="a-badge a-badge-neutral">{u.role}</span>
                    </td>
                    <td className="num" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(u.createdAt).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
