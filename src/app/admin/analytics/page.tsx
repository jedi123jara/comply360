'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Users, Activity, TrendingUp } from 'lucide-react'

interface AnalyticsData {
  signupsTrend: Array<{ date: string; count: number }>
  topActions: Array<{ action: string; count: number }>
  topOrgs: Array<{ orgName: string; events: number }>
  totalEvents: number
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="h-96 bg-slate-100 animate-pulse rounded-xl" />
  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          Analytics de la plataforma
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Métricas de uso, engagement y crecimiento (últimos 30 días)
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <KpiBlock label="Eventos totales" value={data.totalEvents.toString()} icon={Activity} color="blue" />
        <KpiBlock label="Top accion" value={data.topActions[0]?.action || '—'} icon={TrendingUp} color="green" />
        <KpiBlock label="Empresas activas" value={data.topOrgs.length.toString()} icon={Users} color="purple" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Top acciones</h3>
          {data.topActions.length === 0 ? (
            <p className="text-sm text-slate-500">Sin datos.</p>
          ) : (
            <ul className="space-y-2">
              {data.topActions.slice(0, 10).map((a, idx) => (
                <li key={idx} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-slate-700">{a.action}</span>
                  <span className="font-semibold text-slate-900">{a.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Empresas mas activas</h3>
          {data.topOrgs.length === 0 ? (
            <p className="text-sm text-slate-500">Sin datos.</p>
          ) : (
            <ul className="space-y-2">
              {data.topOrgs.slice(0, 10).map((o, idx) => (
                <li key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{o.orgName}</span>
                  <span className="font-semibold text-slate-900">{o.events} eventos</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

const COLOR_MAP = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-green-50 text-green-700',
  purple: 'bg-purple-50 text-purple-700',
}

function KpiBlock({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: keyof typeof COLOR_MAP }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className={`w-10 h-10 rounded-lg ${COLOR_MAP[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  )
}
