/**
 * ANALIZADOR DE CONTRATOS Y DOCUMENTOS LABORALES
 * Detecta cláusulas ilegales, omisiones obligatorias y riesgos
 * basado en:
 *  - D.S. 003-97-TR (TUO Ley de Fomento al Empleo / D.Leg. 728)
 *  - D.S. 019-2006-TR (infracciones SUNAFIL)
 *  - Jurisprudencia SUNAFIL (TFL - Tribunal de Fiscalización Laboral)
 *  - Ley 29783 (SST)
 *  - Ley 27942 (hostigamiento sexual)
 *  - Ley 30709 (igualdad salarial)
 *  - Ley 32353 (régimen MYPE 2024)
 *
 * Metodología: análisis textual + reglas de detección por patrón
 * El texto del contrato se normaliza y se evalúa contra cada regla.
 */

export type TipoDocumento =
  | 'CONTRATO_INDEFINIDO'
  | 'CONTRATO_PLAZO_FIJO'
  | 'CONTRATO_TIEMPO_PARCIAL'
  | 'CONTRATO_MYPE'
  | 'LOCACION_SERVICIOS'
  | 'REGLAMENTO_INTERNO'
  | 'POLITICA_HOSTIGAMIENTO'
  | 'POLITICA_SST'

export type NivelRiesgo = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO'
export type TipoHallazgo = 'CLAUSULA_ILEGAL' | 'OMISION_OBLIGATORIA' | 'CLAUSULA_RIESGOSA' | 'BUENA_PRACTICA'

export interface HallazgoContrato {
  id: string
  tipo: TipoHallazgo
  nivel: NivelRiesgo
  titulo: string
  descripcion: string
  /** Texto del contrato que activa esta detección (si aplica) */
  fragmentoDetectado?: string
  baseLegal: string
  jurisprudencia?: string
  recomendacion: string
  /** Si SUNAFIL lo penaliza directamente */
  multaSunafil: boolean
  articuloDs019?: string
}

export interface ResultadoAnalisis {
  documentoTipo: TipoDocumento
  scoreCompliance: number           // 0-100
  hallazgos: HallazgoContrato[]
  clausulasIlegales: HallazgoContrato[]
  omisionesCriticas: HallazgoContrato[]
  alertasCriticas: number
  alertasAltas: number
  alertasMedias: number
  resumenEjecutivo: string
  recomendacionesPrioritarias: string[]
}

// ══════════════════════════════════════════════════════════════
// BASE DE CONOCIMIENTO — JURISPRUDENCIA Y REGLAS
// ══════════════════════════════════════════════════════════════

/**
 * Cada regla define:
 * - qué buscar en el texto del contrato
 * - qué detectar (presencia o ausencia de patrones)
 * - el hallazgo a reportar
 */
interface ReglaAnalisis {
  id: string
  documentosTipo: TipoDocumento[]
  /** Detectar cuando el patrón ESTÁ presente (clausula ilegal/riesgosa) */
  detectarPresencia?: RegExp[]
  /** Detectar cuando el patrón NO ESTÁ presente (omisión obligatoria) */
  detectarAusencia?: RegExp[]
  hallazgo: Omit<HallazgoContrato, 'id' | 'fragmentoDetectado'>
}

export const REGLAS_ANALISIS: ReglaAnalisis[] = [

  // ────────────────────────────────────────────────────────────
  // BLOQUE 1 — CLÁUSULAS OBLIGATORIAS (Omisiones)
  // D.S. 003-97-TR Art. 53 — contenido mínimo del contrato
  // ────────────────────────────────────────────────────────────
  {
    id: 'CON-001',
    documentosTipo: ['CONTRATO_INDEFINIDO', 'CONTRATO_PLAZO_FIJO', 'CONTRATO_TIEMPO_PARCIAL', 'CONTRATO_MYPE'],
    detectarAusencia: [/lugar\s+de\s+trabajo|centro\s+de\s+trabajo|sede|establecimiento/i],
    hallazgo: {
      tipo: 'OMISION_OBLIGATORIA',
      nivel: 'ALTO',
      titulo: 'Sin identificación del lugar de trabajo',
      descripcion: 'El contrato debe especificar el lugar o centro de trabajo donde el trabajador prestará servicios. Su ausencia impide determinar el ámbito territorial de la relación laboral.',
      baseLegal: 'D.S. 003-97-TR Art. 53(c) | D.S. 019-2006-TR Art. 25.5',
      jurisprudencia: 'TFL Exp. 0341-2021: La omisión del centro de trabajo en contratos a plazo fijo fue considerada causal de desnaturalización.',
      recomendacion: 'Incluir cláusula: "El trabajador prestará servicios en las instalaciones de [EMPRESA] ubicadas en [DIRECCIÓN COMPLETA], pudiendo ser destacado a otras sedes previa comunicación."',
      multaSunafil: true,
      articuloDs019: '25.5',
    },
  },
  {
    id: 'CON-002',
    documentosTipo: ['CONTRATO_INDEFINIDO', 'CONTRATO_PLAZO_FIJO', 'CONTRATO_TIEMPO_PARCIAL', 'CONTRATO_MYPE'],
    detectarAusencia: [/remuneraci[oó]n|sueldo|salario|s\/\s*[\d,]+|pen\s*[\d,]+/i],
    hallazgo: {
      tipo: 'OMISION_OBLIGATORIA',
      nivel: 'CRITICO',
      titulo: 'Sin monto de remuneración',
      descripcion: 'La remuneración debe estar expresamente establecida en el contrato. Su omisión constituye infracción grave a las relaciones laborales.',
      baseLegal: 'D.S. 003-97-TR Art. 53(d) | D.S. 019-2006-TR Art. 24.4',
      jurisprudencia: 'TFL Exp. 0892-2022: La indeterminación de la remuneración permite al trabajador alegar que percibía la RMV como mínimo garantizado.',
      recomendacion: 'Incluir remuneración mensual exacta en soles: "El empleador abonará al trabajador la suma de S/ [MONTO] mensual como remuneración íntegra."',
      multaSunafil: true,
      articuloDs019: '24.4',
    },
  },
  {
    id: 'CON-003',
    documentosTipo: ['CONTRATO_INDEFINIDO', 'CONTRATO_PLAZO_FIJO', 'CONTRATO_TIEMPO_PARCIAL', 'CONTRATO_MYPE'],
    detectarAusencia: [/fecha\s+de\s+ingreso|inicio\s+de\s+labores|fecha\s+de\s+inicio|vigencia/i],
    hallazgo: {
      tipo: 'OMISION_OBLIGATORIA',
      nivel: 'ALTO',
      titulo: 'Sin fecha de inicio de la relación laboral',
      descripcion: 'Todo contrato debe establecer la fecha de inicio para determinar correctamente los beneficios sociales (CTS, vacaciones, gratificaciones).',
      baseLegal: 'D.S. 003-97-TR Art. 53(a)',
      recomendacion: 'Añadir: "El presente contrato entra en vigencia a partir del [DÍA] de [MES] de [AÑO]."',
      multaSunafil: false,
    },
  },
  {
    id: 'CON-004',
    documentosTipo: ['CONTRATO_INDEFINIDO', 'CONTRATO_PLAZO_FIJO', 'CONTRATO_TIEMPO_PARCIAL', 'CONTRATO_MYPE'],
    detectarAusencia: [/cargo|puesto|funci[oó]n|denominaci[oó]n|categoría|posici[oó]n/i],
    hallazgo: {
      tipo: 'OMISION_OBLIGATORIA',
      nivel: 'ALTO',
      titulo: 'Sin descripción del cargo o puesto',
      descripcion: 'La descripción del cargo es obligatoria y relevante para determinar si el puesto requiere período de prueba especial, confidencialidad, o cargo de dirección y confianza.',
      baseLegal: 'D.S. 003-97-TR Art. 53(b)',
      jurisprudencia: 'TFL Exp. 1204-2023: La falta de descripción de funciones impidió al empleador sustentar el período de prueba extendido.',
      recomendacion: 'Especificar cargo: "El trabajador es contratado para desempeñar el cargo de [CARGO] con las siguientes funciones principales: [LISTA]."',
      multaSunafil: false,
    },
  },
  {
    id: 'CON-005',
    documentosTipo: ['CONTRATO_PLAZO_FIJO'],
    detectarAusencia: [/causa objetiva|motivo|plazo\s+determinado|necesidad\s+del\s+mercado|inicio\s+de\s+actividad|suplencia|reconversi[oó]n|obra\s+determinada|exportaci[oó]n|emergencia/i],
    hallazgo: {
      tipo: 'OMISION_OBLIGATORIA',
      nivel: 'CRITICO',
      titulo: 'Sin causa objetiva en contrato a plazo fijo',
      descripcion: 'Los contratos a plazo fijo (modalidad) DEBEN expresar la causa objetiva de contratación. Sin ella, el contrato se considera de duración indeterminada (desnaturalización automática).',
      baseLegal: 'D.S. 003-97-TR Art. 53, 54 y 72 | D.S. 019-2006-TR Art. 24.3',
      jurisprudencia: 'TFL Exp. 0156-2022 (Sala Plena): La mera mención "por necesidades de la empresa" sin especificación es insuficiente. Debe describirse la circunstancia concreta que justifica la temporalidad. Criterio reiterado en TFL Exp. 0788-2023.',
      recomendacion: 'Incluir cláusula específica: "El presente contrato se celebra bajo la modalidad de [TIPO] al amparo del Art. [N°] del D.S. 003-97-TR, debido a que [DESCRIPCIÓN CONCRETA DE LA CAUSA: ej. incremento de demanda en campaña navideña de oct-dic, o reemplazo de trabajadora en licencia de maternidad]."',
      multaSunafil: true,
      articuloDs019: '24.3',
    },
  },
  {
    id: 'CON-006',
    documentosTipo: ['CONTRATO_PLAZO_FIJO'],
    detectarAusencia: [/fecha\s+de\s+vencimiento|fecha\s+de\s+t[eé]rmino|plazo\s+de\s+duraci[oó]n|duraci[oó]n\s+del\s+contrato|hasta\s+el\s+d[ií]a|concluye\s+el/i],
    hallazgo: {
      tipo: 'OMISION_OBLIGATORIA',
      nivel: 'CRITICO',
      titulo: 'Sin fecha de vencimiento en contrato a plazo fijo',
      descripcion: 'Todo contrato a plazo determinado debe establecer su fecha de vencimiento. Sin ella no es posible invocar la causal de extinción por vencimiento del plazo (Art. 16(c) D.S. 003-97-TR).',
      baseLegal: 'D.S. 003-97-TR Art. 53 y 16(c)',
      jurisprudencia: 'TFL Exp. 0445-2021: La ausencia de plazo expreso genera presunción de contrato indefinido.',
      recomendacion: 'Especificar: "El presente contrato tiene una duración de [N] meses, venciendo el día [FECHA EXACTA]."',
      multaSunafil: true,
      articuloDs019: '24.3',
    },
  },

  // ────────────────────────────────────────────────────────────
  // BLOQUE 2 — CLÁUSULAS ILEGALES (Presencia)
  // Cláusulas que reducen derechos laborales mínimos
  // ────────────────────────────────────────────────────────────
  {
    id: 'CON-007',
    documentosTipo: ['CONTRATO_INDEFINIDO', 'CONTRATO_PLAZO_FIJO', 'CONTRATO_TIEMPO_PARCIAL', 'CONTRATO_MYPE'],
    detectarPresencia: [
      /renuncia\s+a\s+(sus|los|cualquier)\s+(beneficios?|derechos?|CTS|gratificac|vacaciones)/i,
      /no\s+le\s+corresponde\s+(CTS|gratificaci[oó]n|vacaciones|beneficios)/i,
      /sin\s+derecho\s+a\s+(CTS|gratificaci[oó]n|vacaciones|beneficios)/i,
    ],
    hallazgo: {
      tipo: 'CLAUSULA_ILEGAL',
      nivel: 'CRITICO',
      titulo: 'Renuncia a beneficios laborales — NULA DE PLENO DERECHO',
      descripcion: 'Toda cláusula que implique renuncia del trabajador a sus derechos laborales es ABSOLUTAMENTE NULA conforme al Art. 26 de la Constitución y Art. V del T.P. del Código Civil. El empleador no se exime de la obligación aunque el trabajador haya "firmado".',
      baseLegal: 'Art. 26 Constitución Política | D.S. 003-97-TR Art. 62 | Art. V T.P. Código Civil',
      jurisprudencia: 'Casación Laboral N° 1866-2016-Lima: Las cláusulas de renuncia a beneficios son inexistentes y no producen efecto jurídico alguno. TFL Exp. 2341-2022: La suscripción de un "acuerdo de renuncia a gratificaciones" no exime al empleador del pago.',
      recomendacion: 'ELIMINAR INMEDIATAMENTE esta cláusula. Pagar los beneficios devengados no pagados más intereses legales (TAMN). El empleador asume riesgo de demanda por reintegro + daños y perjuicios.',
      multaSunafil: true,
      articuloDs019: '24.10',
    },
  },
  {
    id: 'CON-008',
    documentosTipo: ['CONTRATO_INDEFINIDO', 'CONTRATO_PLAZO_FIJO'],
    detectarPresencia: [
      /período\s+de\s+prueba\s+de\s+(siete|ocho|nueve|diez|once|doce|7|8|9|10|11|12)\s*meses/i,
      /período\s+de\s+prueba.*?\b(2|dos|3|tres|4|cuatro|5|cinco|6|seis|7|siete|8|ocho|9|nueve|10|diez|11|once|12|doce)\s*años/i,
    ],
    hallazgo: {
      tipo: 'CLAUSULA_ILEGAL',
      nivel: 'CRITICO',
      titulo: 'Período de prueba excesivo — ilegal',
      descripcion: 'El período de prueba máximo es 3 meses (trabajador general), 6 meses (cargo de confianza) y 1 año (dirección). Cualquier período mayor es ilegal y se reduce automáticamente al máximo legal, generando estabilidad laboral desde el día 1 del exceso.',
      baseLegal: 'D.S. 003-97-TR Art. 10 y 11',
      jurisprudencia: 'Casación Laboral N° 3009-2019-Lima: El exceso del período de prueba convierte en protegida la relación laboral desde el día 91 para trabajadores generales. TFL Exp. 0934-2022: No es válido pactar períodos de prueba mayores al legal ni siquiera por acuerdo de partes.',
      recomendacion: 'Corregir: Período de prueba = 3 meses (general) | 6 meses (confianza documentada) | 1 año (dirección con poderes acreditados). Eliminar cualquier extensión no justificada.',
      multaSunafil: false,
    },
  },
  {
    id: 'CON-009',
    documentosTipo: ['CONTRATO_INDEFINIDO', 'CONTRATO_PLAZO_FIJO', 'CONTRATO_TIEMPO_PARCIAL'],
    detectarPresencia: [
      /jornada\s+(laboral|de\s+trabajo)\s+de\s+(nueve|diez|once|doce|9|10|11|12)\s+horas\s+diarias/i,
      /\b(50|52|54|56|58|60|62|64|66|68|70|72)\s+horas\s+(semanales|a\s+la\s+semana)/i,
    ],
    hallazgo: {
      tipo: 'CLAUSULA_ILEGAL',
      nivel: 'CRITICO',
      titulo: 'Jornada laboral superior al máximo legal',
      descripcion: 'La jornada máxima legal es 8 horas diarias y 48 horas semanales. Pactar jornadas superiores sin mencionar el pago de horas extras es ilegal y expone al empleador a demandas de pago de horas extras más intereses.',
      baseLegal: 'D.S. 007-2002-TR Art. 1 y 9 | D.S. 019-2006-TR Art. 25.6 | Art. 25 Constitución',
      jurisprudencia: 'TFL Exp. 1567-2022: La mención de una jornada de 50 horas semanales sin sobretasa se consideró evasión de horas extras, generando multa GRAVE.',
      recomendacion: 'Reducir la jornada a 8h/día y 48h/semana, o incluir explícitamente el reconocimiento de horas extras con su sobretasa (25% primeras 2h, 35% siguientes).',
      multaSunafil: true,
      articuloDs019: '25.6',
    },
  },
  {
    id: 'CON-010',
    documentosTipo: ['CONTRATO_INDEFINIDO', 'CONTRATO_PLAZO_FIJO', 'CONTRATO_TIEMPO_PARCIAL'],
    detectarPresencia: [
      /no\s+competencia|competencia\s+desleal|prohibici[oó]n\s+de\s+trabajar/i,
    ],
    hallazgo: {
      tipo: 'CLAUSULA_RIESGOSA',
      nivel: 'ALTO',
      titulo: 'Cláusula de no competencia post-laboral sin compensación',
      descripcion: 'Las cláusulas de no competencia post-laboral en Perú no tienen regulación expresa en el D.Leg. 728. Solo son válidas si: (1) están limitadas en tiempo y geografía, (2) existe una compensación económica equivalente. Sin compensación son inejecutables.',
      baseLegal: 'D.S. 003-97-TR Art. 62 | Art. 168 Constitución | Precedente Casación Laboral N° 4421-2015-Lima',
      jurisprudencia: 'Casación Laboral N° 4421-2015-Lima: Las restricciones post-contractuales solo son válidas con contraprestación económica pactada. Sin ella, el trabajador no está obligado a cumplirla.',
      recomendacion: 'Si es necesaria: (1) Limitar duración máxima a 12 meses, (2) Definir ámbito geográfico y sectorial específico, (3) Pactar una compensación mensual durante el período de restricción.',
      multaSunafil: false,
    },
  },
  {
    id: 'CON-011',
    documentosTipo: ['CONTRATO_INDEFINIDO', 'CONTRATO_PLAZO_FIJO', 'CONTRATO_TIEMPO_PARCIAL'],
    detectarPresencia: [
      /el\s+trabajador\s+reconoce\s+que\s+no\s+existe\s+relaci[oó]n\s+laboral/i,
      /se\s+deja\s+constancia\s+que\s+no\s+hay\s+subordinaci[oó]n/i,
      /las\s+partes\s+acuerdan\s+que\s+no\s+existe\s+v[íi]nculo\s+laboral/i,
    ],
    hallazgo: {
      tipo: 'CLAUSULA_ILEGAL',
      nivel: 'CRITICO',
      titulo: 'Cláusula negando la relación laboral — NULA',
      descripcion: 'Las cláusulas que niegan la existencia del vínculo laboral cuando la realidad demuestra subordinación, horario y lugar fijo son absolutamente nulas. La relación laboral se determina por los hechos, no por lo que las partes declaran.',
      baseLegal: 'Art. 23 Constitución | Principio de Primacía de la Realidad | D.Leg. 728 Art. 4',
      jurisprudencia: 'Jurisprudencia unánime del TC y TFL: El Principio de Primacía de la Realidad prevalece sobre cualquier declaración contractual. TFL Exp. 0234-2023: La mención "sin vínculo laboral" en un contrato de locación con subordinación real fue ignorada.',
      recomendacion: 'ELIMINAR. Si existe subordinación, horario fijo y remuneración fija, hay relación laboral por mandato legal independientemente de lo que diga el contrato.',
      multaSunafil: true,
      articuloDs019: '24.1',
    },
  },
  {
    id: 'CON-012',
    documentosTipo: ['CONTRATO_INDEFINIDO', 'CONTRATO_PLAZO_FIJO', 'CONTRATO_TIEMPO_PARCIAL'],
    detectarPresencia: [
      /descuento.*?(sin\s+consulta|autom[aá]tico|directamente\s+de\s+su\s+remuneraci[oó]n)\s+(?!AFP|ONP|EsSalud)/i,
      /facultad\s+de\s+descontar.*?\bremuneraci[oó]n\b(?!\s+(AFP|ONP|EsSalud|aportes|retenci[oó]n))/i,
    ],
    hallazgo: {
      tipo: 'CLAUSULA_ILEGAL',
      nivel: 'ALTO',
      titulo: 'Descuentos no autorizados sobre la remuneración',
      descripcion: 'Solo pueden hacerse descuentos de la remuneración que estén autorizados expresamente por ley (AFP/ONP, EsSalud, IR de 5ta) o consentidos por escrito por el trabajador en cada ocasión. Los descuentos unilaterales por daños o préstamos sin acuerdo previo son ilegales.',
      baseLegal: 'D.S. 003-97-TR Art. 30(b) | OIT Convenio N° 95',
      jurisprudencia: 'TFL Exp. 1123-2022: Los descuentos automáticos por rotura de equipos sin proceso previo constituyen acto de hostilización equiparable al despido.',
      recomendacion: 'Eliminar la cláusula de descuento automático. Si hay préstamos, formalizar con contrato de mutuo independiente con autorización expresa de descuento en cada período.',
      multaSunafil: false,
    },
  },
  {
    id: 'CON-013',
    documentosTipo: ['CONTRATO_INDEFINIDO', 'CONTRATO_PLAZO_FIJO', 'CONTRATO_TIEMPO_PARCIAL'],
    detectarPresencia: [
      /el\s+empleador\s+podrá\s+modificar\s+(unilateralmente|a\s+su\s+criterio|cuando\s+lo\s+estime)/i,
      /se\s+reserva\s+el\s+derecho\s+de\s+modificar\s+(remuneraci[oó]n|jornada|funciones|cargo)\s+sin\s+(previo\s+aviso|consulta|acuerdo)/i,
    ],
    hallazgo: {
      tipo: 'CLAUSULA_ILEGAL',
      nivel: 'ALTO',
      titulo: 'Facultad unilateral de modificar condiciones esenciales',
      descripcion: 'El empleador NO puede modificar unilateralmente la remuneración, jornada o cargo del trabajador sin su consentimiento. Hacerlo constituye acto de hostilización (Art. 30 D.S. 003-97-TR) que faculta al trabajador a solicitar el pago de beneficios sociales como si fuera despido arbitrario.',
      baseLegal: 'D.S. 003-97-TR Art. 30(b) y (c) | Principio de Intangibilidad de los Beneficios',
      jurisprudencia: 'TFL Exp. 0789-2022: La reducción unilateral de remuneración del 20% fue calificada como acto de hostilización y el empleador pagó indemnización equivalente a despido arbitrario.',
      recomendacion: 'Eliminar. Cualquier modificación de condiciones esenciales requiere acuerdo escrito del trabajador. Para cambios de funciones menores: usar el ius variandi dentro del mismo cargo.',
      multaSunafil: false,
    },
  },
  {
    id: 'CON-014',
    documentosTipo: ['LOCACION_SERVICIOS'],
    detectarPresencia: [
      /subordinaci[oó]n|orden.*?empleador|instrucci[oó]n.*?empleador|supervisor.*?asigna|horario.*?fijo|asistencia\s+obligatoria/i,
    ],
    hallazgo: {
      tipo: 'CLAUSULA_ILEGAL',
      nivel: 'CRITICO',
      titulo: 'Contrato de locación con indicios de relación laboral encubierta',
      descripcion: 'El contrato de locación de servicios menciona elementos típicos de una relación laboral (subordinación, horario fijo, supervisión directa). Esto activa la presunción de relación laboral y puede ser declarado nulo por SUNAFIL, exigiendo pago retroactivo de todos los beneficios desde el inicio.',
      baseLegal: 'Art. 4 D.S. 003-97-TR | Principio de Primacía de la Realidad | D.S. 019-2006-TR Art. 24.1',
      jurisprudencia: 'TFL Exp. 0912-2023 (Criterio uniforme): La presencia de subordinación en contratos de locación genera la presunción de laboralidad. El empleador debe desvirtuar con prueba en contrario. La multa MUY GRAVE aplica por cada trabajador encubierto. Casación Laboral N° 2111-2020-Lima: El control de asistencia digital en locadores fue evidencia clave de relación laboral.',
      recomendacion: 'Si existe subordinación real: CONVERTIR a contrato laboral inmediatamente. Si es genuina locación: eliminar toda referencia a subordinación, horario controlado o supervisión jerárquica.',
      multaSunafil: true,
      articuloDs019: '24.1',
    },
  },

  // ────────────────────────────────────────────────────────────
  // BLOQUE 3 — REGLAMENTO INTERNO DE TRABAJO
  // D.S. 039-91-TR — contenido obligatorio
  // ────────────────────────────────────────────────────────────
  {
    id: 'RIT-001',
    documentosTipo: ['REGLAMENTO_INTERNO'],
    detectarAusencia: [/admisi[oó]n|contrataci[oó]n.*?trabajadores|proceso.*?selecci[oó]n/i],
    hallazgo: {
      tipo: 'OMISION_OBLIGATORIA',
      nivel: 'MEDIO',
      titulo: 'Sin procedimiento de admisión de trabajadores',
      descripcion: 'El Reglamento Interno debe incluir las normas sobre admisión y contratación de trabajadores (Art. 2(a) D.S. 039-91-TR).',
      baseLegal: 'D.S. 039-91-TR Art. 2(a)',
      recomendacion: 'Incluir sección sobre: requisitos de postulación, proceso de selección, documentos a presentar y período de prueba aplicable.',
      multaSunafil: false,
    },
  },
  {
    id: 'RIT-002',
    documentosTipo: ['REGLAMENTO_INTERNO'],
    detectarAusencia: [/falta\s+grave|sanci[oó]n(es)?|amonestaci[oó]n|suspensi[oó]n|despido|disciplinari/i],
    hallazgo: {
      tipo: 'OMISION_OBLIGATORIA',
      nivel: 'ALTO',
      titulo: 'Sin régimen disciplinario',
      descripcion: 'El Reglamento Interno debe establecer el catálogo de faltas y sanciones. Sin ello, el empleador no puede invocar la comisión de falta grave en un despido sin que el trabajador cuestione la proporcionalidad.',
      baseLegal: 'D.S. 039-91-TR Art. 2(d) | D.S. 003-97-TR Art. 25',
      jurisprudencia: 'TFL Exp. 1456-2022: El empleador no pudo acreditar que la conducta estaba tipificada como falta grave en el reglamento, lo que generó el pago de indemnización por despido arbitrario.',
      recomendacion: 'Incluir catálogo de: (1) Faltas leves con amonestación verbal/escrita, (2) Faltas graves con suspensión sin goce de haber, (3) Faltas muy graves que permiten el despido conforme al Art. 25 D.S. 003-97-TR.',
      multaSunafil: false,
    },
  },
  {
    id: 'RIT-003',
    documentosTipo: ['REGLAMENTO_INTERNO'],
    detectarAusencia: [/jornada(s)?\s+de\s+trabajo|horario(s)?\s+de\s+trabajo|turnos|refrigerio|descanso/i],
    hallazgo: {
      tipo: 'OMISION_OBLIGATORIA',
      nivel: 'ALTO',
      titulo: 'Sin descripción de jornadas y horarios',
      descripcion: 'El Reglamento debe precisar la jornada de trabajo, horarios por turno y el tiempo de refrigerio (mínimo 45 minutos, no computable). Su ausencia dificulta la prueba en casos de horas extras.',
      baseLegal: 'D.S. 039-91-TR Art. 2(b) | D.S. 007-2002-TR Art. 13',
      recomendacion: 'Incluir: jornada ordinaria (horas/día y semana), horario por turno, tiempo de refrigerio, y criterios para la asignación de turnos rotativos.',
      multaSunafil: false,
    },
  },
  {
    id: 'RIT-004',
    documentosTipo: ['REGLAMENTO_INTERNO'],
    detectarAusencia: [/hostigamiento\s+sexual|acoso\s+(laboral|sexual)|discriminaci[oó]n/i],
    hallazgo: {
      tipo: 'OMISION_OBLIGATORIA',
      nivel: 'ALTO',
      titulo: 'Sin política de prevención de hostigamiento sexual',
      descripcion: 'El Reglamento Interno debe incluir disposiciones sobre prevención del hostigamiento sexual conforme a la Ley 27942 y su reglamento D.S. 014-2019-MIMP.',
      baseLegal: 'Ley 27942 Art. 7 | D.S. 014-2019-MIMP Art. 8',
      jurisprudencia: 'TFL Exp. 2340-2023: La ausencia de política de hostigamiento en el Reglamento fue considerada factor agravante al determinar la responsabilidad del empleador.',
      recomendacion: 'Incluir: definición de hostigamiento sexual, procedimiento de denuncia, Comité de Intervención (si 20+ trab.), medidas de protección y sanciones.',
      multaSunafil: true,
      articuloDs019: '24.13',
    },
  },
  {
    id: 'RIT-005',
    documentosTipo: ['REGLAMENTO_INTERNO'],
    detectarPresencia: [
      /despido\s+inmediato\s+sin\s+(previo\s+aviso|carta\s+de\s+imputaci[oó]n|proceso|descargo)/i,
      /el\s+empleador\s+podrá\s+prescindir\s+de\s+los\s+servicios\s+sin\s+expresi[oó]n\s+de\s+causa/i,
    ],
    hallazgo: {
      tipo: 'CLAUSULA_ILEGAL',
      nivel: 'CRITICO',
      titulo: 'Despido sin procedimiento legal — cláusula nula',
      descripcion: 'Todo despido por falta grave requiere: (1) Carta de imputación con 6 días de descargo, (2) Evaluación del descargo, (3) Carta de despido motivada. El Reglamento no puede eliminar este procedimiento.',
      baseLegal: 'D.S. 003-97-TR Art. 31 y 32 | Art. 27 Constitución',
      jurisprudencia: 'TFL Exp. 0556-2022: El despido sin carta de imputación fue declarado arbitrario independientemente de la gravedad de la falta. La reglamentación interna no puede suprimir el procedimiento constitucional.',
      recomendacion: 'Sustituir por: "Todo despido por falta grave seguirá el procedimiento establecido en el Art. 31 del D.S. 003-97-TR: carta de imputación, plazo de descargo y carta de despido motivada."',
      multaSunafil: false,
    },
  },

  // ────────────────────────────────────────────────────────────
  // BLOQUE 4 — POLÍTICA DE HOSTIGAMIENTO SEXUAL
  // Ley 27942 + D.S. 014-2019-MIMP
  // ────────────────────────────────────────────────────────────
  {
    id: 'PHS-001',
    documentosTipo: ['POLITICA_HOSTIGAMIENTO'],
    detectarAusencia: [/canal\s+de\s+(denuncia|queja|reporte)|c[oó]mo\s+denunciar|procedimiento\s+de\s+denuncia|libro\s+de\s+reclamaciones/i],
    hallazgo: {
      tipo: 'OMISION_OBLIGATORIA',
      nivel: 'CRITICO',
      titulo: 'Sin canal de denuncias accesible',
      descripcion: 'La política debe incluir el canal de denuncias con datos concretos (email, teléfono, buzón físico o digital) accesible para todos los trabajadores, incluyendo los que laboran de forma remota.',
      baseLegal: 'D.S. 014-2019-MIMP Art. 9 | Ley 27942 Art. 7(2)',
      recomendacion: 'Incluir: email dedicado, persona responsable, horario de atención, opción de denuncia anónima y garantía de confidencialidad.',
      multaSunafil: true,
      articuloDs019: '24.13',
    },
  },
  {
    id: 'PHS-002',
    documentosTipo: ['POLITICA_HOSTIGAMIENTO'],
    detectarAusencia: [/plazo(s)?|d[ií]as\s+(h[aá]biles|calendario)|treinta|quince|cinco|3\s+d[ií]as|30\s+d[ií]as/i],
    hallazgo: {
      tipo: 'OMISION_OBLIGATORIA',
      nivel: 'ALTO',
      titulo: 'Sin plazos del procedimiento de investigación',
      descripcion: 'La política debe establecer los plazos legales: 3 días para medidas de protección, 30 días para la investigación y 5 días para la resolución (D.S. 014-2019-MIMP Art. 16-20).',
      baseLegal: 'D.S. 014-2019-MIMP Art. 16, 17, 18, 19 y 20',
      recomendacion: 'Incluir cronograma: Día 0: recepción → Día 3: medidas de protección → Día 30: conclusión investigación → Día 35: resolución → Día 40: comunicación a las partes.',
      multaSunafil: false,
    },
  },

  // ────────────────────────────────────────────────────────────
  // BLOQUE 5 — CONTRATOS MYPE
  // Ley 32353 (2024) — verificar que se aplica el régimen correcto
  // ────────────────────────────────────────────────────────────
  {
    id: 'MYPE-001',
    documentosTipo: ['CONTRATO_MYPE'],
    detectarPresencia: [/30\s+días\s+de\s+vacaciones|vacaciones\s+anuales\s+de\s+treinta/i],
    hallazgo: {
      tipo: 'CLAUSULA_RIESGOSA',
      nivel: 'MEDIO',
      titulo: 'Vacaciones de 30 días en contrato MYPE',
      descripcion: 'Los trabajadores del régimen MYPE (microempresa y pequeña empresa) tienen derecho solo a 15 días de vacaciones anuales (no 30). Si el contrato MYPE otorga 30 días, se crea un derecho contractual mayor al legal, que no puede reducirse posteriormente.',
      baseLegal: 'Ley 32353 Art. 15 (microempresa) y Art. 23 (pequeña empresa) | D.Leg. 713',
      recomendacion: 'Corregir a 15 días de vacaciones anuales para contratos bajo régimen MYPE. Si quiere otorgar 30 días como beneficio voluntario, asegurarse que es una decisión consciente y consignarla en la política salarial.',
      multaSunafil: false,
    },
  },
  {
    id: 'MYPE-002',
    documentosTipo: ['CONTRATO_MYPE'],
    detectarPresencia: [/CTS|compensaci[oó]n\s+por\s+tiempo\s+de\s+servicios/i],
    hallazgo: {
      tipo: 'CLAUSULA_RIESGOSA',
      nivel: 'MEDIO',
      titulo: 'CTS en contrato de microempresa MYPE',
      descripcion: 'Los trabajadores de MICROEMPRESA no tienen derecho a CTS. Si el contrato la menciona, se crea una obligación contractual. Verificar si aplica el régimen MICRO (sin CTS) o PEQUEÑA (50% CTS).',
      baseLegal: 'Ley 32353 Art. 14 (microempresa: sin CTS) | Art. 22 (pequeña empresa: 50% CTS)',
      recomendacion: 'Verificar el régimen aplicable. Si es microempresa, eliminar la mención de CTS. Si es pequeña empresa, precisar que es el 50% del régimen general.',
      multaSunafil: false,
    },
  },
]

// ══════════════════════════════════════════════════════════════
// MOTOR DE ANÁLISIS
// ══════════════════════════════════════════════════════════════

export function analizarDocumento(
  texto: string,
  tipo: TipoDocumento
): ResultadoAnalisis {
  const textoNorm = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const hallazgos: HallazgoContrato[] = []

  // Evaluar cada regla aplicable al tipo de documento
  for (const regla of REGLAS_ANALISIS) {
    if (!regla.documentosTipo.includes(tipo)) continue

    // Detectar PRESENCIA de patrón problemático
    if (regla.detectarPresencia) {
      for (const patron of regla.detectarPresencia) {
        const match = texto.match(patron) ?? textoNorm.match(new RegExp(patron.source, 'i'))
        if (match) {
          hallazgos.push({
            id: regla.id,
            ...regla.hallazgo,
            fragmentoDetectado: match[0].substring(0, 100),
          })
          break // solo reportar una vez por regla
        }
      }
    }

    // Detectar AUSENCIA de patrón obligatorio
    if (regla.detectarAusencia) {
      const presente = regla.detectarAusencia.some(
        patron => texto.match(patron) || textoNorm.match(new RegExp(patron.source, 'i'))
      )
      if (!presente) {
        hallazgos.push({
          id: regla.id,
          ...regla.hallazgo,
        })
      }
    }
  }

  // Calcular score
  const pesosPorNivel: Record<NivelRiesgo, number> = { CRITICO: 25, ALTO: 10, MEDIO: 5, BAJO: 2 }
  const totalPenalizacion = hallazgos.reduce((s, h) => s + (pesosPorNivel[h.nivel] ?? 0), 0)
  const scoreCompliance = Math.max(0, 100 - totalPenalizacion)

  // Clasificar hallazgos
  const clausulasIlegales = hallazgos.filter(h => h.tipo === 'CLAUSULA_ILEGAL')
  const omisionesCriticas = hallazgos.filter(h => h.tipo === 'OMISION_OBLIGATORIA' && h.nivel === 'CRITICO')

  // Resumen ejecutivo
  const resumenEjecutivo = generarResumen(tipo, hallazgos, scoreCompliance)

  // Recomendaciones prioritarias
  const recomendacionesPrioritarias = hallazgos
    .filter(h => h.nivel === 'CRITICO' || h.nivel === 'ALTO')
    .slice(0, 5)
    .map(h => `[${h.nivel}] ${h.titulo}: ${h.recomendacion.substring(0, 120)}...`)

  return {
    documentoTipo: tipo,
    scoreCompliance,
    hallazgos: hallazgos.sort((a, b) => {
      const order: Record<NivelRiesgo, number> = { CRITICO: 0, ALTO: 1, MEDIO: 2, BAJO: 3 }
      return order[a.nivel] - order[b.nivel]
    }),
    clausulasIlegales,
    omisionesCriticas,
    alertasCriticas: hallazgos.filter(h => h.nivel === 'CRITICO').length,
    alertasAltas: hallazgos.filter(h => h.nivel === 'ALTO').length,
    alertasMedias: hallazgos.filter(h => h.nivel === 'MEDIO').length,
    resumenEjecutivo,
    recomendacionesPrioritarias,
  }
}

function generarResumen(tipo: TipoDocumento, hallazgos: HallazgoContrato[], score: number): string {
  const totalHallazgos = hallazgos.length
  const criticos = hallazgos.filter(h => h.nivel === 'CRITICO').length
  const ilegales = hallazgos.filter(h => h.tipo === 'CLAUSULA_ILEGAL').length

  if (totalHallazgos === 0) {
    return `El documento analizado (${tipo}) no presenta problemas detectables automáticamente. Score de compliance: ${score}/100.`
  }

  const riesgoTexto = score >= 80 ? 'bajo' : score >= 60 ? 'moderado' : score >= 40 ? 'alto' : 'muy alto'

  let resumen = `Análisis de ${tipo.replace(/_/g, ' ').toLowerCase()}: `
  resumen += `Se detectaron ${totalHallazgos} observaciones (${criticos} críticas, ${ilegales} cláusulas ilegales). `
  resumen += `Nivel de riesgo ${riesgoTexto} — Score: ${score}/100. `

  if (ilegales > 0) {
    resumen += `ATENCIÓN: Se detectaron ${ilegales} cláusula(s) que contravienen normas imperativas y son nulas de pleno derecho. `
  }
  if (criticos > 0) {
    resumen += `Requiere corrección inmediata para evitar sanciones SUNAFIL y demandas laborales.`
  }

  return resumen
}

/**
 * Tipos de documentos disponibles para análisis
 */
export const TIPOS_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  CONTRATO_INDEFINIDO: 'Contrato de Trabajo Indefinido',
  CONTRATO_PLAZO_FIJO: 'Contrato a Plazo Fijo (Modalidad)',
  CONTRATO_TIEMPO_PARCIAL: 'Contrato de Tiempo Parcial',
  CONTRATO_MYPE: 'Contrato Régimen MYPE (Ley 32353)',
  LOCACION_SERVICIOS: 'Contrato de Locación de Servicios',
  REGLAMENTO_INTERNO: 'Reglamento Interno de Trabajo',
  POLITICA_HOSTIGAMIENTO: 'Política de Prevención de Hostigamiento Sexual',
  POLITICA_SST: 'Política de Seguridad y Salud en el Trabajo',
}
