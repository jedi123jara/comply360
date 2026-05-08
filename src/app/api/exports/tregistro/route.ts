/**
 * GET /api/exports/tregistro?periodo=YYYYMM&operacion=A|B|M
 *
 * Genera el archivo T-REGISTRO (TXT) para todos los trabajadores activos.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  generateTRegistroTxt,
  generateTRegistroFileName,
  type TRegistroRow,
} from '@/lib/exports/tregistro-generator'
import { planHasFeature } from '@/lib/plan-features'

export const runtime = 'nodejs'

const REGIMEN_LABORAL_MAP: Record<string, string> = {
  GENERAL: '00',
  MYPE_MICRO: '02',
  MYPE_PEQUENA: '01',
  AGRARIO: '21',
  CONSTRUCCION_CIVIL: '20',
  DOMESTICO: '24',
  CAS: '04',
  MODALIDAD_FORMATIVA: '60',
  MINERO: '00',
  PESQUERO: '00',
  TEXTIL_EXPORTACION: '00',
  TELETRABAJO: '00',
}

const TIPO_CONTRATO_MAP: Record<string, string> = {
  INDEFINIDO: '21',
  PLAZO_FIJO: '23',
  TIEMPO_PARCIAL: '24',
  INICIO_ACTIVIDAD: '23',
  NECESIDAD_MERCADO: '23',
  RECONVERSION: '23',
  SUPLENCIA: '23',
  EMERGENCIA: '23',
  OBRA_DETERMINADA: '23',
  INTERMITENTE: '23',
  EXPORTACION: '23',
}

const SISTEMA_PENSION_MAP: Record<string, '01' | '02' | '03'> = {
  AFP: '02',
  ONP: '01',
  SIN_APORTE: '03',
}

export const GET = withPlanGate('t_registro_export', async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const periodo = searchParams.get('periodo') || ''
  const operacion = (searchParams.get('operacion') || 'A') as 'A' | 'B' | 'M'

  if (!/^\d{6}$/.test(periodo)) {
    return NextResponse.json(
      { error: 'Parámetro "periodo" requerido (YYYYMM)' },
      { status: 400 }
    )
  }
  if (!['A', 'B', 'M'].includes(operacion)) {
    return NextResponse.json(
      { error: 'Parámetro "operacion" debe ser A, B o M' },
      { status: 400 }
    )
  }

  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { ruc: true, plan: true },
  })
  if (!org?.ruc) {
    return NextResponse.json(
      { error: 'La organización no tiene RUC configurado' },
      { status: 400 }
    )
  }

  // Plan-gate (Ola 4 — decisión 2026-05-04): T-Registro export es gancho de EMPRESA.
  // STARTER no tiene este feature; lo lleva como upsell.
  if (!planHasFeature(org.plan, 't_registro_export')) {
    return NextResponse.json(
      {
        error: 'El export T-REGISTRO está disponible desde el plan EMPRESA. Actualiza tu plan para descargar el archivo SUNAT.',
        code: 'PLAN_UPGRADE_REQUIRED',
        feature: 't_registro_export',
        currentPlan: org.plan,
        upgradeUrl: '/dashboard/planes',
      },
      { status: 403 }
    )
  }

  // Filtro según operación:
  //   - A (Alta): solo workers ACTIVE registrados en este periodo
  //   - B (Baja): solo workers TERMINATED en este periodo
  //   - M (Modificación): workers ACTIVE con cambios en este periodo (best-effort: todos los activos)
  // Nunca incluimos soft-deleted (`deletedAt != null`) porque esos no
  // existieron formalmente para SUNAT.
  const periodYear = parseInt(periodo.slice(0, 4), 10)
  const periodMonth = parseInt(periodo.slice(4, 6), 10) - 1
  const periodStart = new Date(Date.UTC(periodYear, periodMonth, 1))
  const periodEnd = new Date(Date.UTC(periodYear, periodMonth + 1, 1))

  const baseWhere = { orgId: ctx.orgId, deletedAt: null }
  const whereByOp =
    operacion === 'A'
      ? { ...baseWhere, status: 'ACTIVE' as const, fechaIngreso: { gte: periodStart, lt: periodEnd } }
      : operacion === 'B'
        ? { ...baseWhere, status: 'TERMINATED' as const, fechaCese: { gte: periodStart, lt: periodEnd } }
        : { ...baseWhere, status: 'ACTIVE' as const, updatedAt: { gte: periodStart, lt: periodEnd } }

  const workers = await prisma.worker.findMany({
    where: whereByOp,
    select: {
      dni: true,
      firstName: true,
      lastName: true,
      gender: true,
      birthDate: true,
      nationality: true,
      address: true,
      position: true,
      fechaIngreso: true,
      fechaCese: true,
      motivoCese: true,
      regimenLaboral: true,
      tipoContrato: true,
      tipoAporte: true,
      cuspp: true,
      essaludVida: true,
      sctr: true,
      // Ola 1+2 — campos compliance peruano
      discapacidad: true,
      discapacidadCertificado: true,
      nivelEducativo: true,
    },
  })

  if (workers.length === 0) {
    const opLabel = operacion === 'A' ? 'altas' : operacion === 'B' ? 'bajas' : 'modificaciones'
    return NextResponse.json(
      { error: `No hay ${opLabel} en el periodo ${periodo}` },
      { status: 404 }
    )
  }

  // Códigos SUNAT de nivel educativo (Anexo 4 PDT Planilla Electrónica)
  const NIVEL_EDUCATIVO_MAP: Record<string, string> = {
    PRIMARIA: '02',
    SECUNDARIA: '03',
    TECNICA: '06',
    UNIVERSITARIA: '08',
    POSTGRADO: '09',
  }

  // Normalización de nacionalidad → código ISO 3166-1 alpha-3 simplificado
  function nationalityCode(raw: string | null | undefined): string {
    if (!raw) return 'PE'
    const v = raw.trim().toLowerCase()
    if (v === 'peruana' || v === 'peruano' || v === 'pe' || v === 'per') return 'PE'
    return raw.slice(0, 3).toUpperCase()
  }

  const rows: TRegistroRow[] = workers.map(w => {
    const lastParts = (w.lastName || '').trim().split(/\s+/)
    return {
      tipoOperacion: operacion,
      tipoDocumento: '1',
      numeroDocumento: w.dni,
      apellidoPaterno: lastParts[0] || '',
      apellidoMaterno: lastParts.slice(1).join(' ') || '',
      nombres: w.firstName || '',
      sexo: w.gender === 'F' ? 'F' : 'M',
      fechaNacimiento: w.birthDate ? w.birthDate.toISOString().slice(0, 10) : '',
      nacionalidad: nationalityCode(w.nationality),
      fechaIngreso: w.fechaIngreso.toISOString().slice(0, 10),
      fechaCese: w.fechaCese ? w.fechaCese.toISOString().slice(0, 10) : undefined,
      motivoCese: w.motivoCese || undefined,
      tipoContrato: TIPO_CONTRATO_MAP[String(w.tipoContrato)] || '21',
      ocupacion: w.position || 'NO ESPECIFICADO',
      // Discapacidad: usa el campo real (Ola 1+2). 'S' solo si está acreditado por CONADIS.
      // Reportar 'S' sin certificado real es asignación falsa → multa SUNAFIL.
      discapacidad: w.discapacidad && w.discapacidadCertificado ? 'S' : 'N',
      certificadoDiscapacidad: w.discapacidadCertificado ? 'S' : 'N',
      nivelEducativo: w.nivelEducativo
        ? NIVEL_EDUCATIVO_MAP[w.nivelEducativo] || '01'
        : undefined,
      direccion: w.address || undefined,
      regimenLaboral: REGIMEN_LABORAL_MAP[String(w.regimenLaboral)] || '00',
      sistemaPension: SISTEMA_PENSION_MAP[String(w.tipoAporte)] || '03',
      cuspp: w.cuspp || undefined,
      regimenSalud: '01',
      esSaludVida: w.essaludVida ? 'S' : 'N',
      sctr: w.sctr ? 'S' : 'N',
      trabajoDomestico: w.regimenLaboral === 'DOMESTICO' ? 'S' : 'N',
      periodo,
    }
  })

  let txt: string
  try {
    txt = generateTRegistroTxt({
      rucEmpleador: org.ruc,
      workers: rows,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error generando T-REGISTRO' },
      { status: 500 }
    )
  }

  const fileName = generateTRegistroFileName({ rucEmpleador: org.ruc, periodo })

  return new NextResponse(txt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=iso-8859-1',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'X-Workers-Count': String(rows.length),
    },
  })
})
