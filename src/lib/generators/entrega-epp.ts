/**
 * Generador: Acta de Entrega de Equipo de Protección Personal (EPP)
 *
 * Base legal:
 *  - Ley 29783, Art. 60 — Empleador proporciona EPP adecuado
 *  - D.S. 005-2012-TR, Art. 97
 *  - R.M. 050-2013-TR, Anexo 7 — Registro de Entrega de EPP
 *
 * Cada acta es por trabajador. Puede entregar múltiples ítems en la misma
 * acta. Al caducar la vida útil, se debe reponer (documentado con otra acta).
 */
import type { GeneratedDocument, GeneratedSection, GeneratorOrgContext } from './types'

export interface EppItem {
  tipo: string
  marca?: string
  modelo?: string
  talla?: string
  cantidad: number
  /** Vida útil estimada en meses (para fecha de reposición). */
  vidaUtilMeses?: number
  /** Norma técnica aplicable (ej. NTP 399.069, ANSI Z89.1). */
  normaTecnica?: string
  /** Fecha de fabricación (opcional). */
  fechaFabricacion?: string
  /** Certificación (ej. CE, ANSI, INEN). */
  certificacion?: string
}

export interface EntregaEppParams {
  /** Fecha de entrega (ISO). */
  fecha: string
  trabajador: {
    nombre: string
    dni: string
    cargo: string
    area: string
  }
  items: EppItem[]
  /** Si fue entrega inicial, renovación o reposición. */
  tipoEntrega: 'inicial' | 'renovacion' | 'reposicion'
  /** Motivo de la entrega si es reposición (desgaste, extravío, daño, etc.). */
  motivoReposicion?: string
  /** Responsable que entrega el EPP. */
  responsableEntrega: string
}

export function generarEntregaEpp(
  params: EntregaEppParams,
  org: GeneratorOrgContext,
): GeneratedDocument {
  if (params.items.length === 0) {
    throw new Error('Se requiere al menos 1 item de EPP.')
  }

  const fechaLegible = formatFechaLegible(params.fecha)

  // Calcular fechas de reposición por item
  const itemsConReposicion = params.items.map((item) => {
    let fechaReposicion: string | null = null
    if (item.vidaUtilMeses) {
      const d = new Date(params.fecha)
      d.setMonth(d.getMonth() + item.vidaUtilMeses)
      fechaReposicion = formatFechaLegible(d.toISOString())
    }
    return { ...item, fechaReposicion }
  })

  const tipoLabel = {
    inicial: 'Entrega inicial',
    renovacion: 'Renovación',
    reposicion: 'Reposición',
  }[params.tipoEntrega]

  const sections: GeneratedSection[] = [
    {
      id: 'datos',
      numbering: 'I',
      title: 'Datos de la Entrega',
      content: `**Empresa:** ${org.razonSocial} · RUC ${org.ruc}\n**Tipo:** ${tipoLabel}${params.tipoEntrega === 'reposicion' && params.motivoReposicion ? ` (Motivo: ${params.motivoReposicion})` : ''}\n**Fecha:** ${fechaLegible}\n**Responsable de entrega:** ${params.responsableEntrega}`,
      baseLegal: 'Ley 29783, Art. 60',
    },
    {
      id: 'trabajador',
      numbering: 'II',
      title: 'Trabajador Receptor',
      content: `**Nombre:** ${params.trabajador.nombre}\n**DNI:** ${params.trabajador.dni}\n**Cargo:** ${params.trabajador.cargo}\n**Área:** ${params.trabajador.area}`,
      baseLegal: 'Art. 60 Ley 29783',
    },
    {
      id: 'items',
      numbering: 'III',
      title: `Equipos de Protección Personal Entregados (${params.items.length})`,
      content: buildItemsTable(itemsConReposicion),
      baseLegal: 'R.M. 050-2013-TR Anexo 7',
    },
    {
      id: 'obligaciones',
      numbering: 'IV',
      title: 'Obligaciones del Trabajador Receptor',
      content: `Al recibir el EPP, el trabajador se obliga a:\n\n1. **Usar correctamente** el EPP durante el desarrollo de las actividades para las cuales fue provisto.\n2. **Mantener y conservar** el EPP en buen estado, conforme a las indicaciones del fabricante.\n3. **Reportar** cualquier deterioro, pérdida, daño o deficiencia del EPP al jefe inmediato o al responsable SST.\n4. **Solicitar reposición** antes del vencimiento de la vida útil o cuando corresponda.\n5. **No modificar** ni alterar los dispositivos de seguridad del EPP.\n6. **Devolver** el EPP al cese de la relación laboral o al reasignarse a un puesto que no lo requiera.`,
      baseLegal: 'Art. 79 Ley 29783',
    },
    {
      id: 'capacitacion',
      numbering: 'V',
      title: 'Capacitación en Uso del EPP',
      content: `El trabajador declara haber recibido instrucciones claras sobre:\n\n- El correcto uso, ajuste y retiro de cada EPP entregado\n- Las limitaciones de protección de cada equipo\n- La forma de detectar daños o desgaste\n- El procedimiento de reporte y reposición\n\nEl empleador se compromete a capacitar periódicamente en el uso del EPP y a reponerlo antes del vencimiento de la vida útil.`,
      baseLegal: 'Art. 35 Ley 29783',
    },
    {
      id: 'firmas',
      numbering: 'VI',
      title: 'Firmas',
      content: `_____________________________________\n**${params.trabajador.nombre}**\nDNI ${params.trabajador.dni}\nTrabajador receptor — Recibí conforme y capacitado\n\n_____________________________________\n**${params.responsableEntrega}**\nResponsable de la entrega\n\n_____________________________________\n**${org.representanteLegal ?? 'Representante del Empleador'}**\n${org.cargoRepresentante ?? 'Representante Legal'}\n${org.razonSocial}`,
      baseLegal: 'R.M. 050-2013-TR Anexo 7',
    },
  ]

  const markdown = buildMarkdown(org, params, fechaLegible, sections)

  return {
    type: 'entrega-epp',
    title: `Acta Entrega EPP — ${params.trabajador.nombre} — ${fechaLegible}`,
    markdown,
    sections,
    legalBasis: [
      'Ley 29783, Art. 60 — Obligación de proporcionar EPP',
      'Ley 29783, Art. 79 — Obligaciones del trabajador',
      'D.S. 005-2012-TR, Art. 97',
      'R.M. 050-2013-TR, Anexo 7',
    ],
    metadata: {
      trabajador: params.trabajador,
      fecha: params.fecha,
      tipoEntrega: params.tipoEntrega,
      totalItems: params.items.length,
      fechasReposicion: itemsConReposicion.map((i) => i.fechaReposicion).filter(Boolean),
    },
  }
}

function buildItemsTable(items: Array<EppItem & { fechaReposicion: string | null }>): string {
  const rows = items
    .map(
      (i, idx) =>
        `| ${idx + 1} | ${i.tipo}${i.marca ? ` (${i.marca}${i.modelo ? ` ${i.modelo}` : ''})` : ''} | ${i.talla ?? '—'} | ${i.cantidad} | ${i.normaTecnica ?? '—'} | ${i.certificacion ?? '—'} | ${i.fechaReposicion ?? '—'} |`,
    )
    .join('\n')
  return `| N° | EPP | Talla | Cant. | Norma | Certificación | Reposición |\n|---|---|---|---|---|---|---|\n${rows}`
}

function buildMarkdown(
  org: GeneratorOrgContext,
  params: EntregaEppParams,
  fecha: string,
  sections: GeneratedSection[],
): string {
  const header = `# ACTA DE ENTREGA DE EQUIPO DE PROTECCIÓN PERSONAL (EPP)

**Empresa:** ${org.razonSocial}
**Trabajador:** ${params.trabajador.nombre} (DNI ${params.trabajador.dni})
**Fecha:** ${fecha}
**Base legal:** Ley 29783, Art. 60 · R.M. 050-2013-TR Anexo 7

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
