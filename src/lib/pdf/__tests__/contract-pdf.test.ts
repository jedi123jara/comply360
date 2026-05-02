import { describe, it, expect } from 'vitest'
import {
  createContractPDFDoc,
  addCoverPage,
  addContractHeader,
  addContractFooter,
  addSignatureBlock,
  renderContractBody,
  drawJustifiedParagraph,
  checkContractPageBreak,
  finalizeContractPDF,
  CONTRACT_LAYOUT,
} from '../contract-pdf'
import { cleanContractContent } from '../contract-content-cleaner'

function bufferToText(buffer: ArrayBuffer): string {
  return new TextDecoder('latin1').decode(buffer)
}

describe('createContractPDFDoc', () => {
  it('crea un doc A4 con tipografía Times', async () => {
    const doc = await createContractPDFDoc()
    expect(doc).toBeDefined()
    expect(Math.round(doc.internal.pageSize.getWidth())).toBe(210)
    expect(Math.round(doc.internal.pageSize.getHeight())).toBe(297)
  })
})

describe('addCoverPage', () => {
  it('no lanza con datos mínimos', async () => {
    const doc = await createContractPDFDoc()
    expect(() =>
      addCoverPage(doc, {
        title: 'Contrato a Plazo Indeterminado',
        org: { razonSocial: 'ACME S.A.C.', ruc: '20123456789' },
        workerFullName: 'María González Pérez',
        workerDni: '45678912',
        ciudad: 'Lima',
      }),
    ).not.toThrow()
  })

  it('emite título, razón social y nombre del trabajador en el buffer', async () => {
    const doc = await createContractPDFDoc()
    addCoverPage(doc, {
      title: 'Contrato a Plazo Indeterminado',
      org: { razonSocial: 'ACME S.A.C.', ruc: '20123456789' },
      workerFullName: 'María González Pérez',
      workerDni: '45678912',
      ciudad: 'Lima',
    })
    const text = bufferToText(doc.output('arraybuffer'))
    expect(text).toContain('CONTRATO A PLAZO INDETERMINADO')
    expect(text).toContain('ACME S.A.C.')
    expect(text).toContain('45678912')
    expect(text).toContain('Lima')
  })

  it('NO emite la marca COMPLY360 en la portada', async () => {
    const doc = await createContractPDFDoc()
    addCoverPage(doc, {
      title: 'Contrato',
      org: { razonSocial: 'Empresa', ruc: '20000000001' },
      workerFullName: 'Juan Pérez',
      workerDni: '11111111',
      ciudad: 'Lima',
    })
    const text = bufferToText(doc.output('arraybuffer'))
    expect(text).not.toContain('COMPLY360')
    expect(text).not.toContain('Generado por')
  })
})

describe('addContractHeader', () => {
  it('no lanza ni emite marca COMPLY360', async () => {
    const doc = await createContractPDFDoc()
    expect(() =>
      addContractHeader(doc, { org: { razonSocial: 'ACME S.A.C.', ruc: '20123456789' } }),
    ).not.toThrow()
    const text = bufferToText(doc.output('arraybuffer'))
    expect(text).toContain('ACME S.A.C.')
    expect(text).toContain('RUC 20123456789')
    expect(text).not.toContain('COMPLY360')
  })
})

describe('addContractFooter', () => {
  it('emite "Página 1 de N" pero no "Generado por"', async () => {
    const doc = await createContractPDFDoc()
    doc.addPage()
    doc.addPage()
    expect(() => addContractFooter(doc)).not.toThrow()
    expect(doc.getNumberOfPages()).toBe(3)
    const text = bufferToText(doc.output('arraybuffer'))
    expect(text).toContain('Página 1 de 3')
    expect(text).toContain('Página 3 de 3')
    expect(text).not.toContain('Generado por')
    expect(text).not.toContain('COMPLY360')
  })
})

describe('drawJustifiedParagraph', () => {
  it('devuelve y mayor al input cuando hay texto', async () => {
    const doc = await createContractPDFDoc()
    const newY = drawJustifiedParagraph(
      doc,
      'El trabajador se compromete a desempeñar las funciones inherentes a su cargo con diligencia y probidad, conforme a las directivas del empleador.',
      CONTRACT_LAYOUT.marginX,
      60,
      210 - CONTRACT_LAYOUT.marginX * 2,
      CONTRACT_LAYOUT.lineHeight,
    )
    expect(newY).toBeGreaterThan(60)
  })

  it('devuelve mismo y para texto vacío', async () => {
    const doc = await createContractPDFDoc()
    const newY = drawJustifiedParagraph(doc, '   ', 25, 60, 160, 5.4)
    expect(newY).toBe(60)
  })
})

describe('checkContractPageBreak', () => {
  it('mantiene y cuando todavía hay espacio', async () => {
    const doc = await createContractPDFDoc()
    const initialPages = doc.getNumberOfPages()
    const y = checkContractPageBreak(doc, 100)
    expect(y).toBe(100)
    expect(doc.getNumberOfPages()).toBe(initialPages)
  })

  it('agrega página y resetea y cuando se pasa del límite', async () => {
    const doc = await createContractPDFDoc()
    const initialPages = doc.getNumberOfPages()
    const y = checkContractPageBreak(doc, 290)
    expect(y).toBe(CONTRACT_LAYOUT.marginTop)
    expect(doc.getNumberOfPages()).toBe(initialPages + 1)
  })
})

describe('addSignatureBlock', () => {
  it('no lanza con datos válidos y emite las dos partes', async () => {
    const doc = await createContractPDFDoc()
    const startY = 100
    const newY = addSignatureBlock(doc, startY, {
      empleador: { razonSocial: 'ACME S.A.C.', ruc: '20123456789' },
      trabajador: { fullName: 'María González', dni: '45678912' },
      ciudad: 'Lima',
      fecha: new Date(2026, 4, 1),
    })
    expect(newY).toBeGreaterThan(startY)
    const text = bufferToText(doc.output('arraybuffer'))
    expect(text).toContain('EL EMPLEADOR')
    expect(text).toContain('EL TRABAJADOR')
    expect(text).toContain('ACME S.A.C.')
    expect(text).toContain('María González')
    expect(text).toContain('Lima')
  })

  it('salta a página nueva si no caben las firmas', async () => {
    const doc = await createContractPDFDoc()
    const initialPages = doc.getNumberOfPages()
    addSignatureBlock(doc, 270, {
      empleador: { razonSocial: 'X', ruc: '1' },
      trabajador: { fullName: 'Y', dni: '1' },
      ciudad: 'Lima',
      fecha: new Date(),
    })
    expect(doc.getNumberOfPages()).toBe(initialPages + 1)
  })
})

describe('renderContractBody', () => {
  it('renderiza preámbulo + cláusulas + cierre sin lanzar', async () => {
    const doc = await createContractPDFDoc()
    const cleaned = cleanContractContent(
      'Conste por el presente documento el contrato celebrado entre las partes.\n\n' +
        'PRIMERA.- OBJETO DEL CONTRATO\n\n' +
        'EL EMPLEADOR contrata los servicios del TRABAJADOR.\nBase legal: D.S. 003-97-TR Art. 4\n\n' +
        'SEGUNDA.- VIGENCIA\n\nDesde el 01/05/2026.\nBase legal: D.S. 003-97-TR Art. 4\n\n' +
        'En señal de conformidad, las partes suscriben.',
    )
    const newY = renderContractBody(doc, cleaned, { startY: 56 })
    expect(newY).toBeGreaterThan(56)

    const text = bufferToText(doc.output('arraybuffer'))
    expect(text).toContain('Conste por el presente')
    expect(text).toContain('PRIMERA: OBJETO DEL CONTRATO')
    expect(text).toContain('SEGUNDA: VIGENCIA')
    expect(text).toContain('Base legal: D.S. 003-97-TR Art. 4')
    expect(text).toContain('En se')
  })
})

describe('finalizeContractPDF', () => {
  it('devuelve NextResponse con Content-Type PDF', async () => {
    const doc = await createContractPDFDoc()
    const response = finalizeContractPDF(doc, 'test.pdf')
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="test.pdf"')
  })
})

describe('flujo completo de generación', () => {
  it('genera PDF con portada + cuerpo + firmas + footer sin marca COMPLY360', async () => {
    const doc = await createContractPDFDoc()
    addCoverPage(doc, {
      title: 'Contrato a Plazo Indeterminado',
      org: { razonSocial: 'ACME S.A.C.', ruc: '20123456789' },
      workerFullName: 'María González Pérez',
      workerDni: '45678912',
      ciudad: 'Lima',
    })
    doc.addPage()
    addContractHeader(doc, { org: { razonSocial: 'ACME S.A.C.', ruc: '20123456789' } })
    const cleaned = cleanContractContent(
      'PRIMERA.- DE LAS PARTES (CLAUSULA OBLIGATORIA) Las partes celebran el presente contrato.\nBase legal: D.S. 003-97-TR Art. 4\n\n' +
        'SEGUNDA.- DE LA REMUNERACION (CLAUSULA OBLIGATORIA) S/ 2,500 mensuales.\nBase legal: D.S. 003-97-TR Art. 12',
    )
    let y = renderContractBody(doc, cleaned, { startY: 36 })
    addSignatureBlock(doc, y, {
      empleador: { razonSocial: 'ACME S.A.C.', ruc: '20123456789' },
      trabajador: { fullName: 'María González Pérez', dni: '45678912' },
      ciudad: 'Lima',
      fecha: new Date(2026, 4, 1),
    })
    addContractFooter(doc)

    const buffer = doc.output('arraybuffer')
    expect(buffer.byteLength).toBeGreaterThan(1000)

    const text = bufferToText(buffer)
    // Branding chequeo crítico
    expect(text).not.toContain('COMPLY360')
    expect(text).not.toContain('Generado por')
    expect(text).not.toContain('Plataforma')
    // Contenido esperado
    expect(text).toContain('Página')
    expect(text).toContain('CONTRATO A PLAZO INDETERMINADO')
    expect(text).toContain('PRIMERA: DE LAS PARTES')
    expect(text).toContain('REMUNERACI') // RAW PDF puede partir tildes
    expect(text).toContain('Base legal: D.S. 003-97-TR Art. 4')
    expect(text).toContain('EL EMPLEADOR')
    expect(text).toContain('EL TRABAJADOR')
    // Marker interno NO debe estar en el output
    expect(text).not.toContain('CLAUSULA OBLIGATORIA')
    expect(text).not.toContain('CLÁUSULA OBLIGATORIA')
  })
})
