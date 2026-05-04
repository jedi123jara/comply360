'use client'

/**
 * DependentsCard — UI de gestión de dependientes acreditados (Ola 1, 2026-05).
 *
 * Cumple Ley 25129 (asignación familiar con DNI cruzable) + Ley 27657
 * (derecho-habientes EsSalud). Sin esta card, el boolean `asignacionFamiliar`
 * en Worker es declarativo y SUNAFIL puede multar 23.11 UIT por asignación falsa.
 *
 * Funcionalidades:
 *   - Lista dependientes activos (relación, DNI, fecha nacimiento, edad)
 *   - Modal de alta con validación (DNI 8 dígitos, fecha pasada, etc.)
 *   - Soft delete (PATCH deletedAt)
 *   - Marcar verificado (admin acreditó la partida nacimiento)
 *   - Warning de disonancia: si Worker.asignacionFamiliar=true pero no hay
 *     dependientes que la justifiquen → riesgo SUNAFIL evidente.
 *
 * API: src/app/api/workers/[id]/dependents
 */

import { useEffect, useState, useCallback } from 'react'
import {
  Users,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  Check,
  X,
  ShieldCheck,
  Heart,
  Baby,
  UserCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/* ── Types ────────────────────────────────────────────────────────────────── */

const RELACIONES = [
  { value: 'CONYUGE', label: 'Cónyuge', icon: Heart },
  { value: 'CONVIVIENTE', label: 'Conviviente (Ley 30007)', icon: Heart },
  { value: 'HIJO', label: 'Hijo/a', icon: Baby },
  { value: 'HIJO_ADOPTIVO', label: 'Hijo/a adoptivo', icon: Baby },
  { value: 'HIJO_DISCAPACITADO', label: 'Hijo/a con discapacidad', icon: Baby },
  { value: 'PADRE', label: 'Padre', icon: UserCircle },
  { value: 'MADRE', label: 'Madre', icon: UserCircle },
  { value: 'HERMANO_DISCAPACITADO', label: 'Hermano/a con discapacidad', icon: UserCircle },
  { value: 'OTRO', label: 'Otro', icon: UserCircle },
] as const

const DOC_TIPOS = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'Carné de extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'PARTIDA_NACIMIENTO', label: 'Partida de nacimiento' },
] as const

interface Dependent {
  id: string
  relacion: string
  documentoTipo: string
  documentoNum: string
  fullName: string
  birthDate: string
  actaUrl?: string | null
  esBeneficiarioEsalud: boolean
  esBeneficiarioAsigFam: boolean
  verifiedAt?: string | null
  verifiedBy?: string | null
  notas?: string | null
  createdAt: string
}

interface DependentsResponse {
  data: Dependent[]
  meta: {
    total: number
    justificanAsigFam: number
    disonancia: boolean
  }
}

interface DependentsCardProps {
  workerId: string
  workerHasAsignacionFamiliar: boolean
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function calcEdad(birthDate: string): number {
  const d = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age
}

function fmtRelacion(rel: string): string {
  return RELACIONES.find(r => r.value === rel)?.label ?? rel
}

function getRelIcon(rel: string) {
  return RELACIONES.find(r => r.value === rel)?.icon ?? UserCircle
}

/* ── Component ────────────────────────────────────────────────────────────── */

export function DependentsCard({ workerId, workerHasAsignacionFamiliar }: DependentsCardProps) {
  const [items, setItems] = useState<Dependent[]>([])
  const [meta, setMeta] = useState<DependentsResponse['meta']>({ total: 0, justificanAsigFam: 0, disonancia: false })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/workers/${workerId}/dependents`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as DependentsResponse
      setItems(json.data ?? [])
      setMeta(json.meta ?? { total: 0, justificanAsigFam: 0, disonancia: false })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar dependientes')
    } finally {
      setLoading(false)
    }
  }, [workerId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este dependiente del legajo? Quedará archivado para auditoría.')) {
      return
    }
    setDeletingId(id)
    try {
      const res = await fetch(`/api/workers/${workerId}/dependents/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await refresh()
    } catch (e) {
      alert(`No se pudo eliminar: ${e instanceof Error ? e.message : 'error'}`)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card padding="none">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-700" />
              Dependientes acreditados
              {meta.total > 0 && (
                <Badge variant="neutral" size="sm">
                  {meta.total}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Cónyuge, hijos y derecho-habientes con DNI cruzable. Justifica
              asignación familiar (Ley 25129) y EsSalud (Ley 27657).
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setShowAddModal(true)}
          >
            Agregar
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Warning de disonancia: AsigFam=true pero sin dependientes que la justifiquen */}
        {meta.disonancia && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-red-800">
                Asignación familiar declarada sin dependientes acreditados
              </p>
              <p className="text-red-700 mt-1">
                El trabajador tiene <strong>asignación familiar = sí</strong> en sus datos
                laborales, pero no hay hijos/cónyuge registrados aquí. SUNAFIL puede multar{' '}
                <strong>23.11 UIT</strong> por asignación falsa (D.S. 019-2006-TR).
                Agrega al menos un dependiente que la justifique o desactiva la asignación.
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8 text-[color:var(--text-tertiary)]">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm">Cargando dependientes…</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && items.length === 0 && (
          <div className="rounded-lg border border-dashed border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-6 text-center">
            <Users className="h-6 w-6 text-[color:var(--text-tertiary)] mx-auto mb-2" />
            <p className="text-sm text-[color:var(--text-secondary)] mb-1">
              Sin dependientes registrados
            </p>
            <p className="text-xs text-[color:var(--text-tertiary)] mb-3">
              {workerHasAsignacionFamiliar
                ? 'Este trabajador recibe asignación familiar — agrega al cónyuge / hijo que la justifica.'
                : 'Si el trabajador tiene cónyuge o hijos, agrégalos para acreditar EsSalud y asignación familiar.'}
            </p>
            <Button
              size="sm"
              variant="secondary"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setShowAddModal(true)}
            >
              Agregar primer dependiente
            </Button>
          </div>
        )}

        {/* List */}
        {!loading && !error && items.length > 0 && (
          <ul className="divide-y divide-[color:var(--border-subtle)]">
            {items.map(dep => {
              const Icon = getRelIcon(dep.relacion)
              const edad = calcEdad(dep.birthDate)
              const isVerified = !!dep.verifiedAt
              return (
                <li key={dep.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 shrink-0"
                      aria-hidden
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-[color:var(--text-primary)] truncate">
                          {dep.fullName}
                        </span>
                        {isVerified && (
                          <Badge variant="success" size="sm" dot>
                            <ShieldCheck className="h-2.5 w-2.5" />
                            Verificado
                          </Badge>
                        )}
                        {dep.esBeneficiarioAsigFam && (
                          <Badge variant="warning" size="sm">
                            Asig. Fam.
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">
                        {fmtRelacion(dep.relacion)} · {dep.documentoTipo} {dep.documentoNum} ·{' '}
                        {edad >= 0 ? `${edad} años` : 'fecha inválida'}
                      </p>
                      {dep.notas && (
                        <p className="text-[11px] text-[color:var(--text-tertiary)] italic mt-1">
                          {dep.notas}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(dep.id)}
                    disabled={deletingId === dep.id}
                    className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-lg text-[color:var(--text-tertiary)] hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                    aria-label={`Eliminar dependiente ${dep.fullName}`}
                    title="Eliminar"
                  >
                    {deletingId === dep.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      {/* Modal de alta */}
      {showAddModal && (
        <AddDependentModal
          workerId={workerId}
          onClose={() => setShowAddModal(false)}
          onCreated={async () => {
            setShowAddModal(false)
            await refresh()
          }}
        />
      )}
    </Card>
  )
}

/* ── AddDependentModal ─────────────────────────────────────────────────────── */

interface AddDependentModalProps {
  workerId: string
  onClose: () => void
  onCreated: () => void | Promise<void>
}

function AddDependentModal({ workerId, onClose, onCreated }: AddDependentModalProps) {
  const [form, setForm] = useState({
    relacion: 'HIJO',
    documentoTipo: 'DNI',
    documentoNum: '',
    fullName: '',
    birthDate: '',
    esBeneficiarioEsalud: true,
    esBeneficiarioAsigFam: false,
    notas: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key as string]: '' }))
    setError(null)
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.fullName.trim()) e.fullName = 'Nombre requerido'
    if (!form.documentoNum.trim()) e.documentoNum = 'Documento requerido'
    if (form.documentoTipo === 'DNI' && !/^\d{8}$/.test(form.documentoNum)) {
      e.documentoNum = 'DNI debe tener 8 dígitos'
    }
    if (!form.birthDate) {
      e.birthDate = 'Fecha de nacimiento requerida'
    } else {
      const d = new Date(form.birthDate)
      if (isNaN(d.getTime()) || d >= new Date()) {
        e.birthDate = 'Fecha de nacimiento debe ser pasada'
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/workers/${workerId}/dependents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? `Error al guardar (HTTP ${res.status})`)
        return
      }
      await onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-dep-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] bg-gradient-to-r from-emerald-50 to-emerald-100/50 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 id="add-dep-title" className="text-base font-bold text-[color:var(--text-primary)]">
                Nuevo dependiente
              </h2>
              <p className="text-xs text-[color:var(--text-tertiary)]">
                Acredita al cónyuge, hijo o derecho-habiente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[color:var(--text-tertiary)] hover:bg-[color:var(--neutral-100)]"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Relación */}
          <div>
            <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1.5">
              Relación *
            </label>
            <select
              value={form.relacion}
              onChange={e => update('relacion', e.target.value)}
              className="w-full px-3 py-2 border border-[color:var(--border-default)] rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              {RELACIONES.map(r => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Nombre completo */}
          <div>
            <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1.5">
              Nombre completo *
            </label>
            <input
              type="text"
              value={form.fullName}
              onChange={e => update('fullName', e.target.value)}
              placeholder="Ej. María Pérez García"
              className={cn(
                'w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500',
                errors.fullName ? 'border-red-300' : 'border-[color:var(--border-default)]',
              )}
            />
            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
          </div>

          {/* Doc tipo + número */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1.5">
                Tipo doc.
              </label>
              <select
                value={form.documentoTipo}
                onChange={e => update('documentoTipo', e.target.value)}
                className="w-full px-2.5 py-2 border border-[color:var(--border-default)] rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {DOC_TIPOS.map(d => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1.5">
                Número *
              </label>
              <input
                type="text"
                value={form.documentoNum}
                onChange={e => {
                  const v = form.documentoTipo === 'DNI' ? e.target.value.replace(/\D/g, '').slice(0, 8) : e.target.value
                  update('documentoNum', v)
                }}
                placeholder={form.documentoTipo === 'DNI' ? '12345678' : 'XYZ-123456'}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500',
                  errors.documentoNum ? 'border-red-300' : 'border-[color:var(--border-default)]',
                )}
              />
              {errors.documentoNum && <p className="text-xs text-red-500 mt-1">{errors.documentoNum}</p>}
            </div>
          </div>

          {/* Fecha nacimiento */}
          <div>
            <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1.5">
              Fecha de nacimiento *
            </label>
            <input
              type="date"
              value={form.birthDate}
              onChange={e => update('birthDate', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className={cn(
                'w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500',
                errors.birthDate ? 'border-red-300' : 'border-[color:var(--border-default)]',
              )}
            />
            {errors.birthDate && <p className="text-xs text-red-500 mt-1">{errors.birthDate}</p>}
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 gap-2 rounded-lg bg-[color:var(--neutral-50)] p-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.esBeneficiarioEsalud}
                onChange={e => update('esBeneficiarioEsalud', e.target.checked)}
                className="w-4 h-4 rounded border-[color:var(--border-default)] text-emerald-600 focus:ring-emerald-500/20"
              />
              <span className="text-xs text-[color:var(--text-secondary)]">
                Beneficiario EsSalud (derecho-habiente)
              </span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.esBeneficiarioAsigFam}
                onChange={e => update('esBeneficiarioAsigFam', e.target.checked)}
                className="w-4 h-4 rounded border-[color:var(--border-default)] text-emerald-600 focus:ring-emerald-500/20"
              />
              <span className="text-xs text-[color:var(--text-secondary)]">
                Justifica asignación familiar (S/ 113 mensuales)
              </span>
            </label>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1.5">
              Notas (opcional)
            </label>
            <input
              type="text"
              value={form.notas}
              onChange={e => update('notas', e.target.value)}
              placeholder="Ej. Universidad activa, hasta 2027"
              className="w-full px-3 py-2 border border-[color:var(--border-default)] rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Error global */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)] px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting}
            icon={submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          >
            {submitting ? 'Guardando…' : 'Guardar dependiente'}
          </Button>
        </div>
      </div>
    </div>
  )
}
