/**
 * Database Backup Service
 *
 * Uses Supabase's built-in PITR (Point in Time Recovery) for production.
 * This module provides:
 * 1. Logical export of critical data (JSON format)
 * 2. Backup verification
 * 3. Backup scheduling info
 *
 * For Supabase PostgreSQL:
 * - Automatic daily backups (included in Pro plan)
 * - PITR with 7-day retention (Pro plan)
 * - Manual backups via this service for critical data export
 */

import { prisma } from '@/lib/prisma'

export interface BackupManifest {
  id: string
  createdAt: string
  orgId: string
  tables: {
    name: string
    count: number
  }[]
  sizeBytes: number
  checksum: string
}

export interface BackupData {
  manifest: BackupManifest
  data: {
    workers: unknown[]
    contracts: unknown[]
    alerts: unknown[]
    diagnostics: unknown[]
    documents: unknown[]
    auditLogs: unknown[]
  }
}

// ── Generate Backup ────────────────────────────────
export async function generateOrgBackup(orgId: string): Promise<BackupData> {
  const timestamp = new Date().toISOString()
  const backupId = `backup_${orgId}_${Date.now()}`

  // Export all org data in parallel
  const [workers, contracts, alerts, diagnostics, documents, auditLogs] = await Promise.all([
    prisma.worker.findMany({
      where: { orgId },
      include: { documents: true, vacations: true },
    }),
    prisma.contract.findMany({ where: { orgId } }),
    prisma.orgAlert.findMany({ where: { orgId } }),
    prisma.complianceDiagnostic.findMany({ where: { orgId } }),
    prisma.workerDocument.findMany({
      where: { worker: { orgId } },
    }),
    prisma.auditLog.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: 10000, // Last 10K audit entries
    }),
  ])

  const data = { workers, contracts, alerts, diagnostics, documents, auditLogs }
  const jsonStr = JSON.stringify(data)
  const sizeBytes = new TextEncoder().encode(jsonStr).length

  // Simple checksum
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(jsonStr))
  const checksum = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const manifest: BackupManifest = {
    id: backupId,
    createdAt: timestamp,
    orgId,
    tables: [
      { name: 'workers', count: workers.length },
      { name: 'contracts', count: contracts.length },
      { name: 'alerts', count: alerts.length },
      { name: 'diagnostics', count: diagnostics.length },
      { name: 'documents', count: documents.length },
      { name: 'auditLogs', count: auditLogs.length },
    ],
    sizeBytes,
    checksum,
  }

  return { manifest, data }
}

// ── Backup Info ────────────────────────────────────
export function getBackupConfig() {
  return {
    provider: 'Supabase PostgreSQL',
    automatic: {
      enabled: true,
      frequency: 'Diario',
      retention: '7 dias (PITR con plan Pro)',
      type: 'Point-in-Time Recovery',
    },
    manual: {
      enabled: true,
      format: 'JSON export',
      includes: ['Trabajadores', 'Contratos', 'Alertas', 'Diagnosticos', 'Documentos', 'Audit Logs'],
    },
    recommendations: [
      'Habilitar PITR en Supabase Dashboard para recuperacion granular',
      'Exportar backup manual mensual y almacenar en ubicacion separada',
      'Verificar integridad de backups trimestralmente',
      'Mantener al menos 2 copias en diferentes regiones',
    ],
  }
}

// ── Verify Backup Integrity ────────────────────────
export async function verifyBackupIntegrity(backup: BackupData): Promise<{
  valid: boolean
  details: string
}> {
  const jsonStr = JSON.stringify(backup.data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(jsonStr))
  const checksum = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const valid = checksum === backup.manifest.checksum

  return {
    valid,
    details: valid
      ? `Backup ${backup.manifest.id} verificado correctamente. ${backup.manifest.tables.reduce((sum, t) => sum + t.count, 0)} registros totales.`
      : `Error de integridad en backup ${backup.manifest.id}. Checksum no coincide.`,
  }
}
