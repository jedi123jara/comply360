/**
 * Avatar del organigrama. Muestra la foto real del trabajador si existe; si no,
 * una CARITA generada con DiceBear (avataaars) según el sexo del trabajador,
 * con seed por nombre → determinística (cada persona tiene siempre la misma
 * carita) hasta que suba su foto desde la app del trabajador.
 *
 * 100% LOCAL (sin llamadas externas): los nombres nunca salen del app, seguro
 * para la Ley 29733. Reutilizable en todo el rediseño.
 */
'use client'

import { useMemo } from 'react'
import { createAvatar } from '@dicebear/core'
import { avataaars } from '@dicebear/collection'

// Peinados/vello facial que diferencian el rostro por sexo (nombres válidos de
// avataaars v9). DiceBear elige uno de forma determinística según el seed.
const FEMALE_TOP = ['bob', 'bun', 'curly', 'curvy', 'frida', 'longButNotTooLong', 'miaWallace', 'straight01', 'straight02', 'straightAndStrand']
const MALE_TOP = ['shortCurly', 'shortFlat', 'shortRound', 'shortWaved', 'sides', 'theCaesar', 'theCaesarAndSidePart', 'frizzle']
const MALE_FACIAL = ['beardLight', 'beardMedium', 'moustacheFancy']

function normalizeGender(gender?: string | null): 'F' | 'M' | null {
  if (!gender) return null
  // Worker.gender es String? libre (sin enum) → puede venir "Varón" con tilde
  // desde import/API/OCR. Quitamos tildes antes de comparar (mismo patrón que
  // el resto del codebase).
  const g = gender
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  if (g === 'F' || g.startsWith('FEM') || g === 'MUJER') return 'F'
  if (g === 'M' || g.startsWith('MAS') || g === 'HOMBRE' || g === 'VARON') return 'M'
  return null
}

function faceDataUri(name: string, gender?: string | null): string {
  const g = normalizeGender(gender)
  const opts: Record<string, unknown> = { seed: name || 'anon', size: 64, radius: 50 }
  if (g === 'F') {
    opts.top = FEMALE_TOP
    opts.facialHairProbability = 0
  } else if (g === 'M') {
    opts.top = MALE_TOP
    opts.facialHairProbability = 35
    opts.facialHair = MALE_FACIAL
  }
  return createAvatar(avataaars, opts).toDataUri()
}

export function OrgAvatar({
  name,
  photoUrl,
  gender,
  size = 24,
}: {
  name: string
  photoUrl?: string | null
  gender?: string | null
  size?: number
}) {
  const generated = useMemo(
    () => (photoUrl ? null : faceDataUri(name, gender)),
    [name, gender, photoUrl],
  )
  const src = photoUrl ?? generated ?? ''
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      title={name}
      style={{ width: size, height: size }}
      className="flex-shrink-0 rounded-full bg-slate-100 object-cover ring-1 ring-black/5"
    />
  )
}
