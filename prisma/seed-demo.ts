/**
 * COMPLY360 — Seed de Datos de Demostración v2
 * 10 empresas peruanas ficticias con ~66 trabajadores c/u = 660 total
 * Uso: npx tsx prisma/seed-demo.ts
 */

import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'
import type { RegimenLaboral, ContractType, WorkerAlertType, TipoContrato } from '../src/generated/prisma/enums.js'

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d }
function monthsAgo(m: number) { const d = new Date(); d.setMonth(d.getMonth() - m); return d }
function futureDays(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d }

const DEMO_ORG_IDS = [
  'demo_org_01','demo_org_02','demo_org_03','demo_org_04','demo_org_05',
  'demo_org_06','demo_org_07','demo_org_08','demo_org_09','demo_org_10',
]

// ── Nombres para generación programática ──────────────────────────────────────
const NM = ['Carlos','Luis','Juan','Pedro','Miguel','Jorge','Manuel','José','Héctor','Roberto',
            'Félix','César','Arturo','Diego','Óscar','Ernesto','Raúl','Víctor','Marcos','Pablo',
            'Andrés','Gonzalo','Eduardo','Ricardo','Alfredo','Enrique','Rodrigo','Gustavo','Alberto','Fernando']
const NF = ['María','Ana','Carmen','Rosa','Lucía','Elena','Patricia','Gloria','Mónica','Sandra',
            'Jessica','Claudia','Paola','Adriana','Vanessa','Gabriela','Mariela','Nilda','Isabel','Carla',
            'Pilar','Teresa','Silvia','Martha','Nadia','Flor','Yolanda','Beatriz','Viviana','Cecilia']
const AP1 = ['García','Mamani','Quispe','Flores','Chávez','Vargas','Torres','Mendoza','Ccallo','Huanca',
             'Condori','Ramos','Apaza','Puma','Turpo','Soto','Callo','Tito','Cusi','Nina',
             'Arenas','Salas','Vega','Luna','Campos','Santos','Díaz','Cruz','Morales','Reyes']
const AP2 = ['Rios','Pérez','López','González','Hernández','Martínez','Rodríguez','Sánchez','Castillo','Romero',
             'Herrera','Medina','Aguilar','Gutiérrez','Ortega','Delgado','Castro','Paredes','Fuentes',
             'Espinoza','Alvarado','Cárdenas','Tapia','Becerra','Palomino','Neyra','Asto','Chura','Surco']
const AFP_LIST = ['Prima AFP','Integra','Habitat','Profuturo']

// ── Posiciones por sector ─────────────────────────────────────────────────────
const POS_TRANSPORTE = ['Conductor A1','Conductor A2','Conductor B2','Mecánico','Técnico Mecánico',
  'Supervisora de Operaciones','Asistente Administrativa','Contadora','Recepcionista','Vigilante',
  'Despachador','Coordinador Logístico','Jefe de Flota','Auxiliar Administrativo','Operador de Almacén',
  'Asistente de Despacho','Técnico Electrónico','Operador de Sistemas','Analista de Rutas','Especialista en Seguridad Vial']
const DEP_TRANSPORTE = ['Operaciones','Administración','Mantenimiento','Seguridad','Logística','Gerencia']

const POS_CONSTRUCCION = ['Operario','Oficial','Peón','Ingeniero Residente','Maestro de Obra','Capataz',
  'Topógrafo','Almacenero','Soldador','Carpintero','Fierrero','Encofrador','Operador de Maquinaria',
  'Técnico Eléctrico','Inspector SST','Arquitecto','Dibujante CAD','Asistente de Ingeniería','Auxiliar Administrativo','Jefe de Almacén']
const DEP_CONSTRUCCION = ['Obras','Administración','Ingeniería','Almacén','SST','Topografía']

const POS_TEXTILES = ['Operaria de Costura','Operario de Tejeduria','Controlador de Calidad','Diseñadora',
  'Supervisora de Planta','Técnico de Mantenimiento','Auxiliar Administrativo','Jefa de Producción',
  'Operaria de Corte','Operaria de Acabados','Almacenero','Mecánico Textil','Asistente de Diseño',
  'Analista de Calidad','Jefe de Almacén','Técnico Colorista','Operaria de Bordado','Auxiliar de Almacén',
  'Coordinadora de Exportaciones','Asistente Contable']
const DEP_TEXTILES = ['Producción','Calidad','Diseño','Administración','Almacén','Exportaciones']

const POS_RESTAURANTE = ['Cocinero','Ayudante de Cocina','Mesero','Cajera','Lavaplatos','Bartender',
  'Jefa de Sala','Chef Ejecutivo','Pastelero','Asistente de Cocina','Hostess','Barista','Almacenero',
  'Asistente Administrativo','Delivery','Supervisora de Turno','Técnico de Mantenimiento','Nutricionista',
  'Jefe de Compras','Auxiliar de Limpieza']
const DEP_RESTAURANTE = ['Cocina','Sala','Caja','Bar','Almacén','Administración']

const POS_TECH = ['Desarrollador Frontend','Desarrollador Backend','Ingeniero DevOps','QA Engineer',
  'Product Manager','Diseñador UX','Analista de Datos','Scrum Master','Arquitecto de Software',
  'Desarrollador Full Stack','Data Scientist','Cloud Engineer','Soporte Técnico','Analista de Sistemas',
  'CTO','CEO','CFO','Community Manager','Especialista en Ciberseguridad','Desarrollador Mobile']
const DEP_TECH = ['Ingeniería','Producto','Datos','DevOps','Diseño','Administración']

const POS_IMPORTACIONES = ['Agente de Aduanas','Coordinador Logístico','Analista de Comercio Exterior',
  'Almacenero','Asistente Administrativo','Jefe de Compras','Analista Financiero','Supervisora de Almacén',
  'Asistente de Despacho','Controlador de Inventario','Técnico Aduanero','Ejecutivo de Ventas',
  'Asistente de Ventas','Contadora','Jefe de Operaciones','Analista de Costos','Auxiliar de Almacén',
  'Especialista en Importaciones','Coordinadora de Exportaciones','Asistente Contable']
const DEP_IMPORTACIONES = ['Aduanas','Logística','Ventas','Almacén','Administración','Finanzas']

const POS_AGRARIO = ['Operario de Cosecha','Operaria de Empaque','Tractorista','Supervisor de Campo',
  'Técnico Agrónomo','Operaria de Riego','Jefe de Planta','Operario Temporada','Ingeniero Agrónomo',
  'Operaria de Selección','Chofer de Distribución','Mecánico Agrícola','Técnico de Riego',
  'Operario de Fumigación','Analista de Laboratorio','Asistente Administrativo','Contadora',
  'Almacenero','Jefe de Campo','Técnico en Sanidad Vegetal']
const DEP_AGRARIO = ['Campo','Planta','Logística','Administración','Laboratorio']

const POS_CLINICA = ['Médico Especialista','Médica General','Enfermera','Técnico en Enfermería',
  'Técnica Laboratorio','Técnico Radiólogo','Recepcionista','Jefe Administrativo','Nutricionista',
  'Personal de Limpieza','Psicólogo','Farmacéutico','Técnico en Farmacia','Asistente Médico',
  'Jefe de Enfermería','Auxiliar de Enfermería','Médico de Turno','Coordinadora de Citas',
  'Técnico en Imagen','Asistente Administrativo']
const DEP_CLINICA = ['Medicina','Enfermería','Laboratorio','Diagnóstico','Farmacia','Administración']

const POS_ACADEMIA = ['Docente TI','Docente Marketing','Docente Diseño','Coordinadora Académica',
  'Soporte TI','Asistente Admin','Practicante Docente','Diseñadora Gráfica','Docente Programación',
  'Docente Gestión','Tutor Virtual','Desarrollador E-learning','Analista Pedagógico',
  'Coordinador de Plataforma','Docente Inglés','Asistente de Diseño','Community Manager',
  'Docente Emprendimiento','Asistente Técnico','Coordinadora de Certificaciones']
const DEP_ACADEMIA = ['Docencia','Administración','TI','Diseño','Coordinación']

const POS_LOGI = ['Repartidor','Repartidora','Atención al Cliente','Técnico de Motos','Coordinador de Rutas',
  'Asistente Administrativo','Supervisora de Operaciones','Analista de Datos','Conductor',
  'Operador de Centro de Distribución','Técnico en Mantenimiento','Auxiliar de Almacén',
  'Jefe de Operaciones','Asistente de Servicio al Cliente','Programador de Rutas']
const DEP_LOGI = ['Operaciones','Administración','Mantenimiento','Gerencia']

// ── Generador programático de trabajadores ────────────────────────────────────
function genWorkersData(
  orgId: string,
  dniBase: number,
  count: number,
  positions: string[],
  departments: string[],
  regimenes: RegimenLaboral[],
  contratos: TipoContrato[],
  sueldoMin: number,
  sueldoMax: number,
) {
  return Array.from({ length: count }, (_, i) => {
    const isFemale = (i * 7 + 3) % 5 < 2
    const firstName = isFemale ? NF[i % NF.length] : NM[i % NM.length]
    const lastName = `${AP1[i % AP1.length]} ${AP2[(i * 3 + 1) % AP2.length]}`
    const tipoAporte: 'ONP' | 'AFP' = (i * 3 + 1) % 3 === 0 ? 'ONP' : 'AFP'
    const regimenLaboral = regimenes[i % regimenes.length]
    const tipoContrato = contratos[i % contratos.length]
    const ingresoOptions = [2, 6, 10, 14, 18, 24, 30, 36, 42, 48, 54, 60]
    const mesesAtras = ingresoOptions[i % ingresoOptions.length]
    const sueldoBruto = Math.round(sueldoMin + ((sueldoMax - sueldoMin) * ((i * 37) % 97)) / 96)
    const jornada = tipoContrato === 'TIEMPO_PARCIAL' ? 24 : 48
    const status: 'ACTIVE' | 'ON_LEAVE' = (i * 11 + 7) % 15 === 0 ? 'ON_LEAVE' : 'ACTIVE'
    return {
      orgId,
      status,
      jornadaSemanal: jornada,
      legajoScore: 55 + (i * 13 % 40),
      dni: String(dniBase + i).padStart(8, '0'),
      firstName,
      lastName,
      position: positions[i % positions.length],
      department: departments[i % departments.length],
      regimenLaboral,
      tipoContrato,
      fechaIngreso: monthsAgo(mesesAtras),
      sueldoBruto,
      tipoAporte,
      ...(tipoAporte === 'AFP' ? { afpNombre: AFP_LIST[i % AFP_LIST.length] } : {}),
      ...(i % 4 === 0 ? { asignacionFamiliar: true } : {}),
    }
  })
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
async function cleanup() {
  console.log('Limpiando datos demo anteriores...')
  const workers = await prisma.worker.findMany({ where: { orgId: { in: DEMO_ORG_IDS } }, select: { id: true } })
  const wids = workers.map(x => x.id)
  if (wids.length > 0) {
    await prisma.attendance.deleteMany({ where: { workerId: { in: wids } } })
    await prisma.vacationRecord.deleteMany({ where: { workerId: { in: wids } } })
    await prisma.workerAlert.deleteMany({ where: { workerId: { in: wids } } })
  }
  await prisma.calculation.deleteMany({ where: { orgId: { in: DEMO_ORG_IDS } } })
  await prisma.sstRecord.deleteMany({ where: { orgId: { in: DEMO_ORG_IDS } } })
  await prisma.complaint.deleteMany({ where: { orgId: { in: DEMO_ORG_IDS } } })
  await prisma.orgAlert.deleteMany({ where: { orgId: { in: DEMO_ORG_IDS } } })
  await prisma.complianceDiagnostic.deleteMany({ where: { orgId: { in: DEMO_ORG_IDS } } })
  await prisma.contract.deleteMany({ where: { orgId: { in: DEMO_ORG_IDS } } })
  await prisma.worker.deleteMany({ where: { orgId: { in: DEMO_ORG_IDS } } })
  await prisma.user.deleteMany({ where: { orgId: { in: DEMO_ORG_IDS } } })
  await prisma.organization.deleteMany({ where: { id: { in: DEMO_ORG_IDS } } })
  console.log('Limpieza completa\n')
}

// ── Helpers para contratos, SST, cálculos, diagnósticos, alertas, denuncias ──
function makeContracts(orgId: string, userId: string, workerCount: number) {
  const types: ContractType[] = [
    'LABORAL_INDEFINIDO','LABORAL_PLAZO_FIJO','LABORAL_TIEMPO_PARCIAL',
    'POLITICA_SST','POLITICA_HOSTIGAMIENTO','REGLAMENTO_INTERNO',
    'CONFIDENCIALIDAD','NO_COMPETENCIA','ADDENDUM','LOCACION_SERVICIOS','CONVENIO_PRACTICAS',
  ]
  const statuses: Array<'DRAFT'|'SIGNED'|'APPROVED'> = ['SIGNED','SIGNED','SIGNED','DRAFT','APPROVED']
  const riskByType: Record<string, number> = {
    LABORAL_INDEFINIDO: 10, LABORAL_PLAZO_FIJO: 28, LABORAL_TIEMPO_PARCIAL: 22,
    POLITICA_SST: 5, POLITICA_HOSTIGAMIENTO: 8, REGLAMENTO_INTERNO: 7,
    CONFIDENCIALIDAD: 15, NO_COMPETENCIA: 35, ADDENDUM: 20,
    LOCACION_SERVICIOS: 45, CONVENIO_PRACTICAS: 18,
  }
  return Array.from({ length: 20 }, (_, i) => {
    const type = types[i % types.length]
    const status = statuses[i % statuses.length]
    const isPF = type === 'LABORAL_PLAZO_FIJO' || type === 'LABORAL_TIEMPO_PARCIAL'
    const baseRisk = riskByType[type] ?? 20
    return {
      orgId,
      createdById: userId,
      type,
      status,
      title: `${type.replace(/_/g,' ')} — Contrato ${i + 1}`,
      ...(status === 'SIGNED' ? { signedAt: monthsAgo(i + 1) } : {}),
      ...(isPF && status !== 'DRAFT' ? { expiresAt: futureDays(30 + i * 10) } : {}),
      aiRiskScore: baseRisk + (i % 5),
    }
  })
}

function makeDiagnostics(orgId: string, count: 2 | 3) {
  const types: Array<'FULL'|'EXPRESS'|'SIMULATION'> = ['FULL','EXPRESS','SIMULATION']
  return Array.from({ length: count }, (_, i) => ({
    orgId,
    type: types[i % 3],
    scoreGlobal: 55 + (i * 13 % 35),
    scoreByArea: {
      planillas: 60 + (i * 7 % 35),
      contratos: 55 + (i * 11 % 35),
      sst: 50 + (i * 9 % 40),
      vacaciones: 65 + (i * 5 % 30),
      gratificaciones: 58 + (i * 8 % 35),
      cts: 52 + (i * 12 % 40),
      hostigamiento: 70 + (i * 4 % 25),
      terceros: 60 + (i * 6 % 30),
    },
    totalMultaRiesgo: (15420 + i * 7710) as unknown as number,
    questionsJson: [],
    gapAnalysis: {
      recomendaciones: [
        'Regularizar registros de asistencia',
        'Actualizar contratos vencidos',
        'Implementar capacitaciones SST',
      ],
    },
    completedAt: daysAgo(10 + i * 15),
  }))
}

function makeSSTRecords(orgId: string) {
  const types = [
    'POLITICA_SST','IPERC','PLAN_ANUAL','CAPACITACION','ACCIDENTE',
    'INCIDENTE','EXAMEN_MEDICO','ENTREGA_EPP','ACTA_COMITE','MAPA_RIESGOS',
  ] as const
  const statuses: Array<'PENDING'|'IN_PROGRESS'|'COMPLETED'|'OVERDUE'> = [
    'COMPLETED','COMPLETED','IN_PROGRESS','PENDING','OVERDUE',
  ]
  return Array.from({ length: 3 }, (_, i) => ({
    orgId,
    type: types[i % types.length],
    title: `${types[i % types.length].replace(/_/g,' ')} — Registro ${i + 1}`,
    description: `Registro de ${types[i % types.length].replace(/_/g,' ')} para el período vigente`,
    data: { periodo: '2025', observaciones: 'Cumplido según cronograma' },
    status: statuses[i % statuses.length],
    ...(statuses[i % statuses.length] === 'COMPLETED' ? { completedAt: daysAgo(15 + i * 10) } : {}),
  }))
}

function makeCalculations(orgId: string, userId: string, workerIds: string[]) {
  const types: Array<'CTS'|'GRATIFICACION'|'VACACIONES'|'LIQUIDACION'> = [
    'CTS','GRATIFICACION','VACACIONES','LIQUIDACION',
  ]
  return types.map((type, i) => ({
    orgId,
    userId,
    type,
    inputsJson: { workerId: workerIds[i % workerIds.length], periodo: '2025-I', sueldo: 2500 + i * 500 },
    resultJson: { monto: 1250 + i * 250, detalle: `Cálculo ${type} generado automáticamente` },
    totalAmount: (1250 + i * 250) as unknown as number,
  }))
}

function makeAlerts(orgId: string, workerIds: string[]) {
  const alertTypes: WorkerAlertType[] = [
    'CONTRATO_POR_VENCER','CTS_PENDIENTE','DOCUMENTO_FALTANTE','REGISTRO_INCOMPLETO','VACACIONES_ACUMULADAS',
  ]
  const severities: Array<'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'> = ['HIGH','MEDIUM','LOW','CRITICAL','MEDIUM']
  return Array.from({ length: 3 }, (_, i) => ({
    workerId: workerIds[i % workerIds.length],
    orgId,
    type: alertTypes[i % alertTypes.length],
    severity: severities[i % severities.length],
    title: `Alerta: ${alertTypes[i % alertTypes.length].replace(/_/g,' ')}`,
    description: `Se requiere atención para ${alertTypes[i % alertTypes.length].replace(/_/g,' ').toLowerCase()}`,
    dueDate: futureDays(7 + i * 5),
  }))
}

function makeComplaints(orgId: string, orgNum: string, seq: number) {
  const types: Array<'HOSTIGAMIENTO_SEXUAL'|'DISCRIMINACION'|'ACOSO_LABORAL'|'OTRO'> = [
    'HOSTIGAMIENTO_SEXUAL','DISCRIMINACION','ACOSO_LABORAL','OTRO',
  ]
  const statuses: Array<'RECEIVED'|'UNDER_REVIEW'|'INVESTIGATING'|'RESOLVED'> = [
    'RESOLVED','UNDER_REVIEW','RECEIVED','RESOLVED',
  ]
  return Array.from({ length: 1 }, (_, i) => ({
    orgId,
    code: `DEN-${orgNum}-2025-${String(seq + i).padStart(3, '0')}`,
    type: types[seq % types.length],
    description: `Denuncia de ${types[seq % types.length].replace(/_/g,' ').toLowerCase()} recibida por el área de RRHH`,
    status: statuses[seq % statuses.length],
    isAnonymous: seq % 2 === 0,
  }))
}

function makeVacationRecords(workerIds: string[]) {
  return Array.from({ length: 1 }, (_, i) => ({
    workerId: workerIds[i % workerIds.length],
    periodoInicio: monthsAgo(14),
    periodoFin: monthsAgo(2),
    diasCorresponden: 30,
    diasGozados: 15,
    diasPendientes: 15,
    fechaGoce: daysAgo(30),
  }))
}

// ── Helper para crear workers y obtener IDs ───────────────────────────────────
async function seedOrg(params: {
  orgId: string
  orgNum: string
  name: string
  ruc: string
  razonSocial: string
  sector: string
  sizeRange: string
  plan: string
  regimenPrincipal: string
  alertEmail: string
  userId: string
  userClerkId: string
  userEmail: string
  userFirst: string
  userLast: string
  dniBase: number
  count: number
  positions: string[]
  departments: string[]
  regimenes: RegimenLaboral[]
  contratos: TipoContrato[]
  sueldoMin: number
  sueldoMax: number
  diagCount: 2 | 3
  complaintSeq: number
}) {
  const {
    orgId, orgNum, name, ruc, razonSocial, sector, sizeRange, plan, regimenPrincipal,
    alertEmail, userId, userClerkId, userEmail, userFirst, userLast,
    dniBase, count, positions, departments, regimenes, contratos,
    sueldoMin, sueldoMax, diagCount, complaintSeq,
  } = params

  console.log(`[${orgNum}/10] ${name}...`)

  const org = await prisma.organization.create({
    data: { id: orgId, name, ruc, razonSocial, sector, sizeRange, plan: plan as 'FREE'|'STARTER'|'PRO'|'EMPRESA', regimenPrincipal, onboardingCompleted: true, alertEmail },
  })
  const user = await prisma.user.create({
    data: { id: userId, clerkId: userClerkId, orgId: org.id, email: userEmail, firstName: userFirst, lastName: userLast, role: 'OWNER' },
  })

  const workersData = genWorkersData(org.id, dniBase, count, positions, departments, regimenes, contratos, sueldoMin, sueldoMax)
  await prisma.worker.createMany({ data: workersData })
  const workerIds = (await prisma.worker.findMany({
    where: { orgId: org.id, dni: { in: workersData.map(w => w.dni) } },
    select: { id: true },
    orderBy: { dni: 'asc' },
  })).map(w => w.id)

  // Asistencia: primeros 8 workers, 5 días = 40 registros
  const attData = workerIds.slice(0, 8).flatMap((wId, wi) =>
    Array.from({ length: 5 }, (_, di) => {
      const base = daysAgo(di + 1)
      const ci = new Date(base); ci.setHours(8 + (wi % 2), (wi * 7) % 30, 0, 0)
      const co = new Date(ci); co.setHours(17 + (wi % 2), (di * 11) % 30, 0, 0)
      return {
        orgId: org.id,
        workerId: wId,
        clockIn: ci,
        clockOut: co,
        hoursWorked: 9,
        status: (di === 1 && wi === 3 ? 'LATE' : 'PRESENT') as 'PRESENT'|'LATE'|'ABSENT',
      }
    })
  )
  await prisma.attendance.createMany({ data: attData })

  // Contratos
  await prisma.contract.createMany({ data: makeContracts(org.id, user.id, count) })

  // Diagnósticos
  const diagData = makeDiagnostics(org.id, diagCount)
  for (const d of diagData) {
    await prisma.complianceDiagnostic.create({ data: d })
  }

  // SST Records
  await prisma.sstRecord.createMany({ data: makeSSTRecords(org.id) })

  // Cálculos
  await prisma.calculation.createMany({ data: makeCalculations(org.id, user.id, workerIds) })

  // Alertas de trabajador
  await prisma.workerAlert.createMany({ data: makeAlerts(org.id, workerIds) })

  // Denuncias
  await prisma.complaint.createMany({ data: makeComplaints(org.id, orgNum, complaintSeq) })

  // Vacaciones
  await prisma.vacationRecord.createMany({ data: makeVacationRecords(workerIds) })

  console.log(`   OK: ${count} trabajadores, ${attData.length} asistencias, 20 contratos, ${diagCount} diagnósticos`)
  return { org, user, workerIds }
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\nCOMPLY360 — Seed de demostración v2 iniciando...\n')
  await cleanup()

  // ── org01: Transportes Lima Norte SAC
  await seedOrg({
    orgId: 'demo_org_01', orgNum: '01',
    name: 'Transportes Lima Norte SAC',
    ruc: '20601234567', razonSocial: 'TRANSPORTES LIMA NORTE SOCIEDAD ANONIMA CERRADA',
    sector: 'Transporte y Logística', sizeRange: '51-200',
    plan: 'EMPRESA', regimenPrincipal: 'GENERAL',
    alertEmail: 'rrhh@translimanorte.pe',
    userId: 'demo_u_01', userClerkId: 'user_demo_01',
    userEmail: 'admin@translimanorte.pe', userFirst: 'Roberto', userLast: 'Palomino Quispe',
    dniBase: 10100001, count: 66,
    positions: POS_TRANSPORTE, departments: DEP_TRANSPORTE,
    regimenes: ['GENERAL','GENERAL','GENERAL','GENERAL','TELETRABAJO'],
    contratos: ['INDEFINIDO','INDEFINIDO','INDEFINIDO','PLAZO_FIJO','PLAZO_FIJO','TIEMPO_PARCIAL','NECESIDAD_MERCADO'],
    sueldoMin: 1130, sueldoMax: 12000,
    diagCount: 3, complaintSeq: 1,
  })

  // ── org02: Constructora Edificar Perú SAC
  await seedOrg({
    orgId: 'demo_org_02', orgNum: '02',
    name: 'Constructora Edificar Perú SAC',
    ruc: '20602345678', razonSocial: 'CONSTRUCTORA EDIFICAR PERU SOCIEDAD ANONIMA CERRADA',
    sector: 'Construcción', sizeRange: '51-200',
    plan: 'EMPRESA', regimenPrincipal: 'GENERAL',
    alertEmail: 'rrhh@edificarperu.pe',
    userId: 'demo_u_02', userClerkId: 'user_demo_02',
    userEmail: 'admin@edificarperu.pe', userFirst: 'Carmen', userLast: 'Huanca Flores',
    dniBase: 10200001, count: 66,
    positions: POS_CONSTRUCCION, departments: DEP_CONSTRUCCION,
    regimenes: ['CONSTRUCCION_CIVIL','CONSTRUCCION_CIVIL','CONSTRUCCION_CIVIL','GENERAL'],
    contratos: ['INDEFINIDO','INDEFINIDO','PLAZO_FIJO','PLAZO_FIJO','NECESIDAD_MERCADO','TIEMPO_PARCIAL'],
    sueldoMin: 1200, sueldoMax: 8000,
    diagCount: 3, complaintSeq: 2,
  })

  // ── org03: Textiles Andinos EIRL
  await seedOrg({
    orgId: 'demo_org_03', orgNum: '03',
    name: 'Textiles Andinos EIRL',
    ruc: '20603456789', razonSocial: 'TEXTILES ANDINOS EMPRESA INDIVIDUAL DE RESPONSABILIDAD LIMITADA',
    sector: 'Manufactura Textil', sizeRange: '11-50',
    plan: 'STARTER', regimenPrincipal: 'MYPE_PEQUENA',
    alertEmail: 'rrhh@textilesandinos.pe',
    userId: 'demo_u_03', userClerkId: 'user_demo_03',
    userEmail: 'admin@textilesandinos.pe', userFirst: 'Miriam', userLast: 'Condori Apaza',
    dniBase: 10300001, count: 66,
    positions: POS_TEXTILES, departments: DEP_TEXTILES,
    regimenes: ['MYPE_PEQUENA','MYPE_PEQUENA','MYPE_PEQUENA','GENERAL'],
    contratos: ['INDEFINIDO','INDEFINIDO','PLAZO_FIJO','TIEMPO_PARCIAL'],
    sueldoMin: 1130, sueldoMax: 5500,
    diagCount: 2, complaintSeq: 3,
  })

  // ── org04: Restaurante La Tradición SRL
  await seedOrg({
    orgId: 'demo_org_04', orgNum: '04',
    name: 'Restaurante La Tradición SRL',
    ruc: '20604567890', razonSocial: 'RESTAURANTE LA TRADICION SOCIEDAD COMERCIAL DE RESPONSABILIDAD LIMITADA',
    sector: 'Restaurantes y Gastronomía', sizeRange: '1-10',
    plan: 'STARTER', regimenPrincipal: 'MYPE_MICRO',
    alertEmail: 'admin@latradicion.pe',
    userId: 'demo_u_04', userClerkId: 'user_demo_04',
    userEmail: 'admin@latradicion.pe', userFirst: 'Jorge', userLast: 'Salas Medina',
    dniBase: 10400001, count: 66,
    positions: POS_RESTAURANTE, departments: DEP_RESTAURANTE,
    regimenes: ['MYPE_MICRO','MYPE_MICRO','MYPE_MICRO','MYPE_PEQUENA'],
    contratos: ['INDEFINIDO','INDEFINIDO','PLAZO_FIJO','TIEMPO_PARCIAL','TIEMPO_PARCIAL'],
    sueldoMin: 1130, sueldoMax: 4500,
    diagCount: 2, complaintSeq: 4,
  })

  // ── org05: TechPeru Soluciones SAC
  await seedOrg({
    orgId: 'demo_org_05', orgNum: '05',
    name: 'TechPeru Soluciones SAC',
    ruc: '20605678901', razonSocial: 'TECHPERU SOLUCIONES SOCIEDAD ANONIMA CERRADA',
    sector: 'Tecnología y Software', sizeRange: '11-50',
    plan: 'PRO', regimenPrincipal: 'GENERAL',
    alertEmail: 'people@techperu.pe',
    userId: 'demo_u_05', userClerkId: 'user_demo_05',
    userEmail: 'admin@techperu.pe', userFirst: 'Andrés', userLast: 'Vega Castillo',
    dniBase: 10500001, count: 66,
    positions: POS_TECH, departments: DEP_TECH,
    regimenes: ['GENERAL','GENERAL','TELETRABAJO','TELETRABAJO'],
    contratos: ['INDEFINIDO','INDEFINIDO','INDEFINIDO','PLAZO_FIJO'],
    sueldoMin: 2500, sueldoMax: 18000,
    diagCount: 3, complaintSeq: 5,
  })

  // ── org06: Importaciones Global Peru SAC
  await seedOrg({
    orgId: 'demo_org_06', orgNum: '06',
    name: 'Importaciones Global Peru SAC',
    ruc: '20606789012', razonSocial: 'IMPORTACIONES GLOBAL PERU SOCIEDAD ANONIMA CERRADA',
    sector: 'Comercio Exterior', sizeRange: '11-50',
    plan: 'EMPRESA', regimenPrincipal: 'GENERAL',
    alertEmail: 'rrhh@importglobalperu.pe',
    userId: 'demo_u_06', userClerkId: 'user_demo_06',
    userEmail: 'admin@importglobalperu.pe', userFirst: 'Cecilia', userLast: 'Luna Espinoza',
    dniBase: 10600001, count: 66,
    positions: POS_IMPORTACIONES, departments: DEP_IMPORTACIONES,
    regimenes: ['GENERAL','GENERAL','GENERAL'],
    contratos: ['INDEFINIDO','INDEFINIDO','PLAZO_FIJO','PLAZO_FIJO','TIEMPO_PARCIAL'],
    sueldoMin: 1130, sueldoMax: 9000,
    diagCount: 2, complaintSeq: 6,
  })

  // ── org07: Agroindustrias del Sur SAC
  await seedOrg({
    orgId: 'demo_org_07', orgNum: '07',
    name: 'Agroindustrias del Sur SAC',
    ruc: '20607890123', razonSocial: 'AGROINDUSTRIAS DEL SUR SOCIEDAD ANONIMA CERRADA',
    sector: 'Agroindustria', sizeRange: '51-200',
    plan: 'EMPRESA', regimenPrincipal: 'AGRARIO',
    alertEmail: 'rrhh@agroindustriassur.pe',
    userId: 'demo_u_07', userClerkId: 'user_demo_07',
    userEmail: 'admin@agroindustriassur.pe', userFirst: 'Manuel', userLast: 'Quispe Turpo',
    dniBase: 10700001, count: 66,
    positions: POS_AGRARIO, departments: DEP_AGRARIO,
    regimenes: ['AGRARIO','AGRARIO','AGRARIO','AGRARIO','GENERAL'],
    contratos: ['INDEFINIDO','INDEFINIDO','PLAZO_FIJO','INTERMITENTE','EXPORTACION'],
    sueldoMin: 1130, sueldoMax: 7500,
    diagCount: 3, complaintSeq: 7,
  })

  // ── org08: Clínica Salud Integral SAC
  await seedOrg({
    orgId: 'demo_org_08', orgNum: '08',
    name: 'Clínica Salud Integral SAC',
    ruc: '20608901234', razonSocial: 'CLINICA SALUD INTEGRAL SOCIEDAD ANONIMA CERRADA',
    sector: 'Salud y Clínicas', sizeRange: '51-200',
    plan: 'EMPRESA', regimenPrincipal: 'GENERAL',
    alertEmail: 'rrhh@clinicasaludintegral.pe',
    userId: 'demo_u_08', userClerkId: 'user_demo_08',
    userEmail: 'admin@clinicasaludintegral.pe', userFirst: 'Patricia', userLast: 'Torres García',
    dniBase: 10800001, count: 66,
    positions: POS_CLINICA, departments: DEP_CLINICA,
    regimenes: ['GENERAL','GENERAL','GENERAL'],
    contratos: ['INDEFINIDO','INDEFINIDO','INDEFINIDO','PLAZO_FIJO','TIEMPO_PARCIAL'],
    sueldoMin: 1100, sueldoMax: 18000,
    diagCount: 3, complaintSeq: 8,
  })

  // ── org09: Academia Digital Peru SRL
  await seedOrg({
    orgId: 'demo_org_09', orgNum: '09',
    name: 'Academia Digital Peru SRL',
    ruc: '20609012345', razonSocial: 'ACADEMIA DIGITAL PERU SOCIEDAD COMERCIAL DE RESPONSABILIDAD LIMITADA',
    sector: 'Educación y Capacitación', sizeRange: '1-10',
    plan: 'STARTER', regimenPrincipal: 'MYPE_MICRO',
    alertEmail: 'admin@academiadigitalperu.pe',
    userId: 'demo_u_09', userClerkId: 'user_demo_09',
    userEmail: 'admin@academiadigitalperu.pe', userFirst: 'Gabriela', userLast: 'Santos Cruz',
    dniBase: 10900001, count: 66,
    positions: POS_ACADEMIA, departments: DEP_ACADEMIA,
    regimenes: ['MYPE_MICRO','MYPE_MICRO','TELETRABAJO','MODALIDAD_FORMATIVA'],
    contratos: ['INDEFINIDO','PLAZO_FIJO','TIEMPO_PARCIAL','TIEMPO_PARCIAL'],
    sueldoMin: 600, sueldoMax: 5500,
    diagCount: 2, complaintSeq: 9,
  })

  // ── org10: LogiExpress Peru SAC
  await seedOrg({
    orgId: 'demo_org_10', orgNum: '10',
    name: 'LogiExpress Peru SAC',
    ruc: '20610123456', razonSocial: 'LOGIEXPRESS PERU SOCIEDAD ANONIMA CERRADA',
    sector: 'Logística y Delivery', sizeRange: '1-10',
    plan: 'FREE', regimenPrincipal: 'MYPE_MICRO',
    alertEmail: 'ops@logiexpressperu.pe',
    userId: 'demo_u_10', userClerkId: 'user_demo_10',
    userEmail: 'admin@logiexpressperu.pe', userFirst: 'Ricardo', userLast: 'Flores Romero',
    dniBase: 11000001, count: 66,
    positions: POS_LOGI, departments: DEP_LOGI,
    regimenes: ['MYPE_MICRO','MYPE_MICRO','MYPE_MICRO'],
    contratos: ['INDEFINIDO','INDEFINIDO','PLAZO_FIJO','TIEMPO_PARCIAL'],
    sueldoMin: 700, sueldoMax: 3500,
    diagCount: 2, complaintSeq: 10,
  })

  console.log('\n=============================================')
  console.log('COMPLY360 Seed completado exitosamente')
  console.log('Total trabajadores: 660 (66 por empresa)')
  console.log('Total empresas: 10')
  console.log('=============================================\n')
}

main()
  .catch(e => { console.error('Error en seed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
