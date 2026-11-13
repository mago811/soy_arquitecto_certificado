---
objective: 1
title: "Varias tool calls en un mismo turno (y cómo no romper el paralelismo)"
rule: "Varios tool_use en una respuesta → ejecutalos (en paralelo si son independientes) y devolvé TODOS los tool_result juntos, primero, en UN solo mensaje user."
sources:
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use
    title: "Parallel tool use"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
    title: "Handle tool calls"
  - url: https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
    title: "Stop reasons and fallback"
  - url: https://code.claude.com/docs/en/agent-sdk/agent-loop
    title: "How the agent loop works"
  - url: https://code.claude.com/docs/en/agent-sdk/subagents
    title: "Subagents in the SDK"
status: no_verificado
---

## Qué es

El bucle agéntico con la Messages API es así:

1. Mandás la request con `tools`.
2. Mirás `stop_reason`. Si es `tool_use`, Claude te pide herramientas. Si es `end_turn`, terminó: usás la respuesta.
3. Si es `tool_use`, ejecutás las tools y mandás los resultados en un mensaje `user` con bloques `tool_result`.
4. Volvés al paso 2.

Lo clave del objetivo: **una sola respuesta puede traer varios bloques `tool_use`**. La doc: "By default, Claude may call multiple tools in a single response." Eso es paralelismo: en vez de 3 idas y vueltas (3 requests), hacés 1.

| Situación | Qué hacés |
|---|---|
| `stop_reason: "tool_use"` con 3 bloques `tool_use` | Ejecutás los 3 y devolvés 3 `tool_result` en **un** mensaje `user` |
| Tools independientes y de solo lectura | Las corrés en paralelo (`Promise.all`, `asyncio.gather`) |
| Tools con efectos o con orden | Las corrés en secuencia; si una falla, a las que no corriste les devolvés `is_error: true` |
| `stop_reason: "end_turn"` | Fin del bucle |
| Querés como mucho una tool por respuesta | `tool_choice: {"type": "auto", "disable_parallel_tool_use": true}` |

## Cuándo se usa

- **"Clima en SF y en NYC"**, "leé estos 3 archivos", "consultá 4 sistemas": subtareas independientes → que vengan en el mismo turno.
- **Coordinador con subagentes**: si las investigaciones no dependen entre sí, el coordinador lanza varios subagentes en la misma respuesta. La doc del SDK: terminan "in the time of the slowest one rather than the sum of all of them".
- **En el Agent SDK** el loop lo maneja el SDK: las tools de solo lectura (`Read`, `Glob`, `Grep`) pueden correr a la vez; las que modifican estado (`Edit`, `Write`, `Bash`) van en secuencia. Una custom tool corre en secuencia salvo que tenga `readOnlyHint` en sus annotations.

## El error típico que el examen quiere que cometas

**Mandar cada `tool_result` en su propio mensaje `user`.** Parece prolijo, pero la doc lo marca como el problema más común: "Wrong: a separate user message for each tool result". Ese historial le "enseña" a Claude a no hacer llamadas en paralelo, y la latencia sube.

Otros clásicos:

- **Poner texto antes de los `tool_result`** ("Acá tenés los resultados:"). Da error 400. Los `tool_result` van PRIMERO en el `content`.
- **Olvidarte un `tool_result`** porque esa tool no la corriste. Error: `tool_use ids were found without tool_result blocks immediately after`. Siempre uno por cada `tool_use`, aunque sea con `is_error: true`.
- **Buscar un parámetro top-level** tipo `parallel_tool_calls`. No existe. Para apagar el paralelismo, `disable_parallel_tool_use` va **dentro** de `tool_choice`.
- **Cortar el bucle porque vino texto.** Una respuesta puede traer texto Y `tool_use`. Lo que manda es `stop_reason`, no si hay texto.

## Ejemplo

Respuesta de Claude:

```json
{ "stop_reason": "tool_use",
  "content": [
    { "type": "text", "text": "Consulto los dos..." },
    { "type": "tool_use", "id": "toolu_01", "name": "get_weather", "input": {"location": "San Francisco, CA"} },
    { "type": "tool_use", "id": "toolu_02", "name": "get_weather", "input": {"location": "New York, NY"} }
  ] }
```

Lo que mandás de vuelta (después de agregar esa respuesta como mensaje `assistant`):

```json
{ "role": "user", "content": [
  { "type": "tool_result", "tool_use_id": "toolu_01", "content": "68°F, partly cloudy" },
  { "type": "tool_result", "tool_use_id": "toolu_02", "content": "45°F, clear skies" }
] }
```

Si querías texto extra, va **después** de los dos `tool_result`.

## Para recordar

- `stop_reason == "tool_use"` → seguís el bucle. `end_turn` → terminaste.
- N `tool_use` → N `tool_result`, mismo `tool_use_id`, todos en UN mensaje `user`, antes de cualquier texto.
- Paralelo para lo independiente y de solo lectura; secuencial para lo que tiene efectos u orden.
- Para más paralelismo: system prompt pidiendo "invoke all relevant tools simultaneously". Para apagarlo: `disable_parallel_tool_use: true` dentro de `tool_choice`.
- Para medir: promedio de `tool_use` por respuesta con tools; si funciona, da más de 1.
