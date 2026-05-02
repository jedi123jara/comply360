import { describe, it, expect } from 'vitest'
import {
  buildAllProofs,
  buildMerkleTree,
  getMerkleProof,
  verifyMerkleProof,
} from '../merkle'

describe('buildMerkleTree', () => {
  it('error si no hay hojas', () => {
    expect(() => buildMerkleTree([])).toThrow()
  })

  it('1 hoja → root es la propia hoja (convención Bitcoin)', () => {
    const tree = buildMerkleTree(['aaa'])
    expect(tree.leafCount).toBe(1)
    expect(tree.root).toBe('aaa')
    expect(tree.levels.length).toBe(1)
  })

  it('2 hojas → 2 niveles', () => {
    const tree = buildMerkleTree(['aaa', 'bbb'])
    expect(tree.levels.length).toBe(2)
    expect(tree.levels[0]).toEqual(['aaa', 'bbb'])
    expect(tree.levels[1]).toHaveLength(1)
    expect(tree.root).toBe(tree.levels[1][0])
  })

  it('4 hojas → 3 niveles balanceados', () => {
    const tree = buildMerkleTree(['a', 'b', 'c', 'd'])
    expect(tree.levels.map((l) => l.length)).toEqual([4, 2, 1])
  })

  it('3 hojas (impar) → la última se duplica', () => {
    const tree = buildMerkleTree(['a', 'b', 'c'])
    // En el primer step se forman pares (a,b) y (c,c) duplicado
    expect(tree.levels[0]).toEqual(['a', 'b', 'c'])
    expect(tree.levels[1].length).toBe(2)
    expect(tree.levels[2].length).toBe(1)
  })

  it('normaliza prefijo 0x y mayúsculas', () => {
    const t1 = buildMerkleTree(['0xABCD', '0xEF12'])
    const t2 = buildMerkleTree(['abcd', 'ef12'])
    expect(t1.root).toBe(t2.root)
  })
})

describe('verifyMerkleProof — round-trip', () => {
  it('cualquier hoja del árbol verifica con su proof', () => {
    const leaves = Array.from({ length: 16 }, (_, i) => `leaf${i}`)
    const tree = buildMerkleTree(leaves)
    leaves.forEach((leaf, i) => {
      const proof = getMerkleProof(tree, i)
      expect(verifyMerkleProof(leaf, proof, tree.root)).toBe(true)
    })
  })

  it('árbol con número impar de hojas (5) → todas verifican', () => {
    const leaves = ['l1', 'l2', 'l3', 'l4', 'l5']
    const tree = buildMerkleTree(leaves)
    for (let i = 0; i < leaves.length; i++) {
      const proof = getMerkleProof(tree, i)
      expect(verifyMerkleProof(leaves[i], proof, tree.root)).toBe(true)
    }
  })

  it('proof falsa (hoja distinta) → falla', () => {
    const leaves = ['a', 'b', 'c', 'd']
    const tree = buildMerkleTree(leaves)
    const proof = getMerkleProof(tree, 0)
    expect(verifyMerkleProof('OTRA', proof, tree.root)).toBe(false)
  })

  it('proof tampered (cambio un sibling) → falla', () => {
    const leaves = ['a', 'b', 'c', 'd']
    const tree = buildMerkleTree(leaves)
    const proof = getMerkleProof(tree, 0)
    const tampered = [{ ...proof[0], hash: 'malo' }, ...proof.slice(1)]
    expect(verifyMerkleProof('a', tampered, tree.root)).toBe(false)
  })

  it('root distinta → falla', () => {
    const leaves = ['a', 'b']
    const tree = buildMerkleTree(leaves)
    const proof = getMerkleProof(tree, 0)
    expect(verifyMerkleProof('a', proof, '0'.repeat(64))).toBe(false)
  })

  it('verifica que cualquier sibling usado pertenezca al árbol original', () => {
    // Caso clásico: proof de v(0) con árbol [a,b,c,d]
    const leaves = ['a', 'b', 'c', 'd']
    const tree = buildMerkleTree(leaves)
    const proof = getMerkleProof(tree, 0)
    // Nivel 0 sibling debe ser 'b' (a la derecha de 'a')
    expect(proof[0]).toEqual({ hash: 'b', side: 'R' })
  })
})

describe('getMerkleProof — bordes', () => {
  it('throw si leafIndex fuera de rango', () => {
    const tree = buildMerkleTree(['a', 'b'])
    expect(() => getMerkleProof(tree, 99)).toThrow()
    expect(() => getMerkleProof(tree, -1)).toThrow()
  })

  it('proof de árbol de 1 sola hoja → 1 paso (autopareja)', () => {
    const tree = buildMerkleTree(['a'])
    const proof = getMerkleProof(tree, 0)
    expect(proof.length).toBe(0) // ya es root
    expect(verifyMerkleProof('a', proof, tree.root)).toBe(true)
  })
})

describe('buildAllProofs', () => {
  it('genera N proofs verificables', () => {
    const leaves = ['x', 'y', 'z', 'w']
    const tree = buildMerkleTree(leaves)
    const proofs = buildAllProofs(tree)
    expect(proofs).toHaveLength(4)
    proofs.forEach((p, i) => {
      expect(verifyMerkleProof(leaves[i], p, tree.root)).toBe(true)
    })
  })
})
