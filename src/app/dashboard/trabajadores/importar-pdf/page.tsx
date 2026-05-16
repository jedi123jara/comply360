'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  SkipForward,
  Save,
  FileText,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Users,
  BookOpen,
  ExternalLink,
  RefreshCw,
  FileBadge2,
} from 'lucide-react'
import { validateContractData, type ContractObservation } from '@/lib/agents/contract-validator'

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface ExtractedWorkerData {
  dni?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  birthDate?: string
  gender?: string
  nationality?: string
  address?: string
  position?: string
  department?: string
  regimenLaboral?: string
  tipoContrato?: string
  fechaIngreso?: string
  fechaFin?: string
  sueldoBruto?: number
  jornadaSemanal?: number
  asignacionFamiliar?: boolean
  tipoAporte?: string
  afpNombre?: string
  confidence?: number
  fieldsFound?: string[]
  warnings?: string[]
}

interface BatchWorkerItem {
  index: number
  status: 'success' | 'error'
  data?: ExtractedWorkerData
  error?: string
  preview: string
  startPage: number
  endPage: number
  pageCount: number
}

interface FileInfo {
  name: string
  size: number
  totalPages: number
}

type ItemState = 'pending' | 'saved' | 'skipped' | 'failed'

// ─── Constantes ──────────────────────────────────────────────────────────────

const REGIMENES = [
  'GENERAL',
  'MYPE_MICRO',
  'MYPE_PEQUENA',
  'AGRARIO',
  'CONSTRUCCION_CIVIL',
  'DOMESTICO',
  'CAS',
  'MODALIDAD_FORMATIVA',
]

const TIPOS_CONTRATO = [
  'INDEFINIDO',
  'PLAZO_FIJO',
  'TIEMPO_PARCIAL',
  'PRACTICAS_PREPROFESIONALES',
  'PRACTICAS_PROFESIONALES',
  'LOCACION_SERVICIOS',
]

// ─── Componente principal ────────────────────────────────────────────────────

export default function ImportarPdfPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  // Estado de subida
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Estado del batch
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [items, setItems] = useState<BatchWorkerItem[]>([])
  const [states, setStates] = useState<ItemState[]>([])
  const [drafts, setDrafts] = useState<ExtractedWorkerData[]>([])
  const [savedWorkerIds, setSavedWorkerIds] = useState<Record<number, string>>({})

  // Estado del wizard
  const [currentIdx, setCurrentIdx] = useState(0)
  const [savingNow, setSavingNow] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)

  // Estado de extracción bajo demanda
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [retryTrigger, setRetryTrigger] = useState(0)
  // Cache de contratos ya extraídos (index → data)
  const extractedCache = useRef<Record<number, ExtractedWorkerData | 'error'>>({})

  // Estado de detección de duplicados
  const [duplicateWorker, setDuplicateWorker] = useState<ExtractedWorkerData | null>(null)
  const [, setDuplicateWorkerId] = useState<string | null>(null)
  const [duplicateUpdated, setDuplicateUpdated] = useState<Record<number, boolean>>({})
  const duplicateCache = useRef<Record<string, { worker: ExtractedWorkerData; id: string } | 'none'>>({})
  // Ref para abortar prefetch si el usuario cambia de contrato
  const prefetchController = useRef<AbortController | null>(null)

  // ─── Extracción bajo demanda de 1 contrato ───────────────────────────────

  const extractContract = useCallback(async (sid: string, contractIndex: number, signal?: AbortSignal) => {
    // Si ya está en cache, devolver
    const cached = extractedCache.current[contractIndex]
    if (cached && cached !== 'error') return cached

    // Timeout de 90s para no dejar el spinner infinito
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90_000)

    // Combinar con señal externa (para cancelaciones de prefetch)
    if (signal) {
      signal.addEventListener('abort', () => controller.abort())
    }

    try {
      const res = await fetch('/api/workers/extract-one-from-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, contractIndex }),
        signal: controller.signal,
      })
      const json = await res.json()

      if (json.status === 'success' && json.data) {
        extractedCache.current[contractIndex] = json.data
        return json.data as ExtractedWorkerData
      }

      extractedCache.current[contractIndex] = 'error'
      throw new Error(json.error || 'Error extrayendo datos')
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        extractedCache.current[contractIndex] = 'error'
        throw new Error('Tiempo agotado (90s). La IA tardó demasiado. Haz clic en Reintentar.')
      }
      throw e
    } finally {
      clearTimeout(timeout)
    }
  }, [])

  function findNextPending(fromIdx: number): number | null {
    for (let i = fromIdx + 1; i < items.length; i++) {
      if (states[i] === 'pending') return i
    }
    return null
  }

  // Cuando cambia el contrato actual, extraer sus datos + prefetch el siguiente
  useEffect(() => {
    if (!sessionId || items.length === 0) return
    if (states[currentIdx] === 'saved' || states[currentIdx] === 'skipped') return

    let cancelled = false

    async function loadCurrent() {
      const contractIndex = items[currentIdx]?.index
      if (!contractIndex) return

      // Si ya tenemos datos en el draft, no re-extraer
      const existingDraft = drafts[currentIdx]
      if (existingDraft && (existingDraft.dni || existingDraft.firstName)) return

      setExtracting(true)
      setExtractError(null)

      try {
        const data = await extractContract(sessionId!, contractIndex)
        if (cancelled) return

        // Actualizar el draft y el item con los datos extraídos
        setDrafts(prev => {
          const next = [...prev]
          next[currentIdx] = { ...data }
          return next
        })
        setItems(prev => {
          const next = [...prev]
          next[currentIdx] = { ...next[currentIdx], status: 'success', data }
          return next
        })

        // ── Verificar duplicado por DNI ──────────────────────────────────
        if (data.dni && /^\d{8}$/.test(data.dni)) {
          const cachedDup = duplicateCache.current[data.dni]
          if (cachedDup === 'none') {
            setDuplicateWorker(null)
            setDuplicateWorkerId(null)
          } else if (cachedDup) {
            setDuplicateWorker(cachedDup.worker)
            setDuplicateWorkerId(cachedDup.id)
          } else {
            try {
              const dupRes = await fetch('/api/workers/check-duplicate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dni: data.dni }),
              })
              const dupData = await dupRes.json()
              if (!cancelled && dupData.exists && dupData.worker) {
                duplicateCache.current[data.dni] = { worker: dupData.worker, id: dupData.worker.id }
                setDuplicateWorker(dupData.worker)
                setDuplicateWorkerId(dupData.worker.id)
              } else {
                duplicateCache.current[data.dni] = 'none'
                if (!cancelled) {
                  setDuplicateWorker(null)
                  setDuplicateWorkerId(null)
                }
              }
            } catch {
              // Error verificando duplicado — no bloquear
            }
          }
        } else {
          setDuplicateWorker(null)
          setDuplicateWorkerId(null)
        }
      } catch (e) {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : 'Error desconocido'
        setExtractError(msg)
        setItems(prev => {
          const next = [...prev]
          next[currentIdx] = { ...next[currentIdx], status: 'error', error: msg }
          return next
        })
      } finally {
        if (!cancelled) setExtracting(false)
      }

      // ── Prefetch del siguiente contrato en background ──────────────
      if (cancelled) return
      prefetchController.current?.abort()
      const nextPending = findNextPending(currentIdx)
      if (nextPending !== null && sessionId) {
        const ctrl = new AbortController()
        prefetchController.current = ctrl
        try {
          await extractContract(sessionId, items[nextPending].index, ctrl.signal)
        } catch {
          // Prefetch falló silenciosamente — se reintentará cuando el usuario llegue
        }
      }
    }

    loadCurrent()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, currentIdx, items.length, retryTrigger])

  // ─── Upload: solo split, sin IA ──────────────────────────────────────────

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    setUploadProgress('Subiendo archivo...')

    try {
      const fd = new FormData()
      fd.append('file', file)

      setUploadProgress('Extrayendo texto y detectando contratos...')
      const res = await fetch('/api/workers/prepare-batch-from-pdf', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error procesando archivo')

      // Crear items sin datos de IA — se extraerán bajo demanda
      const contractList: BatchWorkerItem[] = (data.contracts as Array<{
        index: number; preview: string; startPage: number; endPage: number; pageCount: number
      }>).map(c => ({
        index: c.index,
        status: 'error' as const, // se actualizará cuando se extraiga
        data: undefined,
        error: 'Pendiente de extracción',
        preview: c.preview,
        startPage: c.startPage,
        endPage: c.endPage,
        pageCount: c.pageCount,
      }))

      // Reset cache
      extractedCache.current = {}

      setSessionId(data.sessionId)
      setFileInfo(data.fileInfo)
      setItems(contractList)
      setDrafts(contractList.map(() => ({})))
      setStates(contractList.map(() => 'pending'))
      setSavedWorkerIds({})
      setCurrentIdx(0)
      setFinished(false)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setUploading(false)
      setUploadProgress('')
    }
  }

  // ─── Edición del draft ────────────────────────────────────────────────────

  function updateDraft(patch: Partial<ExtractedWorkerData>) {
    setDrafts(prev => {
      const next = [...prev]
      next[currentIdx] = { ...next[currentIdx], ...patch }
      return next
    })
  }

  // ─── Navegación ───────────────────────────────────────────────────────────

  function advance() {
    setSaveError(null)
    let next = currentIdx + 1
    while (next < items.length && states[next] !== 'pending') next++
    if (next >= items.length) {
      setFinished(true)
    } else {
      setCurrentIdx(next)
    }
  }

  // ─── Guardar trabajador ───────────────────────────────────────────────────

  async function handleSaveCurrent() {
    if (!sessionId) {
      setSaveError('Sesión perdida. Vuelve a subir el PDF.')
      return
    }
    const draft = drafts[currentIdx]
    setSavingNow(true)
    setSaveError(null)
    try {
      if (!draft.dni || !/^\d{8}$/.test(draft.dni)) {
        throw new Error('DNI inválido (debe tener 8 dígitos)')
      }
      if (!draft.firstName || !draft.lastName) {
        throw new Error('Nombres y apellidos son obligatorios')
      }
      if (!draft.fechaIngreso) {
        throw new Error('Fecha de ingreso es obligatoria')
      }
      if (draft.sueldoBruto == null || draft.sueldoBruto <= 0) {
        throw new Error('Sueldo bruto es obligatorio')
      }

      const res = await fetch('/api/workers/save-from-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          workerIndex: items[currentIdx].index,
          workerData: draft,
        }),
      })
      const json = await res.json()

      if (res.status === 410) {
        throw new Error(json.error + ' (puedes subir el PDF nuevamente)')
      }
      if (!res.ok) throw new Error(json.error || 'Error al guardar')

      setSavedWorkerIds(prev => ({ ...prev, [currentIdx]: json.workerId }))
      // Marcar como 'saved' — el label diferencia nuevo vs actualizado en el resumen
      setStates(prev => {
        const next = [...prev]
        next[currentIdx] = 'saved'
        return next
      })
      // Guardar si fue duplicado para mostrarlo en el resumen final
      if (json.isDuplicate) {
        setDuplicateUpdated(prev => ({ ...prev, [currentIdx]: true }))
      }
      advance()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSavingNow(false)
    }
  }

  function handleSkip() {
    setStates(prev => {
      const next = [...prev]
      next[currentIdx] = 'skipped'
      return next
    })
    advance()
  }

  // ─── Pantalla 1: Upload ───────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <div className="space-y-6 p-6 max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-gold/10 p-3 flex-shrink-0">
            <Sparkles className="h-7 w-7 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Importar legajo PDF múltiple</h1>
            <p className="mt-1 text-sm text-slate-400">
              Sube un PDF con uno o varios contratos. La IA detecta cada contrato,
              extrae los datos del trabajador y te los presenta uno por uno para revisar.
              Al aprobar cada uno, se guarda el trabajador{' '}
              <strong className="text-slate-300">
                y se extrae automáticamente su contrato en un PDF separado
              </strong>{' '}
              que queda en su legajo.
            </p>
          </div>
        </div>

        {/* Cómo funciona */}
        <div className="rounded-2xl border border-slate-800 bg-white/40 p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">¿Cómo funciona?</h2>
          <div className="space-y-2">
            {[
              { step: '1', label: 'Sube el PDF con todos los contratos' },
              { step: '2', label: 'La IA detecta y extrae datos de cada contrato' },
              { step: '3', label: 'Revisas y corriges cada trabajador' },
              { step: '4', label: 'Al guardar, el contrato de ese trabajador se extrae y guarda en su legajo' },
            ].map(item => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-gold">{item.step}</span>
                </div>
                <p className="text-sm text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        <div className="rounded-2xl border border-slate-800 bg-white p-6">
          <div
            onClick={() => !uploading && inputRef.current?.click()}
            className={[
              'cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200',
              uploading
                ? 'border-blue-500/50 bg-blue-500/5'
                : file
                ? 'border-blue-500/60 bg-blue-500/5 hover:border-blue-400'
                : 'border-slate-700 bg-slate-950/50 hover:border-slate-500 hover:bg-slate-950',
            ].join(' ')}
          >
            {uploading ? (
              <Loader2 className="mx-auto h-12 w-12 text-emerald-600 animate-spin" />
            ) : file ? (
              <div className="mx-auto h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Upload className="h-6 w-6 text-emerald-600" />
              </div>
            ) : (
              <Upload className="mx-auto h-12 w-12 text-slate-500" />
            )}
            <p className={['mt-3 text-sm font-medium', file ? 'text-white' : 'text-slate-300'].join(' ')}>
              {uploading
                ? uploadProgress
                : file
                ? file.name
                : 'Haz clic para seleccionar un PDF con contratos'}
            </p>
            {file && !uploading && (
              <p className="mt-1 text-xs text-emerald-600/80">
                {(file.size / 1024 / 1024).toFixed(2)} MB · PDF · Listo para analizar
              </p>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => {
                setFile(e.target.files?.[0] ?? null)
                setUploadError(null)
              }}
            />
          </div>

          {/* Progreso durante el upload */}
          {uploading && (
            <div className="mt-4 space-y-2">
              <ProgressStep
                label="Subir archivo"
                status={uploadProgress.includes('Subiendo') ? 'active' : 'done'}
              />
              <ProgressStep
                label="Extraer texto y detectar contratos"
                status={
                  uploadProgress.includes('Subiendo') ? 'pending' : 'active'
                }
              />
            </div>
          )}

          <div className="mt-4 flex justify-center">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={[
                'inline-flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-200',
                'disabled:cursor-not-allowed disabled:opacity-40',
                file && !uploading
                  ? 'bg-gold text-slate-950 hover:bg-amber-400 shadow-md shadow-gold/20'
                  : 'bg-white/5 text-slate-500',
              ].join(' ')}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadProgress || 'Detectando contratos...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Detectar y extraer datos
                </>
              )}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Máximo 4.5 MB · PDF con texto o escaneado (OCR automático)
          </p>

          {uploadError && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Pantalla 3: Resumen final ────────────────────────────────────────────

  if (finished) {
    const saved = states.filter(s => s === 'saved').length
    const updated = Object.values(duplicateUpdated).filter(Boolean).length
    const newWorkers = saved - updated
    const skipped = states.filter(s => s === 'skipped').length
    const failed = states.filter(s => s === 'failed').length
    return (
      <div className="space-y-6 p-6 max-w-2xl mx-auto">
        <div className="rounded-2xl border border-gold/30 bg-gold/5 p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-gold" />
          <h1 className="mt-4 text-2xl font-bold text-white">Importación completada</h1>
          <p className="mt-2 text-sm text-slate-400">
            Se procesaron{' '}
            <span className="font-semibold text-white">{items.length} contratos</span>{' '}
            detectados en{' '}
            <span className="font-semibold text-white">
              {fileInfo?.name ?? 'el PDF'}
            </span>
            .
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <StatCard label="Nuevos" value={newWorkers} color="text-green-400" bg="bg-green-400/10" />
            <StatCard label="Actualizados" value={updated} color="text-emerald-600" bg="bg-blue-400/10" />
            <StatCard label="Saltados" value={skipped} color="text-yellow-400" bg="bg-yellow-400/10" />
            <StatCard label="Con error" value={failed} color="text-red-400" bg="bg-red-400/10" />
          </div>
        </div>

        {/* Lista de guardados */}
        {saved > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Users className="h-4 w-4 text-green-400" />
              Trabajadores guardados
            </h2>
            <div className="space-y-2">
              {items.map((item, idx) => {
                if (states[idx] !== 'saved') return null
                const workerId = savedWorkerIds[idx]
                const name = drafts[idx]
                  ? `${drafts[idx].firstName || ''} ${drafts[idx].lastName || ''}`.trim()
                  : `Trabajador ${item.index}`
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-950/50 px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${duplicateUpdated[idx] ? 'text-emerald-600' : 'text-green-400'}`} />
                      <span className="text-sm text-white">{name}</span>
                      <PagesBadge start={item.startPage} end={item.endPage} />
                      {duplicateUpdated[idx] && (
                        <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                          ACTUALIZADO
                        </span>
                      )}
                    </div>
                    {workerId && (
                      <button
                        onClick={() => router.push(`/dashboard/trabajadores/${workerId}`)}
                        className="inline-flex items-center gap-1 text-xs text-gold hover:text-gold-light"
                      >
                        Ver legajo <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex justify-center gap-3">
          <button
            onClick={() => router.push('/dashboard/trabajadores')}
            className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400"
          >
            Ver todos los trabajadores
          </button>
          <button
            onClick={() => {
              setItems([])
              setDrafts([])
              setStates([])
              setFinished(false)
              setFile(null)
              setSessionId(null)
              setFileInfo(null)
              setSavedWorkerIds({})
            }}
            className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <RefreshCw className="inline h-4 w-4 mr-1.5" />
            Importar otro PDF
          </button>
        </div>
      </div>
    )
  }

  // ─── Pantalla 2: Wizard por trabajador ───────────────────────────────────

  const current = items[currentIdx]
  const draft = drafts[currentIdx]
  const totalPending = states.filter(s => s === 'pending').length
  const savedCount = states.filter(s => s === 'saved').length
  const progressPct = Math.round((currentIdx / items.length) * 100)

  return (
    <div className="space-y-5 p-6">
      {/* ── Banner resumen del archivo ── */}
      {fileInfo && (
        <div className="rounded-xl border border-slate-800 bg-white px-5 py-3 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <BookOpen className="h-4 w-4 text-gold" />
            <span className="font-medium">{fileInfo.name}</span>
          </div>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">{fileInfo.totalPages} páginas</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">{items.length} contratos detectados</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">{(fileInfo.size / 1024 / 1024).toFixed(1)} MB</span>
        </div>
      )}

      {/* ── Barra de progreso del wizard ── */}
      <div className="rounded-2xl border border-slate-800 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileBadge2 className="h-5 w-5 text-gold" />
            <h1 className="text-lg font-semibold text-white">
              Contrato {currentIdx + 1} de {items.length}
            </h1>
            <PagesBadge start={current.startPage} end={current.endPage} />
          </div>
          <div className="text-xs text-slate-400">
            {savedCount} guardados · {totalPending} pendientes
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gold transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {/* Miniaturas de estado */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (states[idx] === 'pending' || states[idx] === 'failed') {
                  setSaveError(null)
                  setCurrentIdx(idx)
                }
              }}
              title={`Contrato ${idx + 1} — ${states[idx]}`}
              className={`h-5 w-5 rounded text-[10px] font-bold transition
                ${
                  idx === currentIdx
                    ? 'ring-2 ring-gold bg-gold/30 text-gold-light'
                    : states[idx] === 'saved'
                    ? 'bg-green-500/30 text-green-300'
                    : states[idx] === 'skipped'
                    ? 'bg-slate-700 text-slate-400'
                    : states[idx] === 'failed'
                    ? 'bg-red-500/30 text-red-300'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tarjeta: extrayendo con IA ── */}
      {extracting ? (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-8 text-center">
          <Loader2 className="mx-auto h-10 w-10 text-emerald-600 animate-spin" />
          <p className="mt-4 text-lg font-semibold text-white">Extrayendo datos con IA...</p>
          <p className="mt-2 text-sm text-slate-400">
            Analizando contrato {current.index} (págs. {current.startPage}–{current.endPage})
          </p>
          <p className="mt-1 text-xs text-slate-500 italic">
            {current.preview.slice(0, 100)}...
          </p>
        </div>
      ) : extractError || (current.status === 'error' && !draft?.dni && !draft?.firstName) ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-white">No se pudieron extraer datos de este contrato</p>
              <p className="mt-1 text-sm text-slate-400">{extractError || current.error || 'Respuesta vacía de la IA'}</p>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Vista previa: <em className="text-slate-400">{current.preview}</em>
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => {
                // Reintentar extracción
                extractedCache.current[current.index] = undefined as unknown as ExtractedWorkerData
                setExtractError(null)
                setItems(prev => {
                  const next = [...prev]
                  next[currentIdx] = { ...next[currentIdx], status: 'error' as const, error: 'Pendiente' }
                  return next
                })
                // Forzar re-trigger del useEffect
                setRetryTrigger(prev => prev + 1)
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 px-4 py-2 text-sm text-emerald-600 hover:bg-blue-500/10"
            >
              <RefreshCw className="h-4 w-4" /> Reintentar
            </button>
            <button
              onClick={handleSkip}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800"
            >
              <SkipForward className="h-4 w-4" /> Saltar
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Banner de duplicado ── */}
          {duplicateWorker && (
            <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-5">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-yellow-300">
                    Trabajador ya registrado — DNI {draft?.dni}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {duplicateWorker.firstName} {duplicateWorker.lastName} ya existe en el sistema.
                    Al guardar, se actualizarán los datos faltantes y se agregará este contrato a su legajo.
                  </p>
                </div>
              </div>
              {/* Tabla de comparación de diferencias */}
              <DiffTable existing={duplicateWorker} extracted={draft || {}} />
            </div>
          )}

          {/* ── Formulario editable ── */}
          <div className="rounded-2xl border border-slate-800 bg-white p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">
                {duplicateWorker ? 'Datos del contrato (revisar antes de actualizar)' : 'Datos extraídos del contrato'}
              </h2>
              <div className="flex items-center gap-2">
                {draft.confidence != null && (
                  <ConfidenceBadge value={draft.confidence} />
                )}
                {draft.fieldsFound && draft.fieldsFound.length > 0 && (
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
                    {draft.fieldsFound.length} campos encontrados
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label="DNI *"
                value={draft.dni || ''}
                onChange={v => updateDraft({ dni: v })}
                placeholder="12345678"
              />
              <Field
                label="Nombres *"
                value={draft.firstName || ''}
                onChange={v => updateDraft({ firstName: v })}
                placeholder="Juan"
                className="lg:col-span-1"
              />
              <Field
                label="Apellidos *"
                value={draft.lastName || ''}
                onChange={v => updateDraft({ lastName: v })}
                placeholder="Pérez García"
              />
              <Field
                label="Email"
                type="email"
                value={draft.email || ''}
                onChange={v => updateDraft({ email: v })}
                placeholder="trabajador@empresa.pe"
              />
              <Field
                label="Teléfono"
                value={draft.phone || ''}
                onChange={v => updateDraft({ phone: v })}
                placeholder="987654321"
              />
              <Field
                label="Cargo / Puesto"
                value={draft.position || ''}
                onChange={v => updateDraft({ position: v })}
                placeholder="Analista Senior"
              />
              <Field
                label="Área / Departamento"
                value={draft.department || ''}
                onChange={v => updateDraft({ department: v })}
                placeholder="Operaciones"
              />
              <Field
                label="Fecha de ingreso *"
                type="date"
                value={draft.fechaIngreso || ''}
                onChange={v => updateDraft({ fechaIngreso: v })}
              />
              <Field
                label="Fecha fin (si es plazo fijo)"
                type="date"
                value={draft.fechaFin || ''}
                onChange={v => updateDraft({ fechaFin: v })}
              />
              <Field
                label="Sueldo bruto (S/) *"
                type="number"
                value={String(draft.sueldoBruto ?? '')}
                onChange={v => updateDraft({ sueldoBruto: v ? Number(v) : undefined })}
                placeholder="1025"
              />
              <Field
                label="Jornada semanal (horas)"
                type="number"
                value={String(draft.jornadaSemanal ?? 48)}
                onChange={v => updateDraft({ jornadaSemanal: v ? Number(v) : 48 })}
                placeholder="48"
              />
              <SelectField
                label="Régimen laboral"
                value={draft.regimenLaboral || ''}
                onChange={v => updateDraft({ regimenLaboral: v })}
                options={REGIMENES}
              />
              <SelectField
                label="Tipo de contrato"
                value={draft.tipoContrato || ''}
                onChange={v => updateDraft({ tipoContrato: v })}
                options={TIPOS_CONTRATO}
              />
              <SelectField
                label="Tipo de aporte previsional"
                value={draft.tipoAporte || ''}
                onChange={v => updateDraft({ tipoAporte: v })}
                options={['AFP', 'ONP', 'SIN_APORTE']}
              />
              <Field
                label="AFP (si aplica)"
                value={draft.afpNombre || ''}
                onChange={v => updateDraft({ afpNombre: v })}
                placeholder="Integra, Prima, Habitat…"
              />
            </div>

            {/* Checkbox asignación familiar */}
            <label className="mt-4 flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(draft.asignacionFamiliar)}
                onChange={e => updateDraft({ asignacionFamiliar: e.target.checked })}
                className="h-4 w-4 rounded border-[color:var(--border-default)] bg-slate-950 text-gold focus:ring-gold"
              />
              Tiene asignación familiar (10% UIT = S/550)
            </label>

            {/* Observaciones del validador legal */}
            <ContractObservations data={draft} />

            {/* Error de guardado */}
            {saveError && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{saveError}</span>
              </div>
            )}
          </div>

          {/* ── Vista previa + acciones ── */}
          <div className="rounded-2xl border border-slate-800 bg-white p-5">
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-400 mb-1">
                Vista previa del contrato (págs. {current.startPage}–{current.endPage}):
              </p>
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                {current.preview}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <FileText className="h-4 w-4" />
                <span>{current.pageCount} página{current.pageCount !== 1 ? 's' : ''} se extraerán al legajo</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSkip}
                  disabled={savingNow}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <SkipForward className="h-4 w-4" /> Saltar
                </button>
                <button
                  onClick={handleSaveCurrent}
                  disabled={savingNow}
                  className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  {savingNow ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {duplicateWorker ? 'Actualizar y guardar contrato' : 'Guardar y siguiente'}
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function PagesBadge({ start, end }: { start: number; end: number }) {
  return (
    <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
      pág. {start === end ? start : `${start}–${end}`}
    </span>
  )
}

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 80
      ? 'bg-green-500/15 text-green-400'
      : value >= 60
      ? 'bg-yellow-500/15 text-yellow-400'
      : 'bg-red-500/15 text-red-400'
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
      Confianza IA: {value}%
    </span>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  className?: string
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-gold focus:outline-none"
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-gold focus:outline-none"
      >
        <option value="">— Seleccionar —</option>
        {options.map(o => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

function StatCard({
  label,
  value,
  color,
  bg,
}: {
  label: string
  value: number
  color: string
  bg: string
}) {
  return (
    <div className={`rounded-xl border border-slate-800 ${bg} p-4`}>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  )
}

function ProgressStep({
  label,
  status,
}: {
  label: string
  status: 'pending' | 'active' | 'done'
}) {
  return (
    <div className="flex items-center gap-3">
      {status === 'done' ? (
        <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
      ) : status === 'active' ? (
        <Loader2 className="h-4 w-4 text-emerald-600 animate-spin flex-shrink-0" />
      ) : (
        <div className="h-4 w-4 rounded-full border border-[color:var(--border-default)] flex-shrink-0" />
      )}
      <span
        className={`text-sm ${
          status === 'done'
            ? 'text-green-400'
            : status === 'active'
            ? 'text-emerald-600 font-medium'
            : 'text-slate-500'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

const DIFF_FIELDS: Array<{ key: keyof ExtractedWorkerData; label: string }> = [
  { key: 'firstName', label: 'Nombres' },
  { key: 'lastName', label: 'Apellidos' },
  { key: 'position', label: 'Cargo' },
  { key: 'department', label: 'Área' },
  { key: 'regimenLaboral', label: 'Régimen' },
  { key: 'tipoContrato', label: 'Tipo contrato' },
  { key: 'fechaIngreso', label: 'Fecha ingreso' },
  { key: 'fechaFin', label: 'Fecha fin' },
  { key: 'sueldoBruto', label: 'Sueldo bruto' },
  { key: 'tipoAporte', label: 'Aporte prev.' },
  { key: 'afpNombre', label: 'AFP' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Teléfono' },
]

function DiffTable({
  existing,
  extracted,
}: {
  existing: ExtractedWorkerData
  extracted: ExtractedWorkerData
}) {
  // Encontrar campos con diferencias o datos nuevos
  const diffs = DIFF_FIELDS.filter(f => {
    const eVal = String(existing[f.key] ?? '')
    const nVal = String(extracted[f.key] ?? '')
    // Mostrar si hay diferencia O si el campo es nuevo (existente vacío, extraído tiene dato)
    return nVal && eVal !== nVal
  })

  if (diffs.length === 0) {
    return (
      <p className="text-xs text-green-400">
        Todos los datos coinciden con el registro existente.
      </p>
    )
  }

  return (
    <div className="rounded-lg border border-yellow-500/20 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-yellow-500/10">
            <th className="px-3 py-2 text-left text-yellow-300 font-medium">Campo</th>
            <th className="px-3 py-2 text-left text-slate-400 font-medium">Registro actual</th>
            <th className="px-3 py-2 text-left text-emerald-600 font-medium">Contrato PDF</th>
            <th className="px-3 py-2 text-left text-slate-400 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {diffs.map(f => {
            const eVal = String(existing[f.key] ?? '')
            const nVal = String(extracted[f.key] ?? '')
            const isNew = !eVal && nVal
            const isChanged = eVal && nVal && eVal !== nVal
            return (
              <tr key={f.key} className="border-t border-slate-800">
                <td className="px-3 py-2 text-slate-300 font-medium">{f.label}</td>
                <td className="px-3 py-2 text-slate-400">{eVal || '—'}</td>
                <td className="px-3 py-2 text-white font-medium">{nVal}</td>
                <td className="px-3 py-2">
                  {isNew ? (
                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-green-300 text-[10px] font-bold">
                      NUEVO
                    </span>
                  ) : isChanged ? (
                    <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-yellow-300 text-[10px] font-bold">
                      DIFERENTE
                    </span>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ContractObservations({ data }: { data: ExtractedWorkerData }) {
  const observations = useMemo(() => validateContractData(data), [data])

  if (observations.length === 0) return null

  const errors = observations.filter(o => o.type === 'error')
  const warnings = observations.filter(o => o.type === 'warning')
  const infos = observations.filter(o => o.type === 'info')

  return (
    <div className="mt-5 space-y-3">
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-xs font-semibold text-red-300 mb-2">
            Irregularidades detectadas ({errors.length})
          </p>
          <div className="space-y-2">
            {errors.map((o, i) => (
              <ObservationRow key={i} obs={o} />
            ))}
          </div>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
          <p className="text-xs font-semibold text-yellow-300 mb-2">
            Observaciones ({warnings.length})
          </p>
          <div className="space-y-2">
            {warnings.map((o, i) => (
              <ObservationRow key={i} obs={o} />
            ))}
          </div>
        </div>
      )}
      {infos.length > 0 && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
          <p className="text-xs font-semibold text-emerald-600 mb-2">
            Notas ({infos.length})
          </p>
          <div className="space-y-2">
            {infos.map((o, i) => (
              <ObservationRow key={i} obs={o} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ObservationRow({ obs }: { obs: ContractObservation }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <AlertTriangle className={`mt-0.5 h-3 w-3 flex-shrink-0 ${
        obs.type === 'error' ? 'text-red-400' : obs.type === 'warning' ? 'text-yellow-400' : 'text-emerald-600'
      }`} />
      <div>
        <span className={
          obs.type === 'error' ? 'text-red-200' : obs.type === 'warning' ? 'text-yellow-200' : 'text-blue-200'
        }>
          {obs.message}
        </span>
        {obs.baseLegal && (
          <span className="ml-1 text-slate-500">({obs.baseLegal})</span>
        )}
      </div>
    </div>
  )
}
