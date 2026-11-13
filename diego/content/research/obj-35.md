# Research — Objetivo 35 (integrar MCP: scope, env vars, descubrimiento de tools)

Fecha de lectura: 2026-11-13. Páginas leídas en su versión Markdown (`<url>.md`).

## URLs consultadas

- https://code.claude.com/docs/en/mcp
- https://code.claude.com/docs/en/agent-sdk/mcp
- research/exam-guide.md: task 2.4 "MCP server scoping: project-level (.mcp.json) … vs user-level (~/.claude.json)"

## Scopes (code.claude.com/docs/en/mcp)

- Tabla: Local → "Current project only" / Shared "No" / `~/.claude.json` · Project → "Current project only" / "Yes, via version control" / `.mcp.json` in project root · User → "All your projects" / "No" / `~/.claude.json`.
- "Local scope is the default. A local-scoped server loads only in the project where you added it and stays private to you." … "Use local scope for personal development servers, experimental configurations, or servers with credentials you don't want in version control."
- Nota: "MCP local-scoped servers are stored in `~/.claude.json` (your home directory), while general local settings use `.claude/settings.local.json`".
- "Project-scoped servers enable team collaboration by storing configurations in a `.mcp.json` file at your project's root directory." … "Check `.mcp.json` into version control so everyone on your team gets the same MCP tools and services."
- `claude mcp add --transport http shared-server --scope project https://example.com/mcp`
- "For security reasons, Claude Code prompts for approval in interactive sessions before using project-scoped servers from `.mcp.json` files. To reset those approval choices, run `claude mcp reset-project-choices`."
- "In `claude -p` runs, Agent SDK sessions, and cloud sessions … Claude Code can't show that prompt: it loads project-scoped servers without asking."
- "User-scoped servers are stored in `~/.claude.json` and provide cross-project accessibility … This scope works well for personal utility servers, development tools, or services you frequently use across different projects."
- Precedencia: "When the same server is defined in more than one place, Claude Code connects to it once, using the definition from the highest-precedence source. The entire server entry from that source is used; fields are not merged across scopes." 1. Local 2. Project 3. User 4. Plugin 5. claude.ai connectors.
- Warning "Same name in more than one scope" … "remove the others with `claude mcp remove <name> --scope <scope>`".

## Comandos

- `claude mcp add --transport http <name> <url>`; `--header "Authorization: Bearer your-token"`.
- stdio: `claude mcp add [options] <name> -- <command> [args...]`; "`--` (double dash) separates Claude's own options, such as `--transport`, `--env`, and `--scope`, from the command and arguments that run the server."
- `--env KEY=value`.
- `claude mcp list`, `claude mcp get <name>`, `claude mcp remove <name>`, `/mcp` "(within Claude Code) Check server status".
- `claude mcp add-json` (sección "Add MCP servers from JSON configuration").
- "A JSON entry that has a `url` but no `type` is a configuration error, because Claude Code reads an entry with no `type` as a stdio server."

## Variables de entorno en `.mcp.json`

- "Claude Code supports environment variable expansion in `.mcp.json` files, allowing teams to share configurations while maintaining flexibility for machine-specific paths and sensitive values like API keys."
- "You can reference an environment variable in a server's `command`, `args`, `env`, `url`, or `headers` value"
- "`${VAR}`: expands to the value of environment variable `VAR`" / "`${VAR:-default}`: expands to the value of `VAR` if `VAR` is set, or to `default` if it is unset"
- Ejemplo: `"url": "${API_BASE_URL:-https://api.example.com}/mcp"`, `"Authorization": "Bearer ${API_KEY}"`.
- "If a referenced environment variable isn't set and has no default value, the config still loads: Claude Code reports a missing-variable warning for that server in `claude mcp list` output and uses the unexpanded `${VAR}` text as-is."
- "If you set a variable to an empty string, it counts as set, so a `${VAR:-default}` reference expands to the empty string rather than to `default`." … "To use the default, unset the variable rather than setting it to an empty string."
- "In a remote server's `url` and `headers`, Claude Code reads credential variables from your environment as empty rather than expanding them." … "If you write `Bearer ${ANTHROPIC_AUTH_TOKEN}`, the server receives `Bearer ` with no credential and rejects the request, usually with a `401`." … "To give the server one of the covered credentials, copy it into a variable with a name of your own and reference that name instead."
- `/mcp` y `claude mcp list` muestran las referencias `${VAR}` por nombre, no el valor.

## Verificar

- "`claude mcp list` shows a health status next to each server it lists, such as `✔ Connected`, `! Needs authentication`, or `✘ Failed to connect`."
- "`⏸ Pending approval (run `claude` to approve)`: a project-scoped server from `.mcp.json` that you haven't approved yet."
- "The `claude mcp add` command saves the configuration without validating credentials, so a placeholder value is accepted here but the server fails to connect later. To verify the connection, run `/mcp` and check that the server's row shows a checkmark."
- "The `/mcp` panel shows the tool count next to each connected server and flags servers that advertise the tools capability but expose no tools."

## Agent SDK (code.claude.com/docs/en/agent-sdk/mcp)

- "You can configure MCP servers in code when calling `query()`, or in a `.mcp.json` file loaded via `settingSources`."
- "The file is picked up when the `project` setting source is enabled, which it is for default `query()` options. If you set `settingSources` explicitly, include `"project"` for this file to load."
- "MCP tools require explicit permission before Claude can use them. Without permission, Claude will see that tools are available but won't be able to call them."
- "MCP tools are named `mcp__<server-name>__<tool-name>`"; `allowedTools: ["mcp__github__*"]`.
- "Prefer `allowedTools` over permission modes for MCP access. `permissionMode: "acceptEdits"` does not auto-approve MCP tools".
- "To see what tools an MCP server provides, check the server's documentation or inspect the `tools` array in the `system` init message."
- Auth: "Use the `env` field to pass API keys, tokens, and other credentials to the MCP server" — `"env": { "API_KEY": "${API_KEY}" }` y "The `${API_KEY}` syntax expands environment variables at runtime."
- "The `status` field can be `"pending"`, `"connected"`, `"failed"`, `"needs-auth"`, or `"disabled"`." "Check for `"failed"` or `"needs-auth"` to detect servers that won't be usable".
- "The SDK doesn't open a browser or run an interactive OAuth flow."
- "a `status` of `connected` for `github` confirms the token works … If the status is `failed` or `needs-auth`, see Error handling before trusting the result, since Claude can fall back to built-in tools when the server is unavailable."

## No respaldado

- Nada relevante pendiente. No usé flags que no aparezcan en estas páginas.
