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

Los valores de `tool_choice` (`auto`, `any`, `tool`, `none`) ya los viste en el objetivo 27, y el formato de los `tool_result` en paralelo en el objetivo 1. Este objetivo junta las dos cosas en una pregunta distinta: **¿cómo garantizo que la tool B reciba el dato que produce la tool A?**

La respuesta corta: la API no tiene memoria ni "pipelines". La doc: "every tool call is a round trip: the model asks, you execute, you report back, the model continues." El dato de A le llega a Claude **solo** por el `tool_result` que vos mandás en el request siguiente.

| Lo que querés garantizar | Mecanismo |
|---|---|
| Que en este paso salga una tool call y no texto | `tool_choice` `any` o `tool` (donde el modelo lo acepte) |
| Que A corra **antes** que B | Requests sucesivos: B se pide después de que llegó el `tool_result` de A |
| Que un paso concreto llame una tool concreta | Cambiar `tool_choice` **en cada request** del loop |
| Que no salgan A y B juntas en la misma respuesta | `disable_parallel_tool_use: true` dentro de `tool_choice`, o pedirlo en el system prompt |
| Que B no corra con un dato inventado | Validar en tu código antes de ejecutar B |

## Cuándo se usa

**Caso típico:** `buscar_cliente(email)` devuelve `customer_id`; `emitir_reembolso(customer_id, monto)` lo necesita.

1. Request 1 con las tools. Claude pide `buscar_cliente` (`stop_reason: "tool_use"`).
2. Tu código la ejecuta y devuelve el `tool_result`.
3. Request 2 con todo el historial. Ahora Claude **tiene** el `customer_id` y pide `emitir_reembolso`.

**Forzar cada paso.** Si el orden tiene que ser fijo, el `tool_choice` puede cambiar por vuelta: request 1 con `{"type": "tool", "name": "buscar_cliente"}`, request 2 con `{"type": "tool", "name": "emitir_reembolso"}`, request 3 con `auto` para el cierre. Funciona porque cada forzado llega **después** del `tool_result` anterior. Costo: la doc avisa que cambiar `tool_choice` "will invalidate cached message blocks" si usás prompt caching.

**Si Claude manda A y B en la misma respuesta.** La API no impone orden de ejecución: lo decidís vos. Opciones de la doc:

- Ejecutar el lote **en orden** y cortar en el primer fallo; a lo que no corriste le devolvés `tool_result` con `is_error: true`.
- Si corriste en paralelo y B falló porque A no había terminado: `is_error: true` con el error real. "Claude will reissue the call on the next turn."
- Para que pase menos, en el system prompt: "Only batch tool calls that are independent of each other."

**Modelo que no acepta forzar** (por ejemplo `claude-sonnet-5-5`): no podés fijar el paso con `tool_choice`. Queda `auto` + descripciones que digan el orden ("Llamala antes de cualquier operación sobre un cliente") + **tu código** que rechaza B si su input no salió de un `tool_result` previo.

## El error típico que el examen quiere que cometas

- **"Forzá `emitir_reembolso` desde el primer request."** Forzar no le trae el dato. Claude igual tiene que llenar `customer_id`, y la doc avisa que Claude, sobre todo Sonnet, "might guess values you didn't supply". Resultado: reembolso a un ID inventado.
- **"`tool_choice: any` con las dos tools y listo."** Garantiza que salga *alguna* tool, no el orden ni el dato.
- **"`strict: true` en `emitir_reembolso`."** Garantiza que `customer_id` sea un string. No que sea el correcto.
- **"Ejecutá el lote en paralelo y descartá en silencio lo que falló."** Cada `tool_use` necesita su `tool_result`, aunque sea con `is_error: true`.

## Ejemplo

Forzar el orden por vuelta (modelo que acepta forzar):

```python
PASOS = [{"type": "tool", "name": "buscar_cliente"},
         {"type": "tool", "name": "emitir_reembolso"},
         {"type": "auto"}]
for i in range(len(PASOS)):
    resp = client.messages.create(model="claude-haiku-5-5", max_tokens=1024,
        tools=tools, tool_choice=PASOS[i], messages=messages)
    if resp.stop_reason != "tool_use":
        break
    messages.append({"role": "assistant", "content": resp.content})
    messages.append({"role": "user", "content": [
        {"type": "tool_result", "tool_use_id": b.id, "content": ejecutar(b.name, b.input)}
        for b in resp.content if b.type == "tool_use"]})
```

El paso 2 recién se pide cuando el `customer_id` ya está en el historial.

## Para recordar

- `tool_choice` = **si** llama (y cuál). El loop = **en qué orden** y **con qué datos**.
- Dependencia → requests encadenados con `tool_result`, nunca "forzar la tool B" de entrada.
- Orden fijo → `tool_choice` distinto en cada vuelta (y aceptás perder el cache de mensajes).
- A y B juntas → ejecutá en orden, `is_error: true` a lo que no corrió, y "Only batch tool calls that are independent of each other."
- Sin forzado disponible → `auto` + descripción con el orden + validación en tu código.
