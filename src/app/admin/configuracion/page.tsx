'use client'

import { Settings, FileText, Sliders, Database } from 'lucide-react'

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          Configuración global
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Parámetros y feature flags que aplican a toda la plataforma
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ConfigCard
          icon={FileText}
          title="Planes y precios"
          description="Configura los planes FREE, STARTER, EMPRESA, PRO y sus límites."
        />
        <ConfigCard
          icon={Database}
          title="Constantes legales"
          description="UIT, RMV, tasas AFP, EsSalud y otros parámetros normativos."
        />
        <ConfigCard
          icon={Sliders}
          title="Feature flags"
          description="Activa o desactiva módulos por plan o por organización."
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-900">
          <strong>Próximamente:</strong> Editor de constantes legales con auditoría de cambios,
          gestión de planes y feature flags por organización.
        </p>
      </div>
    </div>
  )
}

function ConfigCard({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
  )
}
