'use client'

import { useState, use } from 'react'
import { ShieldAlert, CheckCircle2, Scale, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

type ComplaintType = 'HOSTIGAMIENTO_SEXUAL' | 'DISCRIMINACION' | 'ACOSO_LABORAL' | 'OTRO'

const COMPLAINT_TYPES: { value: ComplaintType; label: string; desc: string }[] = [
  { value: 'HOSTIGAMIENTO_SEXUAL', label: 'Hostigamiento Sexual', desc: 'Conductas de naturaleza sexual no deseadas (Ley 27942)' },
  { value: 'DISCRIMINACION', label: 'Discriminacion', desc: 'Trato desigual por genero, edad, origen, discapacidad, etc.' },
  { value: 'ACOSO_LABORAL', label: 'Acoso Laboral', desc: 'Conductas hostiles, humillantes o intimidatorias reiteradas' },
  { value: 'OTRO', label: 'Otro', desc: 'Otra conducta que afecte derechos laborales' },
]

export default function DenunciaPublicaPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = use(params)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [code, setCode] = useState('')
  const [form, setForm] = useState({
    type: '' as ComplaintType | '',
    isAnonymous: true,
    reporterName: '',
    reporterEmail: '',
    reporterPhone: '',
    accusedName: '',
    accusedPosition: '',
    description: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')

    if (!form.type) {
      setSubmitError('Debes seleccionar el tipo de conducta.')
      return
    }
    if (!form.description || form.description.trim().length < 20) {
      setSubmitError('La descripción debe tener al menos 20 caracteres.')
      return
    }
    if (!form.isAnonymous && form.reporterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporterEmail)) {
      setSubmitError('El correo electrónico ingresado no es válido.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: orgSlug,
          type: form.type,
          description: form.description.trim(),
          isAnonymous: form.isAnonymous,
          reporterName: form.reporterName.trim() || undefined,
          reporterEmail: form.reporterEmail.trim() || undefined,
          reporterPhone: form.reporterPhone.trim() || undefined,
          accusedName: form.accusedName.trim() || undefined,
          accusedPosition: form.accusedPosition.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || 'Error al enviar la denuncia. Intente nuevamente.')
      } else if (data.code) {
        setCode(data.code)
        setSubmitted(true)
      } else {
        setSubmitError('Error al enviar la denuncia. Intente nuevamente.')
      }
    } catch {
      setSubmitError('Error de conexión. Verifique su internet e intente nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="mt-4 text-xl font-bold text-gray-900">Denuncia Recibida</h1>
          <p className="mt-2 text-sm text-gray-500">Tu denuncia ha sido registrada exitosamente.</p>
          <div className="mt-4 rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Codigo de seguimiento:</p>
            <p className="text-lg font-bold text-primary">{code}</p>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Guarda este codigo para dar seguimiento a tu denuncia.
            La empresa tiene un plazo de 3 dias habiles para aplicar medidas de proteccion
            y 30 dias para concluir la investigacion (D.S. 014-2019-MIMP).
          </p>
          <div className="mt-4 flex items-center justify-center gap-1 text-xs text-gray-400">
            <Lock className="h-3 w-3" /> Tu informacion esta protegida
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-xl">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
            <ShieldAlert className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Canal de Denuncias</h1>
          <p className="mt-1 text-sm text-gray-500">
            Este formulario es confidencial y puede ser anonimo.
            Tu denuncia sera atendida conforme a la Ley 27942 y D.S. 014-2019-MIMP.
          </p>
        </div>

        {/* Protections notice */}
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <h3 className="text-sm font-semibold text-green-800">Protecciones legales</h3>
          <ul className="mt-1 space-y-1 text-xs text-green-700">
            <li>- Esta prohibido tomar represalias contra el denunciante (Art. 8 Ley 27942)</li>
            <li>- El empleador debe aplicar medidas de proteccion en 3 dias habiles</li>
            <li>- La investigacion debe concluir en maximo 30 dias calendario</li>
            <li>- Puedes denunciar de forma anonima</li>
          </ul>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-6 rounded-xl bg-white p-6 shadow-sm">
          {/* Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-900">Tipo de conducta *</label>
            <div className="mt-2 space-y-2">
              {COMPLAINT_TYPES.map(ct => (
                <button
                  type="button"
                  key={ct.value}
                  onClick={() => setForm(p => ({ ...p, type: ct.value }))}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all',
                    form.type === ct.value ? 'border-primary bg-primary/5' : 'hover:bg-gray-50'
                  )}
                >
                  <Scale className={cn('mt-0.5 h-4 w-4 shrink-0', form.type === ct.value ? 'text-primary' : 'text-gray-400')} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ct.label}</p>
                    <p className="text-xs text-gray-500">{ct.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Anonymous toggle */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-anonymous"
                name="isAnonymous"
                checked={form.isAnonymous}
                onChange={e => setForm(p => ({ ...p, isAnonymous: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary"
              />
              <span className="text-sm font-medium text-gray-700">Denuncia anonima</span>
            </label>
            <p className="mt-1 ml-6 text-xs text-gray-400">Si deseas, puedes identificarte para facilitar la investigacion</p>
          </div>

          {/* Reporter info (if not anonymous) */}
          {!form.isAnonymous && (
            <div className="space-y-3 rounded-lg bg-gray-50 p-4">
              <h4 className="text-sm font-medium text-gray-700">Datos del denunciante (opcional)</h4>
              <input id="reporter-name" name="reporterName" type="text" placeholder="Nombre completo" value={form.reporterName} onChange={e => setForm(p => ({ ...p, reporterName: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
              <input id="reporter-email" name="reporterEmail" type="email" placeholder="Correo electronico" value={form.reporterEmail} onChange={e => setForm(p => ({ ...p, reporterEmail: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
              <input id="reporter-phone" name="reporterPhone" type="tel" placeholder="Telefono" value={form.reporterPhone} onChange={e => setForm(p => ({ ...p, reporterPhone: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
          )}

          {/* Accused */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Persona denunciada</h4>
            <input id="accused-name" name="accusedName" type="text" placeholder="Nombre (si lo conoce)" value={form.accusedName} onChange={e => setForm(p => ({ ...p, accusedName: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
            <input id="accused-position" name="accusedPosition" type="text" placeholder="Cargo o posicion" value={form.accusedPosition} onChange={e => setForm(p => ({ ...p, accusedPosition: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900">Descripcion de los hechos *</label>
            <p className="text-xs text-gray-400">Describe con el mayor detalle posible qué sucedió, cuándo, dónde y cómo (mínimo 20 caracteres)</p>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={5}
              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Describe los hechos..."
              minLength={20}
              required
            />
          </div>

          {submitError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!form.type || !form.description || submitting}
            className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? 'Enviando...' : 'Enviar Denuncia'}
          </button>

          <p className="text-center text-[10px] text-gray-400">
            Al enviar, aceptas que la informacion sera tratada confidencialmente conforme a la Ley 27942 y D.S. 014-2019-MIMP.
          </p>
        </form>
      </div>
    </div>
  )
}
