/**
 * POST /api/admin/fix-worker-names
 *
 * Limpieza de nombres duplicados en la base de datos.
 *
 * El bug era: el importador de Excel PLAME detectaba "APELLIDOS Y NOMBRES"
 * como columna de nombres Y columna de apellidos por separado (via h.includes()),
 * guardando el nombre completo en AMBOS campos (firstName y lastName).
 *
 * Este endpoint busca registros afectados y los normaliza:
 *   "SEGURA POLO, MARIVEL ESTEFANIA" / "SEGURA POLO, MARIVEL ESTEFANIA"
 *   → firstName: "MARIVEL ESTEFANIA" / lastName: "SEGURA POLO"
 *
 * Solo accesible por ADMIN u OWNER.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

// ── Reutilizar la misma lógica de split que el importador ────────────────────

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const s = fullName.trim()
  if (!s) return { firstName: '', lastName: '' }

  // Formato: "APELLIDO APELLIDO, NOMBRE NOMBRE"
  if (s.includes(',')) {
    const parts = s.split(',')
    return {
      lastName: (parts[0] ?? '').trim(),
      firstName: parts.slice(1).join(',').trim(),
    }
  }

  // Sin coma — primeros dos tokens = apellidos, resto = nombres
  const tokens = s.split(/\s+/).filter(Boolean)
  if (tokens.length <= 2) return { lastName: tokens[0] ?? s, firstName: tokens.slice(1).join(' ') }
  return {
    lastName: tokens.slice(0, 2).join(' '),
    firstName: tokens.slice(2).join(' '),
  }
}

function needsFix(firstName: string, lastName: string): boolean {
  if (!firstName || !lastName) return false
  // Caso 1: ambos campos idénticos
  if (firstName === lastName) return true
  // Caso 2: uno contiene completamente al otro (con margen razonable de longitud)
  if (
    (firstName.includes(lastName) || lastName.includes(firstName)) &&
    Math.abs(firstName.length - lastName.length) < 5
  ) return true
  // Caso 3: alguno contiene coma (nombre completo guardado como apellido o como nombre)
  if (firstName.includes(',') || lastName.includes(',')) return true
  return false
}

// ── GET — previsualizar cuántos registros se verán afectados ─────────────────

export const GET = withRole('ADMIN', async (_req: NextRequest, ctx: AuthContext) => {
  try {
    const workers = await prisma.worker.findMany({
      where: { orgId: ctx.orgId, status: { not: 'TERMINATED' } },
      select: { id: true, firstName: true, lastName: true, dni: true },
    })

    const affected = workers.filter(w =>
      needsFix(w.firstName ?? '', w.lastName ?? '')
    )

    const preview = affected.slice(0, 20).map(w => ({
      id: w.id,
      dni: w.dni,
      currentFirstName: w.firstName,
      currentLastName: w.lastName,
      ...splitFullName((w.lastName && w.lastName.length >= (w.firstName?.length ?? 0)
        ? w.lastName : w.firstName) ?? ''),
    }))

    return NextResponse.json({
      total: workers.length,
      affected: affected.length,
      preview,
      message: affected.length === 0
        ? '✅ No se encontraron nombres duplicados. La base de datos está limpia.'
        : `⚠️ Se encontraron ${affected.length} trabajador(es) con nombres duplicados.`,
    })
  } catch (error) {
    console.error('[fix-worker-names GET]', error)
    return NextResponse.json({ error: 'Error al analizar registros' }, { status: 500 })
  }
})

// ── POST — aplicar corrección ────────────────────────────────────────────────

export const POST = withRole('ADMIN', async (_req: NextRequest, ctx: AuthContext) => {
  try {
    const workers = await prisma.worker.findMany({
      where: { orgId: ctx.orgId },
      select: { id: true, firstName: true, lastName: true, dni: true },
    })

    const toFix = workers.filter(w =>
      needsFix(w.firstName ?? '', w.lastName ?? '')
    )

    if (toFix.length === 0) {
      return NextResponse.json({
        fixed: 0,
        message: '✅ No se encontraron nombres duplicados. La base de datos ya está limpia.',
      })
    }

    const results: Array<{
      dni: string
      before: { firstName: string | null; lastName: string | null }
      after: { firstName: string; lastName: string }
    }> = []

    for (const w of toFix) {
      // Usar el campo más largo como fuente de la verdad (suele ser el más completo)
      const combined = ((w.lastName ?? '').length >= (w.firstName ?? '').length
        ? w.lastName
        : w.firstName) ?? ''

      const { firstName, lastName } = splitFullName(combined)

      if (!firstName && !lastName) continue // no se pudo dividir

      await prisma.worker.update({
        where: { id: w.id },
        data: {
          firstName: firstName || w.firstName,
          lastName: lastName || w.lastName,
        },
      })

      results.push({
        dni: w.dni,
        before: { firstName: w.firstName, lastName: w.lastName },
        after: { firstName: firstName || w.firstName || '', lastName: lastName || w.lastName || '' },
      })
    }

    return NextResponse.json({
      fixed: results.length,
      results,
      message: `✅ Se corrigieron ${results.length} nombre(s) exitosamente.`,
    })
  } catch (error) {
    console.error('[fix-worker-names POST]', error)
    return NextResponse.json({ error: 'Error al corregir registros' }, { status: 500 })
  }
})
