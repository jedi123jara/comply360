'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Building2, Users, Briefcase, FileText, Calendar,
  AlertTriangle
} from 'lucide-react'

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
        if (res.status === 422) {
          setPlanError(data.error)
        } else {
          setPlanError('No se pudo actualizar el plan')
        }
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

  if (loading) return <div className="h-96 bg-slate-100 animate-pulse rounded-xl" />
  if (!org) return <div className="text-slate-500">Empresa no encontrada</div>

  return (
    <div className="space-y-6">
      <Link
        href="/admin/empresas"
        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a empresas
      </Link>

      {/* Hero */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">{org.name}</h2>
            </div>
            {org.razonSocial && (
              <p className="text-sm text-slate-600 mt-1">{org.razonSocial}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
              {org.ruc && <span>RUC: <span className="font-mono">{org.ruc}</span></span>}
              {org.sector && <span>Sector: {org.sector}</span>}
              {org.sizeRange && <span>Tamaño: {org.sizeRange}</span>}
              <span>Registro: {new Date(org.createdAt).toLocaleDateString('es-PE')}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <select
              value={org.plan}
              onChange={(e) => { setPendingPlan(e.target.value); setPlanError(null) }}
              disabled={actionLoading}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
            >
              <option value="FREE">FREE</option>
              <option value="STARTER">STARTER</option>
              <option value="EMPRESA">EMPRESA</option>
              <option value="PRO">PRO</option>
            </select>
            {pendingPlan && pendingPlan !== org.plan && (
              <div className="bg-white border border-amber-300 rounded-xl p-4 shadow-lg z-10 w-72 text-sm">
                <p className="font-semibold text-amber-800 mb-1">⚠ Confirmar cambio de plan</p>
                <p className="text-slate-600 mb-3">
                  Cambiar de <span className="font-bold text-slate-900">{org.plan}</span> a{' '}
                  <span className="font-bold text-slate-900">{pendingPlan}</span>.{' '}
                  {(['FREE', 'STARTER'].includes(pendingPlan) && !['FREE', 'STARTER'].includes(org.plan)) &&
                    'El downgrade se aplica de inmediato. Verifique que los trabajadores activos estén dentro del nuevo límite.'}
                </p>
                {planError && (
                  <p className="text-red-600 text-xs mb-2 font-medium">{planError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePlanChange(pendingPlan)}
                    disabled={actionLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {actionLoading ? 'Guardando...' : 'Confirmar'}
                  </button>
                  <button
                    onClick={() => { setPendingPlan(null); setPlanError(null) }}
                    disabled={actionLoading}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-1.5 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile icon={Users} label="Usuarios" value={org.stats.users} />
        <StatTile icon={Briefcase} label="Trabajadores" value={org.stats.workers} />
        <StatTile icon={FileText} label="Contratos" value={org.stats.contracts} />
        <StatTile icon={FileText} label="Boletas" value={org.stats.payslips} />
        <StatTile icon={AlertTriangle} label="Diagnosticos" value={org.stats.diagnostics} />
        <StatTile icon={AlertTriangle} label="Denuncias" value={org.stats.complaints} />
      </div>

      {/* Suscripción */}
      {org.subscription && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Suscripción</h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Estado</p>
              <p className="font-medium text-slate-900 mt-1">{org.subscription.status}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Periodo actual</p>
              <p className="font-medium text-slate-900 mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(org.subscription.currentPeriodStart).toLocaleDateString('es-PE')} –{' '}
                {new Date(org.subscription.currentPeriodEnd).toLocaleDateString('es-PE')}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Onboarding</p>
              <p className="font-medium text-slate-900 mt-1">
                {org.onboardingCompleted ? '✓ Completo' : '⚠ Pendiente'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Usuarios */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Usuarios de la organización</h3>
          <span className="text-xs text-slate-500">{org.stats.users} total</span>
        </div>
        {org.recentUsers.length === 0 ? (
          <p className="text-sm text-slate-500">Sin usuarios registrados.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {org.recentUsers.map((u) => (
              <li key={u.id} className="py-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {u.firstName} {u.lastName}
                  </p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
                <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                  {u.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatTile({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
      <Icon className="w-4 h-4 text-slate-400 mx-auto mb-1" />
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}
