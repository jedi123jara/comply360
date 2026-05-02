import { describe, it, expect } from 'vitest'
import {
  GENESIS_HASH,
  canonicalJSON,
  computeContentSha256,
  computeVersionHash,
  sha256Hex,
  verifyChain,
  type VersionMetadata,
  type VersionForVerification,
} from '../hash-chain'

describe('GENESIS_HASH', () => {
  it('es 0x + 64 ceros', () => {
    expect(GENESIS_HASH).toBe('0x0000000000000000000000000000000000000000000000000000000000000000')
    expect(GENESIS_HASH.length).toBe(66) // 0x + 64
  })
})

describe('sha256Hex', () => {
  it('produce SHA-256 hex de 64 chars', () => {
    const out = sha256Hex('hola')
    expect(out).toMatch(/^[a-f0-9]{64}$/)
  })

  it('matchea vector conocido SHA-256("abc")', () => {
    // Vector NIST: SHA-256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('es determinista', () => {
    expect(sha256Hex('mismo input')).toBe(sha256Hex('mismo input'))
  })

  it('cambia con cualquier byte distinto', () => {
    expect(sha256Hex('A')).not.toBe(sha256Hex('B'))
  })
})

describe('canonicalJSON', () => {
  it('ordena claves alfabéticamente', () => {
    const a = canonicalJSON({ b: 1, a: 2, c: 3 })
    const b = canonicalJSON({ c: 3, a: 2, b: 1 })
    expect(a).toBe(b)
    expect(a).toBe('{"a":2,"b":1,"c":3}')
  })

  it('serializa null como null literal', () => {
    expect(canonicalJSON(null)).toBe('null')
  })

  it('omite undefined dentro de objetos', () => {
    expect(canonicalJSON({ a: 1, b: undefined, c: 2 })).toBe('{"a":1,"c":2}')
  })

  it('serializa arrays preservando orden', () => {
    expect(canonicalJSON([3, 1, 2])).toBe('[3,1,2]')
  })

  it('soporta objetos anidados con orden recursivo', () => {
    const a = canonicalJSON({ outer: { z: 1, a: 2 }, m: 'x' })
    expect(a).toBe('{"m":"x","outer":{"a":2,"z":1}}')
  })

  it('lanza con números no finitos', () => {
    expect(() => canonicalJSON(NaN)).toThrow()
    expect(() => canonicalJSON(Infinity)).toThrow()
  })
})

describe('computeContentSha256', () => {
  it('hashes string content', () => {
    const out = computeContentSha256('CONTRATO DE TRABAJO')
    expect(out).toMatch(/^[a-f0-9]{64}$/)
  })

  it('canonicaliza objetos antes de hashear', () => {
    const a = computeContentSha256({ b: 1, a: 2 })
    const b = computeContentSha256({ a: 2, b: 1 })
    expect(a).toBe(b)
  })

  it('null → hash de string vacío', () => {
    expect(computeContentSha256(null)).toBe(sha256Hex(''))
  })
})

describe('computeVersionHash', () => {
  const meta: VersionMetadata = {
    orgId: 'org_1',
    contractId: 'ctr_1',
    versionNumber: 1,
    createdAtIso: '2026-05-02T12:00:00.000Z',
    changedBy: 'usr_1',
    changeReason: 'Versión inicial',
  }

  it('es determinista', () => {
    const a = computeVersionHash({ contentSha256: 'aaa', prevHash: GENESIS_HASH, metadata: meta })
    const b = computeVersionHash({ contentSha256: 'aaa', prevHash: GENESIS_HASH, metadata: meta })
    expect(a).toBe(b)
  })

  it('cambia si cambia el contenido', () => {
    const a = computeVersionHash({ contentSha256: 'aaa', prevHash: GENESIS_HASH, metadata: meta })
    const b = computeVersionHash({ contentSha256: 'bbb', prevHash: GENESIS_HASH, metadata: meta })
    expect(a).not.toBe(b)
  })

  it('cambia si cambia el prevHash', () => {
    const a = computeVersionHash({ contentSha256: 'aaa', prevHash: GENESIS_HASH, metadata: meta })
    const b = computeVersionHash({ contentSha256: 'aaa', prevHash: 'beef', metadata: meta })
    expect(a).not.toBe(b)
  })

  it('cambia si cambia la metadata', () => {
    const a = computeVersionHash({ contentSha256: 'aaa', prevHash: GENESIS_HASH, metadata: meta })
    const b = computeVersionHash({
      contentSha256: 'aaa',
      prevHash: GENESIS_HASH,
      metadata: { ...meta, changeReason: 'Otro' },
    })
    expect(a).not.toBe(b)
  })
})

// ─── Helper para tests de cadena ────────────────────────────────────────────

function makeVersion(
  versionNumber: number,
  prevHash: string,
  content: string,
  changeReason = 'Edit',
): VersionForVerification {
  const contentSha256 = computeContentSha256(content)
  const metadata: VersionMetadata = {
    orgId: 'org_1',
    contractId: 'ctr_1',
    versionNumber,
    createdAtIso: `2026-05-02T${String(versionNumber).padStart(2, '0')}:00:00.000Z`,
    changedBy: 'usr_1',
    changeReason,
  }
  const versionHash = computeVersionHash({ contentSha256, prevHash, metadata })
  return { versionNumber, contentSha256, prevHash, versionHash, metadata }
}

describe('verifyChain', () => {
  it('cadena vacía = válida', () => {
    expect(verifyChain([])).toEqual({ valid: true, checkedVersions: 0 })
  })

  it('cadena de 1 versión válida (genesis correcto)', () => {
    const v1 = makeVersion(1, GENESIS_HASH, 'contenido v1')
    const r = verifyChain([v1])
    expect(r.valid).toBe(true)
  })

  it('cadena de 3 versiones válidas', () => {
    const v1 = makeVersion(1, GENESIS_HASH, 'v1')
    const v2 = makeVersion(2, v1.versionHash, 'v2')
    const v3 = makeVersion(3, v2.versionHash, 'v3')
    const r = verifyChain([v1, v2, v3])
    expect(r.valid).toBe(true)
  })

  it('detecta GENESIS_PREV_MISMATCH si v1.prevHash != GENESIS', () => {
    const v1 = makeVersion(1, '0xbeef'.padEnd(66, '0'), 'v1')
    const r = verifyChain([v1])
    expect(r.valid).toBe(false)
    if (!r.valid) {
      expect(r.reason).toBe('GENESIS_PREV_MISMATCH')
      expect(r.breakAt).toBe(1)
    }
  })

  it('detecta PREV_HASH_MISMATCH si v2.prevHash apunta mal', () => {
    const v1 = makeVersion(1, GENESIS_HASH, 'v1')
    const v2 = makeVersion(2, '0xfake'.padEnd(66, '0'), 'v2')
    const r = verifyChain([v1, v2])
    expect(r.valid).toBe(false)
    if (!r.valid) {
      expect(r.reason).toBe('PREV_HASH_MISMATCH')
      expect(r.breakAt).toBe(2)
    }
  })

  it('detecta VERSION_HASH_MISMATCH si alguien altera contentSha256 sin recomputar versionHash', () => {
    const v1 = makeVersion(1, GENESIS_HASH, 'v1')
    const tampered: VersionForVerification = {
      ...v1,
      contentSha256: 'tampered_hash',
      // versionHash queda viejo → no matchea con el contentSha256 alterado
    }
    const r = verifyChain([tampered])
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.reason).toBe('VERSION_HASH_MISMATCH')
  })

  it('detecta NUMBERING_GAP si falta una versión', () => {
    const v1 = makeVersion(1, GENESIS_HASH, 'v1')
    const v3 = makeVersion(3, v1.versionHash, 'v3') // saltea 2
    const r = verifyChain([v1, v3])
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.reason).toBe('NUMBERING_GAP')
  })

  it('detecta alteración de metadata (changeReason cambiado en BD pero versionHash sin recomputar)', () => {
    const v1 = makeVersion(1, GENESIS_HASH, 'v1', 'Razón original')
    const tampered: VersionForVerification = {
      ...v1,
      metadata: { ...v1.metadata, changeReason: 'Razón cambiada' },
    }
    const r = verifyChain([tampered])
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.reason).toBe('VERSION_HASH_MISMATCH')
  })
})
