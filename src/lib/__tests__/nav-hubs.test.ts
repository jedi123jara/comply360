import { describe, it, expect } from 'vitest'
import { NAV_HUBS, NAV_ITEMS, resolveActiveHub } from '@/lib/constants'

describe('NAV_HUBS / estructura', () => {
  it('tiene exactamente 7 hubs', () => {
    expect(NAV_HUBS).toHaveLength(7)
  })

  it('los 7 hubs tienen llave, label, icon, rootHref y description', () => {
    for (const hub of NAV_HUBS) {
      expect(hub.key).toBeTruthy()
      expect(hub.label).toBeTruthy()
      expect(hub.icon).toBeTruthy()
      expect(hub.rootHref).toMatch(/^\//)
      expect(hub.description.length).toBeGreaterThan(5)
      expect(hub.items.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('las llaves de hubs son unicas', () => {
    const keys = NAV_HUBS.map((h) => h.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('contiene los 7 hubs esperados de la revolucion', () => {
    const keys = NAV_HUBS.map((h) => h.key)
    expect(keys).toEqual([
      'cockpit',
      'equipo',
      'riesgo',
      'sst',
      'contratos-docs',
      'ia-laboral',
      'config',
    ])
  })
})

describe('resolveActiveHub', () => {
  it('/dashboard mapea a Cockpit', () => {
    expect(resolveActiveHub('/dashboard').key).toBe('cockpit')
  })

  it('/dashboard/trabajadores mapea a Equipo', () => {
    expect(resolveActiveHub('/dashboard/trabajadores').key).toBe('equipo')
    expect(resolveActiveHub('/dashboard/trabajadores/abc123').key).toBe('equipo')
  })

  it('/dashboard/alertas mapea a Riesgo', () => {
    expect(resolveActiveHub('/dashboard/alertas').key).toBe('riesgo')
    expect(resolveActiveHub('/dashboard/diagnostico').key).toBe('riesgo')
    expect(resolveActiveHub('/dashboard/simulacro').key).toBe('riesgo')
  })

  it('/dashboard/calendario mapea a Cockpit (sub-item del Panel)', () => {
    expect(resolveActiveHub('/dashboard/calendario').key).toBe('cockpit')
  })

  it('/dashboard/sst y subrutas mapean al hub SST', () => {
    expect(resolveActiveHub('/dashboard/sst').key).toBe('sst')
    expect(resolveActiveHub('/dashboard/sst/sedes').key).toBe('sst')
    expect(resolveActiveHub('/dashboard/sst/comite/elecciones').key).toBe('sst')
    expect(resolveActiveHub('/dashboard/sst/iperc').key).toBe('sst')
    expect(resolveActiveHub('/dashboard/sst/arco').key).toBe('sst')
  })

  it('/dashboard/contratos mapea a Contratos & Docs', () => {
    expect(resolveActiveHub('/dashboard/contratos').key).toBe('contratos-docs')
    expect(resolveActiveHub('/dashboard/documentos').key).toBe('contratos-docs')
    expect(resolveActiveHub('/dashboard/sunafil-ready').key).toBe('contratos-docs')
    expect(resolveActiveHub('/dashboard/generadores').key).toBe('contratos-docs')
  })

  it('/dashboard/ia-laboral y calculadoras mapean a IA Laboral', () => {
    expect(resolveActiveHub('/dashboard/ia-laboral').key).toBe('ia-laboral')
    expect(resolveActiveHub('/dashboard/calculadoras').key).toBe('ia-laboral')
    expect(resolveActiveHub('/dashboard/calculadoras/cts').key).toBe('ia-laboral')
  })

  it('/dashboard/configuracion mapea a Config', () => {
    expect(resolveActiveHub('/dashboard/configuracion').key).toBe('config')
    expect(resolveActiveHub('/dashboard/reportes').key).toBe('config')
    expect(resolveActiveHub('/dashboard/planes').key).toBe('config')
    expect(resolveActiveHub('/dashboard/integraciones').key).toBe('config')
  })

  it('ruta fuera de conocidos retorna Cockpit como fallback', () => {
    expect(resolveActiveHub('/foo/bar').key).toBe('cockpit')
  })
})

describe('NAV_ITEMS / backward compat', () => {
  it('NAV_ITEMS existe (flat)', () => {
    expect(Array.isArray(NAV_ITEMS)).toBe(true)
    expect(NAV_ITEMS.length).toBeGreaterThan(10)
  })

  it('cada item tiene label, href, icon', () => {
    for (const item of NAV_ITEMS) {
      expect(item.label).toBeTruthy()
      expect(item.href).toBeTruthy()
      expect(item.icon).toBeTruthy()
    }
  })
})
