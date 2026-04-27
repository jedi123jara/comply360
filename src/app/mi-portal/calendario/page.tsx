/**
 * /mi-portal/calendario — Calendario personal del trabajador.
 *
 * Vista mensual + lista próximos 30 días con SOLO eventos del worker:
 *   - Tu cumpleaños
 *   - Tus aniversarios laborales
 *   - Tu fin de período de prueba
 *   - Tus vacaciones programadas
 *   - Tus documentos pendientes de firmar (deadlines)
 *   - Tus capacitaciones programadas
 *   - Tus alertas individuales
 *
 * NO incluye eventos org-wide (CTS, gratificación, PLAME) — esos son del admin.
 */

import { CalendarioWorkerClient } from './client'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Mi calendario | Comply360',
  description: 'Tus vacaciones, capacitaciones, plazos de firma y eventos personales.',
}

export default function MiCalendarioPage() {
  return <CalendarioWorkerClient />
}
