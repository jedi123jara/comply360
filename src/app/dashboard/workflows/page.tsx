import { permanentRedirect } from 'next/navigation'

// Movido a /dashboard/configuracion/automatizaciones/workflows en la
// reorganización del sidebar (eliminación del hub IA Laboral).
export default function WorkflowsLegacyRedirect() {
  permanentRedirect('/dashboard/configuracion/automatizaciones/workflows')
}
