/**
 * POST /api/liquidacion/pdf
 *
 * Genera el PDF oficial de Liquidación de Beneficios Sociales del trabajador
 * al cese, siguiendo la estructura de las plantillas del pack "Compensaciones
 * Laborales 30°" (R.D. MTPE) adaptado al régimen correspondiente:
 *
 *   - GENERAL / MYPE_PEQUENA: I. CTS · II. Vacaciones · III. Gratificación trunca
 *     · IV. Indemnización · V. Otros conceptos · VI. Total
 *   - MYPE_MICRO: I. Vacaciones · II. Indemnización · III. Otros conceptos · IV. Total
 *     (sin CTS ni gratificaciones — Ley 32353)
 *
 * Body:
 *   input      LiquidacionInput  — datos de cese del trabajador
 *   worker?    { fullName, dni, position, department, regimen, ruc? }
 *   employer?  { razonSocial, ruc, domicilio, representante, cargo }
 *
 * Returns: PDF descargable con header COMPLY360 + secciones oficiales + firmas.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  createPDFDoc,
  addHeader,
  sectionTitle,
  kv,
  drawTable,
  checkPageBreak,
  finalizePDF,
  type JsPDFDoc,
} from '@/lib/pdf/server-pdf'
import { calcularLiquidacion } from '@/lib/legal-engine/calculators/liquidacion'
import type { LiquidacionInput, LiquidacionResult, BreakdownItem } from '@/lib/legal-engine/types'

export const runtime = 'nodejs'

// ─── Types del body ──────────────────────────────────────────────────────────

interface WorkerInfo {
  fullName?: string
  dni?: string
  position?: string
  department?: string
  regimen?: 'GENERAL' | 'MYPE_PEQUENA' | 'MYPE_MICRO' | 'AGRARIO' | string
}

interface EmployerInfo {
  razonSocial?: string
  ruc?: string
  domicilio?: string
  representante?: string
  cargo?: string
}

interface RequestBody {
  input: LiquidacionInput
  worker?: WorkerInfo
  employer?: EmployerInfo
}

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmtPEN(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'S/ 0.00'
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function motivoCeseLabel(m: string): string {
  const map: Record<string, string> = {
    despido_arbitrario: 'Despido arbitrario',
    renuncia: 'Renuncia voluntaria',
    mutuo_acuerdo: 'Mutuo disenso',
    fin_contrato: 'Vencimiento del contrato',
    despido_nulo: 'Despido nulo',
    hostilidad: 'Acto de hostilidad',
  }
  return map[m] ?? m
}

function regimenLabel(r?: string): string {
  const map: Record<string, string> = {
    GENERAL: 'Régimen General (D.Leg. 728)',
    MYPE_PEQUENA: 'Régimen MYPE Pequeña Empresa (Ley 32353)',
    MYPE_MICRO: 'Régimen MYPE Microempresa (Ley 32353)',
    AGRARIO: 'Régimen Agrario (Ley 31110)',
    CONSTRUCCION_CIVIL: 'Régimen Construcción Civil',
  }
  return map[r ?? 'GENERAL'] ?? r ?? 'Régimen General'
}

// ─── Section renderers ───────────────────────────────────────────────────────

/**
 * Una sección con breakdown item + fórmula + base legal.
 * Si el ítem tiene amount 0 y el régimen lo excluye, se omite silenciosamente.
 */
function renderBreakdownSection(
  doc: JsPDFDoc,
  y: number,
  romanNumeral: string,
  item: BreakdownItem,
  headerArgs: Parameters<typeof checkPageBreak>[3],
): number {
  y = checkPageBreak(doc, y, 240, headerArgs)
  y = sectionTitle(doc, `${romanNumeral}. ${item.label.toUpperCase()}`, y)

  doc.setFontSize(8)
  doc.setTextColor(60, 60, 60)
  if (item.details) {
    doc.text(item.details, 14, y, { maxWidth: 180 })
    y += Math.ceil(item.details.length / 100) * 4 + 2
  }

  y = checkPageBreak(doc, y, 260, headerArgs)
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text('Fórmula:', 14, y)
  doc.setTextColor(30, 30, 30)
  doc.text(item.formula, 30, y, { maxWidth: 165 })
  y += Math.ceil(item.formula.length / 100) * 4 + 2

  y = checkPageBreak(doc, y, 260, headerArgs)
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text('Base legal:', 14, y)
  doc.setTextColor(30, 30, 30)
  doc.text(item.baseLegal, 30, y, { maxWidth: 165 })
  y += 4

  // Monto destacado
  y = checkPageBreak(doc, y, 260, headerArgs)
  doc.setFillColor(240, 245, 255)
  doc.rect(130, y - 3, 66, 10, 'F')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text('Monto:', 134, y + 3)
  doc.setFontSize(11)
  doc.setTextColor(30, 58, 110)
  doc.setFont('helvetica', 'bold')
  doc.text(fmtPEN(item.amount), 192, y + 3, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)

  return y + 14
}

/**
 * Decide qué conceptos aparecen según régimen. Sigue las plantillas oficiales:
 *   - MICRO: sólo Vacaciones + Indemnización + Otros (sin CTS ni Gratif)
 *   - Resto: todos
 */
function conceptosAplicables(
  regimen: string | undefined,
  result: LiquidacionResult,
): Array<{ roman: string; item: BreakdownItem }> {
  const r = (regimen ?? 'GENERAL').toUpperCase()
  const list: Array<{ roman: string; item: BreakdownItem }> = []
  let romanIdx = 0
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']
  const push = (item: BreakdownItem | null | undefined) => {
    if (!item) return
    if (item.amount === 0 && /no aplica/i.test(item.formula)) return // items zero-noop
    list.push({ roman: ROMAN[romanIdx++], item })
  }

  const br = result.breakdown

  if (r !== 'MYPE_MICRO') {
    push(br.cts)
  }
  push(br.vacacionesTruncas)
  if (br.vacacionesNoGozadas.amount > 0) {
    push(br.vacacionesNoGozadas)
  }
  if (r !== 'MYPE_MICRO') {
    push(br.gratificacionTrunca)
  }
  if (br.indemnizacion) {
    push(br.indemnizacion)
  }
  if (br.horasExtras.amount > 0) {
    push(br.horasExtras)
  }
  if (br.bonificacionEspecial.amount > 0) {
    push(br.bonificacionEspecial)
  }

  return list
}

// ─── Route handler ───────────────────────────────────────────────────────────

export const POST = withPlanGate('workers', async (req: NextRequest, ctx: AuthContext) => {
  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body?.input) {
    return NextResponse.json({ error: 'input es requerido' }, { status: 400 })
  }

  // Si no nos pasaron employer, lo pullamos del org autenticado (RUC + razon).
  let employer: EmployerInfo = body.employer ?? {}
  if (!employer.razonSocial || !employer.ruc) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: ctx.orgId },
        select: { name: true, ruc: true, razonSocial: true },
      })
      if (org) {
        employer = {
          razonSocial: employer.razonSocial ?? org.razonSocial ?? org.name,
          ruc: employer.ruc ?? org.ruc ?? '',
          ...employer,
        }
      }
    } catch {
      // ignore
    }
  }

  const worker: WorkerInfo = body.worker ?? {}

  // Corre la calculadora (misma que usa la UI real-time)
  let result: LiquidacionResult
  try {
    result = calcularLiquidacion(body.input)
  } catch (err) {
    console.error('[liquidacion/pdf] calc error:', err)
    return NextResponse.json({ error: 'Error al calcular liquidación' }, { status: 500 })
  }

  try {
    const doc = await createPDFDoc()
    const org = {
      name: employer.razonSocial ?? 'Empresa',
      razonSocial: employer.razonSocial ?? null,
      ruc: employer.ruc ?? null,
    }
    const headerArgs = {
      title: 'Liquidación de Beneficios Sociales',
      org,
      subtitle: regimenLabel(worker.regimen),
    }

    addHeader(doc, headerArgs.title, org, headerArgs.subtitle)
    let y = 56

    // ── Preámbulo del documento ──

    doc.setFontSize(8)
    doc.setTextColor(60, 60, 60)
    const preamble = `${employer.razonSocial ?? '________________________'}${
      employer.ruc ? ` (RUC ${employer.ruc})` : ''
    }, ${employer.domicilio ? `con domicilio en ${employer.domicilio},` : ''} ${
      employer.representante
        ? `representada por ${employer.representante} (${employer.cargo ?? 'Representante Legal'}),`
        : ''
    } en cumplimiento de las obligaciones laborales como empleador, expide la presente liquidación de beneficios sociales a favor de:`
    doc.text(preamble, 14, y, { maxWidth: 180 })
    y += Math.ceil(preamble.length / 100) * 4 + 4

    // ── Datos del trabajador ──

    y = sectionTitle(doc, 'Datos del Trabajador', y)
    y = kv(doc, 'Nombre completo', worker.fullName ?? '_________________________', 14, y)
    if (worker.dni) y = kv(doc, 'DNI', worker.dni, 14, y)
    if (worker.position) y = kv(doc, 'Cargo', worker.position, 14, y)
    if (worker.department) y = kv(doc, 'Departamento/Área', worker.department, 14, y)
    y = kv(doc, 'Régimen laboral', regimenLabel(worker.regimen), 14, y)
    y += 2

    // ── Datos del cese ──

    y = sectionTitle(doc, 'Datos del Cese', y)
    y = kv(doc, 'Fecha de ingreso', fmtFecha(body.input.fechaIngreso), 14, y)
    y = kv(doc, 'Fecha de cese', fmtFecha(body.input.fechaCese), 14, y)
    y = kv(doc, 'Motivo del cese', motivoCeseLabel(body.input.motivoCese), 14, y)
    y = kv(doc, 'Sueldo bruto base', fmtPEN(body.input.sueldoBruto), 14, y)
    if (body.input.asignacionFamiliar) {
      y = kv(doc, 'Asignación familiar', 'Sí (10% RMV)', 14, y)
    }
    y += 4

    // ── Secciones oficiales: I, II, III, IV... ──

    const conceptos = conceptosAplicables(worker.regimen, result)
    for (const { roman, item } of conceptos) {
      y = renderBreakdownSection(doc, y, roman, item, headerArgs)
    }

    // ── Total ──

    y = checkPageBreak(doc, y, 240, headerArgs)
    const totalRoman = String.fromCharCode(73 + conceptos.length) // I=1, so offset
    // Actually just use "TOTAL" big
    y = sectionTitle(doc, `${totalRoman}. TOTAL A PAGAR`, y) // Actually — better:
    y = checkPageBreak(doc, y, 240, headerArgs)
    doc.setFillColor(34, 197, 94) // emerald
    doc.rect(14, y - 4, 182, 16, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL LIQUIDACIÓN', 18, y + 5)
    doc.setFontSize(14)
    doc.text(fmtPEN(result.totalBruto), 192, y + 5, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    y += 22

    // ── Alertas legales ──

    if (result.warnings.length > 0) {
      y = checkPageBreak(doc, y, 240, headerArgs)
      y = sectionTitle(doc, 'Alertas Legales', y)
      doc.setFontSize(7.5)
      for (const w of result.warnings) {
        y = checkPageBreak(doc, y, 260, headerArgs)
        const iconColor =
          w.type === 'urgente' ? [220, 38, 38] : w.type === 'riesgo' ? [217, 119, 6] : [30, 58, 110]
        doc.setFillColor(iconColor[0], iconColor[1], iconColor[2])
        doc.rect(14, y - 2, 3, 3, 'F')
        doc.setTextColor(60, 60, 60)
        doc.text(w.message, 20, y, { maxWidth: 176 })
        y += Math.ceil(w.message.length / 90) * 4 + 2
      }
      y += 4
    }

    // ── Base legal agregada ──

    y = checkPageBreak(doc, y, 220, headerArgs)
    y = sectionTitle(doc, 'Bases Legales', y)
    const legalRows = result.legalBasis.map((ref) => [ref.norm, ref.article, ref.description])
    y = drawTable(
      doc,
      [
        { header: 'Norma', x: 14 },
        { header: 'Artículo', x: 70 },
        { header: 'Descripción', x: 105 },
      ],
      legalRows,
      y,
      { headerArgs, fontSize: 7, rowHeight: 5 },
    )
    y += 6

    // ── Firmas ──

    y = checkPageBreak(doc, y, 240, headerArgs)
    y += 12

    const sigY = y + 22
    doc.setDrawColor(30, 30, 30)
    doc.line(14, sigY, 85, sigY)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(employer.razonSocial ?? 'Empleador', 14, sigY + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    if (employer.ruc) doc.text(`RUC: ${employer.ruc}`, 14, sigY + 9)
    doc.text(employer.representante ?? 'Representante Legal', 14, sigY + 13)

    doc.line(115, sigY, 196, sigY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(worker.fullName ?? 'El Trabajador', 115, sigY + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    if (worker.dni) doc.text(`DNI: ${worker.dni}`, 115, sigY + 9)
    doc.text('Recibí conforme', 115, sigY + 13)

    const disclaimerY = sigY + 24
    doc.setFontSize(6.5)
    doc.setTextColor(150, 150, 150)
    doc.text(
      'Documento generado por COMPLY360. Cálculos conforme a D.S. 003-97-TR, D.S. 001-97-TR, Ley 27735, Ley 30334, D.Leg. 713, Ley 32353 y normativa vigente. El trabajador deberá firmar en señal de conformidad con la liquidación recibida.',
      14, disclaimerY, { maxWidth: 180 },
    )

    const dateSlug = new Date().toISOString().split('T')[0]
    const nameSlug = (worker.fullName ?? 'Trabajador').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 30)
    const filename = `COMPLY360_Liquidacion_${nameSlug}_${dateSlug}.pdf`
    return finalizePDF(doc, filename)
  } catch (error) {
    console.error('[liquidacion/pdf] Error:', error)
    return NextResponse.json({ error: 'Error al generar PDF de liquidación' }, { status: 500 })
  }
})

