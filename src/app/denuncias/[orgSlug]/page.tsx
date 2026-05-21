'use client'

import { useCallback, useEffect, useState, use } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  HeartPulse,
  Lock,
  Scale,
  Search,
  ShieldAlert,
  UserRoundCheck,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  COMPLAINT_REGIMES,
  COMPLAINT_TYPES,
  type ComplaintRegimeValue,
  type ComplaintTypeValue,
} from '@/lib/complaints/regime-rules'

const REGIME_TYPES: Record<ComplaintRegimeValue, ComplaintTypeValue[]> = {
  HSL: ['HOSTIGAMIENTO_SEXUAL', 'DISCRIMINACION', 'ACOSO_LABORAL', 'OTRO'],
  SST: [
    'SST_ACCIDENTE_MORTAL',
    'SST_INCIDENTE_PELIGROSO',
    'SST_ACCIDENTE_NO_MORTAL',
    'SST_ENFERMEDAD_OCUPACIONAL',
    'SST_CONDICION_INSEGURA',
  ],
  MPD: ['MPD_CORRUPCION', 'MPD_LAVADO_ACTIVOS', 'MPD_TRIBUTARIO_ADUANERO', 'MPD_TERRORISMO', 'MPD_OTRO'],
}

const REGIME_ICON: Record<ComplaintRegimeValue, typeof ShieldAlert> = {
  HSL: ShieldAlert,
  SST: HeartPulse,
  MPD: Scale,
}

const REGIME_COPY: Record<ComplaintRegimeValue, { title: string; bullets: string[] }> = {
  HSL: {
    title: 'Garantias para casos de hostigamiento o violencia laboral',
    bullets: [
      'Reserva de identidad de denunciante, denunciado y testigos.',
      'Atencion medica o psicologica en 1 dia habil cuando corresponda.',
      'Medidas de proteccion en 3 dias habiles y comunicacion al MTPE.',
      'No represalias y prohibicion de revictimizacion.',
    ],
  },
  SST: {
    title: 'Reporte de seguridad y salud en el trabajo',
    bullets: [
      'Accidentes mortales e incidentes peligrosos requieren actuacion en 24 horas.',
      'El reporte activa preservacion de escena, investigacion y medidas correctivas.',
      'Los trabajadores pueden comunicar riesgos sin represalias.',
      'La empresa debe mantener registros obligatorios de SST.',
    ],
  },
  MPD: {
    title: 'Canal del modelo de prevencion de delitos',
    bullets: [
      'Puedes reportar de buena fe irregularidades del MPD o posibles delitos.',
      'El procedimiento protege contra represalias, discriminacion o sancion.',
      'El Encargado de Prevencion evalua admisibilidad, riesgo y conflictos.',
      'La investigacion preserva confidencialidad y cadena de custodia.',
    ],
  },
}

type TrackingResult = {
  code: string
  regime?: ComplaintRegimeValue
  type: string
  status: string
  statusLabel: string
  receivedAt: string
  updatedAt: string
  resolvedAt: string | null
  timeline: Array<{ action: string; description: string | null; createdAt: string }>
  progress?: Array<{
    stage: string
    label: string
    description: string
    status: 'DONE' | 'ACTIVE' | 'PENDING'
    completedAt: string | null
    documents: Array<{
      id: string
      title: string
      stage: string
      kind: string
      mimeType: string | null
      size: number | null
      hashSha256: string | null
      createdAt: string
      downloadUrl: string
    }>
  }>
  documents?: Array<{
    id: string
    title: string
    stage: string
    kind: string
    mimeType: string | null
    size: number | null
    hashSha256: string | null
    createdAt: string
    downloadUrl: string
  }>
}

function formatFileSize(size: number | null) {
  if (!size) return null
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function splitLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export default function DenunciaPublicaPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = use(params)
  const searchParams = useSearchParams()
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [code, setCode] = useState('')
  const [trackingToken, setTrackingToken] = useState(searchParams.get('token') ?? '')
  const [submittedTrackingToken, setSubmittedTrackingToken] = useState('')
  const [trackingCode, setTrackingCode] = useState(searchParams.get('seguimiento') ?? '')
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [trackingError, setTrackingError] = useState('')
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null)
  const [form, setForm] = useState({
    regime: 'HSL' as ComplaintRegimeValue,
    type: 'HOSTIGAMIENTO_SEXUAL' as ComplaintTypeValue,
    isAnonymous: true,
    reporterName: '',
    reporterEmail: '',
    reporterPhone: '',
    accusedName: '',
    accusedPosition: '',
    occurredAt: '',
    location: '',
    witnessesText: '',
    evidenceText: '',
    medicalAttentionRequested: false,
    protectionMeasuresRequested: '',
    description: '',
  })

  const selectedRegime = COMPLAINT_REGIMES[form.regime]
  const selectedCopy = REGIME_COPY[form.regime]
  const typeOptions = REGIME_TYPES[form.regime]

  const fetchTrackingStatus = useCallback(async (rawCode: string, rawToken: string) => {
    const normalized = rawCode.trim().toUpperCase()
    if (!normalized) {
      setTrackingError('Ingresa tu codigo de seguimiento.')
      return
    }
    const normalizedToken = rawToken.trim()
    if (!normalizedToken) {
      setTrackingError('Ingresa el token privado de seguimiento.')
      return
    }

    setTrackingCode(normalized)
    setTrackingToken(normalizedToken)
    setTrackingLoading(true)
    setTrackingError('')
    setTrackingResult(null)
    try {
      const res = await fetch(`/api/complaints/status?org=${encodeURIComponent(orgSlug)}&code=${encodeURIComponent(normalized)}&token=${encodeURIComponent(normalizedToken)}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No pudimos consultar el estado.')
      setTrackingResult(data as TrackingResult)
    } catch (err) {
      setTrackingError(err instanceof Error ? err.message : 'No pudimos consultar el estado.')
    } finally {
      setTrackingLoading(false)
    }
  }, [orgSlug])

  useEffect(() => {
    const initialCode = searchParams.get('seguimiento')
    const initialToken = searchParams.get('token')
    if (!initialCode || !initialToken) return
    const timer = window.setTimeout(() => {
      void fetchTrackingStatus(initialCode, initialToken)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchTrackingStatus, searchParams])

  async function handleTrack(e?: React.FormEvent) {
    e?.preventDefault()
    await fetchTrackingStatus(trackingCode, trackingToken)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')

    if (!form.type) {
      setSubmitError('Debes seleccionar el tipo de caso.')
      return
    }
    if (!form.description || form.description.trim().length < 20) {
      setSubmitError('La descripcion debe tener al menos 20 caracteres.')
      return
    }
    if (!form.isAnonymous && form.reporterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporterEmail)) {
      setSubmitError('El correo electronico ingresado no es valido.')
      return
    }

    const witnesses = splitLines(form.witnessesText).map((line) => ({ name: line }))
    const evidenceUrls = splitLines(form.evidenceText)

    setSubmitting(true)
    try {
      const res = await fetch(`/api/complaints?org=${encodeURIComponent(orgSlug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regime: form.regime,
          type: form.type,
          channel: 'WEB',
          description: form.description.trim(),
          isAnonymous: form.isAnonymous,
          reporterName: form.reporterName.trim() || undefined,
          reporterEmail: form.reporterEmail.trim() || undefined,
          reporterPhone: form.reporterPhone.trim() || undefined,
          accusedName: form.accusedName.trim() || undefined,
          accusedPosition: form.accusedPosition.trim() || undefined,
          occurredAt: form.occurredAt || undefined,
          location: form.location.trim() || undefined,
          witnesses,
          evidenceUrls,
          medicalAttentionRequested: form.medicalAttentionRequested,
          protectionMeasuresRequested: form.protectionMeasuresRequested.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || 'Error al enviar el caso. Intente nuevamente.')
      } else if (data.code) {
        setCode(data.code)
        setSubmittedTrackingToken(data.trackingToken || '')
        setSubmitted(true)
      } else {
        setSubmitError('Error al enviar el caso. Intente nuevamente.')
      }
    } catch {
      setSubmitError('Error de conexion. Verifique su internet e intente nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md rounded-2xl border border-emerald-400/20 bg-white p-8 text-center shadow-2xl">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
          <h1 className="mt-4 text-xl font-bold text-slate-950">Caso recibido</h1>
          <p className="mt-2 text-sm text-slate-500">Tu reporte ha sido registrado exitosamente.</p>
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Codigo de seguimiento</p>
            <p className="text-xl font-black text-slate-950">{code}</p>
          </div>
          {submittedTrackingToken ? (
            <div className="mt-3 rounded-xl bg-emerald-50 p-4">
              <p className="text-xs text-emerald-700">Token privado</p>
              <p className="break-all text-sm font-black text-emerald-950">{submittedTrackingToken}</p>
            </div>
          ) : null}
          <p className="mt-4 text-xs text-slate-500">
            Guarda el codigo y el token. Ambos son necesarios para consultar el avance sin iniciar sesion.
          </p>
          <a
            href={`/denuncias/${orgSlug}?seguimiento=${encodeURIComponent(code)}&token=${encodeURIComponent(submittedTrackingToken)}`}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
          >
            Consultar estado
          </a>
          <div className="mt-4 flex items-center justify-center gap-1 text-xs text-slate-400">
            <Lock className="h-3 w-3" /> Informacion protegida y confidencial
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-white">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-3xl font-black">Canal de Denuncias y Reclamos Internos</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Reportes confidenciales para hostigamiento sexual, seguridad y salud en el trabajo, y modelo de prevencion de delitos.
            </p>

            <div className="mt-6 space-y-3">
              {(Object.keys(COMPLAINT_REGIMES) as ComplaintRegimeValue[]).map((regime) => {
                const Icon = REGIME_ICON[regime]
                const active = form.regime === regime
                return (
                  <button
                    key={regime}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, regime, type: REGIME_TYPES[regime][0] }))}
                    className={cn(
                      'w-full rounded-2xl border p-4 text-left transition',
                      active ? 'border-emerald-300 bg-emerald-300 text-slate-950' : 'border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.07]',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', active ? 'text-slate-950' : 'text-emerald-300')} />
                      <div>
                        <p className="text-sm font-bold">{COMPLAINT_REGIMES[regime].title}</p>
                        <p className={cn('mt-1 text-xs leading-5', active ? 'text-slate-800' : 'text-slate-300')}>
                          {COMPLAINT_REGIMES[regime].baseLegal}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
              <h2 className="text-sm font-bold text-emerald-200">{selectedCopy.title}</h2>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-emerald-50">
                {selectedCopy.bullets.map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <main className="space-y-4">
            <form onSubmit={handleTrack} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Search className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-black text-slate-950">Consulta el estado de tu reporte</h2>
                  <p className="mt-1 text-xs text-slate-500">Usa el codigo de seguimiento. No necesitas iniciar sesion.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1.2fr_auto]">
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="HSL-2026-001"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={trackingToken}
                  onChange={(e) => setTrackingToken(e.target.value)}
                  placeholder="Token privado"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={trackingLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {trackingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Consultar
                </button>
              </div>
              {trackingError ? <p className="mt-3 text-sm text-red-600">{trackingError}</p> : null}
              {trackingResult ? (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-blue-700">{trackingResult.code}</p>
                      <p className="text-sm font-black text-blue-950">{trackingResult.statusLabel}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-800 ring-1 ring-blue-200">
                      {trackingResult.regime ?? 'Caso'}
                    </span>
                  </div>
                  {trackingResult.progress && trackingResult.progress.length > 0 ? (
                    <div className="mt-4">
                      <p className="text-xs font-black uppercase tracking-wide text-blue-900">Progreso documentado</p>
                      <div className="mt-3 space-y-2">
                        {trackingResult.progress.map((step) => (
                          <div key={step.stage} className="rounded-lg bg-white/85 px-3 py-3">
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black',
                                step.status === 'DONE' ? 'bg-emerald-500 text-white' :
                                step.status === 'ACTIVE' ? 'bg-blue-600 text-white' :
                                'bg-slate-200 text-slate-500',
                              )}>
                                {step.status === 'DONE' ? 'OK' : step.status === 'ACTIVE' ? '...' : ''}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-xs font-black text-slate-950">{step.label}</p>
                                  <span className={cn(
                                    'rounded-full px-2 py-0.5 text-[10px] font-bold',
                                    step.status === 'DONE' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' :
                                    step.status === 'ACTIVE' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' :
                                    'bg-slate-50 text-slate-500 ring-1 ring-slate-100',
                                  )}>
                                    {step.status === 'DONE' ? 'Completada' : step.status === 'ACTIVE' ? 'En curso' : 'Pendiente'}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs leading-5 text-slate-600">{step.description}</p>
                                {step.completedAt ? (
                                  <p className="mt-1 text-[10px] font-semibold text-slate-400">
                                    Actualizado: {new Date(step.completedAt).toLocaleString('es-PE')}
                                  </p>
                                ) : null}
                                {step.documents.length > 0 ? (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {step.documents.map((document) => (
                                      <a
                                        key={document.id}
                                        href={document.downloadUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-800 hover:bg-blue-100"
                                      >
                                        <FileText className="h-3 w-3" />
                                        <span>{document.title}</span>
                                        {document.hashSha256 ? (
                                          <span className="font-mono text-[10px] text-blue-500">
                                            {document.hashSha256.slice(0, 8)}
                                          </span>
                                        ) : null}
                                      </a>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {trackingResult.documents && trackingResult.documents.length > 0 ? (
                    <div className="mt-4 rounded-lg border border-blue-100 bg-white/80 p-3">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-900">Documentos compartidos contigo</p>
                      <div className="mt-2 grid gap-2">
                        {trackingResult.documents.map((document) => (
                          <a
                            key={document.id}
                            href={document.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
                          >
                            <span className="inline-flex min-w-0 items-center gap-2">
                              <FileText className="h-3.5 w-3.5 shrink-0 text-blue-700" />
                              <span className="truncate">{document.title}</span>
                            </span>
                            <span className="shrink-0 text-right text-[10px] uppercase text-slate-400">
                              {document.kind}
                              {formatFileSize(document.size) ? ` | ${formatFileSize(document.size)}` : ''}
                              {document.hashSha256 ? ` | ${document.hashSha256.slice(0, 8)}` : ''}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-3 space-y-2">
                    {trackingResult.timeline.map((item) => (
                      <div key={`${item.action}-${item.createdAt}`} className="rounded-lg bg-white/80 px-3 py-2">
                        <p className="text-xs font-bold text-slate-900">{item.action}</p>
                        {item.description ? <p className="text-xs text-slate-600">{item.description}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </form>

            <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-white p-6 shadow-xl">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{selectedRegime.shortLabel}</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{selectedRegime.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedRegime.description}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-950">Tipo de caso *</label>
                <div className="mt-2 grid gap-2">
                  {typeOptions.map((type) => {
                    const ct = COMPLAINT_TYPES[type]
                    return (
                      <button
                        type="button"
                        key={type}
                        onClick={() => setForm((prev) => ({ ...prev, type }))}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition',
                          form.type === type ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 hover:bg-slate-50',
                        )}
                      >
                        <ClipboardList className={cn('mt-0.5 h-4 w-4 shrink-0', form.type === type ? 'text-emerald-300' : 'text-slate-400')} />
                        <div>
                          <p className="text-sm font-bold">{ct.label}</p>
                          <p className={cn('text-xs', form.type === type ? 'text-slate-300' : 'text-slate-500')}>{ct.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <input
                  type="checkbox"
                  id="is-anonymous"
                  name="isAnonymous"
                  checked={form.isAnonymous}
                  onChange={(e) => setForm((prev) => ({ ...prev, isAnonymous: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-950"
                />
                <span>
                  <span className="block text-sm font-bold text-slate-900">Reporte anonimo</span>
                  <span className="block text-xs text-slate-500">Puedes identificarte solo si deseas facilitar la investigacion.</span>
                </span>
              </label>

              {!form.isAnonymous && (
                <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                  <input type="text" placeholder="Nombre completo" value={form.reporterName} onChange={(e) => setForm((prev) => ({ ...prev, reporterName: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input type="email" placeholder="Correo electronico" value={form.reporterEmail} onChange={(e) => setForm((prev) => ({ ...prev, reporterEmail: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input type="tel" placeholder="Telefono" value={form.reporterPhone} onChange={(e) => setForm((prev) => ({ ...prev, reporterPhone: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-bold text-slate-950">Fecha y hora aproximada</label>
                  <input type="datetime-local" value={form.occurredAt} onChange={(e) => setForm((prev) => ({ ...prev, occurredAt: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-950">Lugar o area</label>
                  <input type="text" value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} placeholder="Sede, area, obra, planta, oficina..." className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input type="text" placeholder={form.regime === 'SST' ? 'Persona afectada (si aplica)' : 'Persona denunciada (si la conoces)'} value={form.accusedName} onChange={(e) => setForm((prev) => ({ ...prev, accusedName: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input type="text" placeholder="Cargo, area o relacion" value={form.accusedPosition} onChange={(e) => setForm((prev) => ({ ...prev, accusedPosition: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>

              {form.regime === 'HSL' ? (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-red-900">
                    <input type="checkbox" checked={form.medicalAttentionRequested} onChange={(e) => setForm((prev) => ({ ...prev, medicalAttentionRequested: e.target.checked }))} className="h-4 w-4 rounded border-red-200" />
                    Solicito atencion medica, fisica, mental o psicologica
                  </label>
                  <textarea
                    value={form.protectionMeasuresRequested}
                    onChange={(e) => setForm((prev) => ({ ...prev, protectionMeasuresRequested: e.target.value }))}
                    rows={2}
                    className="mt-3 w-full rounded-xl border border-red-100 px-3 py-2 text-sm"
                    placeholder="Medidas de proteccion solicitadas (ej. cambio de turno, no acercamiento, cambio de jefe directo)..."
                  />
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-bold text-slate-950">Descripcion de los hechos *</label>
                <p className="text-xs text-slate-500">Indica que ocurrio, cuando, donde, personas involucradas y evidencia disponible.</p>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={6}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-950"
                  placeholder="Describe los hechos con el mayor detalle posible..."
                  minLength={20}
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-bold text-slate-950">Testigos</label>
                  <textarea value={form.witnessesText} onChange={(e) => setForm((prev) => ({ ...prev, witnessesText: e.target.value }))} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Uno por linea" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-950">Evidencias URL</label>
                  <textarea value={form.evidenceText} onChange={(e) => setForm((prev) => ({ ...prev, evidenceText: e.target.value }))} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Links a archivos, fotos, correos o documentos, uno por linea" />
                </div>
              </div>

              {submitError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!form.type || !form.description || submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundCheck className="h-4 w-4" />}
                {submitting ? 'Enviando...' : 'Enviar reporte confidencial'}
              </button>

              <p className="text-center text-[11px] leading-5 text-slate-500">
                La informacion sera tratada de forma confidencial conforme a Ley 29733 y al regimen legal aplicable.
              </p>
            </form>
          </main>
        </div>
      </div>
    </div>
  )
}
