import { Code2, ExternalLink, Key } from 'lucide-react'

export const metadata = {
  title: 'API Docs · COMPLY360',
}

export default function ApiDocsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-gold-500/10 p-3">
          <Code2 className="h-7 w-7 text-gold-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">API pública v1</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Integra COMPLY360 con tus sistemas. Autentica con `X-API-Key`. Especificación
            OpenAPI 3.1 disponible en <code className="text-gold-400">/api/v1/openapi</code>.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card
          icon={<Key className="h-5 w-5 text-gold-500" />}
          title="1. Genera tu API key"
          description="Ve a Configuración → API keys y crea una nueva clave con los permisos que necesites."
          href="/dashboard/configuracion"
        />
        <Card
          icon={<Code2 className="h-5 w-5 text-gold-500" />}
          title="2. Descarga el OpenAPI"
          description="Importa el JSON en Postman, Insomnia, Stoplight o cualquier viewer Swagger."
          href="/api/v1/openapi"
          external
        />
        <Card
          icon={<ExternalLink className="h-5 w-5 text-gold-500" />}
          title="3. Visualiza interactivo"
          description="Abre la spec en Swagger UI hospedado en swagger.io con un solo clic."
          href="https://petstore.swagger.io/?url=/api/v1/openapi"
          external
        />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold text-white">Endpoints disponibles</h2>
        <div className="space-y-2 text-sm">
          <Endpoint method="GET" path="/api/v1/workers" desc="Lista trabajadores" />
          <Endpoint method="POST" path="/api/v1/workers" desc="Crea un trabajador" />
          <Endpoint method="GET" path="/api/v1/contracts" desc="Lista contratos" />
          <Endpoint method="GET" path="/api/v1/compliance" desc="Score de compliance vigente" />
          <Endpoint
            method="POST"
            path="/api/agents/{slug}/run"
            desc="Ejecuta un agente IA (sunafil-analyzer | descargo-writer | payslip-auditor | risk-monitor)"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gold-500/30 bg-gold-500/5 p-6">
        <h3 className="mb-2 font-semibold text-white">Ejemplo cURL</h3>
        <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-200">
{`curl https://comply360.pe/api/v1/workers \\
  -H "X-API-Key: cmply_..."`}
        </pre>
      </div>
    </div>
  )
}

function Card({
  icon,
  title,
  description,
  href,
  external,
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
  external?: boolean
}) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className="block rounded-2xl border border-slate-800 bg-white p-5 transition hover:border-gold-500/60 hover:bg-white"
    >
      <div className="mb-2">{icon}</div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </a>
  )
}

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  const color =
    method === 'GET'
      ? 'bg-blue-500/15 text-emerald-600'
      : method === 'POST'
        ? 'bg-green-500/15 text-green-300'
        : 'bg-slate-500/15 text-slate-300'
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
      <span className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${color}`}>
        {method}
      </span>
      <code className="font-mono text-xs text-white">{path}</code>
      <span className="ml-auto text-xs text-slate-500">{desc}</span>
    </div>
  )
}
