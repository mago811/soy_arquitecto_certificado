# Research — Objetivo 6: diagnosticar subagentes que no arrancan

Fecha: 2026-11-13.

## URLs leídas
- https://code.claude.com/docs/en/agent-sdk/subagents ("Subagents in the SDK") — existe. (No hizo falta platform.claude.com: la doc canónica del Agent SDK está en code.claude.com.)
- https://code.claude.com/docs/en/agent-sdk/python (referencia `AgentDefinition`, `ClaudeAgentOptions`)
- https://code.claude.com/docs/en/agent-sdk/typescript (referencia `AgentDefinition`, `Options`)
- https://code.claude.com/docs/en/agent-sdk/permissions (flujo de evaluación de permisos)
- https://code.claude.com/docs/en/agent-sdk/claude-code-features (`settingSources`)
- https://code.claude.com/docs/en/sub-agents (frontmatter, "Subagent files Claude Code skips", `Agent(...)`)
- https://code.claude.com/docs/en/errors (secciones "Agent would be spawned with zero tools", "subagent_type is required")

## Nombre de la herramienta: `Agent` (antes `Task`)
- sub-agents: "In version 2.1.63, the Task tool was renamed to Agent. Existing `Task(...)` references in settings and agent definitions still work as aliases."
- agent-sdk/subagents: "Define subagents directly in your code using the `agents` parameter. Claude invokes subagents through the `Agent` tool."
- "The tool appears as `\"Agent\"` in `tool_use` blocks but as `\"Task\"` in the `system:init` tools list. Before Claude Code v2.1.63, `tool_use` blocks also named it `\"Task\"`. To keep detection working across SDK versions, match both values in `block.name`."
- Todos los ejemplos del coordinador usan `allowed_tools=["Read", "Grep", "Glob", "Agent"]` con el comentario "# Auto-approve these tools".

## AgentDefinition (campos exactos)
Python (dataclass): `description: str`, `prompt: str`, `tools`, `disallowedTools`, `model`, `skills`, `memory`, `mcpServers`, `initialPrompt`, `maxTurns`, `background`, `effort`, `permissionMode`.
TypeScript agrega: `autoCompactWindow`, `omitClaudeMd`, `criticalSystemReminder_EXPERIMENTAL`.
- Requeridos: "`description` | `string` | Yes | Natural language description of when to use this agent" / "`prompt` | `string` | Yes | The agent's system prompt defining its role and behavior"
- Python: "`AgentDefinition` field names use camelCase, such as `disallowedTools`, `permissionMode`, and `maxTurns`. ... Because `AgentDefinition` is a dataclass, passing a snake_case keyword raises a `TypeError` at construction time."
- "`tools` | `string[]` | No | Array of allowed tool names. If omitted, inherits every tool available to subagents"

## allowedTools ≠ restricción
- TS `Options.allowedTools`: "Tools to auto-approve without prompting ... This does not restrict Claude to only these tools. ... Other unlisted tools fall through to `permissionMode` and `canUseTool`. Use `disallowedTools` to block tools."
- permissions: "`disallowed_tools=[\"Bash\"]` | The `Bash` tool definition is removed from the request."
- permissions paso 6: "In `dontAsk` mode, this step is skipped and the tool is denied"
- sub-agents tabla de modos: "`dontAsk` | Auto-denies calls that would prompt ... Explicitly allowed tools still work."
=> Coordinador en `dontAsk` sin `"Agent"` en `allowedTools`: la llamada al Agent tool se deniega. Con `disallowedTools: ["Agent"]`: la herramienta ni existe.

## Errores documentados
- "Agent 'code-reviewer' would be spawned with zero tools — refusing. Its tools list resolved to nothing: unrecognized [Grpe]. Fix the agent's tools frontmatter or pass a different subagent_type."
- "Omitting the `tools` field never triggers this refusal."
- "subagent_type is required: the general-purpose agent is not available in this session." — casos: "`CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` is set in non-interactive mode" o un allowlist `tools: Agent(...)` del main-thread agent que deja afuera `general-purpose`.

## Archivos de subagentes que se saltean
- "Only `name` and `description` are required."
- "**A `name` but no `description`**: Claude Code skips the file and writes the reason to the debug log."
- "**No `name`**: Claude Code treats the file as documentation kept beside your agents."
- "The filename doesn't have to match."
- agent-sdk/subagents troubleshooting: "**New `agents` directory**: the watcher covers only directories that existed when the session started, so the first file in a new directory needs a session restart. This is the most common cause."
- "**A programmatic agent with the same name**: `agents` passed to `query()` override a filesystem agent with the same name."

## settingSources
- claude-code-features: "When you omit `settingSources`, `query()` reads the same filesystem settings as the Claude Code CLI: user, project, and local settings, CLAUDE.md files, and `.claude/` skills, agents, and commands. To run without these, pass `settingSources: []`, which limits the agent to what you configure programmatically."

## Restringir qué subagentes se lanzan
- "When an agent runs as the main thread with `claude --agent`, it can spawn subagents using the Agent tool. To restrict which subagent types it can spawn, use `Agent(agent_type)` syntax in the `tools` field."
- "This is an allowlist: only the `worker` and `researcher` subagents can be spawned. If the agent tries to spawn any other type, the request fails and the agent sees only the allowed types in its prompt."
- "If you omit `Agent` from the `tools` list entirely, the agent can't spawn any subagents with the Agent tool."

## Delegación
- "If Claude completes tasks directly instead of delegating to your subagent: **Use explicit prompting** ... **Write a clear description**: explain exactly when to use the subagent so Claude can match tasks appropriately"

## No respaldado / no usado
- No encontré en la doc qué pasa exactamente con una llamada a `Agent` no listada en `allowedTools` cuando el modo es `default` y NO hay `canUseTool` (sin prompt posible). No lo usé; los escenarios usan `dontAsk`, `permissionPrompts: 'none'` o `disallowedTools`, que sí están documentados.
- La consigna decía "Task/Agent en allowed tools": la doc actual nombra la herramienta `Agent`; `Task` queda como alias (y como nombre en `system:init`).
