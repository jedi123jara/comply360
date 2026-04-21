import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Términos y Condiciones · COMPLY360',
  description:
    'Términos y condiciones de uso de la plataforma COMPLY360 para compliance laboral en Perú.',
}

export default function TerminosPage() {
  return (
    <LegalPage
      title="Términos y Condiciones de Servicio"
      subtitle="El acuerdo legal entre vos, tu empresa y Comply360."
      lastUpdated="20 de abril de 2026"
      legalBasis={['Código Civil Perú', 'Ley 28493', 'Ley 29733', 'Ley 27269']}
    >
      <h2>1. Aceptación del servicio</h2>
      <p>
        Al registrar una cuenta en COMPLY360, aceptás estos Términos y Condiciones y
        nuestra <a href="/privacidad">Política de Privacidad</a>, y confirmás tener
        autoridad suficiente para firmar en representación de tu empresa.
      </p>

      <h2>2. Descripción del servicio</h2>
      <p>
        COMPLY360 es una plataforma SaaS (Software as a Service) que provee herramientas
        para la gestión del compliance laboral peruano, incluyendo (entre otros):
        calculadoras de beneficios sociales, diagnóstico de cumplimiento, simulacro de
        inspecciones SUNAFIL, biblioteca de plantillas de documentos, portal del
        trabajador con firma biométrica, canal de denuncias y módulos de SST.
      </p>

      <h2>3. Licencia de uso</h2>
      <p>
        Te otorgamos una licencia limitada, no exclusiva, no transferible y revocable
        para usar el servicio durante la vigencia de tu suscripción activa. La licencia
        aplica exclusivamente al uso interno de tu empresa para gestionar el compliance
        laboral de sus trabajadores.
      </p>

      <h2>4. Responsabilidad sobre el contenido generado</h2>
      <p>
        <strong>Comply360 es un motor técnico, no un estudio jurídico.</strong> En
        particular:
      </p>
      <ul>
        <li>
          Las <strong>plantillas de contratos</strong> que vos subís a la plataforma con
          placeholders son responsabilidad exclusiva de tu empresa y tu asesor legal.
          Comply360 actúa como motor de sustitución determinística, sin auditar ni
          certificar el contenido jurídico.
        </li>
        <li>
          Las <strong>calculadoras</strong> entregan estimaciones basadas en la normativa
          vigente. La decisión final de liquidación corresponde a tu contador o asesor legal.
        </li>
        <li>
          El <strong>diagnóstico SUNAFIL</strong> refleja riesgos estimados basados en
          información que vos proveés. No sustituye el criterio profesional de un abogado
          laboralista.
        </li>
        <li>
          Las <strong>respuestas del Asistente IA</strong> son orientativas, NO son
          consultoría legal certificada.
        </li>
      </ul>

      <h2>5. Planes y precios</h2>
      <p>
        Los planes vigentes, sus funcionalidades y precios se publican en{' '}
        <a href="https://app.comply360.pe/dashboard/planes">/dashboard/planes</a>. Los
        precios se expresan en Soles peruanos (PEN) e incluyen IGV cuando corresponda.
      </p>

      <h3>Facturación y renovación automática</h3>
      <ul>
        <li>
          Las suscripciones son mensuales con renovación automática, salvo cancelación
          con al menos 24 horas de anticipación.
        </li>
        <li>
          Los cobros son procesados por <strong>Culqi</strong> (procesador autorizado
          por la SBS). No almacenamos información de tarjetas de crédito.
        </li>
        <li>
          Si el cobro falla, suspenderemos el servicio luego de 3 intentos fallidos en
          7 días.
        </li>
      </ul>

      <h2>6. Uso aceptable</h2>
      <p>
        Al usar Comply360 te comprometés a NO:
      </p>
      <ul>
        <li>Usar la plataforma para fines ilegales o violatorios de la normativa peruana.</li>
        <li>Subir contenido con datos personales de terceros sin consentimiento.</li>
        <li>Realizar ingeniería inversa, scraping masivo, o intentar acceder a datos de otras organizaciones.</li>
        <li>Suplantar identidad o crear cuentas falsas.</li>
        <li>Usar la plataforma para almacenar información no relacionada con el compliance laboral de tu empresa.</li>
      </ul>
      <p>
        El incumplimiento puede resultar en la suspensión inmediata del servicio sin
        devolución. Ver detalles en la <a href="/legal/aup">Política de Uso Aceptable</a>.
      </p>

      <h2>7. Disponibilidad del servicio</h2>
      <p>
        Prestamos el servicio con disponibilidad objetivo del <strong>99.0%</strong> para
        planes Starter/Empresa y <strong>99.5%</strong> para Pro/Enterprise (con SLA
        contractual para Enterprise). Las ventanas de mantenimiento se anuncian con al
        menos 48 horas de anticipación.
      </p>

      <h2>8. Limitación de responsabilidad</h2>
      <p>
        En la máxima extensión permitida por la ley peruana, Comply360 no será responsable
        por daños indirectos, lucro cesante, pérdida de oportunidad comercial, o multas
        derivadas del uso o mal uso del servicio. La responsabilidad total acumulada de
        Comply360 se limita al monto total efectivamente pagado en los 12 meses anteriores
        al evento que origina el reclamo.
      </p>

      <h2>9. Firma electrónica (Ley 27269)</h2>
      <p>
        La funcionalidad de firma biométrica del portal del trabajador califica como{' '}
        <strong>firma electrónica</strong> bajo la Ley N° 27269. Ver detalles en el
        documento <a href="/legal/firma-electronica">Sobre la firma electrónica</a>.
        No equivale a la firma digital con certificado RENIEC.
      </p>

      <h2>10. Tratamiento de datos</h2>
      <p>
        Nuestro tratamiento de datos está regulado por nuestra{' '}
        <a href="/privacidad">Política de Privacidad</a> y nuestro{' '}
        <a href="/legal/dpa">Contrato de Tratamiento de Datos (DPA)</a>.
      </p>

      <h2>11. Cancelación y devolución</h2>
      <ul>
        <li>
          Podés cancelar tu suscripción en cualquier momento desde{' '}
          <code>/dashboard/planes</code> o escribiendo a{' '}
          <a href="mailto:soporte@comply360.pe">soporte@comply360.pe</a>.
        </li>
        <li>
          El acceso continúa hasta el final del período facturado. No hay devolución
          prorrateada por cancelaciones a mitad del ciclo mensual.
        </li>
        <li>
          Tras cancelación, tus datos quedan disponibles para descarga (via{' '}
          <code>/api/user/export-my-data</code>) por 90 días. Luego se eliminan salvo
          obligación legal de retención.
        </li>
      </ul>

      <h2>12. Modificaciones de estos términos</h2>
      <p>
        Podemos actualizar estos términos. Los cambios sustanciales se notifican con al
        menos 30 días de anticipación por email, y requieren reaceptación en tu próximo
        acceso.
      </p>

      <h2>13. Ley aplicable y jurisdicción</h2>
      <p>
        Estos términos se rigen por la ley peruana. Cualquier controversia se somete a
        los tribunales del Cercado de Lima, salvo arbitraje elegido de común acuerdo.
      </p>

      <h2>14. Contacto</h2>
      <p>
        COMPLY360 S.A.C. · Lima, Perú ·{' '}
        <a href="mailto:soporte@comply360.pe">soporte@comply360.pe</a>
      </p>
    </LegalPage>
  )
}
