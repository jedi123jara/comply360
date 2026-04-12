/**
 * 🏆 AUDITOR DE IGUALDAD SALARIAL — Ley 30709 / D.S. 002-2018-TR
 *
 * Analiza la planilla agrupando trabajadores por categoría/puesto y calcula
 * la brecha salarial entre hombres y mujeres dentro de cada categoría.
 *
 * Marco legal:
 *  - Ley 30709 (prohibición de discriminación remunerativa)
 *  - D.S. 002-2018-TR (reglamento)
 *  - Cuadros de categorías y funciones obligatorios
 *  - SUNAFIL fiscaliza activamente desde 2024
 *
 * Output: brecha porcentual por categoría + score global + recomendaciones.
 */

export interface PayEquityWorker {
  id: string
  firstName: string
  lastName: string
  gender: 'M' | 'F' | string | null | undefined
  position: string | null | undefined
  sueldoBruto: number
}

export interface PayEquityCategory {
  /** Nombre de la categoría (puesto) */
  categoria: string
  /** Total trabajadores en la categoría */
  total: number
  hombres: number
  mujeres: number
  promedioHombres: number
  promedioMujeres: number
  /** Brecha en %  positivo = hombres ganan más; negativo = mujeres ganan más */
  brechaPorcentaje: number
  /** Diferencia absoluta en soles */
  diferenciaAbsolutaSoles: number
  /** Severidad del hallazgo */
  severidad: 'OK' | 'LEVE' | 'MODERADA' | 'CRITICA'
  /** Razón / contexto */
  observacion: string
}

export interface PayEquityReport {
  fecha: string
  totalTrabajadores: number
  totalCategorias: number
  categoriasEvaluables: number // categorías con al menos 1 hombre y 1 mujer
  brechaPromedioGlobal: number
  scoreEquidad: number // 0-100
  categorias: PayEquityCategory[]
  /** Categorías con brecha crítica (>15%) */
  criticas: PayEquityCategory[]
  recomendaciones: string[]
  /** Cuadro general de categorías sugerido (Art. 5 D.S. 002-2018-TR) */
  cuadroCategorias: Array<{
    categoria: string
    funcionesRepresentativas: string
    rangoSalarial: { min: number; max: number; promedio: number }
  }>
}

function severidadFromBrecha(brecha: number): PayEquityCategory['severidad'] {
  const abs = Math.abs(brecha)
  if (abs <= 5) return 'OK'
  if (abs <= 10) return 'LEVE'
  if (abs <= 15) return 'MODERADA'
  return 'CRITICA'
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function analyzePayEquity(workers: PayEquityWorker[]): PayEquityReport {
  // Agrupar por categoría (position normalizada)
  const grupos = new Map<string, PayEquityWorker[]>()
  for (const w of workers) {
    const key = (w.position || 'Sin clasificar').trim()
    const list = grupos.get(key) || []
    list.push(w)
    grupos.set(key, list)
  }

  const categorias: PayEquityCategory[] = []
  const cuadroCategorias: PayEquityReport['cuadroCategorias'] = []

  for (const [categoria, miembros] of grupos.entries()) {
    const sueldos = miembros.map(m => m.sueldoBruto).filter(s => s > 0)
    const min = Math.min(...sueldos)
    const max = Math.max(...sueldos)
    const promedio = avg(sueldos)
    cuadroCategorias.push({
      categoria,
      funcionesRepresentativas: `Funciones de ${categoria.toLowerCase()} según organigrama`,
      rangoSalarial: { min, max, promedio: Math.round(promedio * 100) / 100 },
    })

    const hombres = miembros.filter(m => m.gender === 'M')
    const mujeres = miembros.filter(m => m.gender === 'F')
    const promH = avg(hombres.map(h => h.sueldoBruto))
    const promM = avg(mujeres.map(m => m.sueldoBruto))

    let brecha = 0
    let observacion = ''
    let severidad: PayEquityCategory['severidad'] = 'OK'

    if (hombres.length === 0 || mujeres.length === 0) {
      observacion =
        hombres.length === 0
          ? 'No hay hombres en esta categoría — brecha no calculable'
          : 'No hay mujeres en esta categoría — brecha no calculable'
    } else {
      brecha = ((promH - promM) / promH) * 100
      severidad = severidadFromBrecha(brecha)
      observacion =
        brecha > 0
          ? `Los hombres ganan en promedio ${brecha.toFixed(1)}% más`
          : `Las mujeres ganan en promedio ${Math.abs(brecha).toFixed(1)}% más`
    }

    categorias.push({
      categoria,
      total: miembros.length,
      hombres: hombres.length,
      mujeres: mujeres.length,
      promedioHombres: Math.round(promH * 100) / 100,
      promedioMujeres: Math.round(promM * 100) / 100,
      brechaPorcentaje: Math.round(brecha * 100) / 100,
      diferenciaAbsolutaSoles: Math.round((promH - promM) * 100) / 100,
      severidad,
      observacion,
    })
  }

  // Métricas globales: solo evaluables
  const evaluables = categorias.filter(c => c.severidad !== 'OK' || (c.hombres > 0 && c.mujeres > 0))
  const calculables = categorias.filter(c => c.hombres > 0 && c.mujeres > 0)
  const brechaPromedioGlobal =
    calculables.length === 0
      ? 0
      : Math.round(
          (calculables.reduce((acc, c) => acc + Math.abs(c.brechaPorcentaje), 0) / calculables.length) * 100
        ) / 100

  // Score equidad: 100 - penalización por brechas
  const penalizacion = categorias.reduce((acc, c) => {
    if (c.severidad === 'CRITICA') return acc + 25
    if (c.severidad === 'MODERADA') return acc + 12
    if (c.severidad === 'LEVE') return acc + 5
    return acc
  }, 0)
  const scoreEquidad = Math.max(0, Math.min(100, 100 - penalizacion))

  const criticas = categorias.filter(c => c.severidad === 'CRITICA')

  const recomendaciones: string[] = []
  if (criticas.length > 0) {
    recomendaciones.push(
      `🚨 ${criticas.length} categoría(s) presentan brecha CRÍTICA (>15%). Riesgo alto de denuncia ante SUNAFIL/MTPE.`
    )
    recomendaciones.push(
      'Realizar revisión salarial inmediata en las categorías críticas y documentar las razones objetivas (experiencia, productividad, etc.)'
    )
  }
  if (categorias.some(c => c.severidad === 'MODERADA')) {
    recomendaciones.push(
      'Establecer un plan de nivelación salarial gradual (3-6 meses) para las categorías con brecha moderada'
    )
  }
  recomendaciones.push(
    'Mantener actualizado el cuadro general de categorías y funciones (Art. 5 D.S. 002-2018-TR)'
  )
  recomendaciones.push(
    'Documentar la política remunerativa por escrito y comunicarla a los trabajadores (Art. 6)'
  )
  if (workers.length >= 50) {
    recomendaciones.push(
      'Empresas con ≥50 trabajadores: presentar el cuadro de categorías al MTPE cuando sea requerido'
    )
  }

  return {
    fecha: new Date().toISOString(),
    totalTrabajadores: workers.length,
    totalCategorias: categorias.length,
    categoriasEvaluables: evaluables.length,
    brechaPromedioGlobal,
    scoreEquidad,
    categorias: categorias.sort(
      (a, b) => Math.abs(b.brechaPorcentaje) - Math.abs(a.brechaPorcentaje)
    ),
    criticas,
    recomendaciones,
    cuadroCategorias: cuadroCategorias.sort((a, b) => a.categoria.localeCompare(b.categoria)),
  }
}
