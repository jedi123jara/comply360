/**
 * Motor LLM para sugerencia y redacción de filas IPERC.
 *
 * El LLM SOLO redacta texto narrativo y selecciona peligros del catálogo.
 * NUNCA calcula índices: el motor determinístico (`iperc-matrix.ts`)
 * es la única fuente de verdad para IP, NR y clasificación.
 *
 * Validador de seguridad incorporado:
 *   1. Whitelist de peligros: cada `peligroCodigo` que sugiera el LLM debe
 *      existir en el catálogo `CatalogoPeligro`. Si no existe, se descarta
 *      (defensa contra alucinaciones de peligros inventados).
 *   2. Caps duros: índices forzados al rango 1..3 (validación adicional
 *      antes de pasar al motor determinístico).
 *   3. Strings limitados a max 500 chars para evitar inyección de prompt.
 */

import { callAI, extractJson } from '@/lib/ai/provider'
import { calcularNivelRiesgo, type NivelRiesgoIPERC } from './iperc-matrix'

// ── Tipos de input/output ────────────────────────────────────────────────

export interface IpercSuggestInput {
  sede: {
    nombre: string
    tipoInstalacion: string
    departamento?: string | null
  }
  puesto: {
    nombre: string
    descripcionTareas: string[]
    jornada?: string | null
    flags: {
      fisica: boolean
      quimica: boolean
      biologica: boolean
      ergonomica: boolean
      psicosocial: boolean
      alturas: boolean
      espacioConfinado: boolean
      calienteFrio: boolean
      sctr: boolean
      uvSolar: boolean
    }
  }
  /** Catálogo filtrado de peligros que se le permite usar al LLM. */
  catalogo: Array<{
    id: string
    codigo: string
    familia: string
    nombre: string
    descripcion: string
  }>
  /** Máximo de filas a sugerir (1..15). Default 8. */
  maxFilas?: number
}

export interface IpercSuggestedFila {
  proceso: string
  actividad: string
  tarea: string
  peligroId: string | null
  peligroCodigo: string | null
  peligroNombre: string
  riesgo: string
  // Índices propuestos por el LLM (el usuario puede ajustarlos antes de guardar)
  indicePersonas: number
  indiceProcedimiento: number
  indiceCapacitacion: number
  indiceExposicion: number
  indiceSeveridad: number
  // Cálculos derivados (motor determinístico, no LLM)
  indiceProbabilidad: number
  nivelRiesgo: number
  clasificacion: NivelRiesgoIPERC
  esSignificativo: boolean
  // Controles narrativos sugeridos por jerarquía
  controlesPropuestos: {
    eliminacion: string[]
    sustitucion: string[]
    ingenieria: string[]
    administrativo: string[]
    epp: string[]
  }
  // Justificación corta (para auditoría / explicabilidad)
  justificacion: string
}

export interface IpercSuggestResult {
  filas: IpercSuggestedFila[]
  /** Sugerencias descartadas por el validador (peligros no en catálogo, etc.). */
  descartadas: number
  /** Modelo y proveedor que produjo la sugerencia (telemetría). */
  modelo: string
}

// ── Helpers internos ─────────────────────────────────────────────────────

function clampIndice(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return 1
  return Math.min(3, Math.max(1, Math.round(v)))
}

function safeString(s: unknown, max = 500): string {
  if (typeof s !== 'string') return ''
  return s.slice(0, max).trim()
}

function safeStringArray(v: unknown, max = 5): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => safeString(x, 300))
    .filter((s) => s.length >= 3)
    .slice(0, max)
}

function flagsResumen(flags: IpercSuggestInput['puesto']['flags']): string {
  const activas: string[] = []
  if (flags.fisica) activas.push('físico')
  if (flags.quimica) activas.push('químico')
  if (flags.biologica) activas.push('biológico')
  if (flags.ergonomica) activas.push('ergonómico')
  if (flags.psicosocial) activas.push('psicosocial')
  if (flags.alturas) activas.push('trabajos en altura')
  if (flags.espacioConfinado) activas.push('espacios confinados')
  if (flags.calienteFrio) activas.push('exposición a calor/frío')
  if (flags.sctr) activas.push('SCTR (Anexo 5 D.S. 009-97-SA)')
  if (flags.uvSolar) activas.push('exposición UV solar (Ley 30102)')
  return activas.length > 0 ? activas.join(', ') : 'ninguna marcada'
}

function buildPrompt(input: IpercSuggestInput, maxFilas: number): string {
  const tareas =
    input.puesto.descripcionTareas.length > 0
      ? input.puesto.descripcionTareas.map((t, i) => `  ${i + 1}. ${t}`).join('\n')
      : '  (sin tareas listadas)'

  const catalogo = input.catalogo
    .map((p) => `- [${p.codigo}] ${p.familia} · ${p.nombre}: ${p.descripcion}`)
    .join('\n')

  return `# CONTEXTO

Eres un especialista SST peruano experimentado redactando una matriz IPERC oficial siguiendo
**R.M. 050-2013-TR (Manual IPERC SUNAFIL)**. Tu único trabajo es **identificar peligros y
redactar texto narrativo en español peruano neutro**. **No calculas índices finales**: solo
sugieres valores 1..3 que el motor determinístico de la plataforma re-calculará y validará.

# DATOS DE LA SEDE Y PUESTO

- Sede: **${input.sede.nombre}** (${input.sede.tipoInstalacion}${input.sede.departamento ? `, ${input.sede.departamento}` : ''})
- Puesto: **${input.puesto.nombre}**${input.puesto.jornada ? ` · Jornada: ${input.puesto.jornada}` : ''}
- Tareas:
${tareas}
- Exposiciones marcadas para este puesto: ${flagsResumen(input.puesto.flags)}

# CATÁLOGO DE PELIGROS DISPONIBLES (whitelist obligatoria)

Solo puedes referenciar peligros de esta lista usando el código entre corchetes.
Si propones un peligro que NO está aquí, será descartado por el validador.

${catalogo}

# REGLAS DE REDACCIÓN

1. Sugiere entre 4 y ${maxFilas} filas IPERC, priorizando los riesgos más relevantes para el puesto.
2. Cada fila DEBE asociarse a un peligro del catálogo (campo \`peligroCodigo\`). Usa null
   solo si genuinamente no encaja ninguno (debe ser excepción).
3. Los índices oficiales SUNAFIL son enteros entre 1 y 3:
   - **personas**: 1 (1-3 trabajadores), 2 (4-12), 3 (>12)
   - **procedimiento**: 1 (satisfactorio), 2 (parcial), 3 (no existe)
   - **capacitacion**: 1 (entrenado), 2 (parcial), 3 (no entrenado)
   - **exposicion**: 1 (esporádico), 2 (eventual/mensual), 3 (permanente/diario)
   - **severidad**: 1 (lig. dañino), 2 (dañino), 3 (ext. dañino)
4. Los controles propuestos siguen jerarquía: eliminación → sustitución → ingeniería →
   administrativo → EPP. Sugiere al menos 1 control en el nivel más alto viable.
5. Idioma: **español peruano neutro**, sin voseo. NO inventes normas legales.
6. \`justificacion\`: 1 frase explicando por qué el riesgo aplica al puesto.

# FORMATO DE RESPUESTA

Responde SOLO con un objeto JSON válido (sin markdown, sin explicaciones adicionales) con esta forma:

\`\`\`json
{
  "filas": [
    {
      "proceso": "string",
      "actividad": "string",
      "tarea": "string",
      "peligroCodigo": "FIS-001 | QUI-005 | etc. (debe estar en el catálogo)",
      "riesgo": "string descriptivo del riesgo asociado",
      "indicePersonas": 2,
      "indiceProcedimiento": 2,
      "indiceCapacitacion": 2,
      "indiceExposicion": 3,
      "indiceSeveridad": 2,
      "controlesPropuestos": {
        "eliminacion": [],
        "sustitucion": [],
        "ingenieria": ["Instalar campana extractora"],
        "administrativo": ["Capacitación SST anual"],
        "epp": ["Respirador con filtro P100"]
      },
      "justificacion": "string corto"
    }
  ]
}
\`\`\`
`
}

// ── Función principal ────────────────────────────────────────────────────

export async function sugerirFilasIperc(
  input: IpercSuggestInput,
  opts?: { orgId?: string | null; maxFilas?: number },
): Promise<IpercSuggestResult> {
  const maxFilas = Math.min(15, Math.max(1, opts?.maxFilas ?? input.maxFilas ?? 8))

  if (input.catalogo.length === 0) {
    throw new Error('Catálogo de peligros vacío. No se puede sugerir filas IPERC.')
  }

  const prompt = buildPrompt(input, maxFilas)

  const aiResponse = await callAI(
    [
      {
        role: 'system',
        content:
          'Eres un especialista SST peruano. Respondes SOLO con JSON válido siguiendo el esquema solicitado. No agregas comentarios.',
      },
      { role: 'user', content: prompt },
    ],
    {
      temperature: 0.2,
      maxTokens: 4000,
      jsonMode: true,
      feature: 'doc-generator',
      orgId: opts?.orgId ?? null,
    },
  )

  let parsed: { filas?: unknown[] }
  try {
    parsed = extractJson<{ filas?: unknown[] }>(aiResponse)
  } catch {
    throw new Error('El LLM devolvió una respuesta que no se pudo parsear como JSON.')
  }

  const filasRaw = Array.isArray(parsed?.filas) ? parsed.filas : []
  const codigoIndex = new Map(input.catalogo.map((p) => [p.codigo, p]))

  const filas: IpercSuggestedFila[] = []
  let descartadas = 0

  for (const raw of filasRaw) {
    if (!raw || typeof raw !== 'object') {
      descartadas++
      continue
    }
    const r = raw as Record<string, unknown>

    const proceso = safeString(r.proceso, 150)
    const actividad = safeString(r.actividad, 200)
    const tarea = safeString(r.tarea, 200)
    const riesgo = safeString(r.riesgo, 300)
    const justificacion = safeString(r.justificacion, 300)
    const codigo = safeString(r.peligroCodigo, 30)

    // Validación crítica: filas con campos esenciales vacíos se descartan
    if (!proceso || !actividad || !tarea || !riesgo) {
      descartadas++
      continue
    }

    // Whitelist: el código de peligro debe existir en el catálogo
    const peligro = codigo ? codigoIndex.get(codigo) : null
    if (codigo && !peligro) {
      // El LLM inventó un código que no existe → descartar
      descartadas++
      continue
    }

    // Índices con clamp defensivo
    const idxPersonas = clampIndice(r.indicePersonas)
    const idxProcedimiento = clampIndice(r.indiceProcedimiento)
    const idxCapacitacion = clampIndice(r.indiceCapacitacion)
    const idxExposicion = clampIndice(r.indiceExposicion)
    const idxSeveridad = clampIndice(r.indiceSeveridad)

    // Cálculo determinístico (motor oficial SUNAFIL)
    const result = calcularNivelRiesgo({
      indicePersonas: idxPersonas,
      indiceProcedimiento: idxProcedimiento,
      indiceCapacitacion: idxCapacitacion,
      indiceExposicion: idxExposicion,
      indiceSeveridad: idxSeveridad,
    })

    // Controles narrativos (con caps de longitud)
    const controlesObj = (r.controlesPropuestos as Record<string, unknown> | undefined) ?? {}
    const controlesPropuestos = {
      eliminacion: safeStringArray(controlesObj.eliminacion),
      sustitucion: safeStringArray(controlesObj.sustitucion),
      ingenieria: safeStringArray(controlesObj.ingenieria),
      administrativo: safeStringArray(controlesObj.administrativo),
      epp: safeStringArray(controlesObj.epp),
    }

    filas.push({
      proceso,
      actividad,
      tarea,
      peligroId: peligro?.id ?? null,
      peligroCodigo: peligro?.codigo ?? null,
      peligroNombre: peligro?.nombre ?? '',
      riesgo,
      indicePersonas: idxPersonas,
      indiceProcedimiento: idxProcedimiento,
      indiceCapacitacion: idxCapacitacion,
      indiceExposicion: idxExposicion,
      indiceSeveridad: idxSeveridad,
      indiceProbabilidad: result.indiceProbabilidad,
      nivelRiesgo: result.nivelRiesgo,
      clasificacion: result.clasificacion,
      esSignificativo: result.esSignificativo,
      controlesPropuestos,
      justificacion,
    })
  }

  return {
    filas: filas.slice(0, maxFilas),
    descartadas,
    modelo: 'deepseek-doc-generator',
  }
}
