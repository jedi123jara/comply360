/**
 * Precios del estudio (soles, todos más IGV). Fuente: Plan maestro Comply360,
 * sección "Paquetes y precios" (oct-2026), apoyada en precios públicos del
 * mercado peruano. Si cambian, se cambian aquí y se reflejan en toda la web.
 */

export interface PlanIguala {
  id: 'inicial' | 'esencial' | 'integral' | 'corporativo'
  nombre: string
  para: string
  precioMensual: number
  incluye: string[]
  destacado?: boolean
}

export const PLANES_IGUALA: PlanIguala[] = [
  {
    id: 'inicial',
    nombre: 'Inicial',
    para: '11 a 19 trabajadores',
    precioMensual: 390,
    incluye: [
      'Calendario de obligaciones con alertas',
      'Boletín normativo mensual',
      '2 consultas al mes',
    ],
  },
  {
    id: 'esencial',
    nombre: 'Esencial',
    para: '20 a 50 trabajadores',
    precioMensual: 690,
    destacado: true,
    incluye: [
      'Todo lo del plan Inicial',
      'Hasta 4 consultas al mes',
      'Revisión de 2 documentos al mes',
      'Actualización anual de los documentos de SST y hostigamiento',
      'Reporte mensual de estado',
    ],
  },
  {
    id: 'integral',
    nombre: 'Integral',
    para: '51 a 100 trabajadores',
    precioMensual: 1190,
    incluye: [
      'Todo lo del plan Esencial',
      'Consultas sin límite fijo',
      'Asistencia virtual a la reunión mensual del comité de SST',
      'Un simulacro de inspección al año',
      'Revisión de desvinculaciones',
      '20% menos en defensa ante SUNAFIL',
    ],
  },
  {
    id: 'corporativo',
    nombre: 'Corporativo',
    para: '101 a 250 trabajadores',
    precioMensual: 1790,
    incluye: [
      'Todo lo del plan Integral',
      'Una visita presencial al mes',
      'Dos simulacros de inspección al año',
      'Respuesta en 24 horas',
      '30% menos en defensa ante SUNAFIL',
    ],
  },
]

export interface ServicioPrecioFijo {
  servicio: string
  /** Precios por tamaño: 20–50, 51–100 y 101–250 trabajadores. */
  precios: [number, number, number]
}

export const TRAMOS_TAMANO = ['20 a 50 trab.', '51 a 100 trab.', '101 a 250 trab.'] as const

export const SERVICIOS_PRECIO_FIJO: ServicioPrecioFijo[] = [
  { servicio: 'Diagnóstico completo', precios: [600, 900, 1200] },
  { servicio: 'Implementación de SST', precios: [1500, 2500, 3500] },
  { servicio: 'Implementación de hostigamiento sexual', precios: [800, 1100, 1400] },
  { servicio: 'Implementación laboral', precios: [1200, 2000, 3000] },
  { servicio: 'Elecciones del comité de SST', precios: [600, 800, 1000] },
  { servicio: 'Simulacro de inspección', precios: [900, 1200, 1500] },
]

export interface PrecioCapacitacion {
  producto: string
  precio: string
  detalle?: string
}

export const PRECIOS_CAPACITACION: PrecioCapacitacion[] = [
  {
    producto: 'Plan Anual de Capacitaciones',
    precio: 'S/ 3,300 al año o S/ 275 al mes',
    detalle: '6 sesiones in-company, hasta 25 personas por sesión. Con iguala, 15% menos.',
  },
  { producto: 'Grupo adicional del Plan Anual', precio: 'S/ 400 por sesión', detalle: 'Otro turno o sede.' },
  { producto: 'Sesión suelta in-company', precio: 'S/ 600', detalle: 'De 1 a 2 horas, hasta 25 personas.' },
  { producto: 'Inducción presencial de nuevos ingresos', precio: 'Desde S/ 250 por grupo', detalle: 'En Trujillo.' },
  { producto: 'Práctica de brigadas presencial', precio: 'Desde S/ 900', detalle: 'Extintores y primeros auxilios.' },
  { producto: 'Curso abierto virtual', precio: 'S/ 79 a S/ 99 por persona', detalle: 'Hostigamiento sexual o comité de SST.' },
  { producto: 'Curso para gerentes: cómo atender una inspección', precio: 'S/ 149 por persona' },
  { producto: 'Curso de procedimiento disciplinario para RRHH', precio: 'S/ 149 por persona' },
]

/** Soporte legal a RRHH: plan mensual por tamaño (20–50, 51–100, 101–250 trabajadores). */
export const PLAN_RRHH: { nombre: string; precios: [number, number, number]; incluye: string[] } = {
  nombre: 'Plan de soporte legal a RRHH',
  precios: [490, 790, 1190],
  incluye: [
    'Consultas de RRHH con respuesta en 24 horas hábiles',
    'Hasta 2 procedimientos disciplinarios al mes',
    'Una desvinculación al mes, de principio a fin',
    'Revisión de contratos y adendas',
    'Calendario de vencimientos de contratos y vacaciones',
  ],
}

export const PRECIOS_RRHH_PUNTUALES = [
  { servicio: 'Procedimiento disciplinario (por caso)', precio: 'Desde S/ 350' },
  { servicio: 'Desvinculación: preaviso, descargos, carta de despido y liquidación', precio: 'Desde S/ 450' },
] as const

export const PRECIOS_DEFENSA = [
  { servicio: 'Atención de una inspección (requerimientos y acompañamiento)', precio: 'Desde S/ 1,500' },
  { servicio: 'Descargos, apelación o recurso de revisión ante el TFL', precio: 'Desde S/ 2,500 por etapa' },
] as const

/** "S/ 1,190" — formato de precio para la web. */
export function soles(monto: number): string {
  return `S/ ${monto.toLocaleString('en-US')}`
}
