'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GeneratorShell } from '@/components/generadores/generator-shell'
import type { CapacitacionSstParams, ParticipanteCapacitacion } from '@/lib/generators/capacitacion-sst'

export default function CapacitacionSstPage() {
  return (
    <GeneratorShell
      type="capacitacion-sst"
      title="Registro de Capacitación SST"
      description="Acta de una sesión de capacitación SST con temario, participantes y firmas — obligatorio 4 veces al año (Art. 35 Ley 29783)."
      baseLegal="Ley 29783, Art. 35 · R.M. 050-2013-TR Anexo 5"
      gravity="GRAVE"
      estimatedMinutes={5}
      renderForm={({ onSubmit, loading }) => <Form onSubmit={onSubmit} loading={loading} />}
    />
  )
}

interface ParticipanteRow extends ParticipanteCapacitacion {
  id: string
}

function createParticipante(): ParticipanteRow {
  return { id: `p-${Math.random().toString(36).slice(2, 8)}`, nombre: '', dni: '', cargo: '', area: '', asistio: true }
}

function Form({ onSubmit, loading }: { onSubmit: (p: unknown) => void | Promise<void>; loading: boolean }) {
  const [tema, setTema] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [horaInicio, setHoraInicio] = useState('14:00')
  const [horaFin, setHoraFin] = useState('17:00')
  const [modalidad, setModalidad] = useState<CapacitacionSstParams['modalidad']>('presencial')
  const [lugar, setLugar] = useState('')

  const [cNombre, setCNombre] = useState('')
  const [cCargo, setCCargo] = useState('')
  const [cRegistro, setCRegistro] = useState('')

  const [contenidos, setContenidos] = useState('')
  const [metodologia, setMetodologia] = useState('Exposición + taller práctico + evaluación')
  const [evaluacion, setEvaluacion] = useState('')
  const [notaPromedio, setNotaPromedio] = useState('')

  const [participantes, setParticipantes] = useState<ParticipanteRow[]>([createParticipante()])

  function updateP(id: string, field: keyof ParticipanteRow, value: string | boolean) {
    setParticipantes((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }
  const addP = () => setParticipantes((prev) => [...prev, createParticipante()])
  const removeP = (id: string) => setParticipantes((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev))

  const validP = participantes.filter((p) => p.nombre.trim() && p.dni.trim())
  const canSubmit = tema.trim() && objetivo.trim() && cNombre.trim() && lugar.trim() && contenidos.trim() && validP.length >= 1

  function submit() {
    const params: CapacitacionSstParams = {
      tema: tema.trim(),
      objetivo: objetivo.trim(),
      fecha,
      horaInicio,
      horaFin,
      modalidad,
      capacitador: { nombre: cNombre.trim(), cargo: cCargo.trim() || undefined, registro: cRegistro.trim() || undefined },
      contenidos: contenidos.split('\n').map((c) => c.trim()).filter(Boolean),
      metodologia: metodologia.trim() || undefined,
      evaluacion: evaluacion.trim() || undefined,
      notaPromedio: notaPromedio ? Number(notaPromedio) : undefined,
      participantes: validP.map((p) => ({
        nombre: p.nombre.trim(),
        dni: p.dni.trim(),
        cargo: p.cargo?.trim() || undefined,
        area: p.area?.trim() || undefined,
        asistio: p.asistio,
      })),
      lugar: lugar.trim(),
    }
    onSubmit(params)
  }

  return (
    <Card padding="lg" className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Tema" required><input value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Ej. Uso correcto del EPP" className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
        <Field label="Objetivo" required><input value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ej. Reducir accidentes por no uso de EPP" className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Field label="Fecha" required><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
        <Field label="Inicio" required><input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
        <Field label="Fin" required><input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
        <Field label="Modalidad">
          <select value={modalidad} onChange={(e) => setModalidad(e.target.value as CapacitacionSstParams['modalidad'])} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm">
            <option value="presencial">Presencial</option>
            <option value="virtual">Virtual</option>
            <option value="mixta">Mixta</option>
          </select>
        </Field>
      </div>

      <Field label="Lugar / Plataforma" required><input value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Sala de reuniones / Zoom — link" className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>

      <div>
        <p className="text-sm font-bold mb-2">Capacitador</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Nombre" required><input value={cNombre} onChange={(e) => setCNombre(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
          <Field label="Cargo"><input value={cCargo} onChange={(e) => setCCargo(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
          <Field label="Registro CIP / Colegiatura"><input value={cRegistro} onChange={(e) => setCRegistro(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
        </div>
      </div>

      <Field label="Contenidos (uno por línea)" required>
        <textarea value={contenidos} onChange={(e) => setContenidos(e.target.value)} rows={4} placeholder="Introducción a la Ley 29783&#10;Obligaciones del trabajador&#10;Uso correcto del arnés&#10;Simulacro práctico" className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm resize-none" />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Metodología"><input value={metodologia} onChange={(e) => setMetodologia(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
        <Field label="Nota promedio"><input type="number" min={0} max={20} value={notaPromedio} onChange={(e) => setNotaPromedio(e.target.value)} placeholder="0-20 o %" className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
      </div>
      <Field label="Evaluación aplicada">
        <input value={evaluacion} onChange={(e) => setEvaluacion(e.target.value)} placeholder="Ej. Cuestionario de 10 preguntas" className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
      </Field>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold">Participantes ({participantes.length})</p>
          <button onClick={addP} className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100">
            <Plus className="h-3 w-3" /> Participante
          </button>
        </div>
        <div className="space-y-1">
          {participantes.map((p) => (
            <div key={p.id} className="flex flex-wrap gap-1 items-start rounded bg-white border border-[color:var(--border-subtle)] px-2 py-1.5">
              <input value={p.nombre} onChange={(e) => updateP(p.id, 'nombre', e.target.value)} placeholder="Nombre" className="flex-1 min-w-[180px] rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
              <input value={p.dni} onChange={(e) => updateP(p.id, 'dni', e.target.value)} placeholder="DNI" maxLength={8} className="w-24 rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
              <input value={p.cargo ?? ''} onChange={(e) => updateP(p.id, 'cargo', e.target.value)} placeholder="Cargo" className="w-28 rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
              <input value={p.area ?? ''} onChange={(e) => updateP(p.id, 'area', e.target.value)} placeholder="Área" className="w-28 rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
              <label className="inline-flex items-center gap-1 text-[11px]">
                <input type="checkbox" checked={p.asistio !== false} onChange={(e) => updateP(p.id, 'asistio', e.target.checked)} className="h-3 w-3" />
                Asistió
              </label>
              {participantes.length > 1 ? <button onClick={() => removeP(p.id)} className="text-crimson-700 rounded p-0.5"><Trash2 className="h-3 w-3" /></button> : null}
            </div>
          ))}
        </div>
      </div>

      <Button onClick={submit} disabled={loading || !canSubmit} icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} size="lg">
        {loading ? 'Generando…' : `Generar registro (${validP.length} participantes)`}
      </Button>
    </Card>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-widest mb-1.5">{label}{required ? <span className="text-crimson-600 ml-0.5">*</span> : null}</label>
      {children}
    </div>
  )
}
