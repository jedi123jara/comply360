/**
 * Extraction Prompt — prompt centralizado y optimizado para extraer datos
 * de contratos laborales peruanos usando LLM con JSON mode.
 *
 * Reemplaza los prompts duplicados que estaban en:
 *  - extract-from-contract/route.ts
 *  - extract-batch-from-pdf/route.ts
 */

// ── Límite de texto para el contexto del LLM ────────────────────────────────
// DeepSeek V3 y Llama 3.3 70B soportan 128K+ tokens de contexto.
// 20K chars (~5K tokens) es suficiente para la mayoría de contratos peruanos
// y mucho mejor que los 8-10K anteriores que perdían datos clave.
const MAX_CONTRACT_CHARS = 20_000

/**
 * Prompt de sistema especializado para extracción de datos laborales peruanos.
 */
const SYSTEM_PROMPT = `Eres un especialista en derecho laboral peruano con 20 años de experiencia en RRHH.
Tu tarea es extraer datos estructurados de contratos laborales peruanos y devolver SOLO JSON válido.

TERMINOLOGÍA PERUANA — mapea estos términos del contrato a los campos JSON:
- "remuneración mensual" / "haber básico" / "sueldo base" / "retribución mensual" / "compensación mensual" → sueldoBruto
- "fecha de inicio" / "inicio de labores" / "fecha de incorporación" / "vigencia desde" → fechaIngreso
- "fecha de término" / "fecha de vencimiento" / "vigencia hasta" / "plazo de duración" → fechaFin
- "cargo" / "puesto" / "función" / "labor" → position
- "área" / "departamento" / "unidad orgánica" / "gerencia" → department
- "documento de identidad" / "D.N.I." / "DNI N°" → dni
- "asignación familiar" / "bonificación familiar" → asignacionFamiliar (boolean)
- "jornada de trabajo" / "horario" / "horas semanales" → jornadaSemanal

DETECCIÓN DE RÉGIMEN LABORAL:
- D.Leg. 728 / D.S. 003-97-TR / "régimen general" → GENERAL
- Ley 32353 / Ley 28015 / REMYPE / "microempresa" (≤10 trabajadores) → MYPE_MICRO
- Ley 32353 / "pequeña empresa" (≤100 trabajadores) → MYPE_PEQUENA
- D.Leg. 1057 / "CAS" / "contrato administrativo de servicios" → CAS
- Ley 28518 / "practicante" / "modalidad formativa" → MODALIDAD_FORMATIVA
- Ley 31110 / "agrario" / "actividad agraria" → AGRARIO
- "construcción civil" / "obrero de construcción" → CONSTRUCCION_CIVIL
- Ley 27986 / "trabajador del hogar" / "doméstico" → DOMESTICO

DETECCIÓN DE TIPO DE CONTRATO:
- "plazo indeterminado" / "indefinido" → INDEFINIDO
- "plazo fijo" / "plazo determinado" / "sujeto a modalidad" → PLAZO_FIJO
- "tiempo parcial" / "part time" / "< 4 horas" → TIEMPO_PARCIAL
- "prácticas pre-profesionales" → PRACTICAS_PREPROFESIONALES
- "prácticas profesionales" → PRACTICAS_PROFESIONALES
- "locación de servicios" / "locador" / "prestador de servicios" → LOCACION_SERVICIOS

FORMATO DE FECHAS:
Los contratos peruanos usan varios formatos. SIEMPRE devuelve YYYY-MM-DD:
- "1 de enero de 2024" → "2024-01-01"
- "01/01/2024" → "2024-01-01"
- "01-01-2024" → "2024-01-01"
- "01 ENE 2024" → "2024-01-01"

NOMBRES PERUANOS:
Los contratos suelen escribir "APELLIDO_PATERNO APELLIDO_MATERNO, NOMBRES" o "NOMBRES APELLIDO_PATERNO APELLIDO_MATERNO". Separa correctamente:
- "GARCÍA LÓPEZ, Juan Carlos" → firstName: "Juan Carlos", lastName: "García López"
- "Juan Carlos GARCÍA LÓPEZ" → firstName: "Juan Carlos", lastName: "García López"

REGLAS:
- Si no encuentras un campo, ponlo en null. NUNCA inventes datos.
- Sueldo: solo el número, sin "S/", sin puntos de miles. Si dice "S/ 1,500.00" → 1500
- DNI: exactamente 8 dígitos
- confidence: 0-100 según cuántos campos encontraste con certeza
- fieldsFound: array con los nombres de campos que SÍ encontraste en el texto
- warnings: notas sobre datos ambiguos o posibles errores

Responde SOLO con JSON válido, sin markdown, sin explicaciones.`

/**
 * Construye el prompt para extraer datos de UN solo contrato.
 */
export function buildExtractionPrompt(
  contractText: string,
  opts?: { index?: number; total?: number }
): string {
  const idx = opts?.index ?? 1
  const total = opts?.total ?? 1
  const truncated = contractText.slice(0, MAX_CONTRACT_CHARS)

  return `Analiza el siguiente contrato laboral peruano${total > 1 ? ` (contrato ${idx} de ${total})` : ''} y extrae los datos del TRABAJADOR.

TEXTO DEL CONTRATO:
---
${truncated}
---

Devuelve un JSON con esta estructura exacta:
{
  "dni": "12345678",
  "firstName": "Juan Carlos",
  "lastName": "García López",
  "email": null,
  "phone": null,
  "birthDate": null,
  "gender": null,
  "nationality": "peruana",
  "address": null,
  "position": "Analista Senior",
  "department": null,
  "regimenLaboral": "GENERAL",
  "tipoContrato": "PLAZO_FIJO",
  "fechaIngreso": "2024-01-15",
  "fechaFin": "2025-01-14",
  "sueldoBruto": 3500,
  "jornadaSemanal": 48,
  "asignacionFamiliar": false,
  "tipoAporte": null,
  "afpNombre": null,
  "confidence": 85,
  "fieldsFound": ["dni","firstName","lastName","position","fechaIngreso","sueldoBruto"],
  "warnings": []
}

Valores posibles:
- regimenLaboral: GENERAL | MYPE_MICRO | MYPE_PEQUENA | AGRARIO | CONSTRUCCION_CIVIL | DOMESTICO | CAS | MODALIDAD_FORMATIVA
- tipoContrato: INDEFINIDO | PLAZO_FIJO | TIEMPO_PARCIAL | PRACTICAS_PREPROFESIONALES | PRACTICAS_PROFESIONALES | LOCACION_SERVICIOS
- tipoAporte: AFP | ONP | SIN_APORTE

DEVUELVE SOLO EL JSON.`
}

/**
 * Construye un prompt para extraer datos de MÚLTIPLES contratos en una sola
 * llamada LLM. Reduce dramáticamente el tiempo al enviar 3-5 contratos juntos.
 */
export function buildBatchExtractionPrompt(
  contracts: Array<{ text: string; index: number }>,
  totalContracts: number
): string {
  const contractTexts = contracts
    .map(c => {
      const truncated = c.text.slice(0, MAX_CONTRACT_CHARS)
      return `=== CONTRATO ${c.index} DE ${totalContracts} ===\n${truncated}\n=== FIN CONTRATO ${c.index} ===`
    })
    .join('\n\n')

  return `Analiza los siguientes ${contracts.length} contratos laborales peruanos y extrae los datos del TRABAJADOR de CADA uno.

${contractTexts}

Devuelve un JSON ARRAY con exactamente ${contracts.length} objetos, uno por cada contrato, en el MISMO ORDEN.
Cada objeto debe tener esta estructura:
{
  "contractIndex": 1,
  "dni": "12345678",
  "firstName": "Juan Carlos",
  "lastName": "García López",
  "email": null,
  "phone": null,
  "birthDate": null,
  "gender": null,
  "nationality": "peruana",
  "address": null,
  "position": "Analista",
  "department": null,
  "regimenLaboral": "GENERAL",
  "tipoContrato": "PLAZO_FIJO",
  "fechaIngreso": "2024-01-15",
  "fechaFin": "2025-01-14",
  "sueldoBruto": 3500,
  "jornadaSemanal": 48,
  "asignacionFamiliar": false,
  "tipoAporte": null,
  "afpNombre": null,
  "confidence": 85,
  "fieldsFound": ["dni","firstName","lastName"],
  "warnings": []
}

Valores posibles:
- regimenLaboral: GENERAL | MYPE_MICRO | MYPE_PEQUENA | AGRARIO | CONSTRUCCION_CIVIL | DOMESTICO | CAS | MODALIDAD_FORMATIVA
- tipoContrato: INDEFINIDO | PLAZO_FIJO | TIEMPO_PARCIAL | PRACTICAS_PREPROFESIONALES | PRACTICAS_PROFESIONALES | LOCACION_SERVICIOS
- tipoAporte: AFP | ONP | SIN_APORTE

DEVUELVE SOLO el JSON ARRAY: [{...}, {...}, ...]. Sin markdown, sin explicaciones.`
}

export { SYSTEM_PROMPT, MAX_CONTRACT_CHARS }
