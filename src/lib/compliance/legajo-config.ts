import { prisma } from '@/lib/prisma'

/**
 * Canonical list of 18 required document types for the Legajo Digital.
 * Must stay in sync with LEGAJO_DOCS (required:true) in document-uploader.tsx.
 *
 * Base legal:
 *  - D.S. 003-97-TR Art. 48 (contrato de trabajo)
 *  - Ley 29783 Art. 28 (examenes, capacitaciones SST)
 *  - R.M. 050-2013-TR (IPERC, registros SST)
 *  - D.S. 001-97-TR (CTS deposit)
 */
export const REQUIRED_DOC_TYPES = [
  'contrato_trabajo',
  'cv',
  'dni_copia',
  'declaracion_jurada',
  'boleta_pago',
  't_registro',
  'vacaciones_goce',
  'capacitacion_registro',
  'examen_medico_ingreso',
  'examen_medico_periodico',
  'induccion_sst',
  'entrega_epp',
  'iperc_puesto',
  'capacitacion_sst',
  'reglamento_interno',
  'afp_onp_afiliacion',
  'essalud_registro',
  'cts_deposito',
] as const

export type RequiredDocType = (typeof REQUIRED_DOC_TYPES)[number]

/**
 * Recalculate and persist the legajo completeness score (0-100) for a worker.
 * Score = (required doc types uploaded or verified) / total required * 100
 */
export async function recalculateLegajoScore(workerId: string): Promise<number> {
  const uploadedDocs = await prisma.workerDocument.findMany({
    where: {
      workerId,
      status: { in: ['UPLOADED', 'VERIFIED'] },
    },
    select: { documentType: true },
  })

  const uploadedTypes = new Set(uploadedDocs.map(d => d.documentType))
  const matchedCount = REQUIRED_DOC_TYPES.filter(t => uploadedTypes.has(t)).length
  const score = Math.round((matchedCount / REQUIRED_DOC_TYPES.length) * 100)

  await prisma.worker.update({
    where: { id: workerId },
    data: { legajoScore: score },
  })

  return score
}
