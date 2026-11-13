---
objective: 25
title: "Salida estructurada: ¿prompt, prefill, tool o structured outputs?"
rule: "Si un JSON roto rompe el sistema → structured outputs (output_config.format) o strict: true. El prompt orienta; el prefill ya no existe en modelos nuevos."
sources:
  - url: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
    title: "Structured outputs"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use
    title: "Strict tool use"
  - url: https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency
    title: "Increase output consistency"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices (Migrating away from prefilled responses)"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works
    title: "How tool use works"
status: verificada
---

## Qué es

Hay cuatro formas de pedirle a Claude un JSON. No valen lo mismo:

| Método | Cómo se hace | ¿Garantiza el schema? |
|---|---|---|
| Prompt ("respondé solo JSON con estos campos") | Instrucciones + ejemplos | **No.** Orienta. Puede fallar el parseo o faltar campos |
| Prefill (empezar el turno del assistant con `{`) | Último mensaje `assistant` parcial | **No**, y en Claude 4.6 y posteriores da **400** |
| Tool con `input_schema` | `tools` + Claude devuelve un bloque `tool_use` | Forma guiada; sin `strict` puede mandar `"2"` en vez de `2` |
| **Structured outputs** | `output_config.format` (JSON outputs) o `strict: true` en la tool | **Sí**, por *constrained decoding* |

La doc lo dice claro: sin structured outputs, "Even with careful prompting, you might encounter" errores de parseo, campos requeridos faltantes y tipos inconsistentes. Con structured outputs: "Always valid: No JSON parsing errors".

Dos features, dos problemas:

- **JSON outputs** (`output_config.format` con `type: "json_schema"`) → controla **lo que Claude responde**. El JSON viene en el bloque `text`.
- **Strict tool use** (`strict: true` en la definición de la tool) → controla **cómo Claude llama a tus funciones**. El JSON viene en `tool_use.input`.

Se pueden usar juntas en el mismo request.

## Cuándo se usa

- **El JSON lo consume código** (una DB, una API, un pipeline) → structured outputs. No hay negociación.
- **Clasificación con etiquetas fijas** → tool con un campo `enum` o structured outputs (la doc lo recomienda así para migrar de prefill).
- **Texto para humanos, formato flexible** (un resumen, un mail) → prompt con formato y ejemplos alcanza. La propia doc dice que esas técnicas sirven "when you need flexibility beyond strict JSON schemas".
- **Agente que llama tools Y entrega un JSON final** → `strict: true` en las tools + `output_config.format`.

Señal de alarma de la doc: si estás escribiendo una regex para sacar una decisión del texto del modelo, esa decisión tendría que haber sido una tool call.

## El error típico que el examen quiere que cometas

1. **"Reforzá el prompt"**: "IMPORTANTE: respondé SOLO JSON válido". Sigue siendo guía. Si el parseo falla 1 de cada 50, el fix es structured outputs, no más mayúsculas.
2. **"Usá prefill con `{`"**: en Claude 4.6 y posteriores el prefill del último turno devuelve **400**. Y además "Prefilling is incompatible with JSON outputs".
3. **"Subí la temperatura / cambiá de modelo"**: no toca el problema.
4. **Nombre del parámetro**: es `output_config.format`. El viejo `output_format` está deprecado (sin el beta header da 400). En el SDK de Python, `messages.parse(output_format=MiModeloPydantic)` sigue andando porque el SDK lo traduce a `output_config`.

Y tres trampas finas, porque "garantizado" tiene letra chica:

- `stop_reason: "refusal"` → la salida puede no respetar el schema.
- `stop_reason: "max_tokens"` → JSON cortado. Subí `max_tokens`.
- Los `enum` de texto pueden volver con otra **mayúscula**. Compará sin distinguir mayúsculas.

Además, el schema tiene límites: `minimum`, `maximum`, `minLength`, `maxLength` **no** están soportados (400). Los helpers del SDK los pasan a la `description` y validan la respuesta en tu código. Y `output_config.format` no se puede combinar con Citations (400).

## Ejemplo

Una fintech extrae datos de facturas con un prompt "devolvé JSON". El 2% de las respuestas trae texto antes del `{` y `json.loads` explota.

```python
response = client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": f"Extraé los datos: {factura}"}],
    output_config={
        "format": {
            "type": "json_schema",
            "schema": {
                "type": "object",
                "properties": {
                    "numero": {"type": "string"},
                    "total": {"type": "number"},
                },
                "required": ["numero", "total"],
                "additionalProperties": False,
            },
        }
    },
)
```

Antes de parsear, chequeá `response.stop_reason`. Si es `end_turn`, el bloque `text` trae JSON válido para ese schema.

## Para recordar

- Prompt = orienta. Prefill = muerto en modelos nuevos. Structured outputs = garantiza.
- `output_config.format` → la respuesta. `strict: true` → los inputs de la tool.
- "Garantizado" salvo `refusal`, `max_tokens` y la mayúscula de los enums.
- Constraints numéricos y de largo → 400; usá el helper del SDK o validá vos.
