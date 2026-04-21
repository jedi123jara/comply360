/**
 * SUNAT Consulta RUC Avanzada
 *
 * Consulta directa al portal público de SUNAT (e-consultaruc.sunat.gob.pe)
 * para obtener datos adicionales que apis.net.pe no expone:
 *
 * 1. Deuda Coactiva — deudas tributarias pendientes
 * 2. Representantes Legales — nombre, DNI, cargo
 * 3. Cantidad de Trabajadores — por período mensual
 * 4. Establecimientos — sucursales y locales registrados
 *
 * Flujo técnico:
 * GET a SUNAT para obtener cookies de sesión → POST a jcrS00Alias
 * con accion específica → parsear HTML de respuesta.
 *
 * No requiere credenciales SOL — datos públicos.
 */

import { validarRUC } from './sunat'
import { cacheGet, cacheSet } from '../cache'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeudaCoactivaItem {
  monto: string
  periodo: string
  fechaCobranza: string
  entidad: string
}

export interface DeudaCoactivaResult {
  ruc: string
  items: DeudaCoactivaItem[]
  totalItems: number
  consultedAt: string
}

export interface RepresentanteLegalItem {
  tipoDocumento: string
  numDocumento: string
  nombre: string
  cargo: string
  fechaDesde: string
}

export interface RepresentantesLegalesResult {
  ruc: string
  representantes: RepresentanteLegalItem[]
  totalRepresentantes: number
  consultedAt: string
}

export interface CantidadTrabajadoresItem {
  periodo: string
  totalTrabajadores: number
  pensionistas: number
  prestadoresServicios: number
}

export interface CantidadTrabajadoresResult {
  ruc: string
  periodos: CantidadTrabajadoresItem[]
  consultedAt: string
}

export interface EstablecimientoItem {
  codigo: string
  descripcionTipo: string
  direccion: string
  actividadEconomica: string
}

export interface EstablecimientosResult {
  ruc: string
  establecimientos: EstablecimientoItem[]
  totalEstablecimientos: number
  consultedAt: string
}

export interface ConsultaRucError {
  code: 'INVALID_RUC' | 'NOT_FOUND' | 'SUNAT_OFFLINE' | 'PARSE_ERROR' | 'RATE_LIMITED'
  message: string
}

export type ConsultaTipo = 'deuda' | 'representantes' | 'trabajadores' | 'establecimientos'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUNAT_BASE = 'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc'
const SUNAT_FRAME_URL = `${SUNAT_BASE}/FrameCriterioBusquedaWeb.jsp`
const SUNAT_ALIAS_URL = `${SUNAT_BASE}/jcrS00Alias`
const REQUEST_TIMEOUT_MS = 10_000

// Cache TTLs
const CACHE_TTL_DEUDA = 24 * 60 * 60 * 1000       // 24 horas
const CACHE_TTL_REPRESENTANTES = 7 * 24 * 60 * 60 * 1000 // 7 días
const CACHE_TTL_TRABAJADORES = 24 * 60 * 60 * 1000  // 24 horas
const CACHE_TTL_ESTABLECIMIENTOS = 7 * 24 * 60 * 60 * 1000 // 7 días

const CACHE_TTLS: Record<ConsultaTipo, number> = {
  deuda: CACHE_TTL_DEUDA,
  representantes: CACHE_TTL_REPRESENTANTES,
  trabajadores: CACHE_TTL_TRABAJADORES,
  establecimientos: CACHE_TTL_ESTABLECIMIENTOS,
}

// Browser-like headers to avoid being blocked
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-PE,es;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  Referer: 'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/FrameCriterioBusquedaWeb.jsp',
}

function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Establishes a session with SUNAT's consultation portal.
 * Returns cookies needed for subsequent POST requests.
 */
async function establishSession(): Promise<{ cookies: string } | null> {
  try {
    const response = await fetchWithTimeout(SUNAT_FRAME_URL, {
      method: 'GET',
      headers: BROWSER_HEADERS,
      redirect: 'manual',
    })

    const setCookieHeaders = response.headers.getSetCookie?.() || []
    if (setCookieHeaders.length === 0) {
      // Fallback: try raw header
      const rawCookie = response.headers.get('set-cookie')
      if (rawCookie) {
        const cookies = rawCookie
          .split(/,(?=\s*\w+=)/)
          .map(c => c.split(';')[0].trim())
          .filter(Boolean)
          .join('; ')
        return cookies ? { cookies } : null
      }
      return null
    }

    const cookies = setCookieHeaders
      .map(c => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ')

    return cookies ? { cookies } : null
  } catch (err) {
    console.error('[SUNAT ConsultaRUC] Error establishing session:', err)
    return null
  }
}

/**
 * Makes a POST request to SUNAT's jcrS00Alias endpoint with the given action.
 */
async function sunatPost(
  cookies: string,
  ruc: string,
  accion: string
): Promise<{ html: string | null; error: ConsultaRucError | null }> {
  try {
    const body = new URLSearchParams({
      accion,
      nroRuc: ruc,
      desRuc: '',
    })

    const response = await fetchWithTimeout(SUNAT_ALIAS_URL, {
      method: 'POST',
      headers: {
        ...BROWSER_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookies,
      },
      body: body.toString(),
    })

    if (!response.ok) {
      if (response.status === 429) {
        return { html: null, error: { code: 'RATE_LIMITED', message: 'SUNAT ha limitado las consultas. Intente en unos minutos.' } }
      }
      return { html: null, error: { code: 'SUNAT_OFFLINE', message: `Error del portal SUNAT (HTTP ${response.status}).` } }
    }

    const html = await response.text()
    if (!html || html.length < 50) {
      return { html: null, error: { code: 'NOT_FOUND', message: 'No se encontraron datos para este RUC.' } }
    }

    return { html, error: null }
  } catch (err) {
    const message = err instanceof Error && err.name === 'AbortError'
      ? 'Tiempo de espera agotado al consultar SUNAT.'
      : 'Error de conexión con el portal SUNAT.'
    console.error('[SUNAT ConsultaRUC] POST error:', err)
    return { html: null, error: { code: 'SUNAT_OFFLINE', message } }
  }
}

// ---------------------------------------------------------------------------
// HTML Table Parser
// ---------------------------------------------------------------------------

/**
 * Extracts rows from HTML tables.
 * Returns a 2D array: rows x cells (text content only).
 */
function parseHtmlTable(html: string): string[][] {
  const rows: string[][] = []

  // Match all <tr> tags
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let trMatch: RegExpExecArray | null

  while ((trMatch = trRegex.exec(html)) !== null) {
    const trContent = trMatch[1]
    const cells: string[] = []

    // Match all <td> tags within this row
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
    let tdMatch: RegExpExecArray | null

    while ((tdMatch = tdRegex.exec(trContent)) !== null) {
      // Strip inner HTML tags and decode entities
      const text = tdMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()
      cells.push(text)
    }

    if (cells.length > 0) {
      rows.push(cells)
    }
  }

  return rows
}

/**
 * Cleans and normalizes a date string from SUNAT (dd/mm/yyyy) to YYYY-MM-DD.
 */
function normalizeFecha(raw: string): string {
  const cleaned = raw.replace(/\s+/g, '').trim()
  const match = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`
  }
  return cleaned || '-'
}

// ---------------------------------------------------------------------------
// Mock Data (development)
// ---------------------------------------------------------------------------

const MOCK_DEUDA: DeudaCoactivaResult = {
  ruc: '20100130204',
  items: [],
  totalItems: 0,
  consultedAt: new Date().toISOString(),
}

const MOCK_REPRESENTANTES: RepresentantesLegalesResult = {
  ruc: '20100130204',
  representantes: [
    {
      tipoDocumento: 'DNI',
      numDocumento: '08234567',
      nombre: 'ROMERO ALBERTINI GIANFRANCO ALFONSO',
      cargo: 'GERENTE GENERAL',
      fechaDesde: '2019-03-01',
    },
    {
      tipoDocumento: 'DNI',
      numDocumento: '09876543',
      nombre: 'FERRARI ALONSO DIEGO',
      cargo: 'APODERADO',
      fechaDesde: '2020-06-15',
    },
  ],
  totalRepresentantes: 2,
  consultedAt: new Date().toISOString(),
}

const MOCK_TRABAJADORES: CantidadTrabajadoresResult = {
  ruc: '20100130204',
  periodos: [
    { periodo: '2026-03', totalTrabajadores: 15234, pensionistas: 320, prestadoresServicios: 1540 },
    { periodo: '2026-02', totalTrabajadores: 15180, pensionistas: 318, prestadoresServicios: 1520 },
    { periodo: '2026-01', totalTrabajadores: 15050, pensionistas: 315, prestadoresServicios: 1500 },
  ],
  consultedAt: new Date().toISOString(),
}

const MOCK_ESTABLECIMIENTOS: EstablecimientosResult = {
  ruc: '20100130204',
  establecimientos: [
    { codigo: '0001', descripcionTipo: 'SEDE PRINCIPAL', direccion: 'CAL. CENTENARIO NRO. 156 URB. LAS LADERAS DE MELGAREJO - LA MOLINA', actividadEconomica: 'INTERMEDIACION MONETARIA' },
    { codigo: '0002', descripcionTipo: 'SUCURSAL', direccion: 'AV. RIVERA NAVARRETE NRO. 600 - SAN ISIDRO', actividadEconomica: 'INTERMEDIACION MONETARIA' },
    { codigo: '0003', descripcionTipo: 'AGENCIA', direccion: 'AV. LARCO NRO. 1301 - MIRAFLORES', actividadEconomica: 'INTERMEDIACION MONETARIA' },
  ],
  totalEstablecimientos: 3,
  consultedAt: new Date().toISOString(),
}

// ---------------------------------------------------------------------------
// Parsers — extract structured data from SUNAT HTML responses
// ---------------------------------------------------------------------------

function parseDeudaCoactiva(html: string, ruc: string): DeudaCoactivaResult {
  const rows = parseHtmlTable(html)
  const items: DeudaCoactivaItem[] = []

  // Skip header row (first row is usually headers)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.length >= 3) {
      items.push({
        monto: row[0] || '0.00',
        periodo: row[1] || '-',
        fechaCobranza: row.length >= 4 ? normalizeFecha(row[2]) : '-',
        entidad: row[row.length - 1] || '-',
      })
    }
  }

  return {
    ruc,
    items,
    totalItems: items.length,
    consultedAt: new Date().toISOString(),
  }
}

function parseRepresentantesLegales(html: string, ruc: string): RepresentantesLegalesResult {
  const rows = parseHtmlTable(html)
  const representantes: RepresentanteLegalItem[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.length >= 4) {
      representantes.push({
        tipoDocumento: row[0] || 'DNI',
        numDocumento: row[1] || '',
        nombre: row[2] || '',
        cargo: row[3] || '',
        fechaDesde: row.length >= 5 ? normalizeFecha(row[4]) : '-',
      })
    }
  }

  return {
    ruc,
    representantes,
    totalRepresentantes: representantes.length,
    consultedAt: new Date().toISOString(),
  }
}

function parseCantidadTrabajadores(html: string, ruc: string): CantidadTrabajadoresResult {
  const rows = parseHtmlTable(html)
  const periodos: CantidadTrabajadoresItem[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.length >= 2) {
      const periodo = row[0] || ''
      const total = parseInt(row[1], 10) || 0
      const pensionistas = row.length >= 3 ? parseInt(row[2], 10) || 0 : 0
      const prestadores = row.length >= 4 ? parseInt(row[3], 10) || 0 : 0

      periodos.push({
        periodo,
        totalTrabajadores: total,
        pensionistas,
        prestadoresServicios: prestadores,
      })
    }
  }

  return {
    ruc,
    periodos,
    consultedAt: new Date().toISOString(),
  }
}

function parseEstablecimientos(html: string, ruc: string): EstablecimientosResult {
  const rows = parseHtmlTable(html)
  const establecimientos: EstablecimientoItem[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.length >= 3) {
      establecimientos.push({
        codigo: row[0] || '',
        descripcionTipo: row[1] || '',
        direccion: row[2] || '',
        actividadEconomica: row.length >= 4 ? row[3] : '-',
      })
    }
  }

  return {
    ruc,
    establecimientos,
    totalEstablecimientos: establecimientos.length,
    consultedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// SUNAT action codes per query type
// ---------------------------------------------------------------------------

const ACCION_MAP: Record<ConsultaTipo, string> = {
  deuda: 'getInfoDC',
  representantes: 'getRepLeg',
  trabajadores: 'getNumTrab',
  establecimientos: 'getLocAnex',
}

type ResultMap = {
  deuda: DeudaCoactivaResult
  representantes: RepresentantesLegalesResult
  trabajadores: CantidadTrabajadoresResult
  establecimientos: EstablecimientosResult
}

const PARSER_MAP: {
  [K in ConsultaTipo]: (html: string, ruc: string) => ResultMap[K]
} = {
  deuda: parseDeudaCoactiva,
  representantes: parseRepresentantesLegales,
  trabajadores: parseCantidadTrabajadores,
  establecimientos: parseEstablecimientos,
}

const MOCK_MAP: Record<ConsultaTipo, unknown> = {
  deuda: MOCK_DEUDA,
  representantes: MOCK_REPRESENTANTES,
  trabajadores: MOCK_TRABAJADORES,
  establecimientos: MOCK_ESTABLECIMIENTOS,
}

// ---------------------------------------------------------------------------
// Generic query function
// ---------------------------------------------------------------------------

async function consultarSunat<T extends ConsultaTipo>(
  ruc: string,
  tipo: T
): Promise<{ data: ResultMap[T] | null; error: ConsultaRucError | null }> {
  // Validate RUC
  if (!validarRUC(ruc)) {
    return {
      data: null,
      error: { code: 'INVALID_RUC', message: `RUC "${ruc}" no es válido.` },
    }
  }

  // Check in-memory cache
  const cacheKey = `sunat:consulta:${tipo}:${ruc}`
  const cached = cacheGet<ResultMap[T]>(cacheKey)
  if (cached) {
    return { data: cached, error: null }
  }

  // In development, return mock data
  if (isDevelopment()) {
    const mockData = { ...(MOCK_MAP[tipo] as ResultMap[T]), ruc, consultedAt: new Date().toISOString() }
    cacheSet(cacheKey, mockData, CACHE_TTLS[tipo])
    return { data: mockData, error: null }
  }

  // Establish session
  const session = await establishSession()
  if (!session) {
    return {
      data: null,
      error: { code: 'SUNAT_OFFLINE', message: 'No se pudo conectar al portal SUNAT. Intente más tarde.' },
    }
  }

  // First, do a RUC lookup to initialize the session context
  const initBody = new URLSearchParams({ accion: 'consPorRuc', nroRuc: ruc, desRuc: '' })
  try {
    await fetchWithTimeout(SUNAT_ALIAS_URL, {
      method: 'POST',
      headers: {
        ...BROWSER_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: session.cookies,
      },
      body: initBody.toString(),
    })
  } catch {
    // If initial lookup fails, the supplementary query may still work
  }

  // Execute the specific query
  const accion = ACCION_MAP[tipo]
  const result = await sunatPost(session.cookies, ruc, accion)

  if (result.error) {
    return { data: null, error: result.error }
  }

  if (!result.html) {
    return { data: null, error: { code: 'NOT_FOUND', message: 'No se encontraron datos.' } }
  }

  // Parse the HTML response
  try {
    const parser = PARSER_MAP[tipo]
    const data = parser(result.html, ruc)
    cacheSet(cacheKey, data, CACHE_TTLS[tipo])
    return { data, error: null }
  } catch (err) {
    console.error(`[SUNAT ConsultaRUC] Parse error for ${tipo}:`, err)
    return {
      data: null,
      error: { code: 'PARSE_ERROR', message: 'Error al procesar la respuesta de SUNAT. El formato pudo haber cambiado.' },
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function consultarDeudaCoactiva(
  ruc: string
): Promise<{ data: DeudaCoactivaResult | null; error: ConsultaRucError | null }> {
  return consultarSunat(ruc, 'deuda')
}

export async function consultarRepresentantesLegales(
  ruc: string
): Promise<{ data: RepresentantesLegalesResult | null; error: ConsultaRucError | null }> {
  return consultarSunat(ruc, 'representantes')
}

export async function consultarCantidadTrabajadores(
  ruc: string
): Promise<{ data: CantidadTrabajadoresResult | null; error: ConsultaRucError | null }> {
  return consultarSunat(ruc, 'trabajadores')
}

export async function consultarEstablecimientos(
  ruc: string
): Promise<{ data: EstablecimientosResult | null; error: ConsultaRucError | null }> {
  return consultarSunat(ruc, 'establecimientos')
}

/**
 * Convenience function to run all 4 queries for a RUC in parallel.
 * Useful for the empresa page where we want all data at once.
 */
export async function consultarRucCompleto(ruc: string): Promise<{
  deuda: DeudaCoactivaResult | null
  representantes: RepresentantesLegalesResult | null
  trabajadores: CantidadTrabajadoresResult | null
  establecimientos: EstablecimientosResult | null
  errors: Partial<Record<ConsultaTipo, ConsultaRucError>>
}> {
  const [deudaRes, repRes, trabRes, estRes] = await Promise.all([
    consultarDeudaCoactiva(ruc),
    consultarRepresentantesLegales(ruc),
    consultarCantidadTrabajadores(ruc),
    consultarEstablecimientos(ruc),
  ])

  const errors: Partial<Record<ConsultaTipo, ConsultaRucError>> = {}
  if (deudaRes.error) errors.deuda = deudaRes.error
  if (repRes.error) errors.representantes = repRes.error
  if (trabRes.error) errors.trabajadores = trabRes.error
  if (estRes.error) errors.establecimientos = estRes.error

  return {
    deuda: deudaRes.data,
    representantes: repRes.data,
    trabajadores: trabRes.data,
    establecimientos: estRes.data,
    errors,
  }
}
