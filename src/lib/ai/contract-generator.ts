/**
 * Contract Generator AI Engine
 *
 * Genera contratos personalizados a partir de una descripcion en lenguaje natural.
 * Devuelve clausulas estructuradas + texto formateado listo para descargar.
 *
 * Casos de uso:
 *  - "Necesito un contrato part-time de 4 horas para vendedor con comisiones"
 *  - "Locacion de servicios para diseñador grafico, S/3500/mes, 6 meses"
 *  - "Contrato MYPE con periodo de prueba 6 meses"
 */

import { callAI, extractJson, getModelName } from './provider'
import { getRelevantLegalContext } from './rag/retriever'

export type ContractKind =
  | 'LABORAL_INDEFINIDO'
  | 'LABORAL_PLAZO_FIJO'
  | 'LABORAL_PARTTIME'
  | 'LOCACION_SERVICIOS'
  | 'MYPE'
  | 'CONFIDENCIALIDAD'
  | 'PRACTICAS'
  | 'OTRO'

export interface ContractGenInput {
  /** Descripcion libre de lo que quiere el usuario */
  description: string
  /** Datos del empleador */
  empleadorRazonSocial?: string
  empleadorRuc?: string
  empleadorRepresentante?: string
  empleadorDireccion?: string
  /** Datos del trabajador */
  trabajadorNombre?: string
  trabajadorDni?: string
  /** Tipo y condiciones del contrato */
  modalidadContrato?: string   // INDEFINIDO | PLAZO_FIJO | PARTTIME | MYPE | LOCACION | PRACTICAS
  causaObjetiva?: string       // Solo para plazo fijo
  fechaInicio?: string
  fechaFin?: string            // Solo para contratos temporales
  periodoPruebaMeses?: number  // 3, 6 o 12
  /** Condiciones laborales */
  cargo?: string
  jornadaHoras?: number        // horas semanales (ej: 48, 24)
  horario?: string             // "08:00 - 17:00"
  remuneracion?: number
  formaPago?: string           // MENSUAL | QUINCENAL | SEMANAL
  beneficiosAdicionales?: string // texto libre: "movilidad S/150, bono por metas 5%..."
}

export interface ContractClause {
  numero: number
  titulo: string
  contenido: string
  obligatoria: boolean
  baseLegal?: string
}

export interface GeneratedContract {
  generadoPor: 'ai' | 'simulated'
  modelo: string
  generadoAt: string
  tipoDetectado: ContractKind
  tituloContrato: string
  resumen: string
  /** Parrafo introductorio (lugar, fecha, comparecientes) */
  preambulo: string
  clausulas: ContractClause[]
  /** Texto plano del contrato completo (clausulas concatenadas + cabecera + firma) */
  textoCompleto: string
  /** HTML con formato para preview/descarga */
  htmlCompleto: string
  advertenciasLegales: string[]
  baseLegalPrincipal: string
  /** Anexos sugeridos al contrato (politicas, reglamentos) */
  anexos: string[]
}

const SYSTEM_PROMPT = `Eres un abogado laboralista peruano senior con 20+ anos de experiencia, experto en redaccion de contratos que pasan auditoria SUNAFIL.
Tu trabajo es generar contratos peruanos COMPLETOS, LEGALMENTE BLINDADOS y listos para firmar.

REGLAS ESTRICTAS DE CALIDAD (nivel enterprise):
1. Devuelve SOLO un JSON valido (sin texto adicional, sin markdown, sin code fences).
2. Usa exclusivamente normativa peruana real y VIGENTE 2026:
   - D.Leg. 728 (LPCL) y D.S. 003-97-TR (TUO)
   - Ley 28015 y D.Leg. 1086 (MYPE)
   - Ley 28518 y D.S. 007-2005-TR (Modalidades Formativas)
   - Ley 29783 y D.S. 005-2012-TR (SST)
   - Ley 27942 y D.S. 014-2019-MIMP (Hostigamiento Sexual)
   - Ley 30709 y D.S. 002-2018-TR (Igualdad Salarial)
   - Ley 29733 y D.S. 003-2013-JUS (Proteccion Datos Personales)
   - Ley 31572 y D.S. 002-2023-TR (Teletrabajo)
   - Codigo Civil (para locacion de servicios)
   - Constitucion Politica del Peru Art. 22-29
3. Detecta el tipo de contrato mas adecuado segun la descripcion.
4. Las clausulas deben tener redaccion juridica formal, clara y protectora para ambas partes.
5. SIEMPRE incluye TODAS las clausulas obligatorias del tipo de contrato detectado.
6. Si faltan datos en la descripcion, usa placeholders entre llaves: {{nombre_dato}}.
7. Lista advertencias legales relevantes (riesgos, obligaciones, restricciones).
8. Cita articulo especifico en cada baseLegal (ej: "D.S. 003-97-TR Art. 10", no solo "LPCL").

TIPOS DE CONTRATO POSIBLES:
- LABORAL_INDEFINIDO: Plazo indeterminado, regimen general
- LABORAL_PLAZO_FIJO: Modalidad temporal con causa objetiva
- LABORAL_PARTTIME: Tiempo parcial (menos de 4h/dia)
- LOCACION_SERVICIOS: Independiente bajo Codigo Civil (NO laboral)
- MYPE: Regimen especial micro/pequena empresa
- CONFIDENCIALIDAD: NDA / acuerdo de no divulgacion
- PRACTICAS: Practicas pre-profesionales o profesionales
- OTRO: Cualquier otro caso

CLAUSULAS OBLIGATORIAS PARA CONTRATOS LABORALES (todas deben estar presentes):
1. DE LAS PARTES (identificacion completa empleador + trabajador con RUC/DNI/domicilios)
2. ANTECEDENTES (breve contexto de la contratacion, actividad economica del empleador)
3. OBJETO DEL CONTRATO (cargo, funciones, subordinacion)
4. PLAZO / MODALIDAD (indeterminado, o plazo fijo con causa objetiva especifica)
5. PERIODO DE PRUEBA (3 meses general / 6 meses calificados / 12 meses direccion)
6. JORNADA Y HORARIO (diaria, semanal, refrigerio)
7. REMUNERACION Y FORMA DE PAGO (bruta mensual, periodicidad, cuenta bancaria)
8. BENEFICIOS SOCIALES (CTS, gratificaciones, vacaciones, asignacion familiar, utilidades, aportes ESSALUD/AFP-ONP)
9. LUGAR DE TRABAJO (centro laboral, modalidad presencial/remota/hibrida)
10. OBLIGACIONES DEL TRABAJADOR (diligencia, lealtad, reglamento interno)
11. OBLIGACIONES DEL EMPLEADOR (pago oportuno, SST, capacitacion)
12. SEGURIDAD Y SALUD EN EL TRABAJO (Ley 29783: IPERC, EPP, capacitacion, examenes medicos)
13. PREVENCION DEL HOSTIGAMIENTO SEXUAL (Ley 27942: canal, sanciones, tolerancia cero)
14. CONFIDENCIALIDAD Y PROTECCION DE DATOS (Ley 29733: informacion reservada, datos personales)
15. PROPIEDAD INTELECTUAL (obras creadas en el marco del contrato - si aplica)
16. IGUALDAD SALARIAL Y NO DISCRIMINACION (Ley 30709: cuadros de categorias)
17. RESOLUCION DEL CONTRATO (causales despido justo, renuncia, mutuo acuerdo)
18. DOMICILIO, JURISDICCION Y LEY APLICABLE
19. DISPOSICIONES FINALES (integridad, modificaciones por escrito, separabilidad)

PARA MODALIDAD TELETRABAJO (si aplica) agregar ademas:
- Derecho a la desconexion digital (Ley 31572 Art. 11)
- Provision de equipos y reembolso de gastos (Art. 9)
- Control de jornada digital (Art. 4)

FORMATO DE SALIDA (JSON):
{
  "tipoDetectado": "LABORAL_INDEFINIDO" | "LABORAL_PLAZO_FIJO" | etc,
  "tituloContrato": "string (ej: CONTRATO DE TRABAJO A PLAZO INDETERMINADO)",
  "resumen": "string (1-2 oraciones describiendo el contrato)",
  "preambulo": "string (parrafo introductorio: 'Conste por el presente documento...' con lugar y fecha)",
  "clausulas": [
    {
      "numero": 1,
      "titulo": "string (nombre clausula: DE LAS PARTES, OBJETO, etc)",
      "contenido": "string (texto juridico completo, 3-8 oraciones, formal pero claro)",
      "obligatoria": true | false,
      "baseLegal": "string con articulo especifico"
    }
  ],
  "advertenciasLegales": ["string", "string"],
  "baseLegalPrincipal": "string (ej: D.Leg. 728, D.S. 003-97-TR, Ley 29783, Ley 27942)",
  "anexos": ["Politica de Seguridad y Salud", "Politica Anti-hostigamiento", ...]
}

Genera entre 14 y 19 clausulas para contratos laborales. 8-12 para locacion/NDA. Calidad y completitud son obligatorias, no opcionales. El contrato debe resistir una inspeccion SUNAFIL.`

function buildUserPrompt(input: ContractGenInput): string {
  const datos: string[] = []
  // Empleador
  if (input.empleadorRazonSocial) datos.push(`Empleador: ${input.empleadorRazonSocial}`)
  if (input.empleadorRuc) datos.push(`RUC: ${input.empleadorRuc}`)
  if (input.empleadorRepresentante) datos.push(`Representante legal: ${input.empleadorRepresentante}`)
  if (input.empleadorDireccion) datos.push(`Direccion empleador: ${input.empleadorDireccion}`)
  // Trabajador
  if (input.trabajadorNombre) datos.push(`Trabajador/Locador: ${input.trabajadorNombre}`)
  if (input.trabajadorDni) datos.push(`DNI trabajador: ${input.trabajadorDni}`)
  // Tipo contrato
  if (input.modalidadContrato) datos.push(`Modalidad: ${input.modalidadContrato}`)
  if (input.causaObjetiva) datos.push(`Causa objetiva (plazo fijo): ${input.causaObjetiva}`)
  if (input.fechaInicio) datos.push(`Fecha inicio: ${input.fechaInicio}`)
  if (input.fechaFin) datos.push(`Fecha fin: ${input.fechaFin}`)
  if (input.periodoPruebaMeses) datos.push(`Periodo de prueba: ${input.periodoPruebaMeses} meses`)
  // Condiciones
  if (input.cargo) datos.push(`Cargo/Servicio: ${input.cargo}`)
  if (input.jornadaHoras) datos.push(`Jornada: ${input.jornadaHoras} horas semanales`)
  if (input.horario) datos.push(`Horario: ${input.horario}`)
  if (input.remuneracion) datos.push(`Remuneracion: S/ ${input.remuneracion.toLocaleString('es-PE')}`)
  if (input.formaPago) datos.push(`Forma de pago: ${input.formaPago}`)
  if (input.beneficiosAdicionales) datos.push(`Beneficios adicionales: ${input.beneficiosAdicionales}`)

  return `Descripcion del contrato solicitado:
${input.description}

${datos.length > 0 ? `Datos pre-llenados:\n${datos.map(d => `  - ${d}`).join('\n')}\n` : ''}
Genera el contrato segun la descripcion. Si la descripcion no especifica un dato, usa placeholders {{nombre_dato}}.
Devuelve SOLO el JSON especificado.`
}

interface RawAIResponse {
  tipoDetectado?: string
  tituloContrato?: string
  resumen?: string
  preambulo?: string
  clausulas?: Partial<ContractClause>[]
  advertenciasLegales?: string[]
  baseLegalPrincipal?: string
  anexos?: string[]
}

const VALID_KINDS: ContractKind[] = [
  'LABORAL_INDEFINIDO', 'LABORAL_PLAZO_FIJO', 'LABORAL_PARTTIME',
  'LOCACION_SERVICIOS', 'MYPE', 'CONFIDENCIALIDAD', 'PRACTICAS', 'OTRO',
]

/**
 * Convierte la respuesta del LLM en un GeneratedContract listo para usar.
 */
export async function generateContract(input: ContractGenInput): Promise<GeneratedContract> {
  const generadoAt = new Date().toISOString()

  try {
    // Recuperar normativa relevante via RAG
    const ragContext = getRelevantLegalContext(
      `${input.description} ${input.modalidadContrato ?? ''} ${input.cargo ?? ''}`,
      5
    )
    const systemWithRag = SYSTEM_PROMPT + ragContext

    const content = await callAI(
      [
        { role: 'system', content: systemWithRag },
        { role: 'user', content: buildUserPrompt(input) },
      ],
      { temperature: 0.2, maxTokens: 4500, jsonMode: true, feature: 'contract-gen' }
    )

    const parsed = extractJson<RawAIResponse>(content)

    if (!parsed.clausulas || !Array.isArray(parsed.clausulas) || parsed.clausulas.length === 0) {
      throw new Error('Respuesta del LLM sin clausulas')
    }

    const tipoDetectado: ContractKind = VALID_KINDS.includes(parsed.tipoDetectado as ContractKind)
      ? (parsed.tipoDetectado as ContractKind)
      : 'OTRO'

    const clausulas: ContractClause[] = parsed.clausulas.slice(0, 22).map((c, idx) => ({
      numero: Number(c.numero) || idx + 1,
      titulo: String(c.titulo || `Clausula ${idx + 1}`),
      contenido: String(c.contenido || '').trim(),
      obligatoria: Boolean(c.obligatoria),
      baseLegal: c.baseLegal ? String(c.baseLegal) : undefined,
    })).filter(c => c.contenido.length > 0)

    const tituloContrato = parsed.tituloContrato || 'CONTRATO'
    const resumen = parsed.resumen || 'Contrato generado por IA segun normativa peruana.'
    const preambulo =
      parsed.preambulo ||
      `Conste por el presente documento el contrato que celebran las partes que a continuacion se identifican, suscrito en la ciudad de Lima, el {{fecha_firma}}, al amparo de la legislacion laboral peruana vigente.`
    const advertenciasLegales = Array.isArray(parsed.advertenciasLegales)
      ? parsed.advertenciasLegales.map(a => String(a)).slice(0, 8)
      : []
    const baseLegalPrincipal = parsed.baseLegalPrincipal || 'D.Leg. 728, D.S. 003-97-TR'
    const anexos = Array.isArray(parsed.anexos)
      ? parsed.anexos.map(a => String(a)).slice(0, 10)
      : buildDefaultAnexos(tipoDetectado)

    return {
      generadoPor: 'ai',
      modelo: getModelName({ feature: 'contract-gen' }),
      generadoAt,
      tipoDetectado,
      tituloContrato,
      resumen,
      preambulo,
      clausulas,
      textoCompleto: buildPlainText(tituloContrato, preambulo, clausulas, anexos),
      htmlCompleto: buildHtml(tituloContrato, preambulo, clausulas, anexos, input),
      advertenciasLegales,
      baseLegalPrincipal,
      anexos,
    }
  } catch (error) {
    console.warn('[contract-generator] AI fallo, usando contrato simulado:', error)
    return generateSimulatedContract(input, generadoAt)
  }
}

function buildDefaultAnexos(tipo: ContractKind): string[] {
  const base = [
    'Anexo I — Reglamento Interno de Trabajo',
    'Anexo II — Politica de Seguridad y Salud en el Trabajo (Ley 29783)',
    'Anexo III — Politica de Prevencion del Hostigamiento Sexual (Ley 27942)',
    'Anexo IV — Politica de Proteccion de Datos Personales (Ley 29733)',
    'Anexo V — Cuadro de Categorias y Funciones (Ley 30709)',
  ]
  if (tipo === 'LOCACION_SERVICIOS' || tipo === 'CONFIDENCIALIDAD') {
    return ['Anexo I — Alcance del servicio y entregables', 'Anexo II — Acuerdo de Confidencialidad']
  }
  if (tipo === 'PRACTICAS') {
    return [
      'Anexo I — Plan de Aprendizaje (Ley 28518)',
      'Anexo II — Politica SST aplicable a practicantes',
    ]
  }
  return base
}

const ORDINALES = [
  'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA',
  'SEPTIMA', 'OCTAVA', 'NOVENA', 'DECIMA', 'UNDECIMA', 'DUODECIMA',
  'DECIMO TERCERA', 'DECIMO CUARTA', 'DECIMO QUINTA', 'DECIMO SEXTA',
  'DECIMO SEPTIMA', 'DECIMO OCTAVA', 'DECIMO NOVENA', 'VIGESIMA',
  'VIGESIMO PRIMERA', 'VIGESIMO SEGUNDA',
]

/**
 * Construye el texto plano del contrato completo.
 */
function buildPlainText(
  titulo: string,
  preambulo: string,
  clausulas: ContractClause[],
  anexos: string[]
): string {
  const lines: string[] = []
  lines.push(titulo.toUpperCase())
  lines.push('='.repeat(Math.min(80, titulo.length)))
  lines.push('')
  lines.push(preambulo)
  lines.push('')

  clausulas.forEach((c, idx) => {
    const ordinal = ORDINALES[idx] || `CLAUSULA ${idx + 1}`
    lines.push(`${ordinal}.- ${c.titulo.toUpperCase()}`)
    lines.push(c.contenido)
    if (c.baseLegal) {
      lines.push(`(Base legal: ${c.baseLegal})`)
    }
    lines.push('')
  })

  lines.push('')
  lines.push(
    'En senal de conformidad y aceptando cada una de las clausulas que anteceden, las partes suscriben el presente contrato en dos (02) ejemplares de igual tenor y valor legal, uno para cada parte.'
  )
  lines.push('')
  lines.push('Lima, {{fecha_firma}}')
  lines.push('')
  lines.push('')
  lines.push('_______________________________            _______________________________')
  lines.push('        EL EMPLEADOR                               EL TRABAJADOR')
  lines.push('{{empleador_razon_social}}                  {{trabajador_nombre}}')
  lines.push('RUC {{empleador_ruc}}                       DNI {{trabajador_dni}}')

  if (anexos.length > 0) {
    lines.push('')
    lines.push('')
    lines.push('ANEXOS QUE FORMAN PARTE INTEGRANTE DEL CONTRATO:')
    lines.push('')
    anexos.forEach(a => lines.push(`  - ${a}`))
  }

  return lines.join('\n')
}

/**
 * Construye el HTML del contrato para preview / descarga DOCX.
 * Estilo formal tipo "documento legal" con header, preambulo, clausulas
 * numeradas, firmas identificadas y seccion de anexos.
 */
function buildHtml(
  titulo: string,
  preambulo: string,
  clausulas: ContractClause[],
  anexos: string[],
  input?: ContractGenInput
): string {
  const clausulasHtml = clausulas
    .map((c, idx) => {
      const ordinal = ORDINALES[idx] || `CLAUSULA ${idx + 1}`
      const baseLegal = c.baseLegal
        ? `<p style="font-size:10px;color:#6b7280;font-style:italic;margin-top:4px;border-left:2px solid #d1d5db;padding-left:6px;">Base legal: ${c.baseLegal}</p>`
        : ''
      const obligatoriaBadge = c.obligatoria
        ? ' <span style="font-size:9px;color:#b91c1c;font-weight:600;">(clausula obligatoria)</span>'
        : ''
      return `
      <div style="margin-bottom:20px;page-break-inside:avoid;">
        <h3 style="font-size:13px;font-weight:bold;color:#1e293b;margin-bottom:8px;text-transform:uppercase;">
          ${ordinal}.- ${c.titulo.toUpperCase()}${obligatoriaBadge}
        </h3>
        <p style="font-size:12px;line-height:1.75;color:#1f2937;text-align:justify;">${c.contenido}</p>
        ${baseLegal}
      </div>`
    })
    .join('\n')

  const empleador = input?.empleadorRazonSocial || '{{empleador_razon_social}}'
  const empleadorRuc = input?.empleadorRuc || '{{empleador_ruc}}'
  const trabajador = input?.trabajadorNombre || '{{trabajador_nombre}}'
  const trabajadorDni = input?.trabajadorDni || '{{trabajador_dni}}'

  const anexosHtml =
    anexos.length > 0
      ? `
<div style="margin-top:40px;padding-top:16px;border-top:2px solid #1e293b;page-break-inside:avoid;">
  <h3 style="font-size:12px;font-weight:bold;color:#1e293b;margin-bottom:10px;text-transform:uppercase;">
    Anexos que forman parte integrante del contrato
  </h3>
  <ul style="font-size:11px;color:#374151;line-height:1.6;padding-left:20px;">
    ${anexos.map(a => `<li style="margin-bottom:4px;">${a}</li>`).join('\n    ')}
  </ul>
</div>`
      : ''

  return `
<div style="font-family:Georgia,'Times New Roman',serif;max-width:780px;margin:0 auto;padding:32px;color:#1f2937;">
  <div style="text-align:center;margin-bottom:28px;padding-bottom:14px;border-bottom:3px double #1e293b;">
    <h1 style="font-size:18px;font-weight:bold;letter-spacing:1px;margin:0;">${titulo.toUpperCase()}</h1>
    <p style="font-size:10px;color:#64748b;margin:6px 0 0 0;font-style:italic;">Documento legal conforme a la normativa laboral peruana vigente</p>
  </div>

  <p style="font-size:12px;line-height:1.75;text-align:justify;margin-bottom:24px;">
    ${preambulo}
  </p>

  ${clausulasHtml}

  <p style="font-size:12px;line-height:1.75;margin-top:28px;text-align:justify;">
    En senal de conformidad y aceptando cada una de las clausulas que anteceden,
    las partes suscriben el presente contrato en dos (02) ejemplares de igual tenor y
    valor legal, uno para cada parte.
  </p>

  <p style="font-size:12px;margin-top:20px;">Lima, {{fecha_firma}}</p>

  <table style="width:100%;margin-top:60px;border-collapse:collapse;">
    <tr>
      <td style="text-align:center;border-top:1px solid #1e293b;padding-top:8px;width:45%;">
        <strong style="font-size:12px;display:block;">EL EMPLEADOR</strong>
        <span style="font-size:11px;display:block;margin-top:3px;">${empleador}</span>
        <span style="font-size:10px;color:#6b7280;display:block;">RUC ${empleadorRuc}</span>
      </td>
      <td style="width:10%;"></td>
      <td style="text-align:center;border-top:1px solid #1e293b;padding-top:8px;width:45%;">
        <strong style="font-size:12px;display:block;">EL TRABAJADOR</strong>
        <span style="font-size:11px;display:block;margin-top:3px;">${trabajador}</span>
        <span style="font-size:10px;color:#6b7280;display:block;">DNI ${trabajadorDni}</span>
      </td>
    </tr>
  </table>

  ${anexosHtml}

  <p style="font-size:9px;color:#94a3b8;text-align:center;margin-top:40px;border-top:1px solid #e5e7eb;padding-top:8px;">
    Generado por COMPLY360 — Plataforma de compliance laboral peruano
  </p>
</div>`.trim()
}

/**
 * Plan simulado — fallback cuando la IA no responde.
 * Genera un contrato COMPLETO con 17-19 clausulas obligatorias de la
 * legislacion laboral peruana, respaldando cada una con base legal.
 */
function generateSimulatedContract(input: ContractGenInput, generadoAt: string): GeneratedContract {
  const desc = input.description.toLowerCase()
  let tipo: ContractKind = 'LABORAL_INDEFINIDO'
  if (desc.includes('locacion') || desc.includes('servicios independiente')) tipo = 'LOCACION_SERVICIOS'
  else if (desc.includes('plazo fijo') || desc.includes('temporal')) tipo = 'LABORAL_PLAZO_FIJO'
  else if (desc.includes('part time') || desc.includes('part-time') || desc.includes('parcial')) tipo = 'LABORAL_PARTTIME'
  else if (desc.includes('confidencialidad') || desc.includes('nda')) tipo = 'CONFIDENCIALIDAD'
  else if (desc.includes('mype')) tipo = 'MYPE'
  else if (desc.includes('practica')) tipo = 'PRACTICAS'

  const TITULOS: Record<ContractKind, string> = {
    LABORAL_INDEFINIDO: 'CONTRATO DE TRABAJO A PLAZO INDETERMINADO',
    LABORAL_PLAZO_FIJO: 'CONTRATO DE TRABAJO SUJETO A MODALIDAD',
    LABORAL_PARTTIME: 'CONTRATO DE TRABAJO A TIEMPO PARCIAL',
    LOCACION_SERVICIOS: 'CONTRATO DE LOCACION DE SERVICIOS',
    MYPE: 'CONTRATO DE TRABAJO BAJO REGIMEN MYPE',
    CONFIDENCIALIDAD: 'ACUERDO DE CONFIDENCIALIDAD',
    PRACTICAS: 'CONVENIO DE PRACTICAS PRE-PROFESIONALES',
    OTRO: 'CONTRATO',
  }

  const empleador = input.empleadorRazonSocial || '{{empleador_razon_social}}'
  const ruc = input.empleadorRuc || '{{empleador_ruc}}'
  const representante = input.empleadorRepresentante || '{{representante_legal}}'
  const direccionEmp = input.empleadorDireccion || '{{direccion_empleador}}'
  const trabajador = input.trabajadorNombre || '{{trabajador_nombre}}'
  const trabajadorDni = input.trabajadorDni || '{{trabajador_dni}}'
  const cargo = input.cargo || '{{cargo}}'
  const remuneracion = input.remuneracion ? `S/ ${input.remuneracion.toLocaleString('es-PE')}` : '{{remuneracion}}'
  const fechaInicio = input.fechaInicio || '{{fecha_inicio}}'
  const horario = input.horario || '{{horario}} (08:00 a 17:00 con 1h refrigerio)'
  const jornadaHoras = input.jornadaHoras || (tipo === 'LABORAL_PARTTIME' ? 24 : 48)
  const formaPago = input.formaPago || 'MENSUAL'
  const periodoPrueba = input.periodoPruebaMeses || 3
  const causaObjetiva = input.causaObjetiva || '{{causa_objetiva}}'

  // Locacion de servicios: simplificado
  if (tipo === 'LOCACION_SERVICIOS') {
    const clausulasLoc: ContractClause[] = [
      {
        numero: 1,
        titulo: 'De las Partes',
        contenido: `Conste por el presente documento el contrato de locacion de servicios que celebran, de una parte ${empleador}, con RUC ${ruc}, representada por ${representante}, a quien se denominara EL COMITENTE; y de la otra parte, ${trabajador}, identificado con DNI ${trabajadorDni}, a quien se denominara EL LOCADOR.`,
        obligatoria: true,
        baseLegal: 'Codigo Civil Art. 1764',
      },
      {
        numero: 2,
        titulo: 'Naturaleza Civil del Contrato',
        contenido: 'Las partes declaran expresamente que el presente contrato se rige por el Codigo Civil y no constituye una relacion laboral. EL LOCADOR prestara sus servicios en forma independiente, sin subordinacion, con autonomia tecnica y bajo su propia organizacion.',
        obligatoria: true,
        baseLegal: 'Codigo Civil Art. 1764 y 1765',
      },
      {
        numero: 3,
        titulo: 'Objeto y Alcance',
        contenido: `EL LOCADOR prestara los siguientes servicios: ${cargo}. Los entregables, plazos y especificaciones se detallan en el Anexo I que forma parte integrante del presente contrato.`,
        obligatoria: true,
      },
      {
        numero: 4,
        titulo: 'Plazo',
        contenido: `El presente contrato tendra vigencia desde el ${fechaInicio} hasta ${input.fechaFin || '{{fecha_fin}}'}. Podra ser renovado previo acuerdo escrito de las partes.`,
        obligatoria: true,
      },
      {
        numero: 5,
        titulo: 'Contraprestacion y Forma de Pago',
        contenido: `EL COMITENTE pagara a EL LOCADOR la suma de ${remuneracion} contra entrega del recibo por honorarios electronico (RH). El pago se efectuara en forma ${formaPago.toLowerCase()} dentro de los 10 dias habiles siguientes a la presentacion del recibo.`,
        obligatoria: true,
        baseLegal: 'Codigo Civil Art. 1764',
      },
      {
        numero: 6,
        titulo: 'Obligaciones del Locador',
        contenido: 'EL LOCADOR se obliga a: (i) prestar los servicios con la diligencia profesional que corresponde, (ii) cumplir los plazos pactados, (iii) asumir sus propias cargas tributarias y previsionales, (iv) no subcontratar sin autorizacion previa y escrita de EL COMITENTE.',
        obligatoria: true,
      },
      {
        numero: 7,
        titulo: 'Confidencialidad',
        contenido: 'EL LOCADOR se compromete a mantener estricta reserva sobre toda informacion confidencial que conozca con ocasion de la ejecucion del presente contrato, obligacion que subsiste por cinco (5) anos posteriores a la terminacion del contrato.',
        obligatoria: false,
        baseLegal: 'Ley 29733',
      },
      {
        numero: 8,
        titulo: 'Resolucion',
        contenido: 'Cualquiera de las partes podra resolver el contrato con aviso previo de quince (15) dias calendario, sin lugar a indemnizacion alguna. El incumplimiento grave faculta a la resolucion inmediata.',
        obligatoria: true,
        baseLegal: 'Codigo Civil Art. 1371',
      },
      {
        numero: 9,
        titulo: 'Ley Aplicable y Jurisdiccion',
        contenido: 'El presente contrato se rige por la legislacion peruana. Cualquier controversia sera resuelta ante los Juzgados Civiles de la ciudad de Lima.',
        obligatoria: true,
      },
    ]
    const tituloLoc = TITULOS[tipo]
    const preambuloLoc = `Conste por el presente documento el contrato de locacion de servicios que celebran las partes que a continuacion se identifican, en la ciudad de Lima, el {{fecha_firma}}, al amparo del Codigo Civil peruano vigente.`
    const anexosLoc = buildDefaultAnexos(tipo)
    return {
      generadoPor: 'simulated',
      modelo: 'simulated',
      generadoAt,
      tipoDetectado: tipo,
      tituloContrato: tituloLoc,
      resumen: 'Contrato de locacion de servicios (civil, no laboral) conforme al Codigo Civil peruano.',
      preambulo: preambuloLoc,
      clausulas: clausulasLoc,
      textoCompleto: buildPlainText(tituloLoc, preambuloLoc, clausulasLoc, anexosLoc),
      htmlCompleto: buildHtml(tituloLoc, preambuloLoc, clausulasLoc, anexosLoc, input),
      advertenciasLegales: [
        'Este contrato es CIVIL y NO laboral. La subordinacion lo convertiria en relacion laboral (desnaturalizacion).',
        'El locador debe emitir Recibo por Honorarios Electronico (RH) por cada pago.',
        'Verificar retencion del 8% de Impuesto a la Renta si corresponde.',
        'No incluye beneficios laborales (CTS, vacaciones, gratificaciones).',
      ],
      baseLegalPrincipal: 'Codigo Civil Art. 1764',
      anexos: anexosLoc,
    }
  }

  // CONTRATOS LABORALES COMPLETOS (Indefinido, plazo fijo, parttime, MYPE)
  const esPartTime = tipo === 'LABORAL_PARTTIME'
  const clausulas: ContractClause[] = [
    {
      numero: 1,
      titulo: 'De las Partes',
      contenido: `Conste por el presente documento el contrato de trabajo que celebran de una parte ${empleador}, con RUC ${ruc}, con domicilio fiscal en ${direccionEmp}, debidamente representada por ${representante}, a quien en adelante se denominara EL EMPLEADOR; y de la otra parte, ${trabajador}, identificado con DNI ${trabajadorDni}, con domicilio en {{trabajador_direccion}}, a quien en adelante se denominara EL TRABAJADOR.`,
      obligatoria: true,
      baseLegal: 'D.S. 003-97-TR Art. 4',
    },
    {
      numero: 2,
      titulo: 'Antecedentes',
      contenido: `EL EMPLEADOR se dedica a la actividad economica de {{actividad_economica}} y requiere contratar personal calificado para ocupar el cargo de ${cargo}. EL TRABAJADOR declara reunir los requisitos tecnicos y profesionales necesarios, acepta las condiciones del presente contrato y declara no encontrarse impedido legalmente para suscribirlo.`,
      obligatoria: false,
    },
    {
      numero: 3,
      titulo: 'Objeto del Contrato',
      contenido: `EL EMPLEADOR contrata los servicios personales, subordinados y remunerados de EL TRABAJADOR para que se desempene como ${cargo}, debiendo cumplir las funciones inherentes al cargo conforme al Manual de Organizacion y Funciones y las directivas que reciba de sus superiores jerarquicos.`,
      obligatoria: true,
      baseLegal: 'D.S. 003-97-TR Art. 4',
    },
    {
      numero: 4,
      titulo: tipo === 'LABORAL_PLAZO_FIJO' ? 'Modalidad y Causa Objetiva' : 'Plazo del Contrato',
      contenido:
        tipo === 'LABORAL_INDEFINIDO' || tipo === 'MYPE'
          ? `El presente contrato es de duracion INDETERMINADA y entra en vigencia a partir del ${fechaInicio}. No tiene fecha de vencimiento y solo podra resolverse por las causales previstas en la ley.`
          : tipo === 'LABORAL_PLAZO_FIJO'
            ? `El presente contrato es sujeto a modalidad, con vigencia desde el ${fechaInicio} hasta el ${input.fechaFin || '{{fecha_fin}}'}. La causa objetiva que justifica la contratacion temporal es: ${causaObjetiva}. El plazo maximo acumulado de esta modalidad no podra exceder de cinco (05) anos conforme al Art. 74 de la LPCL.`
            : `El presente contrato es a tiempo parcial y de duracion indeterminada, entrando en vigencia a partir del ${fechaInicio}.`,
      obligatoria: true,
      baseLegal:
        tipo === 'LABORAL_PLAZO_FIJO'
          ? 'D.S. 003-97-TR Art. 53, 54 y 72-74'
          : 'D.S. 003-97-TR Art. 4',
    },
    {
      numero: 5,
      titulo: 'Periodo de Prueba',
      contenido: `EL TRABAJADOR estara sujeto a un periodo de prueba de ${periodoPrueba} ${periodoPrueba === 1 ? 'mes' : 'meses'} contados desde la fecha de inicio del presente contrato. Durante este periodo, EL EMPLEADOR podra resolver el contrato sin expresion de causa y sin derecho a indemnizacion. Superado el periodo de prueba, EL TRABAJADOR adquiere el derecho a la proteccion contra el despido arbitrario.`,
      obligatoria: true,
      baseLegal: 'D.S. 003-97-TR Art. 10',
    },
    {
      numero: 6,
      titulo: 'Jornada y Horario de Trabajo',
      contenido: esPartTime
        ? `EL TRABAJADOR cumplira una jornada a tiempo parcial de hasta ${jornadaHoras} horas semanales (menos de 4 horas diarias en promedio), en el horario ${horario}. Esta modalidad no otorga derecho a CTS ni vacaciones conforme a la legislacion vigente.`
        : `La jornada ordinaria de trabajo sera de ocho (08) horas diarias o cuarenta y ocho (48) horas semanales como maximo, en el horario: ${horario}. El tiempo de refrigerio es de cuarenta y cinco (45) minutos como minimo y no forma parte de la jornada. EL EMPLEADOR podra modificar el horario conforme al Art. 6 del D.S. 007-2002-TR.`,
      obligatoria: true,
      baseLegal: 'D.S. 007-2002-TR Art. 1, 6 y 7',
    },
    {
      numero: 7,
      titulo: 'Remuneracion y Forma de Pago',
      contenido: `EL EMPLEADOR pagara a EL TRABAJADOR una remuneracion mensual bruta de ${remuneracion}, monto sobre el cual se aplicaran los descuentos y aportes de ley (ONP/AFP, ESSALUD, Impuesto a la Renta de 5ta categoria cuando corresponda). El pago se efectuara en forma ${formaPago.toLowerCase()} mediante deposito en cuenta bancaria a nombre de EL TRABAJADOR, dentro de los cinco (05) dias habiles posteriores al cierre del periodo laborado.`,
      obligatoria: true,
      baseLegal: 'Constitucion Politica Art. 24; D.S. 001-97-TR Art. 1',
    },
    {
      numero: 8,
      titulo: 'Beneficios Sociales',
      contenido: esPartTime
        ? 'Por tratarse de un contrato a tiempo parcial con jornada inferior a cuatro (04) horas diarias en promedio, EL TRABAJADOR NO tiene derecho a Compensacion por Tiempo de Servicios (CTS) ni vacaciones anuales. Conserva el derecho a gratificaciones proporcionales, asignacion familiar (si corresponde) y cobertura de ESSALUD.'
        : tipo === 'MYPE'
          ? 'EL TRABAJADOR, bajo el regimen MYPE, tiene derecho a: (i) remuneracion no menor a la RMV, (ii) vacaciones de 15 dias al ano, (iii) gratificaciones equivalentes a media remuneracion en julio y diciembre (regimen pequena empresa), (iv) CTS equivalente a 15 remuneraciones diarias al ano (pequena empresa), (v) cobertura de salud a traves del SIS o ESSALUD, (vi) indemnizacion por despido arbitrario equivalente a 10 remuneraciones diarias por ano (pequena empresa).'
          : 'EL TRABAJADOR tendra derecho a todos los beneficios sociales que otorga la legislacion peruana del regimen general: (i) dos gratificaciones anuales equivalentes a una remuneracion mensual cada una (Ley 27735), (ii) Compensacion por Tiempo de Servicios equivalente a un 1/12 de remuneracion por mes trabajado (D.Leg. 650), (iii) vacaciones anuales de 30 dias calendario (D.Leg. 713), (iv) asignacion familiar del 10% de la RMV si tiene hijos menores (Ley 25129), (v) participacion en utilidades de la empresa cuando corresponda (D.Leg. 892), (vi) cobertura de ESSALUD (9% a cargo del empleador) y aportes al sistema pensionario (AFP u ONP) elegido por EL TRABAJADOR.',
      obligatoria: true,
      baseLegal: 'Ley 27735, D.Leg. 650, D.Leg. 713, Ley 25129, D.Leg. 892',
    },
    {
      numero: 9,
      titulo: 'Lugar y Modalidad de Trabajo',
      contenido: `EL TRABAJADOR prestara sus servicios en el centro de trabajo ubicado en ${direccionEmp} o en los lugares que EL EMPLEADOR indique segun las necesidades operativas. La modalidad de prestacion sera presencial, salvo pacto expreso de teletrabajo o modalidad hibrida bajo los terminos de la Ley 31572.`,
      obligatoria: true,
      baseLegal: 'D.S. 003-97-TR Art. 9',
    },
    {
      numero: 10,
      titulo: 'Obligaciones del Trabajador',
      contenido: 'EL TRABAJADOR se obliga a: (i) prestar el servicio en forma personal, diligente y con el mayor celo profesional, (ii) acatar las directivas e instrucciones legitimas de EL EMPLEADOR y sus superiores, (iii) cumplir estrictamente el Reglamento Interno de Trabajo, las politicas internas y las normas de seguridad y salud, (iv) guardar reserva sobre la informacion confidencial de EL EMPLEADOR y terceros, (v) cuidar los bienes, herramientas y equipos proporcionados, (vi) comunicar oportunamente cualquier situacion que pueda afectar al empleador o a sus companeros de trabajo.',
      obligatoria: true,
      baseLegal: 'D.S. 003-97-TR Art. 23, 25',
    },
    {
      numero: 11,
      titulo: 'Obligaciones del Empleador',
      contenido: 'EL EMPLEADOR se obliga a: (i) pagar oportunamente la remuneracion y beneficios sociales pactados, (ii) proporcionar un ambiente de trabajo seguro y saludable conforme a la Ley 29783, (iii) entregar boleta de pago con el detalle de conceptos, (iv) afiliar a EL TRABAJADOR a ESSALUD y al sistema pensionario elegido, (v) facilitar las herramientas, equipos y capacitaciones necesarias para el desempeno del cargo, (vi) respetar la dignidad, intimidad y derechos fundamentales de EL TRABAJADOR.',
      obligatoria: true,
      baseLegal: 'D.S. 003-97-TR Art. 24',
    },
    {
      numero: 12,
      titulo: 'Seguridad y Salud en el Trabajo',
      contenido: 'Ambas partes se obligan al cumplimiento estricto de la Ley 29783 (Ley de Seguridad y Salud en el Trabajo) y su Reglamento. EL EMPLEADOR proveera los Equipos de Proteccion Personal (EPP) necesarios, realizara exameres medicos ocupacionales de ingreso, periodicos y de cese, capacitara a EL TRABAJADOR minimo cuatro (04) veces al ano en materia SST, y mantendra actualizado el IPERC (Identificacion de Peligros, Evaluacion de Riesgos y Control). EL TRABAJADOR se obliga a utilizar los EPP, reportar incidentes y cumplir las normas de seguridad.',
      obligatoria: true,
      baseLegal: 'Ley 29783 y D.S. 005-2012-TR',
    },
    {
      numero: 13,
      titulo: 'Prevencion del Hostigamiento Sexual',
      contenido: 'EL EMPLEADOR declara su politica de tolerancia cero frente al hostigamiento sexual y cualquier forma de violencia en el centro de trabajo, conforme a la Ley 27942. EL TRABAJADOR tomara conocimiento del procedimiento interno de denuncia, el cual garantiza confidencialidad, celeridad e imparcialidad. Toda denuncia sera investigada y, de comprobarse, sancionada con las medidas que correspondan, incluyendo el despido.',
      obligatoria: true,
      baseLegal: 'Ley 27942 y D.S. 014-2019-MIMP',
    },
    {
      numero: 14,
      titulo: 'Confidencialidad y Proteccion de Datos Personales',
      contenido: 'EL TRABAJADOR se obliga a mantener estricta reserva sobre toda informacion confidencial, secretos comerciales, know-how, datos de clientes, informacion financiera y cualquier otro dato reservado de EL EMPLEADOR al que acceda con ocasion del contrato. Esta obligacion subsistira por cinco (05) anos posteriores a la terminacion del contrato. EL EMPLEADOR, por su parte, tratara los datos personales de EL TRABAJADOR conforme a la Ley 29733 de Proteccion de Datos Personales, con las finalidades laborales y legales pertinentes.',
      obligatoria: true,
      baseLegal: 'Ley 29733 y D.S. 003-2013-JUS',
    },
    {
      numero: 15,
      titulo: 'Propiedad Intelectual',
      contenido: 'Toda obra, invento, diseno, software, base de datos o creacion intelectual que EL TRABAJADOR desarrolle en el marco del presente contrato y dentro del horario laboral, pertenecera en exclusiva a EL EMPLEADOR, quien sera titular de todos los derechos patrimoniales de autor y/o de propiedad industrial, conforme al D.Leg. 822 y al D.Leg. 1075. EL TRABAJADOR conservara unicamente los derechos morales irrenunciables.',
      obligatoria: false,
      baseLegal: 'D.Leg. 822 Art. 16 y D.Leg. 1075',
    },
    {
      numero: 16,
      titulo: 'Igualdad Salarial y No Discriminacion',
      contenido: 'EL EMPLEADOR declara cumplir con la Ley 30709 y el D.S. 002-2018-TR en materia de igualdad salarial y no discriminacion. La remuneracion pactada se determina en funcion del cuadro de categorias y funciones vigente, sin distincion por genero, origen, religion, opinion o cualquier otra condicion. EL TRABAJADOR podra solicitar informacion sobre su categoria y los criterios objetivos de remuneracion.',
      obligatoria: false,
      baseLegal: 'Ley 30709 y D.S. 002-2018-TR',
    },
    {
      numero: 17,
      titulo: 'Resolucion del Contrato',
      contenido: 'El presente contrato podra resolverse por: (i) vencimiento del plazo cuando corresponda, (ii) mutuo acuerdo por escrito, (iii) renuncia voluntaria con 30 dias de anticipacion, (iv) despido por causa justa relacionada con la capacidad o conducta de EL TRABAJADOR conforme al D.S. 003-97-TR Art. 16, 22 y siguientes, (v) caso fortuito o fuerza mayor, (vi) las demas causales previstas en la ley. En caso de despido arbitrario, EL TRABAJADOR tendra derecho a la indemnizacion tasada conforme al Art. 38 del D.S. 003-97-TR.',
      obligatoria: true,
      baseLegal: 'D.S. 003-97-TR Art. 16, 22, 34 y 38',
    },
    {
      numero: 18,
      titulo: 'Domicilio, Jurisdiccion y Ley Aplicable',
      contenido: 'Para los efectos del presente contrato, las partes senalan como sus domicilios los indicados en la clausula primera, donde se remitiran validamente las comunicaciones entre ellas. Cualquier controversia derivada de la interpretacion o ejecucion del presente contrato sera sometida a la competencia de los Juzgados de Trabajo del distrito judicial correspondiente, renunciando expresamente a cualquier otro fuero. El contrato se rige por la legislacion laboral peruana.',
      obligatoria: true,
      baseLegal: 'Ley 29497 Nueva Ley Procesal del Trabajo',
    },
    {
      numero: 19,
      titulo: 'Disposiciones Finales',
      contenido: 'El presente contrato constituye el acuerdo integro entre las partes y deja sin efecto cualquier acuerdo verbal o escrito anterior sobre la misma materia. Toda modificacion debera constar por escrito y ser firmada por ambas partes. Si alguna clausula fuera declarada nula o invalida, las demas mantendran su vigencia. Las partes declaran haber leido, entendido y aceptado cada una de las clausulas del presente contrato.',
      obligatoria: false,
    },
  ]

  const titulo = TITULOS[tipo]
  const preambulo = `Conste por el presente documento el contrato de trabajo que celebran las partes que a continuacion se identifican, en la ciudad de Lima, el {{fecha_firma}}, al amparo del Decreto Legislativo N.° 728 - Ley de Productividad y Competitividad Laboral, su Texto Unico Ordenado aprobado por Decreto Supremo N.° 003-97-TR, y demas normas concordantes y complementarias de la legislacion laboral peruana vigente.`
  const anexos = buildDefaultAnexos(tipo)

  return {
    generadoPor: 'simulated',
    modelo: 'simulated',
    generadoAt,
    tipoDetectado: tipo,
    tituloContrato: titulo,
    resumen: `Contrato ${tipo.toLowerCase().replace(/_/g, ' ')} completo conforme a la normativa laboral peruana 2026. Incluye ${clausulas.length} clausulas con base legal, clausulas de SST (Ley 29783), hostigamiento sexual (Ley 27942), proteccion de datos (Ley 29733) e igualdad salarial (Ley 30709).`,
    preambulo,
    clausulas,
    textoCompleto: buildPlainText(titulo, preambulo, clausulas, anexos),
    htmlCompleto: buildHtml(titulo, preambulo, clausulas, anexos, input),
    advertenciasLegales: [
      'Revisar con un abogado antes de firmar y verificar que los placeholders {{...}} esten correctamente reemplazados.',
      tipo === 'LABORAL_PLAZO_FIJO'
        ? 'La causa objetiva debe ser real y verificable. SUNAFIL fiscaliza la desnaturalizacion de contratos temporales.'
        : 'Verificar que el regimen laboral aplicable coincida con la categoria de empresa (General, MYPE, etc.).',
      'Adjuntar los anexos obligatorios: Reglamento Interno de Trabajo, Politica SST, Politica Anti-hostigamiento y Politica de Datos Personales.',
      'Registrar al trabajador en la Planilla Electronica (T-REGISTRO) dentro del primer dia laborado.',
      'Afiliar al trabajador a ESSALUD y al sistema pensionario elegido (AFP u ONP) en los plazos legales.',
      esPartTime
        ? 'Los contratos a tiempo parcial deben ser registrados en SUNAFIL dentro del plazo legal para evitar su desnaturalizacion.'
        : 'Registrar el contrato en el sistema del MTPE cuando corresponda segun la modalidad.',
    ],
    baseLegalPrincipal: 'D.Leg. 728, D.S. 003-97-TR, Ley 29783, Ley 27942, Ley 29733, Ley 30709',
    anexos,
  }
}
