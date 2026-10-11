/**
 * Mapa de obligaciones de cumplimiento para empresas privadas en Perú.
 *
 * Verificado con el texto vigente al 10-oct-2026 (LP Derecho consolidado,
 * El Peruano, MTPE). La gravedad es la del RLGIT (D.S. 019-2006-TR) salvo que
 * se indique otra autoridad. Fuente de verdad de /obligaciones y de las páginas
 * de servicios: si cambia una norma, se corrige aquí.
 */

export type AreaObligacion =
  | 'SST'
  | 'Hostigamiento sexual'
  | 'Laboral'
  | 'Datos personales'
  | 'Consumidor'
  | 'Municipal'
  | 'Prevención de delitos'

/** Condición extra (además del número de trabajadores) para que la obligación aplique. */
export type CondicionObligacion =
  | 'consumidores' // atiende a consumidores finales
  | 'riesgo' // actividad del Anexo 5 (SCTR)
  | 'mujeres' // 20 o más mujeres de 15 a 49 años en el centro de trabajo
  | 'ventas' // depende de ventas anuales y del tipo de datos
  | 'uif' // sujetos obligados ante la UIF
  | 'voluntario'

export interface Obligacion {
  id: string
  area: AreaObligacion
  /** Texto corto del umbral, tal como se muestra. */
  desde: string
  /** Mínimo de trabajadores (inclusive) para que aplique. */
  trabajadoresMin: number
  /** Máximo exclusivo: aplica solo si hay MENOS de este número. */
  trabajadoresMenosDe?: number
  condicion?: CondicionObligacion
  obligacion: string
  base: string
  falta: string
  evidencia: string
  /** Aclaración visible (excepciones, plazos). */
  nota?: string
  /** No exigible a MYPE inscritas en el REMYPE. */
  exentaRemype?: boolean
}

export const OBLIGACIONES: Obligacion[] = [
  {
    id: 'sgsst',
    area: 'SST',
    desde: 'Desde 1 trabajador',
    trabajadoresMin: 1,
    obligacion: 'Sistema de gestión de SST: política, plan y programa anual',
    base: 'Ley 29783; D.S. 005-2012-TR, art. 32',
    falta: 'Grave (27.7)',
    evidencia: 'Documentos aprobados y difundidos',
  },
  {
    id: 'iperc',
    area: 'SST',
    desde: 'Desde 1 trabajador',
    trabajadoresMin: 1,
    obligacion: 'IPERC por puesto, actualizado al menos una vez al año, y mapa de riesgos exhibido',
    base: 'Reglamento de SST, arts. 77 y 32',
    falta: 'Grave (27.3 y 27.6)',
    evidencia: 'Matriz IPERC vigente y mapa visible',
  },
  {
    id: 'registros',
    area: 'SST',
    desde: 'Desde 1 trabajador',
    trabajadoresMin: 1,
    obligacion: '8 registros obligatorios de SST',
    base: 'Reglamento de SST, art. 33; R.M. 085-2013-TR',
    falta: 'Grave (27.6)',
    evidencia: 'Registros llenos y al día',
    nota: 'Micro y pequeñas empresas pueden optar por formatos simplificados (3 y 5 registros).',
  },
  {
    id: 'supervisor-sst',
    area: 'SST',
    desde: 'Menos de 20 trabajadores',
    trabajadoresMin: 1,
    trabajadoresMenosDe: 20,
    obligacion: 'Supervisor de SST elegido por los trabajadores',
    base: 'Ley 29783, art. 30',
    falta: 'Grave (27.12)',
    evidencia: 'Acta de elección',
  },
  {
    id: 'capacitaciones-sst',
    area: 'SST',
    desde: 'Desde 1 trabajador',
    trabajadoresMin: 1,
    obligacion: 'Al menos 4 capacitaciones de SST al año, dentro de la jornada',
    base: 'Ley 29783, art. 35 b; Reglamento de SST, arts. 27 a 29',
    falta: 'Grave (27.8)',
    evidencia: 'Registro de capacitación con asistencia firmada',
    nota: 'La inducción y las capacitaciones por cambio de puesto o tecnología deben ser presenciales.',
  },
  {
    id: 'emo',
    area: 'SST',
    desde: 'Desde 1 trabajador',
    trabajadoresMin: 1,
    obligacion: 'Exámenes médicos ocupacionales cada 2 años',
    base: 'Ley 29783, art. 49 d; Reglamento de SST, art. 101',
    falta: 'Muy grave (28.13)',
    evidencia: 'Certificados de aptitud',
    nota: 'En actividades de alto riesgo: antes, durante y al término de la relación.',
  },
  {
    id: 'comite-sst',
    area: 'SST',
    desde: 'Desde 20 trabajadores',
    trabajadoresMin: 20,
    obligacion: 'Comité de SST paritario, de 4 a 12 miembros, en lugar del supervisor',
    base: 'Ley 29783, art. 29',
    falta: 'Grave (27.12)',
    evidencia: 'Actas de elección, instalación y reuniones',
  },
  {
    id: 'risst',
    area: 'SST',
    desde: 'Desde 20 trabajadores',
    trabajadoresMin: 20,
    obligacion: 'Reglamento interno de SST',
    base: 'Ley 29783, art. 34',
    falta: 'Muy grave (28.9)',
    evidencia: 'Reglamento aprobado y entregado a cada trabajador',
  },
  {
    id: 'sctr',
    area: 'SST',
    desde: 'Si la actividad es de riesgo',
    trabajadoresMin: 1,
    condicion: 'riesgo',
    obligacion: 'SCTR de salud y pensión para los trabajadores expuestos',
    base: 'Ley 26790; D.S. 003-98-SA; D.S. 008-2022-SA',
    falta: 'Grave (27.15), por trabajador',
    evidencia: 'Pólizas de salud y pensión vigentes',
    nota: 'Aplica a las actividades del Anexo 5, ampliado en 2022.',
  },
  {
    id: 'hs-delegado',
    area: 'Hostigamiento sexual',
    desde: 'Menos de 20 trabajadores',
    trabajadoresMin: 1,
    trabajadoresMenosDe: 20,
    obligacion: 'Delegado(a) de intervención frente al hostigamiento sexual',
    base: 'D.S. 014-2019-MIMP, art. 27',
    falta: 'Muy grave en el procedimiento (25.24 a 25.26)',
    evidencia: 'Acta de designación',
  },
  {
    id: 'hs-comite',
    area: 'Hostigamiento sexual',
    desde: 'Desde 20 trabajadores',
    trabajadoresMin: 20,
    obligacion: 'Comité de intervención frente al hostigamiento sexual y política interna',
    base: 'D.S. 014-2019-MIMP, arts. 24 y 27',
    falta: 'Muy grave en el procedimiento (25.24 a 25.26)',
    evidencia: 'Acta de conformación y política difundida',
  },
  {
    id: 'hs-evaluacion',
    area: 'Hostigamiento sexual',
    desde: 'Desde 1 trabajador',
    trabajadoresMin: 1,
    obligacion: 'Evaluación anual de riesgos de hostigamiento sexual',
    base: 'D.S. 014-2019-MIMP, art. 10',
    falta: 'Según el caso',
    evidencia: 'Informe de evaluación',
  },
  {
    id: 'hs-capacitacion-inicial',
    area: 'Hostigamiento sexual',
    desde: 'Desde 1 trabajador',
    trabajadoresMin: 1,
    obligacion: 'Capacitación en hostigamiento sexual al inicio de la relación laboral y difusión',
    base: 'D.S. 014-2019-MIMP, art. 11',
    falta: 'Grave (24.22)',
    evidencia: 'Constancias y listas de asistencia',
  },
  {
    id: 'hs-capacitacion-anual',
    area: 'Hostigamiento sexual',
    desde: 'Desde 1 trabajador',
    trabajadoresMin: 1,
    obligacion: 'Capacitación anual especializada para RRHH, el comité y los involucrados en la investigación',
    base: 'D.S. 014-2019-MIMP, art. 11',
    falta: 'Grave (24.22)',
    evidencia: 'Constancias',
    exentaRemype: true,
    nota: 'No exigible a MYPE inscritas en el REMYPE.',
  },
  {
    id: 'cuadro-categorias',
    area: 'Laboral',
    desde: 'Desde 1 trabajador',
    trabajadoresMin: 1,
    obligacion: 'Cuadro de categorías y funciones y política salarial, comunicada a los trabajadores',
    base: 'Ley 30709; D.S. 002-2018-TR',
    falta: 'Muy grave (25.22 y 25.23)',
    evidencia: 'Documento aprobado y constancia de comunicación',
    nota: 'Aplica a todo empleador privado, sin importar el tamaño.',
  },
  {
    id: 'asistencia',
    area: 'Laboral',
    desde: 'Desde 1 trabajador',
    trabajadoresMin: 1,
    obligacion: 'Registro de control de asistencia',
    base: 'D.S. 004-2006-TR',
    falta: 'Muy grave (25.19)',
    evidencia: 'Registro diario de ingreso y salida',
    nota: 'Salvo personal de dirección, no fiscalizado o intermitente.',
  },
  {
    id: 'vida-ley',
    area: 'Laboral',
    desde: 'Desde 1 trabajador',
    trabajadoresMin: 1,
    obligacion: 'Seguro Vida Ley desde el inicio de la relación laboral',
    base: 'D. Leg. 688, modificado por el D.U. 044-2019',
    falta: 'Grave (24.12), por trabajador',
    evidencia: 'Póliza vigente',
  },
  {
    id: 'lactario',
    area: 'Laboral',
    desde: '20 mujeres de 15 a 49 años',
    trabajadoresMin: 1,
    condicion: 'mujeres',
    obligacion: 'Lactario en el centro de trabajo',
    base: 'Ley 29896; D.S. 023-2021-MIMP',
    falta: 'Grave (24.20)',
    evidencia: 'Lactario implementado',
  },
  {
    id: 'discapacidad',
    area: 'Laboral',
    desde: 'Más de 50 trabajadores',
    trabajadoresMin: 51,
    obligacion: 'Cuota de empleo de personas con discapacidad del 3%, verificada cada enero',
    base: 'Ley 29973, art. 49.1; D.S. 002-2014-MIMP',
    falta: 'Grave (tipo genérico)',
    evidencia: 'Planilla y sustento de la cuota',
  },
  {
    id: 'rit',
    area: 'Laboral',
    desde: 'Más de 100 trabajadores',
    trabajadoresMin: 101,
    obligacion: 'Reglamento interno de trabajo',
    base: 'D.S. 039-91-TR',
    falta: 'Grave (24.14)',
    evidencia: 'Reglamento aprobado y entregado',
  },
  {
    id: 'bancos-datos',
    area: 'Datos personales',
    desde: 'Desde 1 trabajador',
    trabajadoresMin: 1,
    obligacion: 'Inscripción de los bancos de datos personales (es gratuita)',
    base: 'Ley 29733; D.S. 016-2024-JUS, arts. 42 a 45',
    falta: 'Leve; grave si persiste (ANPD)',
    evidencia: 'Constancia de inscripción',
  },
  {
    id: 'oficial-datos',
    area: 'Datos personales',
    desde: 'Según ventas y tipo de datos',
    trabajadoresMin: 1,
    condicion: 'ventas',
    obligacion: 'Oficial de datos personales, para privados con grandes volúmenes o datos sensibles',
    base: 'D.S. 016-2024-JUS, art. 37 y 1.ª disposición complementaria final',
    falta: 'Leve (ANPD)',
    evidencia: 'Designación',
    nota: 'Plazos por ventas anuales: 30-nov-2026 (1,700 a 2,300 UIT), 30-nov-2027 (150 a 1,700 UIT) y 30-nov-2028 (hasta 150 UIT).',
  },
  {
    id: 'libro-reclamaciones',
    area: 'Consumidor',
    desde: 'Si atiende a consumidores',
    trabajadoresMin: 1,
    condicion: 'consumidores',
    obligacion: 'Libro de reclamaciones físico o virtual, con aviso visible',
    base: 'Ley 29571, arts. 150 y 151; D.S. 011-2011-PCM; Ley 32495',
    falta: 'INDECOPI',
    evidencia: 'Libro y aviso visibles',
    nota: 'Desde noviembre de 2025 también en comercio electrónico. Respuesta en 15 días hábiles.',
  },
  {
    id: 'licencia-itse',
    area: 'Municipal',
    desde: 'Todo establecimiento',
    trabajadoresMin: 1,
    obligacion: 'Licencia de funcionamiento e inspección técnica de seguridad (ITSE)',
    base: 'TUO de la Ley 28976 (D.S. 163-2020-PCM); D.S. 002-2018-PCM',
    falta: 'Municipalidad',
    evidencia: 'Licencia y certificado ITSE vigentes',
  },
  {
    id: 'plaft',
    area: 'Prevención de delitos',
    desde: 'Sujetos obligados ante la UIF',
    trabajadoresMin: 1,
    condicion: 'uif',
    obligacion: 'Prevención de lavado de activos: oficial de cumplimiento, inducción, capacitación anual e informe anual',
    base: 'Res. SBS 789-2018, modificada en 2023',
    falta: 'UIF',
    evidencia: 'Designación y constancias',
  },
  {
    id: 'modelo-prevencion',
    area: 'Prevención de delitos',
    desde: 'Voluntario',
    trabajadoresMin: 1,
    condicion: 'voluntario',
    obligacion: 'Modelo de prevención de delitos: exime si se adopta antes del delito y atenúa si se adopta después',
    base: 'Ley 30424, modificada por la Ley 31740',
    falta: '—',
    evidencia: 'Modelo documentado',
  },
]

export const AREAS_OBLIGACION: AreaObligacion[] = [
  'SST',
  'Hostigamiento sexual',
  'Laboral',
  'Datos personales',
  'Consumidor',
  'Municipal',
  'Prevención de delitos',
]

export interface PerfilEmpresa {
  trabajadores: number
  consumidores: boolean
  riesgo: boolean
  mujeres: boolean
  remype: boolean
}

export type EstadoObligacion = 'aplica' | 'revisar' | 'recomendado' | 'no-exigible'

/** Clasifica una obligación para el perfil dado. `null` = no aplica por tamaño. */
export function estadoObligacion(o: Obligacion, perfil: PerfilEmpresa): EstadoObligacion | null {
  const n = Math.max(1, Math.floor(perfil.trabajadores || 1))
  if (n < o.trabajadoresMin) return null
  if (o.trabajadoresMenosDe !== undefined && n >= o.trabajadoresMenosDe) return null

  switch (o.condicion) {
    case 'consumidores':
      return perfil.consumidores ? 'aplica' : null
    case 'riesgo':
      return perfil.riesgo ? 'aplica' : null
    case 'mujeres':
      return perfil.mujeres ? 'aplica' : null
    case 'ventas':
    case 'uif':
      return 'revisar'
    case 'voluntario':
      return 'recomendado'
    default:
      if (o.exentaRemype && perfil.remype) return 'no-exigible'
      return 'aplica'
  }
}

/** Obligaciones de un área, para las páginas de servicios. */
export function obligacionesDeArea(...areas: AreaObligacion[]): Obligacion[] {
  return OBLIGACIONES.filter((o) => areas.includes(o.area))
}
