'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  HardHat,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Sparkles,
  Rocket,
  AlertCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

// ── Tipos ────────────────────────────────────────────────────────────────

interface OnboardingStep {
  key: 'sede' | 'puesto' | 'iperc' | 'aprobar'
  label: string
  done: boolean
  count: number
}

interface OnboardingStatus {
  completo: boolean
  completados: number
  total: number
  porcentaje: number
  steps: OnboardingStep[]
  counts: {
    sedes: number
    puestos: number
    iperBases: number
    ipercVigentes: number
    accidentes: number
  }
  ultimaSede: {
    id: string
    nombre: string
    tipoInstalacion: string
    _count: { puestos: number; iperBases: number }
  } | null
  ultimoIperc: {
    id: string
    version: number
    estado: string
    sede: { id: string; nombre: string }
  } | null
}

const TIPOS_INSTALACION = [
  { value: 'OFICINA', label: 'Oficina' },
  { value: 'PLANTA', label: 'Planta' },
  { value: 'OBRA', label: 'Obra' },
  { value: 'SUCURSAL', label: 'Sucursal' },
  { value: 'TALLER', label: 'Taller' },
  { value: 'ALMACEN', label: 'Almacén' },
  { value: 'CAMPO', label: 'Campo' },
] as const

type StepKey = 'welcome' | 'sede' | 'puesto' | 'iperc' | 'done'

// ── Página ───────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<StepKey>('welcome')

  // Estado intermedio: sedeId y puestoId que el usuario va creando en este wizard
  const [sedeIdActual, setSedeIdActual] = useState<string | null>(null)
  const [puestoIdActual, setPuestoIdActual] = useState<string | null>(null)
  async function loadStatus(advanceIfComplete = true) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sst/onboarding/status', { cache: 'no-store' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'No se pudo cargar el estado')
      }
      const json = (await res.json()) as OnboardingStatus
      setStatus(json)
      if (advanceIfComplete && json.completo) {
        setStep('done')
      } else if (advanceIfComplete && step === 'welcome' && json.counts.sedes > 0) {
        // Si ya tiene sedes y entra fresh al wizard, asumimos que viene a continuar
        setSedeIdActual(json.ultimaSede?.id ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Cargando estado del onboarding...
      </div>
    )
  }

  if (error || !status) {
    return (
      <Card className="border-rose-200 bg-rose-50/60">
        <CardContent className="flex items-center gap-2 py-6 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {error ?? 'Error desconocido'}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SST · Onboarding"
        title="Configura tu SGSST en 4 pasos"
        subtitle="Sigue este flujo guiado para dejar lista la primera matriz IPERC. Puedes regresar y editarlo todo después."
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {status.completados} de {status.total}
            </span>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${status.porcentaje}%` }}
              />
            </div>
          </div>
        }
      />

      {/* Stepper visual */}
      <Stepper status={status} step={step} />

      {/* Contenido por step */}
      {step === 'welcome' && (
        <WelcomeStep
          status={status}
          onStart={() => {
            if (status.counts.sedes === 0) setStep('sede')
            else if (status.counts.puestos === 0) {
              setSedeIdActual(status.ultimaSede?.id ?? null)
              setStep('puesto')
            } else if (status.counts.iperBases === 0) {
              setSedeIdActual(status.ultimaSede?.id ?? null)
              setStep('iperc')
            } else {
              setStep('done')
            }
          }}
        />
      )}

      {step === 'sede' && (
        <SedeStep
          onCreated={(id) => {
            setSedeIdActual(id)
            toast.success('Sede creada')
            loadStatus(false)
            setStep('puesto')
          }}
          onSkip={() => {
            if (status.ultimaSede) {
              setSedeIdActual(status.ultimaSede.id)
              setStep('puesto')
            } else {
              toast.error('Necesitas al menos una sede para continuar')
            }
          }}
          puedeSaltar={status.counts.sedes > 0}
        />
      )}

      {step === 'puesto' && sedeIdActual && (
        <PuestoStep
          sedeId={sedeIdActual}
          onCreated={(id) => {
            setPuestoIdActual(id)
            toast.success('Puesto creado')
            loadStatus(false)
            setStep('iperc')
          }}
          onBack={() => setStep('sede')}
        />
      )}

      {step === 'iperc' && sedeIdActual && (
        <IpercStep
          sedeId={sedeIdActual}
          puestoIdActual={puestoIdActual}
          onCreated={(ipercId) => {
            toast.success('Matriz IPERC creada')
            loadStatus(false)
            // Redirigir directo al editor para que llene filas con IA
            router.push(`/dashboard/sst/iperc-bases/${ipercId}`)
          }}
          onBack={() => setStep('puesto')}
        />
      )}

      {step === 'done' && <DoneStep status={status} />}
    </div>
  )
}

// ── Stepper visual ───────────────────────────────────────────────────────

function Stepper({ status, step }: { status: OnboardingStatus; step: StepKey }) {
  const items = [
    { key: 'sede', label: 'Sede', icon: Building2, done: status.counts.sedes > 0 },
    { key: 'puesto', label: 'Puesto', icon: HardHat, done: status.counts.puestos > 0 },
    { key: 'iperc', label: 'IPERC v1', icon: ShieldAlert, done: status.counts.iperBases > 0 },
    { key: 'aprobar', label: 'Aprobar', icon: CheckCircle2, done: status.counts.ipercVigentes > 0 },
  ]
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {items.map((it, i) => {
        const active = step === it.key
        const Icon = it.icon
        return (
          <div key={it.key} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                it.done
                  ? 'bg-emerald-50 text-emerald-800'
                  : active
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {it.done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span className="font-medium">{it.label}</span>
            </div>
            {i < items.length - 1 && <ArrowRight className="h-4 w-4 text-slate-300" />}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 0: Welcome ──────────────────────────────────────────────────────

function WelcomeStep({
  status,
  onStart,
}: {
  status: OnboardingStatus
  onStart: () => void
}) {
  return (
    <Card>
      <CardContent className="py-8">
        <div className="mx-auto max-w-2xl text-center">
          <Rocket className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="mt-4 text-xl font-semibold text-slate-900">
            Empecemos tu Sistema de Gestión SST
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            En menos de 10 minutos vas a tener registrada tu primera sede, un puesto de trabajo
            con su perfil de riesgos y una matriz IPERC oficial SUNAFIL (R.M. 050-2013-TR) lista
            para llenar con ayuda de la IA.
          </p>

          {/* Panorama actual */}
          <div className="mt-6 grid grid-cols-2 gap-3 text-left md:grid-cols-4">
            <PanoramaItem label="Sedes" value={status.counts.sedes} />
            <PanoramaItem label="Puestos" value={status.counts.puestos} />
            <PanoramaItem label="Matrices IPERC" value={status.counts.iperBases} />
            <PanoramaItem label="IPERC vigentes" value={status.counts.ipercVigentes} />
          </div>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Button onClick={onStart} size="lg">
              {status.counts.sedes === 0 ? 'Empezar' : 'Continuar onboarding'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Link href="/dashboard/sst" className="text-sm text-slate-600 hover:text-slate-800">
              Saltar al hub SST
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PanoramaItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}

// ── Step 1: Sede ─────────────────────────────────────────────────────────

interface SedeForm {
  nombre: string
  direccion: string
  ubigeo: string
  departamento: string
  provincia: string
  distrito: string
  tipoInstalacion: string
}

function SedeStep({
  onCreated,
  onSkip,
  puedeSaltar,
}: {
  onCreated: (id: string) => void
  onSkip: () => void
  puedeSaltar: boolean
}) {
  const [form, setForm] = useState<SedeForm>({
    nombre: '',
    direccion: '',
    ubigeo: '',
    departamento: '',
    provincia: '',
    distrito: '',
    tipoInstalacion: 'OFICINA',
  })
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/sst/sedes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail = json?.details?.fieldErrors
          ? Object.entries(json.details.fieldErrors)
              .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
              .join('. ')
          : json?.error || 'No se pudo crear la sede'
        toast.error(detail)
        return
      }
      onCreated(json.sede.id)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="py-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">Paso 1: Tu primera sede</h3>
          <p className="text-sm text-slate-600">
            Una sede es un centro de trabajo físico (oficina, planta, obra). Si tienes varias,
            empieza con la principal — agregarás las demás después.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nombre" required>
              <input
                required
                className="input"
                placeholder="Sede Lima Centro"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </Field>
            <Field label="Tipo de instalación" required>
              <select
                required
                className="input"
                value={form.tipoInstalacion}
                onChange={(e) => setForm({ ...form, tipoInstalacion: e.target.value })}
              >
                {TIPOS_INSTALACION.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Dirección" required>
            <input
              required
              className="input"
              placeholder="Av. Javier Prado 1234, San Isidro"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
          </Field>

          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Ubigeo INEI (6 dígitos)" required>
              <input
                required
                pattern="\d{6}"
                inputMode="numeric"
                maxLength={6}
                className="input"
                placeholder="150131"
                value={form.ubigeo}
                onChange={(e) => setForm({ ...form, ubigeo: e.target.value.replace(/\D/g, '') })}
              />
            </Field>
            <Field label="Departamento" required>
              <input
                required
                className="input"
                placeholder="Lima"
                value={form.departamento}
                onChange={(e) => setForm({ ...form, departamento: e.target.value })}
              />
            </Field>
            <Field label="Provincia" required>
              <input
                required
                className="input"
                placeholder="Lima"
                value={form.provincia}
                onChange={(e) => setForm({ ...form, provincia: e.target.value })}
              />
            </Field>
            <Field label="Distrito" required>
              <input
                required
                className="input"
                placeholder="San Isidro"
                value={form.distrito}
                onChange={(e) => setForm({ ...form, distrito: e.target.value })}
              />
            </Field>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            {puedeSaltar ? (
              <button
                type="button"
                onClick={onSkip}
                className="text-sm text-slate-600 hover:text-slate-800"
              >
                Usar la última sede registrada y saltar este paso →
              </button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear sede y continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>

        <FormStyles />
      </CardContent>
    </Card>
  )
}

// ── Step 2: Puesto ───────────────────────────────────────────────────────

interface PuestoForm {
  nombre: string
  descripcionTareas: string
  exposicionFisica: boolean
  exposicionQuimica: boolean
  exposicionBiologica: boolean
  exposicionErgonomica: boolean
  exposicionPsicosocial: boolean
  requiereAlturas: boolean
  requiereEspacioConfinado: boolean
  requiereCalienteFrio: boolean
  requiereSCTR: boolean
  requiereExposicionUVSolar: boolean
}

function PuestoStep({
  sedeId,
  onCreated,
  onBack,
}: {
  sedeId: string
  onCreated: (id: string) => void
  onBack: () => void
}) {
  const [form, setForm] = useState<PuestoForm>({
    nombre: '',
    descripcionTareas: '',
    exposicionFisica: false,
    exposicionQuimica: false,
    exposicionBiologica: false,
    exposicionErgonomica: false,
    exposicionPsicosocial: false,
    requiereAlturas: false,
    requiereEspacioConfinado: false,
    requiereCalienteFrio: false,
    requiereSCTR: false,
    requiereExposicionUVSolar: false,
  })
  const [submitting, setSubmitting] = useState(false)

  function toggle<K extends keyof PuestoForm>(key: K) {
    setForm((f) => ({ ...f, [key]: !f[key] } as PuestoForm))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const tareas = form.descripcionTareas
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      const payload = {
        sedeId,
        nombre: form.nombre.trim(),
        descripcionTareas: tareas,
        exposicionFisica: form.exposicionFisica,
        exposicionQuimica: form.exposicionQuimica,
        exposicionBiologica: form.exposicionBiologica,
        exposicionErgonomica: form.exposicionErgonomica,
        exposicionPsicosocial: form.exposicionPsicosocial,
        requiereAlturas: form.requiereAlturas,
        requiereEspacioConfinado: form.requiereEspacioConfinado,
        requiereCalienteFrio: form.requiereCalienteFrio,
        requiereSCTR: form.requiereSCTR,
        requiereExposicionUVSolar: form.requiereExposicionUVSolar,
      }
      const res = await fetch('/api/sst/puestos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json?.error || 'No se pudo crear el puesto')
        return
      }
      onCreated(json.puesto.id)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="py-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">Paso 2: Tu primer puesto</h3>
          <p className="text-sm text-slate-600">
            Marca las exposiciones que aplican al puesto. La IA usará esos flags para sugerir
            peligros relevantes en la matriz IPERC.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nombre del puesto" required>
            <input
              required
              className="input"
              placeholder="Operario de planta, Cajero, Soldador..."
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </Field>

          <Field label="Tareas que realiza (una por línea)">
            <textarea
              rows={3}
              className="input"
              placeholder={'Operación de torno\nMantenimiento preventivo'}
              value={form.descripcionTareas}
              onChange={(e) => setForm({ ...form, descripcionTareas: e.target.value })}
            />
          </Field>

          <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
            <legend className="px-2 text-xs font-medium text-slate-700">
              Exposiciones SST (marca todas las que apliquen)
            </legend>
            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
              <Check label="Físico (ruido, vibración, calor...)" checked={form.exposicionFisica} onClick={() => toggle('exposicionFisica')} />
              <Check label="Químico" checked={form.exposicionQuimica} onClick={() => toggle('exposicionQuimica')} />
              <Check label="Biológico" checked={form.exposicionBiologica} onClick={() => toggle('exposicionBiologica')} />
              <Check label="Ergonómico" checked={form.exposicionErgonomica} onClick={() => toggle('exposicionErgonomica')} />
              <Check label="Psicosocial" checked={form.exposicionPsicosocial} onClick={() => toggle('exposicionPsicosocial')} />
              <Check label="Trabajos en altura" checked={form.requiereAlturas} onClick={() => toggle('requiereAlturas')} />
              <Check label="Espacios confinados" checked={form.requiereEspacioConfinado} onClick={() => toggle('requiereEspacioConfinado')} />
              <Check label="Calor / frío" checked={form.requiereCalienteFrio} onClick={() => toggle('requiereCalienteFrio')} />
              <Check label="SCTR (Anexo 5)" checked={form.requiereSCTR} onClick={() => toggle('requiereSCTR')} />
              <Check label="UV solar (Ley 30102)" checked={form.requiereExposicionUVSolar} onClick={() => toggle('requiereExposicionUVSolar')} />
            </div>
          </fieldset>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button type="button" onClick={onBack} className="text-sm text-slate-600 hover:text-slate-800">
              ← Atrás
            </button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear puesto y continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>

        <FormStyles />
      </CardContent>
    </Card>
  )
}

// ── Step 3: IPERC ────────────────────────────────────────────────────────

function IpercStep({
  sedeId,
  puestoIdActual,
  onCreated,
  onBack,
}: {
  sedeId: string
  puestoIdActual: string | null
  onCreated: (ipercId: string) => void
  onBack: () => void
}) {
  const [creating, setCreating] = useState(false)

  async function crear() {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/sst/iperc-bases', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sedeId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json?.error || 'No se pudo crear la matriz IPERC')
        return
      }
      onCreated(json.base.id)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Card>
      <CardContent className="py-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">Paso 3: Matriz IPERC v1</h3>
          <p className="text-sm text-slate-600">
            Vamos a crear la primera versión en estado <strong>Borrador</strong>. Después podrás
            llenarla con sugerencias de IA basadas en el puesto que acabas de crear, o agregar
            filas manualmente.
          </p>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-900">
                ¿Qué pasa cuando creas la matriz?
              </p>
              <ul className="mt-2 list-inside list-disc text-xs text-emerald-800">
                <li>Se crea la versión 1 con hash SHA-256 (audit trail criptográfico).</li>
                <li>Te llevamos al editor para llenarla con la IA o manualmente.</li>
                <li>El motor SUNAFIL (R.M. 050-2013-TR) calcula los niveles de riesgo.</li>
                <li>Cuando esté lista la apruebas y queda <strong>Vigente</strong> + bloqueada para auditoría.</li>
              </ul>
            </div>
          </div>
        </div>

        {puestoIdActual && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Puesto creado en el paso anterior; la IA podrá usarlo para sugerencias.
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          <button type="button" onClick={onBack} className="text-sm text-slate-600 hover:text-slate-800">
            ← Atrás
          </button>
          <Button onClick={crear} disabled={creating} size="lg">
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
            Crear matriz IPERC y abrir editor
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Step Done ────────────────────────────────────────────────────────────

function DoneStep({ status }: { status: OnboardingStatus }) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
        <h2 className="mt-4 text-xl font-semibold text-slate-900">¡Onboarding SST completado!</h2>
        <p className="mt-2 text-sm text-slate-600">
          Tu SGSST está activo con {status.counts.sedes} sede{status.counts.sedes === 1 ? '' : 's'},{' '}
          {status.counts.puestos} puesto{status.counts.puestos === 1 ? '' : 's'} y{' '}
          {status.counts.ipercVigentes} matriz{status.counts.ipercVigentes === 1 ? '' : 'es'} IPERC vigente
          {status.counts.ipercVigentes === 1 ? '' : 's'}.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard/sst">
            <Button>
              Ir al hub SST
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard/sst/sedes">
            <Button variant="secondary">Ver mis sedes</Button>
          </Link>
        </div>

        <div className="mt-8 grid gap-3 text-left md:grid-cols-3">
          <NextStepCard
            title="Registra accidentes"
            desc="Cuando ocurra un accidente, regístralo y notifícalo al SAT manualmente."
            href="/dashboard/sst"
          />
          <NextStepCard
            title="Configura el Comité SST"
            desc="Si tienes ≥20 trabajadores, registra los miembros del Comité paritario."
            href="/dashboard/sst"
          />
          <NextStepCard
            title="Programa capacitaciones"
            desc="4 capacitaciones SST al año por trabajador (Ley 29783, Art. 35.b)."
            href="/dashboard/sst"
          />
        </div>
      </CardContent>
    </Card>
  )
}

function NextStepCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm"
    >
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <p className="mt-1 text-xs text-slate-600">{desc}</p>
      <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
        Ver más <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  )
}

// ── Helpers de form ──────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  )
}

function Check({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={onClick}
        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
      />
      <span>{label}</span>
    </label>
  )
}

function FormStyles() {
  return (
    <style jsx>{`
      .input {
        width: 100%;
        border-radius: 0.5rem;
        border: 1px solid rgb(226 232 240);
        background: white;
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
        color: rgb(15 23 42);
      }
      .input:focus {
        outline: none;
        border-color: rgb(16 185 129);
        box-shadow: 0 0 0 3px rgb(16 185 129 / 0.15);
      }
    `}</style>
  )
}
