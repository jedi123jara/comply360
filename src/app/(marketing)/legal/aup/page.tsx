import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Política de Uso Aceptable · COMPLY360',
  description:
    'Reglas de uso aceptable de la plataforma COMPLY360. Usos prohibidos, mecanismos de enforcement y consecuencias del incumplimiento.',
}

export default function AupPage() {
  return (
    <LegalPage
      title="Política de Uso Aceptable (AUP)"
      subtitle="Las reglas de juego para usar Comply360 de forma que no dañe a otros usuarios ni rompa la plataforma."
      lastUpdated="20 de abril de 2026"
    >
      <h2>1. Alcance</h2>
      <p>
        Esta política aplica a todos los usuarios de Comply360 (administradores,
        trabajadores y terceros con acceso).
      </p>

      <h2>2. Usos prohibidos</h2>
      <p>Está prohibido usar Comply360 para:</p>
      <ul>
        <li>
          <strong>Actividades ilegales</strong> bajo la ley peruana, incluyendo lavado
          de activos, fraude, acoso, amenazas.
        </li>
        <li>
          <strong>Subir datos personales de terceros</strong> sin consentimiento válido
          o base legal adecuada.
        </li>
        <li>
          <strong>Enviar spam, phishing o contenido malicioso</strong> a través de
          notificaciones, emails o canal de denuncias.
        </li>
        <li>
          <strong>Intentar acceder</strong> a datos de otras organizaciones, hacer
          scraping masivo, o bypasear los controles de autenticación / autorización.
        </li>
        <li>
          <strong>Ingeniería inversa</strong> del código, desensamblado, o intento de
          extraer código fuente.
        </li>
        <li>
          <strong>Sobrecargar deliberadamente</strong> la infraestructura (DDoS, bots,
          uso fuera de los límites del plan).
        </li>
        <li>
          <strong>Suplantar identidad</strong> o crear cuentas falsas.
        </li>
        <li>
          <strong>Almacenar información no relacionada</strong> con el compliance laboral
          de tu empresa.
        </li>
        <li>
          <strong>Comercializar o sub-licenciar</strong> el acceso a Comply360 sin
          autorización expresa (white-label requiere contrato Enterprise).
        </li>
      </ul>

      <h2>3. Límites de uso por plan</h2>
      <p>
        Respetá los límites técnicos de tu plan: cantidad de trabajadores, usuarios admin,
        llamadas a IA. Los abusos pueden resultar en throttling automático o upgrade
        forzado.
      </p>

      <h2>4. Monitoreo</h2>
      <p>
        Monitoreamos automáticamente el tráfico para detectar abusos. Los datos personales
        no se revisan manualmente salvo:
      </p>
      <ul>
        <li>Orden judicial o requerimiento de autoridad competente.</li>
        <li>Investigación de incidentes de seguridad.</li>
        <li>Reporte de abuso verificable por otro usuario.</li>
      </ul>

      <h2>5. Enforcement</h2>
      <p>
        Las violaciones pueden resultar, a discreción de Comply360:
      </p>
      <ul>
        <li>Advertencia por email.</li>
        <li>Suspensión temporal de la cuenta.</li>
        <li>Terminación inmediata del servicio sin devolución.</li>
        <li>Denuncia a autoridades competentes si corresponde.</li>
      </ul>

      <h2>6. Reportar abusos</h2>
      <p>
        Si detectás uso indebido, reportanos a{' '}
        <a href="mailto:abuse@comply360.pe">abuse@comply360.pe</a> con evidencia
        razonable. Investigamos en 72 horas y respondemos en 5 días hábiles.
      </p>
    </LegalPage>
  )
}
