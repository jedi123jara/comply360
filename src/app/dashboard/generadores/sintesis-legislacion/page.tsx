'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GeneratorShell } from '@/components/generadores/generator-shell'
import type { SintesisLegislacionParams } from '@/lib/generators/sintesis-legislacion'

export default function SintesisLegislacionPage() {
  return (
    <GeneratorShell
      type="sintesis-legislacion"
      title="Síntesis de la Legislación Laboral"
      description="Cartel oficial obligatorio (Art. 48 D.S. 001-98-TR) con los derechos laborales esenciales. 10 secciones: remuneraciones, jornada, beneficios, licencias, SST, derechos, despido, SUNAFIL."
      baseLegal="D.S. 001-98-TR, Art. 48"
      gravity="LEVE"
      estimatedMinutes={2}
      renderForm={({ onSubmit, loading }) => <Form onSubmit={onSubmit} loading={loading} />}
    />
  )
}

function Form({ onSubmit, loading }: { onSubmit: (p: unknown) => void | Promise<void>; loading: boolean }) {
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [rmv, setRmv] = useState(1130)
  const [uit, setUit] = useState(5500)
  const [regimen, setRegimen] = useState<'GENERAL' | 'MYPE_PEQUENA' | 'MYPE_MICRO'>('GENERAL')

  function submit() {
    const params: SintesisLegislacionParams = { anio, rmv, uit, regimen }
    onSubmit(params)
  }

  return (
    <Card padding="lg" className="space-y-4">
      <p className="text-sm text-[color:var(--text-secondary)]">
        Un cartel en 30 segundos. Solo confirmá los montos del año — el resto se genera automáticamente con los derechos laborales estándar.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Field label="Año">
          <input type="number" min={2024} max={2035} value={anio} onChange={(e) => setAnio(Number(e.target.value) || new Date().getFullYear())} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="RMV (S/)">
          <input type="number" min={0} value={rmv} onChange={(e) => setRmv(Number(e.target.value) || 1130)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="UIT (S/)">
          <input type="number" min={0} value={uit} onChange={(e) => setUit(Number(e.target.value) || 5500)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Régimen predominante">
          <select value={regimen} onChange={(e) => setRegimen(e.target.value as 'GENERAL' | 'MYPE_PEQUENA' | 'MYPE_MICRO')} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm">
            <option value="GENERAL">General</option>
            <option value="MYPE_PEQUENA">MYPE Pequeña</option>
            <option value="MYPE_MICRO">MYPE Micro</option>
          </select>
        </Field>
      </div>
      <Button onClick={submit} disabled={loading} icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} size="lg">
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
