'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GeneratorShell } from '@/components/generadores/generator-shell'
import type { MapaRiesgosParams, AreaMapa, TipoSenal } from '@/lib/generators/mapa-riesgos'

export default function MapaRiesgosPage() {
  return (
    <GeneratorShell
      type="mapa-riesgos"
      title="Mapa de Riesgos del Centro de Trabajo"
      description="Documento por áreas con peligros identificados, señalética NTP 399.010-1 y equipamiento de emergencia. Exhibible en el centro de trabajo."
      baseLegal="D.S. 005-2012-TR, Art. 35-e · NTP 399.010-1"
      gravity="LEVE"
      estimatedMinutes={10}
      renderForm={({ onSubmit, loading }) => <Form onSubmit={onSubmit} loading={loading} />}
    />
  )
}

interface AreaRow {
  id: string
  nombre: string
  ubicacion: string
  peligros: string[]
  senales: Array<{ tipo: TipoSenal; simbolo: string }>
  equipamiento: string[]
}

function createArea(): AreaRow {
  return {
    id: `a-${Math.random().toString(36).slice(2, 8)}`,
    nombre: '',
    ubicacion: '',
    peligros: [''],
    senales: [{ tipo: 'obligacion', simbolo: '' }],
    equipamiento: [''],
  }
}

function Form({ onSubmit, loading }: { onSubmit: (p: unknown) => void | Promise<void>; loading: boolean }) {
  const [fechaElaboracion, setFechaElaboracion] = useState(new Date().toISOString().slice(0, 10))
  const [responsable, setResponsable] = useState('')
  const [direccionCentro, setDireccionCentro] = useState('')
  const [lugarExhibicion, setLugarExhibicion] = useState('Recepción / Hall principal')
  const [areas, setAreas] = useState<AreaRow[]>([createArea()])

  function updateA(id: string, field: keyof AreaRow, value: AreaRow[keyof AreaRow]) {
    setAreas((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }
  const addA = () => setAreas((prev) => [...prev, createArea()])
  const removeA = (id: string) => setAreas((prev) => (prev.length > 1 ? prev.filter((a) => a.id !== id) : prev))

  function updatePeligro(areaId: string, idx: number, value: string) {
    setAreas((prev) => prev.map((a) => (a.id === areaId ? { ...a, peligros: a.peligros.map((p, i) => (i === idx ? value : p)) } : a)))
  }
  function addPeligro(areaId: string) { setAreas((prev) => prev.map((a) => (a.id === areaId ? { ...a, peligros: [...a.peligros, ''] } : a))) }
  function removePeligro(areaId: string, idx: number) { setAreas((prev) => prev.map((a) => (a.id === areaId ? { ...a, peligros: a.peligros.length > 1 ? a.peligros.filter((_, i) => i !== idx) : a.peligros } : a))) }

  function updateSenal(areaId: string, idx: number, field: 'tipo' | 'simbolo', value: string) {
    setAreas((prev) => prev.map((a) => (a.id === areaId ? { ...a, senales: a.senales.map((s, i) => (i === idx ? { ...s, [field]: value } : s)) } : a)))
  }
  function addSenal(areaId: string) { setAreas((prev) => prev.map((a) => (a.id === areaId ? { ...a, senales: [...a.senales, { tipo: 'obligacion' as TipoSenal, simbolo: '' }] } : a))) }
  function removeSenal(areaId: string, idx: number) { setAreas((prev) => prev.map((a) => (a.id === areaId ? { ...a, senales: a.senales.length > 1 ? a.senales.filter((_, i) => i !== idx) : a.senales } : a))) }

  function updateEq(areaId: string, idx: number, value: string) {
    setAreas((prev) => prev.map((a) => (a.id === areaId ? { ...a, equipamiento: a.equipamiento.map((e, i) => (i === idx ? value : e)) } : a)))
  }
  function addEq(areaId: string) { setAreas((prev) => prev.map((a) => (a.id === areaId ? { ...a, equipamiento: [...a.equipamiento, ''] } : a))) }
  function removeEq(areaId: string, idx: number) { setAreas((prev) => prev.map((a) => (a.id === areaId ? { ...a, equipamiento: a.equipamiento.length > 1 ? a.equipamiento.filter((_, i) => i !== idx) : a.equipamiento } : a))) }

  const validAreas = areas.filter((a) => a.nombre.trim())
  const canSubmit = responsable.trim() && direccionCentro.trim() && validAreas.length >= 1

  function submit() {
    const params: MapaRiesgosParams = {
      fechaElaboracion,
      responsable: responsable.trim(),
      direccionCentro: direccionCentro.trim(),
      lugarExhibicion: lugarExhibicion.trim() || 'Recepción / Hall principal',
      areas: validAreas.map<AreaMapa>((a) => ({
        nombre: a.nombre.trim(),
        ubicacion: a.ubicacion.trim() || undefined,
        peligros: a.peligros.filter((p) => p.trim()),
        senales: a.senales.filter((s) => s.simbolo.trim()),
        equipamientoEmergencia: a.equipamiento.filter((e) => e.trim()),
      })),
    }
    onSubmit(params)
  }

  return (
    <Card padding="lg" className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fecha de elaboración" required>
          <input type="date" value={fechaElaboracion} onChange={(e) => setFechaElaboracion(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Responsable" required>
          <input value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="Ej. Supervisor SST — Juan Pérez" className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Dirección del centro" required>
          <input value={direccionCentro} onChange={(e) => setDireccionCentro(e.target.value)} placeholder="Av. Principal 123, San Isidro, Lima" className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Lugar de exhibición">
          <input value={lugarExhibicion} onChange={(e) => setLugarExhibicion(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold">Áreas del centro ({areas.length})</p>
          <button onClick={addA} className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100">
            <Plus className="h-3 w-3" /> Área
          </button>
        </div>
        <div className="space-y-4">
          {areas.map((a, idx) => (
            <div key={a.id} className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)]/50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-tertiary)]">Área #{idx + 1}</p>
                {areas.length > 1 ? <button onClick={() => removeA(a.id)} className="text-xs text-crimson-700 hover:text-crimson-800 inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Eliminar</button> : null}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={a.nombre} onChange={(e) => updateA(a.id, 'nombre', e.target.value)} placeholder="Nombre del área *" className="rounded border border-[color:var(--border-default)] bg-white px-2 py-1.5 text-sm" />
                <input value={a.ubicacion} onChange={(e) => updateA(a.id, 'ubicacion', e.target.value)} placeholder="Ubicación (piso, sector)" className="rounded border border-[color:var(--border-default)] bg-white px-2 py-1.5 text-sm" />
              </div>

              {/* Peligros */}
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-[color:var(--text-secondary)] font-semibold">Peligros</p>
                  <button onClick={() => addPeligro(a.id)} className="text-[10px] text-emerald-700 hover:underline inline-flex items-center gap-0.5"><Plus className="h-3 w-3" /> peligro</button>
                </div>
                {a.peligros.map((p, i) => (
                  <div key={i} className="flex gap-1 mt-1">
                    <input value={p} onChange={(e) => updatePeligro(a.id, i, e.target.value)} placeholder="Ej. Suelo resbaladizo" className="flex-1 rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
                    {a.peligros.length > 1 ? <button onClick={() => removePeligro(a.id, i)} className="text-crimson-700 rounded p-0.5"><Trash2 className="h-3 w-3" /></button> : null}
                  </div>
                ))}
              </div>

              {/* Señales */}
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-[color:var(--text-secondary)] font-semibold">Señales (NTP 399.010-1)</p>
                  <button onClick={() => addSenal(a.id)} className="text-[10px] text-emerald-700 hover:underline inline-flex items-center gap-0.5"><Plus className="h-3 w-3" /> señal</button>
                </div>
                {a.senales.map((s, i) => (
                  <div key={i} className="flex gap-1 mt-1">
                    <select value={s.tipo} onChange={(e) => updateSenal(a.id, i, 'tipo', e.target.value)} className="rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs">
                      <option value="prohibicion">Prohibición</option>
                      <option value="obligacion">Obligación</option>
                      <option value="advertencia">Advertencia</option>
                      <option value="salvamento">Salvamento</option>
                      <option value="incendio">Incendio</option>
                    </select>
                    <input value={s.simbolo} onChange={(e) => updateSenal(a.id, i, 'simbolo', e.target.value)} placeholder="Ej. Uso obligatorio de casco" className="flex-1 rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
                    {a.senales.length > 1 ? <button onClick={() => removeSenal(a.id, i)} className="text-crimson-700 rounded p-0.5"><Trash2 className="h-3 w-3" /></button> : null}
                  </div>
                ))}
              </div>

              {/* Equipamiento */}
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-[color:var(--text-secondary)] font-semibold">Equipamiento de emergencia</p>
                  <button onClick={() => addEq(a.id)} className="text-[10px] text-emerald-700 hover:underline inline-flex items-center gap-0.5"><Plus className="h-3 w-3" /> equipo</button>
                </div>
                {a.equipamiento.map((e, i) => (
                  <div key={i} className="flex gap-1 mt-1">
                    <input value={e} onChange={(ev) => updateEq(a.id, i, ev.target.value)} placeholder="Ej. Extintor PQS 6kg" className="flex-1 rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
                    {a.equipamiento.length > 1 ? <button onClick={() => removeEq(a.id, i)} className="text-crimson-700 rounded p-0.5"><Trash2 className="h-3 w-3" /></button> : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={submit} disabled={loading || !canSubmit} icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} size="lg">
        {loading ? 'Generando…' : `Generar mapa (${validAreas.length} áreas)`}
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
