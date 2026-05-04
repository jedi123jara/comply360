'use client'

import { useEffect, useState, type FormEvent } from 'react'
import {
  Plus,
  Loader2,
  AlertCircle,
  HardHat,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { toast } from 'sonner'

interface Colaborador {
  id: string
  nombre: string
  apellido: string
  dni: string
  email: string
  telefono: string | null
  tipoColaborador: 'EMPLEADO_INTERNO' | 'CONTRATISTA'
  vigenciaContratoHasta: string | null
  especialidades: string[]
  activo: boolean
  _count: { visitas: number }
}

const TIPO_LABEL: Record<string, string> = {
  EMPLEADO_INTERNO: 'Empleado interno',
  CONTRATISTA: 'Contratista',
}

const ESPECIALIDADES_BASE = [
  'oficinas',
  'comercio',
  'manufactura_basica',
  'construccion',
  'mineria',
  'alturas',
  'espacios_confinados',
  'monitoreo_higienico',
  'investigacion_accidentes',
  'salud_ocupacional',
]

export default function AdminColaboradoresSstPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sst/colaboradores', { cache: 'no-store' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'No se pudieron cargar los colaboradores')
      }
      const json = await res.json()
      setColaboradores(json.colaboradores ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  async function toggleActivo(c: Colaborador) {
    const res = await fetch(`/api/sst/colaboradores/${c.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ activo: !c.activo }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(j?.error || 'No se pudo actualizar')
      return
    }
    toast.success(c.activo ? 'Colaborador desactivado' : 'Colaborador activado')
    reload()
  }

  const activos = colaboradores.filter((c) => c.activo)
  const inactivos = colaboradores.filter((c) => !c.activo)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin · Plataforma"
        title="Colaboradores SST"
        subtitle="Inspectores SST internos COMPLY360 (empleados o contratistas). Asignables a visitas Field Audit en cualquier organización cliente."
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo colaborador
          </Button>
        }
      />

      {error && (
        <Card className="border-rose-200 bg-rose-50/60">
          <CardContent className="flex items-center gap-2 py-4 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total" value={colaboradores.length} />
        <Stat label="Activos" value={activos.length} />
        <Stat label="Inactivos" value={inactivos.length} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando...
        </div>
      ) : colaboradores.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <HardHat className="h-10 w-10 text-slate-400" />
            <div>
              <p className="font-medium text-slate-700">Aún no hay colaboradores SST</p>
              <p className="text-sm text-slate-500">
                Registra al primer inspector para que pueda ser asignado a visitas Field Audit.
              </p>
            </div>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crear primer colaborador
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                <tr>
                  <th className="px-3 py-3 text-left">Nombre</th>
                  <th className="px-3 py-3 text-left">DNI</th>
                  <th className="px-3 py-3 text-left">Contacto</th>
                  <th className="px-3 py-3 text-left">Tipo</th>
                  <th className="px-3 py-3 text-left">Especialidades</th>
                  <th className="px-3 py-3 text-left">Vigencia</th>
                  <th className="px-3 py-3 text-left">Visitas</th>
                  <th className="px-3 py-3 text-left">Estado</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {colaboradores.map((c) => {
                  const venceProximo =
                    c.vigenciaContratoHasta &&
                    new Date(c.vigenciaContratoHasta) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                  return (
                    <tr key={c.id} className={c.activo ? '' : 'opacity-60'}>
                      <td className="px-3 py-3 font-medium text-slate-900">
                        {c.nombre} {c.apellido}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-700">{c.dni}</td>
                      <td className="px-3 py-3 text-xs text-slate-700">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {c.email}
                        </div>
                        {c.telefono && (
                          <div className="mt-1 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {c.telefono}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="info" size="xs">
                          {TIPO_LABEL[c.tipoColaborador]}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600">
                        {c.especialidades.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {c.especialidades.slice(0, 3).map((e) => (
                              <span
                                key={e}
                                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]"
                              >
                                {e}
                              </span>
                            ))}
                            {c.especialidades.length > 3 && (
                              <span className="text-[10px] text-slate-500">
                                +{c.especialidades.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {c.vigenciaContratoHasta ? (
                          <span className={venceProximo ? 'text-amber-700' : 'text-slate-700'}>
                            {new Date(c.vigenciaContratoHasta).toLocaleDateString('es-PE')}
                          </span>
                        ) : (
                          <span className="text-slate-400">Sin fecha</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-700">{c._count.visitas}</td>
                      <td className="px-3 py-3">
                        {c.activo ? (
                          <Badge variant="success" size="xs">
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="xs">
                            Inactivo
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(c.id)}
                            className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActivo(c)}
                            className="text-xs font-medium text-slate-600 hover:text-slate-800"
                            title={c.activo ? 'Desactivar' : 'Activar'}
                          >
                            {c.activo ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {showCreate && (
        <ColaboradorForm
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false)
            reload()
          }}
        />
      )}

      {editingId && (
        <ColaboradorForm
          mode="edit"
          colaborador={colaboradores.find((c) => c.id === editingId) ?? null}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      </CardContent>
    </Card>
  )
}

interface FormState {
  nombre: string
  apellido: string
  dni: string
  email: string
  telefono: string
  tipoColaborador: 'EMPLEADO_INTERNO' | 'CONTRATISTA'
  vigenciaContratoHasta: string
  especialidades: string[]
}

function ColaboradorForm({
  mode,
  colaborador,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  colaborador?: Colaborador | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>({
    nombre: colaborador?.nombre ?? '',
    apellido: colaborador?.apellido ?? '',
    dni: colaborador?.dni ?? '',
    email: colaborador?.email ?? '',
    telefono: colaborador?.telefono ?? '',
    tipoColaborador: colaborador?.tipoColaborador ?? 'EMPLEADO_INTERNO',
    vigenciaContratoHasta: colaborador?.vigenciaContratoHasta
      ? new Date(colaborador.vigenciaContratoHasta).toISOString().slice(0, 10)
      : '',
    especialidades: colaborador?.especialidades ?? [],
  })
  const [submitting, setSubmitting] = useState(false)

  function toggleEspecialidad(e: string) {
    setForm((f) => ({
      ...f,
      especialidades: f.especialidades.includes(e)
        ? f.especialidades.filter((x) => x !== e)
        : [...f.especialidades, e],
    }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        dni: form.dni,
        email: form.email.trim().toLowerCase(),
        tipoColaborador: form.tipoColaborador,
        especialidades: form.especialidades,
      }
      if (form.telefono.trim()) payload.telefono = form.telefono.trim()
      if (form.vigenciaContratoHasta)
        payload.vigenciaContratoHasta = `${form.vigenciaContratoHasta}T00:00:00.000Z`

      const url =
        mode === 'create'
          ? '/api/sst/colaboradores'
          : `/api/sst/colaboradores/${colaborador?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(j?.error || 'No se pudo guardar')
        return
      }
      toast.success(mode === 'create' ? 'Colaborador creado' : 'Colaborador actualizado')
      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={mode === 'create' ? 'Nuevo colaborador SST' : 'Editar colaborador SST'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nombre" required>
            <input
              type="text"
              required
              className="input"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            />
          </Field>
          <Field label="Apellido" required>
            <input
              type="text"
              required
              className="input"
              value={form.apellido}
              onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
            />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="DNI (8 dígitos)" required>
            <input
              type="text"
              required
              pattern="\d{8}"
              maxLength={8}
              inputMode="numeric"
              className="input"
              value={form.dni}
              onChange={(e) => setForm((f) => ({ ...f, dni: e.target.value.replace(/\D/g, '') }))}
              disabled={mode === 'edit'}
            />
          </Field>
          <Field label="Email" required>
            <input
              type="email"
              required
              className="input"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Teléfono">
            <input
              type="tel"
              className="input"
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
            />
          </Field>
          <Field label="Tipo" required>
            <select
              className="input"
              value={form.tipoColaborador}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  tipoColaborador: e.target.value as 'EMPLEADO_INTERNO' | 'CONTRATISTA',
                }))
              }
            >
              <option value="EMPLEADO_INTERNO">Empleado interno</option>
              <option value="CONTRATISTA">Contratista</option>
            </select>
          </Field>
        </div>

        <Field label="Vigencia del contrato (opcional)">
          <input
            type="date"
            className="input"
            value={form.vigenciaContratoHasta}
            onChange={(e) => setForm((f) => ({ ...f, vigenciaContratoHasta: e.target.value }))}
          />
        </Field>

        <fieldset className="rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-xs font-medium text-slate-700">Especialidades</legend>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {ESPECIALIDADES_BASE.map((e) => (
              <label key={e} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.especialidades.includes(e)}
                  onChange={() => toggleEspecialidad(e)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>{e.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Crear' : 'Guardar cambios'}
          </Button>
        </div>

        <style jsx>{`
          .input {
            width: 100%;
            border-radius: 0.5rem;
            border: 1px solid rgb(226 232 240);
            background: white;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
          }
          .input:disabled {
            background: rgb(248 250 252);
            color: rgb(100 116 139);
          }
          .input:focus {
            outline: none;
            border-color: rgb(16 185 129);
            box-shadow: 0 0 0 3px rgb(16 185 129 / 0.15);
          }
        `}</style>
      </form>
    </Modal>
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
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  )
}
