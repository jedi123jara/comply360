'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GeneratorShell } from '@/components/generadores/generator-shell'
import type {
  DeclaracionJuradaParams,
  Derechohabiente,
} from '@/lib/generators/declaracion-jurada'

export default function DeclaracionJuradaPage() {
  return (
    <GeneratorShell
      type="declaracion-jurada"
      title="Declaración Jurada del Trabajador"
      description="DDJJ con domicilio, estado civil, derechohabientes, régimen previsional y asignación familiar. Obligatoria al ingreso y ante cualquier cambio."
      baseLegal="D.S. 001-98-TR · Ley 25129 · D.S. 054-97-EF · Ley 29733"
      gravity="LEVE"
      estimatedMinutes={5}
      renderForm={({ onSubmit, loading }) => <Form onSubmit={onSubmit} loading={loading} />}
    />
  )
}

interface DhRow extends Derechohabiente {
  id: string
}

function createDh(): DhRow {
  return {
    id: `d-${Math.random().toString(36).slice(2, 8)}`,
    nombreCompleto: '',
    dni: '',
    parentesco: 'hijo',
    conDiscapacidad: false,
    enEstudiosSuperiores: false,
  }
}

function Form({ onSubmit, loading }: { onSubmit: (p: unknown) => void | Promise<void>; loading: boolean }) {
  // Trabajador
  const [tNombre, setTNombre] = useState('')
  const [tDni, setTDni] = useState('')
  const [tFechaNac, setTFechaNac] = useState('')
  const [tEstadoCivil, setTEstadoCivil] = useState<DeclaracionJuradaParams['trabajador']['estadoCivil']>('soltero')
  const [tTelefono, setTTelefono] = useState('')
  const [tEmail, setTEmail] = useState('')

  // Domicilio
  const [direccion, setDireccion] = useState('')
  const [distrito, setDistrito] = useState('')
  const [provincia, setProvincia] = useState('')
  const [departamento, setDepartamento] = useState('Lima')

  // Derechohabientes
  const [derechohabientes, setDerechohabientes] = useState<DhRow[]>([])

  // Previsional
  const [sistema, setSistema] = useState<DeclaracionJuradaParams['previsional']['sistema']>('AFP')
  const [afpNombre, setAfpNombre] = useState('')
  const [cuspp, setCuspp] = useState('')
  const [fechaAfiliacion, setFechaAfiliacion] = useState('')

  const [recibeAsigFam, setRecibeAsigFam] = useState(false)
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))

  function updateDh(id: string, field: keyof DhRow, value: string | boolean) {
    setDerechohabientes((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)))
  }
  const addDh = () => setDerechohabientes((prev) => [...prev, createDh()])
  const removeDh = (id: string) => setDerechohabientes((prev) => prev.filter((d) => d.id !== id))

  const canSubmit =
    tNombre.trim() && tDni.trim() && direccion.trim() && distrito.trim() && provincia.trim() && departamento.trim()

  function submit() {
    const params: DeclaracionJuradaParams = {
      trabajador: {
        nombre: tNombre.trim(),
        dni: tDni.trim(),
        fechaNacimiento: tFechaNac || undefined,
        estadoCivil: tEstadoCivil,
        telefono: tTelefono.trim() || undefined,
        email: tEmail.trim() || undefined,
      },
      domicilio: {
        direccion: direccion.trim(),
        distrito: distrito.trim(),
        provincia: provincia.trim(),
        departamento: departamento.trim(),
      },
      derechohabientes: derechohabientes
        .filter((d) => d.nombreCompleto.trim() && d.dni.trim())
        .map<Derechohabiente>((d) => ({
          nombreCompleto: d.nombreCompleto.trim(),
          dni: d.dni.trim(),
          fechaNacimiento: d.fechaNacimiento || undefined,
          parentesco: d.parentesco,
          conDiscapacidad: d.conDiscapacidad || undefined,
          enEstudiosSuperiores: d.enEstudiosSuperiores || undefined,
        })),
      previsional: {
        sistema,
        afpNombre: sistema === 'AFP' ? afpNombre.trim() || undefined : undefined,
        cuspp: sistema === 'AFP' ? cuspp.trim() || undefined : undefined,
        fechaAfiliacion: fechaAfiliacion || undefined,
      },
      recibeAsignacionFamiliar: recibeAsigFam,
      fecha,
    }
    onSubmit(params)
  }

  return (
    <Card padding="lg" className="space-y-4">
      {/* Trabajador */}
      <div>
        <p className="text-sm font-bold mb-2">Datos del trabajador</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nombre completo" required><input value={tNombre} onChange={(e) => setTNombre(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
          <Field label="DNI" required><input value={tDni} onChange={(e) => setTDni(e.target.value)} maxLength={8} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
          <Field label="Fecha de nacimiento"><input type="date" value={tFechaNac} onChange={(e) => setTFechaNac(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
          <Field label="Estado civil" required>
            <select value={tEstadoCivil} onChange={(e) => setTEstadoCivil(e.target.value as DeclaracionJuradaParams['trabajador']['estadoCivil'])} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm">
              <option value="soltero">Soltero/a</option>
              <option value="casado">Casado/a</option>
              <option value="conviviente">Conviviente</option>
              <option value="divorciado">Divorciado/a</option>
              <option value="viudo">Viudo/a</option>
            </select>
          </Field>
          <Field label="Teléfono"><input value={tTelefono} onChange={(e) => setTTelefono(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
          <Field label="Email"><input type="email" value={tEmail} onChange={(e) => setTEmail(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
        </div>
      </div>

      {/* Domicilio */}
      <div>
        <p className="text-sm font-bold mb-2">Domicilio</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Dirección" required><input value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
          <Field label="Distrito" required><input value={distrito} onChange={(e) => setDistrito(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
          <Field label="Provincia" required><input value={provincia} onChange={(e) => setProvincia(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
          <Field label="Departamento" required><input value={departamento} onChange={(e) => setDepartamento(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
        </div>
      </div>

      {/* Derechohabientes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold">Derechohabientes ({derechohabientes.length})</p>
          <button onClick={addDh} className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100">
            <Plus className="h-3 w-3" /> Derechohabiente
          </button>
        </div>
        <div className="space-y-1">
          {derechohabientes.map((d) => (
            <div key={d.id} className="flex flex-wrap gap-1 items-start rounded bg-white border border-[color:var(--border-subtle)] px-2 py-1.5">
              <input value={d.nombreCompleto} onChange={(e) => updateDh(d.id, 'nombreCompleto', e.target.value)} placeholder="Nombre completo" className="flex-1 min-w-[180px] rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
              <input value={d.dni} onChange={(e) => updateDh(d.id, 'dni', e.target.value)} placeholder="DNI" maxLength={8} className="w-24 rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
              <input type="date" value={d.fechaNacimiento ?? ''} onChange={(e) => updateDh(d.id, 'fechaNacimiento', e.target.value)} className="w-36 rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
              <select value={d.parentesco} onChange={(e) => updateDh(d.id, 'parentesco', e.target.value)} className="rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs">
                <option value="conyuge">Cónyuge</option>
                <option value="conviviente">Conviviente</option>
                <option value="hijo">Hijo</option>
                <option value="hija">Hija</option>
                <option value="padre">Padre</option>
                <option value="madre">Madre</option>
                <option value="otro">Otro</option>
              </select>
              <label className="inline-flex items-center gap-1 text-[10px]"><input type="checkbox" checked={d.conDiscapacidad ?? false} onChange={(e) => updateDh(d.id, 'conDiscapacidad', e.target.checked)} className="h-3 w-3" /> Discap.</label>
              <label className="inline-flex items-center gap-1 text-[10px]"><input type="checkbox" checked={d.enEstudiosSuperiores ?? false} onChange={(e) => updateDh(d.id, 'enEstudiosSuperiores', e.target.checked)} className="h-3 w-3" /> Estudia</label>
              <button onClick={() => removeDh(d.id)} className="text-crimson-700 rounded p-0.5"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 mt-2">
          <input type="checkbox" checked={recibeAsigFam} onChange={(e) => setRecibeAsigFam(e.target.checked)} className="h-4 w-4" />
          <span className="text-sm">Declaro tener derecho a Asignación Familiar (hijos menores de 18 o hasta 24 estudiando)</span>
        </label>
      </div>

      {/* Previsional */}
      <div>
        <p className="text-sm font-bold mb-2">Régimen previsional</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Field label="Sistema" required>
            <select value={sistema} onChange={(e) => setSistema(e.target.value as DeclaracionJuradaParams['previsional']['sistema'])} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm">
              <option value="AFP">AFP (privado)</option>
              <option value="ONP">ONP (público)</option>
              <option value="sin_afiliacion">Sin afiliación</option>
            </select>
          </Field>
          {sistema === 'AFP' ? (
            <>
              <Field label="AFP">
                <select value={afpNombre} onChange={(e) => setAfpNombre(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm">
                  <option value="">Seleccionar</option>
                  <option value="Integra">Integra</option>
                  <option value="Prima">Prima</option>
                  <option value="Habitat">Hábitat</option>
                  <option value="Profuturo">Profuturo</option>
                </select>
              </Field>
              <Field label="CUSPP">
                <input value={cuspp} onChange={(e) => setCuspp(e.target.value)} placeholder="Código Único de Afiliación" className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
              </Field>
            </>
          ) : null}
          <Field label="Fecha de afiliación">
            <input type="date" value={fechaAfiliacion} onChange={(e) => setFechaAfiliacion(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
          </Field>
        </div>
      </div>

      <Field label="Fecha de la declaración">
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
      </Field>

      <Button onClick={submit} disabled={loading || !canSubmit} icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} size="lg">
        {loading ? 'Generando…' : 'Generar Declaración Jurada'}
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
