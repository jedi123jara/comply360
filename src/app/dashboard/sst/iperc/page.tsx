'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle, Plus, Loader2, Shield, Download, ChevronRight,
  ChevronLeft, CheckCircle2, Clock, X, BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PELIGRO_TIPOS,
  SEVERIDAD_LABELS,
  MEDIDA_CONTROL_LABELS,
  NIVEL_RIESGO_CONFIG,
  calcularProbabilidad,
  calcularNivelRiesgo,
  type PeligroTipo,
  type Severidad,
  type MedidaControlTipo,
  type NivelRiesgo,
  type ProbabilidadFactors,
} from '@/lib/sst/iperc-template'
import { PELIGROS_LIBRARY, getPeligrosByTipo, type PeligroEntry } from '@/lib/sst/peligros-library'

interface IpercRow {
  id: string
  proceso: string
  area: string
  actividad: string
  tarea: string
  peligroTipo: string
  peligroDescripcion: string
  riesgoAsociado: string
  consecuencia: string
  probabilidad: number
  severidad: number
  nivelRiesgo: number
  nivelRiesgoLabel: NivelRiesgo
  medidasControl: { tipo: string; descripcion: string; responsable: string; estado: string }[]
  responsable: string
  fecha: string
  createdAt: string
}

interface Stats {
  totalRisks: number
  byLevel: Record<string, number>
  pendingControls: number
  criticalRisks: number
}

const WIZARD_STEPS = [
  'Contexto',
  'Peligro',
  'Evaluacion',
  'Control',
  'Resumen',
]

const defaultFactors: ProbabilidadFactors = {
  personasExpuestas: 1,
  controles: 1,
  capacitacion: 1,
  exposicion: 1,
}

export default function IpercPage() {
  const [entries, setEntries] = useState<IpercRow[]>([])
  const [stats, setStats] = useState<Stats>({ totalRisks: 0, byLevel: {}, pendingControls: 0, criticalRisks: 0 })
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [nivelFilter, setNivelFilter] = useState<NivelRiesgo | ''>('')

  // Form state
  const [form, setForm] = useState({
    proceso: '',
    area: '',
    actividad: '',
    tarea: '',
    peligroTipo: '' as PeligroTipo | '',
    peligroDescripcion: '',
    riesgoAsociado: '',
    consecuencia: '',
    probabilidadFactors: { ...defaultFactors },
    severidad: 1 as Severidad,
    responsable: '',
    fecha: new Date().toISOString().split('T')[0],
    medidasControl: [{ tipo: 'ADMINISTRATIVO' as MedidaControlTipo, descripcion: '', responsable: '', estado: 'PENDIENTE' }],
  })

  // Live risk preview
  const liveProb = useMemo(() => calcularProbabilidad(form.probabilidadFactors), [form.probabilidadFactors])
  const liveRisk = useMemo(() => calcularNivelRiesgo(liveProb, form.severidad), [liveProb, form.severidad])

  const [stepError, setStepError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function loadData() {
    try {
      const params = new URLSearchParams()
      if (nivelFilter) params.set('nivel', nivelFilter)
      const res = await fetch(`/api/sst/iperc${params.toString() ? `?${params}` : ''}`)
      if (!res.ok) throw new Error('Error al cargar')
      const data = await res.json()
      setEntries(data.entries || [])
      setStats(data.stats || { totalRisks: 0, byLevel: {}, pendingControls: 0, criticalRisks: 0 })
    } catch {
      // Keep previous data on error; loading still resolves
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivelFilter])

  function validateStep(currentStep: number): string | null {
    if (currentStep === 0) {
      if (!form.proceso.trim()) return 'El campo Proceso es obligatorio.'
      if (!form.area.trim()) return 'El campo Area es obligatorio.'
      if (!form.actividad.trim()) return 'El campo Actividad es obligatorio.'
      if (!form.tarea.trim()) return 'El campo Tarea es obligatorio.'
    }
    if (currentStep === 1) {
      if (!form.peligroTipo) return 'Seleccione el tipo de peligro.'
      if (!form.peligroDescripcion.trim()) return 'La descripcion del peligro es obligatoria.'
      if (!form.riesgoAsociado.trim()) return 'El riesgo asociado es obligatorio.'
      if (!form.consecuencia.trim()) return 'La consecuencia es obligatoria.'
    }
    if (currentStep === 2) {
      if (!form.responsable.trim()) return 'El responsable es obligatorio.'
    }
    return null
  }

  function handleNext() {
    const error = validateStep(step)
    if (error) {
      setStepError(error)
      return
    }
    setStepError(null)
    setStep(step + 1)
  }

  function resetForm() {
    setForm({
      proceso: '', area: '', actividad: '', tarea: '',
      peligroTipo: '', peligroDescripcion: '', riesgoAsociado: '', consecuencia: '',
      probabilidadFactors: { ...defaultFactors }, severidad: 1,
      responsable: '', fecha: new Date().toISOString().split('T')[0],
      medidasControl: [{ tipo: 'ADMINISTRATIVO', descripcion: '', responsable: '', estado: 'PENDIENTE' }],
    })
    setStep(0)
    setStepError(null)
  }

  async function saveEntry() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/sst/iperc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          medidasControl: form.medidasControl.filter(mc => mc.descripcion),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setSaveError(err.details?.join('; ') || err.error || 'Error al guardar el registro IPERC.')
        return
      }
      setShowWizard(false)
      setSaveError(null)
      resetForm()
      loadData()
    } catch { setSaveError('Error al guardar el registro IPERC. Verifique su conexión.') }
    finally { setSaving(false) }
  }

  function exportData() {
    const lines: string[] = []
    lines.push('MATRIZ IPERC - R.M. 050-2013-TR')
    lines.push(`Fecha de generacion: ${new Date().toLocaleDateString('es-PE')}`)
    lines.push('')
    lines.push('Proceso | Area | Actividad | Tarea | Peligro | Riesgo | Consecuencia | P | S | NR | Nivel | Medidas')
    lines.push('-'.repeat(120))
    for (const e of entries) {
      const medidas = e.medidasControl.map(m => `${m.tipo}: ${m.descripcion}`).join('; ')
      lines.push(`${e.proceso} | ${e.area} | ${e.actividad} | ${e.tarea} | ${e.peligroDescripcion} | ${e.riesgoAsociado} | ${e.consecuencia} | ${e.probabilidad} | ${e.severidad} | ${e.nivelRiesgo} | ${e.nivelRiesgoLabel} | ${medidas}`)
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `iperc-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function addMedidaControl() {
    setForm(p => ({
      ...p,
      medidasControl: [...p.medidasControl, { tipo: 'EPP' as MedidaControlTipo, descripcion: '', responsable: '', estado: 'PENDIENTE' }],
    }))
  }

  function removeMedidaControl(idx: number) {
    setForm(p => ({ ...p, medidasControl: p.medidasControl.filter((_, i) => i !== idx) }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Matriz IPERC</h1>
          <p className="mt-1 text-gray-500">
            Identificacion de Peligros, Evaluacion de Riesgos y Control (R.M. 050-2013-TR)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportData}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/[0.02]"
          >
            <Download className="h-4 w-4" /> Exportar
          </button>
          <button
            onClick={() => { resetForm(); setStepError(null); setShowWizard(true) }}
            className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Nuevo Riesgo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-xl border bg-[#141824] p-3 text-center">
          <p className="text-2xl font-bold text-white">{stats.totalRisks}</p>
          <p className="text-xs text-gray-500">Total Riesgos</p>
        </div>
        {(['INTOLERABLE', 'IMPORTANTE', 'MODERADO', 'TOLERABLE'] as NivelRiesgo[]).map(nivel => {
          const config = NIVEL_RIESGO_CONFIG[nivel]
          return (
            <div key={nivel} className={cn('rounded-xl border p-3 text-center', config.bgColor)}>
              <p className={cn('text-2xl font-bold', config.color)}>{stats.byLevel[nivel] || 0}</p>
              <p className={cn('text-xs', config.color)}>{config.label}</p>
            </div>
          )
        })}
      </div>

      {/* Pending controls alert */}
      {stats.pendingControls > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <Clock className="h-5 w-5 text-orange-500" />
          <div>
            <p className="text-sm font-medium text-orange-800">
              {stats.pendingControls} riesgo{stats.pendingControls > 1 ? 's' : ''} con medidas de control pendientes
            </p>
            <p className="text-xs text-orange-600">Implemente las medidas de control para reducir los riesgos identificados</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Filtrar por nivel:</span>
        <select
          value={nivelFilter}
          onChange={e => setNivelFilter(e.target.value as NivelRiesgo | '')}
          className="rounded-lg border px-3 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          {Object.entries(NIVEL_RIESGO_CONFIG).map(([key, conf]) => (
            <option key={key} value={key}>{conf.label} ({conf.rango})</option>
          ))}
        </select>
      </div>

      {/* IPERC Table */}
      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No hay riesgos registrados en la matriz IPERC.</p>
          <button
            onClick={() => { resetForm(); setStepError(null); setShowWizard(true) }}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            + Agregar primer riesgo
          </button>
        </div>
      ) : (
        <div className="rounded-xl border bg-[#141824] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-white/[0.02] text-left text-xs font-medium uppercase text-gray-500">
                <th className="px-3 py-3">Proceso / Area</th>
                <th className="px-3 py-3">Actividad / Tarea</th>
                <th className="px-3 py-3">Peligro</th>
                <th className="px-3 py-3">Riesgo</th>
                <th className="px-3 py-3 text-center">P</th>
                <th className="px-3 py-3 text-center">S</th>
                <th className="px-3 py-3 text-center">NR</th>
                <th className="px-3 py-3 text-center">Nivel</th>
                <th className="px-3 py-3">Medidas</th>
                <th className="px-3 py-3">Responsable</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => {
                const nivelConfig = NIVEL_RIESGO_CONFIG[entry.nivelRiesgoLabel] || NIVEL_RIESGO_CONFIG.TRIVIAL
                return (
                  <tr key={entry.id} className="border-b last:border-b-0 hover:bg-white/[0.02]">
                    <td className="px-3 py-3">
                      <p className="font-medium text-white">{entry.proceso}</p>
                      <p className="text-xs text-gray-500">{entry.area}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-gray-300">{entry.actividad}</p>
                      <p className="text-xs text-gray-500">{entry.tarea}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-block rounded bg-white/[0.04] px-1.5 py-0.5 text-xs font-medium text-gray-300 mb-1">
                        {PELIGRO_TIPOS[entry.peligroTipo as PeligroTipo]?.label || entry.peligroTipo}
                      </span>
                      <p className="text-xs text-gray-600">{entry.peligroDescripcion}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-300 max-w-[150px]">
                      <p>{entry.riesgoAsociado}</p>
                      <p className="text-gray-400 mt-0.5">{entry.consecuencia}</p>
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-gray-300">{entry.probabilidad}</td>
                    <td className="px-3 py-3 text-center font-mono text-gray-300">{entry.severidad}</td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-white">{entry.nivelRiesgo}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-semibold', nivelConfig.bgColor, nivelConfig.color)}>
                        {nivelConfig.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 max-w-[180px]">
                      {entry.medidasControl.length > 0 ? (
                        <div className="space-y-1">
                          {entry.medidasControl.slice(0, 2).map((mc, i) => (
                            <div key={i} className="flex items-center gap-1">
                              {mc.estado === 'IMPLEMENTADA' ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                              ) : (
                                <Clock className="h-3 w-3 text-yellow-500 shrink-0" />
                              )}
                              <span className="text-xs text-gray-600 truncate">{mc.descripcion || mc.tipo}</span>
                            </div>
                          ))}
                          {entry.medidasControl.length > 2 && (
                            <p className="text-xs text-gray-400">+{entry.medidasControl.length - 2} mas</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sin medidas</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">{entry.responsable}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
          <div className="w-full max-w-2xl rounded-xl bg-[#141824] p-6 shadow-xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Nuevo Riesgo IPERC</h3>
              <button onClick={() => setShowWizard(false)} className="rounded p-1 hover:bg-white/[0.04]">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Progress steps */}
            <div className="flex items-center gap-1 mb-6">
              {WIZARD_STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-1 flex-1">
                  <div className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                    i <= step ? 'bg-primary text-white' : 'bg-white/[0.04] text-gray-400'
                  )}>
                    {i + 1}
                  </div>
                  <span className={cn('text-xs hidden sm:inline', i <= step ? 'text-primary font-medium' : 'text-gray-400')}>
                    {s}
                  </span>
                  {i < WIZARD_STEPS.length - 1 && <div className="h-px flex-1 bg-gray-200" />}
                </div>
              ))}
            </div>

            {/* Risk preview bar */}
            <div className={cn(
              'mb-4 rounded-lg px-3 py-2 flex items-center justify-between',
              NIVEL_RIESGO_CONFIG[liveRisk.label].bgColor
            )}>
              <span className={cn('text-sm font-medium', NIVEL_RIESGO_CONFIG[liveRisk.label].color)}>
                Nivel de Riesgo: {NIVEL_RIESGO_CONFIG[liveRisk.label].label} ({liveRisk.nivel})
              </span>
              <span className={cn('text-xs', NIVEL_RIESGO_CONFIG[liveRisk.label].color)}>
                P={liveProb} x S={form.severidad}
              </span>
            </div>

            {/* Step 0: Contexto */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Proceso *</label>
                    <input type="text" value={form.proceso} onChange={e => setForm(p => ({ ...p, proceso: e.target.value }))}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Ej: Produccion" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Area *</label>
                    <input type="text" value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Ej: Planta principal" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Actividad *</label>
                  <input type="text" value={form.actividad} onChange={e => setForm(p => ({ ...p, actividad: e.target.value }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Ej: Operacion de maquinaria" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Tarea *</label>
                  <input type="text" value={form.tarea} onChange={e => setForm(p => ({ ...p, tarea: e.target.value }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Ej: Corte de materiales" />
                </div>
              </div>
            )}

            {/* Step 1: Peligro */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300">Tipo de peligro *</label>
                  <select value={form.peligroTipo} onChange={e => setForm(p => ({ ...p, peligroTipo: e.target.value as PeligroTipo }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                    <option value="">Seleccionar...</option>
                    {Object.entries(PELIGRO_TIPOS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                  {form.peligroTipo && (
                    <p className="mt-1 text-xs text-gray-400">
                      Ejemplos: {PELIGRO_TIPOS[form.peligroTipo as PeligroTipo]?.ejemplos.join(', ')}
                    </p>
                  )}
                </div>
                {/* Selector de peligro de la biblioteca */}
                {form.peligroTipo && (() => {
                  const filtered = getPeligrosByTipo(form.peligroTipo as PeligroTipo)
                  return filtered.length > 0 ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Seleccionar de biblioteca (opcional)</label>
                      <select
                        value=""
                        onChange={e => {
                          const entry = PELIGROS_LIBRARY.find(p => p.id === e.target.value)
                          if (entry) {
                            setForm(p => ({
                              ...p,
                              peligroDescripcion: entry.peligro,
                              riesgoAsociado: entry.riesgo,
                              consecuencia: entry.consecuencia,
                            }))
                          }
                        }}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-amber-50 border-amber-200 bg-amber-900/20 border-amber-700"
                      >
                        <option value="">Seleccionar peligro de la biblioteca ({filtered.length} disponibles)...</option>
                        {filtered.map(p => (
                          <option key={p.id} value={p.id}>{p.peligro}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-amber-600 text-amber-400">Al seleccionar, se auto-completan peligro, riesgo y consecuencia</p>
                    </div>
                  ) : null
                })()}

                <div>
                  <label className="block text-sm font-medium text-gray-300">Descripcion del peligro *</label>
                  <input type="text" value={form.peligroDescripcion} onChange={e => setForm(p => ({ ...p, peligroDescripcion: e.target.value }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Ej: Ruido excesivo de maquinaria" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Riesgo asociado *</label>
                  <input type="text" value={form.riesgoAsociado} onChange={e => setForm(p => ({ ...p, riesgoAsociado: e.target.value }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Ej: Hipoacusia inducida por ruido" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Consecuencia *</label>
                  <input type="text" value={form.consecuencia} onChange={e => setForm(p => ({ ...p, consecuencia: e.target.value }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Ej: Perdida auditiva permanente" />
                </div>
              </div>
            )}

            {/* Step 2: Evaluacion */}
            {step === 2 && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-300">Factores de Probabilidad</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Personas expuestas</label>
                    <select value={form.probabilidadFactors.personasExpuestas}
                      onChange={e => setForm(p => ({ ...p, probabilidadFactors: { ...p.probabilidadFactors, personasExpuestas: parseInt(e.target.value) } }))}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                      <option value={1}>1 - De 1 a 3 personas</option>
                      <option value={2}>2 - De 4 a 12 personas</option>
                      <option value={3}>3 - Mas de 12 personas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Controles existentes</label>
                    <select value={form.probabilidadFactors.controles}
                      onChange={e => setForm(p => ({ ...p, probabilidadFactors: { ...p.probabilidadFactors, controles: parseInt(e.target.value) } }))}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                      <option value={1}>1 - Existen y son adecuados</option>
                      <option value={2}>2 - Existen parcialmente</option>
                      <option value={3}>3 - No existen</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Capacitacion</label>
                    <select value={form.probabilidadFactors.capacitacion}
                      onChange={e => setForm(p => ({ ...p, probabilidadFactors: { ...p.probabilidadFactors, capacitacion: parseInt(e.target.value) } }))}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                      <option value={1}>1 - Personal capacitado</option>
                      <option value={2}>2 - Parcialmente capacitado</option>
                      <option value={3}>3 - No capacitado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Frecuencia de exposicion</label>
                    <select value={form.probabilidadFactors.exposicion}
                      onChange={e => setForm(p => ({ ...p, probabilidadFactors: { ...p.probabilidadFactors, exposicion: parseInt(e.target.value) } }))}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                      <option value={1}>1 - Esporadica (alguna vez)</option>
                      <option value={2}>2 - Eventual (varias veces)</option>
                      <option value={3}>3 - Permanente (continuamente)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300">Severidad *</label>
                  <select value={form.severidad}
                    onChange={e => setForm(p => ({ ...p, severidad: parseInt(e.target.value) as Severidad }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                    {([1, 2, 3] as Severidad[]).map(s => (
                      <option key={s} value={s}>{SEVERIDAD_LABELS[s]}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Responsable *</label>
                    <input type="text" value={form.responsable} onChange={e => setForm(p => ({ ...p, responsable: e.target.value }))}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Nombre del responsable" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Fecha</label>
                    <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Medidas de Control */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-lg bg-blue-50 px-3 py-2">
                  <p className="text-xs text-blue-700">
                    Jerarquia de controles: Eliminacion &gt; Sustitucion &gt; Ingenieria &gt; Administrativo &gt; EPP
                  </p>
                </div>
                {form.medidasControl.map((mc, idx) => (
                  <div key={idx} className="rounded-lg border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-300">Medida {idx + 1}</span>
                      {form.medidasControl.length > 1 && (
                        <button onClick={() => removeMedidaControl(idx)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Tipo de control</label>
                        <select value={mc.tipo}
                          onChange={e => {
                            const updated = [...form.medidasControl]
                            updated[idx] = { ...updated[idx], tipo: e.target.value as MedidaControlTipo }
                            setForm(p => ({ ...p, medidasControl: updated }))
                          }}
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                          {Object.entries(MEDIDA_CONTROL_LABELS).map(([key, val]) => (
                            <option key={key} value={key}>{val.label} - {val.descripcion}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Responsable</label>
                        <input type="text" value={mc.responsable}
                          onChange={e => {
                            const updated = [...form.medidasControl]
                            updated[idx] = { ...updated[idx], responsable: e.target.value }
                            setForm(p => ({ ...p, medidasControl: updated }))
                          }}
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Responsable" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Descripcion de la medida</label>
                      <input type="text" value={mc.descripcion}
                        onChange={e => {
                          const updated = [...form.medidasControl]
                          updated[idx] = { ...updated[idx], descripcion: e.target.value }
                          setForm(p => ({ ...p, medidasControl: updated }))
                        }}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Describir la medida de control..." />
                    </div>
                  </div>
                ))}
                <button onClick={addMedidaControl} className="text-sm font-medium text-primary hover:underline">
                  + Agregar otra medida de control
                </button>
              </div>
            )}

            {/* Step 4: Resumen */}
            {step === 4 && (
              <div className="space-y-3 text-sm">
                <div className="rounded-lg bg-white/[0.02] p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <p><span className="font-medium text-gray-500">Proceso:</span> {form.proceso}</p>
                    <p><span className="font-medium text-gray-500">Area:</span> {form.area}</p>
                    <p><span className="font-medium text-gray-500">Actividad:</span> {form.actividad}</p>
                    <p><span className="font-medium text-gray-500">Tarea:</span> {form.tarea}</p>
                  </div>
                  <hr className="my-2" />
                  <p><span className="font-medium text-gray-500">Peligro:</span> {PELIGRO_TIPOS[form.peligroTipo as PeligroTipo]?.label} - {form.peligroDescripcion}</p>
                  <p><span className="font-medium text-gray-500">Riesgo:</span> {form.riesgoAsociado}</p>
                  <p><span className="font-medium text-gray-500">Consecuencia:</span> {form.consecuencia}</p>
                  <hr className="my-2" />
                  <div className="flex items-center gap-4">
                    <p><span className="font-medium text-gray-500">Probabilidad:</span> {liveProb}</p>
                    <p><span className="font-medium text-gray-500">Severidad:</span> {form.severidad}</p>
                    <p><span className="font-medium text-gray-500">NR:</span> {liveRisk.nivel}</p>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', NIVEL_RIESGO_CONFIG[liveRisk.label].bgColor, NIVEL_RIESGO_CONFIG[liveRisk.label].color)}>
                      {NIVEL_RIESGO_CONFIG[liveRisk.label].label}
                    </span>
                  </div>
                  <hr className="my-2" />
                  <p><span className="font-medium text-gray-500">Medidas de control:</span></p>
                  {form.medidasControl.filter(mc => mc.descripcion).map((mc, i) => (
                    <p key={i} className="ml-4 text-gray-600">- {MEDIDA_CONTROL_LABELS[mc.tipo as MedidaControlTipo]?.label}: {mc.descripcion}</p>
                  ))}
                  <p className="mt-2"><span className="font-medium text-gray-500">Responsable:</span> {form.responsable}</p>
                </div>
              </div>
            )}

            {/* Step validation error */}
            {stepError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm text-red-700">{stepError}</p>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-4 flex justify-between">
              <button
                onClick={() => {
                  setStepError(null)
                  step > 0 ? setStep(step - 1) : setShowWizard(false)
                }}
                className="flex items-center gap-1 rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-white/[0.02]"
              >
                <ChevronLeft className="h-4 w-4" /> {step > 0 ? 'Anterior' : 'Cancelar'}
              </button>

              {step < WIZARD_STEPS.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Siguiente <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex flex-col items-end gap-2">
                  {saveError && (
                    <p className="text-xs text-red-600 text-red-400 max-w-xs text-right">{saveError}</p>
                  )}
                  <button
                    onClick={saveEntry}
                    disabled={saving}
                    className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : 'Guardar Riesgo'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
