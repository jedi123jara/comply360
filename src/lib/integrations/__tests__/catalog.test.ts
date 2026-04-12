import { describe, it, expect } from 'vitest'
import {
  INTEGRATIONS,
  getIntegration,
  listByCategory,
  checkIntegrationStatus,
  listStatuses,
} from '../catalog'

describe('integrations catalog', () => {
  it('contiene integraciones peruanas clave', () => {
    const slugs = INTEGRATIONS.map(i => i.slug)
    expect(slugs).toContain('culqi')
    expect(slugs).toContain('niubiz')
    expect(slugs).toContain('yape')
    expect(slugs).toContain('bcp-planillas')
    expect(slugs).toContain('sunat-plame')
    expect(slugs).toContain('afpnet')
    expect(slugs).toContain('casilla-sunafil')
    expect(slugs).toContain('llama-pe')
    expect(slugs).toContain('whatsapp-business')
  })

  it('getIntegration devuelve undefined para slug inexistente', () => {
    expect(getIntegration('no-existe')).toBeUndefined()
  })

  it('getIntegration encuentra por slug', () => {
    const culqi = getIntegration('culqi')
    expect(culqi).toBeDefined()
    expect(culqi?.category).toBe('PAGOS')
    expect(culqi?.envVarsRequired).toContain('CULQI_PUBLIC_KEY')
  })

  it('listByCategory filtra correctamente', () => {
    const pagos = listByCategory('PAGOS')
    expect(pagos.length).toBeGreaterThan(3)
    expect(pagos.every(p => p.category === 'PAGOS')).toBe(true)
  })

  it('checkIntegrationStatus detecta envVars faltantes', () => {
    // Asegurarse de que no estén seteadas (lo normal en tests)
    delete process.env.CULQI_PUBLIC_KEY
    delete process.env.CULQI_SECRET_KEY
    const status = checkIntegrationStatus('culqi')
    expect(status.configured).toBe(false)
    expect(status.missingEnvVars).toContain('CULQI_PUBLIC_KEY')
    expect(status.missingEnvVars).toContain('CULQI_SECRET_KEY')
  })

  it('checkIntegrationStatus marca como ready si no requiere envVars', () => {
    const status = checkIntegrationStatus('sunat-plame')
    // sunat-plame no requiere credenciales
    expect(status.ready).toBe(true)
  })

  it('listStatuses devuelve estado de todas las integraciones', () => {
    const all = listStatuses()
    expect(all.length).toBe(INTEGRATIONS.length)
    for (const s of all) {
      expect(s.slug).toBeDefined()
      expect(typeof s.configured).toBe('boolean')
    }
  })

  it('cada integración declara capabilities y minTier válido', () => {
    for (const i of INTEGRATIONS) {
      expect(i.capabilities.length).toBeGreaterThan(0)
      expect(['STARTER', 'EMPRESA', 'PRO']).toContain(i.minTier)
      expect(i.logoEmoji.length).toBeGreaterThan(0)
    }
  })
})
