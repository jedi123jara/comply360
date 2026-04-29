/**
 * 🏆 GEOFENCING + VALIDACIÓN DE ASISTENCIA REMOTA
 *
 * Permite definir polígonos geográficos (zonas permitidas) y validar si un
 * marcado de asistencia (lat/lng) cae dentro de alguna zona.
 *
 * Casos de uso:
 *  - Trabajador presencial debe marcar DENTRO de la oficina
 *  - Trabajador de obra debe marcar DENTRO del área del proyecto
 *  - Teletrabajador: geofencing opcional para validar que está en su domicilio
 *    declarado (antifraude de suplantación)
 *
 * La librería es puramente matemática, sin dependencias externas.
 * Usa Haversine para distancias y ray-casting para point-in-polygon.
 */

// =============================================
// TYPES
// =============================================

export interface GeoPoint {
  lat: number
  lng: number
}

export interface GeofenceCircle {
  id: string
  name: string
  type: 'circle'
  center: GeoPoint
  radiusMeters: number
  /** Opcional: identificador del local/obra/domicilio */
  locationId?: string
}

export interface GeofencePolygon {
  id: string
  name: string
  type: 'polygon'
  /** Polígono cerrado: primer y último punto pueden coincidir o no */
  vertices: GeoPoint[]
  locationId?: string
}

export type Geofence = GeofenceCircle | GeofencePolygon

export interface AttendanceCheckInput {
  point: GeoPoint
  accuracyMeters?: number
  timestamp?: string
  /** Hash de foto biométrica, si se usa verificación facial */
  photoHash?: string
}

export interface AttendanceCheckResult {
  valid: boolean
  matchedFence?: Geofence
  distanceToNearestFence: number
  nearestFence?: Geofence
  reasons: string[]
  riskScore: number // 0-100 donde 100 = muy sospechoso
}

// =============================================
// MATH
// =============================================

const EARTH_RADIUS_M = 6371000

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Distancia Haversine en metros entre dos puntos */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

/**
 * Point-in-polygon con ray casting.
 * Interpreta los vertices como grados; funciona bien para polígonos pequeños
 * (escala urbana/edificio). Para países enteros usar una lib con geoide real.
 */
export function pointInPolygon(point: GeoPoint, vertices: GeoPoint[]): boolean {
  let inside = false
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].lng
    const yi = vertices[i].lat
    const xj = vertices[j].lng
    const yj = vertices[j].lat
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + 1e-12) + xi
    if (intersect) inside = !inside
  }
  return inside
}

// =============================================
// VALIDACIÓN
// =============================================

export function checkAttendance(
  fences: Geofence[],
  input: AttendanceCheckInput
): AttendanceCheckResult {
  const reasons: string[] = []
  let riskScore = 0

  if (!fences || fences.length === 0) {
    return {
      valid: false,
      distanceToNearestFence: Infinity,
      reasons: ['No hay zonas configuradas para validar asistencia'],
      riskScore: 50,
    }
  }

  // Accuracy del GPS: si es >100m, el marcado es sospechoso
  if (input.accuracyMeters != null && input.accuracyMeters > 100) {
    reasons.push(
      `Precisión del GPS baja (${Math.round(input.accuracyMeters)}m) — dato menos confiable`
    )
    riskScore += 20
  }

  // Buscar fence que contiene el punto
  let matchedFence: Geofence | undefined
  let minDistance = Infinity
  let nearestFence: Geofence | undefined

  for (const fence of fences) {
    if (fence.type === 'circle') {
      const d = distanceMeters(input.point, fence.center)
      if (d <= fence.radiusMeters) {
        matchedFence = fence
      }
      if (d < minDistance) {
        minDistance = d
        nearestFence = fence
      }
    } else {
      // polígono: usar vertice más cercano como aproximación de distancia
      const centroidDistances = fence.vertices.map(v => distanceMeters(input.point, v))
      const minToVertex = Math.min(...centroidDistances)
      if (pointInPolygon(input.point, fence.vertices)) {
        matchedFence = fence
      }
      if (minToVertex < minDistance) {
        minDistance = minToVertex
        nearestFence = fence
      }
    }
    if (matchedFence) break
  }

  if (!matchedFence) {
    reasons.push(
      `Fuera de zona permitida. Distancia al lugar más cercano: ${Math.round(minDistance)}m (${nearestFence?.name || 'desconocido'})`
    )
    riskScore += minDistance < 200 ? 30 : minDistance < 1000 ? 50 : 80
  }

  // Penalización adicional si no hay foto biométrica
  if (!input.photoHash) {
    reasons.push('Sin verificación biométrica (foto)')
    riskScore += 10
  }

  riskScore = Math.min(100, riskScore)

  return {
    valid: Boolean(matchedFence) && riskScore < 50,
    matchedFence,
    distanceToNearestFence: matchedFence ? 0 : minDistance,
    nearestFence: nearestFence,
    reasons,
    riskScore,
  }
}

// =============================================
// STORE — persistente en Postgres (Fase 4)
//
// Antes era un Map<orgId, Geofence[]> en memoria del proceso Node, lo que
// rompía en Vercel multi-instance y se perdía en cada rolling deploy.
// Ahora vive en la tabla `geofences`. Cache simple TTL 30s para evitar
// query por cada fichado.
// =============================================

import { prisma } from '@/lib/prisma'

interface CacheEntry {
  fences: Geofence[]
  expiresAt: number
}
const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 30_000

function rowToFence(row: {
  id: string
  name: string
  type: 'CIRCLE' | 'POLYGON'
  centerLat: { toString(): string } | null
  centerLng: { toString(): string } | null
  radiusMeters: number | null
  vertices: unknown
  locationId: string | null
}): Geofence | null {
  if (row.type === 'CIRCLE') {
    if (row.centerLat == null || row.centerLng == null || row.radiusMeters == null) return null
    return {
      id: row.id,
      name: row.name,
      type: 'circle',
      center: { lat: Number(row.centerLat.toString()), lng: Number(row.centerLng.toString()) },
      radiusMeters: row.radiusMeters,
      ...(row.locationId ? { locationId: row.locationId } : {}),
    }
  }
  // POLYGON
  const verts = Array.isArray(row.vertices) ? row.vertices : []
  const vertices: GeoPoint[] = []
  for (const v of verts) {
    if (typeof v === 'object' && v !== null) {
      const obj = v as Record<string, unknown>
      const lat = Number(obj.lat)
      const lng = Number(obj.lng)
      if (Number.isFinite(lat) && Number.isFinite(lng)) vertices.push({ lat, lng })
    }
  }
  if (vertices.length < 3) return null
  return {
    id: row.id,
    name: row.name,
    type: 'polygon',
    vertices,
    ...(row.locationId ? { locationId: row.locationId } : {}),
  }
}

/** Lista las geofences activas de la org. Usa cache TTL 30s.
 *
 * Defensivo: si la tabla `geofences` no existe (migration de Fase 4.1 no
 * aplicada en prod), devuelve [] sin crashear. La org operará SIN validación
 * de geofence — comportamiento idéntico al de cuando no hay zonas configuradas. */
export async function listFences(orgId: string): Promise<Geofence[]> {
  const now = Date.now()
  const cached = cache.get(orgId)
  if (cached && cached.expiresAt > now) return cached.fences

  let rows: Array<{
    id: string
    name: string
    type: 'CIRCLE' | 'POLYGON'
    centerLat: { toString(): string } | null
    centerLng: { toString(): string } | null
    radiusMeters: number | null
    vertices: unknown
    locationId: string | null
  }> = []
  try {
    rows = await prisma.geofence.findMany({
      where: { orgId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })
  } catch (err) {
    // Migration no aplicada → operar sin geofences (comportamiento legacy)
    console.warn('[geofence] tabla geofences no disponible, operando sin validación de zona', err instanceof Error ? err.message : err)
    cache.set(orgId, { fences: [], expiresAt: now + CACHE_TTL_MS })
    return []
  }
  const fences = rows
    .map(r => rowToFence({
      id: r.id,
      name: r.name,
      type: r.type,
      centerLat: r.centerLat,
      centerLng: r.centerLng,
      radiusMeters: r.radiusMeters,
      vertices: r.vertices,
      locationId: r.locationId,
    }))
    .filter((f): f is Geofence => f !== null)

  cache.set(orgId, { fences, expiresAt: now + CACHE_TTL_MS })
  return fences
}

/** Invalida el cache de una org. Llamar tras crear/editar/eliminar. */
export function invalidateFencesCache(orgId: string): void {
  cache.delete(orgId)
}

/** Crea una geofence persistente. Devuelve la creada. */
export async function addFence(orgId: string, fence: Geofence): Promise<Geofence> {
  const created = await prisma.geofence.create({
    data: {
      orgId,
      name: fence.name,
      type: fence.type === 'circle' ? 'CIRCLE' : 'POLYGON',
      centerLat: fence.type === 'circle' ? fence.center.lat : null,
      centerLng: fence.type === 'circle' ? fence.center.lng : null,
      radiusMeters: fence.type === 'circle' ? fence.radiusMeters : null,
      vertices: fence.type === 'polygon' ? (fence.vertices as unknown as object) : undefined,
      locationId: fence.locationId ?? null,
    },
  })
  invalidateFencesCache(orgId)
  return { ...fence, id: created.id }
}

/** Elimina (hard delete) una geofence. */
export async function removeFence(orgId: string, id: string): Promise<boolean> {
  const result = await prisma.geofence.deleteMany({
    where: { id, orgId },
  })
  invalidateFencesCache(orgId)
  return result.count > 0
}

/** Actualiza una geofence existente (parcial). */
export async function updateFence(
  orgId: string,
  id: string,
  patch: Partial<Geofence> & { isActive?: boolean },
): Promise<boolean> {
  const data: Record<string, unknown> = {}
  if (patch.name) data.name = patch.name
  if (patch.locationId !== undefined) data.locationId = patch.locationId
  if ('isActive' in patch) data.isActive = patch.isActive
  if (patch.type === 'circle' && patch.center) {
    data.type = 'CIRCLE'
    data.centerLat = patch.center.lat
    data.centerLng = patch.center.lng
    if (patch.radiusMeters != null) data.radiusMeters = patch.radiusMeters
    data.vertices = null
  }
  if (patch.type === 'polygon' && patch.vertices) {
    data.type = 'POLYGON'
    data.vertices = patch.vertices as unknown as object
    data.centerLat = null
    data.centerLng = null
    data.radiusMeters = null
  }
  const result = await prisma.geofence.updateMany({
    where: { id, orgId },
    data,
  })
  invalidateFencesCache(orgId)
  return result.count > 0
}
