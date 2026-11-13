# Research — Objetivo 24 (pasadas de revisión separadas por tema, con few-shot propio)

Fecha de lectura: 2026-11-13. Páginas leídas en su versión Markdown (`<url>.md`).

## URLs consultadas

- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices (las viejas URLs multishot-prompting, be-clear-and-direct y chain-prompts redirigen acá)
- https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/code-review
- https://code.claude.com/docs/en/code-review-customize
- https://code.claude.com/docs/en/best-practices
- Guía del examen (research/exam-guide.md): task statement 4.6 "Design multi-instance and multi-pass review architectures"

## Partir la tarea en prompts de un solo tema

- "Break down complex tasks into smaller, consistent subtasks. Each prompt then covers a single subtask, reducing inconsistency errors across scaled workflows." (increase-consistency, "Chain prompts for complex tasks")
- "Explicit prompt chaining (breaking a task into sequential API calls) is still useful when you need to inspect intermediate outputs or enforce a specific pipeline structure." (claude-prompting-best-practices, "Chain complex prompts")
- "The most common chaining pattern is self-correction: generate a draft → have Claude review it against criteria → have Claude refine based on the review. Each step is a separate API call so you can log, evaluate, or branch at any point." (claude-prompting-best-practices)

## Few-shot dedicado por pasada

- "Examples are one of the most reliable ways to steer Claude’s output format, tone, and structure. A few well-crafted examples (known as few-shot or multishot prompting) improve accuracy and consistency." (claude-prompting-best-practices)
- "Relevant: Mirror your actual use case closely." / "Diverse: Cover edge cases and vary enough that Claude doesn’t pick up unintended patterns." / "Structured: Wrap examples in `<example>` tags (multiple examples in `<examples>` tags) so Claude can distinguish them from instructions." (claude-prompting-best-practices)
- "Include 3–5 examples for best results." (claude-prompting-best-practices)
- "Provide examples of the output you want. This is more effective than abstract instructions." (increase-consistency)

## Reportar todo y filtrar en otra pasada (recall vs. instrucciones restrictivas)

- "If your review prompt says “only report high-severity issues” or “be conservative,” the model might follow that instruction literally and report less; ask it to report everything and filter in a separate pass instead." (prompting-claude-opus-5)
- "Accuracy holds at lower effort settings, which supports a fast pass at review time and a more thorough pass later." (prompting-claude-opus-5)

## Subagentes especializados en Claude Code

- "Each subagent runs in its own context window with a custom system prompt, specific tool access, and independent permissions." (sub-agents)
- "Specialize behavior with focused system prompts for specific domains" (sub-agents)
- "Claude uses each subagent's description to decide when to delegate tasks." (sub-agents)
- Ejemplo de la doc: `.claude/agents/code-reviewer.md` con `tools: Read, Glob, Grep` y `model: sonnet`. "The body becomes the system prompt that guides the subagent's behavior." (sub-agents)
- "Nested subagents suit a delegated task that itself splits into parallel subtasks, such as a reviewer subagent that dispatches a verifier per finding." (sub-agents)

## Code Review (servicio) usa varios agentes + verificación

- "Several agents read each change alongside the surrounding code, looking for issues such as logic errors, security vulnerabilities, or broken edge cases. A verification step checks findings against the code before they're reported." (code-review)
- "Find: several agents examine the diff and the surrounding code in parallel." / "Verify: a verification step checks the candidate findings against the code and filters out false positives." (code-review)
- REVIEW.md puede partirse por tema con includes: ejemplo `@review-security.md` y `@review-api.md` en el root `REVIEW.md` (code-review-customize). Ojo: eso ORGANIZA las instrucciones de una misma review, no crea pasadas separadas.

## Reviewer independiente

- "By someone who didn't write the code: in the terminal, `/code-review` reviews the diff in a fresh subagent that never saw your conversation. It isn't swayed by the reasoning that produced the code." (best-practices)

## Lo que NO encontré textual en la doc

- La frase "recall trade-offs from competing concerns in a single prompt" no aparece en la doc oficial. Es el framing del objetivo. Lo más cercano: "Each prompt then covers a single subtask, reducing inconsistency errors" (increase-consistency) y "report everything and filter in a separate pass" (prompting-claude-opus-5). Las preguntas apoyan la respuesta en esas citas; la lección marca que el "por qué" de recall es inferencia.
