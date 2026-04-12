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
// STORE (in-memory provisional)
// =============================================

const fencesStore = new Map<string, Geofence[]>() // key: orgId

export function listFences(orgId: string): Geofence[] {
  return fencesStore.get(orgId) || []
}

export function addFence(orgId: string, fence: Geofence): Geofence {
  const list = fencesStore.get(orgId) || []
  list.push(fence)
  fencesStore.set(orgId, list)
  return fence
}

export function removeFence(orgId: string, id: string): boolean {
  const list = fencesStore.get(orgId) || []
  const next = list.filter(f => f.id !== id)
  fencesStore.set(orgId, next)
  return next.length !== list.length
}
