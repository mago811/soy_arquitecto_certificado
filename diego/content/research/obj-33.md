# Research — Objetivo 33 (repartir herramientas entre subagentes)

Fecha de lectura: 2026-11-13. Páginas leídas en su versión Markdown (`<url>.md`).

## URLs consultadas

- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/agent-sdk/subagents
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools (best practices)
- research/exam-guide.md: task 2.3 "Restricting each subagent's tool set to those relevant to its role"

## sub-agents (Claude Code)

- "Each subagent runs in its own context window with a custom system prompt, specific tool access, and independent permissions."
- Beneficios: "**Enforce constraints** by limiting which tools a subagent can use"
- Ejemplo quickstart: `tools: Read, Grep, Glob` para un revisor read-only.
- Frontmatter `tools`: "Tools the subagent can use, as a comma-separated string such as `Read, Grep, Bash` or a YAML list. Inherits every tool available to subagents if omitted."
- `disallowedTools`: "Tools to deny, removed from inherited or specified list. Same format as `tools`. An entry with a specifier, such as `Bash(git push *)`, still removes the whole tool"
- "To restrict tools, use the `tools` field as an allowlist or the `disallowedTools` field as a denylist. If both are set, `disallowedTools` is applied first, then `tools` is resolved against the remaining pool. A tool listed in both is removed."
- "This example uses `tools` to allow only Read, Grep, Glob, and Bash. The subagent can't edit files, write files, or use any MCP tools"
- "This example uses `disallowedTools` to inherit the subagent's tool pool except Write and Edit. The subagent keeps Bash, MCP tools, and the rest of its pool"
- MCP por servidor: `tools: mcp__github__*` (todas las de un server), `disallowedTools: mcp__github` o `mcp__github__*`, `disallowedTools: mcp__*` (todas las MCP).
- "A `disallowedTools` entry with a specifier, such as `Bash(git push *)`, still removes the whole tool from the subagent, not only the matching commands. To keep Bash and block specific commands, add a Bash deny rule such as `Bash(git push *)` to `permissions.deny` in your settings."
- "When nothing in the `tools` list resolves to a tool … Claude Code usually refuses to launch the subagent"
- `mcpServers` en el subagente: "To keep an MCP server out of the main conversation entirely and avoid its tool descriptions consuming context there, define it inline here rather than in `.mcp.json`. The subagent gets the tools; the parent conversation doesn't."
- "If you omit `Agent` from the `tools` list entirely, the agent can't spawn any subagents with the Agent tool." (para agentes que corren como main thread con `claude --agent`).
- "Claude uses each subagent's description to decide when to delegate tasks."
- Cuándo usar subagentes: "You want to enforce specific tool restrictions or permissions".
- Scopes de archivos: `.claude/agents/` (proyecto, se commitea), `~/.claude/agents/` (todos tus proyectos), `--agents` (sesión), managed, plugin.

## agent-sdk/subagents

- "**Tool restrictions**: subagents can be limited to specific tools, reducing the risk of unintended actions. A `doc-reviewer` subagent might only have access to Read and Grep tools, ensuring it can analyze but never accidentally modify your documentation files."
- AgentDefinition: `tools` "Array of allowed tool names. If omitted, inherits every tool available to subagents"; `disallowedTools` "Array of tool names to remove from the agent's tool set. MCP server-level patterns are also accepted".
- "A tool you leave out isn't in the subagent's session at all: Claude works without it, with no permission prompt or error."
- Tabla "Common tool combinations": Read-only analysis → `Read`, `Grep`, `Glob`; Test execution → `Bash`, `Read`, `Grep`; Code modification → `Read`, `Edit`, `Write`, `Grep`, `Glob`; Full access → omitir `tools`.
- "Claude invokes subagents through the `Agent` tool." Ejemplos ponen `"Agent"` en `allowedTools` del agente principal.
- "Write clear, specific descriptions so Claude can match tasks to the right subagent."

## Muchas herramientas y selección

- tool-search-tool: "**Tool selection accuracy:** Claude's ability to pick the right tool degrades once you exceed 30–50 available tools."
- define-tools: "Fewer, more capable tools reduce selection ambiguity and make your tool surface easier for Claude to navigate."

## No respaldado

- La expresión "reducir la complejidad de decisión" es de la guía del examen; la doc respalda la idea con la cita de tool-search (precisión de selección cae con 30–50 tools) y la de define-tools (menos tools, menos ambigüedad).
