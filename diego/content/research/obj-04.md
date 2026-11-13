# Research — Objetivo 4 (delegar por objetivo vs. por pasos)

Fecha de lectura: 2026-11-13. Páginas leídas completas (en code.claude.com y platform.claude.com, versión `.md`).

## URLs consultadas

- https://www.anthropic.com/engineering/multi-agent-research-system (post oficial de ingeniería de Anthropic, "How we built our multi-agent research system")
- https://code.claude.com/docs/en/agent-sdk/subagents
- https://code.claude.com/docs/en/sub-agents
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices (las URLs `be-clear-and-direct`, `long-context-tips` y `chain-prompts` redirigen acá)
- Guía oficial del examen (PDF, ver research/exam-guide.md). OJO: el host del PDF (`everpath-course-content.s3-accelerate.amazonaws.com`) NO está en `OFFICIAL_HOSTS` del validador, así que no se usa como `source_url` de preguntas. Sí se usa como contexto.

## Guía del examen (Task Statement 1.3 y 1.2)

- "Designing coordinator prompts that specify research goals and quality criteria rather than step-by-step procedural instructions, to enable subagent adaptability" (TS 1.3, Skills)
- "Routing all subagent communication through the coordinator for observability, consistent error handling, and controlled information flow" (TS 1.2)
- "Risks of overly narrow task decomposition by the coordinator, leading to incomplete coverage of broad research topics" (TS 1.2)

## Post de ingeniería (multi-agent research system)

- "Each subagent needs an objective, an output format, guidance on the tools and sources to use, and clear task boundaries."
- "Without detailed task descriptions, agents duplicate work, leave gaps, or fail to find necessary information."
- "We started by allowing the lead agent to give simple, short instructions like 'research the semiconductor shortage,' but found these instructions often were vague enough that subagents misinterpreted the task or performed the exact same searches as other agents."
- "Simple fact-finding requires just 1 agent with 3-10 tool calls, direct comparisons might need 2-4 subagents with 10-15 calls each, and complex research might use more than 10 subagents with clearly divided responsibilities."
- "Early agents made errors like spawning 50 subagents for simple queries, scouring the web endlessly for nonexistent sources, and distracting each other with excessive updates."
- "Our prompting strategy focuses on instilling good heuristics rather than rigid rules."
- "the best prompts for these agents are not just strict instructions, but frameworks for collaboration that define the division of labor, problem-solving approaches, and effort budgets."
- "Even with identical starting points, agents might take completely different valid paths to reach their goal."
- "Instead of judging whether the agent followed a specific process, evaluate whether it achieved the correct final state."
- "Adding full production tracing let us diagnose why agents failed and fix issues systematically."
- "Subagents also plan, then use interleaved thinking after tool results to evaluate quality, identify gaps, and refine their next query. This makes subagents more effective in adapting to any task."

## Agent SDK — subagents

- "Claude decides on its own when to spawn a subagent and how many to spawn."
- Límites: `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`, `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, `maxBudgetUsd` / `max_budget_usd`.
- "Either instruction only steers Claude, so set the limits as well. Claude Code enforces them however Claude decides to delegate."
- `AgentDefinition.maxTurns`: "Maximum number of agentic turns before the agent stops. When the agent reaches the limit, Claude Code returns its output marked as partial"
- "Tool restrictions: subagents can be limited to specific tools, reducing the risk of unintended actions."

## Claude Code — sub-agents

- "Chain subagents: ... Each subagent completes its task and returns results to Claude, which then passes relevant context to the next subagent."

## Prompting best practices (platform)

- "Provide instructions as sequential steps using numbered lists or bullet points when the order or completeness of steps matters."
- "Explicit prompt chaining (breaking a task into sequential API calls) is still useful when you need to inspect intermediate outputs or enforce a specific pipeline structure."
- Research: "Provide clear success criteria: Define what constitutes a successful answer to your research question."
- "Prefer general instructions over prescriptive steps. A prompt such as “think thoroughly” often produces better reasoning than a hand-written step-by-step plan." (sección de thinking; se usa solo como apoyo)

## Lo que NO encontré en la doc

- No hay un parámetro ni flag "goal mode" / "procedural mode": la diferencia es 100% de cómo se escribe el prompt de delegación.
- Nada en la doc dice que los subagentes puedan "reportar progreso intermedio" al coordinador de forma estándar salvo `SendMessage` y los eventos de tareas; no lo usé como respuesta.
