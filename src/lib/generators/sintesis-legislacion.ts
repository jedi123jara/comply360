/**
 * Generador: Síntesis de la Legislación Laboral
 *
 * Base legal:
 *  - D.S. 001-98-TR, Art. 48 — Exhibición obligatoria en lugar visible del
 *    centro de trabajo de una síntesis de la legislación laboral básica.
 *
 * Cartel obligatorio con los derechos laborales esenciales. Debe exhibirse
 * en lugar visible, actualizado con los montos del año (RMV, UIT, etc.).
 */
import type { GeneratedDocument, GeneratedSection, GeneratorOrgContext } from './types'

export interface SintesisLegislacionParams {
  /** Año de vigencia de los montos (para auto-calcular RMV, UIT, etc.). */
  anio: number
  /** Montos referenciales 2026 que se mostrarán en el cartel. */
  rmv?: number // default 1130
  uit?: number // default 5500
  asignacionFamiliar?: number // default 113 (10% RMV)
  /** Régimen predominante de la empresa (para personalizar beneficios mostrados). */
  regimen?: 'GENERAL' | 'MYPE_PEQUENA' | 'MYPE_MICRO'
}

export function generarSintesisLegislacion(
  params: SintesisLegislacionParams,
  org: GeneratorOrgContext,
): GeneratedDocument {
  const rmv = params.rmv ?? 1130
  const uit = params.uit ?? 5500
  const asig = params.asignacionFamiliar ?? Math.round(rmv * 0.10)
  const regimen = params.regimen ?? 'GENERAL'

  const fechaLegible = formatFechaLegible(new Date().toISOString())

  const sections: GeneratedSection[] = [
    {
      id: 'empresa',
      numbering: 'I',
      title: 'Empresa',
      content: `**${org.razonSocial}** (RUC ${org.ruc})${org.domicilio ? ` · ${org.domicilio}` : ''}\n\n**Montos referenciales ${params.anio}:** RMV S/ ${rmv.toLocaleString('es-PE')} · UIT S/ ${uit.toLocaleString('es-PE')} · Asignación Familiar S/ ${asig.toLocaleString('es-PE')}\n\n**Régimen laboral predominante:** ${regimenLabel(regimen)}`,
      baseLegal: 'D.S. 001-98-TR, Art. 48',
    },
    {
      id: 'remuneraciones',
      numbering: 'II',
      title: 'Remuneraciones',
      content: `- **Remuneración Mínima Vital (RMV):** S/ ${rmv.toLocaleString('es-PE')} mensuales.\n- **Asignación Familiar:** S/ ${asig.toLocaleString('es-PE')} (10% RMV), si tienes hijos menores de 18 años o hasta 24 años si estudian (Ley 25129).\n- **Boleta de pago:** entregada dentro de 3 días hábiles de realizado el pago (D.S. 001-98-TR).\n- **Descuentos máximos:** 60% de la remuneración neta (D.S. 003-97-TR).`,
      baseLegal: 'D.S. 003-97-TR · Ley 25129',
    },
    {
      id: 'jornada',
      numbering: 'III',
      title: 'Jornada y Descansos',
      content: `- **Jornada máxima:** 8 horas diarias o 48 horas semanales (Constitución, Art. 25).\n- **Refrigerio:** mínimo 45 minutos cuando la jornada es de 4+ horas (D.S. 007-2002-TR).\n- **Descanso semanal:** 24 horas consecutivas, preferente el domingo (D.Leg. 713).\n- **Horas extras:** voluntarias, sobretasa 25% (primeras 2h) / 35% (siguientes) / 100% (domingos).\n- **Feriados:** remuneración triple si se labora (remuneración + sobretasa 100%) — Ley 27671.`,
      baseLegal: 'Constitución Art. 25 · D.S. 007-2002-TR · D.Leg. 713',
    },
    {
      id: 'beneficios',
      numbering: 'IV',
      title: 'Beneficios Sociales',
      content: buildBeneficios(regimen, rmv),
      baseLegal: 'D.Leg. 728 · D.S. 001-97-TR · Ley 27735 · D.Leg. 713',
    },
    {
      id: 'licencias',
      numbering: 'V',
      title: 'Licencias y Permisos',
      content: `- **Maternidad:** 49 días pre + 49 días post-natales, con goce de haber (Ley 26644).\n- **Paternidad:** 10 días calendario (Ley 29409 modificada por Ley 30807).\n- **Lactancia:** 1 hora diaria durante el primer año del hijo (Ley 27240).\n- **Fallecimiento familiar directo:** 5 días (cónyuge/hijo/padre); 3 días (hermano).\n- **Enfermedad común:** hasta 20 días por año con certificado médico.`,
      baseLegal: 'Ley 26644 · Ley 29409 · Ley 27240',
    },
    {
      id: 'sst',
      numbering: 'VI',
      title: 'Seguridad y Salud en el Trabajo',
      content: `- **Política SST** firmada y exhibida.\n- **IPERC** actualizado por puesto de trabajo.\n- **Exámenes médicos ocupacionales** obligatorios (ingreso, periódicos, retiro).\n- **Capacitaciones** mínimo 4 al año.\n- **Equipos de Protección Personal (EPP)** a cargo del empleador.\n- **Derecho a paralizar** labores ante peligro inminente sin represalia (Art. 63 Ley 29783).\n- **Reporte de accidentes:** 24 horas al MTPE si es mortal o incapacitante.`,
      baseLegal: 'Ley 29783 · D.S. 005-2012-TR',
    },
    {
      id: 'derechos',
      numbering: 'VII',
      title: 'Derechos Fundamentales',
      content: `- **No discriminación** por género, edad, origen étnico, estado civil, orientación sexual, discapacidad, afiliación política o sindical.\n- **Igualdad salarial** entre mujeres y hombres por igual trabajo (Ley 30709).\n- **Protección contra el hostigamiento sexual** (Ley 27942): denuncia confidencial, investigación 30 días, medidas de protección en 72h.\n- **Libertad sindical:** derecho a constituir y afiliarse a organizaciones sindicales.\n- **Protección de datos personales** (Ley 29733).\n- **Teletrabajo:** derecho a desconexión digital fuera de jornada (Ley 31572).`,
      baseLegal: 'Constitución · Ley 30709 · Ley 27942 · Ley 29733 · Ley 31572',
    },
    {
      id: 'despido',
      numbering: 'VIII',
      title: 'Terminación del Vínculo Laboral',
      content: `- **Renuncia:** preaviso de 30 días (salvo exoneración del empleador).\n- **Despido:** solo por causa justa tipificada (Art. 25 D.Leg. 728). El empleador debe seguir el procedimiento del Art. 31: imputación escrita + 6 días para descargos.\n- **Indemnización por despido arbitrario** (régimen general): 1.5 sueldos por año de servicio (tope 12 sueldos).\n- **Liquidación de beneficios sociales:** plazo 48 horas del cese.\n- **Plazo para impugnar despido:** 30 días desde el cese (Art. 36 D.Leg. 728).\n- **Certificado de trabajo:** a entregarse al cese.`,
      baseLegal: 'D.Leg. 728 · D.S. 003-97-TR',
    },
    {
      id: 'inspeccion',
      numbering: 'IX',
      title: 'Fiscalización Laboral (SUNAFIL)',
      content: `- **SUNAFIL** fiscaliza el cumplimiento de la normativa laboral (Ley 28806).\n- **Consulta SUNAFIL:** 1800-16-16 (línea gratuita) · [www.sunafil.gob.pe](https://www.sunafil.gob.pe).\n- **Denuncia anónima**: el trabajador puede denunciar incumplimientos sin identificarse.\n- **Multas:** van desde 0.23 UIT (infracción leve, 1 trabajador) hasta 52.53 UIT (muy grave, 1000+ trabajadores). Tabla completa en D.S. 019-2006-TR.\n- **Subsanación voluntaria antes de inspección:** descuento del 90% (Art. 40 Ley 28806).`,
      baseLegal: 'Ley 28806 · D.S. 019-2006-TR',
    },
    {
      id: 'contactos',
      numbering: 'X',
      title: 'Contactos y Recursos',
      content: `- **SUNAFIL** (Fiscalización Laboral): 1800-16-16 · www.sunafil.gob.pe\n- **MTPE** (Trabajo y Promoción del Empleo): www.gob.pe/mtpe\n- **EsSalud**: 411-8000 · www.essalud.gob.pe\n- **Defensoría del Pueblo**: 0-800-15-170\n- **Portal del trabajador**: www.gob.pe/mtpe/trabajador\n\n---\n\n*Este cartel es una síntesis. Para el detalle completo consultar las normas citadas. Exhibido conforme al Art. 48 D.S. 001-98-TR.*\n\n**Vigente desde:** ${fechaLegible}.`,
      baseLegal: 'D.S. 001-98-TR, Art. 48',
    },
  ]

  const markdown = buildMarkdown(org, params.anio, sections)

  return {
    type: 'sintesis-legislacion',
    title: `Síntesis de la Legislación Laboral ${params.anio} — ${org.razonSocial}`,
    markdown,
    sections,
    legalBasis: [
      'D.S. 001-98-TR, Art. 48 — Exhibición obligatoria',
      'Constitución Política del Perú',
      'D.Leg. 728 y normativa laboral peruana vigente',
    ],
    metadata: {
      anio: params.anio,
      rmv,
      uit,
      asigFamiliar: asig,
      regimen,
    },
  }
}

function regimenLabel(r: 'GENERAL' | 'MYPE_PEQUENA' | 'MYPE_MICRO'): string {
  return {
    GENERAL: 'Régimen General (D.Leg. 728)',
    MYPE_PEQUENA: 'Régimen MYPE Pequeña Empresa',
    MYPE_MICRO: 'Régimen MYPE Microempresa',
  }[r]
}

function buildBeneficios(
  regimen: 'GENERAL' | 'MYPE_PEQUENA' | 'MYPE_MICRO',
  rmv: number,
): string {
  if (regimen === 'MYPE_MICRO') {
    return `- **Vacaciones:** 15 días calendario al año.\n- **SIS o EsSalud:** cobertura de salud según régimen.\n- **Indemnización despido arbitrario:** 10 remuneraciones diarias por año (tope 90 rem.).\n- **Sin CTS** ni gratificaciones (Ley 32353).`
  }
  if (regimen === 'MYPE_PEQUENA') {
    return `- **Vacaciones:** 15 días calendario al año.\n- **CTS:** medio sueldo al año (15 rem. diarias por año).\n- **Gratificaciones:** medio sueldo en julio y diciembre.\n- **EsSalud:** 9%.\n- **Indemnización despido arbitrario:** 20 remuneraciones diarias por año (tope 120 rem.).`
  }
  return `- **Vacaciones:** 30 días calendario al año.\n- **CTS:** depósitos en mayo y noviembre. Cálculo: rem. mensual × meses trabajados / 12.\n- **Gratificaciones:** 1 sueldo en julio y 1 en diciembre + bonificación extraordinaria del 9% (Ley 30334).\n- **EsSalud:** 9% a cargo del empleador.\n- **Utilidades:** 5-10% de la renta si la empresa genera rentas de tercera categoría y tiene 20+ trabajadores (D.Leg. 892).\n- **Seguro Vida Ley:** desde los 4 años de servicio (D.Leg. 688).\n- **Asignación familiar:** S/ ${Math.round(rmv * 0.10).toLocaleString('es-PE')}/mes si tienes hijos menores o estudiantes (Ley 25129).\n- **Indemnización despido arbitrario:** 1.5 sueldos por año (tope 12 sueldos) — D.S. 003-97-TR.`
}

function buildMarkdown(org: GeneratorOrgContext, anio: number, sections: GeneratedSection[]): string {
  const header = `# SÍNTESIS DE LA LEGISLACIÓN LABORAL ${anio}

**${org.razonSocial}** · RUC ${org.ruc}
**Base legal:** D.S. 001-98-TR, Art. 48 — Exhibición obligatoria

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
