/**
 * Generador: Acta de Comité / Supervisor SST
 *
 * Base legal:
 *  - Ley 29783, Art. 29-30
 *  - D.S. 005-2012-TR, Art. 42-75
 *  - R.M. 148-2012-TR (cuando sea comité)
 *
 * Dos variantes según cantidad de trabajadores:
 *  - 20+ trabajadores: Acta de Conformación del Comité SST (paritario)
 *  - <20 trabajadores: Acta de Designación del Supervisor SST
 *
 * El Comité es paritario (igual cantidad de titulares del empleador y de
 * trabajadores). Los trabajadores eligen a sus representantes por votación
 * directa y secreta. El mandato es de 1-2 años, prorrogable.
 */
import type { GeneratedDocument, GeneratedSection, GeneratorOrgContext } from './types'

export type ActaTipo = 'comite' | 'supervisor'

export interface MiembroComite {
  nombre: string
  dni: string
  cargo?: string
  area?: string
  /** Para comité: titular o suplente. */
  rol: 'titular' | 'suplente'
  /** Para comité: representa al empleador o a los trabajadores. */
  representa: 'empleador' | 'trabajadores'
}

export interface ActaComiteSstParams {
  tipo: ActaTipo
  /** Fecha del acta (ISO). */
  fechaActa: string
  /** Lugar donde se firma el acta. */
  lugarActa: string
  /** Mandato en años (default 1-2 según Art. 62 D.S. 005-2012-TR). */
  mandatoAnos?: number

  // === Para tipo=comite ===
  /** Miembros del comité: mínimo 2 por cada parte (titulares), ideal 4 + suplentes. */
  miembros?: MiembroComite[]
  /** Presidente electo (nombre completo, debe estar entre los miembros). */
  presidente?: string
  /** Secretario electo (nombre completo, debe estar entre los miembros). */
  secretario?: string
  /** Fecha de la elección de representantes de trabajadores (ISO). */
  fechaEleccion?: string
  /** Número de votos/trabajadores que participaron en la elección. */
  votantesElecciones?: number

  // === Para tipo=supervisor ===
  /** Nombre del supervisor designado. */
  supervisorNombre?: string
  /** DNI del supervisor. */
  supervisorDni?: string
  /** Cargo del supervisor. */
  supervisorCargo?: string
  /** Cómo se eligió (designación por empleador + aceptación trabajadores / votación). */
  modoDesignacion?: string
}

/** Valida composición paritaria del comité según Art. 43 D.S. 005-2012-TR. */
function validarParidad(miembros: MiembroComite[]): { ok: boolean; motivo?: string } {
  const titularesEmpleador = miembros.filter((m) => m.rol === 'titular' && m.representa === 'empleador').length
  const titularesTrabajadores = miembros.filter((m) => m.rol === 'titular' && m.representa === 'trabajadores').length
  if (titularesEmpleador < 1 || titularesTrabajadores < 1) {
    return { ok: false, motivo: 'Se requiere al menos 1 titular por cada parte (empleador y trabajadores).' }
  }
  if (titularesEmpleador !== titularesTrabajadores) {
    return {
      ok: false,
      motivo: `El comité debe ser paritario. Tienes ${titularesEmpleador} titulares del empleador y ${titularesTrabajadores} de los trabajadores.`,
    }
  }
  return { ok: true }
}

export function generarActaComiteSst(
  params: ActaComiteSstParams,
  org: GeneratorOrgContext,
): GeneratedDocument {
  if (params.tipo === 'comite') {
    return generarActaComite(params, org)
  }
  return generarActaSupervisor(params, org)
}

/* ── Variante Comité ───────────────────────────────────────────────── */

function generarActaComite(
  params: ActaComiteSstParams,
  org: GeneratorOrgContext,
): GeneratedDocument {
  const miembros = params.miembros ?? []
  const paridad = validarParidad(miembros)
  if (!paridad.ok) {
    throw new Error(`Composición inválida del Comité: ${paridad.motivo}`)
  }

  const fechaLegible = formatFechaLegible(params.fechaActa)
  const fechaEleccionLegible = params.fechaEleccion ? formatFechaLegible(params.fechaEleccion) : 'fecha a definir'
  const mandato = params.mandatoAnos ?? 2
  const lugar = params.lugarActa || 'el centro de trabajo'

  const titularesEmpleador = miembros.filter((m) => m.rol === 'titular' && m.representa === 'empleador')
  const suplentesEmpleador = miembros.filter((m) => m.rol === 'suplente' && m.representa === 'empleador')
  const titularesTrabajadores = miembros.filter((m) => m.rol === 'titular' && m.representa === 'trabajadores')
  const suplentesTrabajadores = miembros.filter((m) => m.rol === 'suplente' && m.representa === 'trabajadores')

  const sections: GeneratedSection[] = [
    {
      id: 'encabezado',
      numbering: 'I',
      title: 'Acta de Conformación del Comité de Seguridad y Salud en el Trabajo',
      content: `En ${lugar}, siendo las horas del día **${fechaLegible}**, se reúnen los representantes del empleador **${org.razonSocial}** (RUC ${org.ruc || '—'}) y de los trabajadores, con el objeto de dejar constancia de la conformación del **Comité de Seguridad y Salud en el Trabajo** (en adelante, "el Comité"), de conformidad con los artículos 29, 30 y 43 de la Ley 29783 — Ley de Seguridad y Salud en el Trabajo — y los artículos 42 al 75 del D.S. 005-2012-TR.\n\nLa empresa cuenta con **${org.totalWorkers} trabajadores** activos, por lo que corresponde conformar un Comité paritario según el Art. 43 del reglamento.`,
      baseLegal: 'Ley 29783, Art. 29, 30, 43 · D.S. 005-2012-TR, Art. 42-75',
    },
    {
      id: 'eleccion-trabajadores',
      numbering: 'II',
      title: 'Elección de los Representantes de los Trabajadores',
      content: `Los representantes de los trabajadores ante el Comité fueron elegidos mediante **votación directa, secreta y universal** el día **${fechaEleccionLegible}**${params.votantesElecciones ? `, con la participación de ${params.votantesElecciones} trabajadores` : ''}, cumpliendo con los requisitos del Art. 49 del D.S. 005-2012-TR.\n\nLos elegidos tienen la facultad de actuar con autonomía e imparcialidad, no pudiendo ser objeto de discriminación, despido ni traslado sin justa causa durante el ejercicio de sus funciones ni dentro de los 6 meses siguientes al término de su mandato (Art. 30 Ley 29783 — fuero sindical por analogía).`,
      baseLegal: 'D.S. 005-2012-TR, Art. 49-50',
    },
    {
      id: 'composicion',
      numbering: 'III',
      title: 'Composición del Comité SST',
      content: `El Comité queda conformado de la siguiente manera (paritariamente, según Art. 43 D.S. 005-2012-TR):\n\n**Representantes del Empleador (titulares):**\n${titularesEmpleador.map((m, i) => `${i + 1}. ${m.nombre} · DNI ${m.dni}${m.cargo ? ` · ${m.cargo}` : ''}${m.area ? ` · ${m.area}` : ''}`).join('\n')}\n\n${
        suplentesEmpleador.length
          ? `**Representantes del Empleador (suplentes):**\n${suplentesEmpleador.map((m, i) => `${i + 1}. ${m.nombre} · DNI ${m.dni}${m.cargo ? ` · ${m.cargo}` : ''}`).join('\n')}\n\n`
          : ''
      }**Representantes de los Trabajadores (titulares):**\n${titularesTrabajadores.map((m, i) => `${i + 1}. ${m.nombre} · DNI ${m.dni}${m.cargo ? ` · ${m.cargo}` : ''}${m.area ? ` · ${m.area}` : ''}`).join('\n')}${
        suplentesTrabajadores.length
          ? `\n\n**Representantes de los Trabajadores (suplentes):**\n${suplentesTrabajadores.map((m, i) => `${i + 1}. ${m.nombre} · DNI ${m.dni}${m.cargo ? ` · ${m.cargo}` : ''}`).join('\n')}`
          : ''
      }`,
      baseLegal: 'D.S. 005-2012-TR, Art. 43-48',
    },
    {
      id: 'mesa-directiva',
      numbering: 'IV',
      title: 'Elección de Mesa Directiva',
      content: `Los miembros del Comité, por acuerdo mayoritario, eligen:\n\n- **Presidente:** ${params.presidente ?? '[por definir entre los miembros]'}\n- **Secretario:** ${params.secretario ?? '[por definir entre los miembros]'}\n\nLa Presidencia y la Secretaría se alternan entre los representantes del empleador y de los trabajadores cada vez que se instala un nuevo Comité, salvo acuerdo distinto (Art. 56 D.S. 005-2012-TR).`,
      baseLegal: 'D.S. 005-2012-TR, Art. 56',
    },
    {
      id: 'mandato',
      numbering: 'V',
      title: 'Mandato y Vigencia',
      content: `El mandato de los miembros del Comité es de **${mandato} ${mandato === 1 ? 'año' : 'años'}**, pudiendo ser reelectos. Iniciará a partir de la fecha de la presente Acta y concluirá el ${calcularFin(params.fechaActa, mandato)}.\n\nLos miembros cesarán en sus funciones por: término del mandato, renuncia, despido o separación por causa justa, o inasistencia injustificada a tres sesiones consecutivas o cinco alternadas (Art. 68 D.S. 005-2012-TR).`,
      baseLegal: 'D.S. 005-2012-TR, Art. 62-68',
    },
    {
      id: 'funciones',
      numbering: 'VI',
      title: 'Funciones del Comité',
      content: `El Comité tiene las siguientes funciones principales (Art. 52 D.S. 005-2012-TR):\n\n1. Conocer los documentos e informes relativos a las condiciones de trabajo\n2. Aprobar el **Reglamento Interno de Seguridad y Salud en el Trabajo**\n3. Aprobar el **Plan Anual de Seguridad y Salud en el Trabajo**\n4. Aprobar el Programa Anual de Capacitación y Entrenamiento\n5. Promover la participación activa de todos los trabajadores\n6. Vigilar el cumplimiento de la normativa legal de SST\n7. Analizar las causas de accidentes e incidentes y elaborar recomendaciones\n8. Recomendar al empleador las medidas preventivas necesarias\n9. Asegurar que los trabajadores conozcan los reglamentos e instrucciones\n10. Promover la práctica de inspecciones periódicas\n\n**Sesiones:** mínimo una sesión ordinaria mensual. Sesiones extraordinarias se convocan a solicitud del Presidente o de la mayoría de sus miembros. Las actas de todas las sesiones se mantendrán archivadas por 5 años.`,
      baseLegal: 'D.S. 005-2012-TR, Art. 52-60',
    },
    {
      id: 'garantias',
      numbering: 'VII',
      title: 'Garantías y Facilidades para los Miembros',
      content: `El empleador se obliga a otorgar a los miembros del Comité, durante el ejercicio de sus funciones:\n\n- Licencia con goce de haber para el cumplimiento de sus funciones (mínimo 30 días al año por miembro, según Art. 73 D.S. 005-2012-TR)\n- Acceso a la información necesaria para el cumplimiento de sus funciones\n- Protección contra actos de discriminación, represalia o despido por el ejercicio de su rol\n- Capacitación específica en SST, al menos una vez al año\n- Las facilidades para participar en capacitaciones externas vinculadas a SST`,
      baseLegal: 'Ley 29783, Art. 30 · D.S. 005-2012-TR, Art. 73',
    },
    {
      id: 'cierre',
      numbering: 'VIII',
      title: 'Cierre del Acta',
      content: `Habiéndose cumplido el objeto de la presente reunión y no habiendo más asuntos que tratar, se da por concluida la misma a las horas del día **${fechaLegible}**.\n\nPara constancia firman los presentes:\n\n_____________________________________\n**${org.representanteLegal ?? 'Representante Legal del Empleador'}**\n${org.cargoRepresentante ?? 'Representante Legal'}\n${org.razonSocial}\n\n_____________________________________\n**Presidente del Comité SST**\n${params.presidente ?? '[Nombre]'}\n\n_____________________________________\n**Secretario del Comité SST**\n${params.secretario ?? '[Nombre]'}\n\n*(Firman también todos los miembros titulares y suplentes del Comité)*`,
      baseLegal: 'D.S. 005-2012-TR, Art. 59',
    },
  ]

  const markdown = buildActaMarkdown(org, fechaLegible, lugar, sections)

  return {
    type: 'acta-comite-sst',
    title: `Acta de Conformación del Comité SST — ${org.razonSocial}`,
    markdown,
    sections,
    legalBasis: [
      'Ley 29783, Art. 29-30 — Representación de trabajadores en SST',
      'D.S. 005-2012-TR, Art. 42-75 — Organización, funciones y garantías del Comité SST',
      'R.M. 148-2012-TR — Guía para la elección de los representantes de los trabajadores',
    ],
    metadata: {
      tipo: 'comite',
      cantidadMiembros: miembros.length,
      titularesPorParte: titularesEmpleador.length,
      mandatoAnos: mandato,
      fechaActa: params.fechaActa,
      fechaEleccion: params.fechaEleccion,
      presidente: params.presidente,
      secretario: params.secretario,
    },
  }
}

/* ── Variante Supervisor (empresas <20) ────────────────────────────── */

function generarActaSupervisor(
  params: ActaComiteSstParams,
  org: GeneratorOrgContext,
): GeneratedDocument {
  if (!params.supervisorNombre || !params.supervisorDni) {
    throw new Error('Para tipo=supervisor se requiere supervisorNombre y supervisorDni.')
  }

  const fechaLegible = formatFechaLegible(params.fechaActa)
  const mandato = params.mandatoAnos ?? 2
  const lugar = params.lugarActa || 'el centro de trabajo'

  const sections: GeneratedSection[] = [
    {
      id: 'encabezado',
      numbering: 'I',
      title: 'Acta de Designación del Supervisor de SST',
      content: `En ${lugar}, a los **${fechaLegible}**, se deja constancia de la **designación del Supervisor de Seguridad y Salud en el Trabajo** de **${org.razonSocial}** (RUC ${org.ruc || '—'}), empresa que cuenta con ${org.totalWorkers} trabajadores activos.\n\nAl contar con menos de 20 trabajadores, corresponde designar un **Supervisor de SST** en lugar de conformar un Comité, conforme al Art. 30 de la Ley 29783 y Art. 40 del D.S. 005-2012-TR.`,
      baseLegal: 'Ley 29783, Art. 30 · D.S. 005-2012-TR, Art. 40',
    },
    {
      id: 'supervisor',
      numbering: 'II',
      title: 'Supervisor de SST Designado',
      content: `Se designa como **Supervisor de Seguridad y Salud en el Trabajo** a:\n\n**${params.supervisorNombre}**\nDNI: ${params.supervisorDni}\n${params.supervisorCargo ? `Cargo: ${params.supervisorCargo}\n` : ''}\nLa designación fue realizada mediante: *${params.modoDesignacion ?? 'designación del empleador con aceptación del trabajador'}*.\n\nEl Supervisor actúa con **autonomía e imparcialidad** y no podrá ser objeto de discriminación, despido ni traslado sin justa causa durante el ejercicio de sus funciones.`,
      baseLegal: 'Ley 29783, Art. 30',
    },
    {
      id: 'funciones',
      numbering: 'III',
      title: 'Funciones del Supervisor SST',
      content: `El Supervisor tiene las siguientes funciones (analógicas a las del Comité, Art. 52 D.S. 005-2012-TR):\n\n1. Vigilar el cumplimiento de la normativa legal de SST y de los procedimientos internos\n2. Participar en la elaboración y aprobación del **Plan Anual de SST**\n3. Participar en la elaboración del **Programa de Capacitación en SST**\n4. Investigar las causas de accidentes e incidentes y proponer medidas correctivas\n5. Realizar inspecciones periódicas a las áreas de trabajo\n6. Consolidar y analizar las recomendaciones de los trabajadores\n7. Reportar a la gerencia el estado de cumplimiento de la normativa SST\n8. Coordinar con los servicios de salud ocupacional la vigilancia médica de los trabajadores\n\nEl Supervisor debe **participar al menos una vez al año** en capacitación especializada en SST a cargo del empleador.`,
      baseLegal: 'D.S. 005-2012-TR, Art. 40-41 · Art. 52',
    },
    {
      id: 'mandato',
      numbering: 'IV',
      title: 'Mandato y Vigencia',
      content: `La designación tiene vigencia de **${mandato} ${mandato === 1 ? 'año' : 'años'}**, contados desde la fecha de la presente Acta. Al término del mandato podrá ratificarse o designarse un nuevo Supervisor.\n\nSi la empresa alcanza **20 o más trabajadores** durante la vigencia de este mandato, corresponderá conformar un Comité SST paritario en reemplazo del Supervisor (Art. 43 D.S. 005-2012-TR), dentro de los 30 días posteriores al cambio de tamaño.`,
      baseLegal: 'D.S. 005-2012-TR, Art. 43, 62',
    },
    {
      id: 'garantias',
      numbering: 'V',
      title: 'Garantías y Facilidades',
      content: `El empleador otorga al Supervisor:\n\n- Acceso a la información necesaria para el cumplimiento de sus funciones\n- Tiempo pagado para realizar inspecciones, capacitaciones y gestiones relacionadas con SST\n- Capacitación especializada en SST al menos una vez al año\n- Protección contra actos de discriminación, despido o traslado sin justa causa\n- Recursos materiales necesarios para el desempeño de su función`,
      baseLegal: 'Ley 29783, Art. 30 · D.S. 005-2012-TR, Art. 73',
    },
    {
      id: 'cierre',
      numbering: 'VI',
      title: 'Cierre del Acta',
      content: `Firman el empleador y el Supervisor designado en señal de conformidad:\n\n_____________________________________\n**${org.representanteLegal ?? 'Representante Legal'}**\n${org.cargoRepresentante ?? 'Gerente General'}\n${org.razonSocial}\n\n_____________________________________\n**${params.supervisorNombre}**\nSupervisor de SST · DNI ${params.supervisorDni}`,
      baseLegal: 'D.S. 005-2012-TR, Art. 59',
    },
  ]

  const markdown = buildActaMarkdown(org, fechaLegible, lugar, sections)

  return {
    type: 'acta-comite-sst',
    title: `Acta de Designación del Supervisor SST — ${org.razonSocial}`,
    markdown,
    sections,
    legalBasis: [
      'Ley 29783, Art. 30',
      'D.S. 005-2012-TR, Art. 40-41, 62',
    ],
    metadata: {
      tipo: 'supervisor',
      supervisorNombre: params.supervisorNombre,
      supervisorDni: params.supervisorDni,
      mandatoAnos: mandato,
      fechaActa: params.fechaActa,
    },
  }
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function buildActaMarkdown(
  org: GeneratorOrgContext,
  fecha: string,
  lugar: string,
  sections: GeneratedSection[],
): string {
  const header = `# ${sections[0].title.toUpperCase()}

**Empresa:** ${org.razonSocial}
**RUC:** ${org.ruc}
**Lugar:** ${lugar}
**Fecha:** ${fecha}
**Base legal:** Ley 29783, Art. 29-30; D.S. 005-2012-TR, Art. 42-75

---

`
  const body = sections
    .slice(1)
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

function calcularFin(fechaIso: string, anos: number): string {
  try {
    const d = new Date(fechaIso)
    d.setFullYear(d.getFullYear() + anos)
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return `${anos} año${anos === 1 ? '' : 's'} después`
  }
}
