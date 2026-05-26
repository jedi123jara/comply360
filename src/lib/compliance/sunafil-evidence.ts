import type { SunafilDocSpec } from '@/data/legal/sunafil-ready-catalog'

export type DocStatus = 'COMPLETO' | 'PARCIAL' | 'FALTANTE' | 'VENCIDO' | 'NO_APLICA'

export interface WorkerCoverageBucket {
  present: Set<string>
  expired: Set<string>
}

export interface OrgDocEvidence {
  validUntil: Date | null
  hasFile: boolean
  updatedAt?: Date | null
}

export interface SstRecordEvidence {
  type: string
  status: string
  title: string
  createdAt: Date
  completedAt: Date | null
  dueDate: Date | null
}

export interface SunafilEvidenceSnapshot {
  now: Date
  totalWorkers: number
  workerDocsByType: Map<string, WorkerCoverageBucket>
  orgDocByType: Map<string, OrgDocEvidence>
  orgDocSearchText: string[]
  sstRecords: SstRecordEvidence[]
  sedes: Array<{ id: string; activa: boolean }>
  ipercBases: Array<{ sedeId: string; estado: string; fechaAprobacion: Date | null }>
  comites: Array<{ estado: string; mandatoFin: Date }>
  emos: Array<{ workerId: string; proximoExamenAntes: Date | null }>
  workerEpps: Array<{ workerId: string; fechaVencimiento: Date | null }>
  capacitaciones: Array<{ workerId: string; tipo: string; fechaCapacitacion: Date }>
  accidentes: Array<{ id: string; fechaHora: Date }>
}

export interface SunafilResolvedStatus {
  status: DocStatus
  coverage: { present: number; total: number }
  lastExpiresAt: Date | null
  evidenceSources: string[]
}

interface ResolvePayload {
  workerCoverage?: { present: number; total: number; expired: number }
  orgFound?: boolean
  orgExpired?: boolean
  orgCoverage?: { present: number; total: number; expired: number }
  lastExpiresAt?: Date | null
  evidenceSources?: string[]
}

const MS_DAY = 24 * 60 * 60 * 1000

function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function isFresh(date: Date | null | undefined, now: Date, months: number): boolean {
  if (!date) return false
  return addMonths(date, months) >= now
}

function isOlderThanDays(date: Date | null | undefined, now: Date, days: number): boolean {
  if (!date) return false
  return now.getTime() - date.getTime() > days * MS_DAY
}

function completedAt(record: SstRecordEvidence): Date {
  return record.completedAt ?? record.createdAt
}

function hasCompletedRecord(
  snapshot: SunafilEvidenceSnapshot,
  type: string,
  monthsFresh?: number,
): boolean {
  return snapshot.sstRecords.some((record) => {
    if (record.type !== type || record.status !== 'COMPLETED') return false
    if (!monthsFresh) return true
    return isFresh(completedAt(record), snapshot.now, monthsFresh)
  })
}

function countCompletedRecords(
  snapshot: SunafilEvidenceSnapshot,
  type: string,
  monthsFresh?: number,
): number {
  return snapshot.sstRecords.filter((record) => {
    if (record.type !== type || record.status !== 'COMPLETED') return false
    if (!monthsFresh) return true
    return isFresh(completedAt(record), snapshot.now, monthsFresh)
  }).length
}

function orgDoc(snapshot: SunafilEvidenceSnapshot, ...types: string[]) {
  for (const type of types) {
    const found = snapshot.orgDocByType.get(type)
    if (found?.hasFile) return found
  }
  return null
}

function orgTextIncludes(snapshot: SunafilEvidenceSnapshot, ...tokens: string[]): boolean {
  return snapshot.orgDocSearchText.some((text) => tokens.every((token) => text.includes(token)))
}

function genericOrgPayload(snapshot: SunafilEvidenceSnapshot, doc: SunafilDocSpec): ResolvePayload {
  if (!doc.orgDocType) return {}
  const evidence = orgDoc(snapshot, doc.orgDocType)
  return {
    orgFound: Boolean(evidence),
    orgExpired: Boolean(evidence?.validUntil && evidence.validUntil < snapshot.now),
    lastExpiresAt: evidence?.validUntil ?? null,
    evidenceSources: evidence ? [`OrgDocument.${doc.orgDocType}`] : [],
  }
}

function bucketToCoverage(
  snapshot: SunafilEvidenceSnapshot,
  bucket?: WorkerCoverageBucket,
): { present: number; total: number; expired: number } {
  return {
    present: bucket?.present.size ?? 0,
    expired: bucket?.expired.size ?? 0,
    total: snapshot.totalWorkers,
  }
}

function mergeWorkerCoverage(
  snapshot: SunafilEvidenceSnapshot,
  docType: string | undefined,
  extraPresent: Iterable<string> = [],
  extraExpired: Iterable<string> = [],
) {
  const present = new Set<string>()
  const expired = new Set<string>()
  if (docType) {
    const existing = snapshot.workerDocsByType.get(docType)
    existing?.present.forEach((id) => present.add(id))
    existing?.expired.forEach((id) => expired.add(id))
  }
  for (const id of extraPresent) present.add(id)
  for (const id of extraExpired) {
    present.add(id)
    expired.add(id)
  }
  return bucketToCoverage(snapshot, { present, expired })
}

function deriveStatus(doc: SunafilDocSpec, payload: ResolvePayload): SunafilResolvedStatus {
  const evidenceSources = payload.evidenceSources ?? []
  const lastExpiresAt = payload.lastExpiresAt ?? null

  if (doc.scope === 'worker') {
    const c = payload.workerCoverage ?? { present: 0, total: 0, expired: 0 }
    if (c.total === 0) return { status: 'NO_APLICA', coverage: { present: 0, total: 0 }, lastExpiresAt, evidenceSources }
    if (c.expired > 0) return { status: 'VENCIDO', coverage: { present: c.present, total: c.total }, lastExpiresAt, evidenceSources }
    if (c.present === c.total) return { status: 'COMPLETO', coverage: { present: c.present, total: c.total }, lastExpiresAt, evidenceSources }
    if (c.present === 0) return { status: 'FALTANTE', coverage: { present: 0, total: c.total }, lastExpiresAt, evidenceSources }
    return { status: 'PARCIAL', coverage: { present: c.present, total: c.total }, lastExpiresAt, evidenceSources }
  }

  if (doc.scope === 'hybrid') {
    const c = payload.workerCoverage ?? { present: 0, total: 0, expired: 0 }
    const orgOk = Boolean(payload.orgFound) && !payload.orgExpired
    if (c.total === 0) return { status: 'NO_APLICA', coverage: { present: 0, total: 0 }, lastExpiresAt, evidenceSources }
    if (payload.orgExpired || c.expired > 0) return { status: 'VENCIDO', coverage: { present: c.present, total: c.total }, lastExpiresAt, evidenceSources }
    if (orgOk && c.present === c.total) return { status: 'COMPLETO', coverage: { present: c.present, total: c.total }, lastExpiresAt, evidenceSources }
    if (orgOk || c.present > 0) return { status: 'PARCIAL', coverage: { present: c.present, total: c.total }, lastExpiresAt, evidenceSources }
    return { status: 'FALTANTE', coverage: { present: 0, total: c.total }, lastExpiresAt, evidenceSources }
  }

  const orgCoverage = payload.orgCoverage
  if (orgCoverage) {
    if (orgCoverage.total === 0) return { status: 'NO_APLICA', coverage: { present: 0, total: 0 }, lastExpiresAt, evidenceSources }
    if (orgCoverage.expired > 0) return { status: 'VENCIDO', coverage: { present: orgCoverage.present, total: orgCoverage.total }, lastExpiresAt, evidenceSources }
    if (orgCoverage.present === orgCoverage.total) return { status: 'COMPLETO', coverage: { present: orgCoverage.present, total: orgCoverage.total }, lastExpiresAt, evidenceSources }
    if (orgCoverage.present > 0) return { status: 'PARCIAL', coverage: { present: orgCoverage.present, total: orgCoverage.total }, lastExpiresAt, evidenceSources }
    return { status: 'FALTANTE', coverage: { present: 0, total: orgCoverage.total }, lastExpiresAt, evidenceSources }
  }

  if (payload.orgExpired) return { status: 'VENCIDO', coverage: { present: 0, total: 1 }, lastExpiresAt, evidenceSources }
  if (payload.orgFound) return { status: 'COMPLETO', coverage: { present: 1, total: 1 }, lastExpiresAt, evidenceSources }
  return { status: 'FALTANTE', coverage: { present: 0, total: 1 }, lastExpiresAt, evidenceSources }
}

function ipercPayload(snapshot: SunafilEvidenceSnapshot): ResolvePayload {
  const activeSedes = snapshot.sedes.filter((sede) => sede.activa)
  const targetSedes = activeSedes.length > 0 ? activeSedes : []
  const freshVigentes = snapshot.ipercBases.filter(
    (iperc) =>
      iperc.estado === 'VIGENTE' &&
      iperc.fechaAprobacion &&
      !isOlderThanDays(iperc.fechaAprobacion, snapshot.now, 365),
  )
  const expired = snapshot.ipercBases.filter(
    (iperc) =>
      iperc.estado === 'VENCIDO' ||
      (iperc.estado === 'VIGENTE' && isOlderThanDays(iperc.fechaAprobacion, snapshot.now, 365)),
  )
  if (targetSedes.length > 0) {
    const coveredSedes = new Set(freshVigentes.map((iperc) => iperc.sedeId))
    return {
      orgCoverage: {
        present: targetSedes.filter((sede) => coveredSedes.has(sede.id)).length,
        total: targetSedes.length,
        expired: expired.length,
      },
      evidenceSources: ['IPERCBase'],
    }
  }

  const legacy = hasCompletedRecord(snapshot, 'IPERC', 12)
  return {
    orgFound: freshVigentes.length > 0 || legacy,
    orgExpired: expired.length > 0,
    evidenceSources: freshVigentes.length > 0 ? ['IPERCBase'] : legacy ? ['SstRecord.IPERC'] : [],
  }
}

function mapaRiesgosPayload(snapshot: SunafilEvidenceSnapshot): ResolvePayload {
  const doc = orgDoc(snapshot, 'MAPA_RIESGOS_ACTUALIZADO')
  if (doc) {
    return {
      orgFound: true,
      orgExpired: Boolean(doc.validUntil && doc.validUntil < snapshot.now),
      lastExpiresAt: doc.validUntil,
      evidenceSources: ['OrgDocument.MAPA_RIESGOS_ACTUALIZADO'],
    }
  }

  const activeSedes = snapshot.sedes.filter((sede) => sede.activa)
  const records = snapshot.sstRecords.filter((record) => record.type === 'MAPA_RIESGOS' && record.status === 'COMPLETED')
  if (activeSedes.length > 0) {
    const freshRecords = records.filter((record) => isFresh(completedAt(record), snapshot.now, 12))
    const coveredTitles = new Set(freshRecords.map((record) => record.title))
    const sedesCovered = activeSedes.filter((sede) => coveredTitles.has(sede.id)).length
    return {
      orgCoverage: {
        present: Math.min(activeSedes.length, sedesCovered || freshRecords.length),
        total: activeSedes.length,
        expired: records.length - freshRecords.length,
      },
      evidenceSources: records.length > 0 ? ['SstRecord.MAPA_RIESGOS'] : [],
    }
  }

  return {
    orgFound: records.some((record) => isFresh(completedAt(record), snapshot.now, 12)),
    orgExpired: records.some((record) => !isFresh(completedAt(record), snapshot.now, 12)),
    evidenceSources: records.length > 0 ? ['SstRecord.MAPA_RIESGOS'] : [],
  }
}

export function resolveSunafilDocStatus(
  doc: SunafilDocSpec,
  snapshot: SunafilEvidenceSnapshot,
): SunafilResolvedStatus {
  switch (doc.id) {
    case 'politica-sst': {
      const found = orgDoc(snapshot, 'POLITICA_SST', 'REGLAMENTO_SST')
      const legacy = hasCompletedRecord(snapshot, 'POLITICA_SST')
      return deriveStatus(doc, {
        orgFound: Boolean(found) || legacy,
        orgExpired: Boolean(found?.validUntil && found.validUntil < snapshot.now),
        lastExpiresAt: found?.validUntil ?? null,
        evidenceSources: found ? ['OrgDocument.POLITICA_SST/REGLAMENTO_SST'] : legacy ? ['SstRecord.POLITICA_SST'] : [],
      })
    }
    case 'iperc':
      return deriveStatus(doc, ipercPayload(snapshot))
    case 'plan-anual-sst': {
      const found = orgDoc(snapshot, 'PLAN_SST')
      const legacy = hasCompletedRecord(snapshot, 'PLAN_ANUAL', 12)
      return deriveStatus(doc, {
        orgFound: Boolean(found) || legacy,
        orgExpired: Boolean(found?.validUntil && found.validUntil < snapshot.now),
        lastExpiresAt: found?.validUntil ?? null,
        evidenceSources: found ? ['OrgDocument.PLAN_SST'] : legacy ? ['SstRecord.PLAN_ANUAL'] : [],
      })
    }
    case 'comite-sst': {
      const vigente = snapshot.comites.some((comite) => comite.estado === 'VIGENTE' && comite.mandatoFin >= snapshot.now)
      const legacy = hasCompletedRecord(snapshot, 'ACTA_COMITE')
      return deriveStatus(doc, {
        orgFound: vigente || legacy,
        orgExpired: snapshot.comites.some((comite) => comite.estado === 'VIGENTE' && comite.mandatoFin < snapshot.now),
        evidenceSources: vigente ? ['ComiteSST'] : legacy ? ['SstRecord.ACTA_COMITE'] : [],
      })
    }
    case 'capacitacion-sst': {
      const year = snapshot.now.getFullYear()
      const annualTrainings = snapshot.capacitaciones.filter(
        (cap) => cap.fechaCapacitacion.getFullYear() === year && cap.tipo !== 'HOSTIGAMIENTO',
      )
      const trainedWorkers = annualTrainings.map((cap) => cap.workerId)
      const orgSessions = new Set(annualTrainings.map((cap) => cap.fechaCapacitacion.toISOString().slice(0, 10))).size
      const legacyCount = countCompletedRecords(snapshot, 'CAPACITACION', 12)
      return deriveStatus(doc, {
        orgFound: orgSessions >= 4 || legacyCount >= 4,
        workerCoverage: mergeWorkerCoverage(snapshot, doc.workerDocType, trainedWorkers),
        evidenceSources: [
          ...(annualTrainings.length > 0 ? ['WorkerCapacitacionSST'] : []),
          ...(legacyCount > 0 ? ['SstRecord.CAPACITACION'] : []),
        ],
      })
    }
    case 'examen-medico-ingreso': {
      const present = snapshot.emos.map((emo) => emo.workerId)
      const expired = snapshot.emos.filter((emo) => emo.proximoExamenAntes && emo.proximoExamenAntes < snapshot.now).map((emo) => emo.workerId)
      return deriveStatus(doc, {
        workerCoverage: mergeWorkerCoverage(snapshot, doc.workerDocType, present, expired),
        evidenceSources: present.length > 0 ? ['EMO'] : [],
      })
    }
    case 'entrega-epp': {
      const present = snapshot.workerEpps.map((epp) => epp.workerId)
      const expired = snapshot.workerEpps.filter((epp) => epp.fechaVencimiento && epp.fechaVencimiento < snapshot.now).map((epp) => epp.workerId)
      return deriveStatus(doc, {
        workerCoverage: mergeWorkerCoverage(snapshot, doc.workerDocType, present, expired),
        evidenceSources: present.length > 0 ? ['WorkerEPP'] : [],
      })
    }
    case 'induccion-sst': {
      const inducciones = snapshot.capacitaciones.filter((cap) => cap.tipo === 'INDUCCION')
      return deriveStatus(doc, {
        workerCoverage: mergeWorkerCoverage(snapshot, doc.workerDocType, inducciones.map((cap) => cap.workerId)),
        evidenceSources: inducciones.length > 0 ? ['WorkerCapacitacionSST.INDUCCION'] : [],
      })
    }
    case 'mapa-riesgos':
      return deriveStatus(doc, mapaRiesgosPayload(snapshot))
    case 'registro-accidentes': {
      const legacy = hasCompletedRecord(snapshot, 'ACCIDENTE') || hasCompletedRecord(snapshot, 'INCIDENTE')
      return deriveStatus(doc, {
        orgFound: snapshot.accidentes.length > 0 || legacy,
        evidenceSources: [
          ...(snapshot.accidentes.length > 0 ? ['Accidente'] : []),
          ...(legacy ? ['SstRecord.ACCIDENTE/INCIDENTE'] : []),
        ],
      })
    }
    case 'cuadro-categorias': {
      const docFound = orgDoc(snapshot, 'CUADRO_CATEGORIAS_LEY_30709', 'POLITICA_IGUALDAD')
      const categorias = snapshot.sstRecords.some((record) => record.title.startsWith('CUADRO_CATEGORIA:'))
      return deriveStatus(doc, {
        orgFound: Boolean(docFound) || categorias,
        orgExpired: Boolean(docFound?.validUntil && docFound.validUntil < snapshot.now),
        lastExpiresAt: docFound?.validUntil ?? null,
        evidenceSources: docFound ? ['OrgDocument.CUADRO_CATEGORIAS_LEY_30709/POLITICA_IGUALDAD'] : categorias ? ['SstRecord.CUADRO_CATEGORIA'] : [],
      })
    }
    case 'seguro-vida-ley': {
      const found = orgDoc(snapshot, 'CONSTANCIA_SEGURO_VIDA_LEY')
      return deriveStatus(doc, {
        orgFound: Boolean(found),
        orgExpired: Boolean(found?.validUntil && found.validUntil < snapshot.now),
        lastExpiresAt: found?.validUntil ?? null,
        evidenceSources: found ? ['OrgDocument.CONSTANCIA_SEGURO_VIDA_LEY'] : [],
      })
    }
    case 'sctr-poliza': {
      const found = orgDoc(snapshot, 'SCTR_POLIZA')
      return deriveStatus(doc, {
        orgFound: Boolean(found),
        orgExpired: Boolean(found?.validUntil && found.validUntil < snapshot.now),
        lastExpiresAt: found?.validUntil ?? null,
        evidenceSources: found ? ['OrgDocument.SCTR_POLIZA'] : [],
      })
    }
    case 'sintesis-legislacion': {
      const found = orgDoc(snapshot, 'SINTESIS_LEGISLACION_LABORAL')
      return deriveStatus(doc, {
        orgFound: Boolean(found),
        orgExpired: Boolean(found?.validUntil && found.validUntil < snapshot.now),
        lastExpiresAt: found?.validUntil ?? null,
        evidenceSources: found ? ['OrgDocument.SINTESIS_LEGISLACION_LABORAL'] : [],
      })
    }
    case 'horario-trabajo': {
      const found = orgTextIncludes(snapshot, 'horario') || orgTextIncludes(snapshot, 'jornada', 'visible')
      return deriveStatus(doc, {
        orgFound: found,
        evidenceSources: found ? ['OrgDocument.title'] : [],
      })
    }
    default: {
      const payload = genericOrgPayload(snapshot, doc)
      const workerCoverage = doc.workerDocType
        ? mergeWorkerCoverage(snapshot, doc.workerDocType)
        : undefined
      return deriveStatus(doc, { ...payload, workerCoverage })
    }
  }
}
