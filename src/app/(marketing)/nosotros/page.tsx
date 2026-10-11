import type { Metadata } from 'next'
import { Ban, Eye, FileCheck2, Lock, Receipt, UserCheck } from 'lucide-react'
import { PublicHero } from '@/components/marketing/public-hero'
import { pub } from '@/components/marketing/public-theme'
import { Breadcrumbs } from '@/components/sitio/breadcrumbs'
import { CtaBand } from '@/components/sitio/cta-band'
import { SectionHeader } from '@/components/sitio/section-header'
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
    icono: Eye,
    titulo: 'Prevenir, no apagar incendios',
    texto: 'Trabajamos todo el año para que la inspección encuentre todo en orden, no cuando ya llegó el acta.',
  },
  {
    icono: FileCheck2,
    titulo: 'Evidencia antes que papeles',
    texto: 'Un documento en un cajón no te defiende. Dejamos actas, registros y constancias ordenados como los pide el inspector.',
  },
  {
    icono: Ban,
    titulo: 'Sin promesas imposibles',
    texto: 'No prometemos "cero multas". Prometemos que tus obligaciones estén al día y que puedas demostrarlo.',
  },
  {
    icono: Receipt,
    titulo: 'Precios claros',
    texto: 'Publicamos nuestros precios. Sabes cuánto pagas antes de empezar, sin cobros por hora sorpresa.',
  },
  {
    icono: UserCheck,
    titulo: 'Cada tema, con quien sabe',
    texto: 'Lo legal lo vemos nosotros; lo técnico, especialistas competentes y con experiencia en cada materia.',
  },
  {
    icono: Lock,
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

export default function NosotrosPage() {
  return (
    <>
      <PublicHero
        align="left"
        eyebrow="Cómo trabajamos"
        title={
          <>
            Un estudio de cumplimiento <span className={pub.highlightOnNavy}>solo para empresas</span>
          </>
        }
        description="Comply360 hace el trabajo de un área de cumplimiento interna: diagnostica, implementa, mantiene, capacita y defiende, con una red de especialistas."
        media={<Breadcrumbs items={[{ nombre: 'Cómo trabajamos', ruta: '/nosotros' }]} className="mb-0" />}
      />

      <section className="bg-[#ffffff]" aria-labelledby="principios">
        <div className={cn(pub.container, pub.section)}>
          <SectionHeader id="principios" kicker="Principios" titulo="Lo que puedes esperar de nosotros" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PRINCIPIOS.map(({ icono: Icono, titulo, texto }) => (
              <div key={titulo} className={cn(pub.card, 'p-6')}>
                <span className={pub.iconBox}>
                  <Icono aria-hidden className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-extrabold tracking-[-0.01em] text-[#0B1B36]">{titulo}</h3>
                <p className={cn(pub.body, 'mt-2')}>{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="red">
        <div className={cn(pub.container, pub.section, 'grid gap-8 lg:grid-cols-[1fr_1.3fr]')}>
          <SectionHeader
            id="red"
            kicker="Red de especialistas"
            titulo="Cada tema lo ve el profesional que corresponde"
            bajada="El reglamento de SST exige que las capacitaciones las den profesionales competentes y con experiencia. Por eso trabajamos con una red, no con generalistas."
          />
          <ul className={cn(pub.card, pub.divide)}>
            {RED.map((r) => (
              <li key={r.perfil} className="px-5 py-4">
                <p className="font-bold text-[#0B1B36]">{r.perfil}</p>
                <p className={cn(pub.body, 'mt-1')}>{r.rol}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[#ffffff]" aria-labelledby="donde">
        <div className={cn(pub.container, pub.section)}>
          <SectionHeader
            id="donde"
            kicker="Dónde estamos"
            titulo={`${SITIO.ciudad}, ${SITIO.region}`}
            bajada={`${SITIO.cobertura}. Los juicios de una empresa cliente los derivamos a un estudio aliado: nosotros nos enfocamos en prevenir y en la defensa ante SUNAFIL.`}
          />
        </div>
      </section>

      <CtaBand />
    </>
  )
}
