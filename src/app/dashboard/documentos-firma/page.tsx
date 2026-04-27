/**
 * /dashboard/documentos-firma — pantalla admin para gestionar acuses
 *
 * Muestra TODOS los OrgDocument que requieren firma de los trabajadores,
 * con su progreso visual y CTAs para drill-down + recordatorio + audit PDF.
 *
 * Vista vacía: explica el sistema + link al primer doc por crear.
 */

import { DocumentosFirmaClient } from './client'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Documentos por firmar | Comply360',
  description: 'Gestiona los acuses de recibo de tus trabajadores para políticas + RIT + SST.',
}

export default function DocumentosFirmaPage() {
  return <DocumentosFirmaClient />
}
