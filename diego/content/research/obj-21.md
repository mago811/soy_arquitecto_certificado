# Research — Objetivo 21 (optimizar la ventana de contexto: resumen, ventana deslizante, estado estructurado, retención selectiva)

Fecha de lectura: 2026-11-13. Páginas leídas en su versión Markdown (`<url>.md`) o, para anthropic.com/engineering, el HTML convertido a texto.

## URLs consultadas

- https://platform.claude.com/docs/en/build-with-claude/context-windows
- https://platform.claude.com/docs/en/build-with-claude/compaction
- https://platform.claude.com/docs/en/build-with-claude/compaction-on-demand (solo hojeada: estructura del loop, no se usan parámetros en el contenido)
- https://platform.claude.com/docs/en/build-with-claude/compaction-keep-recent-turns (hojeada)
- https://platform.claude.com/docs/en/build-with-claude/context-editing
- https://platform.claude.com/docs/en/build-with-claude/working-with-messages
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices (la URL `.../long-context-tips` devuelve EXACTAMENTE la misma página: la sección "Long context prompting" vive ahí)
- https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- https://www.anthropic.com/engineering/writing-tools-for-agents
- Guía del examen (PDF linkeado desde https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification), Task Statement 5.1

## Guía del examen — Task Statement 5.1 (texto del PDF)

- Knowledge: "Progressive summarization risks: condensing numerical values, percentages, dates, and customer-stated expectations into vague summaries"
- "The "lost in the middle" effect: models reliably process information at the beginning and end of long inputs but may omit findings from middle sections"
- "How tool results accumulate in context and consume tokens disproportionately to their relevance (e.g., 40+ fields per order lookup when only 5 are relevant)"
- "The importance of passing complete conversation history in subsequent API requests to maintain conversational coherence"
- Skills: "Extracting transactional facts (amounts, dates, order numbers, statuses) into a persistent "case facts" block included in each prompt, outside summarized history"
- "Trimming verbose tool outputs to only relevant fields before they accumulate in context"
- "Placing key findings summaries at the beginning of aggregated inputs and organizing detailed results with explicit section headers to mitigate position effects"
- "Modifying upstream agents to return structured data (key facts, citations, relevance scores) instead of verbose content and reasoning chains when downstream agents have limited context budgets"

Nota: "lost in the middle" y "case facts" son vocabulario de la guía, NO aparecen en la doc oficial de la API. La doc respalda las técnicas (datos largos arriba / pregunta al final, citas primero, estado en formato estructurado), no el nombre.

## Context windows (platform)

- "A larger context window allows the model to handle more complex and lengthy prompts, but more context isn’t automatically better. As token count grows, accuracy and recall degrade, a phenomenon known as *context rot*."
- "Everything in the request counts toward the context window: the system prompt, every message in `messages` (including tool results, images, and documents), and your tool definitions."
- "For long-running conversations and agentic workflows, [server-side compaction] is the primary strategy for context management."
- Nota al pie: "Chat interfaces such as [claude.ai] can also manage the context window on a rolling “first in, first out” basis." (única mención de algo parecido a "ventana deslizante" en la doc).
- "If the input alone already exceeds the model’s context window, the API returns a 400 `invalid_request_error` (“prompt is too long”) on every model."
- "Cached prompt prefixes still occupy the context window: [prompt caching] changes what you pay for those tokens, not whether they count."

## Messages API stateless (working-with-messages)

- "The Messages API is stateless, which means that you always send the full conversational history to the API."

## Compaction (platform)

- "Compaction replaces the older turns of a conversation with a summary that Claude writes on the server, so you need no summarization code of your own."
- "it keeps the active context small, because response quality degrades as a conversation grows."
- Opciones: "Compaction that keeps recent turns: when the last few turns must reach Claude word for word. The summary covers only the older turns."
- "Write your own summarization prompt: when the default summary drops something a later turn needs. Your prompt replaces the default one."
- Beta header de on-demand: `compact-2026-09-04` y parámetro top-level `compaction` (NO lo usamos en preguntas ni labs: detalle de beta muy nuevo).

## Context editing (platform)

- Beta header: `context-management-2025-06-27`. Parámetro: `context_management={"edits": [{"type": "clear_tool_uses_20250919"}]}` (ejemplo Python de la página, con `client.beta.messages.create` y `betas=[...]`).
- "The `clear_tool_uses_20250919` strategy clears tool results when conversation context grows beyond your configured threshold."
- "Older tool results (such as file contents or search results) are no longer needed once Claude has processed them."
- "The API replaces each cleared result with placeholder text indicating to Claude that it was removed. By default, only tool results are cleared."
- Tabla de config: `trigger` (default 100,000 input tokens), `keep` (default 3 tool uses), `clear_at_least`, `exclude_tools` ("List of tool names whose tool uses and results should never be cleared. Useful for preserving important context."), `clear_tool_inputs` (default `false`).
- "Context editing is applied server-side before the prompt reaches Claude. Your client application maintains the full, unmodified conversation history."
- Con memory tool: "When your conversation context approaches the configured clearing threshold, Claude receives an automatic warning to preserve important information."
- Client-side compaction (SDK) — "Less ideal use cases: Tasks requiring precise recall of early conversation details ... Tasks that need to maintain exact state across many variables"
- Default summary prompt incluye "5. Context to Preserve: User preferences, domain-specific details, and commitments made."

## Prompting best practices (platform) — long context y estado

- "Put long-form data at the top: Place your long documents and inputs near the top of your prompt, above your query, instructions, and examples."
- "Queries at the end can improve response quality by up to 30 percent in tests, especially with complex, multidocument inputs."
- "When using multiple documents, wrap each document in `<document>` tags with `<document_content>` and `<source>` (and other metadata) subtags for clarity."
- "For long document tasks, ask Claude to quote relevant parts of the documents first before carrying out its task. This helps Claude focus on the relevant content and ignore the rest of the document."
- "Use structured formats for state data: When tracking structured information (such as test results or task status), use JSON or other structured formats to make schema requirements explicit to Claude."

## Engineering — effective context engineering

- "context rot: as the number of tokens in the context window increases, the model’s ability to accurately recall information from that context decreases." (en el HTML, "context rot" es un link; el texto plano queda partido)
- "The art of compaction lies in the selection of what to keep versus what to discard, as overly aggressive compaction can result in the loss of subtle but critical context whose importance only becomes apparent later."
- "One of the safest lightest touch forms of compaction is tool result clearing"
- "Each subagent might explore extensively, using tens of thousands of tokens or more, but returns only a condensed, distilled summary of its work (often 1,000-2,000 tokens)."

## Engineering — writing tools for agents

- "tool implementations should take care to return only high signal information back to agents."
- "We suggest implementing some combination of pagination, range selection, filtering, and/or truncation with sensible default parameter values for any tool responses that could use up lots of context."

## Lo que NO se pudo respaldar en doc oficial

- El término "lost in the middle" y "case facts block" (solo en la guía del examen).
- "Sliding window" como técnica recomendada: la doc solo menciona FIFO en interfaces de chat; lo que recomienda es compaction (que puede mantener los turnos recientes textuales).
