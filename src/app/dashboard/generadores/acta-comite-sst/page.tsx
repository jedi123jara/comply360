'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GeneratorShell } from '@/components/generadores/generator-shell'
import type {
  ActaComiteSstParams,
  ActaTipo,
  MiembroComite,
} from '@/lib/generators/acta-comite-sst'

export default function ActaComiteSstPage() {
  return (
    <GeneratorShell
      type="acta-comite-sst"
      title="Acta de Comité / Supervisor SST"
      description="Acta de conformación del Comité paritario (empresas 20+) o de designación del Supervisor SST (empresas <20). Incluye mandato, funciones, garantías y firmas."
      baseLegal="Ley 29783, Art. 29-30 · D.S. 005-2012-TR, Art. 42-75"
      gravity="GRAVE"
      estimatedMinutes={7}
      renderForm={({ onSubmit, loading }) => <Form onSubmit={onSubmit} loading={loading} />}
    />
  )
}

interface MiembroRow {
  id: string
  nombre: string
  dni: string
  cargo: string
  area: string
  rol: 'titular' | 'suplente'
  representa: 'empleador' | 'trabajadores'
}

function createMiembro(representa: 'empleador' | 'trabajadores', rol: 'titular' | 'suplente' = 'titular'): MiembroRow {
  return {
    id: `m-${Math.random().toString(36).slice(2, 8)}`,
    nombre: '',
    dni: '',
    cargo: '',
    area: '',
    rol,
    representa,
  }
}

function Form({
  onSubmit,
  loading,
}: {
  onSubmit: (params: unknown) => void | Promise<void>
  loading: boolean
}) {
  const [tipo, setTipo] = useState<ActaTipo>('comite')
  const [fechaActa, setFechaActa] = useState(new Date().toISOString().slice(0, 10))
  const [lugarActa, setLugarActa] = useState('')
  const [mandatoAnos, setMandatoAnos] = useState(2)

  // Comité
  const [miembros, setMiembros] = useState<MiembroRow[]>([
    createMiembro('empleador', 'titular'),
    createMiembro('trabajadores', 'titular'),
  ])
  const [presidente, setPresidente] = useState('')
  const [secretario, setSecretario] = useState('')
  const [fechaEleccion, setFechaEleccion] = useState('')
  const [votantes, setVotantes] = useState('')

  // Supervisor
  const [supNombre, setSupNombre] = useState('')
  const [supDni, setSupDni] = useState('')
  const [supCargo, setSupCargo] = useState('')
  const [modoDesignacion, setModoDesignacion] = useState('')

  function updateMiembro(id: string, field: keyof MiembroRow, value: string) {
    setMiembros((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)))
  }
  function addMiembro(representa: 'empleador' | 'trabajadores', rol: 'titular' | 'suplente') {
    setMiembros((prev) => [...prev, createMiembro(representa, rol)])
  }
  function removeMiembro(id: string) {
    setMiembros((prev) => prev.filter((m) => m.id !== id))
  }

  // Validación paridad (solo tipo=comite)
  const titularesEmpleador = miembros.filter((m) => m.rol === 'titular' && m.representa === 'empleador' && m.nombre.trim() && m.dni.trim()).length
  const titularesTrabajadores = miembros.filter((m) => m.rol === 'titular' && m.representa === 'trabajadores' && m.nombre.trim() && m.dni.trim()).length
  const paridadOk = titularesEmpleador > 0 && titularesEmpleador === titularesTrabajadores

  const canSubmit =
    tipo === 'comite' ? paridadOk : supNombre.trim() && supDni.trim()

  function submit() {
    const params: ActaComiteSstParams = {
      tipo,
      fechaActa,
      lugarActa,
      mandatoAnos,
      ...(tipo === 'comite'
        ? {
            miembros: miembros
              .filter((m) => m.nombre.trim() && m.dni.trim())
              .map<MiembroComite>((m) => ({
                nombre: m.nombre.trim(),
                dni: m.dni.trim(),
                cargo: m.cargo.trim() || undefined,
                area: m.area.trim() || undefined,
                rol: m.rol,
                representa: m.representa,
              })),
            presidente: presidente.trim() || undefined,
            secretario: secretario.trim() || undefined,
            fechaEleccion: fechaEleccion || undefined,
            votantesElecciones: votantes ? Number(votantes) : undefined,
          }
        : {
            supervisorNombre: supNombre.trim(),
            supervisorDni: supDni.trim(),
            supervisorCargo: supCargo.trim() || undefined,
            modoDesignacion: modoDesignacion.trim() || undefined,
          }),
    }
    onSubmit(params)
  }

  return (
    <Card padding="lg" className="space-y-5">
      {/* Tipo */}
      <div>
        <p className="text-sm font-bold mb-2">Tipo de acta</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <RadioCard
            checked={tipo === 'comite'}
            onChange={() => setTipo('comite')}
            label="Comité SST paritario"
            hint="Empresas con 20+ trabajadores"
          />
          <RadioCard
            checked={tipo === 'supervisor'}
            onChange={() => setTipo('supervisor')}
            label="Supervisor SST"
            hint="Empresas con <20 trabajadores"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Fecha del acta" required>
          <input
            type="date"
            value={fechaActa}
            onChange={(e) => setFechaActa(e.target.value)}
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Lugar del acta">
          <input
            type="text"
            value={lugarActa}
            onChange={(e) => setLugarActa(e.target.value)}
            placeholder="Lima, Sede Central"
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Mandato (años)">
          <input
            type="number"
            min={1}
            max={3}
            value={mandatoAnos}
            onChange={(e) => setMandatoAnos(Math.max(1, Number(e.target.value) || 1))}
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
          />
        </Field>
      </div>

      {tipo === 'comite' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Fecha elección trabajadores">
              <input
                type="date"
                value={fechaEleccion}
                onChange={(e) => setFechaEleccion(e.target.value)}
                className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="N° trabajadores votantes">
              <input
                type="number"
                min={0}
                value={votantes}
                onChange={(e) => setVotantes(e.target.value)}
                placeholder="Ej. 25"
                className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
              />
            </Field>
            <div />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold">
                Miembros del Comité{' '}
                <span
                  className={`text-xs font-normal ${
                    paridadOk ? 'text-emerald-700' : 'text-crimson-700'
                  }`}
                >
                  · Paridad: {titularesEmpleador}E / {titularesTrabajadores}T {paridadOk ? '✓' : '✗'}
                </span>
              </p>
              <div className="flex gap-1">
                <MiniBtn onClick={() => addMiembro('empleador', 'titular')}>+ Titular E</MiniBtn>
                <MiniBtn onClick={() => addMiembro('empleador', 'suplente')}>+ Supl. E</MiniBtn>
                <MiniBtn onClick={() => addMiembro('trabajadores', 'titular')}>+ Titular T</MiniBtn>
                <MiniBtn onClick={() => addMiembro('trabajadores', 'suplente')}>+ Supl. T</MiniBtn>
              </div>
            </div>
            <div className="space-y-2">
              {miembros.map((m) => (
                <MiembroRowForm
                  key={m.id}
                  m={m}
                  onUpdate={(f, v) => updateMiembro(m.id, f, v)}
                  onRemove={() => removeMiembro(m.id)}
                  canRemove={miembros.length > 2}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Presidente electo">
              <input
                type="text"
                value={presidente}
                onChange={(e) => setPresidente(e.target.value)}
                placeholder="Nombre (debe ser miembro)"
                className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Secretario electo">
              <input
                type="text"
                value={secretario}
                onChange={(e) => setSecretario(e.target.value)}
                placeholder="Nombre (debe ser miembro)"
                className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
              />
            </Field>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nombre del Supervisor" required>
              <input
                type="text"
                value={supNombre}
                onChange={(e) => setSupNombre(e.target.value)}
                placeholder="Nombre completo"
                className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="DNI" required>
              <input
                type="text"
                value={supDni}
                onChange={(e) => setSupDni(e.target.value)}
                placeholder="12345678"
                maxLength={8}
                className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Cargo del Supervisor">
              <input
                type="text"
                value={supCargo}
                onChange={(e) => setSupCargo(e.target.value)}
                placeholder="Ej. Jefe de Operaciones"
                className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Modo de designación">
              <input
                type="text"
                value={modoDesignacion}
                onChange={(e) => setModoDesignacion(e.target.value)}
                placeholder="Designación empleador + aceptación trabajadores"
                className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
              />
            </Field>
          </div>
        </>
      )}

      <div className="pt-2">
        <Button
          onClick={submit}
          disabled={loading || !canSubmit}
          icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          size="lg"
        >
          {loading ? 'Generando…' : 'Generar acta'}
        </Button>
        {!canSubmit ? (
          <p className="text-xs text-[color:var(--text-tertiary)] mt-2">
            {tipo === 'comite'
              ? 'Necesitás que los titulares del empleador y de los trabajadores sean iguales en cantidad (paridad).'
              : 'Completa nombre y DNI del supervisor.'}
          </p>
        ) : null}
      </div>
    </Card>
  )
}

function MiembroRowForm({
  m,
  onUpdate,
  onRemove,
  canRemove,
}: {
  m: MiembroRow
  onUpdate: (field: keyof MiembroRow, value: string) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const badgeColor =
    m.representa === 'empleador'
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-amber-100 text-amber-800'

  return (
    <div className="rounded-lg border border-[color:var(--border-subtle)] bg-white px-3 py-2 flex flex-wrap gap-2 items-start">
      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${badgeColor}`}>
        {m.representa === 'empleador' ? 'Empleador' : 'Trabaj.'} · {m.rol === 'titular' ? 'Tit.' : 'Supl.'}
      </span>
      <input
        type="text"
        value={m.nombre}
        onChange={(e) => onUpdate('nombre', e.target.value)}
        placeholder="Nombre completo"
        className="flex-1 min-w-[200px] rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs"
      />
      <input
        type="text"
        value={m.dni}
        onChange={(e) => onUpdate('dni', e.target.value)}
        placeholder="DNI"
        maxLength={8}
        className="w-24 rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs"
      />
      <input
        type="text"
        value={m.cargo}
        onChange={(e) => onUpdate('cargo', e.target.value)}
        placeholder="Cargo"
        className="flex-1 min-w-[120px] rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs"
      />
      {canRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-crimson-700 hover:bg-crimson-50 rounded p-1"
          title="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}

function MiniBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100"
    >
      <Plus className="h-3 w-3" />
      {children}
    </button>
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
      className={`rounded-lg border px-3 py-2.5 text-left transition-all ${
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
