'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield,
  Lock,
  Key,
  History,
  ArrowLeft,
  Loader2,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string
  action: string
  createdAt: string
  metadata: {
    ip?: string
    result?: string
    userAgent?: string
  } | null
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SeguridadConfigPage() {
  const router = useRouter()

  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auditoria?type=AUTH&limit=20')
      if (res.ok) {
        const data = await res.json()
        setAuditLogs(data.logs || data.entries || [])
      }
    } catch {
      // Silent — empty state will show
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAuditLogs() }, [fetchAuditLogs])

  function getResultIcon(result: string | undefined) {
    if (!result) return <AlertTriangle className="h-3.5 w-3.5 text-gray-500" />
    const r = result.toLowerCase()
    if (r === 'success' || r === 'ok' || r === 'exitoso') return <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
    if (r === 'failed' || r === 'error' || r === 'fallido') return <XCircle className="h-3.5 w-3.5 text-red-400" />
    return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
  }

  function getResultBadge(result: string | undefined) {
    if (!result) return { label: 'N/A', cls: 'bg-white/10 text-gray-400 border-white/20' }
    const r = result.toLowerCase()
    if (r === 'success' || r === 'ok' || r === 'exitoso') return { label: 'Exitoso', cls: 'bg-emerald-900/30 text-emerald-600 border-emerald-800' }
    if (r === 'failed' || r === 'error' || r === 'fallido') return { label: 'Fallido', cls: 'bg-red-900/30 text-red-400 border-red-800' }
    return { label: result, cls: 'bg-amber-900/30 text-amber-400 border-amber-800' }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/configuracion')}
          className="p-2 rounded-xl hover:bg-[color:var(--neutral-100)] transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Seguridad</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Autenticacion, accesos y politicas de seguridad de tu cuenta.
          </p>
        </div>
      </div>

      {/* Auth Info Card */}
      <div className="bg-surface/75 backdrop-blur-xl rounded-2xl border border-glass-border shadow-[0_0_15px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-50">
            <Shield className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Autenticacion</h2>
            <p className="text-xs text-gray-400">Gestionada por Clerk de forma segura.</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Clerk Auth Info */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-emerald-900/10 border border-emerald-800/30">
            <Shield className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Autenticacion gestionada por Clerk</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Tu cuenta utiliza Clerk como proveedor de autenticacion. Esto incluye
                inicio de sesion seguro, gestion de sesiones, y proteccion contra ataques comunes.
              </p>
            </div>
          </div>

          {/* 2FA */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-[color:var(--neutral-50)] border border-white/[0.06]">
            <Key className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Autenticacion de dos factores (2FA)</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Agrega una capa adicional de seguridad a tu cuenta configurando 2FA desde tu perfil de Clerk.
              </p>
              <a
                href="https://clerk.com/docs/authentication/configuration/sign-up-sign-in-options#multi-factor-authentication"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                Configurar en Clerk
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Password Policy */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-[color:var(--neutral-50)] border border-white/[0.06]">
            <Lock className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Politica de contrasenas</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Las politicas de contrasena (longitud minima, complejidad, rotacion) son gestionadas
                centralmente por Clerk. Los administradores pueden configurar requisitos adicionales
                desde el panel de Clerk.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Access History */}
      <div className="bg-surface/75 backdrop-blur-xl rounded-2xl border border-glass-border shadow-[0_0_15px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10">
            <History className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Historial de accesos</h2>
            <p className="text-xs text-gray-400">Ultimos 20 eventos de autenticacion.</p>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : auditLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Accion</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">IP</th>
                    <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {auditLogs.map(entry => {
                    const badge = getResultBadge(entry.metadata?.result)
                    return (
                      <tr key={entry.id} className="hover:bg-[color:var(--neutral-50)] transition-colors">
                        <td className="py-3 px-3 text-[color:var(--text-secondary)] whitespace-nowrap text-xs">
                          {new Date(entry.createdAt).toLocaleString('es-PE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-3 text-white text-xs font-medium">{entry.action}</td>
                        <td className="py-3 px-3 text-gray-400 font-mono text-xs">{entry.metadata?.ip || '-'}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                            {getResultIcon(entry.metadata?.result)}
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-400">Sin registros de acceso</p>
              <p className="text-xs text-gray-500 mt-1">
                Los eventos de autenticacion apareceran aqui conforme se registren.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
