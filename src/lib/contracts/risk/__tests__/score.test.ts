import { describe, it, expect } from 'vitest'
import { computeRiskScore, validationsToRiskInput } from '../score'

const UIT = 5500

describe('computeRiskScore', () => {
  it('contrato perfecto → score 100, nivel LOW, sin multa', () => {
    const r = computeRiskScore({
      validations: { blockers: 0, warnings: 0, infos: 0, blockerUnacked: 0, warningUnacked: 0, blockerCodes: [], warningCodes: [] },
      uitValue: UIT,
    })
    expect(r.score).toBe(100)
    expect(r.level).toBe('LOW')
    expect(r.estimatedFineUIT).toBe(0)
    expect(r.hasBlockingIssues).toBe(false)
    expect(r.penalties).toEqual([])
  })

  it('1 BLOCKER no acked → -30 puntos, nivel MEDIUM, multa estimada', () => {
    const r = computeRiskScore({
      validations: {
        blockers: 1, warnings: 0, infos: 0,
        blockerUnacked: 1, warningUnacked: 0,
        blockerCodes: ['MODAL-001'], warningCodes: [],
      },
      uitValue: UIT,
    })
    expect(r.score).toBe(70)
    expect(r.level).toBe('MEDIUM')
    expect(r.hasBlockingIssues).toBe(true)
    expect(r.estimatedFineUIT).toBe(4.5)
    expect(r.estimatedFinePEN).toBe(Math.round(4.5 * UIT))
  })

  it('3 BLOCKERS modales → 100 - 90 = 10, nivel CRITICAL, multa = 13.5 UIT', () => {
    const r = computeRiskScore({
      validations: {
        blockers: 3, warnings: 0, infos: 0,
        blockerUnacked: 3, warningUnacked: 0,
        blockerCodes: ['MODAL-001', 'PLAZO-001', 'SUPLENCIA-001'],
        warningCodes: [],
      },
      uitValue: UIT,
    })
    expect(r.score).toBe(10)
    expect(r.level).toBe('CRITICAL')
    expect(r.estimatedFineUIT).toBe(13.5)
  })

  it('BLOCKER ackeado no penaliza score (decisión informada del legal)', () => {
    const r = computeRiskScore({
      validations: {
        blockers: 1, warnings: 0, infos: 0,
        blockerUnacked: 0, warningUnacked: 0, // BLOCKER acked → unacked = 0
        blockerCodes: ['MODAL-001'], warningCodes: [],
      },
      uitValue: UIT,
    })
    expect(r.score).toBe(100)
    expect(r.hasBlockingIssues).toBe(false)
    // La multa sigue contando porque la regla falló, sólo se ackeo
    expect(r.estimatedFineUIT).toBe(4.5)
  })

  it('Solo INFOs → cada uno -1, nivel LOW si pocos', () => {
    const r = computeRiskScore({
      validations: { blockers: 0, warnings: 0, infos: 3, blockerUnacked: 0, warningUnacked: 0, blockerCodes: [], warningCodes: [] },
      uitValue: UIT,
    })
    expect(r.score).toBe(97)
    expect(r.level).toBe('LOW')
  })

  it('Conflict de régimen suma -15', () => {
    const r = computeRiskScore({
      validations: { blockers: 0, warnings: 0, infos: 0, blockerUnacked: 0, warningUnacked: 0, blockerCodes: [], warningCodes: [] },
      regime: { hasConflict: true },
      uitValue: UIT,
    })
    expect(r.score).toBe(85)
    expect(r.level).toBe('LOW')
  })

  it('Cadena rota suma -25', () => {
    const r = computeRiskScore({
      validations: { blockers: 0, warnings: 0, infos: 0, blockerUnacked: 0, warningUnacked: 0, blockerCodes: [], warningCodes: [] },
      chain: { valid: false },
      uitValue: UIT,
    })
    expect(r.score).toBe(75)
    expect(r.penalties.find((p) => p.code === 'CHAIN_BROKEN')).toBeDefined()
  })

  it('Combinación severa: 2 BLOCKER + 3 WARNING + chain rota + conflict régimen = score 0 (clamp)', () => {
    // 100 - 60 - 15 - 25 - 15 = -15 → clamp a 0
    const r = computeRiskScore({
      validations: {
        blockers: 2, warnings: 3, infos: 0,
        blockerUnacked: 2, warningUnacked: 3,
        blockerCodes: ['MODAL-001', 'PLAZO-001'], warningCodes: ['MODAL-002', 'PRUEBA-001', 'IGUAL-001'],
      },
      regime: { hasConflict: true },
      chain: { valid: false },
      uitValue: UIT,
    })
    expect(r.score).toBe(0)
    expect(r.level).toBe('CRITICAL')
  })

  it('FORMAL-* penaliza con multa grave (1.57 UIT) no muy grave', () => {
    const r = computeRiskScore({
      validations: {
        blockers: 1, warnings: 0, infos: 0,
        blockerUnacked: 1, warningUnacked: 0,
        blockerCodes: ['FORMAL-001'], warningCodes: [],
      },
      uitValue: UIT,
    })
    expect(r.estimatedFineUIT).toBe(1.57)
  })
})

describe('validationsToRiskInput', () => {
  it('clasifica correctamente y conserva códigos', () => {
    const out = validationsToRiskInput([
      { severity: 'BLOCKER', passed: false, acknowledged: false, ruleCode: 'MODAL-001' },
      { severity: 'BLOCKER', passed: false, acknowledged: true, ruleCode: 'PLAZO-001' },
      { severity: 'WARNING', passed: false, acknowledged: false, ruleCode: 'MODAL-002' },
      { severity: 'INFO', passed: false, acknowledged: false, ruleCode: 'DATOS-001' },
      { severity: 'BLOCKER', passed: true, acknowledged: false, ruleCode: 'OK-RULE' }, // pasa, no cuenta
    ])
    expect(out.blockers).toBe(2)
    expect(out.blockerUnacked).toBe(1)
    expect(out.warnings).toBe(1)
    expect(out.infos).toBe(1)
    expect(out.blockerCodes).toEqual(['MODAL-001', 'PLAZO-001'])
  })
})
