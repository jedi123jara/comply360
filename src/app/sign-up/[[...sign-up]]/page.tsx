import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">
            LEGALIA<span className="text-gold">PRO</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm">Crea tu cuenta empresarial</p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-xl rounded-2xl',
              headerTitle: 'text-primary',
              formButtonPrimary: 'bg-primary hover:bg-primary-dark',
            },
          }}
        />
      </div>
    </div>
  )
}
