---
objective: 21
title: "Conversaciones largas sin perder lo importante"
rule: "Lo que tiene que ser exacto (montos, fechas, IDs) va en un bloque de estado estructurado que no se resume nunca; lo demás se compacta o se limpia."
sources:
  - url: https://platform.claude.com/docs/en/build-with-claude/context-windows
    title: "Context windows"
  - url: https://platform.claude.com/docs/en/build-with-claude/compaction
    title: "Compaction overview"
  - url: https://platform.claude.com/docs/en/build-with-claude/context-editing
    title: "Context editing"
  - url: https://platform.claude.com/docs/en/build-with-claude/working-with-messages
    title: "Using the Messages API"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices (Long context prompting, State management)"
  - url: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
    title: "Effective context engineering for AI agents"
  - url: https://www.anthropic.com/engineering/writing-tools-for-agents
    title: "Writing effective tools for agents"
  - url: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
    title: "Guía oficial del examen (Task Statement 5.1)"
status: verificada
---

## Qué es

Arrancá por lo básico: **la Messages API es stateless**. No recuerda nada. En cada request mandás el historial completo. Por eso la conversación crece en cada turno, y con ella el costo y el ruido.

Y más contexto no es mejor contexto. La doc lo dice así: "more context isn’t automatically better". A medida que crecen los tokens, la precisión y el recall bajan (*context rot*). La guía del examen agrega un nombre: **"lost in the middle"** (lo del medio de un input largo es lo que más se pierde). Ojo: ese término es de la guía, no de la doc; la doc habla de context rot y de dónde poner los documentos largos.

Entonces el trabajo no es "meter todo", es **curar** qué entra. Las técnicas:

| Técnica | Qué hace | Cuándo | Ojo con |
|---|---|---|---|
| **Compactación** (resumen) | Reemplaza turnos viejos por un resumen. Puede dejar los últimos turnos textuales | Conversación larga en general. Es la estrategia principal según la doc | Resumir varias veces diluye números, fechas y promesas |
| **Bloque de estado estructurado** ("case facts", en la jerga de la guía del examen) | JSON con montos, fechas, IDs, estados. Va en cada request, fuera del resumen | Datos que tienen que ser exactos | Hay que actualizarlo vos (o la app), no el resumidor |
| **Recortar outputs de tools** | La tool devuelve solo los campos que importan | Tools que devuelven 40 campos y usás 5 | Recortar en la tool, antes de que entre al contexto |
| **Context editing** (`clear_tool_uses_20250919`) | La API borra resultados de tools viejos y deja un placeholder | Agentes con muchas tools cuyos resultados ya se procesaron | `exclude_tools` para lo que nunca se debe borrar |
| **Ventana deslizante** cruda (FIFO) | Tira los mensajes más viejos | Casi nunca sola | Pierde la consigna y los requisitos del principio |

## Cuándo se usa

- **"El agente redondeó USD 1.247,83 a 'unos mil'"** → bloque de datos del caso, en JSON, en cada prompt. La doc: usá "JSON or other structured formats" para el estado.
- **"El contexto se llena de resultados de `lookup_order`"** → la tool devuelve solo lo relevante ("return only high signal information"). Si además hay muchos resultados viejos: context editing.
- **"La síntesis ignora los informes del medio"** → documentos arriba, cada uno en `<document>` con `<source>`, y la pregunta al final. La doc: "Queries at the end can improve response quality by up to 30 percent".
- **"Contrato largo, respuestas imprecisas"** → pedí que primero cite los fragmentos relevantes en `<quotes>` y después responda.
- **"El resumen por defecto se come las promesas al cliente"** → prompt de resumen propio que diga qué conservar.
- **"El sintetizador recibe 6 transcripciones de 25k"** → que los subagentes devuelvan datos estructurados y condensados (hallazgos, citas, relevancia), no su razonamiento entero.

## El error típico que el examen quiere que cometas

1. **"Subí `max_tokens`"**: `max_tokens` es el techo de la SALIDA. No saca nada de la entrada.
2. **"Pasá a un modelo de 1M y listo"**: no arregla el context rot y encarece cada request.
3. **"Activá prompt caching y deja de contar"**: el caching cambia lo que pagás, no si los tokens ocupan la ventana.
4. **"La API guarda la conversación"**: cualquier opción con memoria server-side en la Messages API es falsa.
5. **"Resumí más seguido"**: más resúmenes = más pérdida de detalle.

## Ejemplo

Agente de devoluciones. Cada request lleva:

```text
system: instrucciones del agente
<case_facts>
{"order_id": "QX-88213", "amount": 1247.83, "currency": "USD",
 "refund_date": "2026-11-14", "status": "approved",
 "customer_expectation": "respuesta antes del viernes"}
</case_facts>
messages: [resumen de lo viejo] + últimos turnos textuales
```

La tool `lookup_order` devuelve 5 campos, no 45. Si hay muchas llamadas a tools, context editing limpia las viejas, con `get_case_facts` en `exclude_tools`.

## Para recordar

- API stateless → historial completo en cada request.
- Exacto → bloque estructurado, fuera del resumen. Resumible → compactación.
- Output de tool → recortado en la tool. Resultados viejos → `clear_tool_uses_20250919`.
- Input largo → datos arriba con tags, pregunta al final, citas antes de responder.
- `max_tokens`, 1M y caching no son fixes de calidad de contexto.
