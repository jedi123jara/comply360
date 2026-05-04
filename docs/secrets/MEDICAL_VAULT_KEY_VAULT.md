<!--
  PLANTILLA PARA SECURE NOTE EN GESTOR DE CONTRASEÑAS
  (Bitwarden / 1Password / equivalente)

  Cómo usar:
  1. Crea un nuevo Secure Note en tu gestor.
  2. Título: "COMPLY360 — MEDICAL_VAULT_KEY (Producción)"
  3. Copia este contenido al campo de notas.
  4. Reemplaza [REEMPLAZAR_AQUI] y demás placeholders.
  5. Activa 2FA en tu cuenta del gestor antes de guardar nada.
  6. NO subas este archivo lleno al repo.
-->

# COMPLY360 — MEDICAL_VAULT_KEY (Producción)

**Generada**: [FECHA YYYY-MM-DD]
**Por**: [TU_NOMBRE]
**Algoritmo**: crypto.randomBytes(32) → base64
**Longitud**: 32 bytes (44 chars en base64)

---

## CLAVE

```
[REEMPLAZAR_AQUI_CON_LA_CLAVE_REAL]
```

---

## USO

Variable de entorno `MEDICAL_VAULT_KEY` en Vercel Production.

Cifra columnas Bytes en:
- `emo.restricciones_cifrado`
- `consentimientos_ley_29733.texto_cifrado`
- `consentimientos_ley_29733.firma_cifrada`
- `solicitudes_arco.detalle_cifrado`

Helper que la consume: `src/lib/sst/medical-vault.ts`

---

## NORMATIVA APLICABLE

- Ley 29733 — Protección de Datos Personales
- D.S. 016-2024-JUS — Reglamento Ley 29733 (notificación de brechas en 72h)

---

## RESPALDOS DE ESTA CLAVE

1. **Vercel Production** — variable de entorno `MEDICAL_VAULT_KEY`
2. **Este Secure Note** — Bitwarden/1Password con 2FA
3. **Sobre sellado físico** — ubicado en [BANCO/OFICINA/NOTARIO]

Ver `SECRETS_ACCESS_LOG.md` para detalle de quién tiene acceso a cada lugar.

---

## ⚠ ADVERTENCIAS

1. **NUNCA copiar esta clave a correo, WhatsApp, Slack, Drive personal o cualquier servicio sin cifrado E2E**.
2. **Pérdida = datos cifrados irrecuperables**. EMO, consentimientos, ARCO quedan inservibles.
3. **Filtración = obligación de notificar a ANPDP en 72h**. Multa hasta 100 UIT (S/ 550,000).
4. **Rotación**: requiere script de migración que re-cifra todos los registros existentes con la nueva clave ANTES de reemplazar. Sin migración = pérdida de datos.

---

## HISTORIAL DE ROTACIÓN

| Fecha | Acción | Razón | Por |
|---|---|---|---|
| [FECHA] | Generación inicial | Setup producción | [NOMBRE] |
|  |  |  |  |
|  |  |  |  |

(Agrega una fila cada vez que se rote la clave.)
