/**
 * Onboarding IA — "Tu organigrama en 60 segundos".
 *
 * El usuario describe su empresa con 3 datos básicos (industria, tamaño,
 * ubicación) y la IA propone un organigrama completo con roles legales
 * sugeridos según la legislación peruana. Si la IA falla, hay fallback
 * determinístico para no dejar al usuario sin propuesta.
 */
export { generateOrgProposal, type OnboardingGenerationResult } from './generate-proposal'
export { validateProposal, type ValidationResult } from './validate-proposal'
export { pickFallbackTemplate } from './fallback-templates'
export {
  onboardingInputSchema,
  onboardingProposalSchema,
  type OnboardingInput,
  type OnboardingProposal,
  type OnboardingUnit,
  type OnboardingPosition,
} from './schema'
