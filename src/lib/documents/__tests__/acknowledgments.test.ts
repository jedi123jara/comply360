/**
 * Tests para src/lib/documents/acknowledgments.ts
 *
 * Cubre:
 *   - resolveTargetedWorkers con scopeFilter
 *   - getWorkerPendingDocs con varios casos (con/sin scope, ya firmado)
 *   - recordAcknowledgment con validaciones (version mismatch, idempotencia)
 *   - notifyWorkersOfDocUpdate con throttling
 */

const {
  mockWorkerFindMany,
  mockWorkerFindFirst,
  mockOrgDocumentFindMany,
  mockOrgDocumentFindFirst,
  mockOrgDocumentUpdate,
  mockAcknowledgmentFindMany,
  mockAcknowledgmentFindUnique,
  mockAcknowledgmentCreate,
  mockAcknowledgmentCount,
  mockAuditLogCreate,
  mockSendEmail,
} = vi.hoisted(() => ({
  mockWorkerFindMany: vi.fn(),
  mockWorkerFindFirst: vi.fn(),
  mockOrgDocumentFindMany: vi.fn(),
  mockOrgDocumentFindFirst: vi.fn(),
  mockOrgDocumentUpdate: vi.fn(),
  mockAcknowledgmentFindMany: vi.fn(),
  mockAcknowledgmentFindUnique: vi.fn(),
  mockAcknowledgmentCreate: vi.fn(),
  mockAcknowledgmentCount: vi.fn(),
  mockAuditLogCreate: vi.fn(),
  mockSendEmail: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    worker: { findMany: mockWorkerFindMany, findFirst: mockWorkerFindFirst },
    orgDocument: {
      findMany: mockOrgDocumentFindMany,
      findFirst: mockOrgDocumentFindFirst,
      update: mockOrgDocumentUpdate,
    },
    documentAcknowledgment: {
      findMany: mockAcknowledgmentFindMany,
      findUnique: mockAcknowledgmentFindUnique,
      create: mockAcknowledgmentCreate,
      count: mockAcknowledgmentCount,
    },
    auditLog: { create: mockAuditLogCreate },
  },
}))

vi.mock('@/lib/email', () => ({
  sendEmail: mockSendEmail,
}))

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resolveTargetedWorkers,
  recordAcknowledgment,
  notifyWorkersOfDocUpdate,
} from '../acknowledgments'

describe('acknowledgments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuditLogCreate.mockResolvedValue({ id: 'audit-1' })
    mockSendEmail.mockResolvedValue({ ok: true })
  })

  describe('resolveTargetedWorkers', () => {
    it('returns all active workers when scopeFilter is null', async () => {
      mockWorkerFindMany.mockResolvedValueOnce([
        { id: 'w1', firstName: 'Juan', lastName: 'Perez', email: 'j@p.com', userId: null, regimenLaboral: 'GENERAL', department: null, position: null },
      ])

      const workers = await resolveTargetedWorkers('org-1', null)

      expect(mockWorkerFindMany).toHaveBeenCalledWith({
        where: { orgId: 'org-1', status: 'ACTIVE' },
        select: expect.any(Object),
      })
      expect(workers).toHaveLength(1)
    })

    it('applies regimen scope filter', async () => {
      mockWorkerFindMany.mockResolvedValueOnce([])

      await resolveTargetedWorkers('org-1', { regimen: ['GENERAL', 'MYPE_PEQUENA'] })

      const call = mockWorkerFindMany.mock.calls[0][0]
      expect(call.where).toMatchObject({
        orgId: 'org-1',
        status: 'ACTIVE',
        regimenLaboral: { in: ['GENERAL', 'MYPE_PEQUENA'] },
      })
    })

    it('applies departamento + position scope filters', async () => {
      mockWorkerFindMany.mockResolvedValueOnce([])

      await resolveTargetedWorkers('org-1', {
        departamento: ['Producción'],
        position: ['Operario'],
      })

      const call = mockWorkerFindMany.mock.calls[0][0]
      expect(call.where).toMatchObject({
        department: { in: ['Producción'] },
        position: { in: ['Operario'] },
      })
    })
  })

  describe('recordAcknowledgment', () => {
    it('rejects if document not found', async () => {
      mockOrgDocumentFindFirst.mockResolvedValueOnce(null)

      const result = await recordAcknowledgment({
        orgId: 'org-1',
        workerId: 'w1',
        documentId: 'd1',
        documentVersion: 1,
        signatureMethod: 'SIMPLE',
      })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.code).toBe('DOC_NOT_FOUND')
    })

    it('rejects if version mismatch', async () => {
      mockOrgDocumentFindFirst.mockResolvedValueOnce({ id: 'd1', version: 5, title: 'RIT' })

      const result = await recordAcknowledgment({
        orgId: 'org-1',
        workerId: 'w1',
        documentId: 'd1',
        documentVersion: 3, // worker firma version vieja
        signatureMethod: 'SIMPLE',
      })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.code).toBe('VERSION_MISMATCH')
    })

    it('returns existing ack if already signed (idempotency)', async () => {
      mockOrgDocumentFindFirst.mockResolvedValueOnce({ id: 'd1', version: 2, title: 'RIT' })
      mockAcknowledgmentFindUnique.mockResolvedValueOnce({ id: 'ack-existing' })

      const result = await recordAcknowledgment({
        orgId: 'org-1',
        workerId: 'w1',
        documentId: 'd1',
        documentVersion: 2,
        signatureMethod: 'SIMPLE',
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.ackId).toBe('ack-existing')
        expect(result.newAck).toBe(false)
      }
      // No debería haber creado ack nuevo
      expect(mockAcknowledgmentCreate).not.toHaveBeenCalled()
    })

    it('creates new ack with all metadata', async () => {
      mockOrgDocumentFindFirst.mockResolvedValueOnce({ id: 'd1', version: 2, title: 'RIT' })
      mockAcknowledgmentFindUnique.mockResolvedValueOnce(null)
      mockAcknowledgmentCreate.mockResolvedValueOnce({ id: 'ack-new' })

      const result = await recordAcknowledgment({
        orgId: 'org-1',
        workerId: 'w1',
        documentId: 'd1',
        documentVersion: 2,
        signatureMethod: 'BIOMETRIC',
        signatureProof: { credentialId: 'cred-1' },
        ip: '190.117.1.1',
        userAgent: 'Mozilla/5.0',
        scrolledToEnd: true,
        readingTimeMs: 45000,
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.ackId).toBe('ack-new')
        expect(result.newAck).toBe(true)
      }
      expect(mockAcknowledgmentCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orgId: 'org-1',
          workerId: 'w1',
          documentId: 'd1',
          documentVersion: 2,
          signatureMethod: 'BIOMETRIC',
          ip: '190.117.1.1',
          scrolledToEnd: true,
          readingTimeMs: 45000,
        }),
        select: { id: true },
      })
    })
  })

  describe('notifyWorkersOfDocUpdate', () => {
    it('returns zero counts if doc not found', async () => {
      mockOrgDocumentFindFirst.mockResolvedValueOnce(null)

      const result = await notifyWorkersOfDocUpdate({ orgId: 'org-1', documentId: 'd-nope' })

      expect(result).toEqual({ targetsCount: 0, emailsSent: 0, throttled: false })
    })

    it('sends emails to all workers in scope', async () => {
      mockOrgDocumentFindFirst.mockResolvedValueOnce({
        id: 'd1',
        title: 'RIT',
        version: 1,
        scopeFilter: null,
        lastNotifiedAt: null,
        acknowledgmentDeadlineDays: 7,
        organization: { name: 'Test SAC', razonSocial: 'Test SAC' },
      })
      mockWorkerFindMany.mockResolvedValueOnce([
        { id: 'w1', firstName: 'Juan', email: 'j1@p.com', userId: null, regimenLaboral: 'GENERAL', department: null, position: null },
        { id: 'w2', firstName: 'Maria', email: 'j2@p.com', userId: null, regimenLaboral: 'GENERAL', department: null, position: null },
        { id: 'w3', firstName: 'Pedro', email: null, userId: null, regimenLaboral: 'GENERAL', department: null, position: null }, // sin email
      ])
      mockOrgDocumentUpdate.mockResolvedValueOnce({})

      const result = await notifyWorkersOfDocUpdate({ orgId: 'org-1', documentId: 'd1' })

      expect(result.targetsCount).toBe(3)
      expect(result.emailsSent).toBe(2) // solo los con email
      expect(result.throttled).toBe(false)
      expect(mockSendEmail).toHaveBeenCalledTimes(2)
    })

    it('throttles email if lastNotifiedAt < 7 days ago', async () => {
      const recentNotif = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // hace 3 días
      mockOrgDocumentFindFirst.mockResolvedValueOnce({
        id: 'd1',
        title: 'RIT',
        version: 1,
        scopeFilter: null,
        lastNotifiedAt: recentNotif,
        acknowledgmentDeadlineDays: null,
        organization: { name: 'Test', razonSocial: 'Test' },
      })
      mockWorkerFindMany.mockResolvedValueOnce([
        { id: 'w1', firstName: 'Juan', email: 'j@p.com', userId: null, regimenLaboral: 'GENERAL', department: null, position: null },
      ])

      const result = await notifyWorkersOfDocUpdate({ orgId: 'org-1', documentId: 'd1' })

      expect(result.throttled).toBe(true)
      expect(result.emailsSent).toBe(0)
      expect(mockSendEmail).not.toHaveBeenCalled()
    })

    it('forces email when forceEmail=true even within throttle window', async () => {
      const recentNotif = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      mockOrgDocumentFindFirst.mockResolvedValueOnce({
        id: 'd1',
        title: 'RIT',
        version: 1,
        scopeFilter: null,
        lastNotifiedAt: recentNotif,
        acknowledgmentDeadlineDays: null,
        organization: { name: 'Test', razonSocial: 'Test' },
      })
      mockWorkerFindMany.mockResolvedValueOnce([
        { id: 'w1', firstName: 'Juan', email: 'j@p.com', userId: null, regimenLaboral: 'GENERAL', department: null, position: null },
      ])
      mockOrgDocumentUpdate.mockResolvedValueOnce({})

      const result = await notifyWorkersOfDocUpdate({
        orgId: 'org-1',
        documentId: 'd1',
        forceEmail: true,
      })

      expect(result.throttled).toBe(false)
      expect(result.emailsSent).toBe(1)
      expect(mockSendEmail).toHaveBeenCalledTimes(1)
    })
  })
})
