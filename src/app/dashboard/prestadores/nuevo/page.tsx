'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Briefcase, AlertTriangle, ShieldCheck, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormData {
  documentType: 'DNI' | 'CE' | 'RUC' | 'PASAPORTE'
  documentNumber: string
  ruc: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  profession: string
  servicioDescripcion: string
  area: string
  startDate: string
  endDate: string
  monthlyAmount: string
  paymentFrequency: 'MONTHLY' | 'BIWEEKLY' | 'PROJECT' | 'HOURLY'
  hasSuspensionRetencion: boolean
  suspensionExpiryDate: string
  // Indicadores de riesgo
  hasFixedSchedule: boolean
  hasExclusivity: boolean
  worksOnPremises: boolean
  usesCompanyTools: boolean
  reportsToSupervisor: boolean
  receivesOrders: boolean
  notes: string
}

const INITIAL: FormData = {
  documentType: 'DNI',
  documentNumber: '',
  ruc: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  profession: '',
  servicioDescripcion: '',
  area: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  monthlyAmount: '',
  paymentFrequency: 'MONTHLY',
  hasSuspensionRetencion: false,
  suspensionExpiryDate: '',
  hasFixedSchedule: false,
  hasExclusivity: false,
  worksOnPremises: false,
  usesCompanyTools: false,
  reportsToSupervisor: false,
  receivesOrders: false,
  notes: '',
}

const RISK_INDICATORS: { key: keyof FormData; label: string; description: string; weight: number }[] = [
  {
    key: 'hasFixedSchedule',
    label: 'Tiene horario fijo impuesto',
    description: 'Le exigen ingresar y salir a horas determinadas (ej: 9am–6pm).',
    weight: 25,
  },
  {
    key: 'reportsToSupervisor',
    label: 'Reporta a un jefe directo',
    description: 'Tiene un supervisor que evalúa su desempeño.',
    weight: 20,
  },
  {
    key: 'receivesOrders',
    label: 'Recibe órdenes directas',
    description: 'Se le indica cómo y cuándo realizar el trabajo (no solo qué entregar).',
    weight: 20,
  },
  {
    key: 'hasExclusivity',
    label: 'Tiene exclusividad',
    description: 'No puede prestar servicios a otras empresas simultáneamente.',
    weight: 15,
  },
  {
    key: 'usesCompanyTools',
    label: 'Usa herramientas de la empresa',
    description: 'Laptop, software, oficina, vehículo, materiales proporcionados por la empresa.',
    weight: 10,
  },
  {
    key: 'worksOnPremises',
    label: 'Trabaja en las instalaciones',
    description: 'Asiste físicamente a la oficina/planta de la empresa.',
    weight: 10,
  },
]

export default function NuevoPrestadorPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormData>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(f => ({ ...f, [key]: value }))
  }

  // Calculo en vivo del riesgo de desnaturalizacion
  const desnaturalizacionRisk = useMemo(() => {
    let score = 0
    if (form.hasFixedSchedule) score += 25
    if (form.reportsToSupervisor) score += 20
    if (form.receivesOrders) score += 20
    if (form.hasExclusivity) score += 15
    if (form.usesCompanyTools) score += 10
    if (form.worksOnPremises) score += 10
    return Math.min(score, 100)
  }, [form])

  const riskLevel = desnaturalizacionRisk >= 60 ? 'alto' : desnaturalizacionRisk >= 30 ? 'medio' : 'bajo'
  const riskColor = {
    bajo: 'bg-green-100 text-green-700 border-green-300 bg-green-900/20 border-green-700 text-green-400',
    medio: 'bg-amber-100 text-amber-700 border-amber-300 bg-amber-900/20 border-amber-700 text-amber-400',
    alto: 'bg-red-100 text-red-700 border-red-300 bg-red-900/20 border-red-700 text-red-400',
  }[riskLevel]

  // Calculo en vivo de retencion 8%
  const monto = Number(form.monthlyAmount) || 0
  const aplicaRetencion = !form.hasSuspensionRetencion && monto > 1500
  const retencion = aplicaRetencion ? monto * 0.08 : 0
  const neto = monto - retencion

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.documentNumber || !form.firstName || !form.lastName || !form.servicioDescripcion || !form.monthlyAmount) {
      setError('Por favor completa los campos obligatorios marcados con *')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/prestadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          monthlyAmount: Number(form.monthlyAmount),
          endDate: form.endDate || null,
          suspensionExpiryDate: form.suspensionExpiryDate || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al crear el prestador')
        return
      }
      router.push(`/dashboard/prestadores/${data.data.id}`)
    } catch (err) {
      console.error(err)
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/prestadores"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-[color:var(--text-secondary)] mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a prestadores
        </Link>
        <h1 className="text-2xl font-bold text-white text-gray-100 flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-primary" />
          Nuevo prestador de servicios
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Registra un independiente que emite recibos por honorarios (4ta categoría).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos personales */}
        <section className="bg-white rounded-xl border border-white/[0.08] p-6 space-y-4">
          <h2 className="text-sm font-bold text-white text-gray-100 uppercase tracking-wide">Datos personales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Tipo documento *</label>
              <select
                value={form.documentType}
                onChange={e => set('documentType', e.target.value as FormData['documentType'])}
                className="w-full px-3 py-2 border border-white/[0.08] border-[color:var(--border-default)] rounded-lg text-sm bg-white bg-[color:var(--neutral-100)]"
              >
                <option value="DNI">DNI</option>
                <option value="CE">Carnet Ext.</option>
                <option value="RUC">RUC</option>
                <option value="PASAPORTE">Pasaporte</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Número de documento *</label>
              <input
                type="text"
                value={form.documentNumber}
                onChange={e => set('documentNumber', e.target.value.replace(/\D/g, '').slice(0, 11))}
                className="w-full px-3 py-2 border border-white/[0.08] border-[color:var(--border-default)] rounded-lg text-sm bg-white bg-[color:var(--neutral-100)]"
                placeholder="12345678"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Nombres *</label>
              <input
                type="text"
                value={form.firstName}
                onChange={e => set('firstName', e.target.value)}
                className="w-full px-3 py-2 border border-white/[0.08] border-[color:var(--border-default)] rounded-lg text-sm bg-white bg-[color:var(--neutral-100)]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Apellidos *</label>
              <input
                type="text"
                value={form.lastName}
                onChange={e => set('lastName', e.target.value)}
                className="w-full px-3 py-2 border border-white/[0.08] border-[color:var(--border-default)] rounded-lg text-sm bg-white bg-[color:var(--neutral-100)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">RUC (si tiene)</label>
              <input
                type="text"
                value={form.ruc}
                onChange={e => set('ruc', e.target.value.replace(/\D/g, '').slice(0, 11))}
                className="w-full px-3 py-2 border border-white/[0.08] border-[color:var(--border-default)] rounded-lg text-sm bg-white bg-[color:var(--neutral-100)]"
                placeholder="10XXXXXXXXX"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="w-full px-3 py-2 border border-white/[0.08] border-[color:var(--border-default)] rounded-lg text-sm bg-white bg-[color:var(--neutral-100)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Teléfono</label>
              <input
                type="text"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className="w-full px-3 py-2 border border-white/[0.08] border-[color:var(--border-default)] rounded-lg text-sm bg-white bg-[color:var(--neutral-100)]"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Dirección</label>
              <input
                type="text"
                value={form.address}
                onChange={e => set('address', e.target.value)}
                className="w-full px-3 py-2 border border-white/[0.08] border-[color:var(--border-default)] rounded-lg text-sm bg-white bg-[color:var(--neutral-100)]"
              />
            </div>
          </div>
        </section>

        {/* Servicio */}
        <section className="bg-white rounded-xl border border-white/[0.08] p-6 space-y-4">
          <h2 className="text-sm font-bold text-white text-gray-100 uppercase tracking-wide">Servicio contratado</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Profesión</label>
              <input
                type="text"
                value={form.profession}
                onChange={e => set('profession', e.target.value)}
                className="w-full px-3 py-2 border border-white/[0.08] border-[color:var(--border-default)] rounded-lg text-sm bg-white bg-[color:var(--neutral-100)]"
                placeholder="Contador, Diseñador, Ingeniero..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Área</label>
              <input
                type="text"
                value={form.area}
                onChange={e => set('area', e.target.value)}
                className="w-full px-3 py-2 border border-white/[0.08] border-[color:var(--border-default)] rounded-lg text-sm bg-white bg-[color:var(--neutral-100)]"
                placeholder="Contabilidad, Marketing, TI..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Descripción del servicio *</label>
              <textarea
                value={form.servicioDescripcion}
                onChange={e => set('servicioDescripcion', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-white/[0.08] border-[color:var(--border-default)] rounded-lg text-sm bg-white bg-[color:var(--neutral-100)]"
                placeholder="Describe brevemente el servicio prestado..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Fecha inicio *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-white/[0.08] border-[color:var(--border-default)] rounded-lg text-sm bg-white bg-[color:var(--neutral-100)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Fecha fin (opcional)</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => set('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-white/[0.08] border-[color:var(--border-default)] rounded-lg text-sm bg-white bg-[color:var(--neutral-100)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Monto mensual (S/) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.monthlyAmount}
                onChange={e => set('monthlyAmount', e.target.value)}
                className="w-full px-3 py-2 border border-white/[0.08] border-[color:var(--border-default)] rounded-lg text-sm bg-white bg-[color:var(--neutral-100)]"
                placeholder="2500.00"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Frecuencia pago</label>
              <select
                value={form.paymentFrequency}
                onChange={e => set('paymentFrequency', e.target.value as FormData['paymentFrequency'])}
                className="w-full px-3 py-2 border border-white/[0.08] border-[color:var(--border-default)] rounded-lg text-sm bg-white bg-[color:var(--neutral-100)]"
              >
                <option value="MONTHLY">Mensual</option>
                <option value="BIWEEKLY">Quincenal</option>
                <option value="PROJECT">Por proyecto</option>
                <option value="HOURLY">Por hora</option>
              </select>
            </div>
          </div>

          {/* Calculo en vivo de retencion */}
          {monto > 0 && (
            <div className={cn('rounded-lg border p-4 text-xs', aplicaRetencion ? 'bg-amber-50 border-amber-200 bg-amber-900/20 border-amber-700' : 'bg-blue-50 border-blue-200 bg-blue-900/20 border-blue-700')}>
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold mb-1">
                    {aplicaRetencion ? 'Aplica retención 8% IR 4ta categoría' : form.hasSuspensionRetencion ? 'Con constancia de suspensión SUNAT' : 'No aplica retención'}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>Bruto: <span className="font-bold">S/ {monto.toFixed(2)}</span></div>
                    <div>Retención: <span className="font-bold">S/ {retencion.toFixed(2)}</span></div>
                    <div>Neto: <span className="font-bold">S/ {neto.toFixed(2)}</span></div>
                  </div>
                  <p className="mt-1 text-[11px] opacity-75">
                    Base: Art. 74° TUO LIR. Se aplica si el monto excede S/ 1,500/mes y el prestador no tiene constancia vigente de suspensión.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Retencion / Suspension */}
        <section className="bg-white rounded-xl border border-white/[0.08] p-6 space-y-4">
          <h2 className="text-sm font-bold text-white text-gray-100 uppercase tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Constancia de suspensión SUNAT
          </h2>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.hasSuspensionRetencion}
              onChange={e => set('hasSuspensionRetencion', e.target.checked)}
              className="mt-1 w-4 h-4"
            />
            <div className="flex-1">
              <span className="text-sm font-semibold text-white text-gray-100">El prestador tiene constancia de suspensión vigente</span>
              <p className="text-xs text-gray-400 mt-0.5">
                Con constancia vigente NO se aplica retención del 8%. La constancia vence el 31 de diciembre de cada año.
              </p>
            </div>
          </label>
          {form.hasSuspensionRetencion && (
            <div className="pl-7">
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Fecha de vencimiento constancia</label>
              <input
                type="date"
                value={form.suspensionExpiryDate}
                onChange={e => set('suspensionExpiryDate', e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-white/[0.08] border-[color:var(--border-default)] rounded-lg text-sm bg-white bg-[color:var(--neutral-100)]"
              />
            </div>
          )}
        </section>

        {/* Riesgo de desnaturalizacion */}
        <section className="bg-white rounded-xl border border-white/[0.08] p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-white text-gray-100 uppercase tracking-wide flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Evaluación de desnaturalización
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Marca los indicadores que aplican. Si hay subordinación real, SUNAFIL puede reclasificar a 5ta categoría (principio de primacía de la realidad).
              </p>
            </div>
            <div className={cn('rounded-lg border px-3 py-2 text-center shrink-0', riskColor)}>
              <p className="text-[10px] uppercase font-bold">Riesgo</p>
              <p className="text-2xl font-bold leading-none">{desnaturalizacionRisk}%</p>
              <p className="text-[10px] uppercase font-bold mt-1">{riskLevel.toUpperCase()}</p>
            </div>
          </div>

          <div className="space-y-2">
            {RISK_INDICATORS.map(ind => (
              <label
                key={ind.key}
                className="flex items-start gap-3 p-3 rounded-lg border border-white/[0.08] border-[color:var(--border-default)] hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)]/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={form[ind.key] as boolean}
                  onChange={e => set(ind.key, e.target.checked as FormData[typeof ind.key])}
                  className="mt-0.5 w-4 h-4"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white text-gray-100">{ind.label}</span>
                    <span className="text-[10px] font-bold text-gray-400">+{ind.weight}%</span>
                  </div>
                  <p className="text-xs text-gray-400">{ind.description}</p>
                </div>
              </label>
            ))}
          </div>

          {desnaturalizacionRisk >= 60 && (
            <div className="rounded-lg bg-red-900/20 border border-red-700 p-3">
              <p className="text-xs font-bold text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> RIESGO ALTO DE RECLASIFICACIÓN
              </p>
              <p className="text-xs text-red-400 mt-1">
                Esta relación presenta múltiples elementos de subordinación. SUNAFIL podría reclasificar a trabajador de 5ta categoría,
                exigiendo pagar CTS, gratificaciones, vacaciones y asignación familiar retroactivos, más multas. Considera contratarlo como trabajador de planilla.
              </p>
            </div>
          )}
        </section>

        {/* Notas */}
        <section className="bg-white rounded-xl border border-white/[0.08] p-6">
          <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Notas internas</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-white/[0.08] border-[color:var(--border-default)] rounded-lg text-sm bg-white bg-[color:var(--neutral-100)]"
            placeholder="Observaciones adicionales..."
          />
        </section>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/dashboard/prestadores"
            className="px-4 py-2 text-sm font-semibold text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-100)] rounded-lg"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Crear prestador
          </button>
        </div>
      </form>
    </div>
  )
}
