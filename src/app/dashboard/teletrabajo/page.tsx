'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Laptop2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Save,
  ShieldCheck,
} from 'lucide-react'

interface Summary {
  totalLogs: number
  totalHoras: number
  trabajadoresActivos: number
  logsFueraDeHorario: number
  porcentajeFueraDeHorario: number
  totalReembolsosPendientes: number
  totalReembolsosPagados: number
  policyConfigurada: boolean
  cumplimientoLey31572: number
}

interface Policy {
  horaDesconexionInicio: string
  horaDesconexionFin: string
  diasNoLaborables: number[]
  textoPolitica: string
  bloqueoAutomatico: boolean
}

const DIAS = [
  { idx: 0, label: 'Dom' },
  { idx: 1, label: 'Lun' },
  { idx: 2, label: 'Mar' },
  { idx: 3, label: 'Mié' },
  { idx: 4, label: 'Jue' },
  { idx: 5, label: 'Vie' },
  { idx: 6, label: 'Sáb' },
]

export default function TeletrabajoPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sumRes, polRes] = await Promise.all([
        fetch('/api/teletrabajo/summary'),
        fetch('/api/teletrabajo/policy'),
      ])
      if (sumRes.ok) setSummary(await sumRes.json())
      if (polRes.ok) {
        const data = await polRes.json()
        setPolicy(
          data.policy || {
            horaDesconexionInicio: '20:00',
            horaDesconexionFin: '08:00',
            diasNoLaborables: [0, 6],
            textoPolitica:
              'En cumplimiento del Art. 11 de la Ley 31572, esta organización reconoce el derecho a la desconexión digital. Fuera de la jornada de trabajo, los trabajadores no están obligados a responder comunicaciones laborales.',
            bloqueoAutomatico: true,
          }
        )
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) void load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

  async function savePolicy() {
    if (!policy) return
    setSaving(true)
    try {
      const res = await fetch('/api/teletrabajo/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      })
      if (res.ok) {
        setSavedAt(new Date().toLocaleTimeString('es-PE'))
        await load()
      }
    } finally {
      setSaving(false)
    }
  }

  function toggleDia(idx: number) {
    if (!policy) return
    const next = policy.diasNoLaborables.includes(idx)
      ? policy.diasNoLaborables.filter(d => d !== idx)
      : [...policy.diasNoLaborables, idx].sort()
    setPolicy({ ...policy, diasNoLaborables: next })
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-gold-500/10 p-3">
          <Laptop2 className="h-7 w-7 text-gold-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Teletrabajo</h1>
            <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-xs font-semibold text-gold-400">
              Ley 31572
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Cumple con las obligaciones del empleador en modalidad teletrabajo: registro de
            jornada digital, política de desconexión digital y reembolso de costos asumidos.
            SUNAFIL fiscaliza activamente desde 2024.
          </p>
        </div>
      </div>

      {/* KPIs */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="Cumplimiento Ley 31572"
            value={`${summary.cumplimientoLey31572}/100`}
            icon={<ShieldCheck className="h-5 w-5 text-gold-500" />}
            color={
              summary.cumplimientoLey31572 >= 80
                ? 'text-green-400'
                : summary.cumplimientoLey31572 >= 50
                  ? 'text-yellow-400'
                  : 'text-red-400'
            }
          />
          <Kpi
            label="Horas registradas"
            value={summary.totalHoras.toString()}
            icon={<Clock className="h-5 w-5 text-gold-500" />}
          />
          <Kpi
            label="Trabajadores activos"
            value={summary.trabajadoresActivos.toString()}
            icon={<Laptop2 className="h-5 w-5 text-gold-500" />}
          />
          <Kpi
            label="Logs fuera de horario"
            value={`${summary.logsFueraDeHorario} (${summary.porcentajeFueraDeHorario}%)`}
            icon={<AlertTriangle className="h-5 w-5 text-orange-400" />}
            color={summary.porcentajeFueraDeHorario > 5 ? 'text-orange-400' : 'text-green-400'}
          />
        </div>
      )}

      {/* Política */}
      {policy && (
        <div className="rounded-2xl border border-slate-800 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Política de desconexión digital
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-400">
                Hora inicio desconexión
              </span>
              <input
                type="time"
                value={policy.horaDesconexionInicio}
                onChange={e => setPolicy({ ...policy, horaDesconexionInicio: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-400">
                Hora fin desconexión
              </span>
              <input
                type="time"
                value={policy.horaDesconexionFin}
                onChange={e => setPolicy({ ...policy, horaDesconexionFin: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-4">
            <span className="mb-2 block text-xs font-medium text-slate-400">
              Días no laborables
            </span>
            <div className="flex gap-2">
              {DIAS.map(d => {
                const active = policy.diasNoLaborables.includes(d.idx)
                return (
                  <button
                    key={d.idx}
                    type="button"
                    onClick={() => toggleDia(d.idx)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'border-gold-500 bg-gold-500/15 text-gold-300'
                        : 'border-slate-700 text-slate-400 hover:border-[color:var(--border-default)]'
                    }`}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
          </div>

          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-medium text-slate-400">
              Texto de la política
            </span>
            <textarea
              value={policy.textoPolitica}
              onChange={e => setPolicy({ ...policy, textoPolitica: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none"
            />
          </label>

          <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={policy.bloqueoAutomatico}
              onChange={e => setPolicy({ ...policy, bloqueoAutomatico: e.target.checked })}
              className="rounded border-[color:var(--border-default)] bg-slate-950"
            />
            Bloquear notificaciones automáticamente fuera del horario
          </label>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={savePolicy}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-gold-400 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Guardar política
                </>
              )}
            </button>
            {savedAt && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle2 className="h-3 w-3" /> Guardado a las {savedAt}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Resumen reembolsos */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-white p-6">
            <p className="text-xs uppercase text-slate-500">Reembolsos pendientes</p>
            <p className="mt-2 text-3xl font-bold text-orange-400">
              S/ {summary.totalReembolsosPendientes.toLocaleString('es-PE')}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Internet, electricidad y equipos asumidos por el trabajador
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-white p-6">
            <p className="text-xs uppercase text-slate-500">Reembolsos pagados</p>
            <p className="mt-2 text-3xl font-bold text-green-400">
              S/ {summary.totalReembolsosPagados.toLocaleString('es-PE')}
            </p>
            <p className="mt-1 text-xs text-slate-500">Total acumulado en el ejercicio actual</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gold-500/30 bg-gold-500/5 p-5 text-xs text-slate-300">
        <p>
          <b className="text-gold-400">Recordatorio Ley 31572:</b> el empleador debe (1) registrar
          la jornada digital del teletrabajador a su costo, (2) reconocer expresamente el derecho
          a la desconexión digital en política escrita, y (3) compensar los gastos asumidos por el
          trabajador (internet, electricidad, etc.) salvo pacto en contrario. SUNAFIL fiscaliza
          activamente y la multa puede llegar a 52 UIT (S/286,000) en caso muy grave.
        </p>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
  color = 'text-white',
}: {
  label: string
  value: string
  icon: React.ReactNode
  color?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-white p-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase text-slate-500">{label}</p>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
