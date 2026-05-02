/**
 * Sanitiza el contenido textual de un contrato renderizado por el motor de
 * plantillas (`org-template-engine.ts`) para imprimirlo en PDF como un
 * documento legal profesional.
 *
 * Tareas que realiza:
 *   1. Restaura tildes en títulos en mayúsculas (CLAUSULA → CLÁUSULA, …).
 *   2. Filtra el marcador interno "(CLÁUSULA OBLIGATORIA)" del cuerpo y lo
 *      conserva como flag interno (`isMandatory`).
 *   3. Extrae cada "Base legal: …" del cuerpo y lo expone como pie de
 *      cláusula (`baseLegal`).
 *   4. Convierte placeholders sin valor (`{{nombre_placeholder}}`) en líneas
 *      visuales con etiqueta legible:
 *          ____________ [Domicilio del Empleador] ____________
 *   5. Particiona el contrato en preámbulo + cláusulas numeradas + cierre.
 *
 * El cleaner trabaja sobre el `rendered` que produce `renderTemplate(...,
 * { blankUnmapped: false })` — es decir, los placeholders sin valor llegan
 * todavía como `{{KEY}}`. Si el caller usó `blankUnmapped: true`, los
 * placeholders ya se convirtieron en `____________` y se procesan como
 * fallback genérico (sin etiqueta semántica).
 */

// ─── Restauración de tildes en títulos all-caps ─────────────────────────────

/**
 * Diccionario determinista de palabras en MAYÚSCULAS que deberían llevar
 * tilde o eñe. Se aplica únicamente cuando la palabra del texto está en
 * mayúsculas, para evitar tocar prosa (ej. "una cláusula obligatoria").
 *
 * No incluimos palabras cuya forma con/sin tilde varía según contexto.
 */
const ACCENTS_MAP: Record<string, string> = {
  ANO: 'AÑO',
  ANOS: 'AÑOS',
  ATENCION: 'ATENCIÓN',
  CALIFICACION: 'CALIFICACIÓN',
  CAPACITACION: 'CAPACITACIÓN',
  CESACION: 'CESACIÓN',
  CESION: 'CESIÓN',
  CLAUSULA: 'CLÁUSULA',
  CLAUSULAS: 'CLÁUSULAS',
  CODIGO: 'CÓDIGO',
  CODIGOS: 'CÓDIGOS',
  COMPANIA: 'COMPAÑÍA',
  CONCILIACION: 'CONCILIACIÓN',
  CONFORMIDAD: 'CONFORMIDAD',
  CONTRATACION: 'CONTRATACIÓN',
  DECIMA: 'DÉCIMA',
  DECIMO: 'DÉCIMO',
  DESPUES: 'DESPUÉS',
  DIA: 'DÍA',
  DIAS: 'DÍAS',
  DISPOSICION: 'DISPOSICIÓN',
  DURACION: 'DURACIÓN',
  EDUCACION: 'EDUCACIÓN',
  EJECUCION: 'EJECUCIÓN',
  EVALUACION: 'EVALUACIÓN',
  EXAMENES: 'EXÁMENES',
  GARANTIA: 'GARANTÍA',
  IDENTIFICACION: 'IDENTIFICACIÓN',
  INDEMNIZACION: 'INDEMNIZACIÓN',
  INFORMACION: 'INFORMACIÓN',
  INSTRUCCION: 'INSTRUCCIÓN',
  INVESTIGACION: 'INVESTIGACIÓN',
  JURISDICCION: 'JURISDICCIÓN',
  NEGOCIACION: 'NEGOCIACIÓN',
  NUMERO: 'NÚMERO',
  NUMEROS: 'NÚMEROS',
  OBLIGACION: 'OBLIGACIÓN',
  PERIODO: 'PERÍODO',
  PERIODOS: 'PERÍODOS',
  POLITICA: 'POLÍTICA',
  POLITICAS: 'POLÍTICAS',
  PRACTICA: 'PRÁCTICA',
  PRACTICAS: 'PRÁCTICAS',
  PRESTACION: 'PRESTACIÓN',
  PROTECCION: 'PROTECCIÓN',
  PROXIMO: 'PRÓXIMO',
  PUBLICO: 'PÚBLICO',
  REMUNERACION: 'REMUNERACIÓN',
  RESOLUCION: 'RESOLUCIÓN',
  SENAL: 'SEÑAL',
  SENORA: 'SEÑORA',
  SENORES: 'SEÑORES',
  SEPTIMA: 'SÉPTIMA',
  SEPTIMO: 'SÉPTIMO',
  SETIMA: 'SÉPTIMA',
  SETIMO: 'SÉPTIMO',
  SUPERVISION: 'SUPERVISIÓN',
  TECNICO: 'TÉCNICO',
  TERMINACION: 'TERMINACIÓN',
  TITULO: 'TÍTULO',
  TITULOS: 'TÍTULOS',
  TRAMITE: 'TRÁMITE',
  TRIGESIMA: 'TRIGÉSIMA',
  TRIGESIMO: 'TRIGÉSIMO',
  ULTIMO: 'ÚLTIMO',
  UNDECIMA: 'UNDÉCIMA',
  DUODECIMA: 'DUODÉCIMA',
  VIGESIMA: 'VIGÉSIMA',
  VIGESIMO: 'VIGÉSIMO',
}

const ACCENTS_PATTERN = new RegExp(
  `\\b(${Object.keys(ACCENTS_MAP).join('|')})\\b`,
  'g',
)

function restoreAccentsInUpperCase(text: string): string {
  return text.replace(ACCENTS_PATTERN, (match) => {
    if (match === match.toUpperCase()) return ACCENTS_MAP[match] ?? match
    return match
  })
}

// ─── Humanización de placeholders sin valor ────────────────────────────────

/**
 * Overrides de humanización para placeholders snake_case comunes en
 * contratos peruanos. Dan resultado más natural que la conversión genérica
 * (snake_case → "Title Case").
 */
const HUMANIZE_OVERRIDES: Record<string, string> = {
  actividad_economica: 'Actividad Económica',
  area: 'Área',
  cargo: 'Cargo',
  causa_objetiva: 'Causa Objetiva',
  ciudad: 'Ciudad',
  comitente_razon_social: 'Razón Social del Comitente',
  comitente_representante: 'Representante del Comitente',
  comitente_ruc: 'RUC del Comitente',
  direccion_oficina: 'Dirección de la Oficina',
  domicilio_empleador: 'Domicilio del Empleador',
  domicilio_trabajador: 'Domicilio del Trabajador',
  empleador_dni_rep: 'DNI del Representante',
  empleador_domicilio: 'Domicilio del Empleador',
  empleador_razon_social: 'Razón Social del Empleador',
  empleador_representante: 'Representante Legal',
  empleador_ruc: 'RUC del Empleador',
  fecha_aprobacion: 'Fecha de Aprobación',
  fecha_cese: 'Fecha de Cese',
  fecha_contrato: 'Fecha del Contrato',
  fecha_fin: 'Fecha de Término',
  fecha_firma: 'Fecha de Firma',
  fecha_inicio: 'Fecha de Inicio',
  forma_pago: 'Forma de Pago',
  honorario: 'Honorario',
  jornada: 'Jornada',
  locador_dni: 'DNI del Locador',
  locador_nombre: 'Nombre del Locador',
  locador_ruc: 'RUC del Locador',
  lugar_trabajo: 'Lugar de Trabajo',
  modalidad: 'Modalidad',
  remuneracion: 'Remuneración',
  servicio: 'Servicio',
  trabajador_dni: 'DNI del Trabajador',
  trabajador_domicilio: 'Domicilio del Trabajador',
  trabajador_nombre: 'Nombre del Trabajador',
}

function humanizePlaceholderKey(key: string): string {
  const normalized = key.toLowerCase()
  if (HUMANIZE_OVERRIDES[normalized]) return HUMANIZE_OVERRIDES[normalized]
  return normalized
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const FILL_LINE = '____________________'

function placeholderFillLine(label: string): string {
  return `${FILL_LINE} [${label}] ${FILL_LINE}`
}

const PLACEHOLDER_RE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g
const BLANK_LINE_RE = /_{8,}/g

function replaceUnresolvedPlaceholders(text: string): {
  text: string
  unresolved: string[]
} {
  const unresolved: string[] = []
  let result = text.replace(PLACEHOLDER_RE, (_full, key: string) => {
    if (!unresolved.includes(key)) unresolved.push(key)
    return placeholderFillLine(humanizePlaceholderKey(key))
  })
  // Si el caller usó `blankUnmapped: true`, ya hay líneas `____________`
  // genéricas sin etiqueta — las uniformizamos al mismo estilo (con etiqueta
  // genérica "Por completar") para que el PDF se vea consistente.
  result = result.replace(BLANK_LINE_RE, () => placeholderFillLine('Por completar'))
  return { text: result, unresolved }
}

// ─── Extracción de "Base legal: …" ──────────────────────────────────────────

/**
 * Captura líneas o segmentos del tipo "Base legal: D.S. 003-97-TR Art. 4".
 * Permite paréntesis envolventes y guiones como separador.
 */
const BASE_LEGAL_RE = /(?:^|[\s\n])\(?Base\s+legal\s*[:\-—]\s*([^\n)]+)\)?/i

function extractBaseLegal(body: string): { body: string; baseLegal: string | null } {
  const match = body.match(BASE_LEGAL_RE)
  if (!match) return { body, baseLegal: null }
  const baseLegal = match[1].trim().replace(/[\.,;]+$/, '')
  const cleaned = body.replace(BASE_LEGAL_RE, '').trim()
  return { body: cleaned, baseLegal }
}

// ─── Detección de cláusulas ─────────────────────────────────────────────────

/**
 * Match de la cabecera de una cláusula. Acepta dos formatos:
 *   A) "PRIMERA.- OBJETO DEL CONTRATO\n\nEL EMPLEADOR contrata…"
 *   B) "PRIMERA.- DE LAS PARTES (CLÁUSULA OBLIGATORIA) El presente contrato…"
 *
 * Captura grupo 1 = ordinal completo, grupo 2 = resto de la primera línea.
 */
const CLAUSE_HEAD_RE =
  /^\s*((?:VIG[ÉE]SIM[OA]|TRIG[ÉE]SIM[OA])(?:\s+(?:PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[ÉE]PTIMA|OCTAVA|NOVENA))?|D[ÉE]CIM[OA](?:\s+(?:PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[ÉE]PTIMA|OCTAVA|NOVENA))?|UND[ÉE]CIMA|DUOD[ÉE]CIMA|PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[ÉE]PTIMA|OCTAVA|NOVENA)\s*[\.\-:]+\s*(.*)$/i

const MANDATORY_FLAG_RE = /\s*\(\s*cl[áa]usula\s+obligatoria\s*\)\s*/gi

const PREAMBLE_HINTS = [
  /^conste\s+por\s+el\s+presente/i,
  /^por\s+el\s+presente\s+documento/i,
  /^entre\s+los\s+suscritos/i,
]

const CLOSING_HINTS = [
  /^en\s+se(?:ñ|n)al\s+de\s+conformidad/i,
  /^en\s+fe\s+de\s+lo\s+cual/i,
]

function looksLikePreamble(text: string): boolean {
  return PREAMBLE_HINTS.some((re) => re.test(text.trim()))
}

function looksLikeClosing(text: string): boolean {
  return CLOSING_HINTS.some((re) => re.test(text.trim()))
}

// ─── Tipos públicos ─────────────────────────────────────────────────────────

export interface CleanedClause {
  /** Título completo, ej. "PRIMERA: OBJETO DEL CONTRATO" */
  title: string | null
  /** Cuerpo limpio, sin metadata inline ni base legal */
  body: string
  /** Base legal extraída del cuerpo, si existía */
  baseLegal: string | null
  /** Marca interna: la cláusula traía "(CLÁUSULA OBLIGATORIA)" en la fuente */
  isMandatory: boolean
}

export interface CleanedContract {
  /** Bloque introductorio "Conste por el presente…" */
  preamble: string
  /** Cláusulas numeradas en orden de aparición */
  clauses: CleanedClause[]
  /** Bloque de cierre "En señal de conformidad…" */
  closingParagraph: string
  /** Placeholders detectados sin valor (para diagnósticos) */
  unresolvedPlaceholders: string[]
}

// ─── Función principal ─────────────────────────────────────────────────────

export function cleanContractContent(rendered: string): CleanedContract {
  // 1. Restaurar tildes y reemplazar placeholders sin valor primero, para que
  //    el resto del pipeline opere sobre texto limpio.
  let text = restoreAccentsInUpperCase(rendered)
  const phReplace = replaceUnresolvedPlaceholders(text)
  text = phReplace.text

  // 2. Particionar en bloques separados por línea(s) en blanco.
  const blocks = text
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter(Boolean)

  let preamble = ''
  let closingParagraph = ''
  const clauses: CleanedClause[] = []

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    // Cierre: prioridad si está al final del documento o coincide con hint.
    if (looksLikeClosing(block) && i >= blocks.length - 3 && !closingParagraph) {
      closingParagraph = stripFlags(block)
      continue
    }

    // Cláusula numerada (PRIMERA, SEGUNDA, ...).
    const clause = parseClauseBlock(block)
    if (clause) {
      clauses.push(clause)
      continue
    }

    // Preámbulo: primer bloque que arranca con frase típica.
    if (!preamble && looksLikePreamble(block)) {
      preamble = stripFlags(block)
      continue
    }

    // Si todavía no detectamos preámbulo y el primer bloque NO es cláusula,
    // lo asumimos preámbulo (cabeceras del template suelen ir antes).
    if (!preamble && clauses.length === 0) {
      preamble = stripFlags(block)
      continue
    }

    // Bloque suelto: lo concatenamos al cuerpo de la cláusula previa si
    // existe; si no, al cierre o al preámbulo según posición.
    if (clauses.length > 0) {
      const last = clauses[clauses.length - 1]
      last.body = `${last.body}\n\n${stripFlags(block)}`.trim()
    } else if (preamble) {
      preamble = `${preamble}\n\n${stripFlags(block)}`.trim()
    }
  }

  // Post-proceso: re-extraer base legal de cada cláusula porque pudo entrar
  // por un bloque suelto concatenado después de parseClauseBlock.
  for (const clause of clauses) {
    if (!clause.baseLegal) {
      const extracted = extractBaseLegal(clause.body)
      clause.body = extracted.body
      clause.baseLegal = extracted.baseLegal
    }
  }

  return {
    preamble,
    clauses,
    closingParagraph,
    unresolvedPlaceholders: phReplace.unresolved,
  }
}

// ─── Helpers internos ──────────────────────────────────────────────────────

function stripFlags(text: string): string {
  return text.replace(MANDATORY_FLAG_RE, ' ').replace(/[ \t]{2,}/g, ' ').trim()
}

function parseClauseBlock(block: string): CleanedClause | null {
  const lines = block.split('\n')
  const firstLine = lines[0].trim()
  const headMatch = firstLine.match(CLAUSE_HEAD_RE)
  if (!headMatch) return null

  const ordinal = headMatch[1].trim().toUpperCase()
  const afterOrdinal = (headMatch[2] ?? '').trim()
  const restLines = lines.slice(1).join('\n').trim()

  // Detectar el flag (CLÁUSULA OBLIGATORIA) en cualquier parte del bloque.
  const isMandatory = MANDATORY_FLAG_RE.test(block)
  // El test consume el lastIndex global — reseteamos para usos posteriores.
  MANDATORY_FLAG_RE.lastIndex = 0

  // Separar título de cuerpo dentro de afterOrdinal:
  //   - Si contiene "(CLÁUSULA OBLIGATORIA)", lo de antes es título y lo de
  //     después es body inline.
  //   - Si no, y afterOrdinal está en mayúsculas (parece título solo),
  //     usamos afterOrdinal como título y el body son las restLines.
  //   - Si no, intentamos cortar por el primer ". " donde la siguiente
  //     palabra empieza en mayúsculas (heurística).
  let title: string
  let inlineBody: string

  const flagPos = afterOrdinal.search(MANDATORY_FLAG_RE)
  MANDATORY_FLAG_RE.lastIndex = 0
  if (flagPos >= 0) {
    title = afterOrdinal.slice(0, flagPos).trim()
    inlineBody = afterOrdinal.slice(flagPos).replace(MANDATORY_FLAG_RE, ' ').trim()
    MANDATORY_FLAG_RE.lastIndex = 0
  } else if (
    afterOrdinal.length > 0 &&
    afterOrdinal === afterOrdinal.toUpperCase() &&
    !restLines.startsWith(afterOrdinal)
  ) {
    title = afterOrdinal
    inlineBody = ''
  } else if (afterOrdinal.length > 0) {
    // Buscar separación heurística "TITULO Cuerpo" donde TITULO termina al
    // empezar la primera palabra que NO está en mayúsculas (ej. artículo).
    const splitMatch = afterOrdinal.match(/^([A-ZÁÉÍÓÚÑ ,;:'"\-\/]+?)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ].*)$/)
    if (splitMatch) {
      title = splitMatch[1].trim().replace(/[,;:]$/, '')
      inlineBody = splitMatch[2].trim()
    } else {
      title = afterOrdinal
      inlineBody = ''
    }
  } else {
    title = ''
    inlineBody = ''
  }

  let body = [inlineBody, restLines].filter(Boolean).join('\n\n').trim()
  body = stripFlags(body)

  const extracted = extractBaseLegal(body)
  body = extracted.body

  const fullTitle = title ? `${ordinal}: ${title}` : ordinal

  return {
    title: fullTitle,
    body,
    baseLegal: extracted.baseLegal,
    isMandatory,
  }
}
