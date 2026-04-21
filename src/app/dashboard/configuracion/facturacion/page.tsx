'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CreditCard,
  Building2,
  Clock,
  Receipt,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Sparkles,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OrgProfile {
  name: string
  ruc: string | null
  razonSocial: string
  plan: string | null
}

interface PaymentRecord {
  id: string
  date: string
  description: string
  amount: number
  status: 'PAID' | 'PENDING' | 'FAILED'
}

const PLAN_INFO: Record<string, { name: string; price: number; features: number }> = {
  STARTER: { name: 'Starter', price: 49, features: 6 },
  EMPRESA: { name: 'Empresa', price: 149, features: 8 },
  PRO: { name: 'Pro', price: 399, features: 10 },
  FREE: { name: 'Prueba Gratuita', price: 0, features: 6 },
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'PAID':
      return { label: 'Pagado', cls: 'bg-emerald-900/30 text-emerald-600 border-emerald-800' }
    case 'PENDING':
      return { label: 'Pendiente', cls: 'bg-amber-900/30 text-amber-400 border-amber-800' }
    case 'FAILED':
      return { label: 'Fallido', cls: 'bg-red-900/30 text-red-400 border-red-800' }
    default:
      return { label: status, cls: 'bg-white/10 text-gray-400 border-white/20' }
  }
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function FacturacionConfigPage() {
  const router = useRouter()

  const [org, setOrg] = useState<OrgProfile | null>(null)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentsLoading, setPaymentsLoading] = useState(true)

  // Trial info (simulated — would come from subscription model)
  const [trialDaysRemaining] = useState<number | null>(null)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/org/profile')
      if (res.ok) {
        const data = await res.json()
        setOrg({
          name: data.org.name,
          ruc: data.org.ruc,
          razonSocial: data.org.razonSocial || data.org.name,
          plan: data.org.plan,
        })
      }
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch('/api/payments/history')
      if (res.ok) {
        const data = await res.json()
        setPayments(data.payments || [])
      }
    } catch {
      // Silent — empty state will show
    } finally {
      setPaymentsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
    fetchPayments()
  }, [fetchProfile, fetchPayments])

  const planKey = org?.plan || 'FREE'
  const planData = PLAN_INFO[planKey] || PLAN_INFO.FREE

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
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
          <h1 className="text-2xl font-bold text-white">Plan y Facturacion</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Administra tu plan actual, facturacion e historial de pagos.
          </p>
        </div>
      </div>

      {/* Trial Banner */}
      {(planKey === 'FREE' || trialDaysRemaining !== null) && (
        <div className="bg-gradient-to-r from-amber-900/30 to-amber-800/20 rounded-2xl border border-amber-700/40 p-5 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-amber-500/20">
            <Sparkles className="h-6 w-6 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-700">Periodo de prueba activo</p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              {trialDaysRemaining !== null
                ? `Te quedan ${trialDaysRemaining} dias de prueba gratuita.`
                : 'Estas en el periodo de prueba gratuita. Elige un plan para continuar sin interrupciones.'
              }
            </p>
          </div>
          <Link
            href="/dashboard/planes"
            className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
          >
            Elegir plan
          </Link>
        </div>
      )}

      {/* Current Plan Card */}
      <div className="bg-surface/75 backdrop-blur-xl rounded-2xl border border-glass-border shadow-[0_0_15px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Plan actual</h2>
            <p className="text-xs text-gray-400">Detalles de tu suscripcion.</p>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-white">{planData.name}</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 uppercase tracking-wide">
                  Activo
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                {planData.price > 0
                  ? <><span className="text-2xl font-bold text-white">S/{planData.price}</span> <span className="text-gray-500">/ mes</span></>
                  : <span className="text-lg font-semibold text-amber-400">Gratis</span>
                }
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {planData.features} funcionalidades incluidas
              </p>
            </div>

            <Link
              href="/dashboard/planes"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[color:var(--neutral-100)] hover:bg-white/[0.10] border border-white/[0.08] text-sm font-semibold text-white transition-all duration-150"
            >
              Cambiar plan
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Billing Info */}
      <div className="bg-surface/75 backdrop-blur-xl rounded-2xl border border-glass-border shadow-[0_0_15px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10">
            <Building2 className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Datos de facturacion</h2>
            <p className="text-xs text-gray-400">Informacion fiscal de tu organizacion (solo lectura).</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">RUC</label>
            <p className="text-sm text-white font-mono bg-[color:var(--neutral-100)] rounded-xl px-4 py-2.5 border border-white/[0.06]">
              {org?.ruc || 'No registrado'}
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Razon Social</label>
            <p className="text-sm text-white bg-[color:var(--neutral-100)] rounded-xl px-4 py-2.5 border border-white/[0.06]">
              {org?.razonSocial || 'No registrado'}
            </p>
          </div>
          <p className="text-xs text-gray-500">
            Para modificar estos datos, ve a Configuracion &gt; Datos de Empresa.
          </p>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-surface/75 backdrop-blur-xl rounded-2xl border border-glass-border shadow-[0_0_15px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10">
            <Receipt className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Historial de pagos</h2>
            <p className="text-xs text-gray-400">Registro de transacciones de tu cuenta.</p>
          </div>
        </div>

        <div className="p-6">
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripcion</th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Monto</th>
                    <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {payments.map(p => {
                    const badge = getStatusBadge(p.status)
                    return (
                      <tr key={p.id} className="hover:bg-[color:var(--neutral-50)] transition-colors">
                        <td className="py-3 px-3 text-[color:var(--text-secondary)] whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-gray-500" />
                            {new Date(p.date).toLocaleDateString('es-PE')}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-white">{p.description}</td>
                        <td className="py-3 px-3 text-right text-white font-mono">S/{p.amount.toFixed(2)}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>
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
              <Receipt className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-400">Sin pagos registrados</p>
              <p className="text-xs text-gray-500 mt-1">
                Cuando realices tu primer pago, aparecera aqui.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
