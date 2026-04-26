import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Privacidad del Trabajador · COMPLY360',
  description:
    'Cómo Comply360 protege los datos personales del trabajador en el portal del empleado. Qué ve el empleador, qué no, y cómo ejercer tus derechos.',
  robots: { index: false, follow: false },
}

export default function PrivacidadTrabajadorPage() {
  return (
    <LegalPage
      title="Privacidad del Trabajador"
      subtitle="Qué datos tuyos están en Comply360, quién los puede ver, y cómo ejercer tus derechos."
      lastUpdated="20 de abril de 2026"
      legalBasis={['Ley 29733', 'D.S. 003-2013-JUS', 'Ley 27269']}
    >
      <h2>1. Tu empleador te contrata, Comply360 le provee herramientas</h2>
      <p>
        Comply360 es una plataforma SaaS que tu empleador contrata para gestionar el
        compliance laboral. En términos de la Ley 29733, <strong>tu empleador es el
        responsable</strong> del tratamiento de tus datos personales, y{' '}
        <strong>Comply360 es el encargado técnico</strong>.
      </p>

      <h2>2. Qué datos tuyos procesamos</h2>
      <ul>
        <li>Datos identificatorios: DNI, nombres, apellidos, fecha nacimiento, dirección, email, teléfono.</li>
        <li>Datos laborales: cargo, fecha de ingreso, régimen, tipo contrato, remuneración.</li>
        <li>Datos previsionales: AFP/ONP, CUSPP.</li>
        <li>Documentos del legajo: contratos, boletas, certificados médicos, capacitaciones, etc.</li>
        <li>Registro de asistencia (si aplica).</li>
        <li>Vacaciones, permisos, solicitudes que hagas.</li>
        <li>Comunicaciones internas contigo sobre temas laborales.</li>
      </ul>

      <h2>3. Datos que Comply360 NO guarda de ti</h2>
      <ul>
        <li>
          <strong>Tu huella dactilar, rostro, iris</strong>. Cuando firmas con biometría,
          el procesamiento es 100% local en tu dispositivo. Ver{' '}
          <a href="/legal/firma-electronica">/legal/firma-electronica</a>.
        </li>
        <li>
          <strong>Tu contraseña personal</strong>. Se gestiona via Clerk con hashing
          estándar.
        </li>
        <li>
          <strong>Historial fuera del portal</strong>. No monitoreamos tu actividad en
          otras apps ni navegación web.
        </li>
      </ul>

      <h2>4. Quién puede ver tus datos</h2>
      <ul>
        <li>
          <strong>Tu empleador (usuarios admin)</strong>: ve todo tu legajo, boletas,
          documentos, solicitudes. Es quien te contrata y tiene derecho por ley laboral.
        </li>
        <li>
          <strong>Tú mismo</strong>: desde <code>/mi-portal/perfil</code> y usando{' '}
          <code>/api/user/export-my-data</code>.
        </li>
        <li>
          <strong>Nadie más</strong>, salvo: autoridades competentes bajo orden judicial,
          o proveedores de infraestructura listados en{' '}
          <a href="/privacidad">Política de Privacidad §5</a> bajo contratos de confidencialidad.
        </li>
      </ul>

      <h2>5. Denuncias anónimas</h2>
      <p>
        El canal de denuncias (Ley 27942) permite modo anónimo. Si eliges anonimato, tu
        identidad no se revela al empleador — solo al Comité de Intervención cuando es
        legalmente obligatorio para procesar la denuncia.
      </p>

      <h2>6. Tus derechos</h2>
      <p>Conforme a la Ley 29733 Art. 22, tienes derecho a:</p>
      <ul>
        <li>
          <strong>Acceder</strong>: ver qué datos tiene tu empleador sobre ti.
        </li>
        <li>
          <strong>Rectificar</strong>: corregir datos inexactos (pídeselo a RRHH o escríbenos).
        </li>
        <li>
          <strong>Portabilidad</strong>: descargar un archivo JSON con todo desde{' '}
          <code>GET /api/user/export-my-data</code>.
        </li>
        <li>
          <strong>Anonimización</strong>: al cesar la relación laboral, puedes pedir
          anonimización vía <code>POST /api/user/delete-me</code>. Los documentos
          firmados se mantienen en forma anonimizada (obligación legal del empleador).
        </li>
      </ul>

      <h2>7. Tu contacto directo con nosotros</h2>
      <p>
        Si tienes dudas o inquietudes sobre el tratamiento de tus datos:
      </p>
      <ul>
        <li>
          Primero habla con tu empleador (responsable directo).
        </li>
        <li>
          Si no responde o no estás conforme, escríbenos a{' '}
          <a href="mailto:datos@comply360.pe">datos@comply360.pe</a>.
        </li>
        <li>
          Como último recurso, puedes denunciar ante la Autoridad Nacional de Protección
          de Datos Personales (ANPD — MINJUS).
        </li>
      </ul>
    </LegalPage>
  )
}
