'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Mail, Clock, ArrowLeft, Loader2, Save } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AlertToggle {
  key: string
  label: string
  description: string
  enabled: boolean
}

type Frequency = 'INMEDIATA' | 'RESUMEN_DIARIO' | 'RESUMEN_SEMANAL'

const FREQUENCY_OPTIONS: { value: Frequency; label: string; description: string }[] = [
  { value: 'INMEDIATA', label: 'Inmediata', description: 'Recibe cada alerta al momento de generarse' },
  { value: 'RESUMEN_DIARIO', label: 'Resumen diario', description: 'Un email consolidado cada dia a las 8:00 AM' },
  { value: 'RESUMEN_SEMANAL', label: 'Resumen semanal', description: 'Un email consolidado cada lunes a las 8:00 AM' },
]

const DEFAULT_TOGGLES: AlertToggle[] = [
  { key: 'contratos_vencer', label: 'Contratos por vencer', description: 'Alerta cuando un contrato esta proximo a su fecha de vencimiento (30, 15, 7 dias)', enabled: true },
  { key: 'cts_pendiente', label: 'CTS pendiente', description: 'Recordatorio de deposito de CTS antes del 15 de mayo y noviembre', enabled: true },
  { key: 'vacaciones_acumuladas', label: 'Vacaciones acumuladas', description: 'Alerta cuando un trabajador acumula mas de 1 periodo sin goce', enabled: true },
  { key: 'documentos_faltantes', label: 'Documentos faltantes', description: 'Aviso de documentos obligatorios del legajo digital no subidos', enabled: true },
  { key: 'sst_vencimientos', label: 'SST vencimientos', description: 'Examenes medicos, SCTR o capacitaciones SST proximos a vencer', enabled: true },
  { key: 'cambios_normativos', label: 'Cambios normativos', description: 'Nuevas normas laborales publicadas que afectan a tu organizacion', enabled: false },
]

// ─── Toggle Switch ─────────────────────────────────────────────────────────────

function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-surface
        ${enabled ? 'bg-primary' : 'bg-white/[0.12]'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0
          transition-transform duration-200 ease-in-out
          ${enabled ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function NotificacionesConfigPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [toggles, setToggles] = useState<AlertToggle[]>(DEFAULT_TOGGLES)
  const [frequency, setFrequency] = useState<Frequency>('INMEDIATA')
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
      // Silent — defaults will be used
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const handleToggle = (key: string, value: boolean) => {
    setToggles(prev => prev.map(t => t.key === key ? { ...t, enabled: value } : t))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/org/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertEmail: email,
          notificationPrefs: {
            frequency,
            toggles: Object.fromEntries(toggles.map(t => [t.key, t.enabled])),
          },
        }),
      })

      if (!res.ok) throw new Error('Error al guardar')

      toast({ title: 'Preferencias guardadas', description: 'La configuracion de notificaciones se actualizo correctamente.', type: 'success' })
    } catch {
      toast({ title: 'Error al guardar', description: 'No se pudieron guardar las preferencias. Intenta nuevamente.', type: 'error' })
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
          className="p-2 rounded-xl hover:bg-[color:var(--neutral-100)] transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Notificaciones</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Configura que alertas recibir y con que frecuencia.
          </p>
        </div>
      </div>

      {/* Alert Toggles */}
      <div className="bg-surface/75 backdrop-blur-xl rounded-2xl border border-glass-border shadow-[0_0_15px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Tipos de alerta</h2>
            <p className="text-xs text-gray-400">Activa o desactiva cada tipo de notificacion.</p>
          </div>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {toggles.map(toggle => (
            <div key={toggle.key} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{toggle.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{toggle.description}</p>
              </div>
              <ToggleSwitch enabled={toggle.enabled} onChange={(v) => handleToggle(toggle.key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Frequency */}
      <div className="bg-surface/75 backdrop-blur-xl rounded-2xl border border-glass-border shadow-[0_0_15px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10">
            <Clock className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Frecuencia de envio</h2>
            <p className="text-xs text-gray-400">Elige como quieres recibir las notificaciones.</p>
          </div>
        </div>

        <div className="p-6 space-y-3">
          {FREQUENCY_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`
                flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-150
                ${frequency === opt.value
                  ? 'border-primary/50 bg-primary/[0.06]'
                  : 'border-white/[0.08] bg-[color:var(--neutral-50)] hover:border-white/[0.15]'
                }
              `}
            >
              <input
                type="radio"
                name="frequency"
                value={opt.value}
                checked={frequency === opt.value}
                onChange={() => setFrequency(opt.value)}
                className="sr-only"
              />
              <div className={`
                w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                ${frequency === opt.value ? 'border-primary' : 'border-white/30'}
              `}>
                {frequency === opt.value && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{opt.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Email destinatario */}
      <div className="bg-surface/75 backdrop-blur-xl rounded-2xl border border-glass-border shadow-[0_0_15px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-50">
            <Mail className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Email destinatario</h2>
            <p className="text-xs text-gray-400">Direccion donde se enviaran las alertas.</p>
          </div>
        </div>

        <div className="p-6">
          <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
            Correo electronico
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alertas@miempresa.com"
            className="w-full rounded-xl border border-white/10 bg-surface/50 backdrop-blur-sm px-4 py-2.5 text-sm text-white transition-all duration-200 focus:ring-2 focus:ring-gold/20 focus:border-gold/40 outline-none placeholder:text-gray-500"
          />
          <p className="text-xs text-gray-500 mt-1.5">
            Este es el email principal de alertas de tu organizacion.
          </p>
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
          {saving ? 'Guardando...' : 'Guardar preferencias'}
        </button>
      </div>
    </div>
  )
}
