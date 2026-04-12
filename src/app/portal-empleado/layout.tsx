import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portal del Empleado | COMPLY360',
  description: 'Consulta tu información laboral, beneficios y documentos'
}

export default function PortalEmpleadoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
