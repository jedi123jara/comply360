#!/usr/bin/env node
/**
 * Ingest SUNAFIL Checklists (material oficial del pack "Compensaciones 30°").
 *
 * Input:
 *   - IMPRIMIR/01 Check List Auditoría Laboral.xlsx (21 sheets, ~300 checkpoints)
 *   - IMPRIMIR/02 Check List Infracciones del sistema inspectivo.xlsx (8 sheets, 204 infracciones)
 *
 * Output:
 *   - src/data/legal/audit-checklist.ts      — preguntas del diagnóstico
 *   - src/data/legal/infracciones-sunafil.ts — infracciones para el simulacro
 *
 * Corre con:
 *   node scripts/ingest/ingest-checklists.mjs
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..', '..')
const SRC_AUDIT = 'C:/Users/User/Desktop/IMPRIMIR/01 Check List Auditoría Laboral.xlsx'
const SRC_INFRAC = 'C:/Users/User/Desktop/IMPRIMIR/02 Check List  Infracciones del sistema inspectivo.xlsx'

// Slugify ASCII for stable ids
function slug(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

// Trim + collapse whitespace
function clean(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim()
}

/* ────────────────────────────────────────────────────────────────────
 * AUDIT CHECKLIST — 21 sections
 * ──────────────────────────────────────────────────────────────────── */

const SECTION_META = {
  'I. Inic. Relac. Trab.': { key: 'inicio-relacion', label: 'Inicio de la relación de trabajo', area: 'contratacion', weight: 8 },
  'II. Oblig. a la Contratación': { key: 'contratacion', label: 'Obligaciones de contratación', area: 'contratacion', weight: 10 },
  'III. Oblig. a Remuneraciones': { key: 'remuneraciones', label: 'Remuneraciones', area: 'remuneraciones', weight: 10 },
  'IV. Oblig. a Rem. y Benef. Soc.': { key: 'beneficios-sociales', label: 'Beneficios sociales (CTS, gratificación, vacaciones)', area: 'beneficios', weight: 12 },
  'V. Trab. Tto. Especial': { key: 'trato-especial', label: 'Trabajadores de trato especial', area: 'contratacion', weight: 4 },
  'VI. Oblig. Relac. Lab': { key: 'relaciones-colectivas', label: 'Relaciones laborales', area: 'relaciones-laborales', weight: 5 },
  'VII. Oblig. Protec. Trab.': { key: 'proteccion-trabajador', label: 'Protección del trabajador', area: 'relaciones-laborales', weight: 6 },
  'VIII. Oblig. Des. Relac. Trab.': { key: 'extincion', label: 'Extinción de la relación de trabajo', area: 'cese', weight: 8 },
  'IX. Jornadas Trab.': { key: 'jornadas', label: 'Jornadas de trabajo', area: 'jornada', weight: 6 },
  'X. Descansos Remun.': { key: 'descansos', label: 'Descansos remunerados', area: 'jornada', weight: 5 },
  'XI. Licencias': { key: 'licencias', label: 'Licencias', area: 'beneficios', weight: 4 },
  'XII. Reg. Exib. y Com.': { key: 'registros', label: 'Registros, exhibiciones y comunicaciones', area: 'documentos', weight: 5 },
  'XIII. SST': { key: 'sst', label: 'Seguridad y Salud en el Trabajo', area: 'sst', weight: 15 },
  'XIV. Oblig. Seg. Social': { key: 'seguridad-social', label: 'Seguridad social', area: 'planilla', weight: 8 },
  'XV. Oblig. Dis. Adm.': { key: 'administraciones', label: 'Obligaciones frente a administraciones', area: 'documentos', weight: 4 },
  'XVI. Oblig. Frente a SUNAFIL': { key: 'sunafil', label: 'Obligaciones frente a SUNAFIL', area: 'documentos', weight: 6 },
  'XVII. Oblig. Trib. Lab': { key: 'tributacion', label: 'Obligaciones tributarias laborales', area: 'planilla', weight: 6 },
  'XVIII. Oblig. RCT': { key: 'rct', label: 'Reglamento Interno de Trabajo', area: 'documentos', weight: 3 },
  'XIX. Doc. y Otras Oblig.': { key: 'documentacion', label: 'Documentación y otras obligaciones', area: 'documentos', weight: 5 },
}

function parseAuditChecklist() {
  const wb = XLSX.readFile(SRC_AUDIT)
  const sections = []
  let totalQ = 0

  for (const sheetName of wb.SheetNames) {
    const meta = SECTION_META[sheetName]
    if (!meta) continue // Skip "Checklist - Continuo/Imprimir" covers

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })
    const questions = []

    let currentParent = null // Question that has sub-items
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const col0 = clean(row[0])
      const col1 = clean(row[1])

      // Skip header rows
      if (!col0) continue
      if (col0.match(/^(CHECKLIST|Cumple|Sí$|^Sí\s*\/|^[IVX]+\.)/)) continue
      if (col0 === 'Sí' || col0 === 'No' || col0 === '+/-' || col0 === 'Observaciones') continue

      // Heuristic: col0 is parent question; if col1 has content, it's a sub-item
      if (col0.startsWith('Verificar') || col0.startsWith('Obligaci') || col0.startsWith('Del ') || col0.startsWith('El ') || col0.startsWith('No ') || col0.match(/^(Cumplimiento|Establecer|Respecto|Pago|Impedir)/)) {
        currentParent = col0
        // If this row also has col1, treat as "parent + first subitem"
        if (col1) {
          questions.push({
            id: slug(`${meta.key}-${currentParent}-${col1}`),
            parent: currentParent,
            question: `${currentParent}: ${col1}`,
            area: meta.area,
          })
        } else {
          questions.push({
            id: slug(`${meta.key}-${currentParent}`),
            question: currentParent,
            area: meta.area,
          })
        }
      } else if (currentParent && col0.length > 3) {
        // Sub-item of currentParent
        questions.push({
          id: slug(`${meta.key}-${currentParent}-${col0}`),
          parent: currentParent,
          question: `${currentParent}: ${col0}`,
          area: meta.area,
        })
      }
    }

    if (questions.length > 0) {
      sections.push({
        ...meta,
        sheet: sheetName,
        count: questions.length,
        questions,
      })
      totalQ += questions.length
    }
  }

  return { sections, totalQ }
}

/* ────────────────────────────────────────────────────────────────────
 * INFRACCIONES SUNAFIL — 8 sections, 204 tipificadas
 * ──────────────────────────────────────────────────────────────────── */

const INFRAC_META = {
  'I. Relac. Laborales': { key: 'relaciones-laborales', label: 'Relaciones laborales', category: 'RELACIONES_LABORALES' },
  'II. SST': { key: 'sst', label: 'Seguridad y Salud en el Trabajo', category: 'SST' },
  'III. Empleo y Colocación': { key: 'empleo', label: 'Empleo y Colocación', category: 'EMPLEO' },
  'IV. Intermed. y Tercer. Lab.': { key: 'intermediacion', label: 'Intermediación y Tercerización', category: 'INTERMEDIACION' },
  'V. Prom. y Form. Lab.': { key: 'promocion-formativa', label: 'Promoción y formación laboral', category: 'FORMATIVA' },
  'VI. Cont. de Trab. Extran.': { key: 'extranjeros', label: 'Contratación de trabajadores extranjeros', category: 'EXTRANJEROS' },
  'VII. Seg. Social': { key: 'seguridad-social', label: 'Seguridad social', category: 'SEGURIDAD_SOCIAL' },
  'VIII. A la Labor Inspectiva': { key: 'labor-inspectiva', label: 'A la labor inspectiva', category: 'INSPECTIVA' },
}

function detectGravity(text) {
  const t = text.toLowerCase()
  if (t.includes('muy grave')) return 'MUY_GRAVE'
  if (t.includes('grave')) return 'GRAVE'
  if (t.includes('leve')) return 'LEVE'
  return null
}

function parseInfracciones() {
  const wb = XLSX.readFile(SRC_INFRAC)
  const sections = []
  let total = 0

  for (const sheetName of wb.SheetNames) {
    const meta = INFRAC_META[sheetName]
    if (!meta) continue

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })
    const items = []
    let currentGravity = null
    let currentParent = null

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const col0 = clean(row[0])
      const col1 = clean(row[1])

      if (!col0) continue
      if (col0 === 'Sí' || col0 === 'No' || col0 === '+/-' || col0 === 'Observaciones') continue

      // Gravity headers: "Infracciones leves en ...", "Infracciones graves ...", etc.
      const gravity = detectGravity(col0)
      if (gravity && col0.startsWith('Infracciones')) {
        currentGravity = gravity
        continue
      }
      if (col0.match(/^I+\./) || col0.match(/^Cumple/)) continue

      // Most rows are either parents (col0 with content) or sub-items (col1 with content)
      if (col0.length > 15 && !col0.toLowerCase().startsWith('siempre')) {
        if (col0.endsWith(':') || (col1 && col1.length > 5)) {
          currentParent = col0.replace(/:$/, '')
          if (col1) {
            items.push({
              id: slug(`${meta.key}-${currentParent}-${col1}`),
              parent: currentParent,
              description: `${currentParent}: ${col1}`,
              gravity: currentGravity ?? 'LEVE',
              category: meta.category,
            })
          } else {
            items.push({
              id: slug(`${meta.key}-${currentParent}`),
              description: currentParent,
              gravity: currentGravity ?? 'LEVE',
              category: meta.category,
            })
          }
        } else if (currentParent) {
          items.push({
            id: slug(`${meta.key}-${currentParent}-${col0}`),
            parent: currentParent,
            description: `${currentParent}: ${col0}`,
            gravity: currentGravity ?? 'LEVE',
            category: meta.category,
          })
        }
      }
    }

    if (items.length > 0) {
      sections.push({
        ...meta,
        sheet: sheetName,
        count: items.length,
        items,
      })
      total += items.length
    }
  }

  return { sections, total }
}

/* ────────────────────────────────────────────────────────────────────
 * EMIT TS FILES
 * ──────────────────────────────────────────────────────────────────── */

function emitAuditChecklist({ sections, totalQ }) {
  const out = `/**
 * SUNAFIL — Checklist de Auditoría Laboral (OFICIAL)
 *
 * Fuente: "01 Check List Auditoría Laboral.xlsx" del pack
 * Compensaciones Laborales 30° (Gaceta Jurídica / Contadores & Empresas).
 *
 * Generado automáticamente por scripts/ingest/ingest-checklists.mjs.
 * NO EDITAR A MANO — regenerar con: \`node scripts/ingest/ingest-checklists.mjs\`.
 *
 * Total: ${sections.length} secciones · ${totalQ} preguntas.
 */

export interface AuditQuestion {
  /** ID estable (slug). */
  id: string
  /** Pregunta padre (agrupa sub-items). */
  parent?: string
  /** Texto completo de la pregunta. */
  question: string
  /** Área del compliance score a la que pertenece. */
  area: string
}

export interface AuditSection {
  /** Slug único de la sección. */
  key: string
  /** Label humano. */
  label: string
  /** Área del score (matches legal-engine/compliance areas). */
  area: string
  /** Peso relativo en el score global (0-100). */
  weight: number
  /** Nombre original del sheet en el xlsx. */
  sheet: string
  /** Total de preguntas en esta sección. */
  count: number
  /** Lista de preguntas. */
  questions: readonly AuditQuestion[]
}

/**
 * Respuestas posibles a cada pregunta del checklist.
 * Coinciden con la convención SUNAFIL: Sí / Parcial (+/-) / No.
 */
export type AuditAnswer = 'SI' | 'PARCIAL' | 'NO' | 'NA'

/**
 * Secciones completas del checklist oficial.
 */
export const AUDIT_SECTIONS: readonly AuditSection[] = ${JSON.stringify(sections, null, 2)} as const

/**
 * Vista plana de todas las preguntas.
 */
export const AUDIT_QUESTIONS: readonly AuditQuestion[] = AUDIT_SECTIONS.flatMap(s => s.questions)

/**
 * Total de preguntas del checklist.
 */
export const AUDIT_TOTAL: number = ${totalQ}

/**
 * Mapa sección-key → sección completa.
 */
export const AUDIT_BY_KEY: Readonly<Record<string, AuditSection>> = Object.fromEntries(
  AUDIT_SECTIONS.map(s => [s.key, s])
)
`
  fs.writeFileSync(path.join(ROOT, 'src/data/legal/audit-checklist.ts'), out, 'utf8')
  console.log(`✔ audit-checklist.ts emitted (${sections.length} sections, ${totalQ} questions)`)
}

function emitInfracciones({ sections, total }) {
  const out = `/**
 * SUNAFIL — Infracciones del sistema inspectivo (TIPIFICADAS)
 *
 * Fuente: "02 Check List Infracciones del sistema inspectivo.xlsx" del pack
 * Compensaciones Laborales 30°.
 *
 * Generado automáticamente por scripts/ingest/ingest-checklists.mjs.
 * NO EDITAR A MANO — regenerar con: \`node scripts/ingest/ingest-checklists.mjs\`.
 *
 * Total: ${sections.length} categorías · ${total} infracciones tipificadas.
 *
 * Cada infracción puede clasificarse como LEVE, GRAVE o MUY_GRAVE
 * (D.S. 019-2006-TR — Reglamento de la Ley General de Inspección del Trabajo).
 */

export type InfracGravity = 'LEVE' | 'GRAVE' | 'MUY_GRAVE'

export interface InfraccionSunafil {
  /** ID estable (slug). */
  id: string
  /** Descripción completa (padre + sub-item si aplica). */
  description: string
  /** Infracción "padre" que agrupa sub-items del mismo tipo. */
  parent?: string
  /** Gravedad oficial según el reglamento. */
  gravity: InfracGravity
  /** Materia / categoría SUNAFIL. */
  category: string
}

export interface InfracSection {
  key: string
  label: string
  category: string
  sheet: string
  count: number
  items: readonly InfraccionSunafil[]
}

/**
 * Todas las secciones de infracciones agrupadas por materia.
 */
export const INFRAC_SECTIONS: readonly InfracSection[] = ${JSON.stringify(sections, null, 2)} as const

/**
 * Vista plana de todas las infracciones tipificadas.
 */
export const INFRACCIONES: readonly InfraccionSunafil[] = INFRAC_SECTIONS.flatMap(s => s.items)

/**
 * Total de infracciones.
 */
export const INFRAC_TOTAL: number = ${total}

/**
 * Mapa category → sección completa.
 */
export const INFRAC_BY_CATEGORY: Readonly<Record<string, InfracSection>> = Object.fromEntries(
  INFRAC_SECTIONS.map(s => [s.category, s])
)

/**
 * Conteo rápido por gravedad.
 */
export const INFRAC_COUNT_BY_GRAVITY: Readonly<Record<InfracGravity, number>> = INFRACCIONES.reduce(
  (acc, i) => ({ ...acc, [i.gravity]: (acc[i.gravity] ?? 0) + 1 }),
  { LEVE: 0, GRAVE: 0, MUY_GRAVE: 0 } as Record<InfracGravity, number>
)
`
  fs.writeFileSync(path.join(ROOT, 'src/data/legal/infracciones-sunafil.ts'), out, 'utf8')
  console.log(`✔ infracciones-sunafil.ts emitted (${sections.length} categories, ${total} infracciones)`)
}

/* ───────────────────────────────── RUN ───────────────────────────────── */

console.log('\n── SUNAFIL Checklist Ingest ──\n')
console.log('📂 Reading', path.basename(SRC_AUDIT))
const audit = parseAuditChecklist()
console.log(`  → ${audit.sections.length} secciones · ${audit.totalQ} preguntas`)
emitAuditChecklist(audit)

console.log('\n📂 Reading', path.basename(SRC_INFRAC))
const infrac = parseInfracciones()
console.log(`  → ${infrac.sections.length} categorías · ${infrac.total} infracciones`)
console.log('  Por gravedad:')
for (const grav of ['LEVE', 'GRAVE', 'MUY_GRAVE']) {
  const n = infrac.sections.flatMap(s => s.items).filter(i => i.gravity === grav).length
  console.log(`    - ${grav}: ${n}`)
}
emitInfracciones(infrac)

console.log('\n✔ Done.\n')
