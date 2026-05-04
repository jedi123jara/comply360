/**
 * Memoria Anual del Organigrama — Comply360
 *
 * Genera un PDF institucional de ~9 páginas con portada, índice, score de
 * compliance, estructura organizacional, responsables legales, hallazgos del
 * Org Doctor, anexo MOF, evolución del ejercicio y certificado de gobernanza
 * con hash SHA-256 del snapshot de cierre.
 *
 * Es el entregable físico que la empresa muestra al Directorio o a SUNAFIL
 * como evidencia de gobernanza laboral.
 */
export { buildMemoriaAnualData } from './build-memoria-data'
export { MemoriaAnualPDF } from './memoria-anual-pdf'
export type { MemoriaAnualData } from './types'
