<!--
  PLANTILLA PARA IMPRIMIR EN PAPEL Y GUARDAR EN SOBRE SELLADO

  Cómo usar:
  1. Copia este contenido a un editor (Word, Pages, LibreOffice).
  2. Reemplaza [REEMPLAZAR_AQUI] con la clave real.
  3. Cambia [FECHA] y [TU_NOMBRE] por los valores reales.
  4. Imprime en hoja A4 con fuente monoespaciada (Courier 14pt).
  5. Borra el documento de tu computadora.
  6. Mete la hoja en sobre opaco, sella con cinta firmando arriba.
  7. Guarda en caja fuerte / banco / notario.

  NO commitees este archivo con la clave real al repo.
-->

═══════════════════════════════════════════════════════════════════════════
  COMPLY360 PERÚ — RESPALDO DE SECRETO CRÍTICO
═══════════════════════════════════════════════════════════════════════════

  TIPO DE SECRETO   :  MEDICAL_VAULT_KEY (Producción)

  USO               :  Cifrado AES-256 vía pgcrypto (pgp_sym_encrypt).
                       Protege columnas Bytes en las tablas:
                         - emo.restricciones_cifrado
                         - consentimientos_ley_29733.texto_cifrado
                         - consentimientos_ley_29733.firma_cifrada
                         - solicitudes_arco.detalle_cifrado

  NORMATIVA         :  Ley 29733 (Protección de Datos Personales) +
                       D.S. 016-2024-JUS

  GENERADA EL       :  [FECHA — formato YYYY-MM-DD]

  GENERADA POR      :  [TU_NOMBRE COMPLETO]

  ALGORITMO         :  crypto.randomBytes(32) → base64

═══════════════════════════════════════════════════════════════════════════

  CLAVE (32 bytes en base64, longitud 44 caracteres):

      [REEMPLAZAR_AQUI_CON_LA_CLAVE_REAL]

═══════════════════════════════════════════════════════════════════════════

  ⚠ ADVERTENCIAS

  1. Si pierdes esta clave, los datos cifrados son IRRECUPERABLES.
     No existe forma de descifrarlos sin esta cadena exacta.

  2. Si esta clave se filtra, hay obligación legal de notificar a la
     ANPDP (Autoridad Nacional de Protección de Datos Personales,
     MINJUS) en 72 horas. Multa potencial hasta 100 UIT (S/ 550,000).

  3. NO rotar esta clave sin antes re-cifrar todos los registros
     existentes con la nueva clave. Rotar sin migrar = perder datos.

  4. Esta clave debe existir en al menos 3 lugares físicamente
     distintos. Ver SECRETS_ACCESS_LOG.md.

═══════════════════════════════════════════════════════════════════════════

  CADENA DE CUSTODIA

  ┌──────────────┬──────────────────────────────┬──────────────────────┐
  │ FECHA        │ ACCIÓN                       │ RESPONSABLE          │
  ├──────────────┼──────────────────────────────┼──────────────────────┤
  │ [FECHA]      │ Generación + sellado         │ [NOMBRE]             │
  │              │                              │                      │
  │              │                              │                      │
  │              │                              │                      │
  └──────────────┴──────────────────────────────┴──────────────────────┘

  (Anota en este registro cada vez que el sobre se abre, la clave se
   rota, o se traslada el respaldo a otro lugar.)

═══════════════════════════════════════════════════════════════════════════

  Firma del responsable                  Fecha y hora del sellado



  _______________________________        _______________________________

  [TU_NOMBRE]                            [FECHA Y HORA]
  COMPLY360 PERÚ S.A.C.

═══════════════════════════════════════════════════════════════════════════
