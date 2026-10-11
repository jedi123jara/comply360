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

function claseFalta(falta: string): string {
  if (falta.startsWith('Muy grave')) return 'bg-[#FEF2F2] text-[#991B1B]'
  if (falta.startsWith('Grave')) return 'bg-[#FFF7E6] text-[#92400E]'
  return 'bg-[#F1F4F8] text-[#475569]'
}

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
    <div className="grid gap-10 xl:grid-cols-[300px_1fr] xl:items-start">
      <div className="rounded-2xl border border-[#E1E7F0] bg-[#ffffff] p-6 xl:sticky xl:top-24">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A97AB]">Tu empresa</p>
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
          className={cn(pub.input, 'px-3 text-lg font-extrabold tabular-nums')}
        />
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Atajos de tamaño">
          {ATAJOS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set('trabajadores', n)}
              aria-pressed={perfil.trabajadores === n}
              className={cn(
                'min-w-10 rounded-md border px-2.5 py-1 text-xs font-bold tabular-nums transition-colors',
                perfil.trabajadores === n
                  ? 'border-[#0B1B36] bg-[#0B1B36] text-[#ffffff]'
                  : 'border-[#D9E0EA] bg-[#ffffff] text-[#475569] hover:border-[#0B1B36]',
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-6 grid gap-4 border-t border-[#E1E7F0] pt-6">
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

      <div className="min-w-0">
        <div
          className="flex flex-col items-start gap-6 rounded-2xl bg-[#0B1B36] p-7 text-[#ffffff] 2xl:flex-row 2xl:items-center 2xl:justify-between"
          aria-live="polite"
        >
          <div>
            <p className="text-4xl font-extrabold tracking-[-0.03em] tabular-nums">
              {aplican.length} <span className="text-2xl">obligaciones te aplican</span>
            </p>
            <p className="mt-2 text-sm text-[#CBD5E1]">
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
            <section key={estado} className="mt-12" aria-label={titulo}>
              <h3 className="flex items-center gap-2 text-xl font-extrabold tracking-[-0.02em] text-[#0B1B36]">
                <Icono aria-hidden className={cn('h-5 w-5', color)} />
                {titulo} <span className="text-base font-semibold text-[#8A97AB]">{lista.length}</span>
              </h3>
              {AREAS_OBLIGACION.map((area) => {
                const deArea = lista.filter((o) => o.area === area)
                if (deArea.length === 0) return null
                return (
                  <div key={area} className="mt-6">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A97AB]">{area}</p>
                    <ul className="border-t border-[#0B1B36]">
                      {deArea.map((o) => (
                        <li key={o.id} className="grid gap-2 border-b border-[#E1E7F0] py-4 sm:grid-cols-[1fr_auto] sm:gap-6">
                          <div>
                            <p className="font-semibold leading-6 text-[#0B1B36]">{o.obligacion}</p>
                            <p className="mt-1 text-xs leading-5 text-[#5A6A80]">
                              {o.base} · Evidencia: {o.evidencia}
                            </p>
                            {o.nota ? <p className="mt-1 text-xs leading-5 text-[#475569]">{o.nota}</p> : null}
                          </div>
                          <span className={cn('h-fit whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-bold', claseFalta(o.falta))}>
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
