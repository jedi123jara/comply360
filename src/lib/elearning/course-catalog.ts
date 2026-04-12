/**
 * Catalogo de cursos obligatorios y RRHH para COMPLY360
 * Estos datos se usan para seed y para el catalogo en UI
 */

export interface CourseSeed {
  slug: string
  title: string
  description: string
  category: string
  durationMin: number
  isObligatory: boolean
  targetRegimen: string[]
  passingScore: number
  sortOrder: number
  lessons: {
    title: string
    description: string
    contentType: string
    contentHtml: string
    durationMin: number
    sortOrder: number
  }[]
  examQuestions: {
    question: string
    options: string[]
    correctIndex: number
    explanation: string
    sortOrder: number
  }[]
}

export const COURSE_CATALOG: CourseSeed[] = [
  // ===== CURSOS OBLIGATORIOS SST (Ley 29783) =====
  {
    slug: 'sst-induccion-general',
    title: 'Induccion en Seguridad y Salud en el Trabajo',
    description: 'Capacitacion obligatoria para todo trabajador nuevo. Conceptos basicos de SST, derechos y obligaciones segun Ley 29783.',
    category: 'SST',
    durationMin: 45,
    isObligatory: true,
    targetRegimen: ['GENERAL', 'MYPE_MICRO', 'MYPE_PEQUENA', 'AGRARIO', 'CONSTRUCCION_CIVIL', 'MINERO', 'PESQUERO', 'TEXTIL_EXPORTACION', 'DOMESTICO', 'TELETRABAJO'],
    passingScore: 70,
    sortOrder: 1,
    lessons: [
      {
        title: 'Marco legal de SST en Peru',
        description: 'Ley 29783 y su reglamento D.S. 005-2012-TR',
        contentType: 'READING',
        contentHtml: `<h2>Marco Legal de la Seguridad y Salud en el Trabajo</h2>
<p>La <strong>Ley 29783</strong>, Ley de Seguridad y Salud en el Trabajo, establece el marco normativo para la prevencion de riesgos laborales en Peru. Su reglamento, aprobado por <strong>D.S. 005-2012-TR</strong>, detalla las obligaciones especificas.</p>
<h3>Principios fundamentales</h3>
<ul>
<li><strong>Principio de Prevencion:</strong> El empleador garantiza condiciones que protejan la vida, salud y bienestar de los trabajadores.</li>
<li><strong>Principio de Responsabilidad:</strong> El empleador asume las implicancias economicas, legales y de cualquier otra indole cuando un trabajador sufre un accidente o enfermedad ocupacional.</li>
<li><strong>Principio de Cooperacion:</strong> El Estado, los empleadores, los trabajadores y las organizaciones sindicales colaboran para garantizar una efectiva politica de SST.</li>
<li><strong>Principio de Informacion y Capacitacion:</strong> Los trabajadores reciben formacion oportuna y adecuada sobre los riesgos en el centro de trabajo.</li>
<li><strong>Principio de Atencion Integral de la Salud:</strong> Los trabajadores que sufran un accidente de trabajo o enfermedad profesional tienen derecho a prestaciones de salud hasta su recuperacion.</li>
</ul>
<h3>Derechos del trabajador en SST</h3>
<ul>
<li>Ser informado sobre los riesgos en su puesto de trabajo</li>
<li>Retirarse de una zona de riesgo inminente (sin sancion)</li>
<li>Participar en el Comite de SST o elegir un Supervisor de SST</li>
<li>Recibir equipos de proteccion personal (EPP) sin costo</li>
<li>Pasar examenes medicos ocupacionales periodicos</li>
</ul>`,
        durationMin: 15,
        sortOrder: 1,
      },
      {
        title: 'Identificacion de peligros y riesgos (IPERC)',
        description: 'Como identificar peligros y evaluar riesgos en tu puesto de trabajo',
        contentType: 'READING',
        contentHtml: `<h2>Identificacion de Peligros y Evaluacion de Riesgos (IPERC)</h2>
<p>El <strong>IPERC</strong> es la herramienta fundamental para gestionar la seguridad en el trabajo. Todo trabajador debe conocer los peligros de su area.</p>
<h3>Tipos de peligros</h3>
<ul>
<li><strong>Fisicos:</strong> Ruido, vibraciones, temperatura extrema, radiacion, iluminacion</li>
<li><strong>Quimicos:</strong> Gases, vapores, polvos, humos, liquidos peligrosos</li>
<li><strong>Biologicos:</strong> Virus, bacterias, hongos, parasitos</li>
<li><strong>Ergonomicos:</strong> Posturas forzadas, movimientos repetitivos, manipulacion de cargas</li>
<li><strong>Psicosociales:</strong> Estres, fatiga, acoso, violencia laboral</li>
<li><strong>Mecanicos:</strong> Maquinas sin proteccion, herramientas defectuosas, superficies resbalosas</li>
<li><strong>Electricos:</strong> Contacto con cables, instalaciones defectuosas</li>
</ul>
<h3>Evaluacion del riesgo</h3>
<p>Se evalua con la formula: <strong>Riesgo = Probabilidad x Severidad</strong></p>
<table>
<tr><th>Nivel</th><th>Valor</th><th>Accion</th></tr>
<tr><td>Trivial</td><td>1-4</td><td>No requiere accion especifica</td></tr>
<tr><td>Tolerable</td><td>5-8</td><td>Monitorear periodicamente</td></tr>
<tr><td>Moderado</td><td>9-16</td><td>Reducir riesgo en plazo determinado</td></tr>
<tr><td>Importante</td><td>17-24</td><td>No debe comenzar trabajo hasta reducir riesgo</td></tr>
<tr><td>Intolerable</td><td>25</td><td>Detener trabajo inmediatamente</td></tr>
</table>`,
        durationMin: 15,
        sortOrder: 2,
      },
      {
        title: 'Uso correcto de EPP y respuesta a emergencias',
        description: 'Equipos de proteccion personal y plan de emergencia',
        contentType: 'READING',
        contentHtml: `<h2>Equipos de Proteccion Personal (EPP)</h2>
<p>El EPP es la ultima barrera de proteccion. El empleador debe proporcionarlos <strong>sin costo</strong> y el trabajador debe usarlos correctamente.</p>
<h3>EPP segun tipo de riesgo</h3>
<ul>
<li><strong>Proteccion craneal:</strong> Casco de seguridad en construccion, industria, mineria</li>
<li><strong>Proteccion visual:</strong> Lentes de seguridad, caretas, pantallas faciales</li>
<li><strong>Proteccion auditiva:</strong> Tapones, orejeras (obligatorio > 85 dB)</li>
<li><strong>Proteccion respiratoria:</strong> Mascarillas, respiradores con filtro</li>
<li><strong>Proteccion de manos:</strong> Guantes segun riesgo (quimico, termico, mecanico)</li>
<li><strong>Proteccion de pies:</strong> Botas con punta de acero, zapatos dielectricos</li>
<li><strong>Proteccion contra caidas:</strong> Arnes de seguridad (obligatorio > 1.80 m)</li>
</ul>
<h3>Plan de emergencia</h3>
<ol>
<li>Conocer las rutas de evacuacion y puntos de reunion</li>
<li>Identificar la ubicacion de extintores y botiquines</li>
<li>Conocer los numeros de emergencia de la empresa</li>
<li>Participar en simulacros de evacuacion (minimo 2/anio)</li>
<li>Reportar cualquier condicion insegura al supervisor</li>
</ol>`,
        durationMin: 15,
        sortOrder: 3,
      },
    ],
    examQuestions: [
      {
        question: 'Cual es la ley que regula la Seguridad y Salud en el Trabajo en Peru?',
        options: ['Ley 28806', 'Ley 29783', 'D.Leg. 728', 'Ley 27942'],
        correctIndex: 1,
        explanation: 'La Ley 29783 es la Ley de Seguridad y Salud en el Trabajo, reglamentada por D.S. 005-2012-TR.',
        sortOrder: 1,
      },
      {
        question: 'Que principio permite a un trabajador retirarse de una zona de riesgo inminente sin ser sancionado?',
        options: ['Principio de Prevencion', 'Principio de Cooperacion', 'Principio de Proteccion', 'Principio de Informacion'],
        correctIndex: 0,
        explanation: 'El Principio de Prevencion establece que el trabajador puede retirarse de una situacion de peligro inminente sin consecuencias.',
        sortOrder: 2,
      },
      {
        question: 'Que significa IPERC?',
        options: ['Inventario de Peligros y Evaluacion de Riesgos y Control', 'Identificacion de Peligros y Evaluacion de Riesgos y Control', 'Informe de Peligros y Evaluacion de Riesgos Criticos', 'Identificacion de Problemas y Evaluacion de Resultados Criticos'],
        correctIndex: 1,
        explanation: 'IPERC = Identificacion de Peligros, Evaluacion de Riesgos y medidas de Control.',
        sortOrder: 3,
      },
      {
        question: 'A partir de que altura es obligatorio el uso de arnes de seguridad?',
        options: ['1.20 metros', '1.50 metros', '1.80 metros', '2.00 metros'],
        correctIndex: 2,
        explanation: 'Segun la normativa peruana, el arnes de seguridad es obligatorio para trabajos en altura superiores a 1.80 metros.',
        sortOrder: 4,
      },
      {
        question: 'Quien debe asumir el costo de los EPP?',
        options: ['El trabajador', 'El empleador', 'Se comparte 50/50', 'El Estado'],
        correctIndex: 1,
        explanation: 'El empleador esta obligado a proporcionar EPP sin costo para el trabajador (Art. 60, Ley 29783).',
        sortOrder: 5,
      },
      {
        question: 'Cual es la formula para evaluar el riesgo en IPERC?',
        options: ['Riesgo = Frecuencia + Gravedad', 'Riesgo = Probabilidad x Severidad', 'Riesgo = Exposicion / Control', 'Riesgo = Peligro x Vulnerabilidad'],
        correctIndex: 1,
        explanation: 'El riesgo se calcula multiplicando la Probabilidad de ocurrencia por la Severidad del dano potencial.',
        sortOrder: 6,
      },
      {
        question: 'Cuantos simulacros de evacuacion como minimo debe realizar una empresa al anio?',
        options: ['1', '2', '3', '4'],
        correctIndex: 1,
        explanation: 'Se requieren como minimo 2 simulacros de evacuacion al anio para mantener preparado al personal.',
        sortOrder: 7,
      },
      {
        question: 'A partir de que nivel de ruido (dB) es obligatoria la proteccion auditiva?',
        options: ['70 dB', '80 dB', '85 dB', '90 dB'],
        correctIndex: 2,
        explanation: 'La proteccion auditiva es obligatoria cuando el nivel de ruido supera los 85 decibeles.',
        sortOrder: 8,
      },
    ],
  },

  // ===== PREVENCION HOSTIGAMIENTO SEXUAL (Ley 27942) =====
  {
    slug: 'prevencion-hostigamiento-sexual',
    title: 'Prevencion del Hostigamiento Sexual en el Trabajo',
    description: 'Capacitacion obligatoria sobre hostigamiento sexual laboral. Ley 27942 y D.S. 014-2019-MIMP.',
    category: 'HOSTIGAMIENTO',
    durationMin: 40,
    isObligatory: true,
    targetRegimen: ['GENERAL', 'MYPE_MICRO', 'MYPE_PEQUENA', 'AGRARIO', 'CONSTRUCCION_CIVIL', 'MINERO', 'PESQUERO', 'TEXTIL_EXPORTACION', 'DOMESTICO', 'CAS', 'TELETRABAJO'],
    passingScore: 70,
    sortOrder: 2,
    lessons: [
      {
        title: 'Que es el hostigamiento sexual laboral',
        description: 'Definicion legal, tipos y manifestaciones',
        contentType: 'READING',
        contentHtml: `<h2>Hostigamiento Sexual en el Trabajo</h2>
<p>Segun la <strong>Ley 27942</strong>, el hostigamiento sexual es toda conducta de naturaleza sexual o sexista <strong>no deseada</strong> que afecta la dignidad de una persona.</p>
<h3>Elementos del hostigamiento sexual</h3>
<ol>
<li><strong>Conducta de naturaleza sexual o sexista:</strong> No requiere contacto fisico</li>
<li><strong>No deseada:</strong> La victima no consiente la conducta</li>
<li><strong>Que afecte la dignidad:</strong> Genera un ambiente intimidatorio, hostil o humillante</li>
</ol>
<h3>Manifestaciones</h3>
<ul>
<li>Comentarios o bromas de contenido sexual</li>
<li>Miradas o gestos lascivos</li>
<li>Envio de imagenes de contenido sexual</li>
<li>Propuestas sexuales no deseadas</li>
<li>Tocamientos indebidos</li>
<li>Promesa de beneficios a cambio de favores sexuales (quid pro quo)</li>
<li>Amenazas o represalias por rechazar insinuaciones</li>
</ul>
<p><strong>IMPORTANTE:</strong> No se requiere que la conducta sea reiterada. Un solo acto puede constituir hostigamiento sexual si es lo suficientemente grave.</p>`,
        durationMin: 12,
        sortOrder: 1,
      },
      {
        title: 'Procedimiento de denuncia y proteccion',
        description: 'Como denunciar, plazos legales y medidas de proteccion',
        contentType: 'READING',
        contentHtml: `<h2>Procedimiento de Denuncia</h2>
<h3>Canal interno</h3>
<p>Toda empresa debe tener un <strong>canal de denuncias</strong> accesible, confidencial y que permita denuncias anonimas.</p>
<h3>Plazos legales (D.S. 014-2019-MIMP)</h3>
<ul>
<li><strong>Medidas de proteccion:</strong> Dentro de 3 dias habiles de recibida la denuncia</li>
<li><strong>Investigacion:</strong> Maximo 30 dias calendario</li>
<li><strong>Resolucion:</strong> Dentro de 5 dias habiles desde el fin de la investigacion</li>
</ul>
<h3>Medidas de proteccion</h3>
<ul>
<li>Rotacion del presunto hostigador</li>
<li>Impedimento de acercamiento a la victima</li>
<li>Suspension temporal del presunto hostigador</li>
<li>Asignacion de labores que eviten el contacto</li>
</ul>
<h3>Prohibicion de represalias</h3>
<p>Esta <strong>terminantemente prohibido</strong> tomar represalias contra el denunciante (Art. 8, Ley 27942). Cualquier represalia puede ser sancionada como infraccion muy grave.</p>`,
        durationMin: 12,
        sortOrder: 2,
      },
      {
        title: 'Responsabilidades y sanciones',
        description: 'Obligaciones del empleador y sanciones por incumplimiento',
        contentType: 'READING',
        contentHtml: `<h2>Responsabilidades del Empleador</h2>
<h3>Obligaciones principales</h3>
<ul>
<li>Adoptar una <strong>Politica contra el Hostigamiento Sexual</strong> (obligatoria para todas las empresas)</li>
<li>Capacitar a todos los trabajadores sobre prevencion (minimo 1 vez al anio)</li>
<li>Implementar un canal de denuncias accesible</li>
<li>Investigar de oficio cuando tenga conocimiento de hechos</li>
<li>Aplicar medidas de proteccion inmediatas</li>
<li>Sancionar al responsable</li>
</ul>
<h3>Sanciones al hostigador</h3>
<ul>
<li>Amonestacion verbal o escrita</li>
<li>Suspension sin goce de haber</li>
<li><strong>Despido por falta grave</strong> (Art. 25, D.Leg. 728)</li>
</ul>
<h3>Sanciones al empleador (por omision)</h3>
<ul>
<li>Infraccion <strong>muy grave</strong> ante SUNAFIL</li>
<li>Multa de hasta <strong>52.53 UIT</strong> (S/ 281,039.50 en 2026)</li>
<li>Responsabilidad solidaria por los danos causados a la victima</li>
</ul>`,
        durationMin: 12,
        sortOrder: 3,
      },
    ],
    examQuestions: [
      {
        question: 'Segun la Ley 27942, el hostigamiento sexual requiere que la conducta sea reiterada para configurarse?',
        options: ['Si, requiere al menos 3 hechos', 'Si, requiere al menos 2 hechos', 'No, un solo acto puede ser suficiente', 'Depende de la gravedad'],
        correctIndex: 2,
        explanation: 'Un solo acto puede constituir hostigamiento sexual si es lo suficientemente grave para afectar la dignidad de la persona.',
        sortOrder: 1,
      },
      {
        question: 'Cual es el plazo maximo para aplicar medidas de proteccion despues de recibida una denuncia?',
        options: ['24 horas', '3 dias habiles', '5 dias habiles', '30 dias calendario'],
        correctIndex: 1,
        explanation: 'El empleador debe aplicar medidas de proteccion dentro de 3 dias habiles de recibida la denuncia (D.S. 014-2019-MIMP).',
        sortOrder: 2,
      },
      {
        question: 'Tomar represalias contra un denunciante de hostigamiento sexual es:',
        options: ['Una falta leve', 'Una infraccion grave', 'Una infraccion muy grave', 'No esta regulado'],
        correctIndex: 2,
        explanation: 'Las represalias contra el denunciante estan terminantemente prohibidas por el Art. 8 de la Ley 27942 y constituyen infraccion muy grave.',
        sortOrder: 3,
      },
      {
        question: 'Que documento es obligatorio que toda empresa tenga respecto al hostigamiento sexual?',
        options: ['Plan de Igualdad', 'Politica contra el Hostigamiento Sexual', 'Reglamento de Conducta', 'Codigo de Etica'],
        correctIndex: 1,
        explanation: 'La Politica contra el Hostigamiento Sexual es obligatoria para todas las empresas, sin importar su tamano.',
        sortOrder: 4,
      },
      {
        question: 'El hostigamiento sexual laboral puede ocurrir entre:',
        options: ['Solo entre jefe y subordinado', 'Solo entre companeros del mismo nivel', 'Cualquier relacion laboral, incluyendo terceros', 'Solo dentro de la misma area'],
        correctIndex: 2,
        explanation: 'Puede ocurrir en cualquier relacion laboral: jefe-subordinado, entre pares, e incluso con terceros (clientes, proveedores).',
        sortOrder: 5,
      },
      {
        question: 'Cual es el plazo maximo para concluir la investigacion de una denuncia?',
        options: ['15 dias habiles', '20 dias calendario', '30 dias calendario', '45 dias habiles'],
        correctIndex: 2,
        explanation: 'La investigacion debe concluir en un plazo maximo de 30 dias calendario (D.S. 014-2019-MIMP, Art. 20).',
        sortOrder: 6,
      },
    ],
  },

  // ===== DERECHOS LABORALES =====
  {
    slug: 'derechos-laborales-trabajador',
    title: 'Derechos Laborales del Trabajador Peruano',
    description: 'Conoce tus derechos laborales: remuneraciones, beneficios sociales, jornada y descansos segun la legislacion peruana.',
    category: 'DERECHOS_LABORALES',
    durationMin: 35,
    isObligatory: true,
    targetRegimen: ['GENERAL', 'MYPE_MICRO', 'MYPE_PEQUENA', 'AGRARIO', 'CONSTRUCCION_CIVIL', 'MINERO', 'PESQUERO', 'TEXTIL_EXPORTACION', 'DOMESTICO', 'CAS', 'TELETRABAJO'],
    passingScore: 70,
    sortOrder: 3,
    lessons: [
      {
        title: 'Remuneracion y beneficios sociales',
        description: 'RMV, CTS, gratificaciones y otros beneficios',
        contentType: 'READING',
        contentHtml: `<h2>Remuneracion y Beneficios Sociales</h2>
<h3>Remuneracion Minima Vital (RMV)</h3>
<p>La RMV vigente (2026) es de <strong>S/ 1,130.00</strong> mensuales para una jornada de 8 horas diarias o 48 horas semanales.</p>
<h3>Beneficios sociales del regimen general (D.Leg. 728)</h3>
<ul>
<li><strong>CTS:</strong> Equivalente a 1 sueldo + 1/6 gratificacion al anio. Deposito en mayo y noviembre.</li>
<li><strong>Gratificaciones:</strong> 1 sueldo en julio y 1 sueldo en diciembre, mas bonificacion extraordinaria del 9%.</li>
<li><strong>Vacaciones:</strong> 30 dias calendario por cada anio completo de servicios.</li>
<li><strong>Asignacion familiar:</strong> 10% de la RMV (S/ 113.00) para trabajadores con hijos menores de 18 anios.</li>
<li><strong>Seguro social:</strong> EsSalud (9% a cargo del empleador), SCTR si aplica.</li>
</ul>
<h3>Regimen MYPE</h3>
<ul>
<li><strong>Microempresa:</strong> Sin CTS, sin gratificaciones, vacaciones 15 dias.</li>
<li><strong>Pequena empresa:</strong> 50% CTS, 50% gratificaciones, vacaciones 15 dias.</li>
</ul>`,
        durationMin: 12,
        sortOrder: 1,
      },
      {
        title: 'Jornada laboral y descansos',
        description: 'Horas de trabajo, sobretiempo, descanso semanal y feriados',
        contentType: 'READING',
        contentHtml: `<h2>Jornada Laboral y Descansos</h2>
<h3>Jornada ordinaria</h3>
<ul>
<li>Maxima: <strong>8 horas diarias o 48 horas semanales</strong></li>
<li>Refrigerio: minimo 45 minutos (no computable como tiempo efectivo)</li>
<li>Trabajo nocturno (10pm-6am): sobretasa 35% sobre RMV</li>
</ul>
<h3>Horas extras (sobretiempo)</h3>
<ul>
<li>Primeras 2 horas: sobretasa <strong>25%</strong> sobre la remuneracion hora</li>
<li>Horas siguientes: sobretasa <strong>35%</strong></li>
<li>Las horas extras son <strong>voluntarias</strong> — no se puede obligar</li>
</ul>
<h3>Descanso semanal obligatorio</h3>
<ul>
<li>Minimo <strong>24 horas consecutivas</strong> preferentemente el domingo</li>
<li>Trabajo en dia de descanso sin sustitucion: pago con sobretasa 100%</li>
</ul>
<h3>Feriados no laborables</h3>
<p>Peru tiene feriados legales (1 enero, jueves y viernes santo, 1 mayo, etc.). Trabajo en feriado: pago con sobretasa 100%.</p>`,
        durationMin: 12,
        sortOrder: 2,
      },
      {
        title: 'Despido y proteccion contra el despido arbitrario',
        description: 'Tipos de despido, indemnizacion y derechos al cese',
        contentType: 'READING',
        contentHtml: `<h2>Despido y Proteccion Laboral</h2>
<h3>Tipos de despido</h3>
<ul>
<li><strong>Despido justificado:</strong> Por causa justa relacionada con la conducta o capacidad del trabajador. El empleador debe seguir el procedimiento de ley (carta de preaviso + descargos).</li>
<li><strong>Despido arbitrario:</strong> Sin causa justa. Genera derecho a indemnizacion.</li>
<li><strong>Despido nulo:</strong> Por motivos discriminatorios, sindicales, maternidad, etc. El trabajador puede exigir reposicion.</li>
</ul>
<h3>Indemnizacion por despido arbitrario</h3>
<ul>
<li><strong>Contrato indefinido:</strong> 1.5 remuneraciones por cada anio completo de servicios (tope 12 remuneraciones)</li>
<li><strong>Contrato plazo fijo:</strong> Remuneraciones dejadas de percibir hasta el vencimiento del contrato (tope 12 remuneraciones)</li>
</ul>
<h3>Liquidacion de beneficios sociales</h3>
<p>Al cese, el empleador debe pagar dentro de las <strong>48 horas</strong>:</p>
<ul>
<li>CTS trunca</li>
<li>Gratificacion trunca</li>
<li>Vacaciones truncas + indemnizacion vacacional si aplica</li>
<li>Remuneracion pendiente</li>
</ul>`,
        durationMin: 11,
        sortOrder: 3,
      },
    ],
    examQuestions: [
      {
        question: 'Cual es la Remuneracion Minima Vital (RMV) vigente en 2026?',
        options: ['S/ 930.00', 'S/ 1,130.00', 'S/ 1,100.00', 'S/ 1,200.00'],
        correctIndex: 1,
        explanation: 'La RMV vigente en 2026 es de S/ 1,130.00 mensuales.',
        sortOrder: 1,
      },
      {
        question: 'Cual es la sobretasa por las primeras 2 horas extras de trabajo?',
        options: ['15%', '20%', '25%', '35%'],
        correctIndex: 2,
        explanation: 'Las primeras 2 horas extras tienen una sobretasa del 25% sobre la remuneracion hora.',
        sortOrder: 2,
      },
      {
        question: 'En el regimen de microempresa, los trabajadores tienen derecho a CTS?',
        options: ['Si, CTS completa', 'Si, pero solo 50%', 'No tienen derecho a CTS', 'Solo si la empresa lo decide'],
        correctIndex: 2,
        explanation: 'En el regimen de microempresa (Ley 32353), los trabajadores no tienen derecho a CTS.',
        sortOrder: 3,
      },
      {
        question: 'Cual es el tope maximo de indemnizacion por despido arbitrario en contrato indefinido?',
        options: ['6 remuneraciones', '8 remuneraciones', '10 remuneraciones', '12 remuneraciones'],
        correctIndex: 3,
        explanation: 'El tope maximo de indemnizacion es de 12 remuneraciones mensuales.',
        sortOrder: 4,
      },
      {
        question: 'En cuanto tiempo debe pagar el empleador la liquidacion de beneficios tras el cese?',
        options: ['24 horas', '48 horas', '5 dias habiles', '15 dias habiles'],
        correctIndex: 1,
        explanation: 'El empleador debe pagar la liquidacion dentro de las 48 horas siguientes al cese.',
        sortOrder: 5,
      },
    ],
  },

  // ===== CURSO RRHH: INSPECCIONES SUNAFIL =====
  {
    slug: 'preparacion-inspecciones-sunafil',
    title: 'Preparacion ante Inspecciones SUNAFIL',
    description: 'Curso para RRHH: como prepararse para una inspeccion laboral, documentos requeridos y protocolo segun R.M. 199-2016-TR.',
    category: 'INSPECCIONES',
    durationMin: 30,
    isObligatory: false,
    targetRegimen: ['GENERAL', 'MYPE_MICRO', 'MYPE_PEQUENA'],
    passingScore: 70,
    sortOrder: 4,
    lessons: [
      {
        title: 'El proceso de inspeccion laboral',
        description: 'Tipos de inspeccion, fases y derechos del empleador',
        contentType: 'READING',
        contentHtml: `<h2>El Proceso de Inspeccion Laboral</h2>
<h3>Tipos de inspeccion</h3>
<ul>
<li><strong>Operativo de orientacion:</strong> Informativa, sin multa</li>
<li><strong>Investigacion por denuncia:</strong> Motivada por un trabajador o tercero</li>
<li><strong>Inspeccion programada:</strong> Por sectores de riesgo o campanas</li>
<li><strong>Reinspeccion:</strong> Verificar cumplimiento de requerimientos previos</li>
</ul>
<h3>Fases de la inspeccion</h3>
<ol>
<li><strong>Visita:</strong> El inspector se presenta con orden de inspeccion</li>
<li><strong>Verificacion:</strong> Revisa documentos, entrevista trabajadores</li>
<li><strong>Acta de infraccion</strong> o <strong>cierre sin hallazgos</strong></li>
<li><strong>Requerimiento:</strong> Si hay infracciones subsanables, se da plazo</li>
</ol>
<h3>Derechos del empleador</h3>
<ul>
<li>Solicitar credencial e identificacion del inspector</li>
<li>Verificar la orden de inspeccion</li>
<li>Estar presente durante la visita</li>
<li>Presentar descargos y evidencia</li>
</ul>`,
        durationMin: 15,
        sortOrder: 1,
      },
      {
        title: 'Documentos que SUNAFIL solicita y como subsanar',
        description: 'Los 28 documentos obligatorios y estrategias de subsanacion',
        contentType: 'READING',
        contentHtml: `<h2>Documentos que SUNAFIL Solicita</h2>
<h3>Documentos clave por area</h3>
<p><strong>Contratos y registro:</strong></p>
<ul>
<li>Contratos de trabajo de todos los trabajadores</li>
<li>Registro en T-REGISTRO (planilla electronica)</li>
<li>Boletas de pago firmadas</li>
</ul>
<p><strong>Beneficios sociales:</strong></p>
<ul>
<li>Constancias de deposito CTS</li>
<li>Boletas de gratificaciones julio/diciembre</li>
<li>Registro de vacaciones gozadas</li>
</ul>
<p><strong>SST:</strong></p>
<ul>
<li>Politica de SST</li>
<li>IPERC actualizado</li>
<li>Registros de capacitaciones SST (minimo 4/anio)</li>
<li>Registros de entrega de EPP</li>
<li>Examenes medicos ocupacionales</li>
</ul>
<h3>Subsanacion voluntaria (Art. 40, Ley 28806)</h3>
<p>Si subsanas <strong>antes</strong> de la inspeccion: descuento del <strong>90%</strong> en la multa.</p>
<p>Si subsanas <strong>durante</strong> la inspeccion: descuento de hasta <strong>70%</strong>.</p>`,
        durationMin: 15,
        sortOrder: 2,
      },
    ],
    examQuestions: [
      {
        question: 'Cual es el descuento en la multa por subsanacion voluntaria antes de la inspeccion?',
        options: ['50%', '70%', '80%', '90%'],
        correctIndex: 3,
        explanation: 'La subsanacion voluntaria antes de la inspeccion genera un descuento del 90% en la multa (Art. 40, Ley 28806).',
        sortOrder: 1,
      },
      {
        question: 'Puede el empleador solicitar la credencial del inspector de SUNAFIL?',
        options: ['No, esta prohibido', 'Si, es su derecho', 'Solo si tiene abogado presente', 'Solo si es una reinspeccion'],
        correctIndex: 1,
        explanation: 'El empleador tiene derecho a solicitar la credencial e identificacion del inspector, asi como verificar la orden de inspeccion.',
        sortOrder: 2,
      },
      {
        question: 'Cuantas capacitaciones SST como minimo debe registrar una empresa al anio?',
        options: ['2', '3', '4', '6'],
        correctIndex: 2,
        explanation: 'La Ley 29783 exige un minimo de 4 capacitaciones SST al anio.',
        sortOrder: 3,
      },
      {
        question: 'Que tipo de inspeccion NO genera multa?',
        options: ['Inspeccion programada', 'Operativo de orientacion', 'Inspeccion por denuncia', 'Reinspeccion'],
        correctIndex: 1,
        explanation: 'El operativo de orientacion es informativo y no genera multas, solo recomendaciones.',
        sortOrder: 4,
      },
    ],
  },

  // ===== IGUALDAD SALARIAL (Ley 30709) =====
  {
    slug: 'igualdad-salarial-no-discriminacion',
    title: 'Igualdad Salarial y No Discriminacion',
    description: 'Obligaciones del empleador en materia de igualdad remunerativa (Ley 30709) y no discriminacion laboral.',
    category: 'IGUALDAD',
    durationMin: 25,
    isObligatory: false,
    targetRegimen: ['GENERAL', 'MYPE_PEQUENA'],
    passingScore: 70,
    sortOrder: 5,
    lessons: [
      {
        title: 'Igualdad salarial y cuadro de categorias',
        description: 'Ley 30709 y su reglamento D.S. 002-2018-TR',
        contentType: 'READING',
        contentHtml: `<h2>Igualdad Salarial (Ley 30709)</h2>
<p>La <strong>Ley 30709</strong> prohibe la discriminacion remunerativa entre hombres y mujeres por motivo de sexo.</p>
<h3>Obligaciones del empleador</h3>
<ul>
<li>Elaborar un <strong>cuadro de categorias y funciones</strong></li>
<li>Establecer una <strong>politica salarial</strong> con criterios objetivos</li>
<li>Garantizar igual remuneracion por trabajo de igual valor</li>
<li>No reducir remuneracion para cumplir con la ley</li>
</ul>
<h3>Criterios objetivos permitidos para diferencias salariales</h3>
<ul>
<li>Antiguedad</li>
<li>Desempeno (evaluacion documentada)</li>
<li>Negociacion colectiva</li>
<li>Escasez de oferta de trabajadores calificados</li>
<li>Costo de vida en la zona</li>
</ul>
<h3>Sanciones</h3>
<p>Infraccion <strong>muy grave</strong>. Multas de hasta 52.53 UIT dependiendo del numero de trabajadores afectados.</p>`,
        durationMin: 12,
        sortOrder: 1,
      },
      {
        title: 'No discriminacion en el empleo',
        description: 'Practicas prohibidas y como prevenirlas',
        contentType: 'READING',
        contentHtml: `<h2>No Discriminacion en el Empleo</h2>
<h3>Motivos de discriminacion prohibidos</h3>
<ul>
<li>Sexo o genero</li>
<li>Edad</li>
<li>Raza u origen etnico</li>
<li>Religion</li>
<li>Discapacidad</li>
<li>Orientacion sexual</li>
<li>Estado civil o embarazo</li>
<li>Condicion de VIH/SIDA</li>
<li>Afiliacion sindical</li>
</ul>
<h3>Obligacion de cuota de personas con discapacidad</h3>
<p>Ley 29973: Empresas con mas de 50 trabajadores deben emplear al menos <strong>3%</strong> de personas con discapacidad.</p>
<h3>Proteccion de la maternidad</h3>
<ul>
<li>Descanso pre y post natal: 49 dias cada uno</li>
<li>Prohibicion de despido durante embarazo y hasta 90 dias despues del parto</li>
<li>Hora de lactancia: 1 hora diaria hasta que el hijo cumpla 1 anio</li>
<li>Lactario: obligatorio en empresas con 20+ trabajadoras</li>
</ul>`,
        durationMin: 13,
        sortOrder: 2,
      },
    ],
    examQuestions: [
      {
        question: 'Que documento exige la Ley 30709 que toda empresa elabore?',
        options: ['Plan de Igualdad', 'Cuadro de categorias y funciones', 'Codigo de Etica', 'Reglamento de Remuneraciones'],
        correctIndex: 1,
        explanation: 'La Ley 30709 obliga a elaborar un cuadro de categorias y funciones con criterios objetivos.',
        sortOrder: 1,
      },
      {
        question: 'Cual es la cuota minima de personas con discapacidad en empresas con mas de 50 trabajadores?',
        options: ['1%', '2%', '3%', '5%'],
        correctIndex: 2,
        explanation: 'La Ley 29973 establece una cuota minima del 3% de personas con discapacidad.',
        sortOrder: 2,
      },
      {
        question: 'Cuanto dura el descanso postnatal?',
        options: ['30 dias', '45 dias', '49 dias', '60 dias'],
        correctIndex: 2,
        explanation: 'El descanso postnatal es de 49 dias naturales.',
        sortOrder: 3,
      },
    ],
  },
]
