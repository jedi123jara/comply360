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

// Cargar primero .env.production.local (prod secrets), luego .env (fallback dev)
import { existsSync } from 'node:fs'
import { config as loadEnv } from 'dotenv'
if (existsSync('.env.production.local')) {
  loadEnv({ path: '.env.production.local', override: true })
} else {
  loadEnv()
}

import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'
import type { RegimenLaboral, TipoContrato, TipoAporte } from '../src/generated/prisma/client.js'

// Preferir DIRECT_URL; si no está, caer a DATABASE_URL
const connString = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!connString) {
  console.error('❌ Falta DIRECT_URL o DATABASE_URL en env. Revisá .env.production.local')
  process.exit(1)
}
const maskedHost = connString.match(/@([^/]+)/)?.[1] ?? '???'
console.log(`🔌 Usando DB en ${maskedHost}`)

const pool = new pg.Pool({
  connectionString: connString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
})
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
  if (regimen === 'AGRARIO') {
    // Agrario Ley 31110: RIA (Remun. Integral Agraria) ~S/ 52.58 diarios = ~S/ 1,577 mensuales
    // Técnicos/supervisores suben a 2500-4500
    return Math.round(1577 + rng() * 3000)
  }
  if (regimen === 'TELETRABAJO') {
    // Sector tech paga bien: Junior 3500, Senior 12k, Lead 18k
    return Math.round(3500 + rng() * 14500)
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
  process.env.DEMO_EMAIL_4 ?? 'agro@demo.comply360.pe',
  process.env.DEMO_EMAIL_5 ?? 'tech@demo.comply360.pe',
] as const

const CARGOS_AGRO = [
  'Jornalero agrícola', 'Supervisor de campo', 'Operario de empaque', 'Chofer de cosecha',
  'Ingeniero agrónomo', 'Técnico de riego', 'Almacenero', 'Operador de maquinaria',
]
const CARGOS_TECH = [
  'Desarrollador Senior', 'Desarrollador Junior', 'Product Manager', 'Diseñador UX',
  'QA Engineer', 'DevOps Engineer', 'Tech Lead', 'Scrum Master',
  'Data Analyst', 'Customer Success', 'Account Executive', 'Gerente de Producto',
]

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

  // ───── 4. AGRARIO (Ley 31110) ────────────────────────────────────────
  {
    email: DEFAULT_EMAILS[3],
    name: 'Agroexportadora Valle Verde',
    razonSocial: 'AGROEXPORTADORA VALLE VERDE S.A.C.',
    ruc: '20600777888',
    sector: 'Agroindustria',
    address: 'Fundo La Esperanza Km 32, Panamericana Sur, Ica',
    regimenPrincipal: 'AGRARIO',
    sizeRange: '51-200',
    workerCount: 30,
    cargos: CARGOS_AGRO,
    salaryRegimen: 'AGRARIO',
    jornadaSemanal: 48,
    ownerName: { first: 'Andrea Sofía', last: 'Valenzuela Rojas' },
    rngSeed: 4004,
    contractTemplate: {
      title: 'Contrato de Trabajo — Régimen Agrario (Ley 31110)',
      content: `CONTRATO DE TRABAJO
RÉGIMEN LABORAL AGRARIO (Ley 31110)

Conste por el presente documento el contrato de trabajo que celebran:

De una parte, {{RAZON_SOCIAL}}, con RUC {{RUC}}, con domicilio en {{EMPRESA_DIRECCION}}, representada por {{REPRESENTANTE_LEGAL}}, a quien en adelante se le denominará EL EMPLEADOR.

Y de la otra parte, {{NOMBRE_COMPLETO}}, identificado(a) con DNI N° {{DNI}}, con domicilio en {{DIRECCION}}, a quien en adelante se le denominará EL TRABAJADOR.

PRIMERA — OBJETO
EL TRABAJADOR prestará sus servicios en el cargo de {{CARGO}}, en el área de {{AREA}}, bajo el régimen agrario establecido por la Ley 31110 y su reglamento.

SEGUNDA — REMUNERACIÓN INTEGRAL AGRARIA (RIA)
La Remuneración Integral Agraria mensual es de S/ {{SUELDO}} ({{SUELDO_LETRAS}}), que INCLUYE la CTS (9.72%) y las gratificaciones de julio y diciembre (16.66%) conforme al Art. 7 de la Ley 31110. Esta RIA no puede ser inferior al establecido periódicamente por el MINTRA.

TERCERA — INICIO DE LABORES
Las labores inician el {{FECHA_INGRESO}}.

CUARTA — JORNADA
Jornada máxima de {{JORNADA}} horas semanales. La sobrejornada se compensa según ley.

QUINTA — BENEFICIOS SOCIALES
- Vacaciones: 30 días calendario por año completo de servicios.
- Asignación familiar: si aplica.
- Seguro Social Agrario: aporte de EL EMPLEADOR al SSS-Agrario conforme ley.
- SCTR: obligatorio para labores de campo con riesgo.

SEXTA — SEGURIDAD Y SALUD EN EL TRABAJO
EL EMPLEADOR proveerá EPP (sombrero, bloqueador, guantes, botas, mascarilla agrícola) y agua potable en campo. Inducción SST conforme Ley 29783 previa al inicio de labores.

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

  // ───── 5. TELETRABAJO (Ley 31572) — Tech/SaaS ─────────────────────────
  {
    email: DEFAULT_EMAILS[4],
    name: 'TechBridge Solutions',
    razonSocial: 'TECHBRIDGE SOLUTIONS S.A.C.',
    ruc: '20600999000',
    sector: 'Tecnología',
    address: 'Av. El Derby 055, Torre 4, Piso 12, Surco, Lima',
    regimenPrincipal: 'TELETRABAJO',
    sizeRange: '11-50',
    workerCount: 20,
    cargos: CARGOS_TECH,
    salaryRegimen: 'TELETRABAJO',
    jornadaSemanal: 40,
    ownerName: { first: 'Valentina', last: 'Chang Mendoza' },
    rngSeed: 5005,
    contractTemplate: {
      title: 'Contrato de Teletrabajo — Ley 31572',
      content: `CONTRATO DE TRABAJO BAJO MODALIDAD DE TELETRABAJO
(Ley 31572 y D.S. 002-2023-TR)

Conste por el presente documento el contrato de trabajo que celebran:

De una parte, {{RAZON_SOCIAL}}, con RUC {{RUC}}, con domicilio en {{EMPRESA_DIRECCION}}, representada por {{REPRESENTANTE_LEGAL}}, a quien en adelante se le denominará EL EMPLEADOR.

Y de la otra parte, {{NOMBRE_COMPLETO}}, identificado(a) con DNI N° {{DNI}}, con domicilio en {{DIRECCION}}, a quien en adelante se le denominará EL TELETRABAJADOR.

PRIMERA — OBJETO Y MODALIDAD
EL TELETRABAJADOR prestará sus servicios en el cargo de {{CARGO}} bajo modalidad de TELETRABAJO desde su domicilio u otro lugar que acuerde con EL EMPLEADOR. Las partes podrán pactar modalidad mixta (presencial + teletrabajo).

SEGUNDA — REMUNERACIÓN
S/ {{SUELDO}} ({{SUELDO_LETRAS}}) mensuales, depositados en cuenta del TELETRABAJADOR el último día útil de cada mes.

TERCERA — JORNADA Y DESCONEXIÓN DIGITAL
Jornada de {{JORNADA}} horas semanales. EL TELETRABAJADOR tiene DERECHO A LA DESCONEXIÓN DIGITAL fuera del horario pactado (Art. 18 Ley 31572). EL EMPLEADOR no puede exigir respuesta a comunicaciones laborales fuera de jornada.

CUARTA — HERRAMIENTAS Y COMPENSACIÓN DE GASTOS
EL EMPLEADOR proveerá las herramientas de trabajo (laptop, licencias de software) o compensará al TELETRABAJADOR por el uso de sus propias herramientas y gastos proporcionales de energía, internet, conforme al Reglamento de la Ley 31572.

QUINTA — INICIO DE LABORES
El {{FECHA_INGRESO}}.

SEXTA — BENEFICIOS SOCIALES
Los del régimen laboral de la actividad privada (D.Leg. 728): CTS semestral, gratificaciones julio/diciembre + bonificación extraordinaria 9%, vacaciones 30 días, EsSalud. Asignación familiar si corresponde.

SÉPTIMA — SST EN TELETRABAJO
EL TELETRABAJADOR se compromete a cumplir las recomendaciones ergonómicas de EL EMPLEADOR para prevenir riesgos derivados del trabajo remoto. EL EMPLEADOR podrá verificar las condiciones de seguridad del lugar de teletrabajo con aviso previo.

OCTAVA — CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS
EL TELETRABAJADOR guardará reserva sobre toda información confidencial y datos de clientes a los que acceda por razón del cargo (Ley 29733).

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
  const createdWorkers: Array<{
    id: string
    fechaIngreso: Date
    firstName: string
    lastName: string
    dni: string
    position: string
    regimen: RegimenLaboral
    sueldoBruto: number
  }> = []
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
    const fullLastName = `${lastName1} ${lastName2}`

    try {
      const w = await prisma.worker.upsert({
        where: { orgId_dni: { orgId: org.id, dni } },
        create: {
          orgId: org.id,
          dni,
          firstName,
          lastName: fullLastName,
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
        select: { id: true },
      })
      createdWorkers.push({
        id: w.id,
        fechaIngreso,
        firstName,
        lastName: fullLastName,
        dni,
        position: cargo,
        regimen: spec.regimenPrincipal,
        sueldoBruto: sueldo,
      })
    } catch (err) {
      console.warn(`   ⚠ Error creando worker ${dni}:`, (err as Error).message.slice(0, 100))
    }
  }
  console.log(`   ✓ ${createdWorkers.length}/${spec.workerCount} workers`)

  // 3.1 Vacaciones, documentos y alertas por trabajador
  let totalVacs = 0
  let totalDocs = 0
  let totalAlerts = 0
  for (const w of createdWorkers) {
    const yearsWorked = Math.max(
      1,
      Math.floor((Date.now() - w.fechaIngreso.getTime()) / (365 * 24 * 3600 * 1000)),
    )
    // ── Vacaciones: 1 registro por año trabajado, estado variable
    for (let y = 0; y < Math.min(yearsWorked, 4); y++) {
      const periodoInicio = new Date(w.fechaIngreso)
      periodoInicio.setFullYear(periodoInicio.getFullYear() + y)
      const periodoFin = new Date(periodoInicio)
      periodoFin.setFullYear(periodoFin.getFullYear() + 1)
      const diasCorresp = spec.regimenPrincipal === 'MYPE_MICRO' ? 15 : 30
      // Algunos trabajadores acumulan (50%), algunos gozaron parcial (30%), otros completo (20%)
      const r = rng()
      let diasGozados: number, fechaGoce: Date | null
      if (r < 0.5) {
        diasGozados = 0
        fechaGoce = null
      } else if (r < 0.8) {
        diasGozados = Math.floor(diasCorresp / 2)
        fechaGoce = new Date(periodoFin.getTime() - rng() * 180 * 24 * 3600 * 1000)
      } else {
        diasGozados = diasCorresp
        fechaGoce = new Date(periodoFin.getTime() - rng() * 90 * 24 * 3600 * 1000)
      }
      // esDoble si hay 2+ periodos sin goce
      const esDoble = y === 0 && yearsWorked >= 2 && diasGozados === 0
      try {
        await prisma.vacationRecord.create({
          data: {
            workerId: w.id,
            periodoInicio,
            periodoFin,
            diasCorresponden: diasCorresp,
            diasGozados,
            diasPendientes: diasCorresp - diasGozados,
            fechaGoce,
            esDoble,
          },
        })
        totalVacs++
      } catch {
        /* swallow dupes */
      }
    }

    // ── Documentos del legajo (mix de status para score realista)
    const docsPlan: Array<{
      cat: 'INGRESO' | 'VIGENTE' | 'SST' | 'PREVISIONAL'
      type: string
      title: string
      required: boolean
      expiresDays?: number
    }> = [
      { cat: 'INGRESO', type: 'dni_copia', title: 'Copia de DNI', required: true },
      { cat: 'INGRESO', type: 'contrato_trabajo', title: 'Contrato de Trabajo', required: true },
      { cat: 'INGRESO', type: 'cv', title: 'Currículum Vitae', required: true },
      { cat: 'INGRESO', type: 'antecedentes_policiales', title: 'Antecedentes Policiales', required: false },
      {
        cat: 'SST',
        type: 'induccion_sst',
        title: 'Constancia Inducción SST',
        required: true,
        expiresDays: 365,
      },
      {
        cat: 'SST',
        type: 'examen_medico',
        title: 'Examen Médico Ocupacional',
        required: spec.regimenPrincipal === 'CONSTRUCCION_CIVIL' || spec.regimenPrincipal === 'AGRARIO',
        expiresDays: 365,
      },
      {
        cat: 'SST',
        type: 'entrega_epp',
        title: 'Acta de Entrega EPP',
        required:
          spec.regimenPrincipal === 'CONSTRUCCION_CIVIL' || spec.regimenPrincipal === 'AGRARIO',
      },
      { cat: 'PREVISIONAL', type: 'afp_onp_afiliacion', title: 'Afiliación AFP/ONP', required: true },
      { cat: 'VIGENTE', type: 'boleta_pago', title: 'Última Boleta de Pago', required: false },
    ]
    for (const d of docsPlan) {
      const r2 = rng()
      // 60% VERIFIED, 20% UPLOADED (pendiente verificar), 15% MISSING, 5% EXPIRED
      let status: 'VERIFIED' | 'UPLOADED' | 'MISSING' | 'EXPIRED'
      let verifiedAt: Date | null = null
      let expiresAt: Date | null = null
      if (r2 < 0.6) {
        status = 'VERIFIED'
        verifiedAt = randomDateBetween(1, 0.02, rng)
        if (d.expiresDays) {
          expiresAt = new Date(verifiedAt.getTime() + d.expiresDays * 24 * 3600 * 1000)
        }
      } else if (r2 < 0.8) {
        status = 'UPLOADED'
        if (d.expiresDays) expiresAt = new Date(Date.now() + d.expiresDays * 24 * 3600 * 1000)
      } else if (r2 < 0.95) {
        status = 'MISSING'
      } else {
        status = 'EXPIRED'
        expiresAt = randomDateBetween(0.3, 0.01, rng) // venció hace 4-30 días
      }
      try {
        await prisma.workerDocument.create({
          data: {
            workerId: w.id,
            category: d.cat,
            documentType: d.type,
            title: d.title,
            isRequired: d.required,
            status,
            verifiedAt,
            expiresAt,
          },
        })
        totalDocs++
      } catch {
        /* dupes OK */
      }
    }

    // ── Alertas realistas para este worker (algunas CRITICAL que pegan en el cockpit)
    const alerts: Array<{
      type:
        | 'CONTRATO_POR_VENCER'
        | 'VACACIONES_ACUMULADAS'
        | 'VACACIONES_DOBLE_PERIODO'
        | 'DOCUMENTO_FALTANTE'
        | 'EXAMEN_MEDICO_VENCIDO'
        | 'CAPACITACION_PENDIENTE'
        | 'REGISTRO_INCOMPLETO'
      severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
      title: string
      description: string
      dueDaysFromNow: number
      multa?: number
    }> = []
    if (yearsWorked >= 2 && rng() < 0.35) {
      alerts.push({
        type: 'VACACIONES_DOBLE_PERIODO',
        severity: 'CRITICAL',
        title: `Vacaciones dobles acumuladas — ${w.firstName} ${w.lastName.split(' ')[0]}`,
        description:
          'El trabajador acumula 2+ períodos sin gozar vacaciones. Obligación de pago triple (Art. 23 D.Leg. 713).',
        dueDaysFromNow: -rng() * 60,
        multa: Math.round(w.sueldoBruto * 3),
      })
    }
    if (rng() < 0.4) {
      alerts.push({
        type: 'DOCUMENTO_FALTANTE',
        severity: 'HIGH',
        title: `Legajo incompleto — falta examen médico ocupacional`,
        description:
          'Documento obligatorio faltante del legajo. SUNAFIL puede exigirlo en inspección.',
        dueDaysFromNow: 15,
        multa: 3000,
      })
    }
    if (rng() < 0.25) {
      alerts.push({
        type: 'CONTRATO_POR_VENCER',
        severity: 'MEDIUM',
        title: `Contrato vence en 30 días`,
        description: 'Evaluar renovación o cese con liquidación de beneficios.',
        dueDaysFromNow: 30,
      })
    }
    if (rng() < 0.15 && spec.regimenPrincipal !== 'TELETRABAJO') {
      alerts.push({
        type: 'CAPACITACION_PENDIENTE',
        severity: 'MEDIUM',
        title: 'Capacitación anual SST pendiente',
        description: 'Ley 29783 exige 4 capacitaciones anuales en SST por trabajador.',
        dueDaysFromNow: 45,
      })
    }
    for (const a of alerts) {
      try {
        await prisma.workerAlert.create({
          data: {
            workerId: w.id,
            orgId: org.id,
            type: a.type,
            severity: a.severity,
            title: a.title,
            description: a.description,
            dueDate: new Date(Date.now() + a.dueDaysFromNow * 24 * 3600 * 1000),
            multaEstimada: a.multa ?? null,
          },
        })
        totalAlerts++
      } catch {
        /* dupes OK */
      }
    }
  }
  console.log(
    `   ✓ ${totalVacs} vacaciones · ${totalDocs} docs de legajo · ${totalAlerts} alertas`,
  )

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

  // 6. ComplianceScore — 4 snapshots históricos mostrando trend up
  const baseScore = Math.floor(rng() * 20 + 55) // 55-74 inicial
  const scoreSnapshots = [
    { daysAgo: 120, delta: 0 },
    { daysAgo: 90, delta: 4 },
    { daysAgo: 60, delta: 7 },
    { daysAgo: 30, delta: 11 },
    { daysAgo: 1, delta: 15 },
  ]
  for (const s of scoreSnapshots) {
    const score = Math.min(95, baseScore + s.delta)
    try {
      await prisma.complianceScore.create({
        data: {
          orgId: org.id,
          scoreGlobal: score,
          scoreContratos: Math.min(100, score + Math.floor(rng() * 10 - 5)),
          scoreSst: Math.min(100, score + Math.floor(rng() * 10 - 5)),
          scoreDocumentos: Math.min(100, score + Math.floor(rng() * 10 - 5)),
          scoreVencimientos: Math.min(100, score + Math.floor(rng() * 10 - 5)),
          scorePlanilla: Math.min(100, score + Math.floor(rng() * 10 - 5)),
          multaEvitada: Math.round((100 - score) * 1500 + rng() * 5000),
          calculatedAt: new Date(Date.now() - s.daysAgo * 24 * 3600 * 1000),
        },
      })
    } catch {
      /* ignore */
    }
  }
  console.log(`   ✓ 5 snapshots de ComplianceScore (${baseScore} → ${baseScore + 15})`)

  // 7. ComplianceDiagnostic FULL completado (con gap analysis + action plan)
  const diagScore = baseScore + 15
  const gapsData = [
    {
      id: 'sst_iperc',
      area: 'sst',
      title: 'Matriz IPERC no actualizada en últimos 12 meses',
      baseLegal: 'Ley 29783, Art. 57',
      gravedad: 'GRAVE',
      multaEvitable: 12500,
      plazoSugerido: 'Inmediato (7 días)',
    },
    {
      id: 'contratos_registro',
      area: 'contratos',
      title: 'Contratos sujetos a modalidad sin registro en T-Registro',
      baseLegal: 'D.S. 018-2007-TR',
      gravedad: 'GRAVE',
      multaEvitable: 8800,
      plazoSugerido: 'Urgente (15 días)',
    },
    {
      id: 'capacitacion_sst',
      area: 'sst',
      title: 'Capacitaciones SST por debajo del mínimo (4 al año)',
      baseLegal: 'Ley 29783, Art. 27',
      gravedad: 'GRAVE',
      multaEvitable: 9500,
      plazoSugerido: 'Corto plazo (30 días)',
    },
    {
      id: 'docs_legajo',
      area: 'legajo',
      title: 'Legajos físicos incompletos en ~15% de trabajadores',
      baseLegal: 'D.S. 001-98-TR',
      gravedad: 'LEVE',
      multaEvitable: 4200,
      plazoSugerido: 'Mediano plazo (60 días)',
    },
  ]
  const diag = await prisma.complianceDiagnostic
    .create({
      data: {
        orgId: org.id,
        type: 'FULL',
        scoreGlobal: diagScore,
        scoreByArea: {
          contratos: diagScore + 3,
          sst: diagScore - 8,
          legajo: diagScore + 2,
          vencimientos: diagScore + 5,
          planilla: diagScore + 4,
          denuncias: diagScore + 10,
        } as unknown as object,
        totalMultaRiesgo: gapsData.reduce((sum, g) => sum + g.multaEvitable, 0),
        questionsJson: { answeredCount: 135, totalCount: 135, completionRate: 100 } as unknown as object,
        gapAnalysis: { gaps: gapsData } as unknown as object,
        actionPlan: {
          generatedAt: new Date().toISOString(),
          totalActions: gapsData.length,
          estimatedMultaEvitable: gapsData.reduce((sum, g) => sum + g.multaEvitable, 0),
        } as unknown as object,
        completedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000),
      },
    })
    .catch(() => null)
  console.log(`   ✓ Diagnóstico SUNAFIL FULL completado (score ${diagScore}/100, 135 preguntas)`)

  // 7.1 ComplianceTask — convertir gaps del diagnóstico en tareas accionables
  if (diag) {
    for (let idx = 0; idx < gapsData.length; idx++) {
      const g = gapsData[idx]
      try {
        await prisma.complianceTask.create({
          data: {
            orgId: org.id,
            diagnosticId: diag.id,
            sourceId: g.id,
            area: g.area,
            priority: idx + 1,
            title: g.title,
            baseLegal: g.baseLegal,
            gravedad: g.gravedad as 'LEVE' | 'GRAVE' | 'MUY_GRAVE',
            multaEvitable: g.multaEvitable,
            plazoSugerido: g.plazoSugerido,
            dueDate: new Date(Date.now() + (idx + 1) * 15 * 24 * 3600 * 1000),
            status: idx === 0 ? 'IN_PROGRESS' : 'PENDING',
          },
        })
      } catch {
        /* ignore dupes */
      }
    }
    console.log(`   ✓ ${gapsData.length} ComplianceTasks del plan de acción`)
  }

  // 8. SstRecords (IPERC, Plan Anual, Capacitaciones, Accidente, EPP)
  const sstPlan: Array<{
    type:
      | 'POLITICA_SST'
      | 'IPERC'
      | 'PLAN_ANUAL'
      | 'CAPACITACION'
      | 'ACCIDENTE'
      | 'ENTREGA_EPP'
      | 'ACTA_COMITE'
      | 'MAPA_RIESGOS'
    title: string
    description: string
    daysAgo: number
    status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'OVERDUE'
  }> = [
    {
      type: 'POLITICA_SST',
      title: `Política SST 2026 — ${spec.razonSocial}`,
      description: 'Política general de SST aprobada y publicada a todos los trabajadores.',
      daysAgo: 60,
      status: 'COMPLETED',
    },
    {
      type: 'IPERC',
      title: 'Matriz IPERC — Identificación de Peligros y Evaluación de Riesgos',
      description: `Matriz IPERC del sector ${spec.sector.toLowerCase()}. Revisión anual pendiente.`,
      daysAgo: 30,
      status: 'IN_PROGRESS',
    },
    {
      type: 'PLAN_ANUAL',
      title: 'Plan Anual de Seguridad y Salud 2026',
      description: '12 actividades programadas: capacitaciones, simulacros, monitoreos.',
      daysAgo: 90,
      status: 'COMPLETED',
    },
    {
      type: 'CAPACITACION',
      title: 'Capacitación: Primeros Auxilios + RCP',
      description: `Asistentes: ${Math.floor(spec.workerCount * 0.85)} trabajadores. Duración: 4 horas.`,
      daysAgo: 20,
      status: 'COMPLETED',
    },
    {
      type: 'CAPACITACION',
      title: 'Capacitación: Prevención de Hostigamiento Sexual Laboral',
      description: 'Capacitación obligatoria Ley 27942. Evaluación con 80% mínimo aprobado.',
      daysAgo: 10,
      status: 'PENDING',
    },
  ]
  if (spec.regimenPrincipal === 'CONSTRUCCION_CIVIL' || spec.regimenPrincipal === 'AGRARIO') {
    sstPlan.push({
      type: 'ACCIDENTE',
      title: 'Incidente sin daño reportado — trabajador resbaló en zona húmeda',
      description:
        'Incidente sin lesiones. Investigación completada. Medida correctiva: señalización mejorada.',
      daysAgo: 45,
      status: 'COMPLETED',
    })
    sstPlan.push({
      type: 'ENTREGA_EPP',
      title: 'Renovación trimestral de EPP',
      description: `Entrega a ${spec.workerCount} trabajadores. Incluye botas, cascos, guantes.`,
      daysAgo: 15,
      status: 'COMPLETED',
    })
    sstPlan.push({
      type: 'MAPA_RIESGOS',
      title: 'Mapa de Riesgos actualizado del centro de trabajo',
      description:
        'Señalización actualizada de zonas de riesgo, rutas de evacuación y puntos de encuentro.',
      daysAgo: 50,
      status: 'COMPLETED',
    })
  }
  let sstCount = 0
  for (const s of sstPlan) {
    try {
      await prisma.sstRecord.create({
        data: {
          orgId: org.id,
          type: s.type,
          title: s.title,
          description: s.description,
          status: s.status,
          dueDate: new Date(Date.now() + (30 - s.daysAgo) * 24 * 3600 * 1000),
          completedAt: s.status === 'COMPLETED' ? new Date(Date.now() - s.daysAgo * 24 * 3600 * 1000) : null,
        },
      })
      sstCount++
    } catch {
      /* dupes ok */
    }
  }
  console.log(`   ✓ ${sstCount} registros SST (IPERC, capacitaciones, accidentes, EPP)`)

  // 9. Complaint — ejemplo de denuncia recibida (solo 2 orgs)
  if (spec.rngSeed % 2 === 0) {
    const complaintCode = `DEN-2026-${String(spec.rngSeed).slice(-3)}-001`
    try {
      const complaint = await prisma.complaint.create({
        data: {
          orgId: org.id,
          code: complaintCode,
          type: 'HOSTIGAMIENTO_SEXUAL',
          isAnonymous: true,
          description:
            'Denuncia recibida por canal anónimo. Trabajadora reporta comentarios inapropiados reiterados de supervisor. Solicita medidas de protección urgentes.',
          status: 'INVESTIGATING',
          receivedAt: new Date(Date.now() - 12 * 24 * 3600 * 1000),
        },
      })
      // Timeline de la denuncia
      const timelineEntries = [
        {
          action: 'Denuncia recibida',
          description: 'Recibida por formulario web, clasificada como HOSTIGAMIENTO_SEXUAL.',
          daysAgo: 12,
        },
        {
          action: 'Medidas de protección aplicadas',
          description:
            'Separación física de denunciante y denunciado. Cambio temporal de área y supervisión.',
          daysAgo: 11,
        },
        {
          action: 'Comité inicia investigación',
          description:
            'Comité de Intervención convocado. Entrevistas con denunciante, testigos y denunciado.',
          daysAgo: 7,
        },
      ]
      for (const t of timelineEntries) {
        await prisma.complaintTimeline.create({
          data: {
            complaintId: complaint.id,
            action: t.action,
            description: t.description,
            createdAt: new Date(Date.now() - t.daysAgo * 24 * 3600 * 1000),
          },
        })
      }
      console.log(`   ✓ 1 denuncia con timeline (${complaintCode})`)
    } catch {
      /* dupes ok */
    }
  }
}

async function main() {
  const totalWorkers = EMPRESAS.reduce((s, e) => s + e.workerCount, 0)
  console.log('\n🌱 COMPLY360 — SEED COMPLETO DE 5 EMPRESAS DEMO\n')
  console.log(
    `Esto crea ${EMPRESAS.length} empresas con ~${totalWorkers} workers + legajo + alertas + `,
  )
  console.log('   scores históricos + diagnóstico SUNAFIL + SST records + denuncias.\n')

  for (const empresa of EMPRESAS) {
    await seedEmpresa(empresa)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(
    `\n✅ Seed completo. ${EMPRESAS.length} empresas · ${totalWorkers} workers · `,
  )
  console.log('   ~600 documentos de legajo · ~200 alertas · 25 snapshots de score')
  console.log('   · 5 diagnósticos SUNAFIL · 35+ registros SST · 2 denuncias\n')
  console.log('🔗 EMAILS DEMO (signup con estos para encontrar la org poblada):\n')
  EMPRESAS.forEach((e, i) => {
    const flag =
      e.regimenPrincipal === 'MYPE_MICRO' ? '🏪' :
      e.regimenPrincipal === 'CONSTRUCCION_CIVIL' ? '👷' :
      e.regimenPrincipal === 'GENERAL' ? '⚖️' :
      e.regimenPrincipal === 'AGRARIO' ? '🌾' :
      e.regimenPrincipal === 'TELETRABAJO' ? '💻' : '📋'
    console.log(
      `   ${i + 1}. ${flag} ${e.email.padEnd(35)} ${e.name.padEnd(32)} ${e.regimenPrincipal} · ${e.workerCount} workers`,
    )
  })
  console.log('\n   Plan: PRO con trial 14 días activo en todas.')
  console.log('\n💡 Para usar emails distintos:')
  console.log('      DEMO_EMAIL_1=... DEMO_EMAIL_2=... ... DEMO_EMAIL_5=... \\')
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
