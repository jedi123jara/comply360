'use client'

import { BrandLogo } from './brand-logo'

/**
 * BrandBlockA mantiene la API del sidebar, pero ahora usa la marca unificada
 * de Comply360 para que sidebar, auth, admin y favicon compartan identidad.
 */
export function BrandBlockA() {
  return <BrandLogo variant="sidebar" className="c360-sb-brand" textClassName="c360-sb-brand-wordmark" />
}
