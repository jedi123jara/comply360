import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Política de Privacidad · COMPLY360',
  description:
    'Política de privacidad y tratamiento de datos personales de COMPLY360, conforme a la Ley N° 29733 y su reglamento.',
}

export default function PrivacidadPage() {
  return (
    <LegalPage
      title="Política de Privacidad"
      subtitle="Cómo tratamos tus datos personales conforme a la Ley N° 29733 del Perú."
      lastUpdated="20 de abril de 2026"
      legalBasis={['Ley 29733', 'D.S. 003-2013-JUS', 'Directiva 01-2020-JUS/DGTAIPD']}
    >
      <h2>1. Identidad del responsable</h2>
      <p>
        <strong>COMPLY360 S.A.C.</strong> (en adelante, &quot;Comply360&quot;), con domicilio
        fiscal en Lima, Perú, es el responsable del tratamiento de los datos personales
        recolectados a través de la plataforma <a href="https://app.comply360.pe">app.comply360.pe</a>.
      </p>
      <p>
        Contacto del Encargado de Protección de Datos:{' '}
        <a href="mailto:datos@comply360.pe">datos@comply360.pe</a>.
      </p>

      <h2>2. Datos que recolectamos</h2>
      <p>Según el rol del usuario, tratamos las siguientes categorías de datos:</p>

      <h3>2.1. Administradores de empresa (clientes)</h3>
      <ul>
        <li>Datos de identificación: nombre, apellidos, email corporativo, teléfono.</li>
        <li>Datos laborales: cargo, empresa a la que representa, RUC de la empresa.</li>
        <li>Datos técnicos: dirección IP, user-agent, historial de navegación dentro de la plataforma.</li>
        <li>Datos de pago: procesados exclusivamente por Culqi (no almacenamos números de tarjeta).</li>
      </ul>

      <h3>2.2. Trabajadores (datos provistos por empleadores)</h3>
      <ul>
        <li>Datos personales básicos: DNI, nombres, apellidos, fecha de nacimiento, dirección, teléfono, email.</li>
        <li>Datos laborales: cargo, régimen laboral, fecha de ingreso, remuneración, tipo de contrato.</li>
        <li>Datos previsionales: AFP/ONP, CUSPP.</li>
        <li>
          <strong>Datos sensibles</strong> (solo con consentimiento expreso conforme Art. 14):
          firma biométrica (prueba criptográfica, NO imagen de la huella), datos de salud
          ocupacional si se registran, datos de denuncias de hostigamiento sexual.
        </li>
      </ul>

      <h2>3. Finalidades del tratamiento</h2>
      <ol>
        <li>Prestar el servicio SaaS de compliance laboral contratado por la empresa empleadora.</li>
        <li>Generar, gestionar y firmar contratos laborales y documentos del legajo.</li>
        <li>Calcular beneficios sociales y emitir alertas de vencimientos normativos.</li>
        <li>Cumplir obligaciones legales de la empresa empleadora ante SUNAFIL, SUNAT y MTPE.</li>
        <li>Enviar notificaciones operativas y comunicaciones del servicio.</li>
      </ol>

      <h2>4. Base legal del tratamiento</h2>
      <ul>
        <li>
          <strong>Consentimiento expreso</strong> del titular (Art. 5 y 14 Ley 29733) para
          datos sensibles.
        </li>
        <li>
          <strong>Ejecución contractual</strong> entre el titular del dato (trabajador) y la
          empresa empleadora, donde Comply360 actúa como encargado del tratamiento.
        </li>
        <li>
          <strong>Obligación legal</strong> del empleador conforme a la legislación laboral
          peruana.
        </li>
      </ul>

      <h2>5. Transferencia a terceros</h2>
      <p>
        Para prestar el servicio, podemos transferir datos a los siguientes encargados:
      </p>
      <ul>
        <li>
          <strong>Supabase / AWS</strong> (infraestructura, hospedaje en EE.UU.): bajo
          cláusulas contractuales estándar y medidas de seguridad verificadas.
        </li>
        <li>
          <strong>OpenAI</strong> (procesamiento de IA para verificación de documentos y
          asistente legal): no se usan datos para entrenamiento (API Enterprise, zero-retention).
        </li>
        <li>
          <strong>Clerk</strong> (autenticación): datos de sesión y credenciales.
        </li>
        <li>
          <strong>Culqi</strong> (pagos): datos transaccionales para cobro de suscripción.
        </li>
        <li>
          <strong>Resend</strong> (email): envío de notificaciones operativas.
        </li>
      </ul>
      <p>
        Las transferencias internacionales cumplen lo dispuesto en el Art. 15 de la Ley 29733.
      </p>

      <h2>6. Derechos del titular (Ley 29733 Art. 22)</h2>
      <p>Tienes derecho a:</p>
      <ul>
        <li>
          <strong>Acceder</strong> a tus datos personales. Usa el endpoint{' '}
          <code>/api/user/export-my-data</code> desde tu perfil o escríbenos.
        </li>
        <li>
          <strong>Rectificar</strong> datos inexactos o incompletos.
        </li>
        <li>
          <strong>Cancelar / suprimir</strong> tus datos cuando no sean necesarios o hayas
          revocado el consentimiento. Nota: los contratos y boletas firmados se conservan
          en forma anonimizada por obligación legal del empleador.
        </li>
        <li>
          <strong>Oponerte</strong> al tratamiento en casos específicos.
        </li>
        <li>
          <strong>Portabilidad</strong>: recibir tus datos en formato JSON estructurado.
        </li>
      </ul>
      <p>
        Para ejercer estos derechos, escríbenos a{' '}
        <a href="mailto:datos@comply360.pe">datos@comply360.pe</a>. Responderemos en un
        plazo máximo de 20 días hábiles.
      </p>

      <h2>7. Retención de datos</h2>
      <ul>
        <li><strong>Datos de cuenta activa</strong>: durante la vigencia del servicio.</li>
        <li>
          <strong>Documentos del legajo laboral</strong>: mientras dure la relación laboral
          del trabajador y durante el plazo legal de conservación de documentos (5 años post-cese
          para la mayoría de documentos, conforme D.S. 001-98-TR).
        </li>
        <li>
          <strong>Datos de auditoría (AuditLog)</strong>: 5 años post-creación para cumplimiento
          regulatorio.
        </li>
      </ul>

      <h2>8. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas: cifrado TLS 1.3 en tránsito, cifrado
        at-rest en base de datos, Row-Level Security en PostgreSQL, auditoría inmutable,
        control de acceso por rol, monitoreo de seguridad 24/7, y pentesting anual.
      </p>

      <h2>9. Inscripción ante la ANPD</h2>
      <p>
        Nuestros Bancos de Datos Personales están inscritos en el Registro Nacional de
        Protección de Datos Personales del MINJUS, conforme al Art. 29 de la Ley 29733.
        Código de inscripción: [pendiente de asignación].
      </p>

      <h2>10. Modificaciones</h2>
      <p>
        Podemos modificar esta política. Los cambios sustanciales se comunicarán con al
        menos 30 días de anticipación por email y requerirán reaceptación del consent
        management.
      </p>
    </LegalPage>
  )
}
