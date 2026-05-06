import { permanentRedirect } from 'next/navigation'

// Movido a /dashboard/configuracion/automatizaciones/agentes en la
// reorganización del sidebar (eliminación del hub IA Laboral). Mantenemos
// este redirect server-side por backward compatibility de bookmarks/links.
export default function AgentesLegacyRedirect() {
  permanentRedirect('/dashboard/configuracion/automatizaciones/agentes')
}
