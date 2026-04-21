/**
 * Generador: Cuadro de Categorías y Funciones
 *
 * Base legal:
 *  - Ley 30709 (Ley que prohíbe la discriminación remunerativa entre varones y mujeres)
 *  - D.S. 002-2018-TR (Reglamento de la Ley 30709)
 *  - R.M. 243-2018-TR (Guía metodológica para la valorización objetiva de puestos)
 *
 * Contenido obligatorio:
 *  - Clasificación de puestos en categorías
 *  - Valorización por 4 dimensiones: conocimiento, responsabilidad, esfuerzo, condiciones
 *  - Rangos salariales por categoría (mínimo-máximo)
 *  - Criterios objetivos (no género, edad, origen, etc.)
 */
import type { GeneratedDocument, GeneratedSection, GeneratorOrgContext } from './types'

export type DimensionScore = 1 | 2 | 3 | 4 | 5

export interface PuestoParams {
  nombre: string
  area?: string
  /** Cantidad de trabajadores en el puesto. */
  count?: number
  /**
   * Valorización por 4 dimensiones (Ley 30709, escala 1-5):
   *  - conocimientos: formación, experiencia técnica requerida
   *  - responsabilidad: impacto de decisiones, supervisión
   *  - esfuerzo: físico + mental
   *  - condiciones: ambiente, riesgos, presión
   */
  dimensiones: {
    conocimientos: DimensionScore
    responsabilidad: DimensionScore
    esfuerzo: DimensionScore
    condiciones: DimensionScore
  }
  /** Rango salarial (mensual, soles). */
  salarioMin: number
  salarioMax: number
  /** Descripción corta de las funciones. */
  funciones: string
}

export interface CuadroCategoriasParams {
  fechaAprobacion: string
  /** Vigencia en años (default 1). */
  vigenciaAnos?: number
  /** Puestos a clasificar. */
  puestos: PuestoParams[]
  /** Metodología usada (R.M. 243-2018-TR / sistema propio). */
  metodologia?: string
}

/** Las 4 dimensiones de Ley 30709 con pesos iguales (25% c/u según reglamento). */
const DIMENSION_WEIGHTS = {
  conocimientos: 0.25,
  responsabilidad: 0.25,
  esfuerzo: 0.25,
  condiciones: 0.25,
} as const

/** Calcula puntaje ponderado 1-5 y mapea a categoría A-E. */
function calcularPuntajeYCategoria(d: PuestoParams['dimensiones']): {
  puntaje: number
  categoria: 'A' | 'B' | 'C' | 'D' | 'E'
} {
  const puntaje =
    d.conocimientos * DIMENSION_WEIGHTS.conocimientos +
    d.responsabilidad * DIMENSION_WEIGHTS.responsabilidad +
    d.esfuerzo * DIMENSION_WEIGHTS.esfuerzo +
    d.condiciones * DIMENSION_WEIGHTS.condiciones

  let categoria: 'A' | 'B' | 'C' | 'D' | 'E'
  if (puntaje >= 4.25) categoria = 'A' // Ejecutivo / Dirección
  else if (puntaje >= 3.5) categoria = 'B' // Mando medio
  else if (puntaje >= 2.75) categoria = 'C' // Profesional
  else if (puntaje >= 2.0) categoria = 'D' // Técnico
  else categoria = 'E' // Apoyo / operativo

  return { puntaje: Math.round(puntaje * 100) / 100, categoria }
}

const CATEGORIA_LABEL: Record<'A' | 'B' | 'C' | 'D' | 'E', string> = {
  A: 'A — Dirección / Ejecutivo',
  B: 'B — Mando Medio / Jefatura',
  C: 'C — Profesional',
  D: 'D — Técnico',
  E: 'E — Operativo / Apoyo',
}

export function generarCuadroCategorias(
  params: CuadroCategoriasParams,
  org: GeneratorOrgContext,
): GeneratedDocument {
  const fechaLegible = formatFechaLegible(params.fechaAprobacion)
  const vigencia = params.vigenciaAnos ?? 1
  const metodologia = params.metodologia ?? 'Guía metodológica R.M. 243-2018-TR (valorización objetiva por 4 dimensiones de Ley 30709)'

  const puestosClasificados = params.puestos.map((p) => {
    const { puntaje, categoria } = calcularPuntajeYCategoria(p.dimensiones)
    return { ...p, puntaje, categoria }
  })

  // Agrupar por categoría para la tabla
  const porCategoria: Record<string, typeof puestosClasificados> = {}
  for (const p of puestosClasificados) {
    if (!porCategoria[p.categoria]) porCategoria[p.categoria] = []
    porCategoria[p.categoria].push(p)
  }
  const categoriasOrdenadas = (['A', 'B', 'C', 'D', 'E'] as const).filter((c) => porCategoria[c])

  const totalPuestos = puestosClasificados.length
  const totalTrabajadores = puestosClasificados.reduce((s, p) => s + (p.count ?? 0), 0)

  const sections: GeneratedSection[] = [
    {
      id: 'objeto',
      numbering: 'I',
      title: 'Objeto y Base Legal',
      content: `El presente **Cuadro de Categorías y Funciones** de ${org.razonSocial} establece la clasificación objetiva de los puestos de trabajo y sus rangos remunerativos, en cumplimiento de la **Ley 30709** que prohíbe la discriminación remunerativa entre varones y mujeres y del **D.S. 002-2018-TR** (Reglamento).\n\nEl cuadro garantiza que los criterios de valorización sean objetivos, no se basen en género, edad, origen étnico, estado civil, condición económica, afiliación sindical, orientación sexual, discapacidad o cualquier otro factor prohibido (Art. 3 Ley 30709).`,
      baseLegal: 'Ley 30709, Art. 2 · D.S. 002-2018-TR, Art. 4',
    },
    {
      id: 'metodologia',
      numbering: 'II',
      title: 'Metodología de Valorización',
      content: `La clasificación se realiza mediante la valoración de **4 dimensiones** (pesos iguales del 25%):\n\n1. **Conocimientos**: formación académica, experiencia técnica y competencias requeridas para el puesto (1-5).\n2. **Responsabilidad**: impacto de las decisiones, autoridad jerárquica, manejo de recursos o información confidencial (1-5).\n3. **Esfuerzo**: carga física y/o mental que demanda la función (1-5).\n4. **Condiciones de trabajo**: ambiente, riesgos, presión, requerimientos especiales (1-5).\n\n**Metodología aplicada:** ${metodologia}.\n\nEl puntaje ponderado final (1-5) se mapea a una categoría A-E:\n- **4.25+** → Categoría A: Dirección / Ejecutivo\n- **3.5-4.24** → Categoría B: Mando Medio / Jefatura\n- **2.75-3.49** → Categoría C: Profesional\n- **2.0-2.74** → Categoría D: Técnico\n- **<2.0** → Categoría E: Operativo / Apoyo`,
      baseLegal: 'D.S. 002-2018-TR, Art. 3-4 · R.M. 243-2018-TR',
    },
    ...categoriasOrdenadas.map((cat, idx) => ({
      id: `categoria-${cat}`,
      numbering: `III.${idx + 1}`,
      title: `Categoría ${CATEGORIA_LABEL[cat]}`,
      content: buildCategoriaContent(cat, porCategoria[cat]),
      baseLegal: 'Art. 5 D.S. 002-2018-TR',
    })),
    {
      id: 'no-discriminacion',
      numbering: 'IV',
      title: 'Principio de No Discriminación Remunerativa',
      content: `${org.razonSocial} garantiza que dentro de cada categoría:\n\n1. **Los rangos salariales son idénticos** para todos los trabajadores del mismo puesto, independientemente de su género, edad u otro factor prohibido.\n2. **Las diferencias dentro del rango** (si existen) se justifican exclusivamente por criterios objetivos: antigüedad, desempeño medido, certificaciones adicionales o circunstancias del mercado.\n3. **Cualquier diferencia remunerativa injustificada entre trabajadores de la misma categoría** puede ser impugnada y dará lugar a la nivelación con el salario superior, sin perjuicio de la sanción SUNAFIL correspondiente (hasta 1.57 UIT por trabajador afectado).\n4. Los ajustes salariales se aplicarán por categoría, con criterios documentables y auditables.`,
      baseLegal: 'Art. 3, 6 Ley 30709 · Art. 6 D.S. 002-2018-TR',
    },
    {
      id: 'revision',
      numbering: 'V',
      title: 'Revisión Anual y Auditoría',
      content: `Este Cuadro de Categorías será **revisado al menos anualmente** o ante cambios estructurales (nuevos puestos, reestructuraciones, fusiones). La revisión incluirá:\n\n- Auditoría de brechas remunerativas por género dentro de cada categoría\n- Actualización de funciones y rangos salariales\n- Validación del resultado con la Gerencia de Recursos Humanos y, cuando corresponda, el sindicato o representantes de trabajadores\n\n${org.razonSocial} mantendrá registros documentados de la metodología aplicada, los criterios de clasificación y las revisiones realizadas, disponibles para SUNAFIL en caso de inspección.`,
      baseLegal: 'Art. 4 Ley 30709 · Art. 9 D.S. 002-2018-TR',
    },
    {
      id: 'aprobacion',
      numbering: 'VI',
      title: 'Aprobación y Vigencia',
      content: `Aprobado el **${fechaLegible}** por el máximo nivel gerencial de ${org.razonSocial}. Vigencia: **${vigencia} ${vigencia === 1 ? 'año' : 'años'}** contados desde la fecha de aprobación.\n\n**Resumen cuantitativo:**\n- Total de puestos clasificados: **${totalPuestos}**\n- Total de trabajadores cubiertos: **${totalTrabajadores}**\n- Categorías utilizadas: **${categoriasOrdenadas.join(', ')}**\n\nFirmado por: **${org.representanteLegal ?? '[Representante Legal]'}** — ${org.cargoRepresentante ?? 'Gerente General'}`,
      baseLegal: 'D.S. 002-2018-TR',
    },
  ]

  const markdown = buildMarkdown(org, fechaLegible, sections, puestosClasificados)

  return {
    type: 'cuadro-categorias',
    title: `Cuadro de Categorías y Funciones — ${org.razonSocial}`,
    markdown,
    sections,
    legalBasis: [
      'Ley 30709 — Prohibición de discriminación remunerativa',
      'D.S. 002-2018-TR — Reglamento de la Ley 30709',
      'R.M. 243-2018-TR — Guía metodológica de valorización',
    ],
    metadata: {
      totalPuestos,
      totalTrabajadores,
      categorias: categoriasOrdenadas,
      fechaAprobacion: params.fechaAprobacion,
      vigenciaAnos: vigencia,
      puestos: puestosClasificados,
    },
  }
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function buildCategoriaContent(
  cat: 'A' | 'B' | 'C' | 'D' | 'E',
  puestos: Array<PuestoParams & { puntaje: number; categoria: string }>,
): string {
  const intro = `Puestos clasificados en la Categoría **${CATEGORIA_LABEL[cat]}**:\n`
  const table = puestos
    .map((p) => {
      const range = `S/ ${p.salarioMin.toLocaleString('es-PE')} - S/ ${p.salarioMax.toLocaleString('es-PE')}`
      return `\n**${p.nombre}**${p.area ? ` (${p.area})` : ''}${p.count ? ` — ${p.count} trabajador${p.count === 1 ? '' : 'es'}` : ''}\n- Funciones: ${p.funciones}\n- Valorización: conocimientos ${p.dimensiones.conocimientos}/5 · responsabilidad ${p.dimensiones.responsabilidad}/5 · esfuerzo ${p.dimensiones.esfuerzo}/5 · condiciones ${p.dimensiones.condiciones}/5 (puntaje ponderado **${p.puntaje}/5**)\n- Rango salarial: **${range}** mensuales`
    })
    .join('\n')
  return intro + table
}

function buildMarkdown(
  org: GeneratorOrgContext,
  fecha: string,
  sections: GeneratedSection[],
  puestos: Array<PuestoParams & { puntaje: number; categoria: string }>,
): string {
  const header = `# CUADRO DE CATEGORÍAS Y FUNCIONES

**Empresa:** ${org.razonSocial}
**RUC:** ${org.ruc}
**Fecha de aprobación:** ${fecha}
**Base legal:** Ley 30709; D.S. 002-2018-TR; R.M. 243-2018-TR

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

  // Tabla resumen consolidada al final
  const resumen =
    '\n## Anexo — Tabla Resumen de Puestos\n\n' +
    '| Puesto | Área | Cat. | Puntaje | Salario Mín. (S/) | Salario Máx. (S/) | N° Trab. |\n' +
    '|---|---|---|---|---|---|---|\n' +
    puestos
      .map(
        (p) =>
          `| ${p.nombre} | ${p.area ?? '—'} | ${p.categoria} | ${p.puntaje} | ${p.salarioMin.toLocaleString('es-PE')} | ${p.salarioMax.toLocaleString('es-PE')} | ${p.count ?? '—'} |`,
      )
      .join('\n')

  const footer = `\n\n---\n\n**${org.representanteLegal ?? 'Representante Legal'}**
${org.cargoRepresentante ?? 'Gerente General'}
${org.razonSocial}
`

  return header + body + resumen + footer
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
