'use client'

import { useEffect, useState } from 'react'
import {
  Loader2,
  AlertCircle,
  Save,
  Plus,
  Trash2,
  Calendar,
  Target,
  Banknote,
  Download,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

type Area =
  | 'IPERC'
  | 'CAPACITACION'
  | 'INSPECCION'
  | 'EMO'
  | 'SIMULACRO'
  | 'AUDITORIA'
  | 'COMITE'
  | 'OTRO'

interface Actividad {
  id: string
  titulo: string
  area: Area
  mes: number
  responsable?: string | null
  estado: 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA'
  notas?: string | null
}

interface Plan {
  ano: number
  objetivos: string[]
  actividades: Actividad[]
  presupuestoSoles?: number | null
}

const AREA_LABEL: Record<Area, string> = {
  IPERC: 'IPERC',
  CAPACITACION: 'Capacitación',
  INSPECCION: 'Inspección',
  EMO: 'Examen Médico',
  SIMULACRO: 'Simulacro',
  AUDITORIA: 'Auditoría',
  COMITE: 'Comité SST',
  OTRO: 'Otro',
}

const AREA_VARIANT: Record<Area, 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  IPERC: 'danger',
  CAPACITACION: 'info',
  INSPECCION: 'warning',
  EMO: 'success',
  SIMULACRO: 'warning',
  AUDITORIA: 'info',
  COMITE: 'success',
  OTRO: 'neutral',
}

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export default function PlanAnualPage() {
  const currentYear = new Date().getFullYear()
  const [ano, setAno] = useState(currentYear)
  const [plan, setPlan] = useState<Plan>({
    ano: currentYear,
    objetivos: [],
    actividades: [],
    presupuestoSoles: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  async function load(year: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/sst/plan-anual?ano=${year}`, { cache: 'no-store' })
      if (!res.ok) {
        toast.error('No se pudo cargar el plan')
        return
      }
      const j = await res.json()
      if (j.plan) {
        setPlan(j.plan)
      } else {
        setPlan({ ano: year, objetivos: [], actividades: [], presupuestoSoles: null })
      }
      setDirty(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(ano)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano])

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/sst/plan-anual', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(plan),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(j?.error || 'No se pudo guardar')
        return
      }
      toast.success('Plan guardado')
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  function update<K extends keyof Plan>(key: K, value: Plan[K]) {
    setPlan((p) => ({ ...p, [key]: value }))
    setDirty(true)
  }

  function addObjetivo() {
    update('objetivos', [...plan.objetivos, ''])
  }
  function delObjetivo(i: number) {
    update('objetivos', plan.objetivos.filter((_, idx) => idx !== i))
  }
  function setObjetivo(i: number, v: string) {
    update('objetivos', plan.objetivos.map((o, idx) => (idx === i ? v : o)))
  }

  function addActividad() {
    update('actividades', [
      ...plan.actividades,
      {
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        titulo: '',
        area: 'CAPACITACION',
        mes: new Date().getMonth() + 1,
        estado: 'PENDIENTE',
      },
    ])
  }
  function delActividad(id: string) {
    update('actividades', plan.actividades.filter((a) => a.id !== id))
  }
  function patchActividad(id: string, patch: Partial<Actividad>) {
    update(
      'actividades',
      plan.actividades.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    )
  }

  // Stats
  const total = plan.actividades.length
  const completadas = plan.actividades.filter((a) => a.estado === 'COMPLETADA').length
  const pct = total > 0 ? Math.round((completadas / total) * 100) : 0
  const porMes = MESES.map((_, m) => plan.actividades.filter((a) => a.mes === m + 1).length)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SST · Planificación"
        title="Plan Anual SST"
        subtitle="Ley 29783 Art. 38 obliga a documentar el Plan Anual SST con objetivos, actividades por mes, responsables y presupuesto."
        actions={
          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            {dirty && <Badge variant="warning">Sin guardar</Badge>}
            <a
              href={`/api/sst/plan-anual/pdf?ano=${ano}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="ghost" disabled={dirty}>
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF
              </Button>
            </a>
            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando plan...
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-3 md:grid-cols-4">
            <Card>
              <CardContent className="py-4">
                <div className="text-xs text-slate-500">Actividades</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="text-xs text-slate-500">Completadas</div>
                <div className="mt-1 text-2xl font-semibold text-emerald-700">{completadas}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="text-xs text-slate-500">Avance</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{pct}%</div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                  <div
                    className="h-1.5 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="text-xs text-slate-500">Presupuesto S/</div>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  className="mt-1 w-full bg-transparent text-2xl font-semibold text-slate-900 outline-none"
                  value={plan.presupuestoSoles ?? ''}
                  placeholder="0"
                  onChange={(e) =>
                    update(
                      'presupuestoSoles',
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                />
              </CardContent>
            </Card>
          </div>

          {/* Heatmap por mes */}
          <Card>
            <CardContent className="py-5">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
                <Calendar className="h-4 w-4 text-emerald-600" />
                Cronograma {ano}
              </h2>
              <div className="grid grid-cols-12 gap-1">
                {MESES.map((m, i) => {
                  const count = porMes[i]
                  const intensity = count === 0 ? 0 : Math.min(count / 3, 1)
                  return (
                    <div
                      key={m}
                      className="rounded p-2 text-center"
                      style={{
                        backgroundColor: `rgba(16, 185, 129, ${0.1 + intensity * 0.6})`,
                      }}
                    >
                      <div className="text-[10px] text-slate-700">{m.slice(0, 3)}</div>
                      <div className="text-sm font-bold text-slate-900">{count}</div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Objetivos */}
          <Card>
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <Target className="h-4 w-4 text-emerald-600" />
                  Objetivos del año
                </h2>
                <Button size="sm" variant="secondary" onClick={addObjetivo}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar objetivo
                </Button>
              </div>
              {plan.objetivos.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  Sin objetivos aún. Agrega los objetivos SMART del año (ej: &ldquo;Reducir
                  accidentes en 30%&rdquo;, &ldquo;Capacitar al 100% en SST&rdquo;).
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {plan.objetivos.map((o, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">{i + 1}.</span>
                      <input
                        type="text"
                        className="flex-1 rounded border border-slate-200 bg-white px-3 py-1.5 text-sm"
                        placeholder="Reducir índice de accidentabilidad en 30%"
                        value={o}
                        maxLength={300}
                        onChange={(e) => setObjetivo(i, e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => delObjetivo(i)}
                        className="text-rose-600 hover:text-rose-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Actividades */}
          <Card>
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  Actividades programadas
                </h2>
                <Button size="sm" onClick={addActividad}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva actividad
                </Button>
              </div>

              {plan.actividades.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/40 py-10 text-center text-sm text-slate-500">
                  Aún no hay actividades programadas. Agrega capacitaciones, inspecciones,
                  simulacros, etc.
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {[...plan.actividades]
                    .sort((a, b) => a.mes - b.mes || a.titulo.localeCompare(b.titulo))
                    .map((act) => (
                      <div
                        key={act.id}
                        className="grid items-center gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_120px_140px_140px_auto]"
                      >
                        <input
                          type="text"
                          className="rounded border border-slate-200 bg-white px-2 py-1.5 text-sm"
                          placeholder="Título de la actividad"
                          value={act.titulo}
                          maxLength={200}
                          onChange={(e) => patchActividad(act.id, { titulo: e.target.value })}
                        />
                        <select
                          className="rounded border border-slate-200 bg-white px-2 py-1.5 text-sm"
                          value={act.area}
                          onChange={(e) =>
                            patchActividad(act.id, { area: e.target.value as Area })
                          }
                        >
                          {(Object.keys(AREA_LABEL) as Area[]).map((a) => (
                            <option key={a} value={a}>
                              {AREA_LABEL[a]}
                            </option>
                          ))}
                        </select>
                        <select
                          className="rounded border border-slate-200 bg-white px-2 py-1.5 text-sm"
                          value={act.mes}
                          onChange={(e) =>
                            patchActividad(act.id, { mes: Number(e.target.value) })
                          }
                        >
                          {MESES.map((m, i) => (
                            <option key={m} value={i + 1}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <select
                          className="rounded border border-slate-200 bg-white px-2 py-1.5 text-sm"
                          value={act.estado}
                          onChange={(e) =>
                            patchActividad(act.id, {
                              estado: e.target.value as Actividad['estado'],
                            })
                          }
                        >
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="EN_CURSO">En curso</option>
                          <option value="COMPLETADA">Completada</option>
                        </select>
                        <div className="flex items-center gap-2">
                          <Badge variant={AREA_VARIANT[act.area]} size="xs">
                            {AREA_LABEL[act.area]}
                          </Badge>
                          <button
                            type="button"
                            onClick={() => delActividad(act.id)}
                            className="text-rose-600 hover:text-rose-700"
                            aria-label="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardContent className="flex items-start gap-2 py-3 text-xs text-emerald-900">
              <Banknote className="mt-0.5 h-3.5 w-3.5" />
              <span>
                El Plan Anual debe ser aprobado por el Comité SST y exhibido en lugar visible
                (Ley 29783 Art. 38). El cumplimiento mensual se reporta a la Memoria Anual.
              </span>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
