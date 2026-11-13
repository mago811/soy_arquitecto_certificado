# Research — Objetivo 3 (prompts completos para subagentes)

Fecha de lectura: 2026-11-13.

## URLs consultadas

- https://code.claude.com/docs/en/agent-sdk/subagents
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/agent-sdk/python (input de la tool `Agent`)
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- https://www.anthropic.com/engineering/multi-agent-research-system
- Guía del examen (PDF; host no permitido por el validador, solo contexto)

## Guía del examen (TS 1.3)

- "That subagent context must be explicitly provided in the prompt—subagents do not automatically inherit parent context or share memory between invocations"
- "Including complete findings from prior agents directly in the subagent's prompt (e.g., passing web search results and document analysis outputs to the synthesis subagent)"
- "Using structured data formats to separate content from metadata (source URLs, document names, page numbers) when passing context between agents to preserve attribution"

## Agent SDK — subagents ("What subagents inherit")

- "Unless the subagent is a fork, its context window starts fresh, with no parent conversation, but isn't empty. The only content you pass from parent to subagent is the Agent tool's prompt string, so include any file paths, error messages, or decisions the subagent needs directly in that prompt."
- Tabla: recibe "Its own system prompt (`AgentDefinition.prompt`) and the Agent tool's prompt", "Project CLAUDE.md (loaded via `settingSources`)", "Tool definitions". NO recibe "The parent's conversation history or tool results", "Preloaded skill content, unless listed in `AgentDefinition.skills`", "The parent's system prompt".
- "Context isolation: each subagent runs in its own conversation, which starts fresh unless the subagent is a fork."
- Fork: "From Claude Code v2.1.302, Claude can start forks in your application with nothing configured, by calling the Agent tool with `subagent_type: "fork"`."

## Agent SDK — Python reference (tool Agent)

Input: `description`, `prompt` ("The task for the agent to perform"), `subagent_type`, `model`, `effort`, `run_in_background`, `name`, `isolation`, ...

## Claude Code — sub-agents ("Manage subagent context")

- "Each subagent starts with a fresh, isolated context window. It doesn't see your conversation history, the skills you've already invoked, or the files Claude has already read. Claude composes a delegation message that summarizes the task, and the subagent works from there. The exception is a fork, which inherits the parent conversation instead of starting fresh."
- "The main conversation still has your full CLAUDE.md when it reads these subagents' results, so most rules don't need to reach the subagent itself. If a rule must, such as "ignore the `vendor/` directory," restate it in the prompt you give Claude when delegating."
- Lo que nunca llega a un subagente no-fork: output style, auto memory.
- Fork: "A fork is a subagent that inherits the entire conversation so far instead of starting fresh." ... "Use a fork when any other subagent would need too much background to be useful, or when you want to try several approaches in parallel from the same starting point."
- "Latency matters. A subagent that isn't a fork starts fresh and may need time to gather context"

## Prompting best practices (platform)

- "Think of Claude as a brilliant but new employee who lacks context on your norms and workflows. The more precisely you explain what you want, the better the result."
- "Key test: Show your prompt to a colleague with minimal context on the task and ask them to follow it. If they’d be confused, Claude will be too."
- Long context: "Put long-form data at the top: Place your long documents and inputs near the top of your prompt, above your query, instructions, and examples."
- "Structure document content and metadata with XML tags: When using multiple documents, wrap each document in `<document>` tags with `<document_content>` and `<source>` (and other metadata) subtags for clarity."
- "XML tags help Claude parse complex prompts unambiguously, especially when your prompt mixes instructions, context, examples, and variable inputs."
- "Providing context or motivation behind your instructions, such as explaining to Claude why such behavior is important, can give Claude more information about your goals"

## Post de ingeniería

- "Each subagent needs an objective, an output format, guidance on the tools and sources to use, and clear task boundaries."

## Lo que NO encontré

- No existe opción para "compartir memoria" entre subagentes no-fork, ni un flag tipo `inheritContext`. La única vía documentada es el prompt (o un fork, o archivos en disco que el subagente lee con sus tools).
