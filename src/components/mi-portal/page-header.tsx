/**
 * PageHeader — encabezado estándar de páginas del portal worker.
 *
 * Uso:
 *  <PageHeader
 *    title="Mis Boletas"
 *    subtitle="Revisa y firma tus boletas de pago"
 *    action={<Button>Descargar</Button>}
 *  />
 */

import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  icon?: ReactNode
}

export function PageHeader({ title, subtitle, action, icon }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500 leading-snug">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
