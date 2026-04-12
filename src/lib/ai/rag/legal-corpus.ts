/**
 * RAG Legal Corpus — Normativa Laboral Peruana
 *
 * Fragmentos (chunks) de las principales leyes laborales del Perú,
 * organizados por tema. Cada chunk tiene texto + tags para búsqueda rápida.
 *
 * Uso: el Retriever busca los chunks más relevantes para cada consulta
 * y los inyecta en el contexto del LLM antes de generar la respuesta.
 */

export interface LegalChunk {
  id: string
  norma: string          // Nombre corto de la norma
  articulo?: string      // Artículo específico
  titulo: string         // Título del tema
  texto: string          // Contenido legal
  tags: string[]         // Palabras clave para búsqueda
  vigente: boolean
  fechaVigencia?: string
}

export const LEGAL_CORPUS: LegalChunk[] = [
  // ══════════════════════════════════════════════════════════════
  // VALORES DE REFERENCIA 2024/2025
  // ══════════════════════════════════════════════════════════════
  {
    id: 'rmv-2026',
    norma: 'Vigente 2026',
    titulo: 'Remuneración Mínima Vital 2026',
    texto: `La Remuneración Mínima Vital (RMV) asciende a S/ 1,130 mensuales o S/ 37.67 diarios. Ningún trabajador sujeto al régimen laboral de la actividad privada puede percibir una remuneración menor. En caso de jornada inferior a la legal, la remuneración mínima se calcula proporcional a las horas efectivamente laboradas.`,
    tags: ['rmv', 'remuneracion minima', 'sueldo minimo', 'salario minimo', '1130', 'basico'],
    vigente: true,
    fechaVigencia: '2026-01-01',
  },
  {
    id: 'uit-2026',
    norma: 'UIT 2026',
    titulo: 'Unidad Impositiva Tributaria 2026',
    texto: `La Unidad Impositiva Tributaria (UIT) para el año 2026 es de S/ 5,500. La UIT es la referencia para calcular multas SUNAFIL, beneficios tributarios y topes remunerativos.`,
    tags: ['uit', 'unidad impositiva', 'multa', 'referencia', '5500'],
    vigente: true,
    fechaVigencia: '2026-01-01',
  },
  {
    id: 'asig-familiar',
    norma: 'Ley 25129 + D.S. 035-90-TR',
    articulo: 'Art. 1-3',
    titulo: 'Asignación Familiar',
    texto: `Los trabajadores de la actividad privada con vínculo laboral vigente, cuyas remuneraciones no sean reguladas por negociación colectiva, tienen derecho a percibir una Asignación Familiar equivalente al 10% de la RMV vigente, es decir S/ 113 mensuales (con RMV de S/ 1,130). Requisito: tener hijo(s) menor(es) de 18 años, o hasta 24 años si cursan estudios superiores. La asignación familiar es de naturaleza remunerativa.`,
    tags: ['asignacion familiar', 'hijo', 'hijos', 'familia', 'beneficio', '113'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // CONTRATACIÓN — D.S. 003-97-TR (TUO LPCL)
  // ══════════════════════════════════════════════════════════════
  {
    id: 'contrato-indefinido',
    norma: 'D.S. 003-97-TR',
    articulo: 'Art. 4',
    titulo: 'Presunción de contrato laboral a plazo indeterminado',
    texto: `En toda prestación personal de servicios remunerados y subordinados, se presume la existencia de un contrato de trabajo a plazo indeterminado. El contrato individual de trabajo puede celebrarse libremente por tiempo indeterminado o sujeto a modalidad (a plazo fijo). El primero puede celebrarse en forma verbal o escrita. Los contratos a plazo fijo deben constar necesariamente por escrito.`,
    tags: ['contrato indefinido', 'indeterminado', 'permanente', 'subordinacion', 'presuncion'],
    vigente: true,
  },
  {
    id: 'periodo-prueba',
    norma: 'D.S. 003-97-TR',
    articulo: 'Art. 10',
    titulo: 'Período de Prueba',
    texto: `El período de prueba es de tres (3) meses, a cuyo término el trabajador alcanza derecho a la protección contra el despido arbitrario. Las partes pueden pactar un período mayor cuando las labores requieran un período de capacitación o adaptación, o que por su naturaleza o grado de responsabilidad, tal período resulte razonable. En tal caso, los períodos de prueba para trabajadores calificados o de confianza es de seis (6) meses, y para personal de dirección hasta doce (12) meses. La ampliación del período de prueba debe constar por escrito.`,
    tags: ['periodo prueba', 'prueba', '3 meses', '6 meses', '12 meses', 'confianza', 'direccion'],
    vigente: true,
  },
  {
    id: 'contratos-modales',
    norma: 'D.S. 003-97-TR',
    articulo: 'Arts. 53-74',
    titulo: 'Contratos de Trabajo Sujetos a Modalidad',
    texto: `Los contratos de trabajo sujetos a modalidad pueden celebrarse cuando así lo requieran las necesidades del mercado o mayor producción, así como cuando lo exija la naturaleza temporal o accidental del servicio o de la obra. REQUIEREN: (1) Causa objetiva determinante de la contratación, (2) Constar por escrito, (3) Registrarse ante el Ministerio de Trabajo dentro de los 15 días de su celebración. Plazo máximo: 5 años en total para contratos del mismo tipo con el mismo empleador. Superado ese plazo, el contrato se desnaturaliza y se convierte en uno indefinido.

TIPOS:
- Inicio de actividad: hasta 3 años
- Necesidades de mercado: hasta 5 años (renovable una vez por el mismo plazo)
- Reconversión empresarial: hasta 2 años
- Ocasional: hasta 6 meses por año
- Suplencia: duración de la ausencia del titular
- Emergencia: duración de la emergencia
- Obra determinada/servicio específico: duración de la obra/servicio`,
    tags: ['contrato modal', 'plazo fijo', 'temporal', 'causa objetiva', 'desnaturalizacion', 'renovacion', 'mtpe', 'registro'],
    vigente: true,
  },
  {
    id: 'desnaturalizacion',
    norma: 'D.S. 003-97-TR',
    articulo: 'Art. 77',
    titulo: 'Desnaturalización de Contratos Modales',
    texto: `Los contratos de trabajo sujetos a modalidad se considerarán como de duración indeterminada (desnaturalizados) si: a) El trabajador continúa laborando después de la fecha de vencimiento del plazo estipulado, o después de las prórrogas pactadas; b) Cuando se trata de un contrato para obra determinada o de servicio específico, si el trabajador continúa prestando servicios efectivos luego de concluida la obra materia de contrato; c) Si el titular del puesto sustituido, no se reincorpora al vencimiento del plazo indicado en el contrato de trabajo y el trabajador continúa laborando; d) Cuando el trabajador demuestra la existencia de simulación o fraude a las normas establecidas en la presente ley.`,
    tags: ['desnaturalizacion', 'fraude', 'simulacion', 'indeterminado', 'vencimiento'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // JORNADA Y HORARIO
  // ══════════════════════════════════════════════════════════════
  {
    id: 'jornada-trabajo',
    norma: 'D.Leg. 854 + D.S. 007-2002-TR',
    articulo: 'Art. 1-10',
    titulo: 'Jornada de Trabajo — Límites y Horas Extras',
    texto: `La jornada ordinaria de trabajo es de ocho (8) horas diarias o cuarenta y ocho (48) horas semanales como máximo. La jornada de los menores de edad es de cuatro (4) horas diarias para menores de 15 años, y seis (6) horas para menores entre 15 y 18 años.

HORAS EXTRAS (sobretiempo): Las horas trabajadas en exceso a la jornada máxima se pagan con sobretasas: 25% sobre el valor de la hora ordinaria por las dos primeras horas extras, y 35% por las horas restantes. El trabajo en sobretiempo es voluntario tanto en su otorgamiento como en su prestación. Excepción: caso fortuito o fuerza mayor.

TRABAJO NOCTURNO: Entre las 10 p.m. y 6 a.m. La remuneración no puede ser inferior a la RMV más una sobretasa del 35% (RMV nocturna mínima: S/ 1,383.75).

JORNADA PARCIAL: Menos de 4 horas diarias → trabajador no accede a CTS ni vacaciones completas (accede a 15 días).`,
    tags: ['jornada', 'horas extras', 'sobretiempo', '8 horas', '48 horas', 'nocturno', 'parcial', 'tiempo parcial'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // GRATIFICACIONES
  // ══════════════════════════════════════════════════════════════
  {
    id: 'gratificaciones',
    norma: 'Ley 27735 + Ley 29351 + Ley 30334',
    articulo: 'Art. 1-10',
    titulo: 'Gratificaciones Legales — Julio y Diciembre',
    texto: `Los trabajadores sujetos al régimen laboral de la actividad privada tienen derecho a percibir dos gratificaciones por año: una con ocasión de Fiestas Patrias (julio) y otra con ocasión de la Navidad (diciembre). El monto de cada gratificación es equivalente a una (1) remuneración mensual del trabajador.

BASE DE CÁLCULO: Remuneración básica + asignación familiar + otros conceptos remunerativos percibidos regularmente.

PLAZOS DE PAGO: Antes del 15 de julio y antes del 15 de diciembre.

PROPORCIONALIDAD: Si el trabajador no ha laborado todo el semestre, percibe la gratificación proporcional a los meses laborados (incluyendo las fracciones de mes).
Semestre Fiestas Patrias: enero a junio.
Semestre Navidad: julio a diciembre.

INAFECTACIÓN: Desde la Ley 29351 (2009) y confirmado por Ley 30334 (2015), las gratificaciones NO están afectas a aportaciones al SNP (ONP) ni a la AFP. Solo se descuenta Impuesto a la Renta de 5ta categoría si corresponde. El empleador sí paga EsSalud sobre las gratificaciones.`,
    tags: ['gratificacion', 'gratificaciones', 'julio', 'diciembre', 'navidad', 'fiestas patrias', 'sueldo extra', 'bonificacion'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // CTS
  // ══════════════════════════════════════════════════════════════
  {
    id: 'cts',
    norma: 'D.S. 001-97-TR (TUO CTS)',
    articulo: 'Art. 1-50',
    titulo: 'Compensación por Tiempo de Servicios (CTS)',
    texto: `La CTS tiene la calidad de beneficio social de previsión de las contingencias que origina el cese en el trabajo y de promoción del trabajador y su familia. Equivale a 1 remuneración mensual por año de servicios, pagada en dos cuotas semestrales.

DEPÓSITOS:
- Mayo (período nov-abr): depositar hasta el 15 de mayo
- Noviembre (período may-oct): depositar hasta el 15 de noviembre

BASE DE CÁLCULO: Remuneración mensual del trabajador + 1/6 de la gratificación + otros conceptos que tengan naturaleza remunerativa percibidos regularmente.

DEPÓSITO: En la institución financiera elegida por el TRABAJADOR (banco, caja municipal, financiera). El trabajador puede cambiar de entidad depositaria una vez por año.

DISPONIBILIDAD: Desde mayo 2020 (D.U. 038-2020) y normativas posteriores, el trabajador puede retirar hasta ciertos porcentajes. Consultar normativa vigente al momento del cálculo.

LIQUIDACIÓN AL CESE: Al término del vínculo laboral, el empleador abona directamente la CTS del período no depositado, dentro de las 48 horas de producido el cese.

NO APLICA EN: Microempresa (régimen MYPE), trabajadores que perciben ingreso que comprende CTS (locación de servicios, ej. régimen agrario en algunos casos).`,
    tags: ['cts', 'compensacion tiempo servicios', 'deposito', 'mayo', 'noviembre', 'beneficio social', 'cese'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // VACACIONES
  // ══════════════════════════════════════════════════════════════
  {
    id: 'vacaciones',
    norma: 'D.Leg. 713 + D.S. 012-92-TR',
    articulo: 'Art. 1-30',
    titulo: 'Descanso Vacacional',
    texto: `El trabajador tiene derecho a treinta (30) días calendario de descanso vacacional por cada año completo de servicios. Para acceder al derecho vacacional, el trabajador debe cumplir el récord mínimo de asistencia en el año: trabajar 4 días o más a la semana durante el año completo.

REMUNERACIÓN VACACIONAL: Equivale a la remuneración que el trabajador hubiera percibido habitual y ordinariamente en caso de continuar laborando. Se paga antes del inicio del descanso.

PERÍODO VACACIONAL: Se fija de común acuerdo entre empleador y trabajador, salvo que sea determinado unilateralmente por el empleador. La oportunidad del descanso vacacional es fijada de acuerdo con las necesidades del centro de trabajo.

TRONCAL: El trabajador debe disfrutar como mínimo de siete (7) días consecutivos de vacaciones. El saldo puede ser fraccionado con acuerdo de ambas partes.

VACACIONES TRUNCAS: Si el trabajador cesa antes de completar el año de servicios, tiene derecho al pago proporcional de vacaciones (1/12 de la remuneración por cada mes de servicio completo). Mínimo: 1 mes completo de servicios para generar el derecho.

TRIPLE REMUNERACIÓN: Si el empleador no otorga el descanso en el año siguiente al que se generó, debe pagar al trabajador: (a) la remuneración del trabajo realizado, (b) la remuneración del descanso vacacional no gozado y (c) una indemnización equivalente a una remuneración más.

RÉGIMEN MYPE: Vacaciones de 15 días (tanto micro como pequeña empresa).`,
    tags: ['vacaciones', 'descanso', 'dias', '30 dias', '15 dias', 'remuneracion vacacional', 'triple remuneracion'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // UTILIDADES
  // ══════════════════════════════════════════════════════════════
  {
    id: 'utilidades',
    norma: 'D.Leg. 892 + D.S. 009-98-TR',
    articulo: 'Art. 1-10',
    titulo: 'Participación de Trabajadores en Utilidades',
    texto: `Los trabajadores de empresas que desarrollan actividades generadoras de rentas de tercera categoría, con más de veinte (20) trabajadores, tienen derecho a participar en las utilidades de la empresa. Los porcentajes son:
- Empresas pesqueras: 10%
- Empresas de telecomunicaciones: 10%
- Empresas industriales: 10%
- Empresas mineras: 8%
- Empresas de comercio al por mayor y menor: 8%
- Empresas que realizan otras actividades: 5%

DISTRIBUCIÓN: 50% en función de los días laborados, 50% en función de las remuneraciones percibidas.

PLAZO DE PAGO: Dentro de los 30 días naturales siguientes al vencimiento del plazo para la presentación de la Declaración Jurada Anual del Impuesto a la Renta.

TOPE MÁXIMO: 18 remuneraciones mensuales por trabajador.

NO APLICA: Si la empresa tiene 20 o menos trabajadores, o si no generó utilidades (pérdidas o utilidades menores a los porcentajes indicados).`,
    tags: ['utilidades', 'participacion', 'reparto', 'renta', '20 trabajadores', 'porcentaje'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // DESPIDO
  // ══════════════════════════════════════════════════════════════
  {
    id: 'despido-indemnizacion',
    norma: 'D.S. 003-97-TR',
    articulo: 'Art. 34-38',
    titulo: 'Despido Arbitrario — Indemnización',
    texto: `Si el despido es arbitrario por no haberse expresado causa o no poderse demostrar esta en juicio, el trabajador tiene derecho al pago de la indemnización establecida como única reparación por el daño sufrido:

RÉGIMEN GENERAL (Art. 38):
- 1.5 remuneraciones mensuales por cada año completo de servicios
- Máximo: 12 remuneraciones mensuales
- La fracción de año se abona por dozavos y treintavos, según corresponda

RÉGIMEN MYPE MICROEMPRESA:
- 10 días de remuneración por año completo de servicios
- Máximo: 90 días de remuneración

RÉGIMEN MYPE PEQUEÑA EMPRESA:
- 20 días de remuneración por año completo de servicios
- Máximo: 120 días de remuneración

DESPIDO NULO (Art. 29): El trabajador puede optar por la reposición O la indemnización especial (2 remuneraciones por año, máximo 12). Causas: afiliación sindical, candidato a representante, discriminación, embarazo, discapacidad.

PROCEDIMIENTO PARA DESPIDO JUSTIFICADO (Art. 31):
1. Carta de preaviso explicando la falta grave
2. Plazo para descargos: 6 días hábiles (30 días para falta negligencia)
3. Carta de despido (si se confirma la falta)`,
    tags: ['despido', 'indemnizacion', 'arbitrario', 'justo', 'injusto', 'carta', 'falta grave', 'nulo', 'reposicion'],
    vigente: true,
  },
  {
    id: 'faltas-graves',
    norma: 'D.S. 003-97-TR',
    articulo: 'Art. 25',
    titulo: 'Faltas Graves — Causas de Despido Justificado',
    texto: `Falta grave es la infracción por el trabajador de los deberes esenciales que emanan del contrato, de tal índole, que haga irrazonable la subsistencia de la relación. Son faltas graves:

a) El incumplimiento de las obligaciones de trabajo que supone el quebrantamiento de la buena fe laboral, la reiterada resistencia a las órdenes relacionadas con las labores, la reiterada paralización intempestiva de labores y la inobservancia del Reglamento Interno de Trabajo.

b) La disminución deliberada y reiterada en el rendimiento de las labores o del volumen o de la calidad de producción, verificada fehacientemente.

c) La apropiación consumada o frustrada de bienes o servicios del empleador o que se encuentran bajo su custodia, así como la retención o utilización indebidas de los mismos.

d) El uso o entrega a terceros de información reservada del empleador, la sustracción o utilización no autorizada de documentos de la empresa.

e) La concurrencia reiterada en estado de embriaguez o bajo influencia de drogas o sustancias estupefacientes, y aunque no sea reiterada cuando por la naturaleza de la función o del trabajo revista excepcional gravedad.

f) Los actos de violencia, grave indisciplina, injuria y faltamiento de palabra verbal o escrita en agravio del empleador, de sus representantes, del personal jerárquico o de otros trabajadores, sea que se cometan dentro del centro de trabajo o fuera de él.

g) El daño intencional a los edificios, instalaciones, obras, maquinarias, instrumentos, documentación, materias primas y demás bienes de propiedad de la empresa.

h) El abandono de trabajo por más de tres (3) días consecutivos, las ausencias injustificadas por más de cinco (5) días en un período de treinta (30) días calendario o más de quince (15) días en un período de ciento ochenta (180) días.

i) El hostigamiento sexual comprobado.`,
    tags: ['falta grave', 'abandono', 'robo', 'hostigamiento', 'embriaguez', 'ausencias', 'inasistencias', 'despido justificado'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // SST — SEGURIDAD Y SALUD EN EL TRABAJO
  // ══════════════════════════════════════════════════════════════
  {
    id: 'sst-obligaciones',
    norma: 'Ley 29783 + D.S. 005-2012-TR',
    articulo: 'Arts. 26-49',
    titulo: 'SST — Obligaciones del Empleador',
    texto: `El empleador tiene las siguientes obligaciones en materia de Seguridad y Salud en el Trabajo:

POLÍTICA SST: Documentada, específica y apropiada al tamaño y tipo de empresa, que incluya compromisos de protección, mejora continua y cumplimiento de la normativa. Debe ser firmada por la gerencia y difundida a todos los trabajadores.

COMITÉ/SUPERVISOR SST:
- Empresas con 20 o más trabajadores: COMITÉ DE SST obligatorio
  * Composición: igual número de representantes del empleador y trabajadores (mínimo 4 miembros en total)
  * Mandato: 1 año (renovable)
  * Reuniones: mensual (ordinaria), dentro de los 3 días hábiles de producido un accidente (extraordinaria)
- Empresas con menos de 20 trabajadores: SUPERVISOR DE SST (elegido por los trabajadores)

IPERC (Identificación de Peligros, Evaluación y Control de Riesgos):
- Elaborar, actualizar anualmente y cuando cambien las condiciones de trabajo
- Participación obligatoria de los trabajadores
- Medidas preventivas priorizando eliminación > sustitución > controles ingenieriles > administrativos > EPP

REGISTROS OBLIGATORIOS (D.S. 005-2012-TR, Art. 33):
- Accidentes de trabajo, enfermedades ocupacionales e incidentes peligrosos: conservar 20 años
- Exámenes médicos ocupacionales: conservar 5 años
- Monitoreo de agentes físicos, químicos, biológicos: conservar 5 años
- Inspecciones internas de SST: conservar 5 años
- Estadísticas de SST: conservar 10 años
- Equipos de seguridad o emergencia: conservar 5 años
- Inducción, capacitación, entrenamiento, simulacros: conservar 5 años

EXÁMENES MÉDICOS OCUPACIONALES:
- Pre-ocupacional: antes del ingreso al trabajo
- Periódico: durante la relación laboral, según exposición a riesgos
- De retiro: a la terminación del vínculo laboral (si el trabajador lo solicita)

CAPACITACIONES SST: Mínimo 4 capacitaciones por año en materia SST. En horario de trabajo, a cargo del empleador.

PLAN ANUAL DE SST: Elaborar y presentar al Comité/Supervisor para su aprobación.`,
    tags: ['sst', 'seguridad', 'salud', 'comite', 'supervisor', 'iperc', 'accidente', 'examen medico', 'capacitacion', 'politica sst'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // RÉGIMEN MYPE
  // ══════════════════════════════════════════════════════════════
  {
    id: 'regimen-mype',
    norma: 'D.Leg. 1086 + Ley 30056',
    articulo: 'Arts. 41-65',
    titulo: 'Régimen Laboral MYPE — Microempresa y Pequeña Empresa',
    texto: `MICROEMPRESA — hasta 10 trabajadores con ventas anuales hasta 150 UIT:
- Vacaciones: 15 días calendario por año
- CTS: NO APLICA
- Gratificaciones: NO APLICA
- Utilidades: NO APLICA (salvo que superen los 20 trabajadores)
- EsSalud: 9% (ídem régimen general)
- AFP/ONP: ídem régimen general
- Indemnización por despido arbitrario: 10 días de remuneración por año completo de servicios (máximo 90 días de remuneración)
- Asignación familiar: SÍ aplica si corresponde

PEQUEÑA EMPRESA — hasta 100 trabajadores con ventas anuales hasta 1,700 UIT:
- Vacaciones: 15 días calendario por año
- CTS: 15 días de remuneración por año, pagados semestralmente
- Gratificaciones: media remuneración en julio y media en diciembre
- Utilidades: SÍ aplica si más de 20 trabajadores y empresa genera renta de 3ra categoría
- EsSalud: 9% (ídem régimen general)
- AFP/ONP: ídem régimen general
- Indemnización por despido arbitrario: 20 días de remuneración por año completo de servicios (máximo 120 días de remuneración)

ACCESO AL RÉGIMEN: La empresa debe estar inscrita en el REMYPE (Registro Nacional de la Micro y Pequeña Empresa) del MTPE. Si la empresa supera los límites durante 2 años consecutivos, debe migrar al régimen correspondiente.

REMUNERACIÓN MÍNIMA: Igual que el régimen general: S/ 1,130.`,
    tags: ['mype', 'microempresa', 'pequeña empresa', 'remype', 'pyme', 'regimen especial', '10 trabajadores', '100 trabajadores'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // MULTAS SUNAFIL
  // ══════════════════════════════════════════════════════════════
  {
    id: 'multas-sunafil',
    norma: 'D.S. 019-2006-TR (actualizado)',
    titulo: 'Tabla de Multas SUNAFIL',
    texto: `Las multas por infracciones laborales se determinan según la gravedad de la infracción y el número de trabajadores afectados:

MICROEMPRESA (hasta 10 trabajadores):
- Infracción LEVE: 0.10 a 0.50 UIT
- Infracción GRAVE: 0.25 a 5 UIT
- Infracción MUY GRAVE: 0.50 a 8 UIT

PEQUEÑA EMPRESA (11 a 100 trabajadores):
- Infracción LEVE: 0.50 a 5 UIT
- Infracción GRAVE: 1 a 10 UIT
- Infracción MUY GRAVE: 2 a 20 UIT

MEDIANA Y GRAN EMPRESA (más de 100 trabajadores):
- Infracción LEVE: 1 a 10 UIT
- Infracción GRAVE: 5 a 50 UIT
- Infracción MUY GRAVE: 10 a 100 UIT

AGRAVANTES: La reincidencia puede duplicar la sanción.
ATENUANTES: La subsanación voluntaria antes de la sanción permite reducción de hasta 90%.

INFRACCIONES GRAVES más comunes:
- No registrar al trabajador en T-REGISTRO en el plazo legal (antes del inicio de labores)
- No depositar la CTS en los plazos establecidos
- No otorgar vacaciones en el período correspondiente
- No contar con Comité o Supervisor de SST
- No realizar capacitaciones SST
- Contratos modales sin causa objetiva registrada

INFRACCIONES MUY GRAVES más comunes:
- No contar con IPERC actualizado
- No contar con Política de SST
- Contratos modales que superan el plazo máximo (5 años)
- No realizar exámenes médicos pre-ocupacionales
- Diferencias salariales por razón de género`,
    tags: ['multa', 'sunafil', 'sancion', 'inspeccion', 'infraccion', 'uit', 'leve', 'grave', 'muy grave'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // IGUALDAD SALARIAL
  // ══════════════════════════════════════════════════════════════
  {
    id: 'igualdad-salarial',
    norma: 'Ley 30709 + D.S. 002-2018-TR',
    titulo: 'Igualdad Remunerativa entre Hombres y Mujeres',
    texto: `Queda prohibida la discriminación remunerativa entre varones y mujeres. Los empleadores están prohibidos de establecer diferencias remunerativas en función del sexo.

CUADRO DE CATEGORÍAS Y FUNCIONES: Todo empleador debe elaborar y mantener actualizado un cuadro de categorías y funciones y un cuadro de remuneraciones en base a criterios objetivos: calificaciones, habilidades, responsabilidades, condiciones de trabajo y esfuerzo.

MÉTODO DICR: Para determinar si existe una brecha salarial por género, se aplica el Diagnóstico, Identificación de causas, Cierre de brecha y Revisión periódica.

OBLIGACIÓN: El cuadro de categorías y funciones debe ser presentado a la Autoridad Inspectiva de Trabajo cuando lo solicite. Para empresas con más de 100 trabajadores, se requiere auditoría de la brecha salarial.

PLAZO: 6 meses desde el inicio de actividades para implementar el cuadro (1 año para MYPE).

MULTAS: Infracciones a esta ley son consideradas MUY GRAVES, con multas de hasta 200 UIT.`,
    tags: ['igualdad', 'salarial', 'genero', 'brecha', 'mujer', 'discriminacion', 'remuneracion', 'categorias'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // LOCACIÓN DE SERVICIOS
  // ══════════════════════════════════════════════════════════════
  {
    id: 'locacion-servicios',
    norma: 'Código Civil — Arts. 1764-1770',
    titulo: 'Locación de Servicios — Régimen Civil',
    texto: `Por la locación de servicios el locador se obliga, sin estar subordinado al comitente, a prestarle sus servicios por cierto tiempo o para un trabajo determinado, a cambio de una retribución. El plazo máximo de este contrato, en el caso de servicios profesionales, es de seis (6) años, y para otra clase de servicios, de tres (3) años. Si se pacta un plazo mayor, el límite máximo indicado rige para dicho contrato.

DIFERENCIA CON CONTRATO LABORAL: La locación de servicios carece de subordinación (elemento esencial del contrato laboral). El locador es autónomo, no sigue órdenes ni horarios. No genera beneficios sociales.

RIESGO DE DESNATURALIZACIÓN: Si en la práctica existe subordinación (el locador cumple horarios, sigue instrucciones, usa recursos de la empresa, etc.), la relación se considera laboral por el principio de primacía de la realidad. Consecuencia: el empleador deberá pagar todos los beneficios sociales no abonados.

TRIBUTACIÓN: Los servicios de locación tributan como renta de 4ta categoría. Si los ingresos del locador superan S/ 3,712 mensuales, el comitente debe efectuar retención del 8%.`,
    tags: ['locacion servicios', 'recibo honorarios', 'cuarta categoria', 'autonomo', 'independiente', 'subordinacion', 'primacia realidad'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // PRESCRIPCIÓN
  // ══════════════════════════════════════════════════════════════
  {
    id: 'prescripcion-laboral',
    norma: 'Ley 27321',
    articulo: 'Art. 1',
    titulo: 'Prescripción de Acciones Laborales',
    texto: `Las acciones por derechos derivados de la relación laboral prescriben a los cuatro (4) años, contados desde el día siguiente en que se extingue el vínculo laboral. Esto incluye: reclamo de CTS, gratificaciones, vacaciones truncas, horas extras, indemnizaciones por despido, entre otros.

Excepción: Las acciones relativas a accidentes de trabajo y enfermedades profesionales prescriben a los cuatro (4) años, contados desde la fecha en que se produjo el accidente o se diagnosticó la enfermedad.

Para efectos del cómputo, no se considera el tiempo en que el trabajador estuvo imposibilitado de ejercer su acción por causa que le sea imputable.`,
    tags: ['prescripcion', '4 años', 'plazo', 'caducidad', 'reclamo', 'demanda'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // PLANILLA ELECTRÓNICA
  // ══════════════════════════════════════════════════════════════
  {
    id: 'planilla-electronica',
    norma: 'D.S. 018-2007-TR + Ley 31572',
    titulo: 'Planilla Electrónica — T-REGISTRO y PLAME',
    texto: `La Planilla Electrónica comprende dos componentes:

T-REGISTRO (Registro de Trabajadores, Pensionistas, Prestadores de Servicios):
- El empleador debe registrar a cada trabajador ANTES del inicio de sus labores
- Plazo máximo de registro: el día hábil anterior al inicio de labores
- Se actualiza ante modificaciones: cambio de cargo, remuneración, jornada, etc.

PLAME (Planilla Mensual de Pagos — PDT):
- Presentación mensual ante SUNAT
- Fecha límite: según cronograma de vencimientos SUNAT (último dígito del RUC)
- Incluye: trabajadores activos, remuneraciones, descuentos AFP/ONP, EsSalud, etc.

BOLETAS DE PAGO ELECTRÓNICAS (Ley 31572, vigente desde 2021):
- Obligatorias para todos los empleadores
- Entrega: dentro de los 3 días hábiles siguientes al pago de la remuneración
- Formato: debe incluir todos los conceptos remunerativos y descuentos
- Conservación: 5 años mínimo

INFRACCIONES COMUNES:
- No registrar en T-REGISTRO antes del inicio: INFRACCIÓN GRAVE
- No presentar PLAME en el plazo: multa según cronograma SUNAT
- No entregar boleta de pago: INFRACCIÓN LEVE (puede llegar a grave por reincidencia)`,
    tags: ['planilla', 'boleta', 'plame', 't-registro', 'sunat', 'electronica', 'registro', 'nomina'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // HOSTIGAMIENTO SEXUAL
  // ══════════════════════════════════════════════════════════════
  {
    id: 'hostigamiento-sexual',
    norma: 'Ley 27942 (mod. Ley 29430 y D.Leg. 1410)',
    articulo: 'Arts. 1-30',
    titulo: 'Hostigamiento Sexual — Definición, Tipos y Obligaciones del Empleador',
    texto: `El hostigamiento sexual es la conducta de naturaleza sexual o sexista no deseada por quien la recibe, que puede crear un ambiente intimidatorio, hostil o humillante, o que puede afectar su actividad o situación laboral, docente, formativa o de cualquier otra índole.

TIPOS:
- Hostigamiento vertical: entre personas con diferente jerarquía (superior a subordinado).
- Hostigamiento horizontal: entre personas con la misma jerarquía.
- Hostigamiento ambiental: cuando la conducta crea un entorno de trabajo intimidatorio, hostil u ofensivo.

MANIFESTACIONES MÁS COMUNES:
- Solicitudes o favores sexuales, formulados directamente o por intermedio de terceros.
- Exhibición de imágenes o materiales de contenido sexual.
- Comentarios e insinuaciones de carácter sexual.
- Acercamientos corporales u otras conductas físicas de naturaleza sexual.
- Represalias por rechazar las conductas descritas.

OBLIGACIONES DEL EMPLEADOR (mínimo legal):
1. Elaborar y aprobar una Política interna de prevención y sanción del hostigamiento sexual.
2. Establecer un Canal de Denuncia confidencial (formulario físico o virtual, buzón de quejas, etc.).
3. Constituir un Comité de Intervención frente al Hostigamiento Sexual (COMIHS) si tiene 20 o más trabajadores; o designar un responsable si tiene menos de 20.
4. Investigar las denuncias en un plazo de 30 días hábiles.
5. Aplicar las medidas de protección y sanción correspondientes.
6. Conservar la confidencialidad de la identidad del denunciante y del denunciado.

MULTAS: Omitir las obligaciones del empleador es infracción muy grave (hasta 100 UIT para gran empresa).`,
    tags: ['hostigamiento sexual', 'acoso sexual', 'comite intervencion', 'comihs', 'denuncias', 'canal denuncia', 'ley 27942'],
    vigente: true,
  },
  {
    id: 'hostigamiento-procedimiento',
    norma: 'D.S. 014-2019-MIMP + D.Leg. 1410',
    articulo: 'Arts. 1-25',
    titulo: 'Hostigamiento Sexual — Procedimiento de Investigación y Sanciones',
    texto: `PLAZOS DEL PROCEDIMIENTO (Art. 8-20 D.S. 014-2019-MIMP):
1. Presentación de denuncia: ante el COMIHS o responsable designado.
2. Medidas de protección: en máximo 3 días hábiles de recibida la denuncia (cambio de área, suspensión temporal con goce de haber, etc.).
3. Investigación: plazo de 30 días hábiles para concluir la investigación.
4. Descargo del investigado: 5 días hábiles para presentar sus descargos.
5. Informe final: el COMIHS emite informe con recomendación de sanción al empleador.
6. Decisión del empleador: dentro de los 5 días hábiles de recibido el informe.

SANCIONES AL HOSTIGADOR:
- Amonestación (falta leve).
- Suspensión sin goce de haber (falta grave).
- Despido justificado (falta muy grave — hostigamiento comprobado es causal de despido Art. 25-i LPCL).

MEDIDAS DE PROTECCIÓN a favor del denunciante (no exhaustivo):
- Rotación del hostigador o del denunciante (a pedido de este último).
- Impedimento de acercamiento del hostigador al denunciante.
- Licencia con goce de haber.

PROHIBICIÓN DE REPRESALIAS: Toda represalia contra el denunciante está prohibida y constituye infracción grave adicional.

DENUNCIAS FALSAS: Si se acredita mala fe del denunciante, este puede ser sancionado conforme al reglamento interno.`,
    tags: ['hostigamiento procedimiento', 'comihs', 'investigacion', 'sancion hostigamiento', 'despido hostigamiento', 'medidas proteccion', 'plazos hostigamiento'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // INSPECCIÓN DEL TRABAJO
  // ══════════════════════════════════════════════════════════════
  {
    id: 'inspeccion-trabajo',
    norma: 'Ley 28806 + D.S. 019-2007-TR',
    articulo: 'Arts. 1-50',
    titulo: 'Inspección del Trabajo — SUNAFIL: Procedimiento y Derechos del Empleador',
    texto: `SUNAFIL (Superintendencia Nacional de Fiscalización Laboral) es el organismo público adscrito al MTPE que ejecuta las inspecciones del trabajo a nivel nacional.

TIPOS DE ACTUACIONES INSPECTORAS:
1. Actuaciones de investigación o comprobatoria: verifican si se cumplen las obligaciones laborales.
2. Actuaciones de consulta o asesoramiento: orientan al empleador sobre el cumplimiento.
3. Actuaciones de advertencia y requerimiento: cuando se constata una infracción subsanable.

PROCEDIMIENTO DE INSPECCIÓN:
- El inspector puede acceder al centro de trabajo sin necesidad de previo aviso.
- Debe identificarse con su credencial oficial.
- El empleador tiene el deber de colaborar y proporcionar la documentación solicitada.
- Si se constatan infracciones, el inspector emite un ACTA DE INFRACCIÓN.
- El empleador puede presentar DESCARGOS en el plazo que otorgue el acta.

DESCUENTOS POR SUBSANACIÓN (Art. 40 Ley 28806):
- Subsanación antes del inicio del procedimiento sancionador: reducción del 90%.
- Subsanación durante el procedimiento, antes de la resolución: reducción según criterio del inspector.
- Reincidencia: se pierde el beneficio de reducción.

DERECHOS DEL EMPLEADOR INSPECCIONADO:
- Asistencia letrada durante la inspección.
- Presentar descargos y pruebas.
- Impugnar el Acta de Infracción ante el mismo inspector y luego ante el Tribunal de Fiscalización Laboral.

DOCUMENTOS QUE SUELE SOLICITAR SUNAFIL:
Registro de asistencia, contratos de trabajo, liquidaciones de CTS, boletas de pago (últimos 12 meses), planilla, IPERC, registros SST, certificados médicos, reglamento interno.`,
    tags: ['inspeccion', 'sunafil', 'inspector', 'acta infraccion', 'descargos', 'subsanacion', 'fiscalizacion', 'ley 28806'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // RÉGIMEN AGRARIO
  // ══════════════════════════════════════════════════════════════
  {
    id: 'regimen-agrario',
    norma: 'Ley 31110 + D.S. 005-2021-MIDAGRI',
    articulo: 'Arts. 1-45',
    titulo: 'Régimen Laboral Agrario — Ley del Trabajador Agrario 2021',
    texto: `La Ley 31110 (vigente desde enero 2021) deroga el D.Leg. 885 y establece el nuevo régimen laboral para el sector agrario y agroexportador.

REMUNERACIÓN DIARIA AGRARIA (RDA):
La remuneración diaria no puede ser inferior a la RDA establecida, que incluye la remuneración básica más beneficios como CTS, gratificación y vacaciones incorporados. Para 2026, la RDA se calcula como:
- RDA básica = RMV (S/ 1,130) ÷ 30 = S/ 37.67 diarios
- Sobre la RDA se aplica la tasa de beneficios sociales correspondiente.

BENEFICIOS:
- CTS: 9.72% de la remuneración diaria (incluida en la RDA si así se pacta).
- Gratificación: 16.66% de la remuneración mensual.
- Vacaciones: 30 días calendario por año (igual que el régimen general).
- Asignación familiar: sí aplica.
- EsSalud: 9% a cargo del empleador.

CONTRATOS: Pueden ser indefinidos, a plazo fijo, por temporada o eventual.

REGISTRO: Los empleadores agrarios deben inscribirse en el Registro Nacional de Empleadores Agrarios (RENEA) del MIDAGRI.

SUNAFIL AGRARIO: Existe fiscalización especializada para el sector agrario.

DIFERENCIA CON LA LEY ANTERIOR: La ley anterior (D.Leg. 885 modificado) no reconocía los 30 días de vacaciones ni garantizaba la misma protección. La Ley 31110 equipara gradualmente los beneficios al régimen general.`,
    tags: ['agrario', 'agro', 'agroexportacion', 'regimen agrario', 'rda', 'trabajador campo', 'ley 31110'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // TELETRABAJO
  // ══════════════════════════════════════════════════════════════
  {
    id: 'teletrabajo',
    norma: 'Ley 31572 + D.S. 002-2023-TR',
    articulo: 'Arts. 1-25',
    titulo: 'Teletrabajo — Obligaciones del Empleador',
    texto: `El teletrabajo es la modalidad de trabajo que consiste en el desempeño subordinado de labores sin la presencia física del trabajador, mediante la utilización de medios informáticos, de telecomunicaciones y análogos, a través de los cuales a su vez se ejerce el control y supervisión de las labores.

CONDICIONES MÍNIMAS:
1. El acuerdo de teletrabajo debe constar por escrito (adenda al contrato o contrato desde el inicio).
2. El empleador debe proporcionar los equipos, herramientas y medios necesarios para el desempeño de funciones (salvo acuerdo distinto por escrito para que el trabajador use sus propios equipos, con compensación).
3. El empleador debe compensar los gastos de servicios de internet y electricidad atribuibles al trabajo.
4. La jornada de trabajo en teletrabajo es la misma que en modalidad presencial.
5. El empleador debe garantizar el DERECHO A LA DESCONEXIÓN DIGITAL: el trabajador tiene derecho a no conectarse ni responder comunicaciones fuera de su jornada laboral. Las empresas de más de 20 trabajadores deben elaborar una política de desconexión digital.

REVERSIBILIDAD: Tanto el empleador como el trabajador pueden solicitar la reversión a la modalidad presencial, con un preaviso de 30 días.

SST EN TELETRABAJO: El empleador debe aplicar las normas de SST en el lugar donde el trabajador desempeña sus labores. Debe enviar una lista de verificación de seguridad ergonómica al trabajador.

REGISTRO: El empleador debe actualizar el T-REGISTRO informando la modalidad de teletrabajo.`,
    tags: ['teletrabajo', 'trabajo remoto', 'home office', 'desconexion digital', 'equipo', 'internet', 'ley 31572'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // MODALIDADES FORMATIVAS
  // ══════════════════════════════════════════════════════════════
  {
    id: 'modalidades-formativas',
    norma: 'Ley 28518 + D.S. 007-2005-TR',
    articulo: 'Arts. 1-55',
    titulo: 'Modalidades Formativas Laborales — Practicantes y Aprendices',
    texto: `Las modalidades formativas NO constituyen relación laboral. No generan beneficios sociales (CTS, gratificaciones, utilidades). Buscan complementar la formación académica con experiencia práctica.

TIPOS PRINCIPALES:

1. APRENDIZAJE CON PREDOMINIO EN LA EMPRESA (Aprendices del SENATI/SENCICO):
   - Subvención mensual mínima: RMV vigente (S/ 1,130).
   - EsSalud: 9% por el empleador.
   - Seguro contra accidentes: obligatorio (SCTR o similar).
   - Plazo: según el programa formativo.

2. PRÁCTICA PRE-PROFESIONAL (estudiantes universitarios o institutos):
   - Subvención mensual mínima: ½ RMV (S/ 565).
   - EsSalud: no aplica, pero sí seguro contra accidentes (SCTR equivalente).
   - Plazo máximo: no tiene límite legal fijo, pero debe corresponder al ciclo formativo.

3. PRÁCTICA PROFESIONAL (egresados):
   - Subvención mensual mínima: RMV vigente.
   - EsSalud: 9%.
   - Plazo máximo: 12 meses.

LÍMITE DE PERSONAL FORMATIVO: Hasta el 20% de la planilla regular del empleador.

REGISTRO: El convenio de modalidad formativa debe ser registrado en el MTPE dentro de los 15 días de su celebración.

DESNATURALIZACIÓN: Si el practicante realiza actividades que corresponden a una plaza existente en el organigrama, o si el acuerdo supera los plazos o porcentajes permitidos, la relación se desnaturaliza y genera derechos laborales completos.`,
    tags: ['practicante', 'practica profesional', 'modalidad formativa', 'aprendiz', 'sencico', 'senati', 'egresado', 'universidad', 'subvencion'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // PERSONAS CON DISCAPACIDAD
  // ══════════════════════════════════════════════════════════════
  {
    id: 'discapacidad-laboral',
    norma: 'Ley 29973 + D.S. 002-2014-MIMP',
    articulo: 'Arts. 45-60',
    titulo: 'Personas con Discapacidad — Cuota de Empleo y Ajustes Razonables',
    texto: `CUOTA DE EMPLEO OBLIGATORIA:
- Sector privado: empresas con más de 50 trabajadores deben contratar al menos el 3% de personas con discapacidad.
- Sector público: entidades con más de 50 trabajadores deben contratar al menos el 5%.

AJUSTES RAZONABLES: El empleador está obligado a realizar ajustes razonables en el lugar de trabajo para que la persona con discapacidad pueda desempeñar sus funciones (sin que ello represente una carga desproporcionada).

BENEFICIOS TRIBUTARIOS PARA EL EMPLEADOR:
- Deducción adicional del 50% de las remuneraciones pagadas a personas con discapacidad para efectos del Impuesto a la Renta.
- Si la productividad del trabajador con discapacidad es menor, el empleador puede solicitar al MTPE una bonificación del 30% de su salario mensual.

INFORME DE CUOTA: Los empleadores con más de 50 trabajadores deben presentar anualmente al MTPE (antes de 31 de marzo) un informe sobre el cumplimiento de la cuota de empleo.

PROHIBICIÓN DE DISCRIMINACIÓN: Se prohíbe todo acto discriminatorio que afecte el acceso al empleo, la remuneración, la promoción o la terminación del vínculo laboral de personas con discapacidad.

MULTAS: El incumplimiento de la cuota de empleo es infracción grave (hasta 50 UIT).`,
    tags: ['discapacidad', 'cuota empleo', '3%', '5%', 'ajuste razonable', 'inclusion laboral', 'ley 29973'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // SCTR — SEGURO COMPLEMENTARIO DE TRABAJO DE RIESGO
  // ══════════════════════════════════════════════════════════════
  {
    id: 'sctr',
    norma: 'D.S. 003-98-SA + Ley 26790',
    articulo: 'Arts. 1-20',
    titulo: 'SCTR — Seguro Complementario de Trabajo de Riesgo',
    texto: `El Seguro Complementario de Trabajo de Riesgo (SCTR) cubre los riesgos de invalidez, muerte y gastos de sepelio derivados de accidentes de trabajo y enfermedades profesionales, para trabajadores que realizan actividades de ALTO RIESGO.

OBLIGADOS A CONTRATAR SCTR:
Empleadores cuya actividad se encuentra en el Listado de Actividades de Alto Riesgo (Anexo 5 D.S. 003-98-SA). Incluye: construcción civil, minería, pesca, industria metálica, transporte de carga pesada, manipulación de sustancias tóxicas, entre otras.

COMPONENTES:
1. SCTR Salud: cubre atención médica, farmacéutica y hospitalaria. Puede contratarse con EsSalud o con una EPS.
2. SCTR Pensión: cubre invalidez permanente, sobrevivencia y sepelio. Debe contratarse con una AFP o compañía de seguros.

PRESTACIONES:
- Accidente de trabajo: subsidio por incapacidad temporal (100% del salario), pensión de invalidez y gastos de sepelio.
- Enfermedad profesional: según la causa y el diagnóstico.

OBLIGACIÓN DEL EMPLEADOR: Contratar y mantener vigente el SCTR para TODOS los trabajadores expuestos a riesgos (incluyendo los que trabajan en los centros de trabajo de terceros contratistas, si realizan actividades de alto riesgo).

INCUMPLIMIENTO: Si el trabajador sufre un siniestro y no cuenta con SCTR, el empleador asume directamente todas las prestaciones económicas y médicas.`,
    tags: ['sctr', 'seguro complementario', 'alto riesgo', 'accidente trabajo', 'enfermedad profesional', 'invalidez', 'sepelio'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // ESSALUD Y SEGURIDAD SOCIAL
  // ══════════════════════════════════════════════════════════════
  {
    id: 'essalud-seguridad-social',
    norma: 'Ley 26790 + D.S. 009-97-SA',
    articulo: 'Arts. 1-40',
    titulo: 'EsSalud — Seguro Regular de Salud: Tasas y Derechos',
    texto: `EsSalud (Seguro Social de Salud) es la entidad pública descentralizada encargada de brindar prestaciones de salud, económicas y sociales.

APORTES AL SEGURO REGULAR:
- Tasa: 9% de la remuneración mensual del trabajador.
- A cargo del EMPLEADOR (no se descuenta al trabajador en el régimen general).
- Base mínima: RMV (S/ 1,130). Aunque el trabajador gane menos, el aporte mínimo se calcula sobre la RMV.
- No tiene límite máximo.

DERECHO A COBERTURA:
- El trabajador y sus derechohabientes (cónyuge/conviviente e hijos menores de 18 años) tienen derecho a prestaciones médicas.
- Período de carencia: 3 meses de aportación continua (o 4 no continuos en el último año).
- Trabajadores de construcción civil: el empleador paga el 9% sobre el jornal diario.

PRESTACIONES ECONÓMICAS:
- Subsidio por incapacidad temporal (enfermedad): 70% de la remuneración desde el 21° día de incapacidad (los primeros 20 días los paga el empleador).
- Subsidio por maternidad: 100% de la remuneración por 98 días (49 pre-natal + 49 post-natal).
- Subsidio por lactancia: S/ 820 (pago único).
- Subsidio por sepelio: hasta S/ 2,070.

SUBSIDIO POR MATERNIDAD EXTENDIDO: En caso de parto múltiple, se amplía 30 días. En caso de discapacidad del hijo, se amplía 30 días adicionales.`,
    tags: ['essalud', 'seguro salud', '9%', 'aporte salud', 'subsidio', 'maternidad', 'incapacidad', 'seguridad social'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // MATERNIDAD Y LACTANCIA
  // ══════════════════════════════════════════════════════════════
  {
    id: 'maternidad-lactancia',
    norma: 'Ley 26644 + Ley 27240 + Ley 28731 + Ley 29992',
    articulo: 'Arts. 1-10',
    titulo: 'Protección de la Maternidad y Lactancia Materna',
    texto: `DESCANSO PRE-NATAL Y POST-NATAL:
- La trabajadora gestante tiene derecho a 49 días de descanso pre-natal y 49 días de descanso post-natal.
- La trabajadora puede diferir el descanso pre-natal, parcial o totalmente, y acumularlo al post-natal.
- En caso de parto múltiple o de nacimiento prematuro, el descanso post-natal se amplía en 30 días adicionales.
- El costo del subsidio por maternidad está a cargo de EsSalud.

PROTECCIÓN CONTRA EL DESPIDO:
- Es nulo el despido que tenga como motivo el embarazo, el nacimiento y sus consecuencias o la lactancia (Art. 29 LPCL).
- Se presume que el despido es nulo si se produce en cualquier momento de la gestación y hasta 90 días después del parto, siempre que el empleador haya sido informado del estado de gestación.
- La trabajadora puede demandar reposición o la indemnización especial por despido nulo.

LACTANCIA MATERNA (Ley 27240):
- La madre trabajadora tiene derecho a una hora diaria de permiso por lactancia materna hasta que el hijo cumpla 1 año de edad.
- Esta hora puede fraccionarse a solicitud de la trabajadora.
- El permiso de lactancia no puede ser compensado ni sustituido por otros beneficios.

LICENCIA POR PATERNIDAD (Ley 29409):
- El padre trabajador tiene derecho a 10 días de licencia con goce de haber por el nacimiento de su hijo (20 días para partos múltiples o por cesárea).`,
    tags: ['maternidad', 'lactancia', 'embarazo', 'descanso prenatal', 'postnatal', 'despido nulo embarazo', 'licencia paternidad', 'parto'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // SEGURO DE VIDA LEY
  // ══════════════════════════════════════════════════════════════
  {
    id: 'seguro-vida-ley',
    norma: 'D.Leg. 688 + Ley 29549',
    articulo: 'Arts. 1-15',
    titulo: 'Seguro de Vida Ley — Obligación del Empleador',
    texto: `El Seguro de Vida Ley es un seguro de vida que el empleador debe contratar en beneficio de sus trabajadores a partir del cuarto (4°) año de servicios.

OBLIGACIÓN: A partir de los 4 años de servicios continuos, el empleador está obligado a contratar un Seguro de Vida Ley a favor del trabajador. Antes de los 4 años, puede contratarlo de manera facultativa.

BENEFICIARIOS: El trabajador puede designar libremente a sus beneficiarios. A falta de designación, el seguro favorece al cónyuge o conviviente, y a los hijos menores o incapaces.

PRESTACIONES MÍNIMAS:
- Por muerte natural: 16 remuneraciones mensuales.
- Por muerte accidental: 32 remuneraciones mensuales.
- Por invalidez total y permanente por accidente: 32 remuneraciones mensuales.

BASE DE CÁLCULO DE LA PRIMA: La prima se calcula sobre la última remuneración mensual del trabajador.

A CARGO DEL EMPLEADOR: El costo de la prima está 100% a cargo del empleador. No se puede descontar al trabajador.

CONSECUENCIA DEL INCUMPLIMIENTO: Si el trabajador fallece o sufre una invalidez y el empleador no contrató el seguro, este debe pagar directamente a los beneficiarios el equivalente a las prestaciones que debería haber cubierto el seguro.`,
    tags: ['seguro vida', 'seguro vida ley', '4 años', 'fallecimiento', 'invalidez', 'beneficiarios', 'dlg 688'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // TERCERIZACIÓN LABORAL
  // ══════════════════════════════════════════════════════════════
  {
    id: 'tercerizacion',
    norma: 'D.Leg. 1038 + D.S. 006-2008-TR',
    articulo: 'Arts. 1-10',
    titulo: 'Tercerización de Servicios — Requisitos y Responsabilidad Solidaria',
    texto: `La tercerización consiste en que una empresa principal encarga a una empresa tercerizadora (contratista) la ejecución de una o varias partes del proceso productivo o de servicios, asumiendo la empresa tercerizadora plena autonomía técnica, económica y funcional en la prestación del servicio.

REQUISITOS PARA QUE SEA LEGÍTIMA:
1. La empresa tercerizadora debe tener autonomía técnica y económica.
2. Debe asumir los riesgos propios de su actividad.
3. Los trabajadores de la tercerizadora no pueden estar subordinados a la empresa principal.
4. Debe contar con equipos y capital propios.
5. No puede ser una tercerización de simple provisión de mano de obra.

REGISTRO OBLIGATORIO: Las empresas tercerizadoras deben registrarse ante el MTPE (Registro Nacional de Empresas Tercerizadoras) antes de iniciar actividades.

RESPONSABILIDAD SOLIDARIA: La empresa principal es solidariamente responsable por las obligaciones laborales y previsionales que la empresa tercerizadora tenga con sus trabajadores desplazados, en caso de incumplimiento de la tercerizadora.

DESNATURALIZACIÓN: Si se verifica que la tercerización es en realidad una provisión de mano de obra sin autonomía técnica (tercerización fraudulenta), los trabajadores adquieren derechos laborales como si fueran empleados directos de la empresa principal.`,
    tags: ['tercerizacion', 'outsourcing', 'contratista', 'empresa principal', 'responsabilidad solidaria', 'autonomia', 'provision mano obra'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // INTERMEDIACIÓN LABORAL
  // ══════════════════════════════════════════════════════════════
  {
    id: 'intermediacion-laboral',
    norma: 'Ley 27626 + D.S. 008-2007-TR',
    articulo: 'Arts. 1-25',
    titulo: 'Intermediación Laboral — Empresas de Servicios y Cooperativas',
    texto: `La intermediación laboral consiste en la provisión de mano de obra por parte de una Empresa de Servicios Especiales (ESE) o Cooperativa de Trabajadores a una empresa usuaria.

ACTIVIDADES PERMITIDAS:
- Servicios temporales: para labores temporales de la empresa usuaria (máximo 6 meses, prorrogable por 6 más, total 1 año).
- Servicios complementarios: actividades que no son propias del giro del negocio (vigilancia, limpieza, mensajería, mantenimiento).
- Servicios especializados: alto grado de técnica, especialización o tecnología.

LÍMITE: No puede superar el 20% del total de trabajadores del centro de trabajo.

PROHIBICIÓN: No está permitida la intermediación para actividades propias del giro del negocio de la empresa usuaria de manera permanente.

OBLIGACIONES DE LA EMPRESA USUARIA:
1. Celebrar contrato con la ESE por escrito.
2. Verificar que la ESE esté inscrita en el Registro Nacional de ESE del MTPE.
3. Garantizar al trabajador destacado las mismas condiciones de trabajo (no remunerativas) que sus trabajadores directos.
4. Informar al trabajador destacado sobre los riesgos del puesto de trabajo.

RESPONSABILIDAD SOLIDARIA: La empresa usuaria es solidariamente responsable por las obligaciones laborales y previsionales de la ESE con los trabajadores destacados, en caso de incumplimiento.`,
    tags: ['intermediacion', 'services', 'ese', 'cooperativa trabajadores', 'destacado', 'empresa usuaria', 'ley 27626'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // LICENCIAS LABORALES
  // ══════════════════════════════════════════════════════════════
  {
    id: 'licencias-laborales',
    norma: 'Diversas leyes laborales',
    titulo: 'Licencias Laborales — Tipos y Plazos',
    texto: `Las principales licencias laborales reconocidas por la legislación peruana:

1. LICENCIA POR MATERNIDAD (Ley 26644): 98 días (49 pre-natal + 49 post-natal). Con goce de haber (subsidiado por EsSalud).

2. LICENCIA POR PATERNIDAD (Ley 29409): 10 días calendario con goce de haber. 20 días para partos múltiples o cesárea.

3. LICENCIA POR ADOPCIÓN (Ley 27409): 30 días calendario con goce de haber cuando el adoptado es menor de 6 años.

4. LICENCIA POR FALLECIMIENTO DE FAMILIAR (D.S. 015-2016-TR): 5 días hábiles con goce de haber por fallecimiento de cónyuge, padres, hijos o hermanos.

5. LICENCIA POR ENFERMEDAD O ACCIDENTE: Los primeros 20 días de incapacidad los paga el empleador; desde el día 21, EsSalud otorga el subsidio. Se puede extender hasta 11 meses y 10 días.

6. LICENCIA SINDICAL: Los dirigentes sindicales tienen derecho a licencia con o sin goce de haber según el convenio colectivo o la ley (hasta 30 días por año en el régimen general).

7. LICENCIA POR CAPACITACIÓN (voluntaria): Si el empleador envía al trabajador a capacitarse, el tiempo cuenta como jornada laboral.

8. LICENCIA POR DONACIÓN DE SANGRE (Ley 29471): El día de la donación y el siguiente (si hay complicaciones) con goce de haber.

LICENCIAS SIN GOCE DE HABER: El empleador puede concederlas a solicitud del trabajador. No afectan el cómputo de los beneficios sociales si el período es menor al previsto en la ley.`,
    tags: ['licencia', 'licencias', 'permiso', 'fallecimiento', 'adopcion', 'sindical', 'incapacidad', 'goce haber'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // RELACIONES COLECTIVAS
  // ══════════════════════════════════════════════════════════════
  {
    id: 'relaciones-colectivas',
    norma: 'D.S. 010-2003-TR (TUO LRCT)',
    articulo: 'Arts. 1-105',
    titulo: 'Sindicatos, Negociación Colectiva y Huelga',
    texto: `LIBERTAD SINDICAL: Los trabajadores tienen derecho a organizarse en sindicatos sin autorización previa. El empleador no puede impedir la formación o el funcionamiento del sindicato, ni discriminar a los afiliados.

CONSTITUCIÓN DE UN SINDICATO: Se requieren al menos 20 trabajadores para formar un sindicato de empresa, o al menos 50 si es de actividad. Requiere acta de constitución y aprobación de estatutos. Debe inscribirse en el MTPE.

CONVENIO COLECTIVO: El resultado de la negociación colectiva. Vincula a todos los trabajadores del ámbito de aplicación, incluso a los no afiliados al sindicato. No puede establecer condiciones inferiores a las establecidas por ley. Vigencia mínima: 1 año.

PLIEGO DE RECLAMOS: El sindicato presenta al empleador el pliego de reclamos que contiene sus demandas. El proceso puede resolverse por: (1) trato directo, (2) conciliación ante el MTPE, (3) mediación, (4) arbitraje, (5) huelga.

HUELGA: Es el cese temporal colectivo del trabajo acordado mayoritariamente por los trabajadores. Requisitos: comunicación previa de 5 días hábiles al empleador y al MTPE. Servicios esenciales (luz, agua, salud, etc.): deben mantener servicios mínimos.

ACTOS DE HOSTILIDAD: El empleador no puede tomar represalias contra los trabajadores por su afiliación sindical o actividad sindical. Es causal de despido nulo.`,
    tags: ['sindicato', 'negociacion colectiva', 'convenio colectivo', 'pliego reclamos', 'huelga', 'libertad sindical', 'representantes'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // REGLAMENTO INTERNO DE TRABAJO
  // ══════════════════════════════════════════════════════════════
  {
    id: 'reglamento-interno-trabajo',
    norma: 'D.S. 039-91-TR',
    articulo: 'Arts. 1-10',
    titulo: 'Reglamento Interno de Trabajo (RIT) — Obligación y Contenido',
    texto: `El Reglamento Interno de Trabajo (RIT) es obligatorio para empresas que tengan más de cien (100) trabajadores. Para las que tienen menos, es altamente recomendable porque regula la relación laboral y sirve de sustento para aplicar medidas disciplinarias.

CONTENIDO MÍNIMO OBLIGATORIO:
- Admisión o ingreso de trabajadores.
- Jornada de trabajo y horas de entrada y salida.
- Horario de trabajo y tiempo dedicado a refrigerio.
- Lugar de trabajo.
- Normas de control de asistencia.
- Medidas disciplinarias (tipos de faltas y sanciones).
- Persona o dependencia a cargo de atender quejas y reclamos.
- Normas elementales sobre higiene y seguridad en el trabajo.

APROBACIÓN: El empleador redacta el RIT y lo pone en conocimiento de los representantes de los trabajadores (para su observación) con 5 días de anticipación. Luego se presenta al MTPE para aprobación.

DIFUSIÓN: El empleador debe entregar una copia del RIT a cada trabajador o publicarlo en un lugar visible del centro de trabajo.

IMPORTANCIA DISCIPLINARIA: El RIT es el instrumento que permite tipificar las faltas del trabajador. Sin un RIT debidamente aprobado, ciertas sanciones disciplinarias pueden ser cuestionadas en sede judicial o arbitral.`,
    tags: ['reglamento interno', 'rit', 'disciplina', 'faltas', 'sanciones', 'amonestacion', 'suspension', 'reglas internas'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // TRABAJADORES EXTRANJEROS
  // ══════════════════════════════════════════════════════════════
  {
    id: 'trabajadores-extranjeros',
    norma: 'D.Leg. 689 + D.S. 014-92-TR',
    articulo: 'Arts. 1-12',
    titulo: 'Contratación de Trabajadores Extranjeros — Límites y Visas',
    texto: `LÍMITE DE CONTRATACIÓN: Los trabajadores extranjeros no pueden exceder el 20% del total de trabajadores de la empresa, y su remuneración conjunta no puede superar el 30% del total de la planilla.

CALIDADES MIGRATORIAS PARA TRABAJAR: El trabajador extranjero debe contar con calidad migratoria que le permita trabajar:
- Visa de trabajo temporal (asignados temporalmente a Perú).
- Residente permanente o calidad de inmigrante.
- Convenio de reciprocidad (ciudadanos MERCOSUR pueden acceder en condiciones más flexibles).

CONTRATO OBLIGATORIO: Los contratos de trabajo de extranjeros deben celebrarse por escrito y aprobados por el MTPE antes de iniciar la relación laboral (o presentarse para registro dentro de los 15 días).

EXONERADOS DEL LÍMITE:
- Extranjeros con cónyuge, padres o hijos peruanos.
- Inmigrantes con 10 años o más de residencia continua.
- Técnicos y personal de dirección de nuevas empresas durante los primeros 3 años.
- Nacionales de países con los que Perú tenga tratado de reciprocidad.

REMUNERACIÓN: No puede ser inferior a la RMV vigente (S/ 1,130).

VACACIONES Y BENEFICIOS: Iguales al régimen del trabajador nacional.`,
    tags: ['extranjero', 'trabajador extranjero', 'visa', 'permiso trabajo', 'migrante', '20%', 'planilla extranjeros'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // LIQUIDACIÓN DE BENEFICIOS AL CESE
  // ══════════════════════════════════════════════════════════════
  {
    id: 'liquidacion-cese',
    norma: 'D.S. 003-97-TR + D.S. 001-97-TR + D.Leg. 713',
    titulo: 'Liquidación de Beneficios Sociales al Cese — Cálculo Completo',
    texto: `Al terminar la relación laboral, el empleador debe pagar la liquidación de beneficios sociales dentro de las 48 horas del cese. La liquidación incluye:

1. REMUNERACIÓN PENDIENTE: Días trabajados del último mes no pagados.

2. VACACIONES NO GOZADAS (Truncas):
   Fórmula: (Remuneración mensual ÷ 12) × meses de servicios del período no gozado.
   (Solo si se ha trabajado 1 mes completo o más en el período).

3. CTS ACUMULADA: La depositada en el banco más la del período en curso no depositado.
   Período en curso = (Rem. computable + 1/6 gratificación) ÷ 12 × meses trabajados desde último depósito.

4. GRATIFICACIÓN PROPORCIONAL (Trunca):
   Fórmula: (Remuneración mensual ÷ 6) × meses del semestre trabajados.

5. INDEMNIZACIÓN (solo si el despido es arbitrario):
   Régimen General: 1.5 rem. mensual × años completos (máx. 12 rem.).

6. OTROS CONCEPTOS: Horas extras pendientes, bonificaciones, comisiones no pagadas.

IMPORTANTE: La liquidación debe ser firmada por el trabajador. Si el trabajador no está de acuerdo, puede firmar con reserva. El empleador puede ser demandado por los montos no pagados dentro de los 4 años siguientes al cese (prescripción laboral).

INTERESES LEGALES: Los beneficios no pagados oportunamente generan intereses a la tasa del BCRP para depósitos en moneda nacional.`,
    tags: ['liquidacion', 'cese', 'beneficios sociales', 'finiquito', 'vacaciones truncas', 'gratificacion trunca', 'cts pendiente', 'indemnizacion cese'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // CONTRATO A TIEMPO PARCIAL
  // ══════════════════════════════════════════════════════════════
  {
    id: 'contrato-tiempo-parcial',
    norma: 'D.S. 003-97-TR',
    articulo: 'Art. 4 + D.S. 001-96-TR',
    titulo: 'Contrato a Tiempo Parcial — Menos de 4 Horas Diarias',
    texto: `El contrato a tiempo parcial es aquel en que el trabajador labora menos de cuatro (4) horas diarias.

BENEFICIOS QUE SÍ CORRESPONDEN:
- Remuneración mínima proporcional a las horas trabajadas (no puede ser menor a S/ 1,130 en jornada completa).
- AFP u ONP: sí aplica.
- EsSalud: sí aplica.
- Gratificaciones: SÍ (proporcional a la jornada).
- Indemnización por despido arbitrario: SÍ.
- Seguro de Vida Ley: SÍ (a partir de los 4 años).

BENEFICIOS QUE NO CORRESPONDEN (diferencia con jornada completa):
- CTS: NO aplica en tiempo parcial (Art. 4 TUO CTS: "trabajadores que cumplan como mínimo una jornada de cuatro horas diarias").
- Vacaciones: 15 días (no 30), proporcional.
- Derecho a estabilidad relativa: el despido puede ser sin expresión de causa, pero con preaviso de 30 días o el pago equivalente.

JORNADA MÍNIMA PARA CTS: El trabajador que labora 4 horas o más al día tiene derecho a CTS. Si labora menos de 4 horas: sin CTS.

HORARIO Y REGISTRO: Debe quedar claro en el contrato el horario de trabajo a tiempo parcial. Debe registrarse en T-REGISTRO indicando la jornada.`,
    tags: ['tiempo parcial', 'media jornada', 'part time', 'menos 4 horas', 'sin cts', 'jornada reducida'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // RÉGIMEN CONSTRUCCIÓN CIVIL
  // ══════════════════════════════════════════════════════════════
  {
    id: 'regimen-construccion-civil',
    norma: 'D.S. 001-2024-TR + convenios colectivos CAPECO-FTCCP',
    titulo: 'Régimen de Construcción Civil — Características',
    texto: `El régimen de construcción civil es un régimen especial para trabajadores que prestan servicios en obras de construcción, sean civiles, de edificación, obras públicas o privadas.

REMUNERACIÓN BÁSICA: Se paga por jornal diario, según la categoría:
- Operario: el equivalente a la remuneración pactada en convenio colectivo.
- Oficial: el 90% del jornal del Operario.
- Peón: el 85% del jornal del Operario.
El jornal diario vigente lo fija anualmente el convenio colectivo CAPECO-FTCCP.

BONIFICACIÓN POR MOVILIDAD: Se paga diariamente según lo pactado en convenio.

BONIFICACIÓN UNIFICADA DE CONSTRUCCIÓN (BUC): Equivale al 30% del jornal básico diario (para los trabajadores en Lima Metropolitana), que cubre conceptos como movilidad, alimentación y educación.

COMPENSACIÓN POR TIEMPO DE SERVICIOS (CTS): Es el 15% del jornal básico diario por cada día efectivamente trabajado.

VACACIONES: 10% del jornal diario por cada día trabajado (proporcional, distinto al régimen general).

GRATIFICACIONES: 2 veces al año (julio y diciembre), equivalente a 40 jornales diarios básicos cada vez.

SCTR: OBLIGATORIO para todos los trabajadores de construcción civil.

PARTICULARIDAD: No tiene estabilidad laboral como el régimen general; el contrato termina con la obra.`,
    tags: ['construccion civil', 'obra', 'operario', 'oficial', 'peon', 'jornal', 'buc', 'capeco', 'ftccp'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // TRABAJADOR DEL HOGAR
  // ══════════════════════════════════════════════════════════════
  {
    id: 'regimen-hogar',
    norma: 'Ley 27986 + Ley 31047',
    articulo: 'Arts. 1-25',
    titulo: 'Trabajadores del Hogar — Régimen Laboral Especial',
    texto: `Los trabajadores del hogar son aquellos que realizan labores de aseo, cocina, lavado, planchado, cuidado de niños, jardinería u otras de carácter doméstico en el hogar del empleador.

BENEFICIOS LABORALES (vigentes desde Ley 31047 — 2021):
- Remuneración mínima: RMV vigente (S/ 1,130 mensual).
- CTS: 15 días de remuneración por año de servicios.
- Gratificaciones: una gratificación en julio y una en diciembre, equivalente al 50% de la remuneración.
- Vacaciones: 15 días calendario por año de servicios.
- EsSalud: 9% a cargo del empleador.
- AFP u ONP: según elección del trabajador.
- Seguro de Vida Ley: a partir de los 4 años (igual al régimen general).

CONTRATO: Puede ser verbal o escrito. Si el empleador dispone de su vivienda al trabajador (trabajadora "cama adentro"), debe quedar claro en el acuerdo. El alojamiento y la alimentación pueden deducirse de la remuneración hasta en un 25%.

DESCANSO: Los trabajadores del hogar tienen derecho a un descanso de 8 horas diarias y 24 horas semanales continuas. Si trabaja en domicilio del empleador, debe tener un lugar adecuado para dormir.

DESPIDO ARBITRARIO: La indemnización es de 15 remuneraciones diarias por año de servicios (máximo 180 días de remuneración).`,
    tags: ['trabajador hogar', 'empleada domestica', 'nana', 'cuidadora', 'servicio domestico', 'ley 27986', 'ley 31047'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // AFP Y SISTEMA PREVISIONAL
  // ══════════════════════════════════════════════════════════════
  {
    id: 'afp-onp',
    norma: 'Ley 25897 (SPP) + D.L. 19990 (SNP)',
    articulo: 'Arts. 1-80',
    titulo: 'Sistema Pensionario — AFP y ONP: Tasas y Obligaciones',
    texto: `En Perú coexisten dos sistemas de pensiones:

SISTEMA PRIVADO DE PENSIONES (SPP — AFP):
- El trabajador aporta el 10% de su remuneración mensual a su cuenta individual de capitalización.
- Prima de seguro: aproximadamente 1.6% (varía por AFP) para financiar el seguro de invalidez y sobrevivencia.
- Comisión por administración: varía por AFP (flujo: 0.6%-1.6%; mixta disponible).
- El EMPLEADOR es responsable de retener y pagar el aporte del TRABAJADOR a la AFP. Se paga del 1 al 5 de cada mes (según cronograma SUNAT).
- Penalidad por mora: si el empleador no paga en el plazo, genera intereses de la tasa de mora del BCRP + 3%.

SISTEMA NACIONAL DE PENSIONES (SNP — ONP):
- Aporte: 13% de la remuneración del trabajador (descontado al trabajador).
- El empleador es responsable de retener y pagar. Cronograma SUNAT.
- Pensión máxima: S/ 857.36 mensuales.
- Pensión mínima: S/ 415 mensuales.

ELECCIÓN DEL SISTEMA: Al ingresar al mercado laboral, el trabajador tiene 10 días hábiles para elegir AFP u ONP. Si no elige, el empleador lo incorpora a una AFP por licitación. Solo puede cambiarse entre AFPs o a ONP en condiciones especiales.

OBLIGACIÓN DEL EMPLEADOR: Afiliar al trabajador al sistema pensionario ANTES del primer pago de remuneración, con comunicación al sistema elegido.`,
    tags: ['afp', 'onp', 'pension', 'sistema previsional', 'aporte', '10%', '13%', 'jubilacion', 'cuspp'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // IPERC — IDENTIFICACIÓN DE PELIGROS Y RIESGOS
  // ══════════════════════════════════════════════════════════════
  {
    id: 'iperc',
    norma: 'Ley 29783 + R.M. 050-2013-TR',
    articulo: 'Arts. 57-60 Ley 29783 + Guía R.M. 050-2013-TR',
    titulo: 'IPERC — Identificación de Peligros, Evaluación de Riesgos y Control',
    texto: `El IPERC (Identificación de Peligros, Evaluación de Riesgos y Control) es el documento central del sistema de seguridad y salud en el trabajo. Es obligatorio para TODOS los empleadores.

METODOLOGÍA:
1. IDENTIFICACIÓN DE PELIGROS: Listar todos los peligros por cada área/proceso de trabajo.
2. EVALUACIÓN DE RIESGOS: Para cada peligro, evaluar la probabilidad de que ocurra y la severidad del daño. Se usa la fórmula: Nivel de Riesgo = Probabilidad × Severidad.
3. MEDIDAS DE CONTROL (jerarquía):
   - Eliminación del peligro (más efectivo).
   - Sustitución.
   - Controles de ingeniería (aislamientos, barreras, etc.).
   - Controles administrativos (procedimientos, capacitación).
   - Equipos de Protección Personal — EPP (menos efectivo, último recurso).
4. SEGUIMIENTO: Verificar la eficacia de los controles implementados.

ACTUALIZACIÓN:
- Al menos una vez al año.
- Cuando se produzca un accidente o incidente peligroso.
- Cuando cambien las condiciones de trabajo.
- Cuando haya cambios en los procesos, equipos o sustancias.

PARTICIPACIÓN: El IPERC debe elaborarse con la participación de los trabajadores y el Comité/Supervisor de SST.

SANCIÓN POR INCUMPLIMIENTO: No contar con IPERC actualizado es infracción MUY GRAVE (multa de hasta 100 UIT para gran empresa).`,
    tags: ['iperc', 'peligros', 'riesgos', 'control riesgos', 'epp', 'seguridad trabajo', 'matriz riesgos', 'rm 050'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // INFRACCIONES ESPECÍFICAS — D.S. 019-2006-TR
  // ══════════════════════════════════════════════════════════════
  {
    id: 'infracciones-especificas',
    norma: 'D.S. 019-2006-TR (actualizado por D.S. 012-2013-TR y D.S. 015-2017-TR)',
    articulo: 'Arts. 23-28',
    titulo: 'Infracciones Laborales Específicas — Tabla Actualizada',
    texto: `INFRACCIONES MUY GRAVES (Arts. 25-26 D.S. 019-2006-TR):
- No formalizar contratos laborales por escrito (cuando es exigible): muy grave.
- No depositar CTS en los plazos legales: grave (si es sistemático, muy grave).
- Pagar remuneraciones inferiores a la RMV: muy grave.
- No registrar al trabajador en el T-REGISTRO antes del inicio de labores: grave.
- Actos de discriminación por razón de sexo, raza, religión, opinión, discapacidad: muy grave.
- No otorgar descanso vacacional o no pagar la triple remuneración: grave.
- No contar con Seguro de Vida Ley cuando corresponde: grave.
- Actos de hostilidad laboral equivalentes al despido indirecto: muy grave.
- No pagar la indemnización por despido arbitrario: muy grave.
- Impedir el ejercicio de la libertad sindical: muy grave.
- No contar con Comité o Supervisor de SST: grave.
- No elaborar el IPERC: muy grave.
- No entregar EPP apropiado: muy grave.
- No realizar exámenes médicos pre-ocupacionales: muy grave.
- No contar con Política de SST documentada: muy grave.

INFRACCIONES LEVES (Art. 23 D.S. 019-2006-TR):
- No otorgar boleta de pago al trabajador en el plazo.
- No llevar el registro de control de asistencia.
- No exhibir en lugar visible los horarios de trabajo.`,
    tags: ['infracciones', 'infracciones laborales', 'tabla infracciones', 'leve', 'grave', 'muy grave', 'sunafil', 'registro t-registro'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // RETENCIÓN JUDICIAL Y EMBARGO DE REMUNERACIONES
  // ══════════════════════════════════════════════════════════════
  {
    id: 'retencion-judicial',
    norma: 'D.S. 003-97-TR + Código Procesal Civil',
    articulo: 'Art. 648 CPC + Art. 42 LPCL',
    titulo: 'Inembargabilidad de Remuneraciones y Retenciones Judiciales',
    texto: `REMUNERACIÓN INEMBARGABLE: La remuneración mínima vital (S/ 1,130) es inembargable. Las remuneraciones que superen la RMV pueden ser embargadas solo hasta el tercio del exceso.

RETENCIÓN JUDICIAL DE ALIMENTOS (pensión alimenticia):
- La retención por alimentos no está sujeta al límite anterior.
- El empleador puede retener hasta el 60% de la remuneración por mandato judicial de alimentos.
- Obligación del empleador: practicar la retención desde que recibe el oficio judicial y depositarla en la cuenta señalada por el juzgado.
- Si el empleador no practica la retención, puede ser responsable solidario.

RETENCIÓN POR PRÉSTAMOS (descuentos voluntarios):
- El trabajador puede autorizar descuentos de su remuneración para pago de préstamos al empleador o instituciones financieras.
- No pueden reducir la remuneración por debajo de la RMV.

INTERESES LEGALES LABORALES: Las sumas adeudadas al trabajador devengan intereses a la tasa de interés legal laboral (publicada mensualmente por el BCRP), desde la fecha en que debieron pagarse hasta la fecha de pago efectivo.`,
    tags: ['embargo', 'retencion judicial', 'alimentos', 'pension alimenticia', 'inembargable', 'descuento remuneracion', 'intereses laborales'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // NUEVA LEY MYPE 2024 (Ley 32353)
  // ══════════════════════════════════════════════════════════════
  {
    id: 'nueva-ley-mype-2024',
    norma: 'Ley 32353 (vigente desde enero 2025)',
    articulo: 'Arts. 1-50',
    titulo: 'Nueva Ley MYPE 32353 — Cambios al Régimen Laboral MYPE',
    texto: `La Ley 32353 modifica el régimen laboral de la micro y pequeña empresa. Principales cambios respecto al D.Leg. 1086:

MICROEMPRESA (hasta 10 trabajadores, ventas hasta 150 UIT):
- Se mantienen los mismos beneficios: sin CTS, sin gratificaciones, vacaciones 15 días.
- Incremento gradual de remuneración hacia la RMV general.
- Mayor fiscalización SUNAFIL para verificar que no se encubra una PYME bajo el régimen micro.

PEQUEÑA EMPRESA (11-100 trabajadores, ventas hasta 1,700 UIT):
- CTS: 15 remuneraciones diarias por año (se mantiene al 50% del régimen general).
- Gratificaciones: media remuneración en julio y media en diciembre (50% del régimen general).
- Vacaciones: 15 días (se mantiene).
- Se incrementa la fiscalización de la correcta clasificación en el REMYPE.

MEDIANA EMPRESA (101-250 trabajadores, ventas hasta 2,300 UIT):
- La Ley 32353 crea el régimen de mediana empresa con beneficios intermedios.
- CTS: 15 remuneraciones diarias por año.
- Gratificaciones: 75% del régimen general.
- Vacaciones: 20 días.

CAMBIOS EN EL ACCESO:
- Mayor control para evitar el "fraccionamiento artificial" de empresas para mantenerse en el REMYPE.
- El REMYPE es administrado por la SUNAT (antes por el MTPE).

SANCIONES: Las empresas que declaren falsamente su tamaño para obtener los beneficios del régimen MYPE incurren en infracción muy grave y pueden ser excluidas del régimen.`,
    tags: ['mype', 'ley 32353', 'nueva ley mype', 'microempresa', 'pequeña empresa', 'mediana empresa', 'remype', 'sunat'],
    vigente: true,
  },
]

// ─── Helper: obtener todos los tags únicos del corpus ──────────────────────────
export const ALL_TAGS = [...new Set(LEGAL_CORPUS.flatMap(c => c.tags))]

// ─── Helper: buscar por ID ──────────────────────────────────────────────────────
export function getChunkById(id: string): LegalChunk | undefined {
  return LEGAL_CORPUS.find(c => c.id === id)
}
