'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Briefcase, Mail, Phone, MapPin, Calendar, DollarSign, AlertTriangle, ShieldCheck, Receipt, Trash2, FileText, Info } from 'lucide-react'
import { toast } from 'sonner'
import { cn, displayWorkerName } from '@/lib/utils'
import { confirm } from '@/components/ui/confirm-dialog'

interface RhInvoice {
  id: string
  invoiceNumber: string
  issueDate: string
  periodo: string
  grossAmount: number
  retention: number
  netAmount: number
  hasRetention: boolean
  status: string
  paidAt: string | null
}

interface Provider {
  id: string
  documentType: string
  documentNumber: string
  ruc: string | null
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  address: string | null
  profession: string | null
  servicioDescripcion: string
  area: string | null
  startDate: string
  endDate: string | null
  monthlyAmount: number
  currency: string
  paymentFrequency: string
  hasSuspensionRetencion: boolean
  suspensionExpiryDate: string | null
  hasFixedSchedule: boolean
  hasExclusivity: boolean
  worksOnPremises: boolean
  usesCompanyTools: boolean
  reportsToSupervisor: boolean
  receivesOrders: boolean
  desnaturalizacionRisk: number
  status: string
  notes: string | null
  createdAt: string
  rhInvoices: RhInvoice[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Activo', color: 'bg-green-100 text-green-700 bg-green-900/30 text-green-400' },
  INACTIVE: { label: 'Inactivo', color: 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)]' },
  TERMINATED: { label: 'Finalizado', color: 'bg-slate-100 text-slate-700' },
  AT_RISK: { label: 'Riesgo alto', color: 'bg-red-100 text-red-700 bg-red-900/30 text-red-400' },
}

export default function PrestadorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [provider, setProvider] = useState<Provider | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'info' | 'riesgo' | 'recibos'>('info')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/prestadores/${id}`)
      .then(res => res.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setProvider(d.data)
      })
      .catch(err => {
        console.error(err)
        setError('Error al cargar el prestador')
      })
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    const ok = await confirm({
      title: '¿Marcar este prestador como finalizado?',
      description: 'No se eliminan los registros históricos de recibos ni contratos. El prestador queda archivado.',
      confirmLabel: 'Finalizar prestador',
      tone: 'warn',
    })
    if (!ok) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/prestadores/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Prestador finalizado')
        router.push('/dashboard/prestadores')
      } else {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error ?? 'Error al finalizar el prestador')
      }
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  if (error || !provider) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-sm font-semibold text-[color:var(--text-secondary)]">{error ?? 'Prestador no encontrado'}</p>
        <Link href="/dashboard/prestadores" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Volver a prestadores
        </Link>
      </div>
    )
  }

  const status = STATUS_CONFIG[provider.status] ?? STATUS_CONFIG.ACTIVE
  const riskColor = provider.desnaturalizacionRisk >= 60 ? 'red' : provider.desnaturalizacionRisk >= 30 ? 'amber' : 'green'
  const riskBg = {
    green: 'bg-green-100 text-green-700 bg-green-900/30 text-green-400',
    amber: 'bg-amber-100 text-amber-700 bg-amber-900/30 text-amber-400',
    red: 'bg-red-100 text-red-700 bg-red-900/30 text-red-400',
  }[riskColor]

  const aplicaRetencion = !provider.hasSuspensionRetencion && provider.monthlyAmount > 1500
  const retencion = aplicaRetencion ? provider.monthlyAmount * 0.08 : 0

  const totalFacturado = provider.rhInvoices.reduce((acc, i) => acc + i.grossAmount, 0)
  const totalRetenido = provider.rhInvoices.reduce((acc, i) => acc + i.retention, 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/prestadores"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-[color:var(--text-secondary)] mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a prestadores
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white text-gray-100 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-primary" />
              {displayWorkerName(provider.firstName, provider.lastName)}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={cn('text-xs font-semibold px-2 py-1 rounded-full', status.color)}>
                {status.label}
              </span>
              <span className="text-xs text-gray-400">
                {provider.documentType} {provider.documentNumber}
              </span>
              {provider.ruc && (
                <span className="text-xs text-gray-400">· RUC {provider.ruc}</span>
              )}
              {provider.profession && (
                <span className="text-xs text-gray-400">· {provider.profession}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || provider.status === 'TERMINATED'}
              className="inline-flex items-center gap-1 px-3 py-2 border border-red-700 text-red-400 rounded-lg text-sm font-semibold hover:bg-red-900/20 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {provider.status === 'TERMINATED' ? 'Finalizado' : 'Finalizar'}
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-white/[0.08] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase">Monto mensual</span>
            <DollarSign className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-xl font-bold text-white text-gray-100 mt-2">
            S/ {provider.monthlyAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-white/[0.08] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase">Retención 8%</span>
            <Receipt className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-xl font-bold text-white text-gray-100 mt-2">
            {aplicaRetencion ? `S/ ${retencion.toFixed(2)}` : '—'}
          </p>
          <p className="text-[10px] text-gray-400">
            {provider.hasSuspensionRetencion ? 'Con suspensión' : aplicaRetencion ? 'Aplica' : 'No aplica'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-white/[0.08] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase">Riesgo reclasif.</span>
            <AlertTriangle className="w-4 h-4 text-gray-400" />
          </div>
          <p className={cn('text-xl font-bold mt-2', `text-${riskColor}-600 text-${riskColor}-400`)}>
            {provider.desnaturalizacionRisk}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-white/[0.08] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase">Recibos emitidos</span>
            <FileText className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-xl font-bold text-white text-gray-100 mt-2">{provider.rhInvoices.length}</p>
          <p className="text-[10px] text-gray-400">
            Total: S/ {totalFacturado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-white/[0.08] overflow-hidden">
        <div className="border-b border-white/[0.08] px-4 flex gap-1">
          {[
            { key: 'info' as const, label: 'Información' },
            { key: 'riesgo' as const, label: 'Riesgo de reclasificación' },
            { key: 'recibos' as const, label: `Recibos (${provider.rhInvoices.length})` },
          ].map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'px-4 py-3 text-sm font-semibold border-b-2 transition-colors',
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-[color:var(--text-secondary)]'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'info' && (
            <div className="space-y-6">
              {/* Contacto */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Contacto</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-[color:var(--text-secondary)]">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {provider.email ?? <span className="text-gray-400">Sin email</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[color:var(--text-secondary)]">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {provider.phone ?? <span className="text-gray-400">Sin teléfono</span>}
                  </div>
                  {provider.address && (
                    <div className="sm:col-span-2 flex items-start gap-2 text-[color:var(--text-secondary)]">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      {provider.address}
                    </div>
                  )}
                </div>
              </div>

              {/* Servicio */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Servicio contratado</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-white text-gray-100">{provider.servicioDescripcion}</p>
                  {provider.area && (
                    <p className="text-xs text-gray-400">Área: {provider.area}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-400 pt-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Inicio: {new Date(provider.startDate).toLocaleDateString('es-PE')}
                    </div>
                    {provider.endDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Fin: {new Date(provider.endDate).toLocaleDateString('es-PE')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Retencion */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Retención de 4ta categoría</h3>
                {provider.hasSuspensionRetencion ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Constancia de suspensión vigente</span>
                    {provider.suspensionExpiryDate && (
                      <span className="text-xs text-gray-500">
                        (vence {new Date(provider.suspensionExpiryDate).toLocaleDateString('es-PE')})
                      </span>
                    )}
                  </div>
                ) : aplicaRetencion ? (
                  <div className="rounded-lg bg-amber-900/20 border border-amber-700 p-3 text-xs">
                    <p className="font-semibold text-amber-400">Aplica retención 8% IR 4ta categoría</p>
                    <p className="text-amber-400 mt-1">
                      Se debe retener S/ {retencion.toFixed(2)} de cada pago mensual. Neto a pagar: S/ {(provider.monthlyAmount - retencion).toFixed(2)}.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No aplica retención (monto ≤ S/ 1,500)</p>
                )}
              </div>

              {provider.notes && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Notas internas</h3>
                  <p className="text-sm text-[color:var(--text-secondary)] whitespace-pre-wrap">{provider.notes}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'riesgo' && (
            <div className="space-y-4">
              <div className={cn('rounded-xl border p-4', riskBg)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase">Nivel de riesgo</p>
                    <p className="text-3xl font-bold mt-1">{provider.desnaturalizacionRisk}%</p>
                    <p className="text-xs font-semibold mt-1">
                      {provider.desnaturalizacionRisk >= 60 ? 'ALTO' : provider.desnaturalizacionRisk >= 30 ? 'MEDIO' : 'BAJO'}
                    </p>
                  </div>
                  <AlertTriangle className="w-12 h-12 opacity-50" />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Indicadores presentes</h3>
                <ul className="space-y-2 text-sm">
                  {[
                    { key: 'hasFixedSchedule' as const, label: 'Horario fijo impuesto', weight: 25 },
                    { key: 'reportsToSupervisor' as const, label: 'Reporta a jefe directo', weight: 20 },
                    { key: 'receivesOrders' as const, label: 'Recibe órdenes directas', weight: 20 },
                    { key: 'hasExclusivity' as const, label: 'Exclusividad', weight: 15 },
                    { key: 'usesCompanyTools' as const, label: 'Usa herramientas de la empresa', weight: 10 },
                    { key: 'worksOnPremises' as const, label: 'Trabaja en instalaciones', weight: 10 },
                  ].map(ind => (
                    <li
                      key={ind.key}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-lg border',
                        provider[ind.key]
                          ? 'bg-red-50 border-red-200 bg-red-900/20 border-red-700 text-red-400'
                          : 'bg-[color:var(--neutral-50)] border-white/[0.08] bg-[color:var(--neutral-100)]/30 border-[color:var(--border-default)] text-gray-400'
                      )}
                    >
                      <span className="font-semibold">{ind.label}</span>
                      <span className="text-xs font-bold">{provider[ind.key] ? `+${ind.weight}%` : 'No'}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {provider.desnaturalizacionRisk >= 60 && (
                <div className="rounded-lg bg-red-900/20 border border-red-700 p-4">
                  <p className="text-sm font-bold text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Recomendación
                  </p>
                  <p className="text-xs text-red-400 mt-2">
                    Considera formalizar la relación como contrato de trabajo (5ta categoría). Si SUNAFIL detecta estos
                    indicadores, puede ordenar el pago retroactivo de CTS, gratificaciones, vacaciones y asignación
                    familiar, más multas administrativas.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === 'recibos' && (
            <div>
              {provider.rhInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 text-[color:var(--text-secondary)] mx-auto mb-3" />
                  <p className="text-sm font-semibold text-[color:var(--text-secondary)]">Sin recibos registrados</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Registra el primer recibo por honorarios del prestador.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)]/50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Recibo</th>
                        <th className="text-left px-3 py-2 font-semibold">Período</th>
                        <th className="text-left px-3 py-2 font-semibold">Bruto</th>
                        <th className="text-left px-3 py-2 font-semibold">Retención</th>
                        <th className="text-left px-3 py-2 font-semibold">Neto</th>
                        <th className="text-left px-3 py-2 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 divide-slate-700">
                      {provider.rhInvoices.map(inv => (
                        <tr key={inv.id}>
                          <td className="px-3 py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                          <td className="px-3 py-2">{inv.periodo}</td>
                          <td className="px-3 py-2">S/ {inv.grossAmount.toFixed(2)}</td>
                          <td className="px-3 py-2">S/ {inv.retention.toFixed(2)}</td>
                          <td className="px-3 py-2 font-semibold">S/ {inv.netAmount.toFixed(2)}</td>
                          <td className="px-3 py-2">
                            <span className={cn(
                              'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                              inv.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            )}>
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-white/[0.08] border-[color:var(--border-default)]">
                      <tr className="font-bold">
                        <td className="px-3 py-2" colSpan={2}>Total</td>
                        <td className="px-3 py-2">S/ {totalFacturado.toFixed(2)}</td>
                        <td className="px-3 py-2">S/ {totalRetenido.toFixed(2)}</td>
                        <td className="px-3 py-2">S/ {(totalFacturado - totalRetenido).toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              <div className="mt-4 rounded-lg bg-blue-900/20 border border-blue-700 p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-600">
                  <strong>Próximamente:</strong> registro de recibos por honorarios con carga de PDF e integración con SUNAT.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
