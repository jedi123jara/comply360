export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
        <p className="text-sm text-gray-500">Cargando COMPLY360...</p>
      </div>
    </div>
  )
}
