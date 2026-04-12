/**
 * GET /api/exports/tregistro?periodo=YYYYMM&operacion=A|B|M
 *
 * Genera el archivo T-REGISTRO (TXT) para todos los trabajadores activos.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  generateTRegistroTxt,
  generateTRegistroFileName,
  type TRegistroRow,
} from '@/lib/exports/tregistro-generator'

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

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
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
    select: { ruc: true },
  })
  if (!org?.ruc) {
    return NextResponse.json(
      { error: 'La organización no tiene RUC configurado' },
      { status: 400 }
    )
  }

  const workers = await prisma.worker.findMany({
    where: { orgId: ctx.orgId, status: 'ACTIVE' },
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
    },
  })

  if (workers.length === 0) {
    return NextResponse.json(
      { error: 'No hay trabajadores activos' },
      { status: 404 }
    )
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
      nacionalidad: w.nationality === 'peruana' || !w.nationality ? 'PE' : (w.nationality.slice(0, 3).toUpperCase()),
      fechaIngreso: w.fechaIngreso.toISOString().slice(0, 10),
      fechaCese: w.fechaCese ? w.fechaCese.toISOString().slice(0, 10) : undefined,
      motivoCese: w.motivoCese || undefined,
      tipoContrato: TIPO_CONTRATO_MAP[String(w.tipoContrato)] || '21',
      ocupacion: w.position || 'NO ESPECIFICADO',
      discapacidad: 'N',
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
