'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GeneratorShell } from '@/components/generadores/generator-shell'
import type { PoliticaSstParams } from '@/lib/generators/politica-sst'

export default function PoliticaSstGeneratorPage() {
  return (
    <GeneratorShell
      type="politica-sst"
      title="Política de Seguridad y Salud en el Trabajo"
      description="Genera la política con los 8 elementos obligatorios del Art. 22 Ley 29783, lista para firmar por gerencia y exhibir en el centro de trabajo."
      baseLegal="Ley 29783, Art. 22 · D.S. 005-2012-TR, Art. 32"
      gravity="GRAVE"
      estimatedMinutes={5}
      renderForm={({ onSubmit, loading }) => <PoliticaSstForm onSubmit={onSubmit} loading={loading} />}
    />
  )
}

function PoliticaSstForm({
  onSubmit,
  loading,
}: {
  onSubmit: (params: unknown) => void | Promise<void>
  loading: boolean
}) {
  const [alcance, setAlcance] = useState<PoliticaSstParams['alcance']>('toda-empresa')
  const [areasEspecificas, setAreasEspecificas] = useState('')
  const [actividadesPrincipales, setActividadesPrincipales] = useState('')
  const [tipoRepresentacion, setTipoRepresentacion] = useState<PoliticaSstParams['tipoRepresentacion']>('comite')
  const [sistemasIntegrados, setSistemasIntegrados] = useState('')
  const [fechaAprobacion, setFechaAprobacion] = useState(new Date().toISOString().slice(0, 10))
  const [vigenciaAnos, setVigenciaAnos] = useState(1)
  const [compromisosAdicionales, setCompromisosAdicionales] = useState('')

  function submit() {
    const params: PoliticaSstParams = {
      alcance,
      areasEspecificas:
        alcance === 'areas-especificas'
          ? areasEspecificas.split(/[,\n]/).map((a) => a.trim()).filter(Boolean)
          : undefined,
      actividadesPrincipales: actividadesPrincipales.trim() || 'actividades empresariales',
      tipoRepresentacion,
      sistemasIntegrados: sistemasIntegrados
        ? sistemasIntegrados.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
        : undefined,
      fechaAprobacion,
      vigenciaAnos,
      compromisosAdicionales: compromisosAdicionales
        ? compromisosAdicionales.split('\n').map((c) => c.trim()).filter(Boolean)
        : undefined,
    }
    onSubmit(params)
  }

  return (
    <Card padding="lg" className="space-y-5">
      {/* Alcance */}
      <Field label="Alcance de la política" required>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <RadioCard
            checked={alcance === 'toda-empresa'}
            onChange={() => setAlcance('toda-empresa')}
            label="Toda la empresa"
            hint="Recomendado — cobertura máxima para auditoría"
          />
          <RadioCard
            checked={alcance === 'areas-especificas'}
            onChange={() => setAlcance('areas-especificas')}
            label="Áreas específicas"
            hint="Solo ciertos departamentos o sedes"
          />
        </div>
        {alcance === 'areas-especificas' ? (
          <textarea
            value={areasEspecificas}
            onChange={(e) => setAreasEspecificas(e.target.value)}
            rows={2}
            placeholder="Área administrativa, Planta de producción, Almacén (una por línea o separadas por coma)"
            className="mt-2 w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          />
        ) : null}
      </Field>

      {/* Actividades principales */}
      <Field label="Actividades principales de la empresa" required>
        <input
          type="text"
          value={actividadesPrincipales}
          onChange={(e) => setActividadesPrincipales(e.target.value)}
          placeholder="Ej. Construcción de obras civiles / Servicios de contabilidad / Manufactura textil"
          className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        />
        <p className="text-[11px] text-[color:var(--text-tertiary)] mt-1">
          Usa una descripción corta; aparecerá en el Elemento 1 de la política.
        </p>
      </Field>

      {/* Tipo de representación */}
      <Field label="Representación de trabajadores en SST" required>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <RadioCard
            checked={tipoRepresentacion === 'comite'}
            onChange={() => setTipoRepresentacion('comite')}
            label="Comité SST"
            hint="Obligatorio si ≥ 20 trabajadores"
          />
          <RadioCard
            checked={tipoRepresentacion === 'supervisor'}
            onChange={() => setTipoRepresentacion('supervisor')}
            label="Supervisor SST"
            hint="Aplica si < 20 trabajadores"
          />
        </div>
      </Field>

      {/* Sistemas integrados */}
      <Field label="Sistemas de gestión integrados (opcional)">
        <input
          type="text"
          value={sistemasIntegrados}
          onChange={(e) => setSistemasIntegrados(e.target.value)}
          placeholder="Ej. ISO 9001, ISO 14001, ISO 45001 (separados por coma)"
          className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        />
      </Field>

      {/* Compromisos adicionales */}
      <Field label="Compromisos adicionales del empleador (opcional)">
        <textarea
          value={compromisosAdicionales}
          onChange={(e) => setCompromisosAdicionales(e.target.value)}
          rows={3}
          placeholder="Un compromiso por línea. Ej: Destinar 0.5% de ventas a programas SST&#10;Realizar simulacros trimestrales"
          className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 resize-none"
        />
      </Field>

      {/* Fecha + vigencia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fecha de aprobación" required>
          <input
            type="date"
            value={fechaAprobacion}
            onChange={(e) => setFechaAprobacion(e.target.value)}
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          />
        </Field>
        <Field label="Vigencia (años)">
          <input
            type="number"
            min={1}
            max={5}
            value={vigenciaAnos}
            onChange={(e) => setVigenciaAnos(Math.max(1, Number(e.target.value) || 1))}
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          />
        </Field>
      </div>

      <div className="pt-2">
        <Button
          onClick={submit}
          disabled={loading || !actividadesPrincipales.trim()}
          icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          size="lg"
        >
          {loading ? 'Generando…' : 'Generar política'}
        </Button>
      </div>
    </Card>
  )
}

/* ── Field + RadioCard helpers ─────────────────────────────────── */

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

function RadioCard({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: () => void
  label: string
  hint: string
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`rounded-lg border px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
        checked
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-[color:var(--border-default)] bg-white hover:border-emerald-200'
      }`}
      aria-pressed={checked}
    >
      <p className="text-sm font-bold">{label}</p>
      <p className="text-xs text-[color:var(--text-secondary)] mt-0.5">{hint}</p>
    </button>
  )
}
