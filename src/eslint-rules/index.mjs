// Plugin local de reglas ESLint custom para Comply360.
// Solo wirea las reglas; las implementaciones viven en archivos separados.
import noConflictingBg from './no-conflicting-bg.mjs'

const plugin = {
  meta: { name: 'comply360', version: '1.0.0' },
  rules: {
    'no-conflicting-bg': noConflictingBg,
  },
}

export default plugin
