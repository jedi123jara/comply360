/**
 * Renderiza un thumbnail SVG (400×120) del organigrama de un snapshot.
 *
 * Usa Dagre para layout simple y dibuja sólo cajas+aristas, sin texto, para
 * que el SVG pese menos de 10 kB. Pensado para tarjetas del Time Machine.
 *
 * Pure function — recibe units+positions y devuelve string SVG.
 */
import dagre from '@dagrejs/dagre'

import { TONE_COLOR_HEX, type CoverageReport } from './coverage-aggregator'
import type { OrgChartTree } from './types'

const W = 400
const H = 120
const NODE_W = 18
const NODE_H = 10
const PADDING = 6

export function renderSnapshotThumbnailSVG(
  tree: Pick<OrgChartTree, 'units'>,
  coverage: CoverageReport | null,
): string {
  if (tree.units.length === 0) {
    return emptyThumb()
  }

  const g = new dagre.graphlib.Graph<{ width: number; height: number }>()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: 'TB',
    ranksep: 14,
    nodesep: 8,
    marginx: 4,
    marginy: 4,
  })

  for (const u of tree.units) {
    g.setNode(u.id, { width: NODE_W, height: NODE_H })
  }
  for (const u of tree.units) {
    if (u.parentId) {
      g.setEdge(u.parentId, u.id)
    }
  }

  dagre.layout(g)

  const graphInfo = g.graph()
  const layoutWidth = (graphInfo.width as number | undefined) ?? W
  const layoutHeight = (graphInfo.height as number | undefined) ?? H

  // Escalar para que quepa en W×H sin distorsión
  const scaleX = (W - PADDING * 2) / Math.max(layoutWidth, NODE_W)
  const scaleY = (H - PADDING * 2) / Math.max(layoutHeight, NODE_H)
  const scale = Math.min(scaleX, scaleY, 1)

  const offsetX = (W - layoutWidth * scale) / 2
  const offsetY = (H - layoutHeight * scale) / 2

  const transform = `translate(${offsetX},${offsetY}) scale(${scale})`

  // Construir paths para edges
  const edges: string[] = []
  for (const u of tree.units) {
    if (!u.parentId) continue
    const parent = g.node(u.parentId)
    const me = g.node(u.id)
    if (!parent || !me) continue
    const x1 = parent.x
    const y1 = parent.y + NODE_H / 2
    const x2 = me.x
    const y2 = me.y - NODE_H / 2
    const midY = (y1 + y2) / 2
    edges.push(
      `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} L${x1.toFixed(1)},${midY.toFixed(1)} L${x2.toFixed(1)},${midY.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="#cbd5e1" stroke-width="1"/>`,
    )
  }

  // Construir rectángulos para nodos coloreados por tono
  const rects: string[] = []
  for (const u of tree.units) {
    const node = g.node(u.id)
    if (!node) continue
    const cov = coverage?.byUnit.get(u.id)
    const fill = cov ? TONE_COLOR_HEX[cov.tone] : '#94a3b8'
    rects.push(
      `<rect x="${(node.x - NODE_W / 2).toFixed(1)}" y="${(node.y - NODE_H / 2).toFixed(1)}" width="${NODE_W}" height="${NODE_H}" rx="2" fill="${fill}" fill-opacity="0.85" stroke="#fff" stroke-width="0.5"/>`,
    )
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Thumbnail del organigrama">
  <rect width="${W}" height="${H}" fill="#f8fafc"/>
  <g transform="${transform}">
    ${edges.join('\n    ')}
    ${rects.join('\n    ')}
  </g>
</svg>`
}

function emptyThumb(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#f8fafc"/>
  <text x="${W / 2}" y="${H / 2}" text-anchor="middle" dominant-baseline="middle" fill="#94a3b8" font-family="sans-serif" font-size="10">Sin unidades</text>
</svg>`
}
