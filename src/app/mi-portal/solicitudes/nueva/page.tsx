'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Info,
  Sparkles,
} from 'lucide-react'

type RequestTypeValue =
  | 'VACACIONES'
  | 'PERMISO'
  | 'LICENCIA_MEDICA'
  | 'LICENCIA_MATERNIDAD'
  | 'LICENCIA_PATERNIDAD'
  | 'ADELANTO_SUELDO'
  | 'CTS_RETIRO_PARCIAL'
  | 'CONSTANCIA_TRABAJO'
  | 'CERTIFICADO_5TA'
  | 'ACTUALIZAR_DATOS'
  | 'OTRO'

type RequestTypeConfig = {
  value: RequestTypeValue
  label: string
  requiresDates?: boolean
  requiresAmount?: boolean
}

const REQUEST_TYPES: RequestTypeConfig[] = [
  { value: 'VACACIONES', label: 'Vacaciones', requiresDates: true },
  { value: 'PERMISO', label: 'Permiso', requiresDates: true },
  { value: 'LICENCIA_MEDICA', label: 'Licencia médica', requiresDates: true },
  { value: 'LICENCIA_MATERNIDAD', label: 'Licencia maternidad', requiresDates: true },
  { value: 'LICENCIA_PATERNIDAD', label: 'Licencia paternidad', requiresDates: true },
  { value: 'ADELANTO_SUELDO', label: 'Adelanto de sueldo', requiresAmount: true },
  { value: 'CTS_RETIRO_PARCIAL', label: 'Retiro parcial CTS (hasta 100% del exceso de 4 sueldos)', requiresAmount: true },
  { value: 'CONSTANCIA_TRABAJO', label: 'Constancia de trabajo', requiresDates: false },
  { value: 'CERTIFICADO_5TA', label: 'Certificado de 5ta categoría', requiresDates: false },
  { value: 'ACTUALIZAR_DATOS', label: 'Actualizar mis datos', requiresDates: false },
  { value: 'OTRO', label: 'Otra solicitud', requiresDates: false },
] 

type RegimenLaboral = 'GENERAL' | 'MYPE_MICRO' | 'MYPE_PEQUENA' | 'AGRARIO' | 'MODALIDAD_FORMATIVA' | string
type PaternityScenario = 'BASE' | 'MULTIPLE_PREMATURE' | 'COMPLICATIONS'
type MaternityScenario = 'BASE' | 'EXTENDED'

const REQUEST_TYPE_VALUES = new Set(REQUEST_TYPES.map((t) => t.value))

const PATERNITY_SCENARIOS: Record<PaternityScenario, { label: string; days: number; helper: string }> = {
  BASE: {
    label: 'Parto natural o cesárea',
    days: 10,
    helper: 'Licencia base de 10 días calendario consecutivos.',
  },
  MULTIPLE_PREMATURE: {
    label: 'Nacimiento prematuro o parto múltiple',
    days: 20,
    helper: 'Supuesto especial de 20 días calendario consecutivos.',
  },
  COMPLICATIONS: {
    label: 'Complicación grave, discapacidad severa o enfermedad terminal',
    days: 30,
    helper: 'Supuesto especial de 30 días calendario consecutivos.',
  },
}

const MATERNITY_SCENARIOS: Record<MaternityScenario, { label: string; days: number; helper: string }> = {
  BASE: {
    label: 'Descanso pre y postnatal',
    days: 98,
    helper: '49 días prenatales y 49 días postnatales.',
  },
  EXTENDED: {
    label: 'Parto múltiple o menor con discapacidad',
    days: 128,
    helper: '98 días base más 30 días adicionales.',
  },
}

function isRequestType(value: string | null): value is RequestTypeValue {
  return Boolean(value && REQUEST_TYPE_VALUES.has(value as RequestTypeValue))
}

function isMype(regimen: RegimenLaboral | null): boolean {
  return regimen === 'MYPE_MICRO' || regimen === 'MYPE_PEQUENA'
}

function vacationDaysForRegimen(regimen: RegimenLaboral | null): number {
  if (isMype(regimen)) return 15
  return 30
}

function regimenLabel(regimen: RegimenLaboral | null): string {
  const labels: Record<string, string> = {
    GENERAL: 'régimen general',
    MYPE_MICRO: 'microempresa REMYPE',
    MYPE_PEQUENA: 'pequeña empresa REMYPE',
    AGRARIO: 'régimen agrario',
    MODALIDAD_FORMATIVA: 'modalidad formativa',
  }
  return labels[String(regimen ?? 'GENERAL')] ?? 'tu régimen registrado'
}

function addCalendarDaysInclusive(startDate: string, days: number): string {
  const [year, month, day] = startDate.split('-').map(Number)
  if (!year || !month || !day || days <= 0) return ''
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days - 1)
  return date.toISOString().slice(0, 10)
}

function countCalendarDaysInclusive(startDate: string, endDate: string): number | null {
  if (!startDate || !endDate) return null
  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
}

function durationDaysForType(
  type: RequestTypeValue,
  regimen: RegimenLaboral,
  maternityScenario: MaternityScenario,
  paternityScenario: PaternityScenario,
): number | null {
  if (type === 'VACACIONES') return vacationDaysForRegimen(regimen)
  if (type === 'LICENCIA_MATERNIDAD') return MATERNITY_SCENARIOS[maternityScenario].days
  if (type === 'LICENCIA_PATERNIDAD') return PATERNITY_SCENARIOS[paternityScenario].days
  return null
}

function withPreviewHref(href: string, enabled: boolean): string {
  if (!enabled || !href.startsWith('/mi-portal')) return href
  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}__workerPreview=1`
}

export default function NuevaSolicitudPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isWorkerPreview =
    process.env.NODE_ENV === 'development' && searchParams.get('__workerPreview') === '1'
  const typeParam = searchParams.get('type')
  const initialType: RequestTypeValue = isRequestType(typeParam) ? typeParam : 'VACACIONES'
  const [regimenLaboral, setRegimenLaboral] = useState<RegimenLaboral>('GENERAL')
  const [paternityScenario, setPaternityScenario] = useState<PaternityScenario>('BASE')
  const [maternityScenario, setMaternityScenario] = useState<MaternityScenario>('BASE')
  const [form, setForm] = useState({
    type: initialType,
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    amount: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const selectedType = REQUEST_TYPES.find((t) => t.value === form.type) ?? REQUEST_TYPES[0]

  const durationInfo = useMemo(() => {
    if (form.type === 'VACACIONES') {
      const days = vacationDaysForRegimen(regimenLaboral)
      return {
        days,
        label: `${days} días calendario`,
        helper: `Calculado por defecto para ${regimenLabel(regimenLaboral)}. Puedes ajustar la fecha fin si RR. HH. autoriza otro periodo.`,
      }
    }
    if (form.type === 'LICENCIA_MATERNIDAD') {
      const scenario = MATERNITY_SCENARIOS[maternityScenario]
      return {
        days: scenario.days,
        label: `${scenario.days} días calendario`,
        helper: scenario.helper,
      }
    }
    if (form.type === 'LICENCIA_PATERNIDAD') {
      const scenario = PATERNITY_SCENARIOS[paternityScenario]
      return {
        days: scenario.days,
        label: `${scenario.days} días calendario`,
        helper: scenario.helper,
      }
    }
    return null
  }, [form.type, maternityScenario, paternityScenario, regimenLaboral])

  const selectedDays = countCalendarDaysInclusive(form.startDate, form.endDate)

  useEffect(() => {
    if (isWorkerPreview) return

    let cancelled = false
    fetch('/api/mi-portal/perfil', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((profile: { regimenLaboral?: RegimenLaboral } | null) => {
        if (!cancelled && profile?.regimenLaboral) {
          const nextRegimen = profile.regimenLaboral
          setRegimenLaboral(nextRegimen)
          setForm((prev) => {
            if (!prev.startDate || prev.type !== 'VACACIONES') return prev
            return {
              ...prev,
              endDate: addCalendarDaysInclusive(prev.startDate, vacationDaysForRegimen(nextRegimen)),
            }
          })
        }
      })
      .catch(() => null)

    return () => {
      cancelled = true
    }
  }, [isWorkerPreview])

  function handleTypeChange(value: string) {
    const nextType = isRequestType(value) ? value : 'VACACIONES'
    setForm((prev) => {
      const nextSelected = REQUEST_TYPES.find((t) => t.value === nextType) ?? REQUEST_TYPES[0]
      const shouldClearDates = !nextSelected.requiresDates
      const nextDurationDays = durationDaysForType(nextType, regimenLaboral, maternityScenario, paternityScenario)
      return {
        ...prev,
        type: nextType,
        startDate: shouldClearDates ? '' : prev.startDate,
        endDate: shouldClearDates
          ? ''
          : prev.startDate && nextDurationDays
            ? addCalendarDaysInclusive(prev.startDate, nextDurationDays)
            : prev.endDate,
        amount: nextSelected.requiresAmount ? prev.amount : '',
      }
    })
  }

  function handleStartDateChange(value: string) {
    setForm((prev) => ({
      ...prev,
      startDate: value,
      endDate: durationInfo ? addCalendarDaysInclusive(value, durationInfo.days) : prev.endDate,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      const body: Record<string, unknown> = {
        type: form.type,
        title: form.title || `Solicitud de ${selectedType.label}`,
        description: form.description || null,
      }
      if (selectedType.requiresDates) {
        body.startDate = form.startDate
        body.endDate = form.endDate
      }
      if (selectedType.requiresAmount) {
        body.amount = parseFloat(form.amount)
      }
      const res = await fetch('/api/mi-portal/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al enviar')
      }
      setMessage({ type: 'success', text: 'Solicitud enviada. RR. HH. la revisará pronto.' })
      setTimeout(() => router.push(withPreviewHref('/mi-portal/solicitudes', isWorkerPreview)), 1500)
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href={withPreviewHref('/mi-portal/solicitudes', isWorkerPreview)}
          className="text-sm text-emerald-700 hover:underline flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a mis solicitudes
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Nueva solicitud</h2>
        <p className="mt-1 text-sm text-slate-600">
          Las fechas se proponen con días calendario según tu régimen y el tipo de licencia.
        </p>
      </div>

      {message && (
        <div className={`flex items-start gap-3 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Configuración automática</p>
              <h3 className="text-sm font-semibold text-slate-950">Tus días se calculan por defecto</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Vacaciones usa {isMype(regimenLaboral) ? '15' : '30'} días para {regimenLabel(regimenLaboral)}. Maternidad y paternidad aplican los supuestos legales más comunes.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="request-type" className="block text-sm font-medium text-slate-700 mb-1">Tipo de solicitud</label>
          <select
            id="request-type"
            name="type"
            value={form.type}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {REQUEST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {form.type === 'LICENCIA_MATERNIDAD' && (
          <ScenarioSelect
            label="Supuesto de maternidad"
            value={maternityScenario}
            onChange={(value) => {
              const next = value as MaternityScenario
              setMaternityScenario(next)
              setForm((prev) => prev.startDate && prev.type === 'LICENCIA_MATERNIDAD'
                ? { ...prev, endDate: addCalendarDaysInclusive(prev.startDate, MATERNITY_SCENARIOS[next].days) }
                : prev)
            }}
            options={MATERNITY_SCENARIOS}
          />
        )}

        {form.type === 'LICENCIA_PATERNIDAD' && (
          <ScenarioSelect
            label="Supuesto de paternidad"
            value={paternityScenario}
            onChange={(value) => {
              const next = value as PaternityScenario
              setPaternityScenario(next)
              setForm((prev) => prev.startDate && prev.type === 'LICENCIA_PATERNIDAD'
                ? { ...prev, endDate: addCalendarDaysInclusive(prev.startDate, PATERNITY_SCENARIOS[next].days) }
                : prev)
            }}
            options={PATERNITY_SCENARIOS}
          />
        )}

        <div>
          <label htmlFor="request-title" className="block text-sm font-medium text-slate-700 mb-1">Título</label>
          <input
            id="request-title"
            name="title"
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={`Solicitud de ${selectedType.label}`}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
            maxLength={120}
          />
        </div>

        <div>
          <label htmlFor="request-description" className="block text-sm font-medium text-slate-700 mb-1">Descripción / Motivo</label>
          <textarea
            id="request-description"
            name="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            placeholder="Explica brevemente el motivo de tu solicitud..."
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
            maxLength={1000}
          />
        </div>

        {selectedType.requiresDates && (
          <div className="space-y-3">
            {durationInfo && (
              <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <div>
                  <p className="text-sm font-semibold text-blue-950">
                    Duración sugerida: {durationInfo.label}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-blue-800">{durationInfo.helper}</p>
                </div>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="request-start-date" className="block text-sm font-medium text-slate-700 mb-1">Fecha inicio</label>
                <input
                  id="request-start-date"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  onInput={(e) => handleStartDateChange(e.currentTarget.value)}
                  required
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label htmlFor="request-end-date" className="block text-sm font-medium text-slate-700 mb-1">Fecha fin</label>
                <input
                  id="request-end-date"
                  name="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  onInput={(e) => setForm({ ...form, endDate: e.currentTarget.value })}
                  required
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span>
                {selectedDays
                  ? `Estás solicitando ${selectedDays} día${selectedDays === 1 ? '' : 's'} calendario, incluyendo la fecha de inicio.`
                  : 'Selecciona una fecha de inicio para calcular la fecha fin sugerida.'}
              </span>
            </div>
          </div>
        )}

        {selectedType.requiresAmount && (
          <div>
            <label htmlFor="request-amount" className="block text-sm font-medium text-slate-700 mb-1">Monto solicitado (S/)</label>
            <input
              id="request-amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {submitting ? 'Enviando...' : 'Enviar solicitud'}
        </button>
      </form>
    </div>
  )
}

function ScenarioSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (value: string) => void
  options: Record<T, { label: string; days: number; helper: string }>
}) {
  const id = `scenario-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
      >
        {(Object.keys(options) as T[]).map((key) => {
          const option = options[key]
          return (
            <option key={key} value={key}>
              {option.label} · {option.days} días
            </option>
          )
        })}
      </select>
    </div>
  )
}
