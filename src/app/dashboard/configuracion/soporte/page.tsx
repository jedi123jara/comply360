'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, BookOpen, CheckCircle2, Info, LifeBuoy, Mail, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BRAND } from '@/lib/brand'

/**
 * Soporte: formulario de tickets (POST /api/support/tickets).
 *
 * Solo mostramos lo que existe de verdad:
 *  - El ticket se guarda y te devolvemos su código.
 *  - El equipo responde por correo a la dirección de tu cuenta.
 *  - No hay (todavía) un endpoint para listar tus tickets ni para adjuntar
 *    archivos, así que no mostramos lista ni zona de adjuntos.
 *  - No prometemos tiempos de respuesta que no podemos comprobar.
 *
 * Los `value` de tema y urgencia son los que acepta la API (si llega otro
 * valor, la API lo guarda como "otro" / "media").
 */

const TOPICS = [
  { value: 'bug', label: 'Algo no funciona o muestra un error' },
  { value: 'tecnico', label: 'Duda sobre cómo usar la plataforma' },
  { value: 'onboarding', label: 'Primeros pasos y configuración inicial' },
  { value: 'billing', label: 'Pagos, plan y facturación' },
  { value: 'legal', label: 'Duda sobre un cálculo o una obligación laboral' },
  { value: 'feature_request', label: 'Sugerencia o función nueva' },
  { value: 'otro', label: 'Otro tema' },
] as const

const URGENCIES = [
  { value: 'baja', label: 'Baja: es una consulta, no te detiene' },
  { value: 'media', label: 'Media: te complica, pero puedes seguir trabajando' },
  { value: 'alta', label: 'Alta: no puedes terminar una tarea importante' },
  { value: 'critica', label: 'Crítica: no puedes usar la plataforma' },
] as const

const SUBJECT_MAX = 200
const DESCRIPTION_MAX = 5000

const MAILTO_SUPPORT = `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent('Consulta de soporte')}`

const INPUT_CLASS =
  'w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3.5 py-2.5 text-sm text-[color:var(--text-primary)] outline-none transition placeholder:text-[color:var(--text-tertiary)] focus:border-blue-400 focus:ring-4 focus:ring-blue-100'

function friendlyTicketError(status: number, serverMessage: unknown): string {
  if (status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión y envía el ticket otra vez.'
  if (status === 400 && typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage
  return 'No pudimos enviar tu ticket. Intenta de nuevo en unos segundos.'
}

export default function SoportePage() {
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [urgency, setUrgency] = useState('media')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Código del ticket recién creado (null mientras no se envía). */
  const [sentCode, setSentCode] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const successRef = useRef<HTMLHeadingElement>(null)
  const ids = {
    subject: useId(),
    topic: useId(),
    urgency: useId(),
    description: useId(),
    descriptionHint: useId(),
  }

  // Al enviar, llevamos el foco al mensaje de éxito (lectores de pantalla y teclado).
  useEffect(() => {
    if (sent) successRef.current?.focus()
  }, [sent])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!subject.trim() || !description.trim()) {
      setError('Escribe un asunto y cuéntanos qué pasó.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          category: topic || 'otro',
          priority: urgency,
          description: description.trim(),
        }),
      })
      const data: { ticketCode?: string; error?: string } = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(friendlyTicketError(res.status, data.error))
        return
      }
      setSentCode(typeof data.ticketCode === 'string' ? data.ticketCode : null)
      setSent(true)
      setSubject('')
      setTopic('')
      setUrgency('media')
      setDescription('')
    } catch {
      setError('No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const startAnother = () => {
    setSent(false)
    setSentCode(null)
    setError(null)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Cabecera */}
      <div>
        <Link
          href="/dashboard/ayuda"
          className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-[color:var(--text-secondary)] hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Centro de ayuda
        </Link>
        <div className="mt-3 flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <LifeBuoy className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[color:var(--text-primary)]">Soporte</h1>
            <p className="mt-1 text-sm leading-6 text-[color:var(--text-secondary)]">
              Escríbenos si algo no funciona o si tienes una duda sobre la plataforma.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* Formulario o confirmación */}
        <section
          aria-labelledby="soporte-form-titulo"
          className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5 shadow-[var(--elevation-1)] sm:p-6"
        >
          {sent ? (
            <div role="status">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600" aria-hidden="true" />
                <div className="min-w-0">
                  <h2
                    id="soporte-form-titulo"
                    ref={successRef}
                    tabIndex={-1}
                    className="text-lg font-bold text-[color:var(--text-primary)] focus:outline-none"
                  >
                    Recibimos tu ticket
                  </h2>
                  {sentCode ? (
                    <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                      Su código es{' '}
                      <strong className="font-mono font-semibold text-[color:var(--text-primary)]">{sentCode}</strong>.
                      Anótalo por si necesitas hacer seguimiento.
                    </p>
                  ) : null}
                </div>
              </div>

              <h3 className="mt-5 text-sm font-semibold text-[color:var(--text-primary)]">Qué pasa ahora</h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-[color:var(--text-secondary)]">
                <li>El equipo de soporte revisa tu ticket.</li>
                <li>Te respondemos por correo, a la dirección con la que inicias sesión.</li>
                <li>
                  Si quieres agregar algo (por ejemplo, una captura de pantalla), escríbenos a{' '}
                  <a href={MAILTO_SUPPORT} className="font-semibold text-blue-700 hover:underline">
                    {BRAND.supportEmail}
                  </a>
                  {sentCode ? ' y pon el código del ticket en el asunto' : ''}.
                </li>
              </ol>

              <Button type="button" variant="secondary" className="mt-6" onClick={startAnother}>
                Enviar otro ticket
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <h2 id="soporte-form-titulo" className="text-lg font-bold text-[color:var(--text-primary)]">
                  Crear un ticket
                </h2>
                <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                  Mientras más detalles nos des, más rápido entendemos el problema.
                </p>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p>
                    {error} Si sigue fallando, escríbenos a{' '}
                    <a href={MAILTO_SUPPORT} className="font-semibold underline">
                      {BRAND.supportEmail}
                    </a>
                    .
                  </p>
                </div>
              ) : null}

              <div>
                <label htmlFor={ids.subject} className="mb-1.5 block text-sm font-semibold text-[color:var(--text-primary)]">
                  Asunto
                </label>
                <input
                  id={ids.subject}
                  type="text"
                  name="subject"
                  required
                  maxLength={SUBJECT_MAX}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ejemplo: No puedo subir el contrato de un trabajador"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={ids.topic} className="mb-1.5 block text-sm font-semibold text-[color:var(--text-primary)]">
                    Tema
                  </label>
                  <select
                    id={ids.topic}
                    name="category"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value="">Elige un tema</option>
                    {TOPICS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={ids.urgency} className="mb-1.5 block text-sm font-semibold text-[color:var(--text-primary)]">
                    Urgencia
                  </label>
                  <select
                    id={ids.urgency}
                    name="priority"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className={INPUT_CLASS}
                  >
                    {URGENCIES.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor={ids.description}
                  className="mb-1.5 block text-sm font-semibold text-[color:var(--text-primary)]"
                >
                  ¿Qué pasó?
                </label>
                <textarea
                  id={ids.description}
                  name="description"
                  required
                  rows={6}
                  maxLength={DESCRIPTION_MAX}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  aria-describedby={ids.descriptionHint}
                  placeholder="Cuéntanos qué querías hacer, en qué pantalla estabas y qué pasó. Si apareció un mensaje de error, cópialo aquí."
                  className={`${INPUT_CLASS} resize-y`}
                />
                <p id={ids.descriptionHint} className="mt-1.5 text-xs text-[color:var(--text-tertiary)]">
                  No escribas contraseñas ni datos bancarios.
                </p>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-inset)] p-3 text-xs leading-5 text-[color:var(--text-secondary)]">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]" aria-hidden="true" />
                <p>
                  Por ahora no puedes adjuntar archivos aquí. Si necesitas enviarnos una captura de pantalla, mándala a{' '}
                  <a href={MAILTO_SUPPORT} className="font-semibold text-blue-700 hover:underline">
                    {BRAND.supportEmail}
                  </a>{' '}
                  después de crear el ticket, con su código en el asunto.
                </p>
              </div>

              <Button type="submit" loading={submitting} icon={<Send className="h-4 w-4" aria-hidden="true" />}>
                {submitting ? 'Enviando…' : 'Enviar ticket'}
              </Button>
            </form>
          )}
        </section>

        {/* Qué pasa después y otros canales */}
        <aside className="space-y-4">
          <section
            aria-labelledby="soporte-despues-titulo"
            className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5 shadow-[var(--elevation-1)]"
          >
            <h2 id="soporte-despues-titulo" className="text-sm font-semibold text-[color:var(--text-primary)]">
              ¿Qué pasa después de enviarlo?
            </h2>
            <ol className="mt-3 space-y-3 text-sm leading-6 text-[color:var(--text-secondary)]">
              {[
                'Guardamos tu ticket y te mostramos su código.',
                'El equipo de soporte lo revisa.',
                'Te respondemos por correo, a la dirección con la que inicias sesión.',
              ].map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs leading-5 text-[color:var(--text-tertiary)]">
              Tus tickets no se listan en esta pantalla: la respuesta te llega por correo. Indica bien la urgencia,
              nos ayuda a ordenar los pedidos.
            </p>
          </section>

          <section
            aria-labelledby="soporte-contacto-titulo"
            className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5 shadow-[var(--elevation-1)]"
          >
            <h2 id="soporte-contacto-titulo" className="text-sm font-semibold text-[color:var(--text-primary)]">
              Otras formas de ayuda
            </h2>
            <ul className="mt-3 space-y-3 text-sm">
              <li>
                <a
                  href={MAILTO_SUPPORT}
                  className="inline-flex items-center gap-2 font-semibold text-blue-700 hover:underline"
                >
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {BRAND.supportEmail}
                </a>
                <p className="mt-0.5 pl-6 text-xs text-[color:var(--text-tertiary)]">Para escribirnos por correo.</p>
              </li>
              <li>
                <Link
                  href="/dashboard/ayuda"
                  className="inline-flex items-center gap-2 font-semibold text-blue-700 hover:underline"
                >
                  <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Centro de ayuda
                </Link>
                <p className="mt-0.5 pl-6 text-xs text-[color:var(--text-tertiary)]">
                  Guías y el glosario de términos laborales, explicados en simple.
                </p>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
