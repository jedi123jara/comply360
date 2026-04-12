import { describe, it, expect } from 'vitest'
import {
  ROLE_HIERARCHY,
  hasMinRole,
  isWorkerRole,
  isSuperAdminRole,
  isOrgRole,
} from '../api-auth'

// ---------------------------------------------------------------------------
// ROLE_HIERARCHY structure
// ---------------------------------------------------------------------------

describe('ROLE_HIERARCHY', () => {
  it('contiene los 6 roles esperados', () => {
    expect(ROLE_HIERARCHY).toHaveProperty('WORKER')
    expect(ROLE_HIERARCHY).toHaveProperty('VIEWER')
    expect(ROLE_HIERARCHY).toHaveProperty('MEMBER')
    expect(ROLE_HIERARCHY).toHaveProperty('ADMIN')
    expect(ROLE_HIERARCHY).toHaveProperty('OWNER')
    expect(ROLE_HIERARCHY).toHaveProperty('SUPER_ADMIN')
  })

  it('respeta la jerarquía: WORKER < VIEWER < MEMBER < ADMIN < OWNER < SUPER_ADMIN', () => {
    expect(ROLE_HIERARCHY.WORKER).toBeLessThan(ROLE_HIERARCHY.VIEWER)
    expect(ROLE_HIERARCHY.VIEWER).toBeLessThan(ROLE_HIERARCHY.MEMBER)
    expect(ROLE_HIERARCHY.MEMBER).toBeLessThan(ROLE_HIERARCHY.ADMIN)
    expect(ROLE_HIERARCHY.ADMIN).toBeLessThan(ROLE_HIERARCHY.OWNER)
    expect(ROLE_HIERARCHY.OWNER).toBeLessThan(ROLE_HIERARCHY.SUPER_ADMIN)
  })

  it('WORKER tiene valor negativo (no es rol de organizacion)', () => {
    expect(ROLE_HIERARCHY.WORKER).toBeLessThan(0)
  })
})

// ---------------------------------------------------------------------------
// hasMinRole
// ---------------------------------------------------------------------------

describe('hasMinRole', () => {
  it('SUPER_ADMIN tiene acceso a todo', () => {
    expect(hasMinRole('SUPER_ADMIN', 'VIEWER')).toBe(true)
    expect(hasMinRole('SUPER_ADMIN', 'MEMBER')).toBe(true)
    expect(hasMinRole('SUPER_ADMIN', 'ADMIN')).toBe(true)
    expect(hasMinRole('SUPER_ADMIN', 'OWNER')).toBe(true)
    expect(hasMinRole('SUPER_ADMIN', 'SUPER_ADMIN')).toBe(true)
  })

  it('OWNER tiene acceso hasta OWNER, no a SUPER_ADMIN', () => {
    expect(hasMinRole('OWNER', 'VIEWER')).toBe(true)
    expect(hasMinRole('OWNER', 'MEMBER')).toBe(true)
    expect(hasMinRole('OWNER', 'ADMIN')).toBe(true)
    expect(hasMinRole('OWNER', 'OWNER')).toBe(true)
    expect(hasMinRole('OWNER', 'SUPER_ADMIN')).toBe(false)
  })

  it('VIEWER solo tiene acceso a su propio nivel', () => {
    expect(hasMinRole('VIEWER', 'VIEWER')).toBe(true)
    expect(hasMinRole('VIEWER', 'MEMBER')).toBe(false)
    expect(hasMinRole('VIEWER', 'ADMIN')).toBe(false)
    expect(hasMinRole('VIEWER', 'OWNER')).toBe(false)
  })

  it('WORKER NO tiene acceso a roles de organizacion (esta aislado)', () => {
    expect(hasMinRole('WORKER', 'VIEWER')).toBe(false)
    expect(hasMinRole('WORKER', 'MEMBER')).toBe(false)
    expect(hasMinRole('WORKER', 'ADMIN')).toBe(false)
    expect(hasMinRole('WORKER', 'OWNER')).toBe(false)
    expect(hasMinRole('WORKER', 'SUPER_ADMIN')).toBe(false)
  })

  it('Roles desconocidos no tienen acceso a nada', () => {
    expect(hasMinRole('UNKNOWN', 'VIEWER')).toBe(false)
    expect(hasMinRole('', 'VIEWER')).toBe(false)
  })

  it('minRole desconocido bloquea a cualquier rol', () => {
    expect(hasMinRole('SUPER_ADMIN', 'UNKNOWN')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isWorkerRole / isSuperAdminRole / isOrgRole
// ---------------------------------------------------------------------------

describe('isWorkerRole', () => {
  it('solo retorna true para WORKER', () => {
    expect(isWorkerRole('WORKER')).toBe(true)
    expect(isWorkerRole('VIEWER')).toBe(false)
    expect(isWorkerRole('MEMBER')).toBe(false)
    expect(isWorkerRole('ADMIN')).toBe(false)
    expect(isWorkerRole('OWNER')).toBe(false)
    expect(isWorkerRole('SUPER_ADMIN')).toBe(false)
  })
})

describe('isSuperAdminRole', () => {
  it('solo retorna true para SUPER_ADMIN', () => {
    expect(isSuperAdminRole('SUPER_ADMIN')).toBe(true)
    expect(isSuperAdminRole('OWNER')).toBe(false)
    expect(isSuperAdminRole('ADMIN')).toBe(false)
    expect(isSuperAdminRole('WORKER')).toBe(false)
  })
})

describe('isOrgRole', () => {
  it('retorna true para los 4 roles de organizacion', () => {
    expect(isOrgRole('OWNER')).toBe(true)
    expect(isOrgRole('ADMIN')).toBe(true)
    expect(isOrgRole('MEMBER')).toBe(true)
    expect(isOrgRole('VIEWER')).toBe(true)
  })

  it('NO retorna true para WORKER ni SUPER_ADMIN', () => {
    expect(isOrgRole('WORKER')).toBe(false)
    expect(isOrgRole('SUPER_ADMIN')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Aislamiento entre tiers — invariantes criticos de seguridad
// ---------------------------------------------------------------------------

describe('Tier isolation invariants', () => {
  it('Un trabajador NUNCA debe pasar un check de rol de org', () => {
    // Cualquier endpoint protegido con withRole('VIEWER') o superior
    // debe rechazar a un WORKER
    const orgRoles = ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER']
    for (const minRole of orgRoles) {
      expect(hasMinRole('WORKER', minRole)).toBe(false)
    }
  })

  it('Un OWNER NUNCA debe pasar un check de SUPER_ADMIN', () => {
    expect(hasMinRole('OWNER', 'SUPER_ADMIN')).toBe(false)
  })

  it('Un SUPER_ADMIN puede acceder a cualquier rol de organizacion (admin de plataforma)', () => {
    expect(hasMinRole('SUPER_ADMIN', 'OWNER')).toBe(true)
  })
})
