import { describe, expect, it } from 'vitest'
import { estimarMultaPregunta, scoreDiagnostic, workerFactorFor } from '../diagnostic-scorer'
import type { QuestionAnswer } from '../diagnostic-scorer'
import { parseDiagnosticSubmission } from '../diagnostic-submission'
import {
  comoVerificar,
  enunciadoDePregunta,
  explicarPregunta,
  gravedadEnPalabras,
  infraccionEnPalabras,
  leerRespuestasGuardadas,
} from '../diagnostic-guidance'
import { actionPlanToTaskInputs, taskTitleFor } from '../task-spawner'
import { EXPRESS_QUESTIONS } from '../questions'
import type { ComplianceQuestion } from '../questions/types'
import { PERU_LABOR } from '@/lib/legal-engine/peru-labor'
import { respuestasPorArea } from '@/app/dashboard/diagnostico/_lib/diagnostic-meta'

function q(overrides: Partial<ComplianceQuestion> & { id: string; area: ComplianceQuestion['area'] }): ComplianceQuestion {
  return {
    text: '¿Se cumple la obligación de prueba?',
    baseLegal: 'D.Leg. 728, Art. 4',
    infraccionGravedad: 'GRAVE',
    multaUIT: 1,
    peso: 2,
    express: false,
    ...overrides,
  }
}

const preguntas: ComplianceQuestion[] = [
  q({ id: 'T-CR-01', area: 'contratos_registro' }),
  q({ id: 'T-CR-02', area: 'contratos_registro' }),
  q({ id: 'T-SST-01', area: 'sst', text: '¿Se entregan EPP a los trabajadores?' }),
]

const ans = (questionId: string, answer: QuestionAnswer['answer']): QuestionAnswer => ({ questionId, answer })

describe('scoreDiagnostic con «No sé» y «No aplica»', () => {
  it('«No sé» cuenta como «No» en puntaje y multa, pero se reporta aparte', () => {
    const conNo = scoreDiagnostic(preguntas, [ans('T-CR-01', 'SI'), ans('T-CR-02', 'NO'), ans('T-SST-01', 'SI')], 5)
    const conNoSe = scoreDiagnostic(preguntas, [ans('T-CR-01', 'SI'), ans('T-CR-02', 'NO_SE'), ans('T-SST-01', 'SI')], 5)

    expect(conNoSe.scoreGlobal).toBe(conNo.scoreGlobal)
    expect(conNoSe.totalMultaRiesgo).toBe(conNo.totalMultaRiesgo)

    const area = conNoSe.areaScores.find((a) => a.area === 'contratos_registro')!
    expect(area.answeredNoSe).toBe(1)
    expect(area.answeredNo).toBe(0)

    expect(conNoSe.porVerificar).toHaveLength(1)
    expect(conNoSe.porVerificar[0].answer).toBe('NO_SE')
    expect(conNoSe.porVerificar[0].comoVerificar).toBeTruthy()
  })

  it('«No aplica» sale del denominador: no suma, no resta, sin multa ni acción', () => {
    const r = scoreDiagnostic(preguntas, [ans('T-CR-01', 'SI'), ans('T-CR-02', 'NO_APLICA'), ans('T-SST-01', 'SI')], 5)
    const area = r.areaScores.find((a) => a.area === 'contratos_registro')!
    expect(area.score).toBe(100)
    expect(area.applicableQuestions).toBe(1)
    expect(area.answeredNoAplica).toBe(1)
    expect(r.totalMultaRiesgo).toBe(0)
    expect(r.gapAnalysis).toHaveLength(0)
    expect(r.actionPlan).toHaveLength(0)
  })

  it('un área entera «No aplica» no cuenta en el puntaje global', () => {
    const r = scoreDiagnostic(
      preguntas,
      [ans('T-CR-01', 'NO_APLICA'), ans('T-CR-02', 'NO_APLICA'), ans('T-SST-01', 'NO')],
      5
    )
    // Solo queda SST, con 0 puntos: el global es 0, no un promedio inflado por el 100 del área que no aplica.
    expect(r.scoreGlobal).toBe(0)
  })

  it('las «No sé» nunca se recortan del análisis aunque haya muchas brechas', () => {
    const muchas = Array.from({ length: 30 }, (_, i) => q({ id: `T-X-${i}`, area: 'documentos_obligatorios', multaUIT: 5 }))
    const dudosa = q({ id: 'T-DUDA', area: 'sst', multaUIT: 0.1, infraccionGravedad: 'LEVE' })
    const r = scoreDiagnostic(
      [...muchas, dudosa],
      [...muchas.map((m) => ans(m.id, 'NO')), ans('T-DUDA', 'NO_SE')],
      5
    )
    expect(r.gapAnalysis.filter((g) => g.answer !== 'NO_SE')).toHaveLength(20)
    expect(r.gapAnalysis.some((g) => g.questionId === 'T-DUDA')).toBe(true)
    expect(r.actionPlan.length).toBeLessThanOrEqual(15)
  })

  it('la acción de una «No sé» pide verificar y explica cómo', () => {
    const r = scoreDiagnostic(preguntas, [ans('T-CR-01', 'SI'), ans('T-CR-02', 'SI'), ans('T-SST-01', 'NO_SE')], 5)
    expect(r.actionPlan[0].action).toMatch(/^Verificar si se cumple: Se entregan EPP/)
    expect(r.actionPlan[0].action).toContain('Cómo averiguarlo:')
  })

  it('la multa por pregunta usa la misma escala que el puntaje', () => {
    expect(workerFactorFor(10)).toBe(1)
    expect(workerFactorFor(11)).toBe(5)
    expect(workerFactorFor(501)).toBe(30)
    expect(estimarMultaPregunta({ multaUIT: 1 }, 20)).toBe(Math.round(PERU_LABOR.UIT * 5))
  })
})

describe('parseDiagnosticSubmission', () => {
  it('acepta las cinco respuestas y null', () => {
    const r = parseDiagnosticSubmission({
      type: 'EXPRESS',
      answers: [
        ans('A', 'SI'), ans('B', 'PARCIAL'), ans('C', 'NO'), ans('D', 'NO_SE'), ans('E', 'NO_APLICA'), ans('F', null),
      ],
    })
    expect(r.ok).toBe(true)
  })

  it('sigue aceptando envíos antiguos sin tipo (FULL por defecto)', () => {
    const r = parseDiagnosticSubmission({ answers: [ans('A', 'SI')] })
    expect(r.ok && r.data.type).toBe('FULL')
  })

  it('rechaza respuestas desconocidas, tipos inválidos y envíos vacíos con mensajes en español', () => {
    const malaRespuesta = parseDiagnosticSubmission({ answers: [{ questionId: 'A', answer: 'QUIZAS' }] })
    expect(malaRespuesta).toEqual({ ok: false, error: expect.stringContaining('No sé') })

    const malTipo = parseDiagnosticSubmission({ type: 'OTRO', answers: [ans('A', 'SI')] })
    expect(malTipo.ok).toBe(false)

    expect(parseDiagnosticSubmission({ answers: [] })).toEqual({ ok: false, error: 'Envía al menos una respuesta.' })
    expect(parseDiagnosticSubmission(null).ok).toBe(false)
  })

  it('si una pregunta viene repetida se queda la última respuesta', () => {
    const r = parseDiagnosticSubmission({ answers: [ans('A', 'NO'), ans('A', 'SI')] })
    expect(r.ok && r.data.answers).toEqual([ans('A', 'SI')])
  })
})

describe('guía didáctica', () => {
  it('todas las preguntas express explican por qué se preguntan', () => {
    for (const pregunta of EXPRESS_QUESTIONS) {
      expect(pregunta.helpText?.trim(), pregunta.id).toBeTruthy()
      expect(explicarPregunta(pregunta)).toBeTruthy()
    }
  })

  it('siempre da una pista para salir de un «No sé»', () => {
    for (const pregunta of EXPRESS_QUESTIONS) {
      expect(comoVerificar(pregunta).length, pregunta.id).toBeGreaterThan(10)
    }
  })

  it('gravedad en palabras y enunciado sin signos', () => {
    expect(gravedadEnPalabras('MUY_GRAVE')).toBe('Muy grave')
    expect(infraccionEnPalabras('LEVE')).toBe('Infracción leve')
    expect(infraccionEnPalabras('RARA')).toBe('Infracción')
    expect(enunciadoDePregunta('¿Se paga la CTS? ')).toBe('Se paga la CTS')
  })

  it('lee respuestas guardadas antiguas y nuevas e ignora lo que no es respuesta', () => {
    expect(
      leerRespuestasGuardadas([
        { questionId: 'A', answer: 'SI' },
        { questionId: 'B', answer: 'NO_SE' },
        { questionId: 'C', answer: null },
        { questionId: 'D', answer: 'HALLAZGO' },
        { foo: 1 },
        'texto',
      ])
    ).toEqual([
      { questionId: 'A', answer: 'SI' },
      { questionId: 'B', answer: 'NO_SE' },
      { questionId: 'C', answer: null },
    ])
    expect(leerRespuestasGuardadas({ no: 'es lista' })).toEqual([])
  })
})

describe('tareas creadas desde el diagnóstico', () => {
  it('marca «Por verificar» y no corta preguntas con dos puntos', () => {
    expect(taskTitleFor({ text: '¿Tiene el registro de: accidentes?', answer: 'NO_SE' }, 'x')).toBe(
      'Por verificar: ¿Tiene el registro de: accidentes?'
    )
    expect(taskTitleFor(undefined, 'Implementar: algo. Base legal: X.')).toBe('Implementar')
    expect(taskTitleFor({ text: 'a '.repeat(100), answer: 'NO' }, 'x').length).toBeLessThanOrEqual(120)
  })

  it('pasa la respuesta al título de la tarea', () => {
    const [input] = actionPlanToTaskInputs(
      [{ priority: 1, area: 'sst', areaLabel: 'SST', questionId: 'Q1', action: 'Verificar.', baseLegal: 'Ley', multaEvitable: 1, plazoSugerido: 'Corto plazo (30 días)' }],
      [{ questionId: 'Q1', gravedad: 'GRAVE', text: '¿Hay IPERC?', answer: 'NO_SE' }]
    )
    expect(input.title).toBe('Por verificar: ¿Hay IPERC?')
  })
})

describe('resultado: respuestas por área', () => {
  it('cuenta respondidas y «No aplica» por área con el banco real', () => {
    const [a, b] = EXPRESS_QUESTIONS.filter((p) => p.area === EXPRESS_QUESTIONS[0].area)
    const resumen = respuestasPorArea([
      { questionId: a.id, answer: 'NO_APLICA' },
      ...(b ? [{ questionId: b.id, answer: 'SI' }] : []),
      { questionId: 'NO-EXISTE', answer: 'SI' },
    ])
    expect(resumen?.[a.area]).toEqual({ respondidas: b ? 2 : 1, noAplica: 1 })
  })

  it('sin respuestas legibles devuelve null (se muestran todas las áreas)', () => {
    expect(respuestasPorArea(null)).toBeNull()
    expect(respuestasPorArea([{ questionId: 'NO-EXISTE', answer: 'SI' }])).toBeNull()
  })
})
