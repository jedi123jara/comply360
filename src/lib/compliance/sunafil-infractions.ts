/**
 * CATÁLOGO COMPLETO DE INFRACCIONES SUNAFIL
 * Base legal: D.S. 019-2006-TR (modificado por D.S. 008-2020-TR)
 * Última actualización: 2026
 *
 * Cada infracción incluye:
 *  - código SUNAFIL oficial
 *  - descripción técnica y mensaje legible
 *  - severidad: LEVE | GRAVE | MUY_GRAVE
 *  - artículo base legal exacto
 *  - si es detectable automáticamente
 *  - umbral de trabajadores para que aplique (si tiene)
 */

export type SeveridadInfraccion = 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
export type CategoriaInfraccion =
  | 'RELACIONES_LABORALES'
  | 'SST'
  | 'SEGURIDAD_SOCIAL'
  | 'EMPLEO_COLOCACION'
  | 'REMUNERACIONES'
  | 'JORNADA_DESCANSO'
  | 'DOCUMENTOS_REGISTROS'
  | 'IGUALDAD'
  | 'MODALIDADES_FORMATIVAS'

export interface InfraccionSunafil {
  codigo: string
  categoria: CategoriaInfraccion
  severidad: SeveridadInfraccion
  titulo: string
  descripcion: string
  baseLegal: string
  articuloDs019: string
  /** Si el sistema puede detectarla automáticamente con datos disponibles */
  deteccionAutomatica: boolean
  /** N° mínimo de trabajadores en la org para que aplique (null = siempre aplica) */
  umbralTrabajadores: number | null
  /** Prioridad SUNAFIL: cuánto la fiscalizan activamente (1=máxima) */
  prioridadFiscalizacion: 1 | 2 | 3
  /** Consejos de subsanación rápida */
  subsanacion: string
}

/**
 * Escala de multas por tamaño empresarial según D.S. 019-2006-TR Art. 48
 * Factor multiplicador sobre multa base UIT
 */
export function getMultaFactorPorTrabajadores(totalWorkers: number): number {
  if (totalWorkers <= 10) return 1
  if (totalWorkers <= 50) return 5
  if (totalWorkers <= 100) return 10
  if (totalWorkers <= 500) return 20
  return 30
}

/**
 * Calcula multa potencial con descuentos por subsanación.
 * D.S. 019-2006-TR Art. 40 (Ley 28806)
 */
export function calcularMultaConDescuentos(
  multaBaseUIT: number,
  totalWorkers: number,
  opts?: { subsanacionVoluntaria?: boolean; subsanacionDuranteInspeccion?: boolean; reincidencia?: boolean }
): { multaBase: number; multaConDescuento: number; descuentoPct: number } {
  const factor = getMultaFactorPorTrabajadores(totalWorkers)
  let multaBase = multaBaseUIT * 5500 * factor
  let descuentoPct = 0

  if (opts?.reincidencia) {
    multaBase *= 1.5 // +50% por reincidencia
  }

  if (opts?.subsanacionVoluntaria) {
    descuentoPct = 90 // -90% si subsana antes de inspección
  } else if (opts?.subsanacionDuranteInspeccion) {
    descuentoPct = 70 // -70% si subsana durante inspección
  }

  const multaConDescuento = Math.round(multaBase * (1 - descuentoPct / 100))
  return { multaBase: Math.round(multaBase), multaConDescuento, descuentoPct }
}

export const INFRACCIONES_SUNAFIL: InfraccionSunafil[] = [
  // ══════════════════════════════════════════════════════════
  // BLOQUE 1 — DOCUMENTOS Y REGISTROS OBLIGATORIOS
  // ══════════════════════════════════════════════════════════
  {
    codigo: 'DS019-25.1',
    categoria: 'DOCUMENTOS_REGISTROS',
    severidad: 'GRAVE',
    titulo: 'No llevar Libro de Planillas / PLAME',
    descripcion: 'El empleador no lleva libro de planillas electrónico (T-REGISTRO / PLAME) o no lo mantiene actualizado.',
    baseLegal: 'D.S. 019-2006-TR Art. 25.1 | D.S. 015-2010-TR',
    articuloDs019: '25.1',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Registrar todos los trabajadores en T-REGISTRO y mantener PLAME al día antes de la inspección. Solicitar clave SOL en SUNAT.',
  },
  {
    codigo: 'DS019-25.2',
    categoria: 'DOCUMENTOS_REGISTROS',
    severidad: 'GRAVE',
    titulo: 'Trabajador no inscrito en T-REGISTRO',
    descripcion: 'No se registró al trabajador en T-REGISTRO dentro del plazo (1 día hábil antes o el mismo día del inicio de labores).',
    baseLegal: 'D.S. 019-2006-TR Art. 25.2 | D.S. 015-2010-TR Art. 3',
    articuloDs019: '25.2',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Inscribir inmediatamente al trabajador en T-REGISTRO (plataforma SUNAT). El registro extemporáneo reduce la multa pero no la elimina.',
  },
  {
    codigo: 'DS019-25.3',
    categoria: 'DOCUMENTOS_REGISTROS',
    severidad: 'LEVE',
    titulo: 'No entregar boleta de pago',
    descripcion: 'El empleador no entrega la boleta de pago dentro de los 3 días de efectuado el pago o no la conserva firmada.',
    baseLegal: 'D.S. 019-2006-TR Art. 25.3 | D.Leg. 728 Art. 19',
    articuloDs019: '25.3',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 2,
    subsanacion: 'Emitir boletas por cada pago y obtener firma del trabajador. Conservar copia por 5 años.',
  },
  {
    codigo: 'DS019-25.4',
    categoria: 'DOCUMENTOS_REGISTROS',
    severidad: 'LEVE',
    titulo: 'Registro de asistencia incompleto o inexistente',
    descripcion: 'No se lleva o no se exhibe el registro de control de asistencia y horas laboradas.',
    baseLegal: 'D.S. 019-2006-TR Art. 25.4 | D.S. 004-2006-TR',
    articuloDs019: '25.4',
    deteccionAutomatica: false,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 2,
    subsanacion: 'Implementar sistema de control de asistencia (físico o digital). Conservar 5 años.',
  },
  {
    codigo: 'DS019-25.5',
    categoria: 'DOCUMENTOS_REGISTROS',
    severidad: 'LEVE',
    titulo: 'Falta de contrato de trabajo por escrito',
    descripcion: 'Los contratos sujetos a modalidad (plazo fijo) no están por escrito o no han sido registrados ante el MTPE dentro de los 15 días.',
    baseLegal: 'D.S. 019-2006-TR Art. 25.5 | D.S. 003-97-TR Art. 72',
    articuloDs019: '25.5',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Formalizar contratos por escrito y registrar en MTPE dentro de los 15 días calendario de suscrito.',
  },
  {
    codigo: 'DS019-25.10',
    categoria: 'DOCUMENTOS_REGISTROS',
    severidad: 'LEVE',
    titulo: 'No exhibir documentación a inspector SUNAFIL',
    descripcion: 'El empleador no exhibe o dificulta la revisión de documentos laborales durante la inspección.',
    baseLegal: 'D.S. 019-2006-TR Art. 25.10 | Ley 28806 Art. 9',
    articuloDs019: '25.10',
    deteccionAutomatica: false,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Organizar legajos digitales con todos los documentos obligatorios. Tener todo listo para exhibición inmediata.',
  },

  // ══════════════════════════════════════════════════════════
  // BLOQUE 2 — RELACIONES LABORALES
  // ══════════════════════════════════════════════════════════
  {
    codigo: 'DS019-24.1',
    categoria: 'RELACIONES_LABORALES',
    severidad: 'MUY_GRAVE',
    titulo: 'Desnaturalización de contrato / relación laboral encubierta',
    descripcion: 'Uso de contratos de locación de servicios, services o similares para encubrir una relación laboral real (presencia de subordinación, horario, lugar fijo).',
    baseLegal: 'D.S. 019-2006-TR Art. 24.1 | D.Leg. 728 Art. 4',
    articuloDs019: '24.1',
    deteccionAutomatica: false,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Evaluar cada relación laboral: si hay subordinación, horario o lugar de trabajo fijo → contrato laboral obligatorio. Regularizar antes de inspección.',
  },
  {
    codigo: 'DS019-24.2',
    categoria: 'RELACIONES_LABORALES',
    severidad: 'MUY_GRAVE',
    titulo: 'Despido arbitrario sin procedimiento legal',
    descripcion: 'Cese del trabajador sin carta de preaviso de 30 días, sin pago de indemnización o sin seguir el procedimiento de despido justificado.',
    baseLegal: 'D.S. 019-2006-TR Art. 24.2 | D.S. 003-97-TR Art. 31-34',
    articuloDs019: '24.2',
    deteccionAutomatica: false,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 2,
    subsanacion: 'Seguir procedimiento: carta de pre-aviso (o pago de 30 días), carta de despido con causa documentada, pago de beneficios sociales dentro de 48 horas del cese.',
  },
  {
    codigo: 'DS019-24.3',
    categoria: 'RELACIONES_LABORALES',
    severidad: 'MUY_GRAVE',
    titulo: 'Contrato sujeto a modalidad desnaturalizado',
    descripcion: 'Contrato a plazo fijo vencido sin renovar, pero el trabajador continúa laborando (se convierte en indefinido de pleno derecho).',
    baseLegal: 'D.S. 019-2006-TR Art. 24.3 | D.S. 003-97-TR Art. 77',
    articuloDs019: '24.3',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Renovar contrato antes del vencimiento o reconocer la conversión a plazo indeterminado. No cesar al trabajador sin reconocer los derechos de indefinido.',
  },
  {
    codigo: 'DS019-24.6',
    categoria: 'RELACIONES_LABORALES',
    severidad: 'GRAVE',
    titulo: 'No registro de contrato de trabajo a plazo fijo en MTPE',
    descripcion: 'Los contratos de trabajo a plazo fijo no se registraron ante el MTPE dentro de los 15 días hábiles de suscritos.',
    baseLegal: 'D.S. 019-2006-TR Art. 24.6 | D.S. 003-97-TR Art. 72',
    articuloDs019: '24.6',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Registrar contratos en el portal del MTPE (Sistema ACSIT). El registro tardío aún puede realizarse pero conlleva multa reducida.',
  },

  // ══════════════════════════════════════════════════════════
  // BLOQUE 3 — REMUNERACIONES Y BENEFICIOS SOCIALES
  // ══════════════════════════════════════════════════════════
  {
    codigo: 'DS019-24.4',
    categoria: 'REMUNERACIONES',
    severidad: 'MUY_GRAVE',
    titulo: 'Pago por debajo de la Remuneración Mínima Vital (RMV)',
    descripcion: 'Uno o más trabajadores a tiempo completo perciben una remuneración mensual inferior a S/ 1,130 (RMV 2026).',
    baseLegal: 'D.S. 019-2006-TR Art. 24.4 | D.U. 033-2022 (RMV S/1,130)',
    articuloDs019: '24.4',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Ajustar inmediatamente el sueldo a S/ 1,130 como mínimo para trabajadores a tiempo completo. Para tiempo parcial: proporcional a horas.',
  },
  {
    codigo: 'DS019-24.9',
    categoria: 'REMUNERACIONES',
    severidad: 'GRAVE',
    titulo: 'No pago de CTS en el plazo legal',
    descripcion: 'No se depositó la CTS hasta el 15 de mayo (período nov-abr) o 15 de noviembre (período may-oct).',
    baseLegal: 'D.S. 019-2006-TR Art. 24.9 | D.S. 001-97-TR Art. 21',
    articuloDs019: '24.9',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Depositar la CTS en la cuenta del trabajador en banco de su elección antes del plazo. El depósito tardío genera intereses legales (TAMN).',
  },
  {
    codigo: 'DS019-24.10',
    categoria: 'REMUNERACIONES',
    severidad: 'GRAVE',
    titulo: 'No pago de gratificaciones legales',
    descripcion: 'No se pagó la gratificación de Fiestas Patrias (hasta el 15 de julio) o Navidad (hasta el 15 de diciembre).',
    baseLegal: 'D.S. 019-2006-TR Art. 24.10 | Ley 27735 Art. 5',
    articuloDs019: '24.10',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Pagar la gratificación más la bonificación extraordinaria del 9% (EsSalud). Incluir proporcional a trabajadores con menos de 6 meses.',
  },
  {
    codigo: 'DS019-24.11',
    categoria: 'REMUNERACIONES',
    severidad: 'GRAVE',
    titulo: 'No pago de vacaciones o indemnización vacacional',
    descripcion: 'No se otorgaron los 30 días de vacaciones (o 15 en MYPE) o no se pagó la indemnización por vacaciones no gozadas (triple vacacional).',
    baseLegal: 'D.S. 019-2006-TR Art. 24.11 | D.Leg. 713 Art. 23',
    articuloDs019: '24.11',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Programar vacaciones antes de que se acumulen 2 períodos. Si ya hay 2 períodos: pagar triple vacacional (1 por goce + 1 legal + 1 indemnizatoria).',
  },
  {
    codigo: 'DS019-24.12',
    categoria: 'REMUNERACIONES',
    severidad: 'MUY_GRAVE',
    titulo: 'No pago de utilidades',
    descripcion: 'Empresas obligadas (más de 20 trabajadores en sectores específicos) no distribuyeron utilidades dentro de los 30 días de la DJ anual del IR.',
    baseLegal: 'D.S. 019-2006-TR Art. 24.12 | D.Leg. 892',
    articuloDs019: '24.12',
    deteccionAutomatica: false,
    umbralTrabajadores: 20,
    prioridadFiscalizacion: 2,
    subsanacion: 'Calcular utilidades según participación del sector y distribuirlas a más tardar 30 días después de presentar la DJ anual del IR a SUNAT.',
  },
  {
    codigo: 'DS019-24.15',
    categoria: 'REMUNERACIONES',
    severidad: 'GRAVE',
    titulo: 'Discriminación remunerativa por género (Ley 30709)',
    descripcion: 'Brecha salarial mayor al 5% entre hombres y mujeres del mismo grupo ocupacional sin justificación objetiva documentada.',
    baseLegal: 'D.S. 019-2006-TR Art. 24.15 | Ley 30709 Art. 3 | D.S. 002-2018-TR',
    articuloDs019: '24.15',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 2,
    subsanacion: 'Elaborar Cuadro de Categorías y Funciones con bandas salariales objetivas. Justificar por escrito cualquier diferencia salarial mayor al 5%.',
  },

  // ══════════════════════════════════════════════════════════
  // BLOQUE 4 — JORNADA LABORAL Y DESCANSO
  // ══════════════════════════════════════════════════════════
  {
    codigo: 'DS019-25.6',
    categoria: 'JORNADA_DESCANSO',
    severidad: 'GRAVE',
    titulo: 'Jornada laboral mayor al máximo legal sin reconocer horas extras',
    descripcion: 'Trabajadores laboran más de 8 horas diarias o 48 horas semanales sin el pago de horas extraordinarias (25% primeras 2h, 35% siguientes).',
    baseLegal: 'D.S. 019-2006-TR Art. 25.6 | D.S. 007-2002-TR Art. 9',
    articuloDs019: '25.6',
    deteccionAutomatica: false,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 2,
    subsanacion: 'Pagar horas extras con sobretasa: 25% las 2 primeras horas, 35% las siguientes. Alternativamente, compensar con descanso en la misma proporción.',
  },
  {
    codigo: 'DS019-25.7',
    categoria: 'JORNADA_DESCANSO',
    severidad: 'GRAVE',
    titulo: 'No otorgamiento de descanso semanal',
    descripcion: 'No se otorga el descanso mínimo de 24 horas consecutivas por semana (usualmente domingos).',
    baseLegal: 'D.S. 019-2006-TR Art. 25.7 | D.Leg. 713 Art. 1',
    articuloDs019: '25.7',
    deteccionAutomatica: false,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 2,
    subsanacion: 'Garantizar 24 horas continuas de descanso semanal. Si se trabaja el día de descanso, pagar con sobretasa del 100%.',
  },
  {
    codigo: 'DS019-25.8',
    categoria: 'JORNADA_DESCANSO',
    severidad: 'LEVE',
    titulo: 'No pago por feriados trabajados',
    descripcion: 'El trabajador laboró en feriados nacionales sin recibir pago doble o descanso compensatorio.',
    baseLegal: 'D.S. 019-2006-TR Art. 25.8 | D.Leg. 713 Art. 8',
    articuloDs019: '25.8',
    deteccionAutomatica: false,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 3,
    subsanacion: 'Pagar el día feriado trabajado con una remuneración adicional (doble pago) o compensar con día de descanso.',
  },

  // ══════════════════════════════════════════════════════════
  // BLOQUE 5 — SEGURIDAD Y SALUD EN EL TRABAJO (SST)
  // Infracciones SST tienen multas 2-3x mayores según Ley 29783
  // ══════════════════════════════════════════════════════════
  {
    codigo: 'DS019-28.1',
    categoria: 'SST',
    severidad: 'MUY_GRAVE',
    titulo: 'No contar con Sistema de Gestión SST (SGSST)',
    descripcion: 'El empleador no ha implementado el Sistema de Gestión de Seguridad y Salud en el Trabajo exigido por la Ley 29783.',
    baseLegal: 'D.S. 019-2006-TR Art. 28.1 | Ley 29783 Art. 17 | D.S. 005-2012-TR',
    articuloDs019: '28.1',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Implementar los 8 elementos del SGSST: Política, Organización, Planificación, Aplicación, Evaluación, Acción, IPERC, y Plan Anual SST.',
  },
  {
    codigo: 'DS019-28.2',
    categoria: 'SST',
    severidad: 'GRAVE',
    titulo: 'No realizar IPERC (Identificación de Peligros y Evaluación de Riesgos)',
    descripcion: 'No se ha elaborado ni actualizado la Matriz IPERC conforme al formato R.M. 050-2013-TR.',
    baseLegal: 'D.S. 019-2006-TR Art. 28.2 | Ley 29783 Art. 57 | R.M. 050-2013-TR',
    articuloDs019: '28.2',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Elaborar Matriz IPERC por puesto de trabajo. Actualizar anualmente o cuando cambien las condiciones de trabajo.',
  },
  {
    codigo: 'DS019-28.3',
    categoria: 'SST',
    severidad: 'GRAVE',
    titulo: 'No contar con Comité o Supervisor SST',
    descripcion: 'Empresas con 20+ trabajadores no tienen Comité de SST. Empresas con menos de 20 no tienen Supervisor de SST.',
    baseLegal: 'D.S. 019-2006-TR Art. 28.3 | Ley 29783 Art. 29 | D.S. 005-2012-TR Art. 38',
    articuloDs019: '28.3',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: '≥20 trab.: Convocar elecciones del Comité SST (mitad empleador + mitad trabajadores). <20 trab.: Designar Supervisor SST con capacitación certificada.',
  },
  {
    codigo: 'DS019-28.5',
    categoria: 'SST',
    severidad: 'GRAVE',
    titulo: 'No realizar capacitaciones SST mínimas',
    descripcion: 'No se realizaron las 4 capacitaciones mínimas anuales en SST exigidas por la Ley 29783.',
    baseLegal: 'D.S. 019-2006-TR Art. 28.5 | Ley 29783 Art. 35(b) | D.S. 005-2012-TR Art. 27',
    articuloDs019: '28.5',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 2,
    subsanacion: 'Realizar 4 capacitaciones SST por año (mínimo 1 por trimestre). Registrar asistencia y conservar constancias.',
  },
  {
    codigo: 'DS019-28.6',
    categoria: 'SST',
    severidad: 'GRAVE',
    titulo: 'No realizar exámenes médicos ocupacionales',
    descripcion: 'No se realizan exámenes médicos de ingreso, periódicos (cada 2 años) o de cese a los trabajadores.',
    baseLegal: 'D.S. 019-2006-TR Art. 28.6 | Ley 29783 Art. 49(d) | R.M. 571-2014-MINSA',
    articuloDs019: '28.6',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Contratar clínica ocupacional para exámenes de ingreso (antes de 30 días), periódicos (cada 2 años) y de cese. Conservar resultados.',
  },
  {
    codigo: 'DS019-28.7',
    categoria: 'SST',
    severidad: 'MUY_GRAVE',
    titulo: 'No notificar accidente de trabajo en 24 horas',
    descripcion: 'Accidente de trabajo grave o mortal no notificado al MTPE y EsSalud dentro de las 24 horas de ocurrido.',
    baseLegal: 'D.S. 019-2006-TR Art. 28.7 | Ley 29783 Art. 82 | D.S. 005-2012-TR Art. 110',
    articuloDs019: '28.7',
    deteccionAutomatica: false,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Notificar vía SAT (Sistema de Accidentes de Trabajo) del MTPE dentro de las 24 horas. Para fallecidos: notificación inmediata.',
  },
  {
    codigo: 'DS019-28.9',
    categoria: 'SST',
    severidad: 'GRAVE',
    titulo: 'No entregar EPP a trabajadores',
    descripcion: 'No se proporcionaron los Equipos de Protección Personal (EPP) adecuados al riesgo del puesto de trabajo.',
    baseLegal: 'D.S. 019-2006-TR Art. 28.9 | Ley 29783 Art. 60 | D.S. 005-2012-TR',
    articuloDs019: '28.9',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Entregar EPP documentado con firma del trabajador. Reemplazar cuando estén deteriorados. Registrar en formato de entrega.',
  },

  // ══════════════════════════════════════════════════════════
  // BLOQUE 6 — SEGURIDAD SOCIAL
  // ══════════════════════════════════════════════════════════
  {
    codigo: 'DS019-26.1',
    categoria: 'SEGURIDAD_SOCIAL',
    severidad: 'MUY_GRAVE',
    titulo: 'No inscripción en EsSalud',
    descripcion: 'Trabajadores activos no están afiliados a EsSalud. El empleador debe aportar el 9% de la remuneración mensual.',
    baseLegal: 'D.S. 019-2006-TR Art. 26.1 | Ley 26790 Art. 1',
    articuloDs019: '26.1',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Registrar a todos los trabajadores en EsSalud a través de T-REGISTRO. El aporte es 9% de la remuneración bruta mensual, a cargo del empleador.',
  },
  {
    codigo: 'DS019-26.2',
    categoria: 'SEGURIDAD_SOCIAL',
    severidad: 'GRAVE',
    titulo: 'Retención de aportes AFP/ONP sin pago a la administradora',
    descripcion: 'El empleador retiene los aportes previsionales del trabajador (AFP 10% o ONP 13%) pero no los paga a la administradora en los plazos establecidos.',
    baseLegal: 'D.S. 019-2006-TR Art. 26.2 | D.S. 054-97-EF | D.Ley 19990',
    articuloDs019: '26.2',
    deteccionAutomatica: false,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Pagar los aportes retenidos más intereses moratorios (TAMN). Regularizar el historial previsional del trabajador ante la AFP u ONP.',
  },
  {
    codigo: 'DS019-26.3',
    categoria: 'SEGURIDAD_SOCIAL',
    severidad: 'GRAVE',
    titulo: 'No contratar SCTR para trabajos de riesgo',
    descripcion: 'Actividades de alto riesgo (construcción, minería, pesca, etc.) sin Seguro Complementario de Trabajo de Riesgo (SCTR).',
    baseLegal: 'D.S. 019-2006-TR Art. 26.3 | Ley 29783 Art. 82 | D.S. 003-98-SA',
    articuloDs019: '26.3',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Contratar SCTR (pensión + salud) con EsSalud o aseguradora privada. Aplica a trabajadores en actividades del Anexo 5 del D.S. 009-97-SA.',
  },

  // ══════════════════════════════════════════════════════════
  // BLOQUE 7 — IGUALDAD Y NO DISCRIMINACIÓN
  // ══════════════════════════════════════════════════════════
  {
    codigo: 'DS019-24.13',
    categoria: 'IGUALDAD',
    severidad: 'MUY_GRAVE',
    titulo: 'Hostigamiento sexual en el trabajo sin protocolo de actuación',
    descripcion: 'La empresa no cuenta con protocolo de prevención del hostigamiento sexual o no tiene canal de denuncias conforme a la Ley 27942.',
    baseLegal: 'D.S. 019-2006-TR Art. 24.13 | Ley 27942 | D.S. 014-2019-MIMP',
    articuloDs019: '24.13',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 1,
    subsanacion: 'Implementar: (1) Política de prevención, (2) Canal de denuncias confidencial, (3) Comité de Intervención (si 20+ trab.), (4) Capacitación anual.',
  },
  {
    codigo: 'DS019-24.14',
    categoria: 'IGUALDAD',
    severidad: 'GRAVE',
    titulo: 'Incumplimiento de cuota de discapacidad (3%)',
    descripcion: 'Empresas con 50+ trabajadores no cumplen con la cuota mínima del 3% de trabajadores con discapacidad exigida por la Ley 29973.',
    baseLegal: 'D.S. 019-2006-TR Art. 24.14 | Ley 29973 Art. 49 | D.S. 002-2014-MIMP',
    articuloDs019: '24.14',
    deteccionAutomatica: true,
    umbralTrabajadores: 50,
    prioridadFiscalizacion: 2,
    subsanacion: 'Contratar trabajadores con discapacidad hasta alcanzar el 3% de la planilla. Si no es posible: documentar las razones objetivas (escasez de candidatos).',
  },
  {
    codigo: 'DS019-24.16',
    categoria: 'IGUALDAD',
    severidad: 'GRAVE',
    titulo: 'No contar con Cuadro de Categorías y Funciones (Ley 30709)',
    descripcion: 'La empresa no ha elaborado ni registrado el Cuadro de Categorías y Funciones con bandas salariales objetivas exigido por la Ley 30709.',
    baseLegal: 'D.S. 019-2006-TR Art. 24.16 | Ley 30709 Art. 4 | D.S. 002-2018-TR Art. 3',
    articuloDs019: '24.16',
    deteccionAutomatica: true,
    umbralTrabajadores: null,
    prioridadFiscalizacion: 2,
    subsanacion: 'Elaborar el Cuadro de Categorías y Funciones y registrarlo en el MTPE. Debe incluir: categorías, funciones, requisitos y bandas salariales.',
  },
]

/**
 * Obtiene infracciones filtradas por categoría y/o severidad
 */
export function getInfracciones(
  opts: { categoria?: CategoriaInfraccion; severidad?: SeveridadInfraccion } = {}
): InfraccionSunafil[] {
  return INFRACCIONES_SUNAFIL.filter(i => {
    if (opts.categoria && i.categoria !== opts.categoria) return false
    if (opts.severidad && i.severidad !== opts.severidad) return false
    return true
  })
}

/**
 * Obtiene solo las infracciones detectables automáticamente
 */
export function getInfraccionesDetectables(): InfraccionSunafil[] {
  return INFRACCIONES_SUNAFIL.filter(i => i.deteccionAutomatica)
}

/**
 * Obtiene infracción por código oficial DS019
 */
export function getInfraccionByCodigo(codigo: string): InfraccionSunafil | undefined {
  return INFRACCIONES_SUNAFIL.find(i => i.codigo === codigo)
}
