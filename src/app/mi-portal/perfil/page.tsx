'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { User, Mail, Phone, MapPin, Calendar, Briefcase, Building2, Save, AlertCircle, CheckCircle2, Loader2, Camera, Smile } from 'lucide-react'
import { PageHeader, ErrorState, DetailSkeleton } from '@/components/mi-portal'
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

/**
 * Comprime y redimensiona una foto a max 400x400 JPEG quality 0.85.
 * Output: data URL (base64) listo para guardar en DB.
 * Tamaño típico: ~30-80KB por foto (vs ~2-4MB original de cámara móvil).
 */
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

  useEffect(() => { load() }, [load])

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

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Mi perfil"
        subtitle="Tus datos personales y laborales. Solo puedes actualizar email, teléfono y dirección."
        icon={<User className="w-5 h-5" />}
      />

      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-start gap-3 p-3.5 rounded-lg border ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
          )}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* ─── Tu identidad: foto + bio (humaniza el perfil del worker) ─── */}
      <Section
        title="Tu identidad"
        subtitle="Sube una foto y cuéntanos algo de ti. Tus compañeros y RRHH te verán más cerca."
      >
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          {/* Avatar grande con upload */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="relative">
              {editing.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={editing.photoUrl}
                  alt={`Foto de ${data.firstName}`}
                  className="w-28 h-28 rounded-2xl object-cover ring-2 ring-emerald-200 shadow-md"
                />
              ) : (
                <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 ring-2 ring-emerald-300 flex items-center justify-center text-3xl font-bold text-emerald-700">
                  {initials}
                </div>
              )}
              {uploadingPhoto && (
                <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              {editing.photoUrl ? 'Cambiar foto' : 'Subir foto'}
            </button>
            {editing.photoUrl && (
              <button
                type="button"
                onClick={() => editing && setEditing({ ...editing, photoUrl: '' })}
                className="text-[10px] text-rose-600 hover:text-rose-800"
              >
                Quitar foto
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>

          {/* Bio */}
          <div className="flex-1 w-full">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-emerald-600" />
              Cuéntanos algo de ti
            </label>
            <textarea
              rows={3}
              maxLength={200}
              value={editing.bio}
              onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
              placeholder="Ej. Me encanta el fútbol los fines de semana · Soy fan de la cocina criolla · Tengo 2 perros · Me gusta viajar al sur"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              {editing.bio.length}/200 caracteres · Es opcional pero recomendado
            </p>
          </div>
        </div>
      </Section>

      <Section title="Datos personales" subtitle="Estos datos solo pueden ser modificados por RRHH.">
        <Field icon={User} label="Nombre completo" value={`${data.firstName} ${data.lastName}`} />
        <Field icon={User} label="DNI" value={data.dni} />
        <Field icon={Calendar} label="Fecha de nacimiento" value={formatLongDate(data.birthDate)} />
        <Field icon={User} label="Género" value={data.gender ?? '—'} />
        <Field icon={MapPin} label="Nacionalidad" value={data.nationality ?? '—'} />
      </Section>

      <Section title="Datos de contacto" subtitle="Mantén actualizada esta información para recibir notificaciones importantes.">
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
        <button
          onClick={handleSave}
          disabled={saving || !changed}
          className="mt-2 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2.5 rounded-lg min-h-[44px] transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </Section>

      <Section title="Datos laborales" subtitle="Para cualquier cambio, contacta al área de RRHH.">
        <Field icon={Building2} label="Empresa" value={data.organization.name} />
        {data.organization.ruc && <Field icon={Building2} label="RUC" value={data.organization.ruc} />}
        <Field icon={Briefcase} label="Puesto" value={data.position ?? '—'} />
        <Field icon={Briefcase} label="Departamento" value={data.department ?? '—'} />
        <Field icon={Calendar} label="Fecha de ingreso" value={formatLongDate(data.fechaIngreso)} />
        <Field icon={Briefcase} label="Régimen laboral" value={data.regimenLaboral.replaceAll('_', ' ')} />
        <Field icon={Briefcase} label="Tipo de contrato" value={data.tipoContrato.replaceAll('_', ' ')} />
      </Section>
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  )
}

function Field({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900 truncate">{value}</p>
      </div>
    </div>
  )
}

function EditField({
  icon: Icon, label, type, value, onChange, hint,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-700 flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5" /> {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
      />
      {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
    </div>
  )
}
