import type { ComplianceQuestion } from './types'
export { AREAS, getAreaWeight } from './types'
export type { ComplianceQuestion, AreaKey, AnswerValue, AreaDefinition } from './types'

// =============================================
// AREA 1: CONTRATOS Y REGISTRO (15 preguntas)
// =============================================
const contratosRegistro: ComplianceQuestion[] = [
  { id: 'CR-01', area: 'contratos_registro', text: 'Todos los trabajadores cuentan con contrato de trabajo escrito y firmado?', baseLegal: 'D.Leg. 728, Art. 4', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: true },
  { id: 'CR-02', area: 'contratos_registro', text: 'Los contratos sujetos a modalidad (plazo fijo) han sido registrados ante el MTPE dentro de los 15 dias de celebrados?', baseLegal: 'D.S. 003-97-TR, Art. 73', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'CR-03', area: 'contratos_registro', text: 'Los contratos de trabajo consignan la causa objetiva de contratacion temporal?', baseLegal: 'D.S. 003-97-TR, Art. 72', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: true },
  { id: 'CR-04', area: 'contratos_registro', text: 'Todos los trabajadores estan registrados en T-REGISTRO dentro del dia habil de inicio de labores?', baseLegal: 'D.S. 018-2007-TR, Art. 4-A', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true },
  { id: 'CR-05', area: 'contratos_registro', text: 'Los datos en T-REGISTRO (regimen, tipo contrato, remuneracion) estan actualizados?', baseLegal: 'D.S. 018-2007-TR', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'CR-06', area: 'contratos_registro', text: 'Los contratos de tiempo parcial (< 4 horas) constan por escrito y estan registrados?', baseLegal: 'D.S. 003-97-TR, Art. 4', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'CR-07', area: 'contratos_registro', text: 'Se ha entregado copia del contrato de trabajo al trabajador?', baseLegal: 'D.Leg. 728, Art. 4', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'CR-08', area: 'contratos_registro', text: 'Los practicantes pre-profesionales y profesionales tienen convenio escrito registrado?', baseLegal: 'Ley 28518, Art. 46', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'CR-09', area: 'contratos_registro', text: 'No se excede el limite de 20% de practicantes respecto al total de trabajadores?', baseLegal: 'Ley 28518, Art. 17', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'CR-10', area: 'contratos_registro', text: 'Los trabajadores de direccion y confianza estan debidamente calificados y registrados?', baseLegal: 'D.S. 003-97-TR, Art. 43-44', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 2, express: false },
  { id: 'CR-11', area: 'contratos_registro', text: 'Los contratos modales no exceden el plazo maximo legal (5 anios)?', baseLegal: 'D.S. 003-97-TR, Art. 74', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true },
  { id: 'CR-12', area: 'contratos_registro', text: 'Se ha comunicado la baja en T-REGISTRO dentro de las 24 horas del cese?', baseLegal: 'D.S. 018-2007-TR', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 2, express: false },
  { id: 'CR-13', area: 'contratos_registro', text: 'Los contratos de trabajadores extranjeros cumplen con el limite del 20% y aprobacion de MTPE?', baseLegal: 'D.Leg. 689, Art. 4', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  { id: 'CR-14', area: 'contratos_registro', text: 'Se mantiene un registro actualizado de todos los contratos vigentes con fechas de vencimiento?', baseLegal: 'D.S. 003-97-TR', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 2, express: false },
  { id: 'CR-15', area: 'contratos_registro', text: 'Los trabajadores de regimen MYPE estan registrados en REMYPE vigente?', baseLegal: 'Ley 32353, Art. 7', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false, condition: { field: 'regimenPrincipal', operator: 'eq', value: 'MYPE_MICRO' } },
]

// =============================================
// AREA 2: REMUNERACIONES Y BENEFICIOS (20 preguntas)
// =============================================
const remuneracionesBeneficios: ComplianceQuestion[] = [
  { id: 'RB-01', area: 'remuneraciones_beneficios', text: 'Se paga al menos la Remuneracion Minima Vital (S/ 1,130) a todos los trabajadores a tiempo completo?', baseLegal: 'D.S. 003-97-TR, Art. 24', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true },
  { id: 'RB-02', area: 'remuneraciones_beneficios', text: 'Se deposita la CTS en las entidades financieras dentro del plazo (15 mayo / 15 noviembre)?', baseLegal: 'D.S. 001-97-TR, Art. 21-22', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: true },
  { id: 'RB-03', area: 'remuneraciones_beneficios', text: 'Se paga la gratificacion completa en julio y diciembre (o proporcional)?', baseLegal: 'Ley 27735, Art. 2-3', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: true },
  { id: 'RB-04', area: 'remuneraciones_beneficios', text: 'Se otorga la bonificacion extraordinaria del 9% sobre la gratificacion (Ley 30334)?', baseLegal: 'Ley 30334, Art. 3', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: true },
  { id: 'RB-05', area: 'remuneraciones_beneficios', text: 'Se otorgan vacaciones de 30 dias calendario por cada anio completo de servicio?', baseLegal: 'D.Leg. 713, Art. 10', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: true },
  { id: 'RB-06', area: 'remuneraciones_beneficios', text: 'Se paga la asignacion familiar (10% RMV) a los trabajadores con hijos menores o estudiantes?', baseLegal: 'Ley 25129, Art. 2', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'RB-07', area: 'remuneraciones_beneficios', text: 'Los aportes a AFP/ONP se pagan dentro de los primeros 5 dias del mes siguiente?', baseLegal: 'D.S. 054-97-EF, Art. 34', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true },
  { id: 'RB-08', area: 'remuneraciones_beneficios', text: 'Se paga EsSalud (9%) sobre la remuneracion de todos los trabajadores?', baseLegal: 'Ley 26790, Art. 6', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true },
  { id: 'RB-09', area: 'remuneraciones_beneficios', text: 'Las horas extras se pagan con la sobretasa legal (25% primeras 2 horas, 35% siguientes)?', baseLegal: 'D.S. 007-2002-TR, Art. 10', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'RB-10', area: 'remuneraciones_beneficios', text: 'Se emite boleta de pago con todos los conceptos remunerativos y descuentos detallados?', baseLegal: 'D.S. 001-98-TR, Art. 18-19', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: true },
  { id: 'RB-11', area: 'remuneraciones_beneficios', text: 'Se entrega la boleta de pago al trabajador dentro de los 3 dias habiles de efectuado el pago?', baseLegal: 'D.S. 001-98-TR, Art. 18', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'RB-12', area: 'remuneraciones_beneficios', text: 'Se ha entregado la liquidacion de CTS al trabajador dentro de los 5 dias habiles del deposito?', baseLegal: 'D.S. 001-97-TR, Art. 29', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 2, express: false },
  { id: 'RB-13', area: 'remuneraciones_beneficios', text: 'La participacion en utilidades se ha pagado dentro de los 30 dias de vencido el plazo para la DJ anual?', baseLegal: 'D.Leg. 892, Art. 6', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false, condition: { field: 'totalWorkers', operator: 'gte', value: 20 } },
  { id: 'RB-14', area: 'remuneraciones_beneficios', text: 'Se mantiene la planilla electronica actualizada en PLAME mensualmente?', baseLegal: 'D.S. 018-2007-TR', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'RB-15', area: 'remuneraciones_beneficios', text: 'Se ha pagado la indemnizacion vacacional cuando el trabajador no gozo vacaciones en el periodo?', baseLegal: 'D.Leg. 713, Art. 23', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'RB-16', area: 'remuneraciones_beneficios', text: 'Los trabajadores MYPE reciben los beneficios reducidos correspondientes a su regimen?', baseLegal: 'Ley 32353', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false, condition: { field: 'regimenPrincipal', operator: 'eq', value: 'MYPE_MICRO' } },
  { id: 'RB-17', area: 'remuneraciones_beneficios', text: 'Se realiza el calculo correcto de la CTS considerando remuneracion computable mas 1/6 de gratificacion?', baseLegal: 'D.S. 001-97-TR, Art. 9-10', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'RB-18', area: 'remuneraciones_beneficios', text: 'No se retiene mas del 60% de la remuneracion por conceptos judiciales o descuentos autorizados?', baseLegal: 'D.S. 003-97-TR', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'RB-19', area: 'remuneraciones_beneficios', text: 'Se ha pagado la liquidacion de beneficios sociales dentro de las 48 horas del cese?', baseLegal: 'D.S. 001-97-TR, Art. 3', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'RB-20', area: 'remuneraciones_beneficios', text: 'Los trabajadores de construccion civil reciben la bonificacion unificada (BUC) correspondiente?', baseLegal: 'R.M. varios - sector construccion', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false, condition: { field: 'regimenPrincipal', operator: 'eq', value: 'CONSTRUCCION_CIVIL' } },
]

// =============================================
// AREA 3: JORNADA Y DESCANSOS (15 preguntas)
// =============================================
const jornadaDescansos: ComplianceQuestion[] = [
  { id: 'JD-01', area: 'jornada_descansos', text: 'Se respeta la jornada maxima de 8 horas diarias o 48 horas semanales?', baseLegal: 'D.S. 007-2002-TR, Art. 1', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true },
  { id: 'JD-02', area: 'jornada_descansos', text: 'Se cuenta con un registro de control de asistencia (manual, mecanico o digital)?', baseLegal: 'D.S. 004-2006-TR, Art. 1', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: true },
  { id: 'JD-03', area: 'jornada_descansos', text: 'El registro de asistencia consigna hora de ingreso y salida?', baseLegal: 'D.S. 004-2006-TR, Art. 2', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'JD-04', area: 'jornada_descansos', text: 'Se otorga un minimo de 45 minutos de refrigerio en jornadas de 4+ horas?', baseLegal: 'D.S. 007-2002-TR, Art. 7', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'JD-05', area: 'jornada_descansos', text: 'Se otorga el descanso semanal obligatorio de 24 horas consecutivas?', baseLegal: 'D.Leg. 713, Art. 1', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: true },
  { id: 'JD-06', area: 'jornada_descansos', text: 'Se compensan adecuadamente los feriados trabajados (sobretasa 100%)?', baseLegal: 'D.Leg. 713, Art. 9', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'JD-07', area: 'jornada_descansos', text: 'Las horas extras son voluntarias y no superan el limite razonable?', baseLegal: 'D.S. 007-2002-TR, Art. 9', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  { id: 'JD-08', area: 'jornada_descansos', text: 'Se exhibe el horario de trabajo en lugar visible del centro de labores?', baseLegal: 'D.S. 004-2006-TR, Art. 5', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 2, express: false },
  { id: 'JD-09', area: 'jornada_descansos', text: 'El trabajo nocturno (10pm - 6am) se remunera con sobretasa minima del 35%?', baseLegal: 'D.S. 007-2002-TR, Art. 8', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'JD-10', area: 'jornada_descansos', text: 'Se programa el goce vacacional con anticipacion y se registra formalmente?', baseLegal: 'D.Leg. 713, Art. 14', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'JD-11', area: 'jornada_descansos', text: 'No hay acumulacion de mas de 2 periodos vacacionales pendientes?', baseLegal: 'D.Leg. 713, Art. 23', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: true },
  { id: 'JD-12', area: 'jornada_descansos', text: 'Se respeta la licencia por paternidad de 10 dias calendario?', baseLegal: 'Ley 29409, Art. 2', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'JD-13', area: 'jornada_descansos', text: 'Se otorga la licencia pre y post natal de 49 dias cada una a las trabajadoras gestantes?', baseLegal: 'Ley 26644, Art. 1', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: false },
  { id: 'JD-14', area: 'jornada_descansos', text: 'Se otorga la hora de lactancia materna durante el primer anio del hijo?', baseLegal: 'Ley 27240, Art. 1', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'JD-15', area: 'jornada_descansos', text: 'Los teletrabajadores tienen derecho a desconexion digital fuera de su jornada?', baseLegal: 'Ley 31572, Art. 8', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false, condition: { field: 'regimenPrincipal', operator: 'eq', value: 'TELETRABAJO' } },
]

// =============================================
// AREA 4: SEGURIDAD Y SALUD EN EL TRABAJO (25 preguntas)
// =============================================
const sst: ComplianceQuestion[] = [
  { id: 'SST-01', area: 'sst', text: 'La empresa cuenta con una Politica de Seguridad y Salud en el Trabajo escrita y exhibida?', baseLegal: 'Ley 29783, Art. 22', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: true },
  { id: 'SST-02', area: 'sst', text: 'Se ha elaborado el Reglamento Interno de SST (obligatorio para 20+ trabajadores)?', baseLegal: 'Ley 29783, Art. 34', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: true, condition: { field: 'totalWorkers', operator: 'gte', value: 20 } },
  { id: 'SST-03', area: 'sst', text: 'Se ha conformado el Comite de SST (20+ trabajadores) o designado Supervisor SST (< 20)?', baseLegal: 'Ley 29783, Art. 29-30', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: true },
  { id: 'SST-04', area: 'sst', text: 'Se ha elaborado la matriz IPERC (Identificacion de Peligros, Evaluacion de Riesgos y Control)?', baseLegal: 'Ley 29783, Art. 57; R.M. 050-2013-TR', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true },
  { id: 'SST-05', area: 'sst', text: 'Se cuenta con un Plan Anual de SST aprobado por el Comite/Supervisor?', baseLegal: 'Ley 29783, Art. 38', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: true },
  { id: 'SST-06', area: 'sst', text: 'Se realizan al menos 4 capacitaciones anuales en SST?', baseLegal: 'Ley 29783, Art. 35', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: true },
  { id: 'SST-07', area: 'sst', text: 'Se practican examenes medicos ocupacionales de ingreso, periodicos y de retiro?', baseLegal: 'Ley 29783, Art. 49-d; D.S. 005-2012-TR, Art. 101', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true },
  { id: 'SST-08', area: 'sst', text: 'Se entregan los Equipos de Proteccion Personal (EPP) adecuados y se registra su entrega?', baseLegal: 'Ley 29783, Art. 60', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'SST-09', area: 'sst', text: 'Se cuenta con un Mapa de Riesgos actualizado y exhibido en areas visibles?', baseLegal: 'D.S. 005-2012-TR, Art. 35-e', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'SST-10', area: 'sst', text: 'Se lleva el registro de accidentes de trabajo, enfermedades ocupacionales e incidentes?', baseLegal: 'Ley 29783, Art. 28; R.M. 050-2013-TR', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'SST-11', area: 'sst', text: 'Los accidentes mortales y peligrosos se notifican al MTPE dentro de las 24 horas?', baseLegal: 'Ley 29783, Art. 82', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: false },
  { id: 'SST-12', area: 'sst', text: 'Se realiza la induccion en SST a todos los nuevos trabajadores?', baseLegal: 'Ley 29783, Art. 49-g', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'SST-13', area: 'sst', text: 'Se cuenta con SCTR (Seguro Complementario de Trabajo de Riesgo) para actividades de riesgo?', baseLegal: 'Ley 26790, Art. 19; D.S. 003-98-SA', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: false },
  { id: 'SST-14', area: 'sst', text: 'Las actas del Comite de SST se llevan al dia con reuniones mensuales?', baseLegal: 'D.S. 005-2012-TR, Art. 68', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'SST-15', area: 'sst', text: 'Se ha implementado un sistema de respuesta ante emergencias (primeros auxilios, evacuacion, incendio)?', baseLegal: 'Ley 29783, Art. 83', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'SST-16', area: 'sst', text: 'Los baños, vestuarios y comedores cumplen con condiciones de higiene adecuadas?', baseLegal: 'D.S. 42-F, Art. 36-57', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 2, express: false },
  { id: 'SST-17', area: 'sst', text: 'Se monitorean los agentes fisicos, quimicos y biologicos en el ambiente de trabajo?', baseLegal: 'Ley 29783, Art. 56; D.S. 005-2012-TR, Art. 103', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'SST-18', area: 'sst', text: 'Los trabajadores participan en la eleccion de representantes del Comite de SST?', baseLegal: 'Ley 29783, Art. 29', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'SST-19', area: 'sst', text: 'Se cuenta con botiquin de primeros auxilios implementado y vigente?', baseLegal: 'D.S. 005-2012-TR, Art. 74-e', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 2, express: false },
  { id: 'SST-20', area: 'sst', text: 'Se realizan simulacros de evacuacion al menos 2 veces al anio?', baseLegal: 'Ley 28551; INDECI', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'SST-21', area: 'sst', text: 'Se ha implementado el programa de prevencion de riesgos psicosociales?', baseLegal: 'R.M. 375-2008-TR', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'SST-22', area: 'sst', text: 'Se lleva un registro de las capacitaciones SST con firma de los trabajadores asistentes?', baseLegal: 'D.S. 005-2012-TR, Art. 33', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'SST-23', area: 'sst', text: 'La senalizacion de seguridad esta correctamente implementada en todas las areas?', baseLegal: 'NTP 399.010-1', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 2, express: false },
  { id: 'SST-24', area: 'sst', text: 'Se cuenta con un programa de ergonomia para puestos con riesgo disergonomico?', baseLegal: 'R.M. 375-2008-TR', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'SST-25', area: 'sst', text: 'Se mantiene actualizada la documentacion del Sistema de Gestion de SST?', baseLegal: 'Ley 29783, Art. 28', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
]

// =============================================
// AREA 5: DOCUMENTOS OBLIGATORIOS (15 preguntas)
// =============================================
const documentosObligatorios: ComplianceQuestion[] = [
  { id: 'DO-01', area: 'documentos_obligatorios', text: 'Se mantiene la planilla electronica de pago actualizada y archivada?', baseLegal: 'D.S. 018-2007-TR', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: true },
  { id: 'DO-02', area: 'documentos_obligatorios', text: 'Se emiten y conservan las boletas de pago de todos los trabajadores?', baseLegal: 'D.S. 001-98-TR, Art. 18', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 4, express: true },
  { id: 'DO-03', area: 'documentos_obligatorios', text: 'Se conserva copia de los contratos de trabajo por al menos 5 anios despues del cese?', baseLegal: 'D.S. 003-97-TR', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'DO-04', area: 'documentos_obligatorios', text: 'Se cuenta con el Reglamento Interno de Trabajo (obligatorio para 100+ trabajadores)?', baseLegal: 'D.S. 039-91-TR, Art. 2', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false, condition: { field: 'totalWorkers', operator: 'gte', value: 100 } },
  { id: 'DO-05', area: 'documentos_obligatorios', text: 'Se mantiene un legajo personal por cada trabajador con documentos basicos completos?', baseLegal: 'D.S. 001-98-TR', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 4, express: true },
  { id: 'DO-06', area: 'documentos_obligatorios', text: 'Se conservan los registros de vacaciones gozadas y truncas de cada trabajador?', baseLegal: 'D.Leg. 713, Art. 14', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'DO-07', area: 'documentos_obligatorios', text: 'Se archivan las constancias de deposito de CTS entregadas a cada trabajador?', baseLegal: 'D.S. 001-97-TR, Art. 29', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'DO-08', area: 'documentos_obligatorios', text: 'Se exhibe la sintesis de la legislacion laboral en lugar visible?', baseLegal: 'D.S. 001-98-TR, Art. 48', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 1, express: false },
  { id: 'DO-09', area: 'documentos_obligatorios', text: 'Se cuenta con el registro de control de asistencia disponible para inspeccion?', baseLegal: 'D.S. 004-2006-TR', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'DO-10', area: 'documentos_obligatorios', text: 'Se mantiene actualizado el cuadro de categorias y funciones (igualdad salarial)?', baseLegal: 'Ley 30709, Art. 2; D.S. 002-2018-TR', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'DO-11', area: 'documentos_obligatorios', text: 'Se conservan los certificados de capacitacion SST con la firma del trabajador?', baseLegal: 'Ley 29783, Art. 35', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'DO-12', area: 'documentos_obligatorios', text: 'Se cuenta con la constancia de SCTR vigente para las actividades de riesgo?', baseLegal: 'Ley 26790, Art. 19', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  { id: 'DO-13', area: 'documentos_obligatorios', text: 'Se tiene la póliza de seguro vida ley para trabajadores con 4+ anios de servicios?', baseLegal: 'D.Leg. 688, Art. 1', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'DO-14', area: 'documentos_obligatorios', text: 'Se exhibe la politica contra el hostigamiento sexual en lugar visible?', baseLegal: 'D.S. 014-2019-MIMP, Art. 5', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: true },
  { id: 'DO-15', area: 'documentos_obligatorios', text: 'Se conservan los documentos de liquidacion de beneficios sociales al cese?', baseLegal: 'D.S. 003-97-TR', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
]

// =============================================
// AREA 6: RELACIONES LABORALES (10 preguntas)
// =============================================
const relacionesLaborales: ComplianceQuestion[] = [
  { id: 'RL-01', area: 'relaciones_laborales', text: 'Se respeta el derecho de sindicalizacion de los trabajadores?', baseLegal: 'D.S. 010-2003-TR, Art. 2', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true },
  { id: 'RL-02', area: 'relaciones_laborales', text: 'Se cumple con el procedimiento de despido (pre-aviso de 6 dias y carta de despido)?', baseLegal: 'D.S. 003-97-TR, Art. 31-32', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: false },
  { id: 'RL-03', area: 'relaciones_laborales', text: 'Las sanciones disciplinarias siguen un procedimiento gradual (amonestacion, suspension, despido)?', baseLegal: 'D.S. 003-97-TR, Art. 33', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'RL-04', area: 'relaciones_laborales', text: 'Se respeta la estabilidad laboral de los dirigentes sindicales (fuero sindical)?', baseLegal: 'D.S. 010-2003-TR, Art. 30-31', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  { id: 'RL-05', area: 'relaciones_laborales', text: 'Se cumple con el convenio colectivo vigente (si existe)?', baseLegal: 'D.S. 010-2003-TR, Art. 42', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  { id: 'RL-06', area: 'relaciones_laborales', text: 'Los ceses colectivos se tramitan con aprobacion del MTPE y pago de beneficios?', baseLegal: 'D.S. 003-97-TR, Art. 46-52', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  { id: 'RL-07', area: 'relaciones_laborales', text: 'Se paga la indemnizacion por despido arbitrario conforme a ley?', baseLegal: 'D.S. 003-97-TR, Art. 38', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: false },
  { id: 'RL-08', area: 'relaciones_laborales', text: 'Se entregan los certificados de trabajo dentro de las 48 horas del cese?', baseLegal: 'D.S. 001-96-TR, Art. 1', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'RL-09', area: 'relaciones_laborales', text: 'No se realizan actos de hostilidad que constituyan despido indirecto?', baseLegal: 'D.S. 003-97-TR, Art. 30', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  { id: 'RL-10', area: 'relaciones_laborales', text: 'Se permite el ejercicio del derecho de huelga conforme a las normas vigentes?', baseLegal: 'D.S. 010-2003-TR, Art. 72-73', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 3, express: false },
]

// =============================================
// AREA 7: IGUALDAD Y NO DISCRIMINACION (10 preguntas)
// =============================================
const igualdadNoDiscriminacion: ComplianceQuestion[] = [
  { id: 'IN-01', area: 'igualdad_nodiscriminacion', text: 'Se cuenta con una politica de igualdad salarial y cuadro de categorias y funciones?', baseLegal: 'Ley 30709, Art. 2; D.S. 002-2018-TR', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: true },
  { id: 'IN-02', area: 'igualdad_nodiscriminacion', text: 'No existen diferencias salariales basadas en genero para funciones equivalentes?', baseLegal: 'Ley 30709, Art. 1', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true },
  { id: 'IN-03', area: 'igualdad_nodiscriminacion', text: 'Se ha implementado la politica contra el hostigamiento sexual con comite y procedimiento?', baseLegal: 'Ley 27942; D.S. 014-2019-MIMP', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true },
  { id: 'IN-04', area: 'igualdad_nodiscriminacion', text: 'Los procesos de seleccion no incluyen requisitos discriminatorios (edad, genero, estado civil)?', baseLegal: 'Ley 26772, Art. 1', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  { id: 'IN-05', area: 'igualdad_nodiscriminacion', text: 'Se respeta la cuota de empleo del 3% para personas con discapacidad (50+ trabajadores)?', baseLegal: 'Ley 29973, Art. 49', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false, condition: { field: 'totalWorkers', operator: 'gte', value: 50 } },
  { id: 'IN-06', area: 'igualdad_nodiscriminacion', text: 'Se cuenta con un canal de denuncias accesible para casos de hostigamiento?', baseLegal: 'Ley 27942, Art. 7-A', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'IN-07', area: 'igualdad_nodiscriminacion', text: 'Se realizan capacitaciones anuales sobre prevencion de hostigamiento sexual?', baseLegal: 'D.S. 014-2019-MIMP, Art. 6', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'IN-08', area: 'igualdad_nodiscriminacion', text: 'No se exige prueba de embarazo como requisito para contratacion o permanencia?', baseLegal: 'Ley 26644, Art. 5', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: false },
  { id: 'IN-09', area: 'igualdad_nodiscriminacion', text: 'Se protege a los denunciantes de hostigamiento contra represalias?', baseLegal: 'Ley 27942, Art. 8', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'IN-10', area: 'igualdad_nodiscriminacion', text: 'Se difunde la politica de no discriminacion entre todos los trabajadores?', baseLegal: 'D.S. 002-2018-TR, Art. 3', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 2, express: false },
]

// =============================================
// AREA 8: TRABAJADORES ESPECIALES (10 preguntas)
// =============================================
const trabajadoresEspeciales: ComplianceQuestion[] = [
  { id: 'TE-01', area: 'trabajadores_especiales', text: 'Las trabajadoras gestantes no realizan labores que pongan en riesgo su salud o del feto?', baseLegal: 'Ley 28048, Art. 1', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true },
  { id: 'TE-02', area: 'trabajadores_especiales', text: 'Se cuenta con un lactario implementado (20+ trabajadoras en edad fertil)?', baseLegal: 'Ley 29896, Art. 1', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false, condition: { field: 'totalWorkers', operator: 'gte', value: 20 } },
  { id: 'TE-03', area: 'trabajadores_especiales', text: 'Los menores de edad (14-17 anios) cuentan con autorizacion y jornada reducida?', baseLegal: 'Codigo de Ninos y Adolescentes, Art. 51-68', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: false },
  { id: 'TE-04', area: 'trabajadores_especiales', text: 'Los trabajadores con discapacidad cuentan con ajustes razonables en su puesto?', baseLegal: 'Ley 29973, Art. 50', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'TE-05', area: 'trabajadores_especiales', text: 'Los trabajadores extranjeros cuentan con contrato aprobado por MTPE y situacion migratoria regular?', baseLegal: 'D.Leg. 689, Art. 2-4', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  { id: 'TE-06', area: 'trabajadores_especiales', text: 'Los trabajadores del hogar gozan de todos los derechos laborales establecidos por ley?', baseLegal: 'Ley 27986, Art. 1-18', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false, condition: { field: 'regimenPrincipal', operator: 'eq', value: 'DOMESTICO' } },
  { id: 'TE-07', area: 'trabajadores_especiales', text: 'Los trabajadores nocturnos reciben la sobretasa y no exceden la jornada maxima nocturna?', baseLegal: 'D.S. 007-2002-TR, Art. 8', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'TE-08', area: 'trabajadores_especiales', text: 'Se protege la estabilidad laboral de los trabajadores con VIH/SIDA?', baseLegal: 'Ley 26626, Art. 6', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  { id: 'TE-09', area: 'trabajadores_especiales', text: 'Los trabajadores de construccion civil reciben los beneficios especiales del regimen?', baseLegal: 'D.Leg. 727; R.M. sector construccion', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false, condition: { field: 'regimenPrincipal', operator: 'eq', value: 'CONSTRUCCION_CIVIL' } },
  { id: 'TE-10', area: 'trabajadores_especiales', text: 'Los trabajadores en modalidad formativa reciben la subvencion economica y seguro medico?', baseLegal: 'Ley 28518, Art. 42-47', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false, condition: { field: 'regimenPrincipal', operator: 'eq', value: 'MODALIDAD_FORMATIVA' } },
]

// =============================================
// AREA 9: TERCERIZACION E INTERMEDIACION LABORAL (8 preguntas)
// Ley 29245 (tercerización) + Ley 27626 (intermediación)
// =============================================
const tercerizacionIntermediacion: ComplianceQuestion[] = [
  {
    id: 'TI-01',
    area: 'tercerizacion_intermediacion',
    text: 'Las empresas tercerizadoras contratadas cuentan con inscripcion vigente en el Registro Nacional de Empresas Tercerizadoras de SUNAFIL?',
    helpText: 'Obligatorio conforme al D.Leg. 1038 y D.S. 006-2008-TR. La falta de registro convierte la tercerización en desnaturalizada.',
    baseLegal: 'D.Leg. 1038, Art. 5; D.S. 006-2008-TR, Art. 4',
    infraccionGravedad: 'MUY_GRAVE',
    multaUIT: 2.63,
    peso: 5,
    express: true,
    condition: { field: 'tieneTercerización', operator: 'eq', value: 'true' },
  },
  {
    id: 'TI-02',
    area: 'tercerizacion_intermediacion',
    text: 'Los contratos de tercerizacion acreditan los elementos esenciales: autonomia empresarial, pluralidad de clientes, equipos propios y riesgo economico asumido por la tercerizadora?',
    helpText: 'Sin estos elementos la tercerización se desnaturaliza y los trabajadores pasan a ser trabajadores directos de la empresa principal.',
    baseLegal: 'Ley 29245, Art. 2; D.Leg. 1038, Art. 2',
    infraccionGravedad: 'MUY_GRAVE',
    multaUIT: 2.63,
    peso: 5,
    express: false,
    condition: { field: 'tieneTercerización', operator: 'eq', value: 'true' },
  },
  {
    id: 'TI-03',
    area: 'tercerizacion_intermediacion',
    text: 'La empresa principal verifica y exige a la tercerizadora el cumplimiento puntual de sus obligaciones laborales y previsionales con los trabajadores destacados?',
    helpText: 'La empresa principal es solidariamente responsable frente a los trabajadores de la tercerizadora por las obligaciones laborales y previsionales (Art. 9 Ley 29245).',
    baseLegal: 'Ley 29245, Art. 9; D.S. 006-2008-TR, Art. 7',
    infraccionGravedad: 'GRAVE',
    multaUIT: 1.57,
    peso: 4,
    express: false,
    condition: { field: 'tieneTercerización', operator: 'eq', value: 'true' },
  },
  {
    id: 'TI-04',
    area: 'tercerizacion_intermediacion',
    text: 'Las empresas de intermediacion laboral contratadas cuentan con autorizacion y registro vigente expedido por SUNAFIL?',
    helpText: 'La intermediación sin registro es una infracción muy grave. La empresa usuaria también responde solidariamente.',
    baseLegal: 'Ley 27626, Art. 11; D.S. 003-2002-TR, Art. 5',
    infraccionGravedad: 'MUY_GRAVE',
    multaUIT: 2.63,
    peso: 5,
    express: true,
    condition: { field: 'tieneIntermediacion', operator: 'eq', value: 'true' },
  },
  {
    id: 'TI-05',
    area: 'tercerizacion_intermediacion',
    text: 'El numero de trabajadores destacados por intermediacion no supera el 20% del total de trabajadores de la empresa usuaria?',
    helpText: 'Superar el 20% hace que los trabajadores intermediados pasen a la planilla directa de la empresa usuaria (desnaturalización).',
    baseLegal: 'Ley 27626, Art. 3; D.S. 003-2002-TR, Art. 4',
    infraccionGravedad: 'GRAVE',
    multaUIT: 1.57,
    peso: 4,
    express: false,
    condition: { field: 'tieneIntermediacion', operator: 'eq', value: 'true' },
  },
  {
    id: 'TI-06',
    area: 'tercerizacion_intermediacion',
    text: 'Los trabajadores destacados por intermediacion reciben remuneracion y condiciones de trabajo no inferiores a las de los trabajadores directos de la empresa usuaria para funciones equivalentes?',
    helpText: 'Principio de no discriminación remunerativa entre trabajadores propios y destacados. Art. 7 Ley 27626.',
    baseLegal: 'Ley 27626, Art. 7',
    infraccionGravedad: 'GRAVE',
    multaUIT: 1.57,
    peso: 4,
    express: false,
    condition: { field: 'tieneIntermediacion', operator: 'eq', value: 'true' },
  },
  {
    id: 'TI-07',
    area: 'tercerizacion_intermediacion',
    text: 'La intermediacion solo se utiliza para actividades permitidas: temporales, complementarias o especializadas — NO para actividades nucleares o permanentes de la empresa?',
    helpText: 'Usar intermediación para el core business o necesidades permanentes es desnaturalización per se y constituye infracción muy grave.',
    baseLegal: 'Ley 27626, Art. 3; D.S. 003-2002-TR, Art. 3',
    infraccionGravedad: 'MUY_GRAVE',
    multaUIT: 2.63,
    peso: 5,
    express: true,
    condition: { field: 'tieneIntermediacion', operator: 'eq', value: 'true' },
  },
  {
    id: 'TI-08',
    area: 'tercerizacion_intermediacion',
    text: 'Se mantiene un registro actualizado de todos los contratos de tercerizacion e intermediacion vigentes, con datos de la empresa prestadora, numero de trabajadores destacados y plazo?',
    helpText: 'Documento exigible en cualquier inspeccion SUNAFIL. Su ausencia es infraccion leve independientemente del uso o no de tercerización.',
    baseLegal: 'D.S. 006-2008-TR, Art. 8; D.S. 003-2002-TR, Art. 14',
    infraccionGravedad: 'LEVE',
    multaUIT: 0.23,
    peso: 2,
    express: false,
  },
]

// =============================================
// AREA 10: HOSTIGAMIENTO SEXUAL — PROCEDIMIENTO DETALLADO (7 preguntas)
// Ley 27942, D.S. 014-2019-MIMP
// =============================================
const hostigamientoSexualDetallado: ComplianceQuestion[] = [
  {
    id: 'HS-01',
    area: 'hostigamiento_sexual_detallado',
    text: 'La politica de prevencion y sancion del hostigamiento sexual ha sido aprobada por la Gerencia General, publicada en lugar visible y comunicada formalmente a TODOS los trabajadores?',
    helpText: 'D.S. 014-2019-MIMP exige que la política sea conocida por la totalidad del personal, no solo exhibida. La falta de comunicación efectiva es infracción muy grave.',
    baseLegal: 'D.S. 014-2019-MIMP, Art. 4 y 5; Ley 27942, Art. 7-A',
    infraccionGravedad: 'MUY_GRAVE',
    multaUIT: 2.63,
    peso: 5,
    express: true,
  },
  {
    id: 'HS-02',
    area: 'hostigamiento_sexual_detallado',
    text: 'El Comite de Intervencion frente al Hostigamiento Sexual (CIHSO) esta conformado con representacion paritaria (empleador + trabajadores) y sus integrantes han sido debidamente capacitados?',
    helpText: 'Para empresas con 20+ trabajadores. Empresas con menos de 20 deben designar un Gestor de Intervención. La falta de CIHSO es infracción grave.',
    baseLegal: 'D.S. 014-2019-MIMP, Art. 10-11; Ley 27942, Art. 7-A inc. e',
    infraccionGravedad: 'GRAVE',
    multaUIT: 1.57,
    peso: 5,
    express: true,
  },
  {
    id: 'HS-03',
    area: 'hostigamiento_sexual_detallado',
    text: 'El canal de denuncias (fisico y/o virtual) garantiza la confidencialidad absoluta del denunciante y es accesible a todos los trabajadores, incluidos los destacados o tercerizados?',
    helpText: 'La persona hostigada puede denunciar ante el CIHSO, ante el MTPE o ante la Defensoría del Pueblo. La empresa debe facilitar todos estos canales.',
    baseLegal: 'Ley 27942, Art. 7-A; D.S. 014-2019-MIMP, Art. 14',
    infraccionGravedad: 'GRAVE',
    multaUIT: 1.57,
    peso: 4,
    express: false,
  },
  {
    id: 'HS-04',
    area: 'hostigamiento_sexual_detallado',
    text: 'Cuando se recibe una denuncia, se aplican de inmediato las medidas de proteccion al denunciante dentro de los 3 dias habiles (cambio de area, licencia con goce, etc.) SIN esperar resultado de la investigacion?',
    helpText: 'Las medidas de protección son obligatorias e inmediatas, no están sujetas a que se acredite el hostigamiento. Su omisión es una infracción muy grave y expone a la empresa a responsabilidad civil.',
    baseLegal: 'D.S. 014-2019-MIMP, Art. 13; Ley 27942, Art. 12',
    infraccionGravedad: 'MUY_GRAVE',
    multaUIT: 2.63,
    peso: 5,
    express: true,
  },
  {
    id: 'HS-05',
    area: 'hostigamiento_sexual_detallado',
    text: 'Se respetan estrictamente los plazos del procedimiento de investigacion: calificacion y medidas de proteccion (3 dias habiles), investigacion (30 dias habiles) y sancion (10 dias habiles)?',
    helpText: 'El incumplimiento de plazos genera responsabilidad de la empresa. Si la empresa no resuelve en plazo, el trabajador puede acudir al MTPE para resolver.',
    baseLegal: 'D.S. 014-2019-MIMP, Art. 15-18',
    infraccionGravedad: 'GRAVE',
    multaUIT: 1.57,
    peso: 4,
    express: false,
  },
  {
    id: 'HS-06',
    area: 'hostigamiento_sexual_detallado',
    text: 'Se realizan capacitaciones anuales obligatorias sobre prevencion de hostigamiento sexual a TODOS los trabajadores (minimo 1 al anio, en horario laboral y sin descuento de remuneracion)?',
    helpText: 'Art. 6 D.S. 014-2019-MIMP: la capacitación debe incluir a personal directivo y de supervisión. El incumplimiento es infracción grave.',
    baseLegal: 'D.S. 014-2019-MIMP, Art. 6 y 7; Ley 27942, Art. 7-A inc. c',
    infraccionGravedad: 'GRAVE',
    multaUIT: 1.57,
    peso: 4,
    express: false,
  },
  {
    id: 'HS-07',
    area: 'hostigamiento_sexual_detallado',
    text: 'Se elabora y remite al MTPE (o MINEDU si aplica) el informe anual estadistico de casos de hostigamiento sexual, incluso cuando el resultado sea cero casos registrados?',
    helpText: 'Obligatorio para todos los empleadores del sector privado. El informe es anonimizado pero estadísticamente completo. Su omisión es infracción grave.',
    baseLegal: 'D.S. 014-2019-MIMP, Art. 30; R.M. que aprueba formato anual',
    infraccionGravedad: 'GRAVE',
    multaUIT: 1.57,
    peso: 3,
    express: false,
  },
]

// =============================================
// ALL QUESTIONS COMBINED
// =============================================

export const ALL_QUESTIONS: ComplianceQuestion[] = [
  ...contratosRegistro,
  ...remuneracionesBeneficios,
  ...jornadaDescansos,
  ...sst,
  ...documentosObligatorios,
  ...relacionesLaborales,
  ...igualdadNoDiscriminacion,
  ...trabajadoresEspeciales,
  ...tercerizacionIntermediacion,
  ...hostigamientoSexualDetallado,
]

export const EXPRESS_QUESTIONS = ALL_QUESTIONS.filter(q => q.express)
export const FULL_QUESTIONS = ALL_QUESTIONS

export interface DiagnosticContext {
  sizeRange?: string
  regimenPrincipal?: string
  totalWorkers?: number
  /** 'true' / 'false' — empresa contrata servicios tercerizados (Ley 29245) */
  tieneTercerización?: string
  /** 'true' / 'false' — empresa usa intermediacion laboral (Ley 27626) */
  tieneIntermediacion?: string
}

/**
 * Filter questions based on organization context.
 * Questions with a `condition` are only included when the condition evaluates to true.
 * If the relevant context field is not provided, the question is always included
 * (conservative: show → let the user answer).
 */
export function getFilteredQuestions(
  questions: ComplianceQuestion[],
  context: DiagnosticContext
): ComplianceQuestion[] {
  return questions.filter(q => {
    if (!q.condition) return true
    const { field, operator, value } = q.condition
    const actual = (context as Record<string, string | number | undefined>)[field]
    if (actual === undefined || actual === null) return true // show if we don't know
    switch (operator) {
      case 'eq':  return String(actual) === String(value)
      case 'neq': return String(actual) !== String(value)
      case 'gte': return Number(actual) >= Number(value)
      case 'lte': return Number(actual) <= Number(value)
      default:    return true
    }
  })
}
