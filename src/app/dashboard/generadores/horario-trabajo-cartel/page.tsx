'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GeneratorShell } from '@/components/generadores/generator-shell'
import type { HorarioCartelParams, TurnoHorario } from '@/lib/generators/horario-trabajo-cartel'

export default function HorarioTrabajoCartelPage() {
  return (
    <GeneratorShell
      type="horario-trabajo-cartel"
      title="Cartel de Horario de Trabajo"
      description="Cartel obligatorio para exhibir en el centro de trabajo (Art. 5 D.S. 004-2006-TR). Agregá uno o más turnos; el sistema genera un cartel A3 listo para imprimir."
      baseLegal="D.S. 004-2006-TR, Art. 5"
      gravity="LEVE"
      estimatedMinutes={3}
      renderForm={({ onSubmit, loading }) => <Form onSubmit={onSubmit} loading={loading} />}
    />
  )
}

interface TurnoRow extends TurnoHorario {
  id: string
}

function createTurno(): TurnoRow {
  return {
    id: `t-${Math.random().toString(36).slice(2, 8)}`,
    nombre: 'Administrativo',
    horaIngreso: '08:00',
    horaSalida: '17:00',
    dias: 'Lunes a Viernes',
    minutosRefrigerio: 60,
  }
}

function Form({ onSubmit, loading }: { onSubmit: (p: unknown) => void | Promise<void>; loading: boolean }) {
  const [fechaVigencia, setFechaVigencia] = useState(new Date().toISOString().slice(0, 10))
  const [turnos, setTurnos] = useState<TurnoRow[]>([createTurno()])
  const [observaciones, setObservaciones] = useState('')

  function update(id: string, field: keyof TurnoRow, value: string | number) {
    setTurnos((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)))
  }
  function add() {
    setTurnos((prev) => [...prev, createTurno()])
  }
  function remove(id: string) {
    setTurnos((prev) => (prev.length > 1 ? prev.filter((t) => t.id !== id) : prev))
  }

  const canSubmit = turnos.every((t) => t.nombre.trim() && t.horaIngreso && t.horaSalida)

  function submit() {
    const params: HorarioCartelParams = {
      fechaVigencia,
      turnos: turnos.map((t) => ({
        nombre: t.nombre.trim(),
        horaIngreso: t.horaIngreso,
        horaSalida: t.horaSalida,
        dias: t.dias?.trim() || undefined,
        minutosRefrigerio: t.minutosRefrigerio ? Number(t.minutosRefrigerio) : undefined,
        refrigerioInicio: t.refrigerioInicio || undefined,
        refrigerioFin: t.refrigerioFin || undefined,
      })),
      observaciones: observaciones.trim() || undefined,
    }
    onSubmit(params)
  }

  return (
    <Card padding="lg" className="space-y-4">
      <Field label="Fecha de vigencia">
        <input type="date" value={fechaVigencia} onChange={(e) => setFechaVigencia(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
      </Field>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold">Turnos ({turnos.length})</p>
          <button onClick={add} className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100">
            <Plus className="h-3 w-3" /> Turno
          </button>
        </div>
        <div className="space-y-3">
          {turnos.map((t, idx) => (
            <div key={t.id} className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)]/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-tertiary)]">Turno #{idx + 1}</p>
                {turnos.length > 1 ? <button onClick={() => remove(t.id)} className="text-xs text-crimson-700 hover:text-crimson-800 inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Eliminar</button> : null}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input value={t.nombre} onChange={(e) => update(t.id, 'nombre', e.target.value)} placeholder="Nombre del turno" className="rounded border border-[color:var(--border-default)] bg-white px-2 py-1.5 text-sm sm:col-span-2" />
                <input value={t.dias ?? ''} onChange={(e) => update(t.id, 'dias', e.target.value)} placeholder="Días (Lun-Vie)" className="rounded border border-[color:var(--border-default)] bg-white px-2 py-1.5 text-sm sm:col-span-2" />
                <input type="time" value={t.horaIngreso} onChange={(e) => update(t.id, 'horaIngreso', e.target.value)} className="rounded border border-[color:var(--border-default)] bg-white px-2 py-1.5 text-sm" />
                <input type="time" value={t.horaSalida} onChange={(e) => update(t.id, 'horaSalida', e.target.value)} className="rounded border border-[color:var(--border-default)] bg-white px-2 py-1.5 text-sm" />
                <input type="number" min={0} value={t.minutosRefrigerio ?? 0} onChange={(e) => update(t.id, 'minutosRefrigerio', Number(e.target.value) || 0)} placeholder="Refrigerio (min)" className="rounded border border-[color:var(--border-default)] bg-white px-2 py-1.5 text-sm sm:col-span-2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Field label="Observaciones">
        <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} placeholder="Ej. Viernes salida 16:00" className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm resize-none" />
      </Field>

      <Button onClick={submit} disabled={loading || !canSubmit} icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} size="lg">
        {loading ? 'Generando…' : 'Generar cartel'}
      </Button>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  )
}
