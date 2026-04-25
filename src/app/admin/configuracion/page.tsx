'use client'

import {
  Database,
  FileText,
  Globe,
  Lock,
  MessageSquare,
  Settings,
  Shield,
  Sliders,
  Zap,
} from 'lucide-react'

type ConfigItem = {
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  title: string
  description: string
  status: 'ready' | 'soon' | 'beta'
}

const CONFIG_ITEMS: ConfigItem[] = [
  {
    icon: FileText,
    title: 'Planes y precios',
    description:
      'Configura los planes FREE, STARTER, EMPRESA, PRO, ENTERPRISE y sus límites de workers, usuarios y features.',
    status: 'soon',
  },
  {
    icon: Database,
    title: 'Constantes legales',
    description:
      'UIT 2026, RMV, tasas AFP/ONP, EsSalud, cronograma SUNAT. Cada cambio queda auditado.',
    status: 'soon',
  },
  {
    icon: Sliders,
    title: 'Feature flags',
    description:
      'Activa o desactiva módulos por plan o por organización. Kill-switch global disponible.',
    status: 'soon',
  },
  {
    icon: Shield,
    title: 'Seguridad',
    description:
      'MFA obligatorio, políticas de contraseña, sesión máxima, IPs permitidas para SUPER_ADMIN.',
    status: 'soon',
  },
  {
    icon: MessageSquare,
    title: 'Banner de sistema',
    description:
      'Mostrar mensajes a todos los usuarios (mantenimiento programado, anuncios, novedades).',
    status: 'soon',
  },
  {
    icon: Globe,
    title: 'Entidad legal',
    description:
      'Datos de Comply360 SAC (RUC, domicilio fiscal, responsable DPO) que aparecen en emails y términos.',
    status: 'soon',
  },
  {
    icon: Zap,
    title: 'Crons y jobs',
    description:
      'Estado de los 6 crons operativos — daily-alerts, morning-briefing, weekly-digest, check-trials, risk-sweep, norm-updates.',
    status: 'soon',
  },
  {
    icon: Lock,
    title: 'API keys y webhooks',
    description:
      'Llaves de integración, rotación de secretos, webhooks outbound suscribibles por empresa.',
    status: 'soon',
  },
]

const STATUS_BADGE: Record<ConfigItem['status'], string> = {
  ready: 'a-badge-emerald',
  beta: 'a-badge-amber',
  soon: 'a-badge-neutral',
}

const STATUS_LABEL: Record<ConfigItem['status'], string> = {
  ready: 'Listo',
  beta: 'Beta',
  soon: 'Próximamente',
}

export default function ConfiguracionPage() {
  return (
    <>
      <div className="a-page-head">
        <div>
          <div className="crumbs">Plataforma · Sistema</div>
          <h1>
            Configuración <em>global</em>
          </h1>
          <div className="sub">
            Parámetros, feature flags y tooling que aplican a toda la plataforma. Cambios sensibles
            quedan auditados automáticamente.
          </div>
        </div>
      </div>

      <div className="a-grid-3" style={{ marginBottom: 18 }}>
        {CONFIG_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.title} className="a-card a-card-pad">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background:
                      'linear-gradient(135deg, var(--emerald-50), rgba(16, 185, 129, 0.08))',
                    border: '1px solid var(--border-emerald)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--emerald-700)',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        margin: 0,
                      }}
                    >
                      {item.title}
                    </h3>
                    <span className={`a-badge ${STATUS_BADGE[item.status]}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      margin: '6px 0 0',
                      lineHeight: 1.55,
                    }}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div
        className="a-card"
        style={{
          border: '1px solid var(--border-amber)',
          background: 'linear-gradient(180deg, var(--amber-50), rgba(255, 251, 235, 0.3))',
        }}
      >
        <div className="a-card-pad" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Settings
            size={18}
            style={{ color: 'var(--amber-700)', marginTop: 2, flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber-700)' }}>
              Centro de configuración en construcción
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--amber-700)',
                marginTop: 4,
                lineHeight: 1.55,
              }}
            >
              Las constantes legales (UIT, RMV, tasas) se editan hoy por variables de entorno +
              migration. La UI con auditoría de cambios llega en la próxima iteración.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
