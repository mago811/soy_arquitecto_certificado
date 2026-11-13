---
objective: 37
title: "tool_choice y workflows encadenados: primero el dato, después la tool que lo usa"
rule: "tool_choice garantiza QUE se llame una tool, no QUE tenga los datos: si B necesita el resultado de A, son requests sucesivos con tool_result en el medio."
sources:
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
    title: "Define tools (Forcing tool use)"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use
    title: "Parallel tool use"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works
    title: "How tool use works (The agentic loop)"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
    title: "Handle tool calls"
  - url: https://platform.claude.com/docs/en/build-with-claude/thinking
    title: "Thinking (Response prefill and forced tool use)"
status: verificada
---

## Qué es

Dos ideas que el examen mezcla a propósito:

1. **`tool_choice`** decide si Claude *tiene* que llamar una tool en **esta** respuesta.
2. **Secuenciar** es otra cosa: la API no tiene memoria ni "pipelines". Claude pide una tool, **tu código** la ejecuta, y vos mandás el resultado en un nuevo request. La doc: "every tool call is a round trip: the model asks, you execute, you report back, the model continues."

| Config | Efecto |
|---|---|
| `{"type": "auto"}` | Puede llamar 0, 1 o varias tools (o contestar en texto) |
| `{"type": "any"}` | Al menos una tool, cualquiera |
| `{"type": "tool", "name": "x"}` | Esa tool |
| `{"type": "none"}` | Ninguna tool |
| `{"type": "auto", "disable_parallel_tool_use": true}` | **A lo sumo una** tool por respuesta |
| `{"type": "any" o "tool", "disable_parallel_tool_use": true}` | **Exactamente una** tool |

`disable_parallel_tool_use` va **dentro** de `tool_choice`. La doc: "It is not a top-level request parameter."

## Cuándo se usa

**Caso típico:** `buscar_cliente(email)` devuelve `customer_id`; `emitir_reembolso(customer_id, monto)` lo necesita.

El loop correcto (la doc lo llama *agentic loop*):

1. Request 1 con las tools. Claude responde `stop_reason: "tool_use"` con `buscar_cliente`.
2. Tu código ejecuta `buscar_cliente`.
3. Request 2: los mensajes anteriores + la respuesta del assistant + un mensaje `user` con el `tool_result`.
4. Ahora Claude tiene el `customer_id` y llama `emitir_reembolso`.
5. Repetís mientras `stop_reason == "tool_use"`.

Si necesitás forzar un paso concreto, podés cambiar `tool_choice` **en cada request** (en modelos que aceptan forzar): request 1 forzás `buscar_cliente`, request 2 forzás `emitir_reembolso`. Ojo: cambiar `tool_choice` invalida el cache de los bloques de mensajes si usás prompt caching.

Si Claude manda las dos tools juntas en paralelo y la segunda depende de la primera, tenés opciones de la doc:

- Ejecutar el lote **en orden** y cortar en el primer fallo, devolviendo `is_error: true` para lo que no corriste.
- Agregar al system prompt: "Only batch tool calls that are independent of each other."
- Poner `disable_parallel_tool_use: true` dentro de `tool_choice`.

## El error típico que el examen quiere que cometas

- **"Forzá `emitir_reembolso` con `tool_choice` desde el primer request."** Forzar no le trae el dato. Claude tiene que llenar `customer_id` igual, y la doc avisa que Sonnet "might guess values you didn't supply". Resultado: reembolso a un ID inventado.
- **"Poné `disable_parallel_tool_use` como parámetro top-level."** No existe ahí; va dentro de `tool_choice`.
- **"Mandá cada `tool_result` en su propio mensaje user."** Mal: todos juntos, en un solo mensaje `user`, y **antes** de cualquier texto. Y ningún mensaje en el medio entre el `tool_use` y su `tool_result`.
- **"Forzá la tool con extended thinking manual."** `thinking: {type: "enabled"}` + `any`/`tool` → error. Si querés que piense antes de llamar, `auto` + instrucción en el prompt.
- **"Forzá en Claude Opus 5.5 / Sonnet 5.5."** Devuelven 400 con `any`/`tool`. Usá `auto` + `strict: true` (la doc: "Prompting still influences which tool auto picks").

## Ejemplo

```python
messages = [{"role": "user", "content": "Reembolsá $500 al cliente ana@x.com"}]
while True:
    resp = client.messages.create(model="claude-haiku-5-5", max_tokens=1024,
                                  tools=tools, messages=messages)
    if resp.stop_reason != "tool_use":
        break
    messages.append({"role": "assistant", "content": resp.content})
    results = [{"type": "tool_result", "tool_use_id": b.id, "content": ejecutar(b.name, b.input)}
               for b in resp.content if b.type == "tool_use"]
    messages.append({"role": "user", "content": results})
```

El dato de la tool A llega a Claude **solo** por el `tool_result` del request siguiente.

## Para recordar

- `tool_choice` = **si** llama. El loop = **en qué orden** y **con qué datos**.
- Dependencia → requests encadenados con `tool_result`, nunca "forzar la tool B".
- `disable_parallel_tool_use` va adentro de `tool_choice`: `auto` → máx. una; `any`/`tool` → exactamente una.
- Resultados paralelos: un solo mensaje `user`, `tool_result` primero.
