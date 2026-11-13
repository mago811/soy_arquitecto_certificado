# Research — Objetivo 27 (tool use con JSON schema + tool_choice para garantizar la invocación)

Fecha de lectura: 2026-11-13. Páginas leídas completas en su versión Markdown (`<url>.md`).

## URLs consultadas

- https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools (destino de la redirección de `.../implement-tool-use`)
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-reference
- https://platform.claude.com/docs/en/api/errors (sección "Forced tool use not supported")
- https://platform.claude.com/docs/en/build-with-claude/thinking (sección "Response prefill and forced tool use")
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs

## Definición de una tool
- Campos: `name` ("Must match the regex ^[a-zA-Z0-9_-]{1,128}$"), `description`, `input_schema` ("A JSON Schema object defining the expected parameters for the tool"), `input_examples` (opcional). Propiedades extra: `cache_control`, `strict`, `defer_loading`, `allowed_callers`. (define-tools)
- "Provide extremely detailed descriptions. This is by far the most important factor in tool performance." (define-tools)

## tool_choice: los cuatro valores
- "auto allows Claude to determine whether to call any provided tools. This is the default value when tools are provided." (define-tools)
- "any tells Claude that it must use one of the provided tools, but doesn't force a particular tool." (define-tools)
- "tool forces Claude to always use a particular tool." (define-tools)
- "none prevents Claude from using any tools. This is the default value when no tools are provided." (define-tools)
- Sintaxis Python en la doc: `tool_choice={"type": "tool", "name": "get_weather"}`.

## auto puede contestar en texto; prompt orienta, tool_choice garantiza
- "With the default tool_choice of {"type": "auto"}, Claude determines on each turn whether to call a tool or respond directly." (overview)
- "This boundary is steerable through your system prompt." ... "Always call a tool first before responding." pushes further. (overview)
- "To require a tool call rather than rely on prompting, set tool_choice." (overview)

## Efectos secundarios de forzar
- "Note that when you have tool_choice as any or tool, the API prefills the assistant message to force a tool to be used. This means that the models will not emit a natural language response or explanation before tool_use content blocks, even if explicitly asked to do so." (define-tools)
- "If you would like the model to provide natural language context or explanations while still requesting that the model use a specific tool, you can use {"type": "auto"} for tool_choice (the default) and add explicit instructions in a user message." (define-tools)
- "Forcing a tool also skips thinking on every model that accepts forced tool use: the response starts with the tool_use block and has no thinking block." (define-tools)

## Restricciones de modelo / thinking (MUY actual)
- "Not every model and setting supports forced tool use. Where it isn't supported, tool_choice: {"type": "any"} and tool_choice: {"type": "tool", "name": "..."} fail, whereas tool_choice: {"type": "auto"} (the default) and tool_choice: {"type": "none"} still work" (define-tools)
- Manual extended thinking (`thinking: {type: "enabled"}`): "any and tool are not supported and result in an error" (define-tools, tabla)
- "Claude Fable 5.2, Claude Mythos 5.2, Claude Opus 5.5, Claude Sonnet 5.5, Claude Fable 5.1, and Claude Mythos 5.1 don't support forced tool use. Sending tool_choice: {"type": "any"} or tool_choice: {"type": "tool", "name": "..."} to any of these models [...] returns a 400 invalid_request_error" (api/errors)
- "Use auto with strict tool use to keep tool inputs schema-valid, or structured outputs when you need the response itself in a fixed JSON shape." (api/errors)
- Tabla de tokens del overview: Claude Haiku 5.5 tiene 406 tokens para "any, tool" → acepta forced tool use. Opus 5.5 y Sonnet 5.5 tienen esa columna vacía.
- "Adaptive thinking itself doesn't block forced tool use (models with thinking on by default, such as Claude Opus 5 and Claude Haiku 5.5, accept it, but a forced call skips thinking" (define-tools)

## any + strict = llamada garantizada + inputs válidos
- "On models that support forced tool use, combine tool_choice: {"type": "any"} with strict tool use to guarantee both that one of your tools is called and that the tool inputs strictly follow your schema." (define-tools, Tip)

## Strict tool use
- "Setting strict: true on a tool definition guarantees Claude's tool inputs match your JSON Schema by constraining the model's token sampling to schema-valid outputs" (strict-tool-use)
- "Without strict mode, Claude might return incompatible types ("2" instead of 2) or omit required fields, breaking your functions and causing runtime errors." (strict-tool-use)
- "For example, suppose a booking system needs passengers: int. Without strict mode, Claude might provide passengers: "two" or passengers: "2". With strict: true, the response always contains passengers: 2." (strict-tool-use)
- Garantías: "Tool input strictly follows the input_schema" / "Tool name is always valid (from provided tools or server tools)" (strict-tool-use)
- "To eliminate invalid tool calls entirely, use strict tool use with strict: true on your tool definitions." (handle-tool-calls)

## Leer la respuesta
- "The response has a stop_reason of tool_use and one or more tool_use content blocks that include: id [...] name [...] input: An object containing the input being passed to the tool, conforming to the tool's input_schema." (handle-tool-calls)
- "Claude often comments on what it's doing or responds naturally to the user before calling tools." / "Your code should treat these responses like any other assistant-generated text, and not rely on specific formatting conventions." (define-tools)

## Tool como mecanismo de salida estructurada
- "Structured, guaranteed-shape outputs. When you need a JSON object with specific fields rather than prose that happens to contain the information, a tool schema enforces the shape." (how-tool-use-works)
- "if you're writing a regex to extract a decision from model output, that decision should have been a tool call." (how-tool-use-works)

## Lo que NO encontré
- Nada en la doc dice que `tool_choice` garantice que los VALORES sean correctos; strict garantiza forma, no verdad (inferencia: la doc solo habla de schema).
