/**
 * Parser de filas IPERC desde Excel.
 *
 * Recibe un array de objetos crudos (lo que `XLSX.utils.sheet_to_json` retorna)
 * con cualquier nombre de columna en español, y lo normaliza a la forma que
 * espera el endpoint `bulk-import`. Función pura — no toca DB, no toca red.
 *
 * Reglas:
 *   - Acepta sinónimos comunes (Cargo, Puesto, Posición — todos mapean a "puesto").
 *   - Los 5 índices se validan como enteros 1..3.
 *   - Los controles propuestos pueden venir en columnas separadas
 *     (Eliminación / Sustitución / Ingeniería / Administrativo / EPP) o en
 *     una columna unificada con prefijos.
 *   - Si una fila tiene errores, se marca pero NO bloquea las demás. La UI
 *     decide si manda solo las válidas o aborta todo.
 *
 * El motor IPERC determinístico (`iperc-matrix.calcularNivelRiesgo`) recalcula
 * IP/NR/Clasificación en el server. Si el Excel trae esos valores
 * pre-calculados se IGNORAN — no confiamos en datos derivados que vengan del
 * cliente.
 */

const COLUMN_ALIASES: Record<string, string> = {
  // proceso
  proceso: 'proceso',
  'macroproceso': 'proceso',
  'proceso productivo': 'proceso',
  // actividad
  actividad: 'actividad',
  'actividad / sub-proceso': 'actividad',
  'subproceso': 'actividad',
  // tarea
  tarea: 'tarea',
  'descripcion tarea': 'tarea',
  'descripción tarea': 'tarea',
  // peligro (FK opcional → CatalogoPeligro)
  peligro: 'peligro',
  'peligro identificado': 'peligro',
  'tipo de peligro': 'peligro',
  // riesgo (consecuencia)
  riesgo: 'riesgo',
  'consecuencia': 'riesgo',
  'consecuencia esperada': 'riesgo',
  // índices A, B, C, D, S
  a: 'indicePersonas',
  'a (personas)': 'indicePersonas',
  'personas': 'indicePersonas',
  'personas expuestas': 'indicePersonas',
  'indice personas': 'indicePersonas',
  b: 'indiceProcedimiento',
  'b (procedimiento)': 'indiceProcedimiento',
  'procedimiento': 'indiceProcedimiento',
  'procedimientos': 'indiceProcedimiento',
  'indice procedimiento': 'indiceProcedimiento',
  c: 'indiceCapacitacion',
  'c (capacitacion)': 'indiceCapacitacion',
  'c (capacitación)': 'indiceCapacitacion',
  'capacitacion': 'indiceCapacitacion',
  'capacitación': 'indiceCapacitacion',
  'indice capacitacion': 'indiceCapacitacion',
  d: 'indiceExposicion',
  'd (exposicion)': 'indiceExposicion',
  'd (exposición)': 'indiceExposicion',
  'exposicion': 'indiceExposicion',
  'exposición': 'indiceExposicion',
  'indice exposicion': 'indiceExposicion',
  s: 'indiceSeveridad',
  'severidad': 'indiceSeveridad',
  's (severidad)': 'indiceSeveridad',
  'is': 'indiceSeveridad',
  'is (severidad)': 'indiceSeveridad',
  'indice severidad': 'indiceSeveridad',
  // controles
  'controles actuales': 'controlesActuales',
  'control actual': 'controlesActuales',
  'controles existentes': 'controlesActuales',
  'controles propuestos': 'controlesPropuestosCombinados',
  'controles': 'controlesPropuestosCombinados',
  // controles propuestos por jerarquía (5 niveles)
  'eliminacion': 'cpEliminacion',
  'eliminación': 'cpEliminacion',
  'sustitucion': 'cpSustitucion',
  'sustitución': 'cpSustitucion',
  'ingenieria': 'cpIngenieria',
  'ingeniería': 'cpIngenieria',
  'administrativo': 'cpAdministrativo',
  'administrativos': 'cpAdministrativo',
  'epp': 'cpEpp',
  'equipo proteccion': 'cpEpp',
  'equipo protección': 'cpEpp',
  // responsable / plazo
  'responsable': 'responsable',
  'responsable cierre': 'responsable',
  'plazo': 'plazoCierre',
  'plazo cierre': 'plazoCierre',
  'fecha cierre': 'plazoCierre',
}

export interface IpercImportRow {
  proceso: string
  actividad: string
  tarea: string
  peligroNombre: string | null // nombre humano; el server lo cruza contra catálogo
  riesgo: string
  indicePersonas: number
  indiceProcedimiento: number
  indiceCapacitacion: number
  indiceExposicion: number
  indiceSeveridad: number
  controlesActuales: string[]
  controlesPropuestos: {
    eliminacion: string[]
    sustitucion: string[]
    ingenieria: string[]
    administrativo: string[]
    epp: string[]
  }
  responsable: string | null
  plazoCierre: string | null // ISO yyyy-mm-dd
}

export interface IpercImportError {
  rowIndex: number // 0-based del array original (no de Excel; sumar 2 si se quiere mostrar la fila Excel)
  field: string
  message: string
}

export interface IpercImportResult {
  rows: IpercImportRow[]
  errors: IpercImportError[]
  /** Filas saltadas porque están totalmente vacías (no son errores). */
  skipped: number
}

/**
 * Normaliza claves de columna: lowercase + trim + colapsa espacios.
 */
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Convierte un valor crudo a string trimmed, manejando null/undefined/numbers.
 */
function toStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

/**
 * Parsea un valor que puede ser número o string que parsea como número.
 * Devuelve NaN si no se puede parsear.
 */
function toNum(v: unknown): number {
  if (typeof v === 'number') return v
  const s = toStr(v).replace(',', '.')
  if (!s) return NaN
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

/**
 * Splits una celda con múltiples controles separados por '\n', ';' o '|'.
 */
function splitControles(v: unknown): string[] {
  const s = toStr(v)
  if (!s) return []
  return s
    .split(/[\n;|]/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

/**
 * Convierte una fila cruda (dict con claves en español) a una IpercImportRow
 * normalizada. Acumula errores de validación por campo.
 */
function parseRow(
  raw: Record<string, unknown>,
  rowIndex: number,
): { row: IpercImportRow | null; errors: IpercImportError[] } {
  const errors: IpercImportError[] = []

  // Map raw keys → canonical fields
  const canonical: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    const norm = normalizeKey(k)
    const target = COLUMN_ALIASES[norm]
    if (target) canonical[target] = v
  }

  // Si toda la fila viene vacía, retornar null (no es error, es skip)
  const isAllEmpty = Object.values(canonical).every((v) => toStr(v) === '')
  if (isAllEmpty) return { row: null, errors: [] }

  const proceso = toStr(canonical.proceso)
  const actividad = toStr(canonical.actividad)
  const tarea = toStr(canonical.tarea)
  const riesgo = toStr(canonical.riesgo)

  if (proceso.length < 2) {
    errors.push({ rowIndex, field: 'proceso', message: 'Proceso es requerido (≥2 caracteres)' })
  }
  if (actividad.length < 2) {
    errors.push({ rowIndex, field: 'actividad', message: 'Actividad es requerida (≥2 caracteres)' })
  }
  if (tarea.length < 2) {
    errors.push({ rowIndex, field: 'tarea', message: 'Tarea es requerida (≥2 caracteres)' })
  }
  if (riesgo.length < 2) {
    errors.push({ rowIndex, field: 'riesgo', message: 'Riesgo es requerido (≥2 caracteres)' })
  }

  function parseIndice(raw: unknown, field: string): number | null {
    const n = toNum(raw)
    if (!Number.isInteger(n) || n < 1 || n > 3) {
      errors.push({
        rowIndex,
        field,
        message: `${field} debe ser entero 1, 2 o 3 (recibido: ${toStr(raw) || 'vacío'})`,
      })
      return null
    }
    return n
  }

  const ip = parseIndice(canonical.indicePersonas, 'indicePersonas')
  const ipr = parseIndice(canonical.indiceProcedimiento, 'indiceProcedimiento')
  const ic = parseIndice(canonical.indiceCapacitacion, 'indiceCapacitacion')
  const ie = parseIndice(canonical.indiceExposicion, 'indiceExposicion')
  const is = parseIndice(canonical.indiceSeveridad, 'indiceSeveridad')

  // Si hay cualquier error, la fila no es válida pero igual la
  // representamos parcialmente para que la UI pueda mostrarla.
  if (
    errors.length > 0 ||
    ip === null ||
    ipr === null ||
    ic === null ||
    ie === null ||
    is === null
  ) {
    return { row: null, errors }
  }

  const peligroNombre = toStr(canonical.peligro) || null
  const responsable = toStr(canonical.responsable) || null
  const plazoCierre = (() => {
    const s = toStr(canonical.plazoCierre)
    if (!s) return null
    // Aceptar "yyyy-mm-dd" o serial Excel (number)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    // Si llegó como Date object o serial Excel ya parseado
    const asNum = toNum(canonical.plazoCierre)
    if (Number.isFinite(asNum) && asNum > 1) {
      // Excel epoch: días desde 1899-12-30 (con bug de Lotus)
      const epochMs = (asNum - 25569) * 86400 * 1000
      const d = new Date(epochMs)
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10)
      }
    }
    errors.push({
      rowIndex,
      field: 'plazoCierre',
      message: `Plazo cierre con formato inválido (${s}). Usa yyyy-mm-dd.`,
    })
    return null
  })()

  // Si plazoCierre acumuló errores en su IIFE, descartamos la fila ahora —
  // antes de seguir construyendo el objeto de salida.
  if (errors.length > 0) {
    return { row: null, errors }
  }

  // Controles
  const controlesActuales = splitControles(canonical.controlesActuales)

  const cpEliminacion = splitControles(canonical.cpEliminacion)
  const cpSustitucion = splitControles(canonical.cpSustitucion)
  const cpIngenieria = splitControles(canonical.cpIngenieria)
  const cpAdministrativo = splitControles(canonical.cpAdministrativo)
  const cpEpp = splitControles(canonical.cpEpp)

  // Si hay una columna "controles propuestos" combinada con prefijos, parsearla
  const combined = toStr(canonical.controlesPropuestosCombinados)
  if (combined) {
    // Buscamos prefijos como "[E]", "[S]", "[I]", "[A]", "[EPP]" al inicio de cada item
    const items = combined.split(/[\n;|]/g).map((p) => p.trim()).filter(Boolean)
    for (const item of items) {
      const m = item.match(/^\[(E|S|I|A|EPP)\]\s*(.+)$/i)
      if (!m) continue
      const tag = m[1].toUpperCase()
      const text = m[2].trim()
      if (tag === 'E') cpEliminacion.push(text)
      else if (tag === 'S') cpSustitucion.push(text)
      else if (tag === 'I') cpIngenieria.push(text)
      else if (tag === 'A') cpAdministrativo.push(text)
      else if (tag === 'EPP') cpEpp.push(text)
    }
  }

  return {
    row: {
      proceso,
      actividad,
      tarea,
      peligroNombre,
      riesgo,
      indicePersonas: ip,
      indiceProcedimiento: ipr,
      indiceCapacitacion: ic,
      indiceExposicion: ie,
      indiceSeveridad: is,
      controlesActuales,
      controlesPropuestos: {
        eliminacion: cpEliminacion,
        sustitucion: cpSustitucion,
        ingenieria: cpIngenieria,
        administrativo: cpAdministrativo,
        epp: cpEpp,
      },
      responsable,
      plazoCierre,
    },
    errors: [],
  }
}

/**
 * Parsea un array de filas crudas (output de XLSX.utils.sheet_to_json).
 *
 * Es resiliente: una fila con error no detiene el resto. Las filas vacías
 * (típicas al final del Excel) se cuentan en `skipped` pero no son errores.
 */
export function parseIpercRows(rawRows: Array<Record<string, unknown>>): IpercImportResult {
  const rows: IpercImportRow[] = []
  const errors: IpercImportError[] = []
  let skipped = 0

  for (let i = 0; i < rawRows.length; i++) {
    const { row, errors: rowErrors } = parseRow(rawRows[i], i)
    if (row) {
      rows.push(row)
    } else if (rowErrors.length > 0) {
      errors.push(...rowErrors)
    } else {
      skipped++
    }
  }

  return { rows, errors, skipped }
}
