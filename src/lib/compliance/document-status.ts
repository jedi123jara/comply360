/**
 * Document Status — cruza DocumentRequirement × OrgDocument para evaluar
 * cumplimiento documental de la org.
 *
 * Cada DocumentRequirement define qué constancia es obligatoria + frecuencia
 * de renovación. Para cada uno, buscamos el último OrgDocument(type=X) y
 * calculamos status:
 *   - VIGENTE: subido + (sin renovación o renovación dentro del plazo)
 *   - POR_VENCER: vigente pero faltan ≤ 30 días para renovar
 *   - VENCIDO: pasó la fecha de renovación
 *   - FALTANTE: nunca se subió
 *
 * Esta lib es usada por:
 *   - Dashboard `/dashboard/cumplimiento-documental` (UI grid)
 *   - Evaluators de Fase 2 (CR-08, RB-02, SST-13, etc.) — para responder
 *     auto-derivada según si la constancia respectiva está vigente
 *   - Cron `check-document-expiry` — genera alertas para constancias por vencer
 */

import type { OrgDocType } from '@/generated/prisma/client'

export type DocStatus = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' | 'FALTANTE'

export interface DocumentRequirementInfo {
  documentType: OrgDocType
  isRequired: boolean
  renewalFrequencyDays: number | null
  criticality: string
  appliesToRegimen: string[]
  appliesToSector: string | null
  helpText: string | null
  baseLegal: string | null
}

export interface OrgDocumentInfo {
  id: string
  type: OrgDocType
  title: string
  fileUrl: string | null
  publishedAt: Date | null
  validUntil: Date | null
  createdAt: Date
}

export interface DocumentStatusEntry {
  requirement: DocumentRequirementInfo
  currentDoc: OrgDocumentInfo | null
  status: DocStatus
  daysUntilExpiry: number | null
  /** Fecha de próxima renovación, calculada según frequency o validUntil. */
  nextRenewalAt: Date | null
}

const POR_VENCER_THRESHOLD_DAYS = 30

/**
 * Para un set de requirements + docs subidos, calcula el status de cada uno.
 */
export function buildDocumentStatusMap(
  requirements: DocumentRequirementInfo[],
  docs: OrgDocumentInfo[],
  now: Date = new Date()
): DocumentStatusEntry[] {
  // Indexa docs por tipo, manteniendo el más reciente
  const docsByType = new Map<OrgDocType, OrgDocumentInfo>()
  for (const d of docs) {
    const existing = docsByType.get(d.type)
    if (!existing || d.createdAt > existing.createdAt) {
      docsByType.set(d.type, d)
    }
  }

  return requirements.map((req) => {
    const current = docsByType.get(req.documentType) ?? null
    if (!current) {
      return {
        requirement: req,
        currentDoc: null,
        status: 'FALTANTE' as const,
        daysUntilExpiry: null,
        nextRenewalAt: null,
      }
    }

    // Computar fecha de próxima renovación
    let nextRenewalAt: Date | null = current.validUntil
    if (!nextRenewalAt && req.renewalFrequencyDays !== null) {
      nextRenewalAt = new Date(current.createdAt)
      nextRenewalAt.setDate(nextRenewalAt.getDate() + req.renewalFrequencyDays)
    }

    if (!nextRenewalAt) {
      // Sin fecha de renovación = siempre vigente
      return {
        requirement: req,
        currentDoc: current,
        status: 'VIGENTE' as const,
        daysUntilExpiry: null,
        nextRenewalAt: null,
      }
    }

    const daysUntilExpiry = Math.ceil(
      (nextRenewalAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    let status: DocStatus
    if (daysUntilExpiry < 0) status = 'VENCIDO'
    else if (daysUntilExpiry <= POR_VENCER_THRESHOLD_DAYS) status = 'POR_VENCER'
    else status = 'VIGENTE'

    return {
      requirement: req,
      currentDoc: current,
      status,
      daysUntilExpiry,
      nextRenewalAt,
    }
  })
}

/** Helpers para evaluators de Fase 2 */

/** ¿La org tiene una constancia vigente del tipo dado? */
export function hasVigenteDocument(
  entries: DocumentStatusEntry[],
  type: OrgDocType
): boolean {
  return entries.some(
    (e) => e.requirement.documentType === type && (e.status === 'VIGENTE' || e.status === 'POR_VENCER')
  )
}

/** Obtiene el status de un tipo específico (o null si no hay requirement). */
export function getStatusForType(
  entries: DocumentStatusEntry[],
  type: OrgDocType
): DocumentStatusEntry | null {
  return entries.find((e) => e.requirement.documentType === type) ?? null
}

/** Default requirements por régimen — usado para seed inicial cuando una org no tiene requirements custom. */
export const DEFAULT_REQUIREMENTS: Omit<DocumentRequirementInfo, 'appliesToRegimen' | 'appliesToSector'>[] = [
  {
    documentType: 'SCTR_POLIZA',
    isRequired: true,
    renewalFrequencyDays: 365,
    criticality: 'CRITICAL',
    helpText:
      'Póliza SCTR vigente para actividades de riesgo. Requerida por Ley 26790 y D.S. 003-98-SA.',
    baseLegal: 'Ley 26790, Art. 19',
  },
  {
    documentType: 'CTS_DEPOSITO_CONSTANCIA',
    isRequired: true,
    renewalFrequencyDays: 180, // mayo + noviembre
    criticality: 'HIGH',
    helpText: 'Constancia de depósito CTS cada 6 meses (15 mayo / 15 noviembre).',
    baseLegal: 'D.S. 001-97-TR, Art. 21-22',
  },
  {
    documentType: 'AFP_PAGO_CONSTANCIA',
    isRequired: true,
    renewalFrequencyDays: 30,
    criticality: 'CRITICAL',
    helpText: 'Constancia de pago AFP mensual. Plazo: 5 días del mes siguiente.',
    baseLegal: 'D.S. 054-97-EF, Art. 34',
  },
  {
    documentType: 'ESSALUD_PAGO_CONSTANCIA',
    isRequired: true,
    renewalFrequencyDays: 30,
    criticality: 'CRITICAL',
    helpText: 'Constancia de pago EsSalud mensual (9% de planilla).',
    baseLegal: 'Ley 26790, Art. 6',
  },
  {
    documentType: 'PLAME_CONFIRMACION',
    isRequired: true,
    renewalFrequencyDays: 30,
    criticality: 'HIGH',
    helpText: 'Confirmación de envío PLAME mensual a SUNAT.',
    baseLegal: 'D.S. 018-2007-TR',
  },
  {
    documentType: 'DJ_UTILIDADES',
    isRequired: true,
    renewalFrequencyDays: 365,
    criticality: 'MEDIUM',
    helpText: 'Declaración jurada anual de utilidades. Solo aplica si empresa tiene 20+ trabajadores.',
    baseLegal: 'D.Leg. 892, Art. 6',
  },
  {
    documentType: 'INFORME_LAB_FISICO',
    isRequired: true,
    renewalFrequencyDays: 365,
    criticality: 'HIGH',
    helpText: 'Monitoreo anual de agentes físicos (ruido, vibración, etc.).',
    baseLegal: 'Ley 29783, Art. 56',
  },
  {
    documentType: 'ACTA_SIMULACRO_EVACUACION',
    isRequired: true,
    renewalFrequencyDays: 180, // 2 por año
    criticality: 'MEDIUM',
    helpText: 'Mínimo 2 simulacros de evacuación al año (INDECI).',
    baseLegal: 'Ley 28551',
  },
  {
    documentType: 'ACTA_COMITE_SST_MENSUAL',
    isRequired: true,
    renewalFrequencyDays: 30,
    criticality: 'HIGH',
    helpText: 'Acta mensual del Comité SST.',
    baseLegal: 'D.S. 005-2012-TR, Art. 68',
  },
  {
    documentType: 'INFORME_ANUAL_HOSTIGAMIENTO_MTPE',
    isRequired: true,
    renewalFrequencyDays: 365,
    criticality: 'HIGH',
    helpText: 'Informe anual MTPE casos hostigamiento (incluso si es 0 casos).',
    baseLegal: 'D.S. 014-2019-MIMP, Art. 30',
  },
  {
    documentType: 'RIT',
    isRequired: false, // solo obligatorio para 100+ trabajadores
    renewalFrequencyDays: null,
    criticality: 'MEDIUM',
    helpText: 'Reglamento Interno de Trabajo. Obligatorio para 100+ trabajadores.',
    baseLegal: 'D.S. 039-91-TR, Art. 2',
  },
  {
    documentType: 'CUADRO_CATEGORIAS_LEY_30709',
    isRequired: true,
    renewalFrequencyDays: null,
    criticality: 'HIGH',
    helpText: 'Cuadro de categorías y funciones (Ley 30709).',
    baseLegal: 'Ley 30709, Art. 2',
  },
  {
    documentType: 'POLITICA_HOSTIGAMIENTO',
    isRequired: true,
    renewalFrequencyDays: null,
    criticality: 'CRITICAL',
    helpText: 'Política de prevención del hostigamiento sexual (debe estar exhibida).',
    baseLegal: 'D.S. 014-2019-MIMP, Art. 5',
  },
  {
    documentType: 'POLITICA_SST',
    isRequired: true,
    renewalFrequencyDays: null,
    criticality: 'HIGH',
    helpText: 'Política SST escrita (Ley 29783 Art. 22).',
    baseLegal: 'Ley 29783, Art. 22',
  },
  {
    documentType: 'MAPA_RIESGOS_ACTUALIZADO',
    isRequired: true,
    renewalFrequencyDays: 365,
    criticality: 'MEDIUM',
    helpText: 'Mapa de riesgos actualizado y exhibido en áreas visibles.',
    baseLegal: 'D.S. 005-2012-TR, Art. 35-e',
  },
  {
    documentType: 'SINTESIS_LEGISLACION_LABORAL',
    isRequired: true,
    renewalFrequencyDays: null,
    criticality: 'LOW',
    helpText: 'Síntesis de la legislación laboral exhibida en lugar visible.',
    baseLegal: 'D.S. 001-98-TR, Art. 48',
  },
]
