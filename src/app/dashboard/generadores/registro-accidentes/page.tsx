'use client'

import { useMemo, useState } from 'react'
import { Loader2, Sparkles, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GeneratorShell } from '@/components/generadores/generator-shell'
import {
  requiereNotificacion24h,
  type RegistroAccidenteParams,
  type TipoEvento,
  type FormaAccidente,
  type ParteCuerpo,
} from '@/lib/generators/registro-accidentes'

export default function RegistroAccidentesPage() {
  return (
    <GeneratorShell
      type="registro-accidentes"
      title="Registro de Accidente / Incidente / Enfermedad Ocupacional"
      description="Formato R.M. 050-2013-TR Anexo 6. Si el evento requiere notificación 24h al MTPE (mortal, incapacitante, incidente peligroso, enfermedad ocupacional), se genera automáticamente la plantilla de notificación junto al registro."
      baseLegal="Ley 29783, Art. 28, 58, 82 · D.S. 005-2012-TR, Art. 110 · R.M. 050-2013-TR"
      gravity="GRAVE"
      estimatedMinutes={10}
      renderForm={({ onSubmit, loading }) => <Form onSubmit={onSubmit} loading={loading} />}
    />
  )
}

function Form({ onSubmit, loading }: { onSubmit: (p: unknown) => void | Promise<void>; loading: boolean }) {
  // Valores iniciales estables (generados una sola vez, no en cada render)
  const [defaults] = useState(() => ({
    nowIso: new Date().toISOString().slice(0, 16),
    codigoInicial: `AT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
  }))

  const [tipo, setTipo] = useState<TipoEvento>('accidente_leve')
  const [codigo, setCodigo] = useState(defaults.codigoInicial)
  const [fechaEvento, setFechaEvento] = useState(defaults.nowIso)
  const [fechaConocimiento, setFechaConocimiento] = useState(new Date().toISOString().slice(0, 10))
  const [lugar, setLugar] = useState('')
  const [turno, setTurno] = useState<RegistroAccidenteParams['turno']>('manana')

  // Trabajador
  const [tNombre, setTNombre] = useState('')
  const [tDni, setTDni] = useState('')
  const [tEdad, setTEdad] = useState('')
  const [tGenero, setTGenero] = useState<'M' | 'F' | 'otro'>('M')
  const [tCargo, setTCargo] = useState('')
  const [tArea, setTArea] = useState('')
  const [tAntiguedad, setTAntiguedad] = useState('')

  // Evento
  const [forma, setForma] = useState<FormaAccidente>('caida_mismo_nivel')
  const [descripcion, setDescripcion] = useState('')
  const [secuenciaCausal, setSecuenciaCausal] = useState('')
  const [parteCuerpo, setParteCuerpo] = useState<ParteCuerpo>('miembros_superiores')
  const [diagnostico, setDiagnostico] = useState('')

  // Consecuencias
  const [diasIncapacidad, setDiasIncapacidad] = useState(0)
  const [costoEstimado, setCostoEstimado] = useState('')

  // Investigación
  const [causasBasicas, setCausasBasicas] = useState<string[]>([''])
  const [causasInmediatas, setCausasInmediatas] = useState<string[]>([''])

  // Acciones
  const [acciones, setAcciones] = useState<Array<{ accion: string; responsable: string; plazoDias: string }>>([
    { accion: '', responsable: '', plazoDias: '30' },
  ])

  // Notificación
  const [notificado, setNotificado] = useState(false)
  const [fechaNotif, setFechaNotif] = useState('')
  const [numReporte, setNumReporte] = useState('')

  const updateArr = (arr: string[], set: (v: string[]) => void, i: number, v: string) => set(arr.map((x, j) => (i === j ? v : x)))
  const addArr = (arr: string[], set: (v: string[]) => void) => set([...arr, ''])
  const removeArr = (arr: string[], set: (v: string[]) => void, i: number) => set(arr.length > 1 ? arr.filter((_, j) => j !== i) : arr)

  function addAccion() {
    setAcciones((prev) => [...prev, { accion: '', responsable: '', plazoDias: '30' }])
  }
  function updateAccion(i: number, field: 'accion' | 'responsable' | 'plazoDias', v: string) {
    setAcciones((prev) => prev.map((a, j) => (j === i ? { ...a, [field]: v } : a)))
  }
  function removeAccion(i: number) {
    setAcciones((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev))
  }

  const notifica24h = useMemo(() => requiereNotificacion24h(tipo), [tipo])

  const canSubmit =
    tNombre.trim() && tDni.trim() && tCargo.trim() && tArea.trim() && lugar.trim() && descripcion.trim()

  function submit() {
    const params: RegistroAccidenteParams = {
      tipo,
      codigo: codigo.trim(),
      fechaEvento: new Date(fechaEvento).toISOString(),
      fechaConocimiento: new Date(fechaConocimiento).toISOString(),
      lugar: lugar.trim(),
      turno,
      trabajador: {
        nombre: tNombre.trim(),
        dni: tDni.trim(),
        edad: tEdad ? Number(tEdad) : undefined,
        genero: tGenero,
        cargo: tCargo.trim(),
        area: tArea.trim(),
        antiguedadMeses: tAntiguedad ? Number(tAntiguedad) : undefined,
      },
      forma,
      descripcionHechos: descripcion.trim(),
      secuenciaCausal: secuenciaCausal.trim() || undefined,
      parteCuerpo: tipo.startsWith('accidente') ? parteCuerpo : undefined,
      diagnostico: diagnostico.trim() || undefined,
      diasIncapacidad: Math.max(0, diasIncapacidad),
      fallecimiento: tipo === 'accidente_mortal',
      costoEstimadoSoles: costoEstimado ? Number(costoEstimado) : undefined,
      causasBasicas: causasBasicas.filter((c) => c.trim()),
      causasInmediatas: causasInmediatas.filter((c) => c.trim()),
      accionesCorrectivas: acciones
        .filter((a) => a.accion.trim())
        .map((a) => ({ accion: a.accion.trim(), responsable: a.responsable.trim() || 'Por asignar', plazoDias: Number(a.plazoDias) || 30 })),
      notificadoMtpe: notificado,
      fechaNotificacionMtpe: notificado && fechaNotif ? fechaNotif : undefined,
      numeroReporteMtpe: notificado && numReporte.trim() ? numReporte.trim() : undefined,
    }
    onSubmit(params)
  }

  return (
    <Card padding="lg" className="space-y-5">
      {/* Alerta 24h */}
      {notifica24h ? (
        <div className="rounded-lg border border-crimson-300 bg-crimson-50 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-crimson-700 shrink-0 mt-0.5" />
          <p className="text-xs text-crimson-800">
            <strong>Este tipo de evento requiere notificación al MTPE dentro de 24 horas</strong> (Art. 110 D.S.
            005-2012-TR). Si aún no notificaste, al generar el documento incluiremos la plantilla lista para enviar.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Tipo de evento" required>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoEvento)} className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm">
            <option value="accidente_leve">Accidente leve</option>
            <option value="accidente_incapacitante">Accidente incapacitante (24h)</option>
            <option value="accidente_mortal">Accidente mortal (24h)</option>
            <option value="incidente_peligroso">Incidente peligroso (24h)</option>
            <option value="enfermedad_ocupacional">Enfermedad ocupacional (24h)</option>
          </select>
        </Field>
        <Field label="Código" required>
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)} className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm font-mono" />
        </Field>
        <Field label="Turno" required>
          <select value={turno} onChange={(e) => setTurno(e.target.value as RegistroAccidenteParams['turno'])} className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm">
            <option value="manana">Mañana</option>
            <option value="tarde">Tarde</option>
            <option value="noche">Noche</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Fecha y hora del evento" required>
          <input type="datetime-local" value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Fecha de conocimiento" required>
          <input type="date" value={fechaConocimiento} onChange={(e) => setFechaConocimiento(e.target.value)} className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Lugar del evento" required>
          <input value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Planta 2 — línea de producción" className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
      </div>

      {/* Trabajador */}
      <div>
        <p className="text-sm font-bold mb-2">Trabajador afectado</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Nombre" required><input value={tNombre} onChange={(e) => setTNombre(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
          <Field label="DNI" required><input value={tDni} onChange={(e) => setTDni(e.target.value)} maxLength={8} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
          <Field label="Edad"><input type="number" min={18} value={tEdad} onChange={(e) => setTEdad(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
          <Field label="Género">
            <select value={tGenero} onChange={(e) => setTGenero(e.target.value as 'M' | 'F' | 'otro')} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm">
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="otro">Otro</option>
            </select>
          </Field>
          <Field label="Cargo" required><input value={tCargo} onChange={(e) => setTCargo(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
          <Field label="Área" required><input value={tArea} onChange={(e) => setTArea(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
          <Field label="Antigüedad (meses)"><input type="number" value={tAntiguedad} onChange={(e) => setTAntiguedad(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
        </div>
      </div>

      {/* Descripción */}
      <div>
        <p className="text-sm font-bold mb-2">Descripción del evento</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Forma del evento" required>
            <select value={forma} onChange={(e) => setForma(e.target.value as FormaAccidente)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm">
              <option value="caida_mismo_nivel">Caída mismo nivel</option>
              <option value="caida_distinto_nivel">Caída distinto nivel</option>
              <option value="golpe">Golpe por/contra objeto</option>
              <option value="atrapamiento">Atrapamiento</option>
              <option value="corte">Corte</option>
              <option value="quemadura">Quemadura</option>
              <option value="contacto_electrico">Contacto eléctrico</option>
              <option value="sobreesfuerzo">Sobreesfuerzo</option>
              <option value="exposicion_quimico">Exposición químico</option>
              <option value="exposicion_biologico">Exposición biológico</option>
              <option value="accidente_transito">Accidente tránsito</option>
              <option value="otro">Otro</option>
            </select>
          </Field>
          {tipo.startsWith('accidente') ? (
            <Field label="Parte del cuerpo lesionada">
              <select value={parteCuerpo} onChange={(e) => setParteCuerpo(e.target.value as ParteCuerpo)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm">
                <option value="cabeza">Cabeza</option>
                <option value="cuello">Cuello</option>
                <option value="torax">Tórax</option>
                <option value="abdomen">Abdomen</option>
                <option value="espalda">Espalda</option>
                <option value="miembros_superiores">Miembros superiores</option>
                <option value="miembros_inferiores">Miembros inferiores</option>
                <option value="multiples">Múltiples partes</option>
                <option value="no_aplica">No aplica</option>
              </select>
            </Field>
          ) : null}
        </div>
        <Field label="Descripción de los hechos" required>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4} placeholder="Qué pasó, cómo, cuándo, con qué equipos/materiales..." className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm resize-none" />
        </Field>
        <Field label="Secuencia causal">
          <textarea value={secuenciaCausal} onChange={(e) => setSecuenciaCausal(e.target.value)} rows={2} placeholder="Paso a paso de cómo se desencadenó" className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm resize-none" />
        </Field>
        <Field label="Diagnóstico médico">
          <input value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} placeholder="Ej. Esguince grado 2" className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
      </div>

      {/* Consecuencias */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Días de incapacidad">
          <input type="number" min={0} value={diasIncapacidad} onChange={(e) => setDiasIncapacidad(Number(e.target.value) || 0)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Costo estimado (S/)">
          <input type="number" min={0} value={costoEstimado} onChange={(e) => setCostoEstimado(e.target.value)} placeholder="Opcional" className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
      </div>

      {/* Causas */}
      <div>
        <p className="text-sm font-bold mb-2">Investigación del evento</p>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold uppercase tracking-widest text-[color:var(--text-secondary)]">Causas inmediatas</label>
            <MiniBtn onClick={() => addArr(causasInmediatas, setCausasInmediatas)}>+ Causa</MiniBtn>
          </div>
          {causasInmediatas.map((c, i) => (
            <div key={i} className="flex gap-1 mb-1">
              <input value={c} onChange={(e) => updateArr(causasInmediatas, setCausasInmediatas, i, e.target.value)} placeholder="Ej. Piso mojado sin señalización" className="flex-1 rounded border border-[color:var(--border-default)] bg-white px-2 py-1.5 text-sm" />
              {causasInmediatas.length > 1 ? <button onClick={() => removeArr(causasInmediatas, setCausasInmediatas, i)} className="text-crimson-700 rounded p-1"><Trash2 className="h-3 w-3" /></button> : null}
            </div>
          ))}
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold uppercase tracking-widest text-[color:var(--text-secondary)]">Causas básicas</label>
            <MiniBtn onClick={() => addArr(causasBasicas, setCausasBasicas)}>+ Causa</MiniBtn>
          </div>
          {causasBasicas.map((c, i) => (
            <div key={i} className="flex gap-1 mb-1">
              <input value={c} onChange={(e) => updateArr(causasBasicas, setCausasBasicas, i, e.target.value)} placeholder="Ej. Falta de procedimiento de limpieza" className="flex-1 rounded border border-[color:var(--border-default)] bg-white px-2 py-1.5 text-sm" />
              {causasBasicas.length > 1 ? <button onClick={() => removeArr(causasBasicas, setCausasBasicas, i)} className="text-crimson-700 rounded p-1"><Trash2 className="h-3 w-3" /></button> : null}
            </div>
          ))}
        </div>
      </div>

      {/* Acciones correctivas */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold">Acciones correctivas</p>
          <MiniBtn onClick={addAccion}>+ Acción</MiniBtn>
        </div>
        <div className="space-y-2">
          {acciones.map((a, i) => (
            <div key={i} className="flex flex-wrap gap-1.5 items-start rounded bg-white border border-[color:var(--border-subtle)] px-2 py-1.5">
              <input value={a.accion} onChange={(e) => updateAccion(i, 'accion', e.target.value)} placeholder={`Acción #${i + 1}`} className="flex-1 min-w-[200px] rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
              <input value={a.responsable} onChange={(e) => updateAccion(i, 'responsable', e.target.value)} placeholder="Responsable" className="w-32 rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
              <input type="number" value={a.plazoDias} onChange={(e) => updateAccion(i, 'plazoDias', e.target.value)} placeholder="Días" min={1} className="w-16 rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
              {acciones.length > 1 ? <button onClick={() => removeAccion(i)} className="text-crimson-700 rounded p-0.5"><Trash2 className="h-3 w-3" /></button> : null}
            </div>
          ))}
        </div>
      </div>

      {/* Notificación MTPE */}
      {notifica24h ? (
        <div className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)]/50 p-3">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={notificado} onChange={(e) => setNotificado(e.target.checked)} className="h-4 w-4" />
            <span className="text-sm font-bold">Ya notifiqué al MTPE</span>
          </label>
          {notificado ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <Field label="Fecha de notificación">
                <input type="date" value={fechaNotif} onChange={(e) => setFechaNotif(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
              </Field>
              <Field label="N° de reporte / constancia">
                <input value={numReporte} onChange={(e) => setNumReporte(e.target.value)} placeholder="Ej. CONSTANCIA-2026-0042" className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
              </Field>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="pt-2">
        <Button onClick={submit} disabled={loading || !canSubmit} icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} size="lg">
          {loading ? 'Generando…' : 'Generar registro'}
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
