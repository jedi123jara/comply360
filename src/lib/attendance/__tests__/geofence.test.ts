import { describe, it, expect } from 'vitest'
import {
  distanceMeters,
  pointInPolygon,
  checkAttendance,
  type Geofence,
} from '../geofence'

describe('geofence', () => {
  it('distanceMeters entre Lima y Cusco es ~575km', () => {
    const lima = { lat: -12.0464, lng: -77.0428 }
    const cusco = { lat: -13.5319, lng: -71.9675 }
    const d = distanceMeters(lima, cusco)
    expect(d).toBeGreaterThan(550_000)
    expect(d).toBeLessThan(600_000)
  })

  it('distancia entre el mismo punto es 0', () => {
    const p = { lat: -12.0464, lng: -77.0428 }
    expect(distanceMeters(p, p)).toBeLessThan(0.01)
  })

  it('pointInPolygon detecta punto dentro', () => {
    const square = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 10 },
      { lat: 10, lng: 10 },
      { lat: 10, lng: 0 },
    ]
    expect(pointInPolygon({ lat: 5, lng: 5 }, square)).toBe(true)
    expect(pointInPolygon({ lat: 15, lng: 5 }, square)).toBe(false)
  })

  it('checkAttendance marca válido si está dentro del círculo', () => {
    const office: Geofence = {
      id: '1',
      name: 'Oficina Principal',
      type: 'circle',
      center: { lat: -12.0464, lng: -77.0428 },
      radiusMeters: 100,
    }
    // Punto a ~20m del centro
    const result = checkAttendance([office], {
      point: { lat: -12.04625, lng: -77.0428 },
      accuracyMeters: 10,
      photoHash: 'abc',
    })
    expect(result.valid).toBe(true)
    expect(result.matchedFence?.id).toBe('1')
  })

  it('checkAttendance rechaza si está fuera y calcula distancia', () => {
    const office: Geofence = {
      id: '1',
      name: 'Oficina',
      type: 'circle',
      center: { lat: -12.0464, lng: -77.0428 },
      radiusMeters: 100,
    }
    const result = checkAttendance([office], {
      point: { lat: -12.05, lng: -77.05 },
      accuracyMeters: 20,
    })
    expect(result.valid).toBe(false)
    expect(result.distanceToNearestFence).toBeGreaterThan(100)
    expect(result.reasons.length).toBeGreaterThan(0)
  })

  it('penaliza precisión baja del GPS', () => {
    const office: Geofence = {
      id: '1',
      name: 'Oficina',
      type: 'circle',
      center: { lat: -12.0464, lng: -77.0428 },
      radiusMeters: 100,
    }
    const result = checkAttendance([office], {
      point: { lat: -12.0464, lng: -77.0428 },
      accuracyMeters: 500,
    })
    expect(result.riskScore).toBeGreaterThan(0)
  })

  it('sin fences configuradas devuelve inválido con razón', () => {
    const result = checkAttendance([], { point: { lat: 0, lng: 0 } })
    expect(result.valid).toBe(false)
    expect(result.reasons[0]).toContain('zonas configuradas')
  })
})
