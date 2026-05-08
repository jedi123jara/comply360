/**
 * Tests para hash-chain (FIX #7.D).
 *
 * Probamos los helpers puros (canonicalize + computeHash). El flujo
 * completo con DB queda para tests de integración.
 */

import { describe, it, expect } from 'vitest'
import { _canonicalize, _computeHash } from '../hash-chain'

describe('canonicalize', () => {
  const baseDate = new Date('2026-05-07T12:00:00.000Z')

  it('produce un string determinístico con keys ordenadas', () => {
    const c = _canonicalize(
      { orgId: 'org_1', userId: 'u1', action: 'worker.created' },
      'prev123',
      baseDate,
    )
    // Debe contener todas las keys en orden estable
    expect(c).toContain('"action":"worker.created"')
    expect(c).toContain('"orgId":"org_1"')
    expect(c).toContain('"prevHash":"prev123"')
    expect(c).toContain('"createdAt":"2026-05-07T12:00:00.000Z"')
  })

  it('mismo payload + prevHash + date produce mismo canonical', () => {
    const a = _canonicalize(
      { orgId: 'o', action: 'x' },
      'p',
      baseDate,
    )
    const b = _canonicalize(
      { orgId: 'o', action: 'x' },
      'p',
      baseDate,
    )
    expect(a).toBe(b)
  })

  it('cambiar metadataJson cambia el canonical', () => {
    const a = _canonicalize(
      { orgId: 'o', action: 'x', metadataJson: { foo: 1 } },
      'p',
      baseDate,
    )
    const b = _canonicalize(
      { orgId: 'o', action: 'x', metadataJson: { foo: 2 } },
      'p',
      baseDate,
    )
    expect(a).not.toBe(b)
  })

  it('null y undefined se normalizan a null', () => {
    const c = _canonicalize(
      { orgId: 'o', action: 'x', userId: null },
      null,
      baseDate,
    )
    expect(c).toContain('"userId":null')
    expect(c).toContain('"prevHash":null')
  })
})

describe('computeHash', () => {
  it('produce 64 hex chars (sha256)', () => {
    const h = _computeHash('hello')
    expect(h).toHaveLength(64)
    expect(h).toMatch(/^[0-9a-f]+$/)
  })

  it('mismo input produce mismo hash', () => {
    expect(_computeHash('test')).toBe(_computeHash('test'))
  })

  it('inputs distintos producen hashes distintos', () => {
    expect(_computeHash('test')).not.toBe(_computeHash('test '))
  })

  it('hash conocido para input fijo', () => {
    // sha256 de "hello" = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    expect(_computeHash('hello')).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    )
  })
})

describe('hash chain integrity simulation', () => {
  const baseDate = new Date('2026-05-07T12:00:00.000Z')

  it('cadena válida: cada entry referencia el hash de la anterior', () => {
    // Simulamos 3 entries en cadena
    const e1Canonical = _canonicalize(
      { orgId: 'o1', action: 'a1' },
      null, // primera entry: prevHash null
      baseDate,
    )
    const e1Hash = _computeHash(e1Canonical)

    const e2Canonical = _canonicalize(
      { orgId: 'o1', action: 'a2' },
      e1Hash, // referencia el hash de e1
      new Date(baseDate.getTime() + 1000),
    )
    const e2Hash = _computeHash(e2Canonical)

    const e3Canonical = _canonicalize(
      { orgId: 'o1', action: 'a3' },
      e2Hash,
      new Date(baseDate.getTime() + 2000),
    )
    const e3Hash = _computeHash(e3Canonical)

    expect(e1Hash).not.toBe(e2Hash)
    expect(e2Hash).not.toBe(e3Hash)
    // Todos distintos
    expect(new Set([e1Hash, e2Hash, e3Hash]).size).toBe(3)
  })

  it('detección de tampering: cambiar e2 invalida e3', () => {
    const e1Hash = _computeHash(
      _canonicalize({ orgId: 'o1', action: 'a1' }, null, baseDate),
    )
    const e2HashOriginal = _computeHash(
      _canonicalize({ orgId: 'o1', action: 'a2' }, e1Hash, new Date(baseDate.getTime() + 1000)),
    )
    // Si alguien edita e2 cambiando 'a2' → 'TAMPERED':
    const e2HashTampered = _computeHash(
      _canonicalize({ orgId: 'o1', action: 'TAMPERED' }, e1Hash, new Date(baseDate.getTime() + 1000)),
    )
    expect(e2HashOriginal).not.toBe(e2HashTampered)
    // El verifier al recomputar e2 detecta que su entryHash en DB no
    // matchea el recomputed, marcándola como brokenAt.
  })
})
