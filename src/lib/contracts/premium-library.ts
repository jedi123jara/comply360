import type { ContractType } from '@/generated/prisma/client'

export interface PremiumContractClause {
  id: string
  title: string
  body: string
  objective: string
  risksCovered: string[]
  legalBasis: string[]
  appliesWhen?: string
  requiredInputs: string[]
  severityIfMissing: 'BLOCKER' | 'WARNING'
}

export interface PremiumContractSection {
  id: string
  title: string
  clauses: PremiumContractClause[]
}

export interface PremiumContractAnnex {
  id: string
  title: string
  required: boolean
  legalBasis: string[]
  reason: string
}

export interface PremiumContractDocument {
  documentKind: 'CONTRACT'
  legalFamily: 'LABOR' | 'CIVIL_SERVICES' | 'TRAINING' | 'CUSTOM'
  jurisdiction: 'PE'
  contractType: string
  title: string
  sections: PremiumContractSection[]
  clauses: PremiumContractClause[]
  annexes: PremiumContractAnnex[]
  legalBasis: string[]
  riskControls: Array<{
    key: string
    label: string
    covered: boolean
    severity: 'BLOCKER' | 'WARNING'
  }>
  requiredInputs: string[]
  signatureBlocks: Array<{
    role: 'EMPLOYER' | 'WORKER' | 'SERVICE_PROVIDER' | 'TRAINING_CENTER'
    label: string
    nameField: string
    documentField?: string
    displayName?: string
    displayDocument?: string
  }>
  version: 'premium-contract-v1'
}

export function buildPremiumContractDocument(input: {
  contractType: ContractType | string
  title: string
  formData?: Record<string, unknown> | null
}): PremiumContractDocument | null {
  const contractType = String(input.contractType)
  const formData = input.formData ?? {}
  if (contractType === 'LOCACION_SERVICIOS') {
    return buildServiceContract(input.title, contractType, formData)
  }
  if (contractType === 'CONVENIO_PRACTICAS') {
    return buildTrainingContract(input.title, contractType, formData)
  }
  if (isLaborContract(contractType)) {
    return buildLaborContract(input.title, contractType, formData)
  }
  return null
}

export function withPremiumContractDocument(
  contentJson: unknown,
  premiumDocument: PremiumContractDocument | null,
): Record<string, unknown> {
  const base = isRecord(contentJson) ? contentJson : {}
  if (!premiumDocument) return base
  return {
    ...base,
    premiumDocument,
    documentKind: premiumDocument.documentKind,
    legalFamily: premiumDocument.legalFamily,
    jurisdiction: premiumDocument.jurisdiction,
    legalBasis: premiumDocument.legalBasis,
    annexes: premiumDocument.annexes.map((annex) => annex.title),
    requiredInputs: premiumDocument.requiredInputs,
  }
}

export function readPremiumContractDocument(contentJson: unknown): PremiumContractDocument | null {
  if (!isRecord(contentJson)) return null
  const doc = contentJson.premiumDocument
  if (!isRecord(doc) || doc.documentKind !== 'CONTRACT' || !Array.isArray(doc.sections)) return null
  return doc as unknown as PremiumContractDocument
}

export function renderPremiumContractHtml(document: PremiumContractDocument): string {
  const partyRows = document.signatureBlocks.map((block) => `
    <tr>
      <th>${escapeHtml(block.label)}</th>
      <td>${escapeHtml(block.displayName || block.nameField)}</td>
      <td>${escapeHtml(block.displayDocument || block.documentField || '')}</td>
    </tr>
  `).join('\n')

  const sectionsHtml = document.sections.map((section) => `
    <section class="premium-section" data-section="${escapeHtml(section.id)}">
      <h2>${escapeHtml(section.title)}</h2>
      ${section.clauses.map((clause, index) => `
        <section class="premium-clause" data-clause="${escapeHtml(clause.id)}">
          <h3>${index + 1}. ${escapeHtml(clause.title)}</h3>
          <p>${escapeHtml(clause.body)}</p>
          <p class="base-legal"><em>Base legal: ${escapeHtml(clause.legalBasis.join('; '))}</em></p>
        </section>
      `).join('\n')}
    </section>
  `).join('\n')

  const annexesHtml = document.annexes.length > 0
    ? `
      <section data-section="annexes">
        <h2>Anexos integrantes</h2>
        <p>Los siguientes anexos forman parte integrante del contrato, sustentan la emisión documental y deben encontrarse disponibles como evidencia en el legajo o repositorio corporativo correspondiente:</p>
        <ol>
          ${document.annexes.map((annex) => `
            <li><strong>${escapeHtml(annex.title)}</strong>. ${escapeHtml(annex.reason)} Base legal: ${escapeHtml(annex.legalBasis.join('; '))}.</li>
          `).join('\n')}
        </ol>
      </section>
    `
    : ''

  return `
<article class="contract-document premium-contract" data-render-version="premium-contract-v1" data-jurisdiction="${document.jurisdiction}">
  <header class="cover-page">
    <p>DOCUMENTO LEGAL | ${document.jurisdiction}</p>
    <h1>${escapeHtml(document.title.toUpperCase())}</h1>
    <table>
      <thead>
        <tr><th>Parte</th><th>Identificación</th><th>Documento</th></tr>
      </thead>
      <tbody>${partyRows}</tbody>
    </table>
  </header>
  ${sectionsHtml}
  ${annexesHtml}
  ${renderProtectionMatrix(document)}
  <section data-section="document-control">
    <h2>Control documental</h2>
    <p>Versión canónica: ${document.version}. Jurisdicción: ${document.jurisdiction}. Familia legal: ${document.legalFamily}. Este contrato fue estructurado con cláusulas determinísticas, base legal trazable, anexos requeridos y control de calidad previo a emisión oficial.</p>
  </section>
  ${renderSignatureBlocks(document)}
</article>`.trim()
}

function buildLaborContract(
  title: string,
  contractType: string,
  formData: Record<string, unknown>,
): PremiumContractDocument {
  const fixedTerm = contractType === 'LABORAL_PLAZO_FIJO'
  const partTime = contractType === 'LABORAL_TIEMPO_PARCIAL'
  const clauses: PremiumContractClause[] = [
    clause('labor-parties', 'Partes, representación y capacidad', [
      'Por el presente documento intervienen EL EMPLEADOR, identificado con RUC {{empleador_ruc}}, debidamente representado según sus poderes vigentes, y EL TRABAJADOR, identificado con DNI {{trabajador_dni}}. Ambas partes declaran contar con capacidad suficiente para contratar y obligarse conforme al ordenamiento peruano.',
      'Se deja constancia de que la información de identidad, representación y domicilio será usada para fines laborales, tributarios, previsionales y de fiscalización.',
    ], ['empleador_razon_social', 'empleador_ruc', 'trabajador_nombre', 'trabajador_dni'], [
      'TUO del D.Leg. 728, aprobado por D.S. 003-97-TR',
      'Código Civil peruano',
      'Ley 29733',
    ], 'Acredita identidad, representación y consentimiento contractual.', ['Identidad incompleta', 'representación insuficiente']),
    clause('labor-object', 'Objeto, cargo y funciones', [
      'EL TRABAJADOR prestará servicios personales, subordinados y remunerados en el cargo de {{cargo}}, ejecutando las funciones propias del puesto, las instrucciones razonables de EL EMPLEADOR y las responsabilidades descritas en el perfil/MOF anexo.',
      'EL EMPLEADOR podrá asignar tareas conexas compatibles con la categoría, experiencia y dignidad del trabajador, sin desnaturalizar el cargo ni afectar derechos irrenunciables.',
    ], ['cargo'], ['TUO del D.Leg. 728, D.S. 003-97-TR', 'Constitución Política del Perú, art. 23'], 'Delimita prestación, subordinación lícita y funciones.', ['Cargo ambiguo', 'funciones no trazables']),
    fixedTerm
      ? clause('labor-fixed-term', 'Modalidad, plazo y causa objetiva', [
          'El presente contrato es a plazo fijo. Su vigencia inicia el {{fecha_inicio}} y culmina el {{fecha_fin}}, salvo renovación expresa o extinción válida conforme a ley.',
          'La causa objetiva es la siguiente: {{causa_objetiva}}. Dicha causa debe ser específica, temporal, verificable y estar sustentada en anexos documentales; no podrá consistir en fórmulas genéricas ni en necesidades permanentes del negocio.',
        ], ['fecha_inicio', 'fecha_fin', 'causa_objetiva'], ['TUO del D.Leg. 728, D.S. 003-97-TR, arts. 53-56', 'Principio de causalidad de contratos sujetos a modalidad'], 'Reduce riesgo de desnaturalización de plazo fijo.', ['Causa objetiva genérica', 'plazo sin sustento'])
      : clause('labor-term', 'Modalidad y vigencia', [
          `El presente contrato es ${partTime ? 'a tiempo parcial' : 'a plazo indeterminado'} e inicia el {{fecha_inicio}}. La relación se mantiene vigente mientras subsistan las condiciones legales y contractuales que la sustentan.`,
          partTime
            ? 'La jornada parcial pactada no deberá encubrir jornada ordinaria completa ni exceder los límites declarados en el control de asistencia.'
            : 'La naturaleza indeterminada del vínculo no limita la facultad de dirección del empleador dentro del marco legal.',
        ], ['fecha_inicio'], ['TUO del D.Leg. 728, D.S. 003-97-TR'], 'Define modalidad y evita ambigüedad de vigencia.', ['Modalidad no identificada']),
    clause('labor-trial', 'Periodo de prueba', [
      'Las partes reconocen el periodo de prueba aplicable conforme al régimen laboral correspondiente. Cualquier ampliación deberá constar por escrito, responder a la naturaleza del cargo y respetar los límites legales.',
    ], [], ['TUO del D.Leg. 728, D.S. 003-97-TR, art. 10'], 'Controla expectativa de estabilidad inicial.', ['Periodo de prueba mal aplicado']),
    clause('labor-schedule', 'Jornada, horario, refrigerio y sobretiempo', [
      'La jornada será {{jornada}} y el horario será {{horario}}, con refrigerio conforme a ley. Todo trabajo en sobretiempo requerirá autorización o validación de EL EMPLEADOR y será compensado o pagado conforme a la normativa vigente.',
      'EL EMPLEADOR mantendrá control de asistencia y registro suficiente para fines inspectivos.',
    ], ['jornada', 'horario'], ['D.Leg. 854', 'D.S. 007-2002-TR', 'D.S. 004-2006-TR'], 'Evita contingencias por horas extras, refrigerio y asistencia.', ['Jornada indeterminada', 'sobretiempo no regulado']),
    clause('labor-pay', 'Remuneración y beneficios sociales', [
      'EL TRABAJADOR percibirá una remuneración mensual de S/ {{remuneracion}}, sujeta a descuentos legales. EL EMPLEADOR reconocerá CTS, gratificaciones, vacaciones, aportes a EsSalud y demás beneficios que correspondan según ley y régimen aplicable.',
      'Todo concepto no remunerativo deberá cumplir los requisitos legales y estar documentado.',
    ], ['remuneracion'], ['TUO del D.Leg. 728', 'Ley 27735', 'D.Leg. 650', 'D.Leg. 713', 'Ley 26790'], 'Protege cálculo de beneficios y evita conceptos ambiguos.', ['Remuneración ausente', 'beneficios omitidos']),
    clause('labor-sst', 'Seguridad y salud en el trabajo', [
      'EL EMPLEADOR garantiza el cumplimiento del Sistema de Gestión de Seguridad y Salud en el Trabajo; EL TRABAJADOR se obliga a cumplir las políticas, capacitaciones, IPERC, uso de EPP y procedimientos de seguridad aplicables al puesto.',
      'La inobservancia de reglas de SST podrá generar medidas disciplinarias proporcionales, sin perjuicio de la investigación de incidentes o accidentes.',
    ], [], ['Ley 29783', 'D.S. 005-2012-TR'], 'Cubre prevención, capacitación, IPERC y responsabilidad compartida.', ['SST no incorporada']),
    clause('labor-harassment', 'Prevención y sanción del hostigamiento sexual', [
      'EL EMPLEADOR mantiene una política de prevención y sanción del hostigamiento sexual. EL TRABAJADOR declara conocer los canales de queja, investigación y protección, y se obliga a mantener una conducta respetuosa y libre de violencia o acoso.',
    ], [], ['Ley 27942', 'D.S. 014-2019-MIMP', 'D.Leg. 1410'], 'Reduce riesgo psicosocial y acredita información preventiva.', ['Política no entregada']),
    clause('labor-data', 'Protección de datos personales', [
      'EL TRABAJADOR autoriza el tratamiento de sus datos personales para gestión laboral, planillas, seguridad social, beneficios, prevención de riesgos, auditoría, cumplimiento normativo y atención de fiscalizaciones. EL EMPLEADOR aplicará medidas de seguridad y conservará la información según plazos legales.',
    ], [], ['Ley 29733', 'D.S. 016-2024-JUS', 'Ley 27321', 'Código Tributario'], 'Cubre finalidad, conservación y cumplimiento de LPDP.', ['Consentimiento o aviso insuficiente']),
    clause('labor-confidentiality', 'Confidencialidad', [
      'EL TRABAJADOR guardará reserva sobre información comercial, técnica, financiera, operativa, de clientes, trabajadores, proveedores, datos personales, secretos empresariales y cualquier información no pública conocida por razón del vínculo. La obligación subsiste después del cese por el plazo razonable necesario para proteger dichos intereses.',
    ], [], ['Código Civil', 'Código Penal, arts. 165 y 198', 'D.Leg. 823'], 'Protege activos intangibles e información sensible.', ['Información confidencial expuesta']),
    clause('labor-ip', 'Propiedad intelectual y herramientas', [
      'Las obras, documentos, diseños, software, invenciones, mejoras, metodologías o entregables creados dentro de la jornada, por encargo o con recursos de EL EMPLEADOR corresponden patrimonialmente a EL EMPLEADOR, respetando los derechos morales irrenunciables cuando resulten aplicables.',
    ], [], ['D.Leg. 822', 'D.Leg. 1075'], 'Evita disputa sobre entregables y creaciones laborales.', ['Titularidad de creaciones discutible']),
    clause('labor-equality', 'Igualdad salarial y no discriminación', [
      'EL EMPLEADOR garantiza trato digno, igualdad de oportunidades, no discriminación y política remunerativa compatible con criterios objetivos de puesto, responsabilidad, desempeño y categoría. EL TRABAJADOR podrá usar los canales internos para reportar cualquier incumplimiento.',
    ], [], ['Ley 30709', 'Constitución Política del Perú, arts. 2 y 26'], 'Cubre igualdad salarial y trato no discriminatorio.', ['Riesgo de discriminación']),
    clause('labor-termination', 'Terminación, disciplina y entrega documentaria', [
      'La terminación del vínculo, renuncia, despido, mutuo disenso, vencimiento válido o resolución se sujetará a las causales, procedimientos y garantías legales. Al cese, EL TRABAJADOR devolverá bienes, accesos, documentos y soportes de información de EL EMPLEADOR.',
    ], [], ['TUO del D.Leg. 728, D.S. 003-97-TR', 'Ley 27321'], 'Ordena cese, devolución y disciplina.', ['Cese sin procedimiento']),
    clause('labor-jurisdiction', 'Ley aplicable y jurisdicción', [
      'El contrato se rige por la legislación peruana. Las controversias laborales se someterán a las autoridades administrativas o judiciales competentes del Perú, sin limitar derechos irrenunciables del trabajador.',
    ], [], ['Constitución Política del Perú', 'Nueva Ley Procesal del Trabajo, Ley 29497'], 'Define foro y ley aplicable sin renuncia inválida.', ['Foro ambiguo']),
  ]

  if (truthy(formData.teletrabajo) || truthy(formData.es_teletrabajo)) {
    clauses.splice(9, 0, clause('labor-telework', 'Teletrabajo y desconexión digital', [
      'La prestación bajo teletrabajo se rige por acuerdo escrito, reversibilidad, condiciones de seguridad y salud, provisión o compensación de equipos cuando corresponda, y respeto de la desconexión digital fuera de la jornada.',
    ], [], ['Ley 31572', 'D.S. 002-2023-TR', 'R.M. 053-2025-TR'], 'Cubre reglas específicas de teletrabajo.', ['Teletrabajo sin acuerdo o anexos']))
  }

  return hydrateDocument(assembleDocument({
    title,
    contractType,
    legalFamily: 'LABOR',
    sections: [
      { id: 'identity', title: 'Identidad contractual', clauses: clauses.slice(0, 2) },
      { id: 'employment-terms', title: 'Condiciones laborales esenciales', clauses: clauses.slice(2, 6) },
      { id: 'compliance', title: 'Cumplimiento, prevención y activos', clauses: clauses.slice(6, -2) },
      { id: 'closing', title: 'Cierre contractual', clauses: clauses.slice(-2) },
    ],
    annexes: laborAnnexes(formData, fixedTerm, truthy(formData.teletrabajo) || truthy(formData.es_teletrabajo)),
    signatureBlocks: [
      { role: 'EMPLOYER', label: 'EL EMPLEADOR', nameField: 'empleador_razon_social', documentField: 'empleador_ruc' },
      { role: 'WORKER', label: 'EL TRABAJADOR', nameField: 'trabajador_nombre', documentField: 'trabajador_dni' },
    ],
  }), formData)
}

function buildServiceContract(title: string, contractType: string, formData: Record<string, unknown>): PremiumContractDocument {
  const clauses = [
    clause('service-parties', 'Partes independientes', ['Las partes declaran actuar como sujetos independientes: EL COMITENTE encarga servicios específicos y EL LOCADOR los presta con autonomía técnica, sin subordinación laboral, sin jornada, sin control disciplinario laboral y sin integración a la estructura ordinaria de EL COMITENTE.'], ['comitente_razon_social', 'comitente_ruc', 'locador_nombre', 'locador_dni'], ['Código Civil, arts. 1764 y siguientes'], 'Evita confusión laboral.', ['Identidad incompleta', 'subordinación aparente']),
    clause('service-scope', 'Alcance del servicio y entregables', ['EL LOCADOR prestará el servicio siguiente: {{servicio}}. El resultado, entregables, hitos, estándares y aceptación se documentan en el anexo de alcance. No se pacta cargo laboral, horario ni fiscalización de asistencia.'], ['servicio'], ['Código Civil, art. 1764'], 'Delimita obligación civil por resultado o actividad autónoma.', ['Servicio ambiguo']),
    clause('service-fee', 'Honorarios e impuestos', ['EL COMITENTE pagará honorarios de S/ {{honorario}} contra recibo por honorarios o comprobante válido, según corresponda. EL LOCADOR asume sus obligaciones tributarias y previsionales independientes.'], ['honorario'], ['Código Tributario', 'Ley del Impuesto a la Renta'], 'Evita apariencia de remuneración laboral.', ['Pago ambiguo']),
    clause('service-no-subordination', 'No subordinación y control de riesgos', ['Las coordinaciones, revisiones o estándares de calidad no constituyen subordinación. Cualquier requerimiento de horario fijo, exclusividad, centro permanente de trabajo o supervisión disciplinaria deberá formalizarse en una relación laboral si corresponde.'], [], ['Principio de primacía de la realidad', 'TUO del D.Leg. 728'], 'Controla desnaturalización por primacía de realidad.', ['Riesgo de laboralidad']),
    clause('service-confidentiality', 'Confidencialidad y datos', ['EL LOCADOR guardará reserva sobre información confidencial y datos personales a los que acceda, aplicando medidas de seguridad y usándolos solo para ejecutar el servicio.'], [], ['Ley 29733', 'Código Civil'], 'Protege información y datos.', ['Datos sin control']),
    clause('service-jurisdiction', 'Ley aplicable y controversias', ['El contrato se rige por la ley peruana. Las controversias civiles serán sometidas a los jueces o mecanismo pactado por las partes, sin impedir que la autoridad laboral califique la realidad si existieran elementos de subordinación.'], [], ['Código Civil', 'Principio de primacía de la realidad'], 'Define foro sin blindaje artificial.', ['Foro ambiguo']),
  ]
  return hydrateDocument(assembleDocument({
    title,
    contractType,
    legalFamily: 'CIVIL_SERVICES',
    sections: [
      { id: 'identity', title: 'Relación civil independiente', clauses: clauses.slice(0, 2) },
      { id: 'commercial-terms', title: 'Condiciones económicas y ejecución', clauses: clauses.slice(2, 4) },
      { id: 'protection', title: 'Protecciones y cierre', clauses: clauses.slice(4) },
    ],
    annexes: [
      annex('service-scope-annex', 'Alcance de servicios y entregables', true, ['Código Civil, art. 1764'], 'Sustenta autonomía, entregables y criterios de aceptación.'),
    ],
    signatureBlocks: [
      { role: 'EMPLOYER', label: 'EL COMITENTE', nameField: 'comitente_razon_social', documentField: 'comitente_ruc' },
      { role: 'SERVICE_PROVIDER', label: 'EL LOCADOR', nameField: 'locador_nombre', documentField: 'locador_dni' },
    ],
  }), formData)
}

function buildTrainingContract(title: string, contractType: string, formData: Record<string, unknown>): PremiumContractDocument {
  const clauses = [
    clause('training-parties', 'Partes y finalidad formativa', ['La empresa, EL PRACTICANTE y el centro de estudios declaran que la finalidad principal es formativa y no encubre una relación laboral ordinaria.'], ['empleador_razon_social', 'empleador_ruc', 'trabajador_nombre', 'trabajador_dni', 'centro_estudios'], ['Ley 28518'], 'Acredita naturaleza formativa.', ['Finalidad formativa no acreditada']),
    clause('training-plan', 'Plan formativo', ['La formación se ejecutará conforme al plan formativo {{plan_formativo}}, con objetivos, actividades, tutor, evaluación y competencias vinculadas a los estudios.'], ['plan_formativo'], ['Ley 28518', 'Reglamento de Modalidades Formativas Laborales'], 'Evita desnaturalización de prácticas.', ['Plan formativo ausente']),
    clause('training-grant', 'Subvención y condiciones', ['EL PRACTICANTE recibirá subvención mensual de S/ {{subvencion}}, seguro correspondiente y descansos aplicables según modalidad formativa.'], ['subvencion'], ['Ley 28518'], 'Cubre derechos económicos formativos.', ['Subvención incompleta']),
    clause('training-sst-data', 'SST, hostigamiento y datos', ['La empresa informará políticas de SST, prevención de hostigamiento sexual y tratamiento de datos personales aplicables durante la formación.'], [], ['Ley 29783', 'Ley 27942', 'Ley 29733'], 'Extiende protección preventiva al practicante.', ['Políticas no entregadas']),
  ]
  return hydrateDocument(assembleDocument({
    title,
    contractType,
    legalFamily: 'TRAINING',
    sections: [{ id: 'training', title: 'Convenio formativo', clauses }],
    annexes: [
      annex('training-plan', 'Plan formativo aprobado', true, ['Ley 28518'], 'Sustenta finalidad educativa y actividades.'),
      annex('training-center-letter', 'Carta o validación del centro de estudios', true, ['Ley 28518'], 'Acredita vínculo formativo con institución educativa.'),
    ],
    signatureBlocks: [
      { role: 'EMPLOYER', label: 'LA EMPRESA', nameField: 'empleador_razon_social', documentField: 'empleador_ruc' },
      { role: 'WORKER', label: 'EL PRACTICANTE', nameField: 'trabajador_nombre', documentField: 'trabajador_dni' },
      { role: 'TRAINING_CENTER', label: 'CENTRO DE ESTUDIOS', nameField: 'centro_estudios' },
    ],
  }), formData)
}

function assembleDocument(input: {
  title: string
  contractType: string
  legalFamily: PremiumContractDocument['legalFamily']
  sections: PremiumContractSection[]
  annexes: PremiumContractAnnex[]
  signatureBlocks: PremiumContractDocument['signatureBlocks']
}): PremiumContractDocument {
  const clauses = input.sections.flatMap((section) => section.clauses)
  const legalBasis = [...new Set([
    ...clauses.flatMap((item) => item.legalBasis),
    ...input.annexes.flatMap((item) => item.legalBasis),
  ])]
  const requiredInputs = [...new Set(clauses.flatMap((item) => item.requiredInputs))]
  return {
    documentKind: 'CONTRACT',
    legalFamily: input.legalFamily,
    jurisdiction: 'PE',
    contractType: input.contractType,
    title: input.title,
    sections: input.sections,
    clauses,
    annexes: input.annexes,
    legalBasis,
    riskControls: clauses.map((item) => ({
      key: item.id,
      label: item.title,
      covered: true,
      severity: item.severityIfMissing,
    })),
    requiredInputs,
    signatureBlocks: input.signatureBlocks,
    version: 'premium-contract-v1',
  }
}

function hydrateDocument(
  document: PremiumContractDocument,
  formData: Record<string, unknown>,
): PremiumContractDocument {
  const hydrateClause = (item: PremiumContractClause): PremiumContractClause => ({
    ...item,
    body: resolveTemplateText(item.body, formData),
  })
  const sections = document.sections.map((section) => ({
    ...section,
    clauses: section.clauses.map(hydrateClause),
  }))
  return {
    ...document,
    sections,
    clauses: sections.flatMap((section) => section.clauses),
    signatureBlocks: document.signatureBlocks.map((block) => ({
      ...block,
      displayName: stringValue(getInputValue(formData, block.nameField)),
      displayDocument: block.documentField ? stringValue(getInputValue(formData, block.documentField)) : undefined,
    })),
  }
}

function resolveTemplateText(text: string, formData: Record<string, unknown>): string {
  return text.replace(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g, (_match, key: string) => {
    const value = getInputValue(formData, key)
    if (value === undefined || value === null || String(value).trim() === '') return `{{${key}}}`
    return String(value)
  })
}

function getInputValue(formData: Record<string, unknown>, key: string): unknown {
  for (const candidate of INPUT_ALIASES[key] ?? [key]) {
    const value = formData[candidate]
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return undefined
}

function clause(
  id: string,
  title: string,
  paragraphs: string[],
  requiredInputs: string[],
  legalBasis: string[],
  objective: string,
  risksCovered: string[],
): PremiumContractClause {
  return {
    id,
    title,
    body: paragraphs.join(' '),
    objective,
    risksCovered,
    legalBasis,
    requiredInputs,
    severityIfMissing: 'BLOCKER',
  }
}

function laborAnnexes(formData: Record<string, unknown>, fixedTerm: boolean, telework: boolean): PremiumContractAnnex[] {
  return [
    annex('sst-policy', 'Política de Seguridad y Salud en el Trabajo', true, ['Ley 29783', 'D.S. 005-2012-TR'], 'Acredita información preventiva y obligaciones SST.'),
    annex('harassment-policy', 'Política de Prevención del Hostigamiento Sexual', true, ['Ley 27942', 'D.S. 014-2019-MIMP'], 'Acredita prevención, canales y procedimiento de queja.'),
    annex('pdp-consent', 'Consentimiento Informado para Tratamiento de Datos Personales', true, ['Ley 29733', 'D.S. 016-2024-JUS'], 'Acredita finalidades laborales y medidas de información.'),
    annex('job-description', 'Descripción de Puesto o Funciones', true, ['TUO del D.Leg. 728'], 'Sustenta cargo, funciones y categoría.'),
    ...(fixedTerm ? [annex('objective-cause-support', 'Sustento documental de causa objetiva', true, ['TUO del D.Leg. 728, arts. 53-56'], 'Evita desnaturalización del contrato modal.')] : []),
    ...(truthy(formData.usa_epp) ? [annex('iperc-epp', 'IPERC y constancia de entrega de EPP', true, ['Ley 29783'], 'Sustenta peligros, controles y equipos de protección.')] : []),
    ...(telework ? [annex('telework-agreement', 'Acuerdo de teletrabajo y autoevaluación SST', true, ['Ley 31572', 'D.S. 002-2023-TR'], 'Sustenta lugar, equipos, compensación y seguridad en teletrabajo.')] : []),
  ]
}

function annex(id: string, title: string, required: boolean, legalBasis: string[], reason: string): PremiumContractAnnex {
  return { id, title, required, legalBasis, reason }
}

function renderSignatureBlocks(document: PremiumContractDocument): string {
  return `
<section data-section="signatures">
  <h2>Firmas</h2>
  <table>
    <tr>
      ${document.signatureBlocks.map((block) => `
        <td>
          <br/><br/>______________________________<br/>
          <strong>${escapeHtml(block.label)}</strong><br/>
          ${escapeHtml(block.displayName || block.nameField)}${block.displayDocument ? `<br/>${escapeHtml(block.displayDocument)}` : ''}
        </td>
      `).join('\n')}
    </tr>
  </table>
</section>`
}

function renderProtectionMatrix(document: PremiumContractDocument): string {
  const criticalClauses = document.riskControls.filter((control) => control.severity === 'BLOCKER')
  const requiredAnnexes = document.annexes.filter((annex) => annex.required)
  return `
<section data-section="legal-protection">
  <h2>Matriz de protección legal</h2>
  <p>La siguiente matriz resume las defensas documentales incorporadas al contrato para reducir riesgos de nulidad, desnaturalización, contingencia inspectiva o pérdida de evidencia.</p>
  <table>
    <thead>
      <tr><th>Frente de protección</th><th>Cobertura</th><th>Evidencia esperada</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Cláusulas críticas</td>
        <td>${criticalClauses.length} controles contractuales determinísticos</td>
        <td>${escapeHtml(criticalClauses.slice(0, 5).map((item) => item.label).join('; '))}${criticalClauses.length > 5 ? '...' : ''}</td>
      </tr>
      <tr>
        <td>Anexos obligatorios</td>
        <td>${requiredAnnexes.length} anexos requeridos para emisión oficial</td>
        <td>${escapeHtml(requiredAnnexes.map((item) => item.title).join('; '))}</td>
      </tr>
      <tr>
        <td>Base legal</td>
        <td>${document.legalBasis.length} referencias normativas trazables</td>
        <td>${escapeHtml(document.legalBasis.slice(0, 6).join('; '))}${document.legalBasis.length > 6 ? '...' : ''}</td>
      </tr>
    </tbody>
  </table>
</section>`
}

function isLaborContract(type: string): boolean {
  return ['LABORAL_INDEFINIDO', 'LABORAL_PLAZO_FIJO', 'LABORAL_TIEMPO_PARCIAL', 'ADDENDUM'].includes(type)
}

function truthy(value: unknown): boolean {
  return value === true || value === 'true' || value === 'SI' || value === 'Sí' || value === 'si' || value === '1'
}

function stringValue(value: unknown): string | undefined {
  if (value === undefined || value === null || String(value).trim() === '') return undefined
  return String(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const INPUT_ALIASES: Record<string, string[]> = {
  empleador_razon_social: ['empleador_razon_social', 'empleadorRazonSocial', 'empresa_razon_social', 'razon_social'],
  empleador_ruc: ['empleador_ruc', 'empleadorRuc', 'empresa_ruc', 'ruc'],
  trabajador_nombre: ['trabajador_nombre', 'trabajadorNombre', 'nombre_trabajador', 'workerName'],
  trabajador_dni: ['trabajador_dni', 'trabajadorDni', 'dni_trabajador', 'documento_trabajador', 'workerDni'],
  cargo: ['cargo', 'trabajador_cargo', 'puesto', 'position'],
  remuneracion: ['remuneracion', 'remuneracion_mensual', 'sueldo', 'sueldo_bruto', 'salary'],
  fecha_inicio: ['fecha_inicio', 'fechaInicio', 'inicio_contrato', 'startDate'],
  fecha_fin: ['fecha_fin', 'fechaFin', 'fin_contrato', 'endDate'],
  causa_objetiva: ['causa_objetiva', 'causaObjetiva', 'motivo_contratacion'],
  jornada: ['jornada', 'jornada_semanal', 'jornada_horas'],
  horario: ['horario', 'horario_trabajo', 'workSchedule'],
  comitente_razon_social: ['comitente_razon_social', 'cliente_razon_social', 'razon_social'],
  comitente_ruc: ['comitente_ruc', 'cliente_ruc', 'ruc'],
  locador_nombre: ['locador_nombre', 'prestador_nombre', 'trabajador_nombre'],
  locador_dni: ['locador_dni', 'prestador_dni', 'trabajador_dni'],
  servicio: ['servicio', 'servicios', 'alcance_servicio', 'scope'],
  honorario: ['honorario', 'honorarios', 'monto', 'fee'],
  centro_estudios: ['centro_estudios', 'institucion_educativa', 'universidad'],
  plan_formativo: ['plan_formativo', 'planFormativo', 'trainingPlan'],
  subvencion: ['subvencion', 'subvencion_mensual', 'stipend'],
}
