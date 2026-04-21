/**
 * Generador: Política de Seguridad y Salud en el Trabajo
 *
 * Base legal: Art. 22 Ley 29783 + Art. 32 D.S. 005-2012-TR
 *
 * Los 8 elementos OBLIGATORIOS que toda política SST debe contener:
 *  1. Compromiso de protección de la vida, salud, integridad física
 *  2. Cumplimiento de requisitos legales
 *  3. Consulta y participación de trabajadores (Comité / Supervisor SST)
 *  4. Mejora continua del sistema SST
 *  5. Respeto al trabajador (derechos, dignidad)
 *  6. Integración SST con otros sistemas de gestión
 *  7. Prevención de lesiones y enfermedades
 *  8. Comunicación y difusión de la política
 *
 * El generador produce markdown estructurado + sections; el PDF se arma
 * con el generador compartido server-pdf.ts.
 */
import type { GeneratedDocument, GeneratedSection, GeneratorOrgContext } from './types'

export interface PoliticaSstParams {
  /** Alcance: toda la empresa o solo ciertas áreas. */
  alcance: 'toda-empresa' | 'areas-especificas'
  /** Lista de áreas (si alcance=areas-especificas). */
  areasEspecificas?: string[]
  /** Actividades principales (ej. construcción, oficina, manufactura). */
  actividadesPrincipales: string
  /** Tiene Comité SST (20+ trabajadores) o Supervisor SST (<20). */
  tipoRepresentacion: 'comite' | 'supervisor'
  /** Sistemas de gestión con los que integra (ej. ISO 9001, ISO 14001, calidad). */
  sistemasIntegrados?: string[]
  /** Fecha de aprobación (ISO). */
  fechaAprobacion: string
  /** Vigencia en años (default 1). */
  vigenciaAnos?: number
  /** Compromisos adicionales opcionales del empleador. */
  compromisosAdicionales?: string[]
}

export function generarPoliticaSst(
  params: PoliticaSstParams,
  org: GeneratorOrgContext,
): GeneratedDocument {
  const fechaLegible = formatFechaLegible(params.fechaAprobacion)
  const vigencia = params.vigenciaAnos ?? 1

  const alcanceTexto =
    params.alcance === 'toda-empresa'
      ? `Esta política se aplica a **todas las operaciones, áreas, procesos y centros de trabajo** de ${org.razonSocial}, incluyendo a todo el personal bajo cualquier modalidad de contratación (régimen laboral general, MYPE, practicantes, terceros, visitantes y contratistas dentro de las instalaciones).`
      : `Esta política se aplica a las siguientes áreas de ${org.razonSocial}: ${(params.areasEspecificas ?? []).map((a) => `**${a}**`).join(', ')}, incluyendo a todo el personal que desarrolla actividades en ellas.`

  const representacionTexto =
    params.tipoRepresentacion === 'comite'
      ? 'el **Comité de Seguridad y Salud en el Trabajo**, de conformidad con los artículos 29 y 43 de la Ley 29783'
      : 'el **Supervisor de Seguridad y Salud en el Trabajo** designado, de conformidad con el artículo 30 de la Ley 29783'

  const sistemasIntegrados = params.sistemasIntegrados?.length
    ? `, integrándola con los sistemas de gestión vigentes (${params.sistemasIntegrados.join(', ')})`
    : ''

  const compromisosExtra =
    params.compromisosAdicionales
      ?.filter((c) => c.trim().length > 0)
      .map((c) => `- ${c.trim()}`) ?? []

  /* ══ Secciones estructuradas ══ */

  const sections: GeneratedSection[] = [
    {
      id: 'alcance',
      numbering: 'I',
      title: 'Alcance',
      content: alcanceTexto,
      baseLegal: 'Art. 22 Ley 29783',
    },
    {
      id: 'elemento-1',
      numbering: '1',
      title: 'Protección de la vida, salud e integridad física',
      content: `**${org.razonSocial}** asume el compromiso de proteger la seguridad y salud de todos los trabajadores, considerando la vida humana como el valor supremo. Adoptaremos las medidas de prevención necesarias para preservar la integridad física, mental y social de nuestro personal en el desarrollo de las actividades ${params.actividadesPrincipales.toLowerCase()}.`,
      baseLegal: 'Art. 22-a Ley 29783',
    },
    {
      id: 'elemento-2',
      numbering: '2',
      title: 'Cumplimiento de requisitos legales y otros aplicables',
      content: `Nos comprometemos a cumplir con la Ley 29783 y su reglamento D.S. 005-2012-TR, así como con todas las normas técnicas, resoluciones ministeriales, directivas SUNAFIL, normas sectoriales aplicables y compromisos voluntarios que ${org.razonSocial} suscriba en materia de seguridad y salud en el trabajo.`,
      baseLegal: 'Art. 22-b Ley 29783',
    },
    {
      id: 'elemento-3',
      numbering: '3',
      title: 'Consulta y participación de los trabajadores',
      content: `Promoveremos la consulta y participación activa de los trabajadores y sus representantes en todos los aspectos del Sistema de Gestión de SST, canalizada a través de ${representacionTexto}. Los trabajadores tienen derecho a ser informados, consultados, capacitados y a participar en la identificación de peligros, evaluación de riesgos y definición de controles.`,
      baseLegal: 'Art. 22-c Ley 29783',
    },
    {
      id: 'elemento-4',
      numbering: '4',
      title: 'Mejora continua del sistema de gestión SST',
      content: `El Sistema de Gestión de SST de ${org.razonSocial} se someterá a revisión periódica por la Alta Dirección con el fin de identificar oportunidades de mejora, prevenir accidentes y enfermedades ocupacionales, y optimizar el desempeño${sistemasIntegrados}. La revisión será al menos anual e incluirá indicadores, no-conformidades, acciones correctivas y preventivas.`,
      baseLegal: 'Art. 22-d Ley 29783',
    },
    {
      id: 'elemento-5',
      numbering: '5',
      title: 'Respeto al trabajador y sus derechos',
      content: `Reconocemos y respetamos los derechos de los trabajadores en materia de SST: información, formación, consulta, participación, paralización de actividades ante peligro inminente, no sufrir represalias por denunciar riesgos y recibir protección efectiva sin discriminación alguna por razón de género, edad, origen o condición.`,
      baseLegal: 'Art. 22-e Ley 29783 · Art. 75 D.S. 005-2012-TR',
    },
    {
      id: 'elemento-6',
      numbering: '6',
      title: 'Integración con otros sistemas de gestión',
      content: params.sistemasIntegrados?.length
        ? `La gestión de SST se integrará con los sistemas existentes en ${org.razonSocial}: ${params.sistemasIntegrados.map((s) => `**${s}**`).join(', ')}. Los procedimientos, registros y responsabilidades se coordinarán para evitar duplicidad y garantizar eficacia.`
        : `La gestión de SST se alineará con los demás sistemas de gestión que la empresa adopte (calidad, ambiental, compliance), compartiendo procedimientos y recursos cuando sea aplicable.`,
      baseLegal: 'Art. 22-f Ley 29783',
    },
    {
      id: 'elemento-7',
      numbering: '7',
      title: 'Prevención de lesiones, dolencias y enfermedades ocupacionales',
      content: `Nos comprometemos a identificar los peligros, evaluar los riesgos y aplicar las medidas de control apropiadas según la jerarquía: eliminación, sustitución, controles de ingeniería, señalización, controles administrativos y, en último lugar, equipos de protección personal (EPP). Aplicaremos el principio de prevención en origen y la protección colectiva por encima de la individual.`,
      baseLegal: 'Art. 22-g Ley 29783 · R.M. 050-2013-TR',
    },
    {
      id: 'elemento-8',
      numbering: '8',
      title: 'Comunicación y difusión de la política',
      content: `Esta política será comunicada a todos los trabajadores al momento de su ingreso, difundida periódicamente mediante capacitaciones, exhibida en lugares visibles del centro de trabajo y puesta a disposición de las partes interesadas (autoridades, clientes, contratistas, proveedores). Será revisada al menos anualmente y actualizada ante cambios significativos en las actividades.`,
      baseLegal: 'Art. 22-h Ley 29783',
    },
    ...(compromisosExtra.length > 0
      ? [
          {
            id: 'compromisos-adicionales',
            numbering: '9',
            title: 'Compromisos adicionales del empleador',
            content: compromisosExtra.join('\n'),
            baseLegal: 'Art. 23 Ley 29783',
            editable: true,
          },
        ]
      : []),
    {
      id: 'aprobacion',
      numbering: 'II',
      title: 'Aprobación y vigencia',
      content: `La presente Política de Seguridad y Salud en el Trabajo ha sido aprobada por el máximo nivel gerencial de ${org.razonSocial} el **${fechaLegible}** y tendrá vigencia de **${vigencia} ${vigencia === 1 ? 'año' : 'años'}**, siendo revisada al vencimiento de dicho plazo o antes, ante cambios significativos en las operaciones, la normativa o el entorno.\n\nEstará firmada por:\n- **${org.representanteLegal ?? '[Representante Legal]'}** — ${org.cargoRepresentante ?? 'Gerente General / Representante Legal'}`,
      baseLegal: 'Art. 22 Ley 29783 · Art. 32 D.S. 005-2012-TR',
    },
  ]

  /* ══ Markdown consolidado ══ */

  const markdown = buildMarkdown(org, fechaLegible, sections)

  return {
    type: 'politica-sst',
    title: `Política de Seguridad y Salud en el Trabajo — ${org.razonSocial}`,
    markdown,
    sections,
    legalBasis: [
      'Ley 29783 — Ley de Seguridad y Salud en el Trabajo, Art. 22',
      'D.S. 005-2012-TR — Reglamento de la Ley 29783, Art. 32',
      'R.M. 050-2013-TR — Formatos referenciales SST',
    ],
    metadata: {
      alcance: params.alcance,
      tipoRepresentacion: params.tipoRepresentacion,
      fechaAprobacion: params.fechaAprobacion,
      vigenciaAnos: vigencia,
      sistemasIntegrados: params.sistemasIntegrados ?? [],
    },
  }
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function buildMarkdown(
  org: GeneratorOrgContext,
  fecha: string,
  sections: GeneratedSection[],
): string {
  const header = `# POLÍTICA DE SEGURIDAD Y SALUD EN EL TRABAJO

**Empresa:** ${org.razonSocial}
**RUC:** ${org.ruc}
${org.domicilio ? `**Domicilio:** ${org.domicilio}\n` : ''}**Fecha de aprobación:** ${fecha}
**Base legal:** Ley 29783, Art. 22; D.S. 005-2012-TR, Art. 32

---

`
  const body = sections
    .map((s) => {
      return `## ${s.numbering}. ${s.title}\n\n${s.content}${
        s.baseLegal ? `\n\n*Base legal: ${s.baseLegal}*` : ''
      }\n`
    })
    .join('\n')

  const footer = `\n---\n\n**${org.representanteLegal ?? 'Representante Legal'}**
${org.cargoRepresentante ?? 'Gerente General'}
${org.razonSocial}
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
