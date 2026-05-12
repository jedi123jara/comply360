import { NextResponse } from 'next/server'
import { addAoaSheet, createWorkbook, workbookToArrayBuffer } from '@/lib/excel/exceljs'

// =============================================
// GET /api/workers/template - Download Excel template
// =============================================
export async function GET() {
  const headers = [
    'dni',
    'nombres',
    'apellidos',
    'email',
    'telefono',
    'fecha_nacimiento',
    'genero',
    'direccion',
    'cargo',
    'area',
    'regimen',
    'contrato',
    'fecha_ingreso',
    'sueldo',
    'asignacion_familiar',
    'jornada',
    'aporte',
    'afp',
  ]

  const exampleRow = [
    '12345678',
    'Juan Carlos',
    'Perez Garcia',
    'juan@empresa.com',
    '987654321',
    '1990-05-15',
    'M',
    'Av. Principal 123, Lima',
    'Analista RRHH',
    'Recursos Humanos',
    'GENERAL',
    'INDEFINIDO',
    '2024-01-15',
    '2500.00',
    'SI',
    '48',
    'AFP',
    'Prima',
  ]

  const wb = createWorkbook()
  addAoaSheet(wb, 'Trabajadores', [headers, exampleRow], {
    columnWidths: headers.map(h => Math.max(h.length + 4, 16)),
  })

  // Add instruction sheet
  const instructions = [
    ['INSTRUCCIONES DE IMPORTACION'],
    [''],
    ['Campos obligatorios: dni, nombres, apellidos, fecha_ingreso, sueldo'],
    [''],
    ['REGIMENES VALIDOS:'],
    ['GENERAL, MYPE_MICRO, MYPE_PEQUENA, AGRARIO, CONSTRUCCION_CIVIL, MINERO, PESQUERO, TEXTIL_EXPORTACION, DOMESTICO, CAS, MODALIDAD_FORMATIVA, TELETRABAJO'],
    [''],
    ['TIPOS DE CONTRATO VALIDOS:'],
    ['INDEFINIDO, PLAZO_FIJO, TIEMPO_PARCIAL, INICIO_ACTIVIDAD, NECESIDAD_MERCADO, RECONVERSION, SUPLENCIA, EMERGENCIA, OBRA_DETERMINADA, INTERMITENTE, EXPORTACION'],
    [''],
    ['TIPO DE APORTE: AFP, ONP, SIN_APORTE'],
    [''],
    ['GENERO: M o F'],
    [''],
    ['ASIGNACION FAMILIAR: SI o NO'],
    [''],
    ['Maximo 500 filas por importacion'],
    ['El DNI debe tener exactamente 8 digitos'],
    ['No se importaran filas con DNI duplicado dentro de la organizacion'],
  ]
  addAoaSheet(wb, 'Instrucciones', instructions, { columnWidths: [120] })

  const buf = await workbookToArrayBuffer(wb)

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=comply360_trabajadores_template.xlsx',
    },
  })
}
