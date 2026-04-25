/**
 * Redactor de PII — sanitiza texto antes de mandarlo al LLM.
 *
 * Comply360 procesa contratos, boletas, denuncias y documentos de RRHH que
 * contienen datos sensibles bajo Ley 29733 (Protección de Datos Personales
 * en Perú). Mandar esos datos crudos a un LLM externo (OpenAI, Groq) es:
 *
 *   1. Riesgo legal: el procesamiento por terceros requiere DPA explícito
 *      con el proveedor + base legal documentada en la cadena de
 *      tratamientos de la org.
 *   2. Riesgo operativo: si el modelo es entrenado con prompts (algunos
 *      providers lo hacen en planes free/personal), los DNIs, salarios y
 *      nombres de los trabajadores quedan en su corpus.
 *   3. Riesgo reputacional: un cliente que vea un prompt logueado con su
 *      planilla en claro pierde confianza al instante.
 *
 * Este módulo NO reemplaza un DPA — sigue siendo necesario. Pero reduce el
 * blast radius: el contenido funcional (estructura del contrato, cláusulas,
 * obligaciones) se preserva intacto, y los identificadores se reemplazan
 * por placeholders deterministas que el modelo igual puede razonar sobre.
 *
 * Estrategia:
 *   - DNI (8 dígitos): `12345678` → `[DNI_1]`, `[DNI_2]`, ... (per-call counter)
 *   - RUC (11 dígitos, empieza 10 o 20): `20123456789` → `[RUC_1]`
 *   - Email: `juan@empresa.pe` → `[EMAIL_1]`
 *   - Teléfono: `+51 999 888 777` o `999888777` → `[PHONE_1]`
 *   - Nombres del worker (cuando se pasa context): `Juan Pérez` → `[WORKER_1]`
 *   - CCI/cuenta bancaria (20 dígitos): → `[ACCOUNT_1]`
 *
 * Devuelve además un `mapping` para des-redactar la respuesta del LLM si
 * fuera necesario (ej. el modelo cita "en el contrato del [WORKER_1]" y
 * queremos restaurar el nombre real al mostrar al admin).
 */

export interface RedactionResult {
  redacted: string
  mapping: Record<string, string> // placeholder → valor original
  counts: {
    dni: number
    ruc: number
    email: number
    phone: number
    name: number
    account: number
  }
}

export interface RedactOptions {
  /**
   * Nombres del worker conocidos (firstName + lastName). Si se pasa, los
   * matches literales en el texto se reemplazan por `[WORKER_1]`. Útil para
   * no exponer la identidad del trabajador concreto al LLM.
   */
  workerNames?: string[]
  /**
   * Si `true`, reemplaza el contenido pero mantiene la longitud aproximada
   * para no romper layouts (ej. contratos con tablas alineadas). Default: false.
   */
  preserveLength?: boolean
}

/**
 * Redacta PII de un texto antes de mandarlo al LLM.
 *
 * Determinista para un mismo texto: mismas ocurrencias del mismo valor
 * obtienen el mismo placeholder. Eso permite al modelo razonar sobre
 * "el trabajador con DNI [DNI_1] firmó el contrato y luego [DNI_1] renunció"
 * — y nosotros restaurar el DNI real en la respuesta.
 */
export function redactPii(text: string, opts: RedactOptions = {}): RedactionResult {
  const mapping: Record<string, string> = {}
  const counters = { dni: 0, ruc: 0, email: 0, phone: 0, name: 0, account: 0 }
  let working = text

  // ── Helper: registrar/recuperar placeholder determinista por valor ────────
  // Para nombres (que vienen con case mixto: "JUAN PÉREZ" y "juan pérez"),
  // normalizamos la clave del cache para que ambos compartan el mismo
  // placeholder. Para identificadores numéricos, el case no aplica.
  const placeholderByValue = new Map<string, string>()
  function cacheKey(category: keyof typeof counters, value: string): string {
    return category === 'name' ? `name:${value.toLowerCase()}` : `${category}:${value}`
  }
  function getOrCreate(category: keyof typeof counters, value: string): string {
    const key = cacheKey(category, value)
    const cached = placeholderByValue.get(key)
    if (cached) return cached
    counters[category] += 1
    const tag = `[${category.toUpperCase()}_${counters[category]}]`
    placeholderByValue.set(key, tag)
    mapping[tag] = value
    return tag
  }

  // ── 1. CCI / cuenta bancaria (20 dígitos consecutivos) ───────────────────
  // Prioritario antes de DNI (8) y RUC (11) para no romper números largos.
  working = working.replace(/\b\d{20}\b/g, (m) => getOrCreate('account', m))
  // Cuentas de 14-17 dígitos (CCI antiguo, cuentas BCP/Interbank)
  working = working.replace(/\b\d{14,17}\b/g, (m) => getOrCreate('account', m))

  // ── 2. RUC (11 dígitos, empieza con 10 o 20) ─────────────────────────────
  working = working.replace(/\b(?:10|20)\d{9}\b/g, (m) => getOrCreate('ruc', m))

  // ── 3. DNI (8 dígitos exactos, sin contexto numérico) ────────────────────
  // Lookbehind/lookahead para evitar matchear partes de otros números.
  working = working.replace(/(?<!\d)\d{8}(?!\d)/g, (m) => getOrCreate('dni', m))

  // ── 4. Email ──────────────────────────────────────────────────────────────
  working = working.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    (m) => getOrCreate('email', m),
  )

  // ── 5. Teléfono peruano ───────────────────────────────────────────────────
  // Formatos: "+51 999 888 777", "+51-999-888-777", "999 888 777", "999888777"
  // Prefijo +51 opcional. Móviles empiezan con 9.
  working = working.replace(
    /(?<!\d)(?:\+?51[\s-]?)?9\d{2}[\s-]?\d{3}[\s-]?\d{3}(?!\d)/g,
    (m) => getOrCreate('phone', m),
  )

  // ── 6. Nombres del worker (si se proveen) ────────────────────────────────
  if (opts.workerNames && opts.workerNames.length > 0) {
    // Filtra strings vacíos y partes muy cortas (1 letra) que generarían ruido.
    const names = opts.workerNames
      .filter((n) => typeof n === 'string' && n.trim().length >= 2)
      .map((n) => n.trim())

    // Match case-insensitive con boundaries unicode-aware.
    for (const name of names) {
      const escaped = escapeRegExp(name)
      const re = new RegExp(
        `(?<![A-Za-zÁÉÍÓÚáéíóúÑñ])${escaped}(?![A-Za-zÁÉÍÓÚáéíóúÑñ])`,
        'gi',
      )
      working = working.replace(re, (m) => getOrCreate('name', m))
    }
  }

  return {
    redacted: working,
    mapping,
    counts: { ...counters },
  }
}

/**
 * Restaura los placeholders en una respuesta del LLM al texto original.
 * Útil cuando queremos mostrar al admin la respuesta con los nombres reales
 * (porque el admin tiene derecho a verlos — solo el LLM externo no debería).
 */
export function unredact(text: string, mapping: Record<string, string>): string {
  let result = text
  // Ordenar por longitud descendente para evitar reemplazos parciales
  // (ej. [DNI_10] podría matchear [DNI_1]+0 si reemplazamos [DNI_1] primero).
  const placeholders = Object.keys(mapping).sort((a, b) => b.length - a.length)
  for (const ph of placeholders) {
    result = result.split(ph).join(mapping[ph])
  }
  return result
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
