# Eval Harness — Comply360 IA

Validación de regresión automatizada de la capa IA. Ejecuta golden datasets
contra el provider configurado y reporta pass rate, costo, latencia.

## Uso

```bash
# Evaluar una feature específica
npm run eval:ai -- --feature=chat
npm run eval:ai -- --feature=contract-review
npm run eval:ai -- --feature=triage
npm run eval:ai -- --feature=agents

# Evaluar todas
npm run eval:ai -- --all

# Forzar un provider específico (sobrescribe defaults)
DEEPSEEK_API_KEY=... CONTRACT_REVIEW_AI_PROVIDER=deepseek npm run eval:ai -- --feature=contract-review
```

Los reportes se guardan en `.eval-reports/<feature>-<provider>-<timestamp>.json`.

## Workflow para migración

1. **Baseline (antes de migrar)**: corre el eval con el provider actual para
   capturar el comportamiento esperado.
   ```bash
   AI_PROVIDER=anthropic npm run eval:ai -- --all
   ```
2. **DeepSeek run**: corre el eval con DeepSeek y compara reportes.
   ```bash
   AI_PROVIDER=deepseek npm run eval:ai -- --all
   ```
3. **Gate**: si la regresión en `passRate` es > 5% en alguna feature
   crítica (chat, contract-review, agents), no se hace merge.

## Estructura

- `runner.ts` — runner principal (CLI + library).
- `goldens/<feature>/*.json` — casos curados. Cada archivo es un caso.

## Schema de cada golden

```json
{
  "id": "string-único",
  "description": "qué prueba",
  "input": {
    "messages": [{ "role": "system|user|assistant", "content": "..." }],
    "options": { "feature": "...", "temperature": 0.4, "maxTokens": 1500 }
  },
  "expected": {
    "containsAll": ["términos", "que", "deben", "estar"],
    "containsAny": ["o", "uno", "de"],
    "notContains": ["no", "debe", "haber"],
    "regex": "expr regular opcional",
    "jsonShape": {
      "campo.subcampo": { "exists": true, "min": 0, "max": 100, "oneOf": ["A", "B"], "contains": "substr" }
    }
  },
  "tags": ["categorización", "opcional"]
}
```

## Cómo extender

Para llegar a los 130 casos prometidos:
- chat: 40 casos (12 base + 28 a curar — preguntas reales del log de producción)
- contract-review: 30 casos (3 base + 27 — contratos reales con PII redactada)
- agents: 60 casos (3 base + 57 — actas SUNAFIL, boletas, descargos reales)
- triage: 20 casos (3 base + 17 — denuncias reales redactadas)

El bottleneck es la curación legal — cada caso necesita expected outputs
revisados por el equipo legal del cliente.

## Rollout staged

Después del eval, usa `AI_ROLLOUT_PERCENTAGE` en producción para subir el
tráfico gradualmente:
- Día 1–2: `AI_ROLLOUT_PERCENTAGE=10`
- Día 3–4: `AI_ROLLOUT_PERCENTAGE=25`
- Día 5–7: `AI_ROLLOUT_PERCENTAGE=50`
- Día 8+: `AI_ROLLOUT_PERCENTAGE=100`

El bucketing es estable por org: el mismo cliente siempre cae en el mismo bucket
mientras el porcentaje no cambie.
