// =============================================
// DOCUMENT TEMPLATE ENGINE — COMPLY360 PERÚ
// Tipos compartidos para generador de documentos legales
// =============================================

export interface DocumentField {
  id: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'currency' | 'toggle' | 'email'
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[]
  helpText?: string
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
  condition?: {
    field: string
    value: string | boolean | number
  }
}

export interface DocumentSection {
  id: string
  title: string
  description?: string
  fields: DocumentField[]
}

export interface DocumentBlock {
  id: string
  /** Título visible de la sección/cláusula (ej: "1. OBJETO Y ÁMBITO DE APLICACIÓN") */
  title?: string
  /** Contenido textual con {{variable}} placeholders */
  text: string
  /** Tipo de bloque para renderizado */
  blockType?: 'header' | 'clause' | 'table' | 'signature' | 'body' | 'appendix'
  /** JS expression evaluada contra los datos del formulario para mostrar/ocultar */
  condition?: string
  isOptional?: boolean
}

export type DocumentType =
  | 'PLAN_SST'
  | 'RIT'
  | 'POLITICA_HOSTIGAMIENTO'
  | 'CCF'
  | 'IPERC'
  | 'ACTA_COMITE_SST'
  | 'POLITICA_SST'

export interface DocumentTemplateDefinition {
  id: string
  type: DocumentType
  name: string
  description: string
  legalBasis: string
  /** Obligatoriedad legal: desde cuándo es requerido */
  mandatoryFrom?: string
  /** Umbral de trabajadores a partir del cual es obligatorio */
  workerThreshold?: number
  /** Autoridad que debe aprobarlo o ante quien se registra */
  approvalAuthority?: string
  sections: DocumentSection[]
  blocks: DocumentBlock[]
}
