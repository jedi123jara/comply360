/**
 * Generador: Política contra el Hostigamiento Sexual
 *
 * Base legal:
 *  - Ley 27942 (Ley de Prevención y Sanción del Hostigamiento Sexual)
 *  - D.S. 014-2019-MIMP (Reglamento de la Ley 27942)
 *  - Ley 29430 (modificatoria)
 *
 * Contenido mínimo exigido por el reglamento:
 *  1. Declaración de compromiso con la prevención
 *  2. Definición de hostigamiento sexual
 *  3. Modalidades: quid pro quo + ambiente hostil
 *  4. Comité de Intervención (CIHSO)
 *  5. Canal de denuncia (confidencial)
 *  6. Medidas de protección para víctimas y testigos
 *  7. Procedimiento de investigación (30 días hábiles)
 *  8. Sanciones disciplinarias
 *  9. Medidas de prevención y capacitación
 * 10. No represalias
 * 11. Registro anonimizado de denuncias
 *
 * Aplica a empresas con 1+ trabajador (no tiene mínimo de tamaño).
 */
import type { GeneratedDocument, GeneratedSection, GeneratorOrgContext } from './types'

export interface PoliticaHostigamientoParams {
  /** Canal de denuncia elegido (email dedicado, formulario web, teléfono). */
  canalDenuncia: {
    tipo: 'email' | 'web' | 'telefono' | 'multiple'
    email?: string
    urlFormulario?: string
    telefono?: string
  }
  /** Miembros del CIHSO: representante empleador + representante trabajadores (+ suplentes). */
  cihso: {
    representanteEmpleador: string
    suplenteEmpleador?: string
    representanteTrabajadores: string
    suplenteTrabajadores?: string
    /** Cómo fue elegido el representante de trabajadores (elección, designación). */
    formaEleccion?: string
  }
  /** Fecha de aprobación (ISO). */
  fechaAprobacion: string
  /** Vigencia en años (default 2). */
  vigenciaAnos?: number
  /** Capacitaciones anuales planificadas (mínimo 1 según reglamento). */
  capacitacionesAnualesMin: number
}

export function generarPoliticaHostigamiento(
  params: PoliticaHostigamientoParams,
  org: GeneratorOrgContext,
): GeneratedDocument {
  const fechaLegible = formatFechaLegible(params.fechaAprobacion)
  const vigencia = params.vigenciaAnos ?? 2
  const capacitaciones = Math.max(1, params.capacitacionesAnualesMin)

  const canalDenunciaText = buildCanalDenunciaText(params.canalDenuncia)

  const sections: GeneratedSection[] = [
    {
      id: 'declaracion',
      numbering: 'I',
      title: 'Declaración de Política y Tolerancia Cero',
      content: `**${org.razonSocial}** declara su **tolerancia cero** ante cualquier acto de hostigamiento sexual, reafirmando su compromiso con la creación de un ambiente laboral libre de violencia, basado en el respeto a la dignidad, integridad física, psicológica y sexual de todas las personas que laboran en la organización, sin distinción de género, orientación sexual, edad, cargo jerárquico o condición contractual.\n\nTodo trabajador, practicante, prestador de servicios o tercero que realice actividades en las instalaciones de ${org.razonSocial} está sujeto a esta política y al procedimiento que de ella deriva.`,
      baseLegal: 'Art. 3 Ley 27942 · Art. 5 D.S. 014-2019-MIMP',
    },
    {
      id: 'definicion',
      numbering: 'II',
      title: 'Definición de Hostigamiento Sexual',
      content: `El hostigamiento sexual es una forma de violencia que se configura mediante conductas de naturaleza o connotación sexual o sexista NO DESEADAS por la persona contra la que van dirigidas, y que puedan crear un ambiente intimidatorio, hostil o humillante, o afectar su actividad o situación laboral.\n\nNo se requiere acreditar rechazo expreso del hostigado para que la conducta sea sancionable. No se requiere reiteración: basta un solo acto grave.`,
      baseLegal: 'Art. 4 Ley 27942 · Art. 6 D.S. 014-2019-MIMP',
    },
    {
      id: 'modalidades',
      numbering: 'III',
      title: 'Modalidades del Hostigamiento Sexual',
      content: `Se reconocen dos modalidades:\n\n**a) Chantaje sexual (quid pro quo):** cuando se condiciona un beneficio laboral (contratación, ascenso, mejora salarial, permanencia) o se amenaza con un perjuicio (despido, sanción, no renovación) a cambio de aceptación sexual.\n\n**b) Ambiente hostil:** cuando las conductas generan un clima intimidatorio, humillante o hostil que afecta el desempeño o bienestar de la víctima, aun cuando no exista condicionamiento directo.\n\nEjemplos incluyen (lista no exhaustiva): comentarios sexuales ofensivos, chistes de contenido sexual, tocamientos, miradas lascivas, exhibición de material pornográfico, acoso por medios digitales (WhatsApp, correo, redes sociales), difusión de imágenes íntimas sin consentimiento.`,
      baseLegal: 'Art. 5 Ley 27942 · Art. 7 D.S. 014-2019-MIMP',
    },
    {
      id: 'cihso',
      numbering: 'IV',
      title: 'Comité de Intervención contra el Hostigamiento Sexual (CIHSO)',
      content: `Se constituye el **Comité de Intervención contra el Hostigamiento Sexual (CIHSO)** de ${org.razonSocial}, órgano colegiado encargado de recibir, investigar y resolver las denuncias.\n\n**Composición (2 titulares + 2 suplentes):**\n- Representante del empleador: **${params.cihso.representanteEmpleador}**${params.cihso.suplenteEmpleador ? ` (suplente: ${params.cihso.suplenteEmpleador})` : ''}\n- Representante de los trabajadores: **${params.cihso.representanteTrabajadores}**${params.cihso.suplenteTrabajadores ? ` (suplente: ${params.cihso.suplenteTrabajadores})` : ''}${params.cihso.formaEleccion ? `\n\n**Forma de elección del representante de trabajadores:** ${params.cihso.formaEleccion}.` : ''}\n\nLos miembros del CIHSO cesarán sus funciones ante conflicto de interés respecto a un caso específico. El CIHSO tiene deber de confidencialidad bajo responsabilidad.`,
      baseLegal: 'Art. 19-21 D.S. 014-2019-MIMP',
    },
    {
      id: 'canal-denuncia',
      numbering: 'V',
      title: 'Canal de Denuncia',
      content: `Las denuncias se reciben a través del siguiente canal confidencial:\n\n${canalDenunciaText}\n\n**Cualquier persona puede denunciar:** la víctima, cualquier testigo, compañero de trabajo, jefe inmediato, sindicato o representante de trabajadores. La denuncia puede presentarse de manera verbal o escrita, identificada o anónima (aunque la identificación facilita la investigación y las medidas de protección).\n\n**La empresa se compromete a:**\n- Garantizar la confidencialidad absoluta durante todo el proceso\n- Resguardar la identidad del denunciante y de los testigos\n- No revictimizar al denunciante mediante preguntas inadecuadas o culpabilizantes`,
      baseLegal: 'Art. 31-32 D.S. 014-2019-MIMP',
    },
    {
      id: 'medidas-proteccion',
      numbering: 'VI',
      title: 'Medidas de Protección',
      content: `Dentro de las **72 horas** de recibida la denuncia, el CIHSO debe dictar medidas de protección a favor de la víctima, incluso antes de concluir la investigación. Las medidas pueden incluir (sin perjuicio de otras):\n\n1. Rotación de la persona denunciada a otra área o turno\n2. Suspensión temporal del denunciado con goce de haber\n3. Prohibición de contacto directo denunciado-víctima\n4. Cambio de lugar de trabajo de la víctima (nunca como sanción)\n5. Teletrabajo o licencia con goce de haber para la víctima\n6. Asistencia psicológica a cargo del empleador\n7. Rotación del turno del denunciado\n\nLas medidas son dinámicas y pueden modificarse según el desarrollo del proceso.`,
      baseLegal: 'Art. 14 Ley 27942 · Art. 35-36 D.S. 014-2019-MIMP',
    },
    {
      id: 'procedimiento',
      numbering: 'VII',
      title: 'Procedimiento de Investigación',
      content: `**Plazo máximo total: 30 días hábiles** desde la recepción de la denuncia.\n\n**Fases:**\n\n1. **Recepción y clasificación** (día 0-1): El CIHSO recibe la denuncia, asigna código único, emite constancia al denunciante y evalúa competencia.\n2. **Medidas de protección** (día 1-3): Dictado de medidas de protección inmediatas.\n3. **Instrucción** (día 4-20): Se escucha al denunciante, al denunciado (garantizando derecho de defensa y debido proceso), se toma declaración de testigos, se analizan evidencias (correos, mensajes, grabaciones, registros).\n4. **Informe de conclusiones** (día 21-25): El CIHSO emite informe fundamentado con los hechos probados.\n5. **Resolución** (día 26-30): La alta dirección adopta decisión final dentro de los 5 días hábiles siguientes al informe del CIHSO.\n\nDurante todo el proceso rige la **presunción de inocencia** y el **debido proceso** para ambas partes.`,
      baseLegal: 'Art. 36-40 D.S. 014-2019-MIMP',
    },
    {
      id: 'sanciones',
      numbering: 'VIII',
      title: 'Sanciones Disciplinarias',
      content: `De comprobarse el hostigamiento sexual, corresponde aplicar las siguientes sanciones según gravedad:\n\n**Faltas leves:** amonestación escrita, suspensión sin goce de haber de 1 a 3 días.\n**Faltas graves:** suspensión sin goce de haber de 4 a 30 días.\n**Faltas muy graves:** **despido sin derecho a indemnización** por tratarse de falta grave tipificada en el Art. 25 D.S. 003-97-TR (acto contra la moral) y Art. 8 Ley 27942.\n\nLa sanción no excluye responsabilidad penal (delito de hostigamiento, Art. 176-B Código Penal), civil (daños y perjuicios) ni administrativa (multa SUNAFIL hasta 2.63 UIT según D.S. 019-2006-TR).`,
      baseLegal: 'Art. 8 Ley 27942 · Art. 42 D.S. 014-2019-MIMP · Art. 25 D.S. 003-97-TR',
    },
    {
      id: 'prevencion',
      numbering: 'IX',
      title: 'Prevención y Capacitación',
      content: `${org.razonSocial} se compromete a:\n\n- Realizar como mínimo **${capacitaciones} ${capacitaciones === 1 ? 'capacitación anual' : 'capacitaciones anuales'}** en prevención del hostigamiento sexual para todo el personal.\n- Incluir el tema en la inducción obligatoria de nuevos trabajadores.\n- Difundir esta política por los canales internos (correo, murales, intranet).\n- Sensibilizar en el uso de lenguaje no sexista y respeto a la diversidad.\n- Publicar estadísticas anuales anonimizadas del número de denuncias recibidas y su estado.`,
      baseLegal: 'Art. 11 Ley 27942 · Art. 16 D.S. 014-2019-MIMP',
    },
    {
      id: 'no-represalias',
      numbering: 'X',
      title: 'Prohibición de Represalias',
      content: `Queda **absolutamente prohibido** tomar represalias contra la víctima, sus testigos o cualquier persona que haya participado de buena fe en una investigación. Constituyen represalias: despido, traslado no consentido, reducción salarial, desmejora de condiciones laborales, obstaculización de ascensos, acoso psicológico posterior.\n\nLa realización de represalias constituye una falta grave adicional y será sancionada de manera agravada. La víctima de represalias puede activar nuevamente el procedimiento de denuncia o iniciar acciones legales ante SUNAFIL o el Poder Judicial.`,
      baseLegal: 'Art. 12 Ley 27942 · Art. 38 D.S. 014-2019-MIMP',
    },
    {
      id: 'registro',
      numbering: 'XI',
      title: 'Registro Anonimizado y Reporte a MTPE',
      content: `El CIHSO mantendrá un **registro anonimizado** de las denuncias recibidas que incluirá: código, tipo de modalidad, estado del proceso, medidas de protección aplicadas, resolución y sanción (si corresponde).\n\nAnualmente, dentro del primer trimestre, ${org.razonSocial} reportará al **Ministerio de Trabajo y Promoción del Empleo (MTPE)** las estadísticas agregadas conforme al Art. 19 D.S. 014-2019-MIMP y podrá auditarse por SUNAFIL como evidencia de cumplimiento.`,
      baseLegal: 'Art. 19 D.S. 014-2019-MIMP',
    },
    {
      id: 'aprobacion',
      numbering: 'XII',
      title: 'Aprobación, Vigencia y Difusión',
      content: `Esta política ha sido aprobada el **${fechaLegible}** por el máximo nivel gerencial de ${org.razonSocial}, tiene vigencia de **${vigencia} ${vigencia === 1 ? 'año' : 'años'}** y será revisada al vencimiento o ante cambios normativos.\n\nSerá difundida mediante: (a) publicación en la intranet, (b) envío por correo corporativo a todos los trabajadores, (c) exhibición en murales del centro de trabajo, (d) entrega en la inducción obligatoria y (e) capacitaciones anuales.\n\nFirmada por: **${org.representanteLegal ?? '[Representante Legal]'}** — ${org.cargoRepresentante ?? 'Gerente General'}`,
      baseLegal: 'Art. 5 D.S. 014-2019-MIMP',
    },
  ]

  const markdown = buildMarkdown(org, fechaLegible, sections)

  return {
    type: 'politica-hostigamiento',
    title: `Política de Prevención del Hostigamiento Sexual — ${org.razonSocial}`,
    markdown,
    sections,
    legalBasis: [
      'Ley 27942 — Prevención y Sanción del Hostigamiento Sexual',
      'D.S. 014-2019-MIMP — Reglamento de la Ley 27942',
      'Ley 29430 — Modificatoria',
      'Art. 176-B Código Penal',
      'Art. 25 D.S. 003-97-TR — Falta grave laboral',
    ],
    metadata: {
      canalDenuncia: params.canalDenuncia,
      cihso: params.cihso,
      fechaAprobacion: params.fechaAprobacion,
      vigenciaAnos: vigencia,
      capacitacionesAnualesMin: capacitaciones,
    },
  }
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function buildCanalDenunciaText(canal: PoliticaHostigamientoParams['canalDenuncia']): string {
  const parts: string[] = []
  if (canal.email) parts.push(`**Correo electrónico dedicado:** ${canal.email}`)
  if (canal.urlFormulario) parts.push(`**Formulario web confidencial:** ${canal.urlFormulario}`)
  if (canal.telefono) parts.push(`**Teléfono confidencial:** ${canal.telefono}`)
  if (parts.length === 0) {
    return '*(Canal de denuncia por definir — el CIHSO establecerá al menos un medio confidencial de recepción.)*'
  }
  return parts.map((p) => `- ${p}`).join('\n')
}

function buildMarkdown(
  org: GeneratorOrgContext,
  fecha: string,
  sections: GeneratedSection[],
): string {
  const header = `# POLÍTICA DE PREVENCIÓN DEL HOSTIGAMIENTO SEXUAL

**Empresa:** ${org.razonSocial}
**RUC:** ${org.ruc}
${org.domicilio ? `**Domicilio:** ${org.domicilio}\n` : ''}**Fecha de aprobación:** ${fecha}
**Base legal:** Ley 27942; D.S. 014-2019-MIMP; Ley 29430

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

  const footer = `\n---\n\n**${org.representanteLegal ?? 'Representante Legal'}**
${org.cargoRepresentante ?? 'Gerente General'}
${org.razonSocial}

*Este documento debe ser exhibido de forma visible en el centro de trabajo, difundido a todos los trabajadores y reportado anualmente al MTPE conforme al Art. 19 del D.S. 014-2019-MIMP.*
`
  return header + body + footer
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
