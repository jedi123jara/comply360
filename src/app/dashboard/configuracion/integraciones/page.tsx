import { redirect } from 'next/navigation'

/**
 * /dashboard/configuracion/integraciones
 *
 * Antes esta pantalla duplicaba /dashboard/integraciones y mostraba SUNAT SOL
 * y Firma Digital como "Próximamente". Para que haya una sola fuente de verdad
 * (y nada prometido que no existe), redirigimos a la página real de
 * integraciones. Se mantiene la ruta para no romper enlaces guardados.
 */
export default function IntegracionesConfigRedirect() {
  redirect('/dashboard/integraciones')
}
