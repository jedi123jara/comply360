'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Receipt, ClipboardList, GraduationCap, FileText, Calendar,
  AlertCircle, ChevronRight, Briefcase, Building2
} from 'lucide-react'

interface PortalSummary {
  worker: {
    firstName: string
    lastName: string
    dni: string
    position: string | null
    department: string | null
    fechaIngreso: string
    regimenLaboral: string
    organization: { name: string; ruc: string | null }
  }
  stats: {
    boletasPendientes: number
    solicitudesPendientes: number
    capacitacionesPendientes: number
    documentosFaltantes: number
  }
  ultimaBoleta: { periodo: string; netoPagar: string } | null
  proximasCapacitaciones: Array<{ id: string; title: string; deadline: string | null }>
}

export default function MiPortalHomePage() {
  const [data, setData] = useState<PortalSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/mi-portal/resumen')
      .then((r) => {
        if (!r.ok) throw new Error('No se pudo cargar la informacion')
        return r.json()
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-slate-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">No se pudo cargar tu informacion</h3>
            <p className="text-sm text-red-700 mt-1">
              {error || 'Contacta al area de RRHH si el problema persiste.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const { worker, stats, ultimaBoleta, proximasCapacitaciones } = data

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white rounded-2xl p-6 lg:p-8 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-blue-200 text-sm mb-1">Bienvenido(a)</p>
            <h2 className="text-2xl lg:text-3xl font-bold">
              {worker.firstName} {worker.lastName}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-blue-100">
              {worker.position && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  {worker.position}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {worker.organization.name}
              </span>
            </div>
          </div>
          <div className="hidden sm:block bg-white/10 backdrop-blur p-3 rounded-xl">
            <p className="text-xs text-blue-200 uppercase">DNI</p>
            <p className="font-mono font-bold text-lg">{worker.dni}</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Receipt}
          color="blue"
          label="Boletas pendientes"
          value={stats.boletasPendientes}
          href="/mi-portal/boletas"
        />
        <StatCard
          icon={ClipboardList}
          color="amber"
          label="Solicitudes pendientes"
          value={stats.solicitudesPendientes}
          href="/mi-portal/solicitudes"
        />
        <StatCard
          icon={GraduationCap}
          color="purple"
          label="Capacitaciones"
          value={stats.capacitacionesPendientes}
          href="/mi-portal/capacitaciones"
        />
        <StatCard
          icon={FileText}
          color="rose"
          label="Documentos faltantes"
          value={stats.documentosFaltantes}
          href="/mi-portal/documentos"
        />
      </div>

      {/* Quick actions */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Ultima boleta */}
        <div className="bg-[#141824] border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Ultima boleta</h3>
            <Link
              href="/mi-portal/boletas"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              Ver todas <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {ultimaBoleta ? (
            <div>
              <p className="text-xs text-slate-500">{ultimaBoleta.periodo}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                S/ {Number(ultimaBoleta.netoPagar).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 mt-1">Neto a pagar</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Aun no se han emitido boletas en el portal.</p>
          )}
        </div>

        {/* Capacitaciones */}
        <div className="bg-[#141824] border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Capacitaciones pendientes</h3>
            <Link
              href="/mi-portal/capacitaciones"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              Ver todas <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {proximasCapacitaciones.length > 0 ? (
            <ul className="space-y-2">
              {proximasCapacitaciones.slice(0, 3).map((c) => (
                <li key={c.id} className="text-sm">
                  <p className="font-medium text-slate-800">{c.title}</p>
                  {c.deadline && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      Hasta {new Date(c.deadline).toLocaleDateString('es-PE')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No tienes capacitaciones pendientes.</p>
          )}
        </div>
      </div>

      {/* Acciones rapidas */}
      <div className="bg-[#141824] border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Acciones rapidas</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickAction href="/mi-portal/solicitudes/nueva" label="Solicitar vacaciones" />
          <QuickAction href="/mi-portal/solicitudes/nueva" label="Pedir constancia de trabajo" />
          <QuickAction href="/mi-portal/documentos/subir" label="Subir un documento" />
          <QuickAction href="/mi-portal/perfil" label="Actualizar mis datos" />
          <QuickAction href="/mi-portal/denuncias" label="Reportar incidente" />
          <QuickAction href="/mi-portal/reglamento" label="Ver el RIT" />
        </div>
      </div>
    </div>
  )
}

const COLOR_MAP = {
  blue: 'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-700',
  purple: 'bg-purple-50 text-purple-700',
  rose: 'bg-rose-50 text-rose-700',
}

function StatCard({
  icon: Icon, color, label, value, href,
}: {
  icon: React.ComponentType<{ className?: string }>
  color: keyof typeof COLOR_MAP
  label: string
  value: number
  href: string
}) {
  return (
    <Link
      href={href}
      className="bg-[#141824] border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 transition-all"
    >
      <div className={`w-10 h-10 rounded-lg ${COLOR_MAP[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </Link>
  )
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="border border-slate-200 rounded-lg p-3 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors text-center"
    >
      {label}
    </Link>
  )
}
