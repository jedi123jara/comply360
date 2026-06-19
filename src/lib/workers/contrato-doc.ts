import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'

/**
 * Asegura el WorkerDocument 'contrato_trabajo' del trabajador de forma idempotente
 * y race-safe. Un índice único PARCIAL en la BD (un solo 'contrato_trabajo' por
 * trabajador; otros tipos de doc sí se repiten) garantiza que no haya duplicados.
 *
 * Estrategia: updateMany-first (marca VERIFIED el existente en una sentencia
 * atómica) y, solo si no había ninguno, lo crea. Si dos ejecuciones concurrentes
 * intentan crear a la vez, el índice único rechaza la segunda con P2002 y aquí se
 * reintenta el updateMany. Así nunca quedan duplicados (antes: findFirst-then-create
 * sin restricción de BD → documentos duplicados bajo doble request).
 */
export async function ensureContratoTrabajoDoc(input: {
  workerId: string
  title: string
  verifiedBy?: string | null
}): Promise<void> {
  const data = {
    status: 'VERIFIED' as const,
    verifiedAt: new Date(),
    verifiedBy: input.verifiedBy ?? null,
  }

  const updated = await prisma.workerDocument.updateMany({
    where: { workerId: input.workerId, documentType: 'contrato_trabajo' },
    data,
  })
  if (updated.count > 0) return

  try {
    await prisma.workerDocument.create({
      data: {
        workerId: input.workerId,
        category: 'INGRESO',
        documentType: 'contrato_trabajo',
        title: input.title,
        isRequired: true,
        ...data,
      },
    })
  } catch (e) {
    // Otra ejecución concurrente ganó la carrera (índice único parcial → P2002):
    // el documento ya existe, solo lo marcamos VERIFIED.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      await prisma.workerDocument.updateMany({
        where: { workerId: input.workerId, documentType: 'contrato_trabajo' },
        data,
      })
      return
    }
    throw e
  }
}
