// =============================================
// MERKLE TREE — Generador de Contratos / Chunk 8
//
// Árbol binario de SHA-256 sobre versionHash. Funciones puras + tests.
// Diseño: si el nivel tiene un número impar de nodos, el último se
// duplica (idéntico a Bitcoin). El proof de cada hoja es el camino al
// root con los siblings y la lateralidad.
// =============================================

import { createHash } from 'node:crypto'

export interface MerkleProofStep {
  hash: string
  side: 'L' | 'R' // posición del sibling respecto a la hoja en este nivel
}

export interface MerkleTree {
  root: string
  /** Niveles: levels[0] = hojas, levels[N-1] = [root] */
  levels: string[][]
  leafCount: number
}

function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex')
}

function pairHash(a: string, b: string): string {
  // Concatenamos hex con separador "|" para que la entrada sea inequívoca.
  return sha256(`${a}|${b}`)
}

/**
 * Construye un Merkle tree a partir de N hojas. Si N es impar en algún
 * nivel, duplica la última hoja (estilo Bitcoin).
 *
 * - 0 hojas → throw
 * - 1 hoja  → root = hash de la hoja sola (con sí misma para mantener
 *   la convención SHA-256 de pareja)
 */
export function buildMerkleTree(leaves: string[]): MerkleTree {
  if (leaves.length === 0) {
    throw new Error('No se puede construir un Merkle tree sin hojas.')
  }

  // Aseguramos lowercase y sin "0x"
  const normalized = leaves.map((l) => l.toLowerCase().replace(/^0x/, ''))

  const levels: string[][] = [normalized]
  let current = normalized
  while (current.length > 1) {
    const next: string[] = []
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i]
      const right = i + 1 < current.length ? current[i + 1] : current[i] // duplica si impar
      next.push(pairHash(left, right))
    }
    levels.push(next)
    current = next
  }

  return { root: levels[levels.length - 1][0], levels, leafCount: leaves.length }
}

/**
 * Devuelve el camino de prueba de la hoja en `index` hasta la raíz.
 */
export function getMerkleProof(tree: MerkleTree, leafIndex: number): MerkleProofStep[] {
  if (leafIndex < 0 || leafIndex >= tree.leafCount) {
    throw new Error(`leafIndex ${leafIndex} fuera de rango (0..${tree.leafCount - 1}).`)
  }
  const proof: MerkleProofStep[] = []
  let idx = leafIndex
  for (let level = 0; level < tree.levels.length - 1; level++) {
    const nodes = tree.levels[level]
    const isRight = idx % 2 === 1
    const siblingIdx = isRight ? idx - 1 : idx + 1
    // Si el sibling está fuera del rango (caso impar duplicado), el sibling es el propio nodo
    const sibling = siblingIdx < nodes.length ? nodes[siblingIdx] : nodes[idx]
    proof.push({
      hash: sibling,
      side: isRight ? 'L' : 'R', // el sibling está a la izquierda o derecha de mi hoja
    })
    idx = Math.floor(idx / 2)
  }
  return proof
}

/**
 * Verifica un proof: dado un leafHash y el path hasta la raíz, ¿reconstruye
 * la `expectedRoot`?
 *
 * Esta función es PURA y autocontenida — la pueden ejecutar peritos
 * externos solo con el leaf, el proof y el root.
 */
export function verifyMerkleProof(
  leafHash: string,
  proof: MerkleProofStep[],
  expectedRoot: string,
): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/^0x/, '')
  let current = norm(leafHash)
  for (const step of proof) {
    const sibling = norm(step.hash)
    if (step.side === 'L') {
      // sibling está a mi izquierda → pair(sibling, current)
      current = pairHash(sibling, current)
    } else {
      current = pairHash(current, sibling)
    }
  }
  return current === norm(expectedRoot)
}

/**
 * Builds proofs for all leaves in one pass — más eficiente que llamar
 * `getMerkleProof` N veces.
 */
export function buildAllProofs(tree: MerkleTree): MerkleProofStep[][] {
  return Array.from({ length: tree.leafCount }, (_, i) => getMerkleProof(tree, i))
}

// Re-export para uso externo
export { sha256 as sha256Hex }
