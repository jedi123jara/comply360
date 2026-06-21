import { describe, it, expect } from 'vitest'
import { mapPositionToComiteRole } from '../comite-sst-sync'

describe('mapPositionToComiteRole', () => {
  it('Presidente → PRESIDENTE', () => {
    expect(mapPositionToComiteRole('Presidente del Comité SST').cargo).toBe('PRESIDENTE')
  })
  it('Secretario → SECRETARIO', () => {
    expect(mapPositionToComiteRole('Secretario del Comité SST').cargo).toBe('SECRETARIO')
  })
  it('Representante del empleador → MIEMBRO + REPRESENTANTE_EMPLEADOR', () => {
    const r = mapPositionToComiteRole('Representante del empleador SST')
    expect(r.cargo).toBe('MIEMBRO')
    expect(r.origen).toBe('REPRESENTANTE_EMPLEADOR')
  })
  it('Representante de trabajadores → MIEMBRO + REPRESENTANTE_TRABAJADORES', () => {
    const r = mapPositionToComiteRole('Representante de trabajadores SST')
    expect(r.cargo).toBe('MIEMBRO')
    expect(r.origen).toBe('REPRESENTANTE_TRABAJADORES')
  })
  it('Presidente sin pista de origen → REPRESENTANTE_EMPLEADOR por defecto', () => {
    expect(mapPositionToComiteRole('Presidente del Comité SST').origen).toBe(
      'REPRESENTANTE_EMPLEADOR',
    )
  })
  it('Secretario sin pista de origen → REPRESENTANTE_TRABAJADORES por defecto', () => {
    expect(mapPositionToComiteRole('Secretario del Comité SST').origen).toBe(
      'REPRESENTANTE_TRABAJADORES',
    )
  })
  it('cargo desconocido → MIEMBRO', () => {
    expect(mapPositionToComiteRole('Apoyo operativo').cargo).toBe('MIEMBRO')
  })
})
