'use client'

import { useState, useRef } from 'react'
import {
  Headphones,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  MessageSquare,
  Upload,
  ChevronRight,
  Star,
  Shield,
  Zap,
  User,
  Calendar,
  Plus,
  Paperclip,
} from 'lucide-react'

/* ---------- static data ---------- */

const SLA_METRICS = [
  {
    label: 'Uptime',
    value: '99.95%',
    detail: 'Últimos 30 días',
    icon: Shield,
    color: 'text-emerald-600 text-emerald-400',
    bg: 'bg-emerald-50 bg-emerald-900/20',
    ring: 'ring-emerald-200 ring-emerald-800',
  },
  {
    label: 'Tiempo de Respuesta',
    value: '2.3h',
    detail: 'Promedio (SLA: <4h)',
    icon: Clock,
    color: 'text-emerald-600 text-emerald-400',
    bg: 'bg-emerald-50 bg-emerald-900/20',
    ring: 'ring-emerald-200 ring-emerald-800',
  },
  {
    label: 'Tickets Resueltos',
    value: '12/12',
    detail: 'Este mes (100%)',
    icon: CheckCircle2,
    color: 'text-emerald-600 text-emerald-400',
    bg: 'bg-emerald-50 bg-emerald-900/20',
    ring: 'ring-emerald-200 ring-emerald-800',
  },
]

const PLAN_FEATURES = [
  { feature: 'Canal', starter: 'Email', empresa: 'Email + WhatsApp', pro: 'Email + WhatsApp + Teléfono' },
  { feature: 'Tiempo respuesta', starter: '24h', empresa: '4h', pro: '1h' },
  { feature: 'Horario', starter: 'L-V 9-18', empresa: 'L-V 8-20', pro: '24/7' },
  { feature: 'CSM dedicado', starter: false, empresa: false, pro: true },
  { feature: 'Onboarding', starter: 'Autoservicio', empresa: 'Guiado', pro: 'Personalizado' },
  { feature: 'Uptime SLA', starter: '99%', empresa: '99.5%', pro: '99.9%' },
]

const CATEGORIES = ['Bug', 'Feature Request', 'Pregunta', 'Configuración', 'Urgencia'] as const
const PRIORITIES = ['Baja', 'Media', 'Alta', 'Crítica'] as const

const PRIORITY_COLORS: Record<string, string> = {
  Baja: 'bg-slate-100 text-slate-700 bg-white/[0.04] text-slate-300',
  Media: 'bg-blue-100 text-blue-700 bg-blue-900/30 text-blue-400',
  Alta: 'bg-orange-100 text-orange-700 bg-orange-900/30 text-orange-400',
  Crítica: 'bg-red-100 text-red-700 bg-red-900/30 text-red-400',
}

const STATUS_COLORS: Record<string, string> = {
  Resuelto: 'bg-emerald-100 text-emerald-700 bg-emerald-900/30 text-emerald-400',
  'En progreso': 'bg-amber-100 text-amber-700 bg-amber-900/30 text-amber-400',
}

const RECENT_TICKETS = [
  { id: '#2026-045', subject: 'Error al exportar PDF de diagnóstico', priority: 'Alta', status: 'Resuelto', time: '2h' },
  { id: '#2026-039', subject: 'Agregar campo personalizado a trabajador', priority: 'Media', status: 'En progreso', time: '12h' },
  { id: '#2026-032', subject: 'Configuración de alertas no guarda', priority: 'Alta', status: 'Resuelto', time: '1.5h' },
  { id: '#2026-028', subject: 'Consulta sobre cálculo de CTS', priority: 'Baja', status: 'Resuelto', time: '4h' },
]

const CURRENT_PLAN = 'pro' as const

/* ---------- component ---------- */

export default function SoportePage() {
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [ticketSuccess, setTicketSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)])
  }

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: integrate API
    setTicketSuccess(true)
    setSubject('')
    setCategory('')
    setPriority('')
    setDescription('')
    setFiles([])
    setTimeout(() => setTicketSuccess(false), 5000)
  }

  const planLabel = { starter: 'Starter', empresa: 'Empresa', pro: 'Pro' }[CURRENT_PLAN]

  return (
    <div className="min-h-screen bg-white/[0.02] bg-gray-950 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-100 bg-indigo-900/30">
            <Headphones className="w-6 h-6 text-indigo-600 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Soporte &amp; SLA</h1>
            <p className="text-sm text-gray-500 text-gray-400">Gestiona tickets y revisa tus métricas de servicio</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-700 bg-indigo-900/40 text-indigo-300 w-fit">
          <Star className="w-4 h-4" />
          Plan {planLabel}
        </span>
      </div>

      {/* ---- SLA Dashboard ---- */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Panel SLA</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SLA_METRICS.map(m => (
            <div
              key={m.label}
              className={`rounded-xl p-5 ring-1 ${m.ring} ${m.bg} flex items-start gap-4`}
            >
              <div className={`p-2 rounded-lg bg-[#141824]/60 bg-white/10`}>
                <m.icon className={`w-5 h-5 ${m.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 text-gray-300">{m.label}</p>
                <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-gray-500 text-gray-400">{m.detail}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Plan Comparison ---- */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Comparación de Planes</h2>
        <div className="overflow-x-auto rounded-xl ring-1 ring-gray-200 ring-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.04] bg-gray-900">
                <th className="text-left px-4 py-3 font-semibold text-gray-300">Característica</th>
                {(['starter', 'empresa', 'pro'] as const).map(plan => (
                  <th
                    key={plan}
                    className={`px-4 py-3 text-center font-semibold ${
                      plan === CURRENT_PLAN
                        ? 'text-indigo-700 text-indigo-300 bg-indigo-50 bg-indigo-900/20'
                        : 'text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      {plan === 'starter' && <Zap className="w-4 h-4" />}
                      {plan === 'empresa' && <Shield className="w-4 h-4" />}
                      {plan === 'pro' && <Star className="w-4 h-4" />}
                      {plan.charAt(0).toUpperCase() + plan.slice(1)}
                      {plan === CURRENT_PLAN && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-indigo-200 bg-indigo-800 text-indigo-800 text-indigo-200 font-bold uppercase">Actual</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 divide-gray-800 bg-[#141824] bg-gray-900/50">
              {PLAN_FEATURES.map(row => (
                <tr key={row.feature} className="hover:bg-white/[0.02] hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-300">{row.feature}</td>
                  {(['starter', 'empresa', 'pro'] as const).map(plan => {
                    const val = row[plan]
                    const isActive = plan === CURRENT_PLAN
                    return (
                      <td
                        key={plan}
                        className={`px-4 py-3 text-center ${
                          isActive ? 'bg-indigo-50/50 bg-indigo-900/10' : ''
                        } text-gray-400`}
                      >
                        {typeof val === 'boolean' ? (
                          val ? (
                            <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-500" />
                          ) : (
                            <span className="text-gray-400 text-gray-600">&#10005;</span>
                          )
                        ) : (
                          val
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- Create Ticket ---- */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Crear Ticket
        </h2>
        {/* Success banner — replaces native alert() */}
        {ticketSuccess && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 border-emerald-800 bg-emerald-50 bg-emerald-900/20 px-4 py-3 mb-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <p className="text-sm font-medium text-emerald-800 text-emerald-300">
              Ticket enviado correctamente. Te contactaremos pronto.
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-xl ring-1 ring-gray-200 ring-gray-800 bg-[#141824] bg-gray-900/50 p-6 space-y-5"
        >
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Asunto</label>
            <input
              type="text"
              id="ticket-subject"
              name="subject"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Describe brevemente el problema"
              className="w-full rounded-lg border border-white/10 border-gray-700 bg-[#141824] bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-400 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Categoría</label>
              <select
                required
                id="ticket-category"
                name="category"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full rounded-lg border border-white/10 border-gray-700 bg-[#141824] bg-gray-800 px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              >
                <option value="">Seleccionar categoría</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Prioridad</label>
              <select
                required
                id="ticket-priority"
                name="priority"
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full rounded-lg border border-white/10 border-gray-700 bg-[#141824] bg-gray-800 px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              >
                <option value="">Seleccionar prioridad</option>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
            <textarea
              id="ticket-description"
              name="description"
              required
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Proporciona detalles, pasos para reproducir, etc."
              className="w-full rounded-lg border border-white/10 border-gray-700 bg-[#141824] bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-400 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition resize-none"
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Adjuntos</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/10 border-gray-700 bg-white/[0.02] bg-gray-800/50 p-6 cursor-pointer hover:border-indigo-400 hover:border-indigo-600 transition"
            >
              <Upload className="w-8 h-8 text-gray-400 text-gray-500" />
              <p className="text-sm text-gray-500 text-gray-400">Haz clic o arrastra archivos aquí</p>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileChange} />
            </div>
            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <Paperclip className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => removeFile(i)} className="ml-auto text-red-500 hover:text-red-700 text-xs">Eliminar</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            <MessageSquare className="w-4 h-4" />
            Enviar Ticket
          </button>
        </form>
      </section>

      {/* ---- Recent Tickets ---- */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Tickets Recientes</h2>
        <div className="rounded-xl ring-1 ring-gray-200 ring-gray-800 bg-[#141824] bg-gray-900/50 divide-y divide-gray-100 divide-gray-800">
          {RECENT_TICKETS.map(t => (
            <div key={t.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-white/[0.02] hover:bg-gray-800/40 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400 text-gray-500">{t.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                </div>
                <p className="mt-1 text-sm font-medium text-white truncate">{t.subject}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 text-gray-400 shrink-0">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {t.time}
                </span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Customer Success Manager ---- */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Customer Success Manager</h2>
        <div className="rounded-xl ring-1 ring-gray-200 ring-gray-800 bg-[#141824] bg-gray-900/50 p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Photo & Info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-indigo-100 bg-indigo-900/30 flex items-center justify-center shrink-0">
                <User className="w-8 h-8 text-indigo-600 text-indigo-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-white">Ana García</p>
                <p className="text-sm text-gray-500 text-gray-400">Customer Success Manager</p>
              </div>
            </div>

            {/* Contact */}
            <div className="flex flex-col gap-2 sm:ml-auto">
              <a href="mailto:ana.garcia@comply360.pe" className="flex items-center gap-2 text-sm text-gray-600 text-gray-300 hover:text-indigo-600 hover:text-indigo-400 transition">
                <Mail className="w-4 h-4" />
                ana.garcia@comply360.pe
              </a>
              <a href="tel:+5119876543" className="flex items-center gap-2 text-sm text-gray-600 text-gray-300 hover:text-indigo-600 hover:text-indigo-400 transition">
                <Phone className="w-4 h-4" />
                +51 1 987 6543
              </a>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-5 border-t border-white/[0.06] border-gray-800">
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900">
              <Calendar className="w-4 h-4" />
              Agendar reunión
            </button>
            <span className="flex items-center gap-2 text-sm text-gray-500 text-gray-400">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Próxima revisión: 15 de abril 2026
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
