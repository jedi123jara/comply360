import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { breadcrumbLd } from '@/lib/sitio/seo'
import { JsonLd } from './json-ld'

/**
 * Migas de pan visibles (sobre el hero navy) + BreadcrumbList en JSON-LD.
 * El primer ítem siempre es Inicio; el último es la página actual (sin enlace).
 */
export function Breadcrumbs({
  items,
  className,
}: {
  items: Array<{ nombre: string; ruta: string }>
  className?: string
}) {
  const todos = [{ nombre: 'Inicio', ruta: '/' }, ...items]
  return (
    <>
      <JsonLd data={breadcrumbLd(todos)} />
      <nav aria-label="Migas de pan" className={cn('mb-5 text-xs font-semibold', className)}>
        <ol className="flex flex-wrap items-center gap-1 text-[#CBD5E1]">
          {todos.map((item, i) => {
            const ultimo = i === todos.length - 1
            return (
              <li key={item.ruta} className="inline-flex items-center gap-1">
                {ultimo ? (
                  <span aria-current="page" className="text-[#ffffff]">
                    {item.nombre}
                  </span>
                ) : (
                  <>
                    <Link href={item.ruta} className="transition-colors hover:text-[#F5B301]">
                      {item.nombre}
                    </Link>
                    <ChevronRight aria-hidden className="h-3.5 w-3.5 text-[#94A3B8]" />
                  </>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
