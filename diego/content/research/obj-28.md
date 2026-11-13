# Research — Objetivo 28 (truncamiento de output estructurado: partir y mergear)

Fecha de lectura: 2026-11-13.

## URLs consultadas

- https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- https://platform.claude.com/docs/en/about-claude/models/overview
- https://platform.claude.com/docs/en/build-with-claude/thinking
- https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Guía del examen: "splitting large reviews into per-file local analysis passes" (task 4.6). Truncamiento/max_tokens no aparece como tema en la guía.

## Qué es el truncamiento

- "Claude stopped because it reached the `max_tokens` limit specified in your request." (handling-stop-reasons)
- Structured outputs, "Invalid outputs": "If the response is cut off because it reached the `max_tokens` limit:" / "The response has `stop_reason: "max_tokens"`." / "The output might be incomplete and not match your schema." / "Retry with a higher `max_tokens` value to get the complete structured output." (structured-outputs)
- Ojo: la doc SÍ recomienda subir `max_tokens` como primer remedio. El objetivo habla de no subirlo "beyond practical limits": cuando ya estás en el techo del modelo o el output crece con el tamaño del input.

## El techo

- Tabla de modelos: Claude Opus 5.5 → "Max output" "128K tokens" (models/overview)
- "Max output: Synchronous Messages API limit. On the Message Batches API, Claude Opus 5.5, ... support up to 300k output tokens with the output-300k-2026-03-24 beta header." (models/overview)
- Thinking: "the tokens Claude spends reasoning are billed as output tokens, even when the thinking text isn’t returned to you, and they count toward `max_tokens` alongside the response text." (thinking)
- "Thinking tokens count toward `max_tokens`, so set it high enough to leave room for both the thinking and the response text." (thinking)

## Partir en subtareas

- "Break down complex tasks into smaller, consistent subtasks. Each prompt then covers a single subtask, reducing inconsistency errors across scaled workflows." (increase-consistency)
- "Explicit prompt chaining (breaking a task into sequential API calls) is still useful when you need to inspect intermediate outputs or enforce a specific pipeline structure." (claude-prompting-best-practices)
- Structured outputs, para complejidad de schema: "Split into multiple requests. If you have many strict tools, consider splitting them across separate requests or subagents." (structured-outputs — contexto: límites de complejidad, no truncamiento)

## Continuar la respuesta

- "Raise `max_tokens` or continue the response." (tabla Quick reference, handling-stop-reasons)
- Patrón de la doc: reenviar el texto parcial como turno `assistant` + "Please continue from where you left off." (handling-stop-reasons, "Ensuring complete responses")
- "Handle truncated responses gracefully" — agregar aviso de que está incompleta (handling-stop-reasons)

## Tool use truncado

- "If Claude’s response is cut off because it hit the `max_tokens` limit, and the truncated response contains an incomplete tool use block, you’ll need to retry the request with a higher `max_tokens` value to get the full tool use." (handling-stop-reasons)

## Lo que NO encontré textual

- La doc oficial no dice "no subas max_tokens, partí la tarea". Ese criterio es del objetivo. En las preguntas lo planteo solo en escenarios donde subir no alcanza (ya está en 128K, el output crece con el tamaño del PR, o el thinking se come el presupuesto) y respaldo con las citas de techo y de chaining.
