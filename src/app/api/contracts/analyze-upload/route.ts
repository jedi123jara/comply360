/**
 * POST /api/contracts/analyze-upload
 *
 * Analiza un archivo PDF, DOCX o TXT de contratos laborales.
 * Extrae el texto, detecta el tipo de documento automáticamente,
 * divide si hay múltiples contratos y ejecuta el motor de análisis.
 *
 * Detecta: cláusulas ilegales, omisiones críticas, cláusulas riesgosas
 * y riesgo de DESNATURALIZACIÓN (relación laboral encubierta).
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  analizarDocumento,
  TIPOS_DOCUMENTO_LABELS,
  type TipoDocumento,
  type ResultadoAnalisis,
} from '@/lib/compliance/contract-analyzer'
import { splitContracts } from '@/lib/agents/contract-splitter'

// ── Auto-detección de tipo desde el texto ───────────────────────────────────

function detectContractType(text: string): TipoDocumento {
  const t = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // strip accents
    .toUpperCase()

  if (/LOCACI[OÓ]N\s+DE\s+SERVICIOS|CONTRATO\s+DE\s+LOCACI[OÓ]N|PRESTADOR\s+DE\s+SERVICIOS/.test(t))
    return 'LOCACION_SERVICIOS'

  if (/TIEMPO\s+PARCIAL|JORNADA\s+PARCIAL|PART[\s\-]?TIME/.test(t))
    return 'CONTRATO_TIEMPO_PARCIAL'

  if (/MYPE|MICRO\s*EMPRESA|PEQUE[NÑ]A\s*EMPRESA|LEY\s+32353|LEY\s+28015/.test(t))
    return 'CONTRATO_MYPE'

  if (/PLAZO\s+FIJO|PLAZO\s+DETERMINADO|SUJETO\s+A\s+MODALIDAD|INICIO\s+DE\s+ACTIVIDAD|NECESIDAD\s+DE\s+MERCADO/.test(t))
    return 'CONTRATO_PLAZO_FIJO'

  if (/REGLAMENTO\s+INTERNO\s+DE\s+TRABAJO|REGLAMENTO\s+INTERNO\s+LABORAL/.test(t))
    return 'REGLAMENTO_INTERNO'

  if (/HOSTIGAMIENTO\s+SEXUAL|POL[IÍ]TICA\s+.*HOSTIGAMIENTO/.test(t))
    return 'POLITICA_HOSTIGAMIENTO'

  if (/POL[IÍ]TICA\s+SST|SEGURIDAD\s+Y\s+SALUD\s+EN\s+EL\s+TRABAJO|PLAN\s+ANUAL\s+SST/.test(t))
    return 'POLITICA_SST'

  return 'CONTRATO_INDEFINIDO'
}

// ── Detección de desnaturalización ──────────────────────────────────────────

function detectarDesnaturalizacion(
  texto: string,
  tipo: TipoDocumento,
  analisis: ResultadoAnalisis,
): { desnaturalizado: boolean; indicadores: string[] } {
  const indicadores: string[] = []

  // Verificar si el motor de análisis ya lo detectó en los hallazgos
  for (const h of analisis.hallazgos) {
    const combined = `${h.titulo} ${h.descripcion}`.toLowerCase()
    if (combined.includes('desnaturaliz')) {
      indicadores.push(h.titulo)
    }
  }

  // Para locación de servicios: buscar indicadores de relación laboral encubierta
  if (tipo === 'LOCACION_SERVICIOS') {
    const t = texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()

    const INDICADORES_LABORALES: Array<{ regex: RegExp; descripcion: string }> = [
      { regex: /bajo\s+(?:la\s+)?(?:direcci[oó]n|subordinaci[oó]n|supervisi[oó]n)\s+de/,         descripcion: 'Cláusula de subordinación directa' },
      { regex: /horario\s+(?:fijo|de\s+(?:entrada|salida|trabajo)|establecido)/,                   descripcion: 'Horario fijo de trabajo' },
      { regex: /registro\s+de\s+asistencia|control\s+de\s+asistencia|tarjeo/,                      descripcion: 'Control de asistencia' },
      { regex: /exclusividad\s+(?:en\s+la\s+prestaci[oó]n|de\s+(?:servicios|la\s+relaci))/,       descripcion: 'Cláusula de exclusividad' },
      { regex: /herramientas\s+(?:y\s+)?equipos\s+(?:de|del|proporcionados?\s+por)\s+la\s+empresa/,descripcion: 'Uso de equipos de la empresa' },
      { regex: /boleta\s+de\s+pago|recibo\s+por\s+honorarios|planilla\s+de\s+haberes/,             descripcion: 'Referencia a planilla/boleta de pago' },
      { regex: /gratificaci[oó]n|cts|compensaci[oó]n\s+por\s+tiempo/,                              descripcion: 'Mención de beneficios laborales' },
    ]

    for (const ind of INDICADORES_LABORALES) {
      if (ind.regex.test(t)) {
        indicadores.push(ind.descripcion)
      }
    }
  }

  // Para contratos a plazo fijo: verificar si excede el máximo (5 años según D.S. 003-97-TR)
  if (tipo === 'CONTRATO_PLAZO_FIJO') {
    for (const h of analisis.hallazgos) {
      if ((h.titulo + h.descripcion).toLowerCase().includes('venci') ||
          (h.titulo + h.descripcion).toLowerCase().includes('plazo m')) {
        indicadores.push(h.titulo)
      }
    }
  }

  // Se considera desnaturalizado si hay 2+ indicadores fuertes
  const umbral = tipo === 'LOCACION_SERVICIOS' ? 2 : 3
  return {
    desnaturalizado: indicadores.length >= umbral,
    indicadores: [...new Set(indicadores)],  // deduplicate
  }
}

// ── Extracción de texto desde PDF (con OCR automático para escaneados) ───────

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // pdf-parse v2: getText() → { pages: [{text,num}], text: string, total: number }
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const { PDFParse } = require('pdf-parse') as any
  const data = await new PDFParse({ data: buffer }).getText()
  // Limpiar marcadores de página "-- X of Y --" que v2 inserta
  const text = (data.text || '').replace(/\n*-- \d+ of \d+ --\n*/g, '\n\n').trim()

  // Si el texto es insuficiente → PDF escaneado → OCR automático
  const { isTextInsufficient, ocrPdfBuffer } = await import('@/lib/agents/ocr')
  if (isTextInsufficient(text)) {
    console.log('[analyze-upload] PDF escaneado detectado, iniciando OCR...')
    return await ocrPdfBuffer(buffer)
  }

  return text
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

// ── Resultado extendido ──────────────────────────────────────────────────────

export interface ResultadoContrato extends ResultadoAnalisis {
  indice: number
  tipo: TipoDocumento
  tipoLabel: string
  desnaturalizado: boolean
  indicadoresDesnaturalizacion: string[]
  veredicto: 'VALIDO' | 'CON_OBSERVACIONES' | 'DESNATURALIZADO' | 'INVALIDO'
}

function calcularVeredicto(
  score: number,
  desnaturalizado: boolean,
  clausulasIlegales: number,
): ResultadoContrato['veredicto'] {
  if (desnaturalizado) return 'DESNATURALIZADO'
  if (clausulasIlegales > 0 || score < 40) return 'INVALIDO'
  if (score < 70) return 'CON_OBSERVACIONES'
  return 'VALIDO'
}

// ── POST handler ─────────────────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, _ctx: AuthContext) => {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    const isPdf  = fileName.endsWith('.pdf')
    const isDocx = fileName.endsWith('.docx') || fileName.endsWith('.doc')
    const isTxt  = fileName.endsWith('.txt')

    if (!isPdf && !isDocx && !isTxt) {
      return NextResponse.json({
        error: 'Formato no soportado. Suba un archivo PDF, DOCX o TXT.',
      }, { status: 400 })
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo excede los 15 MB.' }, { status: 400 })
    }

    // ── Extraer texto ─────────────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer())
    let fullText = ''

    try {
      if (isPdf)       fullText = await extractTextFromPdf(buffer)
      else if (isDocx) fullText = await extractTextFromDocx(buffer)
      else             fullText = buffer.toString('utf-8')
    } catch (extractErr) {
      console.error('[analyze-upload] text extraction failed:', extractErr)
      const msg = extractErr instanceof Error ? extractErr.message : 'desconocido'
      return NextResponse.json({
        error: msg.includes('ocr') || msg.includes('escaneado')
          ? msg
          : `No se pudo extraer texto del archivo: ${msg}. Verifica que no esté protegido con contraseña.`,
      }, { status: 422 })
    }

    if (!fullText || fullText.trim().length < 50) {
      return NextResponse.json({
        error: 'El archivo no contiene texto legible tras el análisis. ' +
               'Conviértelo primero en ilovepdf.com/ocr-pdf si es un PDF escaneado.',
      }, { status: 422 })
    }

    // ── Dividir en bloques de contrato ───────────────────────────
    const bloques = splitContracts(fullText)

    // ── Analizar cada contrato ───────────────────────────────────
    const resultados: ResultadoContrato[] = bloques.map((bloque, idx) => {
      const tipo    = detectContractType(bloque.text)
      const analisis = analizarDocumento(bloque.text, tipo)
      const { desnaturalizado, indicadores } = detectarDesnaturalizacion(bloque.text, tipo, analisis)
      const veredicto = calcularVeredicto(
        analisis.scoreCompliance,
        desnaturalizado,
        analisis.clausulasIlegales.length,
      )

      return {
        indice: idx + 1,
        tipo,
        tipoLabel: TIPOS_DOCUMENTO_LABELS[tipo],
        desnaturalizado,
        indicadoresDesnaturalizacion: indicadores,
        veredicto,
        ...analisis,
      }
    })

    // ── Estadísticas globales ────────────────────────────────────
    const totalDesnaturalizados = resultados.filter(r => r.desnaturalizado).length
    const totalInvalidos        = resultados.filter(r => r.veredicto === 'INVALIDO').length
    const totalObservados       = resultados.filter(r => r.veredicto === 'CON_OBSERVACIONES').length
    const totalValidos          = resultados.filter(r => r.veredicto === 'VALIDO').length
    const scorePromedio         = Math.round(
      resultados.reduce((s, r) => s + r.scoreCompliance, 0) / resultados.length
    )

    return NextResponse.json({
      archivo: file.name,
      totalContratos: bloques.length,
      scorePromedio,
      estadisticas: { totalValidos, totalObservados, totalInvalidos, totalDesnaturalizados },
      resultados,
    })
  } catch (error) {
    console.error('[contracts/analyze-upload]', error)
    return NextResponse.json({ error: 'Error interno al analizar el archivo.' }, { status: 500 })
  }
})
