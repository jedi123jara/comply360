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
    <div
      data-worker-page-header
      className="c360-worker-page-header mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {icon && (
          <div className="c360-worker-page-header-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="c360-worker-page-header-action shrink-0">{action}</div>}
    </div>
  )
}
