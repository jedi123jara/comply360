/**
 * Aplicador de la propuesta del Onboarding IA al organigrama real.
 *
 * Toma el `OnboardingProposal` validado y crea las unidades + cargos en la
 * BD. Idempotente por nombre — si la unidad ya existe (mismo nombre activo),
 * la reutiliza en lugar de duplicar. Útil para reaplicar el wizard tras
 * pruebas.
 */

import { prisma } from '@/lib/prisma'
import { recordStructureChange } from '../change-log'
import { silentLog } from '../_v2-utils/silent-log'
import type { OnboardingProposal } from './schema'

export interface ApplyResult {
  unitsCreated: number
  unitsReused: number
  positionsCreated: number
  positionsReused: number
  rootUnitId: string | null
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

async function uniqueSlug(orgId: string, base: string): Promise<string> {
  let slug = base
  let n = 1
  while (
    await prisma.orgUnit.findFirst({ where: { orgId, slug }, select: { id: true } })
  ) {
    n++
    slug = `${base}-${n}`
  }
  return slug
}

export async function applyOnboardingProposal(
  orgId: string,
  proposal: OnboardingProposal,
  userId: string | null,
): Promise<ApplyResult> {
  const result: ApplyResult = {
    unitsCreated: 0,
    unitsReused: 0,
    positionsCreated: 0,
    positionsReused: 0,
    rootUnitId: null,
  }

  // 1) Crear/reutilizar unidades en orden topológico (raíz → hojas)
  // Algoritmo: BFS empezando por las raíces (parentKey === null).
  const unitIdByKey = new Map<string, string>()
  const childrenByParent = new Map<string | null, typeof proposal.units>()
  for (const u of proposal.units) {
    const key = u.parentKey ?? null
    const list = childrenByParent.get(key) ?? []
    list.push(u)
    childrenByParent.set(key, list)
  }

  async function createUnitTree(parentKey: string | null, parentId: string | null, level: number) {
    const kids = childrenByParent.get(parentKey) ?? []
    for (const u of kids) {
      // Buscar unidad activa con mismo nombre en la org
      const existing = await prisma.orgUnit.findFirst({
        where: { orgId, name: u.name, isActive: true, validTo: null },
        select: { id: true },
      })
      let unitId: string
      if (existing) {
        unitId = existing.id
        result.unitsReused++
      } else {
        const baseSlug = slugify(u.name)
        const slug = await uniqueSlug(orgId, baseSlug)
        const created = await prisma.orgUnit.create({
          data: {
            orgId,
            parentId,
            name: u.name,
            slug,
            kind: u.kind,
            description: u.description ?? null,
            level,
            sortOrder: 0,
            isActive: true,
            version: 1,
          },
          select: { id: true },
        })
        unitId = created.id
        result.unitsCreated++
        await recordStructureChange({
          orgId,
          performedById: userId,
          type: 'UNIT_CREATE',
          entityType: 'OrgUnit',
          entityId: unitId,
          afterJson: { name: u.name, kind: u.kind, parentId },
        }).catch(silentLog('orgchart.onboarding.audit_log_unit_create', { orgId, userId }))
      }
      unitIdByKey.set(u.key, unitId)
      if (!parentId && !result.rootUnitId) {
        result.rootUnitId = unitId
      }
      await createUnitTree(u.key, unitId, level + 1)
    }
  }

  await createUnitTree(null, null, 0)

  // 2) Crear cargos. Hacemos dos pasadas: primero todos sin reportsTo,
  // luego ligamos línea de mando para evitar problemas de orden.
  const positionIdByKey = new Map<string, string>()
  for (const q of proposal.positions) {
    const unitId = unitIdByKey.get(q.unitKey)
    if (!unitId) continue // no debería ocurrir si validamos antes
    const existing = await prisma.orgPosition.findFirst({
      where: {
        orgId,
        orgUnitId: unitId,
        title: q.title,
        validTo: null,
      },
      select: { id: true },
    })
    if (existing) {
      positionIdByKey.set(q.key, existing.id)
      result.positionsReused++
      continue
    }
    const created = await prisma.orgPosition.create({
      data: {
        orgId,
        orgUnitId: unitId,
        title: q.title,
        description: q.purpose ?? null,
        purpose: q.purpose ?? null,
        isManagerial: q.isManagerial ?? false,
        isCritical: q.isCritical ?? false,
        seats: q.seats ?? 1,
      },
      select: { id: true },
    })
    positionIdByKey.set(q.key, created.id)
    result.positionsCreated++
    await recordStructureChange({
      orgId,
      performedById: userId,
      type: 'POSITION_CREATE',
      entityType: 'OrgPosition',
      entityId: created.id,
      afterJson: { title: q.title, unitId, isManagerial: q.isManagerial },
    }).catch(silentLog('orgchart.onboarding.audit_log_position_create', { orgId, userId }))
  }

  // 3) Ligar línea de mando (reportsToPositionId)
  for (const q of proposal.positions) {
    if (!q.reportsToKey) continue
    const myId = positionIdByKey.get(q.key)
    const parentId = positionIdByKey.get(q.reportsToKey)
    if (!myId || !parentId) continue
    await prisma.orgPosition.update({
      where: { id: myId },
      data: { reportsToPositionId: parentId },
    })
  }

  return result
}
