import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Contrato de Tratamiento de Datos (DPA) · COMPLY360',
  description:
    'Contrato de encargado del tratamiento de datos personales entre Comply360 y la empresa cliente, conforme a la Ley N° 29733.',
}

export default function DpaPage() {
  return (
    <LegalPage
      title="Contrato de Tratamiento de Datos (DPA)"
      subtitle="Acuerdo entre Comply360 (encargado) y la empresa cliente (responsable) para el tratamiento de datos personales de trabajadores y terceros."
      lastUpdated="20 de abril de 2026"
      legalBasis={['Ley 29733 Art. 9', 'D.S. 003-2013-JUS Art. 29', 'Directiva 01-2020-JUS']}
    >
      <p>
        <strong>Versión descargable en PDF</strong>: disponible en{' '}
        <a href="/api/legal/dpa-pdf">/api/legal/dpa-pdf</a> (pendiente de generar).
        Para firmar una versión personalizada con tu empresa, escríbenos a{' '}
        <a href="mailto:legal@comply360.pe">legal@comply360.pe</a>.
      </p>

      <h2>1. Partes</h2>
      <ul>
        <li>
          <strong>Encargado</strong>: COMPLY360 S.A.C., con domicilio en Lima, Perú.
        </li>
        <li>
          <strong>Responsable</strong>: la empresa que contrata el servicio SaaS (en
          adelante, &quot;el Cliente&quot;), identificada por el RUC registrado en la
          cuenta.
        </li>
      </ul>

      <h2>2. Objeto</h2>
      <p>
        Este DPA regula el tratamiento de datos personales de trabajadores, terceros y
        usuarios administrativos que el Cliente encomienda a Comply360 a través del
        servicio SaaS, conforme al Art. 9 y concordantes de la Ley N° 29733.
      </p>

      <h2>3. Naturaleza y finalidad del tratamiento</h2>
      <p>Comply360 trata los datos exclusivamente para:</p>
      <ul>
        <li>Prestar las funcionalidades del servicio contratadas por el Cliente.</li>
        <li>Mantener la seguridad, integridad y disponibilidad del sistema.</li>
        <li>Cumplir obligaciones legales propias (facturación, auditoría, respuesta a autoridades).</li>
      </ul>
      <p>
        Comply360 <strong>NO</strong> usa los datos del Cliente para entrenar modelos
        de IA, ni los comercializa con terceros, ni los comparte fuera de los encargados
        listados en la <a href="/privacidad">Política de Privacidad §5</a>.
      </p>

      <h2>4. Categorías de datos e interesados</h2>
      <p>Ver <a href="/privacidad">Política de Privacidad §2</a> para el detalle completo.</p>

      <h2>5. Obligaciones del Cliente (responsable)</h2>
      <ul>
        <li>
          Obtener el consentimiento válido de sus trabajadores conforme al Art. 14 de la
          Ley 29733 para el tratamiento de datos sensibles (DNI, CUSPP, biometría).
        </li>
        <li>Informar a sus trabajadores sobre el uso de Comply360 como encargado.</li>
        <li>Mantener actualizados y veraces los datos ingresados.</li>
        <li>
          Inscribir su Banco de Datos Personales propio ante la ANPD cuando corresponda
          según el Art. 29.
        </li>
      </ul>

      <h2>6. Obligaciones del Encargado (Comply360)</h2>
      <ul>
        <li>Tratar los datos únicamente siguiendo instrucciones documentadas del Cliente.</li>
        <li>
          Aplicar las medidas técnicas y organizativas del{' '}
          <strong>Anexo I: Medidas de Seguridad</strong> de este DPA.
        </li>
        <li>
          Garantizar que el personal autorizado mantenga confidencialidad bajo deber
          legal o contractual equivalente.
        </li>
        <li>
          Asistir al Cliente en el cumplimiento de las solicitudes de derechos ARCO
          (acceso, rectificación, cancelación, oposición) que reciba directamente de los
          titulares.
        </li>
        <li>
          Notificar al Cliente cualquier brecha de seguridad en un plazo máximo de{' '}
          <strong>72 horas</strong> desde su conocimiento.
        </li>
      </ul>

      <h2>7. Sub-encargados</h2>
      <p>
        Comply360 emplea los siguientes sub-encargados para prestar el servicio:
      </p>
      <ul>
        <li>Supabase / AWS (infraestructura)</li>
        <li>OpenAI (IA — zero-retention API Enterprise)</li>
        <li>Clerk (autenticación)</li>
        <li>Culqi (pagos)</li>
        <li>Resend (email)</li>
      </ul>
      <p>
        La lista vigente se publica en{' '}
        <a href="/legal/sub-encargados">/legal/sub-encargados</a> y se notifica 30 días
        antes de cualquier alta. Si el Cliente no está de acuerdo, puede rescindir sin
        penalidad.
      </p>

      <h2>8. Transferencias internacionales</h2>
      <p>
        Los datos pueden transferirse a servidores en EE.UU. (sub-encargados listados).
        Las transferencias cumplen el Art. 15 Ley 29733 mediante cláusulas contractuales
        estándar, certificaciones de seguridad (SOC 2, ISO 27001 según corresponda) y
        zero-retention agreements.
      </p>

      <h2>9. Solicitudes de titulares</h2>
      <p>
        Comply360 implementa endpoints para derechos ARCO:
      </p>
      <ul>
        <li>
          <strong>Acceso/Portabilidad</strong>: <code>GET /api/user/export-my-data</code>
        </li>
        <li>
          <strong>Cancelación/Supresión</strong>: <code>POST /api/user/delete-me</code> (con anonimización)
        </li>
      </ul>
      <p>
        Si un titular escribe a <a href="mailto:datos@comply360.pe">datos@comply360.pe</a>,
        Comply360 redirige al Cliente responsable en un máximo de 72 horas.
      </p>

      <h2>10. Retención y devolución</h2>
      <p>
        Al finalizar la relación contractual:
      </p>
      <ul>
        <li>
          El Cliente puede descargar sus datos por 90 días a través de la plataforma.
        </li>
        <li>
          Transcurrido el plazo, Comply360 eliminará los datos salvo obligación legal de
          retención, en cuyo caso se mantendrán cifrados y segregados.
        </li>
      </ul>

      <h2>11. Auditoría</h2>
      <p>
        Planes Enterprise tienen derecho a una auditoría anual remota (cuestionario
        técnico + evidencia documental). Auditorías on-site requieren coordinación previa
        y corren por cuenta del Cliente.
      </p>

      <h2>12. Vigencia y terminación</h2>
      <p>
        Este DPA queda vigente mientras el Cliente mantenga suscripción activa. Se
        termina automáticamente con la cancelación del servicio o antes por decisión
        mutua de las partes.
      </p>

      <hr />

      <h2>Anexo I — Medidas de Seguridad</h2>
      <h3>Técnicas</h3>
      <ul>
        <li>Cifrado TLS 1.3 en tránsito.</li>
        <li>Cifrado at-rest en base de datos (AES-256).</li>
        <li>Row-Level Security en PostgreSQL para aislamiento multi-tenant.</li>
        <li>Auditoría inmutable de todas las operaciones de lectura/escritura sensibles.</li>
        <li>Autenticación multi-factor vía Clerk.</li>
        <li>Control de acceso por rol (OWNER, ADMIN, MEMBER, VIEWER, WORKER).</li>
        <li>Monitoreo 24/7 con Sentry + alertas de seguridad.</li>
        <li>Backups diarios geo-distribuidos con retención de 30 días.</li>
      </ul>
      <h3>Organizativas</h3>
      <ul>
        <li>Política de acceso mínimo necesario (least privilege).</li>
        <li>Capacitación anual del equipo en seguridad y Ley 29733.</li>
        <li>Pentesting anual por tercero independiente.</li>
        <li>Respuesta a incidentes con playbook documentado y tiempo de notificación ≤72h.</li>
      </ul>
    </LegalPage>
  )
}
