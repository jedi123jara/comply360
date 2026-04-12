/**
 * Catálogo de integraciones peruanas disponibles en COMPLY360.
 *
 * Cada integración declara: slug, categoría, config requerida (env vars),
 * endpoints soportados y si viene activada desde la plataforma (gratis)
 * o requiere credenciales del cliente.
 *
 * El marketplace UI lee este catálogo y muestra tarjetas con estado
 * "configurado" / "requiere credenciales" / "no disponible".
 */

export type IntegrationCategory =
  | 'PAGOS'
  | 'BANCOS'
  | 'SUNAT'
  | 'SUNAFIL'
  | 'PREVISIONAL'
  | 'NOTARIAL'
  | 'COMUNICACION'
  | 'AUDITORIA'

export interface IntegrationDefinition {
  slug: string
  name: string
  category: IntegrationCategory
  description: string
  logoEmoji: string
  /** Variables de entorno requeridas */
  envVarsRequired: string[]
  /** Capacidades */
  capabilities: string[]
  /** URL pública del proveedor */
  website?: string
  /** Activado por defecto */
  enabledByDefault: boolean
  /** Tier mínimo para usarlo */
  minTier: 'STARTER' | 'EMPRESA' | 'PRO'
}

export const INTEGRATIONS: IntegrationDefinition[] = [
  // ─────────── PAGOS ───────────
  {
    slug: 'culqi',
    name: 'Culqi',
    category: 'PAGOS',
    description: 'Pasarela peruana #1 para aceptar Visa, Mastercard, AMEX, Yape y PagoEfectivo.',
    logoEmoji: '💳',
    envVarsRequired: ['CULQI_PUBLIC_KEY', 'CULQI_SECRET_KEY'],
    capabilities: ['Cobros recurrentes', 'Link de pago', 'Suscripciones', 'Tokenización tarjeta'],
    website: 'https://culqi.com',
    enabledByDefault: true,
    minTier: 'STARTER',
  },
  {
    slug: 'niubiz',
    name: 'Niubiz',
    category: 'PAGOS',
    description:
      'Pasarela de Banco de Crédito (antes VisaNet Perú). Alta aceptación en retail físico.',
    logoEmoji: '🔷',
    envVarsRequired: ['NIUBIZ_MERCHANT_ID', 'NIUBIZ_API_KEY', 'NIUBIZ_SECRET'],
    capabilities: ['Cobros online', 'Cuotas sin intereses', 'Tokenización'],
    website: 'https://www.niubiz.com.pe',
    enabledByDefault: false,
    minTier: 'EMPRESA',
  },
  {
    slug: 'mercadopago',
    name: 'Mercado Pago',
    category: 'PAGOS',
    description: 'Pasarela regional con fuerte presencia en PYMES peruanas.',
    logoEmoji: '💰',
    envVarsRequired: ['MP_ACCESS_TOKEN', 'MP_PUBLIC_KEY'],
    capabilities: ['Cobros QR', 'Link de pago', 'Cuotas'],
    website: 'https://www.mercadopago.com.pe',
    enabledByDefault: false,
    minTier: 'STARTER',
  },
  {
    slug: 'yape',
    name: 'Yape (BCP)',
    category: 'PAGOS',
    description: 'Billetera digital BCP — 12M+ usuarios. Ideal para pagos micro.',
    logoEmoji: '📱',
    envVarsRequired: ['YAPE_MERCHANT_CODE', 'YAPE_API_KEY'],
    capabilities: ['Cobros QR', 'Push notifications', 'Conciliación automática'],
    website: 'https://yape.com.pe',
    enabledByDefault: false,
    minTier: 'EMPRESA',
  },
  {
    slug: 'plin',
    name: 'Plin (Interbank + otros)',
    category: 'PAGOS',
    description: 'Billetera interbancaria de Interbank/BBVA/Scotiabank. Alternativa a Yape.',
    logoEmoji: '⚡',
    envVarsRequired: ['PLIN_CLIENT_ID', 'PLIN_CLIENT_SECRET'],
    capabilities: ['Cobros QR', 'Link de pago'],
    enabledByDefault: false,
    minTier: 'EMPRESA',
  },

  // ─────────── BANCOS ───────────
  {
    slug: 'bcp-planillas',
    name: 'BCP Planillas',
    category: 'BANCOS',
    description:
      'Generación de archivos TXT para pago masivo de planillas vía BCP Telecrédito.',
    logoEmoji: '🏦',
    envVarsRequired: ['BCP_COMPANY_CODE'],
    capabilities: ['Archivo TXT pago masivo', 'Conciliación'],
    enabledByDefault: true,
    minTier: 'EMPRESA',
  },
  {
    slug: 'bbva-netcash',
    name: 'BBVA NetCash',
    category: 'BANCOS',
    description: 'Pagos masivos a través de BBVA NetCash (formato propietario).',
    logoEmoji: '💙',
    envVarsRequired: ['BBVA_CLIENT_CODE'],
    capabilities: ['Archivo pago masivo'],
    enabledByDefault: false,
    minTier: 'EMPRESA',
  },
  {
    slug: 'interbank-empresas',
    name: 'Interbank Empresas',
    category: 'BANCOS',
    description: 'Pagos masivos Interbank.',
    logoEmoji: '💚',
    envVarsRequired: ['INTERBANK_CLIENT_CODE'],
    capabilities: ['Archivo pago masivo'],
    enabledByDefault: false,
    minTier: 'EMPRESA',
  },
  {
    slug: 'scotiabank-empresas',
    name: 'Scotiabank Empresas',
    category: 'BANCOS',
    description: 'Pagos masivos Scotiabank.',
    logoEmoji: '❤️',
    envVarsRequired: ['SCOTIA_CLIENT_CODE'],
    capabilities: ['Archivo pago masivo'],
    enabledByDefault: false,
    minTier: 'EMPRESA',
  },

  // ─────────── SUNAT ───────────
  {
    slug: 'sunat-ruc',
    name: 'SUNAT RUC',
    category: 'SUNAT',
    description:
      'Consulta de RUC y DNI vía apis.net.pe. Pre-llena datos de empresa automáticamente.',
    logoEmoji: '🇵🇪',
    envVarsRequired: ['APIS_NET_PE_TOKEN'],
    capabilities: ['Validación RUC', 'Consulta razón social', 'Consulta DNI'],
    website: 'https://apis.net.pe',
    enabledByDefault: true,
    minTier: 'STARTER',
  },
  {
    slug: 'sunat-plame',
    name: 'SUNAT PLAME',
    category: 'SUNAT',
    description:
      'Generación del archivo TXT PLAME (PDT 601) listo para subir al portal SUNAT.',
    logoEmoji: '📄',
    envVarsRequired: [],
    capabilities: ['Export PLAME TXT', 'Export T-REGISTRO TXT', 'Validación de formato'],
    enabledByDefault: true,
    minTier: 'EMPRESA',
  },

  // ─────────── PREVISIONAL ───────────
  {
    slug: 'afpnet',
    name: 'AFPnet',
    category: 'PREVISIONAL',
    description: 'Declaración unificada de aportes AFP (Integra, Prima, Profuturo, Habitat).',
    logoEmoji: '🏛️',
    envVarsRequired: ['AFPNET_USER', 'AFPNET_PASSWORD'],
    capabilities: ['Consulta CUSPP', 'Declaración aportes', 'Conciliación'],
    website: 'https://www.afpnet.com.pe',
    enabledByDefault: false,
    minTier: 'EMPRESA',
  },
  {
    slug: 'essalud',
    name: 'EsSalud',
    category: 'PREVISIONAL',
    description: 'Verificación de acreditación de trabajadores en EsSalud.',
    logoEmoji: '🏥',
    envVarsRequired: [],
    capabilities: ['Consulta acreditación', 'Validación DNI'],
    enabledByDefault: false,
    minTier: 'EMPRESA',
  },

  // ─────────── SUNAFIL ───────────
  {
    slug: 'casilla-sunafil',
    name: 'Casilla Electrónica SUNAFIL',
    category: 'SUNAFIL',
    description:
      'Monitor automático de la casilla electrónica. Alerta inmediata ante nuevas notificaciones.',
    logoEmoji: '📨',
    envVarsRequired: ['CASILLA_WEBHOOK_SECRET'],
    capabilities: ['Polling casilla', 'Alertas push', 'Auto-análisis con Agente SUNAFIL'],
    enabledByDefault: true,
    minTier: 'PRO',
  },

  // ─────────── NOTARIAL / FIRMA ───────────
  {
    slug: 'llama-pe',
    name: 'Llama.pe',
    category: 'NOTARIAL',
    description:
      'Proveedor peruano de firma digital con validez legal Ley 27269. Integración PKI.',
    logoEmoji: '✍️',
    envVarsRequired: ['LLAMA_API_KEY'],
    capabilities: ['Firma con certificado', 'Sello de tiempo', 'Validez legal plena'],
    website: 'https://llama.pe',
    enabledByDefault: false,
    minTier: 'EMPRESA',
  },
  {
    slug: 'firmaperu',
    name: 'Firma Perú (Indecopi)',
    category: 'NOTARIAL',
    description: 'Firma digital certificada por Indecopi. Compatible con Ley 27269.',
    logoEmoji: '📜',
    envVarsRequired: ['FIRMAPERU_API_KEY'],
    capabilities: ['PKI', 'Verificación pública'],
    enabledByDefault: false,
    minTier: 'EMPRESA',
  },

  // ─────────── COMUNICACIÓN ───────────
  {
    slug: 'whatsapp-business',
    name: 'WhatsApp Business',
    category: 'COMUNICACION',
    description:
      'Envío de notificaciones críticas a empleadores vía WhatsApp Business Cloud API.',
    logoEmoji: '💚',
    envVarsRequired: ['WHATSAPP_BUSINESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'],
    capabilities: ['Templates aprobados', 'Respuestas automáticas', 'Métricas'],
    website: 'https://business.whatsapp.com',
    enabledByDefault: false,
    minTier: 'PRO',
  },
  {
    slug: 'twilio-sms',
    name: 'Twilio SMS',
    category: 'COMUNICACION',
    description: 'SMS para alertas críticas cuando email/push fallan.',
    logoEmoji: '📱',
    envVarsRequired: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'],
    capabilities: ['SMS one-way', 'SMS two-way', 'Escalamiento'],
    enabledByDefault: false,
    minTier: 'EMPRESA',
  },

  // ─────────── AUDITORIA ───────────
  {
    slug: 'mandu-import',
    name: 'Mandü (import)',
    category: 'AUDITORIA',
    description: 'Importa trabajadores y contratos desde Mandü para migrar sin perder datos.',
    logoEmoji: '📥',
    envVarsRequired: ['MANDU_API_TOKEN'],
    capabilities: ['Import one-shot', 'Mapeo de campos', 'Validación'],
    enabledByDefault: false,
    minTier: 'EMPRESA',
  },
  {
    slug: 'softland-import',
    name: 'Softland (import)',
    category: 'AUDITORIA',
    description: 'Importa planilla desde Softland Perú vía archivo CSV estándar.',
    logoEmoji: '📂',
    envVarsRequired: [],
    capabilities: ['Import CSV', 'Mapeo automático'],
    enabledByDefault: true,
    minTier: 'EMPRESA',
  },
]

// =============================================
// HELPERS
// =============================================

export function getIntegration(slug: string): IntegrationDefinition | undefined {
  return INTEGRATIONS.find(i => i.slug === slug)
}

export function listByCategory(category: IntegrationCategory): IntegrationDefinition[] {
  return INTEGRATIONS.filter(i => i.category === category)
}

export interface IntegrationStatus {
  slug: string
  name: string
  configured: boolean
  missingEnvVars: string[]
  ready: boolean
}

export function checkIntegrationStatus(slug: string): IntegrationStatus {
  const def = getIntegration(slug)
  if (!def) {
    return { slug, name: 'desconocido', configured: false, missingEnvVars: [], ready: false }
  }
  const missing = def.envVarsRequired.filter(v => !process.env[v])
  return {
    slug: def.slug,
    name: def.name,
    configured: missing.length === 0,
    missingEnvVars: missing,
    ready: missing.length === 0 || def.envVarsRequired.length === 0,
  }
}

export function listStatuses(): IntegrationStatus[] {
  return INTEGRATIONS.map(i => checkIntegrationStatus(i.slug))
}
