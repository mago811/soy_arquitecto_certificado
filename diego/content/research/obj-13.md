# Investigación — Objetivo 13: configuraciones de review con Claude Code (estándares, herramientas restringidas, salida estructurada)

Investigado el 13/11/2026. Páginas bajadas en Markdown (`<url>.md`) y leídas completas. Citas textuales (sin sintaxis de links).

## URLs leídas

| URL | Para qué |
|---|---|
| https://code.claude.com/docs/en/headless | `--output-format json`, `--json-schema`, `structured_output`, `--append-system-prompt`, piping del diff |
| https://code.claude.com/docs/en/cli-reference | `--tools`, `--allowedTools`, `--disallowedTools`, `--json-schema`, `--bare`, flags de system prompt |
| https://code.claude.com/docs/en/github-actions | Workflow de code review, `--comment`, `claude_args`, CLAUDE.md para estándares |
| https://code.claude.com/docs/en/code-review | Code Review gestionado, `REVIEW.md`, solo lectura, nunca aprueba/bloquea |
| https://code.claude.com/docs/en/memory | Dónde va el CLAUDE.md de proyecto |
| https://code.claude.com/docs/en/best-practices | Review en subagente fresco, "skip style", `--bare` y CLAUDE.md |
| https://code.claude.com/docs/en/agent-sdk/structured-outputs | `structured_output`, `error_max_structured_output_retries` |

## Cargar los estándares correctos

github-actions:
> "Create a CLAUDE.md file in your repository root to define code style guidelines, review criteria, project-specific rules, and preferred patterns. Claude follows these guidelines when creating PRs and responding to requests."
> "Keep your CLAUDE.md concise, since Claude reads it on every run"

memory, tabla:
> "Project instructions | ./CLAUDE.md or ./.claude/CLAUDE.md ... | Team-shared instructions for the project | Project architecture, coding standards, common workflows | Team members via source control"
> "User instructions | ~/.claude/CLAUDE.md | Personal preferences for all projects"

Trampa: `--bare` NO carga CLAUDE.md.
cli-reference: "Minimal mode: skip auto-discovery of hooks, skills, custom commands, subagents, installed plugins, MCP servers, auto memory, and CLAUDE.md so scripted calls start faster."
best-practices: "--bare skips hooks, skills, plugins, MCP servers, and CLAUDE.md files, the repo's as well as the machine's, so the run does the same thing wherever it runs."
headless (bare): "System prompt additions | --append-system-prompt, --append-system-prompt-file"

cli-reference:
> `--append-system-prompt-file`: "Load additional system prompt text from a file and append to the default prompt"
> `--system-prompt`: "Replace the entire system prompt with custom text"

headless:
> "Use --append-system-prompt to add instructions while keeping Claude Code's default behavior."
> Ejemplo: `gh pr diff "$1" | claude -p --append-system-prompt "You are a security engineer. Review for vulnerabilities." --output-format json`

code-review:
> "Which instructions it follows: REVIEW.md from the base or default branch and never from the pull request's own changes."
> "To change what it flags, add guidance files to your repository." (card: "Tune what gets flagged with REVIEW.md and CLAUDE.md files in your repository")

## Restringir herramientas

cli-reference:
> `--tools`: "Restrict which built-in tools Claude can use. Use "" to disable all, "default" for the default set, or tool names like "Bash,Edit,Read"." ... "The flag doesn't affect MCP tools; to deny those too, use --disallowedTools "mcp__*"."
> `--allowedTools`: "Tools that execute without prompting for permission ... To restrict which tools are available, use --tools instead."
> `--disallowedTools`: "Deny rules. A bare tool name removes the matching tools from Claude's context: "Edit" removes Edit, "*" removes every tool, and "mcp__*" removes every MCP tool."

headless:
> "Piping the diff means Claude doesn't need Bash permission to read it"
> "The trailing * enables prefix matching, so Bash(git diff *) allows any command starting with git diff. The space before * is important: without it, Bash(git diff*) would also match git diff-index."

## Salida estructurada

headless:
> "To get output conforming to a specific schema, use --output-format json with --json-schema and a JSON Schema definition. The response includes metadata about the request (session ID, usage, etc.) with the structured output in the structured_output field."
> "If the value isn't a valid JSON Schema, claude exits with Error: --json-schema is not a valid JSON Schema followed by the validator's diagnostic."
> "Claude Code accepts schemas that use the format keyword, such as "format": "email", but treats format as an annotation and doesn't enforce it."
> "If a run ends without valid structured output, for example because Claude declined the request, the response has no structured_output field. Before your script uses structured_output, check that the field is present."

cli-reference `--json-schema`: "Get validated JSON output matching a JSON Schema after the agent completes its workflow (print mode only)."

agent-sdk/structured-outputs: "the SDK validates the output against it, re-prompting on mismatch." / agent-loop: subtype `error_max_structured_output_retries`.

## GitHub Actions code review

github-actions:
> "--comment: Claude posts its review on the pull request, as an inline comment on each issue it finds or as one summary comment when it finds none. Without it, Claude posts nothing, and you read the findings in the workflow run log."
> "claude_args: keep this line even though the skill's own allowed-tools frontmatter names the same tool, because the Claude Code GitHub Action starts the MCP server that posts inline comments only when --allowedTools in claude_args names it."
> Workflow: `permissions: contents: read, pull-requests: read, issues: read, id-token: write`, `claude_args: '--allowedTools "mcp__github_inline_comment__create_inline_comment"'`
> "For a plain-text prompt, Claude has no shell or GitHub API access until you grant the tools the prompt needs, with --allowedTools in claude_args or a permissions.allow rule in the settings input."

## Review independiente

best-practices:
> "in the terminal, /code-review reviews the diff in a fresh subagent that never saw your conversation. It isn't swayed by the reasoning that produced the code."
> "Don't drop the skip style part of that prompt. A reviewer that's asked to find problems will always find something."

Exam guide (task 3.6, ver research/exam-guide.md): "Using --output-format json with --json-schema to produce machine-parseable structured findings".

## Lo que NO encontré

- No existe un flag `--read-only`. Solo lectura se arma con `--tools` / `--disallowedTools` / modo `plan` / reglas de permisos.
- La doc no dice que `--json-schema` funcione sin `-p` (dice "print mode only").
