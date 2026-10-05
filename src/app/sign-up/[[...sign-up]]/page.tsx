import { SignUp } from '@clerk/nextjs'
import { ShieldCheck, Zap, Calendar } from 'lucide-react'
import { PublicHero } from '@/components/marketing/public-hero'
import { PublicShell } from '@/components/marketing/public-shell'
import { publicClerkAppearance } from '@/components/marketing/public-clerk-appearance'
import { pub } from '@/components/marketing/public-theme'
import { cn } from '@/lib/utils'

/**
 * SignUpPage — registro con el tema público de Comply360 (mismo header, hero
 * azul marino y cuerpo claro que planes, calculadoras y diagnóstico).
 *  - Copy orientado a valor: "Protege a tu equipo en 5 minutos"
 *  - 3 beneficios destacados: diagnóstico, 28 docs SUNAFIL, calendario fiscal
 */
export default function SignUpPage() {
  return (
    <PublicShell header="minimal" headerAction={{ href: '/sign-in', label: 'Iniciar sesión' }} footer={false}>
      <PublicHero
        title={
          <>
            Protege a tu equipo <span className={pub.highlightOnNavy}>en 5 minutos</span>.
          </>
        }
        description="Crea tu cuenta empresarial y evita multas SUNAFIL desde hoy."
        contentClassName="pb-24 pt-10 sm:pb-28 sm:pt-12"
      />

      <div className="relative z-10 mx-auto -mt-16 w-full max-w-md px-4 pb-12 c360-anim-slide-up">
        <SignUp
          /* Redirect a /post-login que decide la sección según role.
             En signup nuevo será WORKER (si llegan via invitación) o el
             default de /dashboard. /post-login routea correcto. */
          forceRedirectUrl="/post-login"
          fallbackRedirectUrl="/post-login"
          signInUrl="/sign-in"
          appearance={publicClerkAppearance}
        />

        <div className={cn(pub.card, 'mt-8 flex flex-col gap-2.5 p-4')}>
          <Benefit icon={<ShieldCheck size={14} />} text="Diagnóstico SUNAFIL en 5 minutos" />
          <Benefit icon={<Zap size={14} />} text="28 documentos obligatorios pre-cargados" />
          <Benefit icon={<Calendar size={14} />} text="Calendario fiscal peruano automático" />
        </div>
      </div>
    </PublicShell>
  )
}

function Benefit({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#EFF4FF] text-[#2563EB]" aria-hidden>
        {icon}
      </div>
      <span className="text-[13px] font-medium text-[#475569]">{text}</span>
    </div>
  )
}
