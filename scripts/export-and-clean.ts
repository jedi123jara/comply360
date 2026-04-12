/**
 * COMPLY360 — Export y limpieza de datos de prueba
 *
 * USO:
 *   npx tsx scripts/export-and-clean.ts           → solo exporta
 *   npx tsx scripts/export-and-clean.ts --delete  → exporta Y borra todo
 */

import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as any)

const DELETE_MODE = process.argv.includes('--delete')
const EXPORT_DIR  = path.join(process.cwd(), 'scripts', 'export')

// ─── Helpers ─────────────────────────────────────────────────────────────────
const g  = (s: string) => `\x1b[32m${s}\x1b[0m`
const y  = (s: string) => `\x1b[33m${s}\x1b[0m`
const r  = (s: string) => `\x1b[31m${s}\x1b[0m`
const b  = (s: string) => `\x1b[1m${s}\x1b[0m`
const cy = (s: string) => `\x1b[36m${s}\x1b[0m`

const ok   = (m: string) => console.log(g('  ✓ ') + m)
const warn = (m: string) => console.log(y('  ⚠ ') + m)

function saveJson(filepath: string, data: unknown) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8')
}

function saveTxt(filepath: string, title: string, rows: Record<string, unknown>[]) {
  if (!rows?.length) return
  const lines = ['='.repeat(62), `  ${title}`, '='.repeat(62), '']
  rows.forEach((row, i) => {
    lines.push(`--- Registro #${i + 1} ---`)
    for (const [k, v] of Object.entries(row)) {
      if (v !== null && v !== undefined && v !== '') {
        const val = typeof v === 'object' ? JSON.stringify(v) : String(v)
        lines.push(`  ${k.padEnd(28)}: ${val.slice(0, 120)}`)
      }
    }
    lines.push('')
  })
  fs.writeFileSync(filepath, lines.join('\n'), 'utf-8')
}

// ══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('')
  console.log(b(cy('══════════════════════════════════════════════')))
  console.log(b(cy('  COMPLY360 — Exportador de datos de prueba')))
  console.log(b(cy('══════════════════════════════════════════════')))
  console.log('')

  if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true })

  // ── Organizaciones ──────────────────────────────────────────────────────────
  const orgs = await prisma.organization.findMany({ include: { subscription: true } })

  if (orgs.length === 0) {
    warn('No hay organizaciones en la base de datos.')
    await prisma.$disconnect(); await pool.end()
    return
  }

  saveJson(path.join(EXPORT_DIR, 'organizaciones.json'), orgs)
  saveTxt(path.join(EXPORT_DIR, 'EMPRESAS.txt'), 'DATOS DE EMPRESAS', orgs.map(o => ({
    ID:              o.id,
    Nombre:          o.name,
    RUC:             o.ruc ?? '',
    Sector:          (o as any).sector ?? '',
    Tamaño:          (o as any).tamano ?? '',
    Régimen:         (o as any).regimenLaboral ?? '',
    'Nº Trabajadores': (o as any).numTrabajadores ?? '',
    Dirección:       (o as any).direccion ?? '',
    Teléfono:        (o as any).telefono ?? '',
    'Email Alertas': (o as any).alertEmail ?? '',
    Plan:            o.plan,
    'Onboarding OK': o.onboardingCompleted ? 'Sí' : 'No',
    Creado:          o.createdAt?.toISOString().slice(0, 10),
    'Plan/Status':   (o as any).subscription?.status ?? '',
  })))
  ok(`organizaciones.json + EMPRESAS.txt (${orgs.length} empresa(s))`)

  // ── Por cada empresa ─────────────────────────────────────────────────────────
  for (const org of orgs) {
    const slug   = org.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)
    const orgDir = path.join(EXPORT_DIR, `empresa__${slug}`)
    if (!fs.existsSync(orgDir)) fs.mkdirSync(orgDir, { recursive: true })

    console.log('')
    console.log(b(`  🏢 ${org.name}  (${org.ruc ?? 'Sin RUC'})`))

    // Usuarios
    const users = await prisma.user.findMany({ where: { orgId: org.id } })
    if (users.length) {
      saveJson(path.join(orgDir, 'usuarios.json'), users)
      saveTxt(path.join(orgDir, 'USUARIOS.txt'), 'USUARIOS DEL SISTEMA', users.map(u => ({
        Email:   u.email,
        Nombre:  `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
        Rol:     u.role,
        ClerkID: u.clerkId,
        Creado:  u.createdAt?.toISOString().slice(0, 10),
      })))
      ok(`  USUARIOS.txt (${users.length})`)
    }

    // Trabajadores — raw SQL para evitar mismatch de columnas
    const workers: any[]     = await prisma.$queryRaw`SELECT * FROM workers WHERE org_id = ${org.id}`
    const workerDocs: any[]  = await prisma.$queryRaw<any[]>`SELECT wd.* FROM worker_documents wd JOIN workers w ON w.id = wd.worker_id WHERE w.org_id = ${org.id}`.catch(() => [] as any[])
    const workerAlerts: any[] = await prisma.$queryRaw<any[]>`SELECT * FROM worker_alerts WHERE org_id = ${org.id}`.catch(() => [] as any[])
    if (workers.length) {
      saveJson(path.join(orgDir, 'trabajadores.json'), workers)
      saveTxt(path.join(orgDir, 'TRABAJADORES.txt'), 'LISTA DE TRABAJADORES', workers.map(w => ({
        DNI:              w.dni ?? '',
        Nombre:           w.firstName,
        Apellido:         w.lastName,
        Email:            w.email ?? '',
        Teléfono:         w.phone ?? '',
        Cargo:            w.position ?? '',
        Departamento:     w.department ?? '',
        Régimen:          w.regimenLaboral ?? '',
        'Tipo Contrato':  w.tipoContrato ?? '',
        'Fecha Ingreso':  w.fechaIngreso?.toISOString().slice(0, 10) ?? '',
        'Fecha Cese':     w.fechaCese?.toISOString().slice(0, 10) ?? '',
        'Sueldo Bruto':   w.sueldoBruto ? `S/ ${w.sueldoBruto}` : '',
        Estado:           w.status,
        Documentos:       workerDocs.filter((d: any) => d.workerId === w.id).length,
        'Alertas activas': workerAlerts.filter((a: any) => a.workerId === w.id && !a.resolvedAt).length,
      })))
      ok(`  TRABAJADORES.txt (${workers.length})`)
    }

    // Contratos — raw SQL
    const contracts: any[] = await prisma.$queryRaw<any[]>`SELECT * FROM contracts WHERE org_id = ${org.id}`.catch(() => [] as any[])
    if (contracts.length) {
      saveJson(path.join(orgDir, 'contratos.json'), contracts)
      saveTxt(path.join(orgDir, 'CONTRATOS.txt'), 'CONTRATOS', contracts.map(c => ({
        Título:      c.title,
        Tipo:        c.type,
        Estado:      c.status,
        Vence:       c.expiresAt?.toISOString().slice(0, 10) ?? '',
        Firmado:     c.signedAt?.toISOString().slice(0, 10) ?? '',
        'Riesgo IA': c.aiRiskScore ?? '',
        Creado:      c.createdAt?.toISOString().slice(0, 10),
      })))
      ok(`  CONTRATOS.txt (${contracts.length})`)
    }

    // Diagnósticos — raw SQL
    const diagnostics: any[] = await prisma.$queryRaw<any[]>`SELECT * FROM compliance_diagnostics WHERE org_id = ${org.id}`.catch(() => [] as any[])
    if (diagnostics.length) {
      saveJson(path.join(orgDir, 'diagnosticos.json'), diagnostics)
      saveTxt(path.join(orgDir, 'DIAGNOSTICOS.txt'), 'DIAGNÓSTICOS COMPLIANCE', diagnostics.map(d => ({
        Tipo:           d.type,
        'Score Global': d.scoreGlobal,
        'Multa Riesgo': d.totalMultaRiesgo ? `S/ ${d.totalMultaRiesgo}` : '',
        Completado:     d.completedAt?.toISOString().slice(0, 10) ?? '',
        'Score Áreas':  JSON.stringify(d.scoreByArea ?? {}),
      })))
      ok(`  DIAGNOSTICOS.txt (${diagnostics.length})`)
    }

    // SST
    const sst: any[] = await prisma.$queryRaw<any[]>`SELECT * FROM sst_records WHERE org_id = ${org.id}`.catch(() => [] as any[])
    if (sst.length) {
      saveJson(path.join(orgDir, 'sst.json'), sst)
      saveTxt(path.join(orgDir, 'SST.txt'), 'REGISTROS SST', sst.map(s => ({
        Tipo:        s.type,
        Título:      s.title,
        Estado:      s.status,
        Vence:       s.dueDate?.toISOString().slice(0, 10) ?? '',
        Completado:  s.completedAt?.toISOString().slice(0, 10) ?? '',
      })))
      ok(`  SST.txt (${sst.length})`)
    }

    // Denuncias
    const complaints: any[] = await prisma.$queryRaw<any[]>`SELECT * FROM complaints WHERE org_id = ${org.id}`.catch(() => [] as any[])
    if (complaints.length) {
      saveJson(path.join(orgDir, 'denuncias.json'), complaints)
      saveTxt(path.join(orgDir, 'DENUNCIAS.txt'), 'CANAL DE DENUNCIAS', complaints.map(c => ({
        Código:      c.code,
        Tipo:        c.type,
        Anónimo:     c.isAnonymous ? 'Sí' : 'No',
        Estado:      c.status,
        Descripción: (c.description ?? '').slice(0, 100),
        Creado:      c.createdAt?.toISOString().slice(0, 10),
      })))
      ok(`  DENUNCIAS.txt (${complaints.length})`)
    }

    // Documentos, cálculos, relaciones colectivas
    const docs: any[]     = await prisma.$queryRaw<any[]>`SELECT * FROM org_documents WHERE org_id = ${org.id}`.catch(() => [] as any[])
    const calcs: any[]    = await prisma.$queryRaw<any[]>`SELECT * FROM calculations WHERE org_id = ${org.id}`.catch(() => [] as any[])
    const sindical: any[] = await prisma.$queryRaw<any[]>`SELECT * FROM sindical_records WHERE org_id = ${org.id}`.catch(() => [] as any[])

    if (docs.length)    { saveJson(path.join(orgDir, 'documentos.json'), docs); ok(`  documentos.json (${docs.length})`) }
    if (calcs.length)   { saveJson(path.join(orgDir, 'calculos.json'), calcs);   ok(`  calculos.json (${calcs.length})`) }
    if (sindical.length){ saveJson(path.join(orgDir, 'sindical.json'), sindical); ok(`  sindical.json (${sindical.length})`) }

    // Resumen
    const summary = {
      empresa: org.name, ruc: org.ruc, plan: org.plan,
      exportadoEn: new Date().toISOString(),
      totales: {
        usuarios: users.length, trabajadores: workers.length,
        contratos: contracts.length, diagnosticos: diagnostics.length,
        sst: sst.length, denuncias: complaints.length,
        documentos: docs.length, calculos: calcs.length,
      }
    }
    saveJson(path.join(orgDir, '_RESUMEN.json'), summary)
    ok(`  _RESUMEN.json`)
  }

  // ── Resumen global ──────────────────────────────────────────────────────────
  console.log('')
  console.log(b('📊 Empresas exportadas:'))
  orgs.forEach(o => console.log(`   • ${o.name}  (${o.ruc ?? 'Sin RUC'})  — Plan: ${o.plan}`))

  // ══════════════════════════════════════════════════════════════════════════════
  // BORRADO
  // ══════════════════════════════════════════════════════════════════════════════
  if (DELETE_MODE) {
    console.log('')
    console.log(b(r('⚠  BORRANDO todos los datos...')))
    console.log('')

    const steps: [string, () => Promise<{ count: number }>][] = [
      ['AuditLog',             () => prisma.auditLog.deleteMany()],
      ['LessonProgress',       () => prisma.lessonProgress.deleteMany()],
      ['Enrollment',           () => prisma.enrollment.deleteMany()],
      ['Certificate',          () => prisma.certificate.deleteMany()],
      ['WorkerAlert',          () => prisma.workerAlert.deleteMany()],
      ['WorkerDocument',       () => prisma.workerDocument.deleteMany()],
      ['VacationRecord',       () => prisma.vacationRecord.deleteMany()],
      ['WorkerContract',       () => prisma.workerContract.deleteMany()],
      ['WorkerRequest',        () => prisma.workerRequest.deleteMany()],
      ['Attendance',           () => prisma.attendance.deleteMany()],
      ['Payslip',              () => prisma.payslip.deleteMany()],
      ['Worker',               () => prisma.worker.deleteMany()],
      ['ComplaintTimeline',    () => prisma.complaintTimeline.deleteMany()],
      ['Complaint',            () => prisma.complaint.deleteMany()],
      ['SstRecord',            () => prisma.sstRecord.deleteMany()],
      ['SindicalRecord',       () => prisma.sindicalRecord.deleteMany()],
      ['Tercero',              () => prisma.tercero.deleteMany()],
      ['Contract',             () => prisma.contract.deleteMany()],
      ['OrgDocument',          () => prisma.orgDocument.deleteMany()],
      ['OrgAlert',             () => prisma.orgAlert.deleteMany()],
      ['ComplianceDiagnostic', () => prisma.complianceDiagnostic.deleteMany()],
      ['ComplianceScore',      () => prisma.complianceScore.deleteMany()],
      ['Calculation',          () => prisma.calculation.deleteMany()],
      ['Invitation',           () => prisma.invitation.deleteMany()],
      ['Subscription',         () => prisma.subscription.deleteMany()],
      ['User',                 () => prisma.user.deleteMany()],
      ['Organization',         () => prisma.organization.deleteMany()],
    ]

    for (const [name, fn] of steps) {
      try {
        const res = await fn()
        if (res.count > 0) ok(`${name}: ${res.count} registros eliminados`)
      } catch (e: any) {
        warn(`${name}: ${String(e.message).slice(0, 80)}`)
      }
    }

    console.log('')
    console.log(b(g('✅ Base de datos limpia. Lista para nuevo cliente.')))
  } else {
    console.log('')
    console.log(y('  Solo exportación. Para borrar también corre:'))
    console.log(b('  npx tsx scripts/export-and-clean.ts --delete'))
  }

  console.log('')
  console.log(b(g(`✅ Archivos en: scripts/export/`)))
  console.log('')

  await prisma.$disconnect()
  await pool.end()
}

main().catch(async e => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
