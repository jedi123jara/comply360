import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'
import { ShieldCheck, Users, Activity, ArrowRight } from 'lucide-react'
import { PublicHero } from '@/components/marketing/public-hero'
import { PublicShell } from '@/components/marketing/public-shell'
import { publicClerkAppearance } from '@/components/marketing/public-clerk-appearance'
import { pub } from '@/components/marketing/public-theme'
import { cn } from '@/lib/utils'

/**
 * SignInPage — ingreso con el tema público de Comply360 (mismo header, hero
 * azul marino y cuerpo claro que planes, calculadoras y diagnóstico).
 *  - Clerk con tarjeta blanca y botón ámbar (`publicClerkAppearance`)
 *  - Enlace al portal del trabajador
 *  - 3 trust signals abajo
 */
export default function SignInPage() {
  return (
    <PublicShell header="minimal" headerAction={{ href: '/sign-up', label: 'Crear cuenta' }} footer={false}>
      <PublicHero
        titleAs="p"
        title={<>Tu escudo inteligente contra multas <span className={pub.highlightOnNavy}>SUNAFIL</span>.</>}
        contentClassName="pb-24 pt-10 sm:pb-28 sm:pt-12"
      />

      <div className="relative z-10 mx-auto -mt-16 w-full max-w-md px-4 pb-12 c360-anim-slide-up">
        {/* Clerk sign-in card */}
        <SignIn
          /* Redirect a /post-login que decide la sección según role:
             SUPER_ADMIN → /admin, WORKER → /mi-portal, resto → /dashboard.
             Server-side decide en una sola pasada (sin flash visual). */
          forceRedirectUrl="/post-login"
          fallbackRedirectUrl="/post-login"
          signUpUrl="/sign-up"
          appearance={publicClerkAppearance}
        />

        <div className="mt-5 text-center">
          <Link href="/mi-portal/ingresar" className={cn(pub.link, 'inline-flex items-center gap-1 text-sm')}>
            ¿Eres trabajador? Entra a tu portal
            <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Trust signals */}
        <div className={cn(pub.card, 'mt-8 grid grid-cols-3 gap-3 p-4')}>
          <TrustSignal icon={<ShieldCheck size={14} />} value="+S/ 12M" label="Multas evitadas" />
          <TrustSignal icon={<Users size={14} />} value="+300" label="Empresas protegidas" />
          <TrustSignal icon={<Activity size={14} />} value="24/7" label="Sync SUNAFIL" />
        </div>
      </div>
    </PublicShell>
  )
}

function TrustSignal({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="grid h-7 w-7 place-items-center rounded-md bg-[#EFF4FF] text-[#2563EB]" aria-hidden>
        {icon}
      </div>
      <div className="text-lg font-extrabold leading-none tracking-[-0.02em] text-[#0B1B36]">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#5A6A80]">{label}</div>
    </div>
  )
}
