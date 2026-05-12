import { SignUp } from '@clerk/nextjs'
import { BrandLogo } from '@/components/comply360/brand-logo'
import { ShieldCheck, Zap, Calendar } from 'lucide-react'

/**
 * SignUpPage — pantalla editorial de registro.
 *
 * Mismo lenguaje visual que SignIn con copy de onboarding:
 *  - Copy orientado a valor: "Protege a tu equipo en 5 minutos"
 *  - 3 beneficios destacados: diagnóstico, 28 docs SUNAFIL, calendario fiscal
 */
export default function SignUpPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at 50% -20%, rgba(20,184,166,0.18), transparent 34%), radial-gradient(circle at 88% 6%, rgba(14,165,233,0.16), transparent 28%), linear-gradient(180deg, #070b14 0%, #050914 48%, #060a12 100%)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.055) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(80% 60% at 50% 40%, #000 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(80% 60% at 50% 40%, #000 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(16,185,129,0.18), transparent 70%)',
          animation: 'c360-breathe 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      <div className="relative z-10 w-full max-w-md px-4 c360-anim-slide-up">
        <div className="text-center mb-8">
          <BrandLogo
            variant="compact"
            markSize={48}
            className="c360-auth-brand c360-auth-brand--compact"
          />
          <h1
            className="c360-page-title-editorial"
            style={{ fontSize: 38, textAlign: 'center', marginTop: 18 }}
          >
            Protege a tu equipo <em>en 5 minutos</em>.
          </h1>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 14,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
            }}
          >
            Crea tu cuenta empresarial y evita multas SUNAFIL desde hoy.
          </p>
        </div>

        <SignUp
          /* Redirect a /post-login que decide la sección según role.
             En signup nuevo será WORKER (si llegan via invitación) o el
             default de /dashboard. /post-login routea correcto. */
          forceRedirectUrl="/post-login"
          fallbackRedirectUrl="/post-login"
          signInUrl="/sign-in"
          appearance={{
            variables: {
              colorPrimary: '#2563eb',
              colorText: '#f8fafc',
              colorTextSecondary: '#cbd5e1',
              colorBackground: '#0a0f1c',
              colorInputBackground: '#111827',
              colorInputText: '#f8fafc',
              borderRadius: '12px',
              fontFamily: 'var(--font-geist-sans), sans-serif',
            },
            elements: {
              rootBox: 'mx-auto',
              card:
                'shadow-2xl rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)]',
              headerTitle: 'text-[color:var(--text-primary)]',
              headerSubtitle: 'text-[color:var(--text-secondary)]',
              formButtonPrimary:
                'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold',
              footerAction: 'text-emerald-700',
              identityPreviewEditButton: 'text-emerald-700',
              formFieldInput:
                'bg-[color:var(--neutral-50)] text-[color:var(--text-primary)] border-[color:var(--border-default)] focus:border-emerald-500 focus:ring-emerald-500/20',
              socialButtonsBlockButton:
                'bg-[color:var(--neutral-50)] text-[color:var(--text-primary)] border-[color:var(--border-default)] hover:bg-[color:var(--bg-surface-hover)]',
              footer: 'bg-[color:var(--bg-elevated)]',
            },
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginTop: 32,
            padding: 16,
            background: 'rgba(15,23,42,0.72)',
            backdropFilter: 'blur(10px)',
            borderRadius: 12,
            border: '0.5px solid var(--border-subtle)',
            boxShadow: 'var(--elevation-1)',
          }}
        >
          <Benefit icon={<ShieldCheck size={14} />} text="Diagnóstico SUNAFIL en 5 minutos" />
          <Benefit icon={<Zap size={14} />} text="28 documentos obligatorios pre-cargados" />
          <Benefit icon={<Calendar size={14} />} text="Calendario fiscal peruano automático" />
        </div>
      </div>
    </div>
  )
}

function Benefit({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 24,
          height: 24,
          borderRadius: 6,
          background: 'var(--emerald-50)',
          color: 'var(--emerald-700)',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
        {text}
      </span>
    </div>
  )
}
