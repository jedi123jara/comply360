import { describe, it, expect } from 'vitest'
import { cleanContractContent } from '../contract-content-cleaner'

describe('cleanContractContent — restauración de tildes', () => {
  it('restaura tildes en títulos all-caps', () => {
    const input = 'PRIMERA.- DE LAS CLAUSULAS OBLIGATORIAS DEL PERIODO\n\nEl trabajador acepta.'
    const r = cleanContractContent(input)
    expect(r.clauses[0].title).toContain('CLÁUSULAS')
    expect(r.clauses[0].title).toContain('PERÍODO')
  })

  it('no toca palabras minúsculas legítimas', () => {
    const input = 'PRIMERA.- TÍTULO\n\nEsta es una cláusula obligatoria que regula el periodo de prueba.'
    const r = cleanContractContent(input)
    // El cuerpo conserva las minúsculas tal cual (la palabra "periodo" en minúscula NO se reemplaza)
    expect(r.clauses[0].body).toContain('cláusula obligatoria')
    expect(r.clauses[0].body).toContain('periodo')
  })

  it('restaura DECIMO, SEPTIMA, INDEMNIZACION en títulos', () => {
    const input = 'DECIMO SEPTIMA.- DE LA INDEMNIZACION\n\nCuerpo.'
    const r = cleanContractContent(input)
    expect(r.clauses[0].title).toContain('DÉCIMO')
    expect(r.clauses[0].title).toContain('SÉPTIMA')
    expect(r.clauses[0].title).toContain('INDEMNIZACIÓN')
  })
})

describe('cleanContractContent — strip de (CLÁUSULA OBLIGATORIA)', () => {
  it('elimina "(CLAUSULA OBLIGATORIA)" sin tilde y marca isMandatory', () => {
    const input = 'PRIMERA.- DE LAS PARTES (CLAUSULA OBLIGATORIA) El presente contrato se celebra...'
    const r = cleanContractContent(input)
    expect(r.clauses[0].body).not.toContain('CLAUSULA OBLIGATORIA')
    expect(r.clauses[0].body).not.toContain('CLÁUSULA OBLIGATORIA')
    expect(r.clauses[0].isMandatory).toBe(true)
  })

  it('elimina "(CLÁUSULA OBLIGATORIA)" con tilde', () => {
    const input = 'PRIMERA.- TITLE (CLÁUSULA OBLIGATORIA) Cuerpo.'
    const r = cleanContractContent(input)
    expect(r.clauses[0].body).not.toContain('OBLIGATORIA')
    expect(r.clauses[0].isMandatory).toBe(true)
  })

  it('NO toca la palabra "obligatoria" en prosa legítima', () => {
    const input = 'PRIMERA.- TÍTULO\n\nEs una cláusula obligatoria conforme a ley.'
    const r = cleanContractContent(input)
    // El strip solo aplica a "(cláusula obligatoria)" con paréntesis
    expect(r.clauses[0].body).toContain('cláusula obligatoria')
  })
})

describe('cleanContractContent — extracción de Base legal', () => {
  it('extrae "Base legal: D.S. 003-97-TR Art. 4" del cuerpo', () => {
    const input = 'PRIMERA.- TÍTULO\n\nCuerpo de la cláusula.\nBase legal: D.S. 003-97-TR Art. 4'
    const r = cleanContractContent(input)
    expect(r.clauses[0].baseLegal).toBe('D.S. 003-97-TR Art. 4')
    expect(r.clauses[0].body).not.toContain('Base legal')
    expect(r.clauses[0].body).toBe('Cuerpo de la cláusula.')
  })

  it('extrae base legal cuando viene en la misma línea que el cuerpo', () => {
    const input = 'PRIMERA.- TITLE Cuerpo en una línea. Base legal: Ley 29783'
    const r = cleanContractContent(input)
    expect(r.clauses[0].baseLegal).toBe('Ley 29783')
    expect(r.clauses[0].body).not.toContain('Base legal')
  })

  it('devuelve null si no hay base legal', () => {
    const input = 'PRIMERA.- TÍTULO\n\nCuerpo sin base legal.'
    const r = cleanContractContent(input)
    expect(r.clauses[0].baseLegal).toBeNull()
  })
})

describe('cleanContractContent — placeholders sin valor', () => {
  it('reemplaza {{snake_case}} con línea + etiqueta humanizada', () => {
    const input = 'PRIMERA.- TÍTULO\n\nDomicilio: {{domicilio_empleador}} y RUC.'
    const r = cleanContractContent(input)
    expect(r.clauses[0].body).toContain('[Domicilio del Empleador]')
    expect(r.clauses[0].body).toMatch(/_+ \[Domicilio del Empleador\] _+/)
    expect(r.unresolvedPlaceholders).toContain('domicilio_empleador')
  })

  it('humaniza placeholders desconocidos con Title Case', () => {
    const input = 'PRIMERA.- TÍTULO\n\n{{algun_campo_raro}}'
    const r = cleanContractContent(input)
    expect(r.clauses[0].body).toContain('[Algun Campo Raro]')
  })

  it('uniformiza líneas ____________ genéricas a "[Por completar]"', () => {
    const input = 'PRIMERA.- TÍTULO\n\nDomicilio: ____________ y nombre.'
    const r = cleanContractContent(input)
    expect(r.clauses[0].body).toContain('[Por completar]')
  })

  it('reemplaza múltiples placeholders distintos', () => {
    const input = 'PRIMERA.- TÍTULO\n\n{{trabajador_dni}} y {{actividad_economica}}.'
    const r = cleanContractContent(input)
    expect(r.clauses[0].body).toContain('[DNI del Trabajador]')
    expect(r.clauses[0].body).toContain('[Actividad Económica]')
  })
})

describe('cleanContractContent — particionado en bloques', () => {
  it('detecta el preámbulo cuando empieza con "Conste por"', () => {
    const input =
      'Conste por el presente documento el contrato celebrado entre las partes.\n\n' +
      'PRIMERA.- TÍTULO\n\nCuerpo.'
    const r = cleanContractContent(input)
    expect(r.preamble).toContain('Conste por el presente')
    expect(r.clauses).toHaveLength(1)
  })

  it('detecta el cierre cuando empieza con "En señal de conformidad"', () => {
    const input =
      'PRIMERA.- TÍTULO\n\nCuerpo.\n\n' +
      'En señal de conformidad, las partes suscriben.'
    const r = cleanContractContent(input)
    expect(r.clauses).toHaveLength(1)
    expect(r.closingParagraph).toContain('En señal de conformidad')
  })

  it('particiona varias cláusulas numeradas', () => {
    const input =
      'PRIMERA.- OBJETO\n\nCuerpo uno.\n\n' +
      'SEGUNDA.- VIGENCIA\n\nCuerpo dos.\n\n' +
      'TERCERA.- REMUNERACIÓN\n\nCuerpo tres.'
    const r = cleanContractContent(input)
    expect(r.clauses).toHaveLength(3)
    expect(r.clauses[0].title).toContain('PRIMERA')
    expect(r.clauses[1].title).toContain('SEGUNDA')
    expect(r.clauses[2].title).toContain('TERCERA')
  })
})

describe('cleanContractContent — limpieza de artefactos internos', () => {
  it('elimina branding interno de plataforma del cuerpo contractual', () => {
    const input =
      'PRIMERA.- OBJETO\n\nCuerpo.\n\n' +
      'Generado por COMPLY360 — Plataforma de compliance laboral peruano'
    const r = cleanContractContent(input)
    expect(r.clauses[0].body).toBe('Cuerpo.')
    expect(JSON.stringify(r)).not.toContain('COMPLY360')
  })
})

describe('cleanContractContent — formato real del usuario (inline)', () => {
  it('procesa el formato problemático completo de un solo bloque', () => {
    const input =
      'PRIMERA.- DE LAS PARTES (CLAUSULA OBLIGATORIA) El presente contrato se celebra entre ' +
      'CORPORACION AG S.A.C., con RUC 20612718106, representada por inversiones aduanera ' +
      'aduaner, con domicilio en {{domicilio_empleador}}, y Amado Yury Jara Carranza, ' +
      'identificado con DNI 73061764, con domicilio en {{domicilio_trabajador}}.\n' +
      'Base legal: D.S. 003-97-TR Art. 4'
    const r = cleanContractContent(input)
    expect(r.clauses).toHaveLength(1)
    const c = r.clauses[0]
    expect(c.isMandatory).toBe(true)
    expect(c.title).toContain('PRIMERA')
    expect(c.title).toContain('DE LAS PARTES')
    expect(c.body).not.toContain('CLAUSULA OBLIGATORIA')
    expect(c.body).not.toContain('Base legal')
    expect(c.body).toContain('[Domicilio del Empleador]')
    expect(c.body).toContain('[Domicilio del Trabajador]')
    expect(c.baseLegal).toBe('D.S. 003-97-TR Art. 4')
  })

  it('procesa varias cláusulas inline encadenadas con doble salto', () => {
    const input =
      'PRIMERA.- DE LAS PARTES (CLAUSULA OBLIGATORIA) El presente contrato.\n' +
      'Base legal: D.S. 003-97-TR Art. 4\n\n' +
      'SEGUNDA.- ANTECEDENTES (CLAUSULA OBLIGATORIA) La empresa requiere personal.\n' +
      'Base legal: D.S. 003-97-TR Art. 5'
    const r = cleanContractContent(input)
    expect(r.clauses).toHaveLength(2)
    expect(r.clauses[0].baseLegal).toBe('D.S. 003-97-TR Art. 4')
    expect(r.clauses[1].baseLegal).toBe('D.S. 003-97-TR Art. 5')
    expect(r.clauses[0].isMandatory).toBe(true)
    expect(r.clauses[1].isMandatory).toBe(true)
  })
})

describe('cleanContractContent — formato block (template legacy)', () => {
  it('procesa título separado del cuerpo por blank line', () => {
    const input =
      'PRIMERA.- OBJETO DEL CONTRATO\n\n' +
      'EL EMPLEADOR contrata los servicios del TRABAJADOR para que desempeñe el cargo de Analista.'
    const r = cleanContractContent(input)
    expect(r.clauses).toHaveLength(1)
    expect(r.clauses[0].title).toBe('PRIMERA: OBJETO DEL CONTRATO')
    expect(r.clauses[0].body).toContain('EL EMPLEADOR contrata')
    expect(r.clauses[0].baseLegal).toBeNull()
  })
})
