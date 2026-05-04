/**
 * Página 4 — Capítulo II: Estructura organizacional.
 *
 * Listado de unidades con sus cargos y ocupantes, ordenado por jerarquía.
 * No hace gráfico — el árbol visual va al canvas web. Aquí va texto
 * institucional fácil de leer y archivar.
 */
import { Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import {
  ReportHeader,
  ReportFooter,
  DataTable,
  styles as baseStyles,
} from '@/lib/pdf/react-pdf/components'
import { BRAND, TYPO } from '@/lib/pdf/react-pdf/theme'
import type { MemoriaAnualData } from '../types'

const local = StyleSheet.create({
  intro: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    lineHeight: 1.5,
    marginTop: 4,
    marginBottom: 12,
  },
  unitBlock: {
    marginTop: 14,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: BRAND.primaryLight,
  },
  unitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  unitName: {
    fontSize: TYPO.md,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.slate900,
  },
  unitKind: {
    marginLeft: 8,
    fontSize: TYPO.xs,
    color: BRAND.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unitMeta: {
    fontSize: TYPO.xs,
    color: BRAND.muted,
    marginBottom: 6,
  },
})

const KIND_LABEL: Record<string, string> = {
  GERENCIA: 'Gerencia',
  AREA: 'Área',
  DEPARTAMENTO: 'Departamento',
  EQUIPO: 'Equipo',
  COMITE_LEGAL: 'Comité legal',
  BRIGADA: 'Brigada',
  PROYECTO: 'Proyecto',
}

interface UnitWithChildren {
  id: string
  name: string
  kind: string
  level: number
  positions: Array<{
    id: string
    title: string
    isManagerial: boolean
    seats: number
    occupants: Array<{ name: string; isInterim: boolean }>
  }>
}

function buildUnitsHierarchy(data: MemoriaAnualData): UnitWithChildren[] {
  const { tree } = data
  const positionsByUnit = new Map<string, typeof tree.positions>()
  for (const p of tree.positions) {
    const list = positionsByUnit.get(p.orgUnitId) ?? []
    list.push(p)
    positionsByUnit.set(p.orgUnitId, list)
  }

  const occupantsByPos = new Map<string, Array<{ name: string; isInterim: boolean }>>()
  for (const a of tree.assignments) {
    const list = occupantsByPos.get(a.positionId) ?? []
    list.push({
      name: `${a.worker.firstName} ${a.worker.lastName}`,
      isInterim: a.isInterim,
    })
    occupantsByPos.set(a.positionId, list)
  }

  // Recorrido en pre-orden: padres antes que hijos
  const childrenByParent = new Map<string | null, typeof tree.units>()
  for (const u of tree.units) {
    const list = childrenByParent.get(u.parentId ?? null) ?? []
    list.push(u)
    childrenByParent.set(u.parentId ?? null, list)
  }
  for (const list of childrenByParent.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  }

  const result: UnitWithChildren[] = []
  function walk(parentId: string | null, level: number) {
    const kids = childrenByParent.get(parentId) ?? []
    for (const u of kids) {
      const positions = (positionsByUnit.get(u.id) ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        isManagerial: Boolean(p.isManagerial),
        seats: p.seats,
        occupants: occupantsByPos.get(p.id) ?? [],
      }))
      result.push({
        id: u.id,
        name: u.name,
        kind: u.kind,
        level,
        positions,
      })
      walk(u.id, level + 1)
    }
  }
  walk(null, 0)
  return result
}

export function StructurePage({ data }: { data: MemoriaAnualData }) {
  const { org, year } = data
  const units = buildUnitsHierarchy(data)

  return (
    <Page size="A4" style={baseStyles.page}>
      <ReportHeader
        title="II · ESTRUCTURA ORGANIZACIONAL"
        subtitle={`${org.razonSocial ?? org.name} — Ejercicio ${year}`}
      />
      <Text style={baseStyles.sectionTitle}>UNIDADES, CARGOS Y OCUPANTES</Text>
      <Text style={local.intro}>
        Detalle de la estructura organizacional al cierre del ejercicio. Cada unidad se
        muestra con sus cargos y la(s) persona(s) asignada(s). Los cargos sin ocupante
        figuran como vacantes.
      </Text>

      {units.map((u) => (
        <View key={u.id} style={[local.unitBlock, { marginLeft: u.level * 8 }]} wrap={false}>
          <View style={local.unitHeader}>
            <Text style={local.unitName}>{u.name}</Text>
            <Text style={local.unitKind}>{KIND_LABEL[u.kind] ?? u.kind}</Text>
          </View>
          <Text style={local.unitMeta}>
            {u.positions.length} cargo{u.positions.length === 1 ? '' : 's'} ·{' '}
            {u.positions.reduce((s, p) => s + p.occupants.length, 0)} persona
            {u.positions.reduce((s, p) => s + p.occupants.length, 0) === 1 ? '' : 's'}
          </Text>
          {u.positions.length > 0 && (
            <DataTable
              columns={[
                { header: 'Cargo', width: 4 },
                { header: 'Tipo', width: 1.2 },
                { header: 'Ocupante(s)', width: 4 },
                { header: 'Seats', width: 0.8, align: 'right' },
              ]}
              rows={u.positions.map((p) => [
                p.title,
                p.isManagerial ? 'Jefatura' : 'Operativo',
                p.occupants.length === 0
                  ? 'Vacante'
                  : p.occupants
                      .map((o) => `${o.name}${o.isInterim ? ' (interino)' : ''}`)
                      .join(', '),
                `${p.occupants.length}/${p.seats}`,
              ])}
            />
          )}
        </View>
      ))}

      <ReportFooter />
    </Page>
  )
}
