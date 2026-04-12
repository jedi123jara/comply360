/**
 * Registry de agentes COMPLY360.
 * Mapea slug → AgentDefinition. Centraliza la lista de agentes disponibles.
 */

import type { AgentDefinition } from './types'
import { sunafilAnalyzerAgent } from './sunafil-analyzer'
import { descargoWriterAgent } from './descargo-writer'
import { payslipAuditorAgent } from './payslip-auditor'
import { riskMonitorAgent } from './risk-monitor'

const AGENTS: AgentDefinition[] = [
  sunafilAnalyzerAgent as unknown as AgentDefinition,
  descargoWriterAgent as unknown as AgentDefinition,
  payslipAuditorAgent as unknown as AgentDefinition,
  riskMonitorAgent as unknown as AgentDefinition,
]

export function listAgents(): AgentDefinition[] {
  return AGENTS
}

export function getAgent(slug: string): AgentDefinition | undefined {
  return AGENTS.find(a => a.slug === slug)
}
