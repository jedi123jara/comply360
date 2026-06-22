'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  Plus,
  Loader2,
  AlertCircle,
  Users2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserMinus,
  ScrollText,
  Download,
  Building2,
  MapPin,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { confirm } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'

type Cargo = 'PRESIDENTE' | 'SECRETARIO' | 'MIEMBRO'
type Origen = 'REPRESENTANTE_EMPLEADOR' | 'REPRESENTANTE_TRABAJADORES'
type EstadoComite = 'VIGENTE' | 'EN_ELECCION' | 'INACTIVO'

interface Miembro {
  id: string
  cargo: Cargo
  origen: Origen
  fechaAlta: string
  fechaBaja: string | null
  worker: {
    id: string
    firstName: string
    lastName: string
    dni: string
    position: string | null
    regimenLaboral?: string
  }
}

interface ComiteData {
  id: string
  estado: EstadoComite
  mandatoInicio: string
  mandatoFin: string
  libroActasUrl: string | null
  miembros: Miembro[]
  // NULL = Comité principal del empleador; con sede = Subcomité de esa sede (Art. 44).
  sedeId: string | null
  sede: { id: string; nombre: string } | null
}

interface AnalisisData {
  minimo: {
    tipo: 'COMITE' | 'SUPERVISOR'
    totalMiembros: number
    representantesEmpleador: number
    representantesTrabajadores: number
    descripcion: string
    baseLegal: string
  }
  actual: {
    total: number
    representantesEmpleador: number
    representantesTrabajadores: number
    presidente: boolean
    secretario: boolean
  }
  brecha: {
    representantesEmpleador: number
    representantesTrabajadores: number
    total: number
  }
  cumple: boolean
  faltaCargo: 'PRESIDENTE' | 'SECRETARIO' | null
  observaciones: string[]
}

interface ListResponse {
  comites: Array<ComiteData & { analisis: AnalisisData; diasRestantesMandato: number }>
  total: number
  numeroTrabajadores: number
}

interface WorkerLite {
  id: string
  firstName: string
  lastName: string
  dni: string
}

interface SedeLite {
  id: string
  nombre: string
  activa: boolean
}

const CARGO_LABEL: Record<Cargo, string> = {
  PRESIDENTE: 'Presidente',
  SECRETARIO: 'Secretario',
  MIEMBRO: 'Miembro',
}

const ORIGEN_LABEL: Record<Origen, string> = {
  REPRESENTANTE_EMPLEADOR: 'Empleador',
  REPRESENTANTE_TRABAJADORES: 'Trabajadores',
}

const ESTADO_VARIANT: Record<EstadoComite, 'success' | 'info' | 'neutral'> = {
  VIGENTE: 'success',
  EN_ELECCION: 'info',
  INACTIVO: 'neutral',
}

const ESTADO_LABEL: Record<EstadoComite, string> = {
  VIGENTE: 'Vigente',
  EN_ELECCION: 'En elección',
  INACTIVO: 'Inactivo',
}

export default function ComitePage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [sedes, setSedes] = useState<SedeLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInstalacion, setShowInstalacion] = useState(false)
  const [showAddMiembro, setShowAddMiembro] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sst/comites', { cache: 'no-store' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'No se pudo cargar el comité')
      }
      const json = (await res.json()) as ListResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      reload()
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Sedes activas para el selector de subcomités (Art. 44). El módulo SST está
  // tras el mismo plan gate que los comités; si falla (403/sin plan), el
  // selector queda solo con el Comité principal.
  useEffect(() => {
    let cancelled = false
    fetch('/api/sst/sedes?activa=true', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { sedes: [] }))
      .then((j) => {
        if (cancelled) return
        const list = (j.sedes ?? []) as SedeLite[]
        setSedes(
          list
            .filter((s) => s.activa)
            .map((s) => ({ id: s.id, nombre: s.nombre, activa: s.activa })),
        )
      })
      .catch(() => {
        if (!cancelled) setSedes([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const comites = data?.comites ?? []
  // EN_ELECCION es un comité ACTIVO en proceso electoral (el flujo de elecciones
  // marca el comité EN_ELECCION al iniciar y lo regresa a VIGENTE al cerrar), por
  // eso cuenta como activo: si no, al iniciar una elección el comité "desaparece"
  // y caería en históricos. Solo INACTIVO es histórico.
  const activos = comites.filter((c) => c.estado === 'VIGENTE' || c.estado === 'EN_ELECCION')
  const principal = activos.find((c) => c.sedeId == null) ?? null
  const subcomites = activos
    .filter((c) => c.sedeId != null)
    .sort((a, b) => (a.sede?.nombre ?? '').localeCompare(b.sede?.nombre ?? '', 'es'))
  const historicos = comites.filter((c) => c.estado === 'INACTIVO')

  // Sedes que ya tienen un comité activo (vigente o en elección): no se ofrece
  // crear otro para esa sede. El filtro de `subcomites` garantiza sedeId no-nulo.
  const sedesConSubcomite = new Set(
    subcomites.map((c) => c.sedeId).filter((id): id is string => id != null),
  )
  const sedesDisponibles = sedes.filter((s) => !sedesConSubcomite.has(s.id))
  const puedeCrearPrincipal = !principal
  const puedeCrearAlgo = puedeCrearPrincipal || sedesDisponibles.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SST · Comité paritario"
        title="Comité de Seguridad y Salud en el Trabajo"
        subtitle="R.M. 245-2021-TR · Mandato 2 años · Composición paritaria entre empleador y trabajadores"
        actions={
          puedeCrearAlgo && (
            <Button onClick={() => setShowInstalacion(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {puedeCrearPrincipal ? 'Instalar comité' : 'Crear subcomité de sede'}
            </Button>
          )
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

      {loading && !data ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando comité...
        </div>
      ) : !principal ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Users2 className="h-10 w-10 text-slate-400" />
            <div>
              <p className="font-medium text-slate-700">No hay un Comité SST principal vigente</p>
              {/* El régimen (Comité vs Supervisor) depende del nº de trabajadores.
                  Solo lo afirmamos si la carga trajo el dato; nunca con data nula
                  (mostraría "0 trabajadores", un dato legal falso sobre el error). */}
              {data && (
                <p className="mx-auto mt-1 max-w-xl text-sm text-slate-500">
                  {data.numeroTrabajadores >= 20
                    ? `Tu empresa tiene ${data.numeroTrabajadores} trabajadores activos — la Ley 29783 obliga a tener un Comité paritario.`
                    : `Tu empresa tiene ${data.numeroTrabajadores} trabajadores activos — basta con designar un Supervisor SST. De todos modos puedes registrarlo aquí.`}
                </p>
              )}
            </div>
            <Button onClick={() => setShowInstalacion(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Instalar comité
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ComiteDetail
          comite={principal}
          scopeLabel="Comité principal del empleador"
          esPrincipal
          onChanged={reload}
          onAddMiembro={() => setShowAddMiembro(principal.id)}
        />
      )}

      {/* Subcomités por sede (Art. 44 — facultativos) */}
      {subcomites.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">Subcomités por sede</h2>
            <Badge variant="neutral" size="xs">
              Art. 44 · facultativo
            </Badge>
          </div>
          {subcomites.map((c) => (
            <ComiteDetail
              key={c.id}
              comite={c}
              scopeLabel={`Subcomité — ${c.sede?.nombre ?? 'sede sin nombre'}`}
              esPrincipal={false}
              onChanged={reload}
              onAddMiembro={() => setShowAddMiembro(c.id)}
            />
          ))}
        </div>
      )}

      {historicos.length > 0 && (
        <Card>
          <CardContent className="py-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">
              Comités históricos
            </h2>
            <div className="divide-y divide-slate-100">
              {historicos.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <Badge variant={ESTADO_VARIANT[c.estado]} size="xs" className="mr-2">
                      {ESTADO_LABEL[c.estado]}
                    </Badge>
                    <span className="mr-2 text-xs font-medium text-slate-600">
                      {c.sedeId == null
                        ? 'Principal'
                        : `Subcomité · ${c.sede?.nombre ?? 'sede sin nombre'}`}
                    </span>
                    Mandato {new Date(c.mandatoInicio).toLocaleDateString('es-PE')} →{' '}
                    {new Date(c.mandatoFin).toLocaleDateString('es-PE')}
                  </div>
                  <span className="text-xs text-slate-500">
                    {c.miembros.length} miembros registrados
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showInstalacion && (
        <InstalacionModal
          sedes={sedesDisponibles}
          principalExists={!!principal}
          onClose={() => setShowInstalacion(false)}
          onCreated={() => {
            setShowInstalacion(false)
            reload()
          }}
        />
      )}

      {showAddMiembro && (
        <AgregarMiembroModal
          comiteId={showAddMiembro}
          onClose={() => setShowAddMiembro(null)}
          onCreated={() => {
            setShowAddMiembro(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

// ── Detalle del comité vigente ────────────────────────────────────────────

function ComiteDetail({
  comite,
  scopeLabel,
  esPrincipal,
  onChanged,
  onAddMiembro,
}: {
  comite: ComiteData & { analisis: AnalisisData; diasRestantesMandato: number }
  scopeLabel: string
  esPrincipal: boolean
  onChanged: () => void
  onAddMiembro: () => void
}) {
  async function darDeBaja(miembroId: string, nombre: string) {
    const ok = await confirm({
      title: `¿Dar de baja a ${nombre}?`,
      description:
        'El miembro queda registrado con fecha de baja para mantener el audit trail. Su asiento queda libre para nuevos miembros.',
      confirmLabel: 'Dar de baja',
      cancelLabel: 'Cancelar',
      tone: 'warn',
    })
    if (!ok) return
    const res = await fetch(`/api/sst/comites/miembros/${miembroId}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(json?.error || 'No se pudo dar de baja')
      return
    }
    toast.success('Miembro dado de baja')
    onChanged()
  }

  const activos = comite.miembros.filter((m) => !m.fechaBaja)
  const baja = comite.miembros.filter((m) => m.fechaBaja)
  const a = comite.analisis
  const dias = comite.diasRestantesMandato
  // dias === 0 (vence hoy) entra en "vence pronto" para ofrecer ya las elecciones.
  const mandatoVencePronto = dias >= 0 && dias <= 60
  const mandatoVencido = dias < 0

  return (
    <div className="space-y-4">
      {/* Ámbito del comité (principal / subcomité de sede) */}
      <div className="flex items-center gap-2">
        {esPrincipal ? (
          <Building2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <MapPin className="h-4 w-4 text-slate-500" />
        )}
        <h3 className="text-sm font-semibold text-slate-900">{scopeLabel}</h3>
        {comite.estado === 'EN_ELECCION' && (
          <Badge variant="info" size="xs">
            En elección
          </Badge>
        )}
      </div>

      {/* Banner mandato */}
      <Card
        className={
          mandatoVencido
            ? 'border-rose-200 bg-rose-50/60'
            : mandatoVencePronto
              ? 'border-amber-200 bg-amber-50/60'
              : 'border-emerald-200 bg-emerald-50/40'
        }
      >
        <CardContent className="flex items-center gap-3 py-3">
          <Clock
            className={`h-5 w-5 ${
              mandatoVencido
                ? 'text-rose-600'
                : mandatoVencePronto
                  ? 'text-amber-700'
                  : 'text-emerald-600'
            }`}
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">
              Mandato {new Date(comite.mandatoInicio).toLocaleDateString('es-PE')} →{' '}
              {new Date(comite.mandatoFin).toLocaleDateString('es-PE')}
            </p>
            <p className="text-xs text-slate-600">
              {mandatoVencido
                ? `Vencido hace ${Math.abs(dias)} días`
                : `${dias} días restantes`}
              {(mandatoVencido || mandatoVencePronto) && (
                <>
                  {' · '}
                  <Link
                    href={`/dashboard/sst/comite/elecciones?comiteId=${comite.id}`}
                    className="font-medium text-amber-700 underline hover:text-amber-800"
                  >
                    programar elecciones
                  </Link>
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Análisis de composición */}
      <Card
        className={a.cumple ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/60'}
      >
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            {a.cumple ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">
                {a.cumple
                  ? a.minimo.tipo === 'COMITE'
                    ? 'Composición paritaria correcta'
                    : 'Supervisor SST registrado'
                  : `Composición incompleta (mínimo ${a.minimo.totalMiembros} miembros)`}
              </p>
              <p className="text-xs text-slate-600">{a.minimo.descripcion}</p>
              {a.observaciones.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-xs text-amber-900">
                  {a.observaciones.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[11px] font-mono text-slate-500">{a.minimo.baseLegal}</p>
              {!esPrincipal && (
                <p className="mt-2 rounded-md bg-white/70 px-2 py-1 text-[11px] text-slate-500">
                  Este análisis (incluido el tipo de órgano: Comité o Supervisor) se calcula sobre
                  el total de la empresa, no sobre la dotación de esta sede. El dimensionamiento real
                  por sede llega en una próxima versión.
                </p>
              )}
            </div>
            <div className="flex gap-2 text-center">
              <Stat label="Empleador" value={a.actual.representantesEmpleador} target={a.minimo.representantesEmpleador} />
              <Stat label="Trabajadores" value={a.actual.representantesTrabajadores} target={a.minimo.representantesTrabajadores} />
              <Stat label="Total" value={a.actual.total} target={a.minimo.totalMiembros} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Miembros */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Miembros ({activos.length} activos)
            </h2>
            <Button size="sm" onClick={onAddMiembro}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar miembro
            </Button>
          </div>

          {activos.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/40 py-10 text-center text-sm text-slate-500">
              Aún no hay miembros activos. Agrega el primero según las reglas del R.M. 245-2021-TR.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="px-2 py-2 text-left">Cargo</th>
                    <th className="px-2 py-2 text-left">Trabajador</th>
                    <th className="px-2 py-2 text-left">Representa a</th>
                    <th className="px-2 py-2 text-left">Desde</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activos.map((m) => (
                    <tr key={m.id}>
                      <td className="px-2 py-2">
                        <Badge
                          variant={
                            m.cargo === 'PRESIDENTE'
                              ? 'success'
                              : m.cargo === 'SECRETARIO'
                                ? 'info'
                                : 'neutral'
                          }
                          size="xs"
                        >
                          {CARGO_LABEL[m.cargo]}
                        </Badge>
                      </td>
                      <td className="px-2 py-2">
                        <div className="font-medium text-slate-900">
                          {m.worker.firstName} {m.worker.lastName}
                        </div>
                        <div className="text-xs text-slate-500">
                          DNI {m.worker.dni}
                          {m.worker.position && ` · ${m.worker.position}`}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-xs text-slate-700">
                        {ORIGEN_LABEL[m.origen]}
                      </td>
                      <td className="px-2 py-2 text-xs text-slate-700">
                        {new Date(m.fechaAlta).toLocaleDateString('es-PE')}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            darDeBaja(m.id, `${m.worker.firstName} ${m.worker.lastName}`)
                          }
                          className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 hover:text-rose-800"
                        >
                          <UserMinus className="h-3 w-3" />
                          Dar de baja
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {baja.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-800">
                Ver historial de bajas ({baja.length})
              </summary>
              <ul className="mt-2 divide-y divide-slate-100 text-xs">
                {baja.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2">
                    <span>
                      {m.worker.firstName} {m.worker.lastName} · {CARGO_LABEL[m.cargo]} ·{' '}
                      {ORIGEN_LABEL[m.origen]}
                    </span>
                    <span className="text-slate-500">
                      Baja: {m.fechaBaja ? new Date(m.fechaBaja).toLocaleDateString('es-PE') : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Libro de actas */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <ScrollText className="h-4 w-4 text-emerald-600" />
                Libro de actas
              </h2>
              <p className="text-xs text-slate-600">
                Las reuniones son mensuales (Art. 32 Ley 29783). El libro de actas es prueba ante
                SUNAFIL.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`/api/sst/comites/${comite.id}/acta-pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
              >
                <Download className="h-3 w-3" />
                Acta de instalación
              </a>
              {comite.libroActasUrl ? (
                <a
                  href={comite.libroActasUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Libro de actas →
                </a>
              ) : (
                <span className="text-xs text-slate-500">Sin libro de actas</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, target }: { label: string; value: number; target: number }) {
  const ok = value >= target
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className={`text-lg font-bold ${ok ? 'text-emerald-700' : 'text-amber-700'}`}>
        {value}
        <span className="text-xs text-slate-400">/{target}</span>
      </div>
    </div>
  )
}

// ── Modal de instalación ──────────────────────────────────────────────────

function InstalacionModal({
  sedes,
  principalExists,
  onClose,
  onCreated,
}: {
  /** Sedes activas que aún NO tienen un comité activo (vigente o en elección). */
  sedes: SedeLite[]
  principalExists: boolean
  onClose: () => void
  onCreated: () => void
}) {
  // scope: '' = Comité principal del empleador; cualquier otro valor = sedeId del
  // subcomité. Si ya existe el principal, arrancamos en la primera sede libre.
  // El initializer ya deja un scope válido: el botón que abre este modal en modo
  // subcomité solo aparece cuando hay sedes disponibles (ver puedeCrearAlgo), así
  // que con principal existente `sedes` ya está poblado al montar.
  const [scope, setScope] = useState<string>(() => (principalExists ? (sedes[0]?.id ?? '') : ''))
  const [mandatoInicio, setMandatoInicio] = useState(new Date().toISOString().slice(0, 10))
  const [libroUrl, setLibroUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const esSubcomite = scope !== ''
  // No hay nada válido que crear: el principal ya existe y no se eligió una sede.
  const sinAmbitoValido = principalExists && !esSubcomite

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (sinAmbitoValido) {
      toast.error('Elige una sede para el subcomité (el Comité principal ya existe).')
      return
    }
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = { mandatoInicio }
      if (libroUrl.trim()) payload.libroActasUrl = libroUrl.trim()
      if (esSubcomite) payload.sedeId = scope

      const res = await fetch('/api/sst/comites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json?.error || 'No se pudo crear el comité')
        return
      }
      toast.success(esSubcomite ? 'Subcomité instalado' : 'Comité instalado')
      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={esSubcomite ? 'Crear subcomité SST de sede' : 'Instalar Comité SST principal'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-xs text-slate-600">
          El mandato dura 2 años (R.M. 245-2021-TR). Después de crearlo, agrega los miembros uno
          a uno respetando la paridad entre representantes del empleador y de los trabajadores.
        </p>

        {principalExists && sedes.length === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
            No hay sedes activas sin comité para crear un subcomité. Registra una sede en SST ·
            Sedes, o desactiva un subcomité vigente, para poder crear otro.
          </p>
        ) : (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">
              Ámbito del comité <span className="text-rose-500">*</span>
            </span>
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="" disabled={principalExists}>
                Comité principal del empleador{principalExists ? ' (ya existe)' : ''}
              </option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  Subcomité — {s.nombre}
                </option>
              ))}
            </select>
          </label>
        )}

        {esSubcomite && (
          <p className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-600">
            Los subcomités por sede son <strong>facultativos</strong> (Art. 44 D.S. 005-2012-TR).
            El Comité principal del empleador sigue siendo el órgano obligatorio.
          </p>
        )}

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">
            Fecha de instalación <span className="text-rose-500">*</span>
          </span>
          <input
            type="date"
            required
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
            value={mandatoInicio}
            onChange={(e) => setMandatoInicio(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">
            URL del libro de actas (opcional)
          </span>
          <input
            type="url"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
            placeholder="https://..."
            value={libroUrl}
            onChange={(e) => setLibroUrl(e.target.value)}
          />
        </label>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting || sinAmbitoValido}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {esSubcomite ? 'Crear subcomité' : 'Crear comité'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Modal agregar miembro ─────────────────────────────────────────────────

function AgregarMiembroModal({
  comiteId,
  onClose,
  onCreated,
}: {
  comiteId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [workers, setWorkers] = useState<WorkerLite[]>([])
  const [loadingWorkers, setLoadingWorkers] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [workerId, setWorkerId] = useState('')
  const [cargo, setCargo] = useState<Cargo>('MIEMBRO')
  const [origen, setOrigen] = useState<Origen>('REPRESENTANTE_TRABAJADORES')

  useEffect(() => {
    let cancelled = false
    fetch('/api/workers?limit=200', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { workers: [] }))
      .then((j) => {
        if (cancelled) return
        const list = (j.workers ?? j.data?.workers ?? []) as WorkerLite[]
        setWorkers(list.map((w) => ({ id: w.id, firstName: w.firstName, lastName: w.lastName, dni: w.dni })))
      })
      .finally(() => {
        if (!cancelled) setLoadingWorkers(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/sst/comites/${comiteId}/miembros`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workerId, cargo, origen }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json?.error || 'No se pudo agregar el miembro')
        return
      }
      toast.success('Miembro agregado')
      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Agregar miembro al comité">
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">
            Trabajador <span className="text-rose-500">*</span>
          </span>
          {loadingWorkers ? (
            <div className="flex items-center justify-center py-4 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando...
            </div>
          ) : (
            <select
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
            >
              <option value="">— Elegir trabajador —</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.firstName} {w.lastName} · DNI {w.dni}
                </option>
              ))}
            </select>
          )}
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">
              Cargo <span className="text-rose-500">*</span>
            </span>
            <select
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
              value={cargo}
              onChange={(e) => setCargo(e.target.value as Cargo)}
            >
              <option value="PRESIDENTE">Presidente</option>
              <option value="SECRETARIO">Secretario</option>
              <option value="MIEMBRO">Miembro</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">
              Representa a <span className="text-rose-500">*</span>
            </span>
            <select
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
              value={origen}
              onChange={(e) => setOrigen(e.target.value as Origen)}
            >
              <option value="REPRESENTANTE_EMPLEADOR">Empleador</option>
              <option value="REPRESENTANTE_TRABAJADORES">Trabajadores</option>
            </select>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting || !workerId}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Agregar miembro
          </Button>
        </div>
      </form>
    </Modal>
  )
}
