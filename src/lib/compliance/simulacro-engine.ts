/**
 * Simulacro SUNAFIL — Virtual Inspector Engine
 * Simulates a SUNAFIL labor inspection based on R.M. 199-2016-TR protocol
 */

export type InspeccionTipo = 'PREVENTIVA' | 'POR_DENUNCIA' | 'PROGRAMA_SECTORIAL'

export type DocumentoEstado = 'CUMPLE' | 'PARCIAL' | 'NO_CUMPLE' | 'NO_APLICA'

export interface SolicitudInspector {
  id: string
  paso: number
  mensaje: string
  documentoRequerido: string // document type key
  documentoLabel: string
  baseLegal: string
  gravedad: 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
  multaUIT: number
  categoria: 'CONTRATOS' | 'BOLETAS' | 'SST' | 'REGISTROS' | 'BENEFICIOS' | 'POLITICAS'
}

export interface HallazgoInspeccion {
  solicitudId: string
  estado: DocumentoEstado
  mensaje: string
  documentoLabel: string
  baseLegal: string
  gravedad: 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
  multaUIT: number
  multaPEN: number
}

export interface ResultadoSimulacro {
  tipo: InspeccionTipo
  totalSolicitudes: number
  cumple: number
  parcial: number
  noCumple: number
  noAplica: number
  hallazgos: HallazgoInspeccion[]
  multaTotal: number
  multaConSubsanacion: number // 90% discount
  multaConSubsanacionDurante: number // 70% discount
  scoreSimulacro: number // 0-100
  infraccionesLeves: number
  infraccionesGraves: number
  infraccionesMuyGraves: number
}

const UIT = 5500

/**
 * Factor multiplicador de multa según cantidad de trabajadores afectados.
 * D.S. 019-2006-TR, Art. 48 (Cuadro de Escala de Multas)
 */
function getFactorTrabajadores(totalWorkers: number): number {
  if (totalWorkers <= 10) return 1
  if (totalWorkers <= 50) return 5
  if (totalWorkers <= 100) return 10
  if (totalWorkers <= 500) return 20
  return 30
}

/**
 * The 28 document requests a SUNAFIL inspector typically makes,
 * ordered by inspection protocol (R.M. 199-2016-TR)
 */
export function getSolicitudesInspeccion(tipo: InspeccionTipo): SolicitudInspector[] {
  const base: SolicitudInspector[] = [
    // 1. CONTRATOS Y REGISTRO
    { id: 'S-01', paso: 1, mensaje: 'Buenos dias. Soy inspector de SUNAFIL. Necesito revisar los contratos de trabajo de todos sus trabajadores. Por favor, muestreme los contratos firmados.', documentoRequerido: 'contrato_trabajo', documentoLabel: 'Contratos de Trabajo', baseLegal: 'D.Leg. 728, Art. 4', gravedad: 'GRAVE', multaUIT: 1.57, categoria: 'CONTRATOS' },
    { id: 'S-02', paso: 2, mensaje: 'Necesito verificar el registro en T-REGISTRO. Muestreme las constancias de alta de todos los trabajadores.', documentoRequerido: 't_registro', documentoLabel: 'Constancia T-REGISTRO', baseLegal: 'D.S. 018-2007-TR, Art. 4-A', gravedad: 'MUY_GRAVE', multaUIT: 2.63, categoria: 'REGISTROS' },
    { id: 'S-03', paso: 3, mensaje: 'Necesito ver las copias de los DNI de todos los trabajadores registrados en el legajo.', documentoRequerido: 'dni_copia', documentoLabel: 'Copia de DNI', baseLegal: 'D.S. 001-98-TR', gravedad: 'LEVE', multaUIT: 0.23, categoria: 'REGISTROS' },

    // 2. BOLETAS Y REMUNERACIONES
    { id: 'S-04', paso: 4, mensaje: 'Muestreme las boletas de pago de los ultimos 3 meses de todos los trabajadores.', documentoRequerido: 'boleta_pago', documentoLabel: 'Boletas de Pago', baseLegal: 'D.S. 001-98-TR, Art. 18-19', gravedad: 'LEVE', multaUIT: 0.23, categoria: 'BOLETAS' },
    { id: 'S-05', paso: 5, mensaje: 'Necesito las constancias de deposito de CTS del ultimo semestre.', documentoRequerido: 'cts_deposito', documentoLabel: 'Constancia de CTS', baseLegal: 'D.S. 001-97-TR, Art. 21-22', gravedad: 'GRAVE', multaUIT: 1.57, categoria: 'BENEFICIOS' },
    { id: 'S-06', paso: 6, mensaje: 'Muestreme los comprobantes de pago de gratificaciones del ultimo periodo (julio o diciembre).', documentoRequerido: 'gratificacion_pago', documentoLabel: 'Comprobante Gratificacion', baseLegal: 'Ley 27735, Art. 2-3', gravedad: 'GRAVE', multaUIT: 1.57, categoria: 'BENEFICIOS' },

    // 3. PREVISIONAL
    { id: 'S-07', paso: 7, mensaje: 'Necesito verificar las constancias de afiliacion a AFP u ONP de cada trabajador.', documentoRequerido: 'afp_onp_afiliacion', documentoLabel: 'Afiliacion AFP/ONP', baseLegal: 'D.S. 054-97-EF', gravedad: 'MUY_GRAVE', multaUIT: 2.63, categoria: 'REGISTROS' },
    { id: 'S-08', paso: 8, mensaje: 'Muestreme las constancias de aportes a EsSalud del ultimo trimestre.', documentoRequerido: 'essalud_registro', documentoLabel: 'Registro EsSalud', baseLegal: 'Ley 26790, Art. 6', gravedad: 'MUY_GRAVE', multaUIT: 2.63, categoria: 'REGISTROS' },

    // 4. JORNADA Y ASISTENCIA
    { id: 'S-09', paso: 9, mensaje: 'Necesito revisar el registro de control de asistencia de los ultimos 3 meses.', documentoRequerido: 'registro_asistencia', documentoLabel: 'Registro de Asistencia', baseLegal: 'D.S. 004-2006-TR, Art. 1', gravedad: 'GRAVE', multaUIT: 1.57, categoria: 'REGISTROS' },
    { id: 'S-10', paso: 10, mensaje: 'El horario de trabajo esta exhibido en lugar visible? Necesito verificarlo.', documentoRequerido: 'horario_trabajo', documentoLabel: 'Horario de Trabajo exhibido', baseLegal: 'D.S. 004-2006-TR, Art. 5', gravedad: 'LEVE', multaUIT: 0.23, categoria: 'REGISTROS' },

    // 5. VACACIONES
    { id: 'S-11', paso: 11, mensaje: 'Muestreme el registro de vacaciones de todos los trabajadores. Necesito verificar que no haya periodos acumulados.', documentoRequerido: 'registro_vacaciones', documentoLabel: 'Registro de Vacaciones', baseLegal: 'D.Leg. 713, Art. 10-14', gravedad: 'GRAVE', multaUIT: 1.57, categoria: 'BENEFICIOS' },

    // 6. SST — SEGURIDAD Y SALUD
    { id: 'S-12', paso: 12, mensaje: 'Ahora revisaremos Seguridad y Salud en el Trabajo. Muestreme la Politica de SST firmada por la gerencia y exhibida.', documentoRequerido: 'politica_sst', documentoLabel: 'Politica de SST', baseLegal: 'Ley 29783, Art. 22', gravedad: 'GRAVE', multaUIT: 1.57, categoria: 'SST' },
    { id: 'S-13', paso: 13, mensaje: 'Necesito ver la matriz IPERC (Identificacion de Peligros, Evaluacion de Riesgos y Control).', documentoRequerido: 'iperc', documentoLabel: 'Matriz IPERC', baseLegal: 'Ley 29783, Art. 57; R.M. 050-2013-TR', gravedad: 'MUY_GRAVE', multaUIT: 2.63, categoria: 'SST' },
    { id: 'S-14', paso: 14, mensaje: 'Muestreme el Plan Anual de SST aprobado por el Comite o Supervisor.', documentoRequerido: 'plan_anual_sst', documentoLabel: 'Plan Anual SST', baseLegal: 'Ley 29783, Art. 38', gravedad: 'GRAVE', multaUIT: 1.57, categoria: 'SST' },
    { id: 'S-15', paso: 15, mensaje: 'Necesito las actas de conformacion del Comite de SST (o designacion del Supervisor SST si tienen menos de 20 trabajadores).', documentoRequerido: 'comite_sst', documentoLabel: 'Acta Comite/Supervisor SST', baseLegal: 'Ley 29783, Art. 29-30', gravedad: 'GRAVE', multaUIT: 1.57, categoria: 'SST' },
    { id: 'S-16', paso: 16, mensaje: 'Muestreme los registros de las 4 capacitaciones anuales minimas en SST con firmas de asistencia.', documentoRequerido: 'capacitacion_sst', documentoLabel: 'Registros de Capacitacion SST', baseLegal: 'Ley 29783, Art. 35', gravedad: 'GRAVE', multaUIT: 1.57, categoria: 'SST' },
    { id: 'S-17', paso: 17, mensaje: 'Necesito ver los resultados de los examenes medicos ocupacionales (ingreso, periodicos y retiro).', documentoRequerido: 'examen_medico_ingreso', documentoLabel: 'Examenes Medicos Ocupacionales', baseLegal: 'Ley 29783, Art. 49-d', gravedad: 'MUY_GRAVE', multaUIT: 2.63, categoria: 'SST' },
    { id: 'S-18', paso: 18, mensaje: 'Muestreme el registro de entrega de Equipos de Proteccion Personal (EPP) firmado por cada trabajador.', documentoRequerido: 'entrega_epp', documentoLabel: 'Registro de Entrega de EPP', baseLegal: 'Ley 29783, Art. 60', gravedad: 'GRAVE', multaUIT: 1.57, categoria: 'SST' },
    { id: 'S-19', paso: 19, mensaje: 'Necesito ver el registro de induccion SST de los trabajadores nuevos.', documentoRequerido: 'induccion_sst', documentoLabel: 'Registro de Induccion SST', baseLegal: 'Ley 29783, Art. 49-g', gravedad: 'GRAVE', multaUIT: 1.57, categoria: 'SST' },
    { id: 'S-20', paso: 20, mensaje: 'El Mapa de Riesgos esta exhibido en un lugar visible? Necesito verificarlo.', documentoRequerido: 'mapa_riesgos', documentoLabel: 'Mapa de Riesgos', baseLegal: 'D.S. 005-2012-TR, Art. 35-e', gravedad: 'LEVE', multaUIT: 0.23, categoria: 'SST' },
    { id: 'S-21', paso: 21, mensaje: 'Muestreme el registro de accidentes de trabajo e incidentes peligrosos.', documentoRequerido: 'registro_accidentes', documentoLabel: 'Registro de Accidentes', baseLegal: 'Ley 29783, Art. 28; R.M. 050-2013-TR', gravedad: 'GRAVE', multaUIT: 1.57, categoria: 'SST' },

    // 7. POLITICAS OBLIGATORIAS
    { id: 'S-22', paso: 22, mensaje: 'Ahora revisare las politicas obligatorias. Muestreme la politica contra el hostigamiento sexual y el procedimiento de investigacion.', documentoRequerido: 'politica_hostigamiento', documentoLabel: 'Politica contra Hostigamiento Sexual', baseLegal: 'Ley 27942; D.S. 014-2019-MIMP', gravedad: 'MUY_GRAVE', multaUIT: 2.63, categoria: 'POLITICAS' },
    { id: 'S-23', paso: 23, mensaje: 'Necesito verificar el cuadro de categorias y funciones para el cumplimiento de igualdad salarial.', documentoRequerido: 'cuadro_categorias', documentoLabel: 'Cuadro de Categorias (Igualdad Salarial)', baseLegal: 'Ley 30709, Art. 2; D.S. 002-2018-TR', gravedad: 'GRAVE', multaUIT: 1.57, categoria: 'POLITICAS' },

    // 8. DOCUMENTOS COMPLEMENTARIOS
    { id: 'S-24', paso: 24, mensaje: 'Tienen la poliza de seguro vida ley para los trabajadores con mas de 4 anios?', documentoRequerido: 'seguro_vida_ley', documentoLabel: 'Poliza Seguro Vida Ley', baseLegal: 'D.Leg. 688, Art. 1', gravedad: 'GRAVE', multaUIT: 1.57, categoria: 'BENEFICIOS' },
    { id: 'S-25', paso: 25, mensaje: 'Si tienen actividades de riesgo, necesito ver la poliza SCTR vigente.', documentoRequerido: 'sctr_poliza', documentoLabel: 'Poliza SCTR', baseLegal: 'Ley 26790, Art. 19', gravedad: 'MUY_GRAVE', multaUIT: 2.63, categoria: 'SST' },
    { id: 'S-26', paso: 26, mensaje: 'Muestreme las declaraciones juradas de los trabajadores (domicilio, derechohabientes).', documentoRequerido: 'declaracion_jurada', documentoLabel: 'Declaraciones Juradas', baseLegal: 'D.S. 001-98-TR', gravedad: 'LEVE', multaUIT: 0.23, categoria: 'REGISTROS' },
    { id: 'S-27', paso: 27, mensaje: 'Necesito ver la sintesis de la legislacion laboral exhibida en lugar visible.', documentoRequerido: 'sintesis_legislacion', documentoLabel: 'Sintesis Legislacion Laboral', baseLegal: 'D.S. 001-98-TR, Art. 48', gravedad: 'LEVE', multaUIT: 0.23, categoria: 'REGISTROS' },
    { id: 'S-28', paso: 28, mensaje: 'Finalmente, muestreme el Reglamento Interno de Trabajo (obligatorio si tiene 100 o mas trabajadores).', documentoRequerido: 'reglamento_interno', documentoLabel: 'Reglamento Interno de Trabajo', baseLegal: 'D.S. 039-91-TR, Art. 2', gravedad: 'GRAVE', multaUIT: 1.57, categoria: 'POLITICAS' },
  ]

  // For PREVENTIVA, use all 28
  // For POR_DENUNCIA, focus on specific areas (use all but mark as critical)
  // For PROGRAMA_SECTORIAL, focus on SST + contratos
  if (tipo === 'PROGRAMA_SECTORIAL') {
    return base.filter(s => s.categoria === 'SST' || s.categoria === 'CONTRATOS' || s.categoria === 'REGISTROS')
  }

  return base
}

/**
 * Evaluate a single solicitud against the worker documents in the org
 */
export function evaluarSolicitud(
  solicitud: SolicitudInspector,
  documentosOrg: { documentType: string; status: string; category: string }[],
  totalWorkers: number
): HallazgoInspeccion {
  // D.S. 019-2006-TR Art. 48 — escala correcta de multas por tamaño empresarial
  const workerFactor = getFactorTrabajadores(totalWorkers)

  // Check documents: filter matching + check for expired docs
  const matching = documentosOrg.filter(d => d.documentType === solicitud.documentoRequerido)
  const uploaded = matching.filter(d => d.status === 'UPLOADED' || d.status === 'VERIFIED')
  const verified = matching.filter(d => d.status === 'VERIFIED')
  const expired = matching.filter(d => d.status === 'EXPIRED')

  let estado: DocumentoEstado
  let mensaje: string

  if (totalWorkers === 0) {
    estado = 'NO_APLICA'
    mensaje = 'No hay trabajadores registrados para evaluar.'
  } else if (expired.length > 0) {
    // Documentos vencidos = incumplimiento (SCTR, examen médico, etc.)
    estado = 'PARCIAL'
    mensaje = `${expired.length} documento(s) vencido(s) de ${solicitud.documentoLabel}. SUNAFIL lo detectara como infraccion. Renueve antes de la inspeccion.`
  } else if (verified.length >= totalWorkers) {
    // 100% de trabajadores verificados = CUMPLE
    estado = 'CUMPLE'
    mensaje = `Documento verificado. ${verified.length}/${totalWorkers} trabajadores con ${solicitud.documentoLabel} al dia.`
  } else if (uploaded.length > 0) {
    estado = 'PARCIAL'
    const faltantes = totalWorkers - uploaded.length
    mensaje = `Cumplimiento parcial. ${uploaded.length}/${totalWorkers} trabajadores tienen ${solicitud.documentoLabel}. Faltan ${faltantes} trabajador(es).`
  } else {
    estado = 'NO_CUMPLE'
    mensaje = `No se encontro ${solicitud.documentoLabel}. Esto constituye una infraccion ${solicitud.gravedad.replace('_', ' ').toLowerCase()} segun ${solicitud.baseLegal}.`
  }

  return {
    solicitudId: solicitud.id,
    estado,
    mensaje,
    documentoLabel: solicitud.documentoLabel,
    baseLegal: solicitud.baseLegal,
    gravedad: solicitud.gravedad,
    multaUIT: solicitud.multaUIT,
    multaPEN: estado === 'NO_CUMPLE' ? Math.round(solicitud.multaUIT * UIT * workerFactor)
      : estado === 'PARCIAL' ? Math.round(solicitud.multaUIT * UIT * workerFactor * 0.3)
      : 0,
  }
}

/**
 * Generate full simulacro result
 */
export function generarResultadoSimulacro(
  tipo: InspeccionTipo,
  hallazgos: HallazgoInspeccion[]
): ResultadoSimulacro {
  const cumple = hallazgos.filter(h => h.estado === 'CUMPLE').length
  const parcial = hallazgos.filter(h => h.estado === 'PARCIAL').length
  const noCumple = hallazgos.filter(h => h.estado === 'NO_CUMPLE').length
  const noAplica = hallazgos.filter(h => h.estado === 'NO_APLICA').length

  const evaluable = hallazgos.length - noAplica
  const score = evaluable > 0 ? Math.round(((cumple + parcial * 0.5) / evaluable) * 100) : 0

  const multaTotal = hallazgos.reduce((sum, h) => sum + h.multaPEN, 0)

  return {
    tipo,
    totalSolicitudes: hallazgos.length,
    cumple,
    parcial,
    noCumple,
    noAplica,
    hallazgos,
    multaTotal,
    multaConSubsanacion: Math.round(multaTotal * 0.1), // 90% off
    multaConSubsanacionDurante: Math.round(multaTotal * 0.3), // 70% off
    scoreSimulacro: score,
    infraccionesLeves: hallazgos.filter(h => h.gravedad === 'LEVE' && h.estado !== 'CUMPLE' && h.estado !== 'NO_APLICA').length,
    infraccionesGraves: hallazgos.filter(h => h.gravedad === 'GRAVE' && h.estado !== 'CUMPLE' && h.estado !== 'NO_APLICA').length,
    infraccionesMuyGraves: hallazgos.filter(h => h.gravedad === 'MUY_GRAVE' && h.estado !== 'CUMPLE' && h.estado !== 'NO_APLICA').length,
  }
}
