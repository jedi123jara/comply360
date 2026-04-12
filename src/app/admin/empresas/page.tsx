'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, Search, ExternalLink, Users, Briefcase } from 'lucide-react'

interface OrgItem {
  id: string
  name: string
  ruc: string | null
  sector: string | null
  sizeRange: string | null
  plan: string
  onboardingCompleted: boolean
  createdAt: string
  _count: {
    users: number
    workers: number
  }
}

export default function EmpresasPage() {
  const [orgs, setOrgs] = useState<OrgItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('ALL')

  useEffect(() => {
    fetch('/api/admin/empresas')
      .then((r) => r.json())
      .then((d) => setOrgs(d.organizations || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = orgs.filter((o) => {
    if (planFilter !== 'ALL' && o.plan !== planFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return o.name.toLowerCase().includes(q) || (o.ruc?.includes(q) ?? false)
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Empresas registradas</h2>
        <p className="text-sm text-slate-500 mt-1">
          Gestión global de organizaciones que usan COMPLY 360
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o RUC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="ALL">Todos los planes</option>
          <option value="FREE">FREE</option>
          <option value="STARTER">STARTER</option>
          <option value="EMPRESA">EMPRESA</option>
          <option value="PRO">PRO</option>
        </select>
      </div>

      {loading ? (
        <div className="h-96 bg-slate-100 animate-pulse rounded-xl" />
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No se encontraron empresas.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3">Empresa</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">RUC</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Sector</th>
                  <th className="text-center px-4 py-3">Plan</th>
                  <th className="text-center px-4 py-3">Usuarios</th>
                  <th className="text-center px-4 py-3">Trabajadores</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Registro</th>
                  <th className="text-right px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/empresas/${o.id}`} className="font-medium text-slate-900 hover:text-blue-700">
                        {o.name}
                      </Link>
                      <p className="text-xs text-slate-500">{o.sizeRange || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs hidden md:table-cell">
                      {o.ruc || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{o.sector || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <PlanBadge plan={o.plan} />
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Users className="w-3 h-3" />
                        {o._count.users}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Briefcase className="w-3 h-3" />
                        {o._count.workers}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                      {new Date(o.createdAt).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/empresas/${o.id}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs font-medium"
                      >
                        Ver detalle <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-slate-100 text-slate-700',
  STARTER: 'bg-blue-100 text-blue-700',
  EMPRESA: 'bg-purple-100 text-purple-700',
  PRO: 'bg-amber-100 text-amber-700',
}

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[plan] || PLAN_COLORS.FREE}`}>
      {plan}
    </span>
  )
}
