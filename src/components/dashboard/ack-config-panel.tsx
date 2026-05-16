'use client'

/**
 * AckConfigPanel — panel admin para configurar requisitos de firma de un OrgDocument.
 *
 * Reusable. Se usa desde:
 *   - Drill-down de doc en /dashboard/documentos-firma
 *   - Modal "Activar firma en otro doc" (al elegir uno existente)
 *
 * Permite editar:
 *   - acknowledgmentRequired (toggle)
 *   - acknowledgmentDeadlineDays (presets + sin plazo)
 *   - scopeFilter (regimen multi-select)
 *   - isPublishedToWorkers (publicar a workers)
 *
 * On save → PATCH /api/org-documents/:id con contentChanged=true para
 * disparar notify si el doc está marcado como requireAck.
 */

import { useState, useEffect } from 'react'
import { Loader2, Save, Bell, Clock, Users, Send, AlertTriangle } from 'lucide-react'
import { toast } from '@/components/ui/sonner-toaster'
import { cn } from '@/lib/utils'

interface AckConfig {
  acknowledgmentRequired: boolean
  acknowledgmentDeadlineDays: number | null
  scopeFilter: ScopeFilter | null
  isPublishedToWorkers: boolean
}

interface ScopeFilter {
  regimen?: string[]
  departamento?: string[]
  position?: string[]
}

interface Props {
  documentId: string
  documentTitle: string
  initialConfig: AckConfig
  workerCountTotal: number
  onSaved?: () => void
}

const DEADLINE_PRESETS = [
  { value: 3, label: '3 días' },
  { value: 7, label: '7 días' },
  { value: 14, label: '14 días' },
  { value: 30, label: '30 días' },
  { value: null as number | null, label: 'Sin plazo' },
]

const REGIMENES = [
  { value: 'GENERAL', label: 'General (D.Leg. 728)' },
  { value: 'MYPE_MICRO', label: 'MYPE Micro' },
  { value: 'MYPE_PEQUENA', label: 'MYPE Pequeña' },
  { value: 'AGRARIO', label: 'Agrario' },
  { value: 'CONSTRUCCION_CIVIL', label: 'Construcción Civil' },
  { value: 'CAS', label: 'CAS (Sector Público)' },
  { value: 'MODALIDAD_FORMATIVA', label: 'Modalidad Formativa' },
]

export function AckConfigPanel({ documentId, documentTitle, initialConfig, workerCountTotal, onSaved }: Props) {
  const [required, setRequired] = useState(initialConfig.acknowledgmentRequired)
  const [deadlineDays, setDeadlineDays] = useState<number | null>(initialConfig.acknowledgmentDeadlineDays)
  const [scopeRegimen, setScopeRegimen] = useState<string[]>(initialConfig.scopeFilter?.regimen ?? [])
  const [published, setPublished] = useState(initialConfig.isPublishedToWorkers)
  const [saving, setSaving] = useState(false)
  const [notifyOnSave, setNotifyOnSave] = useState(false)

  // Reset state when initialConfig changes (e.g., navegando a otro doc)
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      setRequired(initialConfig.acknowledgmentRequired)
      setDeadlineDays(initialConfig.acknowledgmentDeadlineDays)
      setScopeRegimen(initialConfig.scopeFilter?.regimen ?? [])
      setPublished(initialConfig.isPublishedToWorkers)
    })
    return () => {
      cancelled = true
    }
  }, [initialConfig])

  function toggleRegimen(value: string) {
    setScopeRegimen((prev) =>
      prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value],
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      const scopeFilter: ScopeFilter | null = scopeRegimen.length > 0 ? { regimen: scopeRegimen } : null

      const body: Record<string, unknown> = {
        acknowledgmentRequired: required,
        acknowledgmentDeadlineDays: deadlineDays,
        scopeFilter,
        isPublishedToWorkers: published,
      }

      // Si el admin activó "Notificar ahora", pedir auto-trigger
      if (required && notifyOnSave) {
        body.contentChanged = true
        body.forceNotify = true
      }

      const res = await fetch(`/api/org-documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al guardar')

      if (json.notifyResult) {
        toast.success(
          `✓ Configuración guardada · ${json.notifyResult.emailsSent} email(s) enviado(s) a trabajadores`,
        )
      } else {
        toast.success('✓ Configuración guardada')
      }
      onSaved?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // Estimación del scope (UI simplificada — no llamamos endpoint de count para no agregar latencia)
  const scopeDescription =
    scopeRegimen.length === 0
      ? `Todos los trabajadores activos (~${workerCountTotal})`
      : `Solo régimen: ${scopeRegimen.join(', ')}`

  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5">
      <div className="flex items-start gap-3 mb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Configurar firma de &quot;{documentTitle}&quot;</h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Activa para que los trabajadores reciban notificación + firmen acuse de recibo con valor legal SUNAFIL.
          </p>
        </div>
      </div>

      {/* Toggle principal */}
      <label className="flex items-start gap-3 cursor-pointer rounded-lg p-3 hover:bg-slate-50">
        <input
          type="checkbox"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
          className="mt-0.5 w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
        />
        <div className="flex-1">
          <p className="font-semibold text-slate-900 text-sm">Requiere firma de los trabajadores</p>
          <p className="text-xs text-slate-600 mt-0.5">
            Cuando se actualice el documento, los trabajadores en scope recibirán email + push +
            banner persistente hasta que firmen.
          </p>
        </div>
      </label>

      {/* Configuración avanzada — solo visible si required=true */}
      {required && (
        <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
          {/* Plazo */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 mb-2">
              <Clock className="h-4 w-4 text-slate-500" />
              Plazo para firmar
            </label>
            <div className="flex flex-wrap gap-2">
              {DEADLINE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setDeadlineDays(preset.value)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                    deadlineDays === preset.value
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {deadlineDays && (
              <p className="text-xs text-slate-500 mt-2">
                Si pasan {deadlineDays} días sin firma, el cron diario te alertará.
              </p>
            )}
          </div>

          {/* Scope */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 mb-2">
              <Users className="h-4 w-4 text-slate-500" />
              ¿Quiénes deben firmar?
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  checked={scopeRegimen.length === 0}
                  onChange={() => setScopeRegimen([])}
                  className="text-emerald-600"
                />
                <span>Todos los trabajadores activos</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  checked={scopeRegimen.length > 0}
                  onChange={() => setScopeRegimen(['GENERAL'])}
                  className="text-emerald-600"
                />
                <span>Solo régimen específico</span>
              </label>
              {scopeRegimen.length > 0 && (
                <div className="ml-6 mt-2 grid grid-cols-2 gap-2">
                  {REGIMENES.map((r) => (
                    <label key={r.value} className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={scopeRegimen.includes(r.value)}
                        onChange={() => toggleRegimen(r.value)}
                        className="rounded text-emerald-600"
                      />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-emerald-700 font-medium mt-2">
                Resultado: {scopeDescription}
              </p>
            </div>
          </div>

          {/* Publicar a workers */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">Publicar a trabajadores</p>
              <p className="text-xs text-slate-600">
                Si está desactivado, el doc no aparece en el portal del worker (modo borrador).
              </p>
            </div>
          </label>

          {/* Notify on save */}
          <label className="flex items-start gap-3 cursor-pointer rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
            <input
              type="checkbox"
              checked={notifyOnSave}
              onChange={(e) => setNotifyOnSave(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
            />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                <Send className="inline h-3 w-3 mr-1" />
                Notificar ahora a los trabajadores
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Si activas, al guardar se enviará email + push de inmediato. Sino, los workers se
                enteran cuando edites el contenido del doc por primera vez.
              </p>
            </div>
          </label>

          {/* Warning si no está publicado */}
          {!published && (
            <div className="rounded-lg bg-amber-50 ring-1 ring-amber-200 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 leading-relaxed">
                <strong>El documento no se publicará</strong> a trabajadores. Necesitas activar
                &quot;Publicar a trabajadores&quot; para que aparezca en sus portales.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-5 py-3 transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Guardar configuración
      </button>
    </div>
  )
}
