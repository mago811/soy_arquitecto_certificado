# Research — Objetivo 18 (esquemas de salida de subagentes)

Fecha de lectura: 2026-11-13.

## URLs consultadas

- https://code.claude.com/docs/en/agent-sdk/structured-outputs
- https://code.claude.com/docs/en/agent-sdk/subagents (AgentDefinition, output del subagente)
- https://code.claude.com/docs/en/agent-sdk/python (`output_format`)
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- https://platform.claude.com/docs/en/build-with-claude/citations
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- https://www.anthropic.com/engineering/multi-agent-research-system
- Guía del examen (PDF; host no permitido por el validador)

## Guía del examen (TS 5.6)

- "Requiring subagents to output structured claim-source mappings (source URLs, document names, relevant excerpts) that downstream agents preserve through synthesis"
- "Requiring subagents to include publication or data collection dates in structured outputs to enable correct temporal interpretation"
- "Rendering different content types appropriately in synthesis outputs—financial data as tables, news as prose, technical findings as structured lists—rather than converting everything to a uniform format"
- "Completing document analysis with conflicting values included and explicitly annotated, letting the coordinator decide how to reconcile before passing to synthesis"
- Exercise 4: "each finding should include a claim, evidence excerpt, source URL/document name, and publication date"

## Agent SDK — structured outputs

- "Define a JSON Schema for the structure you need, and the SDK validates the output against it, re-prompting on mismatch. If validation does not succeed within the retry limit, the result is an error instead of structured data"
- "pass it to `query()` via the `outputFormat` option (TypeScript) or `output_format` option (Python). When the agent finishes, the result message includes a `structured_output` field with validated data matching your schema."
- "Structured outputs give you typed data you can pass directly to your application logic, database, or UI components."
- "The SDK validates schemas with JSON Schema draft-07, so schemas that declare a newer version are rejected."
- "The `format` keyword, such as `"format": "email"`, is accepted as an annotation and isn't enforced by the SDK's validator."
- Ejemplo TODO: "The schema includes optional fields (`author` and `date`) since git blame information might not be available for all files."
- `StructuredOutput` tool: "Read the validated data from `structured_output` on the result message rather than from a `tool_use` block"
- Subtypes: `success`, `error_max_structured_output_retries`.
- "A `success` subtype doesn't by itself mean the run produced an answer. Treat a result as a failure when the result's `is_error` is `true` or `structured_output` is absent"
- "Keep schemas focused. Deeply nested schemas with many required fields are harder to satisfy."
- "Match schema to task. If the task might not have all the information your schema requires, make those fields optional."

## Agent SDK — subagents

- Campos de `AgentDefinition`: description, prompt, tools, disallowedTools, model, skills, memory, mcpServers, initialPrompt, maxTurns, autoCompactWindow, background, omitClaudeMd, effort, permissionMode. **No hay campo de schema de salida** → para garantizar el formato de un "worker" hay que correrlo como su propio `query()` con `output_format`, o pedir el formato en el prompt (guía, no garantía).
- "The parent receives the subagent's final report, but may summarize it in its own response. To preserve subagent output verbatim in the user-facing response, include an instruction to do so in the prompt or `systemPrompt` option you pass to the main `query()` call."
- "only its final message returns to the parent"

## API — structured outputs

- "Structured outputs guarantee schema-compliant responses through constrained decoding"
- `output_config.format` (JSON outputs) y `strict: true` (strict tool use).
- Incompatible con Citations: "The API returns a 400 error if citations are enabled with `output_config.format`."
- Invalid outputs: refusal (`stop_reason: "refusal"`), `max_tokens` ("Retry with a higher `max_tokens` value"), enum casing ("Compare enum values case-insensitively").

## API — citations

- "Citations cannot be used together with structured outputs. If you enable citations on any user-provided document (`document` blocks or `search_result` blocks) and also include the `output_config.format` parameter (or the deprecated `output_format` parameter), the API returns a 400 error."
- "To get a citation for each extracted value, prompt Claude to answer with one line per field. Then parse the lines into structured data in your code."
- "Avoid user or system prompts that ask for only JSON, such as “Return only a JSON object, no other text.” A request with such a prompt succeeds, but the response might contain few or no citations."
- "Check that each field has a value and at least one citation. The API doesn't guarantee either."
- "`title` is limited in length, so the `context` field is useful for storing document metadata as text or stringified JSON."
- "`title` and `context` are optional fields that are passed to the model but not used toward cited content."
- "Because the API parses citations into the response formats described in the following sections and extracts `cited_text` directly, citations are guaranteed to contain valid pointers to the provided documents."
- PDFs: "Citations include the page number range (1-indexed)."; texto plano: rango de caracteres.
- "Set `citations.enabled=true` on each of your documents. Currently, citations must be enabled on all or none of the documents within a request."

## Prompting best practices

- "Use structured formats for state data ... Use unstructured text for progress notes" (estructura vs prosa)
- "Structure document content and metadata with XML tags"
- "Ground responses in quotes: For long document tasks, ask Claude to quote relevant parts of the documents first before carrying out its task."

## Post de ingeniería

- "Subagent output to a filesystem to minimize the ‘game of telephone.’ Direct subagent outputs can bypass the main coordinator for certain types of results, improving both fidelity and performance."
- "This prevents information loss during multi-stage processing and reduces token overhead from copying large outputs through conversation history."
- CitationAgent "processes the documents and research report to identify specific locations for citations. This ensures all claims are properly attributed to their sources."
- LLM judge: "citation accuracy (do the cited sources match the claims?)"

## Lo que NO pude respaldar con docs (solo en la guía del examen)

- "Tablas para datos financieros, prosa para noticias, listas para hallazgos técnicos" y "exigir fechas de publicación": solo están en la guía (PDF con host no permitido). Van en la lección como contexto del examen; ninguna pregunta depende solo de eso.
