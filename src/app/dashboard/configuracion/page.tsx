'use client'

import { useState } from 'react'
import {
  Building2,
  Users,
  Bell,
  Link2,
  CreditCard,
  Lock,
  Palette,
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
    disabled: true,
    badge: 'Próximamente',
  },
  {
    key: 'integraciones',
    label: 'Integraciones',
    description: 'SUNAT, T-Registro, PLAME y otras conexiones externas',
    emoji: '🔗',
    icon: Link2,
    href: '/dashboard/configuracion/integraciones',
    disabled: true,
    badge: 'Próximamente',
  },
  {
    key: 'facturacion',
    label: 'Plan y Facturación',
    description: 'Tu plan actual, historial de pagos y actualización',
    emoji: '💳',
    icon: CreditCard,
    href: '/dashboard/configuracion/facturacion',
    disabled: true,
    badge: 'Próximamente',
  },
  {
    key: 'seguridad',
    label: 'Seguridad',
    description: 'Contraseña, autenticación 2FA y sesiones activas',
    emoji: '🔒',
    icon: Lock,
    href: '/dashboard/configuracion/seguridad',
    disabled: true,
    badge: 'Próximamente',
  },
  {
    key: 'personalizacion',
    label: 'Personalización',
    description: 'Tema, idioma, moneda y preferencias de la interfaz',
    emoji: '🎨',
    icon: Palette,
    href: '/dashboard/configuracion/personalizacion',
    disabled: true,
    badge: 'Próximamente',
  },
  {
    key: 'marca-blanca',
    label: 'Marca Blanca',
    description: 'Personaliza la plataforma con tu propio branding',
    emoji: '📱',
    icon: Smartphone,
    href: '/dashboard/configuracion/marca-blanca',
    disabled: true,
    badge: 'Plan Pro',
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
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-gray-500 text-gray-400 mt-1">
          Administra todos los ajustes de tu organización y cuenta.
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CATEGORIES.map(category => {
          const Icon = category.icon
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
                  ? 'bg-[#141824] border-white/[0.08] hover:border-primary/50 hover:border-primary/50 hover:shadow-md cursor-pointer'
                  : 'bg-white/[0.02] bg-[#141824]/60 border-white/[0.08]/60 cursor-default opacity-75'
                }
              `}
            >
              {/* Icon */}
              <div
                className={`
                  flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl
                  transition-colors duration-150
                  ${isClickable && isHovered
                    ? 'bg-primary/15 bg-primary/20'
                    : 'bg-white/[0.04]'
                  }
                `}
              >
                {category.emoji}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">
                    {category.label}
                  </span>
                  {category.badge && (
                    <span
                      className={`
                        text-[10px] font-bold px-2 py-0.5 rounded-full
                        ${category.badge === 'Plan Pro'
                          ? 'bg-amber-100 text-amber-700 bg-amber-900/30 text-amber-400 border border-amber-200 border-amber-800'
                          : 'bg-blue-100 text-blue-700 bg-blue-900/30 text-blue-400 border border-blue-200 border-blue-800'
                        }
                      `}
                    >
                      {category.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 text-gray-400 mt-0.5 leading-relaxed">
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
                      : 'text-gray-300 text-slate-600'
                    }
                  `}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Info note */}
      <p className="text-xs text-gray-400 text-slate-500">
        Las secciones marcadas como &quot;Próximamente&quot; estarán disponibles en futuras actualizaciones.
        Contacta a soporte si necesitas acceso anticipado.
      </p>
    </div>
  )
}
