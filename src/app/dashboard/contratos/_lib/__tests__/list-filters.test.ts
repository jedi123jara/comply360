import { describe, expect, it } from 'vitest'
import {
  applyFilterPatch,
  buildContractsApiQuery,
  EMPTY_CONTRACT_FILTERS,
  hasActiveFilters,
  parseContractListFilters,
  serializeContractListFilters,
} from '../list-filters'

const qs = (query: string) => new URLSearchParams(query)

describe('parseContractListFilters', () => {
  it('lee el estado desde ?status= (sin importar mayúsculas)', () => {
    expect(parseContractListFilters(qs('status=DRAFT')).status).toBe('DRAFT')
    expect(parseContractListFilters(qs('status=signed')).status).toBe('SIGNED')
  })

  it('ignora estados y tipos desconocidos para no romper la API', () => {
    const f = parseContractListFilters(qs('status=BORRADOR&type=MYPE_MICRO'))
    expect(f.status).toBeNull()
    expect(f.type).toBeNull()
  })

  it('acepta tipos válidos del enum ContractType', () => {
    expect(parseContractListFilters(qs('type=LABORAL_PLAZO_FIJO')).type).toBe('LABORAL_PLAZO_FIJO')
    expect(parseContractListFilters(qs('type=laboral_tiempo_parcial')).type).toBe('LABORAL_TIEMPO_PARCIAL')
  })

  it('lee la búsqueda desde ?q= o ?search=', () => {
    expect(parseContractListFilters(qs('q=%20Juan%20')).search).toBe('Juan')
    expect(parseContractListFilters(qs('search=Ana')).search).toBe('Ana')
  })

  it('lee el filtro de vencimiento cercano', () => {
    expect(parseContractListFilters(qs('vence=pronto')).expiringSoon).toBe(true)
    expect(parseContractListFilters(qs('vence=30')).expiringSoon).toBe(true)
    expect(parseContractListFilters(qs('expiringSoonDays=30')).expiringSoon).toBe(true)
    expect(parseContractListFilters(qs('vence=nunca')).expiringSoon).toBe(false)
    expect(parseContractListFilters(qs('')).expiringSoon).toBe(false)
  })

  it('normaliza la página', () => {
    expect(parseContractListFilters(qs('page=3')).page).toBe(3)
    expect(parseContractListFilters(qs('page=0')).page).toBe(1)
    expect(parseContractListFilters(qs('page=abc')).page).toBe(1)
  })
})

describe('serializeContractListFilters', () => {
  it('solo escribe los filtros activos', () => {
    expect(serializeContractListFilters(EMPTY_CONTRACT_FILTERS)).toBe('')
    expect(
      serializeContractListFilters({ ...EMPTY_CONTRACT_FILTERS, status: 'DRAFT', expiringSoon: true, page: 2 }),
    ).toBe('status=DRAFT&vence=pronto&page=2')
  })

  it('es reversible con parseContractListFilters', () => {
    const original = {
      status: 'IN_REVIEW' as const,
      type: 'LOCACION_SERVICIOS',
      search: 'gerente',
      expiringSoon: true,
      page: 4,
    }
    expect(parseContractListFilters(qs(serializeContractListFilters(original)))).toEqual(original)
  })
})

describe('buildContractsApiQuery', () => {
  it('traduce "vencen pronto" al parámetro de la API', () => {
    const query = qs(buildContractsApiQuery({ ...EMPTY_CONTRACT_FILTERS, expiringSoon: true }, 50))
    expect(query.get('expiringSoonDays')).toBe('30')
    expect(query.get('page')).toBe('1')
    expect(query.get('limit')).toBe('50')
    expect(query.has('status')).toBe(false)
  })

  it('envía estado, tipo y búsqueda', () => {
    const query = qs(
      buildContractsApiQuery(
        { ...EMPTY_CONTRACT_FILTERS, status: 'SIGNED', type: 'LABORAL_INDEFINIDO', search: 'ana' },
        20,
      ),
    )
    expect(query.get('status')).toBe('SIGNED')
    expect(query.get('type')).toBe('LABORAL_INDEFINIDO')
    expect(query.get('search')).toBe('ana')
  })
})

describe('applyFilterPatch / hasActiveFilters', () => {
  it('vuelve a la página 1 cuando cambia un filtro', () => {
    const current = { ...EMPTY_CONTRACT_FILTERS, page: 5 }
    expect(applyFilterPatch(current, { status: 'DRAFT' }).page).toBe(1)
    expect(applyFilterPatch(current, { page: 6 }).page).toBe(6)
  })

  it('detecta filtros activos', () => {
    expect(hasActiveFilters(EMPTY_CONTRACT_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...EMPTY_CONTRACT_FILTERS, page: 3 })).toBe(false)
    expect(hasActiveFilters({ ...EMPTY_CONTRACT_FILTERS, expiringSoon: true })).toBe(true)
  })
})
