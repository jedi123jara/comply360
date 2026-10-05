import { describe, expect, it } from 'vitest'
import { CONTRACT_TEMPLATES } from '@/lib/legal-engine/contracts/templates'
import {
  CONTRACT_KIND_SUMMARIES,
  DESNATURALIZACION_WARNING,
  getAdvisorQuestions,
  recommendContract,
  type AdvisorAnswers,
} from '../contract-advisor'

const ids = (answers: AdvisorAnswers) => getAdvisorQuestions(answers).map(q => q.id)

describe('getAdvisorQuestions', () => {
  it('empieza preguntando por horario y jefe', () => {
    expect(ids({})).toEqual(['subordinacion'])
  })

  it('no hace más preguntas si el servicio es independiente', () => {
    expect(ids({ subordinacion: 'no' })).toEqual(['subordinacion'])
  })

  it('pregunta el motivo solo si el puesto es temporal', () => {
    expect(ids({ subordinacion: 'si' })).toEqual(['subordinacion', 'duracion'])
    expect(ids({ subordinacion: 'si', duracion: 'permanente' })).toEqual(['subordinacion', 'duracion', 'jornada'])
    expect(ids({ subordinacion: 'si', duracion: 'temporal' })).toEqual(['subordinacion', 'duracion', 'motivo'])
    expect(ids({ subordinacion: 'si', duracion: 'temporal', motivo: 'proyecto' })).toEqual([
      'subordinacion',
      'duracion',
      'motivo',
      'jornada',
    ])
  })
})

describe('recommendContract', () => {
  it('no recomienda nada mientras falten respuestas', () => {
    expect(recommendContract({})).toBeNull()
    expect(recommendContract({ subordinacion: 'si' })).toBeNull()
    expect(recommendContract({ subordinacion: 'si', duracion: 'temporal' })).toBeNull()
    expect(recommendContract({ subordinacion: 'si', duracion: 'permanente' })).toBeNull()
  })

  it('sin horario ni jefe sugiere locación de servicios con advertencia de desnaturalización', () => {
    const rec = recommendContract({ subordinacion: 'no' })
    expect(rec?.kind).toBe('locacion')
    expect(rec?.templateId).toBe('locacion-servicios')
    expect(rec?.warning).toBe(DESNATURALIZACION_WARNING)
    expect(rec?.warning).toMatch(/desnaturalización/)
  })

  it('puesto permanente con jornada completa sugiere plazo indeterminado', () => {
    const rec = recommendContract({ subordinacion: 'si', duracion: 'permanente', jornada: 'completa' })
    expect(rec?.kind).toBe('indeterminado')
    expect(rec?.templateId).toBe('laboral-indefinido')
    expect(rec?.warning).toBeUndefined()
  })

  it('puesto temporal con causa real sugiere plazo fijo', () => {
    for (const motivo of ['proyecto', 'temporada', 'reemplazo', 'aumento'] as const) {
      const rec = recommendContract({ subordinacion: 'si', duracion: 'temporal', motivo, jornada: 'completa' })
      expect(rec?.kind).toBe('plazo-fijo')
      expect(rec?.templateId).toBe('laboral-plazo-fijo')
    }
  })

  it('temporal "solo para probar" sugiere plazo indeterminado y advierte', () => {
    const rec = recommendContract({
      subordinacion: 'si',
      duracion: 'temporal',
      motivo: 'sin-motivo',
      jornada: 'completa',
    })
    expect(rec?.kind).toBe('indeterminado')
    expect(rec?.templateId).toBe('laboral-indefinido')
    expect(rec?.warning).toMatch(/periodo de prueba/)
  })

  it('menos de 4 horas diarias sugiere tiempo parcial y deja marcada la jornada', () => {
    const permanente = recommendContract({ subordinacion: 'si', duracion: 'permanente', jornada: 'parcial' })
    expect(permanente?.kind).toBe('tiempo-parcial')
    expect(permanente?.templateId).toBe('laboral-indefinido')
    expect(permanente?.presetFields).toEqual({ jornada: 'parcial' })

    const temporal = recommendContract({
      subordinacion: 'si',
      duracion: 'temporal',
      motivo: 'proyecto',
      jornada: 'parcial',
    })
    expect(temporal?.kind).toBe('tiempo-parcial')
    expect(temporal?.templateId).toBe('laboral-plazo-fijo')
  })

  it('ignora respuestas que ya no aplican', () => {
    const rec = recommendContract({
      subordinacion: 'si',
      duracion: 'permanente',
      motivo: 'proyecto',
      jornada: 'completa',
    })
    expect(rec?.kind).toBe('indeterminado')
  })

  it('siempre apunta a plantillas que existen y a valores de jornada válidos', () => {
    const cases: AdvisorAnswers[] = [
      { subordinacion: 'no' },
      { subordinacion: 'si', duracion: 'permanente', jornada: 'completa' },
      { subordinacion: 'si', duracion: 'permanente', jornada: 'parcial' },
      { subordinacion: 'si', duracion: 'temporal', motivo: 'reemplazo', jornada: 'parcial' },
    ]
    for (const answers of cases) {
      const rec = recommendContract(answers)
      const template = CONTRACT_TEMPLATES.find(t => t.id === rec?.templateId)
      expect(template).toBeDefined()
      if (rec?.presetFields?.jornada) {
        const jornadaField = template?.sections.flatMap(s => s.fields).find(f => f.id === 'jornada')
        expect(jornadaField?.options?.map(o => o.value)).toContain(rec.presetFields.jornada)
      }
    }
  })
})

describe('CONTRACT_KIND_SUMMARIES', () => {
  it('explica los cuatro contratos más comunes', () => {
    expect(CONTRACT_KIND_SUMMARIES.map(s => s.kind)).toEqual([
      'indeterminado',
      'plazo-fijo',
      'tiempo-parcial',
      'locacion',
    ])
  })
})
