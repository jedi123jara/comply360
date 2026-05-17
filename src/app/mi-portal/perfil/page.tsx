'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Smile,
  Sparkles,
  User,
  UserRound,
} from 'lucide-react'
import { ErrorState, DetailSkeleton } from '@/components/mi-portal'
import { formatLongDate, formatPhonePE } from '@/lib/format/peruvian'

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
  photoUrl: string | null
  bio: string | null
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_DIM = 400
        const scale = Math.min(MAX_DIM / img.width, MAX_DIM / img.height, 1)
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas no soportado'))
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = () => reject(new Error('No se pudo procesar la imagen'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })
}

export default function PerfilPage() {
  const [data, setData] = useState<PerfilData | null>(null)
  const [editing, setEditing] = useState<{
    email: string
    phone: string
    address: string
    bio: string
    photoUrl: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/mi-portal/perfil', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      setData(d)
      setEditing({
        email: d.email ?? '',
        phone: d.phone ?? '',
        address: d.address ?? '',
        bio: d.bio ?? '',
        photoUrl: d.photoUrl ?? '',
      })
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'El archivo debe ser una imagen.' })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'La imagen no puede pesar más de 10MB.' })
      return
    }
    setUploadingPhoto(true)
    setMessage(null)
    try {
      const dataUrl = await compressImage(file)
      if (editing) setEditing({ ...editing, photoUrl: dataUrl })
      setMessage({ type: 'success', text: 'Foto cargada. Recuerda guardar los cambios.' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'No se pudo procesar la foto' })
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

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
      setMessage({ type: 'success', text: 'Cambios guardados correctamente.' })
    } catch {
      setMessage({ type: 'error', text: 'No se pudo actualizar tu perfil.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <DetailSkeleton />
  if (loadError) return <ErrorState title="No se pudo cargar tu perfil" message={loadError} onRetry={load} />
  if (!data || !editing) return <ErrorState title="No hay datos disponibles" onRetry={load} />

  const changed =
    editing.email !== (data.email ?? '') ||
    editing.phone !== (data.phone ?? '') ||
    editing.address !== (data.address ?? '') ||
    editing.bio !== (data.bio ?? '') ||
    editing.photoUrl !== (data.photoUrl ?? '')

  const initials = `${data.firstName.charAt(0)}${data.lastName.charAt(0)}`.toUpperCase()
  const fullName = `${data.firstName} ${data.lastName}`.trim()

  return (
    <div className="c360-worker-profile c360-page-enter mx-auto max-w-5xl space-y-5">
      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-start gap-3 rounded-2xl border p-4 shadow-sm ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          )}
          <p className="text-sm font-semibold">{message.text}</p>
        </div>
      )}

      <section className="c360-profile-hero">
        <div className="relative z-[1]">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex shrink-0 flex-col items-center gap-2">
                <div className="relative">
                  {editing.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={editing.photoUrl}
                      alt={`Foto de ${data.firstName}`}
                      className="h-32 w-32 rounded-[28px] object-cover ring-4 ring-white shadow-xl shadow-slate-900/15"
                    />
                  ) : (
                    <div className="c360-profile-avatar">{initials}</div>
                  )}
                  {uploadingPhoto ? (
                    <div className="absolute inset-0 grid place-items-center rounded-[28px] bg-slate-950/45">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-black text-emerald-700 shadow-sm ring-1 ring-emerald-100 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    {editing.photoUrl ? 'Cambiar' : 'Subir foto'}
                  </button>
                  {editing.photoUrl ? (
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, photoUrl: '' })}
                      className="inline-flex min-h-9 items-center rounded-full bg-white px-3 text-xs font-black text-rose-600 shadow-sm ring-1 ring-rose-100 transition-colors hover:bg-rose-50"
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>

              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-emerald-700 shadow-sm ring-1 ring-white/80">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Cuenta verificada
                </div>
                <h1 className="mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
                  {fullName}
                </h1>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {data.position ?? 'Trabajador'} · {data.organization.name}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ProfileChip icon={IdCard} label={`DNI ${data.dni}`} mono />
                  <ProfileChip icon={Building2} label={data.department ?? 'Área no asignada'} />
                  <ProfileChip icon={ShieldCheck} label={data.regimenLaboral.replaceAll('_', ' ')} />
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !changed}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Guardando' : changed ? 'Guardar cambios' : 'Perfil al día'}
            </button>
          </div>

          <div className="mt-6 rounded-[24px] bg-white/92 p-4 shadow-sm ring-1 ring-slate-200/80">
            <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-slate-500">
              <Smile className="h-3.5 w-3.5 text-emerald-600" />
              Algo sobre mí
            </label>
            <textarea
              rows={3}
              maxLength={200}
              value={editing.bio}
              onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
              placeholder="Ej. Me gusta cocinar, aprender algo nuevo los fines de semana y mantener mi equipo al día."
              className="c360-profile-bio-input"
            />
            <p className="mt-2 text-[11px] font-semibold text-slate-500">
              {editing.bio.length}/200 caracteres
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-5">
          <ProfilePanel
            title="Contacto directo"
            subtitle="Datos que usará RRHH para enviarte avisos, firmas y respuestas."
            icon={Mail}
          >
            <EditField
              icon={Mail}
              label="Email personal"
              type="email"
              value={editing.email}
              onChange={(v) => setEditing({ ...editing, email: v })}
            />
            <EditField
              icon={Phone}
              label="Teléfono"
              type="tel"
              value={editing.phone}
              onChange={(v) => setEditing({ ...editing, phone: v })}
              hint={editing.phone ? formatPhonePE(editing.phone) : undefined}
            />
            <EditField
              icon={MapPin}
              label="Dirección"
              type="text"
              value={editing.address}
              onChange={(v) => setEditing({ ...editing, address: v })}
            />
          </ProfilePanel>

          <ProfilePanel
            title="Datos personales"
            subtitle="Información legal administrada por la empresa."
            icon={UserRound}
          >
            <Field icon={User} label="Nombre completo" value={fullName} />
            <Field icon={IdCard} label="DNI" value={data.dni} />
            <Field icon={Calendar} label="Fecha de nacimiento" value={formatLongDate(data.birthDate)} />
            <Field icon={User} label="Género" value={data.gender ?? '—'} />
            <Field icon={MapPin} label="Nacionalidad" value={data.nationality ?? '—'} />
          </ProfilePanel>
        </section>

        <section className="space-y-5">
          <ProfilePanel
            title="Relación laboral"
            subtitle="Tu vínculo vigente con la empresa."
            icon={Briefcase}
          >
            <Field icon={Building2} label="Empresa" value={data.organization.name} />
            {data.organization.ruc ? <Field icon={Building2} label="RUC" value={data.organization.ruc} /> : null}
            <Field icon={Briefcase} label="Puesto" value={data.position ?? '—'} />
            <Field icon={Briefcase} label="Departamento" value={data.department ?? '—'} />
            <Field icon={Calendar} label="Fecha de ingreso" value={formatLongDate(data.fechaIngreso)} />
            <Field icon={Briefcase} label="Régimen laboral" value={data.regimenLaboral.replaceAll('_', ' ')} />
            <Field icon={Briefcase} label="Tipo de contrato" value={data.tipoContrato.replaceAll('_', ' ')} />
          </ProfilePanel>

          <section className="c360-profile-highlight">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-blue-700 shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-blue-800">Perfil laboral</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Mantén tu información lista</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Con tu foto, contacto y dirección actualizados, tus firmas y comunicaciones quedan
                mejor vinculadas a tu historial.
              </p>
            </div>
          </section>
        </section>
      </div>
    </div>
  )
}

function ProfileChip({ icon: Icon, label, mono }: { icon: LucideIcon; label: string; mono?: boolean }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200/80">
      <Icon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
      <span className={mono ? 'truncate font-mono' : 'truncate'}>{label}</span>
    </span>
  )
}

function ProfilePanel({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string
  subtitle: string
  icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <div className="c360-profile-panel">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">{children}</div>
    </div>
  )
}

function Field({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="c360-profile-field">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-slate-50 text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <p className="truncate text-sm font-black text-slate-950">{value}</p>
      </div>
    </div>
  )
}

function EditField({
  icon: Icon,
  label,
  type,
  value,
  onChange,
  hint,
}: {
  icon: LucideIcon
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-500">
        <Icon className="h-3.5 w-3.5 text-emerald-600" />
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="c360-profile-input"
      />
      {hint ? <p className="text-[11px] font-semibold text-slate-500">{hint}</p> : null}
    </div>
  )
}
