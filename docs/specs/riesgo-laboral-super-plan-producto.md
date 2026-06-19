# Super Plan de Producto - Riesgo Laboral Anti-Multas

Fecha: 2026-05-24
Producto: COMPLY360
Objetivo: convertir Riesgo Laboral en el sistema operativo preventivo que protege al empleador frente a multas, inspecciones y contingencias laborales.

## 1. Tesis

COMPLY360 no debe vender "un dashboard de cumplimiento". Debe vender tranquilidad operativa: que el empleador sepa, antes de SUNAFIL, donde esta expuesto, cuanto podria costarle, que evidencia le falta, quien debe corregirlo y como demostrar que subsano.

La promesa correcta no es "nunca te multaran", porque eso seria juridicamente riesgoso. La promesa fuerte y defendible es:

> Reducimos tu exposicion a multas detectando brechas antes de la fiscalizacion, priorizando el impacto economico, guiando la subsanacion y preparando evidencia trazable para responder ante SUNAFIL.

El producto debe comportarse como un "escudo anti-multas": previene, alerta, ordena, documenta y defiende.

## 2. Principios del producto

1. Primero proteger, luego informar.
   - Cada pantalla debe responder: que hago hoy para bajar riesgo?

2. Evidencia mata opinion.
   - Un cumplimiento no debe ser "marcado como OK" si no existe fuente de evidencia verificable.

3. Una obligacion, una verdad.
   - SST, SUNAFIL-Ready, Diagnostico, Simulacro y Centro SUNAFIL no pueden calcular distinto la misma brecha.

4. Multa + urgencia + evidencia.
   - La prioridad no se ordena solo por gravedad legal, sino por dinero expuesto, plazo, probabilidad y capacidad de subsanar.

5. El cliente no debe saber legislacion para cumplir.
   - La SaaS debe traducir la norma en accion concreta: generar, subir, firmar, publicar, capacitar, asignar o corregir.

6. El sistema debe recordar por el empleador.
   - Vencimientos, actualizaciones, capacitaciones, EMO, comite, IPERC, SCTR y contratos deben activar recordatorios y tareas.

7. La IA no es adorno.
   - La IA debe acelerar subsanaciones, armar expedientes, resumir riesgos, redactar comunicaciones y explicar bases legales con fuentes.

## 3. Cliente objetivo y trabajos a resolver

### Dueño / Gerente General

Quiere:

- Saber si la empresa esta en riesgo.
- Entender cuanto podria costar una multa.
- Tener una lista corta de decisiones.
- Ver avance sin entrar al detalle legal.

Producto ideal:

- Score ejecutivo.
- Exposicion economica.
- Top 3 acciones de reduccion de multa.
- Reporte mensual para directorio.

### RR.HH. / Administracion

Quiere:

- Saber que documentos faltan por trabajador.
- Evitar vencimientos.
- Subsanar brechas con pasos claros.
- Tener evidencia lista.

Producto ideal:

- Bandeja diaria de brechas.
- Tareas con responsables.
- Generadores y carga de evidencia.
- Checklists por trabajador y por empresa.

### Responsable SST / Supervisor / Comite

Quiere:

- Mantener IPERC, EMO, capacitaciones, comite, accidentes y mapa de riesgos al dia.
- Saber que incumplimiento SST puede generar multa.
- Coordinar acciones de campo.

Producto ideal:

- Score SST real.
- Calendario SST.
- Matriz IPERC por sede/puesto.
- Plan anual y evidencias.

### Legal / Consultor externo

Quiere:

- Validar base legal.
- Revisar contingencias.
- Preparar respuesta ante inspeccion.

Producto ideal:

- Findings con base legal.
- Expediente exportable.
- Historial de subsanacion.
- Evidencia con hash, fecha y responsable.

## 4. El producto ideal: "Riesgo Laboral Command Center"

La seccion debe dejar de sentirse como varias paginas separadas y convertirse en una cabina operativa.

### Vista principal

La primera pantalla debe tener 5 bloques:

1. Exposicion total
   - multa potencial estimada.
   - multa post-subsanacion estimada.
   - ahorro posible si se corrige.

2. Estado de defensa
   - listo para inspeccion.
   - evidencia incompleta.
   - documentos vencidos.
   - brechas sin responsable.

3. Top 3 acciones de hoy
   - accion concreta.
   - monto que reduce.
   - responsable sugerido.
   - plazo.

4. Mapa de riesgo por area
   - SST.
   - contratos y registro.
   - remuneraciones.
   - seguridad social.
   - jornada y asistencia.
   - igualdad / hostigamiento.
   - tercerizacion / contratistas.

5. Botones principales
   - Recalcular riesgo.
   - Crear plan de subsanacion.
   - Preparar expediente SUNAFIL.
   - Simular inspeccion.

### Tabs recomendados

| Tab | Objetivo | Que debe mostrar |
|---|---|---|
| Resumen | Decision ejecutiva | score, multa, top acciones, tendencia |
| Brechas | Lista canonica de riesgos | findings, filtros, base legal, evidencia faltante |
| Plan | Subsanacion operativa | tareas, responsables, plazos, evidencia |
| Evidencia | SUNAFIL-Ready integrado | documentos, cobertura, version, acuses |
| SST | Riesgo preventivo especializado | IPERC, EMO, comite, capacitaciones, accidentes |
| Simulador | Ensayo preventivo | preguntas inspector, acta, gaps |
| Inspeccion | Modo crisis | expediente, bitacora, documentos a mostrar |
| Radar | Vigilancia | casilla, normas, vencimientos, alertas |

## 5. Motor central: LaborRiskEngine

El corazon del producto debe ser un motor unico.

```ts
evaluateLaborRisk(orgId, {
  mode: 'quick' | 'full' | 'inspection',
  now,
})
```

### Que debe producir

```ts
type LaborRiskSnapshot = {
  orgId: string
  calculatedAt: string
  score: {
    overall: number
    sunafilReady: number
    sst: number
    evidenceConfidence: number
  }
  exposure: {
    potentialFineSoles: number
    potentialFineUit: number
    estimatedAfterSubsanationSoles: number
    avoidableAmountSoles: number
  }
  findings: LaborRiskFinding[]
  evidenceRequirements: EvidenceRequirementStatus[]
  nextActions: RiskAction[]
  legalConstants: {
    uit: number
    rmv: number
    versionDate: string
    sources: string[]
  }
}
```

### Cada finding debe contener

```ts
type LaborRiskFinding = {
  id: string
  obligationId: string
  area: 'SST' | 'CONTRATOS' | 'PLANILLA' | 'BENEFICIOS' | 'JORNADA' | 'SEGURIDAD_SOCIAL' | 'IGUALDAD' | 'HSL' | 'TERCEROS'
  title: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  legalGravity: 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
  baseLegal: string
  affectedEntities: Array<{ type: 'worker' | 'org' | 'sede' | 'position'; id: string; label: string }>
  potentialFineSoles: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  evidenceSourcesChecked: string[]
  missingEvidence: string[]
  action: string
  suggestedOwnerRole: string
  suggestedDueDate: string
  route: string
}
```

### Por que es indispensable

Sin este motor, cada modulo puede "creer" una cosa distinta:

- SST puede decir que el comite esta vigente.
- SUNAFIL-Ready puede decir que falta el acta.
- Simulacro puede pedir un documento que ya existe.
- Risk scanner puede calcular multa con datos legacy.
- Cron puede no alertar nada.

El motor canonico elimina esa contradiccion.

## 6. Catalogo de obligaciones anti-multas

Crear un catalogo versionado de obligaciones:

```ts
type LaborObligation = {
  id: string
  area: string
  title: string
  baseLegal: string
  gravity: 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
  appliesWhen: RuleExpression
  evidenceRequirements: EvidenceRequirement[]
  evaluator: string
  remediationPlaybook: string
}
```

### Areas minimas

1. Contratos y registro
   - contrato firmado.
   - causa objetiva en plazo fijo.
   - T-Registro.
   - modalidad formativa.
   - extranjeros.

2. Remuneraciones y beneficios
   - RMV.
   - boletas.
   - CTS.
   - gratificaciones.
   - vacaciones.
   - asignacion familiar.
   - utilidades si aplica.

3. Seguridad social
   - AFP/ONP.
   - EsSalud.
   - Vida Ley.
   - SCTR por actividad/puesto de riesgo.

4. Jornada y asistencia
   - registro de asistencia.
   - horario exhibido.
   - horas extras.
   - descansos.
   - teletrabajo/desconexion.

5. SST
   - politica SST.
   - RISST si aplica.
   - IPERC.
   - mapa de riesgos.
   - plan anual SST.
   - comite/supervisor SST.
   - capacitaciones.
   - EMO.
   - EPP.
   - accidentes/SAT.
   - monitoreos ocupacionales.
   - simulacros.

6. Igualdad y hostigamiento
   - politica contra hostigamiento.
   - canal/procedimiento.
   - comite o delegado segun corresponda.
   - capacitacion.
   - cuadro de categorias.
   - brecha salarial.

7. Terceros y contratistas
   - desnaturalizacion de locacion.
   - tercerizacion.
   - intermediacion.
   - contratistas con SCTR/SST.
   - control de ingreso y evidencia.

8. Relaciones colectivas
   - sindicato.
   - convenios.
   - licencias.
   - no discriminacion sindical.

## 7. Evidencia: el verdadero producto

La proteccion frente a multas depende de poder demostrar cumplimiento o subsanacion.

### Boveda de evidencia

Cada evidencia debe tener:

- tipo.
- obligacion que cubre.
- fuente.
- archivo o registro.
- fecha de emision.
- fecha de vigencia.
- responsable.
- sede/area/trabajador relacionado.
- estado: presente, incompleta, vencida, observada, aprobada.
- hash SHA-256 si hay archivo.
- historial de versiones.
- acuse de lectura si aplica.

### Reglas de evidencia

Un documento no debe ser "OK" solo por existir. Debe responder:

1. Existe?
2. Esta vigente?
3. Aplica a todos los trabajadores/sedes requeridos?
4. Esta firmado/aprobado?
5. Fue publicado o exhibido si la norma lo exige?
6. Tiene acuse de lectura si corresponde?
7. Cubre la obligacion exacta?

### Evidencia de exhibicion

Crear flujo para:

- horario de trabajo exhibido.
- mapa de riesgos exhibido.
- sintesis de legislacion laboral.
- politicas visibles.

Datos:

- foto.
- sede.
- ubicacion dentro del centro.
- fecha.
- responsable.
- renovacion.
- hash.

## 8. Flujo anti-multas ideal

### Flujo 1: Primer onboarding de empresa

1. Cliente registra empresa, sector, sedes, cantidad de trabajadores.
2. Sistema identifica obligaciones aplicables.
3. Importa trabajadores/contratos/documentos.
4. Calcula primer riesgo.
5. Muestra "Plan de blindaje 30 dias".
6. Crea tareas por brecha critica.

Resultado:

- El cliente no queda en dashboard vacio.
- En 20 minutos entiende su exposicion.

### Flujo 2: Revision diaria

1. Usuario entra a Riesgo Laboral.
2. Ve top 3 acciones.
3. Cierra o asigna tareas.
4. Sube evidencia.
5. El score cambia.

Resultado:

- Gestion operativa simple.

### Flujo 3: Subsanacion

1. Motor detecta brecha.
2. Usuario crea tarea.
3. Sistema sugiere responsable y plazo.
4. Genera documento o pide evidencia.
5. Usuario carga/valida evidencia.
6. Motor recalcula.
7. Expediente queda actualizado.

Resultado:

- Cada brecha termina en prueba.

### Flujo 4: Simulacro SUNAFIL

1. Usuario inicia simulacro.
2. El sistema actua como inspector.
3. Pide documentos reales segun obligaciones.
4. Si falta algo, crea finding.
5. Genera acta preventiva.

Resultado:

- El cliente ensaya antes de una fiscalizacion real.

### Flujo 5: Inspeccion real

1. Usuario activa "Modo inspeccion".
2. Sistema abre expediente listo.
3. Muestra documentos por categoria.
4. Permite registrar preguntas/requerimientos.
5. Crea plan de respuesta.
6. Exporta PDF/ZIP con evidencia.

Resultado:

- La empresa no improvisa.

## 9. IA: copiloto de subsanacion, no solo chat

La IA debe tener roles claros:

### IA de priorizacion

"Estas son las 3 brechas que mas reducen multa si las corriges esta semana."

### IA de evidencia

"Este archivo parece ser una politica SST, pero no veo firma de gerencia ni fecha de aprobacion."

### IA de documentos

Genera:

- politica SST.
- plan anual SST.
- acta de comite.
- comunicados.
- carta de subsanacion.
- respuesta a requerimiento.

### IA de inspeccion

Prepara:

- guion para inspector.
- expediente.
- lista de documentos.
- riesgos que no se deben declarar como cumplidos sin evidencia.

### IA normativa

Explica:

- base legal.
- obligacion.
- riesgo.
- accion concreta.

Regla: cada respuesta legal debe citar fuente o marcar "requiere validacion legal".

## 10. Diseno UX propuesto

### Pantalla Resumen

Header:

- "Riesgo Laboral"
- estado: Bajo / Medio / Alto / Critico.
- boton: Recalcular.

Bloques:

- Exposicion potencial: S/.
- Ahorro por subsanacion.
- Score de evidencia.
- Listo para inspeccion: Si / No.

Top acciones:

1. Completar IPERC por sede.
2. Regularizar EMO vencidos.
3. Publicar politica SST y recabar acuses.

Cada accion:

- impacto S/.
- plazo.
- responsable.
- CTA.

### Pantalla Brechas

Filtros:

- criticidad.
- area.
- trabajador/sede.
- con/sin evidencia.
- con/sin responsable.

Cada tarjeta:

- titulo.
- base legal.
- multa estimada.
- evidencia faltante.
- accion sugerida.
- crear tarea.
- ver detalle.

### Pantalla Evidencia

Agrupar por:

- empresa.
- trabajador.
- sede.
- cargo/puesto.
- documento exhibido.

Estados:

- completo.
- parcial.
- vencido.
- faltante.
- no aplica.
- requiere revision.

### Modo inspeccion

Interfaz sin ruido:

- buscador de documento.
- categorias SUNAFIL.
- bitacora.
- exportar expediente.
- crear respuesta.

## 11. Roadmap

### P0 - 1 a 2 semanas: exactitud y confianza

Objetivo: que el producto deje de contradecirse.

1. Corregir CTAs rotos en SST.
2. Unificar score SST usando el motor premium.
3. SUNAFIL-Ready debe resolver evidencia desde modelos modernos.
4. Risk scanner debe dejar de usar proxies incorrectos.
5. Risk monitor debe llamar al scanner o motor canonico.
6. Documentos exhibidos deben poder cerrarse con evidencia.
7. Tests para los 10 riesgos criticos.

Entregable:

- Riesgo Laboral no muestra falsos faltantes obvios.
- SST, SUNAFIL-Ready y Centro SUNAFIL hablan el mismo idioma.

### P1 - 2 a 4 semanas: cabina anti-multas

Objetivo: convertir Riesgo Laboral en la pantalla principal de proteccion.

1. Crear `LaborRiskEngine`.
2. Crear `LaborRiskSnapshot`.
3. Redisenar resumen ejecutivo.
4. Integrar top 3 acciones.
5. Crear plan de subsanacion 7/30/90 dias.
6. Conectar findings con tareas.
7. Conectar tareas con evidencia.
8. Crear vista de evidencia integrada.

Entregable:

- El usuario entra, entiende riesgo, crea plan y sube evidencia.

### P2 - 1 a 2 meses: producto premium

Objetivo: diferenciar COMPLY360 de una simple checklist.

1. Modo inspeccion real.
2. Simulacro conectado al motor canonico.
3. IA de evidencia.
4. IA de subsanacion.
5. Heatmap de riesgo por sede/area/cargo.
6. Radar normativo conectado a obligaciones.
7. Reporte ejecutivo mensual.
8. Expediente ZIP/PDF con hashes.

Entregable:

- Cliente puede prepararse y responder ante fiscalizacion.

### P3 - 3 a 6 meses: automatizacion defensiva

Objetivo: que la SaaS opere como sistema preventivo permanente.

1. Integraciones con planilla.
2. Integraciones con capacitacion/e-learning.
3. Integraciones con proveedores EMO/SCTR.
4. WhatsApp/email para alertas criticas.
5. Benchmark anonimo por industria.
6. Marketplace de consultores/laboralistas.
7. Auditoria externa desde la plataforma.
8. Firma digital/acuses masivos.

Entregable:

- COMPLY360 se vuelve infraestructura laboral del empleador.

## 12. Primer backlog ejecutable

### Sprint 1 - Correccion de confianza

1. `fix(sst): corregir rutas de politica, EMO y EPP`
2. `fix(sunafil-ready): resolver IPERC desde IPERCBase`
3. `fix(sunafil-ready): resolver Comite desde ComiteSST`
4. `fix(sunafil-ready): resolver EMO desde EMO`
5. `fix(sunafil-ready): resolver capacitaciones desde WorkerCapacitacionSST`
6. `fix(risk-scanner): validar HSL con POLITICA_HOSTIGAMIENTO`
7. `fix(risk-scanner): validar cuadro categorias con modulo igualdad`
8. `test(riesgo): regression para falsos faltantes SST`

### Sprint 2 - Motor canonico

1. `feat(compliance): add labor obligation catalog`
2. `feat(compliance): add evidence resolvers`
3. `feat(compliance): add labor risk snapshot`
4. `refactor(compliance): use LaborRiskEngine in scan API`
5. `refactor(sunafil-ready): consume evidence resolver layer`
6. `refactor(risk-monitor): consume LaborRiskEngine`
7. `test(compliance): cover canonical findings`

### Sprint 3 - Cabina

1. `feat(riesgo): new executive summary`
2. `feat(riesgo): top actions by avoidable fine`
3. `feat(riesgo): create remediation plan`
4. `feat(riesgo): finding detail drawer`
5. `feat(riesgo): evidence checklist per finding`
6. `feat(riesgo): inspection readiness card`
7. `e2e(riesgo): user closes a finding with evidence`

### Sprint 4 - Defensa e inspeccion

1. `feat(sunafil): inspection mode`
2. `feat(sunafil): export evidence dossier`
3. `feat(simulacro): use canonical obligations`
4. `feat(ai): evidence reviewer`
5. `feat(ai): remediation letter generator`
6. `feat(alerts): risk escalation notifications`

## 13. Metricas de exito

### Producto

- % de organizaciones con riesgo recalculado semanalmente.
- % de findings con responsable asignado.
- % de findings cerrados con evidencia.
- tiempo medio de cierre de brecha.
- documentos vencidos por empresa.
- tareas criticas sin responsable.

### Negocio

- activacion: empresa obtiene primer plan anti-multas en menos de 30 minutos.
- retencion: clientes que revisan riesgo al menos 1 vez por semana.
- expansion: clientes que activan SST premium, inspeccion, expediente o IA.
- reduccion de churn por confianza.

### Valor legal-operativo

- multa potencial estimada reducida.
- evidencia completa por obligacion.
- subsanaciones documentadas.
- inspecciones simuladas.
- expedientes exportados.

## 14. Que NO construir todavia

1. Mas dashboards sin accion.
2. Chat IA generico sin contexto de evidencia.
3. Mas scores si no se unifican.
4. Checklist visual que no cierre brechas.
5. Graficos de vanidad.
6. Promesas de "cero multas".
7. Automatizaciones legales sin fuente o sin evidencia.
8. Integraciones externas antes de arreglar el motor interno.

## 15. Fuentes oficiales base

- Ley N. 29783, Seguridad y Salud en el Trabajo: https://www.gob.pe/institucion/congreso-de-la-republica/normas-legales/462576-29783
- Reglamento de la Ley 29783, D.S. 005-2012-TR: https://www.sat.gob.pe/transparenciav2/Normas/descargar/DecretoSupremo005-2012-TR_ReglamentoLey29783_LeySeguridadSaludTrabajo_v4.pdf
- Reglamento de la Ley General de Inspeccion del Trabajo, D.S. 019-2006-TR: https://www.sunafil.gob.pe/portal/images/docs/normatividad/DS-019-2006-TR-Aprobacion_Reglamento_Ley_Inspeccion_Trabajo.pdf
- UIT 2026 = S/ 5,500, MEF: https://www.gob.pe/institucion/mef/noticias/1314665-mef-establece-en-s-5500-el-valor-de-la-uit-para-el-ano-2026
- RMV vigente S/ 1,130, SUNAFIL: https://www.gob.pe/institucion/sunafil/noticias/1124831-que-hago-si-mi-empleador-no-cumple-con-el-pago-del-monto-actualizado-de-la-remuneracion-minima-vital
- Subsanacion y Modulo de Gestion del Cumplimiento SUNAFIL: https://www.gob.pe/institucion/sunafil/noticias/1346812-sunafil-logro-que-las-empresas-pagaran-mas-de-3-millones-y-medio-de-soles-a-sus-trabajadores-al-subsanar-sus-incumplimientos-laborales
- Mapa de riesgos y documentacion SST, SUNAFIL: https://www.gob.pe/institucion/sunafil/noticias/1120309-sunafil-empresas-deben-elaborar-un-mapa-de-riesgos-y-colocarlo-en-un-lugar-visible-del-centro-de-trabajo

## 16. Resultado esperado

Cuando este plan este implementado, Riesgo Laboral debe sentirse asi:

1. El empleador entra y sabe su exposicion real.
2. La SaaS le dice que hacer hoy.
3. Cada accion reduce un riesgo concreto.
4. Cada cierre exige evidencia.
5. La evidencia queda lista para SUNAFIL.
6. El sistema alerta antes de vencimientos.
7. El simulacro valida si la empresa puede defenderse.
8. El modo inspeccion evita improvisacion.

El producto ganador no es el que muestra mas informacion. Es el que evita que el cliente llegue tarde, sin papeles y sin plan.
