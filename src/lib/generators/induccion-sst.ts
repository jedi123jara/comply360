/**
 * Generador: Constancia de Inducción SST
 *
 * Base legal:
 *  - Ley 29783, Art. 49-g (obligación de inducción antes de iniciar labores)
 *  - D.S. 005-2012-TR, Art. 29 y Anexo 3
 *  - R.M. 050-2013-TR (Formatos referenciales: Registro de Inducción, Capacitación,
 *    Entrenamiento y Simulacros de Emergencia)
 *
 * La inducción SST es OBLIGATORIA para todo trabajador antes de iniciar labores.
 * El empleador debe documentar que se dictó, qué temas cubrió y que el trabajador
 * la recibió (firma). SUNAFIL pide esta constancia en cada inspección.
 *
 * Temario mínimo (R.M. 050-2013-TR):
 *  1. Política y Reglamento Interno de SST del empleador
 *  2. Responsabilidades en SST (empleador y trabajador)
 *  3. Funciones del Comité o Supervisor SST
 *  4. IPER/IPERC de su puesto de trabajo
 *  5. Procedimientos de respuesta ante emergencias
 *  6. Uso correcto de EPP
 *  7. Derecho a la paralización de actividades ante peligro inminente
 *  8. Procedimiento de reporte de accidentes e incidentes
 */
import type { GeneratedDocument, GeneratedSection, GeneratorOrgContext } from './types'

export interface InduccionTrabajador {
  nombre: string
  dni: string
  cargo: string
  area?: string
  fechaIngreso?: string // ISO
}

export interface InduccionSstParams {
  /** Datos del trabajador inducido. */
  trabajador: InduccionTrabajador
  /** Fecha de la inducción (ISO). */
  fechaInduccion: string
  /** Duración en horas (mínimo 2h recomendado, 4h común). */
  duracionHoras: number
  /** Modalidad: presencial / virtual / mixta. */
  modalidad: 'presencial' | 'virtual' | 'mixta'
  /** Datos del capacitador. */
  capacitador: {
    nombre: string
    cargo?: string
    registro?: string // registro CIP, colegiatura, certificación externa
  }
  /** Temas específicos cubiertos en la inducción (extienden el temario mínimo). */
  temasAdicionales?: string[]
  /** Peligros específicos del puesto (ideal: tomar del IPERC del área). */
  peligrosEspecificos?: string[]
  /** EPP que se entrega en la inducción (si aplica). */
  eppEntregado?: string[]
  /** Observaciones del capacitador. */
  observaciones?: string
}

/** Temario mínimo obligatorio que toda inducción SST debe cubrir (R.M. 050-2013-TR). */
const TEMARIO_MINIMO = [
  'Política y objetivos de SST del empleador',
  'Reglamento Interno de SST y sus principales disposiciones',
  'Responsabilidades del empleador y del trabajador en SST (Art. 54 y 79 Ley 29783)',
  'Funciones del Comité o Supervisor SST',
  'IPER/IPERC aplicable al puesto de trabajo',
  'Procedimientos de respuesta ante emergencias (incendio, sismo, evacuación, primeros auxilios)',
  'Uso correcto, mantenimiento y conservación del EPP',
  'Derecho a paralizar actividades ante peligro inminente (Art. 63 Ley 29783)',
  'Procedimiento de reporte de accidentes, incidentes y condiciones inseguras',
  'Información sobre peligros específicos del puesto y sus controles',
]

export function generarInduccionSst(
  params: InduccionSstParams,
  org: GeneratorOrgContext,
): GeneratedDocument {
  const fechaLegible = formatFechaLegible(params.fechaInduccion)
  const fechaIngresoLegible = params.trabajador.fechaIngreso
    ? formatFechaLegible(params.trabajador.fechaIngreso)
    : 'la fecha de ingreso'

  if (params.duracionHoras < 2) {
    // No lanzamos error, solo nota en el doc
  }

  const modalidadLabel = {
    presencial: 'presencial',
    virtual: 'virtual (con conexión sincrónica verificada)',
    mixta: 'mixta (parte presencial + parte virtual)',
  }[params.modalidad]

  const temasCompletos = [
    ...TEMARIO_MINIMO,
    ...(params.temasAdicionales?.filter((t) => t.trim().length > 0) ?? []),
  ]

  const sections: GeneratedSection[] = [
    {
      id: 'identificacion',
      numbering: 'I',
      title: 'Identificación del Registro',
      content: `**Empresa:** ${org.razonSocial}\n**RUC:** ${org.ruc}\n**Lugar de la inducción:** ${org.razonSocial}${org.domicilio ? ` — ${org.domicilio}` : ''}\n**Fecha:** ${fechaLegible}\n**Duración:** ${params.duracionHoras} horas\n**Modalidad:** ${modalidadLabel}\n\nLa presente inducción se dictó **antes del inicio de labores** del trabajador, conforme al Art. 49 inciso g) de la Ley 29783 y al Art. 29 del D.S. 005-2012-TR.`,
      baseLegal: 'Ley 29783, Art. 49-g · D.S. 005-2012-TR, Art. 29 · R.M. 050-2013-TR',
    },
    {
      id: 'trabajador',
      numbering: 'II',
      title: 'Datos del Trabajador Inducido',
      content: `**Nombre:** ${params.trabajador.nombre}\n**DNI:** ${params.trabajador.dni}\n**Cargo:** ${params.trabajador.cargo}${params.trabajador.area ? `\n**Área:** ${params.trabajador.area}` : ''}\n**Fecha de ingreso:** ${fechaIngresoLegible}`,
      baseLegal: 'Art. 29 D.S. 005-2012-TR',
    },
    {
      id: 'capacitador',
      numbering: 'III',
      title: 'Datos del Capacitador',
      content: `**Nombre:** ${params.capacitador.nombre}${params.capacitador.cargo ? `\n**Cargo:** ${params.capacitador.cargo}` : ''}${params.capacitador.registro ? `\n**Registro / Colegiatura:** ${params.capacitador.registro}` : ''}\n\nEl capacitador declara haber dictado la inducción completa conforme al temario mínimo requerido y al programa anual de capacitaciones SST de la empresa.`,
      baseLegal: 'Art. 35 Ley 29783',
    },
    {
      id: 'temario',
      numbering: 'IV',
      title: 'Temario Cubierto',
      content: temasCompletos.map((t, i) => `${i + 1}. ${t}`).join('\n'),
      baseLegal: 'R.M. 050-2013-TR — Formato Anexo Inducción',
    },
    ...(params.peligrosEspecificos && params.peligrosEspecificos.length > 0
      ? [
          {
            id: 'peligros',
            numbering: 'V',
            title: 'Peligros Específicos del Puesto',
            content:
              'El trabajador fue informado específicamente sobre los siguientes peligros de su puesto (tomados del IPERC vigente):\n\n' +
              params.peligrosEspecificos.map((p) => `- ${p}`).join('\n'),
            baseLegal: 'Art. 57 Ley 29783',
          },
        ]
      : []),
    ...(params.eppEntregado && params.eppEntregado.length > 0
      ? [
          {
            id: 'epp',
            numbering: params.peligrosEspecificos && params.peligrosEspecificos.length > 0 ? 'VI' : 'V',
            title: 'EPP Entregado en la Inducción',
            content:
              'Al trabajador se le hizo entrega del siguiente Equipo de Protección Personal (EPP), con explicación de su uso, mantenimiento y reposición:\n\n' +
              params.eppEntregado.map((e) => `- ${e}`).join('\n') +
              '\n\nEl trabajador firmará además el **Registro de Entrega de EPP** correspondiente (documento separado, Art. 60 Ley 29783).',
            baseLegal: 'Art. 60 Ley 29783',
          },
        ]
      : []),
    ...(params.observaciones?.trim()
      ? [
          {
            id: 'observaciones',
            numbering: 'VII',
            title: 'Observaciones del Capacitador',
            content: params.observaciones,
          },
        ]
      : []),
    {
      id: 'conformidad',
      numbering: 'VIII',
      title: 'Declaración de Conformidad del Trabajador',
      content: `Yo, **${params.trabajador.nombre}** identificado con DNI **${params.trabajador.dni}**, declaro haber recibido la presente inducción en Seguridad y Salud en el Trabajo el día **${fechaLegible}**, con una duración de **${params.duracionHoras} horas**, y haber comprendido los temas tratados.\n\nMe comprometo a cumplir con los procedimientos, normas y disposiciones de seguridad y salud en el trabajo, usar adecuadamente el EPP entregado, reportar condiciones y actos inseguros, y participar activamente en las actividades preventivas que disponga el empleador.\n\nConozco mi derecho a **paralizar las actividades** ante un peligro inminente sin represalia alguna (Art. 63 Ley 29783).`,
      baseLegal: 'Art. 49, 63, 79 Ley 29783',
    },
    {
      id: 'firmas',
      numbering: 'IX',
      title: 'Firmas',
      content: `_____________________________________\n**${params.trabajador.nombre}**\nDNI: ${params.trabajador.dni}\nTrabajador inducido\n\n_____________________________________\n**${params.capacitador.nombre}**\n${params.capacitador.cargo ?? 'Capacitador SST'}\n\n_____________________________________\n**${org.representanteLegal ?? 'Representante del Empleador'}**\n${org.cargoRepresentante ?? 'Representante Legal'}\n${org.razonSocial}`,
      baseLegal: 'Art. 29 D.S. 005-2012-TR',
    },
  ]

  const markdown = buildMarkdown(org, fechaLegible, params, sections)

  return {
    type: 'induccion-sst',
    title: `Constancia de Inducción SST — ${params.trabajador.nombre}`,
    markdown,
    sections,
    legalBasis: [
      'Ley 29783, Art. 49-g — Obligación de inducción antes de iniciar labores',
      'Ley 29783, Art. 35 — Capacitación SST',
      'Ley 29783, Art. 63 — Derecho a paralización por peligro inminente',
      'D.S. 005-2012-TR, Art. 29 — Formato de registro',
      'R.M. 050-2013-TR — Formatos referenciales de registros SST',
    ],
    metadata: {
      trabajador: params.trabajador,
      fechaInduccion: params.fechaInduccion,
      duracionHoras: params.duracionHoras,
      modalidad: params.modalidad,
      capacitador: params.capacitador,
      temasCubiertos: temasCompletos.length,
      peligrosCubiertos: params.peligrosEspecificos?.length ?? 0,
      eppEntregado: params.eppEntregado?.length ?? 0,
    },
  }
}

/* ── Helpers ───────────────────────────────────────────────────── */

function buildMarkdown(
  org: GeneratorOrgContext,
  fecha: string,
  params: InduccionSstParams,
  sections: GeneratedSection[],
): string {
  const header = `# CONSTANCIA DE INDUCCIÓN EN SEGURIDAD Y SALUD EN EL TRABAJO

**Empresa:** ${org.razonSocial}
**RUC:** ${org.ruc}
**Trabajador:** ${params.trabajador.nombre} (DNI ${params.trabajador.dni})
**Cargo:** ${params.trabajador.cargo}
**Fecha:** ${fecha}
**Duración:** ${params.duracionHoras} horas

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
