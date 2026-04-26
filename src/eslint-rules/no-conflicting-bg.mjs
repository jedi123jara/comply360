/**
 * comply360/no-conflicting-bg
 *
 * Detecta deuda visual del modo "dark mode parcial" que nunca se completó.
 *
 * El producto es LIGHT-only (ver src/styles/tokens.css). Cualquier `bg-gray-9XX`
 * o `bg-slate-9XX` es legacy de un dark theme que se purgó a medias y produce
 * conflictos visuales — por ejemplo `bg-white bg-gray-900` en Tailwind 4
 * aplica el último (negro), volviendo invisibles los textos `text-[primary]`.
 *
 * Casos detectados:
 *   1. className combina `bg-gray-9XX|bg-slate-9XX` con `bg-white|bg-[color:var(--*)]`.
 *   2. className combina `text-white` con `bg-white` sin contexto de fondo oscuro.
 *
 * False-positive aceptado: `text-white` sobre `bg-emerald-600` (botón) — se
 * permite porque el ancestor del color está claro.
 */

const DARK_BG = /\bbg-(gray|slate)-9\d{2}(\/[0-9.]+)?\b/
const LIGHT_BG = /\b(bg-white|bg-\[color:var\(--(?:bg|neutral|surface)[\w-]*\)\])(\b|\/)/

function getStringValue(node) {
  if (!node) return null
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0 && node.quasis.length === 1) {
    return node.quasis[0].value.cooked
  }
  // JSXAttribute value puede venir como JSXExpressionContainer wrapping un Literal
  if (node.type === 'JSXExpressionContainer') return getStringValue(node.expression)
  return null
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Bloquea mezcla de utilidades light/dark de Tailwind en el mismo className (deuda dark-mode parcial). El producto es light-only.',
      recommended: true,
    },
    schema: [],
    messages: {
      conflictingBg:
        'className mezcla bg dark (gray-9XX/slate-9XX) con bg light. El producto es light-only — elimina la clase dark legacy: "{{value}}".',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (!node.name || node.name.name !== 'className') return
        const raw = getStringValue(node.value)
        if (!raw) return
        if (DARK_BG.test(raw) && LIGHT_BG.test(raw)) {
          context.report({
            node,
            messageId: 'conflictingBg',
            data: { value: raw.length > 80 ? raw.slice(0, 80) + '…' : raw },
          })
        }
      },
    }
  },
}
