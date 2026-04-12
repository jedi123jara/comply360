/**
 * MOTOR DE DETECCIÓN DE RIESGO SUNAFIL
 * Analiza la organización completa y detecta infracciones reales
 * con estimación de multas según D.S. 019-2006-TR
 */

import { prisma } from '@/lib/prisma'
import { calcularMultaSunafilSoles, type TipoEmpresaSunafil } from '@/lib/legal-engine/peru-labor'
import { INFRACCIONES_SUNAFIL, type InfraccionSunafil } from './sunafil-infractions'

const RMV_2026 = 1130
const UIT_2026 = 5500

export interface RiesgoDetectado {
  infraccion: InfraccionSunafil
  trabajadoresAfectados: { id: string; nombre: string; detalle: string }[]
  multaEstimadaSoles: number
  multaEstimadaUit: number
  multaConSubsanacionSoles: number
  ahorroSubsanacion: number
  accionInmediata: string
  urgencia: number
}

export interface OrgRiskReport {
  orgId: string
  scanDate: Date
  tipoEmpresa: TipoEmpresaSunafil
  totalTrabajadores: number
  riesgos: RiesgoDetectado[]
  totalMultaSoles: number
  totalMultaUit: number
  totalMultaConSubsanacionSoles: number
  ahorroTotalSoles: number
  resumen: {
    muyGraves: number
    graves: number
    leves: number
    riesgosCriticos: RiesgoDetectado[]
    areasMasRiesgosas: string[]
  }
}

// Tipo de worker enriquecido que devuelve el include de Prisma
type WorkerWithRelations = Awaited<ReturnType<typeof loadWorkers>>[number]

async function loadWorkers(orgId: string) {
  return prisma.worker.findMany({
    where: { orgId, status: { not: 'TERMINATED' } },
    include: {
      documents: {
        select: { documentType: true, status: true, expiresAt: true },
      },
      workerContracts: {
        include: {
          contract: { select: { expiresAt: true, status: true } },
        },
      },
      vacations: {
        select: { diasPendientes: true, esDoble: true, periodoFin: true },
      },
    },
  })
}

// ─────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────
export async function scanOrgRisks(orgId: string): Promise<OrgRiskReport> {
  const [workers, org, sstRecords, complaints, diagnostics] = await Promise.all([
    loadWorkers(orgId),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, sizeRange: true },
    }),
    prisma.sstRecord.findMany({
      where: { orgId },
      select: { type: true, status: true, createdAt: true },
    }),
    prisma.complaint.findMany({
      where: { orgId },
      select: { id: true, status: true },
    }),
    prisma.complianceDiagnostic.findFirst({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      select: { scoreGlobal: true, scoreByArea: true },
    }),
  ])

  const totalTrabajadores = workers.length
  const tipoEmpresa = clasificarEmpresa(totalTrabajadores, org?.sizeRange)

  const riesgos: RiesgoDetectado[] = []
  const now = new Date()

  // ─── 1. RMV ─────────────────────────────────────────────
  const trabajadoresBajoRMV = workers.filter(w => {
    const sueldo = Number(w.sueldoBruto)
    const regimenExento = ['MYPE_MICRO', 'MODALIDAD_FORMATIVA', 'DOMESTICO'].includes(w.regimenLaboral ?? '')
    return !regimenExento && sueldo > 0 && sueldo < RMV_2026
  })
  if (trabajadoresBajoRMV.length > 0) {
    const infraccion = findInfraccion('DS019-24.4')!
    const multaSoles = calcularMultaSunafilSoles(tipoEmpresa, 'GRAVE', trabajadoresBajoRMV.length)
    riesgos.push(buildRiesgo(infraccion, trabajadoresBajoRMV.map(w => ({
      id: w.id,
      nombre: `${w.firstName} ${w.lastName}`,
      detalle: `Sueldo S/ ${Number(w.sueldoBruto).toFixed(2)} — mínimo legal S/ ${RMV_2026}`,
    })), multaSoles, 10))
  }

  // ─── 2. Contratos plazo fijo vencidos ───────────────────
  const contratosVencidos: WorkerWithRelations[] = []
  for (const w of workers) {
    const hasExpired = w.workerContracts.some(wc => {
      const exp = wc.contract.expiresAt
      return exp && new Date(exp) < now &&
        wc.contract.status !== 'EXPIRED' &&
        wc.contract.status !== 'ARCHIVED'
    })
    if (hasExpired) contratosVencidos.push(w)
  }
  if (contratosVencidos.length > 0) {
    const infraccion = findInfraccion('DS019-24.3')!
    const multaSoles = calcularMultaSunafilSoles(tipoEmpresa, 'MUY_GRAVE', contratosVencidos.length)
    riesgos.push(buildRiesgo(infraccion, contratosVencidos.map(w => ({
      id: w.id,
      nombre: `${w.firstName} ${w.lastName}`,
      detalle: 'Contrato a plazo fijo vencido — riesgo de conversión a indefinido',
    })), multaSoles, 9))
  }

  // ─── 3. Sin T-REGISTRO ──────────────────────────────────
  const sinTRegistro = workers.filter(w =>
    !w.documents.some(d =>
      (d.documentType === 't_registro' || d.documentType === 't-registro') &&
      d.status !== 'MISSING'
    )
  )
  if (sinTRegistro.length > 0) {
    const infraccion = findInfraccion('DS019-25.2')!
    const multaSoles = calcularMultaSunafilSoles(tipoEmpresa, 'GRAVE', sinTRegistro.length)
    riesgos.push(buildRiesgo(infraccion, sinTRegistro.map(w => ({
      id: w.id,
      nombre: `${w.firstName} ${w.lastName}`,
      detalle: 'Sin documento T-REGISTRO en legajo',
    })), multaSoles, 9))
  }

  // ─── 4. Triple vacacional ────────────────────────────────
  const tripleVac = workers.filter(w =>
    w.vacations.filter(v => v.diasPendientes > 0).length >= 2 ||
    w.vacations.some(v => v.esDoble)
  )
  if (tripleVac.length > 0) {
    const infraccion = findInfraccion('DS019-24.11')!
    const multaSoles = calcularMultaSunafilSoles(tipoEmpresa, 'GRAVE', tripleVac.length)
    riesgos.push(buildRiesgo(infraccion, tripleVac.map(w => ({
      id: w.id,
      nombre: `${w.firstName} ${w.lastName}`,
      detalle: `${w.vacations.filter(v => v.diasPendientes > 0).length} períodos de vacaciones sin gozar`,
    })), multaSoles, 8))
  }

  // ─── 5. Exámenes médicos vencidos o sin registrar ────────
  const sinExamen = workers.filter(w => {
    const emo = w.documents.find(d =>
      d.documentType === 'examen_medico_periodico' ||
      d.documentType === 'examen_medico_ingreso'
    )
    if (!emo || emo.status === 'MISSING') return true
    if (emo.expiresAt && new Date(emo.expiresAt) < now) return true
    return false
  })
  if (sinExamen.length > 0) {
    const infraccion = findInfraccion('DS019-28.6')!
    const multaSoles = calcularMultaSunafilSoles(tipoEmpresa, 'GRAVE', sinExamen.length)
    riesgos.push(buildRiesgo(infraccion, sinExamen.map(w => ({
      id: w.id,
      nombre: `${w.firstName} ${w.lastName}`,
      detalle: 'Sin examen médico ocupacional vigente en legajo',
    })), multaSoles, 8))
  }

  // ─── 6. Sin EPP documentado ─────────────────────────────
  const sinEpp = workers.filter(w =>
    !w.documents.some(d => d.documentType === 'entrega_epp' && d.status !== 'MISSING')
  )
  if (sinEpp.length > 0) {
    const infraccion = findInfraccion('DS019-28.9')!
    const multaSoles = calcularMultaSunafilSoles(tipoEmpresa, 'GRAVE', sinEpp.length)
    riesgos.push(buildRiesgo(infraccion, sinEpp.map(w => ({
      id: w.id,
      nombre: `${w.firstName} ${w.lastName}`,
      detalle: 'Sin registro de entrega de EPP en legajo',
    })), multaSoles, 7))
  }

  // ─── 7. Sin EsSalud ─────────────────────────────────────
  const sinEssalud = workers.filter(w =>
    !w.documents.some(d => d.documentType === 'essalud_registro' && d.status !== 'MISSING')
  )
  if (sinEssalud.length > 0) {
    const infraccion = findInfraccion('DS019-26.1')!
    const multaSoles = calcularMultaSunafilSoles(tipoEmpresa, 'MUY_GRAVE', sinEssalud.length)
    riesgos.push(buildRiesgo(infraccion, sinEssalud.map(w => ({
      id: w.id,
      nombre: `${w.firstName} ${w.lastName}`,
      detalle: 'Sin constancia de afiliación a EsSalud en legajo',
    })), multaSoles, 9))
  }

  // ─── 8. SCTR vencido ────────────────────────────────────
  const sctrVencidos = workers.filter(w => {
    if (!w.sctr) return false
    const sctrDoc = w.documents.find(d => d.documentType === 'sctr')
    if (!sctrDoc || sctrDoc.status === 'MISSING') return true
    return sctrDoc.expiresAt && new Date(sctrDoc.expiresAt) < now
  })
  if (sctrVencidos.length > 0) {
    const infraccion = findInfraccion('DS019-26.3')!
    const multaSoles = calcularMultaSunafilSoles(tipoEmpresa, 'GRAVE', sctrVencidos.length)
    riesgos.push(buildRiesgo(infraccion, sctrVencidos.map(w => ({
      id: w.id,
      nombre: `${w.firstName} ${w.lastName}`,
      detalle: 'SCTR vencido o sin documentar en legajo',
    })), multaSoles, 8))
  }

  // ─── 9. Sin IPERC ───────────────────────────────────────
  const hasIperc = sstRecords.some(r => r.type === 'IPERC' && r.status === 'COMPLETED')
  if (!hasIperc) {
    const infraccion = findInfraccion('DS019-28.2')!
    const multaSoles = calcularMultaSunafilSoles(tipoEmpresa, 'GRAVE', totalTrabajadores)
    riesgos.push(buildRiesgo(infraccion,
      [{ id: 'org', nombre: 'Organización', detalle: 'Sin Matriz IPERC completada en el sistema' }],
      multaSoles, 8))
  }

  // ─── 10. Sin Comité / Supervisor SST ────────────────────
  const hasComite = sstRecords.some(r => r.type === 'ACTA_COMITE')
  if (!hasComite) {
    const infraccion = findInfraccion('DS019-28.3')!
    const multaSoles = calcularMultaSunafilSoles(tipoEmpresa, 'GRAVE', totalTrabajadores)
    const detalle = totalTrabajadores >= 20
      ? `${totalTrabajadores} trabajadores → Comité SST obligatorio (Ley 29783 Art. 29)`
      : 'Menos de 20 trabajadores → Supervisor SST obligatorio'
    riesgos.push(buildRiesgo(infraccion,
      [{ id: 'org', nombre: 'Organización', detalle }],
      multaSoles, 7))
  }

  // ─── 11. Capacitaciones SST < 4 al año ──────────────────
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const capsAnio = sstRecords.filter(r =>
    r.type === 'CAPACITACION' &&
    r.status === 'COMPLETED' &&
    new Date(r.createdAt) >= yearStart
  ).length
  if (capsAnio < 4) {
    const infraccion = findInfraccion('DS019-28.5')!
    const multaSoles = calcularMultaSunafilSoles(tipoEmpresa, 'GRAVE', totalTrabajadores)
    riesgos.push(buildRiesgo(infraccion,
      [{ id: 'org', nombre: 'Organización', detalle: `${capsAnio} de 4 capacitaciones SST realizadas este año` }],
      multaSoles, 6))
  }

  // ─── 12. Sin canal de denuncias / política hostigamiento ─
  const hasCanal = complaints.length > 0 ||
    sstRecords.some(r => r.type === 'POLITICA_SST' && r.status === 'COMPLETED')
  if (!hasCanal) {
    const infraccion = findInfraccion('DS019-24.13')!
    const multaSoles = calcularMultaSunafilSoles(tipoEmpresa, 'MUY_GRAVE', totalTrabajadores)
    riesgos.push(buildRiesgo(infraccion,
      [{ id: 'org', nombre: 'Organización', detalle: 'Sin política de prevención de hostigamiento sexual documentada' }],
      multaSoles, 8))
  }

  // ─── 13. Cuota discapacidad 3% (≥50 trabajadores) ───────
  if (totalTrabajadores >= 50) {
    const cuotaMinima = Math.ceil(totalTrabajadores * 0.03)
    const conDisc = workers.filter(w =>
      w.documents.some(d => d.documentType === 'certificado_discapacidad' && d.status !== 'MISSING')
    ).length
    if (conDisc < cuotaMinima) {
      const infraccion = findInfraccion('DS019-24.14')!
      const multaSoles = calcularMultaSunafilSoles(tipoEmpresa, 'GRAVE', totalTrabajadores)
      riesgos.push(buildRiesgo(infraccion,
        [{ id: 'org', nombre: 'Organización', detalle: `${conDisc}/${cuotaMinima} trabajadores con discapacidad registrados (mínimo 3%)` }],
        multaSoles, 5))
    }
  }

  // ─── 14. Sin boleta de pago en legajo ───────────────────
  const sinBoleta = workers.filter(w =>
    !w.documents.some(d => d.documentType === 'boleta_pago' && d.status !== 'MISSING')
  )
  if (sinBoleta.length > 0) {
    const infraccion = findInfraccion('DS019-25.3')!
    const multaSoles = calcularMultaSunafilSoles(tipoEmpresa, 'LEVE', sinBoleta.length)
    riesgos.push(buildRiesgo(infraccion, sinBoleta.map(w => ({
      id: w.id,
      nombre: `${w.firstName} ${w.lastName}`,
      detalle: 'Sin boleta de pago registrada en legajo digital',
    })), multaSoles, 5))
  }

  // ─── 15. Contratos plazo fijo sin registro MTPE ──────────
  const sinRegMtpe = workers.filter(w => {
    const tieneModalidad = w.tipoContrato && w.tipoContrato !== 'INDEFINIDO'
    if (!tieneModalidad) return false
    return !w.documents.some(d =>
      d.documentType === 'registro_contrato_mtpe' && d.status !== 'MISSING'
    )
  })
  if (sinRegMtpe.length > 0) {
    const infraccion = findInfraccion('DS019-24.6')!
    const multaSoles = calcularMultaSunafilSoles(tipoEmpresa, 'GRAVE', sinRegMtpe.length)
    riesgos.push(buildRiesgo(infraccion, sinRegMtpe.map(w => ({
      id: w.id,
      nombre: `${w.firstName} ${w.lastName}`,
      detalle: `Contrato ${w.tipoContrato} sin constancia de registro MTPE`,
    })), multaSoles, 7))
  }

  // ─── 16. Ley 30709 — Sin Cuadro de Categorías ───────────
  const scoreIgualdad = diagnostics
    ? ((diagnostics.scoreByArea as Record<string, number>)?.igualdad_nodiscriminacion ?? null)
    : null
  const hasCuadro = sstRecords.some(r => r.type === 'POLITICA_SST' && r.status === 'COMPLETED')
  if (!hasCuadro && (scoreIgualdad === null || scoreIgualdad < 50)) {
    const infraccion = findInfraccion('DS019-24.16')!
    const multaSoles = calcularMultaSunafilSoles(tipoEmpresa, 'GRAVE', totalTrabajadores)
    riesgos.push(buildRiesgo(infraccion,
      [{ id: 'org', nombre: 'Organización', detalle: 'Sin Cuadro de Categorías y Funciones (Ley 30709)' }],
      multaSoles, 5))
  }

  // ──── ORDENAR Y CALCULAR TOTALES ─────────────────────────
  riesgos.sort((a, b) => b.urgencia - a.urgencia || b.multaEstimadaSoles - a.multaEstimadaSoles)

  const totalMultaSoles = riesgos.reduce((s, r) => s + r.multaEstimadaSoles, 0)
  const totalMultaConSubs = riesgos.reduce((s, r) => s + r.multaConSubsanacionSoles, 0)

  return {
    orgId,
    scanDate: now,
    tipoEmpresa,
    totalTrabajadores,
    riesgos,
    totalMultaSoles: Math.round(totalMultaSoles * 100) / 100,
    totalMultaUit: Math.round((totalMultaSoles / UIT_2026) * 100) / 100,
    totalMultaConSubsanacionSoles: Math.round(totalMultaConSubs * 100) / 100,
    ahorroTotalSoles: Math.round((totalMultaSoles - totalMultaConSubs) * 100) / 100,
    resumen: {
      muyGraves: riesgos.filter(r => r.infraccion.severidad === 'MUY_GRAVE').length,
      graves: riesgos.filter(r => r.infraccion.severidad === 'GRAVE').length,
      leves: riesgos.filter(r => r.infraccion.severidad === 'LEVE').length,
      riesgosCriticos: riesgos.filter(r => r.urgencia >= 8),
      areasMasRiesgosas: getAreasMasRiesgosas(riesgos),
    },
  }
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function findInfraccion(codigo: string): InfraccionSunafil | undefined {
  return INFRACCIONES_SUNAFIL.find(i => i.codigo === codigo)
}

function buildRiesgo(
  infraccion: InfraccionSunafil,
  trabajadores: { id: string; nombre: string; detalle: string }[],
  multaSoles: number,
  urgenciaBase: number,
): RiesgoDetectado {
  const descuento = 0.90
  const multaConSubs = Math.round(multaSoles * (1 - descuento) * 100) / 100
  let urgencia = urgenciaBase
  if (infraccion.severidad === 'MUY_GRAVE') urgencia = Math.min(10, urgencia + 1)
  if (infraccion.severidad === 'LEVE') urgencia = Math.max(1, urgencia - 1)

  return {
    infraccion,
    trabajadoresAfectados: trabajadores,
    multaEstimadaSoles: Math.round(multaSoles * 100) / 100,
    multaEstimadaUit: Math.round((multaSoles / UIT_2026) * 100) / 100,
    multaConSubsanacionSoles: multaConSubs,
    ahorroSubsanacion: Math.round((multaSoles - multaConSubs) * 100) / 100,
    accionInmediata: infraccion.subsanacion,
    urgencia,
  }
}

function clasificarEmpresa(total: number, sizeRange?: string | null): TipoEmpresaSunafil {
  if (sizeRange?.includes('1-10') || total <= 10) return 'MICRO'
  if (sizeRange?.includes('11-') || total <= 100) return 'PEQUENA'
  return 'NO_MYPE'
}

function getAreasMasRiesgosas(riesgos: RiesgoDetectado[]): string[] {
  const counts = new Map<string, number>()
  for (const r of riesgos) {
    const cat = r.infraccion.categoria
    counts.set(cat, (counts.get(cat) ?? 0) + r.multaEstimadaSoles)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat)
}
