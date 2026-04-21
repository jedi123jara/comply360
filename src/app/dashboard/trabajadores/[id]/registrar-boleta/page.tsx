'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, DollarSign, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

export default function RegistrarBoletaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const now = new Date()
  const defaultPeriodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [periodo, setPeriodo] = useState(defaultPeriodo)
  const [horasExtras, setHorasExtras] = useState('')
  const [bonificaciones, setBonificaciones] = useState('')
  const [incluirGratificacion, setIncluirGratificacion] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/workers/${id}/payslips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodo,
          horasExtras: horasExtras ? parseFloat(horasExtras) : undefined,
          bonificaciones: bonificaciones ? parseFloat(bonificaciones) : undefined,
          incluirGratificacion,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al registrar boleta')
      setSuccess(true)
      setTimeout(() => router.push(`/dashboard/trabajadores/${id}`), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  const periodoLabel = (() => {
    const [y, m] = periodo.split('-')
    const months = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return `${months[parseInt(m ?? '0')] ?? m} ${y}`
  })()

  // Show gratificacion toggle only in Jun/Jul or Nov/Dec
  const month = parseInt(periodo.split('-')[1] ?? '0')
  const showGratToggle = month === 6 || month === 7 || month === 11 || month === 12

  if (success) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Boleta registrada</h2>
        <p className="text-gray-400">Periodo: {periodoLabel}</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/trabajadores/${id}`}
          className="p-2 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Registrar Boleta de Pago</h1>
          <p className="text-sm text-gray-400">El sueldo bruto y descuentos se calculan automaticamente</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-800 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl border border-white/[0.08] p-6">
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5">Periodo *</label>
          <input
            type="month"
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-white/[0.08] bg-[color:var(--neutral-100)] text-white rounded-xl focus:ring-2 focus:ring-primary/20 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">{periodoLabel}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5">Horas extras (S/)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={horasExtras}
            onChange={e => setHorasExtras(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-2.5 border border-white/[0.08] bg-[color:var(--neutral-100)] text-white rounded-xl focus:ring-2 focus:ring-primary/20 text-sm placeholder-gray-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5">Bonificaciones (S/)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={bonificaciones}
            onChange={e => setBonificaciones(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-2.5 border border-white/[0.08] bg-[color:var(--neutral-100)] text-white rounded-xl focus:ring-2 focus:ring-primary/20 text-sm placeholder-gray-500"
          />
        </div>

        {showGratToggle && (
          <label className="flex items-center justify-between p-4 bg-amber-900/10 border border-amber-800/30 rounded-xl cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-amber-700">Incluir gratificacion</span>
              <p className="text-xs text-amber-400/70 mt-0.5">
                {month <= 7 ? 'Gratificacion Fiestas Patrias (julio)' : 'Gratificacion Navidad (diciembre)'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={incluirGratificacion}
              onChange={e => setIncluirGratificacion(e.target.checked)}
              className="w-5 h-5 rounded border-amber-600 bg-[color:var(--neutral-100)] text-amber-500 focus:ring-amber-500/30"
            />
          </label>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving || !periodo}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
            Generar boleta para {periodoLabel}
          </button>
        </div>
      </form>

      <p className="text-xs text-gray-500 text-center">
        El sistema usa el sueldo bruto, asignacion familiar, regimen y tipo de aporte del trabajador para calcular automaticamente ingresos, descuentos y neto a pagar.
      </p>
    </div>
  )
}
