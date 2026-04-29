/**
 * Captura de selfie y SHA-256 hash para anti-fraude (Fase 2 — Asistencia).
 *
 * Por privacidad y storage, NO guardamos la imagen — solo el hash. Sirve como
 * evidencia de que el worker estuvo presente al marcar (puede compararse
 * contra otros hashes para detectar duplicados, ej: misma foto reutilizada
 * por otro día = sospechoso).
 *
 * El campo Attendance.selfieHash ya existía en BD; este helper cubre la
 * captura del lado cliente que faltaba.
 */

export interface SelfieCapture {
  /** Data URL JPEG comprimida (preview). NO se envía al servidor. */
  dataUrl: string
  /** Hash SHA-256 hex del JPEG. Esto SÍ se envía al servidor. */
  sha256: string
  /** Ancho × alto reales del frame capturado. */
  width: number
  height: number
}

/**
 * Solicita acceso a la cámara frontal y devuelve un MediaStream.
 * El caller es responsable de detener las tracks cuando termine.
 */
export async function requestFrontCamera(): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Tu dispositivo no soporta cámara web')
  }
  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user',
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
    audio: false,
  })
}

/**
 * Captura un frame del video element y lo convierte a JPEG + hash SHA-256.
 *
 * @param video el HTMLVideoElement con el stream activo
 * @param quality JPEG quality 0-1 (default 0.85)
 */
export async function captureSelfieFromVideo(
  video: HTMLVideoElement,
  quality = 0.85,
): Promise<SelfieCapture> {
  const w = video.videoWidth || 640
  const h = video.videoHeight || 480
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear el canvas para la foto')
  ctx.drawImage(video, 0, 0, w, h)

  // 1. Data URL JPEG para preview
  const dataUrl = canvas.toDataURL('image/jpeg', quality)

  // 2. Blob → ArrayBuffer → SHA-256
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  )
  if (!blob) throw new Error('No se pudo serializar la foto')
  const buffer = await blob.arrayBuffer()
  const sha256 = await sha256Hex(buffer)

  return { dataUrl, sha256, width: w, height: h }
}

/**
 * SHA-256 de un ArrayBuffer (usa Web Crypto API).
 */
export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle?.digest) {
    throw new Error('Tu navegador no soporta criptografía (necesario para anti-fraude)')
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Detiene todas las tracks de un MediaStream para liberar la cámara.
 */
export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return
  stream.getTracks().forEach(t => {
    try { t.stop() } catch { /* ignore */ }
  })
}
