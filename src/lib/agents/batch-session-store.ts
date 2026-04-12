/**
 * Store in-memory para sesiones de importación batch de legajos PDF.
 *
 * Cuando el usuario sube un PDF con múltiples contratos:
 *  1. El endpoint /api/workers/extract-batch-from-pdf crea una sesión,
 *     guarda el buffer original y el mapa de páginas por contrato.
 *  2. Devuelve un sessionId al frontend.
 *  3. Cuando el usuario aprueba cada trabajador, llama al endpoint de
 *     guardado con sessionId + workerIndex; ese endpoint recupera el
 *     buffer original de aquí y extrae solo las páginas del contrato del
 *     trabajador aprobado con pdf-lib.
 *
 * TTL: 60 min. El store se limpia automáticamente.
 */

import type { ExtractedWorkerData } from '../../app/api/workers/extract-from-contract/route'

export interface BatchContractEntry {
  index: number
  startPage: number
  endPage: number
  status: 'success' | 'error'
  data?: ExtractedWorkerData
  error?: string
  preview: string
}

export interface BatchSession {
  sessionId: string
  orgId: string
  userId: string
  fileName: string
  fileSize: number
  totalPages: number
  pdfBuffer: Buffer
  contracts: BatchContractEntry[]
  /** Textos completos de cada contrato para extracción bajo demanda */
  contractTexts?: string[]
  createdAt: number
  expiresAt: number
}

const TTL_MS = 60 * 60 * 1000 // 60 minutos

// Persistir el store en globalThis para sobrevivir hot-reload de Next.js en dev.
// Sin esto, cada vez que Next.js recompila un módulo, el Map se borra y las
// sesiones activas se pierden → error "Sesión no encontrada".
const globalKey = '__batchSessionStore__'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any
if (!g[globalKey]) {
  g[globalKey] = new Map<string, BatchSession>()
}
const store: Map<string, BatchSession> = g[globalKey]

function cleanup() {
  const now = Date.now()
  for (const [id, session] of store.entries()) {
    if (session.expiresAt < now) store.delete(id)
  }
}

export function saveBatchSession(
  session: Omit<BatchSession, 'createdAt' | 'expiresAt'>
): BatchSession {
  cleanup()
  const now = Date.now()
  const full: BatchSession = {
    ...session,
    createdAt: now,
    expiresAt: now + TTL_MS,
  }
  store.set(session.sessionId, full)
  return full
}

export function getBatchSession(sessionId: string): BatchSession | null {
  cleanup()
  const session = store.get(sessionId)
  if (!session) return null
  if (session.expiresAt < Date.now()) {
    store.delete(sessionId)
    return null
  }
  return session
}

export function deleteBatchSession(sessionId: string): boolean {
  return store.delete(sessionId)
}

export function updateContractEntry(
  sessionId: string,
  index: number,
  patch: Partial<BatchContractEntry>
): BatchContractEntry | null {
  const session = getBatchSession(sessionId)
  if (!session) return null
  const entry = session.contracts.find(c => c.index === index)
  if (!entry) return null
  Object.assign(entry, patch)
  return entry
}
