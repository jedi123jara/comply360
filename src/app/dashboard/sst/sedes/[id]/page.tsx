'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Plus,
  Loader2,
  AlertCircle,
  HardHat,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from 'sonner'

interface PuestoItem {
  id: string
  nombre: string
  descripcionTareas: string[]
  jornada: string | null
  exposicionFisica: boolean
  exposicionQuimica: boolean
  exposicionBiologica: boolean
  exposicionErgonomica: boolean
  exposicionPsicosocial: boolean
  requiereAlturas: boolean
  requiereEspacioConfinado: boolean
  requiereCalienteFrio: boolean
  requiereSCTR: boolean
  requiereExposicionUVSolar: boolean
  worker: { id: string; firstName: string; lastName: string; dni: string } | null
}

interface IpercSummary {
  id: string
  version: number
  estado: string
  fechaAprobacion: string | null
  createdAt: string
  _count: { filas: number }
}

interface SedeDetail {
  id: string
  nombre: string
  direccion: string
  departamento: string
  provincia: string
  distrito: string
  ubigeo: string
  tipoInstalacion: string
  activa: boolean
  areaM2: number | null
  numeroPisos: number | null
  puestos: PuestoItem[]
  iperBases: IpercSummary[]
  _count: { accidentes: number; visitas: number }
}

const TIPO_LABELS: Record<string, string> = {
  OFICINA: 'Oficina',
  PLANTA: 'Planta',
  OBRA: 'Obra',
  SUCURSAL: 'Sucursal',
  TALLER: 'Taller',
  ALMACEN: 'Almacén',
  CAMPO: 'Campo',
}

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador',
  REVISION: 'En revisión',
  VIGENTE: 'Vigente',
  VENCIDO: 'Vencido',
  ARCHIVADO: 'Archivado',
}

const ESTADO_COLORS: Record<string, 'neutral' | 'info' | 'success' | 'warning'> = {
  BORRADOR: 'neutral',
  REVISION: 'info',
  VIGENTE: 'success',
  VENCIDO: 'warning',
  ARCHIVADO: 'neutral',
}

export default function SedeDetailPage() {
  const params = useParams<{ id: string }>()
  const sedeId = params.id
  const router = useRouter()
  const [sede, setSede] = useState<SedeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPuestoModal, setShowPuestoModal] = useState(false)
  const [creatingIperc, setCreatingIperc] = useState(false)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sst/sedes/${sedeId}`, { cache: 'no-store' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'No se pudo cargar la sede')
      }
      const json = await res.json()
      setSede(json.sede)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sedeId) reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sedeId])

  async function crearIperc() {
    if (creatingIperc) return
    setCreatingIperc(true)
    try {
      const res = await fetch('/api/sst/iperc-bases', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sedeId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json?.error || 'No se pudo crear la matriz IPERC')
        return
      }
      toast.success(`IPERC v${json.base.version} creado`)
      router.push(`/dashboard/sst/iperc-bases/${json.base.id}`)
    } finally {
      setCreatingIperc(false)
    }
  }

  if (loading && !sede) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Cargando sede...
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-rose-200 bg-rose-50/60">
        <CardContent className="flex items-center gap-2 py-6 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </CardContent>
      </Card>
    )
  }

  if (!sede) return null

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/sst/sedes"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-emerald-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver a sedes
      </Link>

      <PageHeader
        eyebrow={`SST · ${TIPO_LABELS[sede.tipoInstalacion] ?? sede.tipoInstalacion}`}
        title={sede.nombre}
        subtitle={`${sede.direccion} · ${sede.distrito}, ${sede.provincia}, ${sede.departamento}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={sede.activa ? 'success' : 'neutral'}>
              {sede.activa ? 'Activa' : 'Inactiva'}
            </Badge>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Puestos" value={sede.puestos.length} icon={<HardHat className="h-4 w-4" />} />
        <StatCard label="Matrices IPERC" value={sede.iperBases.length} />
        <StatCard label="Accidentes" value={sede._count.accidentes} />
        <StatCard label="Visitas Field Audit" value={sede._count.visitas} />
      </div>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Mapa de Riesgos</h3>
            <p className="text-xs text-slate-600">
              Editor visual con drag-and-drop · Ley 29783 Art. 35.a
            </p>
          </div>
          <Link href={`/dashboard/sst/sedes/${sedeId}/mapa-riesgos`}>
            <Button size="sm" variant="emerald-soft">
              Abrir editor
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Puestos */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Puestos de trabajo</h2>
              <p className="text-xs text-slate-500">
                Cada puesto activa peligros sugeridos por el motor IPERC según sus flags de exposición.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {sede.puestos.length > 0 && (
                <Link href={`/dashboard/sst/sedes/${sedeId}/asignar-puestos`}>
                  <Button size="sm" variant="ghost">
                    <Users className="mr-2 h-4 w-4" />
                    Asignar trabajadores
                  </Button>
                </Link>
              )}
              <Button size="sm" onClick={() => setShowPuestoModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo puesto
              </Button>
            </div>
          </div>

          {sede.puestos.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center text-sm text-slate-500">
              Aún no hay puestos. Crea el primero para empezar a definir riesgos.
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {sede.puestos.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{p.nombre}</p>
                    {p.worker && (
                      <p className="text-xs text-slate-500">
                        Asignado: {p.worker.firstName} {p.worker.lastName} (DNI {p.worker.dni})
                      </p>
                    )}
                    {p.descripcionTareas.length > 0 && (
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                        {p.descripcionTareas.join(' · ')}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.requiereSCTR && <ExpoBadge label="SCTR" tone="rose" />}
                      {p.requiereAlturas && <ExpoBadge label="Alturas" tone="amber" />}
                      {p.requiereEspacioConfinado && <ExpoBadge label="Esp. confinado" tone="rose" />}
                      {p.requiereCalienteFrio && <ExpoBadge label="Calor/Frío" />}
                      {p.requiereExposicionUVSolar && <ExpoBadge label="UV solar" />}
                      {p.exposicionFisica && <ExpoBadge label="Físico" />}
                      {p.exposicionQuimica && <ExpoBadge label="Químico" />}
                      {p.exposicionBiologica && <ExpoBadge label="Biológico" />}
                      {p.exposicionErgonomica && <ExpoBadge label="Ergonómico" />}
                      {p.exposicionPsicosocial && <ExpoBadge label="Psicosocial" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* IPERC */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Matrices IPERC</h2>
              <p className="text-xs text-slate-500">
                Matriz P×S oficial SUNAFIL (R.M. 050-2013-TR) versionada por sede.
              </p>
            </div>
            <Button size="sm" onClick={crearIperc} disabled={creatingIperc}>
              {creatingIperc && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-2 h-4 w-4" />
              Nueva versión
            </Button>
          </div>

          {sede.iperBases.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center text-sm text-slate-500">
              Aún no hay matrices IPERC para esta sede.
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {sede.iperBases.map((b) => (
                <Link
                  key={b.id}
                  href={`/dashboard/sst/iperc-bases/${b.id}`}
                  className="flex items-center justify-between rounded-lg px-2 py-3 transition hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">IPERC v{b.version}</p>
                    <p className="text-xs text-slate-500">
                      {b._count.filas} {b._count.filas === 1 ? 'fila' : 'filas'} · creado{' '}
                      {new Date(b.createdAt).toLocaleDateString('es-PE')}
                    </p>
                  </div>
                  <Badge variant={ESTADO_COLORS[b.estado] ?? 'neutral'}>
                    {ESTADO_LABELS[b.estado] ?? b.estado}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showPuestoModal && (
        <PuestoModal
          sedeId={sedeId}
          onClose={() => setShowPuestoModal(false)}
          onCreated={() => {
            setShowPuestoModal(false)
            reload()
          }}
        />
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon?: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {icon}
          {label}
        </div>
        <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      </CardContent>
    </Card>
  )
}

function ExpoBadge({
  label,
  tone = 'slate',
}: {
  label: string
  tone?: 'slate' | 'amber' | 'rose'
}) {
  const cls =
    tone === 'rose'
      ? 'bg-rose-50 text-rose-700 border border-rose-200'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-700 border border-amber-200'
        : 'bg-slate-50 text-slate-700 border border-slate-200'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  )
}

interface PuestoForm {
  nombre: string
  descripcionTareas: string
  jornada: string
  exposicionFisica: boolean
  exposicionQuimica: boolean
  exposicionBiologica: boolean
  exposicionErgonomica: boolean
  exposicionPsicosocial: boolean
  requiereAlturas: boolean
  requiereEspacioConfinado: boolean
  requiereCalienteFrio: boolean
  requiereSCTR: boolean
  requiereExposicionUVSolar: boolean
}

function PuestoModal({
  sedeId,
  onClose,
  onCreated,
}: {
  sedeId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState<PuestoForm>({
    nombre: '',
    descripcionTareas: '',
    jornada: '',
    exposicionFisica: false,
    exposicionQuimica: false,
    exposicionBiologica: false,
    exposicionErgonomica: false,
    exposicionPsicosocial: false,
    requiereAlturas: false,
    requiereEspacioConfinado: false,
    requiereCalienteFrio: false,
    requiereSCTR: false,
    requiereExposicionUVSolar: false,
  })
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const tareas = form.descripcionTareas
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      const payload = {
        sedeId,
        nombre: form.nombre.trim(),
        descripcionTareas: tareas,
        jornada: form.jornada || undefined,
        exposicionFisica: form.exposicionFisica,
        exposicionQuimica: form.exposicionQuimica,
        exposicionBiologica: form.exposicionBiologica,
        exposicionErgonomica: form.exposicionErgonomica,
        exposicionPsicosocial: form.exposicionPsicosocial,
        requiereAlturas: form.requiereAlturas,
        requiereEspacioConfinado: form.requiereEspacioConfinado,
        requiereCalienteFrio: form.requiereCalienteFrio,
        requiereSCTR: form.requiereSCTR,
        requiereExposicionUVSolar: form.requiereExposicionUVSolar,
      }
      const res = await fetch('/api/sst/puestos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json?.error || 'No se pudo crear el puesto')
        return
      }
      toast.success('Puesto creado')
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  function toggle<K extends keyof PuestoForm>(key: K) {
    setForm((f) => ({ ...f, [key]: !f[key] } as PuestoForm))
  }

  return (
    <Modal isOpen onClose={onClose} title="Nuevo puesto de trabajo">
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Nombre del puesto *</span>
          <input
            type="text"
            required
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
            placeholder="Operario de planta, Soldador, Cajero..."
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Tareas (una por línea)</span>
          <textarea
            rows={4}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
            placeholder={'Operación de torno\nMantenimiento preventivo de máquinas'}
            value={form.descripcionTareas}
            onChange={(e) => setForm((f) => ({ ...f, descripcionTareas: e.target.value }))}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Jornada</span>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
            placeholder="DIURNO, NOCTURNO, MIXTO o descripción libre"
            value={form.jornada}
            onChange={(e) => setForm((f) => ({ ...f, jornada: e.target.value }))}
          />
        </label>

        <fieldset className="rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-xs font-medium text-slate-700">Exposiciones SST</legend>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Check label="Físico" checked={form.exposicionFisica} onClick={() => toggle('exposicionFisica')} />
            <Check label="Químico" checked={form.exposicionQuimica} onClick={() => toggle('exposicionQuimica')} />
            <Check label="Biológico" checked={form.exposicionBiologica} onClick={() => toggle('exposicionBiologica')} />
            <Check label="Ergonómico" checked={form.exposicionErgonomica} onClick={() => toggle('exposicionErgonomica')} />
            <Check label="Psicosocial" checked={form.exposicionPsicosocial} onClick={() => toggle('exposicionPsicosocial')} />
            <Check label="Trabajos en altura" checked={form.requiereAlturas} onClick={() => toggle('requiereAlturas')} />
            <Check label="Espacios confinados" checked={form.requiereEspacioConfinado} onClick={() => toggle('requiereEspacioConfinado')} />
            <Check label="Calor / frío" checked={form.requiereCalienteFrio} onClick={() => toggle('requiereCalienteFrio')} />
            <Check label="SCTR (Anexo 5)" checked={form.requiereSCTR} onClick={() => toggle('requiereSCTR')} />
            <Check label="UV solar (Ley 30102)" checked={form.requiereExposicionUVSolar} onClick={() => toggle('requiereExposicionUVSolar')} />
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear puesto
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function Check({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={onClick}
        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
      />
      <span>{label}</span>
    </label>
  )
}
