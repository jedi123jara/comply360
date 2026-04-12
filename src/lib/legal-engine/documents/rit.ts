// =============================================
// REGLAMENTO INTERNO DE TRABAJO (RIT)
//
// Base legal:
//   D.S. N° 039-91-TR — Reglamento Interno de Trabajo (31.12.1991)
//   D.Leg. N° 728 / D.S. N° 003-97-TR — LPCL (Arts. 84-88)
//   Ley N° 27942 — Hostigamiento Sexual (Art. incluir en RIT)
//   Ley N° 29783 — SST (Art. incluir reg. SST)
//   Ley N° 30709 — Igualdad Salarial
//   Ley N° 31572 — Teletrabajo (si aplica)
//
// Obligatoriedad:
//   Empresas con 100+ trabajadores DEBEN tenerlo (Art. 1° D.S. 039-91-TR)
//   Para empresas con menos de 100 se RECOMIENDA desde 20 trabajadores
//   Se presenta ante la AAT (Autoridad Administrativa de Trabajo)
//   mediante presentación, sin aprobación previa; surte efecto al
//   día siguiente de la presentación
//
// Sanción SUNAFIL: Grave (no contar con RIT siendo obligatorio)
// UIT 2026 = S/ 5,500
// =============================================

import type { DocumentTemplateDefinition } from './types'

export const RIT_TEMPLATE: DocumentTemplateDefinition = {
  id: 'reglamento-interno-trabajo',
  type: 'RIT',
  name: 'Reglamento Interno de Trabajo (RIT)',
  description:
    'Instrumento normativo interno que regula las relaciones laborales entre el empleador y los trabajadores. Obligatorio para empresas con 100+ trabajadores (D.S. N° 039-91-TR). Contiene 8 capítulos: admisión, jornada, remuneraciones, higiene, obligaciones, disciplina, prevención, y disposiciones finales.',
  legalBasis:
    'D.S. N° 039-91-TR | D.Leg. 728 / D.S. 003-97-TR | Ley N° 29783 | Ley N° 27942 | Ley N° 30709',
  mandatoryFrom: 'Obligatorio para empresas con 100 o más trabajadores (Art. 1° D.S. N° 039-91-TR)',
  workerThreshold: 100,
  approvalAuthority:
    'Presentar ante la Autoridad Administrativa de Trabajo (AAT/MTPE) — surte efecto al día siguiente',
  sections: [
    {
      id: 'empresa',
      title: 'Datos de la Empresa',
      fields: [
        {
          id: 'empresa_razon_social',
          label: 'Razón Social',
          type: 'text',
          required: true,
        },
        {
          id: 'empresa_ruc',
          label: 'RUC',
          type: 'text',
          required: true,
        },
        {
          id: 'empresa_direccion',
          label: 'Domicilio principal',
          type: 'text',
          required: true,
        },
        {
          id: 'empresa_actividad',
          label: 'Actividad económica',
          type: 'text',
          required: true,
        },
        {
          id: 'empresa_num_trabajadores',
          label: 'Número de trabajadores',
          type: 'number',
          required: true,
        },
        {
          id: 'empresa_gerente',
          label: 'Gerente General',
          type: 'text',
          required: true,
        },
        {
          id: 'ciudad',
          label: 'Ciudad',
          type: 'text',
          required: true,
          placeholder: 'Lima',
        },
        {
          id: 'fecha_aprobacion',
          label: 'Fecha de aprobación del RIT',
          type: 'date',
          required: true,
        },
      ],
    },
    {
      id: 'condiciones',
      title: 'Condiciones Laborales',
      fields: [
        {
          id: 'jornada_horas',
          label: 'Jornada máxima semanal (horas)',
          type: 'select',
          required: true,
          options: [
            { value: '48', label: '48 horas semanales (máximo legal)' },
            { value: '45', label: '45 horas semanales' },
            { value: '40', label: '40 horas semanales' },
          ],
        },
        {
          id: 'jornada_diaria',
          label: 'Jornada diaria máxima (horas)',
          type: 'select',
          required: true,
          options: [
            { value: '8', label: '8 horas diarias' },
            { value: '9', label: '9 horas con un día libre adicional' },
            { value: '12', label: '12 horas (régimen de guardia - minería/salud)' },
          ],
        },
        {
          id: 'refrigerio_minutos',
          label: 'Tiempo de refrigerio (mínimo 45 minutos)',
          type: 'select',
          required: true,
          options: [
            { value: '45', label: '45 minutos' },
            { value: '60', label: '60 minutos (1 hora)' },
          ],
        },
        {
          id: 'dia_pago',
          label: 'Día/período de pago de remuneraciones',
          type: 'select',
          required: true,
          options: [
            { value: 'ultimo_dia_mes', label: 'Último día útil de cada mes' },
            { value: '15_ultimo', label: 'Quincenalmente: días 15 y último de cada mes' },
            { value: 'primer_semana', label: 'Primera semana de cada mes' },
          ],
        },
        {
          id: 'vacaciones_sistema',
          label: 'Sistema de programación de vacaciones',
          type: 'select',
          required: true,
          options: [
            { value: 'acuerdo', label: 'Por acuerdo entre el trabajador y el empleador' },
            { value: 'rol_anual', label: 'Rol anual aprobado por RRHH en el primer trimestre' },
            { value: 'rotativo', label: 'Sistema rotativo por área' },
          ],
        },
        {
          id: 'incluir_teletrabajo',
          label: '¿La empresa tiene modalidad de teletrabajo?',
          type: 'toggle',
          helpText: 'Incluirá el capítulo de teletrabajo conforme a la Ley N° 31572.',
        },
      ],
    },
  ],
  blocks: [
    {
      id: 'caratula',
      blockType: 'header',
      text:
        'REGLAMENTO INTERNO DE TRABAJO\n\n' +
        '{{empresa_razon_social}}\n' +
        'RUC: {{empresa_ruc}}\n' +
        'Actividad: {{empresa_actividad}}\n' +
        'Dirección: {{empresa_direccion}}\n' +
        'N° Trabajadores: {{empresa_num_trabajadores}}\n\n' +
        'Elaborado conforme a:\n' +
        '• D.S. N° 039-91-TR — Reglamento Interno de Trabajo\n' +
        '• D.Leg. N° 728 / D.S. N° 003-97-TR — LPCL\n' +
        '• Ley N° 29783 — Ley de SST\n' +
        '• Ley N° 27942 — Prevención del Hostigamiento Sexual\n' +
        '• Ley N° 30709 — Igualdad Salarial\n\n' +
        'Aprobado por: {{empresa_gerente}} — Gerente General\n' +
        'Fecha: {{fecha_aprobacion}}\n' +
        'Ciudad: {{ciudad}}',
    },
    {
      id: 'considerandos',
      blockType: 'body',
      title: 'CONSIDERANDOS',
      text:
        'Que, el artículo 1° del Decreto Supremo N° 039-91-TR establece que los empleadores de empresas con más de cien (100) trabajadores están obligados a contar con un Reglamento Interno de Trabajo;\n\n' +
        'Que, el Reglamento Interno de Trabajo es el instrumento normativo que regula las condiciones a que deben sujetarse las partes (empleador y trabajadores) en el cumplimiento de sus prestaciones;\n\n' +
        'Que, {{empresa_razon_social}} desea establecer normas claras que regulen las relaciones laborales, promuevan un ambiente de trabajo seguro, digno y libre de discriminación, y contribuyan a la productividad y al bienestar de sus trabajadores;\n\n' +
        'En uso de las atribuciones que le confieren las disposiciones laborales vigentes, {{empresa_razon_social}} aprueba el presente Reglamento Interno de Trabajo.',
    },
    {
      id: 'capitulo_i',
      blockType: 'clause',
      title: 'CAPÍTULO I — ADMISIÓN Y CONTRATACIÓN DEL PERSONAL',
      text:
        'Artículo 1°.- PROCESO DE SELECCIÓN\n' +
        'El ingreso de personal a {{empresa_razon_social}} se realizará a través de un proceso de selección y evaluación que garantice la idoneidad técnica y ética del candidato para el puesto. El proceso incluye, según el nivel del cargo: revisión de CV, evaluaciones técnicas y psicológicas, entrevistas y verificación de referencias laborales.\n\n' +
        'Artículo 2°.- PERÍODO DE PRUEBA\n' +
        'Todo nuevo trabajador que ingrese en la categoría de trabajador ordinario estará sujeto a un período de prueba de tres (3) meses, contados desde la fecha de ingreso, conforme al artículo 10° del D.S. N° 003-97-TR. Para trabajadores de confianza, el período de prueba podrá extenderse hasta seis (6) meses; para trabajadores de dirección, hasta doce (12) meses.\n\n' +
        'Durante el período de prueba, cualquiera de las partes puede dar por terminado el vínculo laboral sin expresión de causa ni pago de indemnización.\n\n' +
        'Artículo 3°.- DOCUMENTOS DE INGRESO\n' +
        'Al ingresar, el trabajador deberá presentar la siguiente documentación para conformar su legajo laboral:\n' +
        'a) Copia del Documento Nacional de Identidad (DNI);\n' +
        'b) Curriculum Vitae documentado;\n' +
        'c) Copia de títulos, diplomas y/o certificados de estudios;\n' +
        'd) Certificado de trabajo de empleos anteriores;\n' +
        'e) Certificado de antecedentes policiales, penales y judiciales;\n' +
        'f) Declaración jurada de no tener sentencia condenatoria;\n' +
        'g) Constancia de inscripción en AFP u ONP;\n' +
        'h) Declaración de cargas familiares (para asignación familiar);\n' +
        'i) Foto tipo carné (tamaño pasaporte);\n' +
        'j) Número de cuenta bancaria para abono de remuneraciones.\n\n' +
        'El trabajador se obliga a mantener actualizado su legajo ante cualquier cambio.\n\n' +
        'Artículo 4°.- REGISTRO EN T-REGISTRO\n' +
        '{{empresa_razon_social}} procederá al registro del trabajador en el T-Registro (SUNAT) dentro del día hábil siguiente al inicio de labores, conforme al D.S. N° 015-2010-TR y sus modificatorias.',
    },
    {
      id: 'capitulo_ii',
      blockType: 'clause',
      title: 'CAPÍTULO II — JORNADA, HORARIO Y DESCANSOS',
      text:
        'Artículo 5°.- JORNADA ORDINARIA DE TRABAJO\n' +
        'La jornada ordinaria de trabajo en {{empresa_razon_social}} es de {{jornada_horas}} horas semanales y hasta {{jornada_diaria}} horas diarias, respetando el máximo legal establecido en el artículo 25° de la Constitución Política del Perú y la Ley N° 27671.\n\n' +
        'Artículo 6°.- HORARIOS DE TRABAJO\n' +
        'Los horarios de trabajo serán fijados por {{empresa_razon_social}} según las necesidades operativas de cada área, respetando los límites máximos legales. Los horarios específicos serán comunicados a cada trabajador en su contrato o mediante comunicación interna. {{empresa_razon_social}} podrá modificar los horarios de trabajo en ejercicio de su facultad de dirección (Art. 9° D.S. N° 003-97-TR), con comunicación previa razonable.\n\n' +
        'Artículo 7°.- REFRIGERIO\n' +
        'El tiempo de refrigerio es de {{refrigerio_minutos}} minutos. Dicho tiempo no es computable como parte de la jornada de trabajo, conforme al artículo 7° del D.S. N° 007-2002-TR.\n\n' +
        'Artículo 8°.- CONTROL DE ASISTENCIA\n' +
        'El trabajador está obligado a registrar su ingreso y salida mediante el sistema de control de asistencia de {{empresa_razon_social}} (sistema biométrico, tarjeta, aplicativo, u otro). La omisión del registro es una irregularidad sujeta a sanción. {{empresa_razon_social}} conservará los registros de asistencia por el tiempo que establezca la ley, disponibles para inspección de SUNAFIL.\n\n' +
        'Artículo 9°.- TARDANZAS\n' +
        'Se considera tardanza la asistencia al centro de trabajo después de la hora de inicio del horario asignado. Las tardanzas injustificadas serán descontadas de la remuneración del trabajador y podrán constituir falta sujeta a sanción disciplinaria conforme a la escala del Capítulo VII.\n\n' +
        'Artículo 10°.- INASISTENCIAS\n' +
        'La inasistencia injustificada al trabajo es causal de descuento de remuneración del día no laborado. Las inasistencias reiteradas sin justificación constituyen falta grave conforme al artículo 25°(h) del D.S. N° 003-97-TR (tres o más tardanzas o inasistencias injustificadas en un período de treinta días).\n\n' +
        'Todo trabajador que no pueda asistir a laborar deberá comunicarlo a su jefe inmediato y al área de RRHH, por el medio más rápido disponible, antes del inicio de su jornada o dentro de las dos primeras horas de la misma.\n\n' +
        'Artículo 11°.- HORAS EXTRAS (SOBRETIEMPO)\n' +
        'La realización de trabajo en sobretiempo es de carácter excepcional y requiere acuerdo previo entre el trabajador y su jefatura. El sobretiempo es remunerado con el recargo legal correspondiente (25% adicional las dos primeras horas; 35% adicional a partir de la tercera hora), conforme a la Ley N° 27671. La imposición de sobretiempo sin el consentimiento del trabajador está prohibida.\n\n' +
        'Artículo 12°.- DESCANSO SEMANAL OBLIGATORIO\n' +
        'El trabajador tiene derecho a un descanso semanal remunerado de veinticuatro (24) horas continuas, preferentemente los días domingos, conforme al D.Leg. N° 713. {{empresa_razon_social}} podrá establecer turnos y sistemas de compensación por trabajo en día de descanso, conforme a ley.\n\n' +
        'Artículo 13°.- FERIADOS NACIONALES\n' +
        'Los trabajadores tienen derecho al descanso remunerado en los días feriados nacionales establecidos por ley, conforme al Decreto Legislativo N° 713. El trabajo en día feriado obligatorio no laborable se remunerará con el 100% de recargo adicional.',
    },
    {
      id: 'capitulo_iii',
      blockType: 'clause',
      title: 'CAPÍTULO III — REMUNERACIONES Y BENEFICIOS SOCIALES',
      text:
        'Artículo 14°.- REMUNERACIÓN\n' +
        'La remuneración de cada trabajador es la pactada en el contrato individual de trabajo, la que en ningún caso puede ser inferior a la Remuneración Mínima Vital (RMV) vigente. Las remuneraciones serán abonadas en la oportunidad convenida con el trabajador, de forma mensual o conforme al período de pago establecido ({{dia_pago}}).\n\n' +
        'Artículo 15°.- BOLETA DE PAGO\n' +
        '{{empresa_razon_social}} entregará al trabajador la boleta de pago, en formato físico o electrónico, dentro de las cuarenta y ocho (48) horas de efectuado el pago de la remuneración, conforme al D.S. N° 009-2011-TR. La boleta detallará los conceptos remunerativos, descuentos y aportes.\n\n' +
        'Artículo 16°.- COMPENSACIÓN POR TIEMPO DE SERVICIOS (CTS)\n' +
        'La CTS se depositará en la entidad financiera elegida por el trabajador en los plazos de ley: antes del 15 de mayo (período noviembre-abril) y antes del 15 de noviembre (período mayo-octubre), conforme al TUO del D.S. N° 001-97-TR.\n\n' +
        'Artículo 17°.- GRATIFICACIONES LEGALES\n' +
        'Los trabajadores percibirán dos gratificaciones ordinarias anuales: una por Fiestas Patrias (antes del 15 de julio) y otra por Navidad (antes del 15 de diciembre), equivalente cada una a una remuneración mensual, proporcional al tiempo laborado en el semestre respectivo, conforme a la Ley N° 27735.\n\n' +
        'Artículo 18°.- VACACIONES ANUALES\n' +
        'Los trabajadores tienen derecho a treinta (30) días calendario de descanso vacacional por cada año completo de servicios. El goce de vacaciones se realizará mediante el siguiente sistema: {{vacaciones_sistema}}. Las vacaciones se programarán con una anticipación mínima de treinta (30) días y no podrán ser acumuladas más de dos (2) períodos sin el inicio del goce, so pena de aplicación del régimen de vacaciones dobles.\n\n' +
        'Artículo 19°.- ASIGNACIÓN FAMILIAR\n' +
        'Los trabajadores que tengan hijos menores de dieciocho (18) años o mayores con incapacidad, acreditados mediante partida de nacimiento o resolución judicial, percibirán mensualmente la asignación familiar equivalente al 10% de la RMV vigente, conforme a la Ley N° 25129.\n\n' +
        'Artículo 20°.- PARTICIPACIÓN EN UTILIDADES\n' +
        'Los trabajadores participarán en las utilidades de {{empresa_razon_social}}, conforme a la actividad económica y tasas establecidas en el D.Leg. N° 892 y el D.S. N° 009-98-TR, cuando se generen utilidades distribuciones. El pago se realizará dentro de los treinta (30) días naturales siguientes a la presentación de la Declaración Jurada Anual del Impuesto a la Renta de Tercera Categoría.',
    },
    {
      id: 'capitulo_iv',
      blockType: 'clause',
      title: 'CAPÍTULO IV — DERECHOS Y OBLIGACIONES DEL EMPLEADOR',
      text:
        'Artículo 21°.- DERECHOS DEL EMPLEADOR\n' +
        'Conforme al artículo 9° del D.S. N° 003-97-TR, {{empresa_razon_social}} tiene las facultades de:\n' +
        'a) Normar reglamentariamente las labores mediante directivas, circulares y protocolos internos;\n' +
        'b) Dictar las órdenes necesarias para la correcta ejecución del trabajo;\n' +
        'c) Fiscalizar el desempeño de los trabajadores dentro del respeto a su dignidad;\n' +
        'd) Sancionar disciplinariamente las infracciones laborales, dentro de criterios de proporcionalidad y razonabilidad;\n' +
        'e) Modificar turnos, días u horas de trabajo (ius variandi) cuando medien razones justificadas y dentro de los límites legales.\n\n' +
        'Artículo 22°.- OBLIGACIONES DEL EMPLEADOR\n' +
        '{{empresa_razon_social}} se obliga a:\n' +
        'a) Registrar a los trabajadores en el T-Registro dentro del día hábil siguiente al inicio de labores;\n' +
        'b) Pagar oportunamente la remuneración y demás beneficios sociales de ley;\n' +
        'c) Efectuar los aportes a EsSalud y al sistema previsional (AFP u ONP);\n' +
        'd) Proporcionar condiciones de trabajo seguras y saludables conforme a la Ley N° 29783;\n' +
        'e) Garantizar un ambiente laboral libre de hostigamiento sexual y discriminación;\n' +
        'f) Capacitar a los trabajadores en sus funciones y en materia de SST;\n' +
        'g) Otorgar los exámenes médicos ocupacionales de ingreso, periódico y de retiro;\n' +
        'h) Respetar los derechos de sindicalización y negociación colectiva;\n' +
        'i) Otorgar las licencias y permisos que establece la ley;\n' +
        'j) Cumplir con el Cuadro de Categorías y Funciones y la Política Salarial conforme a la Ley N° 30709.',
    },
    {
      id: 'capitulo_v',
      blockType: 'clause',
      title: 'CAPÍTULO V — DERECHOS Y OBLIGACIONES DE LOS TRABAJADORES',
      text:
        'Artículo 23°.- DERECHOS DE LOS TRABAJADORES\n' +
        'Los trabajadores de {{empresa_razon_social}} tienen derecho a:\n' +
        'a) Percibir su remuneración y beneficios sociales de ley en los plazos establecidos;\n' +
        'b) Gozar de condiciones de trabajo seguras y saludables;\n' +
        'c) Recibir capacitación para el desempeño de sus funciones;\n' +
        'd) Sindicalizarse y negociar colectivamente conforme a ley;\n' +
        'e) Ejercer el derecho de huelga conforme a ley;\n' +
        'f) Ser tratados con respeto y dignidad, libres de discriminación y hostigamiento;\n' +
        'g) Conocer su categoría, banda remunerativa y los criterios para fijar su remuneración;\n' +
        'h) Presentar quejas, sugerencias y denuncias de hostigamiento por los canales establecidos;\n' +
        'i) A la protección de sus datos personales conforme a la Ley N° 29733.\n\n' +
        'Artículo 24°.- OBLIGACIONES DE LOS TRABAJADORES\n' +
        'Los trabajadores de {{empresa_razon_social}} están obligados a:\n' +
        'a) Prestar sus servicios personalmente, con diligencia, eficiencia y honestidad;\n' +
        'b) Cumplir puntualmente el horario y la jornada de trabajo;\n' +
        'c) Observar el presente Reglamento, las directivas internas y las instrucciones que imparta la empresa;\n' +
        'd) Guardar respeto y consideración hacia directivos, compañeros, clientes y proveedores;\n' +
        'e) Conservar y mantener en buen estado los bienes y equipos confiados;\n' +
        'f) Cumplir con todas las medidas de Seguridad y Salud en el Trabajo;\n' +
        'g) Usar correctamente los equipos de protección personal (EPP) proporcionados;\n' +
        'h) Reportar inmediatamente todo accidente, incidente o condición insegura;\n' +
        'i) Mantener la confidencialidad de la información de {{empresa_razon_social}};\n' +
        'j) Comunicar a RRHH cualquier cambio de datos personales dentro de las 48 horas.',
    },
    {
      id: 'capitulo_vi',
      blockType: 'clause',
      title: 'CAPÍTULO VI — LICENCIAS, PERMISOS Y AUSENCIAS',
      text:
        'Artículo 25°.- LICENCIAS CON GOCE DE HABER\n' +
        'Los trabajadores tienen derecho a las siguientes licencias con goce de haber:\n\n' +
        'a) LICENCIA POR MATERNIDAD: 49 días antes del parto + 49 días después (total: 98 días), prorrogables en caso de parto múltiple o complicaciones, conforme a la Ley N° 26644 y modificatorias. El período prenatal puede cederse al período postnatal.\n\n' +
        'b) LICENCIA POR PATERNIDAD: 10 días hábiles contados desde la fecha de parto, o cuando la madre o el hijo/a sean dados de alta, conforme a la Ley N° 29409. Se amplía a 20 días en caso de parto múltiple, prematuro, con discapacidad o complicaciones.\n\n' +
        'c) LICENCIA POR ADOPCIÓN: Trabajador que adopta un menor de 18 años tiene derecho a 30 días de licencia con goce de haber, conforme a la Ley N° 27409.\n\n' +
        'd) LICENCIA POR FALLECIMIENTO DE FAMILIARES: Cinco (5) días útiles por fallecimiento de cónyuge, conviviente, hijos, padres y hermanos, conforme a la Ley N° 30012.\n\n' +
        'e) LICENCIA SINDICAL: Los dirigentes sindicales tienen derecho a licencia con goce de haber para el cumplimiento de sus funciones sindicales, conforme al D.S. N° 010-2003-TR.\n\n' +
        'f) LICENCIA POR DONACIÓN DE SANGRE: Un (1) día de descanso remunerado por donación de sangre, conforme a la Ley N° 29468.\n\n' +
        'Artículo 26°.- PERMISOS\n' +
        'Los permisos para ausentarse temporalmente durante la jornada laboral (diligencias judiciales, trámites, atención médica urgente) serán autorizados por el jefe inmediato y el área de RRHH, y podrán ser descontados del horario de trabajo o compensados según acuerdo.\n\n' +
        'Artículo 27°.- DESCANSO MÉDICO\n' +
        'En caso de enfermedad o accidente, el trabajador debe presentar el certificado médico emitido por EsSalud o entidad de salud competente, dentro de los tres (3) días hábiles de reincorporado al trabajo. EsSalud asume el subsidio por incapacidad desde el cuarto (4°) día de descanso médico. Los tres (3) primeros días son de cargo del empleador.',
    },
    {
      id: 'capitulo_vii',
      blockType: 'clause',
      title: 'CAPÍTULO VII — RÉGIMEN DISCIPLINARIO Y SANCIONES',
      text:
        'Artículo 28°.- PRINCIPIOS DISCIPLINARIOS\n' +
        'El régimen disciplinario de {{empresa_razon_social}} se rige por los principios de legalidad, tipicidad, proporcionalidad, razonabilidad, no bis in idem (una sola sanción por el mismo hecho) y derecho de defensa.\n\n' +
        'Artículo 29°.- ESCALA DE SANCIONES\n' +
        'Las infracciones al presente Reglamento y a las normas laborales serán sancionadas de acuerdo con la siguiente escala:\n\n' +
        '┌──────────────────────────────────────────────┬──────────────────────────────────────────┐\n' +
        '│ Sanción                                      │ Aplicación                               │\n' +
        '├──────────────────────────────────────────────┼──────────────────────────────────────────┤\n' +
        '│ AMONESTACIÓN VERBAL                          │ Faltas leves de primer incidente          │\n' +
        '│ AMONESTACIÓN ESCRITA                         │ Faltas leves reiteradas o faltas graves   │\n' +
        '│                                              │ de menor entidad                          │\n' +
        '│ SUSPENSIÓN SIN GOCE DE HABER                │ Faltas graves o reincidencia en faltas    │\n' +
        '│ (1 a 30 días según gravedad)                │ medias; duración proporcional a gravedad  │\n' +
        '│ DESPIDO POR FALTA GRAVE                     │ Faltas graves debidamente comprobadas,    │\n' +
        '│                                              │ conforme Arts. 24-25 D.S. N° 003-97-TR   │\n' +
        '└──────────────────────────────────────────────┴──────────────────────────────────────────┘\n\n' +
        'Artículo 30°.- FALTAS GRAVES\n' +
        'Constituyen faltas graves, que pueden dar lugar al despido, las siguientes conductas (Art. 25° D.S. N° 003-97-TR):\n' +
        'a) El incumplimiento injustificado de las obligaciones de trabajo que supone el quebrantamiento de la buena fe laboral;\n' +
        'b) La disminución deliberada del rendimiento en el trabajo;\n' +
        'c) La apropiación consumada o frustrada de bienes del empleador;\n' +
        'd) El uso o entrega de información confidencial de {{empresa_razon_social}} a terceros no autorizados;\n' +
        'e) La sustracción o utilización no autorizada de recursos del empleador;\n' +
        'f) El daño intencional o por negligencia inexcusable a bienes de {{empresa_razon_social}};\n' +
        'g) El abandono de trabajo por más de tres (3) días consecutivos, o más de cinco (5) días no consecutivos en un período de treinta (30) días, o más de quince (15) días en un período de ciento ochenta (180) días;\n' +
        'h) Las ausencias injustificadas por más de tres (3) días en un período de treinta (30) días calendario;\n' +
        'i) La impuntualidad reiterada (más de tres tardanzas en un mes);\n' +
        'j) El hostigamiento sexual acreditado (Art. 25°(k) D.S. N° 003-97-TR);\n' +
        'k) El incumplimiento de las normas de Seguridad y Salud en el Trabajo;\n' +
        'l) Actos de violencia, amenaza o coacción contra directivos, trabajadores, clientes o proveedores;\n' +
        'm) El acto de concurrencia al trabajo bajo la influencia de alcohol o drogas;\n' +
        'n) La comisión de delitos dolosos en el desempeño de las funciones.\n\n' +
        'Artículo 31°.- PROCEDIMIENTO PARA APLICAR SANCIONES\n' +
        'Para la aplicación de suspensiones y despidos, {{empresa_razon_social}} seguirá el procedimiento establecido en los artículos 31° y 32° del D.S. N° 003-97-TR:\n' +
        '(i) Comunicación escrita al trabajador describiendo la falta imputada;\n' +
        '(ii) Plazo de seis (6) días naturales para que el trabajador presente sus descargos escritos;\n' +
        '(iii) Evaluación de los descargos por RRHH y el área legal;\n' +
        '(iv) Comunicación de la sanción al trabajador, indicando la causa y la fecha de vigencia.\n\n' +
        'Artículo 32°.- EFECTO DE LAS SANCIONES\n' +
        'Las sanciones aplicadas quedan registradas en el legajo laboral del trabajador. La reincidencia en la misma falta, dentro de un período de doce (12) meses, constituye circunstancia agravante que puede determinar una sanción de mayor gravedad.',
    },
    {
      id: 'capitulo_viii',
      blockType: 'clause',
      title: 'CAPÍTULO VIII — SEGURIDAD Y SALUD EN EL TRABAJO',
      text:
        'Artículo 33°.- SISTEMA DE GESTIÓN DE SST\n' +
        '{{empresa_razon_social}} implementa y mantiene un Sistema de Gestión de Seguridad y Salud en el Trabajo (SGSST) conforme a la Ley N° 29783, D.S. N° 005-2012-TR y sus modificatorias. El SGSST comprende la Política SST, el IPERC, el Plan Anual SST, el Comité/Supervisor SST, los registros obligatorios y la mejora continua.\n\n' +
        'Artículo 34°.- COMITÉ/SUPERVISOR SST\n' +
        '{{empresa_razon_social}} cuenta con [Comité de Seguridad y Salud en el Trabajo / Supervisor de SST], conforme al artículo 29° de la Ley N° 29783. Los trabajadores participan en la elección de sus representantes ante el Comité.\n\n' +
        'Artículo 35°.- OBLIGACIONES EN MATERIA DE SST\n' +
        'Todo trabajador está obligado a:\n' +
        'a) Cumplir con las normas, instrucciones y procedimientos del SGSST;\n' +
        'b) Usar correctamente los equipos de protección personal (EPP) proporcionados;\n' +
        'c) Reportar inmediatamente a su supervisor todo accidente, incidente o condición insegura;\n' +
        'd) Participar activamente en las capacitaciones y simulacros de SST;\n' +
        'e) Someterse a los exámenes médicos ocupacionales de ingreso, periódicos y de retiro;\n' +
        'f) Abstenerse de realizar trabajos bajo la influencia de alcohol o sustancias psicoactivas.\n\n' +
        'Artículo 36°.- NOTIFICACIÓN DE ACCIDENTES\n' +
        'Todo accidente de trabajo, por leve que sea, debe ser reportado al supervisor inmediato dentro de las veinticuatro (24) horas de ocurrido. El área de SST notificará al MTPE los accidentes de trabajo mortales e incidentes peligrosos dentro del plazo legal establecido (24 horas) conforme al D.S. N° 005-2012-TR.',
    },
    {
      id: 'capitulo_ix_hostigamiento',
      blockType: 'clause',
      title: 'CAPÍTULO IX — PREVENCIÓN DEL HOSTIGAMIENTO SEXUAL Y LA DISCRIMINACIÓN',
      text:
        'Artículo 37°.- PROHIBICIÓN DE HOSTIGAMIENTO Y DISCRIMINACIÓN\n' +
        '{{empresa_razon_social}} prohíbe expresamente toda forma de hostigamiento sexual, acoso laboral y discriminación por razón de sexo, raza, religión, opinión, condición económica, discapacidad, identidad de género u orientación sexual, en el centro de trabajo y en el marco de la relación laboral.\n\n' +
        'Artículo 38°.- DEFINICIÓN DE HOSTIGAMIENTO SEXUAL\n' +
        'Conforme al artículo 4° de la Ley N° 27942, el hostigamiento sexual es toda conducta de naturaleza o connotación sexual no deseada que crea un ambiente intimidatorio, hostil o humillante para quien la padece. No se requiere repetición de la conducta para su configuración.\n\n' +
        'Artículo 39°.- PROCEDIMIENTO DE DENUNCIA\n' +
        'Cualquier trabajador que sea víctima o testigo de hostigamiento sexual puede presentar su denuncia ante el Comité de Intervención de {{empresa_razon_social}}, por los canales establecidos en la Política de Prevención del Hostigamiento Sexual vigente en la empresa. La investigación se realizará conforme al D.S. N° 014-2019-MIMP, garantizando confidencialidad, celeridad y no revictimización.\n\n' +
        'Artículo 40°.- PROHIBICIÓN DE REPRESALIAS\n' +
        'Queda absolutamente prohibida toda represalia contra quien presente una denuncia de hostigamiento sexual o participe en el procedimiento de investigación. La represalia constituye falta grave independiente, sancionable con suspensión o despido.',
    },
    {
      id: 'capitulo_x_teletrabajo',
      blockType: 'clause',
      title: 'CAPÍTULO X — TELETRABAJO',
      text:
        'Artículo 41°.- MODALIDAD DE TELETRABAJO\n' +
        '{{empresa_razon_social}} puede implementar la modalidad de teletrabajo conforme a la Ley N° 31572 y su Reglamento D.S. N° 002-2023-TR. El teletrabajo puede ser:\n' +
        '(a) Completo: el trabajador presta servicios íntegramente desde su domicilio u otro lugar acordado;\n' +
        '(b) Mixto o semipresencial: combinación de presencialidad y teletrabajo.\n\n' +
        'Artículo 42°.- CONDICIONES DEL TELETRABAJO\n' +
        'Los trabajadores bajo modalidad de teletrabajo tienen los mismos derechos y obligaciones que los trabajadores presenciales. {{empresa_razon_social}} proporcionará los equipos tecnológicos necesarios, o reconocerá una compensación si el trabajador usa los suyos propios. El teletrabajador debe cumplir el horario acordado y mantener disponibilidad efectiva durante la jornada.\n\n' +
        'Artículo 43°.- REVERSIBILIDAD\n' +
        'Cualquiera de las partes puede solicitar el retorno a la presencialidad con un preaviso de siete (7) días hábiles, salvo que la modalidad haya sido pactada por escrito como permanente.',
      condition: 'incluir_teletrabajo === true',
      isOptional: true,
    },
    {
      id: 'capitulo_final',
      blockType: 'clause',
      title: 'CAPÍTULO FINAL — DISPOSICIONES GENERALES',
      text:
        'Artículo 44°.- DIFUSIÓN DEL REGLAMENTO\n' +
        'El presente Reglamento será entregado a cada trabajador al momento de su ingreso, y será puesto en conocimiento de todo el personal mediante su publicación en la intranet corporativa, tablones de anuncios y otros medios de comunicación interna disponibles. La recepción del Reglamento será acreditada mediante constancia firmada por el trabajador.\n\n' +
        'Artículo 45°.- PRESENTACIÓN ANTE LA AAT\n' +
        'El presente Reglamento será presentado ante la Autoridad Administrativa de Trabajo (AAT) correspondiente, en dos (2) ejemplares, dentro de los quince (15) días siguientes a su aprobación, conforme al artículo 2° del D.S. N° 039-91-TR. El Reglamento surte efecto al día siguiente de su presentación.\n\n' +
        'Artículo 46°.- MODIFICACIÓN DEL REGLAMENTO\n' +
        'El presente Reglamento podrá ser modificado por {{empresa_razon_social}} cuando las necesidades organizativas o los cambios normativos así lo requieran. Las modificaciones deberán seguir el mismo procedimiento de presentación ante la AAT establecido para la versión original.\n\n' +
        'Artículo 47°.- NORMAS SUPLETORIAS\n' +
        'En todo lo no previsto en el presente Reglamento, se aplicarán las disposiciones del TUO del D.Leg. N° 728, el D.S. N° 005-2012-TR, la Ley N° 29783, y demás normas laborales peruanas vigentes y las que en el futuro se dicten.\n\n' +
        'Artículo 48°.- VIGENCIA\n' +
        'El presente Reglamento Interno de Trabajo entra en vigencia al día siguiente de su presentación ante la Autoridad Administrativa de Trabajo de {{ciudad}}.',
    },
    {
      id: 'firma',
      blockType: 'signature',
      text:
        'El presente Reglamento Interno de Trabajo ha sido aprobado por {{empresa_razon_social}} en {{ciudad}}, el {{fecha_aprobacion}}.\n\n\n' +
        '────────────────────────────────────\n' +
        '    {{empresa_gerente}}\n' +
        '    Gerente General\n' +
        '    {{empresa_razon_social}}\n' +
        '    RUC N° {{empresa_ruc}}\n\n\n' +
        '────────────────────────────────────\n' +
        '    Gerente / Jefe de Recursos Humanos\n' +
        '    {{empresa_razon_social}}\n\n\n' +
        'CONSTANCIA DE RECEPCIÓN DEL TRABAJADOR:\n' +
        'Yo, _____________________________, identificado/a con DNI N° __________, declaro haber recibido y leído el presente Reglamento Interno de Trabajo.\n\n' +
        'Firma: ___________________________    Fecha: ___________',
    },
  ],
}
