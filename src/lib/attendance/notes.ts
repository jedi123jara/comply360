/**
 * Serialización de metadata de Attendance dentro del campo `notes` (string).
 *
 * Razón: evitar agregar columnas nuevas a `Attendance` para esta tanda. El campo
 * `notes` ya existía como string libre — lo extendemos a un JSON estructurado
 * con back-compat: si `notes` no es JSON parseable, se interpreta como nota libre.
 *
 * Estructura serializada:
 * {
 *   n: string                        // nota libre (admin o worker)
 *   j: {                              // justificación reportada por worker/admin
 *     reason: string
 *     files?: string[]
 *     requestedAt: ISODate
 *     requestedBy: string             // userId del worker/admin que reportó
 *   }
 *   a: {                              // resolución del admin
 *     approved: boolean               // true=aprobada, false=rechazada
 *     at: ISODate
 *     by: string                      // userId del admin
 *     byName?: string                 // nombre legible (para UI sin extra fetch)
 *     comment?: string                // razón de rechazo si approved=false
 *   }
 * }
 *
 * Cuando el admin aprueba una tardanza/ausencia, NO se cambia `Attendance.status`
 * (sigue siendo LATE/ABSENT) — la aprobación es un overlay. SUNAFIL puede ver
 * el registro original y la resolución por separado.
 */

export interface AttendanceJustification {
  reason: string
  files?: string[]
  requestedAt: string
  requestedBy: string
}

export interface AttendanceApproval {
  approved: boolean
  at: string
  by: string
  byName?: string
  comment?: string
}

export interface AttendanceMetadata {
  /** Nota libre del worker o admin (campo legacy reusado). */
  note?: string
  justification?: AttendanceJustification
  approval?: AttendanceApproval
}

/**
 * Parsea el campo `notes` de Attendance.
 *
 * Back-compat: si el contenido no es JSON válido o no tiene la estructura
 * esperada, se trata como nota libre.
 */
export function parseAttendanceNotes(notes: string | null | undefined): AttendanceMetadata {
  if (!notes) return {}
  const trimmed = notes.trim()
  // Heurística: solo intentamos parsear si parece JSON object
  if (!trimmed.startsWith('{')) {
    return { note: notes }
  }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    const result: AttendanceMetadata = {}
    if (typeof parsed.n === 'string') result.note = parsed.n
    if (parsed.j && typeof parsed.j === 'object') {
      const j = parsed.j as Record<string, unknown>
      if (typeof j.reason === 'string' && typeof j.requestedAt === 'string' && typeof j.requestedBy === 'string') {
        result.justification = {
          reason: j.reason,
          files: Array.isArray(j.files) ? j.files.filter((f): f is string => typeof f === 'string') : undefined,
          requestedAt: j.requestedAt,
          requestedBy: j.requestedBy,
        }
      }
    }
    if (parsed.a && typeof parsed.a === 'object') {
      const a = parsed.a as Record<string, unknown>
      if (typeof a.approved === 'boolean' && typeof a.at === 'string' && typeof a.by === 'string') {
        result.approval = {
          approved: a.approved,
          at: a.at,
          by: a.by,
          byName: typeof a.byName === 'string' ? a.byName : undefined,
          comment: typeof a.comment === 'string' ? a.comment : undefined,
        }
      }
    }
    return result
  } catch {
    // No era JSON válido — tratamos como nota libre
    return { note: notes }
  }
}

/**
 * Serializa la metadata de Attendance al string que va al campo `notes`.
 * Si solo hay nota libre (sin justificación ni aprobación), guarda el string
 * pelado para mantener back-compat con la API actual.
 */
export function serializeAttendanceNotes(meta: AttendanceMetadata): string | null {
  const hasJustification = !!meta.justification
  const hasApproval = !!meta.approval
  const hasNote = !!meta.note

  if (!hasJustification && !hasApproval) {
    return hasNote ? (meta.note as string) : null
  }

  const out: Record<string, unknown> = {}
  if (hasNote) out.n = meta.note
  if (hasJustification) {
    out.j = {
      reason: meta.justification!.reason,
      ...(meta.justification!.files && meta.justification!.files.length > 0
        ? { files: meta.justification!.files }
        : {}),
      requestedAt: meta.justification!.requestedAt,
      requestedBy: meta.justification!.requestedBy,
    }
  }
  if (hasApproval) {
    out.a = {
      approved: meta.approval!.approved,
      at: meta.approval!.at,
      by: meta.approval!.by,
      ...(meta.approval!.byName ? { byName: meta.approval!.byName } : {}),
      ...(meta.approval!.comment ? { comment: meta.approval!.comment } : {}),
    }
  }
  return JSON.stringify(out)
}

/**
 * Estado derivado del registro: ¿necesita justificación? ¿está justificado y aprobado?
 *
 * Reglas:
 * - PRESENT / ON_LEAVE → 'no-applicable' (no hay nada que justificar)
 * - LATE / ABSENT sin justificación → 'pending-justification'
 * - LATE / ABSENT con justificación pero sin aprobar → 'pending-approval'
 * - LATE / ABSENT con aprobación.approved=true → 'approved'
 * - LATE / ABSENT con aprobación.approved=false → 'rejected'
 */
export type JustificationState =
  | 'no-applicable'
  | 'pending-justification'
  | 'pending-approval'
  | 'approved'
  | 'rejected'

export function deriveJustificationState(
  status: string,
  meta: AttendanceMetadata,
): JustificationState {
  if (status !== 'LATE' && status !== 'ABSENT') return 'no-applicable'
  if (!meta.justification) return 'pending-justification'
  if (!meta.approval) return 'pending-approval'
  return meta.approval.approved ? 'approved' : 'rejected'
}
