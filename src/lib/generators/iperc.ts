/**
 * Generador: Matriz IPERC (Identificación de Peligros, Evaluación de Riesgos y Controles)
 *
 * Base legal:
 *  - Ley 29783, Art. 57
 *  - D.S. 005-2012-TR, Art. 77
 *  - R.M. 050-2013-TR — Anexo 3 "Matriz IPER"
 *
 * Metodología:
 *  - Nivel de Riesgo (NR) = Probabilidad × Severidad
 *  - Probabilidad 1-5 (1=raro, 5=muy probable)
 *  - Severidad 1-5 (1=leve, 5=catastrófico)
 *  - Clasificación:
 *      NR ≤ 4  → TRIVIAL    → No requiere control
 *      NR 5-8  → TOLERABLE  → Seguimiento
 *      NR 9-12 → MODERADO   → Control en plazo definido
 *      NR 15-20 → IMPORTANTE → Control inmediato
 *      NR 25   → INTOLERABLE → Detener la actividad
 *  - Jerarquía de controles (Art. 21 D.S. 005-2012-TR):
 *      1. Eliminación del peligro
 *      2. Sustitución por algo menos peligroso
 *      3. Controles de ingeniería
 *      4. Controles administrativos (señalización, capacitación, procedimientos)
 *      5. EPP (último recurso)
 */
import type { GeneratedDocument, GeneratedSection, GeneratorOrgContext } from './types'

export type ScoreIperc = 1 | 2 | 3 | 4 | 5
export type NivelRiesgo = 'TRIVIAL' | 'TOLERABLE' | 'MODERADO' | 'IMPORTANTE' | 'INTOLERABLE'
export type JerarquiaControl =
  | 'eliminacion'
  | 'sustitucion'
  | 'ingenieria'
  | 'administrativo'
  | 'epp'

export interface Peligro {
  /** Área / Puesto al que aplica. */
  area: string
  /** Tarea o proceso específico. */
  tarea: string
  /** Descripción del peligro. */
  peligro: string
  /** Riesgo asociado (consecuencia potencial). */
  riesgo: string
  /** Probabilidad inicial (sin controles existentes). */
  probabilidadInicial: ScoreIperc
  /** Severidad estimada del daño. */
  severidad: ScoreIperc
  /** Controles ya implementados (descripción libre). */
  controlesExistentes?: string
  /** Probabilidad residual (con controles existentes). */
  probabilidadResidual?: ScoreIperc
  /** Controles propuestos (nuevos). */
  controlesPropuestos: Array<{
    jerarquia: JerarquiaControl
    descripcion: string
    responsable?: string
    plazoDias?: number
  }>
}

export interface IpercParams {
  /** Fecha de elaboración (ISO). */
  fechaElaboracion: string
  /** Responsable de la elaboración. */
  responsable: string
  /** Área/sector general de la empresa (ej. 'Construcción', 'Oficina administrativa'). */
  sectorGeneral: string
  /** Lista de peligros identificados (1 fila por peligro). */
  peligros: Peligro[]
  /** Próxima revisión (ISO, default +1 año). */
  proximaRevision?: string
}

/* ── Cálculo NR + clasificación ────────────────────────────────────── */

export function calcularNivelRiesgo(p: ScoreIperc, s: ScoreIperc): {
  nr: number
  nivel: NivelRiesgo
  accion: string
} {
  const nr = p * s
  let nivel: NivelRiesgo
  let accion: string
  if (nr <= 4) {
    nivel = 'TRIVIAL'
    accion = 'No requiere control específico. Monitorear.'
  } else if (nr <= 8) {
    nivel = 'TOLERABLE'
    accion = 'Aceptable con seguimiento. Mejoras no urgentes.'
  } else if (nr <= 12) {
    nivel = 'MODERADO'
    accion = 'Implementar control en plazo definido (30-60 días).'
  } else if (nr <= 20) {
    nivel = 'IMPORTANTE'
    accion = 'Control inmediato (7-15 días). Suspender actividad si no hay control provisional.'
  } else {
    nivel = 'INTOLERABLE'
    accion = 'DETENER LA ACTIVIDAD. No se reanuda hasta reducir el riesgo.'
  }
  return { nr, nivel, accion }
}

/* ── Biblioteca de peligros típicos por sector ─────────────────────── */

export interface PeligroBibliotecaItem {
  peligro: string
  riesgo: string
  severidadSugerida: ScoreIperc
}

export const BIBLIOTECA_PELIGROS: Record<string, PeligroBibliotecaItem[]> = {
  oficina: [
    { peligro: 'Postura prolongada sentada', riesgo: 'Trastornos musculoesqueléticos (cervicalgia, lumbalgia)', severidadSugerida: 2 },
    { peligro: 'Uso prolongado de pantalla (PC)', riesgo: 'Fatiga visual, síndrome ojo seco', severidadSugerida: 2 },
    { peligro: 'Iluminación inadecuada', riesgo: 'Fatiga visual, cefalea', severidadSugerida: 2 },
    { peligro: 'Cables eléctricos expuestos en pisos', riesgo: 'Tropiezos, caídas, shock eléctrico', severidadSugerida: 3 },
    { peligro: 'Estrés por cargas de trabajo', riesgo: 'Ansiedad, agotamiento profesional', severidadSugerida: 3 },
    { peligro: 'Trabajo con mobiliario en altura', riesgo: 'Caída de objetos, golpes', severidadSugerida: 3 },
  ],
  construccion: [
    { peligro: 'Trabajo en altura sin arnés', riesgo: 'Caída de altura con consecuencias graves', severidadSugerida: 5 },
    { peligro: 'Manipulación de cargas pesadas', riesgo: 'Lesiones lumbares, hernias', severidadSugerida: 4 },
    { peligro: 'Operación de maquinaria pesada', riesgo: 'Atropellos, golpes, aplastamiento', severidadSugerida: 5 },
    { peligro: 'Exposición a polvo de cemento/sílice', riesgo: 'Silicosis, problemas respiratorios', severidadSugerida: 4 },
    { peligro: 'Trabajos con electricidad', riesgo: 'Electrocución', severidadSugerida: 5 },
    { peligro: 'Exposición a ruido (>85 dB)', riesgo: 'Pérdida auditiva progresiva', severidadSugerida: 3 },
    { peligro: 'Caída de objetos desde niveles superiores', riesgo: 'Traumatismos craneales, fracturas', severidadSugerida: 5 },
    { peligro: 'Radiación solar directa prolongada', riesgo: 'Golpe de calor, cáncer de piel', severidadSugerida: 3 },
    { peligro: 'Zanjas y excavaciones sin entibado', riesgo: 'Sepultamiento', severidadSugerida: 5 },
  ],
  manufactura: [
    { peligro: 'Operación de máquinas con partes móviles', riesgo: 'Atrapamiento de miembros', severidadSugerida: 5 },
    { peligro: 'Manejo de herramientas cortantes', riesgo: 'Cortes, amputaciones', severidadSugerida: 4 },
    { peligro: 'Exposición a altas temperaturas (soldadura, hornos)', riesgo: 'Quemaduras, deshidratación', severidadSugerida: 4 },
    { peligro: 'Ruido continuo (>85 dB)', riesgo: 'Hipoacusia neurosensorial', severidadSugerida: 3 },
    { peligro: 'Manipulación de productos químicos', riesgo: 'Intoxicación, dermatitis, quemaduras', severidadSugerida: 4 },
    { peligro: 'Carga manual repetitiva', riesgo: 'Trastornos musculoesqueléticos', severidadSugerida: 3 },
    { peligro: 'Almacenamiento inadecuado (apilamiento)', riesgo: 'Caída de materiales, golpes', severidadSugerida: 3 },
  ],
  comercio: [
    { peligro: 'Atención al público con carga emocional', riesgo: 'Estrés, agresiones verbales', severidadSugerida: 2 },
    { peligro: 'Bipedestación prolongada', riesgo: 'Varices, dolor lumbar', severidadSugerida: 2 },
    { peligro: 'Manipulación de dinero', riesgo: 'Riesgo de asalto', severidadSugerida: 5 },
    { peligro: 'Carga y descarga de mercadería', riesgo: 'Lesiones musculoesqueléticas', severidadSugerida: 3 },
    { peligro: 'Pisos resbaladizos (derrames)', riesgo: 'Caídas al mismo nivel', severidadSugerida: 2 },
  ],
  salud: [
    { peligro: 'Exposición a agentes biológicos (sangre, secreciones)', riesgo: 'Hepatitis B/C, VIH, TB', severidadSugerida: 5 },
    { peligro: 'Pinchazo con aguja contaminada', riesgo: 'Infecciones transmitidas por sangre', severidadSugerida: 5 },
    { peligro: 'Turnos nocturnos prolongados', riesgo: 'Trastornos del sueño, fatiga crónica', severidadSugerida: 3 },
    { peligro: 'Manipulación de pacientes', riesgo: 'Lesiones lumbares', severidadSugerida: 3 },
    { peligro: 'Estrés emocional (fallecimientos, emergencias)', riesgo: 'Burnout, TEPT', severidadSugerida: 4 },
    { peligro: 'Exposición a químicos (desinfectantes, quimioterápicos)', riesgo: 'Intoxicación crónica, cáncer', severidadSugerida: 4 },
  ],
  transporte: [
    { peligro: 'Conducción prolongada', riesgo: 'Fatiga, accidentes de tránsito', severidadSugerida: 5 },
    { peligro: 'Accidentes de tránsito', riesgo: 'Politraumatismos, muerte', severidadSugerida: 5 },
    { peligro: 'Posturas forzadas al conducir', riesgo: 'Lumbalgia crónica', severidadSugerida: 3 },
    { peligro: 'Carga y descarga de mercadería', riesgo: 'Lesiones musculoesqueléticas', severidadSugerida: 3 },
    { peligro: 'Exposición a vibración corporal total', riesgo: 'Problemas vertebrales', severidadSugerida: 3 },
    { peligro: 'Asaltos en la ruta', riesgo: 'Agresión física, secuestro', severidadSugerida: 5 },
  ],
}

export function getSectoresDisponibles(): string[] {
  return Object.keys(BIBLIOTECA_PELIGROS)
}

/* ── Labels ────────────────────────────────────────────────────────── */

const JERARQUIA_LABEL: Record<JerarquiaControl, string> = {
  eliminacion: '1. Eliminación',
  sustitucion: '2. Sustitución',
  ingenieria: '3. Controles de ingeniería',
  administrativo: '4. Controles administrativos',
  epp: '5. EPP',
}

/* ── Generador ──────────────────────────────────────────────────────── */

export function generarIperc(params: IpercParams, org: GeneratorOrgContext): GeneratedDocument {
  if (params.peligros.length === 0) {
    throw new Error('La matriz IPERC requiere al menos 1 peligro identificado.')
  }

  const fechaLegible = formatFechaLegible(params.fechaElaboracion)
  const proximaRevision =
    params.proximaRevision ||
    formatFechaLegible(addYears(params.fechaElaboracion, 1))

  // Calcular NR inicial y residual por peligro
  const peligrosEvaluados = params.peligros.map((p, idx) => {
    const inicial = calcularNivelRiesgo(p.probabilidadInicial, p.severidad)
    const residual = p.probabilidadResidual
      ? calcularNivelRiesgo(p.probabilidadResidual, p.severidad)
      : inicial
    return { ...p, idx: idx + 1, inicial, residual }
  })

  // Stats
  const totalPeligros = peligrosEvaluados.length
  const byNivel: Record<NivelRiesgo, number> = {
    TRIVIAL: 0,
    TOLERABLE: 0,
    MODERADO: 0,
    IMPORTANTE: 0,
    INTOLERABLE: 0,
  }
  for (const p of peligrosEvaluados) byNivel[p.residual.nivel]++

  const sections: GeneratedSection[] = [
    {
      id: 'identificacion',
      numbering: 'I',
      title: 'Identificación del Documento',
      content: `**Empresa:** ${org.razonSocial}\n**RUC:** ${org.ruc}\n**Sector general:** ${params.sectorGeneral}\n**Responsable de elaboración:** ${params.responsable}\n**Fecha de elaboración:** ${fechaLegible}\n**Próxima revisión:** ${proximaRevision}\n\nLa Matriz IPERC debe revisarse **al menos anualmente** o cuando ocurra cualquiera de los siguientes eventos (Art. 77 D.S. 005-2012-TR):\n- Incorporación de nuevos procesos, equipos o sustancias\n- Cambios en la organización del trabajo\n- Ocurrencia de accidentes, incidentes o enfermedades ocupacionales\n- Hallazgos de inspecciones SUNAFIL\n- Cambios normativos relevantes`,
      baseLegal: 'Art. 57 Ley 29783 · Art. 77 D.S. 005-2012-TR',
    },
    {
      id: 'metodologia',
      numbering: 'II',
      title: 'Metodología',
      content: `**Fuente:** R.M. 050-2013-TR, Anexo 3 "Matriz IPER".\n\n**Fórmula del Nivel de Riesgo (NR):** Probabilidad × Severidad (ambos en escala 1-5).\n\n**Escala de Probabilidad (P):**\n- 1 = Raro (ocurre una vez cada varios años)\n- 2 = Improbable (ocurre una vez al año o menos)\n- 3 = Posible (ocurre varias veces al año)\n- 4 = Probable (ocurre una vez al mes)\n- 5 = Muy probable (ocurre diariamente o semanalmente)\n\n**Escala de Severidad (S):**\n- 1 = Leve (primeros auxilios, sin días perdidos)\n- 2 = Menor (incapacidad temporal <3 días)\n- 3 = Moderado (incapacidad temporal 3-30 días)\n- 4 = Grave (incapacidad permanente parcial)\n- 5 = Catastrófico (incapacidad permanente total o muerte)\n\n**Clasificación del NR:**\n- 1-4 TRIVIAL · 5-8 TOLERABLE · 9-12 MODERADO · 15-20 IMPORTANTE · 25 INTOLERABLE\n\n**Jerarquía de controles (Art. 21 D.S. 005-2012-TR):**\n${Object.values(JERARQUIA_LABEL).map((l) => `- ${l}`).join('\n')}`,
      baseLegal: 'R.M. 050-2013-TR · Art. 21 D.S. 005-2012-TR',
    },
    {
      id: 'resumen',
      numbering: 'III',
      title: 'Resumen Ejecutivo',
      content: `**Total de peligros identificados:** ${totalPeligros}\n\n**Distribución por nivel de riesgo residual (con controles existentes y propuestos):**\n- TRIVIAL: ${byNivel.TRIVIAL}\n- TOLERABLE: ${byNivel.TOLERABLE}\n- MODERADO: ${byNivel.MODERADO}\n- IMPORTANTE: ${byNivel.IMPORTANTE}\n- **INTOLERABLE: ${byNivel.INTOLERABLE}** ${byNivel.INTOLERABLE > 0 ? '← **requiere acción inmediata**' : ''}\n\n${
        byNivel.INTOLERABLE + byNivel.IMPORTANTE > 0
          ? `⚠ **${byNivel.INTOLERABLE + byNivel.IMPORTANTE} peligro(s) en nivel IMPORTANTE/INTOLERABLE** requieren implementación de controles urgentes según la jerarquía (eliminación → sustitución → ingeniería → administrativos → EPP).`
          : 'Todos los peligros han sido mitigados a niveles gestionables con los controles existentes o propuestos.'
      }`,
      baseLegal: 'Art. 57 Ley 29783',
    },
    {
      id: 'matriz',
      numbering: 'IV',
      title: 'Matriz IPERC — Peligros Identificados',
      content: peligrosEvaluados
        .map((p) => buildPeligroBlock(p))
        .join('\n\n---\n\n'),
      baseLegal: 'R.M. 050-2013-TR Anexo 3',
    },
    {
      id: 'controles-pendientes',
      numbering: 'V',
      title: 'Plan de Controles — Acciones Pendientes',
      content: buildPlanControles(peligrosEvaluados),
      baseLegal: 'Art. 21 D.S. 005-2012-TR',
    },
    {
      id: 'comunicacion',
      numbering: 'VI',
      title: 'Comunicación y Capacitación',
      content: `La presente matriz será comunicada a todos los trabajadores del área, incluyéndola en:\n\n1. **Inducción SST** de nuevos ingresos\n2. **Capacitaciones trimestrales** específicas por puesto\n3. **Documentos visuales** en el área de trabajo (señalización + fichas de peligro)\n4. **Procedimientos de trabajo seguro** que incorporen los controles\n\nCada trabajador debe firmar el registro de conocimiento de los peligros y controles de su puesto.`,
      baseLegal: 'Art. 35 Ley 29783',
    },
    {
      id: 'firma',
      numbering: 'VII',
      title: 'Firma y Aprobación',
      content: `Elaborado por: **${params.responsable}** · Fecha: ${fechaLegible}\n\nRevisado y aprobado por: ${org.totalWorkers >= 20 ? 'Comité SST' : 'Supervisor SST'}\n\n_____________________________________\n**${org.representanteLegal ?? 'Representante Legal'}**\n${org.cargoRepresentante ?? 'Gerente General'}\n${org.razonSocial}\n\n_____________________________________\n**${params.responsable}**\nResponsable de la elaboración IPERC\n\n*La validez de este documento se renueva anualmente mediante revisión y actualización.*`,
      baseLegal: 'Art. 57 Ley 29783',
    },
  ]

  const markdown = buildMarkdown(org, fechaLegible, sections, peligrosEvaluados)

  return {
    type: 'iperc',
    title: `Matriz IPERC — ${org.razonSocial}`,
    markdown,
    sections,
    legalBasis: [
      'Ley 29783, Art. 57 — IPERC',
      'Ley 29783, Art. 21 — Jerarquía de controles',
      'D.S. 005-2012-TR, Art. 77 — Revisión periódica',
      'R.M. 050-2013-TR, Anexo 3 — Matriz IPER',
    ],
    metadata: {
      fechaElaboracion: params.fechaElaboracion,
      proximaRevision,
      vigenciaAnos: 1,
      totalPeligros,
      byNivel,
      sectorGeneral: params.sectorGeneral,
      responsable: params.responsable,
    },
  }
}

/* ── Formatters ────────────────────────────────────────────────────── */

function buildPeligroBlock(
  p: Peligro & { idx: number; inicial: ReturnType<typeof calcularNivelRiesgo>; residual: ReturnType<typeof calcularNivelRiesgo> },
): string {
  const controles = p.controlesPropuestos
    .map(
      (c) =>
        `  - **${JERARQUIA_LABEL[c.jerarquia]}**: ${c.descripcion}${c.responsable ? ` (responsable: ${c.responsable})` : ''}${c.plazoDias ? ` — plazo: ${c.plazoDias} días` : ''}`,
    )
    .join('\n')

  return `### ${p.idx}. ${p.peligro}

**Área / Puesto:** ${p.area}
**Tarea:** ${p.tarea}
**Riesgo asociado:** ${p.riesgo}

**Evaluación de riesgo:**

| | Probabilidad | Severidad | NR | Nivel |
|---|---|---|---|---|
| Inicial | ${p.probabilidadInicial} | ${p.severidad} | **${p.inicial.nr}** | ${p.inicial.nivel} |
${p.probabilidadResidual ? `| Residual (con controles) | ${p.probabilidadResidual} | ${p.severidad} | **${p.residual.nr}** | ${p.residual.nivel} |` : ''}

**Acción requerida:** ${p.residual.accion}

${p.controlesExistentes ? `**Controles existentes:** ${p.controlesExistentes}\n` : ''}**Controles propuestos (jerarquía):**
${controles}`
}

function buildPlanControles(
  peligros: Array<Peligro & { idx: number; residual: ReturnType<typeof calcularNivelRiesgo> }>,
): string {
  const urgentes = peligros.filter(
    (p) => p.residual.nivel === 'IMPORTANTE' || p.residual.nivel === 'INTOLERABLE',
  )
  const pendientes = peligros.flatMap((p) =>
    p.controlesPropuestos.map((c) => ({ ...c, peligro: p.peligro, idx: p.idx, nivel: p.residual.nivel })),
  )

  if (pendientes.length === 0) {
    return 'Sin controles pendientes — todas las medidas están implementadas.'
  }

  const urgentesBlock =
    urgentes.length > 0
      ? `**Acciones urgentes (${urgentes.length} peligros en IMPORTANTE/INTOLERABLE):**\n${urgentes
          .map((p) => `${p.idx}. ${p.peligro} · ${p.area} · **${p.residual.nivel}**`)
          .join('\n')}\n\n`
      : ''

  const cronograma = pendientes
    .filter((c) => c.plazoDias)
    .sort((a, b) => (a.plazoDias ?? 999) - (b.plazoDias ?? 999))
    .slice(0, 20)
    .map(
      (c) =>
        `- **Día ${c.plazoDias}**: ${c.descripcion} (peligro ${c.idx}, ${JERARQUIA_LABEL[c.jerarquia]})${c.responsable ? ` — ${c.responsable}` : ''}`,
    )
    .join('\n')

  return `${urgentesBlock}**Cronograma de controles:**\n${cronograma}`
}

function buildMarkdown(
  org: GeneratorOrgContext,
  fecha: string,
  sections: GeneratedSection[],
  peligros: Array<{ idx: number; peligro: string; area: string; residual: { nr: number; nivel: NivelRiesgo } }>,
): string {
  const header = `# MATRIZ IPERC — IDENTIFICACIÓN DE PELIGROS Y EVALUACIÓN DE RIESGOS

**Empresa:** ${org.razonSocial}
**RUC:** ${org.ruc}
**Fecha:** ${fecha}
**Base legal:** Ley 29783, Art. 57; R.M. 050-2013-TR, Anexo 3

---

`

  const body = sections
    .map(
      (s) =>
        `## ${s.numbering}. ${s.title}\n\n${s.content}${
          s.baseLegal ? `\n\n*Base legal: ${s.baseLegal}*` : ''
        }\n`,
    )
    .join('\n')

  // Anexo: tabla consolidada
  const tabla =
    '\n## Anexo — Tabla Consolidada\n\n' +
    '| # | Peligro | Área | NR | Nivel |\n|---|---|---|---|---|\n' +
    peligros
      .map((p) => `| ${p.idx} | ${p.peligro} | ${p.area} | ${p.residual.nr} | ${p.residual.nivel} |`)
      .join('\n')

  return header + body + tabla
}

function formatFechaLegible(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function addYears(iso: string, anos: number): string {
  try {
    const d = new Date(iso)
    d.setFullYear(d.getFullYear() + anos)
    return d.toISOString().slice(0, 10)
  } catch {
    return iso
  }
}
