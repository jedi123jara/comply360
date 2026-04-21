'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plug,
  Upload,
  FileSpreadsheet,
  Lock,
  ArrowLeft,
  Loader2,
  CheckCircle,
  ExternalLink,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Integration {
  key: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  status: 'available' | 'coming_soon'
  endpoint?: string
  statusLabel: string
}

const INTEGRATIONS: Integration[] = [
  {
    key: 'tregistro',
    title: 'T-REGISTRO',
    description: 'Exporta datos de trabajadores en formato compatible con el T-Registro de SUNAT para su carga masiva.',
    icon: FileSpreadsheet,
    status: 'available',
    endpoint: '/api/exports/tregistro',
    statusLabel: 'Disponible',
  },
  {
    key: 'plame',
    title: 'PLAME',
    description: 'Genera archivos de planilla electronica en formato PLAME para declaracion mensual ante SUNAT.',
    icon: Upload,
    status: 'available',
    endpoint: '/api/exports/plame',
    statusLabel: 'Disponible',
  },
  {
    key: 'sunat_sol',
    title: 'SUNAT SOL',
    description: 'Integracion directa con SUNAT Operaciones en Linea para declaraciones y consultas automatizadas.',
    icon: Plug,
    status: 'coming_soon',
    statusLabel: 'Proximamente',
  },
  {
    key: 'firma_digital',
    title: 'Firma Digital',
    description: 'Firma electronica de contratos y documentos laborales con validez legal (Ley 27269).',
    icon: Lock,
    status: 'coming_soon',
    statusLabel: 'Proximamente',
  },
]

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function IntegracionesConfigPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [exportingKey, setExportingKey] = useState<string | null>(null)

  const handleExport = async (integration: Integration) => {
    if (!integration.endpoint) return
    setExportingKey(integration.key)

    try {
      const res = await fetch(integration.endpoint)
      if (!res.ok) throw new Error('Error en la exportacion')

      // Try to download the blob
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${integration.key}-export-${new Date().toISOString().split('T')[0]}.txt`

      // Check content-disposition for filename
      const disposition = res.headers.get('content-disposition')
      if (disposition) {
        const match = disposition.match(/filename="?([^";\n]+)"?/)
        if (match?.[1]) a.download = match[1]
      }

      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Exportacion completada',
        description: `Archivo ${integration.title} descargado exitosamente.`,
        type: 'success',
      })
    } catch {
      toast({
        title: 'Error de exportacion',
        description: `No se pudo exportar ${integration.title}. Verifica que tengas trabajadores registrados.`,
        type: 'error',
      })
    } finally {
      setExportingKey(null)
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/configuracion')}
          className="p-2 rounded-xl hover:bg-[color:var(--neutral-100)] transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Integraciones</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Conecta COMPLY360 con SUNAT, T-Registro, PLAME y mas.
          </p>
        </div>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {INTEGRATIONS.map(integration => {
          const Icon = integration.icon
          const isAvailable = integration.status === 'available'
          const isExporting = exportingKey === integration.key

          return (
            <div
              key={integration.key}
              className={`
                bg-surface/75 backdrop-blur-xl rounded-2xl border shadow-[0_0_15px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]
                transition-all duration-200
                ${isAvailable
                  ? 'border-glass-border hover:border-glass-border-hover hover:shadow-[0_0_25px_rgba(0,0,0,0.3),0_0_15px_var(--color-gold-glow)]'
                  : 'border-white/[0.04] opacity-60'
                }
              `}
            >
              <div className="p-6 space-y-4">
                {/* Icon + Status */}
                <div className="flex items-start justify-between">
                  <div className={`
                    p-3 rounded-xl
                    ${isAvailable ? 'bg-primary/10' : 'bg-[color:var(--neutral-100)]'}
                  `}>
                    <Icon className={`h-6 w-6 ${isAvailable ? 'text-primary' : 'text-gray-500'}`} />
                  </div>

                  <span className={`
                    text-[10px] font-bold px-2.5 py-0.5 rounded-full border
                    ${isAvailable
                      ? 'bg-emerald-900/30 text-emerald-600 border-emerald-800'
                      : 'bg-blue-900/30 text-emerald-600 border-blue-800'
                    }
                  `}>
                    {isAvailable && <CheckCircle className="inline h-3 w-3 mr-1 -mt-0.5" />}
                    {!isAvailable && <Lock className="inline h-3 w-3 mr-1 -mt-0.5" />}
                    {integration.statusLabel}
                  </span>
                </div>

                {/* Title + Description */}
                <div>
                  <h3 className="text-sm font-bold text-white">{integration.title}</h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{integration.description}</p>
                </div>

                {/* Action */}
                {isAvailable ? (
                  <button
                    onClick={() => handleExport(integration)}
                    disabled={isExporting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary font-semibold text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Exportando...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4" />
                        Exportar
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[color:var(--neutral-100)] border border-white/[0.06] text-gray-500 font-semibold text-sm cursor-not-allowed">
                    <Lock className="h-4 w-4" />
                    No disponible
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Info note */}
      <div className="bg-blue-900/20 rounded-2xl border border-blue-800/40 p-5">
        <div className="flex gap-3">
          <Plug className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-600">Sobre las integraciones</p>
            <p className="text-xs text-emerald-600/80 mt-1 leading-relaxed">
              Las exportaciones generan archivos compatibles con los formatos oficiales de SUNAT.
              Las integraciones directas (SUNAT SOL y Firma Digital) estaran disponibles en futuras actualizaciones.
              Contacta a soporte si necesitas un formato de exportacion personalizado.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
