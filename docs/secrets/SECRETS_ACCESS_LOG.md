<!--
  REGISTRO DE ACCESO A SECRETOS CRÍTICOS — COMPLY360

  Mantén este documento actualizado cada vez que:
  - Se rota una clave
  - Alguien gana o pierde acceso a un lugar de custodia
  - Se traslada un respaldo físico a otra ubicación
  - Se sospecha o confirma una brecha

  Este archivo SÍ puede ir al repo (no contiene secretos, solo metadatos).
-->

# Registro de acceso a secretos críticos — COMPLY360

**Última actualización**: [FECHA YYYY-MM-DD]
**Mantenido por**: [TU_NOMBRE COMPLETO] (CEO/CTO)

---

## 1. MEDICAL_VAULT_KEY (Producción)

**Propósito**: Cifra datos médicos sensibles (Ley 29733).
**Generada**: [FECHA]
**Última rotación**: [FECHA o "—"]

### Lugares de custodia

| # | Lugar | Tipo | Ubicación física | Cuenta / Ruta |
|---|---|---|---|---|
| 1 | Vercel | Variable de entorno | N/A | Vercel Project: `legaliapro-platform` → Settings → Env Vars → Production |
| 2 | Bitwarden | Secure Note | N/A | Vault de [TU_NOMBRE] · 2FA activo |
| 3 | Sobre sellado | Papel impreso | [BANCO/SUCURSAL/CAJA] | Caja de seguridad N° [XXXX] |

### Personas con acceso

| Nombre | Rol | Lugar 1 (Vercel) | Lugar 2 (Bitwarden) | Lugar 3 (Sobre) | Desde |
|---|---|---|---|---|---|
| [TU_NOMBRE] | CEO / Founder | ✅ | ✅ | ✅ | [FECHA] |
|  |  |  |  |  |  |

> **Regla**: máximo 2 personas con acceso a los 3 lugares simultáneamente.
> Empleados nuevos solo reciben acceso al gestor de contraseñas (Lugar 2)
> hasta que pase su período de prueba.

---

## 2. CRON_SECRET (Producción)

**Propósito**: Autoriza disparar manualmente los crons de Vercel.
**Generada**: [FECHA]
**Última rotación**: [FECHA o "—"]

### Lugares de custodia

| # | Lugar | Tipo | Ubicación |
|---|---|---|---|
| 1 | Vercel | Variable de entorno | Vercel Project → Env Vars → Production |
| 2 | Bitwarden | Secure Note | Vault de [TU_NOMBRE] |

(No requiere respaldo físico — si se pierde, se regenera y los crons se vuelven a configurar.)

### Personas con acceso

| Nombre | Rol | Lugar 1 (Vercel) | Lugar 2 (Bitwarden) | Desde |
|---|---|---|---|---|
| [TU_NOMBRE] | CEO / Founder | ✅ | ✅ | [FECHA] |
|  |  |  |  |  |

---

## 3. DATABASE_URL / DIRECT_URL (Supabase)

**Propósito**: Conexión a la base de datos de producción.

| Lugar | Ubicación |
|---|---|
| Vercel | Env Vars → Production |
| Bitwarden | Secure Note "Supabase Connection Strings" |

| Persona | Acceso |
|---|---|
| [TU_NOMBRE] | ✅ |

---

## 4. DEEPSEEK_API_KEY / OPENAI_API_KEY

**Propósito**: LLM para sugerencia IPERC y otras features.

| Lugar | Ubicación |
|---|---|
| Vercel | Env Vars → Production |
| Bitwarden | Secure Note "API Keys LLM" |

---

## 5. CLERK_SECRET_KEY

**Propósito**: Autenticación de usuarios.

| Lugar | Ubicación |
|---|---|
| Vercel | Env Vars → Production |
| Clerk Dashboard | console.clerk.com (cuenta de [TU_NOMBRE]) |

---

## Eventos / auditoría

| Fecha | Evento | Detalle | Acción tomada |
|---|---|---|---|
| 2026-05-04 | Generación inicial | MEDICAL_VAULT_KEY + CRON_SECRET expuestas en chat de Claude | Rotación inmediata · claves nuevas con `crypto.randomBytes` |
|  |  |  |  |

---

## Procedimiento si un miembro del equipo deja la empresa

1. Revocar acceso a Vercel (eliminar usuario del proyecto).
2. Revocar acceso a Bitwarden (eliminar usuario del vault).
3. Revisar `SECRETS_ACCESS_LOG.md` y actualizar: marcar fecha de baja.
4. **Si tenía acceso al sobre físico**: rotar TODAS las claves a las que tuvo acceso (no se sabe si copió). Re-cifrar registros con `MEDICAL_VAULT_KEY`.
5. Si tenía acceso a Clerk Dashboard: invalidar sus sesiones admin.
6. Anotar en sección "Eventos / auditoría" arriba.

## Procedimiento si se sospecha brecha

1. **Mantener la clave vieja activa** mientras se investiga (no rotes en pánico).
2. Revisar audit_logs de los últimos 90 días: queries con `action LIKE 'sst.%.read'` con spike inusual = posible exfiltración.
3. Si se confirma brecha:
   - Notificar a ANPDP en 72h (D.S. 016-2024-JUS Art. 75).
   - Notificar a titulares afectados.
   - Rotar claves siguiendo procedimiento (re-cifrar antes de reemplazar).
   - Documentar evento aquí.
4. Considerar invitar a auditor externo a investigar.
