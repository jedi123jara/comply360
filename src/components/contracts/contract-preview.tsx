'use client'

/* -------------------------------------------------------------------------- */
/*  ContractPreview — render WYSIWYG del contrato basado en template + datos  */
/* -------------------------------------------------------------------------- */
/*
 * Componente reusable usado tanto en el step 'preview' como en el split view
 * en vivo del step 'form'. Pure render: no side effects.
 */

import type { ContractTemplateDefinition } from '@/lib/legal-engine/contracts/templates'

interface ContractPreviewProps {
  template: ContractTemplateDefinition
  formData: Record<string, string | number | boolean>
  /** className extra para el contenedor */
  className?: string
  /** Mostrar marcas de agua "BORRADOR" si esta incompleto */
  isDraft?: boolean
}

/**
 * Evalua una condition string como JS function. Pura — usa el mismo enfoque
 * que el wizard original.
 *
 * NOTE: el `new Function` es seguro acá porque las conditions vienen del
 * catalogo CONTRACT_TEMPLATES (codigo del repo, no input del usuario).
 */
function evalCondition(
  condition: string,
  formData: Record<string, string | number | boolean>,
): boolean {
  try {
    const keys = Object.keys(formData)
    const values = Object.values(formData)
    const fn = new Function(...keys, `return ${condition}`)
    return !!fn(...values)
  } catch {
    return false
  }
}

function renderTemplateText(
  text: string,
  formData: Record<string, string | number | boolean>,
): string {
  let out = text
  Object.entries(formData).forEach(([key, value]) => {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value ?? '___'))
  })
  // Placeholders no llenados → línea para escribir
  out = out.replace(/\{\{[^}]+\}\}/g, '____________')
  return out
}

export function ContractPreview({
  template,
  formData,
  className = '',
  isDraft = false,
}: ContractPreviewProps) {
  return (
    <article
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-12 max-w-3xl mx-auto relative ${className}`}
      aria-label="Vista previa del contrato"
    >
      {isDraft && (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <span className="text-[120px] font-black text-slate-100 -rotate-12 select-none">
            BORRADOR
          </span>
        </div>
      )}
      <div className="prose prose-sm max-w-none relative">
        {template.contentBlocks.map(block => {
          if (block.condition && !evalCondition(block.condition, formData)) return null
          const text = renderTemplateText(block.text, formData)
          return (
            <div key={block.id} className="mb-6">
              {block.title && (
                <h3 className="text-base font-bold text-slate-900 uppercase mb-2">
                  {block.title}
                </h3>
              )}
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                {text}
              </p>
            </div>
          )
        })}

        {/* Bloques de firma */}
        <div className="grid grid-cols-2 gap-16 mt-16 pt-8 border-t border-slate-200">
          <div className="text-center">
            <div className="w-full h-px bg-gray-400 mb-2" />
            <p className="text-sm font-semibold text-slate-700">EL EMPLEADOR</p>
            <p className="text-xs text-gray-500">
              {String(formData.empleador_razon_social ?? '___')}
            </p>
          </div>
          <div className="text-center">
            <div className="w-full h-px bg-gray-400 mb-2" />
            <p className="text-sm font-semibold text-slate-700">EL TRABAJADOR</p>
            <p className="text-xs text-gray-500">
              {String(formData.trabajador_nombre ?? '___')}
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}
