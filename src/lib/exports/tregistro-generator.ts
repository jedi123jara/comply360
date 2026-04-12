/**
 * 🏆 GENERADOR T-REGISTRO — SUNAT
 *
 * Genera el archivo plano TXT del T-REGISTRO (Registro de Información Laboral)
 * para alta/baja/modificación de trabajadores en SUNAT.
 *
 * Formato:
 *  - Líneas separadas por CR+LF
 *  - Campos separados por pipe `|`
 *  - Encoding ISO-8859-1
 *  - 1 línea = 1 trabajador
 *
 * Referencia: https://orientacion.sunat.gob.pe/3060-01-pdt-planilla-electronica-treg
 */

export interface TRegistroRow {
  /** A=Alta, B=Baja, M=Modificación */
  tipoOperacion: 'A' | 'B' | 'M'
  tipoDocumento: '1' | '4' | '7'
  numeroDocumento: string
  apellidoPaterno: string
  apellidoMaterno: string
  nombres: string
  sexo: 'F' | 'M'
  fechaNacimiento: string // YYYY-MM-DD
  nacionalidad: string // código ISO o "PE"
  fechaIngreso: string
  fechaCese?: string
  motivoCese?: string
  tipoContrato: string // código SUNAT
  ocupacion: string
  /** Nivel educativo: 01..10 */
  nivelEducativo?: string
  /** Discapacidad: S/N */
  discapacidad: 'S' | 'N'
  /** Domicilio actual */
  direccion?: string
  ubigeo?: string // 6 dígitos
  /** Régimen laboral SUNAT */
  regimenLaboral: string
  /** Sistema pensión: 01=ONP, 02=AFP, 03=Sin sistema */
  sistemaPension: '01' | '02' | '03'
  cuspp?: string
  ocurrenciaPension?: string
  /** Régimen salud */
  regimenSalud: string
  /** Sujeto a EsSalud Vida */
  esSaludVida: 'S' | 'N'
  /** Sujeto a SCTR */
  sctr: 'S' | 'N'
  /** Asegura EsSalud + EPS */
  tipoSeguro?: string
  /** Trabajo doméstico */
  trabajoDomestico: 'S' | 'N'
  /** Discapacidad acreditada con certificado */
  certificadoDiscapacidad?: 'S' | 'N'
  /** Periodo (YYYYMM) */
  periodo: string
}

export interface TRegistroOptions {
  rucEmpleador: string
  workers: TRegistroRow[]
}

function clean(s: string | undefined, maxLen?: number): string {
  if (!s) return ''
  let out = s.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase()
  if (maxLen && out.length > maxLen) out = out.slice(0, maxLen)
  return out
}

function fmtFecha(iso?: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return ''
  return `${d}/${m}/${y}`
}

function buildLine(opts: TRegistroOptions, w: TRegistroRow): string {
  const fields = [
    opts.rucEmpleador,
    w.tipoOperacion,
    w.tipoDocumento,
    w.numeroDocumento,
    clean(w.apellidoPaterno, 30),
    clean(w.apellidoMaterno, 30),
    clean(w.nombres, 50),
    w.sexo,
    fmtFecha(w.fechaNacimiento),
    clean(w.nacionalidad, 3) || 'PE',
    fmtFecha(w.fechaIngreso),
    fmtFecha(w.fechaCese),
    clean(w.motivoCese, 100),
    w.tipoContrato,
    clean(w.ocupacion, 100),
    w.nivelEducativo || '',
    w.discapacidad,
    clean(w.direccion, 200),
    w.ubigeo || '',
    w.regimenLaboral,
    w.sistemaPension,
    w.cuspp || '',
    w.ocurrenciaPension || '',
    w.regimenSalud,
    w.esSaludVida,
    w.sctr,
    w.tipoSeguro || '',
    w.trabajoDomestico,
    w.certificadoDiscapacidad || 'N',
    w.periodo,
  ]
  return fields.join('|')
}

export function generateTRegistroTxt(opts: TRegistroOptions): string {
  if (!/^\d{11}$/.test(opts.rucEmpleador)) {
    throw new Error('RUC del empleador debe tener 11 dígitos')
  }
  if (opts.workers.length === 0) {
    throw new Error('Debes incluir al menos un trabajador')
  }
  const lines = opts.workers.map(w => buildLine(opts, w))
  return lines.join('\r\n') + '\r\n'
}

export function generateTRegistroFileName(opts: { rucEmpleador: string; periodo: string }): string {
  return `TREG_${opts.rucEmpleador}_${opts.periodo}.txt`
}
