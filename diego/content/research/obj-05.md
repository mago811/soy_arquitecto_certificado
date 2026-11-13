# Research — Objetivo 5: restricciones de tools, scoping de contexto y system prompts de subagentes

Fecha: 2026-11-13.

## URLs leídas
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/agent-sdk/subagents

## Citas textuales
### Tools
- "To restrict tools, use the `tools` field as an allowlist or the `disallowedTools` field as a denylist. If both are set, `disallowedTools` is applied first, then `tools` is resolved against the remaining pool."
- "`tools` | No | Tools the subagent can use ... Inherits every tool available to subagents if omitted."
- "A `disallowedTools` entry with a specifier, such as `Bash(git push *)`, still removes the whole tool from the subagent, not only the matching commands. To keep Bash and block specific commands, add a Bash deny rule such as `Bash(git push *)` to `permissions.deny` in your settings. The rule applies to the main conversation and to subagents."
- SDK: "A tool you leave out isn't in the subagent's session at all: Claude works without it, with no permission prompt or error."
- SDK: "**Tool restrictions**: subagents can be limited to specific tools, reducing the risk of unintended actions. A `doc-reviewer` subagent might only have access to Read and Grep tools, ensuring it can analyze but never accidentally modify your documentation files."

### Contexto
- SDK: "The only content you pass from parent to subagent is the Agent tool's prompt string, so include any file paths, error messages, or decisions the subagent needs directly in that prompt."
- "Each subagent starts with a fresh, isolated context window. It doesn't see your conversation history, the skills you've already invoked, or the files Claude has already read."
- "`omitClaudeMd` | No | Set to `true` to start this subagent without the user, project, and local CLAUDE.md files in its initial context ... Use it for subagents that take everything they need from the delegation prompt."
- MCP: "To keep an MCP server out of the main conversation entirely and avoid its tool descriptions consuming context there, define it inline here rather than in `.mcp.json`. The subagent gets the tools; the parent conversation doesn't."

### System prompt
- "The frontmatter defines the subagent's metadata and configuration. The body becomes the system prompt that guides the subagent's behavior. Subagents receive only this system prompt plus basic environment details like the working directory, not the Claude Code system prompt."
- "`description` | Yes | When Claude should delegate to this subagent"
- SDK: "`prompt` | `string` | Yes | The agent's system prompt defining its role and behavior"
- "Those descriptions take up context, so keep them short. ... move detail into each subagent's system prompt, which only loads when that subagent runs."

## No usado
- No afirmé nada sobre `permissionMode: plan` como mecanismo de "read-only" para un reviewer en preguntas, para no generar dos respuestas correctas.
