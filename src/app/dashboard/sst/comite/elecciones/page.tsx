'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Vote,
  CheckCircle2,
  Plus,
  Trash2,
  ShieldCheck,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { confirm } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'

interface WorkerLite {
  id: string
  firstName: string
  lastName: string
  dni: string
}

interface Candidato {
  workerId: string
  origen: 'REPRESENTANTE_EMPLEADOR' | 'REPRESENTANTE_TRABAJADORES'
  nombre: string
  dni: string | null
  votos: number
}

interface EleccionState {
  estado: 'EN_VOTACION' | 'CERRADA'
  fechaInicio: string
  fechaCierre: string
  cuposEmpleador: number
  cuposTrabajadores: number
  candidatos: Candidato[]
  votos: Array<{
    electorWorkerId: string
    candidatoWorkerId: string
    timestamp: string
    hashFirma: string
    signatureLevel?: 'SIMPLE' | 'BIOMETRIC'
    credentialId?: string
  }>
  votosTotal: number
  ganadores?: Array<{ workerId: string; origen: string; votos: number }>
}

interface ApiResponse {
  existe: boolean
  recordId: string | null
  eleccion: EleccionState | null
}

interface ComiteInfo {
  id: string
  estado: string
}

export default function EleccionesPage() {
  const [comite, setComite] = useState<ComiteInfo | null>(null)
  const [data, setData] = useState<EleccionState | null>(null)
  const [workers, setWorkers] = useState<WorkerLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      // Obtener comité vigente
      const cRes = await fetch('/api/sst/comites?estado=VIGENTE', { cache: 'no-store' })
      const cJson = await cRes.json()
      const c = (cJson.comites ?? [])[0]
      if (!c) {
        // Buscar EN_ELECCION
        const c2Res = await fetch('/api/sst/comites?estado=EN_ELECCION', { cache: 'no-store' })
        const c2Json = await c2Res.json()
        const c2 = (c2Json.comites ?? [])[0]
        if (!c2) {
          setError('No hay un Comité SST activo. Instala el comité antes de configurar la elección.')
          setLoading(false)
          return
        }
        setComite({ id: c2.id, estado: c2.estado })
      } else {
        setComite({ id: c.id, estado: c.estado })
      }

      const comiteId = c?.id ?? (await (await fetch('/api/sst/comites?estado=EN_ELECCION', { cache: 'no-store' })).json()).comites?.[0]?.id
      if (!comiteId) return

      const [eRes, wRes] = await Promise.all([
        fetch(`/api/sst/comites/${comiteId}/elecciones`, { cache: 'no-store' }),
        fetch('/api/workers?limit=200', { cache: 'no-store' }),
      ])
      const eJson = (await eRes.json()) as ApiResponse
      const wJson = await wRes.json()
      setData(eJson.eleccion)
      setWorkers(
        ((wJson.workers ?? wJson.data?.workers ?? []) as WorkerLite[]).map((w) => ({
          id: w.id,
          firstName: w.firstName,
          lastName: w.lastName,
          dni: w.dni,
        })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  if (loading && !comite) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Cargando...
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/sst/comite"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-emerald-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver al Comité SST
        </Link>
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-center gap-2 py-6 text-sm text-amber-900">
            <AlertCircle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!comite) return null

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/sst/comite"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-emerald-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver al Comité SST
      </Link>

      <PageHeader
        eyebrow="SST · Comité"
        title="Elecciones del Comité SST"
        subtitle="Proceso electoral con paridad obligatoria entre empleador y trabajadores. Cada voto se registra con hash SHA-256 firmado para audit trail."
      />

      {!data ? (
        <ConfigEleccion comiteId={comite.id} workers={workers} onCreated={reload} />
      ) : data.estado === 'EN_VOTACION' ? (
        <Votacion
          comiteId={comite.id}
          eleccion={data}
          workers={workers}
          onChanged={reload}
        />
      ) : (
        <Resultados eleccion={data} />
      )}
    </div>
  )
}

// ── Config: configurar la elección ────────────────────────────────────────

function ConfigEleccion({
  comiteId,
  workers,
  onCreated,
}: {
  comiteId: string
  workers: WorkerLite[]
  onCreated: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const oneWeekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const [fechaInicio, setFechaInicio] = useState(today)
  const [fechaCierre, setFechaCierre] = useState(oneWeekLater)
  const [cuposE, setCuposE] = useState(2)
  const [cuposT, setCuposT] = useState(2)
  const [candidatos, setCandidatos] = useState<
    Array<{ workerId: string; origen: 'REPRESENTANTE_EMPLEADOR' | 'REPRESENTANTE_TRABAJADORES' }>
  >([])
  const [submitting, setSubmitting] = useState(false)

  function agregarCandidato() {
    setCandidatos((c) => [...c, { workerId: '', origen: 'REPRESENTANTE_TRABAJADORES' }])
  }

  function quitarCandidato(idx: number) {
    setCandidatos((c) => c.filter((_, i) => i !== idx))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    const validos = candidatos.filter((c) => c.workerId)
    if (validos.length < 2) {
      toast.error('Agrega al menos 2 candidatos')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/sst/comites/${comiteId}/elecciones`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fechaInicio: `${fechaInicio}T00:00:00.000Z`,
          fechaCierre: `${fechaCierre}T23:59:59.000Z`,
          candidatos: validos,
          cuposEmpleador: cuposE,
          cuposTrabajadores: cuposT,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(j?.error || 'No se pudo iniciar la elección')
        return
      }
      toast.success('Elección iniciada · padrón abierto')
      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="py-6">
        <h2 className="text-base font-semibold text-slate-900">
          Configurar nueva elección
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          R.M. 245-2021-TR · El número de candidatos de trabajadores debe ser al menos el doble
          de los cupos para que haya elección real.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">
                Inicio votación
              </span>
              <input
                type="date"
                required
                className="input-e"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">
                Cierre votación
              </span>
              <input
                type="date"
                required
                className="input-e"
                value={fechaCierre}
                onChange={(e) => setFechaCierre(e.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">
                Cupos representantes empleador
              </span>
              <input
                type="number"
                min={1}
                max={10}
                required
                className="input-e"
                value={cuposE}
                onChange={(e) => setCuposE(Number(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">
                Cupos representantes trabajadores
              </span>
              <input
                type="number"
                min={1}
                max={10}
                required
                className="input-e"
                value={cuposT}
                onChange={(e) => setCuposT(Number(e.target.value))}
              />
            </label>
          </div>

          <fieldset className="rounded-lg border border-slate-200 p-3">
            <legend className="px-1 text-xs font-medium text-slate-700">
              Candidatos
            </legend>
            <div className="space-y-2">
              {candidatos.map((c, i) => (
                <div key={i} className="grid gap-2 md:grid-cols-[1fr_220px_auto]">
                  <select
                    className="input-e"
                    value={c.workerId}
                    onChange={(e) =>
                      setCandidatos((arr) =>
                        arr.map((x, idx) =>
                          idx === i ? { ...x, workerId: e.target.value } : x,
                        ),
                      )
                    }
                  >
                    <option value="">— Elegir trabajador —</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.firstName} {w.lastName} · DNI {w.dni}
                      </option>
                    ))}
                  </select>
                  <select
                    className="input-e"
                    value={c.origen}
                    onChange={(e) =>
                      setCandidatos((arr) =>
                        arr.map((x, idx) =>
                          idx === i
                            ? {
                                ...x,
                                origen: e.target.value as
                                  | 'REPRESENTANTE_EMPLEADOR'
                                  | 'REPRESENTANTE_TRABAJADORES',
                              }
                            : x,
                        ),
                      )
                    }
                  >
                    <option value="REPRESENTANTE_TRABAJADORES">
                      Representa a trabajadores
                    </option>
                    <option value="REPRESENTANTE_EMPLEADOR">
                      Designado por empleador
                    </option>
                  </select>
                  <button
                    type="button"
                    onClick={() => quitarCandidato(i)}
                    className="text-rose-600 hover:text-rose-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={agregarCandidato}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
            >
              <Plus className="h-3 w-3" />
              Agregar candidato
            </button>
          </fieldset>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="submit" disabled={submitting || candidatos.length < 2}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Vote className="mr-2 h-4 w-4" />
              Iniciar elección
            </Button>
          </div>

          <style jsx>{`
            .input-e {
              width: 100%;
              border-radius: 0.5rem;
              border: 1px solid rgb(226 232 240);
              background: white;
              padding: 0.5rem 0.75rem;
              font-size: 0.875rem;
            }
            .input-e:focus {
              outline: none;
              border-color: rgb(16 185 129);
              box-shadow: 0 0 0 3px rgb(16 185 129 / 0.15);
            }
          `}</style>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Votación: registrar votos + cerrar ────────────────────────────────────

function Votacion({
  comiteId,
  eleccion,
  workers,
  onChanged,
}: {
  comiteId: string
  eleccion: EleccionState
  workers: WorkerLite[]
  onChanged: () => void
}) {
  const [electorId, setElectorId] = useState('')
  const [candidatoId, setCandidatoId] = useState('')
  const [voting, setVoting] = useState(false)
  const [closing, setClosing] = useState(false)

  const electoresQueVotaron = new Set(eleccion.votos.map((v) => v.electorWorkerId))

  async function votar() {
    if (voting || !electorId || !candidatoId) return
    setVoting(true)
    try {
      const res = await fetch(`/api/sst/comites/${comiteId}/elecciones/voto`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          electorWorkerId: electorId,
          candidatoWorkerId: candidatoId,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(j?.error || 'No se pudo registrar el voto')
        return
      }
      toast.success(`Voto registrado · hash ${j.hashFirma.slice(0, 12)}...`)
      setElectorId('')
      setCandidatoId('')
      onChanged()
    } finally {
      setVoting(false)
    }
  }

  async function cerrar() {
    const ok = await confirm({
      title: '¿Cerrar la elección?',
      description: 'Una vez cerrada, no se aceptan más votos. Los ganadores se calculan automáticamente.',
      confirmLabel: 'Cerrar',
      tone: 'warn',
    })
    if (!ok) return
    setClosing(true)
    try {
      const res = await fetch(`/api/sst/comites/${comiteId}/elecciones`, {
        method: 'PATCH',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(j?.error || 'No se pudo cerrar')
        return
      }
      toast.success('Elección cerrada')
      onChanged()
    } finally {
      setClosing(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-emerald-200 bg-emerald-50/30">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-bold text-emerald-900">Votación abierta</p>
            <p className="text-xs text-emerald-800">
              {new Date(eleccion.fechaInicio).toLocaleDateString('es-PE')} →{' '}
              {new Date(eleccion.fechaCierre).toLocaleDateString('es-PE')} ·{' '}
              {eleccion.votos.length} votos emitidos
            </p>
          </div>
          <Button onClick={cerrar} disabled={closing} variant="emerald-soft">
            {closing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cerrar elección
          </Button>
        </CardContent>
      </Card>

      {/* Booth */}
      <Card>
        <CardContent className="py-5">
          <h2 className="text-base font-semibold text-slate-900">Mesa de sufragio</h2>
          <p className="text-xs text-slate-600">
            Selecciona elector + candidato. El voto se firma con SHA-256.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">Elector</span>
              <select
                className="input-v"
                value={electorId}
                onChange={(e) => setElectorId(e.target.value)}
              >
                <option value="">— Elegir trabajador —</option>
                {workers
                  .filter((w) => !electoresQueVotaron.has(w.id))
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.firstName} {w.lastName} · DNI {w.dni}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">Candidato</span>
              <select
                className="input-v"
                value={candidatoId}
                onChange={(e) => setCandidatoId(e.target.value)}
              >
                <option value="">— Elegir candidato —</option>
                {eleccion.candidatos.map((c) => (
                  <option key={c.workerId} value={c.workerId}>
                    {c.nombre} ·{' '}
                    {c.origen === 'REPRESENTANTE_EMPLEADOR' ? 'Empleador' : 'Trabajadores'}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <Button onClick={votar} disabled={voting || !electorId || !candidatoId}>
                {voting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Vote className="mr-2 h-4 w-4" />
                Emitir voto
              </Button>
            </div>
          </div>

          <style jsx>{`
            .input-v {
              width: 100%;
              border-radius: 0.5rem;
              border: 1px solid rgb(226 232 240);
              background: white;
              padding: 0.5rem 0.75rem;
              font-size: 0.875rem;
            }
            .input-v:focus {
              outline: none;
              border-color: rgb(16 185 129);
              box-shadow: 0 0 0 3px rgb(16 185 129 / 0.15);
            }
          `}</style>
        </CardContent>
      </Card>

      {/* Conteo en tiempo real */}
      <Card>
        <CardContent className="py-5">
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            Conteo en tiempo real
          </h2>
          <Tabla candidatos={eleccion.candidatos} />
        </CardContent>
      </Card>
    </div>
  )
}

// ── Resultados ────────────────────────────────────────────────────────────

function Resultados({ eleccion }: { eleccion: EleccionState }) {
  return (
    <div className="space-y-4">
      <Card className="border-emerald-300 bg-gradient-to-br from-emerald-50 to-white">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">Elección cerrada</h2>
              <p className="text-sm text-slate-600">
                {eleccion.votos.length} votos · {eleccion.candidatos.length} candidatos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-5">
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            Ganadores
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Representantes del empleador
              </h3>
              <ul className="mt-2 space-y-2">
                {eleccion.candidatos
                  .filter((c) => c.origen === 'REPRESENTANTE_EMPLEADOR')
                  .sort((a, b) => b.votos - a.votos)
                  .slice(0, eleccion.cuposEmpleador)
                  .map((c) => (
                    <li
                      key={c.workerId}
                      className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3"
                    >
                      <p className="text-sm font-semibold">{c.nombre}</p>
                      <p className="text-xs text-emerald-700">{c.votos} votos · DNI {c.dni}</p>
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Representantes de los trabajadores
              </h3>
              <ul className="mt-2 space-y-2">
                {eleccion.candidatos
                  .filter((c) => c.origen === 'REPRESENTANTE_TRABAJADORES')
                  .sort((a, b) => b.votos - a.votos)
                  .slice(0, eleccion.cuposTrabajadores)
                  .map((c) => (
                    <li
                      key={c.workerId}
                      className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3"
                    >
                      <p className="text-sm font-semibold">{c.nombre}</p>
                      <p className="text-xs text-emerald-700">{c.votos} votos · DNI {c.dni}</p>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-5">
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            Conteo completo
          </h2>
          <Tabla candidatos={eleccion.candidatos} />
        </CardContent>
      </Card>

      <Card className="border-emerald-200 bg-emerald-50/30">
        <CardContent className="flex items-start gap-3 py-3 text-xs text-emerald-900">
          <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
          <div>
            <p className="font-semibold">Audit trail criptográfico</p>
            <p>
              Cada uno de los {eleccion.votos.length} votos tiene un hash SHA-256 firmado con
              electorId + candidatoId + timestamp + comiteId. Los hashes están en el audit log
              para verificación independiente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Tabla({ candidatos }: { candidatos: Candidato[] }) {
  const ordenados = [...candidatos].sort((a, b) => b.votos - a.votos)
  return (
    <table className="w-full text-sm">
      <thead className="text-xs text-slate-500">
        <tr>
          <th className="px-2 py-2 text-left">Candidato</th>
          <th className="px-2 py-2 text-left">Origen</th>
          <th className="px-2 py-2 text-right">Votos</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {ordenados.map((c) => (
          <tr key={c.workerId}>
            <td className="px-2 py-2 font-medium">{c.nombre}</td>
            <td className="px-2 py-2 text-xs">
              <Badge
                variant={c.origen === 'REPRESENTANTE_EMPLEADOR' ? 'info' : 'success'}
                size="xs"
              >
                {c.origen === 'REPRESENTANTE_EMPLEADOR' ? 'Empleador' : 'Trabajadores'}
              </Badge>
            </td>
            <td className="px-2 py-2 text-right text-base font-bold text-slate-900">
              {c.votos}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
