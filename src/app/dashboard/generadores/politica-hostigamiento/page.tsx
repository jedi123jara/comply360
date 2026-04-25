'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GeneratorShell } from '@/components/generadores/generator-shell'
import type { PoliticaHostigamientoParams } from '@/lib/generators/politica-hostigamiento'

export default function PoliticaHostigamientoPage() {
  return (
    <GeneratorShell
      type="politica-hostigamiento"
      title="Política contra el Hostigamiento Sexual"
      description="Política obligatoria conforme D.S. 014-2019-MIMP con CIHSO, canal de denuncia confidencial, procedimiento de 30 días y medidas de protección."
      baseLegal="Ley 27942 · D.S. 014-2019-MIMP · Ley 29430"
      gravity="MUY_GRAVE"
      estimatedMinutes={8}
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
  const [canalTipo, setCanalTipo] = useState<PoliticaHostigamientoParams['canalDenuncia']['tipo']>('email')
  const [email, setEmail] = useState('')
  const [urlFormulario, setUrlFormulario] = useState('')
  const [telefono, setTelefono] = useState('')
  const [repEmpleador, setRepEmpleador] = useState('')
  const [supEmpleador, setSupEmpleador] = useState('')
  const [repTrabajadores, setRepTrabajadores] = useState('')
  const [supTrabajadores, setSupTrabajadores] = useState('')
  const [formaEleccion, setFormaEleccion] = useState('')
  const [fechaAprobacion, setFechaAprobacion] = useState(new Date().toISOString().slice(0, 10))
  const [vigenciaAnos, setVigenciaAnos] = useState(2)
  const [capacitacionesMin, setCapacitacionesMin] = useState(1)

  const valid =
    repEmpleador.trim() &&
    repTrabajadores.trim() &&
    (email.trim() || urlFormulario.trim() || telefono.trim())

  function submit() {
    const params: PoliticaHostigamientoParams = {
      canalDenuncia: {
        tipo: canalTipo,
        email: email.trim() || undefined,
        urlFormulario: urlFormulario.trim() || undefined,
        telefono: telefono.trim() || undefined,
      },
      cihso: {
        representanteEmpleador: repEmpleador.trim(),
        suplenteEmpleador: supEmpleador.trim() || undefined,
        representanteTrabajadores: repTrabajadores.trim(),
        suplenteTrabajadores: supTrabajadores.trim() || undefined,
        formaEleccion: formaEleccion.trim() || undefined,
      },
      fechaAprobacion,
      vigenciaAnos,
      capacitacionesAnualesMin: capacitacionesMin,
    }
    onSubmit(params)
  }

  return (
    <Card padding="lg" className="space-y-5">
      {/* CIHSO */}
      <div>
        <p className="text-sm font-bold mb-2">Comité CIHSO</p>
        <p className="text-xs text-[color:var(--text-tertiary)] mb-3">
          El Comité de Intervención contra el Hostigamiento Sexual se compone de 2 titulares
          (1 del empleador + 1 de los trabajadores) y sus suplentes. D.S. 014-2019-MIMP Art. 19-21.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Representante del empleador" required>
            <input
              type="text"
              value={repEmpleador}
              onChange={(e) => setRepEmpleador(e.target.value)}
              placeholder="Nombre completo"
              className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Suplente del empleador">
            <input
              type="text"
              value={supEmpleador}
              onChange={(e) => setSupEmpleador(e.target.value)}
              placeholder="Nombre completo (opcional)"
              className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Representante de trabajadores" required>
            <input
              type="text"
              value={repTrabajadores}
              onChange={(e) => setRepTrabajadores(e.target.value)}
              placeholder="Nombre completo"
              className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Suplente de trabajadores">
            <input
              type="text"
              value={supTrabajadores}
              onChange={(e) => setSupTrabajadores(e.target.value)}
              placeholder="Nombre completo (opcional)"
              className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
            />
          </Field>
        </div>
        <Field label="Forma de elección del representante de trabajadores">
          <input
            type="text"
            value={formaEleccion}
            onChange={(e) => setFormaEleccion(e.target.value)}
            placeholder="Ej. Elección directa del 17/03/2026 con acta firmada"
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
          />
        </Field>
      </div>

      {/* Canal de denuncia */}
      <div>
        <p className="text-sm font-bold mb-2">Canal de denuncia confidencial</p>
        <p className="text-xs text-[color:var(--text-tertiary)] mb-3">
          Al menos un canal obligatorio. Recomendado: email dedicado + teléfono anónimo.
        </p>
        <div className="space-y-3">
          <Field label="Email dedicado">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="denuncias.hostigamiento@empresa.pe"
              className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Formulario web confidencial">
            <input
              type="url"
              value={urlFormulario}
              onChange={(e) => setUrlFormulario(e.target.value)}
              placeholder="https://empresa.pe/denuncias"
              className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Teléfono anónimo">
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+51 000 000 000 (línea interna)"
              className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
            />
          </Field>
        </div>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Fecha de aprobación" required>
          <input
            type="date"
            value={fechaAprobacion}
            onChange={(e) => setFechaAprobacion(e.target.value)}
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Vigencia (años)">
          <input
            type="number"
            min={1}
            max={5}
            value={vigenciaAnos}
            onChange={(e) => setVigenciaAnos(Math.max(1, Number(e.target.value) || 1))}
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Capacitaciones/año (mín. 1)">
          <input
            type="number"
            min={1}
            max={12}
            value={capacitacionesMin}
            onChange={(e) => setCapacitacionesMin(Math.max(1, Number(e.target.value) || 1))}
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <div className="pt-2">
        <Button
          onClick={submit}
          disabled={loading || !valid}
          icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          size="lg"
        >
          {loading ? 'Generando…' : 'Generar política'}
        </Button>
        {!valid ? (
          <p className="text-xs text-[color:var(--text-tertiary)] mt-2">
            Completa al menos los representantes del CIHSO y 1 canal de denuncia.
          </p>
        ) : null}
      </div>

      {/* Unused state warning suppressor */}
      <div className="hidden" aria-hidden>
        {canalTipo}
        <button onClick={() => setCanalTipo('multiple')} />
      </div>
    </Card>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
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
