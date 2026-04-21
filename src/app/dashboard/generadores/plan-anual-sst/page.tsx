'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GeneratorShell } from '@/components/generadores/generator-shell'
import type {
  PlanAnualSstParams,
  ObjetivoSmart,
  CapacitacionPlan,
} from '@/lib/generators/plan-anual-sst'

export default function PlanAnualSstPage() {
  return (
    <GeneratorShell
      type="plan-anual-sst"
      title="Plan Anual de SST"
      description="Plan anual con línea base, objetivos SMART, cronograma de capacitaciones (mínimo 4/año), presupuesto, inspecciones e indicadores — formato Art. 38 Ley 29783."
      baseLegal="Ley 29783, Art. 38 · R.M. 050-2013-TR"
      gravity="GRAVE"
      estimatedMinutes={15}
      renderForm={({ onSubmit, loading }) => <Form onSubmit={onSubmit} loading={loading} />}
    />
  )
}

interface ObjetivoRow extends ObjetivoSmart {
  id: string
}
interface CapacitacionRow extends CapacitacionPlan {
  id: string
}

function createObjetivo(): ObjetivoRow {
  return {
    id: `o-${Math.random().toString(36).slice(2, 8)}`,
    objetivo: '',
    meta: '',
    indicador: '',
    responsable: '',
    plazo: '',
  }
}

function createCapacitacion(trimestre: CapacitacionPlan['trimestre']): CapacitacionRow {
  return {
    id: `c-${Math.random().toString(36).slice(2, 8)}`,
    tema: '',
    participantesObjetivo: 'todos',
    trimestre,
    responsable: '',
  }
}

function Form({
  onSubmit,
  loading,
}: {
  onSubmit: (params: unknown) => void | Promise<void>
  loading: boolean
}) {
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [fechaAprobacion, setFechaAprobacion] = useState(new Date().toISOString().slice(0, 10))
  const [diagnostico, setDiagnostico] = useState('')
  const [responsableGeneral, setResponsableGeneral] = useState('')
  const [coordinador, setCoordinador] = useState('')
  const [presupuesto, setPresupuesto] = useState('')
  const [frecuenciaInspecciones, setFrecuenciaInspecciones] = useState<PlanAnualSstParams['frecuenciaInspecciones']>('mensual')
  const [frecuenciaExamen, setFrecuenciaExamen] = useState<PlanAnualSstParams['frecuenciaExamenMedico']>('anual')
  const [observaciones, setObservaciones] = useState('')

  const [objetivos, setObjetivos] = useState<ObjetivoRow[]>([createObjetivo()])
  const [caps, setCaps] = useState<CapacitacionRow[]>([
    createCapacitacion('Q1'),
    createCapacitacion('Q2'),
    createCapacitacion('Q3'),
    createCapacitacion('Q4'),
  ])

  function updateObj(id: string, field: keyof ObjetivoRow, value: string) {
    setObjetivos((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)))
  }
  function addObj() {
    setObjetivos((prev) => [...prev, createObjetivo()])
  }
  function removeObj(id: string) {
    setObjetivos((prev) => (prev.length > 1 ? prev.filter((o) => o.id !== id) : prev))
  }
  function updateCap(id: string, field: keyof CapacitacionRow, value: string) {
    setCaps((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
  }
  function addCap(trimestre: CapacitacionPlan['trimestre']) {
    setCaps((prev) => [...prev, createCapacitacion(trimestre)])
  }
  function removeCap(id: string) {
    setCaps((prev) => (prev.length > 4 ? prev.filter((c) => c.id !== id) : prev))
  }

  const validCaps = caps.filter((c) => c.tema.trim())
  const validObj = objetivos.filter((o) => o.objetivo.trim() && o.meta.trim())
  const canSubmit =
    diagnostico.trim() &&
    responsableGeneral.trim() &&
    validObj.length >= 1 &&
    validCaps.length >= 4 &&
    Number(presupuesto) >= 0

  function submit() {
    const params: PlanAnualSstParams = {
      anio,
      fechaAprobacion,
      diagnosticoLineaBase: diagnostico.trim(),
      responsableGeneralSst: responsableGeneral.trim(),
      coordinadorSst: coordinador.trim() || undefined,
      objetivos: validObj.map((o) => ({
        objetivo: o.objetivo.trim(),
        meta: o.meta.trim(),
        indicador: o.indicador.trim() || 'A definir',
        responsable: o.responsable.trim() || responsableGeneral.trim(),
        plazo: o.plazo.trim() || 'Cierre del año',
      })),
      capacitaciones: validCaps.map((c) => ({
        tema: c.tema.trim(),
        participantesObjetivo: c.participantesObjetivo.trim() || 'todos',
        trimestre: c.trimestre,
        responsable: c.responsable?.trim() || undefined,
      })),
      presupuestoSoles: Number(presupuesto) || 0,
      frecuenciaInspecciones,
      frecuenciaExamenMedico: frecuenciaExamen,
      observaciones: observaciones.trim() || undefined,
    }
    onSubmit(params)
  }

  return (
    <Card padding="lg" className="space-y-5">
      {/* Datos generales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Año del plan" required>
          <input
            type="number"
            min={2024}
            max={2035}
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value) || new Date().getFullYear())}
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Fecha de aprobación" required>
          <input
            type="date"
            value={fechaAprobacion}
            onChange={(e) => setFechaAprobacion(e.target.value)}
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Presupuesto anual (S/)" required>
          <input
            type="number"
            min={0}
            step={500}
            value={presupuesto}
            onChange={(e) => setPresupuesto(e.target.value)}
            placeholder="30000"
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <Field label="Responsable General SST" required>
        <input
          type="text"
          value={responsableGeneral}
          onChange={(e) => setResponsableGeneral(e.target.value)}
          placeholder="Ej. Juan Pérez — Gerente de RRHH"
          className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Coordinador SST (opcional)">
        <input
          type="text"
          value={coordinador}
          onChange={(e) => setCoordinador(e.target.value)}
          placeholder="Ej. María Torres — Especialista SST"
          className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Diagnóstico línea base" required>
        <textarea
          value={diagnostico}
          onChange={(e) => setDiagnostico(e.target.value)}
          rows={4}
          placeholder="Resumen del estado actual del sistema SST: hallazgos de la última inspección SUNAFIL, observaciones del Comité, accidentes del año anterior, brechas detectadas..."
          className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm resize-none"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Frecuencia inspecciones internas" required>
          <select
            value={frecuenciaInspecciones}
            onChange={(e) => setFrecuenciaInspecciones(e.target.value as PlanAnualSstParams['frecuenciaInspecciones'])}
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
          >
            <option value="semanal">Semanal</option>
            <option value="mensual">Mensual (recomendado)</option>
            <option value="trimestral">Trimestral</option>
          </select>
        </Field>
        <Field label="Frecuencia exámenes médicos" required>
          <select
            value={frecuenciaExamen}
            onChange={(e) => setFrecuenciaExamen(e.target.value as PlanAnualSstParams['frecuenciaExamenMedico'])}
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
          >
            <option value="anual">Anual (riesgo alto)</option>
            <option value="bianual">Bianual (riesgo medio)</option>
            <option value="trienal">Trienal (riesgo bajo)</option>
          </select>
        </Field>
      </div>

      {/* Objetivos SMART */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold">Objetivos SMART</p>
          <MiniBtn onClick={addObj}>+ Agregar objetivo</MiniBtn>
        </div>
        <div className="space-y-3">
          {objetivos.map((o, idx) => (
            <div key={o.id} className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)]/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-tertiary)]">
                  Objetivo #{idx + 1}
                </p>
                {objetivos.length > 1 ? (
                  <button onClick={() => removeObj(o.id)} className="text-xs text-crimson-700 hover:text-crimson-800 inline-flex items-center gap-1">
                    <Trash2 className="h-3 w-3" />
                    Eliminar
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input type="text" value={o.objetivo} onChange={(e) => updateObj(o.id, 'objetivo', e.target.value)} placeholder="Objetivo (ej. Reducir accidentabilidad)" className="rounded border border-[color:var(--border-default)] bg-white px-2 py-1.5 text-sm" />
                <input type="text" value={o.meta} onChange={(e) => updateObj(o.id, 'meta', e.target.value)} placeholder="Meta (ej. 20% menos vs. 2025)" className="rounded border border-[color:var(--border-default)] bg-white px-2 py-1.5 text-sm" />
                <input type="text" value={o.indicador} onChange={(e) => updateObj(o.id, 'indicador', e.target.value)} placeholder="Indicador (ej. IA mensual)" className="rounded border border-[color:var(--border-default)] bg-white px-2 py-1.5 text-sm" />
                <input type="text" value={o.responsable} onChange={(e) => updateObj(o.id, 'responsable', e.target.value)} placeholder="Responsable" className="rounded border border-[color:var(--border-default)] bg-white px-2 py-1.5 text-sm" />
                <input type="text" value={o.plazo} onChange={(e) => updateObj(o.id, 'plazo', e.target.value)} placeholder="Plazo (ej. Dic 2026)" className="rounded border border-[color:var(--border-default)] bg-white px-2 py-1.5 text-sm sm:col-span-2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Capacitaciones (mínimo 4) */}
      <div>
        <p className="text-sm font-bold mb-2">
          Capacitaciones SST <span className="text-xs font-normal text-[color:var(--text-tertiary)]">· mínimo 4/año (Art. 35 Ley 29783)</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => {
            const qCaps = caps.filter((c) => c.trimestre === q)
            return (
              <div key={q} className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)]/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{q}</p>
                  <button type="button" onClick={() => addCap(q)} className="text-[10px] text-emerald-700 hover:underline inline-flex items-center gap-0.5">
                    <Plus className="h-3 w-3" /> Cap
                  </button>
                </div>
                {qCaps.map((c, i) => (
                  <div key={c.id} className="space-y-1">
                    <input type="text" value={c.tema} onChange={(e) => updateCap(c.id, 'tema', e.target.value)} placeholder={`Tema #${i + 1}`} className="w-full rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
                    <input type="text" value={c.participantesObjetivo} onChange={(e) => updateCap(c.id, 'participantesObjetivo', e.target.value)} placeholder="Participantes" className="w-full rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-[11px]" />
                    {qCaps.length > 1 ? (
                      <button type="button" onClick={() => removeCap(c.id)} className="text-[10px] text-crimson-700 hover:underline">
                        Eliminar
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      <Field label="Observaciones adicionales">
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={2}
          placeholder="Opcional — cualquier consideración específica del año o sector"
          className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm resize-none"
        />
      </Field>

      <div className="pt-2">
        <Button
          onClick={submit}
          disabled={loading || !canSubmit}
          icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          size="lg"
        >
          {loading ? 'Generando…' : `Generar Plan ${anio}`}
        </Button>
        {!canSubmit ? (
          <p className="text-xs text-[color:var(--text-tertiary)] mt-2">
            Completá diagnóstico, responsable, presupuesto, 1+ objetivo con meta, y 4+ capacitaciones con tema.
          </p>
        ) : null}
      </div>
    </Card>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-widest mb-1.5">
        {label}
        {required ? <span className="text-crimson-600 ml-0.5">*</span> : null}
      </label>
      {children}
    </div>
  )
}

function MiniBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
    >
      <Plus className="h-3 w-3" />
      {children}
    </button>
  )
}
