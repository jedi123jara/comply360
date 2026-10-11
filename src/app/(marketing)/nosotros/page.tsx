import type { Metadata } from 'next'
import { CtaBand } from '@/components/sitio/cta-band'
import { FichaHero, HeroPagina, Seccion } from '@/components/sitio/editorial'
import { cn } from '@/lib/utils'
import { construirMetadata } from '@/lib/sitio/seo'
import { SITIO } from '@/lib/sitio/site'

export const metadata: Metadata = construirMetadata({
  titulo: 'Cómo trabajamos',
  descripcion:
    'Comply360 es un estudio de cumplimiento normativo solo para empresas. Trabajamos con una red de especialistas, precios claros y evidencia lista para SUNAFIL.',
  ruta: '/nosotros',
})

const PRINCIPIOS = [
  {
    titulo: 'Prevenir antes que apagar incendios',
    texto: 'Trabajamos todo el año para que la inspección encuentre todo en orden, mucho antes de que llegue el acta.',
  },
  {
    titulo: 'Evidencia antes que papeles',
    texto: 'Un documento en un cajón no te defiende. Dejamos actas, registros y constancias ordenados como los pide el inspector.',
  },
  {
    titulo: 'Sin promesas imposibles',
    texto: 'No prometemos «cero multas». Prometemos que tus obligaciones estén al día y que puedas demostrarlo.',
  },
  {
    titulo: 'Precios claros',
    texto: 'Publicamos nuestros precios. Sabes cuánto pagas antes de empezar, sin cobros por hora sorpresa.',
  },
  {
    titulo: 'Cada tema, con quien sabe',
    texto: 'Lo legal lo vemos nosotros. Lo técnico lo ven especialistas competentes y con experiencia en cada materia.',
  },
  {
    titulo: 'Confidencialidad',
    texto: 'Lo que nos cuentas y los datos de tus trabajadores se tratan con reserva y bajo contrato de encargo de tratamiento.',
  },
] as const

const RED = [
  { perfil: 'Ingenieros de seguridad', rol: 'IPERC, mapa de riesgos, inducciones y capacitaciones técnicas de SST' },
  { perfil: 'Instructores de brigadas', rol: 'Primeros auxilios, uso de extintores, evacuación y simulacros' },
  { perfil: 'Psicólogos', rol: 'Hostigamiento sexual (junto con lo legal) y riesgos psicosociales' },
  { perfil: 'Centros médicos ocupacionales', rol: 'Exámenes médicos ocupacionales' },
  { perfil: 'Contadores aliados', rol: 'Lo tributario y contable, que no hacemos' },
] as const

/** Fila de lista editorial: número, título y texto (en tres columnas desde md). */
const filaEditorial =
  'grid grid-cols-[3rem_1fr] gap-x-4 py-7 md:grid-cols-[3rem_minmax(0,17rem)_1fr] md:gap-x-8'

export default function NosotrosPage() {
  return (
    <>
      <HeroPagina
        migas={[{ nombre: 'Cómo trabajamos', ruta: '/nosotros' }]}
        etiqueta="Cómo trabajamos"
        titulo={
          <>
            Un estudio de cumplimiento <span className="text-[#F5B301]">solo para empresas</span>
          </>
        }
        bajada="Comply360 hace el trabajo de un área de cumplimiento interna: diagnostica, implementa, mantiene, capacita y defiende, con una red de especialistas."
        aside={
          <FichaHero
            filas={[
              { etiqueta: 'Clientes', valor: 'Solo empresas' },
              { etiqueta: 'Sede', valor: `${SITIO.ciudad}, ${SITIO.region}` },
              { etiqueta: 'Atención', valor: SITIO.cobertura },
            ]}
          />
        }
      />

      {/* 01 — Principios */}
      <Seccion id="principios" numero="01" etiqueta="Principios" titulo="Lo que puedes esperar de nosotros">
        <ol className="border-t border-[#0B1B36]">
          {PRINCIPIOS.map((p, i) => (
            <li key={p.titulo} className={cn(filaEditorial, 'border-b border-[#E1E7F0]')}>
              <span className="pt-1 text-sm font-bold tabular-nums text-[#B45309]">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="text-[1.25rem] font-extrabold leading-snug tracking-[-0.02em] text-[#0B1B36]">{p.titulo}</h3>
              <p className="col-start-2 mt-2 max-w-2xl text-[1.02rem] leading-7 text-[#475569] md:col-start-3 md:mt-0">
                {p.texto}
              </p>
            </li>
          ))}
        </ol>
      </Seccion>

      {/* 02 — Red de especialistas */}
      <Seccion
        id="red"
        numero="02"
        etiqueta="Red de especialistas"
        tono="claro"
        titulo="Cada tema lo ve el profesional que corresponde"
        bajada="El reglamento de SST exige que las capacitaciones las den profesionales competentes y con experiencia. Por eso trabajamos con una red de especialistas."
      >
        <ol className="border-t border-[#0B1B36]">
          {RED.map((r, i) => (
            <li key={r.perfil} className={cn(filaEditorial, 'border-b border-[#D9E0EA]')}>
              <span className="pt-1 text-sm font-bold tabular-nums text-[#B45309]">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="text-[1.15rem] font-extrabold leading-snug tracking-[-0.015em] text-[#0B1B36]">{r.perfil}</h3>
              <p className="col-start-2 mt-2 max-w-2xl text-[1.02rem] leading-7 text-[#475569] md:col-start-3 md:mt-0">{r.rol}</p>
            </li>
          ))}
        </ol>
      </Seccion>

      {/* 03 — Dónde estamos */}
      <Seccion
        id="donde"
        numero="03"
        etiqueta="Dónde estamos"
        titulo={`${SITIO.ciudad}, ${SITIO.region}`}
        bajada={`${SITIO.cobertura}.`}
      >
        <p className="max-w-3xl border-t border-[#E1E7F0] pt-6 text-[1.02rem] leading-7 text-[#475569]">
          Los juicios de una empresa cliente los derivamos a un estudio aliado. Nosotros nos enfocamos en prevenir y en la
          defensa ante SUNAFIL.
        </p>
      </Seccion>

      <CtaBand />
    </>
  )
}
