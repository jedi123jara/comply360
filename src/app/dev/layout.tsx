import { notFound } from 'next/navigation'

/**
 * /dev/* — dev-only routes (design system + mount demos).
 *
 * Este layout bloquea acceso en producción devolviendo 404. En desarrollo
 * deja pasar para que el showcase de tokens y shells sea consumible sin auth.
 *
 * Los archivos `/dev/*` siguen estando también en `src/proxy.ts` como ruta
 * pública (no requieren Clerk), pero el filtro final por `NODE_ENV` vive
 * aquí. Índice de vistas previas en `/dev`; el shell real con API simulada
 * vive en `_preview/` (ver dashboard-preview.tsx y mock-api.ts).
 */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }
  return <>{children}</>
}
