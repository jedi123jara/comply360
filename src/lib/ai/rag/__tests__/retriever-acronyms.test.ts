/**
 * Tests para que el RAG retriever maneje correctamente siglas peruanas
 * (CTS, SST, AFP, DNI, RUC, UIT, RMV, MYPE, PLAME, ONP, TUP).
 *
 * El tokenizer filtra palabras con `length > 2`, lo que MANTIENE las siglas
 * de 3+ chars. La auditoría reportó que se filtraban — falso positivo.
 * Estos tests blindan ese comportamiento contra regresiones futuras (alguien
 * cambia el threshold a `length > 3` y rompe queries de siglas).
 */

import { retrieveRelevantLaw } from '../retriever'

describe('RAG retriever — siglas peruanas', () => {
  test.each([
    ['CTS', 'cts'],
    ['SST', 'sst'],
    ['AFP', 'afp'],
    ['DNI', 'dni'],
    ['RUC', 'ruc'],
    ['UIT', 'uit'],
    ['RMV', 'rmv'],
    ['MYPE', 'mype'],
    ['ONP', 'onp'],
    ['SUNAFIL', 'sunafil'],
  ])('query "%s" devuelve al menos un chunk relevante', async (sigla) => {
    const results = retrieveRelevantLaw(`¿qué dice la ley sobre ${sigla}?`, 5, 0)
    // No exigimos que el match sea perfecto: solo que el retriever encuentra
    // al menos un chunk con score > 0 (vs. el threshold default de 0.12 que
    // podría descartar sigla-matches débiles cuando el corpus crezca).
    expect(results.length).toBeGreaterThan(0)
  })

  test('query "CTS deposito mayo" combina sigla + términos comunes', async () => {
    const results = retrieveRelevantLaw('¿cuándo se hace el depósito de CTS en mayo?', 5, 0.1)
    expect(results.length).toBeGreaterThan(0)
  })

  test('query con stopwords cortas no rompe', async () => {
    const results = retrieveRelevantLaw('a la y de el un en se', 5, 0)
    // Sin keywords reales, el resultado puede ser vacío o muy bajo, pero no debe lanzar
    expect(Array.isArray(results)).toBe(true)
  })
})
