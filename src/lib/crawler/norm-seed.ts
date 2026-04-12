/**
 * Seed de actualizaciones normativas recientes para demostrar el modulo.
 * En produccion, estas se obtendrian automaticamente del crawler de El Peruano/SUNAFIL.
 */

export interface NormUpdateSeed {
  externalId: string
  normCode: string
  title: string
  summary: string
  category: string
  source: string
  publishedAt: string
  effectiveAt?: string
  sourceUrl?: string
  impactAnalysis: string
  impactLevel: string
  affectedModules: string[]
  affectedRegimens: string[]
  actionRequired: string
  actionDeadline?: string
}

export const NORM_UPDATES_SEED: NormUpdateSeed[] = [
  {
    externalId: 'EP-2026-0401-001',
    normCode: 'D.S. 003-2026-TR',
    title: 'Aprueban modificacion al Reglamento de la Ley de SST sobre capacitaciones virtuales',
    summary: 'Se permite que hasta el 50% de las capacitaciones obligatorias en SST sean virtuales, siempre que cuenten con evaluacion y registro digital verificable.',
    category: 'SEGURIDAD_SALUD',
    source: 'EL_PERUANO',
    publishedAt: '2026-04-01',
    effectiveAt: '2026-04-16',
    sourceUrl: 'https://busquedas.elperuano.pe/normaslegales/ds-003-2026-tr',
    impactAnalysis: 'POSITIVO para empresas con operaciones remotas. Permite reducir costos de capacitacion SST presencial hasta en 50%. Las capacitaciones virtuales deben incluir evaluacion con nota minima de 70% y registro de asistencia digital. Aplica a todos los regimenes.',
    impactLevel: 'MEDIUM',
    affectedModules: ['sst', 'capacitaciones'],
    affectedRegimens: ['GENERAL', 'MYPE_MICRO', 'MYPE_PEQUENA', 'TELETRABAJO'],
    actionRequired: 'Actualizar el Plan Anual de SST para incluir capacitaciones virtuales. Verificar que la plataforma de e-learning cumpla con requisitos de evaluacion y registro.',
    actionDeadline: '2026-05-16',
  },
  {
    externalId: 'EP-2026-0328-002',
    normCode: 'R.S. 045-2026-SUNAFIL',
    title: 'SUNAFIL aprueba protocolo de fiscalizacion del teletrabajo',
    summary: 'Nuevo protocolo para inspecciones de cumplimiento de la Ley 31572 de Teletrabajo. Incluye verificacion de equipos, compensacion de servicios y desconexion digital.',
    category: 'LABORAL',
    source: 'SUNAFIL',
    publishedAt: '2026-03-28',
    effectiveAt: '2026-04-12',
    impactAnalysis: 'ALTO IMPACTO para empresas con teletrabajadores. SUNAFIL verificara: (1) provision de equipos o compensacion economica, (2) pago de servicios de internet/electricidad, (3) respeto al derecho de desconexion digital, (4) registro de jornada para teletrabajadores.',
    impactLevel: 'HIGH',
    affectedModules: ['contratos', 'trabajadores', 'documentos'],
    affectedRegimens: ['GENERAL', 'TELETRABAJO'],
    actionRequired: 'Revisar contratos de teletrabajo vigentes. Verificar que incluyan clausula de compensacion de servicios y desconexion digital. Implementar sistema de registro de jornada remoto.',
    actionDeadline: '2026-04-30',
  },
  {
    externalId: 'EP-2026-0320-003',
    normCode: 'Ley 32450',
    title: 'Ley que modifica el regimen de CTS para trabajadores del sector agrario',
    summary: 'Los trabajadores del regimen agrario (Ley 31110) ahora tienen derecho a CTS independiente, equivalente al 4.86% de la remuneracion mensual, depositada semestralmente.',
    category: 'LABORAL',
    source: 'EL_PERUANO',
    publishedAt: '2026-03-20',
    effectiveAt: '2026-05-01',
    sourceUrl: 'https://busquedas.elperuano.pe/normaslegales/ley-32450',
    impactAnalysis: 'CAMBIO SIGNIFICATIVO para el sector agrario. Anteriormente la CTS estaba incluida en la remuneracion diaria (9.72%). Ahora se separa como beneficio independiente. Impacto en costos laborales del sector.',
    impactLevel: 'HIGH',
    affectedModules: ['calculadoras', 'beneficios', 'trabajadores'],
    affectedRegimens: ['AGRARIO'],
    actionRequired: 'Actualizar calculadoras de CTS para regimen agrario. Modificar contratos agrarios vigentes. Preparar depositos de CTS para el proximo semestre.',
    actionDeadline: '2026-05-15',
  },
  {
    externalId: 'EP-2026-0315-004',
    normCode: 'D.S. 001-2026-MIMP',
    title: 'Modifican reglamento de prevencion del hostigamiento sexual',
    summary: 'Se amplia la obligacion de capacitacion sobre hostigamiento sexual a 2 veces al anio (antes 1). Se requiere canal de denuncias digital obligatorio para empresas con mas de 20 trabajadores.',
    category: 'LABORAL',
    source: 'EL_PERUANO',
    publishedAt: '2026-03-15',
    effectiveAt: '2026-04-01',
    impactAnalysis: 'ALTO IMPACTO. Duplica la frecuencia de capacitacion obligatoria sobre hostigamiento sexual. Empresas con 20+ trabajadores deben implementar canal digital (formulario web) ademas del fisico. Multa por incumplimiento: infraccion muy grave.',
    impactLevel: 'HIGH',
    affectedModules: ['denuncias', 'capacitaciones', 'documentos'],
    affectedRegimens: ['GENERAL', 'MYPE_PEQUENA'],
    actionRequired: 'Programar 2da capacitacion anual sobre hostigamiento sexual. Implementar canal de denuncias digital si aun no existe. Actualizar Politica contra el Hostigamiento Sexual.',
    actionDeadline: '2026-06-30',
  },
  {
    externalId: 'EP-2026-0310-005',
    normCode: 'R.M. 025-2026-TR',
    title: 'Cronograma de obligaciones laborales 2026-II',
    summary: 'MTPE publica el cronograma de obligaciones laborales para el segundo semestre 2026: CTS noviembre, gratificacion diciembre, declaraciones juradas y plazo para presentacion del Plan Anual SST.',
    category: 'LABORAL',
    source: 'MTPE',
    publishedAt: '2026-03-10',
    impactAnalysis: 'INFORMATIVO. Fechas clave: CTS deposito hasta 15/11, Gratificacion hasta 15/12, Plan Anual SST antes 01/01/2027. El cronograma PLAME sigue segun RUC.',
    impactLevel: 'MEDIUM',
    affectedModules: ['calendario', 'alertas', 'beneficios'],
    affectedRegimens: ['GENERAL', 'MYPE_MICRO', 'MYPE_PEQUENA', 'AGRARIO'],
    actionRequired: 'Actualizar calendario de compliance con fechas del 2do semestre. Configurar alertas para deposito CTS noviembre y gratificacion diciembre.',
  },
  {
    externalId: 'EP-2026-0305-006',
    normCode: 'D.U. 002-2026',
    title: 'Incremento de la UIT para el ejercicio 2026',
    summary: 'Se confirma que la UIT para 2026 es de S/ 5,500. Este valor se utiliza para el calculo de multas SUNAFIL, impuesto a la renta, y otros tributos.',
    category: 'TRIBUTARIO',
    source: 'EL_PERUANO',
    publishedAt: '2026-01-05',
    effectiveAt: '2026-01-01',
    impactAnalysis: 'La UIT 2026 = S/ 5,500 (anterior S/ 5,350). Impacta directamente en: (1) Calculo de multas SUNAFIL, (2) Tope de 7 UIT para exoneracion de impuesto a gratificaciones, (3) Deducciones de renta de trabajo.',
    impactLevel: 'MEDIUM',
    affectedModules: ['calculadoras', 'diagnostico'],
    affectedRegimens: ['GENERAL', 'MYPE_MICRO', 'MYPE_PEQUENA', 'AGRARIO', 'CONSTRUCCION_CIVIL', 'MINERO'],
    actionRequired: 'Verificar que las calculadoras utilicen UIT 2026 = S/ 5,500. Recalcular multas SUNAFIL pendientes.',
  },
  {
    externalId: 'EP-2026-0225-007',
    normCode: 'Directiva 001-2026-SUNAFIL',
    title: 'SUNAFIL prioriza inspecciones en sector construccion y mineria',
    summary: 'SUNAFIL anuncia campana intensiva de inspecciones en construccion civil y mineria durante 2026, enfocada en cumplimiento de SST y registro de trabajadores.',
    category: 'SUNAFIL',
    source: 'SUNAFIL',
    publishedAt: '2026-02-25',
    impactAnalysis: 'CRITICO para empresas de construccion y mineria. Aumento de inspecciones. Focos: (1) SST completo (IPERC, EPP, capacitaciones), (2) Registro en T-REGISTRO, (3) Contratos vigentes, (4) SCTR al dia.',
    impactLevel: 'CRITICAL',
    affectedModules: ['sst', 'trabajadores', 'documentos', 'contratos'],
    affectedRegimens: ['CONSTRUCCION_CIVIL', 'MINERO'],
    actionRequired: 'Auditar cumplimiento SST completo. Verificar IPERC actualizado. Confirmar SCTR vigente para todos los trabajadores. Completar legajos digitales.',
  },
]
