/**
 * Legal RAG — Retrieval-Augmented Generation con Corpus Legal Peruano
 *
 * Implementa busqueda semantica basada en TF-IDF sobre extractos clave
 * de la legislacion laboral peruana para enriquecer respuestas de IA
 * con citas legales precisas.
 */

// =============================================
// TYPES
// =============================================

export interface LawExcerpt {
  id: string
  lawNumber: string
  article: string
  title: string
  content: string
  category: LawCategory
  keywords: string[]
}

export type LawCategory =
  | 'contratacion'
  | 'remuneraciones'
  | 'beneficios_sociales'
  | 'sst'
  | 'igualdad'
  | 'hostigamiento'
  | 'despido'
  | 'inspeccion'
  | 'cas'
  | 'teletrabajo'
  | 'agrario'
  | 'covid'
  | 'proteccion_datos'

export interface SearchResult {
  excerpt: LawExcerpt
  score: number
}

export interface RAGPrompt {
  systemPrompt: string
  legalContext: string
  citations: string[]
}

// =============================================
// CORPUS LEGAL PERUANO
// =============================================

const LEGAL_CORPUS: LawExcerpt[] = [
  // --- D.Leg 728 / D.S. 003-97-TR - Ley de Productividad y Competitividad Laboral ---
  {
    id: 'dleg728-art4',
    lawNumber: 'D.S. 003-97-TR (TUO D.Leg. 728)',
    article: 'Art. 4',
    title: 'Contrato de trabajo - elementos esenciales',
    content: 'En toda prestacion personal de servicios remunerados y subordinados, se presume la existencia de un contrato de trabajo a plazo indeterminado. El contrato individual de trabajo puede celebrarse libremente por tiempo indeterminado o sujeto a modalidad.',
    category: 'contratacion',
    keywords: ['contrato', 'trabajo', 'plazo', 'indeterminado', 'modalidad', 'subordinacion', 'prestacion', 'personal', 'remunerado'],
  },
  {
    id: 'dleg728-art16',
    lawNumber: 'D.S. 003-97-TR (TUO D.Leg. 728)',
    article: 'Art. 16',
    title: 'Causas de extincion del contrato de trabajo',
    content: 'Son causas de extincion del contrato de trabajo: a) El fallecimiento del trabajador o del empleador; b) La renuncia o retiro voluntario; c) La terminacion de la obra o servicio; d) El mutuo disenso; e) La invalidez absoluta permanente; f) La jubilacion; g) El despido; h) La terminacion de la relacion laboral por causa objetiva.',
    category: 'despido',
    keywords: ['extincion', 'contrato', 'renuncia', 'despido', 'jubilacion', 'fallecimiento', 'retiro', 'mutuo', 'disenso'],
  },
  {
    id: 'dleg728-art22',
    lawNumber: 'D.S. 003-97-TR (TUO D.Leg. 728)',
    article: 'Art. 22-25',
    title: 'Despido justificado - causas justas',
    content: 'Para el despido de un trabajador sujeto a regimen de la actividad privada, es indispensable la existencia de causa justa contemplada en la ley y debidamente comprobada. Las causas justas de despido relacionadas con la capacidad del trabajador son: detrimento de la facultad fisica o mental, rendimiento deficiente, negativa injustificada a someterse a examen medico. Las causas justas relacionadas con la conducta son: comision de falta grave, condena penal por delito doloso, inhabilitacion del trabajador.',
    category: 'despido',
    keywords: ['despido', 'causa', 'justa', 'falta', 'grave', 'conducta', 'capacidad', 'rendimiento', 'inhabilitacion'],
  },
  {
    id: 'dleg728-art34',
    lawNumber: 'D.S. 003-97-TR (TUO D.Leg. 728)',
    article: 'Art. 34',
    title: 'Despido arbitrario - indemnizacion',
    content: 'El trabajador despedido arbitrariamente tiene derecho al pago de una indemnizacion como unica reparacion por el dano sufrido. La indemnizacion equivale a una remuneracion y media ordinaria mensual por cada ano completo de servicios con un maximo de doce remuneraciones. Las fracciones de ano se abonan por dozavos y treintavos.',
    category: 'despido',
    keywords: ['despido', 'arbitrario', 'indemnizacion', 'remuneracion', 'reparacion', 'dozavos', 'treintavos'],
  },
  {
    id: 'dleg728-art25',
    lawNumber: 'D.S. 003-97-TR (TUO D.Leg. 728)',
    article: 'Art. 25',
    title: 'Faltas graves',
    content: 'Falta grave es la infraccion por el trabajador de los deberes esenciales que emanan del contrato. Son faltas graves: a) Incumplimiento de las obligaciones de trabajo; b) Disminucion deliberada y reiterada del rendimiento; c) Apropiacion consumada o frustrada de bienes; d) Uso o entrega a terceros de informacion reservada; e) Concurrencia reiterada en estado de embriaguez; f) Actos de violencia, injuria o faltamiento de palabra; g) Dano intencional a edificaciones e instalaciones; h) Abandono de trabajo por mas de tres dias consecutivos.',
    category: 'despido',
    keywords: ['falta', 'grave', 'incumplimiento', 'abandono', 'violencia', 'embriaguez', 'robo', 'apropiacion', 'informacion', 'reservada'],
  },

  // --- D.S. 001-97-TR - CTS ---
  {
    id: 'cts-art2',
    lawNumber: 'D.S. 001-97-TR (TUO Ley de CTS)',
    article: 'Art. 2',
    title: 'CTS - beneficio social de prevision',
    content: 'La compensacion por tiempo de servicios tiene la calidad de beneficio social de prevision de las contingencias que origina el cese en el trabajo y de promocion del trabajador y su familia. Se devenga desde el primer mes de iniciado el vinculo laboral; cumplido este requisito toda fraccion se computa por treintavos.',
    category: 'beneficios_sociales',
    keywords: ['cts', 'compensacion', 'tiempo', 'servicios', 'beneficio', 'social', 'prevision', 'cese', 'deposito'],
  },
  {
    id: 'cts-art21',
    lawNumber: 'D.S. 001-97-TR (TUO Ley de CTS)',
    article: 'Art. 21-22',
    title: 'CTS - depositos semestrales',
    content: 'Los empleadores depositaran en los meses de mayo y noviembre de cada ano tantos dozavos de la remuneracion computable percibida por el trabajador en los meses de abril y octubre respectivamente, como meses completos haya laborado en el semestre respectivo. La fraccion de mes se depositara por treintavos. El deposito debe efectuarse dentro de los primeros quince dias naturales de los meses de mayo y noviembre.',
    category: 'beneficios_sociales',
    keywords: ['cts', 'deposito', 'mayo', 'noviembre', 'semestral', 'dozavos', 'treintavos', 'remuneracion', 'computable'],
  },

  // --- Ley 27735 - Gratificaciones ---
  {
    id: 'ley27735-art1',
    lawNumber: 'Ley 27735',
    article: 'Art. 1-6',
    title: 'Gratificaciones legales',
    content: 'El trabajador tiene derecho a percibir dos gratificaciones en el ano, una con motivo de Fiestas Patrias y la otra con ocasion de la Navidad. Las gratificaciones seran abonadas en la primera quincena de los meses de julio y diciembre segun el caso. El monto de cada gratificacion es equivalente a la remuneracion que perciba el trabajador en la oportunidad en que corresponda otorgar el beneficio. Para tener derecho se requiere estar laborando en el mes en que corresponda percibir el beneficio o estar en uso de descanso vacacional, licencia con goce o subsidio.',
    category: 'beneficios_sociales',
    keywords: ['gratificacion', 'fiestas', 'patrias', 'navidad', 'julio', 'diciembre', 'remuneracion', 'semestre', 'sexto'],
  },

  // --- Ley 29783 - SST ---
  {
    id: 'ley29783-art26',
    lawNumber: 'Ley 29783',
    article: 'Art. 26',
    title: 'SST - Liderazgo del SGSST',
    content: 'El empleador esta obligado a garantizar la seguridad y salud en el trabajo. La gestion de la seguridad y salud en el trabajo es responsabilidad del empleador quien asume el liderazgo y compromiso de estas actividades en la organizacion. El empleador delegara las funciones y la autoridad necesaria al personal encargado del desarrollo, aplicacion y resultados del SGSST.',
    category: 'sst',
    keywords: ['seguridad', 'salud', 'trabajo', 'sst', 'sgsst', 'empleador', 'obligacion', 'liderazgo', 'gestion'],
  },
  {
    id: 'ley29783-art29',
    lawNumber: 'Ley 29783',
    article: 'Art. 29',
    title: 'Comite de SST',
    content: 'Los empleadores con veinte o mas trabajadores a su cargo constituyen un comite de seguridad y salud en el trabajo. En los centros de trabajo con menos de veinte trabajadores son los mismos trabajadores quienes nombran al supervisor de seguridad y salud en el trabajo. El comite esta conformado de forma paritaria por igual numero de representantes del empleador y de los trabajadores.',
    category: 'sst',
    keywords: ['comite', 'sst', 'supervisor', 'veinte', 'trabajadores', 'paritario', 'representantes', 'eleccion'],
  },
  {
    id: 'ley29783-art35',
    lawNumber: 'Ley 29783',
    article: 'Art. 35',
    title: 'Obligaciones del empleador en SST',
    content: 'El empleador debe: a) Entregar copia del reglamento interno de SST a cada trabajador; b) Realizar no menos de cuatro capacitaciones al ano en materia de SST; c) Adjuntar al contrato las recomendaciones de SST; d) Brindar facilidades economicas y licencias con goce de haber para la participacion de los trabajadores en cursos de formacion en SST; e) Elaborar un mapa de riesgos con la participacion de la organizacion sindical.',
    category: 'sst',
    keywords: ['capacitacion', 'reglamento', 'sst', 'mapa', 'riesgos', 'obligacion', 'empleador', 'cuatro', 'anuales'],
  },
  {
    id: 'ley29783-art49',
    lawNumber: 'Ley 29783',
    article: 'Art. 49',
    title: 'Obligaciones especificas del empleador SST',
    content: 'El empleador entre otras obligaciones debe: Practicar examenes medicos antes, durante y al termino de la relacion laboral. Garantizar que las elecciones de los representantes de los trabajadores se realicen a traves de elecciones democraticas. Garantizar el real y efectivo trabajo del comite paritario de SST. Proporcionar equipos de proteccion personal adecuados. Realizar auditorias periodicas.',
    category: 'sst',
    keywords: ['examen', 'medico', 'ocupacional', 'epp', 'equipo', 'proteccion', 'personal', 'auditoria', 'elecciones'],
  },

  // --- Ley 30709 - Igualdad salarial ---
  {
    id: 'ley30709-art1',
    lawNumber: 'Ley 30709',
    article: 'Art. 1-6',
    title: 'Igualdad remunerativa - prohibicion de discriminacion',
    content: 'Se prohibe la discriminacion remunerativa entre varones y mujeres. El empleador esta obligado a: Establecer categorias, funciones y remuneraciones que permitan la ejecucion del principio de igual remuneracion por igual trabajo. Implementar un cuadro de categorias y funciones. Informar a los trabajadores la politica salarial del centro de trabajo. Las diferencias remunerativas solo pueden sustentarse en criterios objetivos como la antiguedad, desempeno, negociacion colectiva, escasez de oferta o costo de vida.',
    category: 'igualdad',
    keywords: ['igualdad', 'salarial', 'remunerativa', 'discriminacion', 'genero', 'cuadro', 'categorias', 'funciones', 'brecha'],
  },
  {
    id: 'ley30709-ds002',
    lawNumber: 'D.S. 002-2018-TR (Reglamento Ley 30709)',
    article: 'Art. 3-5',
    title: 'Cuadro de categorias y funciones',
    content: 'El empleador debe contar con un cuadro de categorias y funciones que contenga una descripcion de los puestos de trabajo incluidos en cada categoria. El cuadro debe ser puesto en conocimiento de todos los trabajadores. El empleador debe implementar una politica salarial que contenga criterios objetivos de remuneracion. Los trabajadores pueden solicitar al empleador informacion sobre los criterios utilizados para la determinacion de remuneraciones.',
    category: 'igualdad',
    keywords: ['cuadro', 'categorias', 'funciones', 'politica', 'salarial', 'puesto', 'descripcion', 'criterios', 'objetivos'],
  },

  // --- Ley 27942 - Hostigamiento sexual ---
  {
    id: 'ley27942-art4',
    lawNumber: 'Ley 27942 (mod. D.Leg. 1410)',
    article: 'Art. 4-6',
    title: 'Hostigamiento sexual - definicion y elementos',
    content: 'El hostigamiento sexual tipico es la conducta fisica o verbal reiterada de naturaleza sexual o sexista no deseada o rechazada, realizada por una o mas personas que se aprovechan de una posicion de autoridad o jerarquia o cualquier otra situacion ventajosa, en contra de otra u otras personas. El hostigamiento sexual atipico se da entre pares, sin relacion de jerarquia. El empleador esta obligado a prevenir y sancionar el hostigamiento sexual.',
    category: 'hostigamiento',
    keywords: ['hostigamiento', 'sexual', 'acoso', 'conducta', 'denuncia', 'prevencion', 'sancion', 'comite', 'investigacion'],
  },
  {
    id: 'ley27942-art7',
    lawNumber: 'Ley 27942 (mod. D.Leg. 1410)',
    article: 'Art. 7-8',
    title: 'Obligaciones del empleador ante hostigamiento',
    content: 'El empleador debe: Adoptar politicas internas de prevencion y sancion del hostigamiento sexual. Mantener un procedimiento interno de investigacion. Capacitar a los trabajadores sobre el tema. El comite de intervencion frente al hostigamiento sexual debe investigar y emitir recomendaciones en un plazo maximo de 30 dias calendario. Las medidas de proteccion a la victima incluyen rotacion del presunto hostigador, impedimento de acercamiento y suspension temporal.',
    category: 'hostigamiento',
    keywords: ['hostigamiento', 'prevencion', 'comite', 'intervencion', 'investigacion', 'victima', 'denuncia', 'proteccion', 'politica'],
  },

  // --- D.S. 003-97-TR - Despido ---
  {
    id: 'ds003-art31',
    lawNumber: 'D.S. 003-97-TR',
    article: 'Art. 31-32',
    title: 'Procedimiento de despido',
    content: 'El empleador no podra despedir por causa relacionada con la conducta o con la capacidad del trabajador sin antes otorgarle por escrito un plazo razonable no menor de seis dias naturales para que pueda defenderse por escrito de los cargos que se le formulare. Tratandose de la comision de falta grave flagrante no sera necesario el plazo referido. Para el caso de capacidad se dara un plazo no menor de treinta dias naturales para que demuestre su capacidad o corrija su deficiencia.',
    category: 'despido',
    keywords: ['procedimiento', 'despido', 'carta', 'preaviso', 'descargos', 'seis', 'dias', 'defensa', 'escrito'],
  },

  // --- Ley 28806 - SUNAFIL ---
  {
    id: 'ley28806-art1',
    lawNumber: 'Ley 28806',
    article: 'Art. 1-3',
    title: 'Inspeccion del trabajo - SUNAFIL',
    content: 'El Sistema de Inspeccion del Trabajo esta a cargo de la SUNAFIL y tiene por objeto velar por el cumplimiento de las normas de orden sociolaboral y de seguridad y salud en el trabajo. Los inspectores de trabajo tienen la facultad de ingresar libremente y sin previo aviso a todo centro de trabajo, efectuar pruebas, investigaciones, examenes, requerir informacion y documentacion, acompanarse de peritos y tecnicos.',
    category: 'inspeccion',
    keywords: ['sunafil', 'inspeccion', 'inspector', 'fiscalizacion', 'visita', 'acta', 'infraccion', 'multa', 'sancion'],
  },
  {
    id: 'ley28806-art31',
    lawNumber: 'Ley 28806',
    article: 'Art. 31-40',
    title: 'Infracciones y multas laborales',
    content: 'Las infracciones se califican en leves, graves y muy graves. Son infracciones leves: no comunicar en los plazos establecidos los datos de la empresa, no entregar boletas de pago. Son infracciones graves: no registrar trabajadores en planilla, no depositar CTS, no pagar gratificaciones. Son infracciones muy graves: no pagar remuneracion minima vital, trabajo forzoso, discriminacion, incumplimiento de normas de SST que genere riesgo grave. Las multas se aplican por cada trabajador afectado.',
    category: 'inspeccion',
    keywords: ['infraccion', 'leve', 'grave', 'multa', 'sancion', 'sunafil', 'planilla', 'boleta', 'registro'],
  },

  // --- D.Leg 1057 - CAS ---
  {
    id: 'dleg1057-art1',
    lawNumber: 'D.Leg. 1057',
    article: 'Art. 1-6',
    title: 'Contrato Administrativo de Servicios (CAS)',
    content: 'El contrato administrativo de servicios es una modalidad de contratacion privativa del Estado. Confiere al trabajador CAS derechos laborales como: jornada maxima de 8 horas diarias o 48 semanales, descanso semanal obligatorio de 24 horas, vacaciones de 30 dias calendario por ano cumplido, afiliacion a un regimen pensionario, afiliacion a EsSalud, aguinaldos por Fiestas Patrias y Navidad. No se aplica CTS ni gratificaciones del regimen privado.',
    category: 'cas',
    keywords: ['cas', 'contrato', 'administrativo', 'servicios', 'estado', 'sector', 'publico', 'aguinaldo', 'vacaciones'],
  },

  // --- Ley 30036 - Teletrabajo ---
  {
    id: 'ley30036-art2',
    lawNumber: 'Ley 30036 (mod. Ley 31572)',
    article: 'Art. 2-5',
    title: 'Teletrabajo - regulacion',
    content: 'El teletrabajo se caracteriza por el desempeno subordinado de labores sin la presencia fisica del trabajador en el centro de trabajo, a traves de medios informaticos, de telecomunicaciones y analogos. El empleador debe proporcionar los equipos y medios informaticos necesarios. Se puede pactar el teletrabajo al inicio de la relacion laboral o durante ella por acuerdo entre las partes. El teletrabajador tiene los mismos derechos y obligaciones que un trabajador presencial. El empleador debe respetar el derecho a la desconexion digital.',
    category: 'teletrabajo',
    keywords: ['teletrabajo', 'remoto', 'virtual', 'desconexion', 'digital', 'equipos', 'informaticos', 'domicilio', 'distancia'],
  },

  // --- Ley 31110 - Regimen Agrario ---
  {
    id: 'ley31110-art2',
    lawNumber: 'Ley 31110',
    article: 'Art. 2-10',
    title: 'Regimen laboral agrario',
    content: 'El regimen laboral agrario se aplica a la actividad agroindustrial. La remuneracion diaria incluye CTS y gratificaciones (remuneracion diaria mas una parte proporcional). Los trabajadores tienen derecho a descanso vacacional de 30 dias calendario. Los empleadores aportan a EsSalud el 6% (gradualmente hasta 9%). Indemnizacion por despido arbitrario: 45 remuneraciones diarias por cada ano completo con tope de 360 remuneraciones diarias. Los contratos pueden ser a plazo determinado segun la naturaleza de la actividad.',
    category: 'agrario',
    keywords: ['agrario', 'agroindustrial', 'rural', 'remuneracion', 'diaria', 'essalud', 'cosecha', 'siembra', 'campo'],
  },

  // --- D.U. 038-2020 - COVID ---
  {
    id: 'du038-art15',
    lawNumber: 'D.U. 038-2020',
    article: 'Art. 15-17',
    title: 'Suspension perfecta de labores - COVID',
    content: 'Los empleadores que no pueden implementar trabajo remoto o aplicar licencia con goce de haber pueden optar por la suspension perfecta de labores. Durante la suspension perfecta, el empleador no paga remuneracion pero mantiene el vinculo laboral y la obligacion de depositar CTS. El trabajador puede disponer libremente de su CTS. Aplica subsidios para preservacion del empleo. Esta medida fue temporal durante la emergencia sanitaria COVID-19.',
    category: 'covid',
    keywords: ['covid', 'suspension', 'perfecta', 'emergencia', 'sanitaria', 'pandemia', 'remoto', 'subsidio', 'empleo'],
  },

  // --- Ley 29733 - Proteccion de datos ---
  {
    id: 'ley29733-art1',
    lawNumber: 'Ley 29733',
    article: 'Art. 1-18',
    title: 'Proteccion de datos personales',
    content: 'Toda persona tiene derecho a la proteccion de sus datos personales. El tratamiento de datos personales requiere el consentimiento del titular. El empleador que almacena datos personales de sus trabajadores debe inscribir el banco de datos en el Registro Nacional de Proteccion de Datos Personales. Los datos sensibles (origen racial, opiniones politicas, salud, orientacion sexual) requieren consentimiento expreso y escrito. El titular tiene derecho a acceder, rectificar, cancelar y oponerse al tratamiento de sus datos (derechos ARCO).',
    category: 'proteccion_datos',
    keywords: ['datos', 'personales', 'proteccion', 'consentimiento', 'privacidad', 'arco', 'banco', 'registro', 'sensibles'],
  },

  // --- Contratos modales ---
  {
    id: 'dleg728-art53',
    lawNumber: 'D.S. 003-97-TR (TUO D.Leg. 728)',
    article: 'Art. 53-83',
    title: 'Contratos sujetos a modalidad',
    content: 'Los contratos de trabajo sujetos a modalidad pueden celebrarse cuando asi lo requieran las necesidades del mercado o mayor produccion de la empresa, o cuando lo exija la naturaleza temporal o accidental del servicio. Tipos: a) Temporales: inicio de actividad, necesidades del mercado, reconversion empresarial; b) Accidentales: ocasional, suplencia, emergencia; c) De obra o servicio: obra determinada, servicio especifico, intermitente, de temporada. Plazo maximo acumulado: 5 anos. Deben constar por escrito y registrarse ante el MTPE.',
    category: 'contratacion',
    keywords: ['contrato', 'modal', 'temporal', 'suplencia', 'plazo', 'fijo', 'determinado', 'obra', 'servicio', 'especifico'],
  },

  // --- Remuneracion Minima Vital ---
  {
    id: 'rmv-2026',
    lawNumber: 'D.S. 003-2022-TR (y actualizaciones)',
    article: 'Art. Unico',
    title: 'Remuneracion Minima Vital',
    content: 'La Remuneracion Minima Vital (RMV) es el monto minimo que debe percibir un trabajador por una jornada de ocho horas de trabajo. La RMV se aplica a los trabajadores sujetos al regimen laboral de la actividad privada. No pagar la RMV constituye infraccion muy grave. La jornada maxima de trabajo es de 8 horas diarias o 48 horas semanales. Las horas extras se pagan con sobretasa: 25% las dos primeras horas, 35% a partir de la tercera hora.',
    category: 'remuneraciones',
    keywords: ['rmv', 'remuneracion', 'minima', 'vital', 'sueldo', 'salario', 'jornada', 'horas', 'extras', 'sobretasa'],
  },

  // --- Vacaciones ---
  {
    id: 'dleg713-art10',
    lawNumber: 'D.Leg. 713',
    article: 'Art. 10-23',
    title: 'Descanso vacacional',
    content: 'El trabajador tiene derecho a treinta dias calendario de descanso vacacional por cada ano completo de servicios. El descanso vacacional puede reducirse de treinta a quince dias con la respectiva compensacion de quince dias de remuneracion. El trabajador debe disfrutar del descanso vacacional en forma ininterrumpida; sin embargo, a solicitud escrita puede fraccionarse. Si el trabajador acumula dos periodos sin gozar de vacaciones, percibira triple remuneracion: una por el trabajo realizado, otra como indemnizacion, y la remuneracion vacacional correspondiente.',
    category: 'beneficios_sociales',
    keywords: ['vacaciones', 'descanso', 'vacacional', 'treinta', 'dias', 'fraccionamiento', 'triple', 'acumulacion', 'truncas'],
  },

  // --- Asignacion Familiar ---
  {
    id: 'ley25129-art1',
    lawNumber: 'Ley 25129',
    article: 'Art. 1-2',
    title: 'Asignacion familiar',
    content: 'Los trabajadores de la actividad privada cuyas remuneraciones no se regulan por negociacion colectiva percibiran el equivalente al 10% de la Remuneracion Minima Vital por concepto de asignacion familiar. Tienen derecho a percibirla los trabajadores que tengan a su cargo uno o mas hijos menores de 18 anos. En caso de que el hijo al cumplir la mayoria de edad se encuentre efectuando estudios superiores o universitarios, se extiende hasta los 24 anos.',
    category: 'remuneraciones',
    keywords: ['asignacion', 'familiar', 'hijos', 'menores', 'diez', 'porciento', 'rmv', 'estudios', 'universitarios'],
  },

  // --- Participacion en utilidades ---
  {
    id: 'dleg892-art1',
    lawNumber: 'D.Leg. 892',
    article: 'Art. 1-10',
    title: 'Participacion en utilidades',
    content: 'Los trabajadores de empresas que generan rentas de tercera categoria participan en las utilidades de la empresa. Los porcentajes son: Empresas pesqueras 10%, Empresas de telecomunicaciones 10%, Empresas industriales 10%, Empresas mineras 8%, Empresas de comercio al por mayor y menor y restaurantes 8%, Otras actividades 5%. La distribucion se realiza: 50% en funcion a los dias laborados y 50% en proporcion a las remuneraciones percibidas. El plazo para el pago es dentro de los 30 dias naturales siguientes al vencimiento del plazo para la presentacion de la DDJJ del IR.',
    category: 'beneficios_sociales',
    keywords: ['utilidades', 'participacion', 'reparto', 'porcentaje', 'renta', 'tercera', 'categoria', 'distribucion', 'dias'],
  },

  // --- Registro planilla electronica ---
  {
    id: 'ds018-art1',
    lawNumber: 'D.S. 018-2007-TR',
    article: 'Art. 1-4',
    title: 'Planilla electronica - T-Registro y PLAME',
    content: 'El empleador esta obligado a registrar a sus trabajadores en la planilla electronica que comprende el T-Registro y la PLAME. El T-Registro contiene informacion del empleador, trabajadores, pensionistas, prestadores de servicios y personal en formacion. La PLAME contiene informacion de ingresos, dias laborados, descuentos, tributos y aportes. El registro debe realizarse dentro del dia en que se produce el ingreso del trabajador. La omision de registro constituye infraccion grave.',
    category: 'contratacion',
    keywords: ['planilla', 'tregistro', 'plame', 'registro', 'sunat', 'electronica', 'empleador', 'declaracion', 'pdt'],
  },
]

// =============================================
// TF-IDF SCORING ENGINE
// =============================================

/**
 * Normaliza texto: minusculas, elimina acentos y caracteres especiales
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Tokeniza un texto en palabras, eliminando stopwords en espanol
 */
function tokenize(text: string): string[] {
  const stopwords = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del',
    'en', 'con', 'por', 'para', 'al', 'a', 'y', 'o', 'que', 'se', 'es',
    'su', 'sus', 'lo', 'le', 'les', 'mas', 'no', 'si', 'como', 'ser',
    'ha', 'son', 'esta', 'este', 'estos', 'estas', 'cada', 'tiene', 'puede',
    'debe', 'todo', 'toda', 'todos', 'todas', 'otro', 'otra', 'otros',
  ])
  return normalizeText(text)
    .split(' ')
    .filter(w => w.length > 2 && !stopwords.has(w))
}

/**
 * Calcula la frecuencia de terminos (TF) para un conjunto de tokens
 */
function termFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>()
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1)
  }
  // Normalizar por largo
  const maxFreq = Math.max(...freq.values(), 1)
  for (const [term, count] of freq) {
    freq.set(term, count / maxFreq)
  }
  return freq
}

/**
 * Calcula IDF (Inverse Document Frequency) sobre el corpus
 */
function computeIDF(): Map<string, number> {
  const idf = new Map<string, number>()
  const N = LEGAL_CORPUS.length
  const docFreq = new Map<string, number>()

  for (const excerpt of LEGAL_CORPUS) {
    const tokens = new Set([
      ...tokenize(excerpt.content),
      ...tokenize(excerpt.title),
      ...excerpt.keywords.map(k => normalizeText(k)),
    ])
    for (const token of tokens) {
      docFreq.set(token, (docFreq.get(token) || 0) + 1)
    }
  }

  for (const [term, df] of docFreq) {
    idf.set(term, Math.log(N / (1 + df)) + 1)
  }

  return idf
}

// Pre-compute IDF on module load
const IDF_CACHE = computeIDF()

/**
 * Calcula score TF-IDF entre una consulta y un extracto legal
 */
function tfidfScore(queryTokens: string[], excerpt: LawExcerpt): number {
  const docTokens = [
    ...tokenize(excerpt.content),
    ...tokenize(excerpt.title),
    ...excerpt.keywords.map(k => normalizeText(k)),
  ]
  const docTF = termFrequency(docTokens)

  let score = 0
  for (const queryToken of queryTokens) {
    const tf = docTF.get(queryToken) || 0
    const idf = IDF_CACHE.get(queryToken) || 1
    score += tf * idf

    // Bonus por coincidencia exacta en keywords
    if (excerpt.keywords.some(k => normalizeText(k) === queryToken)) {
      score += 1.5
    }
  }

  return score
}

// =============================================
// LEGAL RAG CLASS
// =============================================

export class LegalRAG {
  /**
   * Busca las leyes mas relevantes para una consulta usando TF-IDF
   */
  searchRelevantLaws(query: string, topK: number = 5): SearchResult[] {
    const queryTokens = tokenize(query)

    if (queryTokens.length === 0) {
      return []
    }

    const scored: SearchResult[] = LEGAL_CORPUS.map(excerpt => ({
      excerpt,
      score: tfidfScore(queryTokens, excerpt),
    }))

    // Filtrar solo resultados con score > 0 y ordenar por relevancia
    return scored
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  }

  /**
   * Construye un prompt enriquecido con contexto legal para el modelo de IA
   */
  buildPrompt(userQuery: string, relevantLaws?: SearchResult[]): RAGPrompt {
    const laws = relevantLaws || this.searchRelevantLaws(userQuery)

    const citations: string[] = laws.map(
      r => `${r.excerpt.lawNumber}, ${r.excerpt.article}`
    )

    let legalContext = ''
    if (laws.length > 0) {
      legalContext = `\n\nCONTEXTO LEGAL RELEVANTE (usa estas fuentes para fundamentar tu respuesta):\n\n`
      legalContext += laws
        .map(
          (r, i) =>
            `[${i + 1}] ${r.excerpt.lawNumber} - ${r.excerpt.article}: "${r.excerpt.title}"\n${r.excerpt.content}\n`
        )
        .join('\n')
      legalContext += `\nIMPORTANTE: Cita estas normas especificas en tu respuesta usando el formato "Segun el Art. X del [norma]...". Si la informacion del corpus no es suficiente, indicalo y anade tu conocimiento general de la legislacion laboral peruana.`
    }

    const systemPrompt = `Eres el Asistente IA Laboral de COMPLY360, un experto en derecho laboral peruano.
Tu rol es ayudar a empresas peruanas con consultas laborales, citando siempre la base legal especifica.

REGLAS:
1. Siempre cita la base legal especifica (norma, articulo) en tus respuestas
2. Usa el contexto legal proporcionado como fuente primaria
3. Formato de citas: "Segun el Art. X del D.Leg. 728..." o "De acuerdo con el Art. X de la Ley YYYY..."
4. Si no estas seguro de algo, indicalo y sugiere consultar con un abogado
5. Responde en espanol, de forma clara y practica
6. Menciona montos en soles y UITs cuando sea relevante (UIT 2026 = S/ 5,500)
7. No inventes normas. Si no conoces la norma exacta, indicalo
8. Ofrece pasos concretos y accionables${legalContext}`

    return {
      systemPrompt,
      legalContext,
      citations,
    }
  }

  /**
   * Genera una respuesta completa integrando RAG con el motor de IA.
   * Si no hay API key de OpenAI, genera respuesta simulada con citas legales.
   */
  async chat(
    userQuery: string,
    orgContext?: { razonSocial?: string; sector?: string; totalWorkers?: number },
  ): Promise<{ response: string; citations: string[]; relevantLaws: SearchResult[] }> {
    const relevantLaws = this.searchRelevantLaws(userQuery)
    const { systemPrompt, citations } = this.buildPrompt(userQuery, relevantLaws)

    const apiKey = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY

    let response: string

    if (apiKey) {
      // Routing por feature 'chat' → DeepSeek V4 Flash por default.
      // Si falla cualquier provider, cae a respuesta simulada con citas RAG.
      try {
        const { callAI } = await import('./provider')
        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: systemPrompt },
        ]

        if (orgContext) {
          const ctxParts = ['CONTEXTO DE LA EMPRESA:']
          if (orgContext.razonSocial) ctxParts.push(`- Razon Social: ${orgContext.razonSocial}`)
          if (orgContext.sector) ctxParts.push(`- Sector: ${orgContext.sector}`)
          if (orgContext.totalWorkers !== undefined) ctxParts.push(`- Trabajadores: ${orgContext.totalWorkers}`)
          messages.push({ role: 'system' as const, content: ctxParts.join('\n') })
        }

        messages.push({ role: 'user' as const, content: userQuery })

        response = await callAI(messages, {
          temperature: 0.3,
          maxTokens: 2000,
          feature: 'chat',
        })
      } catch (error) {
        console.error('Error en LegalRAG con provider:', error)
        response = this.buildSimulatedResponse(userQuery, relevantLaws)
      }
    } else {
      response = this.buildSimulatedResponse(userQuery, relevantLaws)
    }

    return { response, citations, relevantLaws }
  }

  /**
   * Genera respuesta simulada con citas legales del corpus
   */
  private buildSimulatedResponse(query: string, laws: SearchResult[]): string {
    if (laws.length === 0) {
      return `No encontre normas especificas directamente relacionadas con tu consulta. Te recomiendo reformular la pregunta o consultar con un abogado laboralista para un analisis detallado.`
    }

    const topLaw = laws[0].excerpt
    let response = `## ${topLaw.title}\n\n`
    response += `Segun el **${topLaw.article}** del **${topLaw.lawNumber}**:\n\n`
    response += `> ${topLaw.content}\n\n`

    if (laws.length > 1) {
      response += `### Normativa complementaria:\n\n`
      for (let i = 1; i < Math.min(laws.length, 4); i++) {
        const law = laws[i].excerpt
        response += `- **${law.lawNumber}, ${law.article}** — ${law.title}: ${law.content.substring(0, 150)}...\n\n`
      }
    }

    response += `\n---\n*Fuentes citadas: ${laws.map(l => `${l.excerpt.lawNumber} ${l.excerpt.article}`).join('; ')}*`

    return response
  }
}

// Singleton instance
export const legalRAG = new LegalRAG()
