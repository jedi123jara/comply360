// =============================================
// CONTRACT TEMPLATE ENGINE — COMPLY360 PERÚ
// Documentos Laborales de Nivel Profesional
//
// Base legal:
//   D.Leg. 728 / D.S. 003-97-TR  (LPCL — contrato laboral)
//   D.S. 001-97-TR                (CTS)
//   Ley 27735 / D.S. 005-2002-TR  (Gratificaciones)
//   D.Leg. 713 / D.S. 012-92-TR   (Vacaciones)
//   Ley 25129 / D.S. 035-90-TR    (Asignación Familiar)
//   Ley 26790                      (EsSalud)
//   D.Leg. 688                     (Seguro de Vida Ley)
//   D.Leg. 892 / D.S. 009-98-TR   (Participación en Utilidades)
//   Ley 29783 / D.S. 005-2012-TR  (SST)
//   Ley 27942 / D.S. 014-2019-MIMP (Hostigamiento Sexual)
//   Ley 30709                      (Igualdad Salarial)
//   D.Leg. 1075                    (Propiedad Intelectual)
//   Ley 26872                      (Conciliación Extrajudicial)
//   Código Civil — Art. 1764-1770  (Locación de Servicios)
//   UIT 2026 = S/ 5,500 | RMV 2026 = S/ 1,130
// =============================================

export interface TemplateField {
  id: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'currency' | 'toggle' | 'email'
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[]
  helpText?: string
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
  condition?: {
    field: string
    value: string | boolean
  }
}

export interface TemplateSection {
  id: string
  title: string
  fields: TemplateField[]
}

export interface ContentBlock {
  id: string
  title?: string
  text: string // With {{variable}} placeholders
  condition?: string // JS expression evaluated against form data
  isOptional?: boolean
}

export interface ContractTemplateDefinition {
  id: string
  type: string
  name: string
  description: string
  legalBasis: string
  sections: TemplateSection[]
  contentBlocks: ContentBlock[]
}

// ─── SECCIONES REUTILIZABLES ─────────────────────────────────────────────────

const SECCION_EMPLEADOR: TemplateSection = {
  id: 'empleador',
  title: 'Datos del Empleador',
  fields: [
    {
      id: 'empleador_razon_social',
      label: 'Razón Social',
      type: 'text',
      required: true,
      placeholder: 'Empresa S.A.C.',
    },
    {
      id: 'empleador_ruc',
      label: 'RUC',
      type: 'text',
      required: true,
      placeholder: '20XXXXXXXXX',
      validation: {
        pattern: '^20\\d{9}$',
        message: 'Ingrese un RUC válido (11 dígitos comenzando con 20)',
      },
    },
    {
      id: 'empleador_direccion',
      label: 'Domicilio fiscal / Centro de trabajo',
      type: 'text',
      required: true,
      placeholder: 'Av. ______ N° ___, distrito, Lima',
    },
    {
      id: 'empleador_representante',
      label: 'Representante legal (nombres y apellidos)',
      type: 'text',
      required: true,
    },
    {
      id: 'empleador_dni_representante',
      label: 'DNI del representante',
      type: 'text',
      required: true,
      validation: {
        pattern: '^\\d{8}$',
        message: 'DNI debe tener exactamente 8 dígitos',
      },
    },
    {
      id: 'empleador_cargo_representante',
      label: 'Cargo del representante',
      type: 'text',
      required: true,
      placeholder: 'Gerente General / Apoderado',
    },
  ],
}

const SECCION_TRABAJADOR: TemplateSection = {
  id: 'trabajador',
  title: 'Datos del Trabajador',
  fields: [
    {
      id: 'trabajador_nombre',
      label: 'Nombres y apellidos completos',
      type: 'text',
      required: true,
    },
    {
      id: 'trabajador_dni',
      label: 'DNI',
      type: 'text',
      required: true,
      validation: {
        pattern: '^\\d{8}$',
        message: 'DNI debe tener 8 dígitos',
      },
    },
    {
      id: 'trabajador_direccion',
      label: 'Domicilio actual',
      type: 'text',
      required: true,
      placeholder: 'Calle ______ N° ___, distrito, Lima',
    },
    {
      id: 'trabajador_nacionalidad',
      label: 'Nacionalidad',
      type: 'text',
      required: true,
      placeholder: 'Peruana',
    },
    {
      id: 'trabajador_email',
      label: 'Correo electrónico (opcional)',
      type: 'email',
      required: false,
      helpText: 'Para envío de notificaciones y boletas',
    },
  ],
}

// =============================================
// CONTRATO DE TRABAJO A PLAZO INDETERMINADO
// D.Leg. 728 / D.S. 003-97-TR — Art. 4°
// =============================================
export const CONTRATO_INDEFINIDO: ContractTemplateDefinition = {
  id: 'laboral-indefinido',
  type: 'LABORAL_INDEFINIDO',
  name: 'Contrato de Trabajo a Plazo Indeterminado',
  description:
    'Contrato laboral sin fecha de término para el régimen general (D.Leg. 728). La modalidad más común y protegida por ley. Incluye todos los beneficios sociales de ley.',
  legalBasis: 'D.Leg. 728 / D.S. 003-97-TR (LPCL) — Art. 4°',
  sections: [
    SECCION_EMPLEADOR,
    SECCION_TRABAJADOR,
    {
      id: 'condiciones',
      title: 'Condiciones Laborales',
      fields: [
        {
          id: 'numero_contrato',
          label: 'N° de contrato (referencia interna)',
          type: 'text',
          required: false,
          placeholder: 'CONTRATO-2026-001',
          helpText: 'Código interno de referencia. Si lo deja vacío no se imprimirá.',
        },
        {
          id: 'cargo',
          label: 'Cargo / Puesto de trabajo',
          type: 'text',
          required: true,
          placeholder: 'Analista de Contabilidad',
        },
        {
          id: 'area',
          label: 'Área / Departamento',
          type: 'text',
          required: true,
          placeholder: 'Contabilidad y Finanzas',
        },
        {
          id: 'funciones',
          label: 'Descripción de funciones principales',
          type: 'textarea',
          required: true,
          helpText:
            'Liste las funciones específicas del puesto. Más detalle = mayor protección legal.',
          placeholder:
            '1. Registrar y verificar los libros contables de la empresa.\n2. Elaborar y presentar las declaraciones tributarias mensuales (IGV, IR).\n3. ...',
        },
        {
          id: 'fecha_inicio',
          label: 'Fecha de inicio de labores',
          type: 'date',
          required: true,
        },
        {
          id: 'tipo_trabajador',
          label: 'Clasificación del trabajador',
          type: 'select',
          required: true,
          options: [
            { value: 'ordinario', label: 'Trabajador ordinario (período de prueba: 3 meses)' },
            {
              value: 'confianza',
              label: 'Trabajador de confianza (período de prueba: hasta 6 meses)',
            },
            {
              value: 'direccion',
              label: 'Trabajador de dirección (período de prueba: hasta 12 meses)',
            },
          ],
          helpText:
            'Determina el período de prueba aplicable conforme al Art. 10° LPCL. El trabajador de confianza tiene acceso a información reservada; el de dirección representa al empleador.',
        },
        {
          id: 'periodo_prueba',
          label: 'Período de prueba (meses)',
          type: 'select',
          required: true,
          options: [
            { value: '3', label: '3 meses (ordinario)' },
            { value: '6', label: '6 meses (confianza)' },
            { value: '12', label: '12 meses (dirección)' },
          ],
        },
        {
          id: 'remuneracion',
          label: 'Remuneración mensual bruta (S/)',
          type: 'currency',
          required: true,
          helpText: 'No puede ser inferior a la RMV vigente (S/ 1,130 para 2026).',
          validation: { min: 1130, message: 'Debe ser mayor o igual a la RMV (S/ 1,130)' },
        },
        {
          id: 'remuneracion_letras',
          label: 'Remuneración en letras',
          type: 'text',
          required: true,
          placeholder: 'UN MIL QUINIENTOS',
          helpText:
            'Escriba el monto en letras (sin los céntimos). Ej: "UN MIL QUINIENTOS".',
        },
        {
          id: 'jornada',
          label: 'Jornada laboral semanal',
          type: 'select',
          required: true,
          options: [
            {
              value: '48',
              label: 'Tiempo completo — 48 horas semanales / 8 horas diarias',
            },
            {
              value: 'parcial',
              label: 'Tiempo parcial — menos de 4 horas diarias (sin CTS, sin gratificaciones)',
            },
            { value: 'otro', label: 'Jornada especial o reducida' },
          ],
        },
        {
          id: 'jornada_horas',
          label: 'Horas semanales (jornada especial)',
          type: 'number',
          condition: { field: 'jornada', value: 'otro' },
          validation: { min: 1, max: 48, message: 'Entre 1 y 48 horas' },
        },
        {
          id: 'horario',
          label: 'Horario de trabajo',
          type: 'text',
          required: true,
          placeholder: 'Lunes a viernes, de 8:00 a.m. a 5:00 p.m. (1 hora de refrigerio)',
        },
        {
          id: 'lugar_trabajo',
          label: 'Lugar / Centro de trabajo',
          type: 'text',
          required: true,
          placeholder: 'Sede principal — Av. _______ N° ___, Lima',
        },
        {
          id: 'asignacion_familiar',
          label: '¿Percibe Asignación Familiar?',
          type: 'toggle',
          helpText:
            'Marcar si el trabajador tiene hijos menores de 18 años o mayores con incapacidad. Equivale al 10% de la RMV (S/ 113 para 2026). Ley 25129.',
        },
        {
          id: 'ciudad_contrato',
          label: 'Ciudad de suscripción del contrato',
          type: 'text',
          required: true,
          placeholder: 'Lima',
        },
      ],
    },
    {
      id: 'clausulas_adicionales',
      title: 'Cláusulas Adicionales',
      fields: [
        {
          id: 'incluir_confidencialidad',
          label: 'Incluir cláusula de confidencialidad',
          type: 'toggle',
          helpText:
            'Recomendado para cargos con acceso a información sensible: clientes, proveedores, estrategia, fórmulas, etc.',
        },
        {
          id: 'incluir_no_competencia',
          label: 'Incluir cláusula de no competencia post-contractual',
          type: 'toggle',
          helpText:
            'Válida solo si se pacta compensación económica. Sin compensación, es nula de pleno derecho.',
        },
        {
          id: 'compensacion_no_competencia',
          label: 'Compensación mensual por no competencia (S/)',
          type: 'currency',
          condition: { field: 'incluir_no_competencia', value: true },
          helpText:
            'Monto mensual a pagar durante el período post-contractual de no competencia (máximo recomendado: 2 años).',
        },
        {
          id: 'incluir_propiedad_intelectual',
          label: 'Incluir cláusula de propiedad intelectual',
          type: 'toggle',
          helpText:
            'Para cargos creativos, de desarrollo de software, diseño, investigación o innovación.',
        },
        {
          id: 'clausulas_especiales',
          label: 'Pactos especiales adicionales (texto libre)',
          type: 'textarea',
          required: false,
          helpText:
            'Cualquier condición particular acordada por las partes que no contradiga normas de orden público.',
        },
      ],
    },
  ],
  contentBlocks: [
    {
      id: 'titulo',
      text: 'CONTRATO DE TRABAJO A PLAZO INDETERMINADO',
    },
    {
      id: 'referencia',
      text: '{{numero_contrato}}',
      condition: 'numero_contrato && numero_contrato.trim() !== ""',
      isOptional: true,
    },
    {
      id: 'comparecientes',
      text:
        'Conste por el presente instrumento el Contrato de Trabajo a Plazo Indeterminado que, al amparo del artículo 4° del Texto Único Ordenado del Decreto Legislativo N° 728, Ley de Productividad y Competitividad Laboral, aprobado por Decreto Supremo N° 003-97-TR, suscriben de una parte:\n\n' +
        'EL EMPLEADOR: {{empleador_razon_social}}, persona jurídica constituida y existente al amparo de la legislación peruana, con RUC N° {{empleador_ruc}}, con domicilio en {{empleador_direccion}}, debidamente representada por el/la Sr./Sra. {{empleador_representante}}, identificado/a con DNI N° {{empleador_dni_representante}}, en su calidad de {{empleador_cargo_representante}}, con facultades suficientes para la suscripción del presente contrato conforme al poder que obra inscrito en los Registros Públicos, a quien en adelante se denominará EL EMPLEADOR; y,\n\n' +
        'EL TRABAJADOR: {{trabajador_nombre}}, identificado/a con DNI N° {{trabajador_dni}}, de nacionalidad {{trabajador_nacionalidad}}, con domicilio en {{trabajador_direccion}}, a quien en adelante se denominará EL TRABAJADOR;\n\n' +
        'quienes suscriben el presente contrato en los términos y condiciones siguientes:',
    },
    {
      id: 'primera',
      title: 'PRIMERA: OBJETO DEL CONTRATO',
      text:
        'EL EMPLEADOR contrata los servicios personales, subordinados y exclusivos de EL TRABAJADOR para que desempeñe el cargo de {{cargo}}, adscrito al área de {{area}}, debiendo realizar, entre otras, las siguientes funciones:\n\n' +
        '{{funciones}}\n\n' +
        'Queda expresamente establecido que las funciones descritas no son limitativas. EL TRABAJADOR podrá realizar otras labores complementarias, propias de su cargo y nivel, que le sean encomendadas por EL EMPLEADOR en ejercicio de su facultad de dirección.',
    },
    {
      id: 'segunda',
      title: 'SEGUNDA: VIGENCIA DEL CONTRATO Y PERÍODO DE PRUEBA',
      text:
        'El presente contrato tiene carácter indefinido. EL TRABAJADOR iniciará la prestación de sus servicios con fecha {{fecha_inicio}}.\n\n' +
        'De conformidad con el artículo 10° del D.S. N° 003-97-TR, EL TRABAJADOR estará sujeto a un período de prueba de {{periodo_prueba}} meses contados desde la fecha de inicio, durante el cual EL EMPLEADOR podrá resolver el vínculo laboral sin expresión de causa ni pago de indemnización. Superado dicho período, EL TRABAJADOR gozará de protección contra el despido arbitrario conforme a ley.\n\n' +
        'El período de prueba, incluyendo su ampliación cuando corresponda, no podrá exceder de doce (12) meses.',
    },
    {
      id: 'tercera',
      title: 'TERCERA: REMUNERACIÓN',
      text:
        'EL EMPLEADOR abonará a EL TRABAJADOR una remuneración mensual bruta de S/ {{remuneracion}} ({{remuneracion_letras}} Y 00/100 SOLES), la que será pagada mensualmente en la oportunidad, forma y mediante el medio de pago que establezca EL EMPLEADOR. La remuneración incluye la contraprestación por el trabajo ordinario, sin incluir horas extras u otros conceptos variables.\n\n' +
        'De la remuneración bruta se realizarán las deducciones de ley: aporte al Sistema Previsional (AFP u ONP según corresponda), retención por Impuesto a la Renta de quinta categoría (cuando supere el mínimo imponible) y demás descuentos autorizados por el trabajador.\n\n' +
        'La remuneración sirve de base de cálculo para la Compensación por Tiempo de Servicios, Gratificaciones Legales, Vacaciones, Asignación Familiar y demás beneficios que correspondan conforme a ley.',
    },
    {
      id: 'cuarta',
      title: 'CUARTA: JORNADA Y HORARIO DE TRABAJO',
      text:
        'EL TRABAJADOR cumplirá una jornada semanal de {{jornada}} horas, con el siguiente horario: {{horario}}, el cual incluye el tiempo para refrigerio.\n\n' +
        'EL EMPLEADOR podrá modificar el horario de trabajo en ejercicio de su poder de dirección establecido en el artículo 9° del D.S. N° 003-97-TR, respetando en todo caso los límites máximos de jornada establecidos por el artículo 25° de la Constitución Política del Perú (8 horas diarias o 48 horas semanales) y la Ley N° 27671.\n\n' +
        'El trabajo en sobretiempo, cuando sea necesario y acordado por las partes, será remunerado conforme a los artículos 10° y 11° de la Ley N° 27671 (25% adicional las dos primeras horas; 35% adicional a partir de la tercera hora). El trabajo en sobretiempo es de libre acuerdo entre las partes; la imposición del mismo por parte de EL EMPLEADOR está prohibida.',
    },
    {
      id: 'quinta',
      title: 'QUINTA: LUGAR DE TRABAJO E IUS VARIANDI',
      text:
        'EL TRABAJADOR prestará sus servicios en {{lugar_trabajo}}. EL EMPLEADOR podrá variar el lugar de trabajo cuando las necesidades de la empresa así lo requieran, dentro de los límites del artículo 9° del D.S. N° 003-97-TR (ius variandi razonable y justificado).\n\n' +
        'El desplazamiento a un lugar de trabajo distinto al pactado, que implique cambio de residencia del trabajador o sus familiares, requerirá acuerdo escrito de las partes. Los gastos de traslado debidamente acreditados serán asumidos por EL EMPLEADOR.',
    },
    {
      id: 'sexta',
      title: 'SEXTA: BENEFICIOS SOCIALES',
      text:
        'EL TRABAJADOR tendrá derecho a los siguientes beneficios sociales, conforme a la legislación laboral vigente:\n\n' +
        'a) COMPENSACIÓN POR TIEMPO DE SERVICIOS (CTS): Equivalente a una remuneración mensual por año de servicios, calculada semestralmente sobre la remuneración computable del último mes. EL EMPLEADOR depositará la CTS en la entidad financiera del Sistema Financiero Nacional elegida por EL TRABAJADOR, antes del 15 de mayo (por el período noviembre-abril) y antes del 15 de noviembre (por el período mayo-octubre) de cada año, conforme al Texto Único Ordenado del Decreto Supremo N° 001-97-TR y sus modificatorias.\n\n' +
        'b) GRATIFICACIONES LEGALES: EL TRABAJADOR percibirá gratificación ordinaria equivalente a una (1) remuneración mensual por Fiestas Patrias (pago antes del 15 de julio) y una (1) remuneración mensual por Navidad (pago antes del 15 de diciembre), proporcional al tiempo laborado en cada semestre. Las gratificaciones son inafectas de aportaciones y contribuciones del trabajador, conforme a la Ley N° 27735 y el D.S. N° 005-2002-TR.\n\n' +
        'c) VACACIONES ANUALES: EL TRABAJADOR tiene derecho a treinta (30) días calendario de descanso vacacional remunerado por cada año completo de servicios, conforme al Decreto Legislativo N° 713 y el D.S. N° 012-92-TR. El goce de vacaciones se realizará en la oportunidad que acuerden las partes, tomando en cuenta las necesidades de EL EMPLEADOR. La acumulación de dos períodos vacacionales sin goce generará obligación de triple pago (remuneración por el período, indemnización equivalente y remuneración por las vacaciones efectivamente gozadas).\n\n' +
        'd) ASIGNACIÓN FAMILIAR: De conformidad con la Ley N° 25129 y el D.S. N° 035-90-TR, EL TRABAJADOR percibirá mensualmente una asignación familiar equivalente al diez por ciento (10%) de la Remuneración Mínima Vital vigente (S/ 113.00 para el año 2026), en tanto mantenga a su cargo hijos menores de dieciocho (18) años o mayores con incapacidad declarada judicialmente.\n\n' +
        'e) SEGURO SOCIAL DE SALUD (ESSALUD): EL EMPLEADOR aportará a EsSalud el nueve por ciento (9%) de la remuneración mensual de EL TRABAJADOR, conforme a la Ley N° 26790, lo que otorgará cobertura de prestaciones de salud a EL TRABAJADOR y sus derechohabientes.\n\n' +
        'f) SEGURO DE VIDA LEY: A partir del cuarto (4°) año de servicios ininterrumpidos, EL EMPLEADOR está obligado a contratar una póliza de Seguro de Vida Ley en favor de EL TRABAJADOR, conforme al Decreto Legislativo N° 688 y sus modificatorias (Ley N° 31461). Con más de tres (3) meses y hasta los tres (3) años de servicios, EL EMPLEADOR podrá contratar voluntariamente dicha póliza.\n\n' +
        'g) PARTICIPACIÓN EN UTILIDADES: EL TRABAJADOR tendrá derecho a participar en las utilidades de la empresa, según la actividad económica principal de EL EMPLEADOR y conforme a las tasas establecidas en el Decreto Legislativo N° 892 y el D.S. N° 009-98-TR, cuando EL EMPLEADOR genere renta de tercera categoría y cuente con más de veinte (20) trabajadores.',
    },
    {
      id: 'septima_af',
      title: 'SOBRE LA ASIGNACIÓN FAMILIAR',
      text:
        'EL TRABAJADOR declara bajo juramento que tiene hijos menores de dieciocho (18) años a su cargo, por lo que percibirá mensualmente la Asignación Familiar equivalente al diez por ciento (10%) de la Remuneración Mínima Vital vigente, conforme a la Ley N° 25129. EL TRABAJADOR se obliga a comunicar a EL EMPLEADOR cualquier variación en dicha condición dentro de los cinco (5) días hábiles de producida.',
      condition: 'asignacion_familiar === true',
      isOptional: true,
    },
    {
      id: 'octava',
      title: 'SÉPTIMA: OBLIGACIONES DEL EMPLEADOR',
      text:
        'EL EMPLEADOR se obliga a:\n\n' +
        '1. Registrar a EL TRABAJADOR en el T-Registro (SUNAT) dentro del día hábil siguiente al inicio de labores, conforme al D.S. N° 015-2010-TR.\n\n' +
        '2. Efectuar oportunamente los aportes a EsSalud (9% de la remuneración) y retener y abonar el aporte al Sistema Previsional (AFP u ONP) dentro de los cronogramas establecidos por la SUNAT.\n\n' +
        '3. Depositar la CTS en la entidad financiera elegida por EL TRABAJADOR, dentro de los plazos legales establecidos.\n\n' +
        '4. Abonar las Gratificaciones Legales de julio y diciembre conforme a ley y dentro de los plazos establecidos.\n\n' +
        '5. Otorgar a EL TRABAJADOR el descanso vacacional de treinta (30) días anuales en la oportunidad acordada y a más tardar dentro del año siguiente al cumplimiento del récord vacacional.\n\n' +
        '6. Entregar a EL TRABAJADOR la Boleta de Pago de Remuneraciones, en formato físico o electrónico, dentro de las cuarenta y ocho (48) horas de efectuado el pago, conforme al D.S. N° 009-2011-TR.\n\n' +
        '7. Proporcionar a EL TRABAJADOR los instrumentos, equipos, materiales e información necesarios para el desempeño de sus funciones.\n\n' +
        '8. Garantizar un ambiente de trabajo seguro, saludable y libre de hostigamiento sexual, discriminación y actos de violencia, conforme a la Ley N° 29783, la Ley N° 27942 y la Ley N° 30709.\n\n' +
        '9. Proveer a EL TRABAJADOR de los equipos de protección personal (EPP) que correspondan a los riesgos identificados en la matriz IPERC, conforme a la Ley N° 29783.\n\n' +
        '10. Otorgar los exámenes médicos ocupacionales de ingreso, periódicos y de retiro, conforme a la Ley N° 29783 y la R.M. N° 571-2014-MINSA.',
    },
    {
      id: 'novena',
      title: 'OCTAVA: OBLIGACIONES DEL TRABAJADOR',
      text:
        'EL TRABAJADOR se obliga a:\n\n' +
        '1. Prestar sus servicios personalmente con diligencia, eficiencia y honestidad, alcanzando los estándares de rendimiento y calidad requeridos por EL EMPLEADOR.\n\n' +
        '2. Cumplir puntualmente el horario y la jornada de trabajo establecidos, comunicando con anticipación razonable cualquier imposibilidad de asistencia.\n\n' +
        '3. Observar y cumplir el Reglamento Interno de Trabajo, el Reglamento de Seguridad y Salud en el Trabajo, las directivas internas, circulares, manuales de procedimientos e instrucciones que imparta EL EMPLEADOR.\n\n' +
        '4. Guardar respeto y consideración hacia sus superiores jerárquicos, pares y subordinados, así como hacia los clientes, proveedores y visitantes de EL EMPLEADOR, manteniendo un trato cordial y profesional.\n\n' +
        '5. Conservar y mantener en buen estado los bienes, equipos y activos que EL EMPLEADOR le confíe para el desempeño de sus funciones, respondiendo por los daños que cause por negligencia, impericia o dolo.\n\n' +
        '6. No realizar actividades particulares ajenas a las funciones encomendadas durante la jornada laboral, ni utilizar los recursos, equipos, instalaciones o información de EL EMPLEADOR para beneficio propio o de terceros ajenos a EL EMPLEADOR.\n\n' +
        '7. Cumplir con todas las medidas de Seguridad y Salud en el Trabajo, usar correctamente los equipos de protección personal proporcionados, reportar todo accidente, incidente o condición insegura a su supervisor inmediato dentro de las veinticuatro (24) horas de ocurrido, y participar en las capacitaciones de SST programadas.\n\n' +
        '8. Someterse a los exámenes médicos ocupacionales de ingreso, periódicos y de retiro, conforme a las normas de Seguridad y Salud en el Trabajo.\n\n' +
        '9. Comunicar a EL EMPLEADOR, en el plazo máximo de cuarenta y ocho (48) horas, cualquier cambio en sus datos personales (domicilio, estado civil, número de hijos, entidad previsional, etc.) que resulte relevante para la relación laboral.\n\n' +
        '10. Guardar reserva sobre toda información comercial, financiera, técnica, estratégica, de clientes, proveedores y procesos internos de EL EMPLEADOR a la que acceda con motivo de sus funciones, tanto durante la vigencia del contrato como después de su extinción.',
    },
    {
      id: 'decima',
      title: 'NOVENA: PODER DE DIRECCIÓN, IUS VARIANDI Y DISCIPLINA',
      text:
        'De conformidad con el artículo 9° del D.S. N° 003-97-TR, EL EMPLEADOR tiene las facultades de:\n\n' +
        '(i) Normar reglamentariamente las labores mediante directivas, circulares, protocolos y reglamentos internos;\n' +
        '(ii) Dictar las órdenes e instrucciones necesarias para la correcta ejecución de las funciones;\n' +
        '(iii) Fiscalizar el desempeño de EL TRABAJADOR dentro de los límites del respeto a su dignidad;\n' +
        '(iv) Sancionar disciplinariamente, dentro de criterios de proporcionalidad y razonabilidad, cualquier infracción o incumplimiento de las obligaciones laborales; y\n' +
        '(v) Modificar turnos, días u horas de trabajo, así como la forma y modalidad de la prestación de las labores, cuando medien razones justificadas y se respeten los límites legales.\n\n' +
        'Las sanciones disciplinarias aplicables, de menor a mayor gravedad, son: (a) amonestación verbal, (b) amonestación escrita, (c) suspensión sin goce de haber y (d) despido. Para la aplicación del despido por falta grave, se seguirá el procedimiento de ley: carta de preaviso concediendo seis (6) días naturales para el ejercicio del derecho de defensa, carta de despido y comunicación al MTPE conforme al artículo 31° del D.S. N° 003-97-TR.',
    },
    {
      id: 'decima_primera_conf',
      title: 'DÉCIMA: CONFIDENCIALIDAD Y SECRETO EMPRESARIAL',
      text:
        'EL TRABAJADOR se obliga a guardar estricta confidencialidad sobre toda Información Confidencial a la que acceda en virtud de la relación laboral. Se entiende por Información Confidencial, sin carácter limitativo: información comercial y financiera, listas de clientes y proveedores, estrategias de negocio, planes de expansión, procesos y procedimientos internos, fórmulas, algoritmos, desarrollos tecnológicos, know-how, bases de datos, contratos con terceros y cualquier otra información que EL EMPLEADOR haya designado expresamente como confidencial o que por su naturaleza deba entenderse como tal.\n\n' +
        'Esta obligación de confidencialidad subsistirá durante toda la vigencia del contrato y por un plazo de dos (2) años contados desde la extinción del vínculo laboral por cualquier causa, sin que EL TRABAJADOR reciba compensación adicional por dicha obligación post-contractual.\n\n' +
        'El incumplimiento de esta cláusula facultará a EL EMPLEADOR a exigir la indemnización por los daños y perjuicios causados, conforme a las normas del Código Civil, sin perjuicio de la responsabilidad penal que pudiera corresponder.',
      condition: 'incluir_confidencialidad === true',
      isOptional: true,
    },
    {
      id: 'decima_segunda_nc',
      title: 'DÉCIMA PRIMERA: NO COMPETENCIA POST-CONTRACTUAL',
      text:
        'En atención a las funciones desempeñadas y al acceso privilegiado a información estratégica de EL EMPLEADOR, EL TRABAJADOR se compromete a no prestar servicios, directa o indirectamente (ya sea como empleado, consultor, socio, accionista o en cualquier otra calidad), en empresas o actividades directamente competidoras del giro principal de EL EMPLEADOR, durante el período de vigencia del contrato y por un plazo de un (1) año contado desde la extinción del vínculo laboral.\n\n' +
        'Como contraprestación por este compromiso post-contractual, EL EMPLEADOR abonará a EL TRABAJADOR, mensualmente durante el año de no competencia, la suma de S/ {{compensacion_no_competencia}} (más IGV si correspondiera), sujeta a las retenciones tributarias de ley.\n\n' +
        'El incumplimiento de esta cláusula por EL TRABAJADOR lo obligará a devolver las sumas percibidas como compensación y a indemnizar a EL EMPLEADOR por los daños y perjuicios causados.',
      condition: 'incluir_no_competencia === true',
      isOptional: true,
    },
    {
      id: 'decima_tercera_pi',
      title: 'DÉCIMA SEGUNDA: PROPIEDAD INTELECTUAL E INNOVACIÓN',
      text:
        'Toda creación intelectual, invención, mejora, desarrollo, software, código fuente, diseño, base de datos, proceso, metodología, obra protegida o cualquier otro bien inmaterial que EL TRABAJADOR produzca, conciba o desarrolle durante la vigencia del contrato, sea durante la jornada laboral o fuera de ella, utilizando recursos o información de EL EMPLEADOR o en el marco de sus funciones, será de propiedad exclusiva de EL EMPLEADOR desde el momento de su creación, sin que EL TRABAJADOR tenga derecho a compensación adicional.\n\n' +
        'EL TRABAJADOR cede y transfiere desde ya a favor de EL EMPLEADOR todos los derechos patrimoniales sobre dichas creaciones, conforme al Decreto Legislativo N° 1075 y al Decreto Legislativo N° 822. Esta cesión incluye el derecho de reproducción, distribución, comunicación pública, transformación y cualquier otro derecho de explotación de la obra.\n\n' +
        'EL TRABAJADOR se obliga a suscribir cuantos documentos sean necesarios para perfeccionar la titularidad de EL EMPLEADOR sobre dichas creaciones.',
      condition: 'incluir_propiedad_intelectual === true',
      isOptional: true,
    },
    {
      id: 'decima_cuarta',
      title: 'DÉCIMA TERCERA: CAUSALES DE EXTINCIÓN DEL CONTRATO',
      text:
        'El presente contrato se extinguirá por las causales establecidas en el artículo 16° del D.S. N° 003-97-TR, entre ellas:\n\n' +
        'a) Fallecimiento del trabajador o del empleador persona natural;\n' +
        'b) Renuncia o retiro voluntario del trabajador, con preaviso escrito de treinta (30) días naturales a EL EMPLEADOR, salvo que este lo exonere del plazo;\n' +
        'c) Mutuo disenso entre las partes, expresado por escrito;\n' +
        'd) Invalidez absoluta permanente del trabajador, declarada por EsSalud o el órgano competente;\n' +
        'e) Jubilación del trabajador, de oficio a los 70 años con derecho a pensión o voluntaria;\n' +
        'f) Despido por causa justa debidamente comprobada, relacionada con la capacidad o la conducta del trabajador, conforme al procedimiento previsto en los artículos 23° al 35° del D.S. N° 003-97-TR;\n' +
        'g) Terminación de la relación laboral por causa objetiva, conforme a los artículos 46° al 52° del D.S. N° 003-97-TR (cese colectivo);\n' +
        'h) Caso fortuito o fuerza mayor debidamente verificado, que haga imposible la continuación de la relación laboral.\n\n' +
        'El despido del trabajador sin causa justa o el incumplimiento de las formalidades legales del proceso de despido dará lugar al pago de la indemnización por despido arbitrario, equivalente a una remuneración y media (1.5) mensual por cada año completo de servicios, con un máximo de doce (12) remuneraciones, conforme al artículo 38° del D.S. N° 003-97-TR.',
    },
    {
      id: 'decima_quinta',
      title: 'DÉCIMA CUARTA: DOMICILIO Y NOTIFICACIONES',
      text:
        'Para los efectos del presente contrato, las partes señalan como domicilios:\n\n' +
        'EL EMPLEADOR: {{empleador_direccion}}\n' +
        'EL TRABAJADOR: {{trabajador_direccion}}\n\n' +
        'Toda comunicación, notificación o documento laboral dirigido a los domicilios anteriormente señalados se tendrá por válidamente efectuada. Cualquier cambio de domicilio deberá ser comunicado a la otra parte por escrito, dentro de las cuarenta y ocho (48) horas de producido el cambio. En defecto de comunicación oportuna, se tendrán por válidas las notificaciones realizadas al domicilio anteriormente señalado.',
    },
    {
      id: 'decima_sexta',
      title: 'DÉCIMA QUINTA: MODIFICACIÓN Y NULIDAD PARCIAL',
      text:
        'El presente contrato solo podrá ser modificado mediante acuerdo escrito suscrito por ambas partes. Ninguna modificación verbal tendrá valor ni eficacia jurídica.\n\n' +
        'Si alguna cláusula o disposición del presente contrato resultara nula, inválida, ilegal o inaplicable, dicha nulidad o inaplicabilidad no afectará la validez y exigibilidad de las restantes cláusulas, las cuales continuarán en plena vigencia. Las partes se comprometen a reemplazar la cláusula inválida por una disposición válida que refleje en la mayor medida posible la intención original de las partes.\n\n' +
        'El presente contrato anula y reemplaza cualquier acuerdo, convenio o entendimiento previo entre las partes sobre las materias aquí tratadas.',
    },
    {
      id: 'decima_septima',
      title: 'DÉCIMA SEXTA: CONCILIACIÓN EXTRAJUDICIAL',
      text:
        'Ante cualquier discrepancia, controversia o reclamación derivada del presente contrato o de la relación laboral, las partes se comprometen a agotar en primer lugar un proceso de conciliación extrajudicial ante un Centro de Conciliación acreditado por el Ministerio de Justicia y Derechos Humanos, conforme a la Ley N° 26872 y su Reglamento. El plazo máximo del proceso conciliatorio será de treinta (30) días calendario, salvo acuerdo de ampliación.\n\n' +
        'De no llegarse a un acuerdo conciliatorio, las partes quedarán habilitadas para recurrir a la instancia judicial competente.',
    },
    {
      id: 'decima_octava',
      title: 'DÉCIMA SÉPTIMA: LEGISLACIÓN APLICABLE Y JURISDICCIÓN',
      text:
        'El presente contrato se rige e interpreta conforme al ordenamiento jurídico laboral peruano, en particular por el Texto Único Ordenado del Decreto Legislativo N° 728 — Ley de Productividad y Competitividad Laboral (D.S. N° 003-97-TR), la Ley N° 29497 — Nueva Ley Procesal del Trabajo, y las demás disposiciones laborales, reglamentarias y convencionales aplicables.\n\n' +
        'Para la resolución de cualquier controversia no resuelta por conciliación extrajudicial, las partes se someten expresamente a la competencia y jurisdicción de los Juzgados Laborales de {{ciudad_contrato}}, renunciando al fuero de sus domicilios.',
    },
    {
      id: 'clausulas_especiales_bloque',
      title: 'CLÁUSULAS ESPECIALES',
      text: '{{clausulas_especiales}}',
      condition: 'clausulas_especiales && clausulas_especiales.trim() !== ""',
      isOptional: true,
    },
    {
      id: 'firmas',
      text:
        'En señal de conformidad con todo lo estipulado, las partes suscriben el presente contrato en dos (2) ejemplares originales de igual tenor y valor, en la ciudad de {{ciudad_contrato}}, el día _____ del mes de ________________ de _______.\n\n\n' +
        '────────────────────────────────────          ────────────────────────────────────\n' +
        '          EL EMPLEADOR                                    EL TRABAJADOR\n' +
        '   {{empleador_representante}}                      {{trabajador_nombre}}\n' +
        '   {{empleador_cargo_representante}}                  DNI N° {{trabajador_dni}}\n' +
        '   DNI N° {{empleador_dni_representante}}\n' +
        '   En representación de:\n' +
        '   {{empleador_razon_social}}\n' +
        '   RUC N° {{empleador_ruc}}\n\n\n' +
        '────────────────────────────────────\n' +
        '                 TESTIGO\n' +
        '   Nombre: _________________________________\n' +
        '   DNI N°: _________________________________',
    },
  ],
}

// =============================================
// CONTRATO DE TRABAJO SUJETO A MODALIDAD
// (Plazo Fijo con Causa Objetiva)
// D.Leg. 728 / D.S. 003-97-TR — Art. 53-82
// =============================================
export const CONTRATO_PLAZO_FIJO: ContractTemplateDefinition = {
  id: 'laboral-plazo-fijo',
  type: 'LABORAL_PLAZO_FIJO',
  name: 'Contrato de Trabajo Sujeto a Modalidad (Plazo Fijo)',
  description:
    'Contrato con plazo determinado que requiere causa objetiva demostrable. La ausencia de causa objetiva real genera desnaturalización y convierte el contrato en indefinido (Art. 77° LPCL). Incluye 8 modalidades conforme al D.S. 003-97-TR.',
  legalBasis: 'D.Leg. 728 / D.S. 003-97-TR — Art. 53° al 82°',
  sections: [
    SECCION_EMPLEADOR,
    SECCION_TRABAJADOR,
    {
      id: 'modalidad',
      title: 'Modalidad y Causa Objetiva',
      fields: [
        {
          id: 'modalidad_tipo',
          label: 'Modalidad del contrato',
          type: 'select',
          required: true,
          options: [
            {
              value: 'inicio_actividad',
              label: 'Por inicio o incremento de actividad — Art. 57° (máx. 3 años)',
            },
            {
              value: 'necesidad_mercado',
              label: 'Por necesidades del mercado — Art. 58° (máx. 5 años)',
            },
            {
              value: 'reconversion_empresarial',
              label: 'Por reconversión empresarial — Art. 59° (máx. 2 años)',
            },
            {
              value: 'ocasional',
              label: 'Ocasional — Art. 60° (máx. 6 meses/año)',
            },
            {
              value: 'suplencia',
              label: 'De suplencia — Art. 61° (duración = ausencia)',
            },
            {
              value: 'emergencia',
              label: 'De emergencia — Art. 62° (máx. 6 meses/año)',
            },
            {
              value: 'obra_determinada',
              label: 'Para obra o servicio específico — Art. 63° (máx. 8 años acum.)',
            },
            {
              value: 'intermitente',
              label: 'Intermitente — Art. 64° (necesidad discontinua permanente)',
            },
          ],
          helpText:
            'Seleccione la modalidad que corresponda a la realidad de la empresa. La modalidad incorrecta es causal de desnaturalización.',
        },
        {
          id: 'causa_objetiva_detalle',
          label: 'Descripción detallada de la causa objetiva',
          type: 'textarea',
          required: true,
          helpText:
            'CRÍTICO: Describa con precisión los hechos concretos que justifican la temporalidad. Ejemplo para necesidad de mercado: "Incremento en un 35% de la demanda del producto X durante la campaña de fin de año, según proyecciones de ventas del período noviembre 2026 - enero 2027, que excede la capacidad de producción del personal permanente actual de 12 operarios." Una causa genérica o imprecisa puede ser observada por SUNAFIL.',
          placeholder:
            'Describa la situación específica, temporal y verificable que origina la necesidad de contratar bajo esta modalidad...',
        },
        {
          id: 'trabajador_suplido',
          label: 'Nombre del trabajador suplido',
          type: 'text',
          condition: { field: 'modalidad_tipo', value: 'suplencia' },
          helpText: 'Requerido para suplencia: nombre completo del trabajador ausente.',
        },
        {
          id: 'motivo_ausencia_suplido',
          label: 'Motivo de ausencia del trabajador suplido',
          type: 'select',
          condition: { field: 'modalidad_tipo', value: 'suplencia' },
          options: [
            { value: 'vacaciones', label: 'Descanso vacacional' },
            { value: 'licencia_maternidad', label: 'Licencia por maternidad (98 días)' },
            { value: 'licencia_paternidad', label: 'Licencia por paternidad (10 días)' },
            { value: 'licencia_medica', label: 'Licencia médica / descanso médico' },
            { value: 'licencia_sindical', label: 'Licencia sindical' },
            { value: 'suspension_imperfecta', label: 'Suspensión imperfecta de labores' },
            { value: 'otro', label: 'Otra causa justificada' },
          ],
        },
        {
          id: 'descripcion_obra_servicio',
          label: 'Descripción de la obra o servicio específico',
          type: 'textarea',
          condition: { field: 'modalidad_tipo', value: 'obra_determinada' },
          helpText:
            'Detalle la obra, proyecto o servicio específico que constituye la causa objetiva. Debe ser identificable y tener un punto de terminación verificable.',
          placeholder:
            'Ej: "Implementación del sistema ERP SAP para los módulos de finanzas y logística, según el contrato de consultoría N° XYZ suscrito con el cliente ABC S.A.C. con fecha DD/MM/YYYY"',
        },
        {
          id: 'numero_registro_mtpe',
          label: 'N° de registro MTPE (si aplica)',
          type: 'text',
          required: false,
          helpText:
            'Algunos contratos modales requieren registro ante el MTPE. Ingréselo si ya fue registrado.',
        },
      ],
    },
    {
      id: 'duracion',
      title: 'Duración del Contrato',
      fields: [
        {
          id: 'fecha_inicio',
          label: 'Fecha de inicio',
          type: 'date',
          required: true,
        },
        {
          id: 'fecha_fin',
          label: 'Fecha de término',
          type: 'date',
          required: true,
          helpText:
            'Verifique que el plazo no exceda el máximo legal de la modalidad seleccionada.',
        },
        {
          id: 'duracion_descripcion',
          label: 'Descripción de la duración',
          type: 'text',
          required: true,
          placeholder: 'seis (6) meses',
          helpText: 'Escriba la duración en letras. Ej: "tres (3) meses", "un (1) año".',
        },
      ],
    },
    {
      id: 'condiciones_laborales',
      title: 'Condiciones Laborales',
      fields: [
        {
          id: 'cargo',
          label: 'Cargo / Puesto de trabajo',
          type: 'text',
          required: true,
        },
        {
          id: 'area',
          label: 'Área / Departamento',
          type: 'text',
          required: true,
        },
        {
          id: 'funciones',
          label: 'Descripción de funciones principales',
          type: 'textarea',
          required: true,
        },
        {
          id: 'remuneracion',
          label: 'Remuneración mensual bruta (S/)',
          type: 'currency',
          required: true,
          validation: { min: 1130, message: 'No puede ser inferior a la RMV (S/ 1,130)' },
        },
        {
          id: 'remuneracion_letras',
          label: 'Remuneración en letras',
          type: 'text',
          required: true,
          placeholder: 'UN MIL CIENTO TREINTA',
        },
        {
          id: 'jornada',
          label: 'Jornada laboral',
          type: 'select',
          required: true,
          options: [
            { value: '48', label: 'Tiempo completo (48 horas semanales)' },
            { value: 'parcial', label: 'Tiempo parcial (menos de 4 horas diarias)' },
            { value: 'otro', label: 'Jornada especial' },
          ],
        },
        {
          id: 'horario',
          label: 'Horario de trabajo',
          type: 'text',
          required: true,
          placeholder: 'Lunes a viernes, de 8:00 a.m. a 5:00 p.m.',
        },
        {
          id: 'lugar_trabajo',
          label: 'Lugar de trabajo',
          type: 'text',
          required: true,
        },
        {
          id: 'asignacion_familiar',
          label: '¿Percibe Asignación Familiar?',
          type: 'toggle',
          helpText: 'Marcar si el trabajador tiene hijos menores de 18 años a cargo.',
        },
        {
          id: 'ciudad_contrato',
          label: 'Ciudad de suscripción',
          type: 'text',
          required: true,
          placeholder: 'Lima',
        },
      ],
    },
  ],
  contentBlocks: [
    {
      id: 'titulo',
      text: 'CONTRATO DE TRABAJO SUJETO A MODALIDAD',
    },
    {
      id: 'comparecientes',
      text:
        'Conste por el presente instrumento el Contrato de Trabajo Sujeto a Modalidad, que al amparo de los artículos 53° al 82° del Texto Único Ordenado del Decreto Legislativo N° 728, Ley de Productividad y Competitividad Laboral, aprobado por Decreto Supremo N° 003-97-TR, suscriben de una parte:\n\n' +
        'EL EMPLEADOR: {{empleador_razon_social}}, persona jurídica con RUC N° {{empleador_ruc}}, domiciliada en {{empleador_direccion}}, debidamente representada por el/la Sr./Sra. {{empleador_representante}}, identificado/a con DNI N° {{empleador_dni_representante}}, en su calidad de {{empleador_cargo_representante}}; a quien en adelante se denominará EL EMPLEADOR; y,\n\n' +
        'EL TRABAJADOR: {{trabajador_nombre}}, identificado/a con DNI N° {{trabajador_dni}}, de nacionalidad {{trabajador_nacionalidad}}, con domicilio en {{trabajador_direccion}}; a quien en adelante se denominará EL TRABAJADOR;\n\n' +
        'quienes acuerdan celebrar el presente contrato en los términos y condiciones siguientes:',
    },
    {
      id: 'primera',
      title: 'PRIMERA: OBJETO DEL CONTRATO',
      text:
        'EL EMPLEADOR contrata los servicios personales, subordinados y exclusivos de EL TRABAJADOR para que desempeñe el cargo de {{cargo}}, en el área de {{area}}, realizando las siguientes funciones principales:\n\n' +
        '{{funciones}}\n\n' +
        'Queda entendido que estas funciones no son limitativas y EL TRABAJADOR realizará las labores complementarias que le sean encomendadas en el marco del cargo contratado.',
    },
    // ─── Bloques condicionales por modalidad ───────────────────────────────
    {
      id: 'segunda_inicio_actividad',
      title: 'SEGUNDA: MODALIDAD Y CAUSA OBJETIVA',
      text:
        'El presente contrato se celebra al amparo del artículo 57° del D.S. N° 003-97-TR, bajo la MODALIDAD POR INICIO O INCREMENTO DE ACTIVIDAD, cuya causa objetiva que justifica la contratación temporal es la siguiente:\n\n' +
        '{{causa_objetiva_detalle}}\n\n' +
        'Esta modalidad tiene por fundamento el inicio de una nueva actividad empresarial, la apertura de nuevos establecimientos o mercados, o el inicio o incremento de las actividades ya existentes dentro de la empresa. La duración máxima acumulada de los contratos bajo esta modalidad suscritos con el mismo trabajador es de tres (3) años.\n\n' +
        'El presente contrato será presentado ante el Ministerio de Trabajo y Promoción del Empleo para su registro, dentro de los quince (15) días naturales desde su suscripción, conforme al artículo 73° del D.S. N° 003-97-TR.',
      condition: 'modalidad_tipo === "inicio_actividad"',
      isOptional: true,
    },
    {
      id: 'segunda_necesidad_mercado',
      title: 'SEGUNDA: MODALIDAD Y CAUSA OBJETIVA',
      text:
        'El presente contrato se celebra al amparo del artículo 58° del D.S. N° 003-97-TR, bajo la MODALIDAD POR NECESIDADES DEL MERCADO, cuya causa objetiva que justifica la contratación temporal es la siguiente:\n\n' +
        '{{causa_objetiva_detalle}}\n\n' +
        'Esta modalidad responde al incremento coyuntural e imprevisible de la producción o del volumen de actividad de la empresa, que no puede ser atendido con el personal permanente existente, siempre que dicho incremento no sea de naturaleza permanente. La duración máxima acumulada de los contratos bajo esta modalidad suscritos con el mismo trabajador es de cinco (5) años, incluyendo prórrogas.\n\n' +
        'El presente contrato será presentado ante el Ministerio de Trabajo y Promoción del Empleo para su registro, dentro de los quince (15) días naturales desde su suscripción.',
      condition: 'modalidad_tipo === "necesidad_mercado"',
      isOptional: true,
    },
    {
      id: 'segunda_reconversion',
      title: 'SEGUNDA: MODALIDAD Y CAUSA OBJETIVA',
      text:
        'El presente contrato se celebra al amparo del artículo 59° del D.S. N° 003-97-TR, bajo la MODALIDAD POR RECONVERSIÓN EMPRESARIAL, cuya causa objetiva que justifica la contratación temporal es la siguiente:\n\n' +
        '{{causa_objetiva_detalle}}\n\n' +
        'Esta modalidad obedece a la sustitución, ampliación o modificación de las actividades desarrolladas en la empresa y en general a toda variación de carácter tecnológico en maquinaria, equipos, instalaciones, medios de producción, sistemas, métodos y procedimientos productivos o administrativos. La duración máxima acumulada bajo esta modalidad es de dos (2) años.\n\n' +
        'El presente contrato será presentado ante el Ministerio de Trabajo y Promoción del Empleo para su registro, dentro de los quince (15) días naturales desde su suscripción.',
      condition: 'modalidad_tipo === "reconversion_empresarial"',
      isOptional: true,
    },
    {
      id: 'segunda_ocasional',
      title: 'SEGUNDA: MODALIDAD Y CAUSA OBJETIVA',
      text:
        'El presente contrato se celebra al amparo del artículo 60° del D.S. N° 003-97-TR, bajo la MODALIDAD OCASIONAL, cuya causa objetiva que justifica la contratación temporal es la siguiente:\n\n' +
        '{{causa_objetiva_detalle}}\n\n' +
        'Esta modalidad atiende necesidades transitorias y distintas a la actividad habitual del centro de trabajo. La duración máxima de los contratos bajo esta modalidad es de seis (6) meses en cada año calendario.\n\n' +
        'El presente contrato será presentado ante el Ministerio de Trabajo y Promoción del Empleo para su registro, dentro de los quince (15) días naturales desde su suscripción.',
      condition: 'modalidad_tipo === "ocasional"',
      isOptional: true,
    },
    {
      id: 'segunda_suplencia',
      title: 'SEGUNDA: MODALIDAD Y CAUSA OBJETIVA',
      text:
        'El presente contrato se celebra al amparo del artículo 61° del D.S. N° 003-97-TR, bajo la MODALIDAD DE SUPLENCIA.\n\n' +
        'El presente contrato tiene por objeto suplir temporalmente las labores de el/la Sr./Sra. {{trabajador_suplido}}, titular del cargo de {{cargo}} en EL EMPLEADOR, quien se encuentra transitoriamente ausente por {{motivo_ausencia_suplido}}.\n\n' +
        'EL TRABAJADOR desempeñará las funciones descritas en la cláusula PRIMERA durante el tiempo que dure la ausencia del trabajador suplido. La relación laboral concluirá de pleno derecho, sin pago de indemnización, en el momento en que el trabajador suplido retome efectivamente sus labores, aún cuando no hubiese vencido el plazo consignado en la cláusula TERCERA.\n\n' +
        'El presente contrato será presentado ante el Ministerio de Trabajo y Promoción del Empleo para su registro, dentro de los quince (15) días naturales desde su suscripción.',
      condition: 'modalidad_tipo === "suplencia"',
      isOptional: true,
    },
    {
      id: 'segunda_emergencia',
      title: 'SEGUNDA: MODALIDAD Y CAUSA OBJETIVA',
      text:
        'El presente contrato se celebra al amparo del artículo 62° del D.S. N° 003-97-TR, bajo la MODALIDAD DE EMERGENCIA, cuya causa objetiva que justifica la contratación temporal es la siguiente:\n\n' +
        '{{causa_objetiva_detalle}}\n\n' +
        'Esta modalidad responde a caso fortuito o de fuerza mayor que haya comprometido o pudiera comprometer las actividades del empleador. La duración máxima bajo esta modalidad es de seis (6) meses en cada año calendario.\n\n' +
        'El presente contrato será presentado ante el Ministerio de Trabajo y Promoción del Empleo para su registro, dentro de los quince (15) días naturales desde su suscripción.',
      condition: 'modalidad_tipo === "emergencia"',
      isOptional: true,
    },
    {
      id: 'segunda_obra',
      title: 'SEGUNDA: MODALIDAD Y CAUSA OBJETIVA',
      text:
        'El presente contrato se celebra al amparo del artículo 63° del D.S. N° 003-97-TR, bajo la MODALIDAD PARA OBRA DETERMINADA O SERVICIO ESPECÍFICO.\n\n' +
        'DESCRIPCIÓN DE LA OBRA / SERVICIO ESPECÍFICO:\n{{descripcion_obra_servicio}}\n\n' +
        'CAUSA OBJETIVA:\n{{causa_objetiva_detalle}}\n\n' +
        'La relación laboral se encuentra sujeta a la duración de la obra o servicio descrito, el cual constituye el objeto preciso y determinado del presente contrato. Al concluir la obra o servicio, el contrato se extingue de pleno derecho, sin necesidad de comunicación previa. La duración máxima acumulada de contratos bajo esta modalidad suscritos con el mismo trabajador en el mismo empleador es de ocho (8) años.\n\n' +
        'El presente contrato será presentado ante el Ministerio de Trabajo y Promoción del Empleo para su registro, dentro de los quince (15) días naturales desde su suscripción.',
      condition: 'modalidad_tipo === "obra_determinada"',
      isOptional: true,
    },
    {
      id: 'segunda_intermitente',
      title: 'SEGUNDA: MODALIDAD Y CAUSA OBJETIVA',
      text:
        'El presente contrato se celebra al amparo del artículo 64° del D.S. N° 003-97-TR, bajo la MODALIDAD INTERMITENTE, cuya causa objetiva que justifica la contratación bajo esta modalidad es la siguiente:\n\n' +
        '{{causa_objetiva_detalle}}\n\n' +
        'Esta modalidad se celebra para cubrir necesidades de las actividades del empleador que por su naturaleza son permanentes pero discontinuas. EL TRABAJADOR tendrá derecho preferencial a ser convocado cuando se reactiven las necesidades que dan origen al contrato. Durante los períodos de inactividad no opera la extinción del vínculo laboral. EL TRABAJADOR recibirá los beneficios sociales proporcionalmente al tiempo efectivamente laborado.\n\n' +
        'El presente contrato será presentado ante el Ministerio de Trabajo y Promoción del Empleo para su registro, dentro de los quince (15) días naturales desde su suscripción.',
      condition: 'modalidad_tipo === "intermitente"',
      isOptional: true,
    },
    {
      id: 'tercera',
      title: 'TERCERA: DURACIÓN DEL CONTRATO',
      text:
        'El presente contrato tiene una vigencia de {{duracion_descripcion}}, desde el {{fecha_inicio}} hasta el {{fecha_fin}}, inclusive.\n\n' +
        'Al vencimiento del plazo pactado, el contrato se extingue automáticamente sin necesidad de preaviso ni acto posterior de comunicación, salvo que las partes acuerden su renovación mediante documento escrito suscrito con anterioridad a la fecha de vencimiento.\n\n' +
        'La renovación del contrato deberá respetar los plazos máximos acumulativos establecidos por la modalidad contratada. Superado el plazo máximo legal sin formalizar un nuevo contrato modal, el contrato se considerará de plazo indeterminado de pleno derecho, conforme al artículo 77° del D.S. N° 003-97-TR (desnaturalización).',
    },
    {
      id: 'cuarta',
      title: 'CUARTA: REMUNERACIÓN',
      text:
        'EL EMPLEADOR abonará a EL TRABAJADOR una remuneración mensual bruta de S/ {{remuneracion}} ({{remuneracion_letras}} Y 00/100 SOLES), que será pagada mensualmente en la oportunidad y forma que establezca EL EMPLEADOR. La remuneración no podrá ser inferior a la Remuneración Mínima Vital vigente.\n\n' +
        'De la remuneración se efectuarán las deducciones de ley (aportes previsionales, Impuesto a la Renta de quinta categoría cuando corresponda).',
    },
    {
      id: 'quinta',
      title: 'QUINTA: JORNADA, HORARIO Y LUGAR DE TRABAJO',
      text:
        'EL TRABAJADOR cumplirá una jornada de {{jornada}} horas semanales, con el horario: {{horario}}, en el siguiente lugar de trabajo: {{lugar_trabajo}}.\n\n' +
        'EL EMPLEADOR podrá modificar el horario de trabajo dentro de los límites de ley, conforme a su facultad de dirección (Art. 9° D.S. N° 003-97-TR).',
    },
    {
      id: 'sexta',
      title: 'SEXTA: BENEFICIOS SOCIALES',
      text:
        'EL TRABAJADOR tendrá derecho a los beneficios sociales de ley proporcionales al período laborado:\n\n' +
        'a) CTS: Proporcional al período laborado, calculada sobre la remuneración computable y depositada en la entidad financiera elegida por EL TRABAJADOR conforme al D.S. N° 001-97-TR.\n\n' +
        'b) GRATIFICACIONES LEGALES: Proporcionales al período semestral laborado, conforme a la Ley N° 27735.\n\n' +
        'c) VACACIONES: A razón de 2.5 días por mes completo de servicios (30 días anuales), conforme al D. Leg. N° 713.\n\n' +
        'd) ASIGNACIÓN FAMILIAR: Si corresponde, al 10% de la RMV vigente, conforme a la Ley N° 25129.\n\n' +
        'e) ESSALUD: Aporte del 9% de la remuneración mensual a cargo de EL EMPLEADOR, conforme a la Ley N° 26790.\n\n' +
        'f) INDEMNIZACIÓN POR DESPIDO ARBITRARIO ANTES DEL VENCIMIENTO: En caso de que EL EMPLEADOR extinga el contrato antes del vencimiento del plazo sin causa justa, EL TRABAJADOR tendrá derecho a una indemnización equivalente a una remuneración y media (1.5) ordinaria mensual por cada mes dejado de laborar, con un máximo de doce (12) remuneraciones, conforme al artículo 76° del D.S. N° 003-97-TR.',
    },
    {
      id: 'septima',
      title: 'SÉPTIMA: OBLIGACIONES DE LAS PARTES',
      text:
        'EL EMPLEADOR se obliga a registrar a EL TRABAJADOR en el T-Registro, efectuar los aportes previsionales y a EsSalud, depositar la CTS, pagar las gratificaciones de ley, emitir boletas de pago y cumplir con todas las obligaciones laborales y de seguridad y salud en el trabajo establecidas por la legislación vigente.\n\n' +
        'EL TRABAJADOR se obliga a prestar sus servicios personalmente con diligencia, cumplir el horario y el Reglamento Interno de Trabajo, observar las normas de Seguridad y Salud en el Trabajo, y guardar reserva sobre la información confidencial de EL EMPLEADOR.',
    },
    {
      id: 'octava',
      title: 'OCTAVA: DESNATURALIZACIÓN DEL CONTRATO',
      text:
        'Las partes declaran conocer que, conforme al artículo 77° del D.S. N° 003-97-TR, el presente contrato se considerará de duración indeterminada en los siguientes supuestos:\n\n' +
        'a) Si EL TRABAJADOR continúa laborando después del vencimiento del plazo pactado sin que se haya suscrito un nuevo contrato;\n' +
        'b) Si se comprueba que el contrato fue suscrito con simulación o fraude a las normas laborales;\n' +
        'c) Si el objeto del contrato es cubrir necesidades de carácter permanente y no temporal;\n' +
        'd) Si EL TRABAJADOR demuestra que el contrato fue celebrado en situación de engaño, coacción o intimidación.\n\n' +
        'En tales casos, EL TRABAJADOR gozará de todos los derechos reconocidos a los trabajadores con contrato indeterminado, incluyendo la protección contra el despido arbitrario.',
    },
    {
      id: 'novena',
      title: 'NOVENA: LEGISLACIÓN APLICABLE Y JURISDICCIÓN',
      text:
        'El presente contrato se rige por el Texto Único Ordenado del Decreto Legislativo N° 728, aprobado por Decreto Supremo N° 003-97-TR, y demás normas laborales peruanas aplicables. Para la resolución de cualquier controversia, las partes se someten a la jurisdicción de los Juzgados Laborales de {{ciudad_contrato}}, previo proceso conciliatorio conforme a la Ley N° 26872.',
    },
    {
      id: 'firmas',
      text:
        'En señal de conformidad, las partes suscriben el presente contrato en dos (2) ejemplares originales, en {{ciudad_contrato}}, el día _____ del mes de ________________ de _______.\n\n\n' +
        '────────────────────────────────────          ────────────────────────────────────\n' +
        '          EL EMPLEADOR                                    EL TRABAJADOR\n' +
        '   {{empleador_representante}}                      {{trabajador_nombre}}\n' +
        '   {{empleador_cargo_representante}}                  DNI N° {{trabajador_dni}}\n' +
        '   DNI N° {{empleador_dni_representante}}\n' +
        '   En representación de:\n' +
        '   {{empleador_razon_social}}\n' +
        '   RUC N° {{empleador_ruc}}',
    },
  ],
}

// =============================================
// CONTRATO DE LOCACIÓN DE SERVICIOS
// Código Civil — Art. 1764° al 1770°
// NO genera relación laboral
// =============================================
export const LOCACION_SERVICIOS: ContractTemplateDefinition = {
  id: 'locacion-servicios',
  type: 'LOCACION_SERVICIOS',
  name: 'Contrato de Locación de Servicios',
  description:
    'Contrato civil para servicios independientes sin subordinación. Regulado por el Código Civil (Art. 1764-1770). No genera vínculo laboral. Advertencia: si el locador trabaja bajo subordinación real, el contrato se puede recalificar como laboral por aplicación del principio de primacía de la realidad.',
  legalBasis: 'Código Civil Peruano — Art. 1764° al 1770°; D.Leg. 1075 (PI); Ley 26872 (Conciliación)',
  sections: [
    {
      id: 'comitente',
      title: 'Datos del Comitente (quien encarga el servicio)',
      fields: [
        {
          id: 'comitente_razon_social',
          label: 'Razón Social o Nombre del Comitente',
          type: 'text',
          required: true,
          placeholder: 'Empresa S.A.C. o Nombre Completo',
        },
        {
          id: 'comitente_ruc',
          label: 'RUC del Comitente',
          type: 'text',
          required: true,
          placeholder: '20XXXXXXXXX o 10XXXXXXXXX',
        },
        {
          id: 'comitente_direccion',
          label: 'Domicilio del Comitente',
          type: 'text',
          required: true,
        },
        {
          id: 'comitente_representante',
          label: 'Representante legal o apoderado',
          type: 'text',
          required: true,
        },
        {
          id: 'comitente_dni_representante',
          label: 'DNI del representante',
          type: 'text',
          required: true,
          validation: { pattern: '^\\d{8}$', message: 'DNI debe tener 8 dígitos' },
        },
        {
          id: 'comitente_cargo_representante',
          label: 'Cargo del representante',
          type: 'text',
          required: true,
          placeholder: 'Gerente General',
        },
      ],
    },
    {
      id: 'locador',
      title: 'Datos del Locador (quien presta el servicio)',
      fields: [
        {
          id: 'locador_nombre',
          label: 'Nombres y apellidos completos',
          type: 'text',
          required: true,
        },
        {
          id: 'locador_dni',
          label: 'DNI / CE / Pasaporte',
          type: 'text',
          required: true,
        },
        {
          id: 'locador_ruc',
          label: 'RUC del Locador',
          type: 'text',
          required: true,
          placeholder: '10XXXXXXXXX',
          helpText: 'El Locador debe tener RUC activo para emitir recibo por honorarios electrónico.',
          validation: {
            pattern: '^10\\d{9}$',
            message: 'RUC de persona natural comienza con 10',
          },
        },
        {
          id: 'locador_profesion',
          label: 'Profesión u ocupación',
          type: 'text',
          required: true,
          placeholder: 'Abogado / Ingeniero de Software / Consultor en Marketing',
        },
        {
          id: 'locador_direccion',
          label: 'Domicilio del Locador',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      id: 'servicio',
      title: 'Condiciones del Servicio',
      fields: [
        {
          id: 'servicio_descripcion',
          label: 'Descripción detallada del servicio',
          type: 'textarea',
          required: true,
          helpText:
            'IMPORTANTE: Redacte el servicio en términos de resultados o entregables, NO de actividades diarias bajo supervisión. Ejemplo correcto: "Elaborar el Manual de Políticas de RRHH incluyendo 10 secciones". Ejemplo incorrecto: "Asistir de lunes a viernes de 9 a 6 pm en las oficinas de EL COMITENTE".',
          placeholder:
            'Ej: "Elaborar un análisis legal de los contratos laborales del comitente, emitiendo un informe jurídico con observaciones y recomendaciones dentro del plazo pactado..."',
        },
        {
          id: 'entregables',
          label: 'Entregables y productos esperados',
          type: 'textarea',
          required: true,
          helpText:
            'Liste los productos concretos que acreditarán la ejecución del servicio. Cada entregable debe ser verificable.',
          placeholder:
            '1. Informe técnico de diagnóstico (máx. 30 páginas)\n2. Presentación ejecutiva en PPT\n3. Plan de implementación con cronograma\n4. ...',
        },
        {
          id: 'fecha_inicio',
          label: 'Fecha de inicio del servicio',
          type: 'date',
          required: true,
        },
        {
          id: 'fecha_fin',
          label: 'Fecha de conclusión del servicio',
          type: 'date',
          required: true,
        },
        {
          id: 'retribucion',
          label: 'Retribución total (S/)',
          type: 'currency',
          required: true,
          helpText: 'Monto total acordado por la prestación del servicio. No incluye IGV.',
        },
        {
          id: 'retribucion_letras',
          label: 'Retribución en letras',
          type: 'text',
          required: true,
          placeholder: 'CINCO MIL',
        },
        {
          id: 'incluye_igv',
          label: '¿La retribución incluye IGV?',
          type: 'toggle',
          helpText:
            'Si EL LOCADOR tiene RUC en la categoría de Rentas de Tercera Categoría o emite facturas, aplica IGV (18%).',
        },
        {
          id: 'forma_pago',
          label: 'Forma de pago',
          type: 'select',
          required: true,
          options: [
            {
              value: 'unico',
              label: 'Pago único al término y con conformidad del servicio',
            },
            {
              value: 'mensual',
              label: 'Pagos mensuales contra entrega de recibo por honorarios y conformidad',
            },
            {
              value: 'hitos',
              label: 'Pagos por hitos o entregables verificados',
            },
            {
              value: 'anticipado',
              label: '50% al inicio + 50% a la conclusión',
            },
          ],
        },
        {
          id: 'incluir_penalidad',
          label: '¿Incluir cláusula de penalidad por incumplimiento?',
          type: 'toggle',
        },
        {
          id: 'penalidad_porcentaje',
          label: 'Penalidad (% por semana de retraso)',
          type: 'number',
          condition: { field: 'incluir_penalidad', value: true },
          validation: { min: 1, max: 10, message: 'Entre 1% y 10% por semana' },
          helpText: 'Porcentaje del monto total que se aplica por cada semana de retraso.',
        },
        {
          id: 'ciudad_contrato',
          label: 'Ciudad de suscripción',
          type: 'text',
          required: true,
          placeholder: 'Lima',
        },
      ],
    },
  ],
  contentBlocks: [
    {
      id: 'titulo',
      text: 'CONTRATO DE LOCACIÓN DE SERVICIOS',
    },
    {
      id: 'comparecientes',
      text:
        'Conste por el presente instrumento el Contrato de Locación de Servicios, celebrado al amparo de los artículos 1764° y siguientes del Código Civil peruano, por una parte:\n\n' +
        'EL COMITENTE: {{comitente_razon_social}}, con RUC N° {{comitente_ruc}}, domiciliado/a en {{comitente_direccion}}, debidamente representado/a por el/la Sr./Sra. {{comitente_representante}}, identificado/a con DNI N° {{comitente_dni_representante}}, en su calidad de {{comitente_cargo_representante}}; a quien en adelante se denominará EL COMITENTE; y,\n\n' +
        'EL LOCADOR: {{locador_nombre}}, {{locador_profesion}}, identificado/a con DNI / CE N° {{locador_dni}}, con RUC N° {{locador_ruc}}, domiciliado/a en {{locador_direccion}}; a quien en adelante se denominará EL LOCADOR;\n\n' +
        'Las partes declaran que el presente contrato NO genera relación laboral alguna entre ellas, no existiendo subordinación, dependencia, horario fijo ni exclusividad, salvo lo expresamente pactado en la cláusula relativa a la naturaleza del servicio.',
    },
    {
      id: 'primera',
      title: 'PRIMERA: OBJETO DEL CONTRATO',
      text:
        'EL LOCADOR se obliga a prestar a EL COMITENTE, de forma autónoma e independiente, los siguientes servicios:\n\n' +
        '{{servicio_descripcion}}\n\n' +
        'Los entregables y/o productos que acreditarán la correcta ejecución del servicio son:\n\n' +
        '{{entregables}}\n\n' +
        'Queda expresamente establecido que EL LOCADOR prestará el servicio sin sujeción a subordinación ni dependencia jerárquica de EL COMITENTE. EL LOCADOR no está obligado a cumplir horario fijo, ni a asistir al centro de trabajo de EL COMITENTE salvo lo estrictamente necesario para la prestación del servicio, determinando con autonomía el modo, tiempo, lugar y método de ejecución.',
    },
    {
      id: 'segunda',
      title: 'SEGUNDA: PLAZO DEL CONTRATO',
      text:
        'El presente contrato tendrá vigencia desde el {{fecha_inicio}} hasta el {{fecha_fin}}, inclusive. EL LOCADOR se obliga a entregar los productos y/o completar el servicio dentro del plazo indicado.\n\n' +
        'El plazo podrá ser prorrogado por acuerdo escrito suscrito por ambas partes con anterioridad a la fecha de vencimiento. La prórroga no altera la naturaleza civil del contrato.',
    },
    {
      id: 'tercera',
      title: 'TERCERA: RETRIBUCIÓN Y FORMA DE PAGO',
      text:
        'EL COMITENTE pagará a EL LOCADOR por la prestación del servicio la suma total de S/ {{retribucion}} ({{retribucion_letras}} Y 00/100 SOLES), de conformidad con la siguiente forma de pago: {{forma_pago}}.\n\n' +
        'EL LOCADOR es responsable de emitir el comprobante de pago correspondiente (recibo por honorarios electrónico a través del portal SUNAT Operaciones en Línea, o factura electrónica según corresponda) con anterioridad o simultáneamente a cada pago. EL COMITENTE queda facultado a retener el pago hasta la recepción del comprobante respectivo.\n\n' +
        'EL LOCADOR es el único responsable del cumplimiento de sus obligaciones tributarias ante la SUNAT (retención del Impuesto a la Renta de cuarta categoría, de ser aplicable). EL COMITENTE efectuará la retención del 8% por concepto de Impuesto a la Renta de cuarta categoría cuando la retribución mensual supere S/ 1,500, conforme al TUO de la Ley del Impuesto a la Renta.',
    },
    {
      id: 'cuarta_igv',
      title: 'SOBRE EL IGV',
      text:
        'Las partes acuerdan que la retribución pactada no incluye el Impuesto General a las Ventas (IGV). EL LOCADOR, de estar afecto a dicho impuesto, deberá adicionar el 18% de IGV al monto de la retribución neta pactada, emitiendo la factura electrónica correspondiente.',
      condition: 'incluye_igv === false',
      isOptional: true,
    },
    {
      id: 'quinta',
      title: 'CUARTA: NATURALEZA DEL SERVICIO Y AUTONOMÍA',
      text:
        'EL LOCADOR ejecutará el servicio objeto del presente contrato con plena autonomía técnica y profesional, utilizando sus propios recursos, herramientas, conocimientos y metodología, sin sujetarse a horario ni jornada determinada, con la única obligación de cumplir los plazos de entrega y alcanzar los resultados pactados.\n\n' +
        'Las partes declaran expresamente que:\n\n' +
        '(i) EL LOCADOR no está obligado a asistir al centro de trabajo de EL COMITENTE de manera regular o permanente;\n' +
        '(ii) EL LOCADOR puede prestar simultáneamente servicios a terceros, salvo que expresamente se haya pactado exclusividad;\n' +
        '(iii) EL LOCADOR no tiene derecho a los beneficios sociales propios del régimen laboral (CTS, gratificaciones, vacaciones remuneradas, EsSalud a cargo del empleador) en tanto no se configure una relación laboral.\n\n' +
        'Si durante la ejecución del presente contrato se verificara en los hechos la existencia de subordinación, dependencia jerárquica o exclusividad no pactada, operará el principio de primacía de la realidad contemplado en el artículo 4° del D.S. N° 003-97-TR, quedando la relación sujeta al régimen laboral que corresponda.',
    },
    {
      id: 'sexta',
      title: 'QUINTA: OBLIGACIONES DEL LOCADOR',
      text:
        'EL LOCADOR se obliga a:\n\n' +
        '1. Prestar el servicio personalmente y con la diligencia y competencia profesional que el encargo requiere, aplicando los conocimientos y metodología propia de su profesión u oficio.\n\n' +
        '2. Entregar los productos y/o entregables pactados dentro de los plazos convenidos, en el formato y con la calidad acordados.\n\n' +
        '3. Mantener informado a EL COMITENTE sobre el avance del servicio, comunicando oportunamente cualquier circunstancia que pueda afectar el plazo o la calidad del resultado.\n\n' +
        '4. Emitir el comprobante de pago electrónico correspondiente antes o simultáneamente a cada cobro.\n\n' +
        '5. Cumplir con sus obligaciones tributarias ante la SUNAT.\n\n' +
        '6. Guardar estricta confidencialidad sobre la información de EL COMITENTE a la que acceda en ejecución del contrato.\n\n' +
        '7. No subcontratar ni ceder total o parcialmente la ejecución del servicio a terceros sin autorización previa y escrita de EL COMITENTE.',
    },
    {
      id: 'septima',
      title: 'SEXTA: OBLIGACIONES DEL COMITENTE',
      text:
        'EL COMITENTE se obliga a:\n\n' +
        '1. Pagar la retribución pactada en la forma y oportunidad acordadas, una vez verificada la conformidad del servicio o entregable.\n\n' +
        '2. Proporcionar a EL LOCADOR la información, accesos y materiales que resulten estrictamente necesarios para la prestación del servicio, en el plazo oportuno.\n\n' +
        '3. Designar a un interlocutor o responsable para la coordinación del servicio y la verificación de los entregables.\n\n' +
        '4. Emitir la conformidad de los entregables dentro de los cinco (5) días hábiles de su recepción. Transcurrido dicho plazo sin observaciones, los entregables se tendrán por aceptados.\n\n' +
        '5. Abstenerse de exigir a EL LOCADOR el cumplimiento de un horario fijo, la asistencia permanente a sus instalaciones o cualquier otra condición que desnaturalice la autonomía propia de la locación de servicios.',
    },
    {
      id: 'octava_penalidad',
      title: 'SÉPTIMA: PENALIDAD POR INCUMPLIMIENTO',
      text:
        'En caso de incumplimiento de los plazos de entrega pactados por causa imputable exclusivamente a EL LOCADOR (dolo, negligencia o culpa inexcusable), se aplicará una penalidad equivalente al {{penalidad_porcentaje}}% del monto total del contrato por cada semana calendario de retraso, hasta un máximo del diez por ciento (10%) del monto total. Dicha penalidad será deducida del monto pendiente de pago.\n\n' +
        'La penalidad no excluye el derecho de EL COMITENTE a exigir el cumplimiento del contrato y la reparación de los daños adicionales efectivamente sufridos, de conformidad con el artículo 1341° del Código Civil.',
      condition: 'incluir_penalidad === true',
      isOptional: true,
    },
    {
      id: 'novena',
      title: 'OCTAVA: CONFIDENCIALIDAD',
      text:
        'EL LOCADOR se obliga a guardar estricta reserva y confidencialidad sobre toda información de EL COMITENTE —incluyendo datos comerciales, financieros, técnicos, de clientes, procesos y estrategia— a la que acceda con ocasión de la ejecución del presente contrato. Esta obligación subsistirá por dos (2) años luego de la conclusión o extinción del presente contrato, por cualquier causa.\n\n' +
        'EL LOCADOR se abstendrá de reproducir, transmitir, divulgar o utilizar dicha información para beneficio propio o de terceros, bajo pena de responder por los daños y perjuicios ocasionados, sin perjuicio de la responsabilidad penal aplicable.',
    },
    {
      id: 'decima',
      title: 'NOVENA: PROPIEDAD INTELECTUAL',
      text:
        'Todos los entregables, documentos, informes, obras, software, diseños, desarrollos y en general cualquier bien inmaterial o creación intelectual producidos por EL LOCADOR en ejecución del presente contrato serán de propiedad exclusiva de EL COMITENTE desde el momento de su creación.\n\n' +
        'EL LOCADOR cede y transfiere a EL COMITENTE, con carácter exclusivo, todos los derechos patrimoniales sobre dichas creaciones, conforme al Decreto Legislativo N° 1075 y al Decreto Legislativo N° 822, sin que EL LOCADOR tenga derecho a retribución adicional por dicha cesión.\n\n' +
        'El LOCADOR se obliga a suscribir todo documento que sea necesario para perfeccionar la titularidad de EL COMITENTE sobre los bienes intelectuales generados.',
    },
    {
      id: 'decima_primera',
      title: 'DÉCIMA: RESOLUCIÓN DEL CONTRATO',
      text:
        'Cualquiera de las partes podrá resolver el presente contrato en los siguientes supuestos:\n\n' +
        'a) Por incumplimiento material de las obligaciones de la otra parte, previa comunicación escrita otorgando un plazo de diez (10) días hábiles para la subsanación;\n' +
        'b) Por caso fortuito o fuerza mayor que impida la ejecución del servicio por más de treinta (30) días calendario;\n' +
        'c) De mutuo acuerdo, mediante documento escrito.\n\n' +
        'En caso de resolución imputable a EL COMITENTE antes del vencimiento del plazo, EL LOCADOR tendrá derecho al pago proporcional al avance del servicio efectivamente prestado y a los entregables entregados con conformidad. En caso de resolución imputable a EL LOCADOR, EL COMITENTE tendrá derecho a la devolución de los anticipos no ejecutados y a la indemnización por daños y perjuicios.',
    },
    {
      id: 'decima_segunda',
      title: 'DÉCIMA PRIMERA: CONCILIACIÓN Y JURISDICCIÓN',
      text:
        'Las partes acuerdan someter cualquier controversia derivada del presente contrato, en primer lugar, a un proceso de conciliación extrajudicial conforme a la Ley N° 26872. De no llegarse a acuerdo, el conflicto será resuelto por los Juzgados Civiles de {{ciudad_contrato}}, a los que las partes se someten expresamente, renunciando al fuero de sus domicilios.',
    },
    {
      id: 'decima_tercera',
      title: 'DÉCIMA SEGUNDA: LEGISLACIÓN APLICABLE',
      text:
        'El presente contrato se rige por el Código Civil peruano, en particular por sus artículos 1764° al 1770°, y las demás normas del derecho civil contractual peruano. No le son aplicables las normas del régimen laboral, salvo que por principio de primacía de la realidad se configure una relación laboral encubierta.',
    },
    {
      id: 'firmas',
      text:
        'En señal de conformidad, las partes suscriben el presente contrato en dos (2) ejemplares originales de igual valor, en la ciudad de {{ciudad_contrato}}, el día _____ del mes de ________________ de _______.\n\n\n' +
        '────────────────────────────────────          ────────────────────────────────────\n' +
        '          EL COMITENTE                                    EL LOCADOR\n' +
        '   {{comitente_representante}}                      {{locador_nombre}}\n' +
        '   {{comitente_cargo_representante}}                  {{locador_profesion}}\n' +
        '   DNI N° {{comitente_dni_representante}}              DNI N° {{locador_dni}}\n' +
        '   En representación de:                           RUC N° {{locador_ruc}}\n' +
        '   {{comitente_razon_social}}\n' +
        '   RUC N° {{comitente_ruc}}',
    },
  ],
}

// =============================================
// CONTRATO A TIEMPO PARCIAL
// D.Leg. 728 / D.S. 003-97-TR — Art. 4° / D.S. 001-96-TR Art. 11-12
// =============================================
export const CONTRATO_TIEMPO_PARCIAL: ContractTemplateDefinition = {
  id: 'laboral-tiempo-parcial',
  type: 'TIEMPO_PARCIAL',
  name: 'Contrato de Trabajo a Tiempo Parcial',
  description: 'Contrato con jornada inferior a 4 horas diarias. No genera derecho a CTS ni indemnización por despido arbitrario, pero sí a gratificaciones y vacaciones.',
  legalBasis: 'D.Leg. 728 — Art. 4° / D.S. 001-96-TR Art. 11-12',
  sections: [SECCION_EMPLEADOR, SECCION_TRABAJADOR, {
    id: 'condiciones_tp',
    title: 'Condiciones del Contrato',
    fields: [
      { id: 'cargo', label: 'Cargo / Puesto', type: 'text', required: true },
      { id: 'area', label: 'Area / Departamento', type: 'text', required: true },
      { id: 'remuneracion', label: 'Remuneracion mensual (S/)', type: 'currency', required: true, helpText: 'Proporcional a la jornada. Mínimo proporcional a la RMV.' },
      { id: 'horas_diarias', label: 'Horas diarias de trabajo', type: 'number', required: true, validation: { min: 1, max: 3, message: 'Tiempo parcial: menos de 4 horas diarias' } },
      { id: 'dias_semana', label: 'Dias por semana', type: 'number', required: true, validation: { min: 1, max: 6 } },
      { id: 'horario', label: 'Horario', type: 'text', required: true, placeholder: 'Ej: 09:00 a 12:00' },
      { id: 'fecha_inicio', label: 'Fecha de inicio', type: 'date', required: true },
      { id: 'lugar_trabajo', label: 'Lugar de trabajo', type: 'text', required: true },
    ],
  }],
  contentBlocks: [
    { id: 'tp-1', title: 'OBJETO', text: 'EL EMPLEADOR contrata a EL TRABAJADOR para que desempeñe las funciones de {{cargo}} en el area de {{area}}, en la modalidad de tiempo parcial conforme al D.S. 001-96-TR.' },
    { id: 'tp-2', title: 'JORNADA', text: 'La jornada de trabajo sera de {{horas_diarias}} horas diarias, {{dias_semana}} dias por semana, en el horario de {{horario}}. Al ser inferior a 4 horas diarias, el presente contrato se sujeta a las reglas del trabajo a tiempo parcial.' },
    { id: 'tp-3', title: 'REMUNERACION', text: 'EL TRABAJADOR percibira una remuneracion mensual de S/ {{remuneracion}}, proporcional a la jornada de trabajo.' },
    { id: 'tp-4', title: 'BENEFICIOS', text: 'Por tratarse de un contrato a tiempo parcial (menos de 4 horas diarias), EL TRABAJADOR tiene derecho a gratificaciones legales y vacaciones (6 dias), pero NO genera derecho a CTS ni a indemnizacion por despido arbitrario, conforme al Art. 12 del D.S. 001-96-TR.' },
  ],
}

// =============================================
// CONTRATO POR INICIO DE ACTIVIDAD
// D.S. 003-97-TR — Art. 57°
// =============================================
export const CONTRATO_INICIO_ACTIVIDAD: ContractTemplateDefinition = {
  id: 'laboral-inicio-actividad',
  type: 'INICIO_ACTIVIDAD',
  name: 'Contrato por Inicio o Incremento de Actividad',
  description: 'Contrato temporal celebrado por inicio de nueva actividad empresarial o incremento de las ya existentes. Duracion maxima de 3 años.',
  legalBasis: 'D.S. 003-97-TR — Art. 57°',
  sections: [SECCION_EMPLEADOR, SECCION_TRABAJADOR, {
    id: 'condiciones_ia',
    title: 'Condiciones del Contrato',
    fields: [
      { id: 'cargo', label: 'Cargo', type: 'text', required: true },
      { id: 'causa_objetiva', label: 'Causa objetiva (inicio/incremento de actividad)', type: 'textarea', required: true, helpText: 'Describa la nueva actividad o el incremento que justifica este contrato temporal.' },
      { id: 'remuneracion', label: 'Remuneracion mensual (S/)', type: 'currency', required: true },
      { id: 'fecha_inicio', label: 'Fecha de inicio', type: 'date', required: true },
      { id: 'fecha_fin', label: 'Fecha de termino', type: 'date', required: true },
      { id: 'lugar_trabajo', label: 'Lugar de trabajo', type: 'text', required: true },
    ],
  }],
  contentBlocks: [
    { id: 'ia-1', title: 'OBJETO Y CAUSA OBJETIVA', text: 'EL EMPLEADOR requiere contratar temporalmente a EL TRABAJADOR para el cargo de {{cargo}}, por la siguiente causa objetiva de contratacion temporal: {{causa_objetiva}}.' },
    { id: 'ia-2', title: 'PLAZO', text: 'El presente contrato tiene vigencia desde el {{fecha_inicio}} hasta el {{fecha_fin}}. La duracion maxima de este tipo de contrato es de 3 años conforme al Art. 57° del D.S. 003-97-TR.' },
    { id: 'ia-3', title: 'REMUNERACION', text: 'EL TRABAJADOR percibira una remuneracion mensual de S/ {{remuneracion}}, sujeta a los descuentos de ley.' },
    { id: 'ia-4', title: 'REGISTRO', text: 'El presente contrato sera registrado ante el Ministerio de Trabajo dentro de los 15 dias naturales de su celebracion, conforme al Art. 73° del D.S. 003-97-TR.' },
  ],
}

// =============================================
// CONTRATO POR NECESIDAD DE MERCADO
// D.S. 003-97-TR — Art. 58°
// =============================================
export const CONTRATO_NECESIDAD_MERCADO: ContractTemplateDefinition = {
  id: 'laboral-necesidad-mercado',
  type: 'NECESIDAD_MERCADO',
  name: 'Contrato por Necesidad de Mercado',
  description: 'Contrato temporal por incremento coyuntural e imprevisible de la produccion originado por variaciones sustanciales de la demanda. Duracion maxima 5 años.',
  legalBasis: 'D.S. 003-97-TR — Art. 58°',
  sections: [SECCION_EMPLEADOR, SECCION_TRABAJADOR, {
    id: 'condiciones_nm',
    title: 'Condiciones del Contrato',
    fields: [
      { id: 'cargo', label: 'Cargo', type: 'text', required: true },
      { id: 'causa_objetiva', label: 'Causa objetiva (variacion de demanda)', type: 'textarea', required: true, helpText: 'Describa el incremento coyuntural e imprevisible que justifica la contratacion.' },
      { id: 'remuneracion', label: 'Remuneracion mensual (S/)', type: 'currency', required: true },
      { id: 'fecha_inicio', label: 'Fecha de inicio', type: 'date', required: true },
      { id: 'fecha_fin', label: 'Fecha de termino', type: 'date', required: true },
      { id: 'lugar_trabajo', label: 'Lugar de trabajo', type: 'text', required: true },
    ],
  }],
  contentBlocks: [
    { id: 'nm-1', title: 'OBJETO Y CAUSA OBJETIVA', text: 'EL EMPLEADOR contrata temporalmente a EL TRABAJADOR para el cargo de {{cargo}} debido al incremento coyuntural e imprevisible de la produccion: {{causa_objetiva}}.' },
    { id: 'nm-2', title: 'PLAZO', text: 'Vigente desde {{fecha_inicio}} hasta {{fecha_fin}}. Duracion maxima: 5 años (Art. 58° D.S. 003-97-TR).' },
    { id: 'nm-3', title: 'REMUNERACION', text: 'Remuneracion mensual de S/ {{remuneracion}}, con todos los beneficios de ley.' },
  ],
}

// =============================================
// CONTRATO POR SUPLENCIA
// D.S. 003-97-TR — Art. 61°
// =============================================
export const CONTRATO_SUPLENCIA: ContractTemplateDefinition = {
  id: 'laboral-suplencia',
  type: 'SUPLENCIA',
  name: 'Contrato de Suplencia',
  description: 'Contrato para sustituir a un trabajador estable cuyo vinculo laboral se encuentra suspendido (licencia, vacaciones, maternidad, etc.).',
  legalBasis: 'D.S. 003-97-TR — Art. 61°',
  sections: [SECCION_EMPLEADOR, SECCION_TRABAJADOR, {
    id: 'condiciones_sup',
    title: 'Condiciones del Contrato',
    fields: [
      { id: 'cargo', label: 'Cargo a suplir', type: 'text', required: true },
      { id: 'trabajador_suplido', label: 'Nombre del trabajador suplido', type: 'text', required: true },
      { id: 'motivo_suplencia', label: 'Motivo de la suplencia', type: 'select', required: true, options: [
        { value: 'VACACIONES', label: 'Vacaciones' },
        { value: 'LICENCIA_MATERNIDAD', label: 'Licencia por maternidad' },
        { value: 'LICENCIA_ENFERMEDAD', label: 'Licencia por enfermedad' },
        { value: 'LICENCIA_SIN_GOCE', label: 'Licencia sin goce de haber' },
        { value: 'OTRO', label: 'Otro motivo de suspension' },
      ]},
      { id: 'remuneracion', label: 'Remuneracion mensual (S/)', type: 'currency', required: true },
      { id: 'fecha_inicio', label: 'Fecha de inicio', type: 'date', required: true },
      { id: 'fecha_fin', label: 'Fecha estimada de retorno del titular', type: 'date', required: true },
      { id: 'lugar_trabajo', label: 'Lugar de trabajo', type: 'text', required: true },
    ],
  }],
  contentBlocks: [
    { id: 'sup-1', title: 'OBJETO', text: 'EL EMPLEADOR contrata a EL TRABAJADOR para que desempeñe el cargo de {{cargo}}, en sustitucion del trabajador {{trabajador_suplido}} cuyo vinculo se encuentra suspendido por {{motivo_suplencia}}.' },
    { id: 'sup-2', title: 'PLAZO', text: 'El contrato tiene vigencia desde {{fecha_inicio}} y se extinguira con el retorno del titular al puesto o al {{fecha_fin}}, lo que ocurra primero.' },
    { id: 'sup-3', title: 'REMUNERACION', text: 'Remuneracion mensual de S/ {{remuneracion}}, con todos los beneficios de ley.' },
  ],
}

// =============================================
// CONTRATO POR EMERGENCIA
// D.S. 003-97-TR — Art. 62°
// =============================================
export const CONTRATO_EMERGENCIA: ContractTemplateDefinition = {
  id: 'laboral-emergencia',
  type: 'EMERGENCIA',
  name: 'Contrato por Emergencia',
  description: 'Contrato para cubrir necesidades promovidas por caso fortuito o fuerza mayor (desastres, pandemias, accidentes graves).',
  legalBasis: 'D.S. 003-97-TR — Art. 62°',
  sections: [SECCION_EMPLEADOR, SECCION_TRABAJADOR, {
    id: 'condiciones_em',
    title: 'Condiciones del Contrato',
    fields: [
      { id: 'cargo', label: 'Cargo / Funcion', type: 'text', required: true },
      { id: 'emergencia_descripcion', label: 'Descripcion de la emergencia', type: 'textarea', required: true, helpText: 'Describa el caso fortuito o fuerza mayor que origina la contratacion.' },
      { id: 'remuneracion', label: 'Remuneracion mensual (S/)', type: 'currency', required: true },
      { id: 'fecha_inicio', label: 'Fecha de inicio', type: 'date', required: true },
      { id: 'fecha_fin', label: 'Fecha estimada de termino', type: 'date', required: true },
      { id: 'lugar_trabajo', label: 'Lugar de trabajo', type: 'text', required: true },
    ],
  }],
  contentBlocks: [
    { id: 'em-1', title: 'OBJETO Y EMERGENCIA', text: 'EL EMPLEADOR contrata a EL TRABAJADOR para el cargo de {{cargo}} debido a la siguiente situacion de emergencia por caso fortuito o fuerza mayor: {{emergencia_descripcion}}.' },
    { id: 'em-2', title: 'PLAZO', text: 'Vigente desde {{fecha_inicio}} hasta {{fecha_fin}} o hasta que cese la emergencia, lo que ocurra primero. Conforme al Art. 62° del D.S. 003-97-TR.' },
    { id: 'em-3', title: 'REMUNERACION', text: 'Remuneracion mensual de S/ {{remuneracion}}, con beneficios de ley.' },
  ],
}

// =============================================
// CONTRATO POR OBRA DETERMINADA O SERVICIO ESPECIFICO
// D.S. 003-97-TR — Art. 63°
// =============================================
export const CONTRATO_OBRA_DETERMINADA: ContractTemplateDefinition = {
  id: 'laboral-obra-determinada',
  type: 'OBRA_DETERMINADA',
  name: 'Contrato para Obra Determinada o Servicio Especifico',
  description: 'Contrato con objeto previamente establecido y de duracion determinada. Se extingue al concluir la obra o servicio. Maximo 5 años.',
  legalBasis: 'D.S. 003-97-TR — Art. 63°',
  sections: [SECCION_EMPLEADOR, SECCION_TRABAJADOR, {
    id: 'condiciones_od',
    title: 'Condiciones del Contrato',
    fields: [
      { id: 'cargo', label: 'Cargo', type: 'text', required: true },
      { id: 'obra_descripcion', label: 'Descripcion de la obra o servicio', type: 'textarea', required: true, helpText: 'Describa con precision la obra o servicio especifico a realizar.' },
      { id: 'remuneracion', label: 'Remuneracion mensual (S/)', type: 'currency', required: true },
      { id: 'fecha_inicio', label: 'Fecha de inicio', type: 'date', required: true },
      { id: 'fecha_fin_estimada', label: 'Fecha estimada de conclusion', type: 'date', required: true },
      { id: 'lugar_trabajo', label: 'Lugar de trabajo', type: 'text', required: true },
    ],
  }],
  contentBlocks: [
    { id: 'od-1', title: 'OBJETO', text: 'EL EMPLEADOR contrata a EL TRABAJADOR para el cargo de {{cargo}}, con el objeto de realizar la siguiente obra o servicio especifico: {{obra_descripcion}}.' },
    { id: 'od-2', title: 'PLAZO', text: 'El contrato se inicia el {{fecha_inicio}} y se extinguira al concluir la obra o servicio descrito, estimandose como fecha de conclusion el {{fecha_fin_estimada}}. Duracion maxima conforme a ley: 5 años.' },
    { id: 'od-3', title: 'REMUNERACION', text: 'Remuneracion mensual de S/ {{remuneracion}}, con beneficios de ley.' },
  ],
}

// =============================================
// CONTRATO INTERMITENTE
// D.S. 003-97-TR — Art. 64-66°
// =============================================
export const CONTRATO_INTERMITENTE: ContractTemplateDefinition = {
  id: 'laboral-intermitente',
  type: 'INTERMITENTE',
  name: 'Contrato Intermitente',
  description: 'Contrato para cubrir necesidades de la empresa que por su naturaleza son permanentes pero discontinuas. El trabajador tiene derecho preferencial de readmision.',
  legalBasis: 'D.S. 003-97-TR — Art. 64-66°',
  sections: [SECCION_EMPLEADOR, SECCION_TRABAJADOR, {
    id: 'condiciones_int',
    title: 'Condiciones del Contrato',
    fields: [
      { id: 'cargo', label: 'Cargo', type: 'text', required: true },
      { id: 'actividad_intermitente', label: 'Actividad intermitente', type: 'textarea', required: true, helpText: 'Describa la actividad permanente pero discontinua.' },
      { id: 'remuneracion', label: 'Remuneracion mensual (S/)', type: 'currency', required: true },
      { id: 'fecha_inicio', label: 'Fecha de inicio del periodo activo', type: 'date', required: true },
      { id: 'fecha_fin', label: 'Fecha estimada de fin del periodo', type: 'date', required: true },
      { id: 'lugar_trabajo', label: 'Lugar de trabajo', type: 'text', required: true },
    ],
  }],
  contentBlocks: [
    { id: 'int-1', title: 'OBJETO', text: 'EL EMPLEADOR contrata a EL TRABAJADOR para el cargo de {{cargo}}, para la actividad intermitente: {{actividad_intermitente}}.' },
    { id: 'int-2', title: 'PLAZO', text: 'Periodo activo desde {{fecha_inicio}} hasta {{fecha_fin}}. Sin plazo maximo legal. El trabajador tiene derecho preferencial de readmision (Art. 65° D.S. 003-97-TR).' },
    { id: 'int-3', title: 'REMUNERACION', text: 'Remuneracion mensual de S/ {{remuneracion}} durante los periodos activos, con beneficios de ley.' },
    { id: 'int-4', title: 'READMISION', text: 'Conforme al Art. 65° del D.S. 003-97-TR, EL TRABAJADOR tendra derecho preferente en la contratacion cuando se reanude la actividad, consignandose en el presente contrato dicho derecho.' },
  ],
}

// =============================================
// CONTRATO DE EXPORTACION NO TRADICIONAL
// D.Ley 22342 — Art. 32°
// =============================================
export const CONTRATO_EXPORTACION: ContractTemplateDefinition = {
  id: 'laboral-exportacion',
  type: 'EXPORTACION',
  name: 'Contrato de Exportacion No Tradicional',
  description: 'Contrato temporal para empresas de exportacion no tradicional. Vinculado a contrato de exportacion, orden de compra o documento que genere la obligacion.',
  legalBasis: 'D.Ley 22342 — Art. 32°',
  sections: [SECCION_EMPLEADOR, SECCION_TRABAJADOR, {
    id: 'condiciones_exp',
    title: 'Condiciones del Contrato',
    fields: [
      { id: 'cargo', label: 'Cargo', type: 'text', required: true },
      { id: 'contrato_exportacion', label: 'Numero de contrato/orden de exportacion', type: 'text', required: true },
      { id: 'producto_exportacion', label: 'Producto o servicio de exportacion', type: 'text', required: true },
      { id: 'pais_destino', label: 'Pais de destino', type: 'text', required: true },
      { id: 'remuneracion', label: 'Remuneracion mensual (S/)', type: 'currency', required: true },
      { id: 'fecha_inicio', label: 'Fecha de inicio', type: 'date', required: true },
      { id: 'fecha_fin', label: 'Fecha de termino', type: 'date', required: true },
      { id: 'lugar_trabajo', label: 'Lugar de trabajo', type: 'text', required: true },
    ],
  }],
  contentBlocks: [
    { id: 'exp-1', title: 'OBJETO', text: 'EL EMPLEADOR, empresa de exportacion no tradicional, contrata a EL TRABAJADOR para el cargo de {{cargo}}, vinculado al contrato de exportacion N° {{contrato_exportacion}} del producto {{producto_exportacion}} con destino a {{pais_destino}}.' },
    { id: 'exp-2', title: 'BASE LEGAL', text: 'El presente contrato se celebra al amparo del D.Ley 22342, Art. 32°, que permite la contratacion temporal de trabajadores para empresas de exportacion no tradicional.' },
    { id: 'exp-3', title: 'PLAZO', text: 'Vigente desde {{fecha_inicio}} hasta {{fecha_fin}}, vinculado a la ejecucion del contrato de exportacion referido.' },
    { id: 'exp-4', title: 'REMUNERACION', text: 'Remuneracion mensual de S/ {{remuneracion}}, con todos los beneficios de ley del regimen general.' },
  ],
}

// =============================================
// TEMPLATE REGISTRY
// =============================================
export const CONTRACT_TEMPLATES: ContractTemplateDefinition[] = [
  CONTRATO_INDEFINIDO,
  CONTRATO_PLAZO_FIJO,
  LOCACION_SERVICIOS,
  CONTRATO_TIEMPO_PARCIAL,
  CONTRATO_INICIO_ACTIVIDAD,
  CONTRATO_NECESIDAD_MERCADO,
  CONTRATO_SUPLENCIA,
  CONTRATO_EMERGENCIA,
  CONTRATO_OBRA_DETERMINADA,
  CONTRATO_INTERMITENTE,
  CONTRATO_EXPORTACION,
]

export function getTemplateById(id: string): ContractTemplateDefinition | undefined {
  return CONTRACT_TEMPLATES.find(t => t.id === id)
}

export function getTemplateByType(type: string): ContractTemplateDefinition | undefined {
  return CONTRACT_TEMPLATES.find(t => t.type === type)
}
