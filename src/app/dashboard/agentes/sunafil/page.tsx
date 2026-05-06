import { permanentRedirect } from 'next/navigation'

// Movido a /dashboard/configuracion/automatizaciones/agentes/sunafil en la
// reorganización del sidebar (eliminación del hub IA Laboral).
export default function SunafilAgentLegacyRedirect() {
  permanentRedirect('/dashboard/configuracion/automatizaciones/agentes/sunafil')
}
