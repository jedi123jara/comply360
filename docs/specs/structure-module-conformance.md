# Estructura Organizacional - contrato de conformidad

Fuente de verdad: `Informe_Estructura_Organizacional_COMPLY360_v1.0.docx`, version 1.0, 01 de mayo de 2026.

Este documento convierte el informe en criterios implementables para que el modulo no derive hacia un organigrama generico de RRHH. El producto debe tratar la estructura organizacional como evidencia juridico-laboral, base del MOF y fuente de senales para cumplimiento.

## Decisiones no negociables

1. El nodo principal del organigrama es el puesto/cargo, no la persona.
2. Area/unidad, puesto y asignacion de trabajador son capas separadas.
3. Toda entidad estructural versionable conserva historia con `validFrom` / `validTo` o campos temporales equivalentes.
4. Ninguna consulta o mutacion acepta `orgId` desde el cliente; se deriva de la sesion.
5. Toda mutacion estructural genera log juridico en `OrgStructureChangeLog` ademas del `AuditLog` general.
6. Auditor Link solo puede exponer snapshots con hash canonico recalculable sobre todo el payload.
7. El modulo no muestra sueldos ni bandas salariales a roles sin permiso expreso.

## Mapping actual del repositorio

| Informe | Implementacion actual | Estado |
| --- | --- | --- |
| `Area` | `OrgUnit` | Parcial. Falta semantica `validFrom/validTo` completa. |
| `Position` | `OrgPosition` | Parcial. Falta MOF, bandas, riesgos SST, criticidad y versionado. |
| `Assignment` | `OrgAssignment` | Parcial. Usa `startedAt/endedAt`, equivalente temporal aceptable. |
| `CSSTSeat` | `OrgComplianceRole` | Parcial. Cubre roles SST, pero falta paridad/acta como vista de CSST dedicada. |
| `StructureChangeLog` | `AuditLog` general | Insuficiente. Se agrega `OrgStructureChangeLog`. |
| `SimulationScenario` | `OrgChartDraft` | Parcial para fase 3. |
| Time Machine | Snapshot historico simple | Insuficiente. Debe consultar estructura vigente por fecha. |
| React Flow + dagre | Canvas propio | Insuficiente para el informe. Mantener temporalmente, migrar a `@xyflow/react`. |

## Fase 1 - MVP comercializable

- [x] Ruta visible del modulo en dashboard.
- [x] CRUD basico de unidades.
- [x] CRUD basico de cargos.
- [x] Asignacion de trabajadores a cargos.
- [x] Snapshot y Auditor Link inicial.
- [ ] Schema alineado con campos MOF/compliance del informe.
- [ ] Time Machine sobre `validFrom/validTo`, no solo snapshot.
- [ ] Layout de tres columnas: filtros 240px, lienzo, panel contextual 320px/drawer.
- [ ] Tabs: Organigrama, Directorio, Areas y Cargos.
- [ ] Nodos de puesto 200x90 con trabajador, modalidad, riesgo y reportes.
- [ ] Drag-and-drop de puesto sobre puesto con confirmacion y bloqueo de ciclos.
- [ ] Importador Excel con preview y errores por fila.
- [ ] Plantillas por industria: transporte, retail, servicios.
- [ ] Exportacion MOF `.docx`.

## Fase 2 - diferenciacion

- [ ] Time Machine UI con slider y estado historico solo lectura.
- [ ] Auditor de Subordinacion con evento `LOCADOR_SUBORDINATED`.
- [ ] Lentes: Estructural, Compliance, Contractual, SST.
- [ ] Vista Alertas laborales con catalogo estructural.
- [ ] Plantillas adicionales: constructora, agroindustria, manufactura.
- [ ] Construccion asistida por IA.
- [ ] Exportacion de organigrama oficial PDF con hash.

## Fase 3 - innovacion

- [ ] Modo CSST completo con validador Ley 29783.
- [ ] What-If con calculo de costos laborales.
- [ ] Deteccion informativa de cese colectivo.
- [ ] Exportacion RIT estructural.
- [ ] Vista Responsables y span of control.
- [ ] Busqueda semantica/copiloto.
- [ ] Reportes certificados con hash.

## Criterios tecnicos de aceptacion

- `npx tsc --noEmit` debe pasar.
- Tests unitarios de snapshot hash, ciclo jerarquico, asignacion primaria y reglas CSST deben pasar.
- Ninguna query del modulo debe usar `orgId` recibido por body/querystring.
- Auditor Link debe recomputar el hash del payload antes de responder.
- Toda mutacion debe registrar `beforeJson`, `afterJson`, usuario, timestamp, IP si esta disponible y motivo si el usuario lo entrega.
