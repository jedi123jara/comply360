'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, CircleHelp, Lightbulb, MinusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { pub } from '@/components/marketing/public-theme'
import { Toggle } from '@/components/marketing/public-calc-ui'
import {
  AREAS_OBLIGACION,
  OBLIGACIONES,
  estadoObligacion,
  type EstadoObligacion,
  type Obligacion,
  type PerfilEmpresa,
} from '@/lib/sitio/obligaciones'

const ATAJOS = [5, 15, 25, 60, 120] as const

const GRUPOS: Array<{ estado: EstadoObligacion; titulo: string; icono: typeof CheckCircle2; color: string }> = [
  { estado: 'aplica', titulo: 'Te aplica', icono: CheckCircle2, color: 'text-[#15803D]' },
  { estado: 'revisar', titulo: 'Revisa si te aplica', icono: CircleHelp, color: 'text-[#B45309]' },
  { estado: 'recomendado', titulo: 'Recomendado, aunque es voluntario', icono: Lightbulb, color: 'text-[#2563EB]' },
  { estado: 'no-exigible', titulo: 'No exigible a tu empresa (REMYPE)', icono: MinusCircle, color: 'text-[#5A6A80]' },
]

/**
 * Explorador interactivo del mapa de obligaciones: número de trabajadores +
 * condiciones → lista de lo que aplica, agrupado por área.
 */
export function ObligacionesExplorer() {
  const [perfil, setPerfil] = useState<PerfilEmpresa>({
    trabajadores: 25,
    consumidores: false,
    riesgo: false,
    mujeres: false,
    remype: false,
  })

  const clasificadas = useMemo(() => {
    const porEstado = new Map<EstadoObligacion, Obligacion[]>()
    for (const o of OBLIGACIONES) {
      const estado = estadoObligacion(o, perfil)
      if (!estado) continue
      porEstado.set(estado, [...(porEstado.get(estado) ?? []), o])
    }
    return porEstado
  }, [perfil])

  const aplican = clasificadas.get('aplica') ?? []
  const graves = aplican.filter((o) => o.falta.startsWith('Muy grave')).length

  const set = <K extends keyof PerfilEmpresa>(k: K, v: PerfilEmpresa[K]) => setPerfil((p) => ({ ...p, [k]: v }))

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr] lg:items-start">
      <div className={cn(pub.card, 'p-6 lg:sticky lg:top-24')}>
        <h2 className="text-lg font-extrabold tracking-[-0.01em] text-[#0B1B36]">Tu empresa</h2>
        <label htmlFor="obl-trabajadores" className={cn(pub.label, 'mt-5')}>
          Número de trabajadores
        </label>
        <input
          id="obl-trabajadores"
          type="number"
          min={1}
          max={100000}
          value={perfil.trabajadores}
          onChange={(e) => set('trabajadores', Math.max(1, parseInt(e.target.value, 10) || 1))}
          className={cn(pub.input, 'px-3 text-base font-bold')}
        />
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Atajos de tamaño">
          {ATAJOS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set('trabajadores', n)}
              aria-pressed={perfil.trabajadores === n}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                perfil.trabajadores === n
                  ? 'border-[#0B1B36] bg-[#0B1B36] text-[#ffffff]'
                  : 'border-[#E5EAF2] bg-[#ffffff] text-[#475569] hover:border-[#2563EB]',
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-6 grid gap-4">
          <Toggle
            id="obl-remype"
            label="Estoy inscrito en el REMYPE"
            hint="Micro o pequeña empresa"
            checked={perfil.remype}
            onChange={(v) => set('remype', v)}
          />
          <Toggle
            id="obl-consumidores"
            label="Atiendo a consumidores finales"
            hint="Tienda, restaurante, servicios al público o comercio electrónico"
            checked={perfil.consumidores}
            onChange={(v) => set('consumidores', v)}
          />
          <Toggle
            id="obl-riesgo"
            label="Mi actividad es de riesgo"
            hint="Construcción, minería, industria y otras del Anexo 5 del SCTR"
            checked={perfil.riesgo}
            onChange={(v) => set('riesgo', v)}
          />
          <Toggle
            id="obl-mujeres"
            label="Tengo 20 o más trabajadoras de 15 a 49 años"
            hint="En un mismo centro de trabajo"
            checked={perfil.mujeres}
            onChange={(v) => set('mujeres', v)}
          />
        </div>
      </div>

      <div>
        <div className={cn(pub.card, 'flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between')} aria-live="polite">
          <div>
            <p className="text-3xl font-extrabold tracking-[-0.02em] text-[#0B1B36]">
              {aplican.length} obligaciones te aplican
            </p>
            <p className={cn(pub.body, 'mt-1')}>
              {graves} de ellas son faltas muy graves si no las cumples. ¿Sabes cuáles tienes al día?
            </p>
          </div>
          <Link href="/diagnostico-gratis" className={cn(pub.btnPrimary, 'shrink-0')}>
            Revisar cuáles cumplo <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>

        {GRUPOS.map(({ estado, titulo, icono: Icono, color }) => {
          const lista = clasificadas.get(estado) ?? []
          if (lista.length === 0) return null
          return (
            <section key={estado} className="mt-8" aria-label={titulo}>
              <h3 className="flex items-center gap-2 text-lg font-extrabold tracking-[-0.01em] text-[#0B1B36]">
                <Icono aria-hidden className={cn('h-5 w-5', color)} />
                {titulo} <span className="text-sm font-semibold text-[#5A6A80]">({lista.length})</span>
              </h3>
              {AREAS_OBLIGACION.map((area) => {
                const deArea = lista.filter((o) => o.area === area)
                if (deArea.length === 0) return null
                return (
                  <div key={area} className="mt-4">
                    <p className={cn(pub.kicker, 'mb-2')}>{area}</p>
                    <ul className={cn(pub.card, pub.divide)}>
                      {deArea.map((o) => (
                        <li key={o.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:gap-6">
                          <div>
                            <p className="font-semibold text-[#0B1B36]">{o.obligacion}</p>
                            <p className={cn(pub.faint, 'mt-1')}>
                              {o.base} · Evidencia: {o.evidencia}
                            </p>
                            {o.nota ? <p className="mt-1 text-xs text-[#475569]">{o.nota}</p> : null}
                          </div>
                          <span
                            className={cn(
                              'h-fit whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold',
                              o.falta.startsWith('Muy grave')
                                ? 'bg-[#FEE2E2] text-[#991B1B]'
                                : o.falta.startsWith('Grave')
                                  ? 'bg-[#FFF8E6] text-[#92400E]'
                                  : 'bg-[#F5F7FB] text-[#475569]',
                            )}
                          >
                            {o.falta}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </section>
          )
        })}
      </div>
    </div>
  )
}
