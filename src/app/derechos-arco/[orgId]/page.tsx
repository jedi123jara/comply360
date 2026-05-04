'use client'

import { useState, use } from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  FileText,
  Pencil,
  XCircle,
  Ban,
  Download as DownloadIcon,
} from 'lucide-react'

/**
 * Portal público ARCO — Ley 29733 + D.S. 016-2024-JUS Art. 41.
 *
 * Cualquier ciudadano puede ejercer sus derechos sobre datos personales
 * tratados por una organización registrada en COMPLY360, sin necesidad de
 * tener cuenta en la plataforma.
 *
 * Tipos de derecho (ARCO + portabilidad):
 *   - ACCESO: saber qué datos míos tiene la organización
 *   - RECTIFICACION: corregir datos incorrectos
 *   - CANCELACION: pedir borrado (con limitaciones legales)
 *   - OPOSICION: oponerse al tratamiento
 *   - PORTABILIDAD: recibir mis datos en formato estructurado
 *
 * SLA legal: 20 días hábiles para que la org responda (Art. 41 Ley 29733).
 */

type TipoARCO = 'ACCESO' | 'RECTIFICACION' | 'CANCELACION' | 'OPOSICION' | 'PORTABILIDAD'

interface TipoOption {
  value: TipoARCO
  label: string
  desc: string
  icon: typeof FileText
}

const TIPOS: TipoOption[] = [
  {
    value: 'ACCESO',
    label: 'Acceso',
    desc: 'Saber qué datos personales tiene la empresa sobre mí.',
    icon: FileText,
  },
  {
    value: 'RECTIFICACION',
    label: 'Rectificación',
    desc: 'Corregir datos personales que están incompletos o inexactos.',
    icon: Pencil,
  },
  {
    value: 'CANCELACION',
    label: 'Cancelación',
    desc: 'Pedir que borren mis datos personales (con las limitaciones legales).',
    icon: XCircle,
  },
  {
    value: 'OPOSICION',
    label: 'Oposición',
    desc: 'Oponerme al tratamiento de mis datos para fines específicos.',
    icon: Ban,
  },
  {
    value: 'PORTABILIDAD',
    label: 'Portabilidad',
    desc: 'Recibir mis datos en formato estructurado y digital.',
    icon: DownloadIcon,
  },
]

export default function ArcoPublicPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = use(params)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [trackingCode, setTrackingCode] = useState('')
  const [slaHasta, setSlaHasta] = useState('')

  const [form, setForm] = useState({
    tipo: '' as TipoARCO | '',
    solicitanteDni: '',
    solicitanteName: '',
    detalle: '',
    contactoEmail: '',
    contactoTelefono: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')

    if (!form.tipo) {
      setSubmitError('Selecciona el tipo de solicitud.')
      return
    }
    if (!form.solicitanteDni || !/^\d{8,15}$/.test(form.solicitanteDni)) {
      setSubmitError('Ingresa un DNI válido (solo números, 8 dígitos).')
      return
    }
    if (form.solicitanteName.trim().length < 3) {
      setSubmitError('Ingresa tu nombre completo.')
      return
    }
    if (form.detalle.trim().length < 20) {
      setSubmitError('Describe tu solicitud con al menos 20 caracteres.')
      return
    }
    if (
      form.contactoEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactoEmail)
    ) {
      setSubmitError('El correo electrónico ingresado no es válido.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/public/arco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          tipo: form.tipo,
          solicitanteDni: form.solicitanteDni,
          solicitanteName: form.solicitanteName.trim(),
          detalle: form.detalle.trim(),
          contactoEmail: form.contactoEmail.trim() || undefined,
          contactoTelefono: form.contactoTelefono.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || 'Error al enviar la solicitud. Intenta nuevamente.')
        return
      }
      setTrackingCode(data.code)
      setSlaHasta(data.slaHasta)
      setSubmitted(true)
    } catch {
      setSubmitError('Error de conexión. Verifica tu internet e intenta nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    const slaDate = new Date(slaHasta).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg ring-1 ring-emerald-100">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Solicitud registrada</h1>
          <p className="mt-2 text-sm text-slate-600">
            Tu solicitud ARCO ha sido recibida y será procesada por la organización.
          </p>

          <div className="mt-5 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
            <div className="text-xs font-semibold uppercase text-emerald-700 tracking-wide">
              Código de seguimiento
            </div>
            <div className="mt-1 text-lg font-bold text-emerald-900 font-mono tracking-wider">
              {trackingCode}
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            La organización tiene <strong>hasta el {slaDate}</strong> (20 días hábiles) para responderte conforme al Art. 41 de la Ley 29733.
          </div>

          <p className="mt-5 text-xs text-slate-500">
            Si no recibes respuesta en ese plazo, puedes presentar una queja ante la
            ANPDP (Autoridad Nacional de Protección de Datos Personales — MINJUS).
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Ejerce tus derechos sobre tus datos personales
          </h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            Conforme a la Ley 29733 (Protección de Datos Personales) puedes solicitar acceso, rectificación, cancelación, oposición o portabilidad de tus datos.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6 space-y-5"
        >
          {/* Tipo */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              ¿Qué derecho quieres ejercer? <span className="text-red-500">*</span>
            </label>
            <div className="grid sm:grid-cols-2 gap-2">
              {TIPOS.map((t) => {
                const Icon = t.icon
                const active = form.tipo === t.value
                return (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => setForm((f) => ({ ...f, tipo: t.value }))}
                    className={`text-left rounded-xl ring-1 p-3 transition-all ${
                      active
                        ? 'bg-emerald-50 ring-emerald-400 ring-2'
                        : 'bg-white ring-slate-200 hover:ring-emerald-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          active ? 'text-emerald-600' : 'text-slate-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 text-sm">{t.label}</div>
                        <div className="text-xs text-slate-600 leading-snug mt-0.5">{t.desc}</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Datos del solicitante */}
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-semibold text-slate-800 mb-1">
                DNI <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.solicitanteDni}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    solicitanteDni: e.target.value.replace(/\D/g, '').slice(0, 15),
                  }))
                }
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                placeholder="00000000"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-slate-800 mb-1">
                Nombre completo <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                value={form.solicitanteName}
                onChange={(e) => setForm((f) => ({ ...f, solicitanteName: e.target.value }))}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                placeholder="Apellidos y nombres"
              />
            </label>
          </div>

          {/* Detalle */}
          <label className="block">
            <span className="block text-sm font-semibold text-slate-800 mb-1">
              Describe tu solicitud <span className="text-red-500">*</span>
            </span>
            <textarea
              rows={5}
              value={form.detalle}
              onChange={(e) => setForm((f) => ({ ...f, detalle: e.target.value }))}
              required
              minLength={20}
              maxLength={4000}
              placeholder={
                form.tipo === 'ACCESO'
                  ? '¿Qué información específica quieres conocer? Ej: copia de tu legajo, registro de tratamientos, finalidad del uso, etc.'
                  : form.tipo === 'RECTIFICACION'
                  ? '¿Qué dato necesitas que corrijan? Indica el dato incorrecto y el correcto.'
                  : form.tipo === 'CANCELACION'
                  ? '¿Qué datos quieres que eliminen? Considera que algunos datos deben conservarse por obligación legal.'
                  : 'Describe tu solicitud con detalle...'
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              {form.detalle.length} / 4000 caracteres
            </p>
          </label>

          {/* Contacto opcional */}
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-semibold text-slate-800 mb-1">
                Email de contacto (opcional)
              </span>
              <input
                type="email"
                value={form.contactoEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactoEmail: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                placeholder="tu@correo.com"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-slate-800 mb-1">
                Teléfono (opcional)
              </span>
              <input
                type="tel"
                value={form.contactoTelefono}
                onChange={(e) => setForm((f) => ({ ...f, contactoTelefono: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                placeholder="+51 999 999 999"
              />
            </label>
          </div>

          {submitError && (
            <div className="rounded-lg bg-red-50 ring-1 ring-red-200 p-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Privacidad */}
          <div className="rounded-lg bg-slate-50 ring-1 ring-slate-200 p-3 text-xs text-slate-600 flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
            <div>
              Tus datos viajan cifrados extremo-a-extremo y se almacenan también cifrados (AES-256). Solo el equipo DPO de la organización podrá descifrarlos para responder tu solicitud.
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-3 transition-colors"
          >
            {submitting ? 'Enviando...' : 'Enviar solicitud'}
          </button>

          <p className="text-[11px] text-slate-500 text-center">
            Al enviar, confirmas que los datos del solicitante son verídicos. Las solicitudes fraudulentas pueden ser denunciadas ante la fiscalía.
          </p>
        </form>
      </div>
    </div>
  )
}
