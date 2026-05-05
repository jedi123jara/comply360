'use client'

import { useEffect, useState, type FormEvent } from 'react'
import {
  Webhook,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { confirm } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'

/**
 * /dashboard/configuracion/webhooks
 *
 * Página de gestión de suscripciones webhook:
 *   - Lista las subs activas + inactivas con metadata (URL, eventos, estado)
 *   - Permite crear nuevas subs eligiendo eventos a suscribirse
 *   - Muestra el secret SOLO una vez al crear (con botón copiar)
 *   - Permite eliminar subs
 *
 * El header HMAC X-Comply360-Signature se documenta en el modal de creación
 * para que el cliente sepa cómo verificar las llamadas entrantes.
 */

interface Subscription {
  id: string
  url: string
  events: string[]
  active: boolean
  createdAt: string
  secretPreview: string
}

const EVENT_GROUPS: Array<{ label: string; events: Array<{ value: string; desc: string }> }> = [
  {
    label: 'Trabajadores y contratos',
    events: [
      { value: 'worker.created', desc: 'Trabajador registrado' },
      { value: 'worker.updated', desc: 'Trabajador actualizado' },
      { value: 'worker.terminated', desc: 'Cese de trabajador' },
      { value: 'contract.created', desc: 'Contrato creado' },
      { value: 'contract.signed', desc: 'Contrato firmado' },
      { value: 'contract.expired', desc: 'Contrato vencido' },
    ],
  },
  {
    label: 'SST (Seguridad y Salud)',
    events: [
      { value: 'sst.sede.created', desc: 'Sede registrada' },
      { value: 'sst.iperc.approved', desc: 'IPERC aprobado' },
      { value: 'sst.iperc.fila.added', desc: 'Fila IPERC agregada' },
      { value: 'sst.accidente.created', desc: 'Accidente registrado' },
      { value: 'sst.accidente.sat.notified', desc: 'SAT notificado' },
      { value: 'sst.emo.created', desc: 'EMO registrado' },
      { value: 'sst.emo.expired', desc: 'EMO vencido' },
      { value: 'sst.visita.scheduled', desc: 'Visita programada' },
      { value: 'sst.visita.completed', desc: 'Visita cerrada' },
      { value: 'sst.alert.high', desc: 'Alerta SST severidad ALTA' },
      { value: 'sst.alert.critical', desc: 'Alerta SST severidad CRÍTICA' },
      { value: 'sst.comite.eleccion.cerrada', desc: 'Elección de Comité SST cerrada' },
    ],
  },
  {
    label: 'Privacidad (Ley 29733)',
    events: [
      { value: 'arco.solicitud.received', desc: 'Solicitud ARCO recibida' },
      { value: 'arco.solicitud.responded', desc: 'Solicitud ARCO respondida' },
    ],
  },
  {
    label: 'Compliance e IA',
    events: [
      { value: 'compliance.diagnostic.completed', desc: 'Diagnóstico SUNAFIL completado' },
      { value: 'sunafil.notification.received', desc: 'Notificación SUNAFIL recibida' },
      { value: 'agent.run.completed', desc: 'Ejecución de agente IA terminada' },
      { value: 'risk.critical.detected', desc: 'Riesgo crítico detectado' },
    ],
  },
]

export default function WebhooksConfigPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/webhooks/subscriptions', { cache: 'no-store' })
      if (!res.ok) throw new Error('No se pudieron cargar los webhooks')
      const json = await res.json()
      setSubs(json.subscriptions ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDelete(id: string, url: string) {
    const confirmed = await confirm({
      title: 'Eliminar webhook',
      description: `¿Seguro de eliminar la suscripción a ${url}? No podrás revertir.`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
    })
    if (!confirmed) return

    try {
      const res = await fetch(`/api/webhooks/subscriptions?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('No se pudo eliminar')
      toast.success('Webhook eliminado')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks"
        subtitle="Recibe eventos de COMPLY360 en tu sistema en tiempo real. Cada llamada va firmada con HMAC-SHA256 para que verifiques autenticidad."
        actions={
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo webhook
          </Button>
        }
      />

      {error && (
        <Card>
          <CardContent className="p-4 flex items-start gap-2 text-sm text-red-700 bg-red-50">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Documentación rápida */}
      <Card>
        <CardContent className="p-5 text-sm text-slate-700 space-y-2">
          <h3 className="text-base font-semibold text-slate-900">Cómo verificar la firma</h3>
          <p>
            Cada llamada viene con headers <code className="bg-slate-100 rounded px-1 text-xs">X-Comply360-Signature: sha256=...</code> y <code className="bg-slate-100 rounded px-1 text-xs">X-Comply360-Timestamp</code>.
          </p>
          <pre className="bg-slate-50 rounded-lg p-3 text-xs overflow-x-auto font-mono">
{`// Node.js — verificación
const crypto = require('crypto')
const expected = crypto
  .createHmac('sha256', YOUR_SECRET)
  .update(rawBody)
  .digest('hex')
if (req.headers['x-comply360-signature'] !== \`sha256=\${expected}\`) {
  return res.status(401).end()
}`}
          </pre>
          <p className="text-xs text-slate-500">
            Usa el body crudo (raw bytes). Si parseaste el JSON antes, la firma no validará.
          </p>
        </CardContent>
      </Card>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : subs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Webhook className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600">
              Aún no tienes webhooks configurados. Crea el primero para recibir eventos en tu sistema.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {subs.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {s.active ? (
                        <Badge variant="success">Activa</Badge>
                      ) : (
                        <Badge variant="neutral">Inactiva</Badge>
                      )}
                      <span className="text-xs text-slate-500">
                        Creada {new Date(s.createdAt).toLocaleDateString('es-PE')}
                      </span>
                    </div>
                    <code className="block text-sm text-slate-900 font-mono break-all mb-2">
                      {s.url}
                    </code>
                    <div className="flex flex-wrap gap-1.5">
                      {s.events.map((e) => (
                        <span
                          key={e}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-slate-500 font-mono">
                      Secret: {s.secretPreview}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id, s.url)}
                    className="shrink-0 p-2 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showNewModal && (
        <NewWebhookModal
          onClose={() => setShowNewModal(false)}
          onCreated={(secret) => {
            setNewSecret(secret)
            setShowNewModal(false)
            load()
          }}
        />
      )}

      {newSecret && (
        <SecretShownOnceModal
          secret={newSecret}
          onClose={() => setNewSecret(null)}
        />
      )}
    </div>
  )
}

// ─── Modal: nuevo webhook ─────────────────────────────────────────────────

function NewWebhookModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (secret: string) => void
}) {
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleEvent(ev: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(ev)) next.delete(ev)
      else next.add(ev)
      return next
    })
  }

  function selectGroup(events: string[]) {
    setSelected((prev) => {
      const next = new Set(prev)
      const allSelected = events.every((e) => next.has(e))
      if (allSelected) {
        for (const e of events) next.delete(e)
      } else {
        for (const e of events) next.add(e)
      }
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!/^https?:\/\//.test(url)) {
      setError('URL debe comenzar con http:// o https://')
      return
    }
    if (selected.size === 0) {
      setError('Selecciona al menos un evento')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/webhooks/subscriptions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          url,
          events: Array.from(selected),
          description: description || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al crear webhook')
      onCreated(json.secret)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Nuevo webhook" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">
            URL endpoint <span className="text-red-500">*</span>
          </span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="https://tuempresa.com/webhooks/comply360"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
          />
          <p className="mt-1 text-xs text-slate-500">
            Tu sistema recibirá POST con JSON. Devuelve 2xx para confirmar.
          </p>
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">
            Descripción (opcional)
          </span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={120}
            placeholder="Integración con ERP / CRM / Slack ..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <div>
          <span className="block text-sm font-medium text-slate-700 mb-2">
            Eventos a suscribirse <span className="text-red-500">*</span>{' '}
            <span className="text-xs text-slate-500">({selected.size} seleccionado{selected.size !== 1 ? 's' : ''})</span>
          </span>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1 border border-slate-200 rounded-lg p-3 bg-slate-50">
            {EVENT_GROUPS.map((g) => {
              const allInGroup = g.events.every((e) => selected.has(e.value))
              return (
                <div key={g.label}>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-semibold uppercase text-slate-700 tracking-wide">
                      {g.label}
                    </h4>
                    <button
                      type="button"
                      onClick={() => selectGroup(g.events.map((e) => e.value))}
                      className="text-[11px] text-emerald-700 hover:underline"
                    >
                      {allInGroup ? 'Deseleccionar grupo' : 'Seleccionar grupo'}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {g.events.map((e) => (
                      <label
                        key={e.value}
                        className="flex items-start gap-2 cursor-pointer rounded p-1.5 hover:bg-white"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(e.value)}
                          onChange={() => toggleEvent(e.value)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <code className="text-xs font-mono text-slate-900">{e.value}</code>
                          <span className="text-xs text-slate-600 ml-2">{e.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 ring-1 ring-red-200 p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-1" />
            )}
            Crear webhook
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal: secret se muestra UNA vez ─────────────────────────────────────

function SecretShownOnceModal({
  secret,
  onClose,
}: {
  secret: string
  onClose: () => void
}) {
  const [reveal, setReveal] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(secret).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <Modal isOpen onClose={onClose} title="¡Webhook creado!">
      <div className="space-y-4">
        <div className="rounded-lg bg-amber-50 ring-1 ring-amber-200 p-3 text-sm text-amber-900">
          <strong>Guarda este secret ahora.</strong> Solo se muestra esta única vez. Lo necesitarás para verificar la firma HMAC en cada webhook recibido.
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Secret
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-slate-900 text-emerald-300 font-mono text-sm px-3 py-2.5 break-all">
              {reveal ? secret : '•'.repeat(40)}
            </code>
            <button
              type="button"
              onClick={() => setReveal(!reveal)}
              className="p-2 rounded hover:bg-slate-100 text-slate-600"
              aria-label={reveal ? 'Ocultar' : 'Mostrar'}
            >
              {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={copy}
              className="p-2 rounded hover:bg-slate-100 text-slate-600"
              aria-label="Copiar"
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button onClick={onClose}>He guardado el secret</Button>
        </div>
      </div>
    </Modal>
  )
}
