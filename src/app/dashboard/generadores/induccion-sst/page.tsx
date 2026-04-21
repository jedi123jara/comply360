'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GeneratorShell } from '@/components/generadores/generator-shell'
import type { InduccionSstParams } from '@/lib/generators/induccion-sst'

export default function InduccionSstPage() {
  return (
    <GeneratorShell
      type="induccion-sst"
      title="Constancia de Inducción SST"
      description="Registro obligatorio de la inducción que todo nuevo trabajador debe recibir ANTES de iniciar labores. Incluye el temario mínimo R.M. 050-2013-TR + peligros del puesto + firma del trabajador."
      baseLegal="Ley 29783, Art. 49-g · R.M. 050-2013-TR"
      gravity="GRAVE"
      estimatedMinutes={5}
      renderForm={({ onSubmit, loading }) => <Form onSubmit={onSubmit} loading={loading} />}
    />
  )
}

function Form({
  onSubmit,
  loading,
}: {
  onSubmit: (params: unknown) => void | Promise<void>
  loading: boolean
}) {
  // Trabajador
  const [tNombre, setTNombre] = useState('')
  const [tDni, setTDni] = useState('')
  const [tCargo, setTCargo] = useState('')
  const [tArea, setTArea] = useState('')
  const [tFechaIngreso, setTFechaIngreso] = useState('')

  // Inducción
  const [fechaInduccion, setFechaInduccion] = useState(new Date().toISOString().slice(0, 10))
  const [duracionHoras, setDuracionHoras] = useState(4)
  const [modalidad, setModalidad] = useState<InduccionSstParams['modalidad']>('presencial')

  // Capacitador
  const [cNombre, setCNombre] = useState('')
  const [cCargo, setCCargo] = useState('')
  const [cRegistro, setCRegistro] = useState('')

  // Temas adicionales + peligros + EPP
  const [temasAdicionales, setTemasAdicionales] = useState('')
  const [peligros, setPeligros] = useState<string[]>([''])
  const [eppList, setEppList] = useState<string[]>([''])
  const [observaciones, setObservaciones] = useState('')

  const updateArr = (arr: string[], setArr: (v: string[]) => void, idx: number, v: string) => {
    setArr(arr.map((x, i) => (i === idx ? v : x)))
  }
  const addArr = (setArr: (v: string[]) => void) => (arr: string[]) => setArr([...arr, ''])
  const removeArr = (arr: string[], setArr: (v: string[]) => void, idx: number) => {
    setArr(arr.length > 1 ? arr.filter((_, i) => i !== idx) : arr)
  }

  const canSubmit =
    tNombre.trim() && tDni.trim() && tCargo.trim() && cNombre.trim() && duracionHoras > 0

  function submit() {
    const params: InduccionSstParams = {
      trabajador: {
        nombre: tNombre.trim(),
        dni: tDni.trim(),
        cargo: tCargo.trim(),
        area: tArea.trim() || undefined,
        fechaIngreso: tFechaIngreso || undefined,
      },
      fechaInduccion,
      duracionHoras,
      modalidad,
      capacitador: {
        nombre: cNombre.trim(),
        cargo: cCargo.trim() || undefined,
        registro: cRegistro.trim() || undefined,
      },
      temasAdicionales: temasAdicionales
        ? temasAdicionales.split('\n').map((t) => t.trim()).filter(Boolean)
        : undefined,
      peligrosEspecificos: peligros.filter((p) => p.trim()),
      eppEntregado: eppList.filter((e) => e.trim()),
      observaciones: observaciones.trim() || undefined,
    }
    onSubmit(params)
  }

  return (
    <Card padding="lg" className="space-y-5">
      {/* Trabajador */}
      <div>
        <p className="text-sm font-bold mb-2">Trabajador inducido</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nombre completo" required>
            <input value={tNombre} onChange={(e) => setTNombre(e.target.value)} className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" placeholder="Juan Pérez" />
          </Field>
          <Field label="DNI" required>
            <input value={tDni} onChange={(e) => setTDni(e.target.value)} maxLength={8} className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" placeholder="12345678" />
          </Field>
          <Field label="Cargo" required>
            <input value={tCargo} onChange={(e) => setTCargo(e.target.value)} className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" placeholder="Analista Jr" />
          </Field>
          <Field label="Área">
            <input value={tArea} onChange={(e) => setTArea(e.target.value)} className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" placeholder="Operaciones" />
          </Field>
          <Field label="Fecha de ingreso">
            <input type="date" value={tFechaIngreso} onChange={(e) => setTFechaIngreso(e.target.value)} className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
          </Field>
        </div>
      </div>

      {/* Inducción */}
      <div>
        <p className="text-sm font-bold mb-2">Datos de la inducción</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Fecha" required>
            <input type="date" value={fechaInduccion} onChange={(e) => setFechaInduccion(e.target.value)} className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
          </Field>
          <Field label="Duración (horas)" required>
            <input type="number" min={1} max={16} value={duracionHoras} onChange={(e) => setDuracionHoras(Math.max(1, Number(e.target.value) || 1))} className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
          </Field>
          <Field label="Modalidad" required>
            <select value={modalidad} onChange={(e) => setModalidad(e.target.value as InduccionSstParams['modalidad'])} className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm">
              <option value="presencial">Presencial</option>
              <option value="virtual">Virtual (sincrónica)</option>
              <option value="mixta">Mixta</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Capacitador */}
      <div>
        <p className="text-sm font-bold mb-2">Capacitador</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Nombre" required>
            <input value={cNombre} onChange={(e) => setCNombre(e.target.value)} className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" placeholder="Ing. María Torres" />
          </Field>
          <Field label="Cargo">
            <input value={cCargo} onChange={(e) => setCCargo(e.target.value)} className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" placeholder="Especialista SST" />
          </Field>
          <Field label="Registro / Colegiatura">
            <input value={cRegistro} onChange={(e) => setCRegistro(e.target.value)} className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" placeholder="CIP 123456" />
          </Field>
        </div>
      </div>

      {/* Contenido */}
      <Field label="Temas adicionales (opcional, uno por línea)">
        <textarea value={temasAdicionales} onChange={(e) => setTemasAdicionales(e.target.value)} rows={3} placeholder="Ej. Protocolo COVID&#10;Uso de montacargas interno" className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm resize-none" />
        <p className="text-[11px] text-[color:var(--text-tertiary)] mt-1">
          Los 10 temas mínimos del R.M. 050-2013-TR se incluyen automáticamente.
        </p>
      </Field>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-widest">
            Peligros específicos del puesto (del IPERC)
          </label>
          <MiniBtn onClick={() => addArr(setPeligros)(peligros)}>+ Peligro</MiniBtn>
        </div>
        <div className="space-y-1">
          {peligros.map((p, i) => (
            <div key={i} className="flex gap-1">
              <input value={p} onChange={(e) => updateArr(peligros, setPeligros, i, e.target.value)} placeholder="Ej. Caída al mismo nivel" className="flex-1 rounded border border-[color:var(--border-default)] bg-white px-2 py-1.5 text-sm" />
              {peligros.length > 1 ? <button onClick={() => removeArr(peligros, setPeligros, i)} className="text-crimson-700 hover:bg-crimson-50 rounded p-1"><Trash2 className="h-3.5 w-3.5" /></button> : null}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-widest">
            EPP entregado (opcional)
          </label>
          <MiniBtn onClick={() => addArr(setEppList)(eppList)}>+ EPP</MiniBtn>
        </div>
        <div className="space-y-1">
          {eppList.map((e, i) => (
            <div key={i} className="flex gap-1">
              <input value={e} onChange={(ev) => updateArr(eppList, setEppList, i, ev.target.value)} placeholder="Ej. Casco de seguridad, zapatos punta acero" className="flex-1 rounded border border-[color:var(--border-default)] bg-white px-2 py-1.5 text-sm" />
              {eppList.length > 1 ? <button onClick={() => removeArr(eppList, setEppList, i)} className="text-crimson-700 hover:bg-crimson-50 rounded p-1"><Trash2 className="h-3.5 w-3.5" /></button> : null}
            </div>
          ))}
        </div>
      </div>

      <Field label="Observaciones">
        <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} placeholder="Opcional" className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm resize-none" />
      </Field>

      <div className="pt-2">
        <Button onClick={submit} disabled={loading || !canSubmit} icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} size="lg">
          {loading ? 'Generando…' : 'Generar constancia'}
        </Button>
      </div>
    </Card>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-widest mb-1.5">
        {label}
        {required ? <span className="text-crimson-600 ml-0.5">*</span> : null}
      </label>
      {children}
    </div>
  )
}

function MiniBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100">
      <Plus className="h-3 w-3" />
      {children}
    </button>
  )
}
