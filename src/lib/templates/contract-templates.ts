/**
 * Plantillas de contratos laborales peruanos
 * Base legal: D.Leg. 728, D.S. 003-97-TR, Ley 29783, Ley 27942
 */

export interface FieldSchema {
  name: string
  label: string
  type: 'text' | 'date' | 'number' | 'select' | 'textarea'
  required: boolean
  options?: string[]
  placeholder?: string
}

export interface ContentBlock {
  id: string
  title: string
  content: string  // May contain {{variable}} placeholders
}

export interface TemplateDefinition {
  type: string
  name: string
  description: string
  legalBasis: string
  version: number
  fieldsSchema: FieldSchema[]
  contentBlocks: ContentBlock[]
}

// =============================================
// 1. CONTRATO A PLAZO INDETERMINADO
// D.Leg. 728, Art. 4 — TUO LPCL
// =============================================
export const TEMPLATE_INDEFINIDO: TemplateDefinition = {
  type: 'LABORAL_INDEFINIDO',
  name: 'Contrato de Trabajo a Plazo Indeterminado',
  description: 'Contrato laboral sin fecha de termino, para trabajadores en regimen general',
  legalBasis: 'D.Leg. 728 — TUO LPCL, D.S. 003-97-TR',
  version: 1,
  fieldsSchema: [
    { name: 'ciudad', label: 'Ciudad', type: 'text', required: true, placeholder: 'Lima' },
    { name: 'fecha_contrato', label: 'Fecha del contrato', type: 'date', required: true },
    { name: 'empleador_razon_social', label: 'Razon social del empleador', type: 'text', required: true },
    { name: 'empleador_ruc', label: 'RUC del empleador', type: 'text', required: true },
    { name: 'empleador_domicilio', label: 'Domicilio del empleador', type: 'text', required: true },
    { name: 'empleador_representante', label: 'Representante legal', type: 'text', required: true },
    { name: 'empleador_dni_rep', label: 'DNI del representante', type: 'text', required: true },
    { name: 'trabajador_nombre', label: 'Nombre completo del trabajador', type: 'text', required: true },
    { name: 'trabajador_dni', label: 'DNI del trabajador', type: 'text', required: true },
    { name: 'trabajador_domicilio', label: 'Domicilio del trabajador', type: 'text', required: true },
    { name: 'cargo', label: 'Cargo / Puesto', type: 'text', required: true },
    { name: 'area', label: 'Area / Departamento', type: 'text', required: false },
    { name: 'fecha_inicio', label: 'Fecha de inicio', type: 'date', required: true },
    { name: 'remuneracion', label: 'Remuneracion mensual (S/)', type: 'number', required: true },
    { name: 'jornada', label: 'Jornada de trabajo', type: 'select', required: true, options: ['Lunes a Viernes 8 horas diarias', 'Lunes a Sabado 8 horas diarias', 'Lunes a Viernes 6 horas diarias'] },
    { name: 'lugar_trabajo', label: 'Lugar de trabajo', type: 'text', required: true },
  ],
  contentBlocks: [
    {
      id: 'encabezado',
      title: 'Encabezado',
      content: `CONTRATO DE TRABAJO A PLAZO INDETERMINADO

Conste por el presente documento el Contrato de Trabajo a Plazo Indeterminado que celebran de una parte {{empleador_razon_social}}, con RUC N° {{empleador_ruc}}, con domicilio en {{empleador_domicilio}}, debidamente representada por {{empleador_representante}}, identificado con DNI N° {{empleador_dni_rep}} (en adelante, "EL EMPLEADOR"); y de la otra parte, {{trabajador_nombre}}, identificado con DNI N° {{trabajador_dni}}, con domicilio en {{trabajador_domicilio}} (en adelante, "EL TRABAJADOR"); en los terminos y condiciones siguientes:`
    },
    {
      id: 'clausula_1',
      title: 'PRIMERA: Objeto del Contrato',
      content: `PRIMERA.- OBJETO DEL CONTRATO

EL EMPLEADOR contrata los servicios del TRABAJADOR para que desempene el cargo de {{cargo}}, en el area de {{area}}, realizando las funciones y responsabilidades inherentes a dicho cargo, así como aquellas que le sean asignadas por su jefe inmediato, de acuerdo con las necesidades del empleador.`
    },
    {
      id: 'clausula_2',
      title: 'SEGUNDA: Vigencia',
      content: `SEGUNDA.- VIGENCIA

El presente contrato entra en vigencia a partir del {{fecha_inicio}}, sin establecerse fecha de termino, manteniéndose la relacion laboral hasta que cualquiera de las partes decida ponerle fin conforme a ley.`
    },
    {
      id: 'clausula_3',
      title: 'TERCERA: Remuneracion',
      content: `TERCERA.- REMUNERACION

EL EMPLEADOR abonara a EL TRABAJADOR una remuneracion mensual de S/ {{remuneracion}} ({{remuneracion}} y 00/100 Soles), que incluye la Asignacion Familiar de ser aplicable, la cual sera pagada en forma mensual. Dicha remuneracion es comprensiva de todos los beneficios economicos establecidos por ley, salvo los que expresamente se consignen de manera diferenciada.`
    },
    {
      id: 'clausula_4',
      title: 'CUARTA: Jornada de Trabajo',
      content: `CUARTA.- JORNADA Y HORARIO DE TRABAJO

La jornada de trabajo sera de {{jornada}}, de conformidad con lo establecido en el D.Leg. N° 854, Ley de Jornada de Trabajo, Horario y Trabajo en Sobretiempo. EL TRABAJADOR prestara sus servicios en {{lugar_trabajo}}.`
    },
    {
      id: 'clausula_5',
      title: 'QUINTA: Obligaciones del Trabajador',
      content: `QUINTA.- OBLIGACIONES DEL TRABAJADOR

EL TRABAJADOR se obliga a:
a) Desempenar sus funciones con diligencia, eficiencia y probidad.
b) Cumplir el Reglamento Interno de Trabajo y las politicas de la empresa.
c) Guardar reserva respecto a la informacion confidencial del empleador.
d) Someterse a los examenes medicos que disponga el empleador.
e) Utilizar adecuadamente los equipos e instrumentos de trabajo.
f) Comunicar oportunamente al empleador cualquier situacion que pueda perjudicar el normal desarrollo de sus labores.`
    },
    {
      id: 'clausula_6',
      title: 'SEXTA: Beneficios Sociales',
      content: `SEXTA.- BENEFICIOS SOCIALES

EL TRABAJADOR gozara de todos los beneficios sociales que le corresponden conforme a ley, incluyendo: Compensacion por Tiempo de Servicios (CTS) conforme al D.Leg. N° 650; Gratificaciones legales de Fiestas Patrias y Navidad conforme a la Ley N° 27735; Vacaciones anuales de 30 dias calendarios conforme al D.Leg. N° 713; Asignacion Familiar de corresponder conforme a la Ley N° 25129; y Seguro Social de Salud (EsSalud) conforme a la Ley N° 26790.`
    },
    {
      id: 'clausula_7',
      title: 'SEPTIMA: Disposiciones Finales',
      content: `SEPTIMA.- DISPOSICIONES FINALES

En todo lo no previsto en el presente contrato, las partes se remiten a las disposiciones del Texto Unico Ordenado del D.Leg. N° 728, Ley de Productividad y Competitividad Laboral, aprobado por D.S. N° 003-97-TR y sus normas reglamentarias y complementarias.

En señal de conformidad, las partes suscriben el presente documento en {{ciudad}}, a los {{fecha_contrato}}.

_______________________________          _______________________________
       EL EMPLEADOR                              EL TRABAJADOR
  {{empleador_representante}}              {{trabajador_nombre}}
    DNI: {{empleador_dni_rep}}               DNI: {{trabajador_dni}}`
    },
  ],
}

// =============================================
// 2. CONTRATO A PLAZO FIJO (SUJETO A MODALIDAD)
// D.Leg. 728, Arts. 53-80 — Contratos Sujetos a Modalidad
// =============================================
export const TEMPLATE_PLAZO_FIJO: TemplateDefinition = {
  type: 'LABORAL_PLAZO_FIJO',
  name: 'Contrato de Trabajo Sujeto a Modalidad (Plazo Fijo)',
  description: 'Contrato laboral con fecha de termino determinada, para necesidades temporales, estacionales o de inicio de actividad',
  legalBasis: 'D.Leg. 728, Arts. 53-80 — D.S. 003-97-TR',
  version: 1,
  fieldsSchema: [
    { name: 'ciudad', label: 'Ciudad', type: 'text', required: true, placeholder: 'Lima' },
    { name: 'fecha_contrato', label: 'Fecha del contrato', type: 'date', required: true },
    { name: 'modalidad', label: 'Modalidad del contrato', type: 'select', required: true, options: ['INICIO DE ACTIVIDAD', 'NECESIDAD DE MERCADO', 'TEMPORADA', 'SUPLENCIA', 'OBRA O SERVICIO ESPECIFICO', 'EVENTUAL'] },
    { name: 'empleador_razon_social', label: 'Razon social del empleador', type: 'text', required: true },
    { name: 'empleador_ruc', label: 'RUC del empleador', type: 'text', required: true },
    { name: 'empleador_domicilio', label: 'Domicilio del empleador', type: 'text', required: true },
    { name: 'empleador_representante', label: 'Representante legal', type: 'text', required: true },
    { name: 'empleador_dni_rep', label: 'DNI del representante', type: 'text', required: true },
    { name: 'trabajador_nombre', label: 'Nombre completo del trabajador', type: 'text', required: true },
    { name: 'trabajador_dni', label: 'DNI del trabajador', type: 'text', required: true },
    { name: 'trabajador_domicilio', label: 'Domicilio del trabajador', type: 'text', required: true },
    { name: 'cargo', label: 'Cargo / Puesto', type: 'text', required: true },
    { name: 'fecha_inicio', label: 'Fecha de inicio', type: 'date', required: true },
    { name: 'fecha_fin', label: 'Fecha de termino', type: 'date', required: true },
    { name: 'remuneracion', label: 'Remuneracion mensual (S/)', type: 'number', required: true },
    { name: 'causa_objetiva', label: 'Causa objetiva del contrato', type: 'textarea', required: true, placeholder: 'Describa la necesidad temporal que justifica el contrato...' },
    { name: 'jornada', label: 'Jornada de trabajo', type: 'select', required: true, options: ['Lunes a Viernes 8 horas diarias', 'Lunes a Sabado 8 horas diarias'] },
  ],
  contentBlocks: [
    {
      id: 'encabezado',
      title: 'Encabezado',
      content: `CONTRATO DE TRABAJO SUJETO A MODALIDAD
Modalidad: {{modalidad}}

Conste por el presente documento el Contrato de Trabajo Sujeto a Modalidad — {{modalidad}} — que celebran {{empleador_razon_social}}, con RUC N° {{empleador_ruc}}, domicilio en {{empleador_domicilio}}, representada por {{empleador_representante}}, DNI N° {{empleador_dni_rep}} (en adelante "EL EMPLEADOR"); y {{trabajador_nombre}}, identificado con DNI N° {{trabajador_dni}}, domicilio en {{trabajador_domicilio}} (en adelante "EL TRABAJADOR").`
    },
    {
      id: 'clausula_1',
      title: 'PRIMERA: Causa Objetiva',
      content: `PRIMERA.- CAUSA OBJETIVA

El presente contrato se celebra al amparo de los Arts. 53 al 80 del D.Leg. N° 728, bajo la modalidad de {{modalidad}}, debido a la siguiente causa objetiva:

{{causa_objetiva}}

Esta causa objetiva determina la necesidad de contar con los servicios del TRABAJADOR por el periodo señalado.`
    },
    {
      id: 'clausula_2',
      title: 'SEGUNDA: Vigencia',
      content: `SEGUNDA.- VIGENCIA

El presente contrato tendrá una vigencia desde el {{fecha_inicio}} hasta el {{fecha_fin}}. Las partes reconocen que, al vencimiento del plazo pactado, el contrato se extingue de pleno derecho sin necesidad de expresión de causa.

NOTA LEGAL: El plazo maximo de este tipo de contrato es determinado por ley segun la modalidad. En caso de exceder el maximo legal o desnaturalizarse, el contrato se convierte en indeterminado conforme al Art. 77 del D.Leg. 728.`
    },
    {
      id: 'clausula_3',
      title: 'TERCERA: Cargo y Funciones',
      content: `TERCERA.- CARGO Y FUNCIONES

EL TRABAJADOR desempenara el cargo de {{cargo}}, realizando las funciones que le sean asignadas por EL EMPLEADOR en el marco de la causa objetiva descrita, con una jornada de {{jornada}}.`
    },
    {
      id: 'clausula_4',
      title: 'CUARTA: Remuneracion',
      content: `CUARTA.- REMUNERACION

EL EMPLEADOR abonara a EL TRABAJADOR una remuneracion mensual de S/ {{remuneracion}}, en forma mensual, la cual no podra ser inferior a la Remuneracion Minima Vital vigente (S/ 1,130.00 al 2026).`
    },
    {
      id: 'clausula_5',
      title: 'QUINTA: Beneficios y Disposiciones Finales',
      content: `QUINTA.- BENEFICIOS SOCIALES

EL TRABAJADOR gozara de todos los beneficios sociales proporcionales que le correspondan conforme a ley: CTS (D.Leg. 650), Gratificaciones (Ley 27735), Vacaciones (D.Leg. 713) y EsSalud (Ley 26790).

SEXTA.- REGISTRO

El presente contrato sera registrado en el T-REGISTRO del MTPE dentro del plazo legal establecido.

SEPTIMA.- DISPOSICIONES FINALES

Las partes acuerdan que el presente contrato no podra ser prorrogado si con ello se supera el plazo maximo legal establecido para la modalidad pactada, bajo sancion de convertirse en contrato a plazo indeterminado.

Firmado en {{ciudad}}, el {{fecha_contrato}}.

_______________________________          _______________________________
       EL EMPLEADOR                              EL TRABAJADOR
  {{empleador_representante}}              {{trabajador_nombre}}
    DNI: {{empleador_dni_rep}}               DNI: {{trabajador_dni}}`
    },
  ],
}

// =============================================
// 3. LOCACION DE SERVICIOS (HONORARIOS)
// Codigo Civil, Arts. 1764-1770
// =============================================
export const TEMPLATE_LOCACION_SERVICIOS: TemplateDefinition = {
  type: 'LOCACION_SERVICIOS',
  name: 'Contrato de Locacion de Servicios',
  description: 'Prestacion de servicios autonomos sin subordinacion laboral. Para recibos por honorarios (Cuarta Categoria)',
  legalBasis: 'Codigo Civil Art. 1764-1770, SUNAT 4ta Categoria',
  version: 1,
  fieldsSchema: [
    { name: 'ciudad', label: 'Ciudad', type: 'text', required: true },
    { name: 'fecha_contrato', label: 'Fecha del contrato', type: 'date', required: true },
    { name: 'comitente_razon_social', label: 'Razon social del comitente', type: 'text', required: true },
    { name: 'comitente_ruc', label: 'RUC del comitente', type: 'text', required: true },
    { name: 'comitente_representante', label: 'Representante legal', type: 'text', required: true },
    { name: 'locador_nombre', label: 'Nombre del locador', type: 'text', required: true },
    { name: 'locador_dni', label: 'DNI del locador', type: 'text', required: true },
    { name: 'locador_ruc', label: 'RUC del locador (si tiene)', type: 'text', required: false },
    { name: 'servicio', label: 'Descripcion del servicio', type: 'textarea', required: true },
    { name: 'fecha_inicio', label: 'Fecha de inicio', type: 'date', required: true },
    { name: 'fecha_fin', label: 'Fecha de termino', type: 'date', required: true },
    { name: 'honorario', label: 'Honorario total (S/)', type: 'number', required: true },
    { name: 'forma_pago', label: 'Forma de pago', type: 'select', required: true, options: ['Pago unico al finalizar el servicio', 'Pagos mensuales', 'Pagos contra entrega de productos'] },
  ],
  contentBlocks: [
    {
      id: 'encabezado',
      title: 'Encabezado',
      content: `CONTRATO DE LOCACION DE SERVICIOS

Conste por el presente documento el Contrato de Locacion de Servicios celebrado entre {{comitente_razon_social}}, con RUC N° {{comitente_ruc}}, representada por {{comitente_representante}} (en adelante "EL COMITENTE"); y {{locador_nombre}}, identificado con DNI N° {{locador_dni}}${' '}(en adelante "EL LOCADOR").`
    },
    {
      id: 'clausula_1',
      title: 'PRIMERA: Objeto',
      content: `PRIMERA.- OBJETO DEL CONTRATO

EL LOCADOR se obliga a prestar a EL COMITENTE los siguientes servicios especializados:

{{servicio}}

EL LOCADOR desarrollara sus actividades de manera autonoma, sin estar sujeto a subordinacion ni jornada de trabajo especifica, utilizando sus propios recursos y metodos.`
    },
    {
      id: 'clausula_2',
      title: 'SEGUNDA: Plazo',
      content: `SEGUNDA.- PLAZO

El presente contrato tendra una vigencia desde el {{fecha_inicio}} hasta el {{fecha_fin}}, pudiendo ser prorrogado por mutuo acuerdo escrito de las partes.`
    },
    {
      id: 'clausula_3',
      title: 'TERCERA: Honorarios',
      content: `TERCERA.- HONORARIOS

EL COMITENTE pagara a EL LOCADOR por los servicios prestados la suma de S/ {{honorario}}, mediante {{forma_pago}}, previa presentacion del comprobante de pago correspondiente (Recibo por Honorarios Electronico — SUNAT 4ta Categoria).

EL LOCADOR sera responsable de las retenciones del Impuesto a la Renta de 4ta Categoria que correspondan conforme a la normativa tributaria vigente (8% si el pago supera S/ 1,500 mensuales o renta anual supera 7 UIT).`
    },
    {
      id: 'clausula_4',
      title: 'CUARTA: Independencia y Confidencialidad',
      content: `CUARTA.- INDEPENDENCIA

El presente contrato no genera relacion laboral ni vinculo de dependencia entre las partes. EL LOCADOR no tiene derecho a beneficios laborales (CTS, gratificaciones, vacaciones remuneradas, EsSalud), siendo responsable de sus propias obligaciones tributarias y previsionales (AFP/ONP de 4ta categoria).

QUINTA.- CONFIDENCIALIDAD

EL LOCADOR se obliga a guardar la mas estricta reserva sobre la informacion confidencial de EL COMITENTE que conozca con ocasion de la prestacion de sus servicios, tanto durante la vigencia del contrato como despues de su terminacion.

SEXTA.- PROPIEDAD INTELECTUAL

Los resultados, trabajos, informes, diseños u otros productos derivados de los servicios prestados seran de propiedad exclusiva de EL COMITENTE, salvo pacto en contrario.

Firmado en {{ciudad}}, el {{fecha_contrato}}.

_______________________________          _______________________________
       EL COMITENTE                               EL LOCADOR
  {{comitente_representante}}               {{locador_nombre}}
                                              DNI: {{locador_dni}}`
    },
  ],
}

// =============================================
// 4. POLITICA DE PREVENCION Y SANCION DEL HOSTIGAMIENTO SEXUAL
// Ley 27942 — D.S. 014-2019-MIMP
// =============================================
export const TEMPLATE_POLITICA_HOSTIGAMIENTO: TemplateDefinition = {
  type: 'POLITICA_HOSTIGAMIENTO',
  name: 'Politica de Prevencion y Sancion del Hostigamiento Sexual',
  description: 'Obligatoria para empleadores con 20 o mas trabajadores (Ley 27942, D.S. 014-2019-MIMP)',
  legalBasis: 'Ley 27942, D.S. 014-2019-MIMP',
  version: 1,
  fieldsSchema: [
    { name: 'empresa', label: 'Razon social de la empresa', type: 'text', required: true },
    { name: 'ruc', label: 'RUC', type: 'text', required: true },
    { name: 'representante', label: 'Representante legal', type: 'text', required: true },
    { name: 'fecha_aprobacion', label: 'Fecha de aprobacion', type: 'date', required: true },
    { name: 'correo_denuncias', label: 'Correo para recepcion de denuncias', type: 'text', required: true },
    { name: 'responsable_canal', label: 'Responsable del canal de denuncias', type: 'text', required: true },
    { name: 'cargo_responsable', label: 'Cargo del responsable', type: 'text', required: true },
  ],
  contentBlocks: [
    {
      id: 'encabezado',
      title: 'Encabezado',
      content: `POLITICA DE PREVENCION, ATENCION Y SANCION DEL HOSTIGAMIENTO SEXUAL EN EL TRABAJO

Empresa: {{empresa}}
RUC: {{ruc}}
Fecha de aprobacion: {{fecha_aprobacion}}
Aprobada por: {{representante}}`
    },
    {
      id: 'seccion_1',
      title: 'I. Objetivo y Alcance',
      content: `I. OBJETIVO Y ALCANCE

1.1 La presente Politica tiene como objetivo prevenir, atender y sancionar el hostigamiento sexual en el trabajo, en cumplimiento de la Ley N° 27942 — Ley de Prevencion y Sancion del Hostigamiento Sexual — y su Reglamento aprobado por D.S. N° 014-2019-MIMP.

1.2 Es de aplicacion obligatoria para todos los trabajadores, funcionarios, directivos, practicantes, proveedores y terceros que presten servicios en las instalaciones de {{empresa}} o en actividades vinculadas a la empresa.`
    },
    {
      id: 'seccion_2',
      title: 'II. Definicion y Tipos',
      content: `II. DEFINICION Y TIPOS DE HOSTIGAMIENTO SEXUAL

2.1 El hostigamiento sexual es la conducta fisica o verbal reiterada de naturaleza sexual o sesgada en razon del sexo, que resulte humillante u ofensiva para quien la recibe, que no ha sido solicitada o es rechazada, y que puede generar un ambiente de trabajo hostil, intimidante o humillante.

2.2 El hostigamiento sexual puede manifestarse como:
a) Promesa implicita o expresa de un trato preferente a cambio de actos de connotacion sexual (hostigamiento por acoso — quid pro quo).
b) Actitudes de indole sexual que crean un ambiente intimidante, hostil o humillante (hostigamiento ambiental).

2.3 Conductas que pueden constituir hostigamiento sexual:
- Tocamientos, roces o contacto fisico no consentido.
- Comentarios, chistes o insinuaciones de connotacion sexual.
- Exhibicion de material pornografico o de connotacion sexual.
- Solicitud de encuentros o citas de caracter sexual.
- Uso de lenguaje obsceno, soez o con carga sexual.
- Envio de mensajes, imagenes o videos de contenido sexual por cualquier medio.`
    },
    {
      id: 'seccion_3',
      title: 'III. Canal de Denuncias',
      content: `III. CANAL DE DENUNCIAS Y PROCEDIMIENTO

3.1 CANAL DE DENUNCIAS

Correo electronico: {{correo_denuncias}}
Responsable: {{responsable_canal}} — {{cargo_responsable}}

Las denuncias pueden presentarse de manera presencial, escrita o por correo electronico. Se garantiza la confidencialidad de la identidad de la persona denunciante que asi lo solicite.

3.2 PLAZOS DEL PROCEDIMIENTO (D.S. 014-2019-MIMP)

a) Medidas de proteccion: dentro de los 3 dias habiles de recibida la denuncia (Art. 18).
b) Investigacion: hasta 30 dias calendario (Art. 20).
c) Resolucion y sancion: dentro de los 5 dias habiles de emitido el informe final (Art. 22).

3.3 DERECHO A NO SER VICTIMIZADO

Queda prohibido cualquier acto de represalia contra la persona denunciante. La represalia constituye una falta muy grave sancionable conforme al Reglamento Interno de Trabajo.`
    },
    {
      id: 'seccion_4',
      title: 'IV. Sanciones y Responsabilidad',
      content: `IV. SANCIONES

4.1 Las conductas de hostigamiento sexual seran sancionadas conforme a la gravedad del acto, pudiendo aplicarse:
- Amonestacion escrita
- Suspension sin goce de haber
- Despido por falta grave (Art. 25, inc. f del D.Leg. 728)

4.2 Las sanciones se aplicaran sin perjuicio de las acciones civiles y penales que correspondan conforme al Codigo Penal (Art. 176-B: acoso sexual, pena privativa de libertad).

V. COMITE DE INTERVENCION FRENTE AL HOSTIGAMIENTO SEXUAL

Para empleadores con 20 o mas trabajadores, se constituye el Comite de Intervencion frente al Hostigamiento Sexual (CIHS), conforme al Art. 10-A de la Ley 27942. El CIHS esta integrado por representantes del empleador y los trabajadores.

VI. DIFUSION Y CAPACITACION

{{empresa}} se compromete a:
a) Difundir la presente politica a todos sus trabajadores al momento de su ingreso.
b) Realizar capacitaciones anuales sobre prevencion del hostigamiento sexual.
c) Publicar el canal de denuncias en lugar visible del centro de trabajo.

Esta Politica fue aprobada en {{fecha_aprobacion}} por {{representante}}, en cumplimiento de la Ley 27942 y el D.S. 014-2019-MIMP.`
    },
  ],
}

// =============================================
// 5. POLITICA DE SEGURIDAD Y SALUD EN EL TRABAJO
// Ley 29783 — D.S. 005-2012-TR
// =============================================
export const TEMPLATE_POLITICA_SST: TemplateDefinition = {
  type: 'POLITICA_SST',
  name: 'Politica de Seguridad y Salud en el Trabajo',
  description: 'Obligatoria para todos los empleadores con trabajadores dependientes (Ley 29783)',
  legalBasis: 'Ley 29783, D.S. 005-2012-TR, R.M. 050-2013-TR',
  version: 1,
  fieldsSchema: [
    { name: 'empresa', label: 'Razon social de la empresa', type: 'text', required: true },
    { name: 'actividad', label: 'Actividad economica principal', type: 'text', required: true },
    { name: 'gerente', label: 'Gerente General / Representante Legal', type: 'text', required: true },
    { name: 'fecha_aprobacion', label: 'Fecha de aprobacion', type: 'date', required: true },
    { name: 'ciudad', label: 'Ciudad', type: 'text', required: true },
  ],
  contentBlocks: [
    {
      id: 'encabezado',
      title: 'Encabezado',
      content: `POLITICA DE SEGURIDAD Y SALUD EN EL TRABAJO

Empresa: {{empresa}}
Actividad: {{actividad}}
Aprobada por: {{gerente}}
Fecha: {{fecha_aprobacion}}
Ciudad: {{ciudad}}`
    },
    {
      id: 'declaracion',
      title: 'Declaracion de la Politica',
      content: `DECLARACION DE POLITICA

{{empresa}} es una empresa comprometida con la proteccion de la seguridad y salud de todos sus trabajadores, terceros y visitantes, reconociendo que el recurso humano es el activo mas valioso de la organizacion.

En cumplimiento de la Ley N° 29783 — Ley de Seguridad y Salud en el Trabajo — y su Reglamento aprobado por D.S. N° 005-2012-TR, declaramos los siguientes compromisos:`
    },
    {
      id: 'compromisos',
      title: 'Compromisos',
      content: `COMPROMISOS DE LA ORGANIZACION

1. CUMPLIMIENTO LEGAL
Cumplir y hacer cumplir la legislacion nacional vigente en materia de Seguridad y Salud en el Trabajo, incluyendo la Ley 29783 y todas sus modificatorias y reglamentos.

2. PREVENCION DE ACCIDENTES Y ENFERMEDADES OCUPACIONALES
Implementar medidas de prevencion para eliminar o minimizar los peligros y riesgos en el lugar de trabajo, mediante la identificacion de peligros, evaluacion de riesgos y aplicacion de controles (IPERC — R.M. 050-2013-TR).

3. MEJORA CONTINUA
Establecer, implementar y mejorar continuamente el Sistema de Gestion de Seguridad y Salud en el Trabajo (SGSST), fijando objetivos medibles y revisando periodicamente su desempeno.

4. PARTICIPACION Y CONSULTA
Promover la participacion activa de los trabajadores y sus representantes en la identificacion de peligros, evaluacion de riesgos y en las decisiones que afecten su seguridad y salud.

5. VIGILANCIA DE LA SALUD
Realizar examenes medicos pre-ocupacionales, periodicos y de retiro conforme al D.S. 016-2016-TR y los Protocolos del MINSA.

6. INVESTIGACION DE INCIDENTES
Investigar todos los accidentes e incidentes de trabajo para identificar causas raices y adoptar medidas correctivas y preventivas.

7. RECURSOS Y CAPACITACION
Proveer los recursos humanos, materiales y financieros necesarios para el cumplimiento de esta politica. Capacitar y sensibilizar a todos los trabajadores al inicio de la relacion laboral y al menos una vez por año.

8. COMUNICACION
Comunicar la presente politica a todos los trabajadores, terceros y partes interesadas relevantes, publicandola en lugar visible del centro de trabajo.`
    },
    {
      id: 'firma',
      title: 'Firma y Vigencia',
      content: `VIGENCIA Y REVISION

La presente Politica es de cumplimiento obligatorio para todos los trabajadores de {{empresa}} y sera revisada anualmente o cuando se produzcan cambios significativos en la organizacion o en la normativa aplicable.

Aprobada en {{ciudad}}, a los {{fecha_aprobacion}}.

_______________________________
       {{gerente}}
    Gerente General / Representante Legal
         {{empresa}}

Base legal: Ley 29783, Art. 22-23; D.S. 005-2012-TR, Art. 32; R.M. 050-2013-TR`
    },
  ],
}

export const ALL_TEMPLATES: TemplateDefinition[] = [
  TEMPLATE_INDEFINIDO,
  TEMPLATE_PLAZO_FIJO,
  TEMPLATE_LOCACION_SERVICIOS,
  TEMPLATE_POLITICA_HOSTIGAMIENTO,
  TEMPLATE_POLITICA_SST,
]
