'use client'

import { useEffect, useState } from 'react'
import { CreditCard, TrendingUp, AlertCircle, Calendar } from 'lucide-react'

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

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/billing')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="h-96 bg-slate-100 animate-pulse rounded-xl" />
  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Billing & Subscripciones</h2>
        <p className="text-sm text-slate-500 mt-1">
          Panorama financiero global de la plataforma
        </p>
      </div>

      {/* MRR / ARR cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <BigKpi label="MRR" value={`S/ ${data.mrr.toLocaleString('es-PE')}`} icon={TrendingUp} color="green" />
        <BigKpi label="ARR" value={`S/ ${data.arr.toLocaleString('es-PE')}`} icon={CreditCard} color="blue" />
        <BigKpi label="Activas" value={data.activeSubscriptions.toString()} icon={CreditCard} color="purple" />
        <BigKpi label="Vencidas" value={data.pastDue.toString()} icon={AlertCircle} color="red" />
      </div>

      {/* Por plan */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Distribución por plan</h3>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left py-2">Plan</th>
              <th className="text-right py-2">Suscripciones</th>
              <th className="text-right py-2">MRR contribución</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.byPlan.map((p) => (
              <tr key={p.plan}>
                <td className="py-3 font-medium text-slate-900">{p.plan}</td>
                <td className="py-3 text-right text-slate-700">{p.count}</td>
                <td className="py-3 text-right font-mono text-slate-900">
                  S/ {p.mrr.toLocaleString('es-PE')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recientes */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Renovaciones próximas</h3>
        {data.recentSubscriptions.length === 0 ? (
          <p className="text-sm text-slate-500">Sin renovaciones próximas.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.recentSubscriptions.map((s) => (
              <li key={s.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{s.orgName}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Vence: {new Date(s.currentPeriodEnd).toLocaleDateString('es-PE')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {s.plan}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{s.status}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const COLOR_MAP = {
  green: 'bg-green-50 text-green-700',
  blue: 'bg-blue-50 text-blue-700',
  purple: 'bg-purple-50 text-purple-700',
  red: 'bg-red-50 text-red-700',
}

function BigKpi({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: keyof typeof COLOR_MAP }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className={`w-10 h-10 rounded-lg ${COLOR_MAP[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  )
}
