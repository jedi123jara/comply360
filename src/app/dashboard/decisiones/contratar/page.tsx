'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  User,
  Calculator,
  Scale,
  GraduationCap,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { calcularCostoEmpleador, type CostoEmpleadorResult } from '@/lib/legal-engine/calculators/costo-empleador'

/**
 * /dashboard/decisiones/contratar — Wizard piloto "Contratar trabajador".
 *
 * 5 pasos:
 *  1. Datos básicos del trabajador (DNI, nombres, cargo, sueldo, fecha ingreso)
 *  2. Costo total empleador (calculado client-side desde sueldo + régimen)
 *  3. Régimen y modalidad recomendados
 *  4. Capacitaciones obligatorias del puesto (sugiere y permite asignar)
 *  5. Confirmar y crear
 *
 * Persistencia: el draft se guarda en localStorage por orgId. Si el usuario
 * abandona el wizard y vuelve, retoma el paso donde dejó.
 *
 * Tras crear: POST a /api/decisiones/contratar (orquestador) que crea worker
 * + enrollments + tarea de onboarding en /plan-accion.
 */

const TOTAL_STEPS = 5
const DRAFT_KEY = 'comply360_wizard_contratar_v1'

type RegimenLaboral =
  | 'GENERAL' | 'MYPE_MICRO' | 'MYPE_PEQUENA' | 'AGRARIO'
  | 'CONSTRUCCION_CIVIL' | 'MINERO' | 'PESQUERO' | 'TEXTIL_EXPORTACION'
  | 'DOMESTICO' | 'CAS' | 'MODALIDAD_FORMATIVA' | 'TELETRABAJO'

type TipoContrato =
  | 'INDEFINIDO' | 'PLAZO_FIJO' | 'TIEMPO_PARCIAL'
  | 'INICIO_ACTIVIDAD' | 'NECESIDAD_MERCADO' | 'RECONVERSION'
  | 'SUPLENCIA' | 'EMERGENCIA' | 'OBRA_DETERMINADA'
  | 'INTERMITENTE' | 'EXPORTACION'

interface WizardData {
  // Paso 1
  dni: string
  firstName: string
  lastName: string
  email: string
  phone: string
  position: string
  department: string
  fechaIngreso: string
  sueldoBruto: number | ''
  asignacionFamiliar: boolean
  // Paso 2 (previsional)
  tipoAporte: 'AFP' | 'ONP' | 'SIN_APORTE'
  sctr: boolean
  essaludVida: boolean
  // Paso 3
  regimenLaboral: RegimenLaboral
  tipoContrato: TipoContrato
  // Paso 4
  trainingCourseIds: string[]
}

const DEFAULT_DATA: WizardData = {
  dni: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  position: '',
  department: '',
  fechaIngreso: new Date().toISOString().slice(0, 10),
  sueldoBruto: '',
  asignacionFamiliar: false,
  tipoAporte: 'AFP',
  sctr: false,
  essaludVida: false,
  regimenLaboral: 'GENERAL',
  tipoContrato: 'INDEFINIDO',
  trainingCourseIds: [],
}

interface CourseOption {
  id: string
  slug: string
  title: string
  category: string
  durationMin: number
  isObligatory: boolean
  targetRegimen: string[]
  targetRoles?: string[]
}

const REGIMEN_LABELS: Record<RegimenLaboral, string> = {
  GENERAL: 'General (D.Leg. 728)',
  MYPE_MICRO: 'MYPE Micro (≤10 trab.)',
  MYPE_PEQUENA: 'MYPE Pequeña (≤100 trab.)',
  AGRARIO: 'Agrario (Ley 31110)',
  CONSTRUCCION_CIVIL: 'Construcción Civil',
  MINERO: 'Minero',
  PESQUERO: 'Pesquero',
  TEXTIL_EXPORTACION: 'Textil de Exportación',
  DOMESTICO: 'Doméstico (Ley 27986)',
  CAS: 'CAS',
  MODALIDAD_FORMATIVA: 'Modalidad Formativa',
  TELETRABAJO: 'Teletrabajo (Ley 31572)',
}

const TIPO_CONTRATO_LABELS: Record<TipoContrato, string> = {
  INDEFINIDO: 'Plazo indeterminado',
  PLAZO_FIJO: 'Plazo fijo',
  TIEMPO_PARCIAL: 'Tiempo parcial (<4h diarias)',
  INICIO_ACTIVIDAD: 'Inicio de actividad',
  NECESIDAD_MERCADO: 'Necesidad de mercado',
  RECONVERSION: 'Reconversión',
  SUPLENCIA: 'Suplencia',
  EMERGENCIA: 'Emergencia',
  OBRA_DETERMINADA: 'Obra determinada',
  INTERMITENTE: 'Intermitente',
  EXPORTACION: 'Exportación',
}

function fmtPEN(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function loadDraft(): { data: WizardData; step: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { data: WizardData; step: number }
    return parsed
  } catch {
    return null
  }
}

function saveDraft(data: WizardData, step: number) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ data, step }))
  } catch {
    /* quota / private mode */
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Sugiere régimen + modalidad contractual según señales del puesto.
 * Heurística simple — la decisión final es del usuario.
 */
function suggestRegimen(d: WizardData): { regimen: RegimenLaboral; tipo: TipoContrato; reason: string } {
  // Sueldo muy bajo + sin contexto → sugerir MYPE
  if (typeof d.sueldoBruto === 'number' && d.sueldoBruto > 0) {
    if (d.sueldoBruto >= 5000 && d.regimenLaboral === 'GENERAL') {
      return {
        regimen: 'GENERAL',
        tipo: 'INDEFINIDO',
        reason: 'Sueldo medio/alto (≥S/5,000) sugiere régimen General con plazo indeterminado para reducir riesgo de desnaturalización.',
      }
    }
  }
  return {
    regimen: d.regimenLaboral,
    tipo: d.tipoContrato,
    reason: 'Mantén la modalidad seleccionada salvo que el puesto encaje en un régimen especial (agrario, construcción, MYPE).',
  }
}

/* ── Page ───────────────────────────────────────────────────────────── */

export default function ContratarWizardPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<WizardData>(DEFAULT_DATA)
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{
    workerId: string
    workerName: string
    enrollmentsCreated: number
    workerProfile: string
    planAccion: string
    contractGenerator: string
  } | null>(null)
  const [restoredDraft, setRestoredDraft] = useState(false)

  // Hidratar draft al montar
  useEffect(() => {
    const draft = loadDraft()
    if (draft && draft.data && draft.step) {
      setData(draft.data)
      setStep(draft.step)
      setRestoredDraft(true)
    }
  }, [])

  // Auto-guardar al cambiar
  useEffect(() => {
    if (success) return
    saveDraft(data, step)
  }, [data, step, success])

  // Cargar cursos cuando entra al paso 4
  useEffect(() => {
    if (step !== 4 || courses.length > 0) return
    setCoursesLoading(true)
    fetch('/api/courses')
      .then((r) => r.json())
      .then((body: { courses?: Array<CourseOption & { stats: unknown }> }) => {
        const obligatory = (body.courses ?? []).filter((c) => c.isObligatory)
        setCourses(obligatory)
      })
      .catch(() => {
        // Falla silenciosa — el wizard continúa sin cursos
      })
      .finally(() => setCoursesLoading(false))
  }, [step, courses.length])

  const update = useCallback(<K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const validateStep = useCallback((s: number): string | null => {
    if (s === 1) {
      if (!/^\d{8}$/.test(data.dni)) return 'DNI debe tener 8 dígitos.'
      if (!data.firstName.trim()) return 'Nombre requerido.'
      if (!data.lastName.trim()) return 'Apellido requerido.'
      if (!data.fechaIngreso) return 'Fecha de ingreso requerida.'
      const sueldo = Number(data.sueldoBruto)
      if (!Number.isFinite(sueldo) || sueldo <= 0) return 'Sueldo bruto debe ser mayor a 0.'
      if (sueldo >= 1_000_000) return 'Sueldo bruto debe ser menor a 1,000,000.'
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Email inválido.'
    }
    return null
  }, [data])

  const stepError = useMemo(() => validateStep(step), [step, validateStep])

  // Cálculo de costo total (paso 2) — derivado del estado, no almacenado
  const costo: CostoEmpleadorResult | null = useMemo(() => {
    const sueldo = Number(data.sueldoBruto)
    if (!Number.isFinite(sueldo) || sueldo <= 0) return null
    try {
      return calcularCostoEmpleador({
        sueldoBruto: sueldo,
        asignacionFamiliar: data.asignacionFamiliar,
        regimenLaboral: data.regimenLaboral,
        tipoAporte: data.tipoAporte,
        sctr: data.sctr,
        essaludVida: data.essaludVida,
      })
    } catch {
      return null
    }
  }, [data.sueldoBruto, data.asignacionFamiliar, data.regimenLaboral, data.tipoAporte, data.sctr, data.essaludVida])

  const suggestion = useMemo(() => suggestRegimen(data), [data])

  // Cursos sugeridos para el paso 4. Filtra por régimen y reordena para mostrar
  // primero los que coinciden con el cargo del trabajador (match en targetRoles).
  const suggestedCourses = useMemo(() => {
    const positionLower = data.position.toLowerCase()
    const filtered = courses.filter((c) => {
      if (!c.targetRegimen || c.targetRegimen.length === 0) return true
      return c.targetRegimen.includes(data.regimenLaboral)
    })
    // Score: 2 si match exacto de targetRoles con position, 1 si position contiene
    // alguna palabra del role, 0 sin match. Ordena descendente.
    const scored = filtered.map((c) => {
      let score = 0
      if (positionLower && c.targetRoles && c.targetRoles.length > 0) {
        for (const role of c.targetRoles) {
          const roleLower = role.toLowerCase()
          if (positionLower === roleLower) {
            score = 2
            break
          }
          if (positionLower.includes(roleLower) || roleLower.includes(positionLower)) {
            score = Math.max(score, 1)
          }
        }
      }
      return { course: c, score }
    })
    scored.sort((a, b) => b.score - a.score)
    return scored
  }, [courses, data.regimenLaboral, data.position])

  const goNext = () => {
    const err = validateStep(step)
    if (err) return
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }
  const goBack = () => setStep((s) => Math.max(1, s - 1))

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const sueldo = Number(data.sueldoBruto)
      const payload = {
        dni: data.dni,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        position: data.position || null,
        department: data.department || null,
        fechaIngreso: data.fechaIngreso,
        sueldoBruto: sueldo,
        asignacionFamiliar: data.asignacionFamiliar,
        regimenLaboral: data.regimenLaboral,
        tipoContrato: data.tipoContrato,
        tipoAporte: data.tipoAporte,
        sctr: data.sctr,
        essaludVida: data.essaludVida,
        trainingCourseIds: data.trainingCourseIds,
      }
      const res = await fetch('/api/decisiones/contratar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body.error ?? `Error ${res.status}`)
      }
      // Éxito: limpia draft y muestra pantalla final
      clearDraft()
      setSuccess({
        workerId: body.data.workerId,
        workerName: body.data.workerName,
        enrollmentsCreated: body.data.enrollmentsCreated,
        workerProfile: body.links.workerProfile,
        planAccion: body.links.planAccion,
        contractGenerator: body.links.contractGenerator,
      })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRestart = () => {
    clearDraft()
    setData(DEFAULT_DATA)
    setStep(1)
    setSuccess(null)
    setSubmitError(null)
    setRestoredDraft(false)
  }

  /* ── Render ─────────────────────────────────────────────────────── */

  if (success) {
    return (
      <SuccessScreen
        result={success}
        onRestart={handleRestart}
        onGoToWorker={() => router.push(success.workerProfile)}
      />
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs text-[color:var(--text-tertiary)] hover:text-emerald-700 mb-2"
        >
          <ArrowLeft className="h-3 w-3" /> Volver al Panel
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-emerald-700" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
            Decisiones Laborales · Wizard
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Contratar trabajador</h1>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
          Flujo guiado para incorporar un trabajador con cálculo de costo total, régimen recomendado
          y asignación de capacitaciones obligatorias en un solo proceso.
        </p>
      </div>

      {restoredDraft && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start justify-between gap-3">
          <p className="text-xs text-amber-800">
            Retomando un wizard anterior guardado en este navegador. Tus datos se cargaron en el paso{' '}
            <strong>{step}</strong>.
          </p>
          <button
            onClick={handleRestart}
            className="text-xs font-semibold text-amber-700 hover:underline shrink-0"
          >
            Empezar de cero
          </button>
        </div>
      )}

      <Stepper currentStep={step} />

      {/* Paso */}
      <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5 md:p-6">
        {step === 1 && <Step1Datos data={data} update={update} />}
        {step === 2 && <Step2Costo costo={costo} data={data} update={update} />}
        {step === 3 && <Step3Regimen data={data} update={update} suggestion={suggestion} />}
        {step === 4 && (
          <Step4Capacitaciones
            data={data}
            update={update}
            courses={suggestedCourses}
            loading={coursesLoading}
          />
        )}
        {step === 5 && <Step5Confirmar data={data} costo={costo} />}

        {stepError && step <= 1 && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {stepError}
          </div>
        )}

        {submitError && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {submitError}
          </div>
        )}
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 1 || submitting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" />
          Anterior
        </button>

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!!stepError && step === 1}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Crear trabajador
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Stepper ────────────────────────────────────────────────────────── */

function Stepper({ currentStep }: { currentStep: number }) {
  const steps = [
    { n: 1, label: 'Datos básicos', icon: User },
    { n: 2, label: 'Costo empleador', icon: Calculator },
    { n: 3, label: 'Régimen', icon: Scale },
    { n: 4, label: 'Capacitaciones', icon: GraduationCap },
    { n: 5, label: 'Confirmar', icon: CheckCircle2 },
  ]
  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const isActive = currentStep === s.n
        const isDone = currentStep > s.n
        const Icon = s.icon
        return (
          <li key={s.n} className="flex items-center gap-1 shrink-0">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                isActive && 'bg-emerald-600 text-white',
                isDone && 'bg-emerald-100 text-emerald-700',
                !isActive && !isDone && 'bg-[color:var(--neutral-100)] text-[color:var(--text-tertiary)]',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px]',
                  isActive && 'bg-white text-emerald-700',
                  isDone && 'bg-emerald-700 text-white',
                  !isActive && !isDone && 'bg-white text-[color:var(--text-tertiary)]',
                )}
              >
                {isDone ? <Check className="h-2.5 w-2.5" /> : s.n}
              </span>
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <span className="h-px w-4 bg-[color:var(--border-default)]" />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/* ── Step 1: Datos básicos ──────────────────────────────────────────── */

function Step1Datos({
  data,
  update,
}: {
  data: WizardData
  update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void
}) {
  return (
    <div className="space-y-5">
      <Heading title="Datos básicos del trabajador" hint="DNI, nombres, cargo y sueldo." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="DNI *" hint="8 dígitos">
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            value={data.dni}
            onChange={(e) => update('dni', e.target.value.replace(/\D/g, ''))}
            className={inputStyles}
            placeholder="71234567"
          />
        </Field>
        <Field label="Fecha de ingreso *">
          <input
            type="date"
            value={data.fechaIngreso}
            onChange={(e) => update('fechaIngreso', e.target.value)}
            className={inputStyles}
          />
        </Field>
        <Field label="Nombres *">
          <input
            type="text"
            value={data.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            className={inputStyles}
            placeholder="María Elena"
          />
        </Field>
        <Field label="Apellidos *">
          <input
            type="text"
            value={data.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            className={inputStyles}
            placeholder="Quispe Mamani"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={data.email}
            onChange={(e) => update('email', e.target.value)}
            className={inputStyles}
            placeholder="maria@empresa.com"
          />
        </Field>
        <Field label="Teléfono">
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => update('phone', e.target.value)}
            className={inputStyles}
            placeholder="999 999 999"
          />
        </Field>
        <Field label="Cargo / posición">
          <input
            type="text"
            value={data.position}
            onChange={(e) => update('position', e.target.value)}
            className={inputStyles}
            placeholder="Analista de RRHH"
          />
        </Field>
        <Field label="Área / departamento">
          <input
            type="text"
            value={data.department}
            onChange={(e) => update('department', e.target.value)}
            className={inputStyles}
            placeholder="Recursos Humanos"
          />
        </Field>
        <Field label="Sueldo bruto mensual (S/) *">
          <input
            type="number"
            min={0}
            step={50}
            value={data.sueldoBruto}
            onChange={(e) => update('sueldoBruto', e.target.value === '' ? '' : Number(e.target.value))}
            className={inputStyles}
            placeholder="2500"
          />
        </Field>
        <Field label="Asignación familiar">
          <Toggle
            checked={data.asignacionFamiliar}
            onChange={(v) => update('asignacionFamiliar', v)}
            label={data.asignacionFamiliar ? 'Sí (10% de RMV)' : 'No aplica'}
          />
        </Field>
      </div>
    </div>
  )
}

/* ── Step 2: Costo empleador ────────────────────────────────────────── */

function Step2Costo({
  costo,
  data,
  update,
}: {
  costo: CostoEmpleadorResult | null
  data: WizardData
  update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void
}) {
  return (
    <div className="space-y-5">
      <Heading
        title="Costo total del empleador"
        hint="Calculamos cuánto te va a costar realmente, no solo el sueldo bruto."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Aporte previsional">
          <select
            value={data.tipoAporte}
            onChange={(e) => update('tipoAporte', e.target.value as WizardData['tipoAporte'])}
            className={inputStyles}
          >
            <option value="AFP">AFP</option>
            <option value="ONP">ONP</option>
            <option value="SIN_APORTE">Sin aporte (modalidad formativa)</option>
          </select>
        </Field>
        <Field label="SCTR (sector de riesgo)">
          <Toggle
            checked={data.sctr}
            onChange={(v) => update('sctr', v)}
            label={data.sctr ? 'Sí (~1.53%)' : 'No aplica'}
          />
        </Field>
        <Field label="Seguro Vida Ley">
          <Toggle
            checked={data.essaludVida}
            onChange={(v) => update('essaludVida', v)}
            label={data.essaludVida ? 'Sí (~0.53%)' : 'No aplica'}
          />
        </Field>
      </div>

      {!costo ? (
        <div className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-6 text-center">
          <p className="text-sm text-[color:var(--text-tertiary)]">
            Vuelve al paso 1 y completa el sueldo bruto para ver el cálculo.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Headlines */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat label="Costo mensual" value={fmtPEN(costo.costoMensualEmpleador)} accent="emerald" />
            <Stat label="Costo anual" value={fmtPEN(costo.costoAnualEmpleador)} accent="emerald" />
            <Stat
              label="Sobre el bruto"
              value={`+${costo.porcentajeSobreSueldo.toFixed(1)}%`}
              accent="amber"
              hint="Cuánto más sobre el sueldo bruto"
            />
          </div>

          {/* Desglose */}
          <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)] mb-3">
              Desglose mensual
            </p>
            <dl className="space-y-1.5 text-sm">
              <Row label="Sueldo bruto" value={fmtPEN(costo.sueldoBruto)} />
              {costo.asignacionFamiliar > 0 && (
                <Row label="Asignación familiar" value={fmtPEN(costo.asignacionFamiliar)} />
              )}
              <Row label="EsSalud (empleador)" value={fmtPEN(costo.essalud)} />
              {costo.sctr > 0 && <Row label="SCTR" value={fmtPEN(costo.sctr)} />}
              {costo.seguroVida > 0 && <Row label="Seguro Vida Ley" value={fmtPEN(costo.seguroVida)} />}
              <Row label="Provisión CTS" value={fmtPEN(costo.provisionCTS)} />
              <Row label="Provisión gratificaciones" value={fmtPEN(costo.provisionGratificacion)} />
              <Row label="Provisión vacaciones" value={fmtPEN(costo.provisionVacaciones)} />
              <Row label="Bonif. extraordinaria 9%" value={fmtPEN(costo.provisionBonifExtraordinaria)} />
              <hr className="border-[color:var(--border-subtle)] my-1.5" />
              <Row label="Total mensual" value={fmtPEN(costo.costoMensualEmpleador)} bold />
            </dl>
            <p className="mt-3 text-[10px] text-[color:var(--text-tertiary)]">
              Base legal: {costo.baseLegal.join(' · ')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Step 3: Régimen recomendado ────────────────────────────────────── */

function Step3Regimen({
  data,
  update,
  suggestion,
}: {
  data: WizardData
  update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void
  suggestion: { regimen: RegimenLaboral; tipo: TipoContrato; reason: string }
}) {
  const usingSuggestion =
    data.regimenLaboral === suggestion.regimen && data.tipoContrato === suggestion.tipo

  return (
    <div className="space-y-5">
      <Heading title="Régimen y modalidad contractual" hint="Define el régimen laboral y tipo de contrato." />

      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-emerald-900">Sugerencia automática</p>
            <p className="mt-0.5 text-sm text-emerald-900">
              <strong>{REGIMEN_LABELS[suggestion.regimen]}</strong> ·{' '}
              <strong>{TIPO_CONTRATO_LABELS[suggestion.tipo]}</strong>
            </p>
            <p className="mt-1 text-xs text-emerald-800 leading-relaxed">{suggestion.reason}</p>
            {!usingSuggestion && (
              <button
                type="button"
                onClick={() => {
                  update('regimenLaboral', suggestion.regimen)
                  update('tipoContrato', suggestion.tipo)
                }}
                className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                Aplicar sugerencia
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Régimen laboral">
          <select
            value={data.regimenLaboral}
            onChange={(e) => update('regimenLaboral', e.target.value as RegimenLaboral)}
            className={inputStyles}
          >
            {(Object.keys(REGIMEN_LABELS) as RegimenLaboral[]).map((k) => (
              <option key={k} value={k}>
                {REGIMEN_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipo de contrato">
          <select
            value={data.tipoContrato}
            onChange={(e) => update('tipoContrato', e.target.value as TipoContrato)}
            className={inputStyles}
          >
            {(Object.keys(TIPO_CONTRATO_LABELS) as TipoContrato[]).map((k) => (
              <option key={k} value={k}>
                {TIPO_CONTRATO_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="rounded-lg bg-[color:var(--neutral-50)] p-3 text-xs text-[color:var(--text-tertiary)] leading-relaxed">
        <strong>Nota:</strong> el régimen condiciona los beneficios (CTS, gratificaciones, vacaciones)
        y modifica el costo total empleador. Si dudas, conviene plazo indeterminado para reducir riesgo
        de desnaturalización.
      </div>
    </div>
  )
}

/* ── Step 4: Capacitaciones ─────────────────────────────────────────── */

function Step4Capacitaciones({
  data,
  update,
  courses,
  loading,
}: {
  data: WizardData
  update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void
  courses: Array<{ course: CourseOption; score: number }>
  loading: boolean
}) {
  const toggle = (id: string) => {
    const set = new Set(data.trainingCourseIds)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    update('trainingCourseIds', Array.from(set))
  }

  const allIds = courses.map((c) => c.course.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => data.trainingCourseIds.includes(id))
  const toggleAll = () => {
    if (allSelected) update('trainingCourseIds', [])
    else update('trainingCourseIds', allIds)
  }

  // Duración total de cursos seleccionados (suma)
  const selectedSet = new Set(data.trainingCourseIds)
  const totalMinSeleccionados = courses.reduce(
    (acc, c) => acc + (selectedSet.has(c.course.id) ? c.course.durationMin : 0),
    0,
  )
  const horasTotales = Math.floor(totalMinSeleccionados / 60)
  const minutosResto = totalMinSeleccionados % 60

  return (
    <div className="space-y-5">
      <Heading
        title="Capacitaciones obligatorias del puesto"
        hint="Asigna los cursos que debe completar el trabajador (Ley 29783, Ley 27942)."
      />

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-6 text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-[color:var(--text-tertiary)]" />
          <p className="mt-2 text-sm text-[color:var(--text-tertiary)]">
            No hay capacitaciones obligatorias en el catálogo todavía. Puedes saltar este paso y
            asignarlas más tarde desde el perfil del trabajador.
          </p>
          <Link
            href="/dashboard/capacitaciones"
            className="mt-2 inline-block text-xs font-semibold text-emerald-700 hover:underline"
          >
            Ir al catálogo de capacitaciones
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-[color:var(--text-tertiary)]">
              {courses.length} capacitación{courses.length !== 1 ? 'es' : ''} obligatoria{courses.length !== 1 ? 's' : ''} aplica{courses.length !== 1 ? 'n' : ''} al
              régimen <strong>{REGIMEN_LABELS[data.regimenLaboral]}</strong>.
              {data.position && (
                <> Ordenadas por relevancia para el cargo <strong>{data.position}</strong>.</>
              )}
            </p>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              {allSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </button>
          </div>

          {courses.map(({ course: c, score }) => {
            const checked = data.trainingCourseIds.includes(c.id)
            return (
              <label
                key={c.id}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors',
                  checked
                    ? 'border-emerald-300 bg-emerald-50/40'
                    : 'border-[color:var(--border-default)] bg-white hover:border-emerald-200',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(c.id)}
                  className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-600"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase text-emerald-700">{c.category}</span>
                    <span className="text-[10px] text-[color:var(--text-tertiary)]">· {c.durationMin} min</span>
                    {score > 0 && (
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase',
                          score >= 2
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700',
                        )}
                      >
                        {score >= 2 ? 'Recomendado · cargo' : 'Coincidencia parcial'}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-[color:var(--text-primary)]">{c.title}</p>
                </div>
              </label>
            )
          })}

          <div className="flex items-center justify-between flex-wrap gap-2 mt-2 pt-2 border-t border-[color:var(--border-subtle)]">
            <p className="text-[11px] text-[color:var(--text-tertiary)]">
              Seleccionadas: <strong>{data.trainingCourseIds.length}</strong> de {courses.length}
            </p>
            {totalMinSeleccionados > 0 && (
              <p className="text-[11px] text-emerald-700">
                Duración total estimada:{' '}
                <strong>
                  {horasTotales > 0 ? `${horasTotales}h ` : ''}
                  {minutosResto}min
                </strong>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Step 5: Confirmar ──────────────────────────────────────────────── */

function Step5Confirmar({ data, costo }: { data: WizardData; costo: CostoEmpleadorResult | null }) {
  return (
    <div className="space-y-5">
      <Heading
        title="Confirmar y crear"
        hint="Revisa el resumen. Al confirmar, creamos al trabajador y asignamos las capacitaciones."
      />

      <ResumenSection title="Datos básicos">
        <Row label="DNI" value={data.dni} />
        <Row label="Nombre completo" value={`${data.firstName} ${data.lastName}`} />
        {data.email && <Row label="Email" value={data.email} />}
        {data.phone && <Row label="Teléfono" value={data.phone} />}
        {data.position && <Row label="Cargo" value={data.position} />}
        {data.department && <Row label="Área" value={data.department} />}
        <Row label="Fecha de ingreso" value={new Date(data.fechaIngreso).toLocaleDateString('es-PE')} />
        <Row label="Sueldo bruto" value={typeof data.sueldoBruto === 'number' ? fmtPEN(data.sueldoBruto) : '—'} />
      </ResumenSection>

      {costo && (
        <ResumenSection title="Costo total empleador">
          <Row label="Costo mensual" value={fmtPEN(costo.costoMensualEmpleador)} bold />
          <Row label="Costo anual" value={fmtPEN(costo.costoAnualEmpleador)} bold />
          <Row label="Sobre el bruto" value={`+${costo.porcentajeSobreSueldo.toFixed(1)}%`} />
        </ResumenSection>
      )}

      <ResumenSection title="Régimen y modalidad">
        <Row label="Régimen" value={REGIMEN_LABELS[data.regimenLaboral]} />
        <Row label="Tipo contrato" value={TIPO_CONTRATO_LABELS[data.tipoContrato]} />
        <Row label="Aporte" value={data.tipoAporte} />
        <Row label="SCTR" value={data.sctr ? 'Sí' : 'No'} />
        <Row label="Seguro Vida Ley" value={data.essaludVida ? 'Sí' : 'No'} />
      </ResumenSection>

      <ResumenSection title="Capacitaciones a asignar">
        <p className="text-sm text-[color:var(--text-secondary)]">
          {data.trainingCourseIds.length === 0
            ? 'Sin capacitaciones seleccionadas. Puedes asignarlas después desde el perfil.'
            : `${data.trainingCourseIds.length} curso${data.trainingCourseIds.length !== 1 ? 's' : ''} obligatorio${data.trainingCourseIds.length !== 1 ? 's' : ''} se asignará${data.trainingCourseIds.length !== 1 ? 'n' : ''} al trabajador.`}
        </p>
      </ResumenSection>

      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900">
        Al confirmar también creamos una <strong>tarea de onboarding</strong> en tu Plan de Acción
        para recordarte completar contrato, legajo y capacitaciones.
      </div>
    </div>
  )
}

/* ── Success Screen ─────────────────────────────────────────────────── */

function SuccessScreen({
  result,
  onRestart,
  onGoToWorker,
}: {
  result: {
    workerId: string
    workerName: string
    enrollmentsCreated: number
    workerProfile: string
    planAccion: string
    contractGenerator: string
  }
  onRestart: () => void
  onGoToWorker: () => void
}) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-8 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white mb-3">
          <Check className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-emerald-900">
          {result.workerName} fue creado
        </h2>
        <p className="mt-1 text-sm text-emerald-800">
          {result.enrollmentsCreated > 0
            ? `${result.enrollmentsCreated} capacitación${result.enrollmentsCreated !== 1 ? 'es' : ''} obligatoria${result.enrollmentsCreated !== 1 ? 's' : ''} asignada${result.enrollmentsCreated !== 1 ? 's' : ''}.`
            : 'Sin capacitaciones asignadas en este flujo.'}{' '}
          Tarea de onboarding creada en tu Plan de Acción.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onGoToWorker}
          className="rounded-xl border border-emerald-300 bg-white p-4 text-left hover:border-emerald-500"
        >
          <p className="text-xs font-semibold text-emerald-700 mb-1">Siguiente paso</p>
          <p className="text-sm font-bold text-[color:var(--text-primary)]">Ver perfil del trabajador</p>
          <p className="mt-1 text-[11px] text-[color:var(--text-tertiary)]">Subir documentos del legajo, generar contrato, etc.</p>
        </button>
        <Link
          href={result.contractGenerator}
          className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 text-left hover:border-emerald-300"
        >
          <p className="text-xs font-semibold text-emerald-700 mb-1">Generar contrato</p>
          <p className="text-sm font-bold text-[color:var(--text-primary)]">Nuevo contrato vinculado</p>
          <p className="mt-1 text-[11px] text-[color:var(--text-tertiary)]">Plantillas propias o generadores legales.</p>
        </Link>
        <Link
          href={result.planAccion}
          className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 text-left hover:border-emerald-300"
        >
          <p className="text-xs font-semibold text-emerald-700 mb-1">Plan de Acción</p>
          <p className="text-sm font-bold text-[color:var(--text-primary)]">Ver tareas pendientes</p>
          <p className="mt-1 text-[11px] text-[color:var(--text-tertiary)]">Onboarding y otras acciones críticas.</p>
        </Link>
      </div>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onRestart}
          className="text-xs font-semibold text-[color:var(--text-tertiary)] hover:text-emerald-700"
        >
          Crear otro trabajador →
        </button>
      </div>
    </div>
  )
}

/* ── UI atoms ───────────────────────────────────────────────────────── */

const inputStyles =
  'w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm text-[color:var(--text-primary)] placeholder-[color:var(--text-tertiary)] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'

function Heading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-[color:var(--text-primary)]">{title}</h2>
      {hint && <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">{hint}</p>}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">
        {label}
        {hint && <span className="ml-1 font-normal text-[color:var(--text-tertiary)]">· {hint}</span>}
      </span>
      {children}
    </label>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium',
        checked
          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
          : 'border-[color:var(--border-default)] bg-white text-[color:var(--text-secondary)]',
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'relative h-4 w-7 rounded-full transition-colors',
          checked ? 'bg-emerald-600' : 'bg-[color:var(--neutral-300)] bg-slate-300',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform',
            checked ? 'translate-x-3.5' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  )
}

function Stat({
  label,
  value,
  accent,
  hint,
}: {
  label: string
  value: string
  accent?: 'emerald' | 'amber'
  hint?: string
}) {
  const accentClass = {
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
  }[accent ?? 'emerald']
  return (
    <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4">
      <p className="text-[11px] uppercase tracking-wide text-[color:var(--text-tertiary)]">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold tabular-nums', accentClass)}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-[color:var(--text-tertiary)]">{hint}</p>}
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between text-sm', bold && 'font-bold text-[color:var(--text-primary)]')}>
      <dt className="text-[color:var(--text-tertiary)]">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

function ResumenSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)] mb-2">
        {title}
      </p>
      <dl className="space-y-1">{children}</dl>
    </div>
  )
}
