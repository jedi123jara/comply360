import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Autorización de datos personales sensibles · COMPLY360',
  description:
    'Información sobre la autorización expresa que se solicita al trabajador para el tratamiento de datos sensibles conforme a la Ley N° 29733 Art. 14.',
  robots: { index: false, follow: false },
}

export default function AutorizacionDatosSensiblesPage() {
  return (
    <LegalPage
      title="Autorización de tratamiento de datos sensibles"
      subtitle="Qué datos te pedimos, para qué los usamos, y cómo puedes revocarlos."
      lastUpdated="20 de abril de 2026"
      legalBasis={['Ley 29733 Art. 5, 13, 14', 'D.S. 003-2013-JUS']}
    >
      <h2>1. Qué son &quot;datos sensibles&quot;</h2>
      <p>
        La Ley N° 29733 considera datos sensibles a aquellos cuyo tratamiento puede
        generar discriminación o riesgo grave para el titular. En el contexto laboral,
        los datos sensibles más frecuentes son:
      </p>
      <ul>
        <li>Datos biométricos (huella, rostro, firma biométrica).</li>
        <li>Datos de salud ocupacional (exámenes médicos, aptitud, discapacidad).</li>
        <li>Origen racial, opiniones políticas, convicciones religiosas, afiliación sindical, orientación sexual.</li>
        <li>Datos genéticos.</li>
      </ul>
      <p>
        Tratarlos requiere <strong>consentimiento expreso, informado, previo y por
        escrito</strong> del titular (Art. 14).
      </p>

      <h2>2. Qué datos sensibles trata Comply360</h2>
      <p>Según el uso del portal del trabajador:</p>

      <h3>2.1. Datos biométricos (firma electrónica)</h3>
      <p>
        Cuando firmas boletas o contratos con tu huella, rostro o PIN desde tu
        dispositivo, <strong>Comply360 no recibe ni almacena la biometría</strong>. El
        sensor de tu dispositivo valida localmente y le envía a Comply360 solo una prueba
        criptográfica. Registramos el ID del credential + IP + userAgent + timestamp.
      </p>
      <p>Detalles técnicos en <a href="/legal/firma-electronica">/legal/firma-electronica</a>.</p>

      <h3>2.2. Datos de salud ocupacional (opcional)</h3>
      <p>
        Si la empresa empleadora registra exámenes médicos ocupacionales (EMO), esos
        documentos se almacenan en tu legajo digital. Solo tu empleador y los usuarios
        admin autorizados pueden verlos. No se comparten con terceros.
      </p>

      <h3>2.3. Datos de denuncias (canal Ley 27942)</h3>
      <p>
        Si usas el canal de denuncias anónimo o nominado por hostigamiento sexual o
        similares, esos datos reciben tratamiento especial reservado, visible solo al
        Comité de Intervención designado por la empresa.
      </p>

      <h2>3. Autorización que te pedimos</h2>
      <p>Al aceptar esta autorización, consientes:</p>
      <ul>
        <li>
          Que Comply360 trate tus datos personales (DNI, nombres, cargo, remuneración,
          etc.) para prestar el servicio contratado por tu empleador.
        </li>
        <li>
          Que tu firma biométrica (prueba criptográfica) se use como firma electrónica
          válida de documentos laborales firmados desde tu portal.
        </li>
        <li>
          Que tus datos de salud ocupacional y/o denuncias reciban tratamiento conforme
          a las políticas aplicables, con acceso restringido a personal autorizado.
        </li>
        <li>
          Que tus datos puedan ser procesados por encargados/sub-encargados listados en
          la <a href="/privacidad">Política de Privacidad</a> (Supabase, OpenAI, Clerk,
          Culqi, Resend).
        </li>
      </ul>

      <h2>4. Revocación de la autorización</h2>
      <p>
        Puedes revocar esta autorización en cualquier momento:
      </p>
      <ul>
        <li>
          Desde tu perfil en <code>/mi-portal/perfil</code> (sección &quot;Privacidad&quot;).
        </li>
        <li>
          Escríbenos a{' '}
          <a href="mailto:datos@comply360.pe">datos@comply360.pe</a> con el asunto
          &quot;Revocación de autorización&quot;.
        </li>
      </ul>
      <p>
        La revocación aplica para tratamientos futuros. Los documentos ya firmados
        mantienen su validez legal (no se pueden &quot;desfirmar&quot; retroactivamente),
        pero se anonimizarán los datos asociados cuando corresponda.
      </p>

      <h2>5. Consecuencias de no autorizar</h2>
      <p>
        Si no autorizas el tratamiento, no podrás usar las funcionalidades del portal
        del trabajador (firmar digitalmente, subir documentos, etc.). Tu empleador
        deberá gestionarte por canales tradicionales (papel, email), manteniéndose
        vigente tu relación laboral.
      </p>

      <h2>6. Tus derechos (Art. 22 Ley 29733)</h2>
      <p>
        Como titular de tus datos tienes derecho a acceso, rectificación, cancelación,
        oposición y portabilidad. Ver detalle en{' '}
        <a href="/privacidad">Política de Privacidad §6</a>. Usa{' '}
        <code>/api/user/export-my-data</code> para descargar tus datos o{' '}
        <code>/api/user/delete-me</code> para solicitar anonimización.
      </p>

      <h2>7. Contacto</h2>
      <p>
        Dudas o reclamos:{' '}
        <a href="mailto:datos@comply360.pe">datos@comply360.pe</a>. También puedes acudir
        directamente ante la Autoridad Nacional de Protección de Datos Personales (ANPD
        — MINJUS).
      </p>
    </LegalPage>
  )
}
