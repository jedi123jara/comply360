-- Portal Contador removido (a pedido del dueño).
-- La feature (rutas api/consultor, página dashboard/consultor, landing de marketing,
-- modelo Prisma ConsultorClient + relaciones en Organization) ya fue eliminada del código.
-- Esta migración elimina la tabla huérfana. Las FK (hacia organizations) y las políticas
-- RLS de la tabla se eliminan automáticamente al hacer DROP TABLE.
DROP TABLE IF EXISTS "consultor_clients";
