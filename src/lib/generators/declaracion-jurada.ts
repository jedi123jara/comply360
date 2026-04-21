/**
 * Generador: Declaraciones Juradas del Trabajador
 *
 * Base legal:
 *  - D.S. 001-98-TR — Planillas, boletas de pago
 *  - Ley 25129 — Asignación familiar (derechohabientes)
 *  - D.S. 054-97-EF — Sistema Privado de Pensiones (CUSPP, AFP)
 *
 * La empresa requiere al trabajador declarar: domicilio, derechohabientes,
 * régimen previsional, datos para asignación familiar. Se firma al ingreso
 * y se actualiza ante cambios.
 */
import type { GeneratedDocument, GeneratedSection, GeneratorOrgContext } from './types'

export interface Derechohabiente {
  nombreCompleto: string
  dni: string
  fechaNacimiento?: string
  parentesco: 'conyuge' | 'conviviente' | 'hijo' | 'hija' | 'padre' | 'madre' | 'otro'
  conDiscapacidad?: boolean
  enEstudiosSuperiores?: boolean
}

export interface DeclaracionJuradaParams {
  trabajador: {
    nombre: string
    dni: string
    fechaNacimiento?: string
    estadoCivil: 'soltero' | 'casado' | 'conviviente' | 'divorciado' | 'viudo'
    telefono?: string
    email?: string
  }
  /** Domicilio actualizado. */
  domicilio: {
    direccion: string
    distrito: string
    provincia: string
    departamento: string
  }
  /** Derechohabientes (para asignación familiar, EsSalud, etc.). */
  derechohabientes: Derechohabiente[]
  /** Información previsional. */
  previsional: {
    sistema: 'AFP' | 'ONP' | 'sin_afiliacion'
    afpNombre?: string // si sistema=AFP
    cuspp?: string // si sistema=AFP
    fechaAfiliacion?: string
  }
  /** ¿Recibe asignación familiar? (requiere tener hijos menores/estudiantes). */
  recibeAsignacionFamiliar: boolean
  /** Fecha de la declaración. */
  fecha: string
}

const PARENTESCO_LABEL: Record<Derechohabiente['parentesco'], string> = {
  conyuge: 'Cónyuge',
  conviviente: 'Conviviente',
  hijo: 'Hijo',
  hija: 'Hija',
  padre: 'Padre',
  madre: 'Madre',
  otro: 'Otro',
}

export function generarDeclaracionJurada(
  params: DeclaracionJuradaParams,
  org: GeneratorOrgContext,
): GeneratedDocument {
  const fechaLegible = formatFechaLegible(params.fecha)

  const tieneHijosMenores = params.derechohabientes.some(
    (d) => (d.parentesco === 'hijo' || d.parentesco === 'hija') && (!d.fechaNacimiento || edadDe(d.fechaNacimiento) < 18),
  )
  const tieneHijosEstudiantes = params.derechohabientes.some(
    (d) => (d.parentesco === 'hijo' || d.parentesco === 'hija') && d.enEstudiosSuperiores && (!d.fechaNacimiento || edadDe(d.fechaNacimiento) < 24),
  )
  const aplicaAsigFamiliar = tieneHijosMenores || tieneHijosEstudiantes

  const sections: GeneratedSection[] = [
    {
      id: 'declaracion',
      numbering: 'I',
      title: 'Declaración',
      content: `Yo, **${params.trabajador.nombre}** identificado/a con DNI **${params.trabajador.dni}**, en mi calidad de trabajador/a de **${org.razonSocial}** (RUC ${org.ruc}), declaro bajo juramento la siguiente información, con pleno conocimiento de que los datos proporcionados son veraces y que cualquier falsedad u omisión constituye falta grave y puede acarrear responsabilidad civil y/o penal.\n\n**Estado civil:** ${estadoCivilLabel(params.trabajador.estadoCivil)}${params.trabajador.fechaNacimiento ? `\n**Fecha de nacimiento:** ${formatFechaLegible(params.trabajador.fechaNacimiento)}` : ''}${params.trabajador.telefono ? `\n**Teléfono:** ${params.trabajador.telefono}` : ''}${params.trabajador.email ? `\n**Email:** ${params.trabajador.email}` : ''}`,
      baseLegal: 'D.S. 001-98-TR',
    },
    {
      id: 'domicilio',
      numbering: 'II',
      title: 'Domicilio Actual',
      content: `**Dirección:** ${params.domicilio.direccion}\n**Distrito:** ${params.domicilio.distrito}\n**Provincia:** ${params.domicilio.provincia}\n**Departamento:** ${params.domicilio.departamento}\n\nMe comprometo a comunicar por escrito cualquier cambio de domicilio dentro de los 30 días siguientes.`,
      baseLegal: 'Art. 40 D.S. 001-98-TR',
    },
    {
      id: 'derechohabientes',
      numbering: 'III',
      title: `Derechohabientes (${params.derechohabientes.length})`,
      content: buildDerechohabientesContent(params.derechohabientes),
      baseLegal: 'Ley 26790 · Ley 25129',
    },
    {
      id: 'asignacion-familiar',
      numbering: 'IV',
      title: 'Asignación Familiar',
      content: `**Declaro ${params.recibeAsignacionFamiliar ? 'SÍ' : 'NO'} tener derecho a percibir Asignación Familiar** (Ley 25129 — 10% de la RMV).\n\n${
        aplicaAsigFamiliar
          ? `**Criterio cumplido:** tengo hijo(s) ${tieneHijosMenores ? 'menor(es) de 18 años' : ''}${tieneHijosMenores && tieneHijosEstudiantes ? ' y/o ' : ''}${tieneHijosEstudiantes ? 'en estudios superiores hasta 24 años' : ''}.`
          : '**Nota:** declaro no tener hijos menores de 18 años ni hijos en estudios superiores hasta 24 años.'
      }\n\nMe comprometo a comunicar oportunamente cualquier cambio en la situación familiar (nacimiento, mayoría de edad, fin de estudios) para la actualización del pago.`,
      baseLegal: 'Ley 25129, Art. 2',
    },
    {
      id: 'previsional',
      numbering: 'V',
      title: 'Régimen Previsional',
      content: `**Sistema elegido:** ${params.previsional.sistema === 'AFP' ? 'Sistema Privado de Pensiones (AFP)' : params.previsional.sistema === 'ONP' ? 'Sistema Nacional de Pensiones (ONP)' : 'Sin afiliación previsional'}${params.previsional.sistema === 'AFP' && params.previsional.afpNombre ? `\n**AFP:** ${params.previsional.afpNombre}` : ''}${params.previsional.cuspp ? `\n**CUSPP:** ${params.previsional.cuspp}` : ''}${params.previsional.fechaAfiliacion ? `\n**Fecha de afiliación:** ${formatFechaLegible(params.previsional.fechaAfiliacion)}` : ''}\n\nAutorizo a la Empresa a realizar los descuentos previsionales correspondientes conforme a la normativa vigente.`,
      baseLegal: 'D.S. 054-97-EF · D.Leg. 25967',
    },
    {
      id: 'proteccion-datos',
      numbering: 'VI',
      title: 'Autorización de Tratamiento de Datos Personales',
      content: `Autorizo a ${org.razonSocial} al tratamiento de los datos personales consignados en la presente declaración y los que se generen durante la relación laboral, para fines exclusivamente relacionados con el cumplimiento de las obligaciones laborales, previsionales, tributarias y de SST, conforme a la **Ley 29733 — Ley de Protección de Datos Personales** y su reglamento D.S. 003-2013-JUS.\n\nDeclaro haber sido informado/a de mis derechos de información, acceso, rectificación, oposición y cancelación de mis datos.`,
      baseLegal: 'Ley 29733',
    },
    {
      id: 'firma',
      numbering: 'VII',
      title: 'Firma',
      content: `En señal de conformidad y veracidad, firmo la presente Declaración Jurada:\n\n**Fecha:** ${fechaLegible}\n\n_____________________________________\n**${params.trabajador.nombre}**\nDNI ${params.trabajador.dni}\nHuella digital (si aplica):`,
      baseLegal: 'D.S. 001-98-TR',
    },
  ]

  const markdown = buildMarkdown(org, params, fechaLegible, sections)

  return {
    type: 'declaracion-jurada',
    title: `Declaración Jurada — ${params.trabajador.nombre}`,
    markdown,
    sections,
    legalBasis: [
      'D.S. 001-98-TR — Boletas y datos del trabajador',
      'Ley 25129 — Asignación familiar',
      'D.S. 054-97-EF — Sistema Privado de Pensiones',
      'Ley 29733 — Protección de Datos Personales',
    ],
    metadata: {
      trabajador: params.trabajador,
      fecha: params.fecha,
      totalDerechohabientes: params.derechohabientes.length,
      aplicaAsigFamiliar,
      sistemaPrevisional: params.previsional.sistema,
    },
  }
}

function buildDerechohabientesContent(list: Derechohabiente[]): string {
  if (list.length === 0) {
    return 'Declaro no tener derechohabientes al momento de suscribir la presente.'
  }
  return (
    '| N° | Nombre | DNI | Parentesco | F. Nac. | Observaciones |\n|---|---|---|---|---|---|\n' +
    list
      .map(
        (d, i) =>
          `| ${i + 1} | ${d.nombreCompleto} | ${d.dni} | ${PARENTESCO_LABEL[d.parentesco]} | ${d.fechaNacimiento ? formatFechaLegible(d.fechaNacimiento) : '—'} | ${[d.conDiscapacidad ? 'Con discapacidad' : null, d.enEstudiosSuperiores ? 'Estudios superiores' : null].filter(Boolean).join(' · ') || '—'} |`,
      )
      .join('\n')
  )
}

function estadoCivilLabel(s: DeclaracionJuradaParams['trabajador']['estadoCivil']): string {
  return {
    soltero: 'Soltero/a',
    casado: 'Casado/a',
    conviviente: 'Conviviente',
    divorciado: 'Divorciado/a',
    viudo: 'Viudo/a',
  }[s]
}

function edadDe(isoNac: string): number {
  try {
    const birth = new Date(isoNac)
    const now = new Date()
    let age = now.getFullYear() - birth.getFullYear()
    const m = now.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
    return age
  } catch {
    return 0
  }
}

function buildMarkdown(
  org: GeneratorOrgContext,
  p: DeclaracionJuradaParams,
  fecha: string,
  sections: GeneratedSection[],
): string {
  const header = `# DECLARACIÓN JURADA DEL TRABAJADOR

**Empresa:** ${org.razonSocial} (RUC ${org.ruc})
**Trabajador:** ${p.trabajador.nombre} — DNI ${p.trabajador.dni}
**Fecha:** ${fecha}

---

`
  const body = sections
    .map((s) => `## ${s.numbering}. ${s.title}\n\n${s.content}${s.baseLegal ? `\n\n*Base legal: ${s.baseLegal}*` : ''}\n`)
    .join('\n')
  return header + body
}

function formatFechaLegible(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}
