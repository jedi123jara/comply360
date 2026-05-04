/**
 * Trazabilidad criptográfica para registros SST.
 *
 * Cada registro auditable (IPERC, Accidente, EMO, Visita Field Audit) puede
 * generar un sello con:
 *   - hash SHA-256 del payload canónico
 *   - slug corto público (12 chars, derivado del hash + tipo + id)
 *   - URL pública de verificación
 *   - QR data URL para imprimir en documentos
 *
 * El payload canónico es JSON ordenado y estable (sortKeys) — la misma data
 * siempre produce el mismo hash, independiente del orden de propiedades.
 *
 * Sin TSA INDECOPI ni OpenTimestamps Bitcoin (decisión Sprint 1). Para
 * empresas que requieran sello acreditado, se ofrece como add-on enterprise.
 *
 * El audit trail interno (hash chain SHA-256 + Merkle tree diario) ya existe
 * en `AuditLog` y `MerkleAnchor` — este módulo expone un sello legible para
 * usuarios finales que verifica la integridad del registro contra ese
 * audit trail.
 */

import { createHash } from 'node:crypto'

export type SstResourceKind = 'IPERC' | 'ACCIDENTE' | 'EMO' | 'VISITA' | 'COMITE'

const KIND_PREFIX: Record<SstResourceKind, string> = {
  IPERC: 'I',
  ACCIDENTE: 'A',
  EMO: 'E',
  VISITA: 'V',
  COMITE: 'C',
}

/**
 * Serializa un objeto a JSON con keys ordenadas alfabéticamente, recursivo.
 * Garantiza que el hash sea estable independiente del orden de inserción.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      const sorted: Record<string, unknown> = {}
      for (const k of Object.keys(val as Record<string, unknown>).sort()) {
        sorted[k] = (val as Record<string, unknown>)[k]
      }
      return sorted
    }
    if (val instanceof Date) return val.toISOString()
    return val
  })
}

/**
 * Calcula SHA-256 hex (64 chars) del payload canónico.
 */
export function computeFingerprint(payload: unknown): string {
  const canonical = canonicalJson(payload)
  return createHash('sha256').update(canonical).digest('hex')
}

/**
 * Genera el slug público corto: prefijo de tipo + 11 chars del hash.
 * Total 12 chars, URL-safe, suficiente para resistir colisiones a escala
 * de millones de registros.
 *
 *   IPERC con hash 'a3b4...' → 'Ia3b4c5d6e7f8'
 */
export function buildPublicSlug(kind: SstResourceKind, fingerprint: string): string {
  return KIND_PREFIX[kind] + fingerprint.slice(0, 11)
}

/**
 * Parsea un slug y devuelve el tipo + prefijo del hash.
 */
export function parsePublicSlug(
  slug: string,
): { kind: SstResourceKind; hashPrefix: string } | null {
  if (!slug || slug.length !== 12) return null
  const head = slug.charAt(0)
  const found = (Object.keys(KIND_PREFIX) as SstResourceKind[]).find(
    (k) => KIND_PREFIX[k] === head,
  )
  if (!found) return null
  return { kind: found, hashPrefix: slug.slice(1) }
}

// ── Payloads canónicos por tipo de recurso ──────────────────────────────
//
// Cada función toma el registro completo desde Prisma y devuelve solo los
// campos auditables. Los campos derivados (createdAt, updatedAt) se incluyen
// porque la verificación pública debe poder recomputar el hash exacto a
// partir de lo que ve.

export interface IpercSealPayload {
  kind: 'IPERC'
  id: string
  orgId: string
  sedeId: string
  version: number
  estado: string
  fechaAprobacion: Date | null
  filas: Array<{
    proceso: string
    actividad: string
    tarea: string
    nivelRiesgo: number
    clasificacion: string
  }>
  filasCount: number
}

export function ipercPayload(
  record: {
    id: string
    orgId: string
    sedeId: string
    version: number
    estado: string
    fechaAprobacion: Date | null
  },
  filas: Array<{
    proceso: string
    actividad: string
    tarea: string
    nivelRiesgo: number
    clasificacion: string
  }>,
): IpercSealPayload {
  return {
    kind: 'IPERC',
    id: record.id,
    orgId: record.orgId,
    sedeId: record.sedeId,
    version: record.version,
    estado: record.estado,
    fechaAprobacion: record.fechaAprobacion,
    filas,
    filasCount: filas.length,
  }
}

export interface AccidenteSealPayload {
  kind: 'ACCIDENTE'
  id: string
  orgId: string
  sedeId: string
  workerId: string | null
  tipo: string
  fechaHora: Date
  plazoLegalHoras: number
  satEstado: string
  satNumeroManual: string | null
  satFechaEnvioManual: Date | null
}

export function accidentePayload(record: {
  id: string
  orgId: string
  sedeId: string
  workerId: string | null
  tipo: string
  fechaHora: Date
  plazoLegalHoras: number
  satEstado: string
  satNumeroManual: string | null
  satFechaEnvioManual: Date | null
}): AccidenteSealPayload {
  return {
    kind: 'ACCIDENTE',
    id: record.id,
    orgId: record.orgId,
    sedeId: record.sedeId,
    workerId: record.workerId,
    tipo: record.tipo,
    fechaHora: record.fechaHora,
    plazoLegalHoras: record.plazoLegalHoras,
    satEstado: record.satEstado,
    satNumeroManual: record.satNumeroManual,
    satFechaEnvioManual: record.satFechaEnvioManual,
  }
}

export interface EmoSealPayload {
  kind: 'EMO'
  id: string
  orgId: string
  workerId: string
  tipoExamen: string
  fechaExamen: Date
  centroMedicoNombre: string
  aptitud: string
  consentimientoLey29733: boolean
  /** Solo presencia de restricciones, no su contenido. */
  tieneRestricciones: boolean
}

export function emoPayload(record: {
  id: string
  orgId: string
  workerId: string
  tipoExamen: string
  fechaExamen: Date
  centroMedicoNombre: string
  aptitud: string
  consentimientoLey29733: boolean
  restriccionesCifrado: Uint8Array | null
}): EmoSealPayload {
  return {
    kind: 'EMO',
    id: record.id,
    orgId: record.orgId,
    workerId: record.workerId,
    tipoExamen: record.tipoExamen,
    fechaExamen: record.fechaExamen,
    centroMedicoNombre: record.centroMedicoNombre,
    aptitud: record.aptitud,
    consentimientoLey29733: record.consentimientoLey29733,
    tieneRestricciones: !!record.restriccionesCifrado,
  }
}

export interface VisitaSealPayload {
  kind: 'VISITA'
  id: string
  orgId: string
  sedeId: string
  colaboradorId: string
  fechaProgramada: Date
  fechaCierreOficina: Date | null
  estado: string
  hallazgos: Array<{
    tipo: string
    severidad: string
    descripcion: string
  }>
}

export function visitaPayload(
  record: {
    id: string
    orgId: string
    sedeId: string
    colaboradorId: string
    fechaProgramada: Date
    fechaCierreOficina: Date | null
    estado: string
  },
  hallazgos: Array<{ tipo: string; severidad: string; descripcion: string }>,
): VisitaSealPayload {
  return {
    kind: 'VISITA',
    id: record.id,
    orgId: record.orgId,
    sedeId: record.sedeId,
    colaboradorId: record.colaboradorId,
    fechaProgramada: record.fechaProgramada,
    fechaCierreOficina: record.fechaCierreOficina,
    estado: record.estado,
    hallazgos,
  }
}

// ── Helper de URL pública ────────────────────────────────────────────────

export function buildPublicVerifyUrl(slug: string, baseUrl?: string): string {
  const base =
    baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'https://comply360.pe'
  return `${base.replace(/\/$/, '')}/verify/sst/${slug}`
}
