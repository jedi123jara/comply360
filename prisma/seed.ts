import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🏗️  Iniciando seed de COMPLY360...\n')

  // =============================================
  // 1. NORMAS LEGALES (17 normas principales)
  // =============================================
  console.log('📜 Creando normas legales...')

  const normas = await Promise.all([
    prisma.legalNorm.upsert({
      where: { code: 'DLEG-728' },
      update: {},
      create: {
        code: 'DLEG-728',
        title: 'Ley de Productividad y Competitividad Laboral',
        category: 'LABORAL',
        bodyText: 'Texto Unico Ordenado del Decreto Legislativo 728. Norma base del regimen laboral general de la actividad privada. Regula contratos de trabajo, periodo de prueba, suspension y extincion del vinculo laboral, indemnizacion por despido arbitrario.',
        publishedAt: new Date('1997-03-27'),
        effectiveAt: new Date('1997-03-27'),
        sourceUrl: 'https://www.gob.pe/institucion/mtpe/normas-legales/dl-728',
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'DS-003-97-TR' },
      update: {},
      create: {
        code: 'DS-003-97-TR',
        title: 'TUO de la Ley de Productividad y Competitividad Laboral',
        category: 'LABORAL',
        bodyText: 'Reglamento del D.Leg. 728. Define tipos de contrato (indefinido, plazo fijo, tiempo parcial), causas justas de despido, procedimiento de despido, indemnizacion (1.5 sueldos/anio tope 12 para indefinido, 1.5/mes restante para plazo fijo).',
        publishedAt: new Date('1997-03-27'),
        effectiveAt: new Date('1997-03-27'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'DS-001-97-TR' },
      update: {},
      create: {
        code: 'DS-001-97-TR',
        title: 'TUO de la Ley de Compensacion por Tiempo de Servicios (CTS)',
        category: 'LABORAL',
        bodyText: 'Regula la CTS como beneficio social. Deposito semestral: 15 mayo y 15 noviembre. Formula: remuneracion computable (sueldo + asignacion familiar + 1/6 gratificacion) dividido entre 12 por meses trabajados mas fraccion de dias. Aplica a trabajadores con jornada minima de 4 horas diarias.',
        publishedAt: new Date('1997-03-01'),
        effectiveAt: new Date('1997-03-01'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'LEY-27735' },
      update: {},
      create: {
        code: 'LEY-27735',
        title: 'Ley que regula el otorgamiento de Gratificaciones',
        category: 'LABORAL',
        bodyText: 'Gratificaciones de julio (Fiestas Patrias) y diciembre (Navidad). Equivalen a una remuneracion mensual completa si trabajo los 6 meses del semestre. Si trabajo menos, se calcula proporcional (sextos). Incluye bonificacion extraordinaria del 9% (aporte EsSalud) segun Ley 30334.',
        publishedAt: new Date('2002-05-28'),
        effectiveAt: new Date('2002-05-28'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'DS-005-2002-TR' },
      update: {},
      create: {
        code: 'DS-005-2002-TR',
        title: 'Reglamento de la Ley de Gratificaciones',
        category: 'LABORAL',
        bodyText: 'Reglamento de la Ley 27735. Detalla calculo de gratificaciones, remuneracion computable, trabajadores con derecho, oportunidad de pago (primera quincena de julio y diciembre).',
        publishedAt: new Date('2002-07-04'),
        effectiveAt: new Date('2002-07-04'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'DLEG-713' },
      update: {},
      create: {
        code: 'DLEG-713',
        title: 'Decreto Legislativo sobre Descansos Remunerados (Vacaciones)',
        category: 'LABORAL',
        bodyText: 'Regula vacaciones anuales: 30 dias calendario por cada anio completo de servicios. Record vacacional: anio continuo de labor. Si no se gozan en el periodo, genera indemnizacion: una remuneracion por el descanso no gozado mas otra por no haberlo disfrutado (triple vacacional si acumula 2 periodos). Vacaciones truncas: proporcional al tiempo trabajado.',
        publishedAt: new Date('1991-11-08'),
        effectiveAt: new Date('1991-11-08'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'DS-012-92-TR' },
      update: {},
      create: {
        code: 'DS-012-92-TR',
        title: 'Reglamento del Decreto Legislativo 713 (Vacaciones)',
        category: 'LABORAL',
        bodyText: 'Reglamento de vacaciones. Detalla record vacacional, oportunidad de goce, acumulacion, reduccion, vacaciones truncas y su calculo proporcional.',
        publishedAt: new Date('1992-12-03'),
        effectiveAt: new Date('1992-12-03'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'DS-007-2002-TR' },
      update: {},
      create: {
        code: 'DS-007-2002-TR',
        title: 'TUO de la Ley de Jornada de Trabajo, Horario y Trabajo en Sobretiempo',
        category: 'LABORAL',
        bodyText: 'Jornada maxima: 8 horas diarias o 48 horas semanales. Horas extras: primeras 2 horas con sobretasa 25%, siguientes con 35%. Trabajo en dia de descanso: sobretasa 100%. Trabajo nocturno: sobretasa minima 35% sobre RMV.',
        publishedAt: new Date('2002-07-04'),
        effectiveAt: new Date('2002-07-04'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'LEY-29783' },
      update: {},
      create: {
        code: 'LEY-29783',
        title: 'Ley de Seguridad y Salud en el Trabajo',
        category: 'SEGURIDAD_SALUD',
        bodyText: 'Establece el Sistema de Gestion de SST. Obligaciones: politica SST, IPERC, plan anual SST, comite SST (>=20 trabajadores) o supervisor (<20), registro de accidentes, 4 capacitaciones minimas anuales, examenes medicos ocupacionales, entrega de EPP, mapa de riesgos. Aplica a todos los sectores economicos.',
        publishedAt: new Date('2011-08-20'),
        effectiveAt: new Date('2011-08-20'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'DS-005-2012-TR' },
      update: {},
      create: {
        code: 'DS-005-2012-TR',
        title: 'Reglamento de la Ley de Seguridad y Salud en el Trabajo',
        category: 'SEGURIDAD_SALUD',
        bodyText: 'Reglamento de la Ley 29783. Detalla implementacion del SGSST, registros obligatorios (8 registros), proceso electoral del comite SST, investigacion de accidentes, examenes medicos, capacitaciones, responsabilidades del empleador.',
        publishedAt: new Date('2012-04-25'),
        effectiveAt: new Date('2012-04-25'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'DS-019-2006-TR' },
      update: {},
      create: {
        code: 'DS-019-2006-TR',
        title: 'Reglamento de la Ley General de Inspeccion del Trabajo',
        category: 'SUNAFIL',
        bodyText: 'Cuadro de infracciones laborales: leves (Art. 23), graves (Art. 24), muy graves (Art. 25). Escala de multas segun numero de trabajadores afectados. Multas van desde 0.045 UIT hasta 52.53 UIT. Reincidencia: +50%. Subsanacion voluntaria: hasta 90% de descuento.',
        publishedAt: new Date('2006-10-29'),
        effectiveAt: new Date('2006-10-29'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'LEY-28806' },
      update: {},
      create: {
        code: 'LEY-28806',
        title: 'Ley General de Inspeccion del Trabajo',
        category: 'SUNAFIL',
        bodyText: 'Marco legal de la inspeccion laboral. Define competencias de SUNAFIL, tipos de actuaciones inspectivas (visitas, comparecencias, comprobacion de datos), procedimiento sancionador, recursos impugnatorios, beneficio de subsanacion voluntaria (Art. 40).',
        publishedAt: new Date('2006-07-22'),
        effectiveAt: new Date('2006-07-22'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'LEY-27942' },
      update: {},
      create: {
        code: 'LEY-27942',
        title: 'Ley de Prevencion y Sancion del Hostigamiento Sexual',
        category: 'LABORAL',
        bodyText: 'Define hostigamiento sexual en el ambito laboral. Obligaciones del empleador: politica de prevencion y sancion, comite de intervencion, canal de denuncias, capacitacion anual obligatoria, medidas de proteccion inmediatas (3 dias), investigacion (30 dias), resolucion (5 dias).',
        publishedAt: new Date('2003-02-27'),
        effectiveAt: new Date('2003-02-27'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'DS-014-2019-MIMP' },
      update: {},
      create: {
        code: 'DS-014-2019-MIMP',
        title: 'Reglamento de la Ley de Hostigamiento Sexual',
        category: 'LABORAL',
        bodyText: 'Reglamento actualizado de la Ley 27942. Detalla elementos de la politica obligatoria, conformacion del comite de intervencion, procedimiento de investigacion, plazos, medidas de proteccion, sanciones, registro de casos.',
        publishedAt: new Date('2019-07-22'),
        effectiveAt: new Date('2019-07-22'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'LEY-32353' },
      update: {},
      create: {
        code: 'LEY-32353',
        title: 'Ley MYPE - Regimen Laboral Especial de Micro y Pequena Empresa',
        category: 'LABORAL',
        bodyText: 'Regimen especial MYPE (ex Ley 28015). MICROEMPRESA (hasta 10 trabajadores, ventas hasta 150 UIT): sin CTS, sin gratificaciones, vacaciones 15 dias, indemnizacion 10 remuneraciones diarias por anio. PEQUENA EMPRESA (hasta 100 trabajadores, ventas hasta 1700 UIT): 50% CTS, 50% gratificaciones, vacaciones 15 dias, indemnizacion 20 remuneraciones diarias por anio.',
        publishedAt: new Date('2025-01-15'),
        effectiveAt: new Date('2025-02-01'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'LEY-31110' },
      update: {},
      create: {
        code: 'LEY-31110',
        title: 'Ley del Regimen Laboral Agrario y de Incentivos',
        category: 'LABORAL',
        bodyText: 'Regimen agrario. Remuneracion diaria incluye CTS (9.72%) y gratificaciones (16.66%). Jornada acumulativa. Vacaciones: 30 dias por anio. Indemnizacion: 45 remuneraciones diarias por cada anio. SCTR obligatorio. Seguro de vida desde el primer dia.',
        publishedAt: new Date('2020-12-31'),
        effectiveAt: new Date('2021-01-01'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'LEY-30709' },
      update: {},
      create: {
        code: 'LEY-30709',
        title: 'Ley que prohibe la Discriminacion Remunerativa entre Varones y Mujeres',
        category: 'LABORAL',
        bodyText: 'Obligaciones: cuadro de categorias y funciones, politica salarial, bandas remunerativas. Prohibe diferencias salariales por genero para trabajo de igual valor. SUNAFIL fiscaliza cumplimiento.',
        publishedAt: new Date('2017-12-27'),
        effectiveAt: new Date('2018-06-28'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'LEY-29973' },
      update: {},
      create: {
        code: 'LEY-29973',
        title: 'Ley General de la Persona con Discapacidad',
        category: 'LABORAL',
        bodyText: 'Cuota de empleo: empresas con mas de 50 trabajadores deben contratar minimo 3% de personas con discapacidad. Bonificacion del 15% en concursos publicos. Sancion por incumplimiento de cuota.',
        publishedAt: new Date('2012-12-24'),
        effectiveAt: new Date('2012-12-24'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'LEY-31572' },
      update: {},
      create: {
        code: 'LEY-31572',
        title: 'Ley del Teletrabajo',
        category: 'LABORAL',
        bodyText: 'Regula el teletrabajo en Peru. El empleador debe proveer equipos y asumir costos (internet, energia). Derecho a desconexion digital (minimo 12 horas continuas en 24 horas). Contrato debe especificar modalidad (total o parcial), lugar de prestacion, mecanismos de supervision.',
        publishedAt: new Date('2022-09-11'),
        effectiveAt: new Date('2022-09-11'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'LEY-28518' },
      update: {},
      create: {
        code: 'LEY-28518',
        title: 'Ley sobre Modalidades Formativas Laborales',
        category: 'LABORAL',
        bodyText: 'Regula practicas pre-profesionales, profesionales, capacitacion laboral juvenil, pasantia y actualizacion para reinsercion laboral. No genera vinculo laboral. Limite: 20% de la planilla. Subvencion minima: RMV para jornada completa. Seguro contra accidentes. Jornada maxima: 8 horas o 6 horas para menores.',
        publishedAt: new Date('2005-05-24'),
        effectiveAt: new Date('2005-05-24'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'RM-050-2013-TR' },
      update: {},
      create: {
        code: 'RM-050-2013-TR',
        title: 'Formatos Referenciales de los Registros Obligatorios del SGSST',
        category: 'SEGURIDAD_SALUD',
        bodyText: 'Establece los formatos referenciales para los 8 registros obligatorios del SGSST: accidentes, enfermedades ocupacionales, incidentes, investigacion, monitoreo, inspecciones, estadisticas, induccion y capacitacion. Incluye formato IPERC con metodologia de evaluacion de riesgos AxB.',
        publishedAt: new Date('2013-03-14'),
        effectiveAt: new Date('2013-03-14'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'RM-199-2016-TR' },
      update: {},
      create: {
        code: 'RM-199-2016-TR',
        title: 'Protocolo de Fiscalizacion en materia de SST en el sector industrial',
        category: 'SUNAFIL',
        bodyText: 'Protocolo que utiliza SUNAFIL para inspecciones de SST. Define checklist de verificacion, acta de infraccion, acta de requerimiento, tipos de documentos solicitados (28 documentos estandar), procedimiento de la visita inspectiva.',
        publishedAt: new Date('2016-08-30'),
        effectiveAt: new Date('2016-08-30'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'DLEY-22342' },
      update: {},
      create: {
        code: 'DLEY-22342',
        title: 'Ley de Promocion de Exportaciones No Tradicionales',
        category: 'LABORAL',
        bodyText: 'Permite contratacion temporal sucesiva en empresas de exportacion no tradicional. Los contratos se renuevan segun ordenes de compra del exterior. Trabajadores tienen los mismos beneficios del regimen general.',
        publishedAt: new Date('1978-11-21'),
        effectiveAt: new Date('1978-11-21'),
      },
    }),
    prisma.legalNorm.upsert({
      where: { code: 'LEY-30334' },
      update: {},
      create: {
        code: 'LEY-30334',
        title: 'Ley que establece medidas para dinamizar la economia en 2015 (Bonificacion 9%)',
        category: 'LABORAL',
        bodyText: 'Establece la inafectacion de las gratificaciones. El monto que el empleador ahorra por no aportar a EsSalud sobre las gratificaciones (9%) se entrega al trabajador como bonificacion extraordinaria. Vigente de forma permanente.',
        publishedAt: new Date('2015-06-24'),
        effectiveAt: new Date('2015-06-24'),
      },
    }),
  ])

  console.log(`   ✅ ${normas.length} normas legales creadas\n`)

  // =============================================
  // 2. REGLAS DE COMPLIANCE
  // =============================================
  console.log('⚖️  Creando reglas de compliance...')

  const normMap: Record<string, string> = {}
  for (const n of normas) {
    normMap[n.code] = n.id
  }

  const reglas = await Promise.all([
    // --- CTS ---
    prisma.legalRule.upsert({
      where: { ruleKey: 'cts_deposito_semestral' },
      update: {},
      create: {
        normId: normMap['DS-001-97-TR'],
        ruleKey: 'cts_deposito_semestral',
        description: 'CTS debe depositarse antes del 15 de mayo y 15 de noviembre de cada anio',
        formula: '(remuneracion_computable / 12) * meses + (remuneracion_computable / 360) * dias',
        parameters: {
          remuneracion_computable: 'sueldo_bruto + asignacion_familiar + (1/6 * ultima_gratificacion)',
          depositos: ['15 de mayo', '15 de noviembre'],
          jornada_minima_horas: 4,
        },
        outputType: 'NUMBER',
        conditionJson: { regimen: ['GENERAL'], jornada_minima: 4 },
      },
    }),
    prisma.legalRule.upsert({
      where: { ruleKey: 'cts_mype_pequena' },
      update: {},
      create: {
        normId: normMap['LEY-32353'],
        ruleKey: 'cts_mype_pequena',
        description: 'CTS para pequena empresa: 50% del regimen general (15 remuneraciones diarias por anio)',
        formula: '(remuneracion_computable / 12) * meses * 0.5',
        parameters: { factor: 0.5 },
        outputType: 'NUMBER',
        conditionJson: { regimen: ['MYPE_PEQUENA'] },
      },
    }),
    prisma.legalRule.upsert({
      where: { ruleKey: 'cts_mype_micro_exenta' },
      update: {},
      create: {
        normId: normMap['LEY-32353'],
        ruleKey: 'cts_mype_micro_exenta',
        description: 'Microempresa: NO tiene derecho a CTS',
        formula: '0',
        parameters: { exenta: true },
        outputType: 'NUMBER',
        conditionJson: { regimen: ['MYPE_MICRO'] },
      },
    }),

    // --- GRATIFICACIONES ---
    prisma.legalRule.upsert({
      where: { ruleKey: 'gratificacion_julio_diciembre' },
      update: {},
      create: {
        normId: normMap['LEY-27735'],
        ruleKey: 'gratificacion_julio_diciembre',
        description: 'Gratificaciones de julio y diciembre equivalentes a una remuneracion completa + 9% bonificacion',
        formula: '(sueldo_bruto / 6) * meses_trabajados + bonificacion_9_porciento',
        parameters: {
          periodos: { julio: [1,2,3,4,5,6], diciembre: [7,8,9,10,11,12] },
          pago_julio: '15 de julio',
          pago_diciembre: '15 de diciembre',
          bonificacion_essalud: 0.09,
        },
        outputType: 'NUMBER',
        conditionJson: { regimen: ['GENERAL'] },
      },
    }),
    prisma.legalRule.upsert({
      where: { ruleKey: 'gratificacion_mype_pequena' },
      update: {},
      create: {
        normId: normMap['LEY-32353'],
        ruleKey: 'gratificacion_mype_pequena',
        description: 'Gratificaciones pequena empresa: 50% del regimen general',
        formula: '(sueldo_bruto / 6) * meses_trabajados * 0.5',
        parameters: { factor: 0.5 },
        outputType: 'NUMBER',
        conditionJson: { regimen: ['MYPE_PEQUENA'] },
      },
    }),
    prisma.legalRule.upsert({
      where: { ruleKey: 'gratificacion_mype_micro_exenta' },
      update: {},
      create: {
        normId: normMap['LEY-32353'],
        ruleKey: 'gratificacion_mype_micro_exenta',
        description: 'Microempresa: NO tiene derecho a gratificaciones',
        formula: '0',
        parameters: { exenta: true },
        outputType: 'NUMBER',
        conditionJson: { regimen: ['MYPE_MICRO'] },
      },
    }),

    // --- INDEMNIZACION ---
    prisma.legalRule.upsert({
      where: { ruleKey: 'indemnizacion_despido_arbitrario_indefinido' },
      update: {},
      create: {
        normId: normMap['DS-003-97-TR'],
        ruleKey: 'indemnizacion_despido_arbitrario_indefinido',
        description: 'Indemnizacion por despido arbitrario contrato indefinido: 1.5 sueldos por anio, tope 12 sueldos',
        formula: 'min(sueldo * 1.5 * anios + fraccion_proporcional, sueldo * 12)',
        parameters: { factor_por_anio: 1.5, tope_sueldos: 12, articulo: 'Art. 38' },
        outputType: 'NUMBER',
        conditionJson: { tipo_contrato: 'indefinido', motivo: 'despido_arbitrario' },
      },
    }),
    prisma.legalRule.upsert({
      where: { ruleKey: 'indemnizacion_despido_arbitrario_plazo_fijo' },
      update: {},
      create: {
        normId: normMap['DS-003-97-TR'],
        ruleKey: 'indemnizacion_despido_arbitrario_plazo_fijo',
        description: 'Indemnizacion por despido arbitrario contrato plazo fijo: 1.5 sueldos por cada mes restante, tope 12 sueldos',
        formula: 'min(sueldo * 1.5 * meses_restantes, sueldo * 12)',
        parameters: { factor_por_mes: 1.5, tope_sueldos: 12, articulo: 'Art. 76' },
        outputType: 'NUMBER',
        conditionJson: { tipo_contrato: 'plazo_fijo', motivo: 'despido_arbitrario' },
      },
    }),
    prisma.legalRule.upsert({
      where: { ruleKey: 'indemnizacion_mype_micro' },
      update: {},
      create: {
        normId: normMap['LEY-32353'],
        ruleKey: 'indemnizacion_mype_micro',
        description: 'Microempresa: indemnizacion 10 remuneraciones diarias por anio, tope 90 remuneraciones diarias',
        formula: '(sueldo / 30) * 10 * anios',
        parameters: { factor_diario: 10, tope_dias: 90 },
        outputType: 'NUMBER',
        conditionJson: { regimen: ['MYPE_MICRO'] },
      },
    }),
    prisma.legalRule.upsert({
      where: { ruleKey: 'indemnizacion_mype_pequena' },
      update: {},
      create: {
        normId: normMap['LEY-32353'],
        ruleKey: 'indemnizacion_mype_pequena',
        description: 'Pequena empresa: indemnizacion 20 remuneraciones diarias por anio, tope 120 remuneraciones diarias',
        formula: '(sueldo / 30) * 20 * anios',
        parameters: { factor_diario: 20, tope_dias: 120 },
        outputType: 'NUMBER',
        conditionJson: { regimen: ['MYPE_PEQUENA'] },
      },
    }),

    // --- VACACIONES ---
    prisma.legalRule.upsert({
      where: { ruleKey: 'vacaciones_30_dias' },
      update: {},
      create: {
        normId: normMap['DLEG-713'],
        ruleKey: 'vacaciones_30_dias',
        description: 'Vacaciones: 30 dias calendario por anio completo de servicios en regimen general',
        formula: '(sueldo / 30) * dias_pendientes',
        parameters: { dias_por_anio: 30, record_minimo_meses: 12 },
        outputType: 'NUMBER',
        conditionJson: { regimen: ['GENERAL'] },
      },
    }),
    prisma.legalRule.upsert({
      where: { ruleKey: 'vacaciones_15_dias_mype' },
      update: {},
      create: {
        normId: normMap['LEY-32353'],
        ruleKey: 'vacaciones_15_dias_mype',
        description: 'Vacaciones MYPE: 15 dias calendario por anio completo',
        formula: '(sueldo / 30) * dias_pendientes',
        parameters: { dias_por_anio: 15 },
        outputType: 'NUMBER',
        conditionJson: { regimen: ['MYPE_MICRO', 'MYPE_PEQUENA'] },
      },
    }),
    prisma.legalRule.upsert({
      where: { ruleKey: 'triple_vacacional' },
      update: {},
      create: {
        normId: normMap['DLEG-713'],
        ruleKey: 'triple_vacacional',
        description: 'Si el trabajador acumula 2 periodos vacacionales sin goce, tiene derecho a triple remuneracion vacacional',
        formula: 'sueldo * 3',
        parameters: { periodos_acumulados_trigger: 2 },
        outputType: 'NUMBER',
        conditionJson: { periodos_sin_goce: 2 },
      },
    }),

    // --- HORAS EXTRAS ---
    prisma.legalRule.upsert({
      where: { ruleKey: 'horas_extras_sobretiempo' },
      update: {},
      create: {
        normId: normMap['DS-007-2002-TR'],
        ruleKey: 'horas_extras_sobretiempo',
        description: 'Sobretiempo: primeras 2 horas +25%, siguientes +35%, domingos +100%',
        formula: 'valor_hora * (1 + sobretasa) * horas',
        parameters: {
          sobretasa_primeras_2h: 0.25,
          sobretasa_siguientes: 0.35,
          sobretasa_domingo: 1.00,
          sobretasa_nocturna: 0.35,
          jornada_maxima_semanal: 48,
        },
        outputType: 'NUMBER',
      },
    }),

    // --- SST ---
    prisma.legalRule.upsert({
      where: { ruleKey: 'sst_politica_obligatoria' },
      update: {},
      create: {
        normId: normMap['LEY-29783'],
        ruleKey: 'sst_politica_obligatoria',
        description: 'Politica de SST obligatoria con 8 elementos minimos (Art. 22)',
        parameters: {
          elementos: [
            'Proteccion de la seguridad y salud',
            'Cumplimiento de la normativa',
            'Consulta y participacion de trabajadores',
            'Mejora continua',
            'Integracion del SGSST',
            'Compatibilidad con otros sistemas',
            'Revision periodica',
            'Accesibilidad a los trabajadores',
          ],
        },
        outputType: 'BOOLEAN',
      },
    }),
    prisma.legalRule.upsert({
      where: { ruleKey: 'sst_comite_20_trabajadores' },
      update: {},
      create: {
        normId: normMap['LEY-29783'],
        ruleKey: 'sst_comite_20_trabajadores',
        description: 'Comite de SST obligatorio para empresas con 20 o mas trabajadores. Menos de 20: Supervisor SST',
        parameters: { umbral_comite: 20, miembros_minimo: 4, mandato_anios: 2 },
        outputType: 'BOOLEAN',
        conditionJson: { num_trabajadores_minimo: 20 },
      },
    }),
    prisma.legalRule.upsert({
      where: { ruleKey: 'sst_capacitaciones_minimas' },
      update: {},
      create: {
        normId: normMap['DS-005-2012-TR'],
        ruleKey: 'sst_capacitaciones_minimas',
        description: '4 capacitaciones minimas anuales en SST por trabajador',
        parameters: { minimo_anual: 4 },
        outputType: 'NUMBER',
      },
    }),
    prisma.legalRule.upsert({
      where: { ruleKey: 'sst_iperc_obligatorio' },
      update: {},
      create: {
        normId: normMap['LEY-29783'],
        ruleKey: 'sst_iperc_obligatorio',
        description: 'IPERC: Identificacion de Peligros y Evaluacion de Riesgos. Debe actualizarse anualmente o ante cambios en procesos',
        parameters: { frecuencia_actualizacion: 'anual', formato: 'RM-050-2013-TR' },
        outputType: 'BOOLEAN',
      },
    }),

    // --- MULTAS SUNAFIL ---
    prisma.legalRule.upsert({
      where: { ruleKey: 'multa_sunafil_escala' },
      update: {},
      create: {
        normId: normMap['DS-019-2006-TR'],
        ruleKey: 'multa_sunafil_escala',
        description: 'Escala de multas SUNAFIL por gravedad y numero de trabajadores afectados',
        parameters: {
          UIT_2026: 5350,
          leve: { '1-10': 0.26, '11-25': 0.89, '26-50': 1.49, '51-100': 2.67, '101-200': 4.45, '201-500': 7.56, '501-999': 10.97, '1000+': 15.52 },
          grave: { '1-10': 1.57, '11-25': 3.92, '26-50': 5.22, '51-100': 7.83, '101-200': 10.45, '201-500': 14.09, '501-999': 18.36, '1000+': 26.12 },
          muy_grave: { '1-10': 2.63, '11-25': 5.25, '26-50': 8.75, '51-100': 13.13, '101-200': 17.50, '201-500': 24.50, '501-999': 35.00, '1000+': 52.53 },
          tope_maximo_uit: 200,
          reincidencia_factor: 1.5,
          subsanacion_voluntaria_descuento: 0.90,
          subsanacion_durante_inspeccion_descuento: 0.70,
        },
        outputType: 'NUMBER',
      },
    }),

    // --- HOSTIGAMIENTO ---
    prisma.legalRule.upsert({
      where: { ruleKey: 'hostigamiento_politica_obligatoria' },
      update: {},
      create: {
        normId: normMap['LEY-27942'],
        ruleKey: 'hostigamiento_politica_obligatoria',
        description: 'Politica contra hostigamiento sexual obligatoria para todas las empresas',
        parameters: {
          plazos: {
            medidas_proteccion_dias: 3,
            investigacion_dias: 30,
            resolucion_dias: 5,
          },
          capacitacion: 'anual obligatoria',
        },
        outputType: 'BOOLEAN',
      },
    }),

    // --- IGUALDAD SALARIAL ---
    prisma.legalRule.upsert({
      where: { ruleKey: 'igualdad_salarial_cuadro_categorias' },
      update: {},
      create: {
        normId: normMap['LEY-30709'],
        ruleKey: 'igualdad_salarial_cuadro_categorias',
        description: 'Cuadro de categorias y funciones obligatorio para asegurar igualdad remunerativa',
        parameters: { documentos_requeridos: ['cuadro_categorias', 'politica_salarial', 'bandas_remunerativas'] },
        outputType: 'BOOLEAN',
      },
    }),

    // --- DISCAPACIDAD ---
    prisma.legalRule.upsert({
      where: { ruleKey: 'cuota_empleo_discapacidad' },
      update: {},
      create: {
        normId: normMap['LEY-29973'],
        ruleKey: 'cuota_empleo_discapacidad',
        description: 'Empresas con mas de 50 trabajadores: 3% minimo de personas con discapacidad',
        parameters: { umbral_trabajadores: 50, porcentaje_cuota: 0.03 },
        outputType: 'PERCENTAGE',
        conditionJson: { num_trabajadores_minimo: 50 },
      },
    }),

    // --- TELETRABAJO ---
    prisma.legalRule.upsert({
      where: { ruleKey: 'teletrabajo_desconexion_digital' },
      update: {},
      create: {
        normId: normMap['LEY-31572'],
        ruleKey: 'teletrabajo_desconexion_digital',
        description: 'Derecho a desconexion digital: minimo 12 horas continuas en periodo de 24 horas',
        parameters: { horas_desconexion_minima: 12, obligacion_proveer_equipos: true },
        outputType: 'BOOLEAN',
        conditionJson: { modalidad: 'teletrabajo' },
      },
    }),

    // --- REGISTRO OBLIGATORIO ---
    prisma.legalRule.upsert({
      where: { ruleKey: 'registro_t_registro_plazo' },
      update: {},
      create: {
        normId: normMap['DS-019-2006-TR'],
        ruleKey: 'registro_t_registro_plazo',
        description: 'Registro en T-REGISTRO (SUNAT) dentro de 1 dia habil del inicio de labores',
        parameters: { plazo_dias_habiles: 1 },
        outputType: 'BOOLEAN',
      },
    }),
    prisma.legalRule.upsert({
      where: { ruleKey: 'contrato_plazo_fijo_registro' },
      update: {},
      create: {
        normId: normMap['DS-003-97-TR'],
        ruleKey: 'contrato_plazo_fijo_registro',
        description: 'Contratos a plazo fijo deben registrarse ante la AAT dentro de 15 dias de su celebracion',
        parameters: { plazo_registro_dias: 15, causa_objetiva_obligatoria: true },
        outputType: 'BOOLEAN',
        conditionJson: { tipo_contrato: 'plazo_fijo' },
      },
    }),

    // --- PLAME y AFP ---
    prisma.legalRule.upsert({
      where: { ruleKey: 'plame_declaracion_mensual' },
      update: {},
      create: {
        normId: normMap['DS-019-2006-TR'],
        ruleKey: 'plame_declaracion_mensual',
        description: 'Declaracion PLAME mensual obligatoria segun cronograma SUNAT (por ultimo digito de RUC)',
        parameters: { frecuencia: 'mensual', formato: 'PDT-PLAME' },
        outputType: 'BOOLEAN',
      },
    }),
    prisma.legalRule.upsert({
      where: { ruleKey: 'afp_pago_mensual' },
      update: {},
      create: {
        normId: normMap['DS-019-2006-TR'],
        ruleKey: 'afp_pago_mensual',
        description: 'Aportes AFP deben pagarse los primeros 5 dias del mes siguiente al devengado',
        parameters: { plazo_dias: 5, mora_interes: true },
        outputType: 'BOOLEAN',
      },
    }),
  ])

  console.log(`   ✅ ${reglas.length} reglas de compliance creadas\n`)

  // =============================================
  // 3. TEMPLATES DE CONTRATO
  // =============================================
  console.log('📄 Creando templates de contrato...')

  const templates = await Promise.all([
    // --- Los 3 existentes ---
    prisma.contractTemplate.upsert({
      where: { id: 'tpl-laboral-indefinido' },
      update: {},
      create: {
        id: 'tpl-laboral-indefinido',
        type: 'LABORAL_INDEFINIDO',
        name: 'Contrato de Trabajo a Plazo Indeterminado',
        description: 'Contrato laboral estandar sin fecha de vencimiento. Regimen general D.Leg. 728.',
        legalBasis: 'D.Leg. 728, D.S. 003-97-TR',
        fieldsSchema: {
          sections: ['empleador', 'trabajador', 'condiciones', 'clausulas_adicionales'],
          requiredFields: ['empleador_razon_social', 'empleador_ruc', 'trabajador_nombre', 'trabajador_dni', 'cargo', 'fecha_inicio', 'remuneracion'],
        },
        contentBlocks: {
          templateId: 'laboral-indefinido',
          blocks: ['titulo', 'encabezado', 'primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'septima_confidencialidad', 'octava_no_competencia', 'propiedad_intelectual', 'penultima', 'ultima'],
        },
      },
    }),
    prisma.contractTemplate.upsert({
      where: { id: 'tpl-laboral-plazo-fijo' },
      update: {},
      create: {
        id: 'tpl-laboral-plazo-fijo',
        type: 'LABORAL_PLAZO_FIJO',
        name: 'Contrato de Trabajo a Plazo Fijo (Sujeto a Modalidad)',
        description: 'Contrato temporal con causa objetiva. Incluye: inicio de actividad, necesidades de mercado, suplencia, obra determinada.',
        legalBasis: 'D.S. 003-97-TR, Art. 53-82',
        fieldsSchema: {
          sections: ['empleador', 'trabajador', 'modalidad', 'condiciones'],
          requiredFields: ['empleador_razon_social', 'empleador_ruc', 'trabajador_nombre', 'trabajador_dni', 'modalidad_tipo', 'causa_objetiva', 'duracion_meses', 'fecha_inicio', 'fecha_fin', 'cargo', 'remuneracion'],
        },
        contentBlocks: { templateId: 'laboral-plazo-fijo' },
      },
    }),
    prisma.contractTemplate.upsert({
      where: { id: 'tpl-locacion-servicios' },
      update: {},
      create: {
        id: 'tpl-locacion-servicios',
        type: 'LOCACION_SERVICIOS',
        name: 'Contrato de Locacion de Servicios',
        description: 'Contrato civil para servicios independientes sin subordinacion.',
        legalBasis: 'Codigo Civil, Art. 1764-1770',
        fieldsSchema: {
          sections: ['comitente', 'locador', 'servicio'],
          requiredFields: ['comitente_razon_social', 'comitente_ruc', 'locador_nombre', 'locador_dni', 'servicio_descripcion', 'entregables', 'fecha_inicio', 'fecha_fin', 'retribucion'],
        },
        contentBlocks: { templateId: 'locacion-servicios' },
      },
    }),

    // --- NUEVOS templates ---
    prisma.contractTemplate.upsert({
      where: { id: 'tpl-tiempo-parcial' },
      update: {},
      create: {
        id: 'tpl-tiempo-parcial',
        type: 'LABORAL_TIEMPO_PARCIAL',
        name: 'Contrato de Trabajo a Tiempo Parcial',
        description: 'Jornada inferior a 4 horas diarias. Sin derecho a CTS ni vacaciones de 30 dias.',
        legalBasis: 'D.S. 003-97-TR, Art. 4; D.S. 001-96-TR',
        fieldsSchema: {
          sections: ['empleador', 'trabajador', 'condiciones_parcial'],
          requiredFields: ['empleador_razon_social', 'empleador_ruc', 'trabajador_nombre', 'trabajador_dni', 'cargo', 'fecha_inicio', 'remuneracion', 'horas_diarias'],
        },
        contentBlocks: { templateId: 'laboral-tiempo-parcial' },
      },
    }),
    prisma.contractTemplate.upsert({
      where: { id: 'tpl-mype-micro' },
      update: {},
      create: {
        id: 'tpl-mype-micro',
        type: 'LABORAL_INDEFINIDO',
        name: 'Contrato de Trabajo - Regimen Microempresa',
        description: 'Contrato para microempresas (hasta 10 trabajadores). Sin CTS, sin gratificaciones, vacaciones 15 dias.',
        legalBasis: 'Ley 32353 (Ley MYPE)',
        fieldsSchema: {
          sections: ['empleador', 'trabajador', 'condiciones_mype'],
          requiredFields: ['empleador_razon_social', 'empleador_ruc', 'trabajador_nombre', 'trabajador_dni', 'cargo', 'fecha_inicio', 'remuneracion'],
        },
        contentBlocks: { templateId: 'mype-microempresa' },
      },
    }),
    prisma.contractTemplate.upsert({
      where: { id: 'tpl-mype-pequena' },
      update: {},
      create: {
        id: 'tpl-mype-pequena',
        type: 'LABORAL_INDEFINIDO',
        name: 'Contrato de Trabajo - Regimen Pequena Empresa',
        description: 'Contrato para pequena empresa (hasta 100 trabajadores). 50% CTS, 50% gratificaciones, vacaciones 15 dias.',
        legalBasis: 'Ley 32353 (Ley MYPE)',
        fieldsSchema: {
          sections: ['empleador', 'trabajador', 'condiciones_mype'],
          requiredFields: ['empleador_razon_social', 'empleador_ruc', 'trabajador_nombre', 'trabajador_dni', 'cargo', 'fecha_inicio', 'remuneracion'],
        },
        contentBlocks: { templateId: 'mype-pequena-empresa' },
      },
    }),
    prisma.contractTemplate.upsert({
      where: { id: 'tpl-convenio-practicas' },
      update: {},
      create: {
        id: 'tpl-convenio-practicas',
        type: 'CONVENIO_PRACTICAS',
        name: 'Convenio de Practicas Pre-Profesionales / Profesionales',
        description: 'Convenio de modalidad formativa. No genera vinculo laboral. Subvencion minima: RMV.',
        legalBasis: 'Ley 28518 (Ley de Modalidades Formativas Laborales)',
        fieldsSchema: {
          sections: ['empresa', 'practicante', 'centro_formacion', 'condiciones_practica'],
          requiredFields: ['empresa_razon_social', 'empresa_ruc', 'practicante_nombre', 'practicante_dni', 'tipo_practica', 'fecha_inicio', 'fecha_fin', 'subvencion'],
        },
        contentBlocks: { templateId: 'convenio-practicas' },
      },
    }),
    prisma.contractTemplate.upsert({
      where: { id: 'tpl-carta-amonestacion' },
      update: {},
      create: {
        id: 'tpl-carta-amonestacion',
        type: 'CUSTOM',
        name: 'Carta de Amonestacion',
        description: 'Documento de sancion disciplinaria por falta leve. Parte del procedimiento progresivo de sanciones.',
        legalBasis: 'D.S. 003-97-TR, Art. 9 (Facultad directriz)',
        fieldsSchema: {
          sections: ['empresa', 'trabajador', 'detalle_falta'],
          requiredFields: ['empresa_razon_social', 'trabajador_nombre', 'trabajador_dni', 'fecha_falta', 'descripcion_falta'],
        },
        contentBlocks: { templateId: 'carta-amonestacion' },
      },
    }),
    prisma.contractTemplate.upsert({
      where: { id: 'tpl-carta-preaviso-despido' },
      update: {},
      create: {
        id: 'tpl-carta-preaviso-despido',
        type: 'CUSTOM',
        name: 'Carta de Pre-Aviso de Despido',
        description: 'Notificacion de imputacion de falta grave con plazo de 6 dias para descargos.',
        legalBasis: 'D.S. 003-97-TR, Art. 31-32',
        fieldsSchema: {
          sections: ['empresa', 'trabajador', 'imputacion'],
          requiredFields: ['empresa_razon_social', 'trabajador_nombre', 'trabajador_dni', 'causa_justa', 'hechos_imputados', 'fecha_hechos'],
        },
        contentBlocks: { templateId: 'carta-preaviso-despido' },
      },
    }),
    prisma.contractTemplate.upsert({
      where: { id: 'tpl-carta-despido' },
      update: {},
      create: {
        id: 'tpl-carta-despido',
        type: 'CUSTOM',
        name: 'Carta de Despido por Causa Justa',
        description: 'Comunicacion formal de despido despues de evaluados los descargos del trabajador.',
        legalBasis: 'D.S. 003-97-TR, Art. 32',
        fieldsSchema: {
          sections: ['empresa', 'trabajador', 'decision_despido'],
          requiredFields: ['empresa_razon_social', 'trabajador_nombre', 'trabajador_dni', 'causa_justa', 'evaluacion_descargos', 'fecha_cese'],
        },
        contentBlocks: { templateId: 'carta-despido' },
      },
    }),
    prisma.contractTemplate.upsert({
      where: { id: 'tpl-certificado-trabajo' },
      update: {},
      create: {
        id: 'tpl-certificado-trabajo',
        type: 'CUSTOM',
        name: 'Certificado de Trabajo',
        description: 'Documento obligatorio que el empleador debe entregar al trabajador al cese de la relacion laboral.',
        legalBasis: 'D.S. 001-96-TR, Art. 19',
        fieldsSchema: {
          sections: ['empresa', 'trabajador', 'datos_laborales'],
          requiredFields: ['empresa_razon_social', 'trabajador_nombre', 'trabajador_dni', 'cargo', 'fecha_ingreso', 'fecha_cese'],
        },
        contentBlocks: { templateId: 'certificado-trabajo' },
      },
    }),
    prisma.contractTemplate.upsert({
      where: { id: 'tpl-constancia-trabajo' },
      update: {},
      create: {
        id: 'tpl-constancia-trabajo',
        type: 'CUSTOM',
        name: 'Constancia de Trabajo',
        description: 'Documento que acredita la relacion laboral vigente del trabajador. Puede solicitarse en cualquier momento.',
        legalBasis: 'D.S. 001-96-TR',
        fieldsSchema: {
          sections: ['empresa', 'trabajador', 'datos_vigentes'],
          requiredFields: ['empresa_razon_social', 'trabajador_nombre', 'trabajador_dni', 'cargo', 'fecha_ingreso'],
        },
        contentBlocks: { templateId: 'constancia-trabajo' },
      },
    }),
    prisma.contractTemplate.upsert({
      where: { id: 'tpl-politica-hostigamiento' },
      update: {},
      create: {
        id: 'tpl-politica-hostigamiento',
        type: 'POLITICA_HOSTIGAMIENTO',
        name: 'Politica de Prevencion y Sancion del Hostigamiento Sexual',
        description: 'Documento obligatorio para todas las empresas. Define procedimiento de denuncia, investigacion y sancion.',
        legalBasis: 'Ley 27942, D.S. 014-2019-MIMP',
        fieldsSchema: {
          sections: ['empresa', 'comite_intervencion', 'procedimiento'],
          requiredFields: ['empresa_razon_social', 'empresa_ruc', 'miembros_comite'],
        },
        contentBlocks: { templateId: 'politica-hostigamiento' },
      },
    }),
    prisma.contractTemplate.upsert({
      where: { id: 'tpl-politica-sst' },
      update: {},
      create: {
        id: 'tpl-politica-sst',
        type: 'POLITICA_SST',
        name: 'Politica de Seguridad y Salud en el Trabajo',
        description: 'Documento obligatorio con los 8 elementos minimos exigidos por la Ley 29783.',
        legalBasis: 'Ley 29783, Art. 22',
        fieldsSchema: {
          sections: ['empresa', 'alcance', 'compromisos'],
          requiredFields: ['empresa_razon_social', 'empresa_ruc', 'actividad_economica'],
        },
        contentBlocks: { templateId: 'politica-sst' },
      },
    }),
    prisma.contractTemplate.upsert({
      where: { id: 'tpl-reglamento-interno' },
      update: {},
      create: {
        id: 'tpl-reglamento-interno',
        type: 'REGLAMENTO_INTERNO',
        name: 'Reglamento Interno de Trabajo',
        description: 'Obligatorio para empresas con mas de 100 trabajadores. Regula derechos y obligaciones de trabajadores y empleador.',
        legalBasis: 'D.S. 039-91-TR',
        fieldsSchema: {
          sections: ['empresa', 'disposiciones_generales', 'jornada', 'remuneraciones', 'permisos', 'sanciones'],
          requiredFields: ['empresa_razon_social', 'empresa_ruc', 'num_trabajadores'],
        },
        contentBlocks: { templateId: 'reglamento-interno' },
      },
    }),
    prisma.contractTemplate.upsert({
      where: { id: 'tpl-liquidacion-beneficios' },
      update: {},
      create: {
        id: 'tpl-liquidacion-beneficios',
        type: 'CUSTOM',
        name: 'Liquidacion de Beneficios Sociales',
        description: 'Documento de calculo y pago de beneficios sociales al cese: CTS trunca, vacaciones truncas, gratificacion trunca, indemnizacion.',
        legalBasis: 'D.Leg. 728, D.S. 001-97-TR, D.Leg. 713, Ley 27735',
        fieldsSchema: {
          sections: ['empresa', 'trabajador', 'datos_laborales', 'calculo_beneficios'],
          requiredFields: ['empresa_razon_social', 'trabajador_nombre', 'trabajador_dni', 'fecha_ingreso', 'fecha_cese', 'motivo_cese', 'sueldo_bruto'],
        },
        contentBlocks: { templateId: 'liquidacion-beneficios' },
      },
    }),
    prisma.contractTemplate.upsert({
      where: { id: 'tpl-confidencialidad' },
      update: {},
      create: {
        id: 'tpl-confidencialidad',
        type: 'CONFIDENCIALIDAD',
        name: 'Acuerdo de Confidencialidad (NDA)',
        description: 'Acuerdo para proteccion de informacion confidencial y secretos comerciales.',
        legalBasis: 'Codigo Civil; D.Leg. 1075 (Propiedad Industrial)',
        fieldsSchema: {
          sections: ['parte_reveladora', 'parte_receptora', 'alcance', 'vigencia'],
          requiredFields: ['reveladora_nombre', 'receptora_nombre', 'objeto_confidencialidad', 'vigencia_meses'],
        },
        contentBlocks: { templateId: 'confidencialidad-nda' },
      },
    }),
  ])

  console.log(`   ✅ ${templates.length} templates de contrato creados\n`)

  // =============================================
  // 4. ALERTAS NORMATIVAS 2026
  // =============================================
  console.log('🔔 Creando alertas normativas 2026...')

  const alertas = await Promise.all([
    prisma.normAlert.create({
      data: {
        normId: normMap['LEY-32353'],
        title: 'Ley 32353 — Nuevo Regimen MYPE vigente desde febrero 2025',
        summary: 'La nueva Ley MYPE modifica beneficios laborales para micro y pequenas empresas. Microempresas: sin CTS ni gratificaciones, vacaciones 15 dias. Pequenas: 50% CTS, 50% gratificaciones, vacaciones 15 dias. Verificar si su empresa califica y actualizar contratos.',
        impactLevel: 'CRITICAL',
        affectedContractTypes: ['LABORAL_INDEFINIDO', 'LABORAL_PLAZO_FIJO'],
        publishedAt: new Date('2025-02-01'),
      },
    }),
    prisma.normAlert.create({
      data: {
        normId: normMap['DS-001-97-TR'],
        title: 'Recordatorio: Deposito CTS — Plazo hasta 15 de mayo 2026',
        summary: 'El deposito de CTS correspondiente al semestre noviembre 2025 - abril 2026 debe realizarse antes del 15 de mayo de 2026. El incumplimiento genera multa SUNAFIL de hasta 26.12 UIT (S/ 139,742). Verifique que todos los trabajadores tengan cuenta CTS designada.',
        impactLevel: 'CRITICAL',
        affectedContractTypes: ['LABORAL_INDEFINIDO', 'LABORAL_PLAZO_FIJO'],
        publishedAt: new Date('2026-04-01'),
      },
    }),
    prisma.normAlert.create({
      data: {
        normId: normMap['LEY-27735'],
        title: 'Recordatorio: Gratificacion Julio 2026 — Plazo hasta 15 de julio',
        summary: 'La gratificacion de Fiestas Patrias debe pagarse antes del 15 de julio de 2026. Incluir bonificacion extraordinaria del 9%. Aplica a todos los trabajadores del regimen general con al menos 1 mes en el semestre enero-junio 2026.',
        impactLevel: 'HIGH',
        affectedContractTypes: ['LABORAL_INDEFINIDO', 'LABORAL_PLAZO_FIJO'],
        publishedAt: new Date('2026-06-01'),
      },
    }),
    prisma.normAlert.create({
      data: {
        normId: normMap['LEY-29783'],
        title: 'SST: Verificar cumplimiento de 4 capacitaciones anuales',
        summary: 'La Ley 29783 exige un minimo de 4 capacitaciones en SST por trabajador al anio. Al cierre del primer semestre 2026, verifique que sus trabajadores tengan al menos 2 capacitaciones registradas. El incumplimiento es infraccion grave.',
        impactLevel: 'HIGH',
        affectedContractTypes: [],
        publishedAt: new Date('2026-06-15'),
      },
    }),
    prisma.normAlert.create({
      data: {
        normId: normMap['LEY-27942'],
        title: 'Hostigamiento Sexual: Capacitacion anual obligatoria',
        summary: 'Todas las empresas deben realizar una capacitacion anual sobre prevencion del hostigamiento sexual (D.S. 014-2019-MIMP). Si aun no la ha programado para 2026, registre la fecha en su calendario de compliance.',
        impactLevel: 'MEDIUM',
        affectedContractTypes: [],
        publishedAt: new Date('2026-03-01'),
      },
    }),
    prisma.normAlert.create({
      data: {
        normId: normMap['LEY-30709'],
        title: 'Igualdad Salarial: Actualizar cuadro de categorias y funciones',
        summary: 'La Ley 30709 exige mantener actualizado el cuadro de categorias y funciones con bandas remunerativas. SUNAFIL esta intensificando fiscalizaciones en 2026. Verifique que su cuadro este vigente y refleje la estructura actual de la empresa.',
        impactLevel: 'MEDIUM',
        affectedContractTypes: [],
        publishedAt: new Date('2026-02-15'),
      },
    }),
    prisma.normAlert.create({
      data: {
        normId: normMap['DS-019-2006-TR'],
        title: 'SUNAFIL: Nuevo protocolo de fiscalizacion 2026 en sectores priorizados',
        summary: 'SUNAFIL ha anunciado intensificacion de inspecciones en los sectores construccion, agroexportacion y manufactura para 2026. Las empresas de estos sectores deben tener preparado el expediente de compliance completo (28 documentos). Recomendamos correr un diagnostico preventivo.',
        impactLevel: 'HIGH',
        affectedContractTypes: [],
        publishedAt: new Date('2026-01-15'),
      },
    }),
    prisma.normAlert.create({
      data: {
        normId: normMap['LEY-31572'],
        title: 'Teletrabajo: Verificar cumplimiento de la Ley 31572',
        summary: 'Si su empresa tiene trabajadores en modalidad de teletrabajo, verifique: (1) contrato o adenda con clausula de teletrabajo, (2) provision de equipos documentada, (3) compensacion de gastos, (4) politica de desconexion digital (12 horas minimo). SUNAFIL fiscaliza desde 2024.',
        impactLevel: 'MEDIUM',
        affectedContractTypes: ['LABORAL_INDEFINIDO', 'LABORAL_PLAZO_FIJO'],
        publishedAt: new Date('2026-03-10'),
      },
    }),
    prisma.normAlert.create({
      data: {
        normId: normMap['LEY-29973'],
        title: 'Cuota de empleo: 3% para personas con discapacidad',
        summary: 'Empresas con mas de 50 trabajadores deben cumplir la cuota del 3% de personas con discapacidad. El incumplimiento es sancionable por SUNAFIL como infraccion grave. Revise su planilla y documente los esfuerzos de contratacion inclusiva.',
        impactLevel: 'MEDIUM',
        affectedContractTypes: [],
        publishedAt: new Date('2026-02-01'),
      },
    }),
    prisma.normAlert.create({
      data: {
        normId: normMap['DLEG-713'],
        title: 'Vacaciones: Evitar acumulacion de doble periodo',
        summary: 'Revise el record vacacional de todos sus trabajadores. Si algun trabajador acumula 2 periodos sin goce de vacaciones, la empresa debe pagar triple remuneracion vacacional. Identifique casos en riesgo y programe vacaciones inmediatamente.',
        impactLevel: 'HIGH',
        affectedContractTypes: [],
        publishedAt: new Date('2026-04-01'),
      },
    }),
  ])

  console.log(`   ✅ ${alertas.length} alertas normativas creadas\n`)

  // =============================================
  // RESUMEN FINAL
  // =============================================
  // =============================================
  // E-LEARNING — Seed cursos obligatorios
  // =============================================
  console.log('🎓 Creando cursos de e-learning...')

  // Import catalog dynamically (pure JS, no Prisma dependency)
  const { COURSE_CATALOG } = await import('../src/lib/elearning/course-catalog.js')

  let courseCount = 0
  for (const courseSeed of COURSE_CATALOG) {
    const existing = await prisma.course.findUnique({ where: { slug: courseSeed.slug } })
    if (existing) {
      console.log(`   ⏭️  Curso ya existe: ${courseSeed.title}`)
      continue
    }

    const course = await prisma.course.create({
      data: {
        slug: courseSeed.slug,
        title: courseSeed.title,
        description: courseSeed.description,
        category: courseSeed.category as import('../src/generated/prisma/client.js').CourseCategory,
        durationMin: courseSeed.durationMin,
        isObligatory: courseSeed.isObligatory,
        targetRegimen: courseSeed.targetRegimen as import('../src/generated/prisma/client.js').RegimenLaboral[],
        passingScore: courseSeed.passingScore,
        sortOrder: courseSeed.sortOrder,
        isActive: true,
        lessons: {
          create: courseSeed.lessons.map(l => ({
            title: l.title,
            description: l.description,
            contentType: l.contentType as import('../src/generated/prisma/client.js').LessonContentType,
            contentHtml: l.contentHtml,
            durationMin: l.durationMin,
            sortOrder: l.sortOrder,
          })),
        },
        examQuestions: {
          create: courseSeed.examQuestions.map(q => ({
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation,
            sortOrder: q.sortOrder,
          })),
        },
      },
    })
    console.log(`   ✅ ${course.title}`)
    courseCount++
  }
  console.log(`   ✅ ${courseCount} cursos creados\n`)

  // =============================================
  // RESUMEN FINAL
  // =============================================
  console.log('═══════════════════════════════════════════')
  console.log('  COMPLY360 — Seed completado exitosamente')
  console.log('═══════════════════════════════════════════')
  console.log(`  📜 Normas legales:     ${normas.length}`)
  console.log(`  ⚖️  Reglas compliance:  ${reglas.length}`)
  console.log(`  📄 Templates contrato: ${templates.length}`)
  console.log(`  🔔 Alertas normativas: ${alertas.length}`)
  console.log(`  🎓 Cursos e-learning:  ${courseCount}`)
  console.log('═══════════════════════════════════════════\n')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
