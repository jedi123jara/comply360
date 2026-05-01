/**
 * Seed demo del módulo Organigrama.
 *
 * Crea o reutiliza una organización de prueba con 50 trabajadores peruanos
 * verosímiles (PYME retail, S/2,000-10,000 de sueldo) con `position` y
 * `department` poblados, lista para ejercitar `seed-from-legacy`.
 *
 * Uso:
 *   npx tsx scripts/seed-orgchart-demo.ts
 *
 * Idempotente — si ya existe, no duplica workers.
 */

import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const DEPTS = [
  'Gerencia General',
  'Operaciones',
  'Tienda Lima Centro',
  'Tienda Miraflores',
  'Tienda San Isidro',
  'Logística',
  'RRHH',
  'Contabilidad',
  'Marketing',
  'Sistemas',
] as const

const POSITIONS_BY_DEPT: Record<string, string[]> = {
  'Gerencia General': ['Gerente General'],
  Operaciones: ['Gerente de Operaciones', 'Coordinador de Operaciones', 'Asistente de Operaciones'],
  'Tienda Lima Centro': ['Jefe de Tienda', 'Vendedor', 'Vendedor', 'Vendedor', 'Cajero'],
  'Tienda Miraflores': ['Jefe de Tienda', 'Vendedor', 'Vendedor', 'Cajero'],
  'Tienda San Isidro': ['Jefe de Tienda', 'Vendedor', 'Vendedor', 'Cajero'],
  Logística: ['Jefe de Logística', 'Almacenero', 'Almacenero', 'Chofer', 'Chofer'],
  RRHH: ['Jefa de RRHH', 'Asistenta de RRHH'],
  Contabilidad: ['Jefe de Contabilidad', 'Asistente Contable', 'Asistente Contable'],
  Marketing: ['Jefa de Marketing', 'Diseñadora Gráfica', 'Community Manager'],
  Sistemas: ['Jefe de Sistemas', 'Soporte TI'],
}

const NOMBRES_M = [
  'Carlos',
  'Luis',
  'José',
  'Juan',
  'Miguel',
  'Daniel',
  'Diego',
  'Andrés',
  'Sergio',
  'Pedro',
  'Manuel',
  'Felipe',
  'Roberto',
  'Iván',
  'Marco',
]
const NOMBRES_F = [
  'María',
  'Ana',
  'Lucía',
  'Carmen',
  'Patricia',
  'Sandra',
  'Rosa',
  'Lourdes',
  'Sofía',
  'Valeria',
  'Andrea',
  'Daniela',
  'Mónica',
  'Claudia',
  'Verónica',
]
const APELLIDOS = [
  'Quispe',
  'Huamán',
  'Vargas',
  'Flores',
  'Mendoza',
  'Castillo',
  'Rojas',
  'Torres',
  'Ramírez',
  'Salazar',
  'Cárdenas',
  'Pérez',
  'García',
  'López',
  'Sánchez',
  'Reyes',
  'Espinoza',
  'Cabrera',
  'Aguilar',
  'Velásquez',
]

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDni(): string {
  return String(Math.floor(10000000 + Math.random() * 89999999))
}

function randomSueldo(position: string): number {
  const lower = position.toLowerCase()
  if (lower.includes('gerente general')) return 8000 + Math.floor(Math.random() * 4000)
  if (lower.includes('gerente') || lower.includes('jefa') || lower.includes('jefe'))
    return 4500 + Math.floor(Math.random() * 2500)
  if (lower.includes('coordinador')) return 3000 + Math.floor(Math.random() * 1500)
  if (lower.includes('cajero') || lower.includes('almacenero') || lower.includes('chofer'))
    return 1500 + Math.floor(Math.random() * 700)
  return 1300 + Math.floor(Math.random() * 1000)
}

async function main() {
  console.log('🌱 Seed demo organigrama...')

  // Buscar o crear org demo
  let org = await prisma.organization.findFirst({
    where: { name: { contains: 'Demo Organigrama', mode: 'insensitive' } },
  })

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Demo Organigrama Retail SAC',
        razonSocial: 'Demo Organigrama Retail S.A.C.',
        ruc: '20' + Math.floor(Math.random() * 1e9).toString().padStart(9, '0'),
        sector: 'retail',
        sizeRange: '51-200',
        plan: 'EMPRESA',
        regimenPrincipal: 'GENERAL',
        onboardingCompleted: true,
      },
    })
    console.log(`✅ Organización creada: ${org.name} (id ${org.id})`)
  } else {
    console.log(`♻️  Reutilizando organización existente: ${org.name}`)
  }

  // Generar workers
  const targets: Array<{ dept: string; position: string }> = []
  for (const dept of DEPTS) {
    for (const pos of POSITIONS_BY_DEPT[dept] ?? []) {
      targets.push({ dept, position: pos })
    }
  }
  // 41 generados arriba — completar hasta 50 con vendedores extra en Lima Centro
  while (targets.length < 50) {
    targets.push({ dept: 'Tienda Lima Centro', position: 'Vendedor' })
  }

  let created = 0
  for (const t of targets) {
    const isF = Math.random() < 0.5
    const firstName = pick(isF ? NOMBRES_F : NOMBRES_M)
    const lastName = `${pick(APELLIDOS)} ${pick(APELLIDOS)}`
    const dni = randomDni()
    // skip si ya existe ese DNI en esta org
    const exists = await prisma.worker.findFirst({
      where: { orgId: org.id, dni },
      select: { id: true },
    })
    if (exists) continue

    await prisma.worker.create({
      data: {
        orgId: org.id,
        dni,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.split(' ')[0].toLowerCase()}@demo.local`,
        position: t.position,
        department: t.dept,
        regimenLaboral: 'GENERAL',
        tipoContrato: 'INDEFINIDO',
        fechaIngreso: new Date(2023, Math.floor(Math.random() * 24), 1),
        sueldoBruto: randomSueldo(t.position),
        status: 'ACTIVE',
      },
    })
    created++
  }

  console.log(`✅ ${created} trabajadores creados (de ${targets.length} planificados)`)
  console.log(`\n💡 Para probar el organigrama, ingresa con esta orgId: ${org.id}`)
  console.log(`   Plan asignado: ${org.plan}`)
  console.log(`\n   Luego corre desde la UI: /dashboard/organigrama → wizard de seed legacy`)
}

main()
  .catch(err => {
    console.error('❌ Error en seed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
