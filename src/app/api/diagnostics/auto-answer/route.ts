import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { ALL_QUESTIONS, EXPRESS_QUESTIONS, getFilteredQuestions } from '@/lib/compliance/questions'

// =============================================
// GET /api/diagnostics/auto-answer — Pre-fill diagnostic answers from real data
// Query: ?type=FULL|EXPRESS
// =============================================
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') === 'EXPRESS' ? 'EXPRESS' : 'FULL'

  // Load org context
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { sizeRange: true, regimenPrincipal: true },
  })

  // Load all data needed for auto-answering
  const [
    workers,
    sstRecords,
    complaints,
    payslips,
  ] = await Promise.all([
    prisma.worker.findMany({
      where: { orgId, status: { not: 'TERMINATED' } },
      include: {
        documents: { select: { documentType: true, status: true, category: true } },
        workerContracts: { select: { contractId: true } },
        vacations: { select: { diasPendientes: true, esDoble: true } },
      },
    }),
    prisma.sstRecord.findMany({
      where: { orgId },
      select: { type: true, status: true },
    }),
    prisma.complaint.findMany({
      where: { orgId },
      select: { id: true, status: true },
    }),
    prisma.payslip.findMany({
      where: { orgId },
      select: { workerId: true, periodo: true },
      orderBy: { periodo: 'desc' },
      take: 500,
    }),
  ])

  const totalWorkers = workers.length

  // Helper: check what % of workers have a specific condition
  function workerPct(predicate: (w: typeof workers[0]) => boolean): number {
    if (totalWorkers === 0) return 100
    return Math.round((workers.filter(predicate).length / totalWorkers) * 100)
  }

  // Helper: does a doc type exist for a worker
  function hasDoc(w: typeof workers[0], docType: string): boolean {
    return w.documents.some(d => d.documentType === docType && ['UPLOADED', 'VERIFIED'].includes(d.status))
  }

  // Helper: does any SST record of type exist
  function hasSst(type: string): boolean {
    return sstRecords.some(r => r.type === type)
  }
  function hasSstCompleted(type: string): boolean {
    return sstRecords.some(r => r.type === type && r.status === 'COMPLETED')
  }

  // Threshold: 100% = SI, >= 80% = PARCIAL, < 80% = NO
  function pctToAnswer(pct: number): 'SI' | 'PARCIAL' | 'NO' {
    if (pct >= 100) return 'SI'
    if (pct >= 80) return 'PARCIAL'
    return 'NO'
  }

  // Workers with payslips
  const workersWithPayslip = new Set(payslips.map(p => p.workerId))

  // ── Auto-answer mapping by question ID ──────────────────────────────
  const autoAnswers: Record<string, { answer: 'SI' | 'NO' | 'PARCIAL'; detail: string }> = {}

  // CONTRATOS Y REGISTRO (CR-xx)
  const pctWithContract = workerPct(w => w.workerContracts.length > 0)
  autoAnswers['CR-01'] = { answer: pctToAnswer(pctWithContract), detail: `${pctWithContract}% de trabajadores con contrato registrado` }

  const pctWithTRegistro = workerPct(w => hasDoc(w, 't_registro'))
  autoAnswers['CR-04'] = { answer: pctToAnswer(pctWithTRegistro), detail: `${pctWithTRegistro}% con T-REGISTRO en legajo` }
  autoAnswers['CR-11'] = { answer: pctToAnswer(pctWithTRegistro), detail: `${pctWithTRegistro}% registrados en T-REGISTRO` }

  // REMUNERACIONES Y BENEFICIOS (RB-xx)
  const pctWithPayslip = totalWorkers > 0
    ? Math.round((workersWithPayslip.size / totalWorkers) * 100)
    : 100
  autoAnswers['RB-01'] = { answer: pctToAnswer(pctWithPayslip), detail: `${pctWithPayslip}% con boleta generada` }

  const pctWithAfp = workerPct(w => hasDoc(w, 'afp_onp_afiliacion'))
  autoAnswers['RB-07'] = { answer: pctToAnswer(pctWithAfp), detail: `${pctWithAfp}% con afiliacion AFP/ONP documentada` }
  autoAnswers['RB-08'] = { answer: pctToAnswer(pctWithAfp), detail: `${pctWithAfp}% con aportes previsionales` }

  const pctWithCtsDoc = workerPct(w => hasDoc(w, 'cts_deposito'))
  autoAnswers['RB-02'] = { answer: pctToAnswer(pctWithCtsDoc), detail: `${pctWithCtsDoc}% con deposito CTS documentado` }

  // Vacaciones
  const workersWithVacIssues = workers.filter(w =>
    w.vacations.some(v => v.diasPendientes > 0 && v.esDoble)
  ).length
  const pctVacOk = totalWorkers > 0
    ? Math.round(((totalWorkers - workersWithVacIssues) / totalWorkers) * 100)
    : 100
  autoAnswers['RB-04'] = { answer: pctToAnswer(pctVacOk), detail: `${pctVacOk}% sin doble periodo vacacional` }
  autoAnswers['RB-05'] = { answer: pctToAnswer(pctVacOk), detail: `${pctVacOk}% con vacaciones al dia` }

  // JORNADA Y DESCANSOS (JD-xx)
  const pctWithAsistencia = workerPct(w => hasDoc(w, 'registro_asistencia'))
  autoAnswers['JD-01'] = { answer: pctToAnswer(pctWithAsistencia), detail: `${pctWithAsistencia}% con registro de asistencia` }

  // SST (SST-xx)
  autoAnswers['SST-01'] = {
    answer: hasSst('POLITICA_SST') ? 'SI' : 'NO',
    detail: hasSst('POLITICA_SST') ? 'Politica SST registrada' : 'No se encontro politica SST',
  }
  autoAnswers['SST-03'] = {
    answer: hasSst('IPERC') ? 'SI' : 'NO',
    detail: hasSst('IPERC') ? 'IPERC registrado' : 'No se encontro IPERC',
  }
  autoAnswers['SST-04'] = {
    answer: hasSst('PLAN_ANUAL') ? 'SI' : 'NO',
    detail: hasSst('PLAN_ANUAL') ? 'Plan anual SST registrado' : 'No se encontro plan anual SST',
  }
  autoAnswers['SST-05'] = {
    answer: hasSstCompleted('CAPACITACION') ? 'SI' : hasSst('CAPACITACION') ? 'PARCIAL' : 'NO',
    detail: hasSst('CAPACITACION') ? 'Capacitaciones SST registradas' : 'No se encontraron capacitaciones SST',
  }
  autoAnswers['SST-06'] = {
    answer: hasSst('MAPA_RIESGOS') ? 'SI' : 'NO',
    detail: hasSst('MAPA_RIESGOS') ? 'Mapa de riesgos registrado' : 'No se encontro mapa de riesgos',
  }
  autoAnswers['SST-07'] = {
    answer: hasSst('ACTA_COMITE') ? 'SI' : 'NO',
    detail: hasSst('ACTA_COMITE') ? 'Actas de comite SST registradas' : 'No se encontraron actas de comite',
  }

  const pctWithEmo = workerPct(w => hasDoc(w, 'examen_medico_ingreso') || hasDoc(w, 'examen_medico_periodico'))
  autoAnswers['SST-08'] = { answer: pctToAnswer(pctWithEmo), detail: `${pctWithEmo}% con examen medico` }

  const pctWithEpp = workerPct(w => hasDoc(w, 'entrega_epp'))
  autoAnswers['SST-09'] = { answer: pctToAnswer(pctWithEpp), detail: `${pctWithEpp}% con registro de entrega EPP` }

  const pctWithInduccion = workerPct(w => hasDoc(w, 'induccion_sst'))
  autoAnswers['SST-10'] = { answer: pctToAnswer(pctWithInduccion), detail: `${pctWithInduccion}% con induccion SST` }

  // DOCUMENTOS OBLIGATORIOS (DO-xx)
  const pctWithBoleta = workerPct(w => hasDoc(w, 'boleta_pago'))
  autoAnswers['DO-01'] = { answer: pctToAnswer(pctWithBoleta), detail: `${pctWithBoleta}% con boleta en legajo` }

  const pctWithDni = workerPct(w => hasDoc(w, 'dni_copia'))
  autoAnswers['DO-02'] = { answer: pctToAnswer(pctWithDni), detail: `${pctWithDni}% con copia de DNI` }

  const pctWithDj = workerPct(w => hasDoc(w, 'declaracion_jurada'))
  autoAnswers['DO-03'] = { answer: pctToAnswer(pctWithDj), detail: `${pctWithDj}% con declaracion jurada` }

  const avgLegajo = totalWorkers > 0
    ? Math.round(workers.reduce((sum, w) => sum + (w.legajoScore ?? 0), 0) / totalWorkers)
    : 0
  autoAnswers['DO-04'] = {
    answer: avgLegajo >= 90 ? 'SI' : avgLegajo >= 70 ? 'PARCIAL' : 'NO',
    detail: `Legajo promedio: ${avgLegajo}%`,
  }

  const pctWithContrato = workerPct(w => hasDoc(w, 'contrato_trabajo'))
  autoAnswers['DO-05'] = { answer: pctToAnswer(pctWithContrato), detail: `${pctWithContrato}% con contrato en legajo` }

  // HOSTIGAMIENTO SEXUAL (HS-xx)
  const hasComplaintPolicy = complaints.length >= 0 // If the org has set up complaints channel
  autoAnswers['HS-01'] = {
    answer: hasSst('POLITICA_SST') ? 'PARCIAL' : 'NO', // Approximation — ideally check for specific hostigamiento policy
    detail: 'Verificar si existe politica especifica de prevencion del hostigamiento',
  }

  // Get filtered questions
  const baseQuestions = type === 'EXPRESS' ? EXPRESS_QUESTIONS : ALL_QUESTIONS
  const context = {
    totalWorkers,
    sizeRange: org?.sizeRange ?? undefined,
    regimenPrincipal: org?.regimenPrincipal ?? undefined,
  }
  const questions = getFilteredQuestions(baseQuestions, context)

  // Build answer array
  const answers = questions.map(q => {
    const auto = autoAnswers[q.id]
    return {
      questionId: q.id,
      answer: auto?.answer ?? null,
      detail: auto?.detail ?? null,
      autoFilled: !!auto,
    }
  })

  const answered = answers.filter(a => a.answer !== null).length
  const total = questions.length

  return NextResponse.json({
    type,
    totalQuestions: total,
    autoAnswered: answered,
    pendingManual: total - answered,
    pctAutoFilled: total > 0 ? Math.round((answered / total) * 100) : 0,
    answers,
    summary: {
      totalWorkers,
      avgLegajoScore: avgLegajo,
      sstRecordsCount: sstRecords.length,
      complaintsCount: complaints.length,
    },
  })
})
