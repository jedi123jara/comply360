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

  // ══════════════════════════════════════════════════════════════
  // INFRACCIONES LABORALES — D.S. 019-2006-TR
  // ══════════════════════════════════════════════════════════════
  {
    id: 'infracciones-leves-detalle',
    norma: 'D.S. 019-2006-TR',
    articulo: 'Art. 23',
    titulo: 'Infracciones Leves en Materia de Relaciones Laborales',
    texto: `Son infracciones leves las siguientes conductas del empleador (Art. 23 D.S. 019-2006-TR):
1. No comunicar y registrar ante la Autoridad competente, en los plazos y con los requisitos previstos, la documentación o información exigida por las normas de trabajo.
2. No entregar al trabajador, en los plazos y con los requisitos previstos, copia del contrato de trabajo, boletas de pago de remuneraciones, hojas de liquidación de CTS u otros documentos que deben serle entregados según la normativa.
3. No exhibir en lugar visible del centro de trabajo el horario de trabajo, o no dar a conocer por otro medio adecuado a los trabajadores el horario de trabajo vigente.
4. No contar con el registro de control de asistencia, o impedir o sustituir al trabajador en el registro de su tiempo de trabajo.
5. No cumplir las obligaciones relativas a boletas de pago o registro de trabajadores.
6. Cualesquiera otros incumplimientos que afecten obligaciones meramente formales o documentarias.

MULTAS (escala vigente 2026): de 0.045 UIT (S/ 247.50) hasta 4.95 UIT (S/ 27,225) dependiendo del número de trabajadores afectados (1 a más de 1000). Las infracciones leves prescriben a los 4 años. El empleador puede subsanar dentro del plazo de la inspección para obtener una reducción de hasta el 90% de la multa.`,
    tags: ['infraccion leve', 'multa leve', 'sunafil', 'boleta', 'registro asistencia', 'horario', 'documentos', 'ds 019-2006-tr'],
    vigente: true,
  },
  {
    id: 'infracciones-graves-detalle',
    norma: 'D.S. 019-2006-TR',
    articulo: 'Art. 24',
    titulo: 'Infracciones Graves en Materia de Relaciones Laborales',
    texto: `Son infracciones graves las siguientes conductas del empleador (Art. 24 D.S. 019-2006-TR):
1. No registrar trabajadores en las planillas de pago o en el registro de trabajadores y prestadores de servicios dentro del plazo establecido.
2. El incumplimiento de las disposiciones sobre jornada de trabajo, trabajo en sobretiempo, trabajo nocturno, descanso semanal y feriados no laborables.
3. El incumplimiento de las disposiciones relacionadas con el pago de remuneraciones, así como CTS, gratificaciones, vacaciones y otros beneficios sociales.
4. No depositar íntegra y oportunamente la CTS.
5. No celebrar por escrito y en los plazos previstos los contratos de trabajo sujetos a modalidad, o no presentarlos a la Autoridad dentro del término de 15 días.
6. La transgresión de las normas sobre la contratación de trabajadores extranjeros.
7. El incumplimiento de las disposiciones sobre participación en las utilidades de la empresa.
8. No contratar póliza de seguro de vida ley para trabajadores con 4 años o más de servicios.
9. No cumplir con el pago de la bonificación extraordinaria (9% sobre gratificaciones por exoneración de aportes).

MULTAS: de 0.11 UIT (S/ 605) hasta 26.12 UIT (S/ 143,660) según el número de trabajadores afectados. Las infracciones graves prescriben a los 4 años.`,
    tags: ['infraccion grave', 'multa grave', 'sunafil', 'planilla', 'cts', 'gratificacion', 'jornada', 'ds 019-2006-tr'],
    vigente: true,
  },
  {
    id: 'infracciones-muy-graves-detalle',
    norma: 'D.S. 019-2006-TR',
    articulo: 'Art. 25',
    titulo: 'Infracciones Muy Graves en Materia de Relaciones Laborales',
    texto: `Son infracciones muy graves las siguientes conductas del empleador (Art. 25 D.S. 019-2006-TR):
1. No pagar la remuneración mínima correspondiente al trabajador.
2. La inscripción fraudulenta en el Registro Nacional de Micro y Pequeña Empresa (REMYPE).
3. El incumplimiento de las disposiciones referidas a la protección de la trabajadora gestante, el despido de la mujer trabajadora durante el embarazo o dentro de los 90 días posteriores al parto.
4. La discriminación del trabajador, directa o indirecta, en materia de empleo u ocupación, por motivo de origen, raza, sexo, idioma, religión, opinión, condición económica o de cualquier otra índole.
5. El trabajo forzoso, sea o no retribuido, y la trata de personas con fines de explotación laboral.
6. Los actos contra la libertad sindical, el fuero sindical o la negociación colectiva.
7. Los actos de hostigamiento sexual y el incumplimiento de las obligaciones de prevención y sanción del hostigamiento sexual.
8. El incumplimiento de las disposiciones sobre la cuota de empleo de personas con discapacidad (3% en empresas con 50+ trabajadores).
9. No cumplir con la prohibición de discriminación remunerativa entre varones y mujeres (Ley 30709).

MULTAS: de 0.23 UIT (S/ 1,265) hasta 52.53 UIT (S/ 288,915) según el número de trabajadores afectados. Las infracciones muy graves pueden acarrear además el cierre temporal del establecimiento.`,
    tags: ['infraccion muy grave', 'multa muy grave', 'sunafil', 'discriminacion', 'hostigamiento', 'trabajo forzoso', 'sindical', 'ds 019-2006-tr'],
    vigente: true,
  },
  {
    id: 'subsanacion-atenuantes',
    norma: 'D.S. 019-2006-TR / Ley 28806',
    articulo: 'Arts. 40-49',
    titulo: 'Subsanación de Infracciones y Atenuantes de Multas SUNAFIL',
    texto: `El sistema de inspección del trabajo peruano prevé mecanismos de reducción de multas por subsanación (Arts. 40-49 Ley 28806 y D.S. 019-2006-TR):

SUBSANACIÓN VOLUNTARIA (antes de la inspección):
- Si el empleador corrige las infracciones antes de que se inicie el procedimiento inspector, obtiene una reducción del 90% de la multa que se habría impuesto.
- Es el incentivo más poderoso para mantener compliance proactivo.

SUBSANACIÓN DURANTE LA INSPECCIÓN:
- Plazo de subsanación otorgado por el inspector: el empleador puede subsanar dentro del plazo del requerimiento (generalmente 10 días hábiles).
- Reducción de hasta el 70% de la multa por subsanar durante la medida de requerimiento.

ATENUANTES GENERALES:
- Acreditación de buena fe y ausencia de intencionalidad.
- Cumplimiento inmediato de las obligaciones una vez requerido.
- Antecedentes favorables (no tener sanciones previas en los últimos 4 años).
- Compromiso formal documentado de implementar un plan de cumplimiento.

CÁLCULO FINAL DE LA MULTA:
La multa base se determina según la gravedad (leve/grave/muy grave) y el número de trabajadores afectados. Luego se aplican agravantes (+25% por reincidencia, +50% por obstrucción) o atenuantes (reducción por subsanación). La multa no puede ser inferior al mínimo legal correspondiente a la gravedad de la infracción.`,
    tags: ['subsanacion', 'atenuante', 'reduccion multa', 'sunafil', '90 porciento', '70 porciento', 'requerimiento', 'inspeccion', 'ley 28806'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // JORNADA, SOBRETIEMPO Y TRABAJO NOCTURNO — D.S. 007-2002-TR
  // ══════════════════════════════════════════════════════════════
  {
    id: 'jornada-maxima-detalle',
    norma: 'D.S. 007-2002-TR',
    articulo: 'Arts. 1-9',
    titulo: 'Jornada Máxima de Trabajo y Horario',
    texto: `La jornada ordinaria de trabajo se regula por el D.S. 007-2002-TR (TUO del D.Leg. 854):

JORNADA MÁXIMA:
- 8 horas diarias o 48 horas semanales como máximo (Art. 1).
- Se puede establecer jornadas alternativas, acumulativas o atípicas, siempre que el promedio de horas trabajadas en el período correspondiente no supere el máximo legal.
- En jornadas atípicas (minería, pesca), el promedio de horas en el ciclo completo no debe exceder de 8 horas diarias o 48 semanales.

JORNADA REDUCIDA:
- El empleador puede establecer jornadas menores a 8 horas. Si la jornada es menor a 4 horas diarias, el trabajador es considerado a tiempo parcial y pierde derechos como CTS, vacaciones completas y protección contra despido arbitrario.

HORARIO DE TRABAJO:
- Es facultad del empleador fijar el horario de trabajo (hora de entrada y salida).
- El horario debe exhibirse en lugar visible o comunicarse por medio adecuado.
- La modificación del horario no puede exceder de una hora; si excede, requiere acuerdo con el trabajador o autorización de la AAT.

REFRIGERIO:
- No menor a 45 minutos. No forma parte de la jornada ni del horario de trabajo, salvo convenio colectivo.

EXCLUSIONES DE LA JORNADA MÁXIMA:
- Personal de dirección.
- Personal no sujeto a fiscalización inmediata.
- Trabajadores que prestan servicios intermitentes de espera, vigilancia o custodia.`,
    tags: ['jornada', 'horario', 'horas', '48 horas', '8 horas', 'tiempo parcial', 'refrigerio', 'atipica', 'direccion', 'ds 007-2002-tr'],
    vigente: true,
  },
  {
    id: 'sobretiempo-detalle',
    norma: 'D.S. 007-2002-TR',
    articulo: 'Arts. 10-12',
    titulo: 'Trabajo en Sobretiempo (Horas Extras)',
    texto: `El trabajo en sobretiempo es voluntario tanto para el empleador como para el trabajador (Art. 10 D.S. 007-2002-TR):

CARÁCTER VOLUNTARIO:
- Nadie puede ser obligado a trabajar horas extras, salvo casos justificados de fuerza mayor que pongan en peligro inminente a las personas, bienes o la continuidad de la actividad productiva.
- El trabajo en sobretiempo supone la prestación efectiva de servicios en beneficio del empleador.

TASAS DE PAGO:
- Las dos (2) primeras horas extras se pagan con una sobretasa mínima del 25% sobre el valor hora ordinaria.
- A partir de la tercera hora, la sobretasa mínima es del 35%.
- El convenio colectivo o el contrato pueden establecer sobretasas mayores.

COMPENSACIÓN CON DESCANSO:
- Por convenio entre el empleador y el trabajador, las horas extras pueden compensarse con períodos equivalentes de descanso, dentro del mes calendario siguiente.

ACREDITACIÓN:
- El empleador está obligado a registrar el trabajo prestado en sobretiempo mediante cualquier medio válido (reloj de control, cuaderno, sistema electrónico).
- Si el trabajador acredita haber laborado en sobretiempo y el empleador no demuestra haberle pagado, se presume que el sobretiempo no fue remunerado.
- La falta de registro de horas extras constituye infracción grave.

LÍMITE: No existe un tope legal de horas extras; sin embargo, el exceso puede configurar un atentado contra la seguridad y salud del trabajador.`,
    tags: ['sobretiempo', 'horas extras', 'overtime', '25 porciento', '35 porciento', 'sobretasa', 'compensacion', 'descanso compensatorio', 'ds 007-2002-tr'],
    vigente: true,
  },
  {
    id: 'trabajo-nocturno-detalle',
    norma: 'D.S. 007-2002-TR',
    articulo: 'Art. 8',
    titulo: 'Trabajo en Horario Nocturno',
    texto: `El trabajo nocturno se regula por el Art. 8 del D.S. 007-2002-TR:

DEFINICIÓN:
- Se considera jornada nocturna el tiempo trabajado entre las 10:00 p.m. y las 6:00 a.m.

REMUNERACIÓN MÍNIMA:
- Los trabajadores que laboran en horario nocturno no pueden percibir una remuneración mensual inferior a la Remuneración Mínima Vital vigente más una sobretasa del 35%.
- Con la RMV actual de S/ 1,130, la remuneración mínima nocturna es de S/ 1,525.50.
- Esta sobretasa del 35% se aplica sobre la RMV, no sobre la remuneración habitual del trabajador (a menos que esta sea igual a la RMV).

TRASLADO AL HORARIO NOCTURNO:
- Si el empleador traslada al trabajador del turno diurno al nocturno, debe notificarle con anticipación.
- El traslado no puede ser discriminatorio ni represivo.

PROTECCIÓN ESPECIAL:
- La trabajadora gestante tiene derecho a solicitar no realizar trabajo nocturno durante el embarazo y la lactancia.
- Los adolescentes (menores de 18 años) tienen prohibido laborar en horario nocturno.
- En el sector minero y de hidrocarburos, existen reglas especiales para la rotación de turnos nocturnos.`,
    tags: ['trabajo nocturno', 'nocturno', 'turno noche', '35 porciento', 'sobretasa nocturna', 'rmv nocturna', 'gestante', 'ds 007-2002-tr'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // LICENCIAS, DESCANSOS Y FERIADOS
  // ══════════════════════════════════════════════════════════════
  {
    id: 'licencias-remuneradas',
    norma: 'Múltiples normas',
    titulo: 'Licencias Remuneradas del Trabajador en el Perú',
    texto: `El ordenamiento laboral peruano reconoce las siguientes licencias con goce de remuneraciones:

1. LICENCIA POR PATERNIDAD (Ley 29409 mod. Ley 30807): 10 días calendario consecutivos por nacimiento de hijo, desde la fecha del parto o desde que la madre o el hijo son dados de alta. 20 días en partos prematuros o múltiples. 30 días si el recién nacido tiene enfermedad congénita terminal o discapacidad severa.

2. LICENCIA POR FALLECIMIENTO DE FAMILIAR (D.Leg. 713): 5 días hábiles por fallecimiento de cónyuge, padres, hijos o hermanos. Puede ser extendida por convenio colectivo.

3. LICENCIA POR ENFERMEDAD GRAVE O TERMINAL DE FAMILIAR DIRECTO (Ley 30012): Hasta 7 días calendario, ampliables hasta 30 días a cuenta de vacaciones.

4. LICENCIA SINDICAL (D.S. 010-2003-TR Art. 32): Hasta 30 días calendario por año para dirigentes sindicales. Ampliable por convenio colectivo.

5. LICENCIA POR ADOPCIÓN (Ley 27409): 30 días naturales contados desde el día siguiente de la resolución de adopción.

6. LICENCIA PARA ATENCIÓN DE FAMILIARES CON ALZHEIMER (Ley 30795): Hasta 48 horas por año para acompañar a familiar con Alzheimer a citas médicas.

7. LICENCIA POR ASISTENCIA MÉDICA Y TERAPIA DE REHABILITACIÓN DE PERSONAS CON DISCAPACIDAD (Ley 29973 Art. 36): Hasta 56 horas por año para citas médicas y terapias.

8. LICENCIA PARA DONANTES (Ley 27282): 1 día por donación de sangre.

9. LICENCIA POR REPRESENTACIÓN DEPORTIVA NACIONAL (Ley 28036): Durante la participación en competencias oficiales nacionales e internacionales.`,
    tags: ['licencia', 'permiso', 'paternidad', 'fallecimiento', 'adopcion', 'sindical', 'discapacidad', 'donante', 'licencia remunerada'],
    vigente: true,
  },
  {
    id: 'descansos-obligatorios',
    norma: 'D.Leg. 713 / D.S. 012-92-TR',
    titulo: 'Descansos Remunerados Obligatorios',
    texto: `El Decreto Legislativo 713 regula los descansos remunerados de los trabajadores:

DESCANSO SEMANAL OBLIGATORIO:
- El trabajador tiene derecho como mínimo a 24 horas consecutivas de descanso en cada semana, el que se otorgará preferentemente en día domingo.
- Si el trabajador labora en su día de descanso sin sustituirlo por otro día en la misma semana, tiene derecho al pago del día con la sobretasa del 100% (remuneración doble).
- Los trabajadores que laboran habitualmente en domingo tienen derecho a un día sustitutorio de descanso.

DESCANSO EN DÍAS FERIADOS:
- Los trabajadores tienen derecho a descanso remunerado en los días feriados señalados por ley.
- Si el trabajador labora en día feriado sin descanso sustitutorio, tiene derecho a una sobretasa del 100% adicional (triple remuneración: remuneración ordinaria + sobretasa 100% + el feriado).

VACACIONES ANUALES:
- Después de un año completo de servicios, el trabajador tiene derecho a 30 días calendario de descanso vacacional (régimen general).
- Requisito: haber cumplido el récord mínimo de asistencia (en jornada de 6 días: 260 días efectivos; en jornada de 5 días: 210 días efectivos).
- La remuneración vacacional es equivalente a la remuneración habitual del trabajador.
- Las vacaciones deben gozarse dentro del año siguiente al cumplimiento del récord. Si se acumula más de un período, el trabajador tiene derecho a la indemnización vacacional equivalente a una remuneración adicional (triple vacacional).`,
    tags: ['descanso', 'semanal', 'domingo', 'feriado', 'vacaciones', 'triple vacacional', 'sobretasa', 'dleg 713'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // PROTECCIÓN DE DATOS PERSONALES
  // ══════════════════════════════════════════════════════════════
  {
    id: 'datos-personales-empleador',
    norma: 'Ley 29733 / D.S. 003-2013-JUS',
    titulo: 'Protección de Datos Personales en el Ámbito Laboral',
    texto: `La Ley 29733, Ley de Protección de Datos Personales, establece obligaciones para el empleador como titular del banco de datos de sus trabajadores:

OBLIGACIONES DEL EMPLEADOR:
1. Obtener el consentimiento informado del trabajador para el tratamiento de sus datos personales. El consentimiento debe ser previo, expreso, inequívoco e informado.
2. Inscribir el banco de datos personales ante la Autoridad Nacional de Protección de Datos Personales (ANPDP), adscrita al Ministerio de Justicia.
3. Informar al trabajador sobre la finalidad del tratamiento de sus datos, quiénes serán los destinatarios y la existencia del banco de datos.
4. Garantizar la seguridad de los datos personales, implementando medidas técnicas, organizativas y legales para evitar su pérdida, alteración, destrucción o acceso no autorizado.
5. Atender los derechos ARCO (Acceso, Rectificación, Cancelación y Oposición) del trabajador en un plazo de 20 días hábiles.

DATOS SENSIBLES:
- Los datos sobre afiliación sindical, salud (exámenes médicos), antecedentes penales y datos biométricos son considerados datos sensibles y requieren consentimiento expreso por escrito.
- El empleador no puede exigir pruebas de embarazo, VIH/SIDA ni test de polígrafo como condición de empleo.

SANCIONES por incumplimiento: Multas de hasta 100 UIT (S/ 550,000) impuestas por la ANPDP. Las infracciones se clasifican en leves (hasta 5 UIT), graves (hasta 50 UIT) y muy graves (hasta 100 UIT).`,
    tags: ['datos personales', 'privacidad', 'consentimiento', 'banco datos', 'arco', 'anpdp', 'ley 29733', 'datos sensibles', 'biometrico'],
    vigente: true,
  },
  {
    id: 'clausula-datos-contratos',
    norma: 'Ley 29733 / D.S. 003-2013-JUS',
    titulo: 'Cláusula de Protección de Datos en Contratos de Trabajo',
    texto: `Todo contrato de trabajo debe incluir una cláusula de tratamiento de datos personales conforme a la Ley 29733:

CONTENIDO MÍNIMO DE LA CLÁUSULA:
1. Identificación del titular del banco de datos (empleador, con RUC y domicilio).
2. Finalidad del tratamiento: gestión de la relación laboral, pago de remuneraciones y beneficios, cumplimiento de obligaciones legales (T-REGISTRO, PLAME, EsSalud, AFP/ONP), control de asistencia.
3. Destinatarios de los datos: SUNAT, EsSalud, AFP/ONP, SUNAFIL, entidades financieras (para pago de haberes), aseguradoras (SCTR, seguro vida ley).
4. Transferencia internacional de datos: si la empresa pertenece a un grupo multinacional, debe informar si los datos serán transferidos a servidores en el extranjero.
5. Plazo de conservación: los datos se conservan durante la vigencia de la relación laboral y hasta 5 años después del cese (plazo de prescripción laboral), salvo obligaciones tributarias que exijan mayor plazo.
6. Derechos ARCO: se debe informar al trabajador que puede ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición.
7. Carácter obligatorio u optativo de suministrar los datos: los datos necesarios para la relación laboral son obligatorios; los adicionales (foto, redes sociales) son optativos.

RECOMENDACIÓN: Incluir esta cláusula como anexo al contrato de trabajo o como documento independiente firmado al momento de la contratación.`,
    tags: ['clausula datos', 'contrato', 'consentimiento', 'tratamiento datos', 'ley 29733', 'rrhh', 'privacidad laboral'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // DISCAPACIDAD — CUOTA DE EMPLEO
  // ══════════════════════════════════════════════════════════════
  {
    id: 'discapacidad-cuota-detalle',
    norma: 'Ley 29973 / D.S. 002-2014-MIMP',
    articulo: 'Art. 49',
    titulo: 'Cuota de Empleo para Personas con Discapacidad',
    texto: `La Ley 29973, Ley General de la Persona con Discapacidad, establece la cuota de empleo obligatoria:

CUOTA OBLIGATORIA:
- Empresas privadas con 50 o más trabajadores: deben emplear personas con discapacidad en una proporción no inferior al 3% de su planilla total.
- Entidades públicas: no inferior al 5%.
- El cálculo se realiza sobre la totalidad de la planilla al 31 de diciembre de cada año.

ACREDITACIÓN DE LA DISCAPACIDAD:
- La discapacidad se acredita con el certificado de discapacidad emitido por establecimientos de salud autorizados o con la inscripción en el Registro Nacional de la Persona con Discapacidad (CONADIS).

AJUSTES RAZONABLES:
- El empleador debe realizar ajustes razonables en el lugar de trabajo para facilitar la accesibilidad y el desempeño de los trabajadores con discapacidad.
- Los ajustes razonables incluyen: adaptación de herramientas, modificación del mobiliario, redistribución de funciones, horarios flexibles, teletrabajo.

BONIFICACIÓN EN PROCESOS DE SELECCIÓN:
- En concursos públicos, las personas con discapacidad reciben una bonificación del 15% sobre el puntaje final.

INCENTIVOS TRIBUTARIOS:
- Las empresas que empleen personas con discapacidad pueden deducir adicionalmente el 50% de las remuneraciones pagadas a dichos trabajadores como gasto para el Impuesto a la Renta.
- Deducción adicional del 50% de los gastos por ajustes razonables.

SANCIÓN POR INCUMPLIMIENTO:
- Infracción muy grave tipificada en el D.S. 019-2006-TR Art. 25.
- Multa de hasta 52.53 UIT (S/ 288,915).
- SUNAFIL fiscaliza activamente el cumplimiento de la cuota de empleo.`,
    tags: ['discapacidad', 'cuota empleo', '3 porciento', '5 porciento', 'conadis', 'ajustes razonables', 'ley 29973', 'incentivo tributario'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // PARTICIPACIÓN EN UTILIDADES — D.Leg. 892
  // ══════════════════════════════════════════════════════════════
  {
    id: 'utilidades-detalle',
    norma: 'D.Leg. 892 / D.S. 009-98-TR',
    titulo: 'Participación de los Trabajadores en las Utilidades de la Empresa',
    texto: `El Decreto Legislativo 892 regula la participación de los trabajadores en las utilidades:

EMPRESAS OBLIGADAS:
- Empresas privadas que generen rentas de tercera categoría, con más de 20 trabajadores.
- Se excluyen: cooperativas, empresas autogestionarias, sociedades civiles, microempresas inscritas en el REMYPE.

PORCENTAJE SEGÚN ACTIVIDAD:
- Empresas pesqueras: 10%
- Empresas de telecomunicaciones: 10%
- Empresas industriales: 10%
- Empresas mineras: 8%
- Empresas de comercio y restaurantes: 8%
- Empresas de otras actividades: 5%

DISTRIBUCIÓN:
- 50% se distribuye en proporción a los días efectivamente trabajados.
- 50% se distribuye en proporción a las remuneraciones percibidas.
- Tope individual: 18 remuneraciones mensuales del trabajador.
- El exceso del tope se destina al FONDOEMPLEO.

PLAZO DE PAGO:
- Dentro de los 30 días naturales siguientes al vencimiento del plazo para la presentación de la Declaración Jurada Anual del Impuesto a la Renta (generalmente marzo-abril).

TRABAJADORES CON DERECHO:
- Todos los que hayan cumplido la jornada máxima legal o contractual durante el ejercicio.
- Trabajadores a tiempo parcial participan en proporción.
- Trabajadores cesados antes del reparto mantienen el derecho y cobran en el mismo plazo.

INCUMPLIMIENTO: Constituye infracción grave (D.S. 019-2006-TR Art. 24.7). Además, genera intereses legales laborales desde el día siguiente al vencimiento del plazo.`,
    tags: ['utilidades', 'participacion utilidades', 'reparto', 'dleg 892', 'fondoempleo', '10 porciento', '8 porciento', '5 porciento', 'renta tercera'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // EXTINCIÓN DEL CONTRATO DE TRABAJO
  // ══════════════════════════════════════════════════════════════
  {
    id: 'causas-justas-despido',
    norma: 'D.S. 003-97-TR',
    articulo: 'Arts. 23-28',
    titulo: 'Causas Justas de Despido Relacionadas con la Conducta y Capacidad del Trabajador',
    texto: `El D.S. 003-97-TR (TUO de la Ley de Productividad y Competitividad Laboral) establece las causas justas de despido:

CAUSAS RELACIONADAS CON LA CONDUCTA (Art. 24):
a) La comisión de falta grave:
   - Incumplimiento de las obligaciones de trabajo que supone el quebrantamiento de la buena fe laboral.
   - Disminución deliberada y reiterada en el rendimiento de las labores.
   - Apropiación consumada o frustrada de bienes o servicios del empleador.
   - Uso o entrega a terceros de información reservada del empleador.
   - Concurrencia reiterada en estado de embriaguez o bajo influencia de drogas.
   - Actos de violencia, grave indisciplina, injuria o faltamiento de palabra contra el empleador o compañeros.
   - Daño intencional a edificios, instalaciones, maquinarias, instrumentos o materias primas.
   - Abandono de trabajo por más de 3 días consecutivos o más de 5 días en un período de 30 días o más de 15 días en un período de 180 días.
b) La condena penal por delito doloso.
c) La inhabilitación del trabajador por más de 3 meses.

CAUSAS RELACIONADAS CON LA CAPACIDAD (Art. 23):
a) Detrimento de la facultad física o mental o ineptitud sobrevenida, determinante para el desempeño de sus tareas.
b) Rendimiento deficiente en relación con la capacidad del trabajador y con el rendimiento promedio en labores y bajo condiciones similares.
c) Negativa injustificada del trabajador a someterse a examen médico previamente convenido o establecido por ley.

PROCEDIMIENTO OBLIGATORIO (Art. 31-32):
- Carta de preaviso con descripción precisa de la causa, otorgando plazo no menor de 6 días naturales para descargos (30 días para rendimiento deficiente).
- Carta de despido indicando la causa y la fecha de cese.
- El despido sin seguir este procedimiento es considerado arbitrario.`,
    tags: ['despido', 'falta grave', 'causa justa', 'conducta', 'capacidad', 'preaviso', 'descargos', 'ds 003-97-tr', 'abandono'],
    vigente: true,
  },
  {
    id: 'despido-nulo-detalle',
    norma: 'D.S. 003-97-TR',
    articulo: 'Art. 29',
    titulo: 'Despido Nulo — Causales y Efectos',
    texto: `El artículo 29 del D.S. 003-97-TR establece los supuestos de despido nulo, que constituyen la máxima protección contra el despido:

CAUSALES DE NULIDAD DEL DESPIDO:
1. La afiliación a un sindicato o la participación en actividades sindicales.
2. Ser candidato a representante de los trabajadores o actuar o haber actuado en esa calidad.
3. Presentar una queja o participar en un proceso contra el empleador ante las autoridades competentes (represalia).
4. La discriminación por razón de sexo, raza, religión, opinión, idioma, discapacidad o de cualquier otra índole.
5. El embarazo, si el despido se produce en cualquier momento del período de gestación o dentro de los 90 días posteriores al parto (se presume que el despido tiene por motivo el embarazo si el empleador no acredita causa justa).

EFECTOS DEL DESPIDO NULO (si se declara fundada la demanda):
- Reposición del trabajador en su puesto de trabajo, en las mismas condiciones.
- Pago de remuneraciones devengadas (desde la fecha del despido hasta la reposición efectiva).
- Pago de beneficios sociales dejados de percibir (CTS, gratificaciones, vacaciones).
- El trabajador puede optar, alternativamente, por la indemnización por despido arbitrario (1.5 remuneraciones por año, tope 12).

CARGA DE LA PRUEBA:
- En el despido nulo, la carga de la prueba se invierte: el empleador debe acreditar que el despido obedeció a causa justa y no al motivo prohibido.
- En el caso de trabajadora gestante, la mera acreditación del estado de embarazo al momento del despido genera la presunción de nulidad.

PLAZO PARA DEMANDAR: 30 días hábiles desde el despido (caducidad).`,
    tags: ['despido nulo', 'nulidad', 'reposicion', 'embarazo', 'sindical', 'discriminacion', 'represalia', 'art 29', 'ds 003-97-tr'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // SEGURO DE VIDA LEY — D.Leg. 688
  // ══════════════════════════════════════════════════════════════
  {
    id: 'seguro-vida-ley-detalle',
    norma: 'D.Leg. 688',
    titulo: 'Seguro de Vida Ley para Trabajadores',
    texto: `El Decreto Legislativo 688 establece la obligación del empleador de contratar un seguro de vida para sus trabajadores:

OBLIGACIÓN:
- El empleador está obligado a contratar el seguro de vida a partir de los 4 años de servicios del trabajador.
- Sin embargo, el empleador puede contratarlo facultativamente a partir de los 3 meses de servicios.
- En trabajos de alto riesgo, la obligación nace desde el primer día.

COBERTURA:
- Muerte natural del trabajador: 16 remuneraciones mensuales.
- Muerte accidental del trabajador: 32 remuneraciones mensuales.
- Invalidez total y permanente por accidente: 32 remuneraciones mensuales.
- La remuneración base de cálculo es el promedio de lo percibido en el último trimestre previo al siniestro, con un mínimo de la RMV vigente.

BENEFICIARIOS:
- Cónyuge o conviviente e hijos del trabajador.
- A falta de estos, los padres y hermanos menores de 18 años.

PRIMA:
- Es de cargo exclusivo del empleador.
- Se calcula como un porcentaje de la remuneración mensual: 0.53% para empleados, 0.71% para obreros, 1.46% para trabajadores de alto riesgo.
- El incumplimiento de la contratación del seguro no exime al empleador; en caso de siniestro, el empleador queda directamente obligado al pago de los beneficios.

SANCIONES:
- No contratar el seguro de vida ley constituye infracción grave (D.S. 019-2006-TR Art. 24.8).
- En caso de fallecimiento sin seguro, el empleador responde con su patrimonio por el monto total del beneficio.`,
    tags: ['seguro vida ley', 'seguro vida', 'dleg 688', 'muerte', 'accidente', 'invalidez', 'prima', 'beneficiarios', 'alto riesgo'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // CONCEPTOS REMUNERATIVOS Y RETENCIONES
  // ══════════════════════════════════════════════════════════════
  {
    id: 'conceptos-remunerativos',
    norma: 'D.S. 003-97-TR',
    articulo: 'Arts. 6-7',
    titulo: 'Conceptos Remunerativos y No Remunerativos',
    texto: `Los artículos 6 y 7 del D.S. 003-97-TR definen los conceptos remunerativos y no remunerativos:

REMUNERACIÓN (Art. 6):
Constituye remuneración todo pago en dinero o en especie que sea de libre disposición del trabajador, siempre que sea otorgado como contraprestación por sus servicios. Incluye:
- Sueldo o salario básico.
- Asignación familiar (10% RMV = S/ 113).
- Gratificaciones (julio y diciembre).
- Comisiones por ventas.
- Horas extras.
- Bonificaciones regulares y permanentes.
- Alimentación principal (desayuno, almuerzo o cena proporcionados por el empleador en forma directa).

CONCEPTOS NO REMUNERATIVOS (Art. 7):
No constituyen remuneración computable para efectos de cálculo de beneficios sociales:
- Gratificaciones extraordinarias u otros pagos ocasionales por liberalidad del empleador.
- Participación en las utilidades de la empresa.
- Condiciones de trabajo: bienes o dinero para el cabal desempeño de las funciones (movilidad, viáticos, herramientas).
- Canasta de Navidad o similares.
- Valor del transporte supeditado a la asistencia al centro de trabajo.
- Asignación o bonificación por educación (una vez al año, monto razonable, debidamente sustentada).
- Prestaciones alimentarias vía suministro indirecto (Ley 28051).
- La CTS y sus intereses.

IMPORTANCIA DE LA DISTINCIÓN:
La calificación como remunerativo determina si el concepto se incluye en la base de cálculo de CTS, gratificaciones, vacaciones, indemnización por despido y aportes a EsSalud, AFP/ONP.`,
    tags: ['remuneracion', 'remunerativo', 'no remunerativo', 'sueldo', 'salario', 'condicion trabajo', 'base calculo', 'ds 003-97-tr', 'beneficios sociales'],
    vigente: true,
  },
  {
    id: 'retenciones-obligatorias',
    norma: 'Múltiples normas',
    titulo: 'Retenciones Obligatorias sobre la Remuneración del Trabajador',
    texto: `El empleador está obligado a realizar las siguientes retenciones sobre la remuneración del trabajador y declararlas oportunamente:

1. SISTEMA PREVISIONAL (AFP u ONP):
- ONP (Sistema Nacional de Pensiones): 13% de la remuneración asegurable.
- AFP (Sistema Privado de Pensiones): aporte obligatorio (10%) + prima de seguro + comisión (variable según AFP, entre 12.5% y 14.5% total aproximado).
- El trabajador elige libremente entre ONP y AFP. Una vez afiliado a una AFP, el retorno a la ONP es excepcional.

2. IMPUESTO A LA RENTA DE QUINTA CATEGORÍA:
- Se aplica a trabajadores cuya remuneración anual proyectada supere las 7 UIT (S/ 38,500 en 2026).
- Tasas progresivas: 8% hasta 5 UIT, 14% por el exceso de 5 UIT hasta 20 UIT, 17% por el exceso de 20 UIT hasta 35 UIT, 20% por el exceso de 35 UIT hasta 45 UIT, 30% por el exceso de 45 UIT.
- El empleador calcula y retiene mensualmente (procedimiento de retención del Art. 40 del Reglamento del TUO de la LIR).

3. APORTES DEL EMPLEADOR (no son retenciones, sino contribuciones):
- EsSalud: 9% de la remuneración (a cargo del empleador).
- SCTR (Seguro Complementario de Trabajo de Riesgo): obligatorio para actividades de alto riesgo. Cubre salud y pensión.
- SENATI: 0.75% (empresas industriales con más de 20 trabajadores).

4. DESCUENTOS JUDICIALES:
- Pensiones alimenticias ordenadas judicialmente: hasta el 60% de los ingresos del trabajador.
- El empleador es responsable solidario si no efectúa la retención judicial.

PLAZOS: Las contribuciones a AFP se pagan dentro de los primeros 5 días hábiles del mes siguiente. ONP y EsSalud según cronograma SUNAT.`,
    tags: ['retencion', 'afp', 'onp', 'quinta categoria', 'impuesto renta', 'essalud', 'sctr', 'descuento judicial', 'planilla', 'aportes'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // PLAZOS Y PRESCRIPCIÓN
  // ══════════════════════════════════════════════════════════════
  {
    id: 'plazos-registro-declaracion',
    norma: 'Múltiples normas',
    titulo: 'Plazos de Registro y Declaración Laboral',
    texto: `Principales plazos que el empleador debe cumplir en materia laboral y de seguridad social:

T-REGISTRO (Registro de Información Laboral):
- Alta del trabajador: dentro del día anterior al inicio de la prestación de servicios (habilitado hasta las 24:00 horas del día previo).
- Baja del trabajador: primer día hábil siguiente al cese.
- Modificación de datos: dentro de los 5 días hábiles de ocurrido el cambio.

PLAME (Planilla Mensual de Pagos):
- Declaración y pago mensual según cronograma SUNAT (basado en el último dígito del RUC, generalmente entre los días 10 y 20 del mes siguiente).
- Incluye: remuneraciones, retenciones de 5ta categoría, aportes a EsSalud, ONP, SCTR.

CONTRATOS A PLAZO FIJO:
- Registro ante el MTPE (a través de la plataforma virtual): dentro de los 15 días naturales de su celebración.
- No registrar el contrato no lo invalida, pero constituye infracción leve.

CTS:
- Depósito semestral: antes del 15 de mayo (noviembre-abril) y antes del 15 de noviembre (mayo-octubre).
- Entrega de liquidación al trabajador: dentro de los 5 días hábiles del depósito.

GRATIFICACIONES:
- Pago: primera quincena de julio y primera quincena de diciembre.

AFP:
- Pago de aportes: dentro de los primeros 5 días hábiles del mes siguiente al devengue.
- Declaración sin pago genera intereses moratorios y cobranza coactiva.

UTILIDADES:
- Distribución: dentro de los 30 días naturales siguientes al vencimiento del plazo para la DJ Anual de Renta.

BOLETAS DE PAGO:
- Entrega al trabajador: dentro de los 3 días hábiles siguientes a la fecha de pago.`,
    tags: ['plazo', 't-registro', 'plame', 'cts deposito', 'gratificacion pago', 'afp', 'boleta pago', 'declaracion', 'cronograma'],
    vigente: true,
  },
  {
    id: 'prescripcion-beneficios',
    norma: 'Ley 27321 / D.S. 003-97-TR',
    titulo: 'Prescripción de Derechos y Beneficios Laborales',
    texto: `La prescripción laboral determina el plazo máximo para reclamar derechos laborales:

PRESCRIPCIÓN DE ACCIONES LABORALES (Ley 27321):
- Las acciones por derechos derivados de la relación laboral prescriben a los 4 años, contados desde el día siguiente en que se extingue el vínculo laboral.
- Durante la vigencia de la relación laboral, no corre la prescripción para los derechos laborales.

PLAZOS ESPECIALES:
- Despido nulo: 30 días hábiles desde el despido (caducidad, no prescripción).
- Despido arbitrario (indemnización): 30 días hábiles desde el despido (caducidad).
- Hostilidad (actos de hostilidad del empleador): 30 días hábiles desde el acto de hostilidad.
- Estos plazos de caducidad son improrrogables y fatales.

BENEFICIOS LABORALES ESPECÍFICOS:
- CTS: 4 años desde la extinción del vínculo laboral.
- Gratificaciones: 4 años desde la extinción.
- Vacaciones (indemnización por no goce): 4 años desde la extinción.
- Utilidades: 4 años desde que debieron ser pagadas.
- Horas extras: 4 años desde la extinción.

INTERRUPCIÓN Y SUSPENSIÓN:
- La prescripción se interrumpe con la interposición de la demanda laboral.
- También se interrumpe con el reconocimiento expreso de la deuda por el empleador.
- La prescripción suspendida se reanuda una vez cesada la causa de suspensión.

NOTA PRÁCTICA: Los 4 años se cuentan desde el cese. Si un trabajador cesó el 01/01/2023, puede reclamar hasta el 01/01/2027. Todos los beneficios adeudados durante la relación laboral están dentro del reclamo.`,
    tags: ['prescripcion', 'caducidad', 'plazo', '4 años', '30 dias', 'demanda', 'reclamacion', 'extincion', 'ley 27321'],
    vigente: true,
  },

  // ══════════════════════════════════════════════════════════════
  // FERIADOS 2026
  // ══════════════════════════════════════════════════════════════
  {
    id: 'feriados-2026',
    norma: 'D.Leg. 713 / Leyes especiales',
    titulo: 'Feriados No Laborables con Goce de Remuneración — Año 2026',
    texto: `Los feriados nacionales obligatorios con descanso remunerado para el año 2026 son (D.Leg. 713 Art. 6):

1. 01 de enero — Año Nuevo (jueves)
2. 02 de abril — Jueves Santo (jueves)
3. 03 de abril — Viernes Santo (viernes)
4. 01 de mayo — Día del Trabajo (viernes)
5. 07 de junio — Batalla de Arica (domingo)
6. 29 de junio — San Pedro y San Pablo (lunes)
7. 23 de julio — Día de la Fuerza Aérea del Perú (jueves)
8. 28 de julio — Fiestas Patrias (martes)
9. 29 de julio — Fiestas Patrias (miércoles)
10. 06 de agosto — Batalla de Junín (jueves)
11. 30 de agosto — Santa Rosa de Lima (domingo)
12. 08 de octubre — Combate de Angamos (jueves)
13. 01 de noviembre — Día de Todos los Santos (domingo)
14. 08 de diciembre — Inmaculada Concepción (martes)
15. 09 de diciembre — Batalla de Ayacucho (miércoles)
16. 25 de diciembre — Navidad (viernes)

REGLAS PARA EL PAGO:
- Si el trabajador labora en día feriado sin descanso sustitutorio, percibe triple remuneración: (1) remuneración por el feriado + (2) remuneración por el trabajo realizado + (3) sobretasa del 100%.
- Los feriados que caen en domingo no generan pago adicional salvo que el trabajador labore ese día.
- Los días no laborables del sector público no son aplicables al sector privado, salvo que el empleador lo disponga por convenio o decisión unilateral. Estos días son compensables.`,
    tags: ['feriado', 'feriados 2026', 'dia libre', 'descanso', 'triple pago', 'fiestas patrias', 'navidad', 'año nuevo', 'dleg 713'],
    vigente: true,
    fechaVigencia: '2026-01-01',
  },

  // ══════════════════════════════════════════════════════════════
  // JURISPRUDENCIA RELEVANTE
  // ══════════════════════════════════════════════════════════════
  {
    id: 'juris-desnaturalizacion-locacion',
    norma: 'Jurisprudencia — Casación Laboral',
    titulo: 'Desnaturalización de Contratos de Locación de Servicios',
    texto: `La jurisprudencia laboral peruana ha consolidado criterios sobre la desnaturalización de contratos de locación de servicios (contratos civiles) en relaciones laborales encubiertas:

PRINCIPIO DE PRIMACÍA DE LA REALIDAD:
El Tribunal Constitucional (Exp. 1944-2002-AA/TC) y la Corte Suprema han establecido que cuando existe discordancia entre lo que ocurre en la práctica y lo que señalan los documentos, prevalece la realidad. Si un prestador de servicios cumple horario, recibe instrucciones, usa herramientas del comitente y percibe una contraprestación periódica, existe relación laboral independientemente del contrato suscrito.

ELEMENTOS DE LA LABORALIDAD:
1. Prestación personal: el servicio es realizado por la misma persona, no puede ser delegado.
2. Subordinación: el prestador cumple órdenes, horarios, reporta avances, usa uniforme o credencial.
3. Remuneración: pago periódico y fijo, no vinculado a resultados específicos de un proyecto.

CONSECUENCIAS DE LA DESNATURALIZACIÓN:
- Se reconoce relación laboral a plazo indeterminado desde el inicio de la prestación.
- El trabajador tiene derecho a todos los beneficios laborales: CTS, gratificaciones, vacaciones, seguro, utilidades.
- El empleador debe regularizar el registro en T-REGISTRO y PLAME.
- Multa SUNAFIL por no registrar al trabajador en planilla (infracción grave).

CASACIONES RELEVANTES:
- Casación Laboral N.o 7358-2013-CUSCO: subordinación acreditada por correos electrónicos con instrucciones.
- Casación Laboral N.o 11169-2014-JUNÍN: prestación continua por más de 1 año genera presunción de laboralidad.
- Casación Laboral N.o 4936-2014-CALLAO: el uso de RHE (recibo por honorarios electrónico) no desvirtúa la existencia de relación laboral.`,
    tags: ['desnaturalizacion', 'locacion servicios', 'primacia realidad', 'subordinacion', 'recibo honorarios', 'laboralidad', 'contrato civil', 'jurisprudencia'],
    vigente: true,
  },
  {
    id: 'juris-cts-deposito',
    norma: 'Jurisprudencia — D.S. 001-97-TR',
    titulo: 'Jurisprudencia sobre CTS — Depósito Oportuno y Sanciones',
    texto: `La jurisprudencia ha precisado aspectos relevantes del depósito de la CTS:

OBLIGACIÓN DE DEPÓSITO SEMESTRAL:
- La CTS debe depositarse dentro de los primeros 15 días de mayo y noviembre de cada año (Art. 21 D.S. 001-97-TR).
- La base de cálculo es la remuneración computable del trabajador al 30 de abril y 31 de octubre, respectivamente.
- El depósito se realiza en la entidad financiera elegida por el trabajador.

INTERESES POR DEPÓSITO TARDÍO:
- Casación Laboral N.o 1780-2012-JUNÍN: el empleador que no deposita la CTS oportunamente debe pagar intereses legales laborales (tasa fijada por el BCR) que se capitalizan al depósito.
- Los intereses se computan desde el día siguiente al vencimiento del plazo (16 de mayo o 16 de noviembre).

CAMBIO DE ENTIDAD DEPOSITARIA:
- El trabajador puede cambiar libremente la entidad depositaria comunicando al empleador. El empleador tiene 8 días hábiles para efectuar el traslado.

CTS COMO INTANGIBLE:
- La CTS es intangible e inembargable, salvo por alimentos y hasta el 50%.
- Disponibilidad: el trabajador puede disponer hasta del 100% del exceso de 4 remuneraciones brutas depositadas.

LIQUIDACIÓN DE CTS AL CESE:
- Al cese del trabajador, el empleador debe entregar una constancia de cese dentro de las 48 horas para que el trabajador pueda retirar el 100% de su CTS.
- Si el empleador no cumple con entregar la carta de cese, la entidad financiera libera los fondos transcurridos 15 días calendario con la sola presentación de la carta notarial del trabajador.

INCUMPLIMIENTO:
- No depositar la CTS es infracción grave tipificada en el Art. 24.4 del D.S. 019-2006-TR.
- El empleador además responde por los rendimientos que la CTS hubiera generado en la entidad financiera.`,
    tags: ['cts', 'deposito cts', 'intangible', 'intereses', 'carta cese', 'liquidacion', 'ds 001-97-tr', 'jurisprudencia', 'entidad financiera'],
    vigente: true,
  },
  {
    id: 'juris-hostigamiento-obligaciones',
    norma: 'Ley 27942 / D.S. 014-2019-MIMP',
    titulo: 'Obligaciones del Empleador frente al Hostigamiento Sexual',
    texto: `La Ley 27942 (modificada por la Ley 30709) y el D.S. 014-2019-MIMP establecen obligaciones específicas del empleador:

OBLIGACIONES PREVENTIVAS:
1. Contar con una Política de Prevención y Sanción del Hostigamiento Sexual aprobada y comunicada a todos los trabajadores.
2. Capacitar anualmente a los trabajadores sobre hostigamiento sexual (concepto, manifestaciones, canales de denuncia, protección de víctimas).
3. Exhibir en lugar visible los canales de denuncia.
4. Conformar un Comité de Intervención frente al Hostigamiento Sexual (empresas con 20 o más trabajadores) o designar un delegado (menos de 20 trabajadores).
5. Implementar medidas de difusión y prevención adaptadas a la actividad de la empresa.

OBLIGACIONES ANTE UNA DENUNCIA:
1. Recibir la queja por cualquier medio (escrito, verbal, digital).
2. Dictar medidas de protección dentro de las 72 horas (traslado del presunto hostigador, rotación de horarios, suspensión temporal, impedimento de acercamiento).
3. Iniciar investigación interna en un plazo de 3 días hábiles.
4. La investigación no debe exceder de 15 días calendario.
5. Emitir resolución en 5 días hábiles tras la investigación.
6. Comunicar el resultado al denunciante y aplicar sanción si corresponde (amonestación, suspensión o despido por falta grave).

SANCIONES POR INCUMPLIMIENTO:
- Infracción muy grave (D.S. 019-2006-TR Art. 25.7).
- Multa de hasta 52.53 UIT (S/ 288,915).
- Responsabilidad civil solidaria del empleador por los daños causados al trabajador hostigado si no actuó con debida diligencia.

JURISPRUDENCIA:
- Casación Laboral N.o 3804-2014-JUNÍN: el incumplimiento de las obligaciones preventivas agrava la responsabilidad del empleador.
- Resolución de SUNAFIL: la falta de política escrita de hostigamiento sexual es sancionable incluso sin denuncia previa.`,
    tags: ['hostigamiento sexual', 'acoso', 'ley 27942', 'comite intervencion', 'politica hostigamiento', 'medidas proteccion', 'denuncia', 'ds 014-2019-mimp'],
    vigente: true,
  },
  {
    id: 'juris-examenes-medicos',
    norma: 'Ley 29783 / D.S. 005-2012-TR',
    titulo: 'Exámenes Médicos Ocupacionales — Obligaciones y Jurisprudencia',
    texto: `La Ley 29783 de Seguridad y Salud en el Trabajo establece la obligación de realizar exámenes médicos ocupacionales:

TIPOS DE EXÁMENES MÉDICOS:
1. Examen médico pre-ocupacional (antes del inicio de labores): obligatorio para actividades de alto riesgo, recomendado para todas las actividades.
2. Examen médico periódico (durante la relación laboral):
   - Actividades de alto riesgo: cada 2 años como mínimo.
   - Otras actividades: cada 2 años, con posibilidad de ser solicitado por el trabajador.
3. Examen médico de retiro (al cese): obligatorio para actividades de alto riesgo, se realiza dentro de los últimos 30 días de la relación laboral.

OBLIGACIONES DEL EMPLEADOR:
- Asumir el costo íntegro de los exámenes médicos (Art. 49.d Ley 29783).
- Garantizar la confidencialidad de los resultados médicos (datos sensibles según Ley 29733).
- Los exámenes deben ser realizados por un médico ocupacional con título de especialista.
- Entregar los resultados individuales al trabajador.
- Mantener el registro de exámenes médicos por 20 años (Art. 28 D.S. 005-2012-TR).
- Comunicar a los trabajadores los resultados generales (estadísticos, no individuales).

ACTIVIDADES DE ALTO RIESGO (Anexo 5 D.S. 009-97-SA):
Incluyen: minería, construcción civil, pesca, manufactura de explosivos, petróleo y gas, metalurgia, electricidad con alta tensión, entre otras.

CONSECUENCIAS POR INCUMPLIMIENTO:
- Infracción grave en materia de SST (D.S. 019-2006-TR Art. 27).
- Si un trabajador sufre enfermedad profesional sin examen médico previo, se presume que la enfermedad es de origen ocupacional (inversión de la carga de la prueba).

JURISPRUDENCIA:
- Casación N.o 18190-2016-LIMA: la falta de examen médico de retiro no impide al trabajador reclamar indemnización por enfermedad profesional.
- Resolución SUNAFIL: la falta de exámenes médicos periódicos se sanciona por cada trabajador afectado.`,
    tags: ['examen medico', 'medico ocupacional', 'alto riesgo', 'pre ocupacional', 'retiro', 'periodico', 'ley 29783', 'sst', 'enfermedad profesional'],
    vigente: true,
  },
  {
    id: 'juris-despido-incausado',
    norma: 'Jurisprudencia — Tribunal Constitucional',
    titulo: 'Despido Incausado — Doctrina del Tribunal Constitucional',
    texto: `El Tribunal Constitucional del Perú ha desarrollado la doctrina del despido incausado como una categoría de protección constitucional contra el despido:

DEFINICIÓN:
El despido incausado se produce cuando se despide al trabajador, ya sea de manera verbal o escrita, sin expresarle causa alguna derivada de su conducta o su labor que justifique la decisión (STC Exp. 976-2001-AA/TC, caso Eusebio Llanos Huasco).

DIFERENCIA CON OTRAS CATEGORÍAS:
- Despido arbitrario (Art. 34 D.S. 003-97-TR): no se acredita causa justa, da derecho a indemnización (1.5 remuneraciones por año, tope 12).
- Despido incausado (creación jurisprudencial del TC): no se invoca causa alguna, da derecho a reposición.
- Despido nulo (Art. 29 D.S. 003-97-TR): motivo prohibido (sindical, embarazo, discriminación), da derecho a reposición + devengados.
- Despido fraudulento (creación jurisprudencial del TC): se invoca causa falsa o inexistente, da derecho a reposición.

REQUISITOS PARA LA REPOSICIÓN POR DESPIDO INCAUSADO:
1. El trabajador debe haber superado el período de prueba.
2. El despido debe haberse producido sin carta de preaviso ni carta de despido con expresión de causa.
3. La vía procedimental es el proceso de amparo constitucional (vía urgente y residual).

PRECEDENTES VINCULANTES:
- STC Exp. 976-2001-AA/TC (Llanos Huasco): establece las tres categorías de despido inconstitucional.
- STC Exp. 206-2005-PA/TC (Baylón Flores): establece reglas de competencia entre la vía constitucional y la vía ordinaria laboral.
- II Pleno Jurisdiccional Supremo Laboral (2014): el juez laboral puede ordenar la reposición por despido incausado y fraudulento en la vía ordinaria (proceso abreviado laboral).

CONSECUENCIAS:
- Reposición en el puesto de trabajo.
- Pago de remuneraciones devengadas (criterio mayoritario desde el Pleno Nacional Laboral 2019).
- Pago de beneficios sociales correspondientes al período no laborado.
- El empleador puede ser sancionado adicionalmente por SUNAFIL si se verifica un patrón de despidos sin causa.`,
    tags: ['despido incausado', 'reposicion', 'tribunal constitucional', 'amparo', 'llanos huasco', 'baylon flores', 'despido fraudulento', 'despido arbitrario', 'jurisprudencia'],
    vigente: true,
  },
]

// ─── Helper: obtener todos los tags únicos del corpus ──────────────────────────
export const ALL_TAGS = [...new Set(LEGAL_CORPUS.flatMap(c => c.tags))]

// ─── Helper: buscar por ID ──────────────────────────────────────────────────────
export function getChunkById(id: string): LegalChunk | undefined {
  return LEGAL_CORPUS.find(c => c.id === id)
}
