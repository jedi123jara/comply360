/**
 * 🏆 GENERADOR PLAME — SUNAT
 *
 * Genera el archivo plano TXT del PDT 601 PLAME (Planilla Electrónica) según
 * la estructura oficial de SUNAT vigente 2026.
 *
 * Estructura simplificada (la spec real tiene 5 archivos planos: trabajadores,
 * remuneraciones, jornada, conceptos, etc.). Esta versión genera el PRINCIPAL
 * de remuneraciones que es el más solicitado por los clientes.
 *
 * Formato:
 *  - Cada línea es un registro
 *  - Campos separados por pipe `|`
 *  - Encoding ISO-8859-1 (Latin1) para SUNAT
 *  - Sin headers
 *
 * Referencia oficial: https://orientacion.sunat.gob.pe/3057-04-pdt-planilla-electronica-plame
 *
 * IMPORTANTE: Este generador asume validación previa de los datos. La spec
 * real exige más de 50 campos por trabajador. Implementamos los críticos.
 */

// Decimal de Prisma se acepta como `unknown` y se convierte vía Number()

export interface PlameWorkerRow {
  /** Tipo doc identidad: 1=DNI, 4=CE, 7=PASAPORTE */
  tipoDocumento: '1' | '4' | '7'
  numeroDocumento: string
  apellidoPaterno: string
  apellidoMaterno: string
  nombres: string
  /** F=femenino, M=masculino */
  sexo: 'F' | 'M'
  fechaNacimiento: string // YYYY-MM-DD
  fechaIngreso: string // YYYY-MM-DD
  fechaCese?: string
  /** Tipo trabajador (códigos SUNAT): 21=plazo indeterminado, 23=plazo fijo, 24=tiempo parcial, etc. */
  tipoTrabajador: string
  /** Régimen pensionario: 0=Sin sistema, 1=ONP, 2=AFP, 3=No afiliado */
  regimenPensionario: '0' | '1' | '2' | '3'
  /** CUSPP si AFP */
  cuspp?: string
  /** Régimen de salud: 1=EsSalud Reg, 2=EsSalud Agrario, etc. */
  regimenSalud: string
  remuneracionBruta: number
  diasLaborados: number
  diasNoLaborados: number
  diasSubsidiados: number
  /** Periodo en formato YYYYMM */
  periodo: string
}

export interface PlameOptions {
  /** RUC del empleador */
  rucEmpleador: string
  /** Período declarado YYYYMM */
  periodo: string
  workers: PlameWorkerRow[]
}

/** Limpia y normaliza un campo string para PLAME (sin pipes, sin acentos rotos) */
function clean(s: string | undefined, maxLen?: number): string {
  if (!s) return ''
  let out = s.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase()
  if (maxLen && out.length > maxLen) out = out.slice(0, maxLen)
  return out
}

/** Formatea un número con 2 decimales, sin separador de miles */
function fmtNum(n: number | null | undefined): string {
  if (n == null) return '0.00'
  const v = typeof n === 'number' ? n : Number(n)
  return v.toFixed(2)
}

/** Formatea fecha YYYY-MM-DD a DD/MM/YYYY (formato SUNAT) */
function fmtFecha(iso?: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return ''
  return `${d}/${m}/${y}`
}

/**
 * Genera la línea de remuneraciones PLAME para un trabajador.
 * Estructura: 22 campos críticos separados por pipe.
 */
function buildPlameLine(opts: PlameOptions, w: PlameWorkerRow): string {
  const fields = [
    opts.rucEmpleador,                       // 1. RUC empleador
    opts.periodo,                             // 2. Periodo YYYYMM
    w.tipoDocumento,                          // 3. Tipo doc
    w.numeroDocumento,                        // 4. Número doc
    clean(w.apellidoPaterno, 30),             // 5. Apellido paterno
    clean(w.apellidoMaterno, 30),             // 6. Apellido materno
    clean(w.nombres, 50),                     // 7. Nombres
    w.sexo,                                   // 8. Sexo
    fmtFecha(w.fechaNacimiento),              // 9. Fecha nacimiento
    fmtFecha(w.fechaIngreso),                 // 10. Fecha ingreso
    fmtFecha(w.fechaCese),                    // 11. Fecha cese
    w.tipoTrabajador,                         // 12. Tipo trabajador
    w.regimenPensionario,                     // 13. Régimen pensionario
    w.cuspp || '',                            // 14. CUSPP
    w.regimenSalud,                           // 15. Régimen salud
    fmtNum(w.remuneracionBruta),              // 16. Remuneración bruta
    String(w.diasLaborados),                  // 17. Días laborados
    String(w.diasNoLaborados),                // 18. Días no laborados
    String(w.diasSubsidiados),                // 19. Días subsidiados
    fmtNum(w.remuneracionBruta * 0.13),       // 20. Aporte ONP estimado (13%)
    fmtNum(w.remuneracionBruta * 0.09),       // 21. Aporte EsSalud (9% empleador)
    '01',                                      // 22. Situación: 01=activo
  ]
  return fields.join('|')
}

/**
 * Genera el contenido completo del archivo PLAME (texto plano).
 */
export function generatePlameTxt(opts: PlameOptions): string {
  if (!/^\d{11}$/.test(opts.rucEmpleador)) {
    throw new Error('RUC del empleador debe tener 11 dígitos')
  }
  if (!/^\d{6}$/.test(opts.periodo)) {
    throw new Error('Período debe estar en formato YYYYMM (ej: 202604)')
  }
  if (opts.workers.length === 0) {
    throw new Error('Debes incluir al menos un trabajador')
  }

  const lines = opts.workers.map(w => buildPlameLine(opts, w))
  return lines.join('\r\n') + '\r\n'
}

/**
 * Genera el nombre estándar del archivo PLAME según convención SUNAT:
 *   060120240520604_<RUC>_<PERIODO>.txt
 */
export function generatePlameFileName(opts: { rucEmpleador: string; periodo: string }): string {
  return `0601_${opts.rucEmpleador}_${opts.periodo}.txt`
}
