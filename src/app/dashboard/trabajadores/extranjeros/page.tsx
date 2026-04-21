'use client'

import { useState, useEffect } from 'react'
import {
  Globe,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Users,
  FileWarning,
  Loader2,
  ArrowLeft,
  Info,
} from 'lucide-react'
import Link from 'next/link'

interface ForeignWorker {
  id: string
  nombre: string
  nationality: string | null
  position: string | null
  department: string | null
  fechaIngreso: string
  dni: string
  hasPermit: boolean
  permitStatus: 'SIN_PERMISO' | 'PERMISO_VENCIDO' | 'VIGENTE'
  documents: {
    id: string
    type: string
    title: string
    status: string
    expiresAt: string | null
  }[]
}

interface ExtranjerosData {
  totalWorkers: number
  foreignCount: number
  percentage: number
  limitPercentage: number
  isOverLimit: boolean
  isApproachingLimit: boolean
  complianceStatus: 'CUMPLE' | 'EN_RIESGO' | 'NO_CUMPLE'
  sinPermiso: number
  permisoVencido: number
  foreignWorkers: ForeignWorker[]
  baseLegal: string
  limitExplanation: string
}

const PERMIT_STATUS_CONFIG = {
  VIGENTE: { label: 'Vigente', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  SIN_PERMISO: { label: 'Sin permiso', color: 'bg-red-100 text-red-700', icon: FileWarning },
  PERMISO_VENCIDO: { label: 'Vencido', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
}

const COMPLIANCE_CONFIG = {
  CUMPLE: { label: 'Cumple', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  EN_RIESGO: { label: 'En riesgo', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  NO_CUMPLE: { label: 'No cumple', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
}

export default function ExtranjerosPage() {
  const [data, setData] = useState<ExtranjerosData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/workers/extranjeros')
        if (!res.ok) throw new Error('Error al cargar datos')
        const json = await res.json()
        setData(json.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
        {error || 'No se pudieron cargar los datos'}
      </div>
    )
  }

  const complianceCfg = COMPLIANCE_CONFIG[data.complianceStatus]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/trabajadores"
          className="rounded-lg p-2 hover:bg-[color:var(--neutral-100)] transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Trabajadores Extranjeros</h1>
          <p className="text-sm text-gray-500">
            Control de limite legal de contratacion - Ley 689
          </p>
        </div>
      </div>

      {/* Warning Banner */}
      {(data.isOverLimit || data.isApproachingLimit) && (
        <div
          className={`flex items-start gap-3 rounded-lg border p-4 ${
            data.isOverLimit
              ? 'border-red-300 bg-red-50'
              : 'border-amber-300 bg-amber-50'
          }`}
        >
          <ShieldAlert
            className={`h-6 w-6 shrink-0 mt-0.5 ${
              data.isOverLimit ? 'text-red-600' : 'text-amber-600'
            }`}
          />
          <div>
            <p
              className={`font-semibold ${
                data.isOverLimit ? 'text-red-800' : 'text-amber-800'
              }`}
            >
              {data.isOverLimit
                ? 'ALERTA: Se ha superado el limite legal del 20%'
                : 'ATENCION: Se esta acercando al limite legal del 20%'}
            </p>
            <p
              className={`text-sm mt-1 ${
                data.isOverLimit ? 'text-red-700' : 'text-amber-700'
              }`}
            >
              {data.isOverLimit
                ? `Actualmente tiene ${data.percentage}% de trabajadores extranjeros. ` +
                  'Esto constituye una infraccion grave sancionable por SUNAFIL. ' +
                  'Debe regularizar la situacion inmediatamente.'
                : `Actualmente tiene ${data.percentage}% de trabajadores extranjeros. ` +
                  'El limite legal es 20%. Tome precauciones antes de nuevas contrataciones.'}
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Trabajadores"
          value={data.totalWorkers}
          icon={<Users className="h-5 w-5 text-blue-600" />}
          bg="bg-blue-50"
        />
        <StatCard
          label="Trabajadores Extranjeros"
          value={data.foreignCount}
          icon={<Globe className="h-5 w-5 text-purple-600" />}
          bg="bg-purple-50"
        />
        <StatCard
          label="Porcentaje"
          value={`${data.percentage}%`}
          subtitle={`Limite: ${data.limitPercentage}%`}
          icon={
            data.isOverLimit ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            )
          }
          bg={data.isOverLimit ? 'bg-red-50' : 'bg-emerald-50'}
        />
        <div
          className={`rounded-lg border p-4 ${complianceCfg.bg}`}
        >
          <p className="text-sm font-medium text-gray-500">Estado de Cumplimiento</p>
          <p className={`mt-1 text-2xl font-bold ${complianceCfg.color}`}>
            {complianceCfg.label}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-lg border border-white/[0.08] bg-white p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[color:var(--text-secondary)]">
            Proporcion de trabajadores extranjeros
          </span>
          <span className="text-sm font-bold text-white">{data.percentage}% / {data.limitPercentage}%</span>
        </div>
        <div className="relative h-6 w-full overflow-hidden rounded-full bg-gray-200">
          {/* 20% limit marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
            style={{ left: `${Math.min(data.limitPercentage / Math.max(data.percentage, data.limitPercentage + 5) * 100, 100)}%` }}
          />
          {/* Current percentage bar */}
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              data.isOverLimit
                ? 'bg-red-500'
                : data.isApproachingLimit
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
            }`}
            style={{
              width: `${Math.min(
                (data.percentage / Math.max(data.percentage, data.limitPercentage + 5)) * 100,
                100
              )}%`,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500">0%</span>
          <span className="text-xs text-red-500 font-medium">Limite 20%</span>
          <span className="text-xs text-gray-500">
            {Math.max(data.percentage, data.limitPercentage + 5)}%
          </span>
        </div>
      </div>

      {/* Permit Status Summary */}
      {(data.sinPermiso > 0 || data.permisoVencido > 0) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileWarning className="h-5 w-5 text-red-600" />
            <span className="font-semibold text-red-800">Permisos de trabajo pendientes</span>
          </div>
          <div className="flex gap-6 text-sm">
            {data.sinPermiso > 0 && (
              <span className="text-red-700">
                {data.sinPermiso} sin permiso de trabajo
              </span>
            )}
            {data.permisoVencido > 0 && (
              <span className="text-amber-700">
                {data.permisoVencido} con permiso vencido
              </span>
            )}
          </div>
        </div>
      )}

      {/* Foreign Workers Table */}
      <div className="rounded-lg border border-white/[0.08] bg-white">
        <div className="border-b border-white/[0.08] px-6 py-4">
          <h2 className="text-lg font-semibold text-white">
            Trabajadores Extranjeros ({data.foreignCount})
          </h2>
        </div>

        {data.foreignWorkers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Globe className="h-12 w-12 mb-3 text-[color:var(--text-secondary)]" />
            <p className="text-lg font-medium">No hay trabajadores extranjeros registrados</p>
            <p className="text-sm">Todos los trabajadores activos tienen nacionalidad peruana</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[color:var(--neutral-50)]">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Nacionalidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Cargo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Fecha Ingreso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Permiso de Trabajo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.foreignWorkers.map((worker) => {
                  const permitCfg = PERMIT_STATUS_CONFIG[worker.permitStatus]
                  const PermitIcon = permitCfg.icon

                  return (
                    <tr key={worker.id} className="hover:bg-[color:var(--neutral-50)] transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/trabajadores/${worker.id}`}
                          className="font-medium text-white hover:text-primary"
                        >
                          {worker.nombre}
                        </Link>
                        <p className="text-xs text-gray-500">{worker.dni}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          <Globe className="h-3 w-3" />
                          {worker.nationality}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[color:var(--text-secondary)]">
                        {worker.position || '-'}
                        {worker.department && (
                          <p className="text-xs text-gray-400">{worker.department}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[color:var(--text-secondary)]">
                        {new Date(worker.fechaIngreso).toLocaleDateString('es-PE')}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${permitCfg.color}`}
                        >
                          <PermitIcon className="h-3 w-3" />
                          {permitCfg.label}
                        </span>
                        {worker.documents.length > 0 && worker.documents[0].expiresAt && (
                          <p className="text-xs text-gray-400 mt-1">
                            Vence: {new Date(worker.documents[0].expiresAt).toLocaleDateString('es-PE')}
                          </p>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legal Reference */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800">{data.baseLegal}</p>
            <p className="text-sm text-blue-700 mt-1">{data.limitExplanation}</p>
            <ul className="mt-2 space-y-1 text-xs text-blue-600">
              <li>- Limite de personal extranjero: 20% del total</li>
              <li>- Limite de remuneraciones extranjeras: 30% del total de planilla</li>
              <li>- Excepcion: personal de direccion y/o confianza (Art. 6 D.Leg. 689)</li>
              <li>- Todo trabajador extranjero debe contar con carnet de extranjeria o permiso de trabajo</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  subtitle,
  icon,
  bg,
}: {
  label: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  bg: string
}) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={`rounded-lg p-2 ${bg}`}>{icon}</div>
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}
