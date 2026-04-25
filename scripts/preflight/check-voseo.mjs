#!/usr/bin/env node
/**
 * check-voseo.mjs
 *
 * Comply360 escribe siempre en español peruano con tuteo neutro. Nunca voseo.
 * Este script falla en CI si encuentra conjugaciones voseo en `src/`,
 * y en modo `--fix` aplica reemplazos automáticos seguros.
 *
 * Uso:
 *   node scripts/preflight/check-voseo.mjs           # check, exit 1 si hay hits
 *   node scripts/preflight/check-voseo.mjs --fix     # aplica reemplazos
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(process.cwd(), 'src')
const FIX = process.argv.includes('--fix')

// Reemplazos inequívocos voseo → tuteo neutro peruano.
// Cada entrada respeta capitalización inicial y mantiene lo demás literal.
// Solo formas que NO colisionan con pasado simple yo, formal nosotros, etc.
const REPLACEMENTS = [
  // Indicativo presente 2da persona (vos)
  ['tenés', 'tienes'],
  ['podés', 'puedes'],
  ['querés', 'quieres'],
  ['sabés', 'sabes'],
  ['hacés', 'haces'],
  ['usás', 'usas'],
  ['cobrás', 'cobras'],
  ['firmás', 'firmas'],
  ['elegís', 'eliges'],
  ['respondés', 'respondes'],
  ['cerrás', 'cierras'],
  ['obtenés', 'obtienes'],
  ['recibís', 'recibes'],
  ['contratás', 'contratas'],
  ['cancelás', 'cancelas'],
  ['subís', 'subes'],
  ['provés', 'provees'],
  ['proveés', 'provees'],
  ['marcás', 'marcas'],
  ['aceptás', 'aceptas'],
  ['leés', 'lees'],
  ['esperás', 'esperas'],
  ['conocés', 'conoces'],
  ['ingresás', 'ingresas'],
  ['probás', 'pruebas'],
  ['empezás', 'empiezas'],
  ['entendés', 'entiendes'],
  ['escuchás', 'escuchas'],
  ['pagás', 'pagas'],
  ['pegás', 'pegas'],
  ['ganás', 'ganas'],
  ['vivís', 'vives'],
  ['salís', 'sales'],
  ['venís', 'vienes'],
  ['decís', 'dices'],
  ['estás', 'estás'], // mismo en tuteo, no tocar
  // Imperativo voseo (acento en última sílaba)
  ['mirá', 'mira'],
  ['hablá', 'habla'],
  ['pasá', 'pasa'],
  ['pegá', 'pega'],
  ['ajustá', 'ajusta'],
  ['cargá', 'carga'],
  ['marcá', 'marca'],
  ['ingresá', 'ingresa'],
  ['probá', 'prueba'],
  ['empezá', 'empieza'],
  ['mantené', 'mantén'],
  ['firmá', 'firma'],
  ['usá', 'usa'],
  ['aceptá', 'acepta'],
  ['terminá', 'termina'],
  ['tomá', 'toma'],
  ['dejá', 'deja'],
  ['andá', 've'],
  ['contá', 'cuenta'],
  ['volvé', 'vuelve'],
  // Imperativo enclítico
  ['decime', 'dime'],
  ['contame', 'cuéntame'],
  ['pedile', 'pídele'],
  ['escribinos', 'escríbenos'],
  ['mandame', 'mándame'],
  ['fijate', 'fíjate'],
  ['ponele', 'ponle'],
  ['llamame', 'llámame'],
  // Capitalizadas
  ['Tenés', 'Tienes'],
  ['Podés', 'Puedes'],
  ['Querés', 'Quieres'],
  ['Sabés', 'Sabes'],
  ['Hacés', 'Haces'],
  ['Usás', 'Usas'],
  ['Cobrás', 'Cobras'],
  ['Firmás', 'Firmas'],
  ['Elegís', 'Eliges'],
  ['Respondés', 'Respondes'],
  ['Cerrás', 'Cierras'],
  ['Obtenés', 'Obtienes'],
  ['Recibís', 'Recibes'],
  ['Contratás', 'Contratas'],
  ['Cancelás', 'Cancelas'],
  ['Subís', 'Subes'],
  ['Aceptás', 'Aceptas'],
  ['Pagás', 'Pagas'],
  ['Ganás', 'Ganas'],
  ['Pegás', 'Pegas'],
  ['Marcás', 'Marcas'],
  ['Provés', 'Provees'],
  ['Proveés', 'Provees'],
  ['Esperás', 'Esperas'],
  ['Conocés', 'Conoces'],
  ['Ingresás', 'Ingresas'],
  ['Probás', 'Pruebas'],
  ['Empezás', 'Empiezas'],
  ['Entendés', 'Entiendes'],
  ['Escuchás', 'Escuchas'],
  ['Vivís', 'Vives'],
  ['Salís', 'Sales'],
  ['Venís', 'Vienes'],
  ['Decís', 'Dices'],
  ['Leés', 'Lees'],
  ['Mirá', 'Mira'],
  ['Hablá', 'Habla'],
  ['Pegá', 'Pega'],
  ['Ajustá', 'Ajusta'],
  ['Cargá', 'Carga'],
  ['Marcá', 'Marca'],
  ['Ingresá', 'Ingresa'],
  ['Probá', 'Prueba'],
  ['Empezá', 'Empieza'],
  ['Mantené', 'Mantén'],
  ['Firmá', 'Firma'],
  ['Usá', 'Usa'],
  ['Aceptá', 'Acepta'],
  ['Terminá', 'Termina'],
  ['Tomá', 'Toma'],
  ['Dejá', 'Deja'],
  ['Andá', 'Ve'],
  ['Volvé', 'Vuelve'],
  ['Seguí', 'Sigue'],
  ['Decime', 'Dime'],
  ['Contame', 'Cuéntame'],
  ['Pedile', 'Pídele'],
  ['Escribinos', 'Escríbenos'],
  ['Mandame', 'Mándame'],
  // Conjugaciones adicionales detectadas en sweeps posteriores
  ['confirmás', 'confirmas'],
  ['Confirmás', 'Confirmas'],
  ['consentís', 'consientes'],
  ['Consentís', 'Consientes'],
  ['autorizás', 'autorizas'],
  ['Autorizás', 'Autorizas'],
  ['perdés', 'pierdes'],
  ['Perdés', 'Pierdes'],
  ['preferís', 'prefieres'],
  ['Preferís', 'Prefieres'],
  ['vendés', 'vendes'],
  ['Vendés', 'Vendes'],
  // Imperativos voseo adicionales (ola 3)
  ['investigá', 'investiga'],
  ['Investigá', 'Investiga'],
  ['registrá', 'registra'],
  ['Registrá', 'Registra'],
  ['guardá', 'guarda'],
  ['Guardá', 'Guarda'],
  ['exportá', 'exporta'],
  ['Exportá', 'Exporta'],
  ['configurá', 'configura'],
  ['Configurá', 'Configura'],
  ['presentá', 'presenta'],
  ['Presentá', 'Presenta'],
  ['compartí', 'comparte'],
  ['Compartí', 'Comparte'],
  ['llamá', 'llama'],
  ['Llamá', 'Llama'],
  ['llevá', 'lleva'],
  ['Llevá', 'Lleva'],
  ['traé', 'trae'],
  ['Traé', 'Trae'],
  ['mandá', 'manda'],
  ['Mandá', 'Manda'],
  ['recordá', 'recuerda'],
  ['Recordá', 'Recuerda'],
  ['comentá', 'comenta'],
  ['Comentá', 'Comenta'],
  ['revisá', 'revisa'],
  ['Revisá', 'Revisa'],
  ['verificá', 'verifica'],
  ['Verificá', 'Verifica'],
  ['chequeá', 'chequea'],
  ['Chequeá', 'Chequea'],
  ['analizá', 'analiza'],
  ['Analizá', 'Analiza'],
  ['sumá', 'suma'],
  ['Sumá', 'Suma'],
  ['enviá', 'envía'],
  ['Enviá', 'Envía'],
  ['completá', 'completa'],
  ['Completá', 'Completa'],
  ['generá', 'genera'],
  ['Generá', 'Genera'],
  ['cargáte', 'cárgate'],
  ['conectá', 'conecta'],
  ['Conectá', 'Conecta'],
  ['exigí', 'exige'],
  ['Exigí', 'Exige'],
  ['leé', 'lee'],
  ['Leé', 'Lee'],
  // Indicativo voseo adicional
  ['investigás', 'investigas'],
  ['registrás', 'registras'],
  ['exportás', 'exportas'],
  ['configurás', 'configuras'],
  ['analizás', 'analizas'],
  ['enviás', 'envías'],
  ['completás', 'completas'],
  ['generás', 'generas'],
  ['revisás', 'revisas'],
  ['compartís', 'compartes'],
  ['llamás', 'llamas'],
  ['mandás', 'mandas'],
  ['llevás', 'llevas'],
  ['traés', 'traes'],
  // Verbo "ser" en voseo (vos sos / sos)
  ['sos', 'eres'],
  ['Sos', 'Eres'],
  // Verbo "ir" en voseo (vos vas) — "vas" coincide con tuteo, no tocar
]

// Pronombre/preposicional "vos" — alta ambigüedad. Manejamos contextos específicos.
const VOS_CONTEXTUAL = [
  // "sobre vos" → "sobre ti"
  [/\bsobre vos\b/g, 'sobre ti'],
  [/\bSobre vos\b/g, 'Sobre ti'],
  [/\bcon vos\b/g, 'contigo'],
  [/\bCon vos\b/g, 'Contigo'],
  [/\bpara vos\b/g, 'para ti'],
  [/\bPara vos\b/g, 'Para ti'],
  [/\bde vos\b/g, 'de ti'],
  [/\bDe vos\b/g, 'De ti'],
  [/\ba vos\b/g, 'a ti'],
  [/\bA vos\b/g, 'A ti'],
  [/\bentre vos\b/g, 'entre tú'],
  [/\bEntre vos\b/g, 'Entre tú'],
  [/\bvos mismo\b/g, 'tú mismo'],
  [/\bVos mismo\b/g, 'Tú mismo'],
  [/\bvos misma\b/g, 'tú misma'],
  [/\bVos misma\b/g, 'Tú misma'],
  // "Vos recibís", "Vos seguís", "Vos pagás" — sujeto + verbo voseo. Reemplazado por verbos arriba; aquí solo el "Vos" sujeto residual al inicio.
  [/\bVos\b/g, 'Tú'],
  [/(?<=[^A-Za-z])vos(?=\s+[a-záéíóúñ])/g, 'tú'],
]

// Imperativo "seguí" + objeto típico → "Sigue"
const SEGUI_PATTERNS = [
  [/\bSeguí\s+/g, 'Sigue '],
  [/\bseguí\s+(manteniendo|haciendo|usando|firmando|leyendo|adelante)\b/g, 'sigue $1'],
]

// Detector unicode-aware: usamos lookbehind/lookahead de letras latinas en
// lugar de \b porque \b en JS sin flag /u/ falla con caracteres acentuados.
const VOSEO_TOKENS = [
  // Indicativo presente 2da pers (vos)
  'tenés','podés','querés','sabés','hacés','usás','cobrás','firmás','elegís',
  'respondés','cerrás','obtenés','recibís','contratás','cancelás','subís',
  'provés','proveés','marcás','aceptás','leés','esperás','conocés','ingresás',
  'probás','empezás','entendés','escuchás','pagás','pegás','ganás','vivís',
  'salís','venís','decís','confirmás','consentís','autorizás','perdés',
  'preferís','vendés','investigás','registrás','exportás','configurás',
  'analizás','enviás','completás','generás','revisás','compartís','llamás',
  'mandás','llevás','traés',
  // Imperativos voseo (acento última sílaba)
  'mirá','hablá','pasá','pegá','ajustá','cargá',
  'marcá','ingresá','probá','empezá','mantené','firmá','usá','aceptá','terminá',
  'tomá','dejá','andá','volvé','investigá','registrá','guardá','exportá',
  'configurá','presentá','compartí','llamá','llevá','traé','mandá','recordá',
  'comentá','revisá','verificá','chequeá','analizá','sumá','enviá','completá',
  'generá','conectá','exigí','leé',
  // Imperativos enclíticos
  'decime','contame','pedile','escribinos','mandame','fijate','ponele','llamame',
]
const VOSEO_DETECT_REGEX = new RegExp(
  '(?<![A-Za-zÁÉÍÓÚáéíóúÑñ])(' + VOSEO_TOKENS.join('|') + ')(?![A-Za-zÁÉÍÓÚáéíóúÑñ])',
  'gi'
)

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name === 'generated') continue
      yield* walk(p)
    } else if (/\.(tsx?|mdx?|json)$/.test(e.name)) {
      yield p
    }
  }
}

const hits = []
let filesFixed = 0

for await (const file of walk(ROOT)) {
  let content = await fs.readFile(file, 'utf8')
  const original = content

  if (FIX) {
    // Aplicar reemplazos de palabras enteras. Usamos boundary unicode-aware
    // (lookbehind/lookahead negativo de letra latina) para que la "á" final
    // sí cuente como fin de palabra.
    const LETTER = '[A-Za-zÁÉÍÓÚáéíóúÑñ]'
    for (const [from, to] of REPLACEMENTS) {
      if (from === to) continue
      const re = new RegExp(`(?<!${LETTER})${from}(?!${LETTER})`, 'g')
      content = content.replace(re, to)
    }
    // Patrones contextuales para "vos"
    for (const [re, to] of VOS_CONTEXTUAL) {
      content = content.replace(re, to)
    }
    for (const [re, to] of SEGUI_PATTERNS) {
      content = content.replace(re, to)
    }
    if (content !== original) {
      await fs.writeFile(file, content, 'utf8')
      filesFixed += 1
    }
  }

  // Detectar hits remanentes (post-fix o en modo check)
  const lines = content.split('\n')
  lines.forEach((line, idx) => {
    if (VOSEO_DETECT_REGEX.test(line)) {
      hits.push({ file: path.relative(process.cwd(), file), line: idx + 1, text: line.trim().slice(0, 200) })
    }
    VOSEO_DETECT_REGEX.lastIndex = 0
  })
}

if (FIX) {
  console.log(`✓ Fix mode: ${filesFixed} archivos modificados.`)
}

if (hits.length > 0) {
  console.error(`✗ Voseo detectado en ${hits.length} línea(s):\n`)
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}  ${h.text}`)
  }
  console.error('\nUsa "tú/tienes/puedes/haz/mira/dime/sigue/mantén" — nunca voseo.')
  console.error('Corre "node scripts/preflight/check-voseo.mjs --fix" para aplicar reemplazos automáticos seguros.')
  process.exit(1)
}

console.log('✓ Cero voseo en src/. Copy peruano limpio.')
process.exit(0)
