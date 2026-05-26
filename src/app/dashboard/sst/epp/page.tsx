'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  HardHat,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  UploadCloud,
  UserCheck,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface WorkerOption {
  id: string
  dni: string
  firstName: string
  lastName: string
  position: string | null
  department: string | null
  status: string
}

interface EppItem {
  id: string
  workerId: string
  tipoEpp: string
  marca: string | null
  modelo: string | null
  fechaEntrega: string
  cantidadEntregada: number
  fechaVencimiento: string | null
  evidenciaFotoUrl: string | null
  firmaWorkerUrl: string | null
  observaciones: string | null
  worker: {
    firstName: string
    lastName: string
    dni: string
  }
}

type FilterKey = 'todos' | 'vigentes' | 'por-vencer' | 'vencidos'

const EPP_PRESETS = [
  'Casco de seguridad',
  'Lentes de seguridad',
  'Guantes de proteccion',
  'Botas de seguridad',
  'Respirador',
  'Chaleco reflectivo',
  'Protector auditivo',
  'Arnes de seguridad',
]

const todayIso = () => new Date().toISOString().slice(0, 10)

function formatDate(value: string | null) {
  if (!value) return 'Sin vencimiento'
  return new Date(value).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function daysUntil(value: string | null) {
  if (!value) return null
  const now = new Date()
  const target = new Date(value)
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
}

function eppStatus(item: EppItem): { key: FilterKey; label: string; badge: 'success' | 'warning' | 'danger' | 'info' } {
  const days = daysUntil(item.fechaVencimiento)
  if (days === null) return { key: 'vigentes', label: 'Vigente', badge: 'success' }
  if (days < 0) return { key: 'vencidos', label: 'Vencido', badge: 'danger' }
  if (days <= 30) return { key: 'por-vencer', label: `Vence en ${days} dia(s)`, badge: 'warning' }
  return { key: 'vigentes', label: 'Vigente', badge: 'success' }
}

function latestValidByWorker(items: EppItem[]) {
  const covered = new Map<string, EppItem>()
  const expired = new Set<string>()

  for (const item of items) {
    const status = eppStatus(item)
    if (status.key === 'vencidos') {
      expired.add(item.workerId)
      continue
    }
    const current = covered.get(item.workerId)
    if (!current || new Date(item.fechaEntrega) > new Date(current.fechaEntrega)) {
      covered.set(item.workerId, item)
    }
  }

  return { covered, expired }
}

export default function EppPage() {
  const [items, setItems] = useState<EppItem[]>([])
  const [workers, setWorkers] = useState<WorkerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('todos')
  const [search, setSearch] = useState('')
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([])
  const [tipoEpp, setTipoEpp] = useState(EPP_PRESETS[0])
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [fechaEntrega, setFechaEntrega] = useState(todayIso())
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [evidenciaFile, setEvidenciaFile] = useState<File | null>(null)
  const [firmaFile, setFirmaFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [eppRes, workersRes] = await Promise.all([
        fetch('/api/sst/epp', { cache: 'no-store' }),
        fetch('/api/workers?status=ACTIVE&limit=500&sortBy=lastName&sortDir=asc', { cache: 'no-store' }),
      ])
      const eppJson = await eppRes.json()
      const workersJson = await workersRes.json()
      if (!eppRes.ok) throw new Error(eppJson?.error || 'No se pudieron cargar entregas EPP.')
      if (!workersRes.ok) throw new Error(workersJson?.error || 'No se pudieron cargar trabajadores.')
      setItems(eppJson.epps ?? [])
      setWorkers(workersJson.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar EPP.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const coverage = useMemo(() => latestValidByWorker(items), [items])
  const activeWorkerIds = useMemo(() => new Set(workers.map((worker) => worker.id)), [workers])
  const missingWorkers = useMemo(
    () => workers.filter((worker) => !coverage.covered.has(worker.id)),
    [coverage.covered, workers],
  )
  const expiringItems = useMemo(
    () => items.filter((item) => eppStatus(item).key === 'por-vencer'),
    [items],
  )
  const expiredItems = useMemo(
    () => items.filter((item) => eppStatus(item).key === 'vencidos'),
    [items],
  )
  const coveragePct = workers.length > 0 ? Math.round((coverage.covered.size / workers.length) * 100) : 100

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      const status = eppStatus(item).key
      if (filter !== 'todos' && status !== filter) return false
      if (!q) return true
      const text = `${item.worker.firstName} ${item.worker.lastName} ${item.worker.dni} ${item.tipoEpp} ${item.marca ?? ''} ${item.modelo ?? ''}`.toLowerCase()
      return text.includes(q)
    })
  }, [filter, items, search])

  const selectedSet = useMemo(() => new Set(selectedWorkerIds), [selectedWorkerIds])
  const searchedWorkers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return workers
    return workers.filter((worker) =>
      `${worker.firstName} ${worker.lastName} ${worker.dni} ${worker.position ?? ''} ${worker.department ?? ''}`
        .toLowerCase()
        .includes(q),
    )
  }, [search, workers])

  function toggleWorker(workerId: string) {
    setSelectedWorkerIds((current) =>
      current.includes(workerId) ? current.filter((id) => id !== workerId) : [...current, workerId],
    )
  }

  function selectMissingWorkers() {
    setSelectedWorkerIds(missingWorkers.map((worker) => worker.id))
  }

  async function uploadOptional(file: File | null, subfolder: string) {
    if (!file) return null
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'documents')
    formData.append('subfolder', subfolder)
    const res = await fetch('/api/storage/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (!res.ok || !data?.data?.url) throw new Error(data?.error || `No se pudo subir ${file.name}.`)
    return data.data.url as string
  }

  async function createEpp() {
    if (selectedWorkerIds.length === 0) {
      setError('Selecciona al menos un trabajador.')
      return
    }
    if (!tipoEpp.trim() || !fechaEntrega) {
      setError('Indica tipo de EPP y fecha de entrega.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const [evidenciaFotoUrl, firmaWorkerUrl] = await Promise.all([
        uploadOptional(evidenciaFile, 'sst-epp/evidencias'),
        uploadOptional(firmaFile, 'sst-epp/firmas'),
      ])
      const res = await fetch('/api/sst/epp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerIds: selectedWorkerIds,
          tipoEpp: tipoEpp.trim(),
          marca: marca.trim() || undefined,
          modelo: modelo.trim() || undefined,
          fechaEntrega,
          cantidadEntregada: cantidad,
          fechaVencimiento: fechaVencimiento || undefined,
          evidenciaFotoUrl: evidenciaFotoUrl ?? undefined,
          firmaWorkerUrl: firmaWorkerUrl ?? undefined,
          observaciones: observaciones.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudo registrar la entrega EPP.')
      setSuccess(`Entrega registrada para ${data.created ?? selectedWorkerIds.length} trabajador(es).`)
      setSelectedWorkerIds([])
      setMarca('')
      setModelo('')
      setCantidad(1)
      setFechaEntrega(todayIso())
      setFechaVencimiento('')
      setObservaciones('')
      setEvidenciaFile(null)
      setFirmaFile(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la entrega EPP.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(id: string) {
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/sst/epp?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudo eliminar la entrega.')
      setItems((current) => current.filter((item) => item.id !== id))
      setSuccess('Entrega eliminada.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la entrega.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SST · Equipos de proteccion"
        title="Entrega de EPP con evidencia trazable"
        subtitle="Controla cobertura por trabajador, vencimientos, firmas y archivos de respaldo. SUNAFIL suele revisar que la entrega sea real, vigente y acreditable."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void load()} loading={loading}>
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
            <Link href="/dashboard/generadores/entrega-epp">
              <Button>
                <Download className="h-4 w-4" />
                Generar acta
              </Button>
            </Link>
          </div>
        }
      />

      {error ? <Message tone="danger" icon={AlertTriangle}>{error}</Message> : null}
      {success ? <Message tone="success" icon={CheckCircle2}>{success}</Message> : null}

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Cobertura vigente" value={`${coveragePct}%`} detail={`${coverage.covered.size}/${workers.length} trabajadores`} tone={coveragePct >= 90 ? 'emerald' : coveragePct >= 70 ? 'cyan' : 'amber'} />
        <StatCard label="Sin EPP vigente" value={missingWorkers.length} detail="requieren entrega o renovacion" tone={missingWorkers.length === 0 ? 'emerald' : 'red'} />
        <StatCard label="Por vencer" value={expiringItems.length} detail="en los proximos 30 dias" tone={expiringItems.length === 0 ? 'emerald' : 'amber'} />
        <StatCard label="Vencidos" value={expiredItems.length} detail="no deben quedar abiertos" tone={expiredItems.length === 0 ? 'emerald' : 'red'} />
      </div>

      {(missingWorkers.length > 0 || expiredItems.length > 0) ? (
        <Card className="border-amber-400/30 bg-amber-500/10">
          <CardContent className="flex flex-col gap-3 py-4 text-sm text-amber-100 md:flex-row md:items-center md:justify-between">
            <span className="inline-flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Hay trabajadores sin EPP vigente o con registros vencidos. La accion mas rentable es registrar entrega con firma y evidencia antes de una visita inspectiva.
              </span>
            </span>
            <Button type="button" variant="gold" size="sm" onClick={selectMissingWorkers}>
              Seleccionar pendientes
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Plus className="h-5 w-5 text-cyan-300" />
              Registrar entrega
            </CardTitle>
            <Badge variant={selectedWorkerIds.length > 0 ? 'info' : 'neutral'} size="sm">
              {selectedWorkerIds.length} seleccionado(s)
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase text-slate-400">Tipo de EPP</span>
                <select
                  value={tipoEpp}
                  onChange={(event) => setTipoEpp(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
                >
                  {EPP_PRESETS.map((preset) => <option key={preset}>{preset}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase text-slate-400">Cantidad</span>
                <input
                  type="number"
                  min={1}
                  value={cantidad}
                  onChange={(event) => setCantidad(Math.max(1, Number(event.target.value) || 1))}
                  className="w-full rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase text-slate-400">Marca</span>
                <input
                  value={marca}
                  onChange={(event) => setMarca(event.target.value)}
                  placeholder="Opcional"
                  className="w-full rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase text-slate-400">Modelo</span>
                <input
                  value={modelo}
                  onChange={(event) => setModelo(event.target.value)}
                  placeholder="Opcional"
                  className="w-full rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase text-slate-400">Fecha entrega</span>
                <input
                  type="date"
                  value={fechaEntrega}
                  onChange={(event) => setFechaEntrega(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase text-slate-400">Vencimiento / reposicion</span>
                <input
                  type="date"
                  value={fechaVencimiento}
                  onChange={(event) => setFechaVencimiento(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
                />
              </label>
            </div>

            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase text-slate-400">Observaciones</span>
              <textarea
                rows={3}
                value={observaciones}
                onChange={(event) => setObservaciones(event.target.value)}
                placeholder="Ej. entrega por reposicion, riesgo del puesto, condicion de uso, lote, talla."
                className="w-full resize-none rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <FileInput
                label="Evidencia foto / acta"
                file={evidenciaFile}
                onChange={setEvidenciaFile}
              />
              <FileInput
                label="Firma trabajador"
                file={firmaFile}
                onChange={setFirmaFile}
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/25 p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className="inline-flex items-center gap-2 text-sm font-bold text-slate-100">
                  <UserCheck className="h-4 w-4 text-cyan-300" />
                  Trabajadores
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="xs" onClick={selectMissingWorkers}>
                    Pendientes
                  </Button>
                  <Button type="button" variant="ghost" size="xs" onClick={() => setSelectedWorkerIds([])}>
                    Limpiar
                  </Button>
                </div>
              </div>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                {loading ? (
                  <LoadingLine label="Cargando trabajadores..." />
                ) : searchedWorkers.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-white/10 p-3 text-sm text-slate-500">No hay trabajadores con ese filtro.</p>
                ) : (
                  searchedWorkers.map((worker) => {
                    const covered = coverage.covered.has(worker.id)
                    const selected = selectedSet.has(worker.id)
                    return (
                      <label
                        key={worker.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition',
                          selected
                            ? 'border-cyan-300/60 bg-cyan-400/10'
                            : 'border-white/10 bg-black/10 hover:border-cyan-300/30',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleWorker(worker.id)}
                          className="h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-300"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-100">
                            {worker.firstName} {worker.lastName}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            DNI {worker.dni} · {worker.position ?? 'Sin cargo'}
                          </span>
                        </span>
                        <Badge variant={covered ? 'success' : 'warning'} size="xs">
                          {covered ? 'Cubierto' : 'Pendiente'}
                        </Badge>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            <Button fullWidth loading={saving} onClick={createEpp}>
              <UploadCloud className="h-4 w-4" />
              Registrar entrega EPP
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-cyan-300" />
              Control de entregas
            </CardTitle>
            <Badge variant="neutral" size="sm">
              {filteredItems.length} registros
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar trabajador, DNI, EPP..."
                  className="w-full rounded-lg border border-white/10 bg-slate-950/30 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['todos', 'vigentes', 'por-vencer', 'vencidos'] as FilterKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-xs font-bold transition',
                      filter === key
                        ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                        : 'border-white/10 text-slate-300 hover:bg-white/10',
                    )}
                  >
                    {key === 'por-vencer' ? 'Por vencer' : key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <LoadingLine label="Cargando entregas..." />
            ) : filteredItems.length === 0 ? (
              <EmptyEppState hasWorkers={activeWorkerIds.size > 0} />
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <EppRow key={item.id} item={item} onDelete={() => void deleteItem(item.id)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Message({
  tone,
  icon: Icon,
  children,
}: {
  tone: 'success' | 'danger'
  icon: typeof AlertTriangle
  children: React.ReactNode
}) {
  return (
    <Card className={tone === 'success' ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-red-400/30 bg-red-500/10'}>
      <CardContent className={cn('flex items-center gap-2 py-3 text-sm', tone === 'success' ? 'text-emerald-100' : 'text-red-100')}>
        <Icon className="h-4 w-4" />
        {children}
      </CardContent>
    </Card>
  )
}

function StatCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: number | string
  detail: string
  tone: 'emerald' | 'cyan' | 'amber' | 'red'
}) {
  const toneClass = {
    emerald: 'text-emerald-300',
    cyan: 'text-cyan-300',
    amber: 'text-amber-300',
    red: 'text-red-300',
  }[tone]

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
        <p className={cn('mt-1 text-3xl font-black', toneClass)}>{value}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
      </CardContent>
    </Card>
  )
}

function FileInput({
  label,
  file,
  onChange,
}: {
  label: string
  file: File | null
  onChange: (file: File | null) => void
}) {
  return (
    <label className="block rounded-xl border border-white/10 bg-slate-950/25 p-3">
      <span className="text-xs font-bold uppercase text-slate-400">{label}</span>
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="mt-2 w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-300 file:px-3 file:py-2 file:text-xs file:font-black file:text-slate-950"
      />
      <span className="mt-2 block truncate text-xs text-slate-500">{file ? file.name : 'PDF o imagen opcional'}</span>
    </label>
  )
}

function LoadingLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/25 p-4 text-sm text-slate-400">
      <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
      {label}
    </div>
  )
}

function EmptyEppState({ hasWorkers }: { hasWorkers: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
      <HardHat className="mx-auto h-10 w-10 text-slate-500" />
      <p className="mt-3 text-sm font-bold text-slate-200">
        {hasWorkers ? 'Aun no hay entregas EPP registradas' : 'Primero registra trabajadores activos'}
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        {hasWorkers
          ? 'Selecciona trabajadores, adjunta evidencia y registra la primera entrega.'
          : 'El control EPP se calcula sobre trabajadores activos.'}
      </p>
    </div>
  )
}

function EppRow({ item, onDelete }: { item: EppItem; onDelete: () => void }) {
  const status = eppStatus(item)
  const docs = [
    item.evidenciaFotoUrl ? { label: 'Evidencia', href: item.evidenciaFotoUrl } : null,
    item.firmaWorkerUrl ? { label: 'Firma', href: item.firmaWorkerUrl } : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/25 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status.badge} size="xs">{status.label}</Badge>
            <span className="text-[11px] font-bold uppercase text-slate-500">{formatDate(item.fechaEntrega)}</span>
          </div>
          <p className="mt-2 text-sm font-black text-slate-100">
            {item.worker.firstName} {item.worker.lastName}
          </p>
          <p className="mt-1 text-xs text-slate-500">DNI {item.worker.dni}</p>
          <p className="mt-2 text-sm font-bold text-cyan-100">
            {item.tipoEpp} · {item.cantidadEntregada} unidad(es)
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {[item.marca, item.modelo].filter(Boolean).join(' · ') || 'Sin marca/modelo'}
          </p>
          {item.observaciones ? (
            <p className="mt-2 rounded-lg border border-white/10 bg-black/10 p-2 text-xs leading-5 text-slate-400">
              {item.observaciones}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 space-y-2 lg:text-right">
          <p className="text-xs font-bold uppercase text-slate-500">Vencimiento</p>
          <p className={cn('text-sm font-black', status.key === 'vencidos' ? 'text-red-300' : status.key === 'por-vencer' ? 'text-amber-300' : 'text-emerald-300')}>
            {formatDate(item.fechaVencimiento)}
          </p>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {docs.map((doc) => (
              <a
                key={doc.label}
                href={doc.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/25 px-2.5 py-1.5 text-xs font-bold text-cyan-100 transition hover:bg-cyan-400/10"
              >
                {doc.label}
              </a>
            ))}
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300/20 px-2.5 py-1.5 text-xs font-bold text-red-200 transition hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
