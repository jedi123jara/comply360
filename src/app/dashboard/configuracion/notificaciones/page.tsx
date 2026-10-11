'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Mail, Clock, ArrowLeft, Loader2, Save, Info } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

// ─── Qué se envía hoy (refleja los crons reales) ──────────────────────────────
//
// Antes esta pantalla mostraba interruptores por tipo de alerta y una frecuencia
// (inmediata / diaria / semanal) que NO se guardaban: el servidor los ignoraba.
// Ahora describimos lo que de verdad pasa y solo dejamos editable el correo,
// que sí se guarda (Organization.alertEmail). Fuentes:
//   - /api/cron/daily-alerts  → todos los días 8:00 a. m. (Lima), solo si hay pendientes
//   - /api/cron/weekly-digest → lunes 8:00 a. m. (Lima)

const DAILY_ALERT_TOPICS = [
  'Contratos que vencen en los próximos 7 días',
  'Registros de SST vencidos (exámenes, capacitaciones, etc.)',
  'Depósito de CTS cuando se acerca la fecha límite (15 de mayo y 15 de noviembre)',
  'Plazos de las denuncias que estás atendiendo',
]

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function NotificacionesConfigPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Fetch current org profile for alertEmail
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/org/profile')
      if (res.ok) {
        const data = await res.json()
        if (data.alertEmail) setEmail(data.alertEmail)
      }
    } catch {
      // Silencioso: se muestra el campo vacío
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      fetchProfile()
    })
    return () => {
      cancelled = true
    }
  }, [fetchProfile])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/org/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertEmail: email.trim() }),
      })

      if (!res.ok) throw new Error('Error al guardar')

      toast({ title: 'Correo guardado', description: 'Las alertas llegarán a este correo.', type: 'success' })
    } catch {
      toast({ title: 'No se pudo guardar', description: 'Revisa tu conexión e inténtalo de nuevo.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

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
          aria-label="Volver a Configuración"
          className="p-2 rounded-xl hover:bg-[color:var(--neutral-100)] transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Notificaciones</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Elige a qué correo llegan las alertas de tu empresa y revisa qué te enviamos.
          </p>
        </div>
      </div>

      {/* Email destinatario (lo único editable: sí se guarda) */}
      <div className="bg-surface/75 backdrop-blur-xl rounded-2xl border border-glass-border shadow-[0_0_15px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-50">
            <Mail className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Correo para alertas</h2>
            <p className="text-xs text-gray-400">Aquí llegan los avisos de vencimientos de tu empresa.</p>
          </div>
        </div>

        <div className="p-6">
          <label htmlFor="alert-email" className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
            Correo electrónico
          </label>
          <input
            id="alert-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alertas@miempresa.com"
            className="w-full rounded-xl border border-white/10 bg-surface/50 backdrop-blur-sm px-4 py-2.5 text-sm text-white transition-all duration-200 focus:ring-2 focus:ring-gold/20 focus:border-gold/40 outline-none placeholder:text-gray-500"
          />
          <p className="text-xs text-gray-500 mt-1.5">
            Si lo dejas vacío, no enviaremos alertas por correo.
          </p>
        </div>
      </div>

      {/* Qué enviamos (informativo, refleja lo que hace el sistema) */}
      <div className="bg-surface/75 backdrop-blur-xl rounded-2xl border border-glass-border shadow-[0_0_15px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Qué te enviamos a este correo</h2>
            <p className="text-xs text-gray-400">Así funcionan hoy los avisos automáticos.</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-white">Aviso diario, a las 8:00 a. m. (hora de Lima)</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Solo te escribimos si hay algo pendiente. Incluye:
              </p>
              <ul className="mt-2 space-y-1 text-xs text-gray-400 list-disc pl-4">
                {DAILY_ALERT_TOPICS.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-white">Resumen semanal, los lunes a las 8:00 a. m.</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Un resumen de tus trabajadores, alertas abiertas y contratos por vencer.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-[color:var(--neutral-50)] border border-white/[0.06] p-3">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
            <p className="text-xs text-gray-400 leading-relaxed">
              Por ahora no puedes elegir qué tipos de aviso recibir ni cambiar la frecuencia: se
              envían todos los avisos de la lista. Todas las alertas también las ves en la plataforma,
              en la sección Alertas.
            </p>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.3)]"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Guardando…' : 'Guardar correo'}
        </button>
      </div>
    </div>
  )
}
