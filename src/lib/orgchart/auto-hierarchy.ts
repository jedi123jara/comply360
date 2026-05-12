/**
 * Detector y aplicador automático de jerarquía organizacional.
 *
 * Casos de uso típicos:
 *   - Una organización recién bootstrappeada desde planilla legacy donde todas
 *     las áreas quedaron como hermanas (parentId=null) y el árbol se ve plano.
 *   - Imports masivos sin estructura padre-hijo definida.
 *
 * Estrategia:
 *   1. Identifica un único candidato raíz (preferentemente la unidad de tipo
 *      GERENCIA o cuyo nombre matchee con "Gerencia" / "Gerente General").
 *   2. Promueve esa unidad a `kind: GERENCIA` si no lo es ya.
 *   3. Mueve todas las demás unidades operativas huérfanas (AREA,
 *      DEPARTAMENTO, EQUIPO) a colgar de la raíz.
 *   4. Reconstruye el closure transitivo y los `level` afectados.
 *
 * Excluye unidades de tipo comisión (COMITE_LEGAL, BRIGADA, PROYECTO) — esas
 * viven fuera de la jerarquía principal por diseño.
 */

import { prisma } from '@/lib/prisma'
import type { UnitKind } from '@/generated/prisma/client'

import { rebuildClosure } from './closure-maintenance'

const REPARENTABLE_KINDS: UnitKind[] = ['AREA', 'DEPARTAMENTO', 'EQUIPO']

export interface AutoHierarchyResult {
  /** Id de la unidad que quedó como raíz, o null si no se encontró candidata. */
  rootUnitId: string | null
  /** Nombre de la unidad raíz (para mostrar en toasts). */
  rootUnitName: string | null
  /** Cantidad de unidades que se movieron debajo de la raíz. */
  reparented: number
  /** True si tuvimos que cambiar `kind` de la raíz a GERENCIA. */
  promoted: boolean
  /** Razón si rootUnitId es null. */
  reason?: 'no-units' | 'no-candidate' | 'already-hierarchical'
}

interface UnitForInference {
  id: string
  name: string
  kind: UnitKind
  parentId: string | null
  sortOrder: number
}

/**
 * Vista previa del resultado: NO modifica la BD. Útil para mostrar al usuario
 * cuántas unidades se moverán antes de confirmar.
 */
export async function previewHierarchyInference(orgId: string): Promise<{
  rootCandidate: UnitForInference | null
  willPromote: boolean
  unitsToReparent: UnitForInference[]
  reason?: AutoHierarchyResult['reason']
}> {
  const units = await loadUnits(orgId)
  if (units.length === 0) {
    return { rootCandidate: null, willPromote: false, unitsToReparent: [], reason: 'no-units' }
  }

  const orphans = units.filter((u) => !u.parentId)
  const candidate = pickRootCandidate(orphans)
  if (!candidate) {
    return { rootCandidate: null, willPromote: false, unitsToReparent: [], reason: 'no-candidate' }
  }

  const willPromote = candidate.kind !== 'GERENCIA'
  const unitsToReparent = orphans.filter(
    (u) => u.id !== candidate.id && REPARENTABLE_KINDS.includes(u.kind),
  )

  if (unitsToReparent.length === 0 && !willPromote) {
    return {
      rootCandidate: candidate,
      willPromote: false,
      unitsToReparent: [],
      reason: 'already-hierarchical',
    }
  }

  return { rootCandidate: candidate, willPromote, unitsToReparent }
}

/**
 * Aplica la inferencia y persiste los cambios en una transacción.
 */
export async function inferAndApplyHierarchy(orgId: string): Promise<AutoHierarchyResult> {
  const preview = await previewHierarchyInference(orgId)

  if (!preview.rootCandidate) {
    return {
      rootUnitId: null,
      rootUnitName: null,
      reparented: 0,
      promoted: false,
      reason: preview.reason,
    }
  }

  if (preview.unitsToReparent.length === 0 && !preview.willPromote) {
    return {
      rootUnitId: preview.rootCandidate.id,
      rootUnitName: preview.rootCandidate.name,
      reparented: 0,
      promoted: false,
      reason: 'already-hierarchical',
    }
  }

  const rootId = preview.rootCandidate.id
  const rootName = preview.rootCandidate.name
  const promoted = preview.willPromote

  await prisma.$transaction(async (tx) => {
    if (promoted) {
      await tx.orgUnit.update({
        where: { id: rootId },
        data: { kind: 'GERENCIA', level: 0, version: { increment: 1 } },
      })
    } else {
      // Aseguramos que la raíz quede en level 0 si no lo estaba (por consistencia).
      await tx.orgUnit.update({
        where: { id: rootId },
        data: { level: 0, version: { increment: 1 } },
      })
    }

    for (const u of preview.unitsToReparent) {
      await tx.orgUnit.update({
        where: { id: u.id },
        data: { parentId: rootId, level: 1, version: { increment: 1 } },
      })
    }
  })

  // Reconstruimos el closure transitivo fuera de la transacción —
  // `rebuildClosure` ya es idempotente y borra-y-recrea las filas de la org.
  await rebuildClosure(orgId)

  return {
    rootUnitId: rootId,
    rootUnitName: rootName,
    reparented: preview.unitsToReparent.length,
    promoted,
  }
}

// ─── Helpers internos ───────────────────────────────────────────────────────

async function loadUnits(orgId: string): Promise<UnitForInference[]> {
  return prisma.orgUnit.findMany({
    where: { orgId, isActive: true, validTo: null },
    select: { id: true, name: true, kind: true, parentId: true, sortOrder: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
}

/**
 * Elige la mejor unidad raíz entre las huérfanas:
 *   1. La primera ya marcada como `GERENCIA`.
 *   2. Cualquier unidad cuyo nombre matchee "gerencia"/"gerente general".
 *   3. null si no hay candidato razonable.
 */
function pickRootCandidate(orphans: UnitForInference[]): UnitForInference | null {
  if (orphans.length === 0) return null

  const existingGerencia = orphans.find((u) => u.kind === 'GERENCIA')
  if (existingGerencia) return existingGerencia

  const byName = orphans.find((u) => /gerencia|gerente general/i.test(u.name))
  if (byName) return byName

  return null
}
