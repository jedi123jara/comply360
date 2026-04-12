/**
 * COMPLY360 — Export y limpieza de datos de prueba
 *
 * USO:
 *   node scripts/export-and-clean.mjs          → solo exporta
 *   node scripts/export-and-clean.mjs --delete  → exporta Y borra todo
 *
 * Genera archivos en: scripts/export/
 */

import { PrismaClient } from '../src/generated/prisma/index.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()
const DELETE_MODE = process.argv.includes('--delete')
const EXPORT_DIR = path.join(__dirname, 'export')

// ─── Colores para consola ──────────────────────────────────────────────────
const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
}

function log(msg)  { console.log(msg) }
function ok(msg)   { console.log(c.green('  ✓ ') + msg) }
function warn(msg) { console.log(c.yellow('  ⚠ ') + msg) }
function err(msg)  { console.log(c.red('  ✗ ') + msg) }

// ─── Guardar JSON formateado ───────────────────────────────────────────────
function saveJson(filename, data) {
  const filepath = path.join(EXPORT_DIR, filename)
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8')
  ok(`Exportado: ${filename} (${Array.isArray(data) ? data.length : 1} registros)`)
  return filepath
}

// ─── Formato legible para referencia manual ────────────────────────────────
function saveReadable(filename, title, rows) {
  if (!rows || rows.length === 0) return
  const lines = [`${'='.repeat(60)}`, `  ${title}`, `${'='.repeat(60)}`, '']
  rows.forEach((row, i) => {
    lines.push(`--- Registro #${i + 1} ---`)
    Object.entries(row).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') {
        const val = typeof v === 'object' ? JSON.stringify(v) : String(v)
        lines.push(`  ${k.padEnd(28)}: ${val.slice(0, 120)}`)
      }
    })
    lines.push('')
  })
  const filepath = path.join(EXPORT_DIR, filename)
  fs.writeFileSync(filepath, lines.join('\n'), 'utf-8')
  ok(`Exportado: ${filename}`)
}

// ══════════════════════════════════════════════════════════════════════════
async function main() {
  log('')
  log(c.bold(c.cyan('═══════════════════════════════════════════════')))
  log(c.bold(c.cyan('  COMPLY360 — Exportador de datos de prueba')))
  log(c.bold(c.cyan('═══════════════════════════════════════════════')))
  log('')

  // Crear directorio de exportación
  if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true })

  // ── 1. Organizaciones ────────────────────────────────────────────────────
  log(c.bold('📦 Exportando organizaciones...'))
  const orgs = await prisma.organization.findMany({
    include: {
      subscription: true,
    }
  })

  if (orgs.length === 0) {
    warn('No hay organizaciones en la base de datos.')
    await prisma.$disconnect()
    return
  }

  saveJson('organizaciones.json', orgs)
  saveReadable('EMPRESAS.txt', 'DATOS DE EMPRESAS', orgs.map(o => ({
    'ID':              o.id,
    'Nombre':          o.name,
    'RUC':             o.ruc || '',
    'Sector':          o.sector || '',
    'Tamaño':          o.tamano || '',
    'Régimen':         o.regimenLaboral || '',
    'Nº Trabajadores': o.numTrabajadores || '',
    'Dirección':       o.direccion || '',
    'Teléfono':        o.telefono || '',
    'Email Alerta':    o.alertEmail || '',
    'Plan':            o.plan,
    'Onboarding OK':   o.onboardingCompleted ? 'Sí' : 'No',
    'Creado':          o.createdAt?.toISOString()?.slice(0, 10) || '',
  })))

  log('')
  log(c.bold(`📦 Exportando datos de ${orgs.length} empresa(s)...`))

  for (const org of orgs) {
    const orgSlug = org.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)
    const orgDir = path.join(EXPORT_DIR, `empresa_${orgSlug}`)
    if (!fs.existsSync(orgDir)) fs.mkdirSync(orgDir, { recursive: true })

    log('')
    log(c.bold(`  🏢 ${org.name} (${org.ruc || 'Sin RUC'})`))

    // ── Usuarios de la empresa ─────────────────────────────────────────────
    const users = await prisma.user.findMany({ where: { orgId: org.id } })
    if (users.length > 0) {
      fs.writeFileSync(
        path.join(orgDir, 'usuarios.json'),
        JSON.stringify(users, null, 2)
      )
      saveReadable = (fn, ttl, rows) => {
        const lines = [`${'='.repeat(60)}`, `  ${ttl}`, `${'='.repeat(60)}`, '']
        rows.forEach((r, i) => {
          lines.push(`--- #${i + 1} ---`)
          Object.entries(r).forEach(([k, v]) => {
            if (v) lines.push(`  ${k.padEnd(28)}: ${String(v).slice(0, 120)}`)
          })
          lines.push('')
        })
        fs.writeFileSync(path.join(orgDir, fn), lines.join('\n'), 'utf-8')
      }
      const saveL = (fn, ttl, rows) => {
        const lines = [`${'='.repeat(60)}`, `  ${ttl}`, `${'='.repeat(60)}`, '']
        rows.forEach((r, i) => {
          lines.push(`--- #${i + 1} ---`)
          Object.entries(r).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') lines.push(`  ${k.padEnd(28)}: ${String(v).slice(0, 120)}`)
          })
          lines.push('')
        })
        fs.writeFileSync(path.join(orgDir, fn), lines.join('\n'), 'utf-8')
        ok(`  ${fn}`)
      }

      saveL('USUARIOS.txt', 'USUARIOS DEL SISTEMA', users.map(u => ({
        'Email':    u.email,
        'Nombre':   `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        'Rol':      u.role,
        'Clerk ID': u.clerkId,
        'Creado':   u.createdAt?.toISOString()?.slice(0, 10) || '',
      })))
    }

    // ── Trabajadores ──────────────────────────────────────────────────────
    const workers = await prisma.worker.findMany({
      where: { orgId: org.id },
      include: {
        documents: true,
        vacationRecords: true,
        alerts: true,
      }
    })

    const saveL = (fn, ttl, rows) => {
      const lines = [`${'='.repeat(60)}`, `  ${ttl}`, `${'='.repeat(60)}`, '']
      rows.forEach((r, i) => {
        lines.push(`--- #${i + 1} ---`)
        Object.entries(r).forEach(([k, v]) => {
          if (v !== null && v !== undefined && v !== '') lines.push(`  ${k.padEnd(28)}: ${String(v).slice(0, 120)}`)
        })
        lines.push('')
      })
      fs.writeFileSync(path.join(orgDir, fn), lines.join('\n'), 'utf-8')
      ok(`  ${fn}`)
    }

    if (workers.length > 0) {
      fs.writeFileSync(path.join(orgDir, 'trabajadores.json'), JSON.stringify(workers, null, 2))
      saveL('TRABAJADORES.txt', 'LISTA DE TRABAJADORES', workers.map(w => ({
        'DNI':              w.dni || '',
        'Nombre':           w.firstName,
        'Apellido':         w.lastName,
        'Email':            w.email || '',
        'Teléfono':         w.phone || '',
        'Cargo':            w.position || '',
        'Departamento':     w.department || '',
        'Régimen':          w.regimenLaboral || '',
        'Tipo Contrato':    w.tipoContrato || '',
        'Fecha Ingreso':    w.fechaIngreso?.toISOString()?.slice(0, 10) || '',
        'Fecha Cese':       w.fechaCese?.toISOString()?.slice(0, 10) || '',
        'Sueldo Bruto':     w.sueldoBruto ? `S/ ${w.sueldoBruto}` : '',
        'Estado':           w.status,
        'Documentos':       w.documents?.length || 0,
        'Alertas activas':  w.alerts?.filter(a => !a.resolvedAt).length || 0,
      })))
    }

    // ── Contratos ─────────────────────────────────────────────────────────
    const contracts = await prisma.contract.findMany({ where: { orgId: org.id } })
    if (contracts.length > 0) {
      fs.writeFileSync(path.join(orgDir, 'contratos.json'), JSON.stringify(contracts, null, 2))
      saveL('CONTRATOS.txt', 'CONTRATOS', contracts.map(c => ({
        'Título':       c.title,
        'Tipo':         c.type,
        'Estado':       c.status,
        'Vence':        c.expiresAt?.toISOString()?.slice(0, 10) || '',
        'Firmado':      c.signedAt?.toISOString()?.slice(0, 10) || '',
        'Riesgo IA':    c.aiRiskScore || '',
        'Creado':       c.createdAt?.toISOString()?.slice(0, 10) || '',
      })))
    }

    // ── Diagnósticos ───────────────────────────────────────────────────────
    const diagnostics = await prisma.complianceDiagnostic.findMany({ where: { orgId: org.id } })
    if (diagnostics.length > 0) {
      fs.writeFileSync(path.join(orgDir, 'diagnosticos.json'), JSON.stringify(diagnostics, null, 2))
      saveL('DIAGNOSTICOS.txt', 'DIAGNÓSTICOS DE COMPLIANCE', diagnostics.map(d => ({
        'Tipo':          d.type,
        'Score Global':  d.scoreGlobal,
        'Multa Riesgo':  d.totalMultaRiesgo ? `S/ ${d.totalMultaRiesgo}` : '',
        'Completado':    d.completedAt?.toISOString()?.slice(0, 10) || '',
        'Score Áreas':   JSON.stringify(d.scoreByArea || {}),
      })))
    }

    // ── SST ────────────────────────────────────────────────────────────────
    const sstRecords = await prisma.sstRecord.findMany({ where: { orgId: org.id } })
    if (sstRecords.length > 0) {
      fs.writeFileSync(path.join(orgDir, 'sst.json'), JSON.stringify(sstRecords, null, 2))
      saveL('SST.txt', 'REGISTROS SST', sstRecords.map(s => ({
        'Tipo':       s.type,
        'Título':     s.title,
        'Estado':     s.status,
        'Responsable': s.responsibleId || '',
        'Vence':      s.dueDate?.toISOString()?.slice(0, 10) || '',
        'Completado': s.completedAt?.toISOString()?.slice(0, 10) || '',
      })))
    }

    // ── Denuncias ──────────────────────────────────────────────────────────
    const complaints = await prisma.complaint.findMany({ where: { orgId: org.id } })
    if (complaints.length > 0) {
      fs.writeFileSync(path.join(orgDir, 'denuncias.json'), JSON.stringify(complaints, null, 2))
      saveL('DENUNCIAS.txt', 'CANAL DE DENUNCIAS', complaints.map(c => ({
        'Código':     c.code,
        'Tipo':       c.type,
        'Anónimo':    c.isAnonymous ? 'Sí' : 'No',
        'Estado':     c.status,
        'Descripción': (c.description || '').slice(0, 100),
        'Creado':     c.createdAt?.toISOString()?.slice(0, 10) || '',
      })))
    }

    // ── Documentos ─────────────────────────────────────────────────────────
    const docs = await prisma.orgDocument.findMany({ where: { orgId: org.id } })
    if (docs.length > 0) {
      fs.writeFileSync(path.join(orgDir, 'documentos.json'), JSON.stringify(docs, null, 2))
    }

    // ── Cálculos ───────────────────────────────────────────────────────────
    const calcs = await prisma.calculation.findMany({ where: { orgId: org.id } })
    if (calcs.length > 0) {
      fs.writeFileSync(path.join(orgDir, 'calculos.json'), JSON.stringify(calcs, null, 2))
    }

    // ── Relaciones Colectivas ──────────────────────────────────────────────
    const sindical = await prisma.sindicalRecord.findMany({ where: { orgId: org.id } })
    if (sindical.length > 0) {
      fs.writeFileSync(path.join(orgDir, 'relaciones_colectivas.json'), JSON.stringify(sindical, null, 2))
    }

    // ── Resumen de la empresa ─────────────────────────────────────────────
    const summary = {
      empresa: org.name,
      ruc: org.ruc,
      plan: org.plan,
      totales: {
        usuarios:    users.length,
        trabajadores: workers.length,
        contratos:   contracts.length,
        diagnosticos: diagnostics.length,
        sst:         sstRecords.length,
        denuncias:   complaints.length,
        documentos:  docs.length,
        calculos:    calcs.length,
      }
    }
    fs.writeFileSync(path.join(orgDir, '_RESUMEN.json'), JSON.stringify(summary, null, 2))
    ok(`  _RESUMEN.json`)
  }

  // ── Resumen global ────────────────────────────────────────────────────────
  log('')
  log(c.bold('📊 Resumen global:'))
  log(`   Empresas encontradas: ${c.green(orgs.length)}`)
  orgs.forEach(o => log(`   • ${o.name} (${o.ruc || 'Sin RUC'})`))

  // ══════════════════════════════════════════════════════════════════════════
  // MODO BORRADO
  // ══════════════════════════════════════════════════════════════════════════
  if (DELETE_MODE) {
    log('')
    log(c.bold(c.red('⚠  MODO BORRADO ACTIVADO — Eliminando todos los datos...')))
    log('')

    // Orden correcto: hijos antes que padres (FK constraints)
    const steps = [
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
        const result = await fn()
        if (result.count > 0) {
          ok(`${name}: ${result.count} registros eliminados`)
        }
      } catch (e) {
        warn(`${name}: ${e.message?.slice(0, 80)}`)
      }
    }

    log('')
    log(c.bold(c.green('✅ Base de datos limpia. Lista para nuevo cliente.')))
  } else {
    log('')
    log(c.yellow('  Modo solo-exportación. Para borrar también, corre:'))
    log(c.bold('  node scripts/export-and-clean.mjs --delete'))
  }

  log('')
  log(c.bold(c.green(`✅ Exportación completa → scripts/export/`)))
  log('')

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
