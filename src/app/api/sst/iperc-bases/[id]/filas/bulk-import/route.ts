import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { calcularNivelRiesgo } from '@/lib/sst/iperc-matrix'

/**
 * POST /api/sst/iperc-bases/[id]/filas/bulk-import
 *
 * Crea N filas IPERC en una sola llamada — diseñado para que un cliente
 * enterprise importe su matriz IPERC desde Excel sin pelear con un formulario
 * por fila.
 *
 * El frontend parsea el .xlsx con la utilidad `iperc-import.ts` y manda el
 * array ya validado. El servidor:
 *   1. Verifica ownership del IPERCBase contra ctx.orgId.
 *   2. Verifica que el IPERCBase esté en estado editable (no VIGENTE/ARCHIVADO).
 *   3. Resuelve `peligroNombre → peligroId` contra el catálogo global.
 *   4. Para CADA fila, recalcula IP/NR/Clasificación con el motor
 *      determinístico (NUNCA confía en valores derivados que vengan del cliente).
 *   5. Crea todas las filas en una transacción.
 *
 * Si una fila individual tiene problemas (ej: peligro no encontrado en el
 * catálogo), se omite y se reporta — las demás se aplican (best-effort).
 *
 * Cuerpo:
 *   {
 *     rows: [{
 *       proceso, actividad, tarea, peligroNombre, riesgo,
 *       indicePersonas, indiceProcedimiento, indiceCapacitacion,
 *       indiceExposicion, indiceSeveridad,
 *       controlesActuales: [...],
 *       controlesPropuestos: { eliminacion, sustitucion, ingenieria, administrativo, epp },
 *       responsable, plazoCierre  // opcionales
 *     }, ...]
 *   }
 *
 * Retorna:
 *   { created, skipped: [{ rowIndex, reason }] }
 */

const indiceField = z.number().int().min(1).max(3)

const rowSchema = z.object({
  proceso: z.string().min(2).max(150),
  actividad: z.string().min(2).max(200),
  tarea: z.string().min(2).max(200),
  peligroNombre: z.string().max(200).nullable().optional(),
  riesgo: z.string().min(2).max(300),
  indicePersonas: indiceField,
  indiceProcedimiento: indiceField,
  indiceCapacitacion: indiceField,
  indiceExposicion: indiceField,
  indiceSeveridad: indiceField,
  controlesActuales: z.array(z.string().min(1).max(300)).default([]),
  controlesPropuestos: z
    .object({
      eliminacion: z.array(z.string()).default([]),
      sustitucion: z.array(z.string()).default([]),
      ingenieria: z.array(z.string()).default([]),
      administrativo: z.array(z.string()).default([]),
      epp: z.array(z.string()).default([]),
    })
    .default({ eliminacion: [], sustitucion: [], ingenieria: [], administrativo: [], epp: [] }),
  responsable: z.string().max(150).optional().nullable(),
  plazoCierre: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
})

const bulkSchema = z.object({
  rows: z.array(rowSchema).min(1, 'Envía al menos una fila').max(500, 'Máximo 500 filas por llamada'),
})

interface SkippedRow {
  rowIndex: number
  reason: string
}

export const POST = withPlanGateParams<{ id: string }>('sst_completo', 
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => ({}))
    const parsed = bulkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    // Verificar ownership + editabilidad del IPERC
    const base = await prisma.iPERCBase.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true, estado: true },
    })
    if (!base) {
      return NextResponse.json({ error: 'IPERC no encontrado' }, { status: 404 })
    }
    if (base.estado === 'VIGENTE' || base.estado === 'ARCHIVADO') {
      return NextResponse.json(
        {
          error: `El IPERC está en estado ${base.estado} y no admite nuevas filas. Crea una nueva versión.`,
          code: 'IPERC_LOCKED',
        },
        { status: 409 },
      )
    }

    // Pre-cargar el catálogo de peligros (índice por nombre lowercase) para
    // resolver peligroNombre → peligroId sin N consultas individuales.
    const peligros = await prisma.catalogoPeligro.findMany({
      select: { id: true, nombre: true },
    })
    const peligroByNombre = new Map(
      peligros.map((p) => [p.nombre.trim().toLowerCase(), p.id]),
    )

    const skipped: SkippedRow[] = []
    const toCreate: Array<{ rowIndex: number; data: Parameters<typeof prisma.iPERCFila.create>[0]['data'] }> = []

    parsed.data.rows.forEach((row, rowIndex) => {
      // Resolver peligro
      let peligroId: string | null = null
      if (row.peligroNombre) {
        const found = peligroByNombre.get(row.peligroNombre.trim().toLowerCase())
        if (found) {
          peligroId = found
        } else {
          // No se encontró: continuamos sin peligro asociado pero registramos warning.
          skipped.push({
            rowIndex,
            reason: `Peligro "${row.peligroNombre}" no está en el catálogo. La fila se crea sin peligro vinculado.`,
          })
        }
      }

      // Recalcular IP/NR/clasificación (NUNCA confiar en derivados del cliente)
      let result
      try {
        result = calcularNivelRiesgo({
          indicePersonas: row.indicePersonas,
          indiceProcedimiento: row.indiceProcedimiento,
          indiceCapacitacion: row.indiceCapacitacion,
          indiceExposicion: row.indiceExposicion,
          indiceSeveridad: row.indiceSeveridad,
        })
      } catch (err) {
        skipped.push({
          rowIndex,
          reason:
            err instanceof Error
              ? err.message
              : 'Error al calcular nivel de riesgo (índices fuera de rango)',
        })
        return
      }

      toCreate.push({
        rowIndex,
        data: {
          iperBaseId: id,
          proceso: row.proceso,
          actividad: row.actividad,
          tarea: row.tarea,
          peligroId,
          riesgo: row.riesgo,
          indicePersonas: row.indicePersonas,
          indiceProcedimiento: row.indiceProcedimiento,
          indiceCapacitacion: row.indiceCapacitacion,
          indiceExposicion: row.indiceExposicion,
          indiceProbabilidad: result.indiceProbabilidad,
          indiceSeveridad: result.indiceSeveridad,
          nivelRiesgo: result.nivelRiesgo,
          clasificacion: result.clasificacion,
          esSignificativo: result.esSignificativo,
          controlesActuales: row.controlesActuales,
          controlesPropuestos: row.controlesPropuestos,
          responsable: row.responsable ?? null,
          plazoCierre: row.plazoCierre ? new Date(row.plazoCierre) : null,
        },
      })
    })

    // Crear todas las filas en una sola transacción
    let created = 0
    if (toCreate.length > 0) {
      await prisma.$transaction(
        toCreate.map((item) => prisma.iPERCFila.create({ data: item.data })),
      )
      created = toCreate.length
    }

    // Audit log
    // JSON.parse(JSON.stringify(...)) limpia el objeto a InputJsonValue plano
    // (sin las constraints de tipo que Prisma exige).
    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'IPERC_BULK_IMPORT',
        entityType: 'IPERCBase',
        entityId: id,
        metadataJson: JSON.parse(
          JSON.stringify({
            totalEnviadas: parsed.data.rows.length,
            creadas: created,
            omitidas: skipped.length,
            skippedDetails: skipped,
          }),
        ),
      },
    })

    return NextResponse.json(
      {
        created,
        skippedCount: skipped.length,
        skipped,
      },
      { status: 201 },
    )
  },
)

