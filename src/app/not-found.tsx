import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md text-center">
        <p className="text-7xl font-bold text-primary">404</p>
        <h1 className="mt-4 text-xl font-bold text-gray-900">Pagina no encontrada</h1>
        <p className="mt-2 text-sm text-gray-500">
          La pagina que buscas no existe o fue movida.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            Ir al Dashboard
          </Link>
          <Link
            href="/"
            className="rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Ir al Inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
