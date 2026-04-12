'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react'

const REQUEST_TYPES = [
  { value: 'VACACIONES', label: 'Vacaciones', requiresDates: true },
  { value: 'PERMISO', label: 'Permiso', requiresDates: true },
  { value: 'LICENCIA_MEDICA', label: 'Licencia médica', requiresDates: true },
  { value: 'LICENCIA_MATERNIDAD', label: 'Licencia maternidad', requiresDates: true },
  { value: 'LICENCIA_PATERNIDAD', label: 'Licencia paternidad', requiresDates: true },
  { value: 'ADELANTO_SUELDO', label: 'Adelanto de sueldo', requiresAmount: true },
  { value: 'CTS_RETIRO_PARCIAL', label: 'Retiro parcial CTS (hasta 100% del exceso de 4 sueldos)', requiresAmount: true },
  { value: 'CONSTANCIA_TRABAJO', label: 'Constancia de trabajo', requiresDates: false },
  { value: 'CERTIFICADO_5TA', label: 'Certificado de 5ta categoría', requiresDates: false },
  { value: 'ACTUALIZAR_DATOS', label: 'Actualizar mis datos', requiresDates: false },
  { value: 'OTRO', label: 'Otra solicitud', requiresDates: false },
]

export default function NuevaSolicitudPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    type: 'VACACIONES',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    amount: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const selectedType = REQUEST_TYPES.find((t) => t.value === form.type)!

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      const body: Record<string, unknown> = {
        type: form.type,
        title: form.title || `Solicitud de ${selectedType.label}`,
        description: form.description || null,
      }
      if (selectedType.requiresDates) {
        body.startDate = form.startDate
        body.endDate = form.endDate
      }
      if (selectedType.requiresAmount) {
        body.amount = parseFloat(form.amount)
      }
      const res = await fetch('/api/mi-portal/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al enviar')
      }
      setMessage({ type: 'success', text: 'Solicitud enviada. RRHH la revisara pronto.' })
      setTimeout(() => router.push('/mi-portal/solicitudes'), 1500)
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/mi-portal/solicitudes"
          className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a mis solicitudes
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Nueva solicitud</h2>
      </div>

      {message && (
        <div className={`flex items-start gap-3 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[#141824] border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de solicitud</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {REQUEST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Titulo</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={`Solicitud de ${selectedType.label}`}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            maxLength={120}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Descripción / Motivo</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            placeholder="Explica brevemente el motivo de tu solicitud..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            maxLength={1000}
          />
        </div>

        {selectedType.requiresDates && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha inicio</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha fin</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        )}

        {selectedType.requiresAmount && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto solicitado (S/)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {submitting ? 'Enviando...' : 'Enviar solicitud'}
        </button>
      </form>
    </div>
  )
}
