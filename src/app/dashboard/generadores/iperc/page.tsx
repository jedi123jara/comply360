'use client'

import { useMemo, useState } from 'react'
import { Loader2, Sparkles, Plus, Trash2, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GeneratorShell } from '@/components/generadores/generator-shell'
import {
  BIBLIOTECA_PELIGROS,
  calcularNivelRiesgo,
  type IpercParams,
  type Peligro,
  type ScoreIperc,
  type JerarquiaControl,
  type PeligroBibliotecaItem,
} from '@/lib/generators/iperc'

export default function IpercGeneratorPage() {
  return (
    <GeneratorShell
      type="iperc"
      title="Matriz IPERC"
      description="Identificación de Peligros, Evaluación de Riesgos y Controles. Metodología R.M. 050-2013-TR con biblioteca de peligros por sector y cálculo automático del Nivel de Riesgo (P × S)."
      baseLegal="Ley 29783, Art. 57 · R.M. 050-2013-TR Anexo 3"
      gravity="MUY_GRAVE"
      estimatedMinutes={20}
      renderForm={({ onSubmit, loading }) => <Form onSubmit={onSubmit} loading={loading} />}
    />
  )
}

interface PeligroRow {
  id: string
  area: string
  tarea: string
  peligro: string
  riesgo: string
  probabilidadInicial: ScoreIperc
  severidad: ScoreIperc
  controlesExistentes: string
  probabilidadResidual: ScoreIperc
  controles: Array<{
    id: string
    jerarquia: JerarquiaControl
    descripcion: string
    responsable: string
    plazoDias: string
  }>
}

function createPeligro(): PeligroRow {
  return {
    id: `p-${Math.random().toString(36).slice(2, 8)}`,
    area: '',
    tarea: '',
    peligro: '',
    riesgo: '',
    probabilidadInicial: 3,
    severidad: 3,
    controlesExistentes: '',
    probabilidadResidual: 2,
    controles: [
      {
        id: `c-${Math.random().toString(36).slice(2, 8)}`,
        jerarquia: 'administrativo',
        descripcion: '',
        responsable: '',
        plazoDias: '30',
      },
    ],
  }
}

const JERARQUIA_OPTIONS: Array<{ value: JerarquiaControl; label: string }> = [
  { value: 'eliminacion', label: '1. Eliminación' },
  { value: 'sustitucion', label: '2. Sustitución' },
  { value: 'ingenieria', label: '3. Ingeniería' },
  { value: 'administrativo', label: '4. Administrativo' },
  { value: 'epp', label: '5. EPP' },
]

function Form({
  onSubmit,
  loading,
}: {
  onSubmit: (params: unknown) => void | Promise<void>
  loading: boolean
}) {
  const [fechaElaboracion, setFechaElaboracion] = useState(new Date().toISOString().slice(0, 10))
  const [responsable, setResponsable] = useState('')
  const [sectorGeneral, setSectorGeneral] = useState('')
  const [peligros, setPeligros] = useState<PeligroRow[]>([createPeligro()])
  const [bibliotecaAbierta, setBibliotecaAbierta] = useState<string | null>(null)

  function addPeligro() {
    setPeligros((prev) => [...prev, createPeligro()])
  }
  function removePeligro(id: string) {
    setPeligros((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev))
  }
  function updatePeligro<K extends keyof PeligroRow>(id: string, field: K, value: PeligroRow[K]) {
    setPeligros((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }
  function addControl(peligroId: string) {
    setPeligros((prev) =>
      prev.map((p) =>
        p.id === peligroId
          ? {
              ...p,
              controles: [
                ...p.controles,
                {
                  id: `c-${Math.random().toString(36).slice(2, 8)}`,
                  jerarquia: 'administrativo',
                  descripcion: '',
                  responsable: '',
                  plazoDias: '30',
                },
              ],
            }
          : p,
      ),
    )
  }
  function updateControl(
    peligroId: string,
    controlId: string,
    field: keyof PeligroRow['controles'][0],
    value: string,
  ) {
    setPeligros((prev) =>
      prev.map((p) =>
        p.id === peligroId
          ? {
              ...p,
              controles: p.controles.map((c) => (c.id === controlId ? { ...c, [field]: value } : c)),
            }
          : p,
      ),
    )
  }
  function removeControl(peligroId: string, controlId: string) {
    setPeligros((prev) =>
      prev.map((p) =>
        p.id === peligroId
          ? { ...p, controles: p.controles.length > 1 ? p.controles.filter((c) => c.id !== controlId) : p.controles }
          : p,
      ),
    )
  }

  function aplicarDesdeBiblioteca(peligroId: string, item: PeligroBibliotecaItem) {
    updatePeligro(peligroId, 'peligro', item.peligro)
    updatePeligro(peligroId, 'riesgo', item.riesgo)
    updatePeligro(peligroId, 'severidad', item.severidadSugerida)
    setBibliotecaAbierta(null)
  }

  const stats = useMemo(() => {
    const evaluados = peligros
      .filter((p) => p.peligro.trim())
      .map((p) => ({
        nr: calcularNivelRiesgo(p.probabilidadResidual, p.severidad),
      }))
    return {
      total: evaluados.length,
      intolerable: evaluados.filter((e) => e.nr.nivel === 'INTOLERABLE').length,
      importante: evaluados.filter((e) => e.nr.nivel === 'IMPORTANTE').length,
      moderado: evaluados.filter((e) => e.nr.nivel === 'MODERADO').length,
    }
  }, [peligros])

  const validPeligros = peligros.filter((p) => p.peligro.trim() && p.riesgo.trim() && p.area.trim() && p.tarea.trim())
  const canSubmit = responsable.trim() && sectorGeneral.trim() && validPeligros.length >= 1

  function submit() {
    const params: IpercParams = {
      fechaElaboracion,
      responsable: responsable.trim(),
      sectorGeneral: sectorGeneral.trim(),
      peligros: validPeligros.map<Peligro>((p) => ({
        area: p.area.trim(),
        tarea: p.tarea.trim(),
        peligro: p.peligro.trim(),
        riesgo: p.riesgo.trim(),
        probabilidadInicial: p.probabilidadInicial,
        severidad: p.severidad,
        controlesExistentes: p.controlesExistentes.trim() || undefined,
        probabilidadResidual: p.probabilidadResidual,
        controlesPropuestos: p.controles
          .filter((c) => c.descripcion.trim())
          .map((c) => ({
            jerarquia: c.jerarquia,
            descripcion: c.descripcion.trim(),
            responsable: c.responsable.trim() || undefined,
            plazoDias: c.plazoDias ? Number(c.plazoDias) : undefined,
          })),
      })),
    }
    onSubmit(params)
  }

  return (
    <Card padding="lg" className="space-y-5">
      {/* Datos generales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Fecha de elaboración" required>
          <input
            type="date"
            value={fechaElaboracion}
            onChange={(e) => setFechaElaboracion(e.target.value)}
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Responsable" required>
          <input
            type="text"
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
            placeholder="Ej. Jefe SST — Juan Pérez"
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Sector general" required>
          <input
            type="text"
            value={sectorGeneral}
            onChange={(e) => setSectorGeneral(e.target.value)}
            placeholder="Ej. Construcción civil / Servicios"
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
          />
        </Field>
      </div>

      {/* Stats */}
      {stats.total > 0 ? (
        <div className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)]/50 px-4 py-3 flex flex-wrap gap-4 text-xs">
          <span>
            <strong>{stats.total}</strong> peligros
          </span>
          {stats.intolerable > 0 ? (
            <span className="text-crimson-700">
              <strong>{stats.intolerable}</strong> INTOLERABLE ⚠
            </span>
          ) : null}
          {stats.importante > 0 ? (
            <span className="text-amber-700">
              <strong>{stats.importante}</strong> IMPORTANTE
            </span>
          ) : null}
          {stats.moderado > 0 ? (
            <span className="text-emerald-700">
              <strong>{stats.moderado}</strong> MODERADO
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Peligros */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold">Peligros identificados ({peligros.length})</p>
          <button
            type="button"
            onClick={addPeligro}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar peligro
          </button>
        </div>

        <div className="space-y-4">
          {peligros.map((p, idx) => {
            const nrInicial = calcularNivelRiesgo(p.probabilidadInicial, p.severidad)
            const nrResidual = calcularNivelRiesgo(p.probabilidadResidual, p.severidad)
            return (
              <div key={p.id} className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)]/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-tertiary)]">
                    Peligro #{idx + 1}
                    {' · '}
                    <span className={nrBadgeClass(nrResidual.nivel)}>
                      NR residual: {nrResidual.nr} {nrResidual.nivel}
                    </span>
                  </p>
                  {peligros.length > 1 ? (
                    <button onClick={() => removePeligro(p.id)} className="text-xs text-crimson-700 hover:text-crimson-800 inline-flex items-center gap-1">
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  ) : null}
                </div>

                {/* Biblioteca */}
                <div>
                  <button
                    type="button"
                    onClick={() => setBibliotecaAbierta(bibliotecaAbierta === p.id ? null : p.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50"
                  >
                    <BookOpen className="h-3 w-3" />
                    {bibliotecaAbierta === p.id ? 'Cerrar biblioteca' : 'Biblioteca de peligros por sector'}
                  </button>
                  {bibliotecaAbierta === p.id ? (
                    <div className="mt-2 rounded-lg border border-emerald-200 bg-white p-3 max-h-56 overflow-auto space-y-1">
                      {Object.entries(BIBLIOTECA_PELIGROS).map(([sector, items]) => (
                        <div key={sector}>
                          <p className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold mt-2 mb-1">
                            {sector}
                          </p>
                          {items.map((item, i) => (
                            <button
                              key={`${sector}-${i}`}
                              type="button"
                              onClick={() => aplicarDesdeBiblioteca(p.id, item)}
                              className="block w-full text-left rounded px-2 py-1 text-xs hover:bg-emerald-50 transition-colors"
                            >
                              <span className="font-semibold">{item.peligro}</span>
                              <span className="text-[color:var(--text-tertiary)]"> · S={item.severidadSugerida}</span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={p.area}
                    onChange={(e) => updatePeligro(p.id, 'area', e.target.value)}
                    placeholder="Área / Puesto *"
                    className="rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={p.tarea}
                    onChange={(e) => updatePeligro(p.id, 'tarea', e.target.value)}
                    placeholder="Tarea específica *"
                    className="rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
                  />
                </div>
                <input
                  type="text"
                  value={p.peligro}
                  onChange={(e) => updatePeligro(p.id, 'peligro', e.target.value)}
                  placeholder="Peligro (ej. Trabajo en altura sin arnés) *"
                  className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={p.riesgo}
                  onChange={(e) => updatePeligro(p.id, 'riesgo', e.target.value)}
                  placeholder="Riesgo asociado (ej. Caída de altura con fractura) *"
                  className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
                />

                {/* Evaluación */}
                <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                  <ScoreSelect
                    label="Prob. inicial"
                    value={p.probabilidadInicial}
                    onChange={(v) => updatePeligro(p.id, 'probabilidadInicial', v)}
                  />
                  <ScoreSelect
                    label="Severidad"
                    value={p.severidad}
                    onChange={(v) => updatePeligro(p.id, 'severidad', v)}
                  />
                  <ScoreSelect
                    label="Prob. residual"
                    value={p.probabilidadResidual}
                    onChange={(v) => updatePeligro(p.id, 'probabilidadResidual', v)}
                  />
                </div>
                <div className="rounded bg-white border border-[color:var(--border-subtle)] px-3 py-2 text-xs">
                  <span className="text-[color:var(--text-tertiary)]">Sin controles: </span>
                  <span className={nrBadgeClass(nrInicial.nivel)}>
                    NR = {nrInicial.nr} ({nrInicial.nivel})
                  </span>
                  <span className="text-[color:var(--text-tertiary)]"> → Con controles: </span>
                  <span className={nrBadgeClass(nrResidual.nivel)}>
                    NR = {nrResidual.nr} ({nrResidual.nivel})
                  </span>
                </div>

                <textarea
                  value={p.controlesExistentes}
                  onChange={(e) => updatePeligro(p.id, 'controlesExistentes', e.target.value)}
                  rows={2}
                  placeholder="Controles ya implementados (opcional)"
                  className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm resize-none"
                />

                {/* Controles propuestos */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--text-secondary)]">
                      Controles propuestos (jerarquía)
                    </p>
                    <button type="button" onClick={() => addControl(p.id)} className="text-[10px] text-emerald-700 hover:underline inline-flex items-center gap-0.5">
                      <Plus className="h-3 w-3" /> Control
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {p.controles.map((c) => (
                      <div key={c.id} className="flex flex-wrap gap-1.5 items-start rounded bg-white border border-[color:var(--border-subtle)] px-2 py-1.5">
                        <select
                          value={c.jerarquia}
                          onChange={(e) => updateControl(p.id, c.id, 'jerarquia', e.target.value)}
                          className="rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-[11px]"
                        >
                          {JERARQUIA_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={c.descripcion}
                          onChange={(e) => updateControl(p.id, c.id, 'descripcion', e.target.value)}
                          placeholder="Descripción del control"
                          className="flex-1 min-w-[200px] rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs"
                        />
                        <input
                          type="text"
                          value={c.responsable}
                          onChange={(e) => updateControl(p.id, c.id, 'responsable', e.target.value)}
                          placeholder="Responsable"
                          className="w-28 rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-[11px]"
                        />
                        <input
                          type="number"
                          value={c.plazoDias}
                          onChange={(e) => updateControl(p.id, c.id, 'plazoDias', e.target.value)}
                          placeholder="Días"
                          min={1}
                          className="w-16 rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-[11px]"
                        />
                        {p.controles.length > 1 ? (
                          <button onClick={() => removeControl(p.id, c.id)} className="text-crimson-700 hover:bg-crimson-50 rounded p-0.5">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="pt-2">
        <Button
          onClick={submit}
          disabled={loading || !canSubmit}
          icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          size="lg"
        >
          {loading ? 'Generando…' : `Generar matriz IPERC (${validPeligros.length} peligros)`}
        </Button>
      </div>
    </Card>
  )
}

/* ── Helpers ───────────────────────────────────────────────────── */

function nrBadgeClass(nivel: string): string {
  if (nivel === 'INTOLERABLE') return 'inline-block font-bold rounded px-1.5 py-0 text-[10px] bg-red-800 text-white'
  if (nivel === 'IMPORTANTE') return 'inline-block font-bold rounded px-1.5 py-0 text-[10px] bg-crimson-100 text-crimson-800'
  if (nivel === 'MODERADO') return 'inline-block font-bold rounded px-1.5 py-0 text-[10px] bg-amber-100 text-amber-800'
  if (nivel === 'TOLERABLE') return 'inline-block font-bold rounded px-1.5 py-0 text-[10px] bg-emerald-100 text-emerald-800'
  return 'inline-block font-bold rounded px-1.5 py-0 text-[10px] bg-[color:var(--neutral-100)] text-[color:var(--text-tertiary)]'
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

function ScoreSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: ScoreIperc
  onChange: (v: ScoreIperc) => void
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
            onClick={() => onChange(n as ScoreIperc)}
            className={`flex-1 rounded text-xs font-bold py-1 transition-colors ${
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
