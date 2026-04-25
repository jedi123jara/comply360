/**
 * Versionado del consent management.
 *
 * Cuando cambiamos políticas legales (T&C, privacidad, DPA), bumpeamos la
 * versión del scope afectado. Los usuarios con versiones viejas reciben el
 * modal de consent de nuevo en su próximo login.
 *
 * Convención: `v1.0.0`, `v1.1.0` (bump de minor para cambios menores de redacción;
 * bump de major para cambios sustanciales que requieren re-aceptación obligatoria).
 *
 * ⚠️ Cada vez que modifiques el texto de `CONSENT_COPY` o el catálogo de docs
 * aceptados, bumpeá la versión correspondiente.
 */

export const CONSENT_VERSION = {
  /** Admin/owner al sign-up: T&C + privacidad + DPA empresa */
  org: 'v1.0.0',
  /** Trabajador al primer login /mi-portal: autorización datos sensibles Ley 29733 Art. 14 */
  worker: 'v1.0.0',
} as const

export type ConsentScope = keyof typeof CONSENT_VERSION

export interface ConsentDoc {
  id: string
  label: string
  href: string
  required: boolean
}

/** Documentos que el admin acepta al crear su cuenta / org. */
export const ORG_CONSENT_DOCS: ConsentDoc[] = [
  { id: 'terms', label: 'Términos y Condiciones de Servicio', href: '/terminos', required: true },
  { id: 'privacy', label: 'Política de Privacidad', href: '/privacidad', required: true },
  { id: 'dpa', label: 'Contrato de Tratamiento de Datos (DPA)', href: '/legal/dpa', required: true },
  { id: 'aup', label: 'Política de Uso Aceptable', href: '/legal/aup', required: true },
]

/** Documentos que el trabajador acepta al primer login /mi-portal. */
export const WORKER_CONSENT_DOCS: ConsentDoc[] = [
  {
    id: 'privacy-worker',
    label: 'Política de Privacidad del Trabajador',
    href: '/legal/privacidad-trabajador',
    required: true,
  },
  {
    id: 'sensitive-data',
    label:
      'Autorización de tratamiento de datos personales sensibles (DNI, CUSPP, datos biométricos)',
    href: '/legal/autorizacion-datos-sensibles',
    required: true,
  },
  {
    id: 'signature',
    label: 'Uso de firma electrónica biométrica (Ley 27269)',
    href: '/legal/firma-electronica',
    required: true,
  },
]

/** Copy del modal. Mantener conciso y legible en móvil. */
export const CONSENT_COPY = {
  org: {
    title: 'Antes de continuar',
    subtitle:
      'Para activar tu cuenta necesitamos que revises y aceptes los siguientes documentos legales.',
    legalNote:
      'Al aceptar, confirmas que leíste los documentos y que tienes autoridad para firmar en representación de tu empresa. Esta aceptación queda registrada con fecha, IP y dispositivo, conforme a la Ley 29733.',
    confirmLabel: 'Acepto y continuar',
  },
  worker: {
    title: 'Autorización de uso de tus datos',
    subtitle:
      'Tu empleador activó tu acceso a Comply360. Necesitamos tu autorización expresa para tratar tus datos personales y sensibles según la Ley N° 29733.',
    legalNote:
      'Puedes retirar esta autorización en cualquier momento desde tu perfil o escribiendo a datos@comply360.pe. Tus datos biométricos (huella/rostro) NO salen de tu dispositivo — sólo registramos la prueba criptográfica de tu firma.',
    confirmLabel: 'Autorizo el tratamiento de mis datos',
  },
} as const
