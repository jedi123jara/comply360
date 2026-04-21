/**
 * Generador: Plan Anual de Seguridad y Salud en el Trabajo
 *
 * Base legal:
 *  - Ley 29783, Art. 38
 *  - D.S. 005-2012-TR, Art. 32, 79-81
 *  - R.M. 050-2013-TR — formato anexo 3
 *
 * Estructura obligatoria del Plan Anual SST:
 *  1. Alcance
 *  2. Elaboración de línea base (diagnóstico inicial)
 *  3. Política SST
 *  4. Objetivos y metas (SMART)
 *  5. Comité SST + funciones
 *  6. Identificación de peligros y evaluación de riesgos (IPERC)
 *  7. Organización y responsabilidades
 *  8. Capacitaciones en SST (cronograma)
 *  9. Procedimientos (emergencias, accidentes, inspecciones)
 * 10. Inspecciones internas de SST
 * 11. Salud ocupacional (exámenes médicos)
 * 12. Cronograma de actividades
 * 13. Indicadores
 * 14. Presupuesto
 */
import type { GeneratedDocument, GeneratedSection, GeneratorOrgContext } from './types'

export interface ObjetivoSmart {
  objetivo: string
  meta: string
  indicador: string
  responsable: string
  plazo: string // ISO date o descripción
}

export interface CapacitacionPlan {
  tema: string
  participantesObjetivo: string // 'todos' | 'comité' | 'nuevos ingresos' | descripción
  trimestre: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  responsable?: string
}

export interface PlanAnualSstParams {
  /** Año del plan (ej. 2026). */
  anio: number
  /** Fecha de aprobación (ISO). */
  fechaAprobacion: string
  /** Diagnóstico línea base — hallazgos principales. */
  diagnosticoLineaBase: string
  /** Responsable general SST (nombre, cargo). */
  responsableGeneralSst: string
  /** Coordinador SST si es distinto del responsable (opcional). */
  coordinadorSst?: string
  /** Objetivos SMART del año. */
  objetivos: ObjetivoSmart[]
  /** Capacitaciones programadas. Mínimo 4 al año según Art. 35 Ley 29783. */
  capacitaciones: CapacitacionPlan[]
  /** Presupuesto asignado en soles. */
  presupuestoSoles: number
  /** Frecuencia de inspecciones internas. */
  frecuenciaInspecciones: 'semanal' | 'mensual' | 'trimestral'
  /** Examen médico ocupacional: frecuencia según riesgo. */
  frecuenciaExamenMedico: 'anual' | 'bianual' | 'trienal'
  /** Observaciones adicionales opcionales. */
  observaciones?: string
}

export function generarPlanAnualSst(
  params: PlanAnualSstParams,
  org: GeneratorOrgContext,
): GeneratedDocument {
  const fechaLegible = formatFechaLegible(params.fechaAprobacion)

  if (params.capacitaciones.length < 4) {
    throw new Error(
      `Se requieren al menos 4 capacitaciones anuales (Art. 35 Ley 29783). Actualmente hay ${params.capacitaciones.length}.`,
    )
  }

  const totalCapacitacionesPorQ = {
    Q1: params.capacitaciones.filter((c) => c.trimestre === 'Q1').length,
    Q2: params.capacitaciones.filter((c) => c.trimestre === 'Q2').length,
    Q3: params.capacitaciones.filter((c) => c.trimestre === 'Q3').length,
    Q4: params.capacitaciones.filter((c) => c.trimestre === 'Q4').length,
  }

  const sections: GeneratedSection[] = [
    {
      id: 'alcance',
      numbering: 'I',
      title: 'Alcance',
      content: `El presente Plan Anual de SST de **${org.razonSocial}** aplica a todas las operaciones, áreas, procesos y centros de trabajo durante el año **${params.anio}**, incluyendo a todo el personal bajo cualquier modalidad de contratación, practicantes, prestadores de servicios y visitantes.\n\nLa empresa cuenta con **${org.totalWorkers} trabajadores activos**.`,
      baseLegal: 'Art. 38 Ley 29783',
    },
    {
      id: 'linea-base',
      numbering: 'II',
      title: 'Diagnóstico Línea Base',
      content: `Se realizó un diagnóstico inicial del estado del Sistema de Gestión SST al inicio del año, cuyos hallazgos principales son:\n\n${params.diagnosticoLineaBase}\n\nEste diagnóstico sirve como punto de partida para medir la mejora continua durante el año ${params.anio}. Los hallazgos alimentan los objetivos SMART, el programa de capacitaciones y el cronograma de inspecciones.`,
      baseLegal: 'Art. 37 Ley 29783 · Art. 79 D.S. 005-2012-TR',
    },
    {
      id: 'politica',
      numbering: 'III',
      title: 'Referencia a la Política SST',
      content: `Este Plan se enmarca en la **Política de Seguridad y Salud en el Trabajo** de ${org.razonSocial}, aprobada por la máxima instancia gerencial y que contiene los 8 elementos obligatorios del Art. 22 Ley 29783.\n\nLa política está exhibida en lugares visibles del centro de trabajo y ha sido comunicada a todos los trabajadores.`,
      baseLegal: 'Art. 22 Ley 29783',
    },
    {
      id: 'objetivos',
      numbering: 'IV',
      title: `Objetivos y Metas SMART — Año ${params.anio}`,
      content: buildObjetivosTabla(params.objetivos),
      baseLegal: 'Art. 39 Ley 29783 · Art. 80 D.S. 005-2012-TR',
    },
    {
      id: 'responsabilidades',
      numbering: 'V',
      title: 'Organización y Responsabilidades',
      content: `**Responsable General SST:** ${params.responsableGeneralSst}${params.coordinadorSst ? `\n**Coordinador SST:** ${params.coordinadorSst}` : ''}\n\n**Estructura de responsabilidades:**\n\n- **Alta Dirección (${org.representanteLegal ?? 'Gerencia General'})**: aprueba el Plan, asigna recursos, evalúa resultados anualmente.\n- **${params.responsableGeneralSst}**: lidera la implementación, reporta a la alta dirección mensualmente.\n- **Comité/Supervisor SST**: aprueba planes específicos, realiza inspecciones, investiga accidentes.\n- **Jefes de área**: implementan medidas preventivas, reportan incidentes, garantizan capacitación del personal.\n- **Trabajadores**: cumplen procedimientos, usan EPP, participan en capacitaciones, reportan condiciones inseguras.`,
      baseLegal: 'Art. 26 Ley 29783',
    },
    {
      id: 'iperc',
      numbering: 'VI',
      title: 'Identificación de Peligros y Evaluación de Riesgos (IPERC)',
      content: `Se mantendrá actualizada la **Matriz IPERC** por puesto de trabajo y área, con revisión al menos anual o ante cambios sustanciales (nuevos equipos, procesos, ubicaciones).\n\nLa metodología es la del Anexo 3 R.M. 050-2013-TR (matriz de probabilidad × severidad) y la jerarquía de controles: **eliminación → sustitución → controles de ingeniería → controles administrativos → EPP**.\n\nResponsable de actualización: ${params.coordinadorSst ?? params.responsableGeneralSst}.`,
      baseLegal: 'Art. 57 Ley 29783 · R.M. 050-2013-TR',
    },
    {
      id: 'capacitaciones',
      numbering: 'VII',
      title: 'Programa de Capacitaciones SST',
      content: buildCapacitacionesCronograma(params.capacitaciones, totalCapacitacionesPorQ),
      baseLegal: 'Art. 35 Ley 29783 · Art. 28-29 D.S. 005-2012-TR',
    },
    {
      id: 'inspecciones',
      numbering: 'VIII',
      title: 'Inspecciones Internas de SST',
      content: `Se realizarán inspecciones internas con frecuencia **${params.frecuenciaInspecciones}**, a cargo del ${org.totalWorkers >= 20 ? 'Comité SST' : 'Supervisor SST'} y del área de SST.\n\n**Alcance de las inspecciones:**\n- Condiciones físicas de áreas de trabajo\n- Uso correcto de EPP\n- Cumplimiento de procedimientos\n- Estado de extintores, señalización, vías de evacuación\n- Orden y limpieza (5S)\n\n**Documentación:** cada inspección se registra en formato R.M. 050-2013-TR y genera acciones correctivas rastreables hasta su cierre.`,
      baseLegal: 'Art. 40 Ley 29783',
    },
    {
      id: 'salud-ocupacional',
      numbering: 'IX',
      title: 'Salud Ocupacional y Exámenes Médicos',
      content: `Se implementará vigilancia de la salud ocupacional con las siguientes actividades:\n\n- **Exámenes médicos ocupacionales**: frecuencia **${params.frecuenciaExamenMedico}** (ingreso, periódico y retiro obligatorios)\n- Protocolos de exámenes según riesgo del puesto\n- Registro confidencial de resultados (con acceso limitado al trabajador y al médico ocupacional)\n- Programa de vigilancia epidemiológica para enfermedades ocupacionales relevantes del sector\n- Atención inmediata en caso de accidente + derivación a red EsSalud/SCTR\n- Programa de pausas activas y ergonomía para trabajo sedentario`,
      baseLegal: 'Art. 49-d Ley 29783 · D.S. 005-2012-TR',
    },
    {
      id: 'procedimientos',
      numbering: 'X',
      title: 'Procedimientos Críticos de SST',
      content: `Se mantendrán vigentes y comunicados los siguientes procedimientos:\n\n1. **Procedimiento de reporte e investigación de accidentes** (notificación MTPE 24h si es mortal o incapacitante)\n2. **Plan de respuesta ante emergencias** (incendio, sismo, evacuación, primeros auxilios)\n3. **Procedimiento de selección, uso, mantenimiento y reposición de EPP**\n4. **Procedimiento de inducción SST** para nuevos trabajadores (antes de iniciar labores)\n5. **Procedimiento de permisos de trabajo** (alto riesgo: altura, espacio confinado, caliente, eléctrico)\n6. **Procedimiento de reporte de actos y condiciones inseguras**\n7. **Procedimiento de contratistas y visitantes** dentro del centro de trabajo`,
      baseLegal: 'Art. 28 Ley 29783 · Art. 32 D.S. 005-2012-TR',
    },
    {
      id: 'indicadores',
      numbering: 'XI',
      title: 'Indicadores de Desempeño',
      content: `Se medirán mensualmente los siguientes indicadores clave:\n\n**Reactivos (frecuencia y gravedad):**\n- Índice de Frecuencia (IF) = (N° accidentes × 1,000,000) / horas-hombre trabajadas\n- Índice de Severidad (IS) = (días perdidos × 1,000,000) / horas-hombre trabajadas\n- Índice de Accidentabilidad (IA) = (IF × IS) / 1,000\n- Tasa de ausentismo por enfermedad ocupacional\n\n**Proactivos (prevención):**\n- % de cumplimiento del programa de capacitaciones\n- % de cumplimiento de exámenes médicos\n- N° de inspecciones realizadas vs. programadas\n- N° de actos/condiciones inseguras reportadas y resueltas\n- % de cumplimiento del cronograma del Plan Anual\n\n**Umbrales de alerta:** incremento del IA por sobre 20% vs. año anterior activa revisión de la Alta Dirección.`,
      baseLegal: 'Art. 40 Ley 29783 · R.M. 050-2013-TR',
    },
    {
      id: 'presupuesto',
      numbering: 'XII',
      title: 'Presupuesto Anual',
      content: `${org.razonSocial} asigna un presupuesto de **S/ ${params.presupuestoSoles.toLocaleString('es-PE')}** para la ejecución del presente Plan Anual de SST durante el año ${params.anio}.\n\n**Rubros típicos de asignación:**\n- Capacitaciones y certificaciones\n- Exámenes médicos ocupacionales\n- Equipos de protección personal\n- Señalización y equipamiento de emergencia\n- Honorarios de especialistas SST externos\n- Adecuaciones físicas derivadas de IPERC\n- Software y materiales de gestión SST\n\nLa ejecución presupuestal se reportará trimestralmente al Comité SST y anualmente a la Alta Dirección.`,
      baseLegal: 'Art. 39 Ley 29783',
    },
    ...(params.observaciones?.trim()
      ? [
          {
            id: 'observaciones',
            numbering: 'XIII',
            title: 'Observaciones Adicionales',
            content: params.observaciones,
          },
        ]
      : []),
    {
      id: 'aprobacion',
      numbering: params.observaciones?.trim() ? 'XIV' : 'XIII',
      title: 'Aprobación',
      content: `Aprobado el **${fechaLegible}** por ${org.representanteLegal ?? 'la Alta Dirección'} y por el ${org.totalWorkers >= 20 ? 'Comité' : 'Supervisor'} SST.\n\nEste Plan será revisado al cierre del año ${params.anio} para evaluar el cumplimiento de metas y formular el Plan del año siguiente, conforme al ciclo de mejora continua PHVA (Planificar-Hacer-Verificar-Actuar).\n\nFirmado por:\n- **${org.representanteLegal ?? 'Gerente General'}** — Alta Dirección\n- **${params.responsableGeneralSst}** — Responsable SST\n- Presidente del Comité SST / Supervisor SST`,
      baseLegal: 'Art. 38 Ley 29783',
    },
  ]

  const markdown = buildMarkdown(org, fechaLegible, params.anio, sections)

  return {
    type: 'plan-anual-sst',
    title: `Plan Anual de SST ${params.anio} — ${org.razonSocial}`,
    markdown,
    sections,
    legalBasis: [
      'Ley 29783, Art. 38 — Plan Anual SST',
      'Ley 29783, Art. 35 — Capacitaciones mínimas (4/año)',
      'Ley 29783, Art. 49-d — Exámenes médicos ocupacionales',
      'D.S. 005-2012-TR, Art. 32, 79-81',
      'R.M. 050-2013-TR — Formatos referenciales',
    ],
    metadata: {
      anio: params.anio,
      fechaAprobacion: params.fechaAprobacion,
      vigenciaAnos: 1,
      totalObjetivos: params.objetivos.length,
      totalCapacitaciones: params.capacitaciones.length,
      capacitacionesPorQ: totalCapacitacionesPorQ,
      presupuestoSoles: params.presupuestoSoles,
      responsableGeneralSst: params.responsableGeneralSst,
    },
  }
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function buildObjetivosTabla(objetivos: ObjetivoSmart[]): string {
  if (objetivos.length === 0) {
    return '*Sin objetivos definidos (completá al menos uno).*'
  }
  return objetivos
    .map(
      (o, i) =>
        `**${i + 1}. ${o.objetivo}**\n- Meta: ${o.meta}\n- Indicador: ${o.indicador}\n- Responsable: ${o.responsable}\n- Plazo: ${o.plazo}`,
    )
    .join('\n\n')
}

function buildCapacitacionesCronograma(
  caps: CapacitacionPlan[],
  totals: Record<string, number>,
): string {
  const header = `Mínimo **4 capacitaciones anuales** exigidas por el Art. 35 de la Ley 29783. Total programadas: **${caps.length}**.\n\n**Distribución por trimestre:** Q1=${totals.Q1} · Q2=${totals.Q2} · Q3=${totals.Q3} · Q4=${totals.Q4}\n\n`

  const body = (['Q1', 'Q2', 'Q3', 'Q4'] as const)
    .map((q) => {
      const qCaps = caps.filter((c) => c.trimestre === q)
      if (qCaps.length === 0) return `**${q}**: sin capacitaciones programadas.`
      const items = qCaps
        .map(
          (c, i) =>
            `  ${i + 1}. **${c.tema}** — participantes: ${c.participantesObjetivo}${c.responsable ? ` — responsable: ${c.responsable}` : ''}`,
        )
        .join('\n')
      return `**${q}:**\n${items}`
    })
    .join('\n\n')

  return header + body
}

function buildMarkdown(
  org: GeneratorOrgContext,
  fecha: string,
  anio: number,
  sections: GeneratedSection[],
): string {
  const header = `# PLAN ANUAL DE SEGURIDAD Y SALUD EN EL TRABAJO — ${anio}

**Empresa:** ${org.razonSocial}
**RUC:** ${org.ruc}
**Fecha de aprobación:** ${fecha}
**Base legal:** Ley 29783, Art. 38; D.S. 005-2012-TR, Art. 32, 79-81; R.M. 050-2013-TR

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

  return header + body
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
