'use client'

/**
 * OrgSwitcher — dropdown en el topbar para cambiar de organización activa.
 *
 * Estado actual (Sprint 4 MVP):
 *   - Solo se renderiza cuando el user pertenece a 2+ orgs (futuro)
 *   - Hoy oculto por default (1:1 user→org)
 *   - Cuando aparezca el primer cliente con holding/multi-org, se prende auto
 *
 * Implementación lista pero invisible — preparada para Sprint 5+.
 */

import { useEffect, useState } from 'react'
import { Building2, Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Org {
  id: string
  name: string
  plan: string
  ruc?: string | null
  isActive: boolean
}

export function OrgSwitcher() {
  const [orgs, setOrgs] = useState<Org[] | null>(null)
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    fetch('/api/me/orgs')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setOrgs(data?.orgs ?? []))
      .catch(() => setOrgs([]))
  }, [])

  // Mientras no haya 2+ orgs, ocultamos el switcher (no añade valor)
  if (!orgs || orgs.length < 2) return null

  const active = orgs.find(o => o.isActive) ?? orgs[0]

  async function handleSwitch(orgId: string) {
    if (orgId === active.id) {
      setOpen(false)
      return
    }
    setSwitching(true)
    try {
      const res = await fetch('/api/me/active-org', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orgId }),
      })
      if (res.ok) {
        // Reload para que getAuthContext relea la cookie
        window.location.reload()
      } else {
        setSwitching(false)
        setOpen(false)
      }
    } catch {
      setSwitching(false)
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={switching}
        className="flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] hover:text-[color:var(--text-primary)] transition-colors disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Building2 className="h-3.5 w-3.5 text-emerald-700" />
        <span className="max-w-[180px] truncate">{active.name}</span>
        <ChevronDown
          className={cn('h-3 w-3 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-[color:var(--border-default)] bg-white shadow-lg overflow-hidden"
        >
          <li className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-tertiary)] bg-[color:var(--neutral-50)] border-b border-gray-100">
            Cambiar de organización
          </li>
          {orgs.map(org => (
            <li key={org.id}>
              <button
                type="button"
                onClick={() => handleSwitch(org.id)}
                className={cn(
                  'w-full flex items-start justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-[color:var(--neutral-50)] transition-colors',
                  org.id === active.id && 'bg-emerald-50/40',
                )}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[color:var(--text-primary)] truncate">
                    {org.name}
                  </p>
                  <p className="text-[11px] text-[color:var(--text-tertiary)] mt-0.5">
                    Plan {org.plan}
                    {org.ruc ? ` · RUC ${org.ruc}` : ''}
                  </p>
                </div>
                {org.id === active.id && (
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Click outside cierra */}
      {open && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-transparent"
          aria-label="Cerrar selector de organización"
        />
      )}
    </div>
  )
}
