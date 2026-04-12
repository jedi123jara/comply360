'use client'

import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'

export function FloatingWhatsApp() {
  const [expanded, setExpanded] = useState(false)

  const waUrl = 'https://wa.me/51916275643?text=' + encodeURIComponent(
    '🏛️ Hola COMPLY360, quisiera una consulta sobre derecho laboral.'
  )

  return (
    // pointer-events-none en el padre para que el área flotante no bloquee clicks del dashboard
    <div className="pointer-events-none fixed bottom-6 right-6 z-50">
      {/* Expanded tooltip */}
      {expanded && (
        <div className="pointer-events-auto absolute bottom-16 right-0 w-72 bg-[#141824] rounded-2xl shadow-2xl border border-white/[0.08] overflow-hidden animate-fade-in">
          <div className="bg-green-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">COMPLY360</p>
                <p className="text-xs text-green-100">En línea</p>
              </div>
            </div>
            <button onClick={() => setExpanded(false)} className="text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4">
            <div className="bg-white/[0.04] rounded-xl rounded-tl-none p-3 mb-3">
              <p className="text-sm text-gray-300">
                ¡Hola! 👋 ¿Tienes alguna consulta laboral? Estamos para ayudarte.
              </p>
              <p className="text-[10px] text-gray-400 mt-1">Respuesta en menos de 1 hora</p>
            </div>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Iniciar conversación
            </a>
          </div>
        </div>
      )}

      {/* FAB button — pointer-events-auto explícito porque el padre es none */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="pointer-events-auto w-14 h-14 bg-green-600 hover:bg-green-700 rounded-full shadow-lg shadow-green-600/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
      >
        {expanded ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Pulse ring */}
      {!expanded && (
        <span className="absolute bottom-0 right-0 w-14 h-14 rounded-full bg-green-600/30 animate-ping pointer-events-none" />
      )}
    </div>
  )
}
