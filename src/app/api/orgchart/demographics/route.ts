import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Demografía agregada de la empresa para resolver las obligaciones de comités
 * cuyo umbral depende del género/edad (lactario, asistenta social) o del
 * tratamiento de datos (DPO). Devuelve SOLO conteos — el género y la fecha de
 * nacimiento no salen del servidor (no se expone PII al cliente).
 */
export const GET = withPermission('ORGCHART_VIEW', async (_req: NextRequest, ctx) => {
  const workers = await prisma.worker.findMany({
    where: { orgId: ctx.orgId, status: 'ACTIVE' },
    select: { gender: true, birthDate: true },
  })

  const isFemale = (g: string | null): boolean => {
    const v = (g ?? '').trim().toLowerCase()
    return v === 'f' || v === 'female' || v.startsWith('fem') || v.startsWith('muj')
  }

  const ageOf = (d: Date | null): number | null => {
    if (!d) return null
    const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    return age >= 0 && age < 120 ? age : null
  }

  let womenCount = 0
  let womenFertileCount = 0
  for (const w of workers) {
    if (!isFemale(w.gender)) continue
    womenCount++
    const age = ageOf(w.birthDate)
    if (age !== null && age >= 15 && age <= 49) womenFertileCount++
  }

  return NextResponse.json({
    workerCount: workers.length,
    womenCount,
    womenFertileCount,
    // Toda empresa con planilla mantiene un banco de datos personales (DNI,
    // remuneraciones, etc.), así que el tratamiento de datos se asume si hay
    // trabajadores. La obligatoriedad fina del DPO la decide el catálogo.
    processesPersonalData: workers.length > 0,
  })
})
