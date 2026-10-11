import type { ReactNode } from 'react'
import { PublicShell } from '@/components/marketing/public-shell'

// Las calculadoras son client-side interactivas (estado de inputs + cálculo
// instantáneo). El SEO se mantiene porque Google igual indexa el SSR a
// demanda, y ya tenemos canonicals + metadata específica por calculadora.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Calculadoras laborales gratuitas para Perú',
  description:
    'Calcula CTS, gratificación, liquidación y multas SUNAFIL gratis y sin registro. Actualizado con la normativa peruana 2026.',
}

// Header, footer y fondo vienen del tema público compartido. Cada página arma su
// hero navy (a todo el ancho) y su cuerpo claro con `pub.container`.
export default function CalculadorasLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
