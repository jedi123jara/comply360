// =============================================
// DOCX TEMPLATE RENDERER (docxtemplater + pizzip)
// Generador de Contratos / Chunk 6
//
// Toma un .docx-buffer con tags {{var}} y datos → produce un .docx-buffer
// renderizado. 100% server-side, server-safe, sin mutar el buffer original.
//
// Comportamiento ante variables faltantes: por defecto usa "" (silencio)
// porque el motor de validación (chunk 1) ya bloquea contratos con campos
// requeridos vacíos. Esto evita que docxtemplater rompa la salida cuando
// el usuario quiere previsualizar sin haber completado todo.
// =============================================

import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'

export interface RenderTemplateInput {
  /** Bytes del .docx (Buffer en server, Uint8Array en otro entorno). */
  templateBytes: Buffer | Uint8Array
  /** Diccionario plano de variables. Soporta dot-notation con anidados. */
  data: Record<string, unknown>
  /** Si true, lanza con detalle cuando hay variables sin resolver. */
  strict?: boolean
}

export interface RenderTemplateResult {
  buffer: Buffer
  /** Variables que aparecieron en la plantilla y NO recibieron valor. */
  missingVariables: string[]
  /** Variables que SÍ se sustituyeron. */
  filledVariables: string[]
}

/** Detecta tags {{var}} y {{var.path}} en el texto serializado del .docx. */
function extractDocxTags(zip: PizZip): string[] {
  const set = new Set<string>()
  const re = /\{\{?\s*([a-zA-Z_][a-zA-Z0-9_.]*?)\s*\}?\}/g
  // El cuerpo principal del .docx vive en word/document.xml
  // Pueden existir headers/footers (header1.xml, footer1.xml) — los chequeamos también.
  const candidateFiles = ['word/document.xml']
  for (const path of Object.keys(zip.files)) {
    if (/^word\/(header|footer)\d+\.xml$/.test(path)) candidateFiles.push(path)
  }
  for (const path of candidateFiles) {
    const file = zip.files[path]
    if (!file) continue
    const text = file.asText()
    for (const m of text.matchAll(re)) set.add(m[1])
  }
  return Array.from(set).sort()
}

/**
 * Renderiza una plantilla .docx con docxtemplater + pizzip.
 * Throws si:
 *   - el buffer no es un .docx válido
 *   - strict=true y faltan variables
 */
export function renderDocxTemplate(input: RenderTemplateInput): RenderTemplateResult {
  // Cargar el zip en memoria
  const zip = new PizZip(input.templateBytes)

  // Detectar tags antes de renderizar (para reportar missing/filled)
  const tags = extractDocxTags(zip)
  const filledVariables: string[] = []
  const missingVariables: string[] = []

  for (const tag of tags) {
    const value = resolvePath(input.data, tag)
    if (value === undefined || value === null || value === '') {
      missingVariables.push(tag)
    } else {
      filledVariables.push(tag)
    }
  }

  if (input.strict && missingVariables.length > 0) {
    throw new MissingVariablesError(missingVariables)
  }

  // Parser custom para soportar dot-notation ("worker.dni") nativa.
  // El parser por defecto de docxtemplater 3.x trata los puntos como
  // identificadores literales, así que escribimos uno explícito.
  function parser(tag: string) {
    const path = tag.trim()
    return {
      get(scope: unknown): unknown {
        if (scope === null || scope === undefined) return undefined
        if (typeof scope !== 'object') return undefined
        return resolvePath(scope as Record<string, unknown>, path)
      },
    }
  }

  // Renderizar con docxtemplater. nullGetter retorna "" para tags faltantes.
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter: () => '',
    parser,
  })

  doc.render(input.data)

  const buffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer

  return { buffer, missingVariables, filledVariables }
}

export class MissingVariablesError extends Error {
  constructor(public missing: string[]) {
    super(`Faltan ${missing.length} variable(s) en la plantilla: ${missing.join(', ')}`)
    this.name = 'MissingVariablesError'
  }
}

/** Resuelve "worker.dni" → data.worker.dni. Retorna undefined si algún tramo es null/undefined. */
function resolvePath(data: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = data
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/** Lista (sin renderizar) las variables que la plantilla declara. */
export function listTemplateVariables(templateBytes: Buffer | Uint8Array): string[] {
  const zip = new PizZip(templateBytes)
  return extractDocxTags(zip)
}
