'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

const TIPOS = [
  { value: 'OFICINA', label: 'Oficina' },
  { value: 'PLANTA', label: 'Planta' },
  { value: 'OBRA', label: 'Obra' },
  { value: 'SUCURSAL', label: 'Sucursal' },
  { value: 'TALLER', label: 'Taller' },
  { value: 'ALMACEN', label: 'Almacén' },
  { value: 'CAMPO', label: 'Campo' },
] as const

interface FormState {
  nombre: string
  direccion: string
  ubigeo: string
  departamento: string
  provincia: string
  distrito: string
  tipoInstalacion: string
  areaM2: string
  numeroPisos: string
  lat: string
  lng: string
}

export default function NuevaSedePage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    nombre: '',
    direccion: '',
    ubigeo: '',
    departamento: '',
    provincia: '',
    distrito: '',
    tipoInstalacion: 'OFICINA',
    areaM2: '',
    numeroPisos: '',
    lat: '',
    lng: '',
  })
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        nombre: form.nombre.trim(),
        direccion: form.direccion.trim(),
        ubigeo: form.ubigeo.trim(),
        departamento: form.departamento.trim(),
        provincia: form.provincia.trim(),
        distrito: form.distrito.trim(),
        tipoInstalacion: form.tipoInstalacion,
      }
      if (form.areaM2) payload.areaM2 = Number(form.areaM2)
      if (form.numeroPisos) payload.numeroPisos = Number(form.numeroPisos)
      if (form.lat) payload.lat = Number(form.lat)
      if (form.lng) payload.lng = Number(form.lng)

      const res = await fetch('/api/sst/sedes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail =
          json?.details?.fieldErrors
            ? Object.entries(json.details.fieldErrors)
                .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
                .join('. ')
            : json?.error || 'No se pudo crear la sede'
        toast.error(detail)
        return
      }
      toast.success('Sede creada')
      router.push(`/dashboard/sst/sedes/${json.sede.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/sst/sedes"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-emerald-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver a sedes
      </Link>

      <PageHeader
        eyebrow="SST · Sedes"
        title="Nueva sede"
        subtitle="Registra un centro de trabajo para asociarle puestos, matrices IPERC y visitas de inspección."
      />

      <Card>
        <CardContent className="py-6">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre" required>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Sede Lima Centro"
                  value={form.nombre}
                  onChange={(e) => update('nombre', e.target.value)}
                />
              </Field>
              <Field label="Tipo de instalación" required>
                <select
                  required
                  className="input"
                  value={form.tipoInstalacion}
                  onChange={(e) => update('tipoInstalacion', e.target.value)}
                >
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Dirección" required>
              <input
                type="text"
                required
                className="input"
                placeholder="Av. Javier Prado 1234, San Isidro"
                value={form.direccion}
                onChange={(e) => update('direccion', e.target.value)}
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Ubigeo INEI (6 dígitos)" required>
                <input
                  type="text"
                  required
                  pattern="\d{6}"
                  inputMode="numeric"
                  maxLength={6}
                  className="input"
                  placeholder="150131"
                  value={form.ubigeo}
                  onChange={(e) => update('ubigeo', e.target.value.replace(/\D/g, ''))}
                />
              </Field>
              <Field label="Departamento" required>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Lima"
                  value={form.departamento}
                  onChange={(e) => update('departamento', e.target.value)}
                />
              </Field>
              <Field label="Provincia" required>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Lima"
                  value={form.provincia}
                  onChange={(e) => update('provincia', e.target.value)}
                />
              </Field>
              <Field label="Distrito" required>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="San Isidro"
                  value={form.distrito}
                  onChange={(e) => update('distrito', e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Área (m²)">
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="input"
                  placeholder="500"
                  value={form.areaM2}
                  onChange={(e) => update('areaM2', e.target.value)}
                />
              </Field>
              <Field label="Número de pisos">
                <input
                  type="number"
                  min="0"
                  className="input"
                  placeholder="3"
                  value={form.numeroPisos}
                  onChange={(e) => update('numeroPisos', e.target.value)}
                />
              </Field>
              <Field label="Latitud (opcional)">
                <input
                  type="number"
                  step="any"
                  className="input"
                  placeholder="-12.0931"
                  value={form.lat}
                  onChange={(e) => update('lat', e.target.value)}
                />
              </Field>
              <Field label="Longitud (opcional)">
                <input
                  type="number"
                  step="any"
                  className="input"
                  placeholder="-77.0465"
                  value={form.lng}
                  onChange={(e) => update('lng', e.target.value)}
                />
              </Field>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <Link href="/dashboard/sst/sedes">
                <Button type="button" variant="secondary">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear sede
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
        }
        .input:focus {
          outline: none;
          border-color: rgb(16 185 129);
          box-shadow: 0 0 0 3px rgb(16 185 129 / 0.15);
        }
      `}</style>
    </div>
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
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  )
}
