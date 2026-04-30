/**
 * Compresión de imagen en el cliente antes de subir.
 *
 * Razón: Vercel limita el body de los requests a ~4.5MB en plan free / 5MB
 * en general. Los celulares modernos toman fotos de 5-20MB en JPG. Sin
 * compresión, el upload tira HTTP 413 "Request Entity Too Large".
 *
 * Estrategia:
 *   - Si el archivo ya está bajo el límite y es PDF → no toca nada
 *   - Si es imagen sobre 2MB → recompresiona JPEG quality 0.85 + max 2000px
 *   - Si después de comprimir sigue siendo > maxBytes → error claro
 */

const DEFAULT_MAX_BYTES = 4 * 1024 * 1024 // 4 MB seguro para Vercel
const COMPRESS_THRESHOLD_BYTES = 2 * 1024 * 1024 // a partir de 2MB comprimimos
const MAX_DIMENSION = 2000 // ancho/alto máximo

export async function compressImageIfNeeded(
  file: File,
  maxBytes = DEFAULT_MAX_BYTES,
): Promise<{ file: File; compressed: boolean; originalSize: number; finalSize: number }> {
  const originalSize = file.size

  // No es imagen → solo validar tamaño
  if (!file.type.startsWith('image/')) {
    if (originalSize > maxBytes) {
      throw new Error(
        `El archivo pesa ${(originalSize / 1024 / 1024).toFixed(1)}MB. Máximo permitido: ${(maxBytes / 1024 / 1024).toFixed(1)}MB. Para PDFs grandes, comprime con una herramienta antes de subir.`,
      )
    }
    return { file, compressed: false, originalSize, finalSize: originalSize }
  }

  // Es imagen y está chica → no toca
  if (originalSize <= COMPRESS_THRESHOLD_BYTES) {
    return { file, compressed: false, originalSize, finalSize: originalSize }
  }

  // Comprimir con canvas
  try {
    const compressedFile = await compressViaCanvas(file)
    if (compressedFile.size > maxBytes) {
      throw new Error(
        `La foto pesa ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB incluso después de comprimir. Toma la foto con menor resolución desde tu cámara.`,
      )
    }
    return {
      file: compressedFile,
      compressed: true,
      originalSize,
      finalSize: compressedFile.size,
    }
  } catch (err) {
    // Si la compresión falla (canvas no disponible, formato exótico), validar
    // tamaño original
    if (originalSize > maxBytes) {
      throw new Error(
        `No se pudo comprimir. El archivo pesa ${(originalSize / 1024 / 1024).toFixed(1)}MB y el máximo es ${(maxBytes / 1024 / 1024).toFixed(1)}MB.`,
      )
    }
    return { file, compressed: false, originalSize, finalSize: originalSize }
  }
}

async function compressViaCanvas(file: File): Promise<File> {
  const dataUrl = await readAsDataURL(file)
  const img = await loadImage(dataUrl)

  // Calcular nuevas dimensiones (preservando aspect ratio)
  let { width, height } = img
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
    width = Math.floor(width * ratio)
    height = Math.floor(height * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear canvas')
  ctx.drawImage(img, 0, 0, width, height)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85),
  )
  if (!blob) throw new Error('Compresión falló')

  // Conservar nombre original con extensión .jpg
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'imagen'
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    img.src = src
  })
}
