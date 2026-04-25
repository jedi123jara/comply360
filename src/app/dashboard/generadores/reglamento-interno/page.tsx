'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GeneratorShell } from '@/components/generadores/generator-shell'
import type {
  ReglamentoInternoParams,
  RegimenAplicable,
} from '@/lib/generators/reglamento-interno'

export default function ReglamentoInternoPage() {
  return (
    <GeneratorShell
      type="reglamento-interno"
      title="Reglamento Interno de Trabajo (RIT)"
      description="10 capítulos del D.S. 039-91-TR: admisión, jornada, remuneraciones, permisos, SST, derechos/deberes, disciplina, hostigamiento, cese. Variantes por régimen (General / MYPE). Obligatorio si tienes 100+ trabajadores."
      baseLegal="D.S. 039-91-TR · D.Leg. 728 · Ley 29783 · Ley 27942"
      gravity="GRAVE"
      estimatedMinutes={20}
      renderForm={({ onSubmit, loading }) => <Form onSubmit={onSubmit} loading={loading} />}
    />
  )
}

function Form({ onSubmit, loading }: { onSubmit: (p: unknown) => void | Promise<void>; loading: boolean }) {
  const [fechaAprobacion, setFechaAprobacion] = useState(new Date().toISOString().slice(0, 10))
  const [regimen, setRegimen] = useState<RegimenAplicable>('GENERAL')
  const [jornadaDiaria, setJornadaDiaria] = useState(8)
  const [jornadaSemanal, setJornadaSemanal] = useState(48)
  const [horaIngreso, setHoraIngreso] = useState('08:00')
  const [horaSalida, setHoraSalida] = useState('17:00')
  const [minutosRefrigerio, setMinutosRefrigerio] = useState(60)
  const [periodoPruebaDias, setPeriodoPruebaDias] = useState(90)
  const [diaPago, setDiaPago] = useState(28)
  const [tieneUniforme, setTieneUniforme] = useState(false)
  const [descripcionUniforme, setDescripcionUniforme] = useState('')
  const [modalidades, setModalidades] = useState<Array<'presencial' | 'teletrabajo' | 'mixto'>>(['presencial'])
  const [canalComunicaciones, setCanalComunicaciones] = useState('correo corporativo')
  const [responsableSst, setResponsableSst] = useState('')

  const [faltasGraves, setFaltasGraves] = useState<string[]>([''])
  const [sanciones, setSanciones] = useState<string[]>([''])

  function toggleModalidad(m: 'presencial' | 'teletrabajo' | 'mixto') {
    setModalidades((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }
  const updateArr = (arr: string[], set: (v: string[]) => void, i: number, v: string) => set(arr.map((x, j) => (i === j ? v : x)))
  const addArr = (arr: string[], set: (v: string[]) => void) => set([...arr, ''])
  const removeArr = (arr: string[], set: (v: string[]) => void, i: number) => set(arr.length > 1 ? arr.filter((_, j) => j !== i) : arr)

  const canSubmit =
    responsableSst.trim() &&
    jornadaDiaria > 0 &&
    jornadaDiaria <= 8 &&
    jornadaSemanal > 0 &&
    jornadaSemanal <= 48 &&
    periodoPruebaDias > 0 &&
    periodoPruebaDias <= 365 &&
    diaPago >= 1 &&
    diaPago <= 31 &&
    modalidades.length > 0

  function submit() {
    const params: ReglamentoInternoParams = {
      fechaAprobacion,
      regimen,
      jornadaDiaria,
      jornadaSemanal,
      horaIngreso,
      horaSalida,
      minutosRefrigerio,
      periodoPruebaDias,
      diaPago,
      tieneUniforme,
      descripcionUniforme: tieneUniforme ? descripcionUniforme.trim() || undefined : undefined,
      modalidades,
      canalComunicaciones: canalComunicaciones.trim() || 'correo corporativo',
      responsableSst: responsableSst.trim(),
      faltasGravesAdicionales: faltasGraves.filter((f) => f.trim()).map((f) => f.trim()),
      sancionesAdicionales: sanciones.filter((s) => s.trim()).map((s) => s.trim()),
    }
    onSubmit(params)
  }

  return (
    <Card padding="lg" className="space-y-5">
      {/* Generales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Fecha de aprobación" required>
          <input type="date" value={fechaAprobacion} onChange={(e) => setFechaAprobacion(e.target.value)} className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Régimen predominante" required>
          <select value={regimen} onChange={(e) => setRegimen(e.target.value as RegimenAplicable)} className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm">
            <option value="GENERAL">General (D.Leg. 728)</option>
            <option value="MYPE_PEQUENA">MYPE Pequeña Empresa</option>
            <option value="MYPE_MICRO">MYPE Microempresa</option>
            <option value="MIXTO">Mixto</option>
          </select>
        </Field>
        <Field label="Canal de comunicaciones">
          <input value={canalComunicaciones} onChange={(e) => setCanalComunicaciones(e.target.value)} placeholder="Intranet, email" className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
      </div>

      {/* Jornada */}
      <div>
        <p className="text-sm font-bold mb-2">Jornada y horarios</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Field label="Diaria (h)" required>
            <input type="number" min={1} max={8} value={jornadaDiaria} onChange={(e) => setJornadaDiaria(Number(e.target.value) || 8)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
          </Field>
          <Field label="Semanal (h)" required>
            <input type="number" min={1} max={48} value={jornadaSemanal} onChange={(e) => setJornadaSemanal(Number(e.target.value) || 48)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
          </Field>
          <Field label="Ingreso">
            <input type="time" value={horaIngreso} onChange={(e) => setHoraIngreso(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
          </Field>
          <Field label="Salida">
            <input type="time" value={horaSalida} onChange={(e) => setHoraSalida(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
          </Field>
          <Field label="Refrigerio (min)">
            <input type="number" min={0} value={minutosRefrigerio} onChange={(e) => setMinutosRefrigerio(Number(e.target.value) || 45)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
          </Field>
        </div>
        <p className="text-[11px] text-[color:var(--text-tertiary)] mt-1">Máx legal: 8h/día · 48h/sem · Refrigerio ≥ 45min si jornada ≥ 4h.</p>
      </div>

      {/* Modalidades */}
      <Field label="Modalidades presentes" required>
        <div className="flex flex-wrap gap-2">
          {(['presencial', 'teletrabajo', 'mixto'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => toggleModalidad(m)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                modalidades.includes(m)
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-[color:var(--text-secondary)] border-[color:var(--border-default)] hover:border-emerald-300'
              }`}
            >
              {m === 'presencial' ? 'Presencial' : m === 'teletrabajo' ? 'Teletrabajo' : 'Mixto'}
            </button>
          ))}
        </div>
      </Field>

      {/* Otros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Período de prueba (días)" required>
          <input type="number" min={1} max={365} value={periodoPruebaDias} onChange={(e) => setPeriodoPruebaDias(Number(e.target.value) || 90)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Día de pago (1-31)" required>
          <input type="number" min={1} max={31} value={diaPago} onChange={(e) => setDiaPago(Math.min(31, Math.max(1, Number(e.target.value) || 28)))} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Responsable SST" required>
          <input value={responsableSst} onChange={(e) => setResponsableSst(e.target.value)} placeholder="Juan Pérez — Jefe RRHH" className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
      </div>

      {/* Uniforme */}
      <div>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={tieneUniforme} onChange={(e) => setTieneUniforme(e.target.checked)} className="h-4 w-4" />
          <span className="text-sm font-bold">Hay uniforme / dress code</span>
        </label>
        {tieneUniforme ? (
          <textarea
            value={descripcionUniforme}
            onChange={(e) => setDescripcionUniforme(e.target.value)}
            rows={2}
            placeholder="Ej. Polo azul corporativo + pantalón beige + zapatos cerrados"
            className="w-full mt-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm resize-none"
          />
        ) : null}
      </div>

      {/* Faltas graves adicionales */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold">
            Faltas graves adicionales <span className="text-xs font-normal text-[color:var(--text-tertiary)]">· opcional — además de las del Art. 25 D.Leg. 728</span>
          </p>
          <MiniBtn onClick={() => addArr(faltasGraves, setFaltasGraves)}>+ Falta</MiniBtn>
        </div>
        <div className="space-y-1">
          {faltasGraves.map((f, i) => (
            <div key={i} className="flex gap-1">
              <input value={f} onChange={(e) => updateArr(faltasGraves, setFaltasGraves, i, e.target.value)} placeholder="Ej. Uso indebido de redes sociales en horario laboral" className="flex-1 rounded border border-[color:var(--border-default)] bg-white px-2 py-1.5 text-sm" />
              {faltasGraves.length > 1 ? <button onClick={() => removeArr(faltasGraves, setFaltasGraves, i)} className="text-crimson-700 rounded p-1"><Trash2 className="h-3.5 w-3.5" /></button> : null}
            </div>
          ))}
        </div>
      </div>

      {/* Sanciones adicionales */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold">
            Sanciones adicionales <span className="text-xs font-normal text-[color:var(--text-tertiary)]">· opcional</span>
          </p>
          <MiniBtn onClick={() => addArr(sanciones, setSanciones)}>+ Sanción</MiniBtn>
        </div>
        <div className="space-y-1">
          {sanciones.map((s, i) => (
            <div key={i} className="flex gap-1">
              <input value={s} onChange={(e) => updateArr(sanciones, setSanciones, i, e.target.value)} placeholder="Ej. Pérdida temporal de acceso a sistemas críticos" className="flex-1 rounded border border-[color:var(--border-default)] bg-white px-2 py-1.5 text-sm" />
              {sanciones.length > 1 ? <button onClick={() => removeArr(sanciones, setSanciones, i)} className="text-crimson-700 rounded p-1"><Trash2 className="h-3.5 w-3.5" /></button> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <Button onClick={submit} disabled={loading || !canSubmit} icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} size="lg">
          {loading ? 'Generando RIT…' : 'Generar Reglamento Interno'}
        </Button>
        <p className="text-xs text-[color:var(--text-tertiary)] mt-2">
          El RIT debe presentarse al MTPE por mesa de partes y entregarse a cada trabajador al ingreso.
        </p>
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
