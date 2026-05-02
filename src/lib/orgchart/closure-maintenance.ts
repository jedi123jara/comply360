import { prisma } from '@/lib/prisma'

/**
 * Mantenimiento aplicativo del closure table.
 *
 * Estrategia:
 *   - Cuando se inserta una unidad: agregar self-row (depth 0) + copiar
 *     todos los ancestros del padre incrementando depth.
 *   - Cuando se mueve una unidad: borrar todas las filas que conecten un
 *     ancestro fuera del subárbol con un descendiente del subárbol, y luego
 *     re-insertar con el nuevo padre.
 *   - Cuando se borra una unidad: la FK ON DELETE CASCADE limpia todo.
 *
 * Anti-ciclo: antes de mover, verificamos que `newParentId` NO sea descendiente
 * de la unidad que se mueve.
 */

export async function insertClosureForNewUnit(unitId: string, parentId: string | null) {
  // self-row (depth 0)
  await prisma.orgUnitClosure.create({
    data: { ancestorId: unitId, descendantId: unitId, depth: 0 },
  })

  if (!parentId) return

  // copiar ancestros del padre con depth + 1
  const parentAncestors = await prisma.orgUnitClosure.findMany({
    where: { descendantId: parentId },
    select: { ancestorId: true, depth: true },
  })

  if (parentAncestors.length === 0) return

  await prisma.orgUnitClosure.createMany({
    data: parentAncestors.map(a => ({
      ancestorId: a.ancestorId,
      descendantId: unitId,
      depth: a.depth + 1,
    })),
    skipDuplicates: true,
  })
}

export async function isDescendantOf(possibleAncestorId: string, possibleDescendantId: string): Promise<boolean> {
  if (possibleAncestorId === possibleDescendantId) return true
  const found = await prisma.orgUnitClosure.findUnique({
    where: {
      ancestorId_descendantId: {
        ancestorId: possibleAncestorId,
        descendantId: possibleDescendantId,
      },
    },
  })
  return !!found
}

export async function moveSubtree(unitId: string, newParentId: string | null) {
  // 1) detectar todos los descendientes del subárbol que se mueve
  const subtree = await prisma.orgUnitClosure.findMany({
    where: { ancestorId: unitId },
    select: { descendantId: true, depth: true },
  })
  const descendantIds = subtree.map(s => s.descendantId)

  // 2) borrar filas que conectan ancestros antiguos (fuera del subárbol)
  //    con descendientes (dentro del subárbol)
  await prisma.orgUnitClosure.deleteMany({
    where: {
      descendantId: { in: descendantIds },
      ancestorId: { notIn: descendantIds },
    },
  })

  // 3) si hay nuevo padre, agregar las nuevas conexiones
  if (newParentId) {
    const newAncestors = await prisma.orgUnitClosure.findMany({
      where: { descendantId: newParentId },
      select: { ancestorId: true, depth: true },
    })

    if (newAncestors.length > 0) {
      const rows = newAncestors.flatMap(a =>
        subtree.map(s => ({
          ancestorId: a.ancestorId,
          descendantId: s.descendantId,
          depth: a.depth + 1 + s.depth,
        })),
      )
      await prisma.orgUnitClosure.createMany({ data: rows, skipDuplicates: true })
    }
  }
}

/** Reconstruye el closure desde cero a partir de los parentId. Idempotente. */
export async function rebuildClosure(orgId: string) {
  const units = await prisma.orgUnit.findMany({
    where: { orgId },
    select: { id: true, parentId: true },
  })

  // borrar closure existente de la org
  const ids = units.map(u => u.id)
  if (ids.length === 0) return
  await prisma.orgUnitClosure.deleteMany({
    where: { ancestorId: { in: ids } },
  })

  // self-rows
  await prisma.orgUnitClosure.createMany({
    data: units.map(u => ({ ancestorId: u.id, descendantId: u.id, depth: 0 })),
    skipDuplicates: true,
  })

  // BFS desde cada unit hacia arriba
  const byId = new Map(units.map(u => [u.id, u]))
  const rows: { ancestorId: string; descendantId: string; depth: number }[] = []
  for (const u of units) {
    let cur = u.parentId ? byId.get(u.parentId) : null
    let depth = 1
    while (cur) {
      rows.push({ ancestorId: cur.id, descendantId: u.id, depth })
      cur = cur.parentId ? byId.get(cur.parentId) : null
      depth++
    }
  }
  if (rows.length > 0) {
    await prisma.orgUnitClosure.createMany({ data: rows, skipDuplicates: true })
  }
}
