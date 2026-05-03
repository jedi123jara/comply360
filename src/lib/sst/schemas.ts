/**
 * Zod schemas para el módulo SST Premium (Fase 5).
 *
 * Compartidos entre frontend (formularios) y backend (route handlers).
 * Idioma: español peruano. Sin voseo.
 */

import { z } from 'zod'

// ── Sede ──────────────────────────────────────────────────────────────────

export const TipoInstalacionEnum = z.enum([
  'OFICINA',
  'PLANTA',
  'OBRA',
  'SUCURSAL',
  'TALLER',
  'ALMACEN',
  'CAMPO',
])

export const sedeCreateSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(150),
  direccion: z.string().min(5, 'La dirección debe tener al menos 5 caracteres').max(300),
  ubigeo: z.string().regex(/^\d{6}$/, 'Ubigeo debe ser 6 dígitos INEI'),
  departamento: z.string().min(2).max(80),
  provincia: z.string().min(2).max(80),
  distrito: z.string().min(2).max(80),
  tipoInstalacion: TipoInstalacionEnum,
  areaM2: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v === undefined || v === '' ? undefined : Number(v)))
    .refine(
      (v) => v === undefined || (Number.isFinite(v) && v > 0 && v < 10_000_000),
      'Área debe ser un número positivo menor a 10,000,000 m²',
    ),
  numeroPisos: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v === undefined || v === '' ? undefined : Number(v)))
    .refine(
      (v) => v === undefined || (Number.isInteger(v) && v >= 0 && v <= 200),
      'Número de pisos debe ser un entero entre 0 y 200',
    ),
  planoArchivoUrl: z.string().url('URL de plano inválida').optional().nullable(),
  lat: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v === undefined || v === '' ? undefined : Number(v)))
    .refine(
      (v) => v === undefined || (Number.isFinite(v) && v >= -90 && v <= 90),
      'Latitud debe estar entre -90 y 90',
    ),
  lng: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v === undefined || v === '' ? undefined : Number(v)))
    .refine(
      (v) => v === undefined || (Number.isFinite(v) && v >= -180 && v <= 180),
      'Longitud debe estar entre -180 y 180',
    ),
  activa: z.boolean().optional().default(true),
})

export const sedeUpdateSchema = sedeCreateSchema.partial()

export type SedeCreateInput = z.infer<typeof sedeCreateSchema>
export type SedeUpdateInput = z.infer<typeof sedeUpdateSchema>

// ── PuestoTrabajo ─────────────────────────────────────────────────────────

export const puestoCreateSchema = z.object({
  sedeId: z.string().min(1, 'sedeId requerido'),
  workerId: z.string().min(1).optional().nullable(),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(150),
  descripcionTareas: z.array(z.string().min(2).max(500)).default([]),
  jornada: z.string().max(60).optional().nullable(),
  exposicionFisica: z.boolean().optional().default(false),
  exposicionQuimica: z.boolean().optional().default(false),
  exposicionBiologica: z.boolean().optional().default(false),
  exposicionErgonomica: z.boolean().optional().default(false),
  exposicionPsicosocial: z.boolean().optional().default(false),
  requiereAlturas: z.boolean().optional().default(false),
  requiereEspacioConfinado: z.boolean().optional().default(false),
  requiereCalienteFrio: z.boolean().optional().default(false),
  requiereSCTR: z.boolean().optional().default(false),
  requiereExposicionUVSolar: z.boolean().optional().default(false),
})

export const puestoUpdateSchema = puestoCreateSchema.partial().omit({ sedeId: true })

export type PuestoCreateInput = z.infer<typeof puestoCreateSchema>
export type PuestoUpdateInput = z.infer<typeof puestoUpdateSchema>

// ── IPERC ─────────────────────────────────────────────────────────────────

export const ipercBaseCreateSchema = z.object({
  sedeId: z.string().min(1, 'sedeId requerido'),
})

const indiceField = z
  .number({ error: 'Índice requerido' })
  .int('El índice debe ser un entero')
  .min(1, 'El índice mínimo es 1')
  .max(3, 'El índice máximo es 3')

export const ipercFilaCreateSchema = z.object({
  proceso: z.string().min(2).max(150),
  actividad: z.string().min(2).max(200),
  tarea: z.string().min(2).max(200),
  peligroId: z.string().min(1).optional().nullable(),
  riesgo: z.string().min(2).max(300),
  indicePersonas: indiceField,
  indiceProcedimiento: indiceField,
  indiceCapacitacion: indiceField,
  indiceExposicion: indiceField,
  indiceSeveridad: indiceField,
  controlesActuales: z.array(z.string().min(1).max(300)).default([]),
  controlesPropuestos: z
    .object({
      eliminacion: z.array(z.string()).optional().default([]),
      sustitucion: z.array(z.string()).optional().default([]),
      ingenieria: z.array(z.string()).optional().default([]),
      administrativo: z.array(z.string()).optional().default([]),
      epp: z.array(z.string()).optional().default([]),
    })
    .default({ eliminacion: [], sustitucion: [], ingenieria: [], administrativo: [], epp: [] }),
  responsable: z.string().max(150).optional().nullable(),
  plazoCierre: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
    .optional()
    .nullable(),
})

export type IpercBaseCreateInput = z.infer<typeof ipercBaseCreateSchema>
export type IpercFilaCreateInput = z.infer<typeof ipercFilaCreateSchema>

// ── Accidente ─────────────────────────────────────────────────────────────

export const TipoAccidenteEnum = z.enum([
  'MORTAL',
  'NO_MORTAL',
  'INCIDENTE_PELIGROSO',
  'ENFERMEDAD_OCUPACIONAL',
])

export const accidenteCreateSchema = z.object({
  sedeId: z.string().min(1, 'sedeId requerido'),
  workerId: z.string().min(1).optional().nullable(),
  tipo: TipoAccidenteEnum,
  fechaHora: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  descripcion: z.string().min(10, 'Describe el evento con al menos 10 caracteres').max(2000),
})

export const accidenteSatUpdateSchema = z.object({
  satNumeroManual: z.string().max(60).optional().nullable(),
  satFechaEnvioManual: z.string().datetime({ offset: true }).optional().nullable(),
  satCargoArchivoUrl: z.string().url().optional().nullable(),
  satEstado: z
    .enum(['PENDIENTE', 'EN_PROCESO', 'NOTIFICADO', 'CONFIRMADO', 'RECHAZADO'])
    .optional(),
})

export const investigacionCreateSchema = z.object({
  fechaInvestigacion: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  causasInmediatas: z
    .array(
      z.object({
        tipo: z.enum(['ACTO_INSEGURO', 'CONDICION_INSEGURA']),
        descripcion: z.string().min(3).max(500),
      }),
    )
    .default([]),
  causasBasicas: z
    .array(
      z.object({
        tipo: z.enum(['FACTOR_PERSONAL', 'FACTOR_TRABAJO']),
        descripcion: z.string().min(3).max(500),
      }),
    )
    .default([]),
  accionesCorrectivas: z
    .array(
      z.object({
        accion: z.string().min(3).max(500),
        responsable: z.string().min(2).max(150).optional().nullable(),
        plazo: z
          .string()
          .datetime({ offset: true })
          .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
          .optional()
          .nullable(),
        estado: z.enum(['PENDIENTE', 'EN_PROCESO', 'COMPLETADA']).default('PENDIENTE'),
      }),
    )
    .default([]),
  responsableId: z.string().min(1).optional().nullable(),
})

export type AccidenteCreateInput = z.infer<typeof accidenteCreateSchema>
export type AccidenteSatUpdateInput = z.infer<typeof accidenteSatUpdateSchema>
export type InvestigacionCreateInput = z.infer<typeof investigacionCreateSchema>

// ── EMO (Examen Médico Ocupacional) — Sub-schema médico cifrado ──────────
//
// REGLAS DE SEGURIDAD (Ley 29733 + D.S. 016-2024-JUS):
//   1. `aptitud` se persiste EN CLARO (es info legalmente compartible entre
//      empleador y trabajador, no contiene diagnóstico).
//   2. `restricciones` se cifra SIEMPRE server-side con pgcrypto antes de
//      tocar la DB. Texto libre que describe limitaciones SIN diagnóstico.
//   3. Cualquier input con campos como `diagnostico`, `dx`, `enfermedad`,
//      `patologia`, `cie10` es REJECTED con 400 — esos datos jamás deben
//      tocar COMPLY360, quedan en el centro médico DIGESA.

export const TipoExamenEMOEnum = z.enum([
  'PRE_EMPLEO',
  'PERIODICO',
  'RETIRO',
  'REINTEGRO_LARGA_AUSENCIA',
])

export const AptitudEMOEnum = z.enum([
  'APTO',
  'APTO_CON_RESTRICCIONES',
  'NO_APTO',
  'OBSERVADO',
])

/**
 * Lista de campos que NUNCA deben aparecer en el payload de un EMO.
 * Si el cliente envía cualquiera de estos, rechazamos con 400.
 * Esta lista es deliberadamente conservadora — preferimos rechazar válidos
 * que aceptar diagnósticos por accidente.
 */
export const FORBIDDEN_MEDICAL_FIELDS = [
  'diagnostico',
  'diagnosis',
  'dx',
  'enfermedad',
  'patologia',
  'pathology',
  'cie10',
  'icd10',
  'icd_10',
  'sintomatologia',
  'tratamiento',
  'medicamento',
  'historiaClinica',
  'historia_clinica',
  'examen_fisico',
  'antecedentes_medicos',
] as const

export const emoCreateSchema = z
  .object({
    workerId: z.string().min(1, 'workerId requerido'),
    tipoExamen: TipoExamenEMOEnum,
    fechaExamen: z
      .string()
      .datetime({ offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    centroMedicoNombre: z.string().min(2).max(200),
    centroMedicoRuc: z
      .string()
      .regex(/^\d{11}$/, 'RUC debe tener 11 dígitos')
      .optional()
      .nullable(),
    aptitud: AptitudEMOEnum,
    /** Texto libre con restricciones SIN diagnóstico. Se cifra server-side. */
    restricciones: z.string().max(2000).optional().nullable(),
    consentimientoLey29733: z.boolean(),
    fechaConsentimiento: z
      .string()
      .datetime({ offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
      .optional()
      .nullable(),
    proximoExamenAntes: z
      .string()
      .datetime({ offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
      .optional()
      .nullable(),
    certificadoUrl: z.string().url().optional().nullable(),
  })
  .refine((data) => data.consentimientoLey29733 === true, {
    message: 'El consentimiento Ley 29733 es obligatorio para registrar un EMO',
    path: ['consentimientoLey29733'],
  })

export const emoUpdateSchema = z.object({
  aptitud: AptitudEMOEnum.optional(),
  restricciones: z.string().max(2000).optional().nullable(),
  proximoExamenAntes: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
    .optional()
    .nullable(),
  certificadoUrl: z.string().url().optional().nullable(),
})

/**
 * Detecta campos médicos prohibidos en el payload (diagnóstico, CIE-10, etc.).
 * Si encuentra alguno, retorna el primero — el caller debe responder 400.
 * Búsqueda case-insensitive y profunda hasta nivel 1 (suficiente porque el
 * input esperado es plano).
 */
export function detectarCamposMedicosProhibidos(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const obj = payload as Record<string, unknown>
  for (const k of Object.keys(obj)) {
    const lower = k.toLowerCase()
    for (const forbidden of FORBIDDEN_MEDICAL_FIELDS) {
      if (lower === forbidden.toLowerCase()) return k
      if (lower.includes(forbidden.toLowerCase())) return k
    }
  }
  return null
}

export type EmoCreateInput = z.infer<typeof emoCreateSchema>
export type EmoUpdateInput = z.infer<typeof emoUpdateSchema>

// ── Consentimiento Ley 29733 ─────────────────────────────────────────────

export const consentimientoCreateSchema = z.object({
  workerId: z.string().min(1, 'workerId requerido'),
  /** Texto del consentimiento (ej. autorización tratamiento datos médicos). */
  texto: z.string().min(50, 'Texto del consentimiento muy corto').max(10_000),
  /** Datos de la firma en JSON serializado (e-firma simple o WebAuthn). */
  firma: z.string().min(10).max(10_000),
  webauthnCredentialId: z.string().optional().nullable(),
  /** Vigencia: por defecto 5 años post-cese. */
  vigenciaHasta: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
})

export type ConsentimientoCreateInput = z.infer<typeof consentimientoCreateSchema>

// ── Solicitud ARCO (Art. 41 Ley 29733) ───────────────────────────────────

export const TipoARCOEnum = z.enum([
  'ACCESO',
  'RECTIFICACION',
  'CANCELACION',
  'OPOSICION',
  'PORTABILIDAD',
])

export const arcoCreateSchema = z.object({
  solicitanteDni: z.string().regex(/^\d{8}$/, 'DNI debe ser 8 dígitos'),
  solicitanteName: z.string().min(2).max(200),
  tipo: TipoARCOEnum,
  detalle: z.string().min(10, 'Describe la solicitud con al menos 10 caracteres').max(5000),
})

export const arcoUpdateSchema = z.object({
  estado: z.enum(['RECIBIDA', 'EN_PROCESO', 'RESPONDIDA', 'VENCIDA']).optional(),
  dpoAsignadoId: z.string().optional().nullable(),
  respuestaArchivoUrl: z.string().url().optional().nullable(),
})

export type ArcoCreateInput = z.infer<typeof arcoCreateSchema>
export type ArcoUpdateInput = z.infer<typeof arcoUpdateSchema>
