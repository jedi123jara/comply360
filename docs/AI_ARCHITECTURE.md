# Arquitectura IA — COMPLY360 PERÚ

> Snapshot 2026-04-30. Refleja la migración a DeepSeek V4 como motor único.
> Mantenido a mano. Si tocas la capa IA, actualiza este documento.

## Principios

1. **DeepSeek V4 es el motor único** del producto. Toda la inteligencia legal
   (chat, contract review, agentes especializados, generadores, clasificación)
   corre sobre Flash o Pro según el feature.
2. **OpenAI** se mantiene SOLO para 2 capacidades que DeepSeek no soporta:
   visión (Fase 3.5 auto-verify de legajo) y embeddings (RAG).
3. **Ningún hardcode de modelo fuera de `provider.ts`**. Todo va por el wrapper.
4. **Routing declarativo** en `feature-routing.ts` — fuente única de verdad.
5. **Telemetría completa**: cada call registra provider, modelo, tokens
   (incluyendo cached y reasoning), TTFT, costo USD, fallback, eval score.
6. **Capacity guards** per-org evitan que una org sola consuma todo el budget.
7. **Eval harness** detecta regresiones objetivamente antes de cada deploy.

## Mapa de features

| Feature | Tier | Stream | Volumen | Riesgo | Notas |
|---|---|---|---|---|---|
| `chat` | Flash | sí | alto | bajo | Copilot del dashboard, RAG-anclado |
| `worker-chat` | Flash | sí | alto | bajo | Chat del trabajador en /mi-portal |
| `complaint-triage` | Flash | no | bajo | medio | JSON, clasificación |
| `norm-classifier` | Flash | no | bajo | bajo | Crawler de normas |
| `pdf-extract` | Flash | no | medio | bajo | Extracción batch de trabajadores |
| `doc-generator` | Flash | no | medio | bajo | Generadores SST + compliance |
| `contract-review` | Pro | no | medio | alto | Razonamiento legal denso |
| `contract-gen` | Pro | no | bajo | alto | Generación de contratos |
| `contract-fix` | Pro | no | bajo | alto | Auto-fix con riesgos |
| `action-plan` | Pro | no | bajo | medio | Plan tras diagnóstico |
| `pliego-analysis` | Pro | no | bajo | alto | Pliego de reclamos |
| `sunafil-agent` | Pro | no | bajo | alto | Agente analista SUNAFIL |
| `payslip-audit` | Pro | no | medio | medio | Auditor de boletas |
| `descargo-writer` | Pro | no | bajo | alto | Redactor de descargos |
| `rag-embed` | — | no | medio | bajo | OpenAI text-embedding-3-small |
| `document-vision` | — | no | medio | medio | OpenAI gpt-4o-mini, Fase 3.5 |

## Componentes

### `src/lib/ai/provider.ts`
Wrapper unificado. APIs:
- `callAI(messages, options)` — call no-stream, retorna content.
- `callAIWithUsage(messages, options)` — adicional retorna usage para telemetría.
- `callAIStream(messages, options)` — async generator de chunks SSE.
- `callAIRedacted(messages, options)` — redacta PII antes de mandar y restaura
  después en la respuesta. Para call sites con datos sensibles del worker.
- `callAIWithFallback(messages, options)` — chain de fallback automático.
- `extractJson(content)` — parser robusto de JSON con varios formatos.

### `src/lib/ai/feature-routing.ts`
Mapping declarativo `FEATURE_ROUTING` que dicta provider, tier, stream,
jsonMode y redactPii por feature. Override por env var
(`{FEATURE}_AI_PROVIDER`, `{FEATURE}_TIER`, `{FEATURE}_DEEPSEEK_MODEL`).

### `src/lib/ai/usage.ts`
`recordAiUsage(input)` persiste a `AiUsage` y bumpea `AiBudgetCounter`.
`checkAiBudget()` y `getMonthlyBudgetUsd()` enforce caps por plan.

### `src/lib/ai/capacity.ts`
`checkCapacity()` y `assertCapacity()` — middleware per-org que valida budget
mensual + throttle hora. O(1) gracias a `AiBudgetCounter`.

### `src/lib/ai/pricing.ts`
Tabla local de costos USD por modelo. `estimateCostUsd()` considera tokens
cached (DeepSeek devuelve `prompt_cache_hit_tokens`).

### `src/lib/ai/pii-redactor.ts`
`redactPii()` reemplaza DNI, RUC, email, teléfonos peruanos, cuentas bancarias
(con o sin guiones), nombres del worker, y opcionalmente códigos CIE-10.
Determinista por valor: dos ocurrencias del mismo DNI comparten placeholder.

### `src/lib/ai/token-counter.ts`
`estimateTokens()`, `estimateMessagesTokens()`, `estimateCallCost()`,
`assertWithinContext()`, `fitChunksToContext()`. Usa `gpt-tokenizer` (cl100k).

### `src/lib/ai/rollout.ts`
`shouldUseDeepSeekRollout()` y `rolloutProvider()` — soft launch staged con
bucketing estable por orgId+feature.

### `src/lib/ai/__evals__/`
- `runner.ts` — runner CLI + library para correr golden datasets.
- `goldens/<feature>/*.json` — casos curados con asserts (containsAll,
  jsonShape, regex).
- Script: `npm run eval:ai -- --feature=<name>`.

### `src/lib/ai/rag/`
- `retriever.ts` — BM25 keyword sobre 73 chunks handcrafted.
- `vector-retriever.ts` — pgvector + OpenAI embeddings (text-embedding-3-small)
  sobre 360 chunks SUNAFIL extendidos. Hybrid scoring 60/40.

### `src/lib/ai/document-verifier.ts`
**Excepción**: usa OpenAI gpt-4o-mini (vision). NO migrar a DeepSeek.

## Variables de entorno

### Requeridas
- `DEEPSEEK_API_KEY` — motor primario.
- `OPENAI_API_KEY` — vision + embeddings.

### Opcionales
- `{FEATURE}_AI_PROVIDER` — fuerza provider para una feature.
- `{FEATURE}_TIER` — `flash` | `pro` (DeepSeek).
- `{FEATURE}_DEEPSEEK_MODEL` — override directo del modelo.
- `AI_HOURLY_CALL_LIMIT` — calls/hora por org (default 1000).
- `AI_ROLLOUT_PERCENTAGE` — porcentaje de tráfico a DeepSeek (default 100).

## Telemetría

Tabla `AiUsage` (extendida 2026-04-30):
- `provider`, `model`, `feature`
- `promptTokens`, `completionTokens`, `totalTokens`
- `cachedTokens` — desde context cache (10x más barato)
- `reasoningTokens` — DeepSeek-reasoner thinking tokens
- `ttftMs` — time-to-first-token (streams)
- `fallbackUsed` — true si primario falló
- `evalScore` — score si vino del eval harness
- `costUsd` — USD calculado con pricing local

Tabla `AiBudgetCounter` (nueva): contadores agregados por org/mes. Bumpeados
en cada `recordAiUsage` exitoso para `checkCapacity` O(1).

UI admin: `/admin/ai-usage` (extender con cache rate, TTFT heatmap).

## Decisiones explícitas

- **No usar Anthropic**: el código mantiene soporte por compat pero el producto
  no lo despacha por default. Si se necesita override puntual, env var.
- **No usar Groq**: rate limits agresivos, no rentable para hot path.
- **No tool calling**: el codebase no lo usa (cero call sites con `tools:`).
  Si se agrega en el futuro, validar contra DeepSeek antes.
- **No streaming en agentes**: agentes son razonamiento batch que retorna JSON;
  streaming no aporta UX. Solo chat (copilot + worker) es streaming.
- **Long context (1M) opcional**: `deepResearch: true` en `contract-review`
  activa corpus completo. Detrás de plan PRO+.
- **Vision queda en OpenAI**: DeepSeek V4 no tiene visión competitiva.
  Cuando salga un modelo viable de DeepSeek con vision, migrar Fase 3.5.

## Roadmap futuro (fuera de este sprint)

- Self-host de V4-Flash para soberanía de datos peruana (6-12 meses).
- pgvector ingestion automatizada vía cron diario (pendiente del crawler).
- Eval harness en CI con gate automático del 5%.
- Tool calling experimental para agentes que necesiten retrieval iterativo.
- A/B testing con `AI_ROLLOUT_PERCENTAGE` por org (no solo global).
