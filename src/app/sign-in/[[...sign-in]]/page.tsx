import { SignIn } from '@clerk/nextjs'
import { AnimatedShield } from '@/components/comply360/animated-shield'
import { ShieldCheck, Users, Activity } from 'lucide-react'

/**
 * SignInPage — pantalla editorial de ingreso.
 *
 * Primera impresión con la identidad COMPLY360 "Emerald Light":
 *  - Fondo gradient emerald/slate/amber con halo pulsante (igual al hero panel)
 *  - AnimatedShield flotando + wordmark editorial
 *  - Tagline emerald italic
 *  - Clerk con tema emerald
 *  - 3 trust signals abajo (multas evitadas, empresas, sincronización SUNAFIL)
 */
export default function SignInPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background:
          'linear-gradient(rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.98) 100%), linear-gradient(135deg, #ecfdf5 0%, #f8fafc 55%, #fefce8 100%)',
      }}
    >
      {/* Grid overlay + halo emerald */}
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

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <AnimatedShield size={64} orbit />
          </div>
          <h1
            className="c360-page-title-editorial"
            style={{ fontSize: 38, textAlign: 'center' }}
          >
            Comply<span style={{ color: 'var(--emerald-700)', fontStyle: 'italic' }}>360</span>
          </h1>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 14,
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
              fontFamily: 'var(--font-serif)',
            }}
          >
            Tu escudo inteligente contra multas SUNAFIL.
          </p>
        </div>

        {/* Clerk sign-in card */}
        <SignIn
          /* Redirect a /post-login que decide la sección según role:
             SUPER_ADMIN → /admin, WORKER → /mi-portal, resto → /dashboard.
             Server-side decide en una sola pasada (sin flash visual). */
          forceRedirectUrl="/post-login"
          fallbackRedirectUrl="/post-login"
          signUpUrl="/sign-up"
          appearance={{
            variables: {
              colorPrimary: '#10b981',
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

        {/* Trust signals */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginTop: 32,
            padding: 16,
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(10px)',
            borderRadius: 12,
            border: '0.5px solid var(--border-subtle)',
          }}
        >
          <TrustSignal icon={<ShieldCheck size={14} />} value="+S/ 12M" label="Multas evitadas" />
          <TrustSignal icon={<Users size={14} />} value="+300" label="Empresas protegidas" />
          <TrustSignal icon={<Activity size={14} />} value="24/7" label="Sync SUNAFIL" />
        </div>
      </div>
    </div>
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 4,
      }}
    >
      <div style={{ color: 'var(--emerald-600)' }}>{icon}</div>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 18,
          fontWeight: 400,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
    </div>
  )
}
