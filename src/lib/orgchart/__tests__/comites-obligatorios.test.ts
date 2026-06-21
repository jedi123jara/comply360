import { describe, it, expect } from 'vitest'
import {
  COMITES_OBLIGATORIOS,
  evaluarComitesObligatorios,
  type ComiteContext,
} from '../comites-obligatorios'
import { listOrgTemplates } from '../templates'

function evalById(ctx: ComiteContext) {
  const map = new Map(evaluarComitesObligatorios(ctx).map((r) => [r.obligacion.id, r]))
  return map
}

describe('catálogo de comités obligatorios', () => {
  it('evalúa las 7 obligaciones del catálogo', () => {
    const res = evaluarComitesObligatorios({ workerCount: 50 })
    expect(res).toHaveLength(COMITES_OBLIGATORIOS.length)
    expect(res).toHaveLength(7)
  })

  describe('SST (umbral 20)', () => {
    it('≥20 trabajadores → Comité paritario', () => {
      const sst = evalById({ workerCount: 20 }).get('sst')!
      expect(sst.applicability).toBe('obligatorio')
      expect(sst.templateId).toBe('comite-sst-paritario')
      expect(sst.resolvedTitle).toMatch(/Comité/)
    })
    it('<20 trabajadores → Supervisor', () => {
      const sst = evalById({ workerCount: 19 }).get('sst')!
      expect(sst.applicability).toBe('obligatorio')
      expect(sst.templateId).toBe('supervisor-sst')
      expect(sst.resolvedTitle).toMatch(/Supervisor/)
    })
  })

  describe('Hostigamiento (umbral 20)', () => {
    it('≥20 → CIHSO (comité)', () => {
      const h = evalById({ workerCount: 25 }).get('hostigamiento')!
      expect(h.applicability).toBe('obligatorio')
      expect(h.templateId).toBe('comite-hostigamiento-sexual')
      expect(h.resolvedTitle).toMatch(/CIHSO|Comité/)
    })
    it('<20 → Gestor (responsable único) pero sigue obligatorio', () => {
      const h = evalById({ workerCount: 5 }).get('hostigamiento')!
      expect(h.applicability).toBe('obligatorio')
      expect(h.resolvedTitle).toMatch(/Gestor/)
    })
  })

  it('Cuadro de categorías (Ley 30709) → siempre obligatorio, documento sin plantilla', () => {
    const c = evalById({ workerCount: 3 }).get('cuadro-categorias')!
    expect(c.applicability).toBe('obligatorio')
    expect(c.obligacion.kind).toBe('documento')
    expect(c.templateId).toBeNull()
  })

  describe('Brigada de emergencia', () => {
    it('≥20 → obligatoria', () => {
      expect(evalById({ workerCount: 30 }).get('brigada-emergencia')!.applicability).toBe('obligatorio')
    })
    it('<20 → recomendada', () => {
      expect(evalById({ workerCount: 8 }).get('brigada-emergencia')!.applicability).toBe('recomendado')
    })
  })

  describe('Lactario (umbral 20 mujeres en edad fértil)', () => {
    it('sin dato → condicional', () => {
      expect(evalById({ workerCount: 50 }).get('lactario')!.applicability).toBe('condicional')
    })
    it('≥20 mujeres fértiles → obligatorio', () => {
      expect(evalById({ workerCount: 50, womenFertileCount: 20 }).get('lactario')!.applicability).toBe('obligatorio')
    })
    it('<20 mujeres fértiles → no aplica', () => {
      expect(evalById({ workerCount: 50, womenFertileCount: 5 }).get('lactario')!.applicability).toBe('no-aplica')
    })
  })

  describe('Asistenta social (umbral 100 mujeres)', () => {
    it('sin dato → condicional', () => {
      expect(evalById({ workerCount: 50 }).get('asistenta-social')!.applicability).toBe('condicional')
    })
    it('≥100 mujeres → obligatorio', () => {
      expect(evalById({ workerCount: 200, womenCount: 100 }).get('asistenta-social')!.applicability).toBe('obligatorio')
    })
    it('<100 mujeres → no aplica', () => {
      expect(evalById({ workerCount: 200, womenCount: 40 }).get('asistenta-social')!.applicability).toBe('no-aplica')
    })
  })

  describe('DPO (Ley 29733)', () => {
    it('sin dato → condicional', () => {
      expect(evalById({ workerCount: 50 }).get('dpo')!.applicability).toBe('condicional')
    })
    it('trata datos → recomendado', () => {
      expect(evalById({ workerCount: 50, processesPersonalData: true }).get('dpo')!.applicability).toBe('recomendado')
    })
    it('no trata datos → no aplica', () => {
      expect(evalById({ workerCount: 50, processesPersonalData: false }).get('dpo')!.applicability).toBe('no-aplica')
    })
  })

  it('todos los templateId del catálogo existen en ORG_TEMPLATES', () => {
    const validIds = new Set(listOrgTemplates().map((t) => t.id))
    // Recolecta los templateId resueltos en distintos contextos (para cubrir las
    // ramas de SST/hostigamiento) y verifica que cada uno (no-null) exista.
    const contexts: ComiteContext[] = [
      { workerCount: 5 },
      { workerCount: 25 },
      { workerCount: 200, womenCount: 100, womenFertileCount: 20, processesPersonalData: true },
    ]
    for (const ctx of contexts) {
      for (const r of evaluarComitesObligatorios(ctx)) {
        if (r.templateId !== null) {
          expect(validIds, `templateId "${r.templateId}" de "${r.obligacion.id}" debe existir`).toContain(r.templateId)
        }
      }
    }
  })
})
