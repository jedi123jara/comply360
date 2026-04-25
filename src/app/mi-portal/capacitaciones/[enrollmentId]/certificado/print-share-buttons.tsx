'use client'

import { Printer, Share2, Copy, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

interface Props {
  verifyUrl: string
  workerName: string
  courseTitle: string
}

export function PrintShareButtons({ verifyUrl, workerName, courseTitle }: Props) {
  const [copied, setCopied] = useState(false)

  function handlePrint() {
    window.print()
  }

  function handleShareWhatsApp() {
    const text = `¡Acabo de completar la capacitación "${courseTitle}" en COMPLY360! 🎓\n\nPodés verificar mi certificado acá: ${verifyUrl}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function handleShareNative() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificado — ${workerName}`,
          text: `Completé la capacitación "${courseTitle}" en COMPLY360`,
          url: verifyUrl,
        })
      } catch {
        // cancelado o no disponible — ignore
      }
    } else {
      // Fallback: copiar al clipboard
      await navigator.clipboard.writeText(verifyUrl).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg min-h-[44px] transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        <Printer className="w-4 h-4" />
        Imprimir / Guardar PDF
      </button>
      <button
        onClick={handleShareWhatsApp}
        className="inline-flex items-center gap-2 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold text-sm px-4 py-2.5 rounded-lg min-h-[44px] transition-colors"
      >
        <Share2 className="w-4 h-4" />
        Compartir por WhatsApp
      </button>
      <button
        onClick={handleShareNative}
        className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm px-4 py-2.5 rounded-lg min-h-[44px] transition-colors"
      >
        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Link copiado' : 'Copiar link'}
      </button>
    </div>
  )
}
