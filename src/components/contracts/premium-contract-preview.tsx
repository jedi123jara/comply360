'use client'

import type { PremiumContractDocument } from '@/lib/contracts/premium-library'

interface PremiumContractPreviewProps {
  document: PremiumContractDocument | null
  className?: string
  isDraft?: boolean
  compact?: boolean
}

export function PremiumContractPreview({
  document,
  className = '',
  isDraft = false,
  compact = false,
}: PremiumContractPreviewProps) {
  if (!document) return null

  return (
    <article
      className={`relative mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-7' : 'p-12'} ${className}`}
      aria-label="Vista previa premium del contrato"
    >
      {isDraft && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <span className="select-none -rotate-12 text-[96px] font-black tracking-widest text-slate-100">
            BORRADOR
          </span>
        </div>
      )}

      <div className="relative font-serif text-slate-900">
        <header className="border-b border-slate-300 pb-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Documento legal contractual | Perú
          </p>
          <h1 className="mt-3 text-xl font-bold uppercase leading-tight tracking-wide">
            {document.title}
          </h1>
          <p className="mt-3 text-[11px] text-slate-500">
            Versión canónica {document.version} · Jurisdicción {document.jurisdiction} · Familia {document.legalFamily}
          </p>
        </header>

        <div className="mt-6 space-y-7">
          {document.sections.map((section, sectionIndex) => (
            <section key={section.id}>
              <h2 className="mb-3 border-b border-slate-200 pb-1 text-sm font-bold uppercase tracking-wide text-slate-800">
                {roman(sectionIndex + 1)}. {section.title}
              </h2>
              <div className="space-y-4">
                {section.clauses.map((clause, clauseIndex) => (
                  <section key={clause.id} className="rounded-lg border border-slate-100 bg-slate-50/40 p-3">
                    <h3 className="text-[13px] font-bold uppercase tracking-wide text-slate-900">
                      {sectionIndex + 1}.{clauseIndex + 1}. {clause.title}
                    </h3>
                    <p className="mt-2 whitespace-pre-line text-justify text-[12px] leading-6 text-slate-700">
                      {clause.body}
                    </p>
                    <p className="mt-2 text-[10px] italic leading-5 text-slate-500">
                      Base legal: {clause.legalBasis.join('; ')}
                    </p>
                  </section>
                ))}
              </div>
            </section>
          ))}

          {document.annexes.length > 0 && (
            <section>
              <h2 className="mb-3 border-b border-slate-200 pb-1 text-sm font-bold uppercase tracking-wide text-slate-800">
                Anexos integrantes
              </h2>
              <ol className="space-y-2">
                {document.annexes.map((annex, index) => (
                  <li key={annex.id} className="text-[12px] leading-5 text-slate-700">
                    <span className="font-bold">Anexo {index + 1}: {annex.title}.</span>{' '}
                    {annex.reason}{' '}
                    <span className="italic text-slate-500">Base legal: {annex.legalBasis.join('; ')}.</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section>
            <h2 className="mb-8 border-b border-slate-200 pb-1 text-sm font-bold uppercase tracking-wide text-slate-800">
              Firmas
            </h2>
            <div className="grid gap-8 sm:grid-cols-2">
              {document.signatureBlocks.map((block) => (
                <div key={`${block.role}-${block.label}`} className="text-center">
                  <div className="mx-auto mb-2 h-px w-full bg-slate-500" />
                  <p className="text-[12px] font-bold text-slate-800">{block.label}</p>
                  <p className="text-[10px] text-slate-500">{block.displayName || humanizeField(block.nameField)}</p>
                  {block.documentField && (
                    <p className="text-[10px] text-slate-500">{block.displayDocument || humanizeField(block.documentField)}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </article>
  )
}

function roman(value: number): string {
  return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][value - 1] ?? String(value)
}

function humanizeField(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase())
}
