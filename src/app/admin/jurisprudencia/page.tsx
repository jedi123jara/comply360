'use client'

/**
 * /admin/jurisprudencia — Ingestor de Jurisprudencia (Generador / Chunk 9)
 *
 * Cola de revisión donde el SUPER_ADMIN ingresa cada nueva casación,
 * sentencia TC o resolución SUNAFIL/MTPE. Tras aprobación + apply, las
 * afectaciones declarativas mutan el catálogo de reglas y cláusulas
 * (chunks 1 y 4) sin requerir redeploy.
 *
 * Backend:
 *   GET   /api/admin/jurisprudence-updates?status=...
 *   POST  /api/admin/jurisprudence-updates                 (crear)
 *   PATCH /api/admin/jurisprudence-updates/:id             (editar)
 *   POST  /api/admin/jurisprudence-updates/:id/approve     (PENDING → APPROVED)
 *   POST  /api/admin/jurisprudence-updates/:id/reject      (REJECTED)
 *   POST  /api/admin/jurisprudence-updates/:id/apply       (APPLIED + muta catálogo)
 *
 * Gating: SUPER_ADMIN obligatorio (withRole en cada endpoint).
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Scale,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  ExternalLink,
  Clock,
  User,
  PlayCircle,
  AlertTriangle,
} from 'lucide-react'

type Status = 'PENDING' | 'APPROVED' | 'APPLIED' | 'REJECTED'
type Source = 'CORTE_SUPREMA' | 'TRIBUNAL_CONSTITUCIONAL' | 'SUNAFIL' | 'MTPE' | 'OTRO'
type Action = 'ADD' | 'MODIFY' | 'DEPRECATE'

interface RuleAffectation {
  ruleCode: string
  action: Action
  severity?: 'BLOCKER' | 'WARNING' | 'INFO'
  title?: string
  description?: string
  legalBasis?: string
  ruleSpec?: unknown
}

interface ClauseAffectation {
  code: string
  action: Action
  category?: string
  type?: string
  title?: string
  bodyTemplate?: string
  legalBasis?: string
}

interface JurisprudenceUpdateRow {
  id: string
  source: Source
  reference: string
  title: string
  publicationDate: string
  topic: string
  summary: string
  fullTextUrl: string | null
  affectedRules: RuleAffectation[]
  affectedClauses: ClauseAffectation[]
  reviewStatus: Status
  reviewedBy: string | null
  reviewedAt: string | null
  appliedBy: string | null
  appliedAt: string | null
  applyResult: unknown
  notes: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_CFG: Record<Status, { label: string; bg: string; text: string }> = {
  PENDING: { label: 'Pendiente', bg: 'bg-amber-100', text: 'text-amber-800' },
  APPROVED: { label: 'Aprobada', bg: 'bg-blue-100', text: 'text-blue-800' },
  APPLIED: { label: 'Aplicada', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  REJECTED: { label: 'Rechazada', bg: 'bg-red-100', text: 'text-red-800' },
}

const SOURCE_LABEL: Record<Source, string> = {
  CORTE_SUPREMA: 'Corte Suprema',
  TRIBUNAL_CONSTITUCIONAL: 'Tribunal Constitucional',
  SUNAFIL: 'SUNAFIL',
  MTPE: 'MTPE',
  OTRO: 'Otro',
}

export default function JurisprudenciaPage() {
  const [rows, setRows] = useState<JurisprudenceUpdateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Status | 'ALL'>('ALL')
  const [showForm, setShowForm] = useState(false)
  const [actioning, setActioning] = useState<string | null>(null)
  const [openDetail, setOpenDetail] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const url =
        filter === 'ALL'
          ? '/api/admin/jurisprudence-updates'
          : `/api/admin/jurisprudence-updates?status=${filter}`
      const res = await fetch(url)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRows(data.data ?? [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      void load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

  async function approve(id: string) {
    setActioning(id)
    const res = await fetch(`/api/admin/jurisprudence-updates/${id}/approve`, { method: 'POST' })
    setActioning(null)
    if (res.ok) await load()
  }

  async function reject(id: string) {
    const reason = window.prompt('Razón del rechazo (mínimo 10 caracteres):')
    if (!reason || reason.length < 10) return
    setActioning(id)
    const res = await fetch(`/api/admin/jurisprudence-updates/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    setActioning(null)
    if (res.ok) await load()
  }

  async function apply(id: string) {
    if (!window.confirm('¿Aplicar las afectaciones al catálogo? Esta acción muta reglas y cláusulas activas.')) return
    setActioning(id)
    const res = await fetch(`/api/admin/jurisprudence-updates/${id}/apply`, { method: 'POST' })
    setActioning(null)
    if (res.ok) {
      const data = await res.json()
      const r = data.data.applyResult
      window.alert(`Apply ejecutado: ${r.totalChanged} cambios, ${r.totalSkipped} skipped, ${r.totalErrors} errores.`)
      await load()
    } else {
      const err = await res.json().catch(() => ({}))
      window.alert(`Error: ${err.error ?? 'Apply falló'}`)
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <Scale className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Ingestor de Jurisprudencia</h1>
            <p className="text-sm text-slate-500">
              Cada casación / sentencia / resolución SUNAFIL muta el catálogo de reglas y cláusulas sin redeploy.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          Nueva entrada
        </button>
      </header>

      {/* Filtros */}
      <div className="flex gap-2 text-sm">
        {(['ALL', 'PENDING', 'APPROVED', 'APPLIED', 'REJECTED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full font-medium ${
              filter === s ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s === 'ALL' ? 'Todas' : STATUS_CFG[s].label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
          {filter === 'ALL'
            ? 'No hay entradas registradas todavía. Crea la primera con "Nueva entrada".'
            : `Sin entradas en estado "${STATUS_CFG[filter as Status].label}".`}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const cfg = STATUS_CFG[r.reviewStatus]
            const isOpen = openDetail === r.id
            return (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpenDetail(isOpen ? null : r.id)}
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">{r.reference}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-600">{SOURCE_LABEL[r.source]}</span>
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900">{r.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{r.summary}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Publicada {new Date(r.publicationDate).toLocaleDateString('es-PE')}
                      </span>
                      <span>·</span>
                      <span>
                        {r.affectedRules.length} regla{r.affectedRules.length === 1 ? '' : 's'} ·{' '}
                        {r.affectedClauses.length} cláusula{r.affectedClauses.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3 text-sm">
                    <details className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                      <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                        Afectaciones declaradas
                      </summary>
                      <div className="mt-2 space-y-1 text-xs">
                        {r.affectedRules.map((ra, i) => (
                          <div key={`r${i}`} className="font-mono">
                            <span className="text-slate-500">[regla]</span> {ra.action} {ra.ruleCode}
                            {ra.severity && <span className="text-slate-500"> ({ra.severity})</span>}
                          </div>
                        ))}
                        {r.affectedClauses.map((ca, i) => (
                          <div key={`c${i}`} className="font-mono">
                            <span className="text-slate-500">[cláusula]</span> {ca.action} {ca.code}
                          </div>
                        ))}
                      </div>
                    </details>

                    {r.applyResult ? (
                      <details className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
                        <summary className="cursor-pointer text-xs font-semibold text-emerald-800">
                          Resultado del apply ✓
                        </summary>
                        <pre className="mt-2 text-[10px] overflow-x-auto text-emerald-900">
                          {JSON.stringify(r.applyResult, null, 2)}
                        </pre>
                      </details>
                    ) : null}

                    {r.fullTextUrl && (
                      <a
                        href={r.fullTextUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> Texto completo
                      </a>
                    )}

                    {r.reviewedAt && (
                      <p className="text-xs text-slate-500">
                        <User className="w-3 h-3 inline mr-1" />
                        {r.reviewStatus === 'REJECTED' ? 'Rechazada' : 'Revisada'} por {r.reviewedBy} ·{' '}
                        {new Date(r.reviewedAt).toLocaleString('es-PE')}
                      </p>
                    )}
                    {r.appliedAt && (
                      <p className="text-xs text-emerald-700">
                        <CheckCircle2 className="w-3 h-3 inline mr-1" />
                        Aplicada por {r.appliedBy} · {new Date(r.appliedAt).toLocaleString('es-PE')}
                      </p>
                    )}
                    {r.notes && (
                      <p className="text-xs text-slate-600 italic border-l-2 border-slate-300 pl-2">
                        {r.notes}
                      </p>
                    )}

                    {/* Acciones según estado */}
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      {r.reviewStatus === 'PENDING' && (
                        <>
                          <button
                            onClick={() => approve(r.id)}
                            disabled={actioning === r.id}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-semibold disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Aprobar
                          </button>
                          <button
                            onClick={() => reject(r.id)}
                            disabled={actioning === r.id}
                            className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg font-semibold disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" /> Rechazar
                          </button>
                        </>
                      )}
                      {(r.reviewStatus === 'APPROVED' || r.reviewStatus === 'PENDING') && (
                        <button
                          onClick={() => apply(r.id)}
                          disabled={actioning === r.id}
                          className="px-3 py-1.5 bg-emerald-700 text-white text-xs rounded-lg font-semibold disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {actioning === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlayCircle className="w-3 h-3" />}
                          Aplicar al catálogo
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && <CreateForm onClose={() => setShowForm(false)} onCreated={load} />}
    </div>
  )
}

// =============================================
// FORMULARIO DE CREACIÓN
// =============================================

function CreateForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    source: 'CORTE_SUPREMA' as Source,
    reference: '',
    title: '',
    publicationDate: new Date().toISOString().slice(0, 10),
    topic: '',
    summary: '',
    fullTextUrl: '',
    affectedRulesJson: '[]',
    affectedClausesJson: '[]',
    notes: '',
  })

  async function submit() {
    setSubmitting(true)
    setError(null)
    let affectedRules: RuleAffectation[] = []
    let affectedClauses: ClauseAffectation[] = []
    try {
      affectedRules = JSON.parse(form.affectedRulesJson || '[]')
      affectedClauses = JSON.parse(form.affectedClausesJson || '[]')
    } catch {
      setError('JSON inválido en afectaciones.')
      setSubmitting(false)
      return
    }
    const res = await fetch('/api/admin/jurisprudence-updates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: form.source,
        reference: form.reference,
        title: form.title,
        publicationDate: form.publicationDate,
        topic: form.topic,
        summary: form.summary,
        fullTextUrl: form.fullTextUrl || null,
        affectedRules,
        affectedClauses,
        notes: form.notes || null,
      }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError(err.error ?? 'Error al crear')
      return
    }
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-slate-900">Nueva entrada de jurisprudencia</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Fuente</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value as Source })}
                className="w-full border border-slate-300 rounded-lg p-2"
              >
                <option value="CORTE_SUPREMA">Corte Suprema</option>
                <option value="TRIBUNAL_CONSTITUCIONAL">Tribunal Constitucional</option>
                <option value="SUNAFIL">SUNAFIL</option>
                <option value="MTPE">MTPE</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Referencia</label>
              <input
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="Cas. Lab. 8912-2023-Lima"
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Título</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Fecha de publicación</label>
              <input
                type="date"
                value={form.publicationDate}
                onChange={(e) => setForm({ ...form, publicationDate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Tema (slug)</label>
              <input
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="DESNATURALIZACION_MODAL"
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Resumen</label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              rows={3}
              className="w-full border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">URL al texto completo (opcional)</label>
            <input
              value={form.fullTextUrl}
              onChange={(e) => setForm({ ...form, fullTextUrl: e.target.value })}
              placeholder="https://busquedas.elperuano.pe/…"
              className="w-full border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">
              Afectaciones de reglas (JSON array de RuleAffectation)
            </label>
            <textarea
              value={form.affectedRulesJson}
              onChange={(e) => setForm({ ...form, affectedRulesJson: e.target.value })}
              rows={5}
              className="w-full border border-slate-300 rounded-lg p-2 font-mono text-xs"
              placeholder={`[\n  {\n    "ruleCode": "MODAL-003",\n    "action": "ADD",\n    "severity": "BLOCKER",\n    "title": "...",\n    "description": "...",\n    "legalBasis": "Cas. Lab. ...",\n    "ruleSpec": { "kind": "FIELD_REQUIRED", "field": "contract.causeObjective" }\n  }\n]`}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">
              Afectaciones de cláusulas (JSON array de ClauseAffectation)
            </label>
            <textarea
              value={form.affectedClausesJson}
              onChange={(e) => setForm({ ...form, affectedClausesJson: e.target.value })}
              rows={5}
              className="w-full border border-slate-300 rounded-lg p-2 font-mono text-xs"
              placeholder={`[\n  {\n    "code": "CONF-001",\n    "action": "MODIFY",\n    "bodyTemplate": "Texto nuevo..."\n  }\n]`}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Notas internas (opcional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full border border-slate-300 rounded-lg p-2"
            />
          </div>

          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 inline-flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-slate-200 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Crear entrada
          </button>
        </div>
      </div>
    </div>
  )
}
