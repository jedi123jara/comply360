'use client'

import { useState } from 'react'
import {
  Palette,
  Globe,
  Mail,
  Phone,
  Image,
  Eye,
  Save,
  Settings,
  Check,
  X,
  Sparkles,
  Crown,
} from 'lucide-react'

interface BrandingConfig {
  companyName: string
  tagline: string
  logoUrl: string
  faviconUrl: string
  primaryColor: string
  secondaryColor: string
  customDomain: string
  contactEmail: string
  contactPhone: string
  useCustomEmails: boolean
  emailHeaderText: string
  emailFooterText: string
  replyToEmail: string
  modules: Record<string, boolean>
}

const DEFAULT_MODULES: Record<string, boolean> = {
  Calculadoras: true,
  Contratos: true,
  'Diagnostico': true,
  SST: true,
  Denuncias: true,
  Capacitaciones: true,
  Reportes: true,
  'IA Assistant': true,
}

export default function MarcaBlancaPage() {
  const [config, setConfig] = useState<BrandingConfig>({
    companyName: 'COMPLY360',
    tagline: '',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#1e3a6e',
    secondaryColor: '#d4a853',
    customDomain: '',
    contactEmail: '',
    contactPhone: '',
    useCustomEmails: false,
    emailHeaderText: '',
    emailFooterText: '',
    replyToEmail: '',
    modules: { ...DEFAULT_MODULES },
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const update = (field: keyof BrandingConfig, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const toggleModule = (mod: string) => {
    setConfig(prev => ({
      ...prev,
      modules: { ...prev.modules, [mod]: !prev.modules[mod] },
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 1200))
    setSaving(false)
    setSaved(true)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 text-white">
              Marca Blanca
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900">
              <Crown className="w-3 h-3" />
              PRO
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 text-gray-400">
            Personaliza la plataforma con la identidad de tu consultora para tus clientes.
          </p>
        </div>
        <Palette className="w-8 h-8 text-slate-300 text-slate-600" />
      </div>

      {/* Live Preview Card */}
      <div className="rounded-xl border border-slate-200 border-white/[0.08] bg-[#141824] p-6 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 text-slate-300 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Vista previa en tiempo real
        </h2>
        <div className="rounded-lg border border-slate-200 border-white/[0.08] overflow-hidden h-48 flex">
          {/* Mini Sidebar */}
          <div
            className="w-44 flex flex-col items-center py-4 gap-3 text-white text-xs shrink-0"
            style={{ backgroundColor: config.primaryColor }}
          >
            {config.logoUrl ? (
              <img src={config.logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-contain bg-[#141824]/20" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[#141824]/20 flex items-center justify-center text-[10px] font-bold">
                LOGO
              </div>
            )}
            <span className="font-semibold truncate px-2 text-center leading-tight">
              {config.companyName || 'COMPLY360'}
            </span>
            <div className="mt-2 space-y-1.5 w-full px-3">
              {['Dashboard', 'Contratos', 'Reportes'].map(item => (
                <div key={item} className="rounded px-2 py-1 bg-white/10 truncate">{item}</div>
              ))}
            </div>
          </div>
          {/* Mini Content Area */}
          <div className="flex-1 flex flex-col bg-slate-50 bg-slate-900">
            <div
              className="h-10 flex items-center px-4 text-white text-xs font-medium justify-between shrink-0"
              style={{ backgroundColor: config.secondaryColor }}
            >
              <span>{config.companyName || 'COMPLY360'}</span>
              <span className="opacity-70">{config.tagline}</span>
            </div>
            <div className="flex-1 p-4 grid grid-cols-3 gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded bg-[#141824] border border-slate-200 border-white/[0.08] p-2">
                  <div className="h-2 rounded bg-slate-200 bg-slate-600 w-3/4 mb-1.5" />
                  <div className="h-1.5 rounded bg-slate-100 bg-white/[0.04] w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Branding Settings */}
      <div className="rounded-xl border border-slate-200 border-white/[0.08] bg-[#141824] p-6 space-y-5">
        <h2 className="text-sm font-semibold text-slate-700 text-slate-300 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Identidad de Marca
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Company Name */}
          <div>
            <label className="block text-xs font-medium text-slate-600 text-gray-400 mb-1">Nombre de la Empresa</label>
            <input
              type="text"
              value={config.companyName}
              onChange={e => update('companyName', e.target.value)}
              className="w-full rounded-lg border border-slate-300 border-slate-600 bg-[#141824] bg-slate-900 px-3 py-2 text-sm text-slate-900 text-white focus:ring-2 focus:ring-gold/30 outline-none"
            />
          </div>
          {/* Tagline */}
          <div>
            <label className="block text-xs font-medium text-slate-600 text-gray-400 mb-1">Tagline / Eslogan</label>
            <input
              type="text"
              value={config.tagline}
              onChange={e => update('tagline', e.target.value)}
              placeholder="Cumplimiento laboral inteligente"
              className="w-full rounded-lg border border-slate-300 border-slate-600 bg-[#141824] bg-slate-900 px-3 py-2 text-sm text-slate-900 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-gold/30 outline-none"
            />
          </div>
          {/* Logo URL */}
          <div>
            <label className="block text-xs font-medium text-slate-600 text-gray-400 mb-1 flex items-center gap-1">
              <Image className="w-3.5 h-3.5" /> Logo URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={config.logoUrl}
                onChange={e => update('logoUrl', e.target.value)}
                placeholder="https://..."
                className="flex-1 rounded-lg border border-slate-300 border-slate-600 bg-[#141824] bg-slate-900 px-3 py-2 text-sm text-slate-900 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-gold/30 outline-none"
              />
              <button className="px-3 py-2 rounded-lg bg-slate-100 bg-white/[0.04] text-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-200 hover:bg-slate-600 transition-colors">
                Subir
              </button>
            </div>
          </div>
          {/* Favicon URL */}
          <div>
            <label className="block text-xs font-medium text-slate-600 text-gray-400 mb-1 flex items-center gap-1">
              <Image className="w-3.5 h-3.5" /> Favicon URL
            </label>
            <input
              type="text"
              value={config.faviconUrl}
              onChange={e => update('faviconUrl', e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-slate-300 border-slate-600 bg-[#141824] bg-slate-900 px-3 py-2 text-sm text-slate-900 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-gold/30 outline-none"
            />
          </div>
          {/* Primary Color */}
          <div>
            <label className="block text-xs font-medium text-slate-600 text-gray-400 mb-1 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5" /> Color Primario
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.primaryColor}
                onChange={e => update('primaryColor', e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-300 border-slate-600 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={config.primaryColor}
                onChange={e => update('primaryColor', e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 border-slate-600 bg-[#141824] bg-slate-900 px-3 py-2 text-sm text-slate-900 text-white font-mono focus:ring-2 focus:ring-gold/30 outline-none"
              />
            </div>
          </div>
          {/* Secondary Color */}
          <div>
            <label className="block text-xs font-medium text-slate-600 text-gray-400 mb-1 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5" /> Color Secundario / Acento
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.secondaryColor}
                onChange={e => update('secondaryColor', e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-300 border-slate-600 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={config.secondaryColor}
                onChange={e => update('secondaryColor', e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 border-slate-600 bg-[#141824] bg-slate-900 px-3 py-2 text-sm text-slate-900 text-white font-mono focus:ring-2 focus:ring-gold/30 outline-none"
              />
            </div>
          </div>
          {/* Custom Domain */}
          <div>
            <label className="block text-xs font-medium text-slate-600 text-gray-400 mb-1 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> Dominio Personalizado
            </label>
            <input
              type="text"
              value={config.customDomain}
              onChange={e => update('customDomain', e.target.value)}
              placeholder="compliance.miconsultora.com"
              className="w-full rounded-lg border border-slate-300 border-slate-600 bg-[#141824] bg-slate-900 px-3 py-2 text-sm text-slate-900 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-gold/30 outline-none"
            />
          </div>
          {/* Contact Email */}
          <div>
            <label className="block text-xs font-medium text-slate-600 text-gray-400 mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> Email de Contacto
            </label>
            <input
              type="email"
              value={config.contactEmail}
              onChange={e => update('contactEmail', e.target.value)}
              placeholder="soporte@miconsultora.com"
              className="w-full rounded-lg border border-slate-300 border-slate-600 bg-[#141824] bg-slate-900 px-3 py-2 text-sm text-slate-900 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-gold/30 outline-none"
            />
          </div>
          {/* Contact Phone */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 text-gray-400 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> Telefono de Contacto
            </label>
            <input
              type="tel"
              value={config.contactPhone}
              onChange={e => update('contactPhone', e.target.value)}
              placeholder="+51 999 999 999"
              className="w-full md:w-1/2 rounded-lg border border-slate-300 border-slate-600 bg-[#141824] bg-slate-900 px-3 py-2 text-sm text-slate-900 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-gold/30 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Email Templates */}
      <div className="rounded-xl border border-slate-200 border-white/[0.08] bg-[#141824] p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 text-slate-300 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Plantillas de Email
          </h2>
          <button
            onClick={() => update('useCustomEmails', !config.useCustomEmails)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              config.useCustomEmails ? 'bg-blue-600' : 'bg-slate-300 bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-[#141824] rounded-full shadow transition-transform ${
                config.useCustomEmails ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        {config.useCustomEmails && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 text-gray-400 mb-1">Encabezado del Email</label>
              <input
                type="text"
                value={config.emailHeaderText}
                onChange={e => update('emailHeaderText', e.target.value)}
                placeholder="Mi Consultora - Notificaciones"
                className="w-full rounded-lg border border-slate-300 border-slate-600 bg-[#141824] bg-slate-900 px-3 py-2 text-sm text-slate-900 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-gold/30 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 text-gray-400 mb-1">Reply-To Email</label>
              <input
                type="email"
                value={config.replyToEmail}
                onChange={e => update('replyToEmail', e.target.value)}
                placeholder="noreply@miconsultora.com"
                className="w-full rounded-lg border border-slate-300 border-slate-600 bg-[#141824] bg-slate-900 px-3 py-2 text-sm text-slate-900 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-gold/30 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 text-gray-400 mb-1">Pie del Email</label>
              <textarea
                value={config.emailFooterText}
                onChange={e => update('emailFooterText', e.target.value)}
                rows={2}
                placeholder="Este email fue enviado por Mi Consultora SAC. Lima, Peru."
                className="w-full rounded-lg border border-slate-300 border-slate-600 bg-[#141824] bg-slate-900 px-3 py-2 text-sm text-slate-900 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-gold/30 outline-none resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Features Toggle */}
      <div className="rounded-xl border border-slate-200 border-white/[0.08] bg-[#141824] p-6 space-y-5">
        <h2 className="text-sm font-semibold text-slate-700 text-slate-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Modulos Visibles para tus Clientes
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(config.modules).map(([mod, enabled]) => (
            <button
              key={mod}
              onClick={() => toggleModule(mod)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                enabled
                  ? 'border-blue-500 bg-blue-50 text-blue-700 border-blue-500 bg-blue-900/20 text-blue-400'
                  : 'border-slate-200 bg-slate-50 text-slate-400 border-white/[0.08] bg-slate-900 text-slate-500'
              }`}
            >
              {enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              {mod}
            </button>
          ))}
        </div>
      </div>

      {/* Save / Preview Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 border-slate-600 text-sm font-medium text-slate-700 text-slate-300 hover:bg-slate-50 hover:bg-slate-800 transition-colors">
          <Eye className="w-4 h-4" />
          Vista Previa
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  )
}
