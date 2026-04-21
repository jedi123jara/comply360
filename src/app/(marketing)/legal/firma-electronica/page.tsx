import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Sobre la Firma Electrónica · COMPLY360',
  description:
    'Explicación del tipo de firma electrónica que usa Comply360 en el portal del trabajador, y su validez ante la Ley N° 27269 y la normativa laboral peruana.',
}

export default function FirmaElectronicaPage() {
  return (
    <LegalPage
      title="Sobre la firma electrónica en Comply360"
      subtitle="Qué tipo de firma usamos, qué validez tiene, y qué NO podemos garantizar."
      lastUpdated="20 de abril de 2026"
      legalBasis={['Ley 27269', 'D.S. 052-2008-PCM', 'R.M. 199-2016-TR']}
    >
      <h2>1. Qué es una &quot;firma electrónica&quot; en Comply360</h2>
      <p>
        Cuando firmás un contrato o boleta desde el portal del trabajador, usamos{' '}
        <strong>WebAuthn</strong> — el estándar abierto para autenticación biométrica
        del navegador. En la práctica, tu dispositivo (iPhone, Android, Windows, Mac)
        valida tu identidad localmente con:
      </p>
      <ul>
        <li>Touch ID o Face ID en iOS / macOS</li>
        <li>Huella dactilar o desbloqueo facial en Android</li>
        <li>Windows Hello (huella, cara o PIN)</li>
      </ul>
      <p>
        <strong>Tus datos biométricos NO salen de tu dispositivo.</strong> El sensor
        valida localmente y le devuelve a Comply360 solo una prueba criptográfica firmada
        — zero-knowledge desde el servidor.
      </p>

      <h2>2. Qué registramos como evidencia</h2>
      <p>Por cada firma biométrica guardamos en nuestro audit log:</p>
      <ul>
        <li>Identificador único del &quot;credential&quot; WebAuthn usado.</li>
        <li>Timestamp del servidor (fecha y hora UTC).</li>
        <li>Dirección IP desde la que se firmó.</li>
        <li>User-agent (tipo de dispositivo + navegador).</li>
        <li>ID del trabajador firmante y del documento firmado.</li>
        <li>Nivel de firma declarado: <code>BIOMETRIC</code>, <code>SIMPLE</code> (checkbox) o <code>CERTIFIED</code> (RENIEC — futuro).</li>
      </ul>

      <h2>3. Validez legal ante la Ley 27269</h2>
      <p>
        La Ley N° 27269 (Ley de Firmas y Certificados Digitales) y su reglamento reconocen
        <strong> dos tipos principales</strong>:
      </p>

      <h3>3.1. Firma digital con certificado (RENIEC / ECA acreditada)</h3>
      <p>
        Es la firma con certificado digital emitido por una Entidad de Certificación
        Acreditada (ECA). Requiere Time Stamping Autorizado (TSA). Tiene{' '}
        <strong>valor probatorio pleno</strong> equivalente a la firma manuscrita. Es
        exigida para algunos trámites ante entidades públicas.
      </p>
      <p>
        <strong>Comply360 NO implementa esto todavía.</strong> Está en el roadmap de
        Fase 3 con ECA peruana por confirmar.
      </p>

      <h3>3.2. Firma electrónica (no certificada)</h3>
      <p>
        Es cualquier mecanismo que permita identificar al firmante + verificar la
        integridad del documento, con consentimiento documentado del firmante.
      </p>
      <p>
        Nuestra firma biométrica WebAuthn califica como{' '}
        <strong>firma electrónica fuerte</strong>: requiere validación biométrica del
        firmante, genera prueba criptográfica verificable, y registra contexto (IP,
        dispositivo, timestamp).
      </p>

      <h2>4. ¿Qué validez tiene en la práctica?</h2>
      <ul>
        <li>
          <strong>Entre las partes</strong> (trabajador ↔ empresa): válida y vinculante,
          asumiendo buena fe y acuerdo. Es equivalente a un acuerdo firmado en papel con
          testigo digital.
        </li>
        <li>
          <strong>Conciliación ante el MTPE / TFL de SUNAFIL</strong>: aceptada como
          evidencia razonable, sobre todo si hay audit trail con IP + userAgent + timestamp.
        </li>
        <li>
          <strong>Juicio laboral hostil</strong>: el trabajador podría impugnar alegando
          que no firmó él. En ese escenario, la empresa tendría que reforzar la prueba
          (declaración jurada, videos, testigos). Es una firma{' '}
          <strong>menos blindada</strong> que la certificada RENIEC ante litigio.
        </li>
        <li>
          <strong>Trámites ante entidades públicas</strong>: algunos requieren firma
          digital certificada (RENIEC). Para esos casos, tenés que imprimir + firmar en
          papel, o esperar la integración RENIEC en Comply360.
        </li>
      </ul>

      <h2>5. Liberación de responsabilidad</h2>
      <p>
        Al activar el portal del trabajador en tu empresa, asumís que:
      </p>
      <ul>
        <li>
          Tus trabajadores entienden el nivel de firma que están usando (se les muestra
          disclaimer explícito al firmar).
        </li>
        <li>
          Asumís la <strong>presunción de portabilidad del dispositivo</strong>: si un
          trabajador firma con su celular, se asume que el celular es suyo o fue usado
          por él con autorización.
        </li>
        <li>
          Para contratos de alto valor o alto riesgo de litigio, considerá complementar
          con firma manuscrita o firma digital RENIEC.
        </li>
      </ul>

      <h2>6. Roadmap</h2>
      <ul>
        <li>
          <strong>2026 Q2-Q3</strong>: integración con ECA acreditada peruana para firma
          digital certificada + Time Stamping Autorizado. Disponibilidad en plan PRO como
          add-on opcional.
        </li>
        <li>
          <strong>2026 Q4</strong>: integración con RENIEC para firma digital con
          certificado biométrico del DNI electrónico.
        </li>
      </ul>

      <h2>7. Preguntas frecuentes</h2>
      <details>
        <summary>¿La huella del trabajador queda guardada en Comply360?</summary>
        <p>
          <strong>NO.</strong> La biometría (huella, rostro, iris) es procesada localmente
          por el sensor de su dispositivo. Comply360 solo recibe la prueba criptográfica
          firmada (un hash) + el credential ID. No podemos recuperar ni replicar la huella.
        </p>
      </details>
      <details>
        <summary>¿Qué pasa si el trabajador pierde el celular?</summary>
        <p>
          El credential WebAuthn queda atado al dispositivo perdido. Para firmar nuevos
          documentos con biometría, el trabajador debe registrar el nuevo dispositivo
          al primer login. Los documentos ya firmados mantienen su validez.
        </p>
      </details>
      <details>
        <summary>¿Puede un trabajador impugnar su firma?</summary>
        <p>
          Sí, como con cualquier tipo de firma. La defensa de la empresa descansa en el
          audit trail (IP, dispositivo, timestamp) + la presunción de que el titular del
          dispositivo es quien firmó. La fuerza probatoria de esta firma es menor que la
          de RENIEC certificada.
        </p>
      </details>
    </LegalPage>
  )
}
