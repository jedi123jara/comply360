import { describe, it, expect } from 'vitest'
import { ruleCommitteeSST } from '../org-doctor/rules/committee-sst'
import { ruleCommitteeHostigamiento } from '../org-doctor/rules/committee-hostigamiento'
import { ruleDpoLey29733 } from '../org-doctor/rules/dpo-required'
import { ruleSpansOfControl } from '../org-doctor/rules/spans-of-control'
import { ruleSuccessionCoverage } from '../org-doctor/rules/succession-coverage'
import { ruleVacantPositions } from '../org-doctor/rules/vacant-positions'
import { ruleExpiringRoles } from '../org-doctor/rules/expiring-roles'
import { ruleSubordinationRisk } from '../org-doctor/rules/subordination-risk'
import { ruleMofCompleteness } from '../org-doctor/rules/mof-completeness'
import type { DoctorContext } from '../org-doctor'
import type { OrgChartTree, ComplianceRoleType } from '../types'

function makeCtx(opts: Partial<DoctorContext> & { tree?: Partial<OrgChartTree> }): DoctorContext {
  return {
    orgId: 'org-test',
    workerCount: opts.workerCount ?? 50,
    now: opts.now ?? new Date('2026-05-01T12:00:00Z'),
    tree: {
      rootUnitIds: [],
      units: [],
      positions: [],
      assignments: [],
      complianceRoles: [],
      generatedAt: '2026-05-01T12:00:00Z',
      asOf: null,
      ...(opts.tree ?? {}),
    },
    serviceProviders: opts.serviceProviders ?? [],
  }
}

function makeRole(
  workerId: string,
  roleType: ComplianceRoleType,
  endsAt: string | null = null,
  startsAt = '2025-01-01T00:00:00Z',
) {
  return {
    id: `role-${roleType}-${workerId}`,
    workerId,
    roleType,
    unitId: null,
    startsAt,
    endsAt,
    electedAt: null,
    actaUrl: null,
    baseLegal: null,
    worker: { id: workerId, firstName: 'Test', lastName: 'Worker' },
  }
}

describe('Org Doctor — Comité SST (Ley 29783)', () => {
  it('empresa >20 sin Comité SST → CRITICAL: sin Presidente y sin representantes', () => {
    const ctx = makeCtx({ workerCount: 50 })
    const findings = ruleCommitteeSST(ctx)
    const codes = findings.map(f => f.rule)
    expect(codes).toContain('committee-sst-no-president')
    expect(codes).toContain('committee-sst-no-secretary')
    expect(codes).toContain('committee-sst-no-worker-rep')
    const critical = findings.filter(f => f.severity === 'CRITICAL')
    expect(critical.length).toBeGreaterThan(0)
  })

  it('empresa ≤20 sin Supervisor SST → HIGH: sin Supervisor', () => {
    const ctx = makeCtx({ workerCount: 15 })
    const findings = ruleCommitteeSST(ctx)
    expect(findings.some(f => f.rule === 'sst-no-supervisor')).toBe(true)
    expect(findings.every(f => f.rule !== 'committee-sst-no-president')).toBe(true)
  })

  it('Comité bien conformado → sin findings', () => {
    const ctx = makeCtx({
      workerCount: 50,
      tree: {
        complianceRoles: [
          makeRole('w1', 'PRESIDENTE_COMITE_SST'),
          makeRole('w2', 'SECRETARIO_COMITE_SST'),
          makeRole('w3', 'REPRESENTANTE_TRABAJADORES_SST'),
          makeRole('w4', 'REPRESENTANTE_TRABAJADORES_SST'),
          makeRole('w5', 'REPRESENTANTE_EMPLEADOR_SST'),
          makeRole('w6', 'REPRESENTANTE_EMPLEADOR_SST'),
        ],
      },
    })
    const findings = ruleCommitteeSST(ctx)
    expect(findings).toHaveLength(0)
  })

  it('detecta desbalance: más empleador que trabajadores', () => {
    const ctx = makeCtx({
      workerCount: 50,
      tree: {
        complianceRoles: [
          makeRole('w1', 'PRESIDENTE_COMITE_SST'),
          makeRole('w2', 'SECRETARIO_COMITE_SST'),
          makeRole('w3', 'REPRESENTANTE_TRABAJADORES_SST'),
          makeRole('w4', 'REPRESENTANTE_EMPLEADOR_SST'),
          makeRole('w5', 'REPRESENTANTE_EMPLEADOR_SST'),
          makeRole('w6', 'REPRESENTANTE_EMPLEADOR_SST'),
        ],
      },
    })
    const findings = ruleCommitteeSST(ctx)
    expect(findings.some(f => f.rule === 'committee-sst-imbalanced')).toBe(true)
  })
})

describe('Org Doctor — Comité Hostigamiento (Ley 27942)', () => {
  it('empresa ≥20 sin comité ni receptor → 2 findings', () => {
    const ctx = makeCtx({ workerCount: 30 })
    const findings = ruleCommitteeHostigamiento(ctx)
    const codes = findings.map(f => f.rule)
    expect(codes).toContain('comite-hostigamiento-missing')
    expect(codes).toContain('hostigamiento-no-receiver')
  })

  it('empresa <20 con receptor designado → sin findings', () => {
    const ctx = makeCtx({
      workerCount: 10,
      tree: { complianceRoles: [makeRole('w1', 'JEFE_INMEDIATO_HOSTIGAMIENTO')] },
    })
    expect(ruleCommitteeHostigamiento(ctx)).toHaveLength(0)
  })
})

describe('Org Doctor — DPO (Ley 29733)', () => {
  it('empresa >100 sin DPO → HIGH', () => {
    const ctx = makeCtx({ workerCount: 142 })
    const findings = ruleDpoLey29733(ctx)
    expect(findings).toHaveLength(1)
    expect(findings[0].severity).toBe('HIGH')
    expect(findings[0].rule).toBe('dpo-not-designated')
  })

  it('empresa <100 sin DPO → no es obligatorio', () => {
    const ctx = makeCtx({ workerCount: 80 })
    expect(ruleDpoLey29733(ctx)).toHaveLength(0)
  })

  it('empresa con DPO designado → sin findings', () => {
    const ctx = makeCtx({
      workerCount: 200,
      tree: { complianceRoles: [makeRole('w1', 'DPO_LEY_29733')] },
    })
    expect(ruleDpoLey29733(ctx)).toHaveLength(0)
  })
})

describe('Org Doctor — Spans of Control', () => {
  it('25+ reportes directos → HIGH', () => {
    const ctx = makeCtx({
      tree: {
        positions: [
          { id: 'mgr', orgUnitId: 'u1', title: 'Jefe Tienda', code: null, description: null, isManagerial: true, reportsToPositionId: null, backupPositionId: null, seats: 1 },
          ...Array.from({ length: 27 }, (_, i) => ({
            id: `pos-${i}`,
            orgUnitId: 'u1',
            title: `Vendedor ${i}`,
            code: null,
            description: null,
            isManagerial: false,
            reportsToPositionId: 'mgr',
            backupPositionId: null,
            seats: 1,
          })),
        ],
      },
    })
    const findings = ruleSpansOfControl(ctx)
    expect(findings.some(f => f.rule === 'span-of-control-extreme' && f.severity === 'HIGH')).toBe(true)
  })

  it('5 reportes directos → sin findings', () => {
    const ctx = makeCtx({
      tree: {
        positions: [
          { id: 'mgr', orgUnitId: 'u1', title: 'Jefe', code: null, description: null, isManagerial: true, reportsToPositionId: null, backupPositionId: null, seats: 1 },
          ...Array.from({ length: 5 }, (_, i) => ({
            id: `pos-${i}`,
            orgUnitId: 'u1',
            title: `Empleado ${i}`,
            code: null,
            description: null,
            isManagerial: false,
            reportsToPositionId: 'mgr',
            backupPositionId: null,
            seats: 1,
          })),
        ],
      },
    })
    expect(ruleSpansOfControl(ctx)).toHaveLength(0)
  })
})

describe('Org Doctor — Succession Coverage', () => {
  it('cargo gerencial sin backup → MEDIUM', () => {
    const ctx = makeCtx({
      tree: {
        positions: [
          { id: 'mgr', orgUnitId: 'u1', title: 'Gerente Operaciones', code: null, description: null, isManagerial: true, reportsToPositionId: null, backupPositionId: null, seats: 1 },
        ],
      },
    })
    const findings = ruleSuccessionCoverage(ctx)
    expect(findings).toHaveLength(1)
    expect(findings[0].severity).toBe('MEDIUM')
  })

  it('cargo gerencial con backup → sin findings', () => {
    const ctx = makeCtx({
      tree: {
        positions: [
          { id: 'mgr', orgUnitId: 'u1', title: 'Gerente', code: null, description: null, isManagerial: true, reportsToPositionId: null, backupPositionId: 'subgte', seats: 1 },
          { id: 'subgte', orgUnitId: 'u1', title: 'Subgerente', code: null, description: null, isManagerial: true, reportsToPositionId: null, backupPositionId: null, seats: 1 },
        ],
      },
    })
    // El subgerente sí está sin backup → 1 finding sobre el subgerente, no sobre el mgr
    const findings = ruleSuccessionCoverage(ctx)
    expect(findings.some(f => f.title.includes('Gerente') && !f.title.includes('Subgerente'))).toBe(false)
  })
})

describe('Org Doctor — MOF Completeness', () => {
  it('cargo sensible con MOF incompleto → HIGH', () => {
    const ctx = makeCtx({
      tree: {
        positions: [
          {
            id: 'p-sst',
            orgUnitId: 'u1',
            title: 'Supervisor SST',
            code: null,
            description: null,
            isManagerial: true,
            requiresSctr: true,
            reportsToPositionId: null,
            backupPositionId: null,
            seats: 1,
            purpose: '',
            functions: [],
            responsibilities: ['Supervisar seguridad'],
            requirements: null,
          },
        ],
      },
    })

    const findings = ruleMofCompleteness(ctx)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      severity: 'HIGH',
      suggestedTaskTitle: 'Completar MOF de "Supervisor SST"',
    })
    expect(findings[0].description).toContain('propósito')
    expect(findings[0].description).toContain('funciones')
    expect(findings[0].description).toContain('requisitos')
  })

  it('cargo con MOF completo → sin findings', () => {
    const ctx = makeCtx({
      tree: {
        positions: [
          {
            id: 'p-ok',
            orgUnitId: 'u1',
            title: 'Analista Legal',
            code: null,
            description: null,
            isManagerial: false,
            reportsToPositionId: null,
            backupPositionId: null,
            seats: 1,
            purpose: 'Analizar riesgos legales',
            functions: ['Revisar documentos'],
            responsibilities: ['Mantener expedientes'],
            requirements: { education: 'Universitario', competencies: ['orden'] },
          },
        ],
      },
    })

    expect(ruleMofCompleteness(ctx)).toHaveLength(0)
  })
})

describe('Org Doctor — Vacant Positions', () => {
  it('cargo gerencial vacante → HIGH', () => {
    const ctx = makeCtx({
      tree: {
        positions: [
          { id: 'p1', orgUnitId: 'u1', title: 'Jefe Logística', code: null, description: null, isManagerial: true, reportsToPositionId: null, backupPositionId: null, seats: 1 },
        ],
        assignments: [],
      },
    })
    const findings = ruleVacantPositions(ctx)
    expect(findings.some(f => f.severity === 'HIGH' && f.rule === 'vacant-managerial')).toBe(true)
  })
})

describe('Org Doctor — Expiring Roles', () => {
  it('rol vencido hace 30 días → HIGH', () => {
    const expired = new Date('2026-04-01T00:00:00Z').toISOString()
    const ctx = makeCtx({
      now: new Date('2026-05-01T00:00:00Z'),
      tree: {
        complianceRoles: [makeRole('w1', 'PRESIDENTE_COMITE_SST', expired)],
      },
    })
    const findings = ruleExpiringRoles(ctx)
    expect(findings).toHaveLength(1)
    expect(findings[0].severity).toBe('HIGH')
    expect(findings[0].rule).toBe('role-expired')
  })

  it('rol vence en 30 días → MEDIUM', () => {
    const inFuture = new Date('2026-05-31T00:00:00Z').toISOString()
    const ctx = makeCtx({
      now: new Date('2026-05-01T00:00:00Z'),
      tree: {
        complianceRoles: [makeRole('w1', 'DPO_LEY_29733', inFuture)],
      },
    })
    const findings = ruleExpiringRoles(ctx)
    expect(findings.some(f => f.rule === 'role-expiring-soon' && f.severity === 'MEDIUM')).toBe(true)
  })

  it('detecta mandato CSST mayor a 24 meses', () => {
    const ctx = makeCtx({
      now: new Date('2026-05-01T00:00:00Z'),
      tree: {
        complianceRoles: [
          makeRole(
            'w1',
            'PRESIDENTE_COMITE_SST',
            '2027-02-01T00:00:00Z',
            '2025-01-01T00:00:00Z',
          ),
        ],
      },
    })

    const findings = ruleExpiringRoles(ctx)
    expect(findings.some(f => f.rule === 'role-term-exceeds-standard' && f.severity === 'HIGH')).toBe(true)
  })
})

describe('Org Doctor — Auditor de Subordinación', () => {
  it('prestador con horario, supervisor y órdenes → CRITICAL', () => {
    const ctx = makeCtx({
      tree: {
        units: [
          {
            id: 'u-ops',
            parentId: null,
            name: 'Operaciones',
            slug: 'operaciones',
            kind: 'AREA',
            code: null,
            description: null,
            costCenter: null,
            level: 0,
            sortOrder: 0,
            color: null,
            icon: null,
            version: 1,
            isActive: true,
          },
        ],
      },
      serviceProviders: [
        {
          id: 'sp-1',
          firstName: 'Luis',
          lastName: 'Rojas',
          documentNumber: '12345678',
          area: 'Operaciones',
          servicioDescripcion: 'Soporte operativo',
          hasFixedSchedule: true,
          hasExclusivity: false,
          worksOnPremises: false,
          usesCompanyTools: true,
          reportsToSupervisor: true,
          receivesOrders: true,
          desnaturalizacionRisk: 75,
          status: 'AT_RISK',
        },
      ],
    })

    const findings = ruleSubordinationRisk(ctx)
    expect(findings).toHaveLength(1)
    expect(findings[0].severity).toBe('CRITICAL')
    expect(findings[0].affectedUnitIds).toEqual(['u-ops'])
  })

  it('prestador sin indicadores laborales → sin findings', () => {
    const ctx = makeCtx({
      serviceProviders: [
        {
          id: 'sp-2',
          firstName: 'Ana',
          lastName: 'Silva',
          documentNumber: '87654321',
          area: null,
          servicioDescripcion: 'Consultoría puntual',
          hasFixedSchedule: false,
          hasExclusivity: false,
          worksOnPremises: false,
          usesCompanyTools: false,
          reportsToSupervisor: false,
          receivesOrders: false,
          desnaturalizacionRisk: 0,
          status: 'ACTIVE',
        },
      ],
    })

    expect(ruleSubordinationRisk(ctx)).toHaveLength(0)
  })
})
