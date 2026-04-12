'use client'

import Link from 'next/link'
import { Shield, Lock, Eye, ArrowRight } from 'lucide-react'

export default function DenunciasPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Canal de Denuncias</h2>
        <p className="text-sm text-slate-500 mt-1">
          Reporta cualquier conducta indebida de manera segura, anónima y confidencial.
        </p>
      </div>

      <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white rounded-2xl p-6">
        <Shield className="w-10 h-10 mb-3" />
        <h3 className="text-xl font-bold mb-2">Tu denuncia es importante</h3>
        <p className="text-blue-100 text-sm">
          Conforme a la <strong>Ley 27942</strong> (prevención del hostigamiento sexual) y al D.S. 014-2019-MIMP,
          tu empleador esta obligado a investigar y proteger a quien denuncie.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Feature icon={Lock} title="100% Anonimo" text="No es necesario ingresar tu nombre ni datos." />
        <Feature icon={Eye} title="Confidencial" text="Solo el comite de investigacion accede a tu denuncia." />
        <Feature icon={Shield} title="Sin represalias" text="La ley te protege contra cualquier sancion." />
      </div>

      <div className="bg-[#141824] border border-slate-200 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-2">¿Que puedo denunciar?</h3>
        <ul className="text-sm text-slate-700 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span><strong>Hostigamiento sexual</strong> — Conductas no deseadas de naturaleza sexual.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span><strong>Discriminación</strong> — Por género, raza, edad, orientación, discapacidad, etc.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span><strong>Acoso laboral / mobbing</strong> — Hostigamiento psicológico continuado.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span><strong>Otros</strong> — Fraude, corrupción, incumplimientos éticos.</span>
          </li>
        </ul>

        <Link
          href="/denuncias"
          target="_blank"
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          Presentar denuncia ahora
          <ArrowRight className="w-4 h-4" />
        </Link>

        <p className="text-xs text-slate-500 text-center mt-3">
          Al hacer click serás redirigido al formulario público anónimo. No quedará rastro de tu sesión.
        </p>
      </div>
    </div>
  )
}

function Feature({ icon: Icon, title, text }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <div className="bg-[#141824] border border-slate-200 rounded-xl p-4 text-center">
      <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <p className="font-semibold text-sm text-slate-900">{title}</p>
      <p className="text-xs text-slate-500 mt-1">{text}</p>
    </div>
  )
}
