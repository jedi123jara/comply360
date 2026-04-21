'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Siren, Shield, ShieldAlert, ShieldCheck, AlertTriangle, Pause, CheckCircle2, Download, ArrowLeft, Loader2, FileText, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LiveChecklist, type ChecklistItem, type ChecklistItemStatus } from '@/components/ui/live-checklist'
import type { SolicitudInspector, HallazgoInspeccion, ResultadoSimulacro } from '@/lib/compliance/simulacro-engine'

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = 'setup' | 'active' | 'summary'
type InspeccionTipo = 'PREVENTIVA' | 'POR_DENUNCIA' | 'PROGRAMA_SECTORIAL'

interface SessionData {
  sessionId: string
  tipo: InspeccionTipo
  solicitudes: SolicitudInspector[]
  hallazgos: HallazgoInspeccion[]
  totalWorkers: number
}

interface PastSession {
  id: string
  tipo: string
  status: string
  inspectorName: string | null
  startedAt: string
  completedAt: string | null
  scoreInspeccion: number | null
  multaEstimada: number | null
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function InspeccionEnVivoPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('setup')

  // Setup state
  const [tipo, setTipo] = useState<InspeccionTipo>('PREVENTIVA')
  const [inspectorName, setInspectorName] = useState('')
  const [inspectorDNI, setInspectorDNI] = useState('')
  const [ordenInspeccion, setOrdenInspeccion] = useState('')
  const [starting, setStarting] = useState(false)

  // Active inspection state
  const [session, setSession] = useState<SessionData | null>(null)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [completing, setCompleting] = useState(false)

  // Result state
  const [resultado, setResultado] = useState<ResultadoSimulacro | null>(null)

  // History state
  const [pastSessions, setPastSessions] = useState<PastSession[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Load past sessions
  useEffect(() => {
    fetch('/api/inspeccion-en-vivo?limit=10')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.sessions) setPastSessions(d.sessions) })
      .catch(() => {})
      .finally(() => setLoadingHistory(false))
  }, [])

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleStartInspection = async () => {
    setStarting(true)
    try {
      const res = await fetch('/api/inspeccion-en-vivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, inspectorName, inspectorDNI, ordenInspeccion }),
      })

      if (res.status === 409) {
        const data = await res.json()
        // Redirect to existing active session
        router.push(`/dashboard/inspeccion-en-vivo/${data.activeSessionId}`)
        return
      }

      if (!res.ok) throw new Error('Error al iniciar inspeccion')

      const data = await res.json() as SessionData
      setSession(data)

      // Convert hallazgos to checklist items
      const items: ChecklistItem[] = data.solicitudes.map((s, i) => {
        const h = data.hallazgos[i]
        return {
          id: s.id,
          paso: s.paso,
          label: s.documentoLabel,
          description: s.mensaje,
          baseLegal: s.baseLegal,
          gravedad: s.gravedad,
          multaUIT: s.multaUIT,
          multaPEN: h?.multaPEN ?? 0,
          status: (h?.estado as ChecklistItemStatus) ?? 'PENDING',
          evidenceUrls: [],
          notes: '',
        }
      })
      setChecklistItems(items)
      setPhase('active')
    } catch (err) {
      console.error('Start inspection error:', err)
    } finally {
      setStarting(false)
    }
  }

  const handleStatusChange = useCallback(async (id: string, status: ChecklistItemStatus) => {
    if (!session) return

    // Optimistic update
    setChecklistItems(prev => prev.map(item => {
      if (item.id !== id) return item
      return { ...item, status }
    }))

    // Advance to next step
    const idx = checklistItems.findIndex(i => i.id === id)
    if (idx >= 0 && idx < checklistItems.length - 1) {
      setCurrentStep(idx + 1)
    }

    // Persist to API
    try {
      const res = await fetch(`/api/inspeccion-en-vivo/${session.sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitudId: id, estado: status }),
      })
      if (res.ok) {
        const data = await res.json()
        // Update multa from server response
        if (data.updated) {
          setChecklistItems(prev => prev.map(item => {
            if (item.id !== id) return item
            return { ...item, multaPEN: data.updated.multaPEN ?? item.multaPEN }
          }))
        }
      }
    } catch {
      // Revert optimistic update on error
    }
  }, [session, checklistItems])

  const handleEvidenceUpload = useCallback(async (id: string, file: File) => {
    if (!session) return
    setUploading(prev => ({ ...prev, [id]: true }))

    try {
      // Upload file
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: formData })

      if (uploadRes.ok) {
        const { url } = await uploadRes.json() as { url: string }

        // Update checklist item
        setChecklistItems(prev => prev.map(item => {
          if (item.id !== id) return item
          return { ...item, evidenceUrls: [...(item.evidenceUrls ?? []), url] }
        }))

        // Persist to API
        await fetch(`/api/inspeccion-en-vivo/${session.sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ solicitudId: id, evidenceUrl: url }),
        })
      }
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setUploading(prev => ({ ...prev, [id]: false }))
    }
  }, [session])

  const handleComplete = async () => {
    if (!session) return
    setCompleting(true)
    try {
      const res = await fetch(`/api/inspeccion-en-vivo/${session.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      })
      if (res.ok) {
        const data = await res.json()
        setResultado(data.resultado as ResultadoSimulacro)
        setPhase('summary')
      }
    } catch (err) {
      console.error('Complete error:', err)
    } finally {
      setCompleting(false)
    }
  }

  const handlePause = async () => {
    if (!session) return
    await fetch(`/api/inspeccion-en-vivo/${session.sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause' }),
    })
    router.push('/dashboard/inspeccion-en-vivo')
  }

  const handleDownloadPDF = async () => {
    if (!session) return
    const res = await fetch(`/api/inspeccion-en-vivo/${session.sessionId}/pdf`)
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Inspeccion_SUNAFIL_${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  // ─── Running totals for active phase ────────────────────────────────

  const totalMulta = checklistItems.reduce((sum, i) => sum + i.multaPEN, 0)
  const completedCount = checklistItems.filter(i => i.status !== 'PENDING').length
  const cumpleCount = checklistItems.filter(i => i.status === 'CUMPLE').length
  const noCount = checklistItems.filter(i => i.status === 'NO_CUMPLE').length
  const parcialCount = checklistItems.filter(i => i.status === 'PARCIAL').length

  // ═══════════════════════════════════════════════════════════════════════
  // SETUP PHASE
  // ═══════════════════════════════════════════════════════════════════════

  if (phase === 'setup') {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-900/30">
              <Siren className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Modo Inspeccion en Vivo</h1>
              <p className="text-sm text-gray-400">SUNAFIL esta aqui. Activa el modo crisis.</p>
            </div>
          </div>
        </div>

        {/* Alert banner */}
        <div className="rounded-xl bg-red-900/20 border border-red-800 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-300">Cuando usar este modo</h3>
              <p className="text-xs text-red-400 mt-1">
                Activa este modo cuando un inspector de SUNAFIL se presente en tu empresa. Te guiaremos documento por documento
                verificando en tiempo real tu legajo digital. Podras subir fotos y evidencias al instante.
              </p>
            </div>
          </div>
        </div>

        {/* Setup form */}
        <div className="rounded-xl border border-white/[0.08] bg-white shadow-sm">
          <div className="border-b border-white/[0.08] px-6 py-4">
            <h2 className="text-base font-semibold text-white">Datos de la Inspeccion</h2>
            <p className="text-xs text-gray-400">Completa los datos del inspector y la orden</p>
          </div>

          <div className="p-6 space-y-5">
            {/* Tipo de inspeccion */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de inspeccion</label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'PREVENTIVA' as const, label: 'Preventiva', desc: 'Sin denuncia previa — revision general', icon: Shield },
                  { value: 'POR_DENUNCIA' as const, label: 'Por Denuncia', desc: 'Motivada por queja de trabajador', icon: ShieldAlert },
                  { value: 'PROGRAMA_SECTORIAL' as const, label: 'Sectorial', desc: 'Programa especifico del sector', icon: ShieldCheck },
                ]).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTipo(opt.value)}
                    className={cn(
                      'rounded-xl border-2 p-4 text-left transition-all',
                      tipo === opt.value
                        ? 'border-red-500 bg-red-900/20'
                        : 'border-white/[0.08] border-[color:var(--border-default)] hover:border-white/10',
                    )}
                  >
                    <opt.icon className={cn('h-5 w-5 mb-2', tipo === opt.value ? 'text-red-600' : 'text-gray-400')} />
                    <p className="text-sm font-medium text-white">{opt.label}</p>
                    <p className="text-xs text-gray-400 mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Inspector data */}
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Nombre del Inspector</label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={e => setInspectorName(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full rounded-lg border border-white/[0.08] border-[color:var(--border-default)] bg-white bg-[color:var(--neutral-100)] px-3 py-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">DNI del Inspector</label>
                <input
                  type="text"
                  value={inspectorDNI}
                  onChange={e => setInspectorDNI(e.target.value)}
                  placeholder="12345678"
                  maxLength={8}
                  className="w-full rounded-lg border border-white/[0.08] border-[color:var(--border-default)] bg-white bg-[color:var(--neutral-100)] px-3 py-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">N de Orden de Inspeccion</label>
                <input
                  type="text"
                  value={ordenInspeccion}
                  onChange={e => setOrdenInspeccion(e.target.value)}
                  placeholder="OI-2026-XXXXX"
                  className="w-full rounded-lg border border-white/[0.08] border-[color:var(--border-default)] bg-white bg-[color:var(--neutral-100)] px-3 py-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>

            {/* Start button */}
            <button
              type="button"
              onClick={handleStartInspection}
              disabled={starting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-base font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50 shadow-lg shadow-red-600/30"
            >
              {starting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Siren className="h-5 w-5" />}
              {starting ? 'Iniciando...' : 'INICIAR MODO INSPECCION'}
            </button>
          </div>
        </div>

        {/* Past sessions */}
        <div className="rounded-xl border border-white/[0.08] bg-white shadow-sm">
          <div className="border-b border-white/[0.08] px-6 py-4 flex items-center gap-2">
            <History className="h-4 w-4 text-gray-400" />
            <h2 className="text-base font-semibold text-white">Historial de Inspecciones</h2>
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : pastSessions.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <Shield className="h-8 w-8 text-[color:var(--text-secondary)] mx-auto mb-2" />
              <p className="text-sm text-gray-400">No hay inspecciones registradas</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {pastSessions.map(s => {
                const score = s.scoreInspeccion
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => router.push(`/dashboard/inspeccion-en-vivo/${s.id}`)}
                    className="w-full flex items-center gap-4 px-6 py-3.5 text-left hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)]/50 transition-colors"
                  >
                    <div className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                      s.status === 'ACTIVE' ? 'bg-red-100 text-red-700 bg-red-900/40 text-red-400' :
                      score !== null && score >= 80 ? 'bg-emerald-100 text-emerald-700 bg-emerald-900/40' :
                      score !== null && score >= 60 ? 'bg-amber-100 text-amber-700 bg-amber-900/40' :
                      'bg-red-100 text-red-700 bg-red-900/40',
                    )}>
                      {s.status === 'ACTIVE' ? <Siren className="h-4 w-4" /> : score !== null ? `${score}` : '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">
                        {s.tipo} {s.inspectorName ? `— ${s.inspectorName}` : ''}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(s.startedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {s.status === 'ACTIVE' && <span className="ml-2 text-red-500 font-semibold">EN CURSO</span>}
                      </p>
                    </div>
                    {s.multaEstimada !== null && (
                      <span className="text-xs font-bold text-red-400 tabular-nums">
                        S/ {Number(s.multaEstimada).toLocaleString('es-PE')}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ACTIVE INSPECTION PHASE
  // ═══════════════════════════════════════════════════════════════════════

  if (phase === 'active') {
    return (
      <div className="space-y-4">
        {/* Top bar — sticky with running stats */}
        <div className="sticky top-0 z-30 bg-white border-b border-white/[0.08] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Siren className="h-5 w-5 text-red-500 animate-pulse" />
              <div>
                <p className="text-sm font-bold text-white">
                  Inspeccion en curso — {session?.tipo}
                </p>
                <p className="text-xs text-gray-400">
                  {completedCount}/{checklistItems.length} revisados
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Running multa */}
              <div className="text-right hidden sm:block">
                <p className="text-xs text-gray-400">Multa estimada</p>
                <p className="text-lg font-bold text-red-400 tabular-nums">
                  S/ {totalMulta.toLocaleString('es-PE')}
                </p>
              </div>

              {/* Action buttons */}
              <button
                type="button"
                onClick={handlePause}
                className="flex items-center gap-1 rounded-lg border border-white/[0.08] border-[color:var(--border-default)] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)]"
              >
                <Pause className="h-3.5 w-3.5" /> Pausar
              </button>

              <button
                type="button"
                onClick={handleComplete}
                disabled={completing || completedCount === 0}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {completing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Finalizar
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-[color:var(--neutral-100)]">
            <div
              className="h-1.5 rounded-full bg-amber-500 transition-all duration-500"
              style={{ width: `${(completedCount / checklistItems.length) * 100}%` }}
            />
          </div>

          {/* Mini stats */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span className="text-emerald-600 font-medium">{cumpleCount} cumple</span>
            <span className="text-amber-600 font-medium">{parcialCount} parcial</span>
            <span className="text-red-600 font-medium">{noCount} incumple</span>
            <span className="sm:hidden text-red-600 font-bold">Multa: S/ {totalMulta.toLocaleString()}</span>
          </div>
        </div>

        {/* Checklist */}
        <LiveChecklist
          items={checklistItems}
          onStatusChange={handleStatusChange}
          onEvidenceUpload={handleEvidenceUpload}
          uploading={uploading}
          currentStep={currentStep}
        />
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SUMMARY PHASE
  // ═══════════════════════════════════════════════════════════════════════

  if (phase === 'summary' && resultado) {
    const score = resultado.scoreSimulacro
    const multa = resultado.multaTotal
    const sub90 = resultado.multaConSubsanacion
    const sub70 = resultado.multaConSubsanacionDurante

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Resultado de la Inspeccion</h1>
            <p className="text-sm text-gray-400">{session?.tipo} — Finalizada</p>
          </div>
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Download className="h-4 w-4" /> Descargar PDF
          </button>
        </div>

        {/* Score hero */}
        <div className={cn(
          'rounded-xl border p-8 text-center',
          score >= 80 ? 'bg-emerald-50 border-emerald-200 bg-emerald-900/20 border-emerald-800' :
          score >= 60 ? 'bg-amber-50 border-amber-200 bg-amber-900/20 border-amber-800' :
          'bg-red-50 border-red-200 bg-red-900/20 border-red-800',
        )}>
          <p className={cn(
            'text-5xl font-bold tabular-nums',
            score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600',
          )}>
            {score}/100
          </p>
          <p className={cn(
            'text-lg font-semibold mt-2',
            score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-400' : 'text-red-400',
          )}>
            {score >= 80 ? 'Nivel aceptable de compliance' : score >= 60 ? 'Nivel en riesgo — mejoras necesarias' : 'Nivel critico — accion inmediata'}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Cumple', value: resultado.cumple, color: 'text-emerald-600 bg-emerald-900/20' },
            { label: 'Parcial', value: resultado.parcial, color: 'text-amber-600 bg-amber-900/20' },
            { label: 'Incumple', value: resultado.noCumple, color: 'text-red-600 bg-red-900/20' },
            { label: 'Multa Total', value: `S/ ${multa.toLocaleString()}`, color: 'text-red-700 bg-red-900/30' },
          ].map(({ label, value, color }) => (
            <div key={label} className={cn('rounded-xl p-4 text-center', color)}>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Subsanation discounts */}
        <div className="rounded-xl border border-white/[0.08] bg-white shadow-sm">
          <div className="border-b border-white/[0.08] px-6 py-4">
            <h2 className="text-base font-semibold text-white">Descuento por Subsanacion</h2>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-700 text-center">
            <div className="p-4">
              <p className="text-lg font-bold text-red-600">S/ {multa.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">Sin subsanar (0%)</p>
            </div>
            <div className="p-4">
              <p className="text-lg font-bold text-amber-600">S/ {sub70.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">Durante inspeccion (-70%)</p>
            </div>
            <div className="p-4 bg-emerald-900/10">
              <p className="text-lg font-bold text-emerald-600">S/ {sub90.toLocaleString()}</p>
              <p className="text-xs text-emerald-600 mt-1 font-medium">Antes de inspeccion (-90%)</p>
            </div>
          </div>
        </div>

        {/* Infracciones breakdown */}
        <div className="rounded-xl border border-white/[0.08] bg-white shadow-sm p-6">
          <h3 className="text-sm font-semibold text-white mb-3">Infracciones por Gravedad</h3>
          <div className="flex items-center gap-6">
            <span className="text-xs"><span className="inline-block w-3 h-3 rounded bg-amber-400 mr-1" /> Leves: {resultado.infraccionesLeves}</span>
            <span className="text-xs"><span className="inline-block w-3 h-3 rounded bg-red-400 mr-1" /> Graves: {resultado.infraccionesGraves}</span>
            <span className="text-xs"><span className="inline-block w-3 h-3 rounded bg-red-800 mr-1" /> Muy Graves: {resultado.infraccionesMuyGraves}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/diagnostico')}
            className="flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] px-4 py-2 text-sm font-medium text-slate-300 hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)]"
          >
            <FileText className="h-4 w-4" /> Diagnostico Completo
          </button>
          <button
            type="button"
            onClick={() => { setPhase('setup'); setSession(null); setResultado(null) }}
            className="flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] px-4 py-2 text-sm font-medium text-slate-300 hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)]"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return null
}
