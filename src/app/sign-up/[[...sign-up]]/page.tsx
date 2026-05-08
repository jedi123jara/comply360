import { SignUp } from '@clerk/nextjs'
import { AnimatedShield } from '@/components/comply360/animated-shield'
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
          'linear-gradient(rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.98) 100%), linear-gradient(135deg, #eff6ff 0%, #f8fafc 55%, #fefce8 100%)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)',
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
          <div className="flex justify-center mb-4">
            <AnimatedShield size={64} orbit />
          </div>
          <h1
            className="c360-page-title-editorial"
            style={{ fontSize: 38, textAlign: 'center' }}
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
              colorText: '#0f172a',
              colorTextSecondary: '#64748b',
              colorBackground: '#ffffff',
              colorInputBackground: '#ffffff',
              colorInputText: '#0f172a',
              borderRadius: '12px',
              fontFamily: 'var(--font-geist-sans), sans-serif',
            },
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-2xl rounded-2xl border border-[color:var(--border-default)]',
              headerTitle: 'text-emerald-700',
              formButtonPrimary:
                'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold',
              footerAction: 'text-emerald-700',
              identityPreviewEditButton: 'text-emerald-700',
              formFieldInput:
                'border-[color:var(--border-default)] focus:border-emerald-500 focus:ring-emerald-500/20',
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
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(10px)',
            borderRadius: 12,
            border: '0.5px solid var(--border-subtle)',
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
