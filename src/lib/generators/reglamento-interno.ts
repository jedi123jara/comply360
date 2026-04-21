/**
 * Generador: Reglamento Interno de Trabajo (RIT)
 *
 * Base legal:
 *  - D.S. 039-91-TR — Reglamento Interno de Trabajo (obligatorio si 100+ trabajadores)
 *  - D.Leg. 728 + D.S. 003-97-TR — TUO Ley de Productividad y Competitividad Laboral
 *  - D.S. 001-98-TR — Planillas, Boletas de Pago
 *  - Ley 29783 + D.S. 005-2012-TR — SST (Cap. V)
 *  - Ley 27942 + D.S. 014-2019-MIMP — Hostigamiento sexual
 *
 * 9 Capítulos obligatorios (Art. 2 D.S. 039-91-TR):
 *  I.    Admisión y contratación
 *  II.   Jornadas, horarios y descansos
 *  III.  Remuneraciones y beneficios sociales
 *  IV.   Permisos, licencias e inasistencias
 *  V.    Seguridad y Salud en el Trabajo (SST)
 *  VI.   Derechos y obligaciones del empleador
 *  VII.  Derechos y obligaciones del trabajador
 *  VIII. Normas disciplinarias (faltas y sanciones)
 *  IX.   Medidas frente al hostigamiento sexual
 *  X.    Terminación del vínculo laboral
 *
 * El RIT debe aprobarse por la empresa, presentarse al MTPE en mesa de partes
 * (copia), exhibirse en lugar visible y entregarse a cada trabajador en su
 * primer día (o publicarse en intranet). Registro automático por MTPE (Art. 4).
 */
import type { GeneratedDocument, GeneratedSection, GeneratorOrgContext } from './types'

export type RegimenAplicable = 'GENERAL' | 'MYPE_PEQUENA' | 'MYPE_MICRO' | 'MIXTO'

export interface ReglamentoInternoParams {
  fechaAprobacion: string
  /** Régimen laboral predominante de la empresa. */
  regimen: RegimenAplicable
  /** Jornada ordinaria en horas (default 8 diaria / 48 semanal). */
  jornadaDiaria: number
  jornadaSemanal: number
  /** Hora de ingreso (ej. "08:00"). */
  horaIngreso: string
  /** Hora de salida (ej. "17:00"). */
  horaSalida: string
  /** Minutos de refrigerio (mín. 45 si jornada ≥ 4h). */
  minutosRefrigerio: number
  /** Período de prueba configurado en días (máx. 90 general, 180 confianza, 365 dirección). */
  periodoPruebaDias: number
  /** Día de pago de remuneraciones (número del mes, 1-31). */
  diaPago: number
  /** Tiene uniforme o dress code. */
  tieneUniforme: boolean
  descripcionUniforme?: string
  /** Modalidades presentes: presencial, teletrabajo, mixta. */
  modalidades: Array<'presencial' | 'teletrabajo' | 'mixto'>
  /** Canal de comunicaciones internas (email, WhatsApp Business, intranet, etc.). */
  canalComunicaciones: string
  /** Responsable SST (nombre, cargo). */
  responsableSst: string
  /** Faltas graves adicionales a las tipificadas por ley. */
  faltasGravesAdicionales?: string[]
  /** Sanciones máximas aplicables (se recomienda suspensión sin goce de haber). */
  sancionesAdicionales?: string[]
}

const REGIMEN_LABEL: Record<RegimenAplicable, string> = {
  GENERAL: 'Régimen Laboral General (D.Leg. 728)',
  MYPE_PEQUENA: 'Régimen MYPE Pequeña Empresa (Ley 32353)',
  MYPE_MICRO: 'Régimen MYPE Microempresa (Ley 32353)',
  MIXTO: 'Régimen mixto (varios regímenes)',
}

export function generarReglamentoInterno(
  params: ReglamentoInternoParams,
  org: GeneratorOrgContext,
): GeneratedDocument {
  const fechaLegible = formatFechaLegible(params.fechaAprobacion)

  // Validaciones básicas
  if (params.jornadaDiaria > 8) {
    throw new Error(
      'La jornada diaria máxima es 8 horas (D.S. 007-2002-TR Art. 1). Para jornadas acumulativas o atípicas, consultá Art. 2.',
    )
  }
  if (params.jornadaSemanal > 48) {
    throw new Error('La jornada semanal máxima es 48 horas (Constitución Art. 25).')
  }
  if (params.periodoPruebaDias > 365) {
    throw new Error(
      'El período de prueba máximo es 90 días (general), 180 (confianza) o 365 (dirección). D.Leg. 728 Art. 10.',
    )
  }
  if (params.minutosRefrigerio < 45 && params.jornadaDiaria >= 4) {
    // No lanzamos error, solo avisamos en el texto
  }

  /* ── Secciones ─────────────────────────────────────────────────── */

  const sections: GeneratedSection[] = [
    {
      id: 'preambulo',
      numbering: 'PREÁMBULO',
      title: 'Preámbulo y Objeto del Reglamento',
      content: `El presente **Reglamento Interno de Trabajo** (en adelante, "el RIT") de **${org.razonSocial}** (en adelante, "la Empresa"), con RUC ${org.ruc}${org.domicilio ? ` y domicilio en ${org.domicilio}` : ''}, tiene por objeto establecer las normas internas que rigen las relaciones laborales entre la Empresa y sus trabajadores, conforme al **D.S. 039-91-TR** y la normativa laboral peruana aplicable.\n\nEl RIT es de cumplimiento obligatorio para todos los trabajadores sujetos al ${REGIMEN_LABEL[params.regimen]}, independientemente de su modalidad de contratación. Las disposiciones del RIT se integran al contrato individual de trabajo y complementan la normativa legal.\n\n**Entrada en vigencia:** ${fechaLegible}. Toda modificación posterior se comunicará por ${params.canalComunicaciones}.`,
      baseLegal: 'D.S. 039-91-TR, Art. 1-2',
    },
    {
      id: 'capitulo-1',
      numbering: 'CAPÍTULO I',
      title: 'Admisión y Contratación',
      content: `**Art. 1.** Requisitos para el ingreso.\n\nSon requisitos mínimos para ingresar a la Empresa:\n\na) Ser mayor de 18 años (adolescentes 15-17 requieren autorización MTPE).\nb) Presentar DNI vigente, CV actualizado, certificados de estudios y experiencia.\nc) Aprobar el examen médico de ingreso (Ley 29783).\nd) No tener antecedentes penales incompatibles con el puesto.\ne) Suscribir el contrato de trabajo por escrito y recibir copia.\nf) Afiliarse al sistema previsional (AFP u ONP) y declarar datos previsionales.\n\n**Art. 2.** Período de prueba.\n\nEl período de prueba es de **${params.periodoPruebaDias} días** desde el inicio de labores. Durante dicho período el trabajador goza de los mismos derechos y obligaciones que los demás trabajadores. Al término, si el empleador no expresa decisión contraria, el trabajador alcanza protección contra el despido arbitrario (Art. 10 D.Leg. 728).\n\n**Art. 3.** Tipo de contratos.\n\nLa Empresa podrá celebrar contratos bajo cualquier modalidad autorizada por la Ley: indefinidos, sujetos a modalidad (plazo fijo con causa objetiva), a tiempo parcial, contratos en régimen MYPE, modalidades formativas y teletrabajo.\n\n**Art. 4.** Registro en T-REGISTRO.\n\nLa Empresa registrará a todo trabajador en T-REGISTRO **dentro del día hábil del inicio de labores** (Art. 4-A D.S. 018-2007-TR).`,
      baseLegal: 'D.Leg. 728, Art. 4, 10 · D.S. 003-97-TR, Art. 16',
    },
    {
      id: 'capitulo-2',
      numbering: 'CAPÍTULO II',
      title: 'Jornadas, Horarios y Descansos',
      content: `**Art. 5.** Jornada ordinaria.\n\nLa jornada ordinaria es de **${params.jornadaDiaria} horas diarias** y **${params.jornadaSemanal} horas semanales**, respetando los máximos constitucionales (8h/día, 48h/semana).\n\n**Art. 6.** Horario de trabajo.\n\nEl horario ordinario es:\n- Ingreso: **${params.horaIngreso}**\n- Salida: **${params.horaSalida}**\n- Refrigerio: **${params.minutosRefrigerio} minutos**${params.minutosRefrigerio < 45 && params.jornadaDiaria >= 4 ? ' *(revisar: mínimo legal 45 min para jornadas ≥ 4h, Art. 7 D.S. 007-2002-TR)*' : ''}\n\nEl horario se exhibe en lugar visible del centro de trabajo (Art. 5 D.S. 004-2006-TR).\n\n${params.modalidades.includes('teletrabajo') ? '**Art. 7.** Teletrabajo.\n\nLos trabajadores en modalidad de teletrabajo están sujetos a la Ley 31572 y su reglamento. Tienen derecho a la **desconexión digital** fuera de su jornada, a los mismos beneficios y SST que los trabajadores presenciales, y la Empresa asume los costos de los equipos y servicios mínimos necesarios.\n\n' : ''}**Art. ${params.modalidades.includes('teletrabajo') ? '8' : '7'}.** Horas extras.\n\nEl trabajo en sobretiempo es voluntario. Se remunera con sobretasa de **25% para las dos primeras horas y 35% para las siguientes** (Art. 10 D.S. 007-2002-TR). El registro de horas extras se consigna en el control de asistencia.\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '9' : '8'}.** Descanso semanal y feriados.\n\nEl descanso semanal es de **24 horas consecutivas** (idealmente el domingo). Los feriados se remuneran conforme a Ley 27671. Si se labora en feriado, se paga triple (remuneración ordinaria + doble por sobretasa 100%).\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '10' : '9'}.** Control de asistencia.\n\nEl control de asistencia es obligatorio para todos los trabajadores (excepto personal de dirección, confianza y servicio doméstico). Se registrará en el sistema implementado por la Empresa y estará a disposición de SUNAFIL en cualquier momento.`,
      baseLegal: 'D.S. 007-2002-TR · D.S. 004-2006-TR · Ley 27671',
    },
    {
      id: 'capitulo-3',
      numbering: 'CAPÍTULO III',
      title: 'Remuneraciones y Beneficios Sociales',
      content: `**Art. ${params.modalidades.includes('teletrabajo') ? '11' : '10'}.** Remuneración.\n\nLa remuneración del trabajador no será inferior a la Remuneración Mínima Vital vigente (RMV 2026: S/ 1,130). El pago se realiza el **día ${params.diaPago} de cada mes**, mediante abono en cuenta bancaria del trabajador. La boleta de pago se entrega dentro de los 3 días hábiles siguientes al pago (Art. 18-19 D.S. 001-98-TR).\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '12' : '11'}.** Asignación familiar.\n\nLos trabajadores con hijos menores de 18 años o hijos mayores hasta 24 años que cursan estudios superiores reciben Asignación Familiar equivalente al 10% de la RMV (Ley 25129).\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '13' : '12'}.** Beneficios sociales.\n\nConforme al ${REGIMEN_LABEL[params.regimen]}:\n${buildBeneficiosPorRegimen(params.regimen)}\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '14' : '13'}.** Horas extras.\n\nVer Art. ${params.modalidades.includes('teletrabajo') ? '8' : '7'} — sobretasas 25%/35%.\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '15' : '14'}.** Descuentos.\n\nLos descuentos al trabajador se limitan a: aportes previsionales, retenciones judiciales, descuentos autorizados por escrito y sanciones económicas cuando legalmente aplicables. El total no puede superar el 60% de la remuneración neta.`,
      baseLegal: 'D.Leg. 728 · D.S. 001-97-TR (CTS) · Ley 27735 (Gratif) · D.Leg. 713 (Vacaciones)',
    },
    {
      id: 'capitulo-4',
      numbering: 'CAPÍTULO IV',
      title: 'Permisos, Licencias e Inasistencias',
      content: `**Art. ${params.modalidades.includes('teletrabajo') ? '16' : '15'}.** Licencias con goce de haber.\n\na) **Maternidad**: 49 días pre-natales + 49 días post-natales (Ley 26644).\nb) **Paternidad**: 10 días calendario (Ley 29409, modificada por Ley 30807).\nc) **Lactancia**: 1 hora diaria durante el primer año del hijo (Ley 27240).\nd) **Fallecimiento de familiar directo**: 5 días (cónyuge, hijo, padre); 3 días (hermano).\ne) **Enfermedad común**: hasta 20 días por año calendario con certificado médico.\nf) **Capacitación aprobada**: sujeto a autorización.\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '17' : '16'}.** Permisos sin goce de haber.\n\nSe otorgan previa solicitud escrita del trabajador y aprobación del empleador, por motivos justificados.\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '18' : '17'}.** Inasistencias injustificadas.\n\nConstituyen falta grave:\n- Más de 3 días consecutivos de inasistencia injustificada\n- Más de 5 días no consecutivos en un período de 30 días\n- Más de 15 días en un período de 180 días\n\n(Art. 25-h D.Leg. 728)\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '19' : '18'}.** Tardanzas.\n\nSe consideran tardanzas los ingresos posteriores a la hora ingresada. Tardanzas reiteradas pueden generar sanción disciplinaria.`,
      baseLegal: 'Ley 26644 · Ley 29409 · Ley 27240 · D.Leg. 728 Art. 25',
    },
    {
      id: 'capitulo-5',
      numbering: 'CAPÍTULO V',
      title: 'Seguridad y Salud en el Trabajo (SST)',
      content: `**Art. ${params.modalidades.includes('teletrabajo') ? '20' : '19'}.** Compromiso de la Empresa.\n\nLa Empresa mantiene un Sistema de Gestión de SST conforme a la Ley 29783. La **Política SST** firmada por la gerencia está exhibida en lugares visibles y disponible para todo trabajador.\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '21' : '20'}.** Responsable SST.\n\nEl responsable del sistema SST es **${params.responsableSst}**, con facultades para coordinar con el ${org.totalWorkers >= 20 ? 'Comité SST' : 'Supervisor SST'}, representar a la Empresa ante SUNAFIL en materia SST y ejecutar el Plan Anual SST.\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '22' : '21'}.** Obligaciones del trabajador en SST.\n\nTodo trabajador debe:\na) Cumplir los procedimientos de SST comunicados por la Empresa.\nb) Utilizar correctamente el EPP entregado.\nc) Participar en capacitaciones obligatorias (mín. 4 al año).\nd) Reportar condiciones y actos inseguros.\ne) Someterse a exámenes médicos ocupacionales.\nf) No interferir con los sistemas de seguridad.\ng) Asistir a simulacros de emergencia.\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '23' : '22'}.** Derecho a paralizar por peligro inminente.\n\nEl trabajador puede interrumpir su actividad ante un peligro inminente sin represalia alguna (Art. 63 Ley 29783).\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '24' : '23'}.** Accidentes e incidentes.\n\nTodo accidente, incidente peligroso o enfermedad ocupacional debe reportarse de inmediato al jefe directo y al responsable SST. La Empresa notificará al MTPE dentro de 24 horas cuando se trate de accidente mortal o incapacitante (Art. 110 D.S. 005-2012-TR).`,
      baseLegal: 'Ley 29783 · D.S. 005-2012-TR · R.M. 050-2013-TR',
    },
    {
      id: 'capitulo-6',
      numbering: 'CAPÍTULO VI',
      title: 'Derechos y Obligaciones del Empleador',
      content: `**Art. ${params.modalidades.includes('teletrabajo') ? '25' : '24'}.** Derechos del empleador.\n\na) Dirigir, supervisar y evaluar el trabajo.\nb) Reglamentar el trabajo dentro del marco legal.\nc) Establecer horarios, métodos y procedimientos.\nd) Introducir cambios razonables por necesidades del servicio.\ne) Aplicar medidas disciplinarias conforme al RIT y la ley.\nf) Evaluar el desempeño del personal.\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '26' : '25'}.** Obligaciones del empleador.\n\na) Pagar puntualmente las remuneraciones y beneficios sociales.\nb) Entregar boleta de pago en el plazo de 3 días hábiles del pago.\nc) Registrar al trabajador en T-REGISTRO y Planilla Electrónica.\nd) Cumplir la normativa de SST y proveer condiciones seguras.\ne) Capacitar al personal (mín. 4 sesiones SST/año).\nf) Tratar al trabajador con dignidad, sin discriminación.\ng) Respetar los derechos sindicales y la intimidad.\nh) Promover la igualdad salarial conforme a Ley 30709.\ni) Prevenir el hostigamiento sexual conforme a Ley 27942.\nj) Exhibir la Política SST, el presente RIT y la síntesis de la legislación laboral.`,
      baseLegal: 'Constitución Art. 23-29 · D.Leg. 728 · Ley 29783',
    },
    {
      id: 'capitulo-7',
      numbering: 'CAPÍTULO VII',
      title: 'Derechos y Obligaciones del Trabajador',
      content: `**Art. ${params.modalidades.includes('teletrabajo') ? '27' : '26'}.** Derechos del trabajador.\n\na) Recibir la remuneración acordada en los plazos establecidos.\nb) Gozar de los beneficios sociales del régimen aplicable.\nc) Recibir capacitación y formación.\nd) Disfrutar del descanso vacacional, semanal y feriados.\ne) Contar con un ambiente laboral seguro y saludable.\nf) Recibir trato digno y respetuoso.\ng) Participar en el Comité o designar al Supervisor SST.\nh) Constituir o afiliarse a organizaciones sindicales.\ni) Denunciar hostigamiento sexual, discriminación o represalias.\nj) Recibir copia de su contrato de trabajo y boleta de pago.\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '28' : '27'}.** Obligaciones del trabajador.\n\na) Cumplir las tareas de su puesto con eficiencia y responsabilidad.\nb) Acatar las órdenes del empleador dentro del marco legal.\nc) Cumplir el horario y asistir regularmente.\nd) Usar correctamente equipos, materiales e instalaciones.${params.tieneUniforme ? `\ne) Usar el uniforme/dress code: ${params.descripcionUniforme ?? 'según el estándar de la Empresa'}.` : ''}\nf) Guardar reserva de la información confidencial de la Empresa.\ng) Cumplir las normas de SST y usar el EPP.\nh) Respetar a compañeros, jefes y clientes.\ni) No realizar actividades que compitan con la Empresa.\nj) Reportar accidentes, incidentes y condiciones inseguras.\nk) Participar en capacitaciones obligatorias.`,
      baseLegal: 'Constitución · D.Leg. 728 · Ley 29783',
    },
    {
      id: 'capitulo-8',
      numbering: 'CAPÍTULO VIII',
      title: 'Normas Disciplinarias (Faltas y Sanciones)',
      content: `**Art. ${params.modalidades.includes('teletrabajo') ? '29' : '28'}.** Faltas disciplinarias.\n\n**Faltas leves**: errores por negligencia sin perjuicio grave, tardanzas aisladas, descuidos menores.\n\n**Faltas graves (Art. 25 D.Leg. 728):**\n\na) Incumplimiento reiterado de obligaciones laborales\nb) Disminución deliberada del rendimiento\nc) Apropiación indebida de bienes de la Empresa\nd) Uso de información confidencial en beneficio propio\ne) Concurrencia a trabajar en estado de embriaguez o bajo drogas\nf) Agresión o injuria grave a jefes, compañeros o clientes\ng) Acoso sexual (contemplado también en Ley 27942)\nh) Inasistencias injustificadas (según Art. ${params.modalidades.includes('teletrabajo') ? '18' : '17'})\ni) Abandono de trabajo sin causa justificada\nj) Actos de violencia, grave indisciplina o faltas contra la moral${
        params.faltasGravesAdicionales && params.faltasGravesAdicionales.length > 0
          ? `\n\n**Faltas graves adicionales propias de la Empresa:**\n${params.faltasGravesAdicionales.map((f, i) => `${String.fromCharCode(107 + i)}) ${f}`).join('\n')}`
          : ''
      }\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '30' : '29'}.** Sanciones aplicables.\n\nSegún la gravedad:\n\n1. **Amonestación verbal** (registrada en el file).\n2. **Amonestación escrita**.\n3. **Suspensión sin goce de haber** (hasta 3 días por falta leve, hasta 30 días por falta grave).\n4. **Despido con causa justa** (faltas graves comprobadas, Art. 25 D.Leg. 728).${params.sancionesAdicionales && params.sancionesAdicionales.length > 0 ? `\n\n**Sanciones adicionales:** ${params.sancionesAdicionales.join(', ')}.` : ''}\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '31' : '30'}.** Procedimiento disciplinario.\n\n1. Se comunica al trabajador la imputación por escrito.\n2. El trabajador tiene **6 días naturales** para presentar sus descargos por escrito (Art. 31 D.S. 003-97-TR).\n3. El empleador evalúa los descargos y resuelve en plazo razonable.\n4. La sanción debe ser razonable, proporcional y debe respetar el principio de inmediatez.\n5. Se notifica la sanción por escrito.`,
      baseLegal: 'D.Leg. 728, Art. 25-31 · D.S. 003-97-TR, Art. 16-34',
    },
    {
      id: 'capitulo-9',
      numbering: 'CAPÍTULO IX',
      title: 'Prevención del Hostigamiento Sexual',
      content: `**Art. ${params.modalidades.includes('teletrabajo') ? '32' : '31'}.** Tolerancia cero.\n\nLa Empresa aplica una política de **tolerancia cero** al hostigamiento sexual, conforme a la Ley 27942 y su reglamento D.S. 014-2019-MIMP. Toda conducta de hostigamiento sexual, en sus dos modalidades (chantaje sexual o ambiente hostil), constituye **falta grave** que puede motivar el despido sin indemnización.\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '33' : '32'}.** Canal de denuncia.\n\nLa Empresa mantiene un canal confidencial de denuncias. Las denuncias pueden presentarse al Comité de Intervención contra el Hostigamiento Sexual (CIHSO), cuya composición y procedimiento están detallados en la **Política contra el Hostigamiento Sexual** (documento separado, obligatorio).\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '34' : '33'}.** Protección al denunciante.\n\nSe prohíben represalias contra denunciantes de buena fe, testigos o quien participe en una investigación. Toda represalia constituye falta grave adicional.\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '35' : '34'}.** Medidas de protección.\n\nDentro de las 72 horas de recibida la denuncia, el CIHSO aplicará medidas de protección a favor de la víctima (rotación, suspensión del denunciado, teletrabajo, etc.).`,
      baseLegal: 'Ley 27942 · D.S. 014-2019-MIMP',
    },
    {
      id: 'capitulo-10',
      numbering: 'CAPÍTULO X',
      title: 'Terminación del Vínculo Laboral',
      content: `**Art. ${params.modalidades.includes('teletrabajo') ? '36' : '35'}.** Causales de extinción.\n\nLa relación laboral se extingue por:\n\na) Fallecimiento del trabajador o del empleador.\nb) Renuncia voluntaria (con preaviso de 30 días salvo exoneración).\nc) Mutuo acuerdo entre las partes.\nd) Invalidez absoluta y permanente.\ne) Jubilación.\nf) Despido por causa justa:\n    - Capacidad: rendimiento deficiente, negativa injustificada a exámenes médicos.\n    - Conducta: comisión de falta grave (Art. 25 D.Leg. 728).\ng) Terminación del contrato en caso de contratos a plazo fijo o modales.\nh) Cese colectivo (Art. 46-52 D.Leg. 728).\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '37' : '36'}.** Liquidación de beneficios sociales.\n\nAl cese, la Empresa pagará la **liquidación de beneficios sociales dentro de las 48 horas** (Art. 3 D.S. 001-97-TR), incluyendo: CTS trunca, vacaciones truncas, gratificación trunca, indemnización por despido arbitrario si corresponde (Art. 38 D.S. 003-97-TR).\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '38' : '37'}.** Certificado de trabajo.\n\nSe entregará al trabajador cesado el **certificado de trabajo** (constancia) con información objetiva: fecha de ingreso y cese, cargo(s), remuneración, motivos del cese.\n\n**Art. ${params.modalidades.includes('teletrabajo') ? '39' : '38'}.** Baja en T-REGISTRO.\n\nLa Empresa comunicará la baja del trabajador en T-REGISTRO dentro de las 24 horas del cese.`,
      baseLegal: 'D.Leg. 728, Art. 16-52 · D.S. 003-97-TR · D.S. 001-97-TR',
    },
    {
      id: 'disposiciones-finales',
      numbering: 'DISPOSICIONES FINALES',
      title: 'Disposiciones Finales',
      content: `**Primera.** El presente RIT tiene vigencia indefinida a partir del **${fechaLegible}**. Cualquier modificación será aprobada por la Empresa, comunicada a los trabajadores por ${params.canalComunicaciones} y presentada ante el MTPE conforme al Art. 4 D.S. 039-91-TR.\n\n**Segunda.** Copia del RIT se entregará a cada trabajador al momento de su ingreso y a los trabajadores actuales dentro de los 5 días de su aprobación. Se publicará además en ${params.canalComunicaciones} y se exhibirá en lugares visibles del centro de trabajo.\n\n**Tercera.** Lo no previsto en este RIT se rige por la normativa laboral vigente, los contratos individuales de trabajo, los convenios colectivos y las políticas específicas de la Empresa (SST, Hostigamiento Sexual, Igualdad Salarial, etc.).\n\n**Cuarta.** El presente RIT ha sido aprobado por **${org.representanteLegal ?? '[Representante Legal]'}** en su calidad de ${org.cargoRepresentante ?? 'Representante Legal'} de **${org.razonSocial}**.\n\n---\n\n_____________________________________\n**${org.representanteLegal ?? '[Representante Legal]'}**\n${org.cargoRepresentante ?? 'Gerente General / Representante Legal'}\n${org.razonSocial} · RUC ${org.ruc}\n${fechaLegible}`,
      baseLegal: 'D.S. 039-91-TR, Art. 4-5',
    },
  ]

  const markdown = buildMarkdown(org, fechaLegible, sections)

  return {
    type: 'reglamento-interno',
    title: `Reglamento Interno de Trabajo — ${org.razonSocial}`,
    markdown,
    sections,
    legalBasis: [
      'D.S. 039-91-TR — Reglamento Interno de Trabajo',
      'D.Leg. 728 + D.S. 003-97-TR — TUO LPCL',
      'Ley 29783 + D.S. 005-2012-TR — SST',
      'Ley 27942 + D.S. 014-2019-MIMP — Hostigamiento sexual',
      'Ley 30709 + D.S. 002-2018-TR — Igualdad salarial',
      'D.S. 001-98-TR — Boletas de pago',
      'D.S. 004-2006-TR — Control de asistencia',
      'Ley 31572 — Teletrabajo (si aplica)',
    ],
    metadata: {
      fechaAprobacion: params.fechaAprobacion,
      vigenciaAnos: 5, // revisión recomendada cada 5 años o ante cambio normativo
      regimen: params.regimen,
      totalCapitulos: 10,
      modalidades: params.modalidades,
    },
  }
}

/* ── Helpers ───────────────────────────────────────────────────── */

function buildBeneficiosPorRegimen(r: RegimenAplicable): string {
  if (r === 'MYPE_MICRO') {
    return `- **RMV**: S/ 1,130 (o proporcional si trabaja menos de 4h/día).\n- **Vacaciones**: 15 días calendario al año.\n- **SIS o EsSalud**: cobertura de salud conforme al régimen MYPE.\n- **Indemnización por despido arbitrario**: 10 remuneraciones diarias por año de servicio (tope 90 rem. diarias).\n- **Sin CTS ni gratificaciones** (Ley 32353).`
  }
  if (r === 'MYPE_PEQUENA') {
    return `- **RMV**: S/ 1,130.\n- **Vacaciones**: 15 días calendario al año.\n- **CTS**: medio sueldo al año (15 rem. diarias por año).\n- **Gratificaciones**: medio sueldo en julio y diciembre.\n- **EsSalud**: cobertura regular.\n- **Indemnización por despido arbitrario**: 20 remuneraciones diarias por año (tope 120 rem. diarias).`
  }
  return `- **RMV**: S/ 1,130 (o superior según categoría).\n- **Vacaciones**: 30 días calendario al año tras completar 1 año de servicio.\n- **CTS**: depósitos semestrales en mayo y noviembre (D.S. 001-97-TR).\n- **Gratificaciones**: equivalente a una remuneración mensual en julio y diciembre + bonificación extraordinaria del 9% (Ley 30334).\n- **Asignación familiar**: 10% de la RMV por hijos menores o estudiantes (Ley 25129).\n- **Utilidades**: si la Empresa genera renta de tercera categoría y tiene 20+ trabajadores (D.Leg. 892).\n- **EsSalud**: 9% a cargo del empleador.\n- **Seguro Vida Ley**: obligatorio desde 4 años de servicio (D.Leg. 688).\n- **Indemnización por despido arbitrario**: 1.5 sueldos por año de servicio, tope 12 sueldos (Art. 38 D.S. 003-97-TR).`
}

function buildMarkdown(
  org: GeneratorOrgContext,
  fecha: string,
  sections: GeneratedSection[],
): string {
  const header = `# REGLAMENTO INTERNO DE TRABAJO

**Empresa:** ${org.razonSocial}
**RUC:** ${org.ruc}
**Fecha de aprobación:** ${fecha}
**Base legal:** D.S. 039-91-TR; D.Leg. 728 + D.S. 003-97-TR; Ley 29783; Ley 27942

---

`
  const body = sections
    .map(
      (s) =>
        `## ${s.numbering} — ${s.title}\n\n${s.content}${
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
