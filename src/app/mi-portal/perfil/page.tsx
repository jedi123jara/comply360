'use client'

import { useEffect, useState } from 'react'
import { User, Mail, Phone, MapPin, Calendar, Briefcase, Building2, Save, AlertCircle, CheckCircle2 } from 'lucide-react'

interface PerfilData {
  firstName: string
  lastName: string
  dni: string
  email: string | null
  phone: string | null
  birthDate: string | null
  gender: string | null
  nationality: string | null
  address: string | null
  position: string | null
  department: string | null
  fechaIngreso: string
  regimenLaboral: string
  tipoContrato: string
  organization: { name: string; ruc: string | null }
}

export default function PerfilPage() {
  const [data, setData] = useState<PerfilData | null>(null)
  const [editing, setEditing] = useState<{ email: string; phone: string; address: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/mi-portal/perfil')
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setEditing({ email: d.email || '', phone: d.phone || '', address: d.address || '' })
      })
      .catch(() => setMessage({ type: 'error', text: 'No se pudo cargar tu perfil' }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/mi-portal/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })
      if (!res.ok) throw new Error('Error al guardar')
      const updated = await res.json()
      setData(updated)
      setMessage({ type: 'success', text: 'Cambios guardados correctamente' })
    } catch {
      setMessage({ type: 'error', text: 'No se pudo actualizar tu perfil' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="h-96 bg-slate-100 animate-pulse rounded-xl" />
  if (!data || !editing) return <div className="text-slate-500">No hay datos disponibles.</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Mi Perfil</h2>
        <p className="text-sm text-slate-500 mt-1">
          Tus datos personales y laborales. Solo puedes actualizar email, telefono y direccion.
        </p>
      </div>

      {message && (
        <div className={`flex items-start gap-3 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Datos personales (solo lectura) */}
      <Section title="Datos personales" subtitle="Estos datos solo pueden ser modificados por RRHH.">
        <Field icon={User} label="Nombre completo" value={`${data.firstName} ${data.lastName}`} />
        <Field icon={User} label="DNI" value={data.dni} />
        <Field icon={Calendar} label="Fecha de nacimiento" value={data.birthDate ? new Date(data.birthDate).toLocaleDateString('es-PE') : '—'} />
        <Field icon={User} label="Genero" value={data.gender || '—'} />
        <Field icon={MapPin} label="Nacionalidad" value={data.nationality || '—'} />
      </Section>

      {/* Datos editables */}
      <Section title="Datos de contacto" subtitle="Mantén actualizada esta informacion para recibir notificaciones importantes.">
        <EditField
          icon={Mail}
          label="Email personal"
          type="email"
          value={editing.email}
          onChange={(v) => setEditing({ ...editing, email: v })}
        />
        <EditField
          icon={Phone}
          label="Telefono"
          type="tel"
          value={editing.phone}
          onChange={(v) => setEditing({ ...editing, phone: v })}
        />
        <EditField
          icon={MapPin}
          label="Direccion"
          type="text"
          value={editing.address}
          onChange={(v) => setEditing({ ...editing, address: v })}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </Section>

      {/* Datos laborales (solo lectura) */}
      <Section title="Datos laborales" subtitle="Para cualquier cambio, contacta al area de RRHH.">
        <Field icon={Building2} label="Empresa" value={data.organization.name} />
        {data.organization.ruc && <Field icon={Building2} label="RUC" value={data.organization.ruc} />}
        <Field icon={Briefcase} label="Puesto" value={data.position || '—'} />
        <Field icon={Briefcase} label="Departamento" value={data.department || '—'} />
        <Field icon={Calendar} label="Fecha de ingreso" value={new Date(data.fechaIngreso).toLocaleDateString('es-PE')} />
        <Field icon={Briefcase} label="Regimen laboral" value={data.regimenLaboral.replaceAll('_', ' ')} />
        <Field icon={Briefcase} label="Tipo de contrato" value={data.tipoContrato.replaceAll('_', ' ')} />
      </Section>
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#141824] border border-slate-200 rounded-xl p-5">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  )
}

function Field({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
      <Icon className="w-4 h-4 text-slate-400" />
      <div className="flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  )
}

function EditField({ icon: Icon, label, type, value, onChange }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  type: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-xs text-slate-500 flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5" /> {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
      />
    </div>
  )
}
