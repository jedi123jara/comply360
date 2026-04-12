import { describe, it, expect } from 'vitest'
import { scoreDiagnostic } from '../diagnostic-scorer'
import type { QuestionAnswer } from '../diagnostic-scorer'
import type { ComplianceQuestion } from '../questions/types'

// ---------------------------------------------------------------------------
// Helpers: build a small set of questions spanning multiple areas + gravedad
// ---------------------------------------------------------------------------

function makeQuestion(overrides: Partial<ComplianceQuestion> & { id: string; area: ComplianceQuestion['area'] }): ComplianceQuestion {
  return {
    text: 'Pregunta de prueba?',
    helpText: undefined,
    baseLegal: 'D.Leg. 728, Art. 4',
    infraccionGravedad: 'GRAVE',
    multaUIT: 1.57,
    peso: 3,
    express: false,
    ...overrides,
  }
}

const sampleQuestions: ComplianceQuestion[] = [
  // contratos_registro  (weight 15)
  makeQuestion({ id: 'T-CR-01', area: 'contratos_registro', peso: 5, infraccionGravedad: 'GRAVE', multaUIT: 1.57 }),
  makeQuestion({ id: 'T-CR-02', area: 'contratos_registro', peso: 3, infraccionGravedad: 'LEVE', multaUIT: 0.23 }),
  // remuneraciones_beneficios  (weight 20)
  makeQuestion({ id: 'T-RB-01', area: 'remuneraciones_beneficios', peso: 5, infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63 }),
  // sst  (weight 20)
  makeQuestion({ id: 'T-SST-01', area: 'sst', peso: 4, infraccionGravedad: 'GRAVE', multaUIT: 1.57 }),
  makeQuestion({ id: 'T-SST-02', area: 'sst', peso: 3, infraccionGravedad: 'MUY_GRAVE', multaUIT: 2.63 }),
]

const TOTAL_WORKERS = 5
const UIT = 5500 // must match the constant in diagnostic-scorer.ts

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('scoreDiagnostic', () => {
  // ----- All SI -----
  describe('all SI answers', () => {
    const answers: QuestionAnswer[] = sampleQuestions.map(q => ({
      questionId: q.id,
      answer: 'SI' as const,
    }))
    const result = scoreDiagnostic(sampleQuestions, answers, TOTAL_WORKERS)

    it('should return 100% global score', () => {
      expect(result.scoreGlobal).toBe(100)
    })

    it('should return 100% for every area with questions', () => {
      for (const as of result.areaScores) {
        if (as.totalQuestions > 0) {
          expect(as.score).toBe(100)
        }
      }
    })

    it('should produce zero gaps', () => {
      expect(result.gapAnalysis).toHaveLength(0)
    })

    it('should produce zero action items', () => {
      expect(result.actionPlan).toHaveLength(0)
    })

    it('should have zero multa riesgo', () => {
      expect(result.totalMultaRiesgo).toBe(0)
    })
  })

  // ----- All NO -----
  describe('all NO answers', () => {
    const answers: QuestionAnswer[] = sampleQuestions.map(q => ({
      questionId: q.id,
      answer: 'NO' as const,
    }))
    const result = scoreDiagnostic(sampleQuestions, answers, TOTAL_WORKERS)

    it('should return 0% global score', () => {
      expect(result.scoreGlobal).toBe(0)
    })

    it('should return 0% for every area with questions', () => {
      for (const as of result.areaScores) {
        if (as.totalQuestions > 0) {
          expect(as.score).toBe(0)
        }
      }
    })

    it('should produce gaps equal to number of questions', () => {
      expect(result.gapAnalysis).toHaveLength(sampleQuestions.length)
    })

    it('should produce action items (capped at 15)', () => {
      expect(result.actionPlan.length).toBeGreaterThan(0)
      expect(result.actionPlan.length).toBeLessThanOrEqual(15)
    })

    it('should have positive multa riesgo', () => {
      expect(result.totalMultaRiesgo).toBeGreaterThan(0)
    })

    it('every gap should have answer NO', () => {
      for (const g of result.gapAnalysis) {
        expect(g.answer).toBe('NO')
      }
    })

    it('should calculate multa using UIT * workerFactor for NO', () => {
      const workerFactor = Math.max(1, Math.min(TOTAL_WORKERS, 10))
      // Check the first gap matches expected formula
      const q = sampleQuestions[0]
      const gap = result.gapAnalysis.find(g => g.questionId === q.id)!
      expect(gap.multaPEN).toBe(Math.round(q.multaUIT * UIT * workerFactor))
    })
  })

  // ----- Mixed answers (SI, NO, PARCIAL) -----
  describe('mixed answers with weighted scoring', () => {
    // CR-01 (peso 5) = SI, CR-02 (peso 3) = NO, RB-01 (peso 5) = PARCIAL,
    // SST-01 (peso 4) = SI, SST-02 (peso 3) = NO
    const answers: QuestionAnswer[] = [
      { questionId: 'T-CR-01', answer: 'SI' },
      { questionId: 'T-CR-02', answer: 'NO' },
      { questionId: 'T-RB-01', answer: 'PARCIAL' },
      { questionId: 'T-SST-01', answer: 'SI' },
      { questionId: 'T-SST-02', answer: 'NO' },
    ]
    const result = scoreDiagnostic(sampleQuestions, answers, TOTAL_WORKERS)

    it('should compute per-area scores using peso-weighted average', () => {
      // contratos_registro: (5*100 + 3*0) / (5+3) = 500/8 = 62.5 -> round = 63
      const crScore = result.areaScores.find(a => a.area === 'contratos_registro')!
      expect(crScore.score).toBe(63)

      // remuneraciones_beneficios: (5*50) / (5) = 250/5 = 50
      const rbScore = result.areaScores.find(a => a.area === 'remuneraciones_beneficios')!
      expect(rbScore.score).toBe(50)

      // sst: (4*100 + 3*0) / (4+3) = 400/7 = 57.14 -> round = 57
      const sstScore = result.areaScores.find(a => a.area === 'sst')!
      expect(sstScore.score).toBe(57)
    })

    it('should compute global score as area-weight-weighted average of per-area scores', () => {
      // Areas with questions and their weights:
      //   contratos_registro  weight=15  score=63
      //   remuneraciones_beneficios  weight=20  score=50
      //   sst  weight=20  score=57
      // global = round((63*15 + 50*20 + 57*20) / (15+20+20))
      //        = round((945 + 1000 + 1140) / 55)
      //        = round(3085 / 55) = round(56.09) = 56
      expect(result.scoreGlobal).toBe(56)
    })

    it('should count answeredYes, answeredPartial, answeredNo per area', () => {
      const crScore = result.areaScores.find(a => a.area === 'contratos_registro')!
      expect(crScore.answeredYes).toBe(1)
      expect(crScore.answeredNo).toBe(1)
      expect(crScore.answeredPartial).toBe(0)

      const rbScore = result.areaScores.find(a => a.area === 'remuneraciones_beneficios')!
      expect(rbScore.answeredPartial).toBe(1)
    })

    it('should apply 0.3 factor to PARCIAL multa', () => {
      const workerFactor = Math.max(1, Math.min(TOTAL_WORKERS, 10))
      const rbGap = result.gapAnalysis.find(g => g.questionId === 'T-RB-01')!
      expect(rbGap.answer).toBe('PARCIAL')
      expect(rbGap.multaPEN).toBe(Math.round(2.63 * UIT * workerFactor * 0.3))
    })
  })

  // ----- Gap analysis sorted by priority -----
  describe('gap analysis sorting', () => {
    const answers: QuestionAnswer[] = sampleQuestions.map(q => ({
      questionId: q.id,
      answer: 'NO' as const,
    }))
    const result = scoreDiagnostic(sampleQuestions, answers, TOTAL_WORKERS)

    it('should sort gapAnalysis descending by priority', () => {
      for (let i = 1; i < result.gapAnalysis.length; i++) {
        expect(result.gapAnalysis[i - 1].priority).toBeGreaterThanOrEqual(result.gapAnalysis[i].priority)
      }
    })

    it('should assign higher priority to MUY_GRAVE questions', () => {
      // T-RB-01 peso=5, MUY_GRAVE -> priority = 5*3 = 15
      const rbGap = result.gapAnalysis.find(g => g.questionId === 'T-RB-01')!
      expect(rbGap.priority).toBe(15)

      // T-CR-01 peso=5, GRAVE -> priority = 5*2 = 10
      const crGap = result.gapAnalysis.find(g => g.questionId === 'T-CR-01')!
      expect(crGap.priority).toBe(10)

      // T-CR-02 peso=3, LEVE -> priority = 3*1 = 3
      const crGap2 = result.gapAnalysis.find(g => g.questionId === 'T-CR-02')!
      expect(crGap2.priority).toBe(3)
    })

    it('should limit gapAnalysis to top 20 items', () => {
      expect(result.gapAnalysis.length).toBeLessThanOrEqual(20)
    })
  })

  // ----- Action plan generation -----
  describe('action plan generation', () => {
    const answers: QuestionAnswer[] = sampleQuestions.map(q => ({
      questionId: q.id,
      answer: 'NO' as const,
    }))
    const result = scoreDiagnostic(sampleQuestions, answers, TOTAL_WORKERS)

    it('should produce action items with sequential priority numbers', () => {
      result.actionPlan.forEach((item, i) => {
        expect(item.priority).toBe(i + 1)
      })
    })

    it('should cap action plan at 15 items', () => {
      expect(result.actionPlan.length).toBeLessThanOrEqual(15)
    })

    it('action items should include baseLegal and multaEvitable', () => {
      for (const item of result.actionPlan) {
        expect(item.baseLegal).toBeTruthy()
        expect(item.multaEvitable).toBeGreaterThan(0)
      }
    })

    it('should assign plazoSugerido based on gravedad', () => {
      // The first action item comes from the highest-priority gap
      // Find an action that maps to MUY_GRAVE
      const muyGraveGap = result.gapAnalysis.find(g => g.gravedad === 'MUY_GRAVE')!
      const action = result.actionPlan.find(a => a.questionId === muyGraveGap.questionId)
      if (action) {
        expect(action.plazoSugerido).toBe('Inmediato (7 dias)')
      }

      const graveGap = result.gapAnalysis.find(g => g.gravedad === 'GRAVE')!
      const graveAction = result.actionPlan.find(a => a.questionId === graveGap.questionId)
      if (graveAction) {
        expect(graveAction.plazoSugerido).toBe('Corto plazo (30 dias)')
      }
    })

    it('should generate "Implementar" text for NO answers', () => {
      for (const item of result.actionPlan) {
        expect(item.action).toContain('Implementar:')
      }
    })

    it('should generate "Completar el cumplimiento" text for PARCIAL answers', () => {
      const mixedAnswers: QuestionAnswer[] = sampleQuestions.map(q => ({
        questionId: q.id,
        answer: 'PARCIAL' as const,
      }))
      const mixedResult = scoreDiagnostic(sampleQuestions, mixedAnswers, TOTAL_WORKERS)
      for (const item of mixedResult.actionPlan) {
        expect(item.action).toContain('Completar el cumplimiento de:')
      }
    })
  })

  // ----- Edge cases -----
  describe('edge cases', () => {
    it('should handle empty answers (all treated as NO)', () => {
      const result = scoreDiagnostic(sampleQuestions, [], TOTAL_WORKERS)
      expect(result.scoreGlobal).toBe(0)
      expect(result.gapAnalysis.length).toBe(sampleQuestions.length)
    })

    it('should handle empty questions list', () => {
      const result = scoreDiagnostic([], [], TOTAL_WORKERS)
      expect(result.scoreGlobal).toBe(0)
      expect(result.gapAnalysis).toHaveLength(0)
      expect(result.actionPlan).toHaveLength(0)
    })

    it('should cap workerFactor at 10 for large orgs', () => {
      const answers: QuestionAnswer[] = sampleQuestions.map(q => ({
        questionId: q.id,
        answer: 'NO' as const,
      }))
      const resultSmall = scoreDiagnostic(sampleQuestions, answers, 5)
      const resultLarge = scoreDiagnostic(sampleQuestions, answers, 500)
      const resultTen = scoreDiagnostic(sampleQuestions, answers, 10)

      // Workers 500 should equal workers 10 since factor is capped at 10
      expect(resultLarge.totalMultaRiesgo).toBe(resultTen.totalMultaRiesgo)
      // Workers 5 should be less than workers 10
      expect(resultSmall.totalMultaRiesgo).toBeLessThan(resultTen.totalMultaRiesgo)
    })

    it('should give areas without questions a score of 100', () => {
      const onlyContratosQ: ComplianceQuestion[] = [
        makeQuestion({ id: 'ONLY-01', area: 'contratos_registro', peso: 5 }),
      ]
      const answers: QuestionAnswer[] = [{ questionId: 'ONLY-01', answer: 'SI' }]
      const result = scoreDiagnostic(onlyContratosQ, answers, 5)
      // Areas with no questions should have score 100
      const sstArea = result.areaScores.find(a => a.area === 'sst')!
      expect(sstArea.score).toBe(100)
      expect(sstArea.totalQuestions).toBe(0)
    })

    it('scoreByArea map should contain all AREAS keys', () => {
      const answers: QuestionAnswer[] = sampleQuestions.map(q => ({
        questionId: q.id,
        answer: 'SI' as const,
      }))
      const result = scoreDiagnostic(sampleQuestions, answers, TOTAL_WORKERS)
      const expectedKeys = [
        'contratos_registro', 'remuneraciones_beneficios', 'jornada_descansos',
        'sst', 'documentos_obligatorios', 'relaciones_laborales',
        'igualdad_nodiscriminacion', 'trabajadores_especiales',
      ]
      for (const key of expectedKeys) {
        expect(result.scoreByArea).toHaveProperty(key)
      }
    })
  })
})
