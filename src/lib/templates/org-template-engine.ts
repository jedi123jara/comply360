/**
 * Org Template Engine — motor de merge fields para templates de contratos/documentos
 * propios de cada empresa.
 *
 * Filosofía: la empresa sube el CONTENIDO TEXTUAL de su contrato (con {{PLACEHOLDERS}})
 * y el sistema hace **substitución determinística** — NO hay AI escribiendo cláusulas.
 * Comply360 es "motor de plantillas" no "generador de contenido legal".
 *
 * Razón: evita liability legal. Si hay error en un contrato, es de la empresa y su
 * abogado — no nuestro.
 *
 * Uso básico:
 * ```ts
 * const content = 'Yo, {{NOMBRE_COMPLETO}}, identificado con DNI {{DNI}}, ...'
 * const mappings = { NOMBRE_COMPLETO: 'worker.fullName', DNI: 'worker.dni' }
 * const rendered = renderTemplate(content, mappings, workerData, orgData)
 * ```
 */

import type { RegimenLaboral, TipoContrato } from '@/generated/prisma/client'

// ═══════════════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════════════

/** Metadata JSON que se guarda en OrgDocument.description para templates. */
export interface OrgTemplateMeta {
  _schema: 'contract_template_v1'
  /** Tipo de documento (contrato, carta, certificado, etc.). */
  documentType: OrgTemplateType
  /** Si aplica a contratos: tipo específico (INDEFINIDO, PLAZO_FIJO, etc.). */
  contractType?: TipoContrato
  /** Contenido textual del template con `{{PLACEHOLDERS}}`. */
  content: string
  /** Lista de placeholders detectados (derivado del content pero cacheado). */
  placeholders: string[]
  /** Mapeo placeholder → data path. ej: "NOMBRE" → "worker.firstName + worker.lastName" */
  mappings: Record<string, string>
  /** Notas internas de la empresa. */
  notes?: string
  /** Historial de uso (cuántas veces se generó con este template). */
  usageCount?: number
}

export type OrgTemplateType =
  | 'CONTRATO_INDEFINIDO'
  | 'CONTRATO_PLAZO_FIJO'
  | 'CONTRATO_TIEMPO_PARCIAL'
  | 'CONTRATO_MYPE'
  | 'CONTRATO_LOCACION_SERVICIOS'
  | 'CONVENIO_PRACTICAS'
  | 'ADDENDUM_AUMENTO'
  | 'ADDENDUM_CAMBIO_CARGO'
  | 'CARTA_PREAVISO_DESPIDO'
  | 'CARTA_DESPIDO'
  | 'CARTA_RENUNCIA'
  | 'CERTIFICADO_TRABAJO'
  | 'CONSTANCIA_HABERES'
  | 'LIQUIDACION_BENEFICIOS'
  | 'FINIQUITO'
  | 'MEMORANDUM'
  | 'AUMENTO_SUELDO'
  | 'OTRO'

export const TEMPLATE_TYPE_LABEL: Record<OrgTemplateType, string> = {
  CONTRATO_INDEFINIDO: 'Contrato a Plazo Indeterminado',
  CONTRATO_PLAZO_FIJO: 'Contrato a Plazo Fijo',
  CONTRATO_TIEMPO_PARCIAL: 'Contrato de Tiempo Parcial',
  CONTRATO_MYPE: 'Contrato MYPE',
  CONTRATO_LOCACION_SERVICIOS: 'Locación de Servicios',
  CONVENIO_PRACTICAS: 'Convenio de Prácticas',
  ADDENDUM_AUMENTO: 'Addendum por Aumento',
  ADDENDUM_CAMBIO_CARGO: 'Addendum por Cambio de Cargo',
  CARTA_PREAVISO_DESPIDO: 'Carta de Preaviso de Despido',
  CARTA_DESPIDO: 'Carta de Despido',
  CARTA_RENUNCIA: 'Carta de Renuncia',
  CERTIFICADO_TRABAJO: 'Certificado de Trabajo',
  CONSTANCIA_HABERES: 'Constancia de Haberes',
  LIQUIDACION_BENEFICIOS: 'Liquidación de Beneficios',
  FINIQUITO: 'Finiquito',
  MEMORANDUM: 'Memorándum',
  AUMENTO_SUELDO: 'Aumento de Sueldo',
  OTRO: 'Otro documento',
}

/** Datos del worker disponibles para merge (subset de Worker model). */
export interface WorkerMergeData {
  firstName: string
  lastName: string
  dni: string
  email?: string | null
  phone?: string | null
  address?: string | null
  position?: string | null
  department?: string | null
  regimenLaboral: RegimenLaboral | string
  tipoContrato: TipoContrato | string
  fechaIngreso: string | Date
  fechaCese?: string | Date | null
  sueldoBruto: number | string
  asignacionFamiliar: boolean
  jornadaSemanal: number
  birthDate?: string | Date | null
  nationality?: string | null
}

/** Datos de la empresa disponibles para merge (subset de Organization). */
export interface OrgMergeData {
  name: string
  razonSocial?: string | null
  ruc?: string | null
  address?: string | null
  sector?: string | null
  representanteLegal?: string | null
}

// ═══════════════════════════════════════════════════════════════════════════
//  Placeholders catalog — campos estándar que el admin puede usar
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Catálogo maestro de placeholders disponibles. Cada uno es un "field path"
 * que el renderizador sabe evaluar contra `{ worker, org, meta }`.
 */
export interface PlaceholderField {
  key: string // Identificador en UI
  label: string // Nombre legible
  description: string // Ayuda al admin
  path: string // Path ejecutable (ej: "worker.firstName")
  group: 'worker' | 'org' | 'meta'
  example: string // Valor de ejemplo
}

export const PLACEHOLDER_CATALOG: PlaceholderField[] = [
  // ─── Worker — datos personales ──────────────────────────────────────────
  { key: 'NOMBRE', label: 'Nombres', description: 'Primer nombre y segundo del trabajador', path: 'worker.firstName', group: 'worker', example: 'María Fernanda' },
  { key: 'APELLIDOS', label: 'Apellidos', description: 'Apellidos del trabajador', path: 'worker.lastName', group: 'worker', example: 'González Pérez' },
  { key: 'NOMBRE_COMPLETO', label: 'Nombre completo', description: 'Nombres + apellidos', path: 'worker.fullName', group: 'worker', example: 'María Fernanda González Pérez' },
  { key: 'DNI', label: 'DNI', description: 'Número de documento', path: 'worker.dni', group: 'worker', example: '45678912' },
  { key: 'EMAIL', label: 'Email', description: 'Correo del trabajador', path: 'worker.email', group: 'worker', example: 'maria.gonzalez@example.com' },
  { key: 'TELEFONO', label: 'Teléfono', description: 'Teléfono de contacto', path: 'worker.phone', group: 'worker', example: '+51 987 654 321' },
  { key: 'DIRECCION', label: 'Dirección', description: 'Domicilio del trabajador', path: 'worker.address', group: 'worker', example: 'Av. Javier Prado 1234, San Isidro, Lima' },
  { key: 'NACIONALIDAD', label: 'Nacionalidad', description: 'Nacionalidad', path: 'worker.nationality', group: 'worker', example: 'peruana' },
  { key: 'FECHA_NACIMIENTO', label: 'Fecha nacimiento', description: 'Fecha en formato DD/MM/YYYY', path: 'worker.birthDate', group: 'worker', example: '15/03/1992' },

  // ─── Worker — datos laborales ───────────────────────────────────────────
  { key: 'CARGO', label: 'Cargo', description: 'Puesto del trabajador', path: 'worker.position', group: 'worker', example: 'Analista Contable' },
  { key: 'AREA', label: 'Área', description: 'Departamento o área', path: 'worker.department', group: 'worker', example: 'Finanzas' },
  { key: 'REGIMEN', label: 'Régimen laboral', description: 'GENERAL, MYPE_MICRO, AGRARIO, etc.', path: 'worker.regimenLaboral', group: 'worker', example: 'GENERAL' },
  { key: 'TIPO_CONTRATO', label: 'Tipo de contrato', description: 'INDEFINIDO, PLAZO_FIJO, etc.', path: 'worker.tipoContrato', group: 'worker', example: 'INDEFINIDO' },
  { key: 'FECHA_INGRESO', label: 'Fecha de ingreso', description: 'Formato DD/MM/YYYY', path: 'worker.fechaIngreso', group: 'worker', example: '01/04/2026' },
  { key: 'FECHA_CESE', label: 'Fecha de cese', description: 'Si aplica', path: 'worker.fechaCese', group: 'worker', example: '31/12/2026' },
  { key: 'SUELDO', label: 'Sueldo bruto (número)', description: 'Monto en soles', path: 'worker.sueldoBruto', group: 'worker', example: '2,500.00' },
  { key: 'SUELDO_LETRAS', label: 'Sueldo en letras', description: 'Convertido automáticamente', path: 'worker.sueldoEnLetras', group: 'worker', example: 'DOS MIL QUINIENTOS CON 00/100 SOLES' },
  { key: 'JORNADA', label: 'Jornada semanal', description: 'Horas por semana', path: 'worker.jornadaSemanal', group: 'worker', example: '48' },

  // ─── Organization ───────────────────────────────────────────────────────
  { key: 'EMPRESA', label: 'Nombre de la empresa', description: 'Razón social o nombre comercial', path: 'org.name', group: 'org', example: 'ACME S.A.C.' },
  { key: 'RAZON_SOCIAL', label: 'Razón social', description: 'Nombre formal de la empresa', path: 'org.razonSocial', group: 'org', example: 'ACME SOCIEDAD ANÓNIMA CERRADA' },
  { key: 'RUC', label: 'RUC de la empresa', description: 'Registro Único de Contribuyentes', path: 'org.ruc', group: 'org', example: '20123456789' },
  { key: 'EMPRESA_DIRECCION', label: 'Dirección de la empresa', description: 'Domicilio fiscal', path: 'org.address', group: 'org', example: 'Jr. Lampa 342, Lima' },
  { key: 'SECTOR', label: 'Sector', description: 'Sector económico', path: 'org.sector', group: 'org', example: 'Servicios' },
  { key: 'REPRESENTANTE_LEGAL', label: 'Representante legal', description: 'Nombre del rep legal', path: 'org.representanteLegal', group: 'org', example: 'Carlos Mendoza Torres' },

  // ─── Meta ───────────────────────────────────────────────────────────────
  { key: 'FECHA_HOY', label: 'Fecha de hoy', description: 'Formato DD/MM/YYYY', path: 'meta.today', group: 'meta', example: '20/04/2026' },
  { key: 'FECHA_HOY_LETRAS', label: 'Fecha hoy en letras', description: 'Ej: 20 de abril de 2026', path: 'meta.todayInWords', group: 'meta', example: '20 de abril de 2026' },
  { key: 'CIUDAD', label: 'Ciudad', description: 'Ciudad del contrato (default Lima)', path: 'meta.ciudad', group: 'meta', example: 'Lima' },
]

// ═══════════════════════════════════════════════════════════════════════════
//  Placeholder detection — regex-based
// ═══════════════════════════════════════════════════════════════════════════

/** Regex que matchea placeholders `{{KEY}}` donde KEY es [A-Z_][A-Z0-9_]*. */
export const PLACEHOLDER_REGEX = /\{\{\s*([A-Z_][A-Z0-9_]*)\s*\}\}/g

/**
 * Escanea un contenido textual y devuelve TODOS los placeholders únicos.
 * Preserva orden de aparición.
 */
export function detectPlaceholders(content: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  const re = new RegExp(PLACEHOLDER_REGEX.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(content)) !== null) {
    const key = match[1]
    if (key && !seen.has(key)) {
      seen.add(key)
      result.push(key)
    }
  }
  return result
}

// ═══════════════════════════════════════════════════════════════════════════
//  Formatters
// ═══════════════════════════════════════════════════════════════════════════

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function formatDateDMY(v: string | Date | null | undefined): string {
  if (!v) return ''
  const d = v instanceof Date ? v : new Date(v)
  if (isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function formatDateInWords(v: string | Date | null | undefined): string {
  if (!v) return ''
  const d = v instanceof Date ? v : new Date(v)
  if (isNaN(d.getTime())) return ''
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

function formatMoney(v: number | string): string {
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (!isFinite(n)) return ''
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Convierte número a letras para sueldos peruanos (hasta miles de millones).
 *
 * FIX #0.7: la versión anterior tenía bugs serios que producían contratos
 * con sueldos en letras incorrectos:
 *   - x===20 caía al else y devolvía "VEINTI" sin "VEINTE"
 *   - x===21..29 mezclaba mayúsculas/minúsculas: "VEINTIuno"
 *   - Negativos generaban "CON -50/100 SOLES"
 *   - NaN/Infinity no se validaban
 *   - Faltaba rama para mil millones
 *
 * @throws si n no es un número finito y no negativo
 */
export function numberToWords(n: number): string {
  if (typeof n !== 'number' || !isFinite(n) || n < 0) {
    throw new Error(`numberToWords: monto inválido ${n}. Debe ser número finito >= 0.`)
  }

  const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
  const ESPECIALES: Record<number, string> = {
    10: 'DIEZ', 11: 'ONCE', 12: 'DOCE', 13: 'TRECE', 14: 'CATORCE', 15: 'QUINCE',
    16: 'DIECISEIS', 17: 'DIECISIETE', 18: 'DIECIOCHO', 19: 'DIECINUEVE', 20: 'VEINTE',
    21: 'VEINTIUNO', 22: 'VEINTIDOS', 23: 'VEINTITRES', 24: 'VEINTICUATRO', 25: 'VEINTICINCO',
    26: 'VEINTISEIS', 27: 'VEINTISIETE', 28: 'VEINTIOCHO', 29: 'VEINTINUEVE',
  }
  const DECENAS = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
  const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

  function below100(x: number): string {
    if (ESPECIALES[x]) return ESPECIALES[x]
    if (x < 10) return UNIDADES[x]
    const t = Math.floor(x / 10)
    const u = x % 10
    return u === 0 ? DECENAS[t] : `${DECENAS[t]} Y ${UNIDADES[u]}`
  }

  function below1000(x: number): string {
    if (x === 100) return 'CIEN'
    if (x < 100) return below100(x)
    const c = Math.floor(x / 100)
    const r = x % 100
    return r === 0 ? CENTENAS[c] : `${CENTENAS[c]} ${below100(r)}`
  }

  // Cubre 0..999_999 — descompone en miles + unidades.
  // En español "1500 millones" = "MIL QUINIENTOS MILLONES" (no "MIL MILLONES
  // + 500 MILLONES"). Por eso el grupo de millones se trata como un único
  // número de 0..999_999_999 que se convierte con esta función recursiva.
  function thousandsAndUnits(x: number): string {
    if (x === 0) return ''
    if (x < 1000) return below1000(x)
    const m = Math.floor(x / 1000)
    const r = x % 1000
    const milesPart = m === 1 ? 'MIL' : `${below1000(m)} MIL`
    return r === 0 ? milesPart : `${milesPart} ${below1000(r)}`
  }

  const entero = Math.floor(n)
  const centavos = Math.round((n - entero) * 100)

  if (entero === 0) {
    return `CERO CON ${String(centavos).padStart(2, '0')}/100 SOLES`
  }

  // Descomponer en grupo de millones (0..999_999) + resto (0..999_999).
  // Soporta hasta 999,999,999,999 (cuasi-billones) en sueldos.
  const millones = Math.floor(entero / 1_000_000)
  const resto = entero % 1_000_000

  const partes: string[] = []
  if (millones > 0) {
    if (millones === 1) partes.push('UN MILLON')
    else partes.push(`${thousandsAndUnits(millones)} MILLONES`)
  }
  if (resto > 0) {
    partes.push(thousandsAndUnits(resto))
  }

  const text = partes.filter(Boolean).join(' ').trim()
  return `${text} CON ${String(centavos).padStart(2, '0')}/100 SOLES`
}

// ═══════════════════════════════════════════════════════════════════════════
//  Resolvers — field path → value
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evalúa un path `worker.firstName`, `org.ruc`, `meta.today` contra el contexto.
 * Soporta algunos "derivados" custom (fullName, sueldoEnLetras, todayInWords).
 */
export function resolveFieldPath(
  path: string,
  ctx: { worker: WorkerMergeData; org: OrgMergeData; meta: Record<string, string> },
): string {
  if (!path || !path.includes('.')) return ''

  const [group, field] = path.split('.') as [keyof typeof ctx, string]
  const source = ctx[group]
  if (!source) return ''

  // Derivados custom
  if (group === 'worker') {
    const w = source as WorkerMergeData
    switch (field) {
      case 'fullName':
        return `${w.firstName} ${w.lastName}`.trim()
      case 'sueldoEnLetras':
        return numberToWords(Number(w.sueldoBruto))
      case 'fechaIngreso':
      case 'fechaCese':
      case 'birthDate':
        return formatDateDMY(w[field as keyof WorkerMergeData] as string | Date | null | undefined)
      case 'sueldoBruto':
        return formatMoney(w.sueldoBruto)
    }
  }

  if (group === 'meta') {
    if (field === 'today') return formatDateDMY(new Date())
    if (field === 'todayInWords') return formatDateInWords(new Date())
    return ctx.meta[field] ?? ''
  }

  // Path directo
  const raw = (source as Record<string, unknown>)[field]
  if (raw === null || raw === undefined) return ''
  if (raw instanceof Date) return formatDateDMY(raw)
  return String(raw)
}

// ═══════════════════════════════════════════════════════════════════════════
//  Main render function
// ═══════════════════════════════════════════════════════════════════════════

export interface RenderContext {
  worker: WorkerMergeData
  org: OrgMergeData
  meta?: Record<string, string>
}

export interface RenderOptions {
  /** Si true, placeholders sin mapeo quedan como "____" en lugar de vacíos. */
  blankUnmapped?: boolean
  /** Ciudad del contrato (default 'Lima'). Se pasa al meta. */
  ciudad?: string
}

export interface RenderResult {
  rendered: string
  usedPlaceholders: string[]
  missingPlaceholders: string[] // Placeholders presentes pero sin mapping o valor
}

/**
 * Renderiza un template textual reemplazando `{{PLACEHOLDERS}}` con valores
 * resueltos desde el contexto.
 *
 * @param content Texto del template con `{{VAR}}`
 * @param mappings Mapeo placeholder → path (ej: `{ NOMBRE: 'worker.firstName' }`)
 * @param context Datos de worker + org + meta
 * @param options Opciones de render
 */
export function renderTemplate(
  content: string,
  mappings: Record<string, string>,
  context: RenderContext,
  options: RenderOptions = {},
): RenderResult {
  const ctx = {
    worker: context.worker,
    org: context.org,
    meta: { ciudad: options.ciudad ?? 'Lima', ...(context.meta ?? {}) },
  }
  const usedPlaceholders: string[] = []
  const missingPlaceholders: string[] = []
  const seen = new Set<string>()

  const rendered = content.replace(PLACEHOLDER_REGEX, (_full, rawKey: string) => {
    const key = rawKey.trim()
    if (!seen.has(key)) {
      seen.add(key)
      usedPlaceholders.push(key)
    }

    const path = mappings[key]
    if (!path) {
      if (!missingPlaceholders.includes(key)) missingPlaceholders.push(key)
      return options.blankUnmapped ? '____________' : `{{${key}}}`
    }

    const value = resolveFieldPath(path, ctx)
    if (!value) {
      if (!missingPlaceholders.includes(key)) missingPlaceholders.push(key)
      return options.blankUnmapped ? '____________' : ''
    }
    return value
  })

  return { rendered, usedPlaceholders, missingPlaceholders }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Schema helpers — para guardar/leer metadata en OrgDocument.description
// ═══════════════════════════════════════════════════════════════════════════

export function serializeTemplate(meta: OrgTemplateMeta): string {
  return JSON.stringify(meta)
}

export function parseTemplate(raw: string | null | undefined): OrgTemplateMeta | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as OrgTemplateMeta
    if (parsed._schema === 'contract_template_v1') return parsed
    return null
  } catch {
    return null
  }
}

export function isOrgTemplate(doc: { description?: string | null }): boolean {
  return parseTemplate(doc.description ?? null) !== null
}
