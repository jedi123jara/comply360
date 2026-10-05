'use client'

import { useState } from 'react'
import {
  Building2,
  Users,
  Bell,
  Link2,
  CreditCard,
  Lock,
  Smartphone,
  ChevronRight,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

// =============================================
// Types
// =============================================

interface SettingsCategory {
  key: string
  label: string
  description: string
  emoji: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  badge?: string
  disabled?: boolean
}

// =============================================
// Categories
// =============================================

const CATEGORIES: SettingsCategory[] = [
  {
    key: 'empresa',
    label: 'Datos de Empresa',
    description: 'RUC, razón social, logo, información fiscal y tributaria',
    emoji: '🏢',
    icon: Building2,
    href: '/dashboard/configuracion/empresa',
  },
  {
    key: 'equipo',
    label: 'Equipo y Usuarios',
    description: 'Invitar miembros, gestionar roles y permisos',
    emoji: '👥',
    icon: Users,
    href: '/dashboard/configuracion/equipo',
  },
  {
    key: 'notificaciones',
    label: 'Notificaciones',
    description: 'Alertas normativas, vencimientos y preferencias de aviso',
    emoji: '🔔',
    icon: Bell,
    href: '/dashboard/configuracion/notificaciones',
  },
  {
    key: 'integraciones',
    label: 'Integraciones',
    description: 'Archivos para T-Registro y PLAME, y avisos automáticos a otros sistemas',
    emoji: '🔗',
    icon: Link2,
    href: '/dashboard/integraciones',
  },
  {
    key: 'facturacion',
    label: 'Plan y Facturación',
    description: 'Tu plan actual, historial de pagos y actualización',
    emoji: '💳',
    icon: CreditCard,
    href: '/dashboard/configuracion/facturacion',
  },
  {
    key: 'seguridad',
    label: 'Seguridad',
    description: 'Contraseña, autenticación 2FA y sesiones activas',
    emoji: '🔒',
    icon: Lock,
    href: '/dashboard/configuracion/seguridad',
  },
  {
    key: 'marca-blanca',
    label: 'Marca blanca',
    description: 'Usar la plataforma con el nombre y los colores de tu consultora',
    emoji: '📱',
    icon: Smartphone,
    disabled: true,
    badge: 'No disponible',
  },
]

// =============================================
// Main Page Component
// =============================================

export default function ConfiguracionPage() {
  const router = useRouter()
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  const handleCategoryClick = (category: SettingsCategory) => {
    if (category.disabled || !category.href) return
    router.push(category.href)
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Configuración</h1>
        <p className="text-[color:var(--text-secondary)] mt-1">
          Administra todos los ajustes de tu organización y cuenta.
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CATEGORIES.map(category => {
          const isHovered = hoveredKey === category.key
          const isClickable = !category.disabled

          return (
            <button
              key={category.key}
              onClick={() => handleCategoryClick(category)}
              onMouseEnter={() => setHoveredKey(category.key)}
              onMouseLeave={() => setHoveredKey(null)}
              disabled={category.disabled}
              className={`
                relative flex items-start gap-4 p-5 rounded-2xl border text-left
                transition-all duration-150
                ${isClickable
                  ? 'bg-white border-gray-200 hover:border-primary/50 hover:shadow-md cursor-pointer'
                  : 'bg-white/60 border-gray-200 cursor-default opacity-75'
                }
              `}
            >
              {/* Icon */}
              <div
                className={`
                  flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl
                  transition-colors duration-150
                  ${isClickable && isHovered
                    ? 'bg-primary/20'
                    : 'bg-[color:var(--neutral-100)]'
                  }
                `}
              >
                {category.emoji}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[color:var(--text-primary)]">
                    {category.label}
                  </span>
                  {category.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {category.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[color:var(--text-secondary)] mt-0.5 leading-relaxed">
                  {category.description}
                </p>
              </div>

              {/* Chevron */}
              {isClickable && (
                <ChevronRight
                  className={`
                    flex-shrink-0 w-4 h-4 mt-0.5 transition-all duration-150
                    ${isHovered
                      ? 'text-primary translate-x-0.5'
                      : 'text-[color:var(--text-secondary)]'
                    }
                  `}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Info note */}
      <p className="text-xs text-slate-500">
        Las secciones marcadas como «No disponible» todavía no funcionan en Comply360: no se activan
        al cambiar de plan. Si las necesitas, escríbenos a soporte.
      </p>
    </div>
  )
}
