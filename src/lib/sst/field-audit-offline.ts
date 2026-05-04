/**
 * Captura offline de Field Audit con IndexedDB.
 *
 * El inspector va a obra/planta con tablet o celular y captura hallazgos sin
 * conexión. Todo se guarda en IndexedDB local (drafts + fotos como Blobs).
 * Al regresar a la oficina y tener wifi, sincroniza con el servidor:
 *   1. Sube cada foto al storage → recibe URL
 *   2. POST cada hallazgo con la URL de la foto
 *   3. PATCH la visita con notasInspector + fotoFachadaUrl + estado="EN_INGESTA"
 *
 * Diseño de stores:
 *   - drafts: { visitaId, notasInspector, fotoFachadaPhotoId, hallazgos[],
 *               lastModified }
 *     Cada hallazgo tiene { id, tipo, severidad, descripcion, photoId,
 *     accionPropuesta, responsable, plazoCierre, lat, lng, capturedAt }
 *   - photos: { id, blob, mimeType, sizeBytes, capturedAt }
 *     Blobs vivos. La key es un UUID generado en cliente, referenciado por
 *     hallazgos.photoId / drafts.fotoFachadaPhotoId.
 *
 * Las fotos se mantienen en photos hasta que el draft se sincroniza con éxito.
 * Tras sync, se borran (limpieza) para no acumular MB.
 *
 * Sin Service Worker — esto NO intercepta requests. Solo gestiona el estado
 * local. Decisión consciente: SW es complejidad innecesaria para el flujo
 * "captura ahora, sincroniza después".
 */

const DB_NAME = 'comply360-field-audit'
const DB_VERSION = 1
const STORE_DRAFTS = 'drafts'
const STORE_PHOTOS = 'photos'

export type Severidad = 'TRIVIAL' | 'TOLERABLE' | 'MODERADO' | 'IMPORTANTE' | 'INTOLERABLE'

export type TipoHallazgo =
  | 'PELIGRO_NUEVO'
  | 'PROCEDIMIENTO_INCUMPLIDO'
  | 'EPP_AUSENTE'
  | 'SENALIZACION_FALTANTE'
  | 'EXTINTOR_VENCIDO'
  | 'RUTA_EVACUACION_BLOQUEADA'
  | 'OTRO'

export interface HallazgoOffline {
  id: string // UUID local
  tipo: TipoHallazgo
  severidad: Severidad
  descripcion: string
  photoId: string | null // FK a stored Photo (Blob)
  accionPropuesta: string
  responsable: string | null
  plazoCierre: string | null // yyyy-mm-dd
  lat: number | null
  lng: number | null
  capturedAt: string // ISO
}

export interface VisitaDraft {
  visitaId: string
  notasInspector: string
  fotoFachadaPhotoId: string | null
  hallazgos: HallazgoOffline[]
  lastModified: string // ISO
}

export interface StoredPhoto {
  id: string
  blob: Blob
  mimeType: string
  sizeBytes: number
  capturedAt: string
}

// ── DB open helper ──────────────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible en este navegador'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, { keyPath: 'visitaId' })
      }
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Error abriendo IndexedDB'))
  })
}

function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode)
        const store = transaction.objectStore(storeName)
        let result: T | undefined
        const req = fn(store)
        if (req) {
          req.onsuccess = () => {
            result = req.result
          }
          req.onerror = () => reject(req.error)
        }
        transaction.oncomplete = () => resolve(result as T)
        transaction.onerror = () => reject(transaction.error)
      }),
  )
}

// ── Drafts CRUD ─────────────────────────────────────────────────────────────

export async function saveDraft(draft: VisitaDraft): Promise<void> {
  const updated: VisitaDraft = { ...draft, lastModified: new Date().toISOString() }
  await tx(STORE_DRAFTS, 'readwrite', (s) => s.put(updated))
}

export async function getDraft(visitaId: string): Promise<VisitaDraft | null> {
  const result = await tx<VisitaDraft | undefined>(STORE_DRAFTS, 'readonly', (s) =>
    s.get(visitaId) as IDBRequest<VisitaDraft | undefined>,
  )
  return result ?? null
}

export async function listDrafts(): Promise<VisitaDraft[]> {
  const result = await tx<VisitaDraft[]>(STORE_DRAFTS, 'readonly', (s) =>
    s.getAll() as IDBRequest<VisitaDraft[]>,
  )
  return result ?? []
}

export async function deleteDraft(visitaId: string): Promise<void> {
  // Antes de borrar el draft, limpiamos sus fotos para no dejar Blobs huérfanos.
  const draft = await getDraft(visitaId)
  if (draft) {
    const photoIds = collectPhotoIds(draft)
    await Promise.all(photoIds.map((id) => deletePhoto(id)))
  }
  await tx(STORE_DRAFTS, 'readwrite', (s) => s.delete(visitaId))
}

function collectPhotoIds(draft: VisitaDraft): string[] {
  const ids: string[] = []
  if (draft.fotoFachadaPhotoId) ids.push(draft.fotoFachadaPhotoId)
  for (const h of draft.hallazgos) {
    if (h.photoId) ids.push(h.photoId)
  }
  return ids
}

// ── Photos CRUD ─────────────────────────────────────────────────────────────

export async function savePhoto(photo: StoredPhoto): Promise<void> {
  await tx(STORE_PHOTOS, 'readwrite', (s) => s.put(photo))
}

export async function getPhoto(id: string): Promise<StoredPhoto | null> {
  const result = await tx<StoredPhoto | undefined>(STORE_PHOTOS, 'readonly', (s) =>
    s.get(id) as IDBRequest<StoredPhoto | undefined>,
  )
  return result ?? null
}

export async function deletePhoto(id: string): Promise<void> {
  await tx(STORE_PHOTOS, 'readwrite', (s) => s.delete(id))
}

// ── Helpers de uso ──────────────────────────────────────────────────────────

/**
 * Crea un draft vacío para una nueva visita. Si ya existe, no lo sobreescribe.
 */
export async function ensureDraft(visitaId: string): Promise<VisitaDraft> {
  const existing = await getDraft(visitaId)
  if (existing) return existing
  const empty: VisitaDraft = {
    visitaId,
    notasInspector: '',
    fotoFachadaPhotoId: null,
    hallazgos: [],
    lastModified: new Date().toISOString(),
  }
  await saveDraft(empty)
  return empty
}

/**
 * Genera un UUID v4 simple (compatible con todos los browsers modernos).
 * Usar en cliente para los IDs locales de hallazgos y fotos.
 */
export function genId(): string {
  // crypto.randomUUID está disponible en todos los browsers modernos + Node 19+
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // Fallback ultra-defensivo
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Marca métricas básicas del draft para mostrar en UI.
 */
export function summaryStats(draft: VisitaDraft): {
  hallazgosCount: number
  hallazgosConFoto: number
  fotosTotal: number
  ultimaModificacion: string
} {
  const fotosTotal = collectPhotoIds(draft).length
  return {
    hallazgosCount: draft.hallazgos.length,
    hallazgosConFoto: draft.hallazgos.filter((h) => h.photoId).length,
    fotosTotal,
    ultimaModificacion: draft.lastModified,
  }
}

// ── Sync ────────────────────────────────────────────────────────────────────

export interface SyncResult {
  hallazgosCreados: number
  hallazgosFallidos: number
  fachadaSubida: boolean
  notasGuardadas: boolean
  errors: string[]
}

/**
 * Sube una foto al storage del servidor y devuelve la URL pública.
 *
 * @throws Error si el upload falla.
 */
async function uploadPhoto(blob: Blob, mimeType: string, name: string): Promise<string> {
  const ext = mimeType.split('/')[1]?.split(';')[0] ?? 'jpg'
  const file = new File([blob], `${name}.${ext}`, { type: mimeType })
  const fd = new FormData()
  fd.set('file', file)
  fd.set('bucket', 'documents')
  fd.set('subfolder', 'sst-field-audit')
  const res = await fetch('/api/storage/upload', { method: 'POST', body: fd })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error ?? `Upload de foto falló (${res.status})`)
  }
  const json = await res.json()
  if (!json?.data?.url) {
    throw new Error('La respuesta del upload no contiene URL')
  }
  return json.data.url as string
}

/**
 * Sincroniza un draft con el servidor:
 *  1. Sube fotos al storage
 *  2. Crea hallazgos remotos
 *  3. PATCHea la visita con fachada + notas + estado=EN_INGESTA
 *  4. Si todo OK, borra el draft local
 *
 * Tolerante a fallos: si una foto falla, el resto sigue. La función reporta
 * cuántos hallazgos se crearon vs fallaron.
 */
export async function syncDraftToServer(visitaId: string): Promise<SyncResult> {
  const result: SyncResult = {
    hallazgosCreados: 0,
    hallazgosFallidos: 0,
    fachadaSubida: false,
    notasGuardadas: false,
    errors: [],
  }

  const draft = await getDraft(visitaId)
  if (!draft) {
    result.errors.push('No hay draft local para esta visita')
    return result
  }

  // 1. Subir foto fachada si hay
  let fotoFachadaUrl: string | null = null
  if (draft.fotoFachadaPhotoId) {
    try {
      const photo = await getPhoto(draft.fotoFachadaPhotoId)
      if (photo) {
        fotoFachadaUrl = await uploadPhoto(photo.blob, photo.mimeType, `fachada-${visitaId}`)
        result.fachadaSubida = true
      }
    } catch (err) {
      result.errors.push(`Foto fachada: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 2. PATCH visita con fachada + notas + estado
  try {
    const patchBody: Record<string, unknown> = {
      estado: 'EN_INGESTA',
    }
    if (fotoFachadaUrl) patchBody.fotoFachadaUrl = fotoFachadaUrl
    if (draft.notasInspector) patchBody.notasInspector = draft.notasInspector

    const res = await fetch(`/api/sst/visitas/${visitaId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patchBody),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.error ?? `PATCH visita falló (${res.status})`)
    }
    result.notasGuardadas = true
  } catch (err) {
    result.errors.push(`Visita: ${err instanceof Error ? err.message : String(err)}`)
  }

  // 3. Crear hallazgos uno por uno (tolerante)
  for (const h of draft.hallazgos) {
    try {
      let fotoUrl: string | null = null
      if (h.photoId) {
        const photo = await getPhoto(h.photoId)
        if (photo) {
          fotoUrl = await uploadPhoto(photo.blob, photo.mimeType, `hallazgo-${h.id}`)
        }
      }

      const res = await fetch(`/api/sst/visitas/${visitaId}/hallazgos`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tipo: h.tipo,
          severidad: h.severidad,
          descripcion: h.descripcion,
          fotoUrl,
          accionPropuesta: h.accionPropuesta,
          responsable: h.responsable,
          plazoCierre: h.plazoCierre,
          coordenadasGPS:
            h.lat !== null && h.lng !== null ? { lat: h.lat, lng: h.lng } : null,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `POST hallazgo falló (${res.status})`)
      }
      result.hallazgosCreados++
    } catch (err) {
      result.hallazgosFallidos++
      result.errors.push(`Hallazgo ${h.id.slice(0, 8)}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 4. Si TODOS los hallazgos se crearon (no hubo fallos), borramos el draft
  // local para liberar espacio. Si hubo fallos, dejamos el draft para reintentar.
  if (result.hallazgosFallidos === 0 && result.errors.length === 0) {
    await deleteDraft(visitaId)
  }

  return result
}
