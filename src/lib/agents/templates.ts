/**
 * Marketplace de templates de agentes por industria.
 *
 * Cada template enriquece el prompt base con contexto sectorial peruano:
 * artículos normativos específicos, riesgos típicos, palabras clave para
 * detectar en los documentos, y ajustes al tono del output.
 *
 * Industrias cubiertas v1:
 *  - Construcción civil (Régimen Construcción + Resolución Convencional)
 *  - Retail / comercio (jornadas extraordinarias, horas extras, domingos)
 *  - Manufactura (SST Ley 29783, ruido, riesgos mecánicos)
 *  - Agroindustria (Régimen agrario Ley 31110)
 *  - Minería (seguridad minera, DS 024-2016-EM)
 *  - Tecnología / servicios (teletrabajo Ley 31572)
 *  - Transporte (jornadas conductores, DS 005-2022-MTC)
 */

export type IndustrySlug =
  | 'construccion'
  | 'retail'
  | 'manufactura'
  | 'agroindustria'
  | 'mineria'
  | 'tecnologia'
  | 'transporte'
  | 'generico'

export interface AgentTemplate {
  slug: IndustrySlug
  name: string
  description: string
  /** Agentes que soporta este template */
  applicableAgents: string[]
  /** Normas específicas del sector */
  normas: string[]
  /** Riesgos típicos fiscalizados por SUNAFIL en el sector */
  riesgosComunes: string[]
  /** Palabras clave para detectar en documentos */
  keywordsClave: string[]
  /** Instrucciones adicionales al prompt del agente */
  promptAdicional: string
  /** Ponderadores de severidad por categoría de riesgo */
  severityWeights?: Record<string, number>
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    slug: 'construccion',
    name: 'Construcción Civil',
    description:
      'Empresas constructoras, contratistas de obra, edificación. Régimen de Construcción Civil.',
    applicableAgents: ['sunafil-analyzer', 'descargo-writer', 'risk-monitor', 'payslip-auditor'],
    normas: [
      'D.S. 003-97-TR (Ley de Productividad)',
      'Resolución Convencional Federación de Construcción Civil',
      'Ley 30222 (Modificatoria Ley SST)',
      'D.S. 005-2012-TR (Reglamento Ley SST)',
      'G.050 Seguridad durante la construcción',
    ],
    riesgosComunes: [
      'No entrega de EPP certificado',
      'Trabajo en alturas sin arnés',
      'Accidentes graves/fatales (NTP 399.010)',
      'Pago bajo del Bono Unificado de Construcción (BUC)',
      'No afiliación al CONAFOVICER',
      'Contratación fraudulenta bajo régimen general en lugar de construcción',
    ],
    keywordsClave: [
      'obra',
      'edificación',
      'andamio',
      'arnés',
      'EPP',
      'BUC',
      'CONAFOVICER',
      'categoría',
      'operario',
      'oficial',
      'peón',
    ],
    promptAdicional:
      'CONTEXTO INDUSTRIAL: construcción civil peruana. Verifica especialmente: (1) pago del Bono Unificado de Construcción según tabla vigente, (2) aportes a CONAFOVICER (2% del jornal básico), (3) cumplimiento de la Norma G.050 en SST, (4) correcto registro por categoría (operario/oficial/peón). Las multas en construcción son mayores por el alto riesgo de accidentes fatales.',
    severityWeights: { SST: 1.5, REMUNERACION: 1.2 },
  },
  {
    slug: 'retail',
    name: 'Retail / Comercio',
    description: 'Tiendas, supermercados, cadenas comerciales, ecommerce con tienda física.',
    applicableAgents: ['sunafil-analyzer', 'descargo-writer', 'risk-monitor', 'payslip-auditor'],
    normas: [
      'D.S. 007-2002-TR (Jornada y horario de trabajo)',
      'Ley 27671 (Descanso dominical)',
      'Ley 27735 (Gratificaciones Fiestas Patrias y Navidad)',
      'D.S. 005-2002-TR (Reglamento)',
    ],
    riesgosComunes: [
      'Horas extras no pagadas',
      'Trabajo en domingos sin descanso sustitutorio',
      'Jornada acumulativa mal calculada',
      'No pago de bonificación por trabajo nocturno (nocturnidad 35%)',
      'Contratos a tiempo parcial usados indebidamente para evitar beneficios',
      'No registro de ingreso/salida de trabajadores',
    ],
    keywordsClave: [
      'tienda',
      'caja',
      'punto de venta',
      'cajero',
      'reponedor',
      'supervisor',
      'turno',
      'horario comercial',
      'domingo',
    ],
    promptAdicional:
      'CONTEXTO INDUSTRIAL: retail peruano. Presta atención a: (1) horas extras con recargo 25%/35%, (2) trabajo dominical con descanso sustitutorio o pago doble, (3) nocturnidad 35%, (4) correcta clasificación tiempo parcial (<4h diarias) vs tiempo completo. El retail tiene alta rotación y SUNAFIL encuentra frecuentemente no-registro en planilla.',
  },
  {
    slug: 'manufactura',
    name: 'Manufactura / Industria',
    description: 'Plantas industriales, fábricas, procesos productivos.',
    applicableAgents: ['sunafil-analyzer', 'descargo-writer', 'risk-monitor'],
    normas: [
      'Ley 29783 (Ley de Seguridad y Salud en el Trabajo)',
      'D.S. 005-2012-TR (Reglamento SST)',
      'R.M. 375-2008-TR (Norma Básica de Ergonomía)',
      'R.M. 050-2013-TR (Anexos Planes SST)',
    ],
    riesgosComunes: [
      'Comité de SST no conformado (>20 trabajadores)',
      'IPERC no actualizado anualmente',
      'Exámenes médicos ocupacionales no realizados',
      'Capacitaciones en SST (4/año) no dictadas',
      'Registros SST incompletos (accidentes, incidentes, inspecciones)',
      'No implementación de sistema de gestión SST',
    ],
    keywordsClave: [
      'planta',
      'producción',
      'maquinaria',
      'operario',
      'IPERC',
      'comité SST',
      'ergonomía',
      'ruido',
      'EPP',
    ],
    promptAdicional:
      'CONTEXTO INDUSTRIAL: manufactura peruana bajo Ley 29783. Evalúa especialmente obligaciones SST: comité de SST paritario, IPERC actualizado, 4 capacitaciones anuales por trabajador, exámenes médicos ingreso/periódicos/cese, sistema de gestión SST documentado.',
    severityWeights: { SST: 2.0 },
  },
  {
    slug: 'agroindustria',
    name: 'Agroindustria',
    description: 'Empresas agroexportadoras, agrícolas, régimen agrario especial.',
    applicableAgents: ['sunafil-analyzer', 'descargo-writer', 'risk-monitor', 'payslip-auditor'],
    normas: [
      'Ley 31110 (Nuevo Régimen Laboral Agrario)',
      'D.S. 005-2021-MIDAGRI (Reglamento)',
      'D.S. 008-2020-SA (protocolos COVID agro)',
      'RMV agraria especial',
    ],
    riesgosComunes: [
      'Remuneración bajo la RMV agraria vigente',
      'Gratificaciones y CTS no pagadas (régimen agrario las incluye desde 2021)',
      'Bonificación extraordinaria del 9.72% mal calculada',
      'Jornada acumulativa de hasta 48h en campañas sin descanso compensatorio',
      'Trabajo infantil en fundos',
      'Transporte inseguro de trabajadores',
    ],
    keywordsClave: [
      'campo',
      'fundo',
      'cosecha',
      'cuadrilla',
      'jornalero',
      'agrícola',
      'export',
      'temporal',
    ],
    promptAdicional:
      'CONTEXTO INDUSTRIAL: agroindustria bajo Ley 31110. Verifica: (1) RMV agraria incrementada, (2) CTS, gratificaciones y utilidades pagadas como régimen general, (3) bonificación extraordinaria agraria 9.72%, (4) jornadas acumulativas documentadas con descanso compensatorio.',
  },
  {
    slug: 'mineria',
    name: 'Minería',
    description: 'Unidades mineras, contratistas mineros.',
    applicableAgents: ['sunafil-analyzer', 'descargo-writer', 'risk-monitor'],
    normas: [
      'D.S. 024-2016-EM (Reglamento de Seguridad y Salud Ocupacional en Minería)',
      'Ley 29783 (SST general)',
      'D.S. 023-2017-EM (modificatoria)',
      'Ley 27651 (formalización minera artesanal)',
    ],
    riesgosComunes: [
      'Fatalidades por desprendimiento de rocas',
      'Plan Anual de SSO no aprobado por gerente',
      'Capacitaciones específicas según puesto no dictadas',
      'Régimen de trabajo 14x7 / 20x10 mal compensado',
      'Subcontratación masiva sin control del titular',
      'Exposición a polvo/gases sin monitoreo',
    ],
    keywordsClave: [
      'mina',
      'socavón',
      'tajo',
      'supervisor de guardia',
      'ingeniero residente',
      'contratista minero',
      'EPP minero',
      'PETS',
      'PETAR',
    ],
    promptAdicional:
      'CONTEXTO INDUSTRIAL: minería peruana. Las fatalidades son críticas y SUNAFIL coordina con OSINERGMIN. Evalúa cumplimiento DS 024-2016-EM: PETS, PETAR, comité paritario, monitoreo de agentes ocupacionales, régimen especial de trabajo.',
    severityWeights: { SST: 2.5 },
  },
  {
    slug: 'tecnologia',
    name: 'Tecnología / Servicios',
    description: 'Software, consultoría, BPOs, servicios profesionales, startups.',
    applicableAgents: ['sunafil-analyzer', 'descargo-writer', 'risk-monitor', 'payslip-auditor'],
    normas: [
      'Ley 31572 (Ley del Teletrabajo)',
      'D.S. 002-2023-TR (Reglamento Teletrabajo)',
      'Ley 30709 (Igualdad salarial)',
    ],
    riesgosComunes: [
      'Contratos de locación de servicios encubriendo relación laboral',
      'Jornadas excesivas sin pago de horas extras (cultura startup)',
      'Incumplimiento política de desconexión digital',
      'No reembolso de gastos de teletrabajo',
      'Brecha salarial de género en roles técnicos',
      'Freelancers extranjeros sin documentación migratoria',
    ],
    keywordsClave: [
      'desarrollador',
      'programador',
      'product manager',
      'sprint',
      'on-call',
      'home office',
      'remoto',
      'locador',
      'RH electrónico',
    ],
    promptAdicional:
      'CONTEXTO INDUSTRIAL: tecnología / servicios profesionales. Presta especial atención a (1) desnaturalización de locación de servicios, (2) cumplimiento Ley 31572 (teletrabajo), (3) horas extras no pagadas por "cultura flexible", (4) brecha salarial Ley 30709.',
  },
  {
    slug: 'transporte',
    name: 'Transporte',
    description: 'Empresas de transporte terrestre, carga, pasajeros, logística.',
    applicableAgents: ['sunafil-analyzer', 'descargo-writer', 'risk-monitor'],
    normas: [
      'D.S. 005-2022-MTC (Jornadas y descansos conductores)',
      'Ley 28972 (conductores)',
      'Ley 29783 (SST)',
    ],
    riesgosComunes: [
      'Jornadas de conducción >10h continuas',
      'No descanso mínimo entre turnos (11h)',
      'Bitácoras falsificadas',
      'Trabajo nocturno sin bonificación',
      'Seguros SCTR vencidos',
    ],
    keywordsClave: ['conductor', 'chofer', 'ruta', 'bitácora', 'viaje', 'tracto', 'jornada'],
    promptAdicional:
      'CONTEXTO INDUSTRIAL: transporte terrestre. Enfócate en jornadas máximas de conducción (DS 005-2022-MTC), descansos entre turnos, y registro veraz de bitácoras. SCTR vigente es obligatorio.',
  },
  {
    slug: 'generico',
    name: 'Genérico (sin industria específica)',
    description: 'Template por defecto sin enriquecimiento sectorial.',
    applicableAgents: [
      'sunafil-analyzer',
      'descargo-writer',
      'risk-monitor',
      'payslip-auditor',
    ],
    normas: ['Normativa laboral peruana general'],
    riesgosComunes: [],
    keywordsClave: [],
    promptAdicional: '',
  },
]

export function getTemplate(slug: IndustrySlug): AgentTemplate | undefined {
  return AGENT_TEMPLATES.find(t => t.slug === slug)
}

export function listTemplates(agentSlug?: string): AgentTemplate[] {
  if (!agentSlug) return AGENT_TEMPLATES
  return AGENT_TEMPLATES.filter(t => t.applicableAgents.includes(agentSlug))
}

/**
 * Enriquece un prompt base con el contexto del template.
 */
export function enrichPromptWithTemplate(basePrompt: string, template: AgentTemplate | undefined): string {
  if (!template || template.slug === 'generico') return basePrompt
  const enrichment = `
=== CONTEXTO INDUSTRIAL: ${template.name.toUpperCase()} ===
${template.promptAdicional}

Normas adicionales a considerar:
${template.normas.map(n => `- ${n}`).join('\n')}

Riesgos frecuentes en este sector:
${template.riesgosComunes.map(r => `- ${r}`).join('\n')}
`
  return basePrompt + '\n\n' + enrichment
}
