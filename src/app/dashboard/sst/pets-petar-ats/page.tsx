'use client'

import { useState, type FormEvent } from 'react'
import {
  FileText,
  AlertTriangle,
  ClipboardCheck,
  Plus,
  Trash2,
  Download,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  TIPO_TRABAJO_LABELS,
  validatePets,
  validatePetar,
  validateAts,
  type DocType,
  type TipoTrabajoAltoRiesgo,
  type PetsInput,
  type PetarInput,
  type AtsInput,
} from '@/lib/sst/pets-petar-ats'

/**
 * Generador unificado de PETS / PETAR / ATS.
 *
 * Página con tabs para los 3 tipos de documento. Al completar el form y
 * presionar "Generar PDF", el cliente envía JSON al endpoint
 * /api/sst/pets-petar-ats que retorna el PDF directamente y lo abre en
 * pestaña nueva.
 */

const TABS: Array<{ value: DocType; label: string; desc: string; icon: typeof FileText }> = [
  {
    value: 'PETS',
    label: 'PETS',
    desc: 'Procedimiento Escrito de Trabajo Seguro (D.S. 005-2012-TR Art. 32)',
    icon: FileText,
  },
  {
    value: 'PETAR',
    label: 'PETAR',
    desc: 'Permiso Escrito para Trabajos de Alto Riesgo',
    icon: AlertTriangle,
  },
  {
    value: 'ATS',
    label: 'ATS',
    desc: 'Análisis de Trabajo Seguro (pre-tarea, diario)',
    icon: ClipboardCheck,
  },
]

export default function PetsPetarAtsPage() {
  const [activeTab, setActiveTab] = useState<DocType>('PETS')

  return (
    <div className="space-y-6">
      <PageHeader
        title="PETS / PETAR / ATS"
        subtitle="Genera los 3 documentos operacionales SST: procedimientos permanentes (PETS), permisos para alto riesgo (PETAR) y análisis pre-tarea (ATS)."
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = activeTab === t.value
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setActiveTab(t.value)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 -mb-px font-semibold text-sm transition-colors ${
                active
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>
      <p className="text-sm text-slate-600 -mt-3">
        {TABS.find((t) => t.value === activeTab)?.desc}
      </p>

      {activeTab === 'PETS' && <PetsForm />}
      {activeTab === 'PETAR' && <PetarForm />}
      {activeTab === 'ATS' && <AtsForm />}
    </div>
  )
}

// ── Helpers shared ─────────────────────────────────────────────────────────

function StringList({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string
  values: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState('')
  function add() {
    const v = draft.trim()
    if (!v) return
    onChange([...values, v])
    setDraft('')
  }
  function remove(i: number) {
    onChange(values.filter((_, idx) => idx !== i))
  }
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <Button type="button" variant="ghost" size="sm" onClick={add}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <ul className="space-y-1">
          {values.map((v, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 ring-1 ring-slate-200 px-3 py-1.5 text-sm"
            >
              <span className="flex-1 min-w-0 text-slate-700 truncate">{v}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-slate-400 hover:text-red-600 shrink-0"
                aria-label="Eliminar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

async function postAndDownload(body: unknown) {
  const res = await fetch('/api/sst/pets-petar-ats', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error ?? `HTTP ${res.status}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// ── PETS Form ──────────────────────────────────────────────────────────────

function PetsForm() {
  const [titulo, setTitulo] = useState('')
  const [version, setVersion] = useState(1)
  const [objetivo, setObjetivo] = useState('')
  const [alcance, setAlcance] = useState('')
  const [responsables, setResponsables] = useState<string[]>([])
  const [equipos, setEquipos] = useState<string[]>([])
  const [epp, setEpp] = useState<string[]>([])
  const [pasos, setPasos] = useState<
    Array<{ numero: number; descripcion: string; peligros: string[]; controles: string[] }>
  >([])
  const [emergencias, setEmergencias] = useState<string[]>([])
  const [referencias, setReferencias] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pasoDraft, setPasoDraft] = useState('')

  function addPaso() {
    const v = pasoDraft.trim()
    if (!v) return
    setPasos((prev) => [
      ...prev,
      { numero: prev.length + 1, descripcion: v, peligros: [], controles: [] },
    ])
    setPasoDraft('')
  }

  function removePaso(i: number) {
    setPasos((prev) =>
      prev
        .filter((_, idx) => idx !== i)
        .map((p, idx) => ({ ...p, numero: idx + 1 })),
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const input: PetsInput = {
      titulo,
      version,
      objetivo,
      alcance,
      responsables,
      equipos,
      epp,
      pasos,
      emergencias,
      referenciasLegales: referencias,
    }
    const errs = validatePets(input)
    if (errs.length > 0) {
      setError(errs.join(' · '))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await postAndDownload({ docType: 'PETS', ...input })
      toast.success('PETS generado')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block sm:col-span-2">
              <span className="block text-sm font-medium text-slate-700 mb-1">
                Título del procedimiento <span className="text-red-500">*</span>
              </span>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
                placeholder="Ej: Operación de montacargas en almacén"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Versión</span>
              <input
                type="number"
                min="1"
                value={version}
                onChange={(e) => setVersion(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">
              Objetivo <span className="text-red-500">*</span>
            </span>
            <textarea
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              rows={2}
              required
              minLength={10}
              placeholder="Establecer los pasos seguros para..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">
              Alcance <span className="text-red-500">*</span>
            </span>
            <textarea
              value={alcance}
              onChange={(e) => setAlcance(e.target.value)}
              rows={2}
              required
              placeholder="Aplica a todo el personal de... en la sede..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 grid sm:grid-cols-2 gap-4">
          <StringList
            label="Responsables"
            values={responsables}
            onChange={setResponsables}
            placeholder="Ej: Jefe de Almacén"
          />
          <StringList
            label="Equipos / herramientas"
            values={equipos}
            onChange={setEquipos}
            placeholder="Ej: Montacargas eléctrico"
          />
          <StringList
            label="EPP obligatorio"
            values={epp}
            onChange={setEpp}
            placeholder="Ej: Casco, chaleco reflectivo"
          />
          <StringList
            label="Acciones ante emergencia"
            values={emergencias}
            onChange={setEmergencias}
            placeholder="Ej: Activar alarma de evacuación"
          />
          <StringList
            label="Referencias legales"
            values={referencias}
            onChange={setReferencias}
            placeholder="Ej: Ley 29783 Art. 32"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">
            Pasos del procedimiento <span className="text-red-500">*</span>
          </h3>
          <div className="flex gap-2 mb-3">
            <input
              value={pasoDraft}
              onChange={(e) => setPasoDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addPaso()
                }
              }}
              placeholder="Describe el paso..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <Button type="button" variant="ghost" onClick={addPaso}>
              <Plus className="w-4 h-4 mr-1" /> Agregar
            </Button>
          </div>
          {pasos.length === 0 ? (
            <p className="text-sm text-slate-500 italic">
              Agrega los pasos en el orden que deben ejecutarse.
            </p>
          ) : (
            <ol className="space-y-2">
              {pasos.map((p, i) => (
                <li
                  key={i}
                  className="rounded-lg ring-1 ring-slate-200 p-3 flex items-start gap-2"
                >
                  <span className="font-bold text-slate-700 shrink-0">{p.numero}.</span>
                  <span className="flex-1 text-sm text-slate-700">{p.descripcion}</span>
                  <button
                    type="button"
                    onClick={() => removePaso(i)}
                    className="text-slate-400 hover:text-red-600"
                    aria-label="Eliminar paso"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-50 ring-1 ring-red-200 p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Generar PDF
        </Button>
      </div>
    </form>
  )
}

// ── PETAR Form ─────────────────────────────────────────────────────────────

function PetarForm() {
  const [tipo, setTipo] = useState<TipoTrabajoAltoRiesgo>('TRABAJO_EN_ALTURAS')
  const [descripcion, setDescripcion] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [supervisorNombre, setSupervisorNombre] = useState('')
  const [supervisorDni, setSupervisorDni] = useState('')
  const [ejecutoresStr, setEjecutoresStr] = useState('')
  const [peligros, setPeligros] = useState<string[]>([])
  const [controles, setControles] = useState<string[]>([])
  const [eppVerificado, setEppVerificado] = useState<string[]>([])
  const [aislamientos, setAislamientos] = useState<string[]>([])
  const [contingencia, setContingencia] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const ejecutores = ejecutoresStr
      .split(/\n|;/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/\||,/).map((p) => p.trim())
        return {
          nombre: parts[0] ?? '',
          dni: parts[1] ?? '',
          cargo: parts[2] ?? undefined,
        }
      })
      .filter((e) => e.nombre && e.dni)

    const input: PetarInput = {
      tipo,
      descripcion,
      ubicacion,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : new Date(0),
      fechaFin: fechaFin ? new Date(fechaFin) : new Date(0),
      ejecutores,
      supervisorNombre,
      supervisorDni,
      peligros,
      controles,
      eppVerificado,
      equiposVerificados: [],
      aislamientos: aislamientos.length > 0 ? aislamientos : undefined,
      contingencia,
    }
    const errs = validatePetar(input)
    if (errs.length > 0) {
      setError(errs.join(' · '))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await postAndDownload({
        docType: 'PETAR',
        ...input,
        fechaInicio: input.fechaInicio.toISOString(),
        fechaFin: input.fechaFin.toISOString(),
      })
      toast.success('PETAR generado')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">
              Tipo de trabajo <span className="text-red-500">*</span>
            </span>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoTrabajoAltoRiesgo)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {Object.entries(TIPO_TRABAJO_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">
              Descripción del trabajo <span className="text-red-500">*</span>
            </span>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              required
              placeholder="Reparación de tubería en el techo del galpón..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">
                Ubicación <span className="text-red-500">*</span>
              </span>
              <input
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">
                Inicio <span className="text-red-500">*</span>
              </span>
              <input
                type="datetime-local"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">
                Fin <span className="text-red-500">*</span>
              </span>
              <input
                type="datetime-local"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">
                Supervisor <span className="text-red-500">*</span>
              </span>
              <input
                value={supervisorNombre}
                onChange={(e) => setSupervisorNombre(e.target.value)}
                required
                placeholder="Nombre completo"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">
                DNI supervisor <span className="text-red-500">*</span>
              </span>
              <input
                value={supervisorDni}
                onChange={(e) => setSupervisorDni(e.target.value.replace(/\D/g, '').slice(0, 15))}
                required
                inputMode="numeric"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">
              Ejecutores autorizados <span className="text-red-500">*</span>
            </span>
            <textarea
              value={ejecutoresStr}
              onChange={(e) => setEjecutoresStr(e.target.value)}
              rows={3}
              placeholder="Uno por línea: Juan Pérez | 12345678 | Soldador"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            />
            <p className="mt-1 text-xs text-slate-500">
              Formato por línea: Nombre | DNI | Cargo (opcional)
            </p>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 grid sm:grid-cols-2 gap-4">
          <StringList
            label="Peligros identificados *"
            values={peligros}
            onChange={setPeligros}
            placeholder="Ej: Caída de altura"
          />
          <StringList
            label="Controles aplicados *"
            values={controles}
            onChange={setControles}
            placeholder="Ej: Línea de vida anclada"
          />
          <StringList
            label="EPP verificado"
            values={eppVerificado}
            onChange={setEppVerificado}
            placeholder="Ej: Arnés certificado ANSI Z359"
          />
          <StringList
            label="Aislamientos / LOTO"
            values={aislamientos}
            onChange={setAislamientos}
            placeholder="Ej: Tablero eléctrico bloqueado y tarjeta puesta"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">
              Plan de contingencia <span className="text-red-500">*</span>
            </span>
            <textarea
              value={contingencia}
              onChange={(e) => setContingencia(e.target.value)}
              rows={3}
              required
              minLength={10}
              placeholder="En caso de accidente: detener trabajo, activar...; teléfono emergencias: 116..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-50 ring-1 ring-red-200 p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Generar PETAR
        </Button>
      </div>
    </form>
  )
}

// ── ATS Form ───────────────────────────────────────────────────────────────

function AtsForm() {
  const [tarea, setTarea] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [supervisorNombre, setSupervisorNombre] = useState('')
  const [supervisorDni, setSupervisorDni] = useState('')
  const [ejecutoresStr, setEjecutoresStr] = useState('')
  const [pasos, setPasos] = useState<
    Array<{ numero: number; paso: string; peligros: string[]; controles: string[] }>
  >([])
  const [pasoDraft, setPasoDraft] = useState('')
  const [pasoPeligrosDraft, setPasoPeligrosDraft] = useState('')
  const [pasoControlesDraft, setPasoControlesDraft] = useState('')
  const [epp, setEpp] = useState<string[]>([])
  const [observaciones, setObservaciones] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addPaso() {
    if (!pasoDraft.trim()) return
    setPasos((prev) => [
      ...prev,
      {
        numero: prev.length + 1,
        paso: pasoDraft.trim(),
        peligros: pasoPeligrosDraft
          .split(/[;,]/)
          .map((s) => s.trim())
          .filter(Boolean),
        controles: pasoControlesDraft
          .split(/[;,]/)
          .map((s) => s.trim())
          .filter(Boolean),
      },
    ])
    setPasoDraft('')
    setPasoPeligrosDraft('')
    setPasoControlesDraft('')
  }

  function removePaso(i: number) {
    setPasos((prev) =>
      prev.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, numero: idx + 1 })),
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const ejecutores = ejecutoresStr
      .split(/\n|;/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/\||,/).map((p) => p.trim())
        return { nombre: parts[0] ?? '', dni: parts[1] ?? '' }
      })
      .filter((e) => e.nombre && e.dni)

    const input: AtsInput = {
      tarea,
      ubicacion,
      fecha: new Date(fecha),
      supervisor: { nombre: supervisorNombre, dni: supervisorDni },
      ejecutores,
      pasos,
      epp,
      observaciones: observaciones.trim() || undefined,
    }
    const errs = validateAts(input)
    if (errs.length > 0) {
      setError(errs.join(' · '))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await postAndDownload({
        docType: 'ATS',
        ...input,
        fecha: input.fecha.toISOString(),
      })
      toast.success('ATS generado')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block sm:col-span-2">
              <span className="block text-sm font-medium text-slate-700 mb-1">
                Tarea del día <span className="text-red-500">*</span>
              </span>
              <input
                value={tarea}
                onChange={(e) => setTarea(e.target.value)}
                required
                placeholder="Mantenimiento preventivo del compresor"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">
                Fecha <span className="text-red-500">*</span>
              </span>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">
              Ubicación <span className="text-red-500">*</span>
            </span>
            <input
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">
                Supervisor <span className="text-red-500">*</span>
              </span>
              <input
                value={supervisorNombre}
                onChange={(e) => setSupervisorNombre(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">
                DNI supervisor <span className="text-red-500">*</span>
              </span>
              <input
                value={supervisorDni}
                onChange={(e) => setSupervisorDni(e.target.value.replace(/\D/g, '').slice(0, 15))}
                required
                inputMode="numeric"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">
              Ejecutores <span className="text-red-500">*</span>
            </span>
            <textarea
              value={ejecutoresStr}
              onChange={(e) => setEjecutoresStr(e.target.value)}
              rows={3}
              placeholder="Uno por línea: Nombre | DNI"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </label>
          <StringList
            label="EPP requerido"
            values={epp}
            onChange={setEpp}
            placeholder="Ej: Casco, lentes de protección"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Pasos con peligros y controles <span className="text-red-500">*</span>
          </h3>
          <div className="space-y-2 mb-3">
            <input
              value={pasoDraft}
              onChange={(e) => setPasoDraft(e.target.value)}
              placeholder="Paso (ej: Apagar máquina)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                value={pasoPeligrosDraft}
                onChange={(e) => setPasoPeligrosDraft(e.target.value)}
                placeholder="Peligros (separar por ;)"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={pasoControlesDraft}
                onChange={(e) => setPasoControlesDraft(e.target.value)}
                placeholder="Controles (separar por ;)"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={addPaso}>
              <Plus className="w-4 h-4 mr-1" /> Agregar paso
            </Button>
          </div>
          {pasos.length > 0 && (
            <ol className="space-y-2">
              {pasos.map((p, i) => (
                <li
                  key={i}
                  className="rounded-lg ring-1 ring-slate-200 p-3 flex items-start gap-2"
                >
                  <span className="font-bold text-slate-700 shrink-0">{p.numero}.</span>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="text-sm text-slate-900">{p.paso}</div>
                    {p.peligros.length > 0 && (
                      <div className="text-xs text-amber-700">
                        ⚠ {p.peligros.join('; ')}
                      </div>
                    )}
                    {p.controles.length > 0 && (
                      <div className="text-xs text-emerald-700">
                        ✓ {p.controles.join('; ')}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePaso(i)}
                    className="text-slate-400 hover:text-red-600 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Observaciones</span>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-50 ring-1 ring-red-200 p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Generar ATS
        </Button>
      </div>
    </form>
  )
}
