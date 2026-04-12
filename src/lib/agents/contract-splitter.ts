/**
 * Contract Splitter
 *
 * Recibe el texto plano de un PDF/DOCX que puede contener UNO o VARIOS contratos
 * laborales peruanos consecutivos y devuelve los bloques separados.
 *
 * Estrategia:
 *  1. Heurística por regex sobre marcadores típicos de contratos peruanos
 *     ("CONTRATO DE TRABAJO", "Conste por el presente", "CONTRATO N°", etc.)
 *  2. Si la heurística no detecta nada (o detecta solo 1), se devuelve un único
 *     bloque con el texto completo.
 *  3. Filtra bloques muy pequeños (<300 caracteres) — son falsos positivos.
 */

const CONTRACT_MARKERS: RegExp[] = [
  /CONTRATO\s+(DE\s+TRABAJO|INDIVIDUAL\s+DE\s+TRABAJO|N[º°]\s*\d+|SUJETO\s+A\s+MODALIDAD|A\s+PLAZO\s+(FIJO|INDETERMINADO|DETERMINADO))/i,
  /CONTRATO\s+DE\s+LOCACI[ÓO]N\s+DE\s+SERVICIOS/i,
  /CONTRATO\s+DE\s+PRESTACI[ÓO]N\s+DE\s+SERVICIOS/i,
  /CONTRATO\s+ADMINISTRATIVO\s+DE\s+SERVICIOS/i, // CAS
  /CONTRATO\s+DE\s+TRABAJO\s+EN\s+R[ÉE]GIMEN/i,
  /CONVENIO\s+DE\s+PR[ÁA]CTICAS/i,
  /ADENDA\s+(AL\s+)?CONTRATO/i,
  /RENOVACI[ÓO]N\s+DE\s+CONTRATO/i,
  /Conste\s+por\s+el\s+presente\s+(documento|contrato)/i,
]

export interface ContractBlock {
  /** Índice 1..N */
  index: number
  /** Texto del bloque */
  text: string
  /** Posición de inicio en el documento original */
  startOffset: number
  /** Heurística que disparó la detección (para debugging) */
  matchedBy?: string
}

/**
 * Encuentra todos los offsets donde un nuevo contrato podría empezar.
 * Combina varios regex y deduplica offsets cercanos (<50 chars).
 */
function findContractStarts(text: string): Array<{ offset: number; marker: string }> {
  const hits: Array<{ offset: number; marker: string }> = []

  for (const re of CONTRACT_MARKERS) {
    const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
    let m: RegExpExecArray | null
    while ((m = global.exec(text)) !== null) {
      hits.push({ offset: m.index, marker: m[0] })
    }
  }

  // Ordenar y deduplicar
  hits.sort((a, b) => a.offset - b.offset)
  const dedup: typeof hits = []
  for (const h of hits) {
    if (dedup.length === 0 || h.offset - dedup[dedup.length - 1].offset > 400) {
      dedup.push(h)
    }
  }
  return dedup
}

/**
 * Split principal. Devuelve siempre al menos 1 bloque.
 */
export function splitContracts(fullText: string): ContractBlock[] {
  const text = fullText.trim()
  if (text.length < 300) {
    return [{ index: 1, text, startOffset: 0 }]
  }

  const starts = findContractStarts(text)

  // Si hay 0 o 1 marcador, no hay nada que partir
  if (starts.length <= 1) {
    return [{ index: 1, text, startOffset: 0, matchedBy: starts[0]?.marker }]
  }

  // Construir bloques entre marcadores
  const blocks: ContractBlock[] = []
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i].offset
    const end = i + 1 < starts.length ? starts[i + 1].offset : text.length
    const blockText = text.slice(start, end).trim()
    if (blockText.length >= 300) {
      blocks.push({
        index: blocks.length + 1,
        text: blockText,
        startOffset: start,
        matchedBy: starts[i].marker,
      })
    }
  }

  // Fallback: si todos los bloques resultaron muy pequeños, devolver el documento entero
  if (blocks.length === 0) {
    return [{ index: 1, text, startOffset: 0 }]
  }

  return blocks
}
