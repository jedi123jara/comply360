'use client'

import { useState, useEffect } from 'react'
import {
  Newspaper, AlertTriangle, Bell, BellOff, ExternalLink,
  Calendar, ChevronDown, ChevronUp, Filter, Search,
  TrendingUp, Shield, Clock, Eye,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types & Data                                                       */
/* ------------------------------------------------------------------ */

type ImpactLevel = 'Alto' | 'Medio' | 'Bajo' | 'Sin impacto'
type TrafficLight = 'verde' | 'amarillo' | 'rojo'

interface NormEntry {
  id: string
  date: string
  code: string
  title: string
  source: string
  impact: ImpactLevel
  summary: string
  detail: string
}

interface ModuleImpact {
  module: string
  status: TrafficLight
  norm: string
  note: string
}

const IMPACT_STYLE: Record<ImpactLevel, { bg: string; text: string; dot: string }> = {
  Alto:        { bg: 'bg-red-900/30',    text: 'text-red-400',       dot: 'bg-red-500' },
  Medio:       { bg: 'bg-amber-900/30', text: 'text-amber-400', dot: 'bg-amber-500' },
  Bajo:        { bg: 'bg-blue-900/30',   text: 'text-emerald-600',   dot: 'bg-blue-500' },
  'Sin impacto': { bg: 'bg-[color:var(--neutral-100)]',   text: 'text-slate-300',  dot: 'bg-gray-400' },
}

const TRAFFIC: Record<TrafficLight, { label: string; bg: string; ring: string }> = {
  verde:    { label: 'Cumple',          bg: 'bg-emerald-500', ring: 'ring-emerald-200 ring-emerald-800' },
  amarillo: { label: 'Requiere ajuste', bg: 'bg-amber-500',   ring: 'ring-amber-200 ring-amber-800' },
  rojo:     { label: 'No cumple',       bg: 'bg-red-500',     ring: 'ring-red-200 ring-red-800' },
}

const NORMS: NormEntry[] = [
  {
    id: '1', date: '28/03/2026', code: 'D.S. 003-2026-TR',
    title: 'Modificación del régimen de gratificaciones',
    source: 'El Peruano', impact: 'Alto',
    summary: 'Modifica los artículos 3 y 6 del TUO de la Ley de Gratificaciones, ajustando el cálculo para trabajadores con jornada parcial y estableciendo un nuevo cronograma de pago escalonado.',
    detail: 'Se incorpora un factor de proporcionalidad distinto para contratos a tiempo parcial (menos de 4 horas). Además, se permite el pago fraccionado de la gratificación en empresas con más de 100 trabajadores, previa autorización de MTPE. Vigente desde 01/05/2026.',
  },
  {
    id: '2', date: '22/03/2026', code: 'R.M. 048-2026-TR',
    title: 'Nuevo protocolo de inspección laboral',
    source: 'MTPE', impact: 'Medio',
    summary: 'Aprueba el protocolo actualizado para fiscalización de obligaciones sociolaborales, incorporando verificación digital de planillas y contratos electrónicos.',
    detail: 'Los inspectores podrán acceder directamente al T-Registro y PLAMe para cruce de información. Se eliminan etapas previas de requerimiento documental físico. Plazo de adecuación: 60 días calendario.',
  },
  {
    id: '3', date: '15/03/2026', code: 'Ley 32145',
    title: 'Ampliación de licencia por paternidad',
    source: 'El Peruano', impact: 'Alto',
    summary: 'Amplía la licencia por paternidad de 10 a 15 días calendario, aplicable tanto al sector público como privado. Incluye casos de adopción.',
    detail: 'La ampliación aplica a partir de nacimientos registrados desde el 01/04/2026. En caso de parto múltiple o complicaciones, se extiende a 20 días. El empleador asume el costo íntegro de la remuneración durante la licencia.',
  },
  {
    id: '4', date: '10/03/2026', code: 'D.S. 001-2026-MTPE',
    title: 'Teletrabajo: nuevas obligaciones del empleador',
    source: 'MTPE', impact: 'Alto',
    summary: 'Establece nuevas obligaciones para empleadores con trabajadores en modalidad de teletrabajo, incluyendo compensación por uso de servicios y equipos propios.',
    detail: 'El empleador debe cubrir al menos el 50% del costo de internet y energía eléctrica proporcional a la jornada. Se exige una evaluación ergonómica anual del puesto remoto y la provisión de equipos o su equivalente monetario. Plazo de adecuación: 90 días.',
  },
  {
    id: '5', date: '05/03/2026', code: 'R.S. 012-2026-SUNAFIL',
    title: 'Tabla actualizada de multas por infracciones laborales',
    source: 'SUNAFIL', impact: 'Medio',
    summary: 'Actualiza la tabla de multas aplicables por infracciones leves, graves y muy graves, incrementando los montos entre 8% y 15% respecto de la tabla anterior.',
    detail: 'Las multas muy graves para empresas no MYPE pueden alcanzar hasta 52.53 UIT. Se incorporan nuevas infracciones relacionadas con teletrabajo y acoso laboral digital. La tabla entra en vigencia a partir del 01/04/2026.',
  },
  {
    id: '6', date: '01/03/2026', code: 'D.U. 005-2026',
    title: 'Bono extraordinario temporal para trabajadores',
    source: 'El Peruano', impact: 'Bajo',
    summary: 'Otorga un bono extraordinario de S/ 300 a trabajadores del sector privado con remuneración menor a S/ 2,500, financiado parcialmente por el Estado.',
    detail: 'El bono se paga en una sola armada en abril 2026. El empleador adelanta el pago y lo compensa contra las contribuciones a EsSalud de los meses de mayo y junio. No tiene carácter remunerativo ni pensionable.',
  },
  {
    id: '7', date: '25/02/2026', code: 'R.M. 055-2026-TR',
    title: 'Registro de control de asistencia digital obligatorio',
    source: 'MTPE', impact: 'Medio',
    summary: 'Obliga a empresas con más de 20 trabajadores a implementar un sistema digital de control de asistencia interoperable con el sistema del MTPE.',
    detail: 'El sistema debe permitir registro biométrico o mediante aplicación móvil con geolocalización. Los datos deben conservarse por 5 años y estar disponibles para inspección en tiempo real. Plazo de implementación: 120 días.',
  },
  {
    id: '8', date: '20/02/2026', code: 'Ley 32198',
    title: 'Protección contra despido de trabajadoras gestantes ampliada',
    source: 'El Peruano', impact: 'Bajo',
    summary: 'Extiende el periodo de protección contra el despido arbitrario de trabajadoras gestantes hasta los 12 meses posteriores al parto (antes 90 días).',
    detail: 'Durante el periodo de protección ampliado, el despido solo procede por causa justa debidamente comprobada. La indemnización por despido nulo en este supuesto se incrementa a 24 remuneraciones. Aplica retroactivamente a gestantes con vínculo laboral vigente.',
  },
]

const MODULE_IMPACTS: ModuleImpact[] = [
  { module: 'Planillas / Calculadoras',    status: 'amarillo', norm: 'D.S. 003-2026-TR',       note: 'Ajustar fórmula de gratificaciones para jornada parcial' },
  { module: 'Contratos',                   status: 'verde',    norm: '—',                       note: 'Sin cambios requeridos' },
  { module: 'Gestión de Asistencia',       status: 'rojo',     norm: 'R.M. 055-2026-TR',       note: 'Implementar registro digital interoperable' },
  { module: 'SST / Teletrabajo',           status: 'amarillo', norm: 'D.S. 001-2026-MTPE',     note: 'Agregar evaluación ergonómica remota anual' },
  { module: 'Licencias y Permisos',        status: 'amarillo', norm: 'Ley 32145',               note: 'Actualizar días de licencia por paternidad a 15' },
  { module: 'Expedientes Laborales',       status: 'verde',    norm: '—',                       note: 'Sin cambios requeridos' },
  { module: 'Capacitaciones',              status: 'verde',    norm: '—',                       note: 'Sin cambios requeridos' },
  { module: 'Alertas / Calendario',        status: 'verde',    norm: '—',                       note: 'Actualizado automáticamente' },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface NormCounts {
  totalNormas: number
  updatesThisMonth: number
  impactingNormas: number
  complianceScore: number
  lastUpdated: string | null
}

export default function NormasPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [impactFilter, setImpactFilter] = useState<ImpactLevel | ''>('')
  const [showBanner, setShowBanner] = useState(true)

  // API-driven counts
  const [counts, setCounts] = useState<NormCounts>({
    totalNormas: 45,
    updatesThisMonth: 3,
    impactingNormas: 2,
    complianceScore: 87,
    lastUpdated: null,
  })

  useEffect(() => {
    async function fetchCounts() {
      try {
        const res = await fetch('/api/norm-updates')
        if (res.ok) {
          const data = await res.json()
          setCounts({
            totalNormas: data.totalNormas ?? 45,
            updatesThisMonth: data.updatesThisMonth ?? 3,
            impactingNormas: data.impactingNormas ?? 2,
            complianceScore: data.complianceScore ?? 87,
            lastUpdated: data.lastUpdated ?? null,
          })
        }
      } catch {
        // Keep default values if fetch fails
      }
    }
    fetchCounts()
  }, [])

  // Notification toggles
  const [notifNormas, setNotifNormas] = useState(true)
  const [notifMultas, setNotifMultas] = useState(true)
  const [notifPlazos, setNotifPlazos] = useState(false)
  const [emailFreq, setEmailFreq] = useState<'inmediato' | 'diario' | 'semanal'>('diario')

  const filtered = NORMS.filter(n => {
    const matchesSearch = searchTerm === '' ||
      n.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesImpact = impactFilter === '' || n.impact === impactFilter
    return matchesSearch && matchesImpact
  })

  return (
    <div className="space-y-8">
      {/* ---- 1. Header ---- */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Monitor de Normativa Laboral
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-400">
            <Clock className="h-4 w-4" />
            Última actualización:{' '}
            {counts.lastUpdated
              ? new Date(counts.lastUpdated).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
              : 'hace 2 horas'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-900/30 text-emerald-600">
            <TrendingUp className="h-3.5 w-3.5" /> {counts.totalNormas} normas monitoreadas
          </span>
        </div>
      </div>

      {/* ---- 2. Alert Banner ---- */}
      {showBanner && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 p-4 text-white shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" />
              <div>
                <p className="font-semibold">NUEVA NORMA: D.S. 003-2026-TR modifica régimen de gratificaciones</p>
                <p className="mt-0.5 text-sm text-white/90">Vigente desde 01/05/2026 — Requiere ajustes en el módulo de planillas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpandedId('1')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm transition hover:bg-white/30"
              >
                <Eye className="h-4 w-4" /> Ver impacto
              </button>
              <button
                onClick={() => setShowBanner(false)}
                className="rounded-lg p-1.5 transition hover:bg-white/20"
                aria-label="Cerrar alerta"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- 3. Stats Cards ---- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Normas Monitoreadas',    value: String(counts.totalNormas), icon: Newspaper,     color: 'text-primary',      bg: 'bg-primary/10 bg-primary/20' },
          { label: 'Actualizaciones este mes', value: String(counts.updatesThisMonth), icon: Calendar, color: 'text-emerald-600', bg: 'bg-blue-900/20' },
          { label: 'Impacto en tu empresa',  value: `${counts.impactingNormas} norma${counts.impactingNormas !== 1 ? 's' : ''}`, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-900/20' },
          { label: 'Cumplimiento actual',    value: `${counts.complianceScore}%`, icon: Shield,       color: 'text-emerald-600', bg: 'bg-emerald-900/20' },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white/[0.08] bg-white p-5 border-white/[0.08] bg-white"
          >
            <div className={`inline-flex rounded-lg p-2.5 ${card.bg}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{card.value}</p>
            <p className="mt-0.5 text-xs text-gray-400">{card.label}</p>
          </div>
        ))}
      </div>

      {/* ---- 4. Recent Updates ---- */}
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-white">Actualizaciones Recientes</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar norma..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-lg border border-white/[0.08] bg-white py-2 pl-9 pr-3 text-sm text-white placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary border-[color:var(--border-default)] bg-white text-white placeholder:text-slate-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <select
                value={impactFilter}
                onChange={(e) => setImpactFilter(e.target.value as ImpactLevel | '')}
                className="appearance-none rounded-lg border border-white/[0.08] bg-white py-2 pl-9 pr-8 text-sm text-[color:var(--text-secondary)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary border-[color:var(--border-default)] bg-white text-[color:var(--text-secondary)]"
              >
                <option value="">Todos</option>
                <option value="Alto">Alto</option>
                <option value="Medio">Medio</option>
                <option value="Bajo">Bajo</option>
                <option value="Sin impacto">Sin impacto</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 bg-[color:var(--neutral-50)] p-10 text-center border-[color:var(--border-default)] bg-white/50">
              <Newspaper className="mx-auto h-10 w-10 text-[color:var(--text-secondary)]" />
              <p className="mt-2 text-sm text-gray-400">No se encontraron normas con los filtros aplicados.</p>
            </div>
          )}

          {filtered.map((norm) => {
            const style = IMPACT_STYLE[norm.impact]
            const isOpen = expandedId === norm.id
            return (
              <div
                key={norm.id}
                className="rounded-xl border border-white/[0.08] bg-white transition border-white/[0.08] bg-white"
              >
                <button
                  onClick={() => setExpandedId(isOpen ? null : norm.id)}
                  className="flex w-full items-start gap-4 p-4 text-left"
                >
                  {/* Impact dot */}
                  <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${style.dot}`} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-primary">{norm.code}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}>
                        {norm.impact}
                      </span>
                      <span className="rounded-full bg-[color:var(--neutral-100)] px-2 py-0.5 text-[10px] font-medium text-gray-500 bg-[color:var(--neutral-100)] text-gray-400">
                        {norm.source}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-white">{norm.title}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {norm.date}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-400">
                      {norm.summary}
                    </p>
                  </div>

                  {isOpen
                    ? <ChevronUp className="mt-1 h-5 w-5 shrink-0 text-slate-500" />
                    : <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-slate-500" />
                  }
                </button>

                {/* Expandable detail */}
                {isOpen && (
                  <div className="border-t border-white/[0.06] px-4 pb-4 pt-3 border-white/[0.08]">
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Detalle
                    </h4>
                    <p className="text-sm leading-relaxed text-slate-300">{norm.detail}</p>
                    <a
                      href={`https://busquedas.elperuano.pe/normaslegales/${encodeURIComponent(norm.code)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Ver norma completa en El Peruano
                    </a>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ---- 5. Impact Analysis ---- */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Análisis de Impacto por Módulo
        </h2>
        <div className="overflow-hidden rounded-xl border border-white/[0.08]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[color:var(--neutral-50)] border-white/[0.08] bg-white">
                <th className="px-4 py-3 font-semibold text-slate-300">Módulo</th>
                <th className="px-4 py-3 font-semibold text-slate-300">Estado</th>
                <th className="hidden px-4 py-3 font-semibold text-slate-300 md:table-cell">Norma relacionada</th>
                <th className="hidden px-4 py-3 font-semibold text-slate-300 lg:table-cell">Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 divide-slate-700">
              {MODULE_IMPACTS.map((m) => {
                const t = TRAFFIC[m.status]
                return (
                  <tr key={m.module} className="bg-white/50">
                    <td className="px-4 py-3 font-medium text-white">{m.module}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${t.ring}`}>
                        <span className={`h-2 w-2 rounded-full ${t.bg}`} />
                        <span className="text-slate-300">{t.label}</span>
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-gray-400 md:table-cell">{m.norm}</td>
                    <td className="hidden px-4 py-3 text-xs text-gray-400 lg:table-cell">{m.note}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- 6. Subscription Settings ---- */}
      <section className="rounded-xl border border-white/[0.08] bg-white p-6 border-white/[0.08] bg-white">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Bell className="h-5 w-5 text-primary" />
          Configuración de Notificaciones
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Toggles */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suscripciones</p>

            {([
              { label: 'Nuevas normas publicadas',   value: notifNormas,  set: setNotifNormas },
              { label: 'Cambios en tabla de multas',  value: notifMultas,  set: setNotifMultas },
              { label: 'Plazos de adecuación próximos', value: notifPlazos, set: setNotifPlazos },
            ] as const).map((item) => (
              <label
                key={item.label}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-white/[0.06] px-4 py-3 transition hover:bg-[color:var(--neutral-50)] border-white/[0.08] hover:bg-[color:var(--neutral-100)]/50"
              >
                <div className="flex items-center gap-3">
                  {item.value
                    ? <Bell className="h-4 w-4 text-primary" />
                    : <BellOff className="h-4 w-4 text-slate-500" />
                  }
                  <span className="text-sm text-slate-300">{item.label}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={item.value}
                  onClick={() => item.set(!item.value)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    item.value ? 'bg-primary' : 'bg-[color:var(--neutral-200)]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      item.value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>

          {/* Email frequency */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Frecuencia de email
            </p>
            <div className="space-y-2">
              {(['inmediato', 'diario', 'semanal'] as const).map((freq) => (
                <label
                  key={freq}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                    emailFreq === freq
                      ? 'border-primary bg-primary/5 border-primary bg-primary/10'
                      : 'border-white/[0.06] hover:bg-[color:var(--neutral-50)] border-white/[0.08] hover:bg-[color:var(--neutral-100)]/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="emailFreq"
                    value={freq}
                    checked={emailFreq === freq}
                    onChange={() => setEmailFreq(freq)}
                    className="h-4 w-4 border-white/10 text-primary focus:ring-primary border-[color:var(--border-default)]"
                  />
                  <span className="text-sm capitalize text-slate-300">{freq}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
