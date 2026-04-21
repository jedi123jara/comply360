/**
 * SUNAT RUC validation and query service
 *
 * In Peru, SUNAT provides RUC lookup that returns:
 * - Razon social
 * - Estado (ACTIVO, BAJA, SUSPENSION)
 * - Condicion (HABIDO, NO HABIDO)
 * - Direccion fiscal
 * - Actividad economica
 * - Tipo (PERSONA NATURAL, SAC, EIRL, etc.)
 *
 * API options:
 * 1. apis.net.pe (free tier, popular in Peru)  <-- primary
 * 2. sunat.gob.pe/consultaruc (web scraping - not recommended)
 * 3. apiperu.dev (paid, reliable)
 *
 * Environment variable: APIS_NET_PE_TOKEN (for apis.net.pe)
 * Fallback: simulated response for development
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SunatResult {
  ruc: string
  razonSocial: string
  estado: 'ACTIVO' | 'BAJA DE OFICIO' | 'SUSPENSION TEMPORAL'
  condicion: 'HABIDO' | 'NO HABIDO' | 'NO HALLADO'
  direccion: string
  actividadEconomica: string
  tipoContribuyente: string
  fechaInscripcion: string
  ubigeo: string
}

export interface DniResult {
  dni: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  apellidos: string
}

export interface SunatError {
  code: 'INVALID_RUC' | 'INVALID_DNI' | 'NOT_FOUND' | 'API_ERROR' | 'RATE_LIMITED'
  message: string
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUNAT_API_BASE = 'https://api.apis.net.pe/v1'
const REQUEST_TIMEOUT_MS = 10_000

// ---------------------------------------------------------------------------
// RUC validation (algorithmic - no API call needed)
// ---------------------------------------------------------------------------

/**
 * Validates a Peruvian RUC number using the SUNAT algorithm.
 *
 * RUC structure (11 digits):
 * - Prefix: 10 (persona natural), 15 (no domiciliado), 17 (no domiciliado),
 *   20 (SAC, SA, SRL, etc.), 30 (entidad estatal)
 * - Middle 8 digits: sequential number
 * - Last digit: verification digit (modulo 11)
 */
export function validarRUC(ruc: string): boolean {
  // Must be exactly 11 digits
  if (!/^\d{11}$/.test(ruc)) return false

  // Valid prefixes
  const prefix = ruc.substring(0, 2)
  const validPrefixes = ['10', '15', '17', '20', '30']
  if (!validPrefixes.includes(prefix)) return false

  // Modulo 11 check digit validation
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const digits = ruc.split('').map(Number)

  let sum = 0
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * weights[i]
  }

  const remainder = sum % 11
  const checkDigit = 11 - remainder
  const expected = checkDigit === 10 ? 0 : checkDigit === 11 ? 1 : checkDigit

  return digits[10] === expected
}

/**
 * Validates a Peruvian DNI number (8 digits).
 */
export function validarDNI(dni: string): boolean {
  return /^\d{8}$/.test(dni)
}

// ---------------------------------------------------------------------------
// API client with timeout and retry
// ---------------------------------------------------------------------------

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

async function apiRequest<T>(
  endpoint: string
): Promise<{ data: T | null; error: SunatError | null }> {
  const url = `${SUNAT_API_BASE}${endpoint}`

  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Referer: 'https://comply360.pe',
      },
    })

    if (response.status === 404) {
      return {
        data: null,
        error: { code: 'NOT_FOUND', message: 'No se encontro informacion para el numero proporcionado.' },
      }
    }

    if (response.status === 429) {
      return {
        data: null,
        error: { code: 'RATE_LIMITED', message: 'Limite de consultas excedido. Intente en unos minutos.' },
      }
    }

    if (!response.ok) {
      return {
        data: null,
        error: {
          code: 'API_ERROR',
          message: `Error del servicio SUNAT (HTTP ${response.status}). Intente nuevamente.`,
        },
      }
    }

    const data = (await response.json()) as T
    return { data, error: null }
  } catch (err) {
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'Tiempo de espera agotado al consultar SUNAT.'
        : 'Error de conexion al servicio SUNAT.'

    console.error('[SUNAT API]', endpoint, err)
    return { data: null, error: { code: 'API_ERROR', message } }
  }
}

// ---------------------------------------------------------------------------
// Public API — consultarRUC
// ---------------------------------------------------------------------------

// v1 response shape
interface ApisNetPeRucResponse {
  ruc: string
  nombre: string          // v1 uses 'nombre' instead of 'razonSocial'
  estado?: string
  condicion?: string
  direccion?: string
  actividadEconomica?: string
  tipoContribuyente?: string
  fechaInscripcion?: string
  ubigeo?: string
  departamento?: string
  provincia?: string
  distrito?: string
}

/**
 * Query SUNAT for RUC information.
 *
 * In development without SUNAT_API_TOKEN, returns mock data.
 * In production, calls apis.net.pe API.
 */
export async function consultarRUC(
  ruc: string
): Promise<{ data: SunatResult | null; error: SunatError | null }> {
  // Validate format first
  if (!validarRUC(ruc)) {
    return {
      data: null,
      error: { code: 'INVALID_RUC', message: `RUC "${ruc}" no es valido. Debe tener 11 digitos y un digito verificador correcto.` },
    }
  }

  // Call the free v1 API (no token required)
  const result = await apiRequest<ApisNetPeRucResponse>(`/ruc?numero=${ruc}`)

  if (result.error || !result.data) {
    return { data: null, error: result.error }
  }

  const raw = result.data
  return {
    data: {
      ruc: raw.ruc || ruc,
      razonSocial: raw.nombre || '',           // v1 returns 'nombre'
      estado: normalizeEstado(raw.estado || 'ACTIVO'),
      condicion: normalizeCondicion(raw.condicion || 'HABIDO'),
      direccion: raw.direccion || '',
      actividadEconomica: raw.actividadEconomica || '',
      tipoContribuyente: raw.tipoContribuyente || '',
      fechaInscripcion: raw.fechaInscripcion || '',
      ubigeo: raw.ubigeo || '',
    },
    error: null,
  }
}

// ---------------------------------------------------------------------------
// Public API — consultarDNI
// ---------------------------------------------------------------------------

// v1 DNI response shape
interface ApisNetPeDniResponse {
  dni?: string
  nombre?: string        // v1 returns full name in 'nombre'
  nombres?: string
  apellidoPaterno?: string
  apellidoMaterno?: string
}

/**
 * Query RENIEC (via apis.net.pe) for DNI information.
 *
 * Returns the full name associated with a DNI number.
 * In development without SUNAT_API_TOKEN, returns mock data.
 */
export async function consultarDNI(
  dni: string
): Promise<{ data: DniResult | null; error: SunatError | null }> {
  // Validate format
  if (!validarDNI(dni)) {
    return {
      data: null,
      error: { code: 'INVALID_DNI', message: `DNI "${dni}" no es valido. Debe tener exactamente 8 digitos.` },
    }
  }

  // Call the free v1 API (no token required)
  const result = await apiRequest<ApisNetPeDniResponse>(`/dni?numero=${dni}`)

  if (result.error || !result.data) {
    return { data: null, error: result.error }
  }

  const raw = result.data
  // v1 returns the full name in a single 'nombre' field e.g. "PEREZ GARCIA JUAN CARLOS"
  // Split it: first two words are apellidos, rest are nombres
  const parts = (raw.nombre || '').trim().split(/\s+/)
  const apellidoPaterno = raw.apellidoPaterno || parts[0] || ''
  const apellidoMaterno = raw.apellidoMaterno || parts[1] || ''
  const nombres = raw.nombres || parts.slice(2).join(' ') || ''

  return {
    data: {
      dni: raw.dni || dni,
      nombres,
      apellidoPaterno,
      apellidoMaterno,
      apellidos: `${apellidoPaterno} ${apellidoMaterno}`.trim(),
    },
    error: null,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeEstado(
  raw: string
): 'ACTIVO' | 'BAJA DE OFICIO' | 'SUSPENSION TEMPORAL' {
  const upper = (raw || '').toUpperCase().trim()
  if (upper.includes('BAJA')) return 'BAJA DE OFICIO'
  if (upper.includes('SUSPEN')) return 'SUSPENSION TEMPORAL'
  return 'ACTIVO'
}

function normalizeCondicion(
  raw: string
): 'HABIDO' | 'NO HABIDO' | 'NO HALLADO' {
  const upper = (raw || '').toUpperCase().trim()
  if (upper.includes('NO HABIDO')) return 'NO HABIDO'
  if (upper.includes('NO HALLADO')) return 'NO HALLADO'
  return 'HABIDO'
}

// ---------------------------------------------------------------------------
// Utility: determine contributor type from RUC prefix
// ---------------------------------------------------------------------------

export function getTipoContribuyenteFromRUC(ruc: string): string {
  if (!ruc || ruc.length < 2) return 'DESCONOCIDO'
  const prefix = ruc.substring(0, 2)
  switch (prefix) {
    case '10':
      return 'PERSONA NATURAL'
    case '15':
      return 'NO DOMICILIADO'
    case '17':
      return 'NO DOMICILIADO'
    case '20':
      return 'PERSONA JURIDICA'
    case '30':
      return 'ENTIDAD ESTATAL'
    default:
      return 'DESCONOCIDO'
  }
}

// ---------------------------------------------------------------------------
// Utility: check if a RUC represents an active, habido contributor
// ---------------------------------------------------------------------------

export async function isContribuyenteActivo(
  ruc: string
): Promise<{ activo: boolean; message: string }> {
  const result = await consultarRUC(ruc)

  if (result.error) {
    return { activo: false, message: result.error.message }
  }

  if (!result.data) {
    return { activo: false, message: 'No se pudo obtener informacion del RUC.' }
  }

  const { estado, condicion } = result.data

  if (estado !== 'ACTIVO') {
    return {
      activo: false,
      message: `El contribuyente tiene estado "${estado}". Solo se permite operar con contribuyentes ACTIVOS.`,
    }
  }

  if (condicion !== 'HABIDO') {
    return {
      activo: false,
      message: `El contribuyente tiene condicion "${condicion}". Solo se permite operar con contribuyentes HABIDOS.`,
    }
  }

  return { activo: true, message: 'Contribuyente activo y habido.' }
}
