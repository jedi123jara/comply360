# Plantillas de custodia de secretos críticos — COMPLY360

> **IMPORTANTE**: Esta carpeta contiene **PLANTILLAS** con placeholders.
> **NUNCA** commitees claves reales aquí. Las plantillas se llenan en local
> (fuera del repo o con valores ficticios) y se imprimen / pegan en gestor.
>
> Las claves reales van únicamente a:
> 1. Vercel Environment Variables (producción)
> 2. Gestor de contraseñas profesional (Bitwarden / 1Password)
> 3. Papel sellado en caja física (banco / oficina segura)

## Plantillas disponibles

| Archivo | Para qué sirve |
|---|---|
| `MEDICAL_VAULT_KEY_PAPER.md` | Hoja para imprimir y guardar en sobre sellado |
| `MEDICAL_VAULT_KEY_VAULT.md` | Texto para pegar en Bitwarden / 1Password como Secure Note |
| `SECRETS_ACCESS_LOG.md` | Registro de quién tiene acceso a cada secreto |

## Procedimiento de custodia

1. **Genera la clave** una sola vez:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
2. **Copia el output** (no lo guardes en archivo del repo).
3. **Llena las 3 plantillas** con la clave real (en tu computadora local, NO en este repo):
   - Llena `MEDICAL_VAULT_KEY_PAPER.md` → imprime → sobre sellado
   - Llena `MEDICAL_VAULT_KEY_VAULT.md` → pega en Bitwarden Secure Note
   - Sube la clave a Vercel Environment Variables
4. **Actualiza** `SECRETS_ACCESS_LOG.md` con quién tiene acceso a cada lugar.
5. **Borra de tu computadora** los archivos llenados con la clave real (después de imprimir y pegar en Bitwarden).
6. Las plantillas vacías (con `[REEMPLAZAR_AQUI]`) sí pueden quedar en el repo.

## Dónde guardar el sobre sellado

Por orden de prioridad:

1. **Caja de seguridad bancaria** (BCP, Interbank, BBVA) — S/ 30-80/mes. Es la opción más seria.
2. **Notario con depósito en custodia** — S/ 100-200/año. Tiene valor probatorio.
3. **Caja fuerte de oficina** — solo si la oficina tiene seguridad 24/7.
4. **Gaveta con llave en casa** — última opción, solo para arrancar.
