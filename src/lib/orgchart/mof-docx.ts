import JSZip from 'jszip'
import { prisma } from '@/lib/prisma'

export interface PositionMofDocx {
  buffer: Buffer
  fileName: string
  title: string
  positionId: string
}

export class MofPositionNotFoundError extends Error {
  constructor() {
    super('Cargo no encontrado')
  }
}

export async function generatePositionMofDocx(
  orgId: string,
  positionId: string,
): Promise<PositionMofDocx> {
  const position = await prisma.orgPosition.findFirst({
    where: { id: positionId, orgId, validTo: null },
    include: {
      organization: {
        select: { name: true, razonSocial: true, ruc: true, sector: true },
      },
      orgUnit: {
        select: { name: true, kind: true, code: true },
      },
      reportsTo: {
        select: {
          id: true,
          title: true,
          orgUnit: { select: { name: true } },
        },
      },
      reportees: {
        where: { validTo: null },
        select: { id: true, title: true },
        orderBy: { title: 'asc' },
      },
      assignments: {
        where: { endedAt: null },
        include: {
          worker: {
            select: {
              firstName: true,
              lastName: true,
              dni: true,
              regimenLaboral: true,
              tipoContrato: true,
              fechaIngreso: true,
            },
          },
        },
        orderBy: { startedAt: 'asc' },
      },
    },
  })

  if (!position) throw new MofPositionNotFoundError()

  const title = `MOF - ${position.title}`
  const generatedAt = new Date()
  const sections = [
    heading('Manual de Organización y Funciones (MOF)', 'Title'),
    paragraph(title, true),
    paragraph(`Empresa: ${position.organization.razonSocial ?? position.organization.name}`),
    paragraph(`RUC: ${position.organization.ruc ?? 'Pendiente de registrar'}`),
    paragraph(`Fecha de generación: ${formatDate(generatedAt)}`),
    spacer(),
    heading('1. Identificación del cargo'),
    keyValue('Cargo', position.title),
    keyValue('Código', position.code),
    keyValue('Área / unidad', `${position.orgUnit.name} (${formatEnum(position.orgUnit.kind)})`),
    keyValue('Jefe inmediato', position.reportsTo ? `${position.reportsTo.title} - ${position.reportsTo.orgUnit.name}` : null),
    keyValue('Nivel', position.level),
    keyValue('Categoría', position.category),
    keyValue('Cupos aprobados', String(position.seats)),
    keyValue('Vigencia', `${formatDate(position.validFrom)}${position.validTo ? ` a ${formatDate(position.validTo)}` : ' en adelante'}`),
    spacer(),
    heading('2. Propósito del cargo'),
    paragraph(position.purpose ?? missing('propósito del cargo')),
    spacer(),
    heading('3. Funciones principales'),
    listOrMissing(listFromJson(position.functions), 'funciones principales'),
    spacer(),
    heading('4. Responsabilidades'),
    listOrMissing(listFromJson(position.responsibilities), 'responsabilidades'),
    spacer(),
    heading('5. Requisitos del puesto'),
    listOrMissing(listFromJson(position.requirements), 'requisitos del puesto'),
    spacer(),
    heading('6. Condiciones SST y cumplimiento'),
    keyValue('Nivel de riesgo SST', position.riskCategory),
    keyValue('Requiere SCTR', position.requiresSctr ? 'Sí' : 'No'),
    keyValue('Requiere examen médico ocupacional', position.requiresMedicalExam ? 'Sí' : 'No'),
    keyValue('Cargo crítico', position.isCritical ? 'Sí' : 'No'),
    spacer(),
    heading('7. Ocupantes vigentes'),
    listOrMissing(
      position.assignments.map(assignment => {
        const worker = assignment.worker
        return `${worker.firstName} ${worker.lastName} - DNI ${worker.dni} - ${formatEnum(worker.tipoContrato)} - ingreso ${formatDate(worker.fechaIngreso)}`
      }),
      'ocupantes vigentes',
    ),
    spacer(),
    heading('8. Cargos subordinados'),
    listOrMissing(position.reportees.map(reportee => reportee.title), 'cargos subordinados'),
    spacer(),
    heading('9. Control documentario'),
    keyValue('Fuente', 'Módulo Organigrama COMPLY360'),
    keyValue('ID del cargo', position.id),
    keyValue('ID del jefe inmediato', position.reportsTo?.id ?? null),
    paragraph('Este MOF debe ser revisado y aprobado por la organización antes de su publicación o firma por trabajadores.'),
  ].flat()

  const buffer = await buildDocxBuffer({
    title,
    subject: 'Manual de Organización y Funciones',
    creator: 'COMPLY360',
    documentXml: documentXml(sections),
  })

  return {
    buffer,
    fileName: `${safeFileName(title)}.docx`,
    title,
    positionId: position.id,
  }
}

function documentXml(body: string[]) {
  return xmlDeclaration(`<?mso-application progid="Word.Document"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
    ${body.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`)
}

async function buildDocxBuffer(input: {
  title: string
  subject: string
  creator: string
  documentXml: string
}) {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', contentTypesXml())
  zip.file('_rels/.rels', relsXml())
  zip.file('word/document.xml', input.documentXml)
  zip.file('word/styles.xml', stylesXml())
  zip.file('word/_rels/document.xml.rels', documentRelsXml())
  zip.file('docProps/core.xml', coreXml(input))
  zip.file('docProps/app.xml', appXml())
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

function heading(text: string, style: 'Title' | 'Heading1' = 'Heading1') {
  return paragraphXml(text, { style, bold: style !== 'Title' })
}

function paragraph(text: string, bold = false) {
  return paragraphXml(text, { bold })
}

function keyValue(label: string, value: string | null | undefined) {
  return paragraphXml(`${label}: ${value || 'Pendiente de completar'}`, { boldLabel: `${label}:` })
}

function spacer() {
  return paragraphXml('', {})
}

function listOrMissing(items: string[], fieldName: string) {
  const values = items.length > 0 ? items : [missing(fieldName)]
  return values.map(item => paragraphXml(`- ${item}`, { indent: true }))
}

function paragraphXml(
  text: string,
  options: { style?: 'Title' | 'Heading1'; bold?: boolean; boldLabel?: string; indent?: boolean },
) {
  const style = options.style ? `<w:pStyle w:val="${options.style}"/>` : ''
  const spacing = '<w:spacing w:after="120"/>'
  const indent = options.indent ? '<w:ind w:left="360"/>' : ''
  const pPr = style || indent ? `<w:pPr>${style}${spacing}${indent}</w:pPr>` : `<w:pPr>${spacing}</w:pPr>`

  if (options.boldLabel && text.startsWith(options.boldLabel)) {
    const rest = text.slice(options.boldLabel.length)
    return `<w:p>${pPr}<w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(options.boldLabel)}</w:t></w:r><w:r><w:t xml:space="preserve">${escapeXml(rest)}</w:t></w:r></w:p>`
  }

  const rPr = options.bold ? '<w:rPr><w:b/></w:rPr>' : ''
  return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
}

function listFromJson(value: unknown): string[] {
  if (!value) return []
  if (typeof value === 'string') return splitTextList(value)
  if (Array.isArray(value)) {
    return value.flatMap(item => {
      if (typeof item === 'string') return splitTextList(item)
      if (item && typeof item === 'object') return [Object.values(item).map(String).join(' - ')]
      return []
    })
  }
  if (typeof value === 'object') {
    const maybeItems = (value as { items?: unknown }).items
    if (Array.isArray(maybeItems)) return listFromJson(maybeItems)
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${String(item)}`)
      .filter(Boolean)
  }
  return []
}

function splitTextList(value: string) {
  return value
    .split(/\r?\n|;|\u2022/g)
    .map(item => item.trim())
    .filter(Boolean)
}

function missing(fieldName: string) {
  return `Pendiente de completar ${fieldName}.`
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function safeFileName(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
}

function escapeXml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function xmlDeclaration(xml: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${xml}`
}

function contentTypesXml() {
  return xmlDeclaration(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`)
}

function relsXml() {
  return xmlDeclaration(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`)
}

function documentRelsXml() {
  return xmlDeclaration(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`)
}

function stylesXml() {
  return xmlDeclaration(`<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:qFormat/>
    <w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="065F46"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="0F172A"/></w:rPr>
  </w:style>
</w:styles>`)
}

function coreXml(input: { title: string; subject: string; creator: string }) {
  const now = new Date().toISOString()
  return xmlDeclaration(`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(input.title)}</dc:title>
  <dc:subject>${escapeXml(input.subject)}</dc:subject>
  <dc:creator>${escapeXml(input.creator)}</dc:creator>
  <cp:lastModifiedBy>${escapeXml(input.creator)}</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`)
}

function appXml() {
  return xmlDeclaration(`<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>COMPLY360</Application>
</Properties>`)
}
