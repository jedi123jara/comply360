import Link from 'next/link'
import { ArrowLeft, Building2, Palette } from 'lucide-react'

/**
 * /dashboard/configuracion/marca-blanca
 *
 * La marca blanca no existe todavía. Antes esta pantalla mostraba un formulario
 * completo (logo, colores, dominio, correos) cuyo botón "Guardar" solo esperaba
 * 1,2 segundos y decía "Guardado" sin guardar nada. Ahora lo decimos tal cual y
 * mandamos al usuario a lo que sí funciona hoy.
 */
export default function MarcaBlancaPage() {
  return (
    <div className="max-w-2xl space-y-6 pb-12">
      <Link
        href="/dashboard/configuracion"
        className="inline-flex items-center gap-1.5 text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Configuración
      </Link>

      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[color:var(--neutral-100)] p-3">
          <Palette className="h-6 w-6 text-[color:var(--text-secondary)]" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Marca blanca</h1>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              No disponible
            </span>
          </div>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
            Todavía no puedes usar Comply360 con el nombre, el logo y los colores de tu consultora.
            Esta opción no se activa al cambiar de plan.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5">
        <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Lo que sí puedes hacer hoy</h2>
        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
          Registra la razón social y el RUC de tu empresa. Esos datos aparecen en los reportes y
          documentos PDF que generas desde Comply360.
        </p>
        <Link
          href="/dashboard/configuracion/empresa"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Building2 className="h-4 w-4" />
          Ir a Datos de empresa
        </Link>
      </div>

      <p className="text-xs text-[color:var(--text-tertiary)]">
        Si tu consultora necesita marca blanca, escríbenos a soporte y cuéntanos cómo la usarías.
      </p>
    </div>
  )
}
