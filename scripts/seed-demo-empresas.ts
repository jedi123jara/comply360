/**
 * Seed de 3 empresas demo para testing end-to-end.
 *
 * Crea:
 *  1. Bodega Flores E.I.R.L.         — MYPE_MICRO    — 10 trabajadores
 *  2. Constructora Andina S.A.C.     — CONSTRUCCION_CIVIL — 15 trabajadores
 *  3. Legal Strategies Consultores   — GENERAL       — 25 trabajadores
 *
 * Cada empresa queda con:
 *  • Organization + plan PRO en trial 14 días
 *  • Workers con DNIs, nombres reales peruanos, sueldos apropiados al régimen,
 *    fechas de ingreso distribuidas en 5 años, cargos realistas por sector
 *  • OrgDocument RIT publicado a los workers
 *  • ContractTemplate plantilla con merge fields listos
 *  • Subscription en estado TRIALING con planExpiresAt +14 días
 *
 * IDs de organización siguen el patrón JIT provisioning de src/lib/auth.ts:
 *   org-<email.replace(/[^a-z0-9]/g, '-').substring(0, 30)>
 * Así cuando el admin real haga signup con el mismo email, el JIT encuentra
 * la org ya poblada y no crea una nueva.
 *
 * Uso:
 *   DEMO_EMAIL_1=admin1@demo.pe DEMO_EMAIL_2=admin2@demo.pe DEMO_EMAIL_3=admin3@demo.pe \
 *     npx tsx scripts/seed-demo-empresas.ts
 *
 *   (si omitís env vars, usa emails defaults)
 *
 * Idempotente: podés correrlo varias veces. Usa upsert everywhere.
 */

import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'
import type { RegimenLaboral, TipoContrato, TipoAporte } from '../src/generated/prisma/client.js'

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ═══════════════════════════════════════════════════════════════════════════
// Datos realistas peruanos
// ═══════════════════════════════════════════════════════════════════════════

const NOMBRES_H = [
  'Juan Carlos', 'Luis Alberto', 'José Antonio', 'Miguel Ángel', 'Pedro Pablo',
  'Javier', 'Ricardo', 'Diego', 'Jorge Luis', 'Manuel', 'Fernando', 'Roberto',
  'Óscar', 'Víctor', 'Raúl', 'Hugo', 'Alejandro', 'Daniel', 'Cristian', 'Renato',
  'Renzo', 'Julio César', 'Marco Antonio', 'Edwin', 'Rubén',
]
const NOMBRES_M = [
  'María Elena', 'Carmen Rosa', 'Ana Luisa', 'Lucía', 'Patricia', 'Silvia',
  'Claudia', 'Mónica', 'Elena', 'Susana', 'Gloria', 'Sara', 'Julia', 'Laura',
  'Beatriz', 'Teresa', 'Carolina', 'Diana', 'Rosario', 'Milagros',
  'Jessica', 'Vanessa', 'Mariela', 'Karina', 'Pamela',
]
const APELLIDOS = [
  'García', 'López', 'Rodríguez', 'Pérez', 'Sánchez', 'Ramírez', 'Gonzáles',
  'Flores', 'Torres', 'Vargas', 'Rojas', 'Díaz', 'Castillo', 'Mendoza', 'Ramos',
  'Quispe', 'Huamán', 'Chávez', 'Mamani', 'Silva', 'Cáceres', 'Álvarez',
  'Guerrero', 'Espinoza', 'Jiménez', 'Cruz', 'Vega', 'Ortiz', 'Medina', 'Salazar',
]

const CARGOS_COMERCIO = [
  'Cajero', 'Reponedor', 'Despachador', 'Vigilante', 'Vendedor', 'Supervisor de tienda',
]
const CARGOS_CONSTRUCCION = [
  'Operario', 'Oficial', 'Peón', 'Maestro de obra', 'Capataz', 'Supervisor de obra',
  'Ayudante', 'Electricista', 'Plomero',
]
const CARGOS_LEGAL = [
  'Abogado Senior', 'Abogado Junior', 'Asistente Legal', 'Secretaria Legal',
  'Contador', 'Asistente Contable', 'Practicante', 'Administrador',
  'Recepcionista', 'Paralegal', 'Gerente Legal',
]

// ═══════════════════════════════════════════════════════════════════════════
// PRNG determinístico para idempotencia
// ═══════════════════════════════════════════════════════════════════════════

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickOne<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]
}

function generateDni(seed: number): string {
  // DNI 8 dígitos, rango plausible para Perú (no todos los 40M son válidos pero
  // para demo sirve)
  const n = Math.floor(mulberry32(seed)() * 99_999_999 - 10_000_000) + 10_000_000
  return String(Math.max(10_000_000, Math.min(99_999_999, n))).padStart(8, '0')
}

function randomDateBetween(startYearsAgo: number, endYearsAgo: number, rng: () => number): Date {
  const now = Date.now()
  const start = now - startYearsAgo * 365 * 24 * 3600 * 1000
  const end = now - endYearsAgo * 365 * 24 * 3600 * 1000
  return new Date(start + rng() * (end - start))
}

function salaryByRegimen(regimen: RegimenLaboral, rng: () => number): number {
  // RMV 2026 = S/ 1,130
  if (regimen === 'MYPE_MICRO') {
    // 60% en RMV exacto, 40% entre 1130 y 1500
    return rng() < 0.6 ? 1130 : Math.round(1130 + rng() * 370)
  }
  if (regimen === 'MYPE_PEQUENA') {
    return Math.round(1200 + rng() * 1800) // 1200 - 3000
  }
  if (regimen === 'CONSTRUCCION_CIVIL') {
    // Peón ~1500, Oficial ~2200, Operario ~2800, Maestro ~3500
    return Math.round(1500 + rng() * 2000)
  }
  // GENERAL
  return Math.round(1500 + rng() * 6500) // 1500 - 8000
}

// ═══════════════════════════════════════════════════════════════════════════
// Spec de empresas
// ═══════════════════════════════════════════════════════════════════════════

function orgIdFromEmail(email: string): string {
  // Debe coincidir con el patrón de JIT provisioning en src/lib/auth.ts
  return `org-${email.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30)}`
}

interface EmpresaSpec {
  email: string
  name: string
  razonSocial: string
  ruc: string
  sector: string
  address: string
  regimenPrincipal: RegimenLaboral
  sizeRange: string
  workerCount: number
  cargos: readonly string[]
  salaryRegimen: RegimenLaboral // qué régimen aplicar a los salarios (puede diferir del principal)
  jornadaSemanal: number
  contractTemplate: { title: string; content: string; mappings: Record<string, string> }
  ownerName: { first: string; last: string }
  rngSeed: number
}

const DEFAULT_EMAILS = [
  process.env.DEMO_EMAIL_1 ?? 'bodega@demo.comply360.pe',
  process.env.DEMO_EMAIL_2 ?? 'obra@demo.comply360.pe',
  process.env.DEMO_EMAIL_3 ?? 'legal@demo.comply360.pe',
] as const

const EMPRESAS: EmpresaSpec[] = [
  // ───── 1. MYPE_MICRO ──────────────────────────────────────────────────
  {
    email: DEFAULT_EMAILS[0],
    name: 'Bodega Flores',
    razonSocial: 'BODEGA FLORES E.I.R.L.',
    ruc: '20600111222',
    sector: 'Comercio',
    address: 'Av. La Marina 1543, San Miguel, Lima',
    regimenPrincipal: 'MYPE_MICRO',
    sizeRange: '1-10',
    workerCount: 10,
    cargos: CARGOS_COMERCIO,
    salaryRegimen: 'MYPE_MICRO',
    jornadaSemanal: 48,
    ownerName: { first: 'Rosa María', last: 'Flores Quispe' },
    rngSeed: 1001,
    contractTemplate: {
      title: 'Contrato de Trabajo a Plazo Indeterminado — Régimen MYPE',
      content: `CONTRATO DE TRABAJO A PLAZO INDETERMINADO
RÉGIMEN LABORAL DE LA MICROEMPRESA (Ley 32353)

Conste por el presente documento el contrato de trabajo que celebran:

De una parte, {{RAZON_SOCIAL}}, con RUC {{RUC}}, con domicilio en {{EMPRESA_DIRECCION}}, debidamente representada por su {{REPRESENTANTE_LEGAL}}, a quien en adelante se le denominará EL EMPLEADOR.

Y de la otra parte, {{NOMBRE_COMPLETO}}, identificado(a) con DNI N° {{DNI}}, con domicilio en {{DIRECCION}}, a quien en adelante se le denominará EL TRABAJADOR.

PRIMERA — OBJETO
EL TRABAJADOR prestará sus servicios en el cargo de {{CARGO}}, en el área de {{AREA}}.

SEGUNDA — REMUNERACIÓN
La remuneración mensual es de S/ {{SUELDO}} ({{SUELDO_LETRAS}}), que se abonará el último día útil de cada mes.

TERCERA — INICIO DE LABORES
Las labores inician el {{FECHA_INGRESO}}.

CUARTA — JORNADA Y RÉGIMEN
La jornada es de {{JORNADA}} horas semanales. EL EMPLEADOR está acogido al Régimen Laboral de la Microempresa (REMYPE), por lo que los beneficios sociales de EL TRABAJADOR son los establecidos en la Ley 32353: RMV, vacaciones de 15 días calendario, indemnización por despido arbitrario de 10 remuneraciones diarias por año (tope 90 remuneraciones), SIS. No aplica CTS ni gratificaciones legales.

QUINTA — DERECHOS Y OBLIGACIONES
EL TRABAJADOR cumplirá el Reglamento Interno de Trabajo (RIT), las políticas de Seguridad y Salud en el Trabajo (SST) y demás disposiciones vigentes en la empresa.

En señal de conformidad, firman las partes en {{CIUDAD}}, a los {{FECHA_HOY_LETRAS}}.`,
      mappings: {
        RAZON_SOCIAL: 'org.razonSocial',
        RUC: 'org.ruc',
        EMPRESA_DIRECCION: 'org.address',
        REPRESENTANTE_LEGAL: 'org.representanteLegal',
        NOMBRE_COMPLETO: 'worker.fullName',
        DNI: 'worker.dni',
        DIRECCION: 'worker.address',
        CARGO: 'worker.position',
        AREA: 'worker.department',
        SUELDO: 'worker.sueldoBruto',
        SUELDO_LETRAS: 'worker.sueldoEnLetras',
        FECHA_INGRESO: 'worker.fechaIngreso',
        JORNADA: 'worker.jornadaSemanal',
        CIUDAD: 'meta.ciudad',
        FECHA_HOY_LETRAS: 'meta.todayInWords',
      },
    },
  },

  // ───── 2. CONSTRUCCION_CIVIL ─────────────────────────────────────────
  {
    email: DEFAULT_EMAILS[1],
    name: 'Constructora Andina',
    razonSocial: 'CONSTRUCTORA ANDINA DEL PERÚ S.A.C.',
    ruc: '20600333444',
    sector: 'Construcción',
    address: 'Av. Javier Prado Este 4321, San Borja, Lima',
    regimenPrincipal: 'CONSTRUCCION_CIVIL',
    sizeRange: '11-50',
    workerCount: 15,
    cargos: CARGOS_CONSTRUCCION,
    salaryRegimen: 'CONSTRUCCION_CIVIL',
    jornadaSemanal: 48,
    ownerName: { first: 'Carlos Eduardo', last: 'Ramírez Torres' },
    rngSeed: 2002,
    contractTemplate: {
      title: 'Contrato de Trabajo para Obra Determinada — Régimen Construcción Civil',
      content: `CONTRATO DE TRABAJO PARA OBRA DETERMINADA
RÉGIMEN DE CONSTRUCCIÓN CIVIL

Conste por el presente documento el contrato de trabajo que celebran:

De una parte, {{RAZON_SOCIAL}}, con RUC {{RUC}}, con domicilio en {{EMPRESA_DIRECCION}}, representada por {{REPRESENTANTE_LEGAL}}, a quien en adelante se le denominará EL EMPLEADOR.

Y de la otra parte, {{NOMBRE_COMPLETO}}, identificado(a) con DNI N° {{DNI}}, con domicilio en {{DIRECCION}}, a quien en adelante se le denominará EL TRABAJADOR.

PRIMERA — OBJETO
EL TRABAJADOR prestará sus servicios en el cargo de {{CARGO}} para la obra determinada contratada por EL EMPLEADOR, sujeto al régimen de construcción civil.

SEGUNDA — REMUNERACIÓN
Jornal diario básico de S/ {{SUELDO}} diarios ({{SUELDO_LETRAS}} diarios). Pago semanal según tabla salarial vigente de CAPECO. Incluye BUC (Bonificación Unificada de Construcción), Bonificación por Movilidad, y demás bonificaciones de ley.

TERCERA — INICIO DE LABORES
Las labores inician el {{FECHA_INGRESO}} y culminarán al término de la obra en ejecución.

CUARTA — JORNADA
Jornada de {{JORNADA}} horas semanales. Horas extras según ley.

QUINTA — SEGURIDAD Y SALUD
EL EMPLEADOR entregará EPP obligatorio (casco, lentes, guantes, botas de seguridad, arnés si aplica) antes del inicio de labores. EL TRABAJADOR recibirá inducción SST previa al primer día de trabajo (Ley 29783).

SEXTA — BENEFICIOS CONSTRUCCIÓN CIVIL
CTS, gratificaciones y vacaciones según D.S. 001-98-TR y convenios colectivos vigentes. Aporte a FONAVI, SENCICO, CONAFOVICER conforme ley.

En señal de conformidad, firman las partes en {{CIUDAD}}, a los {{FECHA_HOY_LETRAS}}.`,
      mappings: {
        RAZON_SOCIAL: 'org.razonSocial',
        RUC: 'org.ruc',
        EMPRESA_DIRECCION: 'org.address',
        REPRESENTANTE_LEGAL: 'org.representanteLegal',
        NOMBRE_COMPLETO: 'worker.fullName',
        DNI: 'worker.dni',
        DIRECCION: 'worker.address',
        CARGO: 'worker.position',
        SUELDO: 'worker.sueldoBruto',
        SUELDO_LETRAS: 'worker.sueldoEnLetras',
        FECHA_INGRESO: 'worker.fechaIngreso',
        JORNADA: 'worker.jornadaSemanal',
        CIUDAD: 'meta.ciudad',
        FECHA_HOY_LETRAS: 'meta.todayInWords',
      },
    },
  },

  // ───── 3. GENERAL ────────────────────────────────────────────────────
  {
    email: DEFAULT_EMAILS[2],
    name: 'Legal Strategies Consultores',
    razonSocial: 'LEGAL STRATEGIES CONSULTORES S.A.C.',
    ruc: '20600555666',
    sector: 'Servicios Legales',
    address: 'Av. Camino Real 1236, Torre Real 6, San Isidro, Lima',
    regimenPrincipal: 'GENERAL',
    sizeRange: '11-50',
    workerCount: 25,
    cargos: CARGOS_LEGAL,
    salaryRegimen: 'GENERAL',
    jornadaSemanal: 48,
    ownerName: { first: 'Diego Alejandro', last: 'Mendoza Silva' },
    rngSeed: 3003,
    contractTemplate: {
      title: 'Contrato de Trabajo a Plazo Indeterminado — Régimen General',
      content: `CONTRATO DE TRABAJO A PLAZO INDETERMINADO
RÉGIMEN LABORAL GENERAL (D. Leg. 728)

Conste por el presente documento el contrato de trabajo que celebran:

De una parte, {{RAZON_SOCIAL}}, con RUC {{RUC}}, con domicilio en {{EMPRESA_DIRECCION}}, representada por {{REPRESENTANTE_LEGAL}}, a quien en adelante se le denominará EL EMPLEADOR.

Y de la otra parte, {{NOMBRE_COMPLETO}}, identificado(a) con DNI N° {{DNI}}, con domicilio en {{DIRECCION}}, a quien en adelante se le denominará EL TRABAJADOR.

PRIMERA — OBJETO
EL TRABAJADOR prestará sus servicios en el cargo de {{CARGO}}, en el área de {{AREA}}, bajo subordinación de EL EMPLEADOR.

SEGUNDA — REMUNERACIÓN
La remuneración mensual es de S/ {{SUELDO}} ({{SUELDO_LETRAS}}), que se abonará el último día útil de cada mes mediante depósito en cuenta bancaria del TRABAJADOR.

TERCERA — INICIO DE LABORES Y PERIODO DE PRUEBA
Las labores inician el {{FECHA_INGRESO}}. El período de prueba es de tres (3) meses contados desde la fecha de inicio, conforme al Art. 10 del D. Leg. 728.

CUARTA — JORNADA Y DESCANSOS
Jornada de {{JORNADA}} horas semanales distribuidas de lunes a viernes. Descanso semanal obligatorio los domingos. Feriados según calendario oficial.

QUINTA — BENEFICIOS SOCIALES
EL TRABAJADOR tendrá los beneficios del régimen laboral general:
- CTS: depósito semestral conforme D.S. 001-97-TR.
- Gratificaciones: julio y diciembre conforme Ley 27735 + bonificación extraordinaria 9%.
- Vacaciones: 30 días calendario por año completo de servicios.
- Asignación familiar: si tiene hijos menores de edad o en educación superior.
- EsSalud: aporte del empleador.
- SCTR: si el puesto implica riesgo.

SEXTA — CONFIDENCIALIDAD
EL TRABAJADOR se obliga a mantener absoluta reserva sobre la información confidencial de clientes a la que tenga acceso por razón del cargo.

En señal de conformidad, firman las partes en {{CIUDAD}}, a los {{FECHA_HOY_LETRAS}}.`,
      mappings: {
        RAZON_SOCIAL: 'org.razonSocial',
        RUC: 'org.ruc',
        EMPRESA_DIRECCION: 'org.address',
        REPRESENTANTE_LEGAL: 'org.representanteLegal',
        NOMBRE_COMPLETO: 'worker.fullName',
        DNI: 'worker.dni',
        DIRECCION: 'worker.address',
        CARGO: 'worker.position',
        AREA: 'worker.department',
        SUELDO: 'worker.sueldoBruto',
        SUELDO_LETRAS: 'worker.sueldoEnLetras',
        FECHA_INGRESO: 'worker.fechaIngreso',
        JORNADA: 'worker.jornadaSemanal',
        CIUDAD: 'meta.ciudad',
        FECHA_HOY_LETRAS: 'meta.todayInWords',
      },
    },
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function seedEmpresa(spec: EmpresaSpec) {
  const orgId = orgIdFromEmail(spec.email)
  console.log(`\n🏢 ${spec.name} (${spec.regimenPrincipal}, ${spec.workerCount} workers)`)
  console.log(`   orgId: ${orgId}`)
  console.log(`   email admin: ${spec.email}`)

  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 14)

  // 1. Organization + trial PRO
  const org = await prisma.organization.upsert({
    where: { id: orgId },
    create: {
      id: orgId,
      name: spec.name,
      razonSocial: spec.razonSocial,
      ruc: spec.ruc,
      sector: spec.sector,
      address: spec.address,
      regimenPrincipal: spec.regimenPrincipal,
      sizeRange: spec.sizeRange,
      alertEmail: spec.email,
      plan: 'PRO',
      planExpiresAt: trialEnd,
      onboardingCompleted: true,
    },
    update: {
      razonSocial: spec.razonSocial,
      ruc: spec.ruc,
      sector: spec.sector,
      plan: 'PRO',
      planExpiresAt: trialEnd,
      onboardingCompleted: true,
    },
  })

  // 2. Subscription TRIALING
  await prisma.subscription.upsert({
    where: { orgId: org.id },
    create: {
      orgId: org.id,
      plan: 'PRO',
      status: 'TRIALING',
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEnd,
    },
    update: {
      plan: 'PRO',
      status: 'TRIALING',
      currentPeriodEnd: trialEnd,
    },
  })

  // 3. Workers
  const rng = mulberry32(spec.rngSeed)
  let createdWorkers = 0
  for (let i = 0; i < spec.workerCount; i++) {
    const gender: 'H' | 'M' = rng() < 0.55 ? 'H' : 'M'
    const firstName = pickOne(gender === 'H' ? NOMBRES_H : NOMBRES_M, rng)
    const lastName1 = pickOne(APELLIDOS, rng)
    const lastName2 = pickOne(APELLIDOS, rng)
    const dni = generateDni(spec.rngSeed * 100 + i)
    const cargo = pickOne(spec.cargos, rng)
    const sueldo = salaryByRegimen(spec.salaryRegimen, rng)
    const fechaIngreso = randomDateBetween(5, 0.1, rng) // ingresados en los últimos 5 años
    const tipoContrato: TipoContrato =
      spec.regimenPrincipal === 'CONSTRUCCION_CIVIL'
        ? 'OBRA_DETERMINADA'
        : rng() < 0.7
          ? 'INDEFINIDO'
          : 'PLAZO_FIJO'
    const tipoAporte: TipoAporte = rng() < 0.7 ? 'AFP' : 'ONP'

    try {
      await prisma.worker.upsert({
        where: { orgId_dni: { orgId: org.id, dni } },
        create: {
          orgId: org.id,
          dni,
          firstName,
          lastName: `${lastName1} ${lastName2}`,
          email: `${firstName.toLowerCase().replace(/\s+/g, '.')}.${lastName1.toLowerCase()}.demo${i}@ejemplo.pe`,
          phone: `9${Math.floor(rng() * 90000000 + 10000000)}`,
          gender: gender === 'H' ? 'Masculino' : 'Femenino',
          nationality: 'peruana',
          address: `Jr. ${pickOne(['Cusco', 'Arequipa', 'Junín', 'Callao', 'Lima'], rng)} ${Math.floor(rng() * 999 + 100)}, Lima`,
          position: cargo,
          department: spec.sector,
          regimenLaboral: spec.regimenPrincipal,
          tipoContrato,
          fechaIngreso,
          sueldoBruto: sueldo,
          asignacionFamiliar: rng() < 0.35 && spec.regimenPrincipal !== 'MYPE_MICRO',
          jornadaSemanal: spec.jornadaSemanal,
          tiempoCompleto: true,
          tipoAporte,
          afpNombre:
            tipoAporte === 'AFP'
              ? pickOne(['Integra', 'Prima', 'Profuturo', 'Habitat'], rng)
              : null,
          cuspp: tipoAporte === 'AFP' ? `${Math.floor(rng() * 900000000 + 100000000)}` : null,
          essaludVida: rng() < 0.3,
          sctr: spec.regimenPrincipal === 'CONSTRUCCION_CIVIL' || rng() < 0.15,
          status: 'ACTIVE',
          legajoScore: Math.floor(rng() * 40 + 40), // entre 40-80% para que se vea realista
        },
        update: {}, // no actualizamos si ya existen
      })
      createdWorkers++
    } catch (err) {
      console.warn(`   ⚠ Error creando worker ${dni}:`, (err as Error).message.slice(0, 100))
    }
  }
  console.log(`   ✓ ${createdWorkers}/${spec.workerCount} workers`)

  // 4. OrgDocument RIT publicado al worker
  const ritSlug = `rit-${org.id}`
  await prisma.orgDocument
    .upsert({
      where: { id: ritSlug },
      create: {
        id: ritSlug,
        orgId: org.id,
        type: 'RIT',
        title: `Reglamento Interno de Trabajo — ${spec.razonSocial}`,
        description: `Reglamento Interno conforme a la Ley y al régimen ${spec.regimenPrincipal}. Incluye jornada, beneficios, conducta y medidas disciplinarias.`,
        version: 1,
        isPublishedToWorkers: true,
        publishedAt: new Date(),
      },
      update: { isPublishedToWorkers: true },
    })
    .catch((err) =>
      console.warn(`   ⚠ Error creando RIT:`, (err as Error).message.slice(0, 100)),
    )

  // Política SST publicada
  const sstSlug = `sst-${org.id}`
  await prisma.orgDocument
    .upsert({
      where: { id: sstSlug },
      create: {
        id: sstSlug,
        orgId: org.id,
        type: 'REGLAMENTO_SST',
        title: `Política de Seguridad y Salud en el Trabajo — ${spec.razonSocial}`,
        description:
          'Política general SST conforme a Ley 29783 y D.S. 005-2012-TR. Compromiso de la empresa con la protección de la vida e integridad física de sus trabajadores.',
        version: 1,
        isPublishedToWorkers: true,
        publishedAt: new Date(),
      },
      update: { isPublishedToWorkers: true },
    })
    .catch((err) =>
      console.warn(`   ⚠ Error creando SST:`, (err as Error).message.slice(0, 100)),
    )

  console.log(`   ✓ OrgDocuments publicados (RIT + política SST)`)

  // 5. Plantilla de contrato (OrgDocument tipo OTRO con metadata JSON)
  const templateMeta = {
    _schema: 'contract_template_v1',
    documentType:
      spec.regimenPrincipal === 'CONSTRUCCION_CIVIL'
        ? 'CONTRATO_PLAZO_FIJO'
        : spec.regimenPrincipal === 'MYPE_MICRO' || spec.regimenPrincipal === 'MYPE_PEQUENA'
          ? 'CONTRATO_MYPE'
          : 'CONTRATO_INDEFINIDO',
    content: spec.contractTemplate.content,
    placeholders: Object.keys(spec.contractTemplate.mappings),
    mappings: spec.contractTemplate.mappings,
    notes: `Plantilla precargada para demo. Régimen ${spec.regimenPrincipal}. Revisá con tu abogado antes de usar en producción.`,
    usageCount: 0,
  }
  const templateSlug = `tpl-${org.id}-indef`
  await prisma.orgDocument
    .upsert({
      where: { id: templateSlug },
      create: {
        id: templateSlug,
        orgId: org.id,
        type: 'OTRO',
        title: spec.contractTemplate.title,
        description: JSON.stringify(templateMeta),
        version: 1,
        isPublishedToWorkers: false,
      },
      update: {
        title: spec.contractTemplate.title,
        description: JSON.stringify(templateMeta),
      },
    })
    .catch((err) =>
      console.warn(`   ⚠ Error creando plantilla:`, (err as Error).message.slice(0, 100)),
    )
  console.log(`   ✓ Plantilla de contrato: "${spec.contractTemplate.title.slice(0, 60)}..."`)
}

async function main() {
  console.log('\n🌱 COMPLY360 — SEED DE 3 EMPRESAS DEMO\n')
  console.log('Esto crea 3 empresas con workers + plantillas + documentos RIT/SST.')
  console.log('Los orgIds siguen el patrón JIT provisioning para que matcheen con el signup real.\n')

  for (const empresa of EMPRESAS) {
    await seedEmpresa(empresa)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n✅ Seed completo. 3 empresas + 50 workers + 6 OrgDocuments.\n')
  console.log('🔗 CÓMO USAR EN EL DEMO:\n')
  console.log('   1) Los admins hacen signup con estos emails:')
  EMPRESAS.forEach((e, i) =>
    console.log(`      ${i + 1}. ${e.email}   →   ${e.name} (${e.regimenPrincipal})`),
  )
  console.log('\n   2) Al completar signup + onboarding, el JIT provisioning encuentra')
  console.log('      la org ya poblada con sus 10/15/25 workers + plantilla + RIT.')
  console.log('\n   3) Plan: PRO con trial 14 días activo (planExpiresAt +14d).')
  console.log('\n💡 Para usar emails distintos, setear antes de correr:')
  console.log('      DEMO_EMAIL_1=... DEMO_EMAIL_2=... DEMO_EMAIL_3=... \\')
  console.log('        npx tsx scripts/seed-demo-empresas.ts\n')
}

main()
  .catch((err) => {
    console.error('\n💥 Seed falló:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
