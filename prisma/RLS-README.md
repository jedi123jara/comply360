# Row Level Security — COMPLY360

## Estado actual

El archivo `prisma/rls-policies.sql` contiene políticas RLS completas para Postgres/Supabase. **Están escritas pero NO aplicadas en ningún entorno**.

## Cuándo aplicar

Antes del primer cliente productivo real. Las queries ya están 100% scoped por `orgId` a nivel de aplicación (revisado módulo por módulo en la auditoría integral, ver `.claude/plans/audit-integral-comply360.md`), pero RLS es la defensa en profundidad que nos salva de un bug de código futuro.

## Cómo aplicar

```bash
# 1. Verificar que el schema está al día
npx prisma migrate deploy

# 2. Aplicar las políticas (Supabase SQL editor o psql)
psql $DIRECT_URL -f prisma/rls-policies.sql

# 3. En la app: para que las políticas funcionen, cada query debe correr
#    con `SET LOCAL app.org_id = '<orgId>'`. El wrapper correcto va en
#    `src/lib/prisma.ts` — hoy ese paso no está implementado.
```

## Qué falta en código para que RLS funcione end-to-end

1. **Wrapper de transacción en `prisma.ts`** que inyecte `SET LOCAL app.org_id`
   usando el `AuthContext.orgId` al inicio de cada query autenticada.
   ```ts
   export async function withOrgScope<T>(orgId: string, fn: () => Promise<T>): Promise<T> {
     return prisma.$transaction(async (tx) => {
       await tx.$executeRawUnsafe(`SET LOCAL app.org_id = '${orgId}'`)
       return fn()
     })
   }
   ```
2. **Refactor de `withAuth`** en `api-auth.ts` para llamar `withOrgScope` antes del handler.
3. **Tests de regresión** que confirmen que un usuario de Org A no puede leer datos de Org B aun si la query aplicación está bugueada.

## Prioridad

**Alta** antes del Sprint 1 de clientes reales. Con el cockpit conectado (Sprint 1 de la revolución) el tráfico sube y el blast radius de cualquier fuga crece.
