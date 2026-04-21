import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

// =============================================
// Igualdad Salarial — Ley 30709
// Cuadro de Categorias y Funciones
// =============================================

// Thresholds defined as named constants to make policy intent explicit
/** Groups with a gender pay gap above this percentage are flagged as requiresReview */
const GAP_REVIEW_THRESHOLD_PCT = 5
/** Workers in groups with a gap above this percentage generate individual alerts */
const GAP_ALERT_THRESHOLD_PCT = 15

interface GenderGroup {
  position: string | null
  department: string | null
  totalWorkers: number
  maleCount: number
  femaleCount: number
  noGenderCount: number
  avgSalaryMale: number
  avgSalaryFemale: number
  avgSalaryAll: number
  gapPercent: number
  requiresReview: boolean
}

// =============================================
// GET /api/igualdad-salarial — Aggregate salary data by gender
// =============================================
export const GET = withAuth(async (req, ctx) => {
  try {
    const orgId = ctx.orgId

    // Get all active workers with salary and gender info
    const workers = await prisma.worker.findMany({
      where: { orgId, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
        department: true,
        gender: true,
        sueldoBruto: true,
      },
    })

    // Group workers by position + department
    const groupMap = new Map<string, {
      position: string | null
      department: string | null
      males: { name: string; salary: number }[]
      females: { name: string; salary: number }[]
      noGender: { name: string; salary: number }[]
    }>()

    for (const w of workers) {
      const key = `${w.position || 'Sin Puesto'}||${w.department || 'Sin Departamento'}`
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          position: w.position,
          department: w.department,
          males: [],
          females: [],
          noGender: [],
        })
      }
      const group = groupMap.get(key)!
      const salary = Number(w.sueldoBruto)
      const gender = (w.gender || '').toUpperCase()
      const name = `${w.firstName || ''} ${w.lastName || ''}`.trim()

      if (gender === 'M' || gender === 'MASCULINO' || gender === 'MALE') {
        group.males.push({ name, salary })
      } else if (gender === 'F' || gender === 'FEMENINO' || gender === 'FEMALE') {
        group.females.push({ name, salary })
      } else {
        group.noGender.push({ name, salary })
      }
    }

    // Calculate stats per group
    const groups: GenderGroup[] = []
    let totalMale = 0
    let totalFemale = 0
    let totalSalaryMale = 0
    let totalSalaryFemale = 0
    let groupsWithGap = 0

    // Build alerts for critical gaps
    const alerts: { name: string; position: string; department: string; gender: string; salary: number; avgOther: number; gapPercent: number }[] = []

    for (const [, group] of groupMap) {
      const maleSalaries = group.males.map(m => m.salary)
      const femaleSalaries = group.females.map(f => f.salary)
      const noGenderSalaries = group.noGender.map(n => n.salary)
      const avgMale = maleSalaries.length > 0
        ? maleSalaries.reduce((a, b) => a + b, 0) / maleSalaries.length
        : 0
      const avgFemale = femaleSalaries.length > 0
        ? femaleSalaries.reduce((a, b) => a + b, 0) / femaleSalaries.length
        : 0
      const allSalaries = [...maleSalaries, ...femaleSalaries, ...noGenderSalaries]
      const avgAll = allSalaries.length > 0
        ? allSalaries.reduce((a, b) => a + b, 0) / allSalaries.length
        : 0

      // Gap % = ((avgMale - avgFemale) / avgMale) * 100
      // Positive means males earn more; negative means females earn more
      let gapPercent = 0
      if (avgMale > 0 && avgFemale > 0) {
        gapPercent = ((avgMale - avgFemale) / avgMale) * 100
      }

      const requiresReview = Math.abs(gapPercent) > GAP_REVIEW_THRESHOLD_PCT

      if (requiresReview) groupsWithGap++

      // If gap exceeds alert threshold, add individual worker alerts
      if (Math.abs(gapPercent) > GAP_ALERT_THRESHOLD_PCT) {
        // Alert workers from the lower-paid gender
        const lowerPaid = gapPercent > 0 ? group.females : group.males
        const avgOther = gapPercent > 0 ? avgMale : avgFemale
        for (const worker of lowerPaid) {
          alerts.push({
            name: worker.name,
            position: group.position || 'Sin Puesto',
            department: group.department || 'Sin Departamento',
            gender: gapPercent > 0 ? 'F' : 'M',
            salary: worker.salary,
            avgOther: Math.round(avgOther * 100) / 100,
            gapPercent: Math.round(gapPercent * 100) / 100,
          })
        }
      }

      totalMale += group.males.length
      totalFemale += group.females.length
      totalSalaryMale += maleSalaries.reduce((a, b) => a + b, 0)
      totalSalaryFemale += femaleSalaries.reduce((a, b) => a + b, 0)

      groups.push({
        position: group.position,
        department: group.department,
        totalWorkers: group.males.length + group.females.length + group.noGender.length,
        maleCount: group.males.length,
        femaleCount: group.females.length,
        noGenderCount: group.noGender.length,
        avgSalaryMale: Math.round(avgMale * 100) / 100,
        avgSalaryFemale: Math.round(avgFemale * 100) / 100,
        avgSalaryAll: Math.round(avgAll * 100) / 100,
        gapPercent: Math.round(gapPercent * 100) / 100,
        requiresReview,
      })
    }

    // Overall stats
    const overallAvgMale = totalMale > 0 ? totalSalaryMale / totalMale : 0
    const overallAvgFemale = totalFemale > 0 ? totalSalaryFemale / totalFemale : 0
    // Only calculate gap when BOTH genders are present — otherwise it would show 100% (misleading)
    const overallGap = (overallAvgMale > 0 && overallAvgFemale > 0)
      ? ((overallAvgMale - overallAvgFemale) / overallAvgMale) * 100
      : 0

    const noGenderCount = workers.length - totalMale - totalFemale

    // Load existing cuadro de categorias from SstRecord (type IPERC reused or custom)
    // We store cuadro de categorias as JSON in a dedicated collection-style approach
    // using the complaint protectionMeasures JSON pattern.
    // Wrapped in try-catch: the `startsWith` filter relies on a string-prefix
    // convention that could fail if the DB adapter doesn't support it or if
    // the title column has an unexpected type — degrade gracefully to [].
    let categorias: Awaited<ReturnType<typeof prisma.sstRecord.findMany>> = []
    try {
      categorias = await prisma.sstRecord.findMany({
        where: {
          orgId,
          type: 'POLITICA_SST', // We reuse SstRecord with a specific title pattern
          title: { startsWith: 'CUADRO_CATEGORIA:' },
        },
        orderBy: { createdAt: 'desc' },
      })
    } catch (categoriasError) {
      console.error('Igualdad Salarial: failed to load categorias, returning empty array', categoriasError)
      // categorias stays []
    }

    // Sort groups by gap descending (largest gaps first)
    groups.sort((a, b) => Math.abs(b.gapPercent) - Math.abs(a.gapPercent))

    return NextResponse.json({
      groups,
      stats: {
        totalWorkers: workers.length,
        totalMale,
        totalFemale,
        noGenderCount,
        femalePercent: workers.length > 0 ? Math.round((totalFemale / workers.length) * 100) : 0,
        overallAvgGap: Math.round(overallGap * 100) / 100,
        groupsAnalyzed: groups.length,
        groupsWithGap,
        groupsCompliant: groups.length - groupsWithGap,
      },
      categorias: categorias.map(c => ({
        id: c.id,
        ...((c.data as Record<string, unknown>) || {}),
        createdAt: c.createdAt,
      })),
      alerts,
    })
  } catch (error) {
    console.error('Igualdad Salarial GET error:', error)
    return NextResponse.json({ error: 'Error al obtener datos de igualdad salarial' }, { status: 500 })
  }
})

// =============================================
// POST /api/igualdad-salarial — Save cuadro de categorias
// =============================================
export const POST = withAuth(async (req, ctx) => {
  try {
    const body = await req.json()
    const orgId = ctx.orgId
    const {
      categoryName,
      functions,
      salaryRangeMin,
      salaryRangeMax,
      requirements,
      level,
    } = body

    if (!categoryName) {
      return NextResponse.json({ error: 'categoryName es requerido' }, { status: 400 })
    }

    if (salaryRangeMin != null && salaryRangeMax != null && salaryRangeMin > salaryRangeMax) {
      return NextResponse.json({ error: 'salaryRangeMin no puede ser mayor que salaryRangeMax' }, { status: 400 })
    }

    // Store as SstRecord with special title pattern for querying
    const record = await prisma.sstRecord.create({
      data: {
        orgId,
        type: 'POLITICA_SST',
        title: `CUADRO_CATEGORIA: ${categoryName}`,
        description: `Categoria del cuadro de categorias y funciones - Ley 30709`,
        data: {
          categoryName,
          functions: functions || '',
          salaryRangeMin: salaryRangeMin ?? 0,
          salaryRangeMax: salaryRangeMax ?? 0,
          requirements: requirements || '',
          level: level || '',
        },
        status: 'COMPLETED',
      },
    })

    return NextResponse.json({
      id: record.id,
      categoryName,
      functions,
      salaryRangeMin,
      salaryRangeMax,
      requirements,
      level,
    })
  } catch (error) {
    console.error('Igualdad Salarial POST error:', error)
    return NextResponse.json({ error: 'Error al guardar categoria' }, { status: 500 })
  }
})
