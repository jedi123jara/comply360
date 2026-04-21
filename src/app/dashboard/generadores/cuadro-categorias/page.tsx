'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GeneratorShell } from '@/components/generadores/generator-shell'
import type {
  CuadroCategoriasParams,
  PuestoParams,
  DimensionScore,
} from '@/lib/generators/cuadro-categorias'

export default function CuadroCategoriasPage() {
  return (
    <GeneratorShell
      type="cuadro-categorias"
      title="Cuadro de Categorías y Funciones"
      description="Clasificación objetiva de puestos según Ley 30709 con las 4 dimensiones (conocimientos, responsabilidad, esfuerzo, condiciones). Genera categorías A-E con rangos salariales auditables."
      baseLegal="Ley 30709 · D.S. 002-2018-TR · R.M. 243-2018-TR"
      gravity="GRAVE"
      estimatedMinutes={10}
      renderForm={({ onSubmit, loading }) => <Form onSubmit={onSubmit} loading={loading} />}
    />
  )
}

interface PuestoRow {
  id: string
  nombre: string
  area: string
  count: string
  conocimientos: DimensionScore
  responsabilidad: DimensionScore
  esfuerzo: DimensionScore
  condiciones: DimensionScore
  salarioMin: string
  salarioMax: string
  funciones: string
}

function createEmptyPuesto(): PuestoRow {
  return {
    id: `p-${Math.random().toString(36).slice(2, 8)}`,
    nombre: '',
    area: '',
    count: '1',
    conocimientos: 3,
    responsabilidad: 3,
    esfuerzo: 3,
    condiciones: 3,
    salarioMin: '',
    salarioMax: '',
    funciones: '',
  }
}

function Form({
  onSubmit,
  loading,
}: {
  onSubmit: (params: unknown) => void | Promise<void>
  loading: boolean
}) {
  const [fechaAprobacion, setFechaAprobacion] = useState(new Date().toISOString().slice(0, 10))
  const [vigenciaAnos, setVigenciaAnos] = useState(1)
  const [metodologia, setMetodologia] = useState('')
  const [puestos, setPuestos] = useState<PuestoRow[]>([createEmptyPuesto()])

  function updatePuesto(id: string, field: keyof PuestoRow, value: string | number) {
    setPuestos((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }
  function addPuesto() {
    setPuestos((prev) => [...prev, createEmptyPuesto()])
  }
  function removePuesto(id: string) {
    setPuestos((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev))
  }

  const validPuestos = puestos.filter((p) => {
    const min = Number(p.salarioMin)
    const max = Number(p.salarioMax)
    return p.nombre.trim() && p.funciones.trim() && min > 0 && max >= min
  })
  const canSubmit = validPuestos.length > 0

  function submit() {
    const params: CuadroCategoriasParams = {
      fechaAprobacion,
      vigenciaAnos,
      metodologia: metodologia.trim() || undefined,
      puestos: validPuestos.map<PuestoParams>((p) => ({
        nombre: p.nombre.trim(),
        area: p.area.trim() || undefined,
        count: Number(p.count) || undefined,
        dimensiones: {
          conocimientos: p.conocimientos,
          responsabilidad: p.responsabilidad,
          esfuerzo: p.esfuerzo,
          condiciones: p.condiciones,
        },
        salarioMin: Number(p.salarioMin),
        salarioMax: Number(p.salarioMax),
        funciones: p.funciones.trim(),
      })),
    }
    onSubmit(params)
  }

  return (
    <Card padding="lg" className="space-y-5">
      <div>
        <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed">
          Agregá cada puesto de tu organización y valorizalo con las 4 dimensiones de Ley 30709.
          El sistema calculará automáticamente la categoría (A-E) y agrupará los puestos.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Fecha de aprobación" required>
          <input
            type="date"
            value={fechaAprobacion}
            onChange={(e) => setFechaAprobacion(e.target.value)}
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Vigencia (años)">
          <input
            type="number"
            min={1}
            max={5}
            value={vigenciaAnos}
            onChange={(e) => setVigenciaAnos(Math.max(1, Number(e.target.value) || 1))}
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Metodología (opcional)">
          <input
            type="text"
            value={metodologia}
            onChange={(e) => setMetodologia(e.target.value)}
            placeholder="Default: R.M. 243-2018-TR"
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold">Puestos a clasificar ({puestos.length})</p>
          <button
            type="button"
            onClick={addPuesto}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar puesto
          </button>
        </div>

        <div className="space-y-4">
          {puestos.map((p, idx) => (
            <div
              key={p.id}
              className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)]/50 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-tertiary)]">
                  Puesto #{idx + 1}
                </p>
                {puestos.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removePuesto(p.id)}
                    className="text-xs text-crimson-700 hover:text-crimson-800 inline-flex items-center gap-1"
                    title="Eliminar puesto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Nombre del puesto" required>
                  <input
                    type="text"
                    value={p.nombre}
                    onChange={(e) => updatePuesto(p.id, 'nombre', e.target.value)}
                    placeholder="Ej. Analista Senior"
                    className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Área / Departamento">
                  <input
                    type="text"
                    value={p.area}
                    onChange={(e) => updatePuesto(p.id, 'area', e.target.value)}
                    placeholder="Ej. Operaciones"
                    className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="N° trabajadores en este puesto">
                  <input
                    type="number"
                    min={1}
                    value={p.count}
                    onChange={(e) => updatePuesto(p.id, 'count', e.target.value)}
                    className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
                  />
                </Field>
              </div>

              <Field label="Funciones principales" required>
                <textarea
                  value={p.funciones}
                  onChange={(e) => updatePuesto(p.id, 'funciones', e.target.value)}
                  rows={2}
                  placeholder="Descripción breve de las responsabilidades del puesto"
                  className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm resize-none"
                />
              </Field>

              <div>
                <p className="text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-widest mb-2">
                  Valorización (Ley 30709) — escala 1-5
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <DimensionInput
                    label="Conocimientos"
                    value={p.conocimientos}
                    onChange={(v) => updatePuesto(p.id, 'conocimientos', v)}
                  />
                  <DimensionInput
                    label="Responsabilidad"
                    value={p.responsabilidad}
                    onChange={(v) => updatePuesto(p.id, 'responsabilidad', v)}
                  />
                  <DimensionInput
                    label="Esfuerzo"
                    value={p.esfuerzo}
                    onChange={(v) => updatePuesto(p.id, 'esfuerzo', v)}
                  />
                  <DimensionInput
                    label="Condiciones"
                    value={p.condiciones}
                    onChange={(v) => updatePuesto(p.id, 'condiciones', v)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Salario mínimo (S/)" required>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={p.salarioMin}
                    onChange={(e) => updatePuesto(p.id, 'salarioMin', e.target.value)}
                    placeholder="1130"
                    className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Salario máximo (S/)" required>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={p.salarioMax}
                    onChange={(e) => updatePuesto(p.id, 'salarioMax', e.target.value)}
                    placeholder="2500"
                    className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <Button
          onClick={submit}
          disabled={loading || !canSubmit}
          icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          size="lg"
        >
          {loading ? 'Generando…' : `Generar cuadro (${validPuestos.length} puestos)`}
        </Button>
        {!canSubmit ? (
          <p className="text-xs text-[color:var(--text-tertiary)] mt-2">
            Completá al menos 1 puesto con nombre, funciones y salarios válidos (máx ≥ mín).
          </p>
        ) : null}
      </div>
    </Card>
  )
}

/* ── Helpers ───────────────────────────────────────────────────── */

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

function DimensionInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: DimensionScore
  onChange: (v: DimensionScore) => void
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)] mb-1">
        {label}
      </p>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n as DimensionScore)}
            className={`flex-1 rounded text-xs font-bold py-1.5 transition-colors ${
              value === n
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-[color:var(--border-default)] text-[color:var(--text-secondary)] hover:border-emerald-200'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
