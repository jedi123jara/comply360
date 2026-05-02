import type { OrgUnitDTO, OrgPositionDTO, OrgAssignmentDTO } from '@/lib/orgchart/types'

export interface NodeBox {
  id: string
  x: number
  y: number
  width: number
  height: number
  unit: OrgUnitDTO
  positions: OrgPositionDTO[]
  occupants: Map<string, OrgAssignmentDTO[]>
}

export interface EdgeLink {
  fromId: string
  toId: string
  fromX: number
  fromY: number
  toX: number
  toY: number
}

export interface LayoutResult {
  nodes: NodeBox[]
  edges: EdgeLink[]
  width: number
  height: number
}

export interface PositionNodeBox {
  id: string
  x: number
  y: number
  width: number
  height: number
  position: OrgPositionDTO
  unit: OrgUnitDTO | null
  occupants: OrgAssignmentDTO[]
  directReports: number
}

export interface PositionLayoutResult {
  nodes: PositionNodeBox[]
  edges: EdgeLink[]
  width: number
  height: number
}

const NODE_WIDTH = 260
const NODE_BASE_HEIGHT = 110
const NODE_HEIGHT_PER_POSITION = 38
const HORIZONTAL_GAP = 48
const VERTICAL_GAP = 90
const POSITION_NODE_WIDTH = 200
const POSITION_NODE_HEIGHT = 90
const POSITION_HORIZONTAL_GAP = 36
const POSITION_VERTICAL_GAP = 78

/**
 * Layout top-down jerárquico simple. No es dagre — calcula la "anchura" de
 * cada subárbol sumando hijos y centra los padres.
 *
 * Suficiente para árboles de hasta ~300 nodos. Para más, conviene migrar a
 * dagre o react-flow.
 */
export function computeLayout(
  units: OrgUnitDTO[],
  positions: OrgPositionDTO[],
  assignments: OrgAssignmentDTO[],
): LayoutResult {
  const childrenByParent = new Map<string | null, OrgUnitDTO[]>()
  for (const u of units) {
    const key = u.parentId ?? null
    const list = childrenByParent.get(key) ?? []
    list.push(u)
    childrenByParent.set(key, list)
  }
  for (const list of childrenByParent.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  }

  const positionsByUnit = new Map<string, OrgPositionDTO[]>()
  for (const p of positions) {
    const list = positionsByUnit.get(p.orgUnitId) ?? []
    list.push(p)
    positionsByUnit.set(p.orgUnitId, list)
  }

  const occupantsByPosition = new Map<string, OrgAssignmentDTO[]>()
  for (const a of assignments) {
    const list = occupantsByPosition.get(a.positionId) ?? []
    list.push(a)
    occupantsByPosition.set(a.positionId, list)
  }

  // Step 1: calcular anchura del subárbol de cada nodo
  const subtreeWidth = new Map<string, number>()
  function widthOf(id: string): number {
    if (subtreeWidth.has(id)) return subtreeWidth.get(id)!
    const kids = childrenByParent.get(id) ?? []
    if (kids.length === 0) {
      subtreeWidth.set(id, NODE_WIDTH)
      return NODE_WIDTH
    }
    const w = kids.reduce((acc, k, i) => acc + widthOf(k.id) + (i > 0 ? HORIZONTAL_GAP : 0), 0)
    subtreeWidth.set(id, Math.max(NODE_WIDTH, w))
    return subtreeWidth.get(id)!
  }

  const roots = childrenByParent.get(null) ?? []
  // Step 2: posicionar
  const nodes: NodeBox[] = []
  const edges: EdgeLink[] = []
  let cursorX = 0
  for (const root of roots) {
    placeSubtree(root, cursorX, 0)
    cursorX += widthOf(root.id) + HORIZONTAL_GAP
  }

  function placeSubtree(unit: OrgUnitDTO, leftX: number, depth: number) {
    const myWidth = widthOf(unit.id)
    const positionsHere = positionsByUnit.get(unit.id) ?? []
    const height = NODE_BASE_HEIGHT + positionsHere.length * NODE_HEIGHT_PER_POSITION
    const y = depth * (NODE_BASE_HEIGHT + 4 * NODE_HEIGHT_PER_POSITION + VERTICAL_GAP)
    const centerX = leftX + myWidth / 2
    const x = centerX - NODE_WIDTH / 2

    const occupantsByThisUnitsPositions = new Map<string, OrgAssignmentDTO[]>()
    for (const p of positionsHere) {
      occupantsByThisUnitsPositions.set(p.id, occupantsByPosition.get(p.id) ?? [])
    }

    nodes.push({
      id: unit.id,
      x,
      y,
      width: NODE_WIDTH,
      height,
      unit,
      positions: positionsHere,
      occupants: occupantsByThisUnitsPositions,
    })

    const kids = childrenByParent.get(unit.id) ?? []
    let kidLeft = leftX
    if (kids.length > 0) {
      const totalKidsWidth = kids.reduce((acc, k, i) => acc + widthOf(k.id) + (i > 0 ? HORIZONTAL_GAP : 0), 0)
      kidLeft = leftX + (myWidth - totalKidsWidth) / 2
    }
    for (const kid of kids) {
      const kidW = widthOf(kid.id)
      placeSubtree(kid, kidLeft, depth + 1)

      const fromX = centerX
      const fromY = y + height
      const toX = kidLeft + kidW / 2
      const toY = (depth + 1) * (NODE_BASE_HEIGHT + 4 * NODE_HEIGHT_PER_POSITION + VERTICAL_GAP)
      edges.push({ fromId: unit.id, toId: kid.id, fromX, fromY, toX, toY })

      kidLeft += kidW + HORIZONTAL_GAP
    }
  }

  const totalWidth = Math.max(NODE_WIDTH, cursorX)
  const totalHeight = nodes.reduce((m, n) => Math.max(m, n.y + n.height), 0)

  return { nodes, edges, width: totalWidth + HORIZONTAL_GAP, height: totalHeight + VERTICAL_GAP }
}

export function bezierPath(e: EdgeLink): string {
  const midY = (e.fromY + e.toY) / 2
  return `M ${e.fromX} ${e.fromY} C ${e.fromX} ${midY}, ${e.toX} ${midY}, ${e.toX} ${e.toY}`
}

export function computePositionLayout(
  units: OrgUnitDTO[],
  positions: OrgPositionDTO[],
  assignments: OrgAssignmentDTO[],
): PositionLayoutResult {
  const unitsById = new Map(units.map(u => [u.id, u]))
  const positionIds = new Set(positions.map(p => p.id))
  const childrenByParent = new Map<string | null, OrgPositionDTO[]>()

  for (const position of positions) {
    const parentId = position.reportsToPositionId && positionIds.has(position.reportsToPositionId)
      ? position.reportsToPositionId
      : null
    const list = childrenByParent.get(parentId) ?? []
    list.push(position)
    childrenByParent.set(parentId, list)
  }

  for (const list of childrenByParent.values()) {
    list.sort((a, b) => a.title.localeCompare(b.title))
  }

  const occupantsByPosition = new Map<string, OrgAssignmentDTO[]>()
  for (const assignment of assignments) {
    const list = occupantsByPosition.get(assignment.positionId) ?? []
    list.push(assignment)
    occupantsByPosition.set(assignment.positionId, list)
  }

  const subtreeWidth = new Map<string, number>()
  function widthOf(id: string): number {
    if (subtreeWidth.has(id)) return subtreeWidth.get(id)!
    const kids = childrenByParent.get(id) ?? []
    if (kids.length === 0) {
      subtreeWidth.set(id, POSITION_NODE_WIDTH)
      return POSITION_NODE_WIDTH
    }
    const width = kids.reduce(
      (acc, kid, index) => acc + widthOf(kid.id) + (index > 0 ? POSITION_HORIZONTAL_GAP : 0),
      0,
    )
    subtreeWidth.set(id, Math.max(POSITION_NODE_WIDTH, width))
    return subtreeWidth.get(id)!
  }

  const roots = childrenByParent.get(null) ?? []
  const nodes: PositionNodeBox[] = []
  const edges: EdgeLink[] = []
  let cursorX = 0

  for (const root of roots) {
    placeSubtree(root, cursorX, 0)
    cursorX += widthOf(root.id) + POSITION_HORIZONTAL_GAP
  }

  function placeSubtree(position: OrgPositionDTO, leftX: number, depth: number) {
    const myWidth = widthOf(position.id)
    const centerX = leftX + myWidth / 2
    const x = centerX - POSITION_NODE_WIDTH / 2
    const y = depth * (POSITION_NODE_HEIGHT + POSITION_VERTICAL_GAP)
    const kids = childrenByParent.get(position.id) ?? []

    nodes.push({
      id: position.id,
      x,
      y,
      width: POSITION_NODE_WIDTH,
      height: POSITION_NODE_HEIGHT,
      position,
      unit: unitsById.get(position.orgUnitId) ?? null,
      occupants: occupantsByPosition.get(position.id) ?? [],
      directReports: kids.length,
    })

    let kidLeft = leftX
    if (kids.length > 0) {
      const totalKidsWidth = kids.reduce(
        (acc, kid, index) => acc + widthOf(kid.id) + (index > 0 ? POSITION_HORIZONTAL_GAP : 0),
        0,
      )
      kidLeft = leftX + (myWidth - totalKidsWidth) / 2
    }

    for (const kid of kids) {
      const kidWidth = widthOf(kid.id)
      placeSubtree(kid, kidLeft, depth + 1)
      edges.push({
        fromId: position.id,
        toId: kid.id,
        fromX: centerX,
        fromY: y + POSITION_NODE_HEIGHT,
        toX: kidLeft + kidWidth / 2,
        toY: (depth + 1) * (POSITION_NODE_HEIGHT + POSITION_VERTICAL_GAP),
      })
      kidLeft += kidWidth + POSITION_HORIZONTAL_GAP
    }
  }

  const totalWidth = Math.max(POSITION_NODE_WIDTH, cursorX)
  const totalHeight = nodes.reduce((max, node) => Math.max(max, node.y + node.height), 0)

  return {
    nodes,
    edges,
    width: totalWidth + POSITION_HORIZONTAL_GAP,
    height: totalHeight + POSITION_VERTICAL_GAP,
  }
}

export function orthogonalPath(e: EdgeLink): string {
  const midY = (e.fromY + e.toY) / 2
  return `M ${e.fromX} ${e.fromY} V ${midY} H ${e.toX} V ${e.toY}`
}
