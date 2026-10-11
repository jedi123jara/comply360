import { redirect } from 'next/navigation'

/**
 * /dashboard/integraciones/api-docs
 *
 * Esta página mostraba documentación de una API pública que hoy no se puede
 * usar: apuntaba a una URL base inexistente (api.comply360.pe), mandaba a
 * generar claves en "Configuración → API Keys" (pantalla que no existe) y
 * listaba límites por planes que no son los reales. Para no mostrar nada
 * falso, redirigimos a Integraciones, que explica lo que sí está disponible.
 */
export default function ApiDocsRedirect() {
  redirect('/dashboard/integraciones')
}
