import { describe, it, expect, beforeEach } from 'vitest'
import {
  DevSignatureProvider,
  hashBuffer,
  computeSignatureHash,
  type SignerInfo,
} from '../pki-provider'

describe('DevSignatureProvider', () => {
  let provider: DevSignatureProvider

  beforeEach(() => {
    provider = new DevSignatureProvider()
  })

  const signer: SignerInfo = {
    userId: 'user-1',
    dni: '12345678',
    fullName: 'Juan Pérez',
    email: 'juan@acme.pe',
    role: 'WORKER',
  }

  it('firma un documento y devuelve resultado con hash', async () => {
    const result = await provider.sign({
      documentId: 'contract-1',
      documentHash: hashBuffer(Buffer.from('contenido del contrato')),
      documentName: 'contrato-001.pdf',
      signer,
    })
    expect(result.signatureId).toMatch(/^sig_/)
    expect(result.documentId).toBe('contract-1')
    expect(result.signatureHash).toHaveLength(64) // SHA-256 hex
    expect(result.provider).toBe('dev')
    expect(result.signedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('verifica una firma válida', async () => {
    const signed = await provider.sign({
      documentId: 'c1',
      documentHash: hashBuffer(Buffer.from('x')),
      documentName: 'a.pdf',
      signer,
    })
    const v = await provider.verify(signed.signatureId)
    expect(v.valid).toBe(true)
    expect(v.signer.fullName).toBe('Juan Pérez')
  })

  it('rechaza firma inexistente', async () => {
    const v = await provider.verify('sig_nonexistent')
    expect(v.valid).toBe(false)
    expect(v.invalidReasons).toBeDefined()
  })

  it('detecta manipulación del signatureHash', async () => {
    const signed = await provider.sign({
      documentId: 'c1',
      documentHash: hashBuffer(Buffer.from('x')),
      documentName: 'a.pdf',
      signer,
    })
    // Manipular el almacén interno
    const stored = provider.getSignature(signed.signatureId)
    if (stored) stored.signatureHash = 'tampered0000000000000000000000000000000000000000000000000000000000'
    const v = await provider.verify(signed.signatureId)
    expect(v.valid).toBe(false)
    expect(v.invalidReasons?.[0]).toContain('Hash')
  })

  it('computeSignatureHash es determinístico', () => {
    const h1 = computeSignatureHash('abc', signer, '2026-04-08T10:00:00Z')
    const h2 = computeSignatureHash('abc', signer, '2026-04-08T10:00:00Z')
    expect(h1).toBe(h2)
  })

  it('declara que no tiene validez legal plena', () => {
    expect(provider.hasLegalValidity).toBe(false)
  })
})
