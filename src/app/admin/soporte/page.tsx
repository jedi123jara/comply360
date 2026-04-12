'use client'

import { LifeBuoy } from 'lucide-react'

export default function SoportePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <LifeBuoy className="w-6 h-6 text-blue-600" />
          Tickets de soporte
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Gestion centralizada de solicitudes de ayuda de las empresas
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <LifeBuoy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-700 font-semibold">Modulo de soporte en construcción</p>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          Próximamente podrás gestionar tickets de soporte de todas las empresas, asignarlos a tu equipo
          y rastrear SLAs.
        </p>
      </div>
    </div>
  )
}
