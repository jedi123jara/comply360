'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GeneratorShell } from '@/components/generadores/generator-shell'
import type { EntregaEppParams, EppItem } from '@/lib/generators/entrega-epp'

export default function EntregaEppPage() {
  return (
    <GeneratorShell
      type="entrega-epp"
      title="Acta de Entrega de EPP"
      description="Registro firmable por trabajador de Equipo de Protección Personal entregado. Incluye vida útil + fecha de reposición calculada automáticamente."
      baseLegal="Ley 29783, Art. 60 · R.M. 050-2013-TR Anexo 7"
      gravity="GRAVE"
      estimatedMinutes={4}
      renderForm={({ onSubmit, loading }) => <Form onSubmit={onSubmit} loading={loading} />}
    />
  )
}

interface ItemRow extends EppItem {
  id: string
}

function createItem(): ItemRow {
  return { id: `i-${Math.random().toString(36).slice(2, 8)}`, tipo: '', cantidad: 1, vidaUtilMeses: 12 }
}

function Form({ onSubmit, loading }: { onSubmit: (p: unknown) => void | Promise<void>; loading: boolean }) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [tipoEntrega, setTipoEntrega] = useState<EntregaEppParams['tipoEntrega']>('inicial')
  const [motivoReposicion, setMotivoReposicion] = useState('')
  const [tNombre, setTNombre] = useState('')
  const [tDni, setTDni] = useState('')
  const [tCargo, setTCargo] = useState('')
  const [tArea, setTArea] = useState('')
  const [responsableEntrega, setResponsableEntrega] = useState('')
  const [items, setItems] = useState<ItemRow[]>([createItem()])

  function updateI(id: string, field: keyof ItemRow, value: string | number) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)))
  }
  const addI = () => setItems((prev) => [...prev, createItem()])
  const removeI = (id: string) => setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev))

  const validItems = items.filter((i) => i.tipo.trim() && i.cantidad > 0)
  const canSubmit = tNombre.trim() && tDni.trim() && tCargo.trim() && responsableEntrega.trim() && validItems.length >= 1

  function submit() {
    const params: EntregaEppParams = {
      fecha,
      trabajador: { nombre: tNombre.trim(), dni: tDni.trim(), cargo: tCargo.trim(), area: tArea.trim() || 'Sin área' },
      items: validItems.map((i) => ({
        tipo: i.tipo.trim(),
        marca: i.marca?.trim() || undefined,
        modelo: i.modelo?.trim() || undefined,
        talla: i.talla?.trim() || undefined,
        cantidad: Number(i.cantidad) || 1,
        vidaUtilMeses: i.vidaUtilMeses ? Number(i.vidaUtilMeses) : undefined,
        normaTecnica: i.normaTecnica?.trim() || undefined,
        certificacion: i.certificacion?.trim() || undefined,
      })),
      tipoEntrega,
      motivoReposicion: tipoEntrega === 'reposicion' ? motivoReposicion.trim() || undefined : undefined,
      responsableEntrega: responsableEntrega.trim(),
    }
    onSubmit(params)
  }

  return (
    <Card padding="lg" className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Fecha" required>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Tipo de entrega" required>
          <select value={tipoEntrega} onChange={(e) => setTipoEntrega(e.target.value as EntregaEppParams['tipoEntrega'])} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm">
            <option value="inicial">Entrega inicial</option>
            <option value="renovacion">Renovación</option>
            <option value="reposicion">Reposición</option>
          </select>
        </Field>
        <Field label="Responsable de entrega" required>
          <input value={responsableEntrega} onChange={(e) => setResponsableEntrega(e.target.value)} placeholder="Nombre y cargo" className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
      </div>

      {tipoEntrega === 'reposicion' ? (
        <Field label="Motivo de reposición">
          <input value={motivoReposicion} onChange={(e) => setMotivoReposicion(e.target.value)} placeholder="Desgaste / daño / extravío" className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" />
        </Field>
      ) : null}

      <div>
        <p className="text-sm font-bold mb-2">Trabajador receptor</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Field label="Nombre" required><input value={tNombre} onChange={(e) => setTNombre(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
          <Field label="DNI" required><input value={tDni} onChange={(e) => setTDni(e.target.value)} maxLength={8} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
          <Field label="Cargo" required><input value={tCargo} onChange={(e) => setTCargo(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
          <Field label="Área"><input value={tArea} onChange={(e) => setTArea(e.target.value)} className="w-full rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm" /></Field>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold">EPP entregado ({items.length})</p>
          <button onClick={addI} className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100">
            <Plus className="h-3 w-3" /> Item
          </button>
        </div>
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.id} className="rounded border border-[color:var(--border-subtle)] bg-white p-2 space-y-1">
              <div className="flex flex-wrap gap-1">
                <input value={i.tipo} onChange={(e) => updateI(i.id, 'tipo', e.target.value)} placeholder="Tipo (ej. Casco de seguridad)" className="flex-1 min-w-[180px] rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
                <input value={i.marca ?? ''} onChange={(e) => updateI(i.id, 'marca', e.target.value)} placeholder="Marca" className="w-24 rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
                <input value={i.talla ?? ''} onChange={(e) => updateI(i.id, 'talla', e.target.value)} placeholder="Talla" className="w-16 rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
                <input type="number" min={1} value={i.cantidad} onChange={(e) => updateI(i.id, 'cantidad', Number(e.target.value) || 1)} placeholder="Cant." className="w-16 rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
                <input type="number" min={0} value={i.vidaUtilMeses ?? 0} onChange={(e) => updateI(i.id, 'vidaUtilMeses', Number(e.target.value) || 0)} placeholder="Vida útil (meses)" className="w-28 rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
                {items.length > 1 ? <button onClick={() => removeI(i.id)} className="text-crimson-700 rounded p-0.5"><Trash2 className="h-3 w-3" /></button> : null}
              </div>
              <div className="flex flex-wrap gap-1">
                <input value={i.normaTecnica ?? ''} onChange={(e) => updateI(i.id, 'normaTecnica', e.target.value)} placeholder="Norma técnica (ej. ANSI Z89.1)" className="flex-1 min-w-[150px] rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
                <input value={i.certificacion ?? ''} onChange={(e) => updateI(i.id, 'certificacion', e.target.value)} placeholder="Certificación (CE, ANSI)" className="flex-1 min-w-[120px] rounded border border-[color:var(--border-default)] bg-white px-2 py-1 text-xs" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={submit} disabled={loading || !canSubmit} icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} size="lg">
        {loading ? 'Generando…' : 'Generar acta de entrega'}
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
