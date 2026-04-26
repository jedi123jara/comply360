/**
 * RENIEC — Consulta de datos personales por DNI.
 *
 * RENIEC oficial NO ofrece API pública (requiere convenio gobierno).
 * Usamos apis.net.pe como pasarela (gratuito + rate-limited) con fallback
 * a apiperu.dev si el primero falla.
 *
 * Auto-fill típico al ingresar DNI en form de trabajador:
 *   - nombres, apellidos paterno+materno
 *   - fecha de nacimiento (cuando disponible)
 *   - sexo (M/F)
 *
 * Privacidad: estos endpoints son públicos y los datos retornados son los
 * mismos que aparecen en el voto electoral. No es violación de protección
 * de datos consultar el propio DNI o el de un trabajador con consentimiento
 * laboral. Aún así, registramos cada consulta en AuditLog.
 *
 * Para producción enterprise (volumen alto): cambiar a RENIEC oficial via
 * convenio con Sunat o usar Decidir Confront / Equifax.
 */

import { cacheGet, cacheSet } from '../cache'

const APIS_NET_PE_URL = 'https://api.apis.net.pe/v2/reniec/dni'
const APIPERU_DEV_URL = 'https://apiperu.dev/api/dni'
const CACHE_TTL_DAYS = 30

export interface ReniecDniData {
  dni: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  nombreCompleto: string
  fechaNacimiento?: string | null // ISO YYYY-MM-DD si disponible
  sexo?: 'M' | 'F' | null
  source: 'apis.net.pe' | 'apiperu.dev' | 'cache'
  consultedAt: string
}

export class ReniecError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_DNI' | 'NOT_FOUND' | 'RATE_LIMIT' | 'NO_TOKEN' | 'NETWORK' | 'UNKNOWN',
    public readonly status: number = 500,
  ) {
    super(message)
    this.name = 'ReniecError'
  }
}

/** Valida formato DNI peruano (8 dígitos numéricos). */
export function validarDNI(dni: string): boolean {
  return /^\d{8}$/.test(dni.trim())
}

interface ApisNetPeResponse {
  numeroDocumento?: string
  nombres?: string
  apellidoPaterno?: string
  apellidoMaterno?: string
  fechaNacimiento?: string
  sexo?: string
}

interface ApiPeruDevResponse {
  success?: boolean
  data?: {
    numero?: string
    nombres?: string
    apellido_paterno?: string
    apellido_materno?: string
    nombre_completo?: string
    fecha_nacimiento?: string
    sexo?: string
  }
}

/**
 * Provider A: apis.net.pe (gratuito con token).
 * Token va en `APIS_NET_PE_TOKEN` env var. Sin token → throw NO_TOKEN.
 */
async function consultarVíaApisNetPe(dni: string): Promise<ReniecDniData> {
  const token = process.env.APIS_NET_PE_TOKEN
  if (!token) {
    throw new ReniecError('Falta APIS_NET_PE_TOKEN env var', 'NO_TOKEN', 503)
  }

  const res = await fetch(`${APIS_NET_PE_URL}?numero=${dni}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    // Timeout suave: si tarda >5s consideramos failover
    signal: AbortSignal.timeout(5000),
  })

  if (res.status === 404) throw new ReniecError('DNI no encontrado en RENIEC', 'NOT_FOUND', 404)
  if (res.status === 429) throw new ReniecError('Rate limit en apis.net.pe', 'RATE_LIMIT', 429)
  if (!res.ok) throw new ReniecError(`apis.net.pe HTTP ${res.status}`, 'NETWORK', 502)

  const data = (await res.json()) as ApisNetPeResponse
  if (!data.nombres || !data.apellidoPaterno) {
    throw new ReniecError('Respuesta de apis.net.pe incompleta', 'NOT_FOUND', 502)
  }

  return {
    dni,
    nombres: data.nombres.trim(),
    apellidoPaterno: data.apellidoPaterno.trim(),
    apellidoMaterno: (data.apellidoMaterno ?? '').trim(),
    nombreCompleto: `${data.nombres.trim()} ${data.apellidoPaterno.trim()} ${(data.apellidoMaterno ?? '').trim()}`.trim(),
    fechaNacimiento: data.fechaNacimiento ?? null,
    sexo: data.sexo === 'M' || data.sexo === 'F' ? data.sexo : null,
    source: 'apis.net.pe',
    consultedAt: new Date().toISOString(),
  }
}

/**
 * Provider B: apiperu.dev (gratuito, sin token requerido).
 * Más lento y a veces inestable, pero sirve como fallback.
 */
async function consultarVíaApiPeruDev(dni: string): Promise<ReniecDniData> {
  const token = process.env.APIPERU_DEV_TOKEN
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${APIPERU_DEV_URL}/${dni}`, {
    headers,
    signal: AbortSignal.timeout(5000),
  })

  if (res.status === 404) throw new ReniecError('DNI no encontrado en RENIEC', 'NOT_FOUND', 404)
  if (res.status === 429) throw new ReniecError('Rate limit en apiperu.dev', 'RATE_LIMIT', 429)
  if (!res.ok) throw new ReniecError(`apiperu.dev HTTP ${res.status}`, 'NETWORK', 502)

  const json = (await res.json()) as ApiPeruDevResponse
  if (!json.success || !json.data) {
    throw new ReniecError('Respuesta de apiperu.dev incompleta', 'NOT_FOUND', 502)
  }

  const d = json.data
  if (!d.nombres || !d.apellido_paterno) {
    throw new ReniecError('Respuesta de apiperu.dev incompleta', 'NOT_FOUND', 502)
  }

  return {
    dni,
    nombres: d.nombres.trim(),
    apellidoPaterno: d.apellido_paterno.trim(),
    apellidoMaterno: (d.apellido_materno ?? '').trim(),
    nombreCompleto:
      d.nombre_completo?.trim() ||
      `${d.nombres.trim()} ${d.apellido_paterno.trim()} ${(d.apellido_materno ?? '').trim()}`.trim(),
    fechaNacimiento: d.fecha_nacimiento ?? null,
    sexo: d.sexo === 'M' || d.sexo === 'F' ? d.sexo : null,
    source: 'apiperu.dev',
    consultedAt: new Date().toISOString(),
  }
}

/**
 * Consulta RENIEC con fallback A → B + cache 30 días.
 *
 * Retorna `ReniecDniData` o lanza `ReniecError` con `.code`:
 *   - INVALID_DNI: formato no es 8 dígitos
 *   - NOT_FOUND: DNI no existe en RENIEC
 *   - NO_TOKEN: ningún provider configurado
 *   - RATE_LIMIT / NETWORK: ambos providers fallaron
 */
export async function consultarDNI(dni: string): Promise<ReniecDniData> {
  const normalized = dni.trim()
  if (!validarDNI(normalized)) {
    throw new ReniecError('Formato de DNI inválido (debe ser 8 dígitos)', 'INVALID_DNI', 400)
  }

  // Cache 30 días — los datos RENIEC no cambian a corto plazo
  const cacheKey = `reniec:${normalized}`
  const cached = await cacheGet<ReniecDniData>(cacheKey)
  if (cached) {
    return { ...cached, source: 'cache' }
  }

  let lastError: ReniecError | undefined
  for (const provider of [consultarVíaApisNetPe, consultarVíaApiPeruDev]) {
    try {
      const data = await provider(normalized)
      await cacheSet(cacheKey, data, CACHE_TTL_DAYS * 24 * 60 * 60)
      return data
    } catch (err) {
      lastError = err instanceof ReniecError ? err : new ReniecError(String(err), 'UNKNOWN', 500)
      // Si es NOT_FOUND (DNI no existe), no probamos el siguiente provider
      if (lastError.code === 'NOT_FOUND' || lastError.code === 'INVALID_DNI') throw lastError
    }
  }

  throw lastError ?? new ReniecError('No se pudo consultar RENIEC', 'UNKNOWN', 500)
}
