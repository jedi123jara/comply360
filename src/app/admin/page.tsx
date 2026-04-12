'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building2, Users, CreditCard, AlertTriangle, TrendingUp, Activity,
  Crown, ChevronRight
} from 'lucide-react'

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
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/overview')
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Crown className="w-6 h-6 text-amber-500" />
          Vista general de la plataforma
        </h2>
        <p className="text-sm text-slate-500 mt-1">Estado actual de COMPLY 360 a nivel global</p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={Building2}
          color="blue"
          label="Empresas activas"
          value={data.totals.organizations}
          delta={`+${data.growth.organizationsLast30} en 30d`}
        />
        <KpiCard
          icon={Users}
          color="green"
          label="Usuarios totales"
          value={data.totals.users}
          delta={`+${data.growth.usersLast30} en 30d`}
        />
        <KpiCard
          icon={Activity}
          color="purple"
          label="Trabajadores gestionados"
          value={data.totals.workers}
        />
        <KpiCard
          icon={CreditCard}
          color="amber"
          label="MRR"
          value={`S/ ${data.mrr.toLocaleString('es-PE')}`}
          subtitle={`${data.totals.activeSubscriptions} subs activas`}
        />
      </div>

      {/* Alertas críticas */}
      {(data.alerts.pastDueSubscriptions > 0 || data.alerts.failedPayments > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">Atención requerida</p>
              <ul className="text-sm text-amber-800 mt-1 space-y-0.5">
                {data.alerts.pastDueSubscriptions > 0 && (
                  <li>• {data.alerts.pastDueSubscriptions} suscripciones vencidas</li>
                )}
                {data.alerts.failedPayments > 0 && (
                  <li>• {data.alerts.failedPayments} pagos fallidos</li>
                )}
                {data.alerts.inactiveOrgs30d > 0 && (
                  <li>• {data.alerts.inactiveOrgs30d} empresas inactivas hace 30+ dias</li>
                )}
              </ul>
            </div>
          </div>
        </div>
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
    </div>
  )
}

const KPI_COLORS = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-green-50 text-green-700',
  purple: 'bg-purple-50 text-purple-700',
  amber: 'bg-amber-50 text-amber-700',
}

function KpiCard({
  icon: Icon, color, label, value, delta, subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>
  color: keyof typeof KPI_COLORS
  label: string
  value: string | number
  delta?: string
  subtitle?: string
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className={`w-10 h-10 rounded-lg ${KPI_COLORS[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      {delta && <p className="text-xs text-green-600 font-medium mt-1">{delta}</p>}
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
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
