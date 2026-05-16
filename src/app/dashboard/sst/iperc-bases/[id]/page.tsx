'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Plus,
  Loader2,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Filter,
  Sparkles,
  QrCode,
  Download,
} from 'lucide-react'
import { SealQRModal } from '@/components/sst/seal-qr-modal'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { confirm } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import { calcularNivelRiesgo } from '@/lib/sst/iperc-matrix'

// ── Tipos ────────────────────────────────────────────────────────────────

type Clasificacion = 'TRIVIAL' | 'TOLERABLE' | 'MODERADO' | 'IMPORTANTE' | 'INTOLERABLE'
type Estado = 'BORRADOR' | 'REVISION' | 'VIGENTE' | 'VENCIDO' | 'ARCHIVADO'

interface IpercFila {
  id: string
  proceso: string
  actividad: string
  tarea: string
  peligroId: string | null
  riesgo: string
  indicePersonas: number
  indiceProcedimiento: number
  indiceCapacitacion: number
  indiceExposicion: number
  indiceProbabilidad: number
  indiceSeveridad: number
  nivelRiesgo: number
  clasificacion: Clasificacion
  esSignificativo: boolean
  controlesActuales: string[]
  controlesPropuestos: {
    eliminacion?: string[]
    sustitucion?: string[]
    ingenieria?: string[]
    administrativo?: string[]
    epp?: string[]
  }
  responsable: string | null
  plazoCierre: string | null
}

interface IpercDetail {
  id: string
  version: number
  estado: Estado
  fechaAprobacion: string | null
  hashSha256: string
  sede: { id: string; nombre: string; tipoInstalacion: string }
  filas: IpercFila[]
}

interface CatalogoPeligro {
  id: string
  codigo: string
  familia: string
  nombre: string
  descripcion: string
}

const CLASIFICACION_VARIANT: Record<Clasificacion, 'success' | 'info' | 'warning' | 'danger' | 'critical'> = {
  TRIVIAL: 'success',
  TOLERABLE: 'info',
  MODERADO: 'warning',
  IMPORTANTE: 'danger',
  INTOLERABLE: 'critical',
}

const CLASIFICACION_LABEL: Record<Clasificacion, string> = {
  TRIVIAL: 'Trivial',
  TOLERABLE: 'Tolerable',
  MODERADO: 'Moderado',
  IMPORTANTE: 'Importante',
  INTOLERABLE: 'Intolerable',
}

const ESTADO_LABEL: Record<Estado, string> = {
  BORRADOR: 'Borrador',
  REVISION: 'En revisión',
  VIGENTE: 'Vigente',
  VENCIDO: 'Vencido',
  ARCHIVADO: 'Archivado',
}

const ESTADO_VARIANT: Record<Estado, 'neutral' | 'info' | 'success' | 'warning'> = {
  BORRADOR: 'neutral',
  REVISION: 'info',
  VIGENTE: 'success',
  VENCIDO: 'warning',
  ARCHIVADO: 'neutral',
}

// ── Página ───────────────────────────────────────────────────────────────

export default function IpercEditorPage() {
  const params = useParams<{ id: string }>()
  const ipercId = params.id

  const [iperc, setIperc] = useState<IpercDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilaModal, setShowFilaModal] = useState(false)
  const [showSugerirModal, setShowSugerirModal] = useState(false)
  const [showSealModal, setShowSealModal] = useState(false)
  const [approving, setApproving] = useState(false)
  const [filtroClas, setFiltroClas] = useState<Clasificacion | 'TODOS'>('TODOS')

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sst/iperc-bases/${ipercId}`, { cache: 'no-store' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'No se pudo cargar el IPERC')
      }
      const json = await res.json()
      setIperc(json.base)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [ipercId])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      if (ipercId) reload()
    })
    return () => {
      cancelled = true
    }
  }, [ipercId, reload])

  const editable = iperc?.estado === 'BORRADOR' || iperc?.estado === 'REVISION'

  const summary = useMemo(() => {
    if (!iperc) return null
    return iperc.filas.reduce(
      (acc, f) => {
        acc[f.clasificacion]++
        if (f.esSignificativo) acc.SIGNIFICATIVOS++
        return acc
      },
      { TRIVIAL: 0, TOLERABLE: 0, MODERADO: 0, IMPORTANTE: 0, INTOLERABLE: 0, SIGNIFICATIVOS: 0 } as Record<
        string,
        number
      >,
    )
  }, [iperc])

  const filasVisibles = useMemo(() => {
    if (!iperc) return []
    if (filtroClas === 'TODOS') return iperc.filas
    return iperc.filas.filter((f) => f.clasificacion === filtroClas)
  }, [iperc, filtroClas])

  async function aprobar() {
    if (!iperc) return
    if (iperc.filas.length === 0) {
      toast.error('Agrega al menos una fila antes de aprobar la matriz')
      return
    }
    const ok = await confirm({
      title: '¿Aprobar matriz IPERC?',
      description:
        'Una vez aprobada, no se podrán agregar nuevas filas. Para modificarla deberás crear una nueva versión. Esta acción se registra en el audit log.',
      confirmLabel: 'Aprobar y publicar',
      cancelLabel: 'Cancelar',
      tone: 'default',
    })
    if (!ok) return

    setApproving(true)
    try {
      const res = await fetch(`/api/sst/iperc-bases/${ipercId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ estado: 'VIGENTE' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json?.error || 'No se pudo aprobar')
        return
      }
      toast.success(`IPERC v${iperc.version} aprobado y publicado`)
      reload()
    } finally {
      setApproving(false)
    }
  }

  if (loading && !iperc) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Cargando matriz IPERC...
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

  if (!iperc) return null

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/sst/sedes/${iperc.sede.id}`}
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-emerald-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver a {iperc.sede.nombre}
      </Link>

      <PageHeader
        eyebrow={`SST · IPERC v${iperc.version}`}
        title={`Matriz IPERC — ${iperc.sede.nombre}`}
        subtitle={`Matriz Probabilidad × Severidad oficial SUNAFIL (R.M. 050-2013-TR). Hash SHA-256: ${iperc.hashSha256.slice(0, 16)}...`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={ESTADO_VARIANT[iperc.estado]}>{ESTADO_LABEL[iperc.estado]}</Badge>
            {editable && (
              <Button size="sm" variant="secondary" onClick={() => setShowSugerirModal(true)}>
                <Sparkles className="mr-2 h-4 w-4 text-emerald-600" />
                Sugerir con IA
              </Button>
            )}
            {editable && (
              <Link href={`/dashboard/sst/iperc-bases/${iperc.id}/import`}>
                <Button size="sm" variant="ghost">
                  <Download className="mr-2 h-4 w-4 rotate-180" />
                  Importar Excel
                </Button>
              </Link>
            )}
            {editable && (
              <Button size="sm" onClick={() => setShowFilaModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar fila
              </Button>
            )}
            {editable && iperc.filas.length > 0 && (
              <Button size="sm" variant="emerald-soft" onClick={aprobar} disabled={approving}>
                {approving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Aprobar IPERC
              </Button>
            )}
            {iperc.estado === 'VIGENTE' && (
              <>
                <a href={`/api/sst/iperc-bases/${ipercId}/pdf`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="secondary">
                    <Download className="mr-2 h-4 w-4" />
                    PDF oficial
                  </Button>
                </a>
                <Button size="sm" variant="secondary" onClick={() => setShowSealModal(true)}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Sello QR
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Banner si está bloqueado */}
      {!editable && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-amber-800">
            <Lock className="h-4 w-4" />
            Esta matriz está en estado <strong>{ESTADO_LABEL[iperc.estado]}</strong> y no admite cambios. Para
            modificarla, crea una nueva versión desde la sede.
          </CardContent>
        </Card>
      )}

      {/* Stats por clasificación */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <StatChip
            label="Total filas"
            value={iperc.filas.length}
            variant="neutral"
            onClick={() => setFiltroClas('TODOS')}
            active={filtroClas === 'TODOS'}
          />
          <StatChip
            label="Trivial"
            value={summary.TRIVIAL}
            variant="success"
            onClick={() => setFiltroClas('TRIVIAL')}
            active={filtroClas === 'TRIVIAL'}
          />
          <StatChip
            label="Tolerable"
            value={summary.TOLERABLE}
            variant="info"
            onClick={() => setFiltroClas('TOLERABLE')}
            active={filtroClas === 'TOLERABLE'}
          />
          <StatChip
            label="Moderado"
            value={summary.MODERADO}
            variant="warning"
            onClick={() => setFiltroClas('MODERADO')}
            active={filtroClas === 'MODERADO'}
          />
          <StatChip
            label="Importante"
            value={summary.IMPORTANTE}
            variant="danger"
            onClick={() => setFiltroClas('IMPORTANTE')}
            active={filtroClas === 'IMPORTANTE'}
          />
          <StatChip
            label="Intolerable"
            value={summary.INTOLERABLE}
            variant="critical"
            onClick={() => setFiltroClas('INTOLERABLE')}
            active={filtroClas === 'INTOLERABLE'}
          />
        </div>
      )}

      {summary && summary.SIGNIFICATIVOS > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-amber-800">
            <ShieldAlert className="h-4 w-4" />
            {summary.SIGNIFICATIVOS}{' '}
            {summary.SIGNIFICATIVOS === 1 ? 'riesgo significativo identificado' : 'riesgos significativos identificados'}
            {' '}(Moderado, Importante o Intolerable). Requieren plan de acción documentado.
          </CardContent>
        </Card>
      )}

      {/* Tabla de filas */}
      {iperc.filas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ShieldAlert className="h-10 w-10 text-slate-400" />
            <div>
              <p className="font-medium text-slate-700">La matriz aún no tiene filas</p>
              <p className="text-sm text-slate-500">
                Agrega la primera fila identificando un peligro y sus índices P×S oficiales.
              </p>
            </div>
            {editable && (
              <Button onClick={() => setShowFilaModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar primera fila
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            {filtroClas !== 'TODOS' && filasVisibles.length === 0 && (
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3 text-sm text-slate-600">
                <Filter className="h-4 w-4" />
                No hay filas clasificadas como {CLASIFICACION_LABEL[filtroClas as Clasificacion]}.
              </div>
            )}
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                <tr>
                  <th className="px-3 py-3 text-left">Proceso · Actividad · Tarea</th>
                  <th className="px-3 py-3 text-left">Riesgo</th>
                  <th className="px-2 py-3 text-center" title="Personas">P</th>
                  <th className="px-2 py-3 text-center" title="Procedimiento">Pr</th>
                  <th className="px-2 py-3 text-center" title="Capacitación">C</th>
                  <th className="px-2 py-3 text-center" title="Exposición">E</th>
                  <th className="px-2 py-3 text-center" title="IP">IP</th>
                  <th className="px-2 py-3 text-center" title="Severidad">S</th>
                  <th className="px-2 py-3 text-center" title="Nivel de Riesgo">NR</th>
                  <th className="px-3 py-3 text-left">Clasificación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filasVisibles.map((f) => (
                  <tr key={f.id} className="align-top hover:bg-slate-50/50">
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-900">{f.proceso}</div>
                      <div className="text-xs text-slate-500">
                        {f.actividad} · {f.tarea}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{f.riesgo}</td>
                    <td className="px-2 py-3 text-center text-slate-600">{f.indicePersonas}</td>
                    <td className="px-2 py-3 text-center text-slate-600">{f.indiceProcedimiento}</td>
                    <td className="px-2 py-3 text-center text-slate-600">{f.indiceCapacitacion}</td>
                    <td className="px-2 py-3 text-center text-slate-600">{f.indiceExposicion}</td>
                    <td className="px-2 py-3 text-center font-medium text-slate-800">{f.indiceProbabilidad}</td>
                    <td className="px-2 py-3 text-center text-slate-600">{f.indiceSeveridad}</td>
                    <td className="px-2 py-3 text-center font-bold text-slate-900">{f.nivelRiesgo}</td>
                    <td className="px-3 py-3">
                      <Badge variant={CLASIFICACION_VARIANT[f.clasificacion]}>
                        {CLASIFICACION_LABEL[f.clasificacion]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {showFilaModal && editable && (
        <FilaModal
          ipercId={ipercId}
          onClose={() => setShowFilaModal(false)}
          onCreated={() => {
            setShowFilaModal(false)
            reload()
          }}
        />
      )}

      {showSugerirModal && editable && (
        <SugerirModal
          ipercId={ipercId}
          sedeId={iperc.sede.id}
          onClose={() => setShowSugerirModal(false)}
          onApplied={() => {
            setShowSugerirModal(false)
            reload()
          }}
        />
      )}

      <SealQRModal
        kind="iperc"
        resourceId={ipercId}
        label={`IPERC v${iperc.version} · ${iperc.sede.nombre}`}
        isOpen={showSealModal}
        onClose={() => setShowSealModal(false)}
      />
    </div>
  )
}

// ── StatChip clickeable ───────────────────────────────────────────────────

function StatChip({
  label,
  value,
  variant,
  active,
  onClick,
}: {
  label: string
  value: number
  variant: 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'critical'
  active: boolean
  onClick: () => void
}) {
  const ringByVariant: Record<typeof variant, string> = {
    neutral: 'ring-slate-300',
    success: 'ring-emerald-400',
    info: 'ring-cyan-400',
    warning: 'ring-amber-400',
    danger: 'ring-rose-400',
    critical: 'ring-crimson-500',
  } as const
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-slate-300 ${
        active ? `ring-2 ${ringByVariant[variant]}` : ''
      }`}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-2xl font-semibold text-slate-900">{value}</span>
        <Badge variant={variant} size="xs">
          {variant === 'critical' ? '!' : ''}
        </Badge>
      </div>
    </button>
  )
}

// ── Modal de creación de fila con preview live del motor ──────────────────

interface FilaForm {
  proceso: string
  actividad: string
  tarea: string
  peligroId: string
  riesgo: string
  indicePersonas: number
  indiceProcedimiento: number
  indiceCapacitacion: number
  indiceExposicion: number
  indiceSeveridad: number
  controlesActuales: string
  controlPropuesto: string
  nivelControlPropuesto: 'eliminacion' | 'sustitucion' | 'ingenieria' | 'administrativo' | 'epp'
  responsable: string
  plazoCierre: string
}

const INITIAL_FILA: FilaForm = {
  proceso: '',
  actividad: '',
  tarea: '',
  peligroId: '',
  riesgo: '',
  indicePersonas: 1,
  indiceProcedimiento: 1,
  indiceCapacitacion: 1,
  indiceExposicion: 1,
  indiceSeveridad: 1,
  controlesActuales: '',
  controlPropuesto: '',
  nivelControlPropuesto: 'ingenieria',
  responsable: '',
  plazoCierre: '',
}

function FilaModal({
  ipercId,
  onClose,
  onCreated,
}: {
  ipercId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState<FilaForm>(INITIAL_FILA)
  const [saving, setSaving] = useState(false)
  const [peligros, setPeligros] = useState<CatalogoPeligro[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/sst/catalogo/peligros', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { peligros: [] }))
      .then((j) => {
        if (!cancelled) setPeligros(j.peligros ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Cálculo live usando el mismo motor que el server (defensa en profundidad)
  const preview = useMemo(() => {
    try {
      return calcularNivelRiesgo({
        indicePersonas: form.indicePersonas,
        indiceProcedimiento: form.indiceProcedimiento,
        indiceCapacitacion: form.indiceCapacitacion,
        indiceExposicion: form.indiceExposicion,
        indiceSeveridad: form.indiceSeveridad,
      })
    } catch {
      return null
    }
  }, [
    form.indicePersonas,
    form.indiceProcedimiento,
    form.indiceCapacitacion,
    form.indiceExposicion,
    form.indiceSeveridad,
  ])

  function update<K extends keyof FilaForm>(key: K, value: FilaForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const controlesActuales = form.controlesActuales
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)

      const controlesPropuestos: Record<string, string[]> = {
        eliminacion: [],
        sustitucion: [],
        ingenieria: [],
        administrativo: [],
        epp: [],
      }
      if (form.controlPropuesto.trim()) {
        controlesPropuestos[form.nivelControlPropuesto] = [form.controlPropuesto.trim()]
      }

      const payload: Record<string, unknown> = {
        proceso: form.proceso.trim(),
        actividad: form.actividad.trim(),
        tarea: form.tarea.trim(),
        peligroId: form.peligroId || undefined,
        riesgo: form.riesgo.trim(),
        indicePersonas: form.indicePersonas,
        indiceProcedimiento: form.indiceProcedimiento,
        indiceCapacitacion: form.indiceCapacitacion,
        indiceExposicion: form.indiceExposicion,
        indiceSeveridad: form.indiceSeveridad,
        controlesActuales,
        controlesPropuestos,
        responsable: form.responsable || undefined,
        plazoCierre: form.plazoCierre ? `${form.plazoCierre}T00:00:00.000Z` : undefined,
      }

      const res = await fetch(`/api/sst/iperc-bases/${ipercId}/filas`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail = json?.details?.fieldErrors
          ? Object.entries(json.details.fieldErrors)
              .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
              .join('. ')
          : json?.error || 'No se pudo crear la fila'
        toast.error(detail)
        return
      }
      toast.success(`Fila agregada · ${json.fila.clasificacion} (NR=${json.fila.nivelRiesgo})`)
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  // Agrupar peligros por familia para selector
  const peligrosByFamilia = useMemo(() => {
    return peligros.reduce(
      (acc, p) => {
        if (!acc[p.familia]) acc[p.familia] = []
        acc[p.familia].push(p)
        return acc
      },
      {} as Record<string, CatalogoPeligro[]>,
    )
  }, [peligros])

  return (
    <Modal isOpen onClose={onClose} title="Agregar fila al IPERC" size="lg">
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Identificación de la tarea */}
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Proceso" required>
            <input
              type="text"
              required
              className="input"
              placeholder="Producción · Ventas · Mantenimiento..."
              value={form.proceso}
              onChange={(e) => update('proceso', e.target.value)}
            />
          </Field>
          <Field label="Actividad" required>
            <input
              type="text"
              required
              className="input"
              placeholder="Ej: Soldadura"
              value={form.actividad}
              onChange={(e) => update('actividad', e.target.value)}
            />
          </Field>
          <Field label="Tarea" required>
            <input
              type="text"
              required
              className="input"
              placeholder="Ej: Soldar planchas de 5mm"
              value={form.tarea}
              onChange={(e) => update('tarea', e.target.value)}
            />
          </Field>
        </div>

        {/* Peligro y riesgo */}
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Peligro (catálogo)">
            <select
              className="input"
              value={form.peligroId}
              onChange={(e) => update('peligroId', e.target.value)}
            >
              <option value="">— Sin peligro asociado —</option>
              {Object.entries(peligrosByFamilia).map(([fam, list]) => (
                <optgroup key={fam} label={fam}>
                  {list.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.codigo}] {p.nombre}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Riesgo asociado" required>
            <input
              type="text"
              required
              className="input"
              placeholder="Ej: Inhalación de humos metálicos"
              value={form.riesgo}
              onChange={(e) => update('riesgo', e.target.value)}
            />
          </Field>
        </div>

        {/* Índices P×S */}
        <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
          <legend className="px-2 text-xs font-medium text-slate-700">
            Índices oficiales SUNAFIL (R.M. 050-2013-TR · Tablas 9 y 12)
          </legend>
          <div className="grid gap-3 md:grid-cols-5">
            <IndiceSelect
              label="Personas"
              hint="A — expuestas"
              value={form.indicePersonas}
              onChange={(v) => update('indicePersonas', v)}
              options={[
                { value: 1, label: '1 (1-3)' },
                { value: 2, label: '2 (4-12)' },
                { value: 3, label: '3 (>12)' },
              ]}
            />
            <IndiceSelect
              label="Procedimiento"
              hint="B"
              value={form.indiceProcedimiento}
              onChange={(v) => update('indiceProcedimiento', v)}
              options={[
                { value: 1, label: '1 Satisfactorio' },
                { value: 2, label: '2 Parcial' },
                { value: 3, label: '3 No existe' },
              ]}
            />
            <IndiceSelect
              label="Capacitación"
              hint="C"
              value={form.indiceCapacitacion}
              onChange={(v) => update('indiceCapacitacion', v)}
              options={[
                { value: 1, label: '1 Entrenado' },
                { value: 2, label: '2 Parcial' },
                { value: 3, label: '3 No entrenado' },
              ]}
            />
            <IndiceSelect
              label="Exposición"
              hint="D"
              value={form.indiceExposicion}
              onChange={(v) => update('indiceExposicion', v)}
              options={[
                { value: 1, label: '1 Esporádico' },
                { value: 2, label: '2 Eventual' },
                { value: 3, label: '3 Permanente' },
              ]}
            />
            <IndiceSelect
              label="Severidad"
              hint="S"
              value={form.indiceSeveridad}
              onChange={(v) => update('indiceSeveridad', v)}
              options={[
                { value: 1, label: '1 Lig. dañino' },
                { value: 2, label: '2 Dañino' },
                { value: 3, label: '3 Ext. dañino' },
              ]}
            />
          </div>

          {/* Preview live */}
          {preview && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">IP</span> = {form.indicePersonas} +{' '}
                  {form.indiceProcedimiento} + {form.indiceCapacitacion} + {form.indiceExposicion} ={' '}
                  <strong className="text-slate-900">{preview.indiceProbabilidad}</strong>
                  {' · '}
                  <span className="font-medium text-slate-700">NR</span> = {preview.indiceProbabilidad} ×{' '}
                  {preview.indiceSeveridad} = <strong className="text-slate-900">{preview.nivelRiesgo}</strong>
                </div>
                <Badge variant={CLASIFICACION_VARIANT[preview.clasificacion]}>
                  {CLASIFICACION_LABEL[preview.clasificacion]}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-slate-600">{preview.accionRecomendada}</p>
              {preview.slaPlanAccionDias !== null && preview.slaPlanAccionDias >= 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  SLA interno COMPLY360:{' '}
                  {preview.slaPlanAccionDias === 0
                    ? 'alerta inmediata'
                    : `${preview.slaPlanAccionDias} días para implementar plan de acción`}
                </p>
              )}
            </div>
          )}
        </fieldset>

        {/* Controles */}
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Controles actuales (uno por línea)">
            <textarea
              rows={3}
              className="input"
              placeholder={'Ventilación natural\nEPP básico'}
              value={form.controlesActuales}
              onChange={(e) => update('controlesActuales', e.target.value)}
            />
          </Field>
          <div>
            <Field label="Control propuesto">
              <input
                type="text"
                className="input"
                placeholder="Ej: Instalar campana extractora"
                value={form.controlPropuesto}
                onChange={(e) => update('controlPropuesto', e.target.value)}
              />
            </Field>
            <div className="mt-2">
              <Field label="Nivel de jerarquía">
                <select
                  className="input"
                  value={form.nivelControlPropuesto}
                  onChange={(e) => update('nivelControlPropuesto', e.target.value as FilaForm['nivelControlPropuesto'])}
                >
                  <option value="eliminacion">1. Eliminación</option>
                  <option value="sustitucion">2. Sustitución</option>
                  <option value="ingenieria">3. Ingeniería</option>
                  <option value="administrativo">4. Administrativo</option>
                  <option value="epp">5. EPP</option>
                </select>
              </Field>
            </div>
          </div>
        </div>

        {/* Responsable y plazo */}
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Responsable">
            <input
              type="text"
              className="input"
              placeholder="Nombre o cargo"
              value={form.responsable}
              onChange={(e) => update('responsable', e.target.value)}
            />
          </Field>
          <Field label="Plazo de cierre (opcional)">
            <input
              type="date"
              className="input"
              value={form.plazoCierre}
              onChange={(e) => update('plazoCierre', e.target.value)}
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar fila
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
            color: rgb(15 23 42);
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

function IndiceSelect({
  label,
  hint,
  value,
  onChange,
  options,
}: {
  label: string
  hint: string
  value: number
  onChange: (v: number) => void
  options: { value: number; label: string }[]
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2 text-xs font-medium text-slate-700">
        {label}
        <span className="text-[10px] font-normal text-slate-400">{hint}</span>
      </span>
      <select
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

// ── Modal "Sugerir con IA" ────────────────────────────────────────────────

interface PuestoLite {
  id: string
  nombre: string
}

interface SugerenciaItem {
  proceso: string
  actividad: string
  tarea: string
  peligroId: string | null
  peligroCodigo: string | null
  peligroNombre: string
  riesgo: string
  indicePersonas: number
  indiceProcedimiento: number
  indiceCapacitacion: number
  indiceExposicion: number
  indiceSeveridad: number
  indiceProbabilidad: number
  nivelRiesgo: number
  clasificacion: Clasificacion
  esSignificativo: boolean
  controlesPropuestos: {
    eliminacion: string[]
    sustitucion: string[]
    ingenieria: string[]
    administrativo: string[]
    epp: string[]
  }
  justificacion: string
}

function SugerirModal({
  ipercId,
  sedeId,
  onClose,
  onApplied,
}: {
  ipercId: string
  sedeId: string
  onClose: () => void
  onApplied: () => void
}) {
  const [puestos, setPuestos] = useState<PuestoLite[]>([])
  const [puestoId, setPuestoId] = useState('')
  const [loadingPuestos, setLoadingPuestos] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [applying, setApplying] = useState(false)
  const [sugerencias, setSugerencias] = useState<SugerenciaItem[] | null>(null)
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set())
  const [meta, setMeta] = useState<{
    descartadas: number
    latencyMs: number
    catalogoSize: number
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/sst/puestos?sedeId=${encodeURIComponent(sedeId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { puestos: [] }))
      .then((j) => {
        if (cancelled) return
        const list = (j.puestos ?? []) as Array<{ id: string; nombre: string }>
        setPuestos(list.map((p) => ({ id: p.id, nombre: p.nombre })))
        if (list.length === 1) setPuestoId(list[0].id)
      })
      .finally(() => {
        if (!cancelled) setLoadingPuestos(false)
      })
    return () => {
      cancelled = true
    }
  }, [sedeId])

  async function generar() {
    if (!puestoId || generating) return
    setGenerating(true)
    setSugerencias(null)
    setSeleccionadas(new Set())
    setMeta(null)
    try {
      const res = await fetch(`/api/sst/iperc-bases/${ipercId}/sugerir`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ puestoId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json?.error || 'No se pudieron generar sugerencias')
        return
      }
      const items = (json.sugerencias ?? []) as SugerenciaItem[]
      setSugerencias(items)
      // Pre-seleccionar todas
      setSeleccionadas(new Set(items.map((_, i) => i)))
      setMeta({
        descartadas: json.descartadas ?? 0,
        latencyMs: json.latencyMs ?? 0,
        catalogoSize: json.catalogoSize ?? 0,
      })
      if (items.length === 0) {
        toast.error('La IA no devolvió sugerencias válidas. Intenta de nuevo o agrega filas manualmente.')
      } else {
        toast.success(`${items.length} sugerencias generadas en ${Math.round((json.latencyMs ?? 0) / 100) / 10}s`)
      }
    } finally {
      setGenerating(false)
    }
  }

  function toggleAll() {
    if (!sugerencias) return
    if (seleccionadas.size === sugerencias.length) {
      setSeleccionadas(new Set())
    } else {
      setSeleccionadas(new Set(sugerencias.map((_, i) => i)))
    }
  }

  function toggleOne(idx: number) {
    setSeleccionadas((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  async function aplicar() {
    if (!sugerencias || seleccionadas.size === 0 || applying) return
    setApplying(true)
    let aplicadas = 0
    let fallidas = 0

    const indices = Array.from(seleccionadas).sort((a, b) => a - b)
    for (const idx of indices) {
      const s = sugerencias[idx]
      try {
        const res = await fetch(`/api/sst/iperc-bases/${ipercId}/filas`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            proceso: s.proceso,
            actividad: s.actividad,
            tarea: s.tarea,
            peligroId: s.peligroId ?? undefined,
            riesgo: s.riesgo,
            indicePersonas: s.indicePersonas,
            indiceProcedimiento: s.indiceProcedimiento,
            indiceCapacitacion: s.indiceCapacitacion,
            indiceExposicion: s.indiceExposicion,
            indiceSeveridad: s.indiceSeveridad,
            controlesActuales: [],
            controlesPropuestos: s.controlesPropuestos,
          }),
        })
        if (res.ok) aplicadas++
        else fallidas++
      } catch {
        fallidas++
      }
    }

    setApplying(false)
    if (aplicadas > 0) {
      toast.success(
        `${aplicadas} fila${aplicadas === 1 ? '' : 's'} agregada${aplicadas === 1 ? '' : 's'}${
          fallidas > 0 ? ` (${fallidas} fallidas)` : ''
        }`,
      )
      onApplied()
    } else {
      toast.error('No se pudo aplicar ninguna fila. Revisa tu conexión o vuelve a intentar.')
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Sugerir filas IPERC con IA" size="lg">
      <div className="space-y-5">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 text-emerald-600" />
            <div>
              <p className="font-medium">DeepSeek redacta el texto · El motor SUNAFIL calcula los índices</p>
              <p className="mt-1 text-emerald-800">
                La IA propone peligros del catálogo, redacta proceso/actividad/tarea y sugiere índices iniciales
                P×S. <strong>El nivel de riesgo lo calcula el motor determinístico</strong> (R.M. 050-2013-TR).
                Puedes editar cualquier fila después de aplicar.
              </p>
            </div>
          </div>
        </div>

        {loadingPuestos ? (
          <div className="flex items-center justify-center py-6 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando puestos...
          </div>
        ) : puestos.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
            <AlertCircle className="mr-2 inline h-4 w-4" />
            Esta sede aún no tiene puestos registrados. Crea al menos un puesto antes de usar la sugerencia con
            IA — la IA usa los flags de exposición del puesto para identificar peligros relevantes.
          </div>
        ) : (
          <>
            <div className="grid items-end gap-3 md:grid-cols-[1fr_auto]">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-700">Puesto a evaluar</span>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                  value={puestoId}
                  onChange={(e) => setPuestoId(e.target.value)}
                >
                  <option value="">— Elegir puesto —</option>
                  {puestos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <Button onClick={generar} disabled={!puestoId || generating}>
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {generating ? 'Generando...' : 'Generar sugerencias'}
              </Button>
            </div>

            {meta && (
              <div className="text-xs text-slate-500">
                Catálogo: {meta.catalogoSize} peligros · Latencia:{' '}
                {Math.round(meta.latencyMs / 100) / 10}s
                {meta.descartadas > 0 && (
                  <span className="text-amber-700">
                    {' '}
                    · {meta.descartadas} sugerencias descartadas (peligros no en catálogo)
                  </span>
                )}
              </div>
            )}
          </>
        )}

        {sugerencias && sugerencias.length > 0 && (
          <>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                {seleccionadas.size === sugerencias.length ? 'Desmarcar todas' : 'Seleccionar todas'}
              </button>
              <span className="text-xs text-slate-500">
                {seleccionadas.size} de {sugerencias.length} seleccionada{seleccionadas.size === 1 ? '' : 's'}
              </span>
            </div>

            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {sugerencias.map((s, idx) => {
                const checked = seleccionadas.has(idx)
                return (
                  <label
                    key={idx}
                    className={`block cursor-pointer rounded-lg border px-3 py-3 transition ${
                      checked
                        ? 'border-emerald-300 bg-emerald-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(idx)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {s.proceso} · {s.actividad}
                          </span>
                          <Badge variant={CLASIFICACION_VARIANT[s.clasificacion]} size="xs">
                            {CLASIFICACION_LABEL[s.clasificacion]} ({s.nivelRiesgo})
                          </Badge>
                          {s.peligroCodigo && (
                            <span className="text-[10px] font-medium text-slate-500">
                              [{s.peligroCodigo}]
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          <strong>Tarea:</strong> {s.tarea}
                        </p>
                        <p className="text-xs text-slate-600">
                          <strong>Riesgo:</strong> {s.riesgo}
                        </p>
                        {s.peligroNombre && (
                          <p className="text-xs text-slate-500">
                            <strong>Peligro:</strong> {s.peligroNombre}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] italic text-slate-500">{s.justificacion}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-500">
                          <span>
                            P:{s.indicePersonas} · Pr:{s.indiceProcedimiento} · C:
                            {s.indiceCapacitacion} · E:{s.indiceExposicion} · S:{s.indiceSeveridad}
                          </span>
                          <span>
                            IP={s.indiceProbabilidad} · NR={s.nivelRiesgo}
                          </span>
                        </div>
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          </>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {sugerencias && sugerencias.length > 0 && (
            <Button onClick={aplicar} disabled={seleccionadas.size === 0 || applying}>
              {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aplicar {seleccionadas.size > 0 ? seleccionadas.size : ''} fila
              {seleccionadas.size === 1 ? '' : 's'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
