'use client'

import { useEffect, useState } from 'react'
import {
  Loader2,
  Save,
  Download,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Plus,
  Trash2,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

interface Indicadores {
  accidentesMortales: number
  accidentesNoMortales: number
  incidentesPeligrosos: number
  enfermedadesOcupacionales: number
  diasPerdidos: number
  indiceFrecuencia: number
  indiceGravedad: number
  indiceAccidentabilidad: number
  capacitacionesRealizadas: number
  capacitacionesPlanificadas: number
  simulacrosRealizados: number
  visitasFieldAudit: number
}

interface ActividadCumplimiento {
  actividad: string
  planificada: boolean
  ejecutada: boolean
  observaciones?: string | null
}

interface Memoria {
  ano: number
  resumenEjecutivo?: string | null
  cumplimientoPorcentaje?: number | null
  indicadores: Indicadores
  cumplimientoActividades: ActividadCumplimiento[]
  conclusiones?: string | null
  recomendacionesProximoAno: string[]
}

interface PlanActividad {
  id: string
  titulo: string
  area: string
  mes: number
  estado: 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA'
}

interface ApiResponse {
  ano: number
  existe: boolean
  memoria: Memoria | null
  plan: { actividades?: PlanActividad[] } | null
  indicadoresAutomaticos: Partial<Indicadores>
  workersActivos: number
}

const INDICADORES_VACIOS: Indicadores = {
  accidentesMortales: 0,
  accidentesNoMortales: 0,
  incidentesPeligrosos: 0,
  enfermedadesOcupacionales: 0,
  diasPerdidos: 0,
  indiceFrecuencia: 0,
  indiceGravedad: 0,
  indiceAccidentabilidad: 0,
  capacitacionesRealizadas: 0,
  capacitacionesPlanificadas: 0,
  simulacrosRealizados: 0,
  visitasFieldAudit: 0,
}

export default function MemoriaAnualPage() {
  const currentYear = new Date().getFullYear()
  const [ano, setAno] = useState(currentYear - 1)
  const [memoria, setMemoria] = useState<Memoria>({
    ano: currentYear - 1,
    resumenEjecutivo: '',
    indicadores: INDICADORES_VACIOS,
    cumplimientoActividades: [],
    conclusiones: '',
    recomendacionesProximoAno: [],
  })
  const [autoIndicadores, setAutoIndicadores] = useState<Partial<Indicadores>>({})
  const [planActividades, setPlanActividades] = useState<PlanActividad[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  async function load(year: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/sst/memoria-anual?ano=${year}`, { cache: 'no-store' })
      if (!res.ok) {
        toast.error('No se pudo cargar la memoria')
        return
      }
      const j = (await res.json()) as ApiResponse
      setAutoIndicadores(j.indicadoresAutomaticos)
      setPlanActividades(j.plan?.actividades ?? [])

      if (j.memoria) {
        setMemoria(j.memoria)
      } else {
        // Inicializar con auto-indicadores y actividades del plan
        setMemoria({
          ano: year,
          resumenEjecutivo: '',
          indicadores: { ...INDICADORES_VACIOS, ...j.indicadoresAutomaticos },
          cumplimientoActividades: (j.plan?.actividades ?? []).map((a) => ({
            actividad: `${a.titulo} (${a.area})`,
            planificada: true,
            ejecutada: a.estado === 'COMPLETADA',
          })),
          conclusiones: '',
          recomendacionesProximoAno: [],
        })
      }
      setDirty(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      load(ano)
    })
    return () => {
      cancelled = true
    }
  }, [ano])

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/sst/memoria-anual', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(memoria),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(j?.error || 'No se pudo guardar')
        return
      }
      toast.success('Memoria guardada')
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  function updateIndicador<K extends keyof Indicadores>(key: K, value: number) {
    setMemoria((m) => ({ ...m, indicadores: { ...m.indicadores, [key]: value } }))
    setDirty(true)
  }

  function importarAutoIndicadores() {
    setMemoria((m) => ({
      ...m,
      indicadores: { ...m.indicadores, ...autoIndicadores },
    }))
    setDirty(true)
    toast.success('Indicadores automáticos importados')
  }

  function toggleActividad(idx: number) {
    setMemoria((m) => ({
      ...m,
      cumplimientoActividades: m.cumplimientoActividades.map((a, i) =>
        i === idx ? { ...a, ejecutada: !a.ejecutada } : a,
      ),
    }))
    setDirty(true)
  }

  function addRecomendacion() {
    setMemoria((m) => ({
      ...m,
      recomendacionesProximoAno: [...m.recomendacionesProximoAno, ''],
    }))
    setDirty(true)
  }

  function setRecomendacion(i: number, v: string) {
    setMemoria((m) => ({
      ...m,
      recomendacionesProximoAno: m.recomendacionesProximoAno.map((x, idx) =>
        idx === i ? v : x,
      ),
    }))
    setDirty(true)
  }

  function delRecomendacion(i: number) {
    setMemoria((m) => ({
      ...m,
      recomendacionesProximoAno: m.recomendacionesProximoAno.filter((_, idx) => idx !== i),
    }))
    setDirty(true)
  }

  const totalActividades = memoria.cumplimientoActividades.length
  const totalEjecutadas = memoria.cumplimientoActividades.filter((a) => a.ejecutada).length
  const cumplimientoPct =
    totalActividades > 0 ? Math.round((totalEjecutadas / totalActividades) * 100) : 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SST · Rendición anual"
        title="Memoria Anual SST"
        subtitle="Ley 29783 · Cierre del ejercicio anual del SGSST. Reporta indicadores OIT, cumplimiento del plan y recomendaciones para el próximo año."
        actions={
          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
            >
              {[currentYear - 2, currentYear - 1, currentYear].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            {dirty && <Badge variant="warning">Sin guardar</Badge>}
            <a
              href={`/api/sst/memoria-anual/pdf?ano=${ano}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary">
                <Download className="mr-2 h-4 w-4" />
                PDF
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
          Cargando...
        </div>
      ) : (
        <>
          {/* Header summary */}
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardContent className="py-4">
                <div className="text-xs text-slate-500">Cumplimiento del Plan</div>
                <div className="mt-1 text-3xl font-bold text-emerald-700">{cumplimientoPct}%</div>
                <div className="text-xs text-slate-500">
                  {totalEjecutadas} de {totalActividades} actividades
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="text-xs text-slate-500">Accidentes mortales</div>
                <div
                  className={`mt-1 text-3xl font-bold ${
                    memoria.indicadores.accidentesMortales > 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {memoria.indicadores.accidentesMortales}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="text-xs text-slate-500">Índice de frecuencia</div>
                <div className="mt-1 text-3xl font-bold text-slate-900">
                  {memoria.indicadores.indiceFrecuencia.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500">por millón hh trabajadas</div>
              </CardContent>
            </Card>
          </div>

          {/* Resumen ejecutivo */}
          <Card>
            <CardContent className="py-5">
              <h2 className="mb-3 text-base font-semibold text-slate-900">
                1. Resumen ejecutivo
              </h2>
              <textarea
                rows={4}
                maxLength={5000}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder={`Síntesis del año ${ano}: principales logros, retos y eventos relevantes en seguridad y salud en el trabajo.`}
                value={memoria.resumenEjecutivo ?? ''}
                onChange={(e) => {
                  setMemoria((m) => ({ ...m, resumenEjecutivo: e.target.value }))
                  setDirty(true)
                }}
              />
            </CardContent>
          </Card>

          {/* Indicadores */}
          <Card>
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  2. Indicadores SST (estándar OIT)
                </h2>
                {Object.keys(autoIndicadores).length > 0 && (
                  <Button size="sm" variant="secondary" onClick={importarAutoIndicadores}>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Importar automáticos del sistema
                  </Button>
                )}
              </div>

              {Object.keys(autoIndicadores).length > 0 && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 text-xs text-emerald-900">
                  <p className="font-medium">Indicadores calculados automáticamente:</p>
                  <ul className="mt-1 list-inside list-disc">
                    {autoIndicadores.accidentesMortales !== undefined && (
                      <li>Accidentes mortales: {autoIndicadores.accidentesMortales}</li>
                    )}
                    {autoIndicadores.accidentesNoMortales !== undefined && (
                      <li>Accidentes no mortales: {autoIndicadores.accidentesNoMortales}</li>
                    )}
                    {autoIndicadores.indiceFrecuencia !== undefined && (
                      <li>
                        Índice frecuencia: {autoIndicadores.indiceFrecuencia.toFixed(2)} por
                        millón hh
                      </li>
                    )}
                    {autoIndicadores.visitasFieldAudit !== undefined && (
                      <li>Visitas Field Audit cerradas: {autoIndicadores.visitasFieldAudit}</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <IndicadorInput
                  label="Accidentes mortales"
                  value={memoria.indicadores.accidentesMortales}
                  onChange={(v) => updateIndicador('accidentesMortales', v)}
                />
                <IndicadorInput
                  label="Accidentes no mortales"
                  value={memoria.indicadores.accidentesNoMortales}
                  onChange={(v) => updateIndicador('accidentesNoMortales', v)}
                />
                <IndicadorInput
                  label="Incidentes peligrosos"
                  value={memoria.indicadores.incidentesPeligrosos}
                  onChange={(v) => updateIndicador('incidentesPeligrosos', v)}
                />
                <IndicadorInput
                  label="Enfermedades ocupacionales"
                  value={memoria.indicadores.enfermedadesOcupacionales}
                  onChange={(v) => updateIndicador('enfermedadesOcupacionales', v)}
                />
                <IndicadorInput
                  label="Días perdidos"
                  value={memoria.indicadores.diasPerdidos}
                  onChange={(v) => updateIndicador('diasPerdidos', v)}
                />
                <IndicadorInput
                  label="Índice frecuencia"
                  value={memoria.indicadores.indiceFrecuencia}
                  onChange={(v) => updateIndicador('indiceFrecuencia', v)}
                  step={0.01}
                />
                <IndicadorInput
                  label="Índice gravedad"
                  value={memoria.indicadores.indiceGravedad}
                  onChange={(v) => updateIndicador('indiceGravedad', v)}
                  step={0.01}
                />
                <IndicadorInput
                  label="Índice accidentabilidad"
                  value={memoria.indicadores.indiceAccidentabilidad}
                  onChange={(v) => updateIndicador('indiceAccidentabilidad', v)}
                  step={0.01}
                />
                <IndicadorInput
                  label="Capacitaciones realizadas"
                  value={memoria.indicadores.capacitacionesRealizadas}
                  onChange={(v) => updateIndicador('capacitacionesRealizadas', v)}
                />
                <IndicadorInput
                  label="Capacitaciones planificadas"
                  value={memoria.indicadores.capacitacionesPlanificadas}
                  onChange={(v) => updateIndicador('capacitacionesPlanificadas', v)}
                />
                <IndicadorInput
                  label="Simulacros realizados"
                  value={memoria.indicadores.simulacrosRealizados}
                  onChange={(v) => updateIndicador('simulacrosRealizados', v)}
                />
                <IndicadorInput
                  label="Visitas Field Audit"
                  value={memoria.indicadores.visitasFieldAudit}
                  onChange={(v) => updateIndicador('visitasFieldAudit', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cumplimiento de actividades */}
          <Card>
            <CardContent className="py-5">
              <h2 className="text-base font-semibold text-slate-900">
                3. Cumplimiento del Plan Anual
              </h2>
              {memoria.cumplimientoActividades.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/40 py-6 text-center text-sm text-slate-500">
                  No hay actividades del plan anual para reportar.{' '}
                  {planActividades.length === 0 && (
                    <>
                      Crea primero el plan anual para que aparezcan aquí las actividades a evaluar.
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-4 max-h-96 space-y-1 overflow-y-auto">
                  {memoria.cumplimientoActividades.map((act, idx) => (
                    <label
                      key={idx}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={act.ejecutada}
                        onChange={() => toggleActividad(idx)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className={`flex-1 text-sm ${act.ejecutada ? 'text-slate-900' : 'text-slate-600'}`}>
                        {act.actividad}
                      </span>
                      {act.ejecutada ? (
                        <Badge variant="success" size="xs">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Ejecutada
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="xs">
                          Pendiente
                        </Badge>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conclusiones */}
          <Card>
            <CardContent className="py-5">
              <h2 className="mb-3 text-base font-semibold text-slate-900">4. Conclusiones</h2>
              <textarea
                rows={4}
                maxLength={5000}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="¿Qué aprendimos? ¿Qué funcionó? ¿Qué falló?"
                value={memoria.conclusiones ?? ''}
                onChange={(e) => {
                  setMemoria((m) => ({ ...m, conclusiones: e.target.value }))
                  setDirty(true)
                }}
              />
            </CardContent>
          </Card>

          {/* Recomendaciones próximo año */}
          <Card>
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  5. Recomendaciones para {ano + 1}
                </h2>
                <Button size="sm" variant="secondary" onClick={addRecomendacion}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar
                </Button>
              </div>
              {memoria.recomendacionesProximoAno.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  Sin recomendaciones registradas. Estas alimentan el Plan Anual del próximo
                  año.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {memoria.recomendacionesProximoAno.map((r, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">{i + 1}.</span>
                      <input
                        type="text"
                        className="flex-1 rounded border border-slate-200 bg-white px-3 py-1.5 text-sm"
                        placeholder="Acción recomendada para el próximo periodo"
                        maxLength={300}
                        value={r}
                        onChange={(e) => setRecomendacion(i, e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => delRecomendacion(i)}
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

          <Card className="border-amber-200 bg-amber-50/40">
            <CardContent className="flex items-start gap-2 py-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
              <span>
                La Memoria Anual debe ser presentada al Comité SST para su aprobación y archivada
                como parte del SGSST. Imprime el PDF, fírmalo y guárdalo en el libro de actas.
              </span>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function IndicadorInput({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-600">{label}</span>
      <input
        type="number"
        min={0}
        step={step}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
