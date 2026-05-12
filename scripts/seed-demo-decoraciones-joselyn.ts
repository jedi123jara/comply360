/**
 * Seed idempotente de DECORACIONES JOSELYN E.I.R.L. para QA/demo Comply360.
 *
 * Lee el ZIP generado para la demo y lo carga en una organización aislada:
 * - Organization + Subscription
 * - Workers + dependientes + vacaciones
 * - 74 payslips desde _calculos.json
 * - Metadata de legajos desde la estructura del ZIP
 * - Alertas operativas y señales SST mínimas
 *
 * Uso:
 *   ALLOW_PRODUCTION_DEMO_SEED=1 npx tsx scripts/seed-demo-decoraciones-joselyn.ts --zip ./demo-data/comply360-demo-decoraciones-joselyn.zip
 */

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { config as loadEnv } from 'dotenv'
import JSZip from 'jszip'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

if (existsSync('.env.production.local')) {
  loadEnv({ path: '.env.production.local', override: true })
} else {
  loadEnv()
}

const DEMO_ORG_ID = 'org_demo_decoraciones_joselyn'
const DEMO_RUC = process.env.DEMO_DECORACIONES_RUC ?? '20999999991'
const DEMO_ORG_PROFILE = {
  alertEmail: process.env.DEMO_DECORACIONES_ALERT_EMAIL ?? 'demo.decoraciones@comply360.pe',
  phone: process.env.DEMO_DECORACIONES_PHONE ?? '900 000 000',
  address: process.env.DEMO_DECORACIONES_ADDRESS ?? 'Direccion demo',
  city: process.env.DEMO_DECORACIONES_CITY ?? 'La Libertad',
  province: process.env.DEMO_DECORACIONES_PROVINCE ?? 'Trujillo',
  district: process.env.DEMO_DECORACIONES_DISTRICT ?? 'La Esperanza',
  repNombre: process.env.DEMO_DECORACIONES_REP_NOMBRE ?? 'Representante Demo',
  repDni: process.env.DEMO_DECORACIONES_REP_DNI ?? '00000000',
  repCargo: process.env.DEMO_DECORACIONES_REP_CARGO ?? 'Titular-Gerente',
  contNombre: process.env.DEMO_DECORACIONES_CONT_NOMBRE ?? 'Contador Demo',
  contCpc: process.env.DEMO_DECORACIONES_CONT_CPC ?? '0000',
}

type CalcRow = {
  periodo: { key: string; mes: number; anio: number }
  trabajador: {
    id: string
    dni: string
    apellidoPaterno: string
    apellidoMaterno: string
    nombres: string
    nombreCompleto: string
    fechaNacimiento?: string
    sexo?: string
    direccion?: string
    distrito?: string
    provincia?: string
    departamento?: string
    telefono?: string
    email?: string
    cargo: string
    area: string
    sueldo: number
    fechaIngreso: string
    tipoContrato: string
    afp?: string
    cuspp?: string | null
    cargas?: number
    hijos?: Array<{ nombre: string; fechaNac: string; dni: string }>
    asignacionFamiliar?: boolean
    sctr?: boolean
    nivelEducativo?: string
    fechaCese?: string
    causaCese?: string
  }
  calc: {
    ingresos: {
      sueldoBase: number
      asigFamiliar: number
      horasExtras25: number
      horasExtras35: number
      comisiones: number
      bonos: number
      grati: number
      bonoExtraordinario: number
      totalIngresos: number
    }
    descuentos: {
      aporteAFP: number
      comisionAFP: number
      primaAFP: number
      ONP: number
      renta5ta: number
      adelantos: number
      descuentosOtros: number
      descuentoTardanzas: number
      descuentoFaltas: number
      totalDescuentos: number
    }
    aportePatronal: {
      essalud: number
      sctrPension: number
      sctrSalud: number
    }
    netoPagar: number
  }
  incid?: Record<string, number>
}

function argValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name)
  return idx >= 0 ? process.argv[idx + 1] : undefined
}

function requireConnString(): string {
  const connString = process.env.DIRECT_URL ?? process.env.DATABASE_URL
  if (!connString) {
    throw new Error('Falta DIRECT_URL o DATABASE_URL.')
  }

  const isLocal = /localhost|127\.0\.0\.1/.test(connString)
  if (!isLocal && process.env.ALLOW_PRODUCTION_DEMO_SEED !== '1') {
    throw new Error('La DB no parece local. Define ALLOW_PRODUCTION_DEMO_SEED=1 para cargar la demo conscientemente.')
  }

  return connString
}

function parseDmy(value?: string): Date | null {
  if (!value) return null
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12, 0, 0))
}

function mapContract(value: string): 'INDEFINIDO' | 'PLAZO_FIJO' {
  return value.includes('INDEFINIDO') ? 'INDEFINIDO' : 'PLAZO_FIJO'
}

function pension(value?: string): { tipoAporte: 'AFP' | 'ONP'; afpNombre: string | null } {
  const raw = (value ?? '').toUpperCase()
  if (raw.includes('ONP')) return { tipoAporte: 'ONP', afpNombre: null }
  const afpNombre =
    raw.includes('INTEGRA') ? 'Integra' :
    raw.includes('PRIMA') ? 'Prima' :
    raw.includes('PROFUTURO') ? 'Profuturo' :
    raw.includes('HABITAT') ? 'Habitat' :
    null
  return { tipoAporte: 'AFP', afpNombre }
}

function money(value: unknown): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

function mimeFromPath(path: string): string {
  if (path.endsWith('.pdf')) return 'application/pdf'
  if (path.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (path.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (path.endsWith('.svg')) return 'image/svg+xml'
  if (path.endsWith('.txt')) return 'text/plain'
  return 'application/octet-stream'
}

function categoryFromPath(path: string): 'INGRESO' | 'VIGENTE' | 'SST' | 'PREVISIONAL' | 'CESE' {
  if (path.includes('/01_Ingreso/')) return 'INGRESO'
  if (path.includes('/02_Vigente/')) return 'VIGENTE'
  if (path.includes('/03_Boletas/')) return 'VIGENTE'
  if (path.includes('/04_SST/')) return 'SST'
  if (path.includes('/05_Previsional/')) return 'PREVISIONAL'
  return 'CESE'
}

async function loadCalcRows(zip: JSZip): Promise<CalcRow[]> {
  const entry = zip.file('output/04_PLANILLAS/_calculos.json')
  if (!entry) throw new Error('No se encontró output/04_PLANILLAS/_calculos.json en el ZIP.')
  return JSON.parse(await entry.async('string')) as CalcRow[]
}

function uniqueWorkers(rows: CalcRow[]): CalcRow['trabajador'][] {
  const map = new Map<string, CalcRow['trabajador']>()
  for (const row of rows) {
    if (!map.has(row.trabajador.dni)) map.set(row.trabajador.dni, row.trabajador)
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id))
}

async function main() {
  const zipPath = argValue('--zip') ?? process.env.DEMO_DECORACIONES_ZIP_PATH
  const connString = requireConnString()

  if (!zipPath) {
    throw new Error('Indica --zip o DEMO_DECORACIONES_ZIP_PATH para cargar la demo.')
  }

  if (!existsSync(zipPath)) {
    throw new Error(`No existe el ZIP: ${zipPath}`)
  }

  const pool = new pg.Pool({
    connectionString: connString,
    ssl: /supabase|pooler|amazonaws/.test(connString) ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 15_000,
  })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  try {
    const zip = await JSZip.loadAsync(await readFile(zipPath))
    const calcRows = await loadCalcRows(zip)
    const workersSeed = uniqueWorkers(calcRows)

    const org = await prisma.organization.upsert({
      where: { id: DEMO_ORG_ID },
      update: {
        name: 'Decoraciones Joselyn Demo',
        razonSocial: 'DECORACIONES JOSELYN E.I.R.L. (DEMO)',
        nombreComercial: 'Decoraciones Joselyn',
        ruc: DEMO_RUC,
        sector: 'Textil y confecciones',
        sizeRange: '11-50',
        plan: 'ENTERPRISE',
        onboardingCompleted: true,
        regimenPrincipal: 'GENERAL',
        regimenTributario: 'RER',
        ...DEMO_ORG_PROFILE,
        ciiu: '1392',
        ubigeo: '130103',
        totalWorkersDeclared: 25,
        totalWorkersDeclaredAt: new Date(),
        remypeRegistered: true,
      },
      create: {
        id: DEMO_ORG_ID,
        name: 'Decoraciones Joselyn Demo',
        razonSocial: 'DECORACIONES JOSELYN E.I.R.L. (DEMO)',
        nombreComercial: 'Decoraciones Joselyn',
        ruc: DEMO_RUC,
        sector: 'Textil y confecciones',
        sizeRange: '11-50',
        plan: 'ENTERPRISE',
        onboardingCompleted: true,
        regimenPrincipal: 'GENERAL',
        regimenTributario: 'RER',
        ...DEMO_ORG_PROFILE,
        ciiu: '1392',
        ubigeo: '130103',
        totalWorkersDeclared: 25,
        totalWorkersDeclaredAt: new Date(),
        remypeRegistered: true,
      },
    })

    await prisma.subscription.upsert({
      where: { orgId: org.id },
      update: {
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
        currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2027-05-01T00:00:00.000Z'),
      },
      create: {
        orgId: org.id,
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
        currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2027-05-01T00:00:00.000Z'),
      },
    })

    const oldWorkers = await prisma.worker.findMany({
      where: { orgId: org.id },
      select: { id: true },
    })
    const oldWorkerIds = oldWorkers.map(w => w.id)

    await prisma.documentAcknowledgment.deleteMany({ where: { orgId: org.id } })
    await prisma.workerRequest.deleteMany({ where: { orgId: org.id } })
    await prisma.payslip.deleteMany({ where: { orgId: org.id } })
    await prisma.attendance.deleteMany({ where: { orgId: org.id } })
    await prisma.workerAlert.deleteMany({ where: { orgId: org.id } })
    await prisma.workerDependent.deleteMany({ where: { orgId: org.id } })
    await prisma.eMO.deleteMany({ where: { orgId: org.id } })
    await prisma.accidente.deleteMany({ where: { orgId: org.id } })
    await prisma.iPERCBase.deleteMany({ where: { orgId: org.id } })
    await prisma.puestoTrabajo.deleteMany({ where: { orgId: org.id } })
    await prisma.comiteSST.deleteMany({ where: { orgId: org.id } })
    await prisma.sede.deleteMany({ where: { orgId: org.id } })
    await prisma.orgDocument.deleteMany({ where: { orgId: org.id } })
    await prisma.orgTemplate.deleteMany({ where: { orgId: org.id } })
    if (oldWorkerIds.length > 0) {
      await prisma.workerDocument.deleteMany({ where: { workerId: { in: oldWorkerIds } } })
      await prisma.vacationRecord.deleteMany({ where: { workerId: { in: oldWorkerIds } } })
    }

    const workersBySeedId = new Map<string, { id: string; dni: string }>()
    const workersByDni = new Map<string, { id: string; seedId: string }>()

    for (const seed of workersSeed) {
      const p = pension(seed.afp)
      const fechaIngreso = parseDmy(seed.fechaIngreso) ?? new Date('2025-01-01T12:00:00.000Z')
      const fechaCese = parseDmy(seed.fechaCese)
      const status = seed.id === 'T025' ? 'TERMINATED' : 'ACTIVE'
      const worker = await prisma.worker.upsert({
        where: { orgId_dni: { orgId: org.id, dni: seed.dni } },
        update: {
          firstName: seed.nombres,
          lastName: `${seed.apellidoPaterno} ${seed.apellidoMaterno}`.trim(),
          email: seed.email ?? null,
          phone: seed.telefono ?? null,
          birthDate: parseDmy(seed.fechaNacimiento),
          gender: seed.sexo ?? null,
          address: [seed.direccion, seed.distrito, seed.provincia, seed.departamento].filter(Boolean).join(', '),
          position: seed.cargo,
          department: seed.area,
          regimenLaboral: 'GENERAL',
          tipoContrato: mapContract(seed.tipoContrato),
          fechaIngreso,
          fechaCese,
          motivoCese: seed.causaCese ?? null,
          sueldoBruto: seed.sueldo,
          asignacionFamiliar: Boolean(seed.asignacionFamiliar),
          tipoAporte: p.tipoAporte,
          afpNombre: p.afpNombre,
          cuspp: seed.cuspp ?? null,
          sctr: Boolean(seed.sctr),
          sctrRiesgoNivel: seed.sctr ? 'MEDIO' : null,
          nivelEducativo: seed.nivelEducativo ?? null,
          status,
          legajoScore: seed.sctr ? 82 : 74,
          flagTRegistroPresentado: true,
          flagTRegistroFecha: fechaIngreso,
        },
        create: {
          orgId: org.id,
          dni: seed.dni,
          firstName: seed.nombres,
          lastName: `${seed.apellidoPaterno} ${seed.apellidoMaterno}`.trim(),
          email: seed.email ?? null,
          phone: seed.telefono ?? null,
          birthDate: parseDmy(seed.fechaNacimiento),
          gender: seed.sexo ?? null,
          address: [seed.direccion, seed.distrito, seed.provincia, seed.departamento].filter(Boolean).join(', '),
          position: seed.cargo,
          department: seed.area,
          regimenLaboral: 'GENERAL',
          tipoContrato: mapContract(seed.tipoContrato),
          fechaIngreso,
          fechaCese,
          motivoCese: seed.causaCese ?? null,
          sueldoBruto: seed.sueldo,
          asignacionFamiliar: Boolean(seed.asignacionFamiliar),
          tipoAporte: p.tipoAporte,
          afpNombre: p.afpNombre,
          cuspp: seed.cuspp ?? null,
          sctr: Boolean(seed.sctr),
          sctrRiesgoNivel: seed.sctr ? 'MEDIO' : null,
          nivelEducativo: seed.nivelEducativo ?? null,
          status,
          legajoScore: seed.sctr ? 82 : 74,
          flagTRegistroPresentado: true,
          flagTRegistroFecha: fechaIngreso,
        },
        select: { id: true, dni: true },
      })
      workersBySeedId.set(seed.id, worker)
      workersByDni.set(seed.dni, { id: worker.id, seedId: seed.id })

      const periodoInicio = new Date(Date.UTC(fechaIngreso.getUTCFullYear(), fechaIngreso.getUTCMonth(), fechaIngreso.getUTCDate(), 12))
      const periodoFin = new Date(Date.UTC(fechaIngreso.getUTCFullYear() + 1, fechaIngreso.getUTCMonth(), fechaIngreso.getUTCDate() - 1, 12))
      const isOld = fechaIngreso < new Date('2025-05-01T00:00:00.000Z')
      await prisma.vacationRecord.create({
        data: {
          workerId: worker.id,
          periodoInicio,
          periodoFin,
          diasCorresponden: 30,
          diasGozados: isOld ? 0 : 6,
          diasPendientes: isOld ? 30 : 24,
          esDoble: isOld,
        },
      })

      for (const child of seed.hijos ?? []) {
        const birthDate = parseDmy(child.fechaNac)
        if (!birthDate) continue
        await prisma.workerDependent.create({
          data: {
            workerId: worker.id,
            orgId: org.id,
            relacion: 'HIJO',
            documentoNum: child.dni,
            fullName: child.nombre,
            birthDate,
            esBeneficiarioAsigFam: Boolean(seed.asignacionFamiliar),
            verifiedAt: new Date('2026-05-06T12:00:00.000Z'),
            notas: 'Dependiente cargado desde dataset demo Decoraciones Joselyn.',
          },
        })
      }
    }

    for (const row of calcRows) {
      const worker = workersByDni.get(row.trabajador.dni)
      if (!worker) continue
      const ingresos = row.calc.ingresos
      const descuentos = row.calc.descuentos
      const periodo = row.periodo.key
      await prisma.payslip.upsert({
        where: { workerId_periodo: { workerId: worker.id, periodo } },
        update: {
          fechaEmision: new Date(Date.UTC(row.periodo.anio, row.periodo.mes - 1, 1, 12)),
          sueldoBruto: money(ingresos.sueldoBase),
          asignacionFamiliar: money(ingresos.asigFamiliar) || null,
          horasExtras: money(ingresos.horasExtras25 + ingresos.horasExtras35) || null,
          bonificaciones: money(ingresos.comisiones + ingresos.bonos + ingresos.grati + ingresos.bonoExtraordinario) || null,
          totalIngresos: money(ingresos.totalIngresos),
          aporteAfpOnp: money(descuentos.aporteAFP + descuentos.comisionAFP + descuentos.primaAFP + descuentos.ONP) || null,
          rentaQuintaCat: money(descuentos.renta5ta) || null,
          otrosDescuentos: money(descuentos.adelantos + descuentos.descuentosOtros + descuentos.descuentoTardanzas + descuentos.descuentoFaltas) || null,
          totalDescuentos: money(descuentos.totalDescuentos),
          netoPagar: money(row.calc.netoPagar),
          essalud: money(row.calc.aportePatronal.essalud) || null,
          detalleJson: row,
          status: 'EMITIDA',
        },
        create: {
          orgId: org.id,
          workerId: worker.id,
          periodo,
          fechaEmision: new Date(Date.UTC(row.periodo.anio, row.periodo.mes - 1, 1, 12)),
          sueldoBruto: money(ingresos.sueldoBase),
          asignacionFamiliar: money(ingresos.asigFamiliar) || null,
          horasExtras: money(ingresos.horasExtras25 + ingresos.horasExtras35) || null,
          bonificaciones: money(ingresos.comisiones + ingresos.bonos + ingresos.grati + ingresos.bonoExtraordinario) || null,
          totalIngresos: money(ingresos.totalIngresos),
          aporteAfpOnp: money(descuentos.aporteAFP + descuentos.comisionAFP + descuentos.primaAFP + descuentos.ONP) || null,
          rentaQuintaCat: money(descuentos.renta5ta) || null,
          otrosDescuentos: money(descuentos.adelantos + descuentos.descuentosOtros + descuentos.descuentoTardanzas + descuentos.descuentoFaltas) || null,
          totalDescuentos: money(descuentos.totalDescuentos),
          netoPagar: money(row.calc.netoPagar),
          essalud: money(row.calc.aportePatronal.essalud) || null,
          detalleJson: row,
          status: 'EMITIDA',
        },
      })
    }

    const legajoEntries = Object.values(zip.files)
      .filter(entry => !entry.dir && entry.name.startsWith('output/02_TRABAJADORES/'))
      .filter(entry => /\.(pdf|docx|xlsx)$/i.test(entry.name))

    for (const entry of legajoEntries) {
      const match = entry.name.match(/output\/02_TRABAJADORES\/(\d{3})_/)
      if (!match) continue
      const seedId = `T${match[1]}`
      const worker = workersBySeedId.get(seedId)
      if (!worker) continue
      const title = entry.name.split('/').pop() ?? entry.name
      await prisma.workerDocument.create({
        data: {
          workerId: worker.id,
          category: categoryFromPath(entry.name),
          documentType: title.replace(/\.(pdf|docx|xlsx)$/i, ''),
          title,
          fileUrl: `demo://decoraciones-joselyn/${entry.name}`,
          fileSize: entry._data.uncompressedSize,
          mimeType: mimeFromPath(entry.name),
          isRequired: entry.name.includes('/01_Ingreso/') || entry.name.includes('/04_SST/'),
          verifiedAt: new Date('2026-05-06T12:00:00.000Z'),
          status: 'VERIFIED',
        },
      })
    }

    const orgDocs = [
      ['RIT', 'Reglamento Interno de Trabajo', 'output/01_EMPRESA/03_Documentos_Internos/RIT_Reglamento_Interno_Trabajo.docx'],
      ['MOF', 'Manual de Organización y Funciones', 'output/01_EMPRESA/03_Documentos_Internos/MOF_Manual_Organizacion_Funciones.docx'],
      ['REGLAMENTO_SST', 'Reglamento Interno de SST', 'output/03_SST/02-Reglamento-Interno-SST.docx'],
      ['PLAN_SST', 'Plan y Programa Anual SST', 'output/03_SST/06-Plan-Programa-Anual-SST-2025.docx'],
      ['COMUNICADO', 'Libro de Reclamaciones', 'output/01_EMPRESA/04_Libros/Libro_Reclamaciones.xlsx'],
    ] as const

    for (const [type, title, path] of orgDocs) {
      const entry = zip.file(path)
      await prisma.orgDocument.create({
        data: {
          orgId: org.id,
          type,
          title,
          description: 'Documento cargado como metadata desde dataset demo Decoraciones Joselyn.',
          fileUrl: `demo://decoraciones-joselyn/${path}`,
          fileSize: entry?._data.uncompressedSize ?? null,
          mimeType: mimeFromPath(path),
          isPublishedToWorkers: true,
          publishedAt: new Date('2026-05-06T12:00:00.000Z'),
          acknowledgmentRequired: type === 'RIT' || type === 'REGLAMENTO_SST',
          acknowledgmentDeadlineDays: type === 'RIT' || type === 'REGLAMENTO_SST' ? 7 : null,
        },
      })
    }

    const sede = await prisma.sede.create({
      data: {
        orgId: org.id,
        nombre: 'Taller principal La Esperanza',
        direccion: 'Cal. Los Laureles N 601, Urb. Santa Veronica',
        ubigeo: '130103',
        departamento: 'La Libertad',
        provincia: 'Trujillo',
        distrito: 'La Esperanza',
        areaM2: 420,
        numeroPisos: 2,
        tipoInstalacion: 'TALLER',
        activa: true,
      },
    })

    const productionWorkers = workersSeed
      .filter(seed => seed.area === 'Producción')
      .slice(0, 10)
      .map(seed => workersBySeedId.get(seed.id))
      .filter(Boolean) as { id: string; dni: string }[]

    await prisma.puestoTrabajo.createMany({
      data: productionWorkers.map(worker => ({
        orgId: org.id,
        sedeId: sede.id,
        workerId: worker.id,
        nombre: 'Puesto de confección textil',
        descripcionTareas: ['Corte, costura, acabado y control de calidad textil'],
        jornada: 'DIURNO',
        exposicionFisica: true,
        exposicionErgonomica: true,
        exposicionPsicosocial: true,
        requiereSCTR: true,
      })),
    })

    const iperc = await prisma.iPERCBase.create({
      data: {
        orgId: org.id,
        sedeId: sede.id,
        version: 1,
        hashSha256: createHash('sha256').update(`${org.id}:iperc-demo-v1`).digest('hex'),
        estado: 'VIGENTE',
        fechaAprobacion: new Date('2026-05-06T12:00:00.000Z'),
        aprobadoPor: 'Demo QA',
      },
    })

    await prisma.iPERCFila.createMany({
      data: [
        {
          iperBaseId: iperc.id,
          proceso: 'Producción',
          actividad: 'Corte de tela',
          tarea: 'Uso de cortadora y tijeras industriales',
          riesgo: 'Cortes y atrapamiento de manos',
          indicePersonas: 2,
          indiceProcedimiento: 2,
          indiceCapacitacion: 2,
          indiceExposicion: 3,
          indiceProbabilidad: 9,
          indiceSeveridad: 2,
          nivelRiesgo: 18,
          clasificacion: 'IMPORTANTE',
          esSignificativo: true,
          controlesActuales: ['Capacitación SST', 'Guantes anticorte', 'Orden y limpieza'],
          controlesPropuestos: [{ nivel: 'INGENIERIA', control: 'Guardas físicas en equipo de corte' }],
          responsable: 'Jefe de Producción',
          plazoCierre: new Date('2026-06-15T12:00:00.000Z'),
        },
        {
          iperBaseId: iperc.id,
          proceso: 'Producción',
          actividad: 'Costura',
          tarea: 'Operación de máquina recta/remalladora',
          riesgo: 'Lesiones por aguja y posturas forzadas',
          indicePersonas: 3,
          indiceProcedimiento: 2,
          indiceCapacitacion: 2,
          indiceExposicion: 3,
          indiceProbabilidad: 10,
          indiceSeveridad: 2,
          nivelRiesgo: 20,
          clasificacion: 'IMPORTANTE',
          esSignificativo: true,
          controlesActuales: ['Pausas activas', 'Iluminación localizada'],
          controlesPropuestos: [{ nivel: 'ADMINISTRATIVO', control: 'Rotación de tareas cada 2 horas' }],
          responsable: 'Supervisor de Producción',
          plazoCierre: new Date('2026-06-30T12:00:00.000Z'),
        },
        {
          iperBaseId: iperc.id,
          proceso: 'Almacén',
          actividad: 'Despacho',
          tarea: 'Carga manual de mercadería',
          riesgo: 'Sobreesfuerzo lumbar',
          indicePersonas: 2,
          indiceProcedimiento: 2,
          indiceCapacitacion: 1,
          indiceExposicion: 2,
          indiceProbabilidad: 7,
          indiceSeveridad: 2,
          nivelRiesgo: 14,
          clasificacion: 'MODERADO',
          esSignificativo: true,
          controlesActuales: ['Faja lumbar según tarea', 'Carretilla manual'],
          controlesPropuestos: [{ nivel: 'INGENIERIA', control: 'Mesa elevadora para embalaje' }],
          responsable: 'Logística',
          plazoCierre: new Date('2026-07-15T12:00:00.000Z'),
        },
      ],
    })

    for (const seed of workersSeed) {
      const worker = workersBySeedId.get(seed.id)
      if (!worker) continue
      await prisma.eMO.create({
        data: {
          orgId: org.id,
          workerId: worker.id,
          tipoExamen: 'PRE_EMPLEO',
          fechaExamen: new Date('2026-01-15T12:00:00.000Z'),
          centroMedicoNombre: 'Centro Médico Ocupacional Demo',
          centroMedicoRuc: '20999999992',
          aptitud: seed.id === 'T014' ? 'APTO_CON_RESTRICCIONES' : 'APTO',
          consentimientoLey29733: true,
          fechaConsentimiento: new Date('2026-01-15T12:00:00.000Z'),
          proximoExamenAntes: new Date('2027-01-15T12:00:00.000Z'),
          certificadoUrl: `demo://decoraciones-joselyn/EMO_${seed.id}.pdf`,
        },
      })
    }

    await prisma.accidente.create({
      data: {
        orgId: org.id,
        sedeId: sede.id,
        workerId: workersBySeedId.get('T014')?.id,
        tipo: 'NO_MORTAL',
        fechaHora: new Date('2026-04-18T16:30:00.000Z'),
        descripcion: 'Corte leve durante operación de acabado. Atención inmediata y refuerzo de EPP.',
        plazoLegalHoras: 720,
        satEstado: 'CONFIRMADO',
        satNumeroManual: 'SAT-DEMO-2026-0001',
        satFechaEnvioManual: new Date('2026-04-21T12:00:00.000Z'),
      },
    })

    const comite = await prisma.comiteSST.create({
      data: {
        orgId: org.id,
        mandatoInicio: new Date('2026-01-02T12:00:00.000Z'),
        mandatoFin: new Date('2028-01-01T12:00:00.000Z'),
        estado: 'VIGENTE',
        libroActasUrl: 'demo://decoraciones-joselyn/output/03_SST/11-Acta-Comite-SST-001-2026.docx',
      },
    })

    await prisma.miembroComite.createMany({
      data: [
        ['T001', 'PRESIDENTE', 'REPRESENTANTE_EMPLEADOR'],
        ['T007', 'SECRETARIO', 'REPRESENTANTE_TRABAJADORES'],
        ['T015', 'MIEMBRO', 'REPRESENTANTE_TRABAJADORES'],
        ['T004', 'MIEMBRO', 'REPRESENTANTE_EMPLEADOR'],
      ].flatMap(([seedId, cargo, origen]) => {
        const worker = workersBySeedId.get(seedId)
        return worker ? [{ comiteId: comite.id, workerId: worker.id, cargo, origen }] : []
      }),
    })

    const alertSpecs = [
      ['T009', 'CONTRATO_POR_VENCER', 'HIGH', 'Contrato T009 por vencer', 'Contrato vence el 02/06/2026. Renovar o dejar constancia de no renovación.', '2026-05-25'],
      ['T006', 'CONTRATO_POR_VENCER', 'HIGH', 'Contrato T006 por vencer', 'Contrato vence el 02/06/2026. Revisar continuidad operativa.', '2026-05-25'],
      ['T018', 'CONTRATO_POR_VENCER', 'MEDIUM', 'Contrato T018 por vencer', 'Contrato vence el 03/08/2026.', '2026-07-20'],
      ['T013', 'REGISTRO_INCOMPLETO', 'HIGH', 'Trabajadora gestante', 'Validar descanso pre-natal, comunicación y reasignación segura.', '2026-06-10'],
      ['T017', 'REGISTRO_INCOMPLETO', 'LOW', 'Permiso de lactancia activo', 'Permiso de lactancia vence el 08/08/2026.', '2026-07-25'],
      ['T001', 'VACACIONES_ACUMULADAS', 'MEDIUM', 'Vacaciones acumuladas', '30 días de vacaciones disponibles sin programación cerrada.', '2026-10-15'],
      ['T002', 'VACACIONES_ACUMULADAS', 'MEDIUM', 'Vacaciones acumuladas', '30 días de vacaciones disponibles.', '2026-10-15'],
      ['T014', 'REGISTRO_INCOMPLETO', 'CRITICAL', 'Proceso de cese activo', 'Despido por falta grave: verificar documentación y liquidación.', '2026-06-15'],
      ['T004', 'SCTR_VENCIDO', 'LOW', 'Revisión SCTR', 'Renovación anual SCTR programada para julio 2026.', '2026-06-30'],
    ] as const

    for (const [seedId, type, severity, title, description, due] of alertSpecs) {
      const worker = workersBySeedId.get(seedId)
      if (!worker) continue
      await prisma.workerAlert.create({
        data: {
          workerId: worker.id,
          orgId: org.id,
          type,
          severity,
          title,
          description,
          dueDate: new Date(`${due}T12:00:00.000Z`),
          multaEstimada: severity === 'CRITICAL' ? 18000 : severity === 'HIGH' ? 9500 : 2500,
        },
      })
    }

    const activeWorkers = await prisma.worker.findMany({
      where: { orgId: org.id, status: 'ACTIVE' },
      select: { id: true },
      take: 12,
      orderBy: { dni: 'asc' },
    })
    for (let day = 4; day <= 8; day++) {
      for (let idx = 0; idx < activeWorkers.length; idx++) {
        const worker = activeWorkers[idx]
        const late = idx % 5 === 0 && day % 2 === 0
        await prisma.attendance.create({
          data: {
            orgId: org.id,
            workerId: worker.id,
            workDate: new Date(Date.UTC(2026, 4, day, 12)),
            clockIn: new Date(Date.UTC(2026, 4, day, late ? 13 : 12, late ? 24 : 58)),
            clockOut: new Date(Date.UTC(2026, 4, day, 22, idx % 4 === 0 ? 30 : 5)),
            hoursWorked: idx % 4 === 0 ? 8.5 : 8,
            status: late ? 'LATE' : 'PRESENT',
            isOvertime: idx % 4 === 0,
            overtimeMinutes: idx % 4 === 0 ? 30 : null,
            notes: late ? 'Tardanza demo importada para QA.' : 'Asistencia demo importada para QA.',
          },
        })
      }
    }

    const counts = {
      workers: await prisma.worker.count({ where: { orgId: org.id } }),
      activeWorkers: await prisma.worker.count({ where: { orgId: org.id, status: 'ACTIVE' } }),
      payslips: await prisma.payslip.count({ where: { orgId: org.id } }),
      workerDocuments: await prisma.workerDocument.count({ where: { worker: { orgId: org.id } } }),
      workerAlerts: await prisma.workerAlert.count({ where: { orgId: org.id } }),
      attendance: await prisma.attendance.count({ where: { orgId: org.id } }),
      emos: await prisma.eMO.count({ where: { orgId: org.id } }),
      ipercBases: await prisma.iPERCBase.count({ where: { orgId: org.id } }),
      accidentes: await prisma.accidente.count({ where: { orgId: org.id } }),
      orgDocuments: await prisma.orgDocument.count({ where: { orgId: org.id } }),
    }

    console.log(JSON.stringify({ ok: true, orgId: org.id, ruc: org.ruc, counts }, null, 2))
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
