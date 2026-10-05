import type { ComplianceQuestion } from './types'
import { PERU_LABOR } from '@/lib/legal-engine/peru-labor'
export { AREAS, getAreaWeight, ANSWER_VALUES, isAnswerOption } from './types'
export type { ComplianceQuestion, AreaKey, AnswerValue, AnswerOption, AreaDefinition } from './types'

/*
 * Banco de preguntas del diagnóstico SUNAFIL.
 *
 * Reglas de edición:
 *  - `id`, `area`, `condition`, `peso`, `multaUIT` e `infraccionGravedad` se
 *    usan en el puntaje y se guardan en la base de datos: no los cambies.
 *  - `text`, `helpText` y `baseLegal` son textos visibles: con tildes, «¿» de
 *    apertura y lenguaje simple. La pregunta se formula en positivo, de modo que
 *    «Sí» siempre signifique «cumplo».
 *  - Toda pregunta express lleva `helpText` («¿Por qué te lo preguntamos?»):
 *    qué se revisa, por qué importa y qué riesgo hay, en 1-2 frases. No repitas
 *    la gravedad ni el monto de la multa: la pantalla los muestra aparte.
 */

/** "S/ 1,130": la RMV sale de PERU_LABOR para no escribirla a mano. */
const RMV_TEXTO = `S/ ${PERU_LABOR.RMV.toLocaleString('en-US')}`

// =============================================
// ÁREA 1: CONTRATOS Y REGISTRO (15 preguntas)
// =============================================
const contratosRegistro: ComplianceQuestion[] = [
  {
    id: 'CR-01', area: 'contratos_registro',
    text: '¿Todos los trabajadores cuentan con contrato de trabajo escrito y firmado?',
    helpText: 'Revisamos que cada trabajador tenga su contrato por escrito y firmado. Es obligatorio en los contratos a plazo fijo y a tiempo parcial, y en los indefinidos es tu mejor prueba de lo pactado; sin él, un contrato temporal puede considerarse indefinido y SUNAFIL puede multarte.',
    baseLegal: 'D.Leg. 728, Art. 4', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: true,
  },
  { id: 'CR-02', area: 'contratos_registro', text: '¿Los contratos sujetos a modalidad (plazo fijo) se registran ante el MTPE dentro de los 15 días de celebrados?', baseLegal: 'D.S. 003-97-TR, Art. 73', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  {
    id: 'CR-03', area: 'contratos_registro',
    text: '¿Los contratos temporales (a plazo fijo) indican la causa objetiva que justifica la contratación?',
    helpText: 'Un contrato temporal debe explicar por qué el puesto es temporal (por ejemplo, un aumento de pedidos o el reemplazo de alguien). Si no lo dice, el contrato puede considerarse indefinido (se «desnaturaliza») y el trabajador gana estabilidad, además de la multa.',
    baseLegal: 'D.S. 003-97-TR, Art. 72', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: true,
  },
  {
    id: 'CR-04', area: 'contratos_registro',
    text: '¿Todos los trabajadores están registrados en el T-REGISTRO a más tardar el día en que empiezan a trabajar?',
    helpText: 'El T-Registro es el registro de trabajadores que lleva SUNAT, y el alta debe hacerse a más tardar el día en que la persona empieza a trabajar. Si falta, ese trabajador figura como informal, una de las faltas que SUNAFIL detecta con más facilidad al cruzar datos.',
    baseLegal: 'D.S. 018-2007-TR, Art. 4-A', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true,
  },
  { id: 'CR-05', area: 'contratos_registro', text: '¿Los datos del T-REGISTRO (régimen, tipo de contrato, remuneración) están actualizados?', baseLegal: 'D.S. 018-2007-TR', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'CR-06', area: 'contratos_registro', text: '¿Los contratos a tiempo parcial (menos de 4 horas diarias) constan por escrito y están registrados?', baseLegal: 'D.S. 003-97-TR, Art. 4', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'CR-07', area: 'contratos_registro', text: '¿Se entrega una copia del contrato de trabajo a cada trabajador?', baseLegal: 'D.Leg. 728, Art. 4', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'CR-08', area: 'contratos_registro', text: '¿Los practicantes preprofesionales y profesionales tienen un convenio escrito y registrado?', baseLegal: 'Ley 28518, Art. 46', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'CR-09', area: 'contratos_registro', text: '¿Se respeta el límite del 20 % de practicantes respecto del total de trabajadores?', baseLegal: 'Ley 28518, Art. 17', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'CR-10', area: 'contratos_registro', text: '¿Los trabajadores de dirección y de confianza están debidamente calificados como tales y registrados?', baseLegal: 'D.S. 003-97-TR, Art. 43-44', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 2, express: false },
  {
    id: 'CR-11', area: 'contratos_registro',
    text: '¿Los contratos sujetos a modalidad respetan el plazo máximo legal (5 años en total con un mismo trabajador)?',
    helpText: 'Los contratos temporales con una misma persona, sumados, no pueden pasar de 5 años. Si se supera ese límite, el contrato pasa a ser indefinido por ley y el trabajador gana estabilidad laboral.',
    baseLegal: 'D.S. 003-97-TR, Art. 74', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true,
  },
  { id: 'CR-12', area: 'contratos_registro', text: '¿Se comunica la baja en el T-REGISTRO dentro de las 24 horas del cese?', baseLegal: 'D.S. 018-2007-TR', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 2, express: false },
  { id: 'CR-13', area: 'contratos_registro', text: '¿Los contratos de trabajadores extranjeros respetan el límite del 20 % y cuentan con la aprobación del MTPE?', baseLegal: 'D.Leg. 689, Art. 4', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  { id: 'CR-14', area: 'contratos_registro', text: '¿Se mantiene un registro actualizado de todos los contratos vigentes, con sus fechas de vencimiento?', baseLegal: 'D.S. 003-97-TR', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 2, express: false },
  { id: 'CR-15', area: 'contratos_registro', text: '¿La empresa tiene una inscripción vigente en el REMYPE para aplicar el régimen MYPE a sus trabajadores?', baseLegal: 'Ley 32353, Art. 7', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false, condition: { field: 'regimenPrincipal', operator: 'eq', value: 'MYPE_MICRO' } },
]

// =============================================
// ÁREA 2: REMUNERACIONES Y BENEFICIOS (20 preguntas)
// =============================================
const remuneracionesBeneficios: ComplianceQuestion[] = [
  {
    id: 'RB-01', area: 'remuneraciones_beneficios',
    text: `¿Se paga al menos la Remuneración Mínima Vital (${RMV_TEXTO}) a todos los trabajadores a tiempo completo?`,
    helpText: 'Revisamos que nadie con jornada completa gane menos de la remuneración mínima vital (RMV). Pagar menos genera una deuda con cada trabajador afectado, con intereses, además de la multa de SUNAFIL.',
    baseLegal: 'D.S. 003-97-TR, Art. 24', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true,
  },
  {
    id: 'RB-02', area: 'remuneraciones_beneficios',
    text: '¿Se deposita la CTS dentro del plazo (hasta el 15 de mayo y el 15 de noviembre)?',
    helpText: 'La CTS es un ahorro que depositas en el banco que elige cada trabajador hasta el 15 de mayo y el 15 de noviembre; si lo haces tarde o incompleto, debes pagar intereses y SUNAFIL puede multarte. En la microempresa inscrita en el REMYPE no corresponde CTS: en ese caso marca «No aplica».',
    baseLegal: 'D.S. 001-97-TR, Art. 21-22', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: true,
  },
  {
    id: 'RB-03', area: 'remuneraciones_beneficios',
    text: '¿Se paga la gratificación completa en julio y diciembre (o la proporcional que corresponda)?',
    helpText: 'Cada trabajador recibe una gratificación en julio y otra en diciembre (o la parte proporcional si no completó el semestre), pagada hasta el 15 de ese mes. No pagarla o pagarla incompleta genera deuda y multa; en la microempresa inscrita en el REMYPE no corresponde, así que marca «No aplica».',
    baseLegal: 'Ley 27735, Art. 2-3', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: true,
  },
  {
    id: 'RB-04', area: 'remuneraciones_beneficios',
    text: '¿Se paga la bonificación extraordinaria del 9 % junto con la gratificación (Ley 30334)?',
    helpText: 'Junto con cada gratificación se paga un bono extra del 9 % (6.75 % si el trabajador está afiliado a una EPS), que equivale al aporte a EsSalud que la empresa no paga sobre la gratificación. Si falta, el pago de la gratificación queda incompleto.',
    baseLegal: 'Ley 30334, Art. 3', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: true,
  },
  {
    id: 'RB-05', area: 'remuneraciones_beneficios',
    text: '¿Se otorgan 30 días calendario de vacaciones por cada año completo de servicio?',
    helpText: 'Por cada año completo de trabajo, el trabajador tiene derecho a 30 días de descanso pagado (15 días en la micro y pequeña empresa). Si no los toma dentro del año siguiente, debes pagarle además una indemnización equivalente a un sueldo.',
    baseLegal: 'D.Leg. 713, Art. 10', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: true,
  },
  { id: 'RB-06', area: 'remuneraciones_beneficios', text: '¿Se paga la asignación familiar (10 % de la RMV) a los trabajadores con hijos menores de edad o que siguen estudios superiores?', baseLegal: 'Ley 25129, Art. 2', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  {
    id: 'RB-07', area: 'remuneraciones_beneficios',
    text: '¿Los aportes de pensiones se pagan a tiempo (a la AFP, dentro de los primeros 5 días hábiles del mes siguiente; a la ONP, según el cronograma de SUNAT)?',
    helpText: 'La empresa descuenta la pensión del sueldo de cada trabajador y debe pagarla a tiempo: a la AFP dentro de los primeros 5 días hábiles del mes siguiente y a la ONP según el cronograma de SUNAT. Retener ese dinero sin pagarlo genera intereses, cobranza de la AFP y multa.',
    baseLegal: 'D.S. 054-97-EF, Art. 34', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true,
  },
  {
    id: 'RB-08', area: 'remuneraciones_beneficios',
    text: '¿Se paga EsSalud (9 %) sobre la remuneración de todos los trabajadores?',
    helpText: 'La empresa paga a EsSalud el 9 % del sueldo de cada trabajador (no se le descuenta al trabajador). Si no lo paga, el trabajador y su familia pueden quedarse sin atención médica y la empresa puede terminar asumiendo el costo de esas atenciones.',
    baseLegal: 'Ley 26790, Art. 6', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true,
  },
  { id: 'RB-09', area: 'remuneraciones_beneficios', text: '¿Las horas extras se pagan con el recargo legal (25 % las dos primeras horas y 35 % las siguientes)?', baseLegal: 'D.S. 007-2002-TR, Art. 10', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  {
    id: 'RB-10', area: 'remuneraciones_beneficios',
    text: '¿Se emite una boleta de pago con todos los conceptos remunerativos y descuentos detallados?',
    helpText: 'La boleta muestra al trabajador cuánto ganó y qué se le descontó (pensión, impuestos, faltas). Es tu prueba de que pagaste bien: sin boletas completas, es difícil demostrarlo ante SUNAFIL o un juez.',
    baseLegal: 'D.S. 001-98-TR, Art. 18-19', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: true,
  },
  { id: 'RB-11', area: 'remuneraciones_beneficios', text: '¿Se entrega la boleta de pago al trabajador dentro de los 3 días hábiles siguientes al pago?', baseLegal: 'D.S. 001-98-TR, Art. 18', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'RB-12', area: 'remuneraciones_beneficios', text: '¿Se entrega al trabajador la liquidación del depósito de CTS dentro de los 5 días hábiles siguientes al depósito?', baseLegal: 'D.S. 001-97-TR, Art. 29', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 2, express: false },
  { id: 'RB-13', area: 'remuneraciones_beneficios', text: '¿La participación en las utilidades se paga dentro de los 30 días siguientes al vencimiento del plazo para presentar la declaración jurada anual del Impuesto a la Renta?', baseLegal: 'D.Leg. 892, Art. 6', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false, condition: { field: 'totalWorkers', operator: 'gte', value: 20 } },
  { id: 'RB-14', area: 'remuneraciones_beneficios', text: '¿Se presenta cada mes la planilla electrónica (PLAME) actualizada?', baseLegal: 'D.S. 018-2007-TR', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'RB-15', area: 'remuneraciones_beneficios', text: '¿Se paga la indemnización vacacional cuando el trabajador no gozó sus vacaciones en el plazo legal?', baseLegal: 'D.Leg. 713, Art. 23', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'RB-16', area: 'remuneraciones_beneficios', text: '¿Los trabajadores del régimen MYPE reciben los beneficios que les corresponden según su régimen?', baseLegal: 'Ley 32353', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false, condition: { field: 'regimenPrincipal', operator: 'eq', value: 'MYPE_MICRO' } },
  { id: 'RB-17', area: 'remuneraciones_beneficios', text: '¿La CTS se calcula correctamente, considerando la remuneración computable más 1/6 de la gratificación?', baseLegal: 'D.S. 001-97-TR, Art. 9-10', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'RB-18', area: 'remuneraciones_beneficios', text: '¿Las retenciones judiciales y los descuentos autorizados respetan el tope del 60 % de la remuneración?', baseLegal: 'D.S. 003-97-TR', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'RB-19', area: 'remuneraciones_beneficios', text: '¿Se paga la liquidación de beneficios sociales dentro de las 48 horas del cese?', baseLegal: 'D.S. 001-97-TR, Art. 3', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'RB-20', area: 'remuneraciones_beneficios', text: '¿Los trabajadores de construcción civil reciben la bonificación unificada de construcción (BUC) que les corresponde?', baseLegal: 'Convenio colectivo de construcción civil (negociación por rama)', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false, condition: { field: 'regimenPrincipal', operator: 'eq', value: 'CONSTRUCCION_CIVIL' } },
]

// =============================================
// ÁREA 3: JORNADA Y DESCANSOS (15 preguntas)
// =============================================
const jornadaDescansos: ComplianceQuestion[] = [
  {
    id: 'JD-01', area: 'jornada_descansos',
    text: '¿Se respeta la jornada máxima de 8 horas diarias o 48 horas semanales?',
    helpText: 'La jornada normal no puede pasar de 8 horas diarias o 48 semanales. El tiempo adicional solo es válido si es voluntario y se paga como horas extras; superar la jornada sin control es una infracción y un riesgo para la salud del trabajador.',
    baseLegal: 'D.S. 007-2002-TR, Art. 1', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true,
  },
  {
    id: 'JD-02', area: 'jornada_descansos',
    text: '¿Se cuenta con un registro de control de asistencia (manual, mecánico o digital)?',
    helpText: 'Debes registrar la hora de entrada y de salida de cada trabajador (en papel, reloj marcador o sistema). Es de lo primero que pide un inspector y, si no lo tienes, te será difícil probar las horas trabajadas ante un reclamo de horas extras.',
    baseLegal: 'D.S. 004-2006-TR, Art. 1', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: true,
  },
  { id: 'JD-03', area: 'jornada_descansos', text: '¿El registro de asistencia consigna la hora de ingreso y de salida?', baseLegal: 'D.S. 004-2006-TR, Art. 2', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'JD-04', area: 'jornada_descansos', text: '¿Se otorga un refrigerio de al menos 45 minutos en jornadas de 4 horas o más?', baseLegal: 'D.S. 007-2002-TR, Art. 7', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  {
    id: 'JD-05', area: 'jornada_descansos',
    text: '¿Se otorga el descanso semanal obligatorio de 24 horas consecutivas?',
    helpText: 'Cada trabajador debe descansar al menos 24 horas seguidas por semana, normalmente el domingo. Si trabaja ese día y no le das otro día de descanso en la semana, debes pagarle esa jornada con un recargo del 100 %.',
    baseLegal: 'D.Leg. 713, Art. 1', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: true,
  },
  { id: 'JD-06', area: 'jornada_descansos', text: '¿Los feriados trabajados se pagan con el recargo del 100 % (o se compensan con otro día de descanso)?', baseLegal: 'D.Leg. 713, Art. 9', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'JD-07', area: 'jornada_descansos', text: '¿Las horas extras son voluntarias y se mantienen dentro de un límite razonable?', baseLegal: 'D.S. 007-2002-TR, Art. 9', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  { id: 'JD-08', area: 'jornada_descansos', text: '¿Se exhibe el horario de trabajo en un lugar visible del centro de labores?', baseLegal: 'D.S. 004-2006-TR, Art. 5', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 2, express: false },
  { id: 'JD-09', area: 'jornada_descansos', text: '¿Quienes trabajan de noche (de 10 p. m. a 6 a. m.) ganan al menos la remuneración mínima más un 35 %?', baseLegal: 'D.S. 007-2002-TR, Art. 8', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'JD-10', area: 'jornada_descansos', text: '¿Se programa el goce de las vacaciones con anticipación y se registra formalmente?', baseLegal: 'D.Leg. 713, Art. 14', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  {
    id: 'JD-11', area: 'jornada_descansos',
    text: '¿Los trabajadores toman sus vacaciones a tiempo, sin acumular más de 2 periodos pendientes?',
    helpText: 'Si un trabajador no toma sus vacaciones dentro del año siguiente a aquel en que las ganó, debes pagarle una indemnización adicional (lo que se conoce como «triple vacacional»). Mientras más periodos se acumulen sin gozar, mayor es la deuda.',
    baseLegal: 'D.Leg. 713, Art. 23', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: true,
  },
  { id: 'JD-12', area: 'jornada_descansos', text: '¿Se respeta la licencia por paternidad de 10 días calendario?', baseLegal: 'Ley 29409, Art. 2', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'JD-13', area: 'jornada_descansos', text: '¿Se otorga a las trabajadoras gestantes el descanso prenatal y posnatal de 49 días cada uno?', baseLegal: 'Ley 26644, Art. 1', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: false },
  { id: 'JD-14', area: 'jornada_descansos', text: '¿Se otorga la hora diaria de lactancia materna durante el primer año del hijo?', baseLegal: 'Ley 27240, Art. 1', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'JD-15', area: 'jornada_descansos', text: '¿Los teletrabajadores tienen garantizado su derecho a la desconexión digital fuera de su jornada?', baseLegal: 'Ley 31572, Art. 8', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false, condition: { field: 'regimenPrincipal', operator: 'eq', value: 'TELETRABAJO' } },
]

// =============================================
// ÁREA 4: SEGURIDAD Y SALUD EN EL TRABAJO (25 preguntas)
// =============================================
const sst: ComplianceQuestion[] = [
  {
    id: 'SST-01', area: 'sst',
    text: '¿La empresa cuenta con una Política de Seguridad y Salud en el Trabajo escrita y exhibida?',
    helpText: 'La política de SST es un documento corto, firmado por la gerencia, en el que la empresa se compromete a prevenir accidentes y enfermedades. Debe estar exhibida y ser conocida por los trabajadores; es de lo primero que revisa un inspector de SST.',
    baseLegal: 'Ley 29783, Art. 22', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: true,
  },
  {
    id: 'SST-02', area: 'sst',
    text: '¿Se ha elaborado el Reglamento Interno de SST (obligatorio desde 20 trabajadores)?',
    helpText: 'Si tienes 20 o más trabajadores, debes tener un Reglamento Interno de SST con las reglas de seguridad de tu empresa y entregar una copia a cada trabajador. Sin él, no hay normas de prevención claras que puedas exigir ni sancionar.',
    baseLegal: 'Ley 29783, Art. 34', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: true, condition: { field: 'totalWorkers', operator: 'gte', value: 20 },
  },
  {
    id: 'SST-03', area: 'sst',
    text: '¿Se ha conformado el Comité de SST (20 o más trabajadores) o cuentas con un Supervisor de SST elegido por los trabajadores (menos de 20)?',
    helpText: 'Con 20 o más trabajadores debe existir un Comité de SST, con igual número de representantes de la empresa y de los trabajadores; con menos de 20, basta un Supervisor de SST elegido por los trabajadores. Sin ellos, nadie vigila formalmente la prevención y SUNAFIL lo sanciona.',
    baseLegal: 'Ley 29783, Art. 29-30', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: true,
  },
  {
    id: 'SST-04', area: 'sst',
    text: '¿Se ha elaborado la matriz IPERC (identificación de peligros, evaluación de riesgos y medidas de control)?',
    helpText: 'La matriz IPERC lista los peligros de cada puesto, qué tan riesgosos son y qué haces para controlarlos. Es la base de toda la prevención: sin ella, ante un accidente es muy difícil demostrar que la empresa previno el riesgo.',
    baseLegal: 'Ley 29783, Art. 57; R.M. 050-2013-TR', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true,
  },
  {
    id: 'SST-05', area: 'sst',
    text: '¿Se cuenta con un Plan Anual de SST aprobado por el Comité o el Supervisor de SST?',
    helpText: 'El Plan Anual de SST indica qué actividades de prevención harás en el año (capacitaciones, inspecciones, exámenes, simulacros), con fechas y responsables, y debe aprobarlo el Comité o el Supervisor de SST. Le demuestra al inspector que la prevención está organizada y no se improvisa.',
    baseLegal: 'Ley 29783, Art. 38', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: true,
  },
  {
    id: 'SST-06', area: 'sst',
    text: '¿Se realizan al menos 4 capacitaciones de SST al año?',
    helpText: 'La ley exige al menos 4 capacitaciones de SST al año, a cargo de la empresa. Guarda la lista de asistencia firmada: si no hay registro, para el inspector la capacitación no se hizo.',
    baseLegal: 'Ley 29783, Art. 35', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: true,
  },
  {
    id: 'SST-07', area: 'sst',
    text: '¿Se practican los exámenes médicos ocupacionales (EMO) de ingreso, periódicos y de retiro que corresponden según el riesgo del puesto?',
    helpText: 'Los exámenes médicos ocupacionales (EMO) los paga la empresa y deben hacerse al menos cada 2 años; en actividades de alto riesgo también son obligatorios al ingreso y al cese. Sirven para detectar a tiempo daños a la salud causados por el trabajo, y no hacerlos es una infracción de SST.',
    baseLegal: 'Ley 29783, Art. 49-d; D.S. 005-2012-TR, Art. 101', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true,
  },
  { id: 'SST-08', area: 'sst', text: '¿Se entregan los equipos de protección personal (EPP) adecuados y se registra su entrega?', baseLegal: 'Ley 29783, Art. 60', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'SST-09', area: 'sst', text: '¿Se cuenta con un mapa de riesgos actualizado y exhibido en lugares visibles?', baseLegal: 'D.S. 005-2012-TR, Art. 35-e', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'SST-10', area: 'sst', text: '¿Se lleva el registro de accidentes de trabajo, enfermedades ocupacionales e incidentes?', baseLegal: 'Ley 29783, Art. 28; R.M. 050-2013-TR', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'SST-11', area: 'sst', text: '¿Los accidentes mortales y los incidentes peligrosos se notifican al MTPE dentro de las 24 horas?', baseLegal: 'Ley 29783, Art. 82', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: false },
  { id: 'SST-12', area: 'sst', text: '¿Se realiza la inducción en SST a todos los trabajadores nuevos?', baseLegal: 'Ley 29783, Art. 49-g', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'SST-13', area: 'sst', text: '¿Se cuenta con el SCTR (Seguro Complementario de Trabajo de Riesgo) para las actividades de riesgo?', baseLegal: 'Ley 26790, Art. 19; D.S. 003-98-SA', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: false },
  { id: 'SST-14', area: 'sst', text: '¿Las actas del Comité de SST están al día, con reuniones mensuales?', baseLegal: 'D.S. 005-2012-TR, Art. 68', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'SST-15', area: 'sst', text: '¿Se ha implementado un plan de respuesta ante emergencias (primeros auxilios, evacuación, incendios)?', baseLegal: 'Ley 29783, Art. 83', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'SST-16', area: 'sst', text: '¿Los baños, vestuarios y comedores cumplen con condiciones de higiene adecuadas?', baseLegal: 'D.S. 42-F, Art. 36-57', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 2, express: false },
  { id: 'SST-17', area: 'sst', text: '¿Se monitorean los agentes físicos, químicos y biológicos del ambiente de trabajo?', baseLegal: 'Ley 29783, Art. 56; D.S. 005-2012-TR, Art. 103', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'SST-18', area: 'sst', text: '¿Los trabajadores eligen a sus representantes ante el Comité de SST?', baseLegal: 'Ley 29783, Art. 29', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'SST-19', area: 'sst', text: '¿Se cuenta con un botiquín de primeros auxilios implementado y vigente?', baseLegal: 'D.S. 005-2012-TR, Art. 74-e', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 2, express: false },
  { id: 'SST-20', area: 'sst', text: '¿Se realizan simulacros de evacuación al menos 2 veces al año?', baseLegal: 'Ley 28551; INDECI', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'SST-21', area: 'sst', text: '¿Se ha implementado un programa de prevención de riesgos psicosociales (estrés, carga de trabajo, acoso)?', baseLegal: 'R.M. 375-2008-TR', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'SST-22', area: 'sst', text: '¿Se lleva un registro de las capacitaciones de SST con la firma de los asistentes?', baseLegal: 'D.S. 005-2012-TR, Art. 33', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'SST-23', area: 'sst', text: '¿La señalización de seguridad está correctamente implementada en todas las áreas?', baseLegal: 'NTP 399.010-1', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 2, express: false },
  { id: 'SST-24', area: 'sst', text: '¿Se cuenta con un programa de ergonomía para los puestos con riesgos por postura o esfuerzo físico (riesgo disergonómico)?', baseLegal: 'R.M. 375-2008-TR', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'SST-25', area: 'sst', text: '¿Se mantiene actualizada la documentación del Sistema de Gestión de SST?', baseLegal: 'Ley 29783, Art. 28', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
]

// =============================================
// ÁREA 5: DOCUMENTOS OBLIGATORIOS (15 preguntas)
// =============================================
const documentosObligatorios: ComplianceQuestion[] = [
  {
    id: 'DO-01', area: 'documentos_obligatorios',
    text: '¿Se mantiene la planilla electrónica de pagos actualizada y archivada?',
    helpText: 'La planilla electrónica (T-Registro y PLAME) es el registro oficial de quiénes trabajan para ti y cuánto les pagas, y se declara cada mes a SUNAT. SUNAFIL cruza esa información: si un trabajador no figura, se le considera informal.',
    baseLegal: 'D.S. 018-2007-TR', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: true,
  },
  {
    id: 'DO-02', area: 'documentos_obligatorios',
    text: '¿Se emiten y conservan las boletas de pago de todos los trabajadores?',
    helpText: 'Debes entregar las boletas de pago de todos los trabajadores y guardar la constancia de entrega (firma o envío digital). Son tu prueba de que pagaste: el inspector suele pedir las de varios meses.',
    baseLegal: 'D.S. 001-98-TR, Art. 18', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 4, express: true,
  },
  { id: 'DO-03', area: 'documentos_obligatorios', text: '¿Se conserva una copia de los contratos de trabajo por al menos 5 años después del cese?', baseLegal: 'D.S. 003-97-TR', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'DO-04', area: 'documentos_obligatorios', text: '¿Se cuenta con el Reglamento Interno de Trabajo (obligatorio para empresas con más de 100 trabajadores)?', baseLegal: 'D.S. 039-91-TR, Art. 2', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false, condition: { field: 'totalWorkers', operator: 'gte', value: 100 } },
  {
    id: 'DO-05', area: 'documentos_obligatorios',
    text: '¿Se mantiene un legajo personal de cada trabajador con sus documentos básicos completos?',
    helpText: 'El legajo es el archivo de cada trabajador: DNI, contrato, boletas, constancias de capacitación y exámenes médicos, entre otros. Tenerlo ordenado te permite entregar al inspector lo que pide en el plazo corto que suele dar.',
    baseLegal: 'D.S. 001-98-TR', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 4, express: true,
  },
  { id: 'DO-06', area: 'documentos_obligatorios', text: '¿Se conservan los registros de vacaciones gozadas y truncas de cada trabajador?', baseLegal: 'D.Leg. 713, Art. 14', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'DO-07', area: 'documentos_obligatorios', text: '¿Se archivan las constancias de depósito de CTS entregadas a cada trabajador?', baseLegal: 'D.S. 001-97-TR, Art. 29', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'DO-08', area: 'documentos_obligatorios', text: '¿Se exhibe la síntesis de la legislación laboral en un lugar visible?', baseLegal: 'D.S. 001-98-TR, Art. 48', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 1, express: false },
  { id: 'DO-09', area: 'documentos_obligatorios', text: '¿El registro de control de asistencia está disponible para la inspección?', baseLegal: 'D.S. 004-2006-TR', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'DO-10', area: 'documentos_obligatorios', text: '¿Se mantiene actualizado el cuadro de categorías y funciones (igualdad salarial)?', baseLegal: 'Ley 30709, Art. 2; D.S. 002-2018-TR', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'DO-11', area: 'documentos_obligatorios', text: '¿Se conservan los certificados de capacitación en SST con la firma del trabajador?', baseLegal: 'Ley 29783, Art. 35', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'DO-12', area: 'documentos_obligatorios', text: '¿Se cuenta con la constancia de SCTR vigente para las actividades de riesgo?', baseLegal: 'Ley 26790, Art. 19', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  { id: 'DO-13', area: 'documentos_obligatorios', text: '¿Se tiene la póliza de Seguro Vida Ley vigente para los trabajadores desde su primer día de trabajo?', baseLegal: 'D.Leg. 688, Art. 1 (modificado por el D.U. 044-2019)', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  {
    id: 'DO-14', area: 'documentos_obligatorios',
    text: '¿Se exhibe la política contra el hostigamiento sexual en un lugar visible?',
    helpText: 'Toda empresa debe tener una política contra el hostigamiento sexual, difundirla y exhibirla donde todos la vean. Así demuestras que previenes el acoso y que tus trabajadores saben cómo denunciarlo.',
    baseLegal: 'D.S. 014-2019-MIMP, Art. 5', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: true,
  },
  { id: 'DO-15', area: 'documentos_obligatorios', text: '¿Se conservan los documentos de liquidación de beneficios sociales al cese?', baseLegal: 'D.S. 003-97-TR', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
]

// =============================================
// ÁREA 6: RELACIONES LABORALES (10 preguntas)
// =============================================
const relacionesLaborales: ComplianceQuestion[] = [
  {
    id: 'RL-01', area: 'relaciones_laborales',
    text: '¿Se respeta el derecho de los trabajadores a formar un sindicato o afiliarse a uno?',
    helpText: 'Los trabajadores pueden formar un sindicato o afiliarse a uno sin pedir permiso a la empresa. Despedir, amenazar o perjudicar a alguien por ese motivo es una falta seria: un juez puede anular el despido y ordenar que vuelva a su puesto.',
    baseLegal: 'D.S. 010-2003-TR, Art. 2', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true,
  },
  { id: 'RL-02', area: 'relaciones_laborales', text: '¿Se cumple el procedimiento de despido (carta de preaviso con al menos 6 días para los descargos y carta de despido)?', baseLegal: 'D.S. 003-97-TR, Art. 31-32', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: false },
  { id: 'RL-03', area: 'relaciones_laborales', text: '¿Las sanciones disciplinarias siguen un orden gradual (amonestación, suspensión, despido)?', baseLegal: 'D.S. 003-97-TR, Art. 33', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'RL-04', area: 'relaciones_laborales', text: '¿Se respeta la protección especial de los dirigentes sindicales (fuero sindical)?', baseLegal: 'D.S. 010-2003-TR, Art. 30-31', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  { id: 'RL-05', area: 'relaciones_laborales', text: '¿Se cumple el convenio colectivo vigente (si existe)?', baseLegal: 'D.S. 010-2003-TR, Art. 42', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  { id: 'RL-06', area: 'relaciones_laborales', text: '¿Los ceses colectivos se tramitan con la aprobación del MTPE y el pago de los beneficios?', baseLegal: 'D.S. 003-97-TR, Art. 46-52', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  { id: 'RL-07', area: 'relaciones_laborales', text: '¿Se paga la indemnización por despido arbitrario conforme a ley?', baseLegal: 'D.S. 003-97-TR, Art. 38', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: false },
  { id: 'RL-08', area: 'relaciones_laborales', text: '¿Se entrega el certificado de trabajo dentro de las 48 horas del cese?', baseLegal: 'D.S. 001-96-TR, Art. 1', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 3, express: false },
  { id: 'RL-09', area: 'relaciones_laborales', text: '¿La empresa evita actos de hostilidad (como rebajar el sueldo o la categoría sin motivo) que puedan considerarse un despido indirecto?', baseLegal: 'D.S. 003-97-TR, Art. 30', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  { id: 'RL-10', area: 'relaciones_laborales', text: '¿Se permite el ejercicio del derecho de huelga conforme a las normas vigentes?', baseLegal: 'D.S. 010-2003-TR, Art. 72-73', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 3, express: false },
]

// =============================================
// ÁREA 7: IGUALDAD Y NO DISCRIMINACIÓN (10 preguntas)
// =============================================
const igualdadNoDiscriminacion: ComplianceQuestion[] = [
  {
    id: 'IN-01', area: 'igualdad_nodiscriminacion',
    text: '¿Se cuenta con una política salarial y un cuadro de categorías y funciones?',
    helpText: 'Debes tener un cuadro que agrupe los puestos por categorías y funciones, con criterios objetivos para fijar sueldos, y una política salarial. Con eso demuestras que pagas igual por trabajo de igual valor y que las diferencias tienen una razón objetiva.',
    baseLegal: 'Ley 30709, Art. 2; D.S. 002-2018-TR', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 5, express: true,
  },
  {
    id: 'IN-02', area: 'igualdad_nodiscriminacion',
    text: '¿Hombres y mujeres que hacen trabajos de igual valor ganan lo mismo, sin diferencias por género?',
    helpText: 'Revisamos que hombres y mujeres que hacen trabajos de igual valor ganen lo mismo. Las diferencias solo se justifican con criterios objetivos (por ejemplo, antigüedad, desempeño o formación); si no, es discriminación salarial.',
    baseLegal: 'Ley 30709, Art. 1', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true,
  },
  {
    id: 'IN-03', area: 'igualdad_nodiscriminacion',
    text: '¿Se ha implementado la política contra el hostigamiento sexual, con su comité y su procedimiento?',
    helpText: 'Además de la política, necesitas un procedimiento para investigar y sancionar el hostigamiento sexual y un comité que lo atienda (o un delegado, si tienes menos de 20 trabajadores). Sin eso, una denuncia puede quedar sin atención y la empresa responde por ello.',
    baseLegal: 'Ley 27942; D.S. 014-2019-MIMP', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true,
  },
  { id: 'IN-04', area: 'igualdad_nodiscriminacion', text: '¿Los procesos de selección están libres de requisitos discriminatorios (edad, sexo, estado civil)?', baseLegal: 'Ley 26772, Art. 1', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  { id: 'IN-05', area: 'igualdad_nodiscriminacion', text: '¿Se cumple la cuota de empleo del 3 % para personas con discapacidad (empresas con más de 50 trabajadores)?', baseLegal: 'Ley 29973, Art. 49', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false, condition: { field: 'totalWorkers', operator: 'gte', value: 50 } },
  { id: 'IN-06', area: 'igualdad_nodiscriminacion', text: '¿Se cuenta con un canal de denuncias accesible para casos de hostigamiento sexual?', baseLegal: 'Ley 27942, Art. 7-A', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'IN-07', area: 'igualdad_nodiscriminacion', text: '¿Se realizan capacitaciones anuales sobre prevención del hostigamiento sexual?', baseLegal: 'D.S. 014-2019-MIMP, Art. 6', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'IN-08', area: 'igualdad_nodiscriminacion', text: '¿Se contrata y se mantiene a las trabajadoras sin exigirles una prueba de embarazo?', baseLegal: 'Ley 26644, Art. 5', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: false },
  { id: 'IN-09', area: 'igualdad_nodiscriminacion', text: '¿Se protege contra represalias a quienes denuncian hostigamiento sexual?', baseLegal: 'Ley 27942, Art. 8', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'IN-10', area: 'igualdad_nodiscriminacion', text: '¿Se difunde la política de no discriminación entre todos los trabajadores?', baseLegal: 'D.S. 002-2018-TR, Art. 3', infraccionGravedad: 'LEVE', multaUIT: 0.23, peso: 2, express: false },
]

// =============================================
// ÁREA 8: TRABAJADORES ESPECIALES (10 preguntas)
// =============================================
const trabajadoresEspeciales: ComplianceQuestion[] = [
  {
    id: 'TE-01', area: 'trabajadores_especiales',
    text: '¿Las trabajadoras gestantes están protegidas de labores que pongan en riesgo su salud o la del bebé por nacer?',
    helpText: 'Si una trabajadora embarazada hace tareas que ponen en riesgo su salud o la del bebé, debes asignarle otras tareas sin afectar su sueldo ni sus derechos. Si no tienes trabajadoras gestantes, marca «No aplica».',
    baseLegal: 'Ley 28048, Art. 1', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: true,
  },
  { id: 'TE-02', area: 'trabajadores_especiales', text: '¿Se cuenta con un lactario implementado (centros con 20 o más mujeres en edad fértil)?', baseLegal: 'Ley 29896, Art. 1', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false, condition: { field: 'totalWorkers', operator: 'gte', value: 20 } },
  { id: 'TE-03', area: 'trabajadores_especiales', text: '¿Los menores de edad (de 14 a 17 años) que trabajan cuentan con autorización y jornada reducida?', baseLegal: 'Código de los Niños y Adolescentes, Art. 51-68', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 5, express: false },
  { id: 'TE-04', area: 'trabajadores_especiales', text: '¿Los trabajadores con discapacidad cuentan con ajustes razonables (adaptaciones) en su puesto?', baseLegal: 'Ley 29973, Art. 50', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false },
  { id: 'TE-05', area: 'trabajadores_especiales', text: '¿Los trabajadores extranjeros tienen su contrato aprobado por el MTPE y una situación migratoria regular?', baseLegal: 'D.Leg. 689, Art. 2-4', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  // Base legal actualizada: la Ley 31047 (2020) reemplazó a la Ley 27986.
  { id: 'TE-06', area: 'trabajadores_especiales', text: '¿Los trabajadores del hogar gozan de todos los derechos laborales que establece la ley?', baseLegal: 'Ley 31047', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false, condition: { field: 'regimenPrincipal', operator: 'eq', value: 'DOMESTICO' } },
  { id: 'TE-07', area: 'trabajadores_especiales', text: '¿Los trabajadores nocturnos reciben el pago mínimo nocturno (remuneración mínima más 35 %) y no exceden la jornada máxima?', baseLegal: 'D.S. 007-2002-TR, Art. 8', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false },
  { id: 'TE-08', area: 'trabajadores_especiales', text: '¿Se protege la estabilidad laboral de los trabajadores con VIH/SIDA?', baseLegal: 'Ley 26626, Art. 6', infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63, peso: 4, express: false },
  { id: 'TE-09', area: 'trabajadores_especiales', text: '¿Los trabajadores de construcción civil reciben los beneficios especiales de su régimen?', baseLegal: 'D.Leg. 727; normas del sector construcción', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 3, express: false, condition: { field: 'regimenPrincipal', operator: 'eq', value: 'CONSTRUCCION_CIVIL' } },
  { id: 'TE-10', area: 'trabajadores_especiales', text: '¿Los practicantes y demás beneficiarios de modalidades formativas reciben su subvención económica y un seguro médico?', baseLegal: 'Ley 28518, Art. 42-47', infraccionGravedad: 'GRAVE', multaUIT: 1.57, peso: 4, express: false, condition: { field: 'regimenPrincipal', operator: 'eq', value: 'MODALIDAD_FORMATIVA' } },
]

// =============================================
// ÁREA 9: TERCERIZACIÓN E INTERMEDIACIÓN LABORAL (8 preguntas)
// Ley 29245 (tercerización) + Ley 27626 (intermediación)
// =============================================
const tercerizacionIntermediacion: ComplianceQuestion[] = [
  {
    id: 'TI-01',
    area: 'tercerizacion_intermediacion',
    text: '¿Las empresas tercerizadoras que desplazan personal a tu empresa están inscritas en el Registro Nacional de Empresas Tercerizadoras del Ministerio de Trabajo?',
    helpText: 'Si una empresa te presta servicios con su propio personal trabajando de forma continua en tu local, debe estar inscrita en este registro del Ministerio de Trabajo. Si no lo está, esos trabajadores podrían ser considerados tuyos y tendrías que asumir sus beneficios.',
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
    text: '¿Los contratos de tercerización acreditan sus elementos esenciales: autonomía empresarial, pluralidad de clientes, equipos propios y riesgo económico asumido por la tercerizadora?',
    helpText: 'Una tercerización válida exige que la contratista sea una empresa real: que dirija a su personal, use sus propios equipos, tenga otros clientes y asuma el riesgo del servicio. Si no es así, sus trabajadores pueden ser considerados tuyos.',
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
    text: '¿La empresa principal verifica y exige que la tercerizadora pague a tiempo las obligaciones laborales y previsionales de los trabajadores desplazados?',
    helpText: 'Si la tercerizadora no paga a su personal (sueldos, beneficios o aportes), tu empresa puede tener que pagarlo junto con ella (responsabilidad solidaria). Por eso conviene pedirle cada mes las constancias de pago.',
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
    text: '¿Las empresas de intermediación laboral («services») que contratas tienen su registro vigente ante el Ministerio de Trabajo?',
    helpText: 'Las empresas de servicios («services») que te envían personal, por ejemplo de limpieza o vigilancia, deben tener registro vigente en el Ministerio de Trabajo. Si no lo tienen, esos trabajadores pueden ser considerados tuyos desde el inicio y tu empresa responde por sus pagos.',
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
    text: '¿Los trabajadores destacados por intermediación temporal representan como máximo el 20 % del total de trabajadores de la empresa usuaria?',
    helpText: 'En la intermediación temporal (por ejemplo, para cubrir picos de trabajo), el personal destacado no puede pasar del 20 % de tus trabajadores. Si superas ese límite, esos trabajadores pueden ser considerados tuyos.',
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
    text: '¿Los trabajadores destacados por intermediación reciben una remuneración y condiciones de trabajo no inferiores a las de tus trabajadores directos que cumplen funciones equivalentes?',
    helpText: 'El personal que te envía una «service» debe recibir un sueldo y condiciones no menores que los de tus trabajadores que hacen el mismo trabajo. Si no, pueden reclamar la diferencia.',
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
    text: '¿La intermediación se usa solo para actividades permitidas (temporales, complementarias o especializadas) y nunca para la actividad principal y permanente de la empresa?',
    helpText: 'Una «service» solo puede enviarte personal para necesidades temporales (como un reemplazo), tareas complementarias (como limpieza o vigilancia) o muy especializadas. Si la usas para tu actividad principal y permanente, esos trabajadores pueden ser considerados tuyos.',
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
    text: '¿Se mantiene un registro actualizado de los contratos de tercerización e intermediación vigentes (empresa proveedora, número de trabajadores destacados y plazo)?',
    helpText: 'Tener a la mano la lista de contratos con tercerizadoras y «services» (empresa, cuántos trabajadores te envía y hasta cuándo) te permite responder rápido al inspector.',
    baseLegal: 'D.S. 006-2008-TR, Art. 8; D.S. 003-2002-TR, Art. 14',
    infraccionGravedad: 'LEVE',
    multaUIT: 0.23,
    peso: 2,
    express: false,
  },
]

// =============================================
// ÁREA 10: HOSTIGAMIENTO SEXUAL — PROCEDIMIENTO DETALLADO (7 preguntas)
// Ley 27942, D.S. 014-2019-MIMP
// =============================================
const hostigamientoSexualDetallado: ComplianceQuestion[] = [
  {
    id: 'HS-01',
    area: 'hostigamiento_sexual_detallado',
    text: '¿La política de prevención y sanción del hostigamiento sexual fue aprobada por la gerencia general, publicada en un lugar visible y comunicada formalmente a todos los trabajadores?',
    helpText: 'No basta con pegar la política en una pared: debe estar aprobada por la gerencia y comunicada a cada trabajador (por correo, con firma de recepción o en una capacitación). Así puedes demostrar que todos la conocen.',
    baseLegal: 'D.S. 014-2019-MIMP, Art. 4 y 5; Ley 27942, Art. 7-A',
    infraccionGravedad: 'MUY_GRAVE',
    multaUIT: 2.63,
    peso: 5,
    express: true,
  },
  {
    id: 'HS-02',
    area: 'hostigamiento_sexual_detallado',
    text: '¿El Comité de intervención frente al hostigamiento sexual está conformado por representantes de la empresa y de los trabajadores, y sus integrantes han sido capacitados?',
    helpText: 'Con 20 o más trabajadores, debe existir un comité de intervención frente al hostigamiento sexual, con representantes de la empresa y de los trabajadores, capacitado para investigar denuncias. Con menos de 20, la norma prevé un delegado contra el hostigamiento sexual.',
    baseLegal: 'D.S. 014-2019-MIMP, Art. 10-11; Ley 27942, Art. 7-A inc. e',
    infraccionGravedad: 'GRAVE',
    multaUIT: 1.57,
    peso: 5,
    express: true,
  },
  {
    id: 'HS-03',
    area: 'hostigamiento_sexual_detallado',
    text: '¿El canal de denuncias (físico o virtual) garantiza la confidencialidad de quien denuncia y es accesible a todos los trabajadores, incluidos los destacados o tercerizados?',
    helpText: 'El canal debe permitir denunciar de forma confidencial y estar al alcance de todos, incluido el personal de contratistas que trabaja en tu local. La persona afectada también puede acudir a SUNAFIL.',
    baseLegal: 'Ley 27942, Art. 7-A; D.S. 014-2019-MIMP, Art. 14',
    infraccionGravedad: 'GRAVE',
    multaUIT: 1.57,
    peso: 4,
    express: false,
  },
  {
    id: 'HS-04',
    area: 'hostigamiento_sexual_detallado',
    text: '¿Al recibir una denuncia se dictan medidas de protección para la víctima dentro de los 3 días hábiles (cambio de área, licencia con goce, etc.), sin esperar el resultado de la investigación?',
    helpText: 'Al recibir una denuncia, en un máximo de 3 días hábiles debes proteger a la víctima (por ejemplo, separar a las personas involucradas o darle licencia con goce si la pide), sin esperar el resultado de la investigación. No hacerlo la expone a más daño y a tu empresa, a una sanción.',
    baseLegal: 'D.S. 014-2019-MIMP, Art. 13; Ley 27942, Art. 12',
    infraccionGravedad: 'MUY_GRAVE',
    multaUIT: 2.63,
    peso: 5,
    express: true,
  },
  {
    id: 'HS-05',
    area: 'hostigamiento_sexual_detallado',
    text: '¿Se respetan los plazos del procedimiento de investigación: calificación y medidas de protección (3 días hábiles), investigación (30 días hábiles) y sanción (10 días hábiles)?',
    helpText: 'Las denuncias deben resolverse dentro de los plazos que fija el reglamento. Si la empresa se demora, la víctima queda desprotegida y SUNAFIL puede sancionar la demora.',
    baseLegal: 'D.S. 014-2019-MIMP, Art. 15-18',
    infraccionGravedad: 'GRAVE',
    multaUIT: 1.57,
    peso: 4,
    express: false,
  },
  {
    id: 'HS-06',
    area: 'hostigamiento_sexual_detallado',
    text: '¿Se capacita cada año a todos los trabajadores en prevención del hostigamiento sexual (al menos una vez al año, en horario laboral y sin descuento de remuneración)?',
    helpText: 'La capacitación debe llegar a todo el personal, incluidos jefes y gerentes, en horario de trabajo y sin costo para ellos. Guarda la lista de asistencia como prueba.',
    baseLegal: 'D.S. 014-2019-MIMP, Art. 6 y 7; Ley 27942, Art. 7-A inc. c',
    infraccionGravedad: 'GRAVE',
    multaUIT: 1.57,
    peso: 4,
    express: false,
  },
  {
    id: 'HS-07',
    area: 'hostigamiento_sexual_detallado',
    text: '¿Se elabora y envía al MTPE (o al MINEDU, si corresponde) el informe anual de casos de hostigamiento sexual, incluso si no hubo casos?',
    helpText: 'Se informa a la autoridad un resumen anual de las denuncias recibidas y de cómo se resolvieron, sin datos personales. Revisa con tu asesor el formato y el plazo vigentes.',
    baseLegal: 'D.S. 014-2019-MIMP, Art. 30; R.M. que aprueba el formato anual',
    infraccionGravedad: 'GRAVE',
    multaUIT: 1.57,
    peso: 3,
    express: false,
  },
]

// =============================================
// TODAS LAS PREGUNTAS
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

const QUESTIONS_BY_ID: ReadonlyMap<string, ComplianceQuestion> = new Map(
  ALL_QUESTIONS.map(q => [q.id, q]),
)

/** Pregunta del banco por id (o undefined si no existe). */
export function getQuestionById(id: string): ComplianceQuestion | undefined {
  return QUESTIONS_BY_ID.get(id)
}

export interface DiagnosticContext {
  sizeRange?: string
  regimenPrincipal?: string
  totalWorkers?: number
  /** 'true' / 'false' — empresa contrata servicios tercerizados (Ley 29245) */
  tieneTercerización?: string
  /** 'true' / 'false' — empresa usa intermediación laboral (Ley 27626) */
  tieneIntermediacion?: string
}

/**
 * Filtra las preguntas según el contexto de la organización.
 * Las preguntas con `condition` solo se incluyen cuando la condición se cumple.
 * Si el dato de contexto no existe, la pregunta se incluye siempre
 * (criterio conservador: se muestra y el usuario responde, o marca «No aplica»).
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
