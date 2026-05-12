import { NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import { addAoaSheet, addJsonSheet, createWorkbook, workbookToArrayBuffer } from '@/lib/excel/exceljs'

/**
 * GET /api/sst/iperc-bases/template
 *
 * Genera un Excel template con los headers correctos para la importación
 * masiva de filas IPERC. Incluye una hoja "Instrucciones" + una hoja "Datos"
 * con 2 filas de ejemplo + una hoja "Catálogo Peligros" para que el usuario
 * vea los nombres exactos.
 *
 * No es un endpoint público — requiere auth para evitar scraping.
 */
export const GET = withPlanGate('sst_completo', async () => {
  const wb = createWorkbook()

  // ── Hoja 1: Instrucciones ─────────────────────────────────────────────
  const instrucciones = [
    ['Plantilla IPERC — COMPLY360 Perú'],
    [''],
    ['Cómo usar este Excel:'],
    ['1. Ve a la hoja "Datos" y reemplaza los ejemplos con tus filas reales.'],
    ['2. Cada fila representa una tarea evaluada con la matriz P × S oficial.'],
    ['3. Los 5 índices (A, B, C, D, S) deben ser enteros 1, 2 o 3.'],
    [''],
    ['Significado de los índices (R.M. 050-2013-TR Tablas 9-12):'],
    ['  A = Personas expuestas: 1 (1-3), 2 (4-12), 3 (>12)'],
    ['  B = Procedimientos:    1 (existen y se aplican), 2 (parciales), 3 (no existen)'],
    ['  C = Capacitación:      1 (entrenado), 2 (parcial), 3 (no entrenado)'],
    ['  D = Exposición:        1 (esporádica), 2 (eventual), 3 (permanente)'],
    ['  S = Severidad:         1 (lig. dañino), 2 (dañino), 3 (ext. dañino)'],
    [''],
    ['Cálculos automáticos (los hace COMPLY360 al importar — NO los pongas tú):'],
    ['  IP (Probabilidad) = A + B + C + D'],
    ['  NR (Nivel Riesgo) = IP × S'],
    ['  Clasificación: 4 Trivial | 5-8 Tolerable | 9-16 Moderado | 17-24 Importante | 25-36 Intolerable'],
    [''],
    ['Peligro: usa el nombre EXACTO del catálogo (ver hoja "Catálogo Peligros").'],
    ['  Si dejas el peligro vacío, la fila se crea pero sin vínculo al catálogo.'],
    [''],
    ['Controles actuales: separa varios con ; o salto de línea.'],
    ['Controles propuestos: usa las 5 columnas separadas (Eliminación, Sustitución, etc.)'],
    [''],
    ['Plazo cierre: formato yyyy-mm-dd (ej: 2026-12-31). Opcional.'],
    [''],
    ['Cuando termines, sube este archivo en el botón "Importar Excel" del editor IPERC.'],
  ]
  addAoaSheet(wb, 'Instrucciones', instrucciones, { columnWidths: [100] })

  // ── Hoja 2: Datos (lo que el usuario rellena) ─────────────────────────
  const headers = [
    'Proceso',
    'Actividad',
    'Tarea',
    'Peligro',
    'Riesgo',
    'A (Personas)',
    'B (Procedimiento)',
    'C (Capacitación)',
    'D (Exposición)',
    'S (Severidad)',
    'Controles actuales',
    'Eliminación',
    'Sustitución',
    'Ingeniería',
    'Administrativo',
    'EPP',
    'Responsable',
    'Plazo cierre',
  ]

  const ejemplos = [
    {
      Proceso: 'Producción',
      Actividad: 'Operación de maquinaria pesada',
      Tarea: 'Manejo de montacargas en almacén',
      Peligro: 'Atropello por vehículo industrial',
      Riesgo: 'Lesiones graves o fatales por colisión',
      'A (Personas)': 2,
      'B (Procedimiento)': 2,
      'C (Capacitación)': 1,
      'D (Exposición)': 3,
      'S (Severidad)': 3,
      'Controles actuales': 'Señalización de zonas de tránsito; Velocidad máxima 10 km/h',
      'Eliminación': '',
      'Sustitución': '',
      'Ingeniería': 'Demarcado de carriles separados peatón/montacargas',
      'Administrativo': 'Capacitación cada 6 meses; Supervisor de tránsito en turno',
      'EPP': 'Chaleco reflectivo; Casco; Botas con punta de acero',
      'Responsable': 'Jefe de Almacén',
      'Plazo cierre': '2026-09-30',
    },
    {
      Proceso: 'Mantenimiento',
      Actividad: 'Trabajo en altura',
      Tarea: 'Reparación de techo a 4m',
      Peligro: 'Caída de altura',
      Riesgo: 'Lesiones graves o fatales por caída',
      'A (Personas)': 1,
      'B (Procedimiento)': 1,
      'C (Capacitación)': 1,
      'D (Exposición)': 1,
      'S (Severidad)': 3,
      'Controles actuales': 'Permiso de trabajo en altura; ATS firmado',
      'Eliminación': '',
      'Sustitución': 'Uso de andamio en lugar de escalera para trabajos > 1.8m',
      'Ingeniería': 'Líneas de vida ancladas a estructura',
      'Administrativo': 'Capacitación trabajo en altura (8 horas)',
      'EPP': 'Arnés certificado ANSI Z359; Casco con barbiquejo',
      'Responsable': 'Supervisor SST',
      'Plazo cierre': '',
    },
  ]

  addJsonSheet(wb, 'Datos', ejemplos, {
    headers,
    columnWidths: [
      18, // Proceso
      30, // Actividad
      35, // Tarea
      28, // Peligro
      35, // Riesgo
      12, 18, 16, 14, 14, // índices
      40, // Controles actuales
      25, 25, 30, 30, 30, // controles propuestos
      20, // Responsable
      15, // Plazo
    ],
  })

  // ── Hoja 3: Catálogo de peligros (referencia) ────────────────────────
  // Importamos lazy para no inflar el bundle si la ruta no se llama.
  const { prisma } = await import('@/lib/prisma')
  const peligros = await prisma.catalogoPeligro.findMany({
    orderBy: [{ familia: 'asc' }, { nombre: 'asc' }],
    select: { familia: true, nombre: true, descripcion: true },
  })
  const catalogoSheet = peligros.map((p) => ({
    Familia: p.familia,
    Nombre: p.nombre,
    Descripción: p.descripcion,
  }))
  addJsonSheet(wb, 'Catálogo Peligros', catalogoSheet, {
    headers: ['Familia', 'Nombre', 'Descripción'],
    columnWidths: [18, 35, 80],
  })

  const buf = await workbookToArrayBuffer(wb)

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla-iperc-comply360.xlsx"',
      'Cache-Control': 'no-store',
    },
  })
})
