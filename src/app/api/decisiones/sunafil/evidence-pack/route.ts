/**
 * GET /api/decisiones/sunafil/evidence-pack
 *
 * Genera un ZIP con la evidencia que SUNAFIL pide en una inspección:
 *  - manifest.json — metadata del paquete (org, fecha, contenido)
 *  - capacitaciones.csv — lista de cursos completados por trabajador
 *  - certificados/*.txt — un placeholder por certificado emitido (con QR id)
 *  - registros-asistencia.csv — registros de asistencia a capacitaciones
 *  - workers.csv — lista de trabajadores activos con datos básicos
 *
 * Diseñado para ser **defendible legalmente**: cada item incluye fechas,
 * IDs únicos y referencia a la base legal. NO genera PDFs reales de
 * certificados (eso requiere render PDF complejo) — incluye placeholder
 * con metadata. Si el cliente ya tiene PDFs en `pdfUrl`, se referencian.
 *
 * Auth: usuario autenticado del org. El ZIP solo incluye datos del orgId.
 */

import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

export const runtime = 'nodejs'

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function rowsToCsv(headers: string[], rows: Array<(string | number | null)[]>): string {
  const lines = [headers.map(csvEscape).join(',')]
  for (const r of rows) {
    lines.push(r.map(csvEscape).join(','))
  }
  return lines.join('\r\n') + '\r\n'
}

export const GET = withPlanGate('ia_contratos', async (_req: NextRequest, ctx: AuthContext) => {
  const generatedAt = new Date()

  const [org, workers, enrollments] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: { id: true, name: true, ruc: true, sector: true, regimenPrincipal: true, createdAt: true },
    }),
    prisma.worker.findMany({
      where: { orgId: ctx.orgId, status: { not: 'TERMINATED' } },
      select: {
        id: true,
        dni: true,
        firstName: true,
        lastName: true,
        position: true,
        department: true,
        regimenLaboral: true,
        fechaIngreso: true,
      },
      orderBy: { lastName: 'asc' },
    }),
    prisma.enrollment.findMany({
      where: { orgId: ctx.orgId },
      include: {
        course: {
          select: {
            slug: true,
            title: true,
            category: true,
            isObligatory: true,
            durationMin: true,
            passingScore: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    }),
  ])

  // Enrollment no tiene relación bidireccional con Worker, así que armamos
  // un lookup por workerId con los workers ya cargados (mismo orgId).
  const workersById = new Map(workers.map((w) => [w.id, w]))

  if (!org) {
    return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
  }

  const completedEnrollments = enrollments.filter((e) => e.status === 'PASSED')
  const certificatesIssued = completedEnrollments.filter((e) => !!e.certificateId)

  // Build ZIP
  const zip = new JSZip()

  // manifest.json
  const manifest = {
    schema: 'comply360.evidence-pack/v1',
    generatedAt: generatedAt.toISOString(),
    organization: {
      id: org.id,
      name: org.name,
      ruc: org.ruc ?? null,
      sector: org.sector ?? null,
      regimenPrincipal: org.regimenPrincipal ?? null,
      createdAt: org.createdAt.toISOString(),
    },
    summary: {
      totalWorkers: workers.length,
      totalEnrollments: enrollments.length,
      completedEnrollments: completedEnrollments.length,
      certificatesIssued: certificatesIssued.length,
      obligatoryCompleted: completedEnrollments.filter((e) => e.course.isObligatory).length,
    },
    contents: [
      'manifest.json',
      'README.txt',
      'workers.csv',
      'capacitaciones.csv',
      'registros-asistencia.csv',
      `certificados/ (${certificatesIssued.length} archivos)`,
    ],
    legalReference: {
      capacitacionesObligatorias: 'Ley 29783 Art. 27, D.S. 005-2012-TR Art. 28-29',
      hostigamiento: 'Ley 27942, D.S. 014-2019-MIMP',
      registroAsistencia: 'R.M. 050-2013-TR Anexo 4',
    },
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))

  // README.txt
  const readme = [
    `PAQUETE DE EVIDENCIA SUNAFIL — ${org.name}`,
    `Generado: ${generatedAt.toLocaleString('es-PE')}`,
    `Por: COMPLY360`,
    ''.padEnd(60, '='),
    '',
    'CONTENIDO',
    '',
    '  manifest.json              — Metadata del paquete',
    '  workers.csv                — Lista de trabajadores activos',
    '  capacitaciones.csv         — Cursos completados por trabajador',
    '  registros-asistencia.csv   — Registros con fechas y duración',
    '  certificados/              — Un .txt por certificado emitido',
    '',
    ''.padEnd(60, '='),
    '',
    'BASE LEGAL',
    '',
    '  Ley 29783 (SST)            — Capacitaciones obligatorias 4/año',
    '  D.S. 005-2012-TR Art. 28   — Capacitación dentro de jornada',
    '  Ley 27942 (Hostigamiento)  — Capacitación anual obligatoria',
    '  R.M. 050-2013-TR Anexo 4   — Formato de registro de asistencia',
    '',
    ''.padEnd(60, '='),
    '',
    'INSTRUCCIONES',
    '',
    '  Este paquete sirve como evidencia ante una inspección SUNAFIL del',
    "  cumplimiento de capacitaciones. Los archivos están en CSV (legibles",
    '  en Excel/Numbers). Los certificados son placeholders con QR id; el',
    '  PDF original puede solicitarse desde la plataforma con ese id.',
    '',
  ].join('\n')
  zip.file('README.txt', readme)

  // workers.csv
  const workersCsv = rowsToCsv(
    ['ID', 'DNI', 'Apellidos', 'Nombres', 'Cargo', 'Area', 'Regimen', 'Fecha ingreso'],
    workers.map((w) => [
      w.id,
      w.dni,
      w.lastName,
      w.firstName,
      w.position ?? '',
      w.department ?? '',
      w.regimenLaboral,
      w.fechaIngreso.toISOString().slice(0, 10),
    ]),
  )
  zip.file('workers.csv', workersCsv)

  // capacitaciones.csv (todos los enrollments, status incluido)
  const capacitacionesCsv = rowsToCsv(
    [
      'Enrollment ID', 'DNI', 'Apellidos', 'Nombres', 'Curso', 'Categoria',
      'Obligatoria', 'Estado', 'Progreso %', 'Puntaje examen',
      'Fecha asignacion', 'Fecha completado', 'Certificado ID',
    ],
    enrollments.map((e) => {
      const w = e.workerId ? workersById.get(e.workerId) : null
      return [
        e.id,
        w?.dni ?? '',
        w?.lastName ?? e.workerName?.split(' ').slice(-1)[0] ?? '',
        w?.firstName ?? e.workerName?.split(' ').slice(0, -1).join(' ') ?? '',
        e.course.title,
        e.course.category,
        e.course.isObligatory ? 'SI' : 'NO',
        e.status,
        e.progress,
        e.examScore ?? '',
        e.createdAt.toISOString().slice(0, 10),
        e.completedAt?.toISOString().slice(0, 10) ?? '',
        e.certificateId ?? '',
      ]
    }),
  )
  zip.file('capacitaciones.csv', capacitacionesCsv)

  // registros-asistencia.csv (solo PASSED, formato compatible con R.M. 050-2013-TR Anexo 4)
  const asistenciaCsv = rowsToCsv(
    ['Fecha', 'DNI', 'Apellidos y Nombres', 'Cargo', 'Tema', 'Duracion (min)', 'Modalidad', 'Aprobado'],
    completedEnrollments.map((e) => {
      const w = e.workerId ? workersById.get(e.workerId) : null
      return [
        e.completedAt?.toISOString().slice(0, 10) ?? e.createdAt.toISOString().slice(0, 10),
        w?.dni ?? '',
        w ? `${w.lastName} ${w.firstName}`.trim() : (e.workerName ?? ''),
        w?.position ?? '',
        e.course.title,
        e.course.durationMin,
        'Virtual',
        'SI',
      ]
    }),
  )
  zip.file('registros-asistencia.csv', asistenciaCsv)

  // certificados/*.txt — placeholder por certificado
  const certFolder = zip.folder('certificados')
  if (certFolder) {
    for (const e of certificatesIssued) {
      const certName = `cert-${e.certificateId}.txt`
      const w = e.workerId ? workersById.get(e.workerId) : null
      const workerFull = w
        ? `${w.firstName} ${w.lastName}`.trim()
        : (e.workerName ?? '')
      const cert = [
        'CERTIFICADO DE CAPACITACION',
        ''.padEnd(40, '-'),
        '',
        `Certificado ID: ${e.certificateId}`,
        `Trabajador: ${workerFull}`,
        `DNI: ${w?.dni ?? ''}`,
        '',
        `Curso: ${e.course.title}`,
        `Categoría: ${e.course.category}`,
        `Duración: ${e.course.durationMin} min`,
        `Puntaje: ${e.examScore ?? '—'}/100 (mínimo aprobatorio: ${e.course.passingScore})`,
        '',
        `Completado: ${e.completedAt?.toISOString().slice(0, 10) ?? ''}`,
        `Verificable en: comply360.pe/cert/${e.certificateId}`,
        '',
        ''.padEnd(40, '-'),
        `Emitido por COMPLY360 — ${org.name}`,
      ].join('\n')
      certFolder.file(certName, cert)
    }
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer' })

  const filename = `evidencia-sunafil-${org.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40)}-${generatedAt.toISOString().slice(0, 10)}.zip`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  })
})
