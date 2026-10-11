/**
 * Datos del sitio público de Comply360 como estudio de cumplimiento normativo
 * para empresas (servicios + capacitaciones, ya no SaaS).
 *
 * Regla de marca: la web es "solo marca". Nunca nombres de personas ni de otros
 * estudios, nunca "equipo de abogados" si no es cierto, nunca "cero multas".
 */
import { BRAND } from '@/lib/brand'

/** Dominio canónico: fijo, para que canonicals y JSON-LD no dependan del entorno. */
export const SITE_URL = 'https://comply360.pe'

export const SITIO = {
  nombre: 'Comply360',
  promesa: 'Tu área de cumplimiento, sin tenerla en planilla',
  descripcion:
    'Estudio de cumplimiento normativo para empresas en Perú: laboral, SST, hostigamiento sexual y capacitaciones obligatorias, con la evidencia lista para SUNAFIL.',
  ciudad: 'Trujillo',
  region: 'La Libertad',
  cobertura: 'Presencial en La Libertad y virtual en todo el Perú',
  email: BRAND.supportEmail,
  /** Número de WhatsApp Business (solo dígitos, con código de país). Si no está, no se muestra. */
  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, '') || null,
} as const

export function whatsappHref(mensaje: string): string | null {
  if (!SITIO.whatsapp) return null
  return `https://wa.me/${SITIO.whatsapp}?text=${encodeURIComponent(mensaje)}`
}

/** Llamados a la acción principales. Un solo destino para "agendar". */
export const CTA = {
  diagnostico: { label: 'Agenda tu diagnóstico gratis', href: '/diagnostico-gratis' },
  contacto: { label: 'Escríbenos', href: '/contacto' },
  cotizar: { label: 'Cotiza tu plan anual', href: '/contacto?interes=capacitaciones' },
} as const

export const FOOTER_GRUPOS = [
  {
    titulo: 'Servicios',
    enlaces: [
      { label: 'Todos los servicios', href: '/servicios' },
      { label: 'Cumplimiento laboral', href: '/servicios/laboral' },
      { label: 'Seguridad y salud en el trabajo', href: '/servicios/sst' },
      { label: 'Hostigamiento sexual', href: '/servicios/hostigamiento' },
      { label: 'Planes y precios', href: '/planes' },
    ],
  },
  {
    titulo: 'Capacitaciones',
    enlaces: [
      { label: 'Catálogo y Plan Anual', href: '/capacitaciones' },
      { label: '4 capacitaciones de SST', href: '/capacitaciones/capacitaciones-sst' },
      { label: 'Comité de SST', href: '/capacitaciones/comite-sst' },
      { label: 'Hostigamiento sexual', href: '/capacitaciones/hostigamiento-sexual' },
      { label: 'Brigadas de emergencia', href: '/capacitaciones/brigadas-emergencia' },
    ],
  },
  {
    titulo: 'Herramientas gratis',
    enlaces: [
      { label: 'Diagnóstico gratis', href: '/diagnostico-gratis' },
      { label: '¿Qué debe cumplir mi empresa?', href: '/obligaciones' },
      { label: 'Calculadora de multas SUNAFIL', href: '/calculadoras/multa-sunafil' },
      { label: 'Calculadoras laborales', href: '/calculadoras' },
      { label: 'Recursos', href: '/recursos' },
    ],
  },
  {
    titulo: 'Comply360',
    enlaces: [
      { label: 'Cómo trabajamos', href: '/nosotros' },
      { label: 'Programa para contadores', href: '/contadores' },
      { label: 'Contacto', href: '/contacto' },
    ],
  },
] as const
