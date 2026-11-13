# Investigación — Objetivo 11: Claude Code CLI en CI/CD (flags no interactivos, modos de permiso, límites de turnos y costo)

Investigado el 13/11/2026. Bajé cada página en su versión Markdown (`<url>.md`) con curl y leí el texto completo; las citas son textuales (saqué solo la sintaxis de links/backticks de Markdown).

## URLs leídas

| URL | Para qué |
|---|---|
| https://code.claude.com/docs/en/cli-reference | Tabla de flags: `-p`, `--output-format`, `--max-turns`, `--max-budget-usd`, `--permission-mode`, `--allowedTools`, `--disallowedTools`, `--tools`, `--bare`, `--json-schema` |
| https://code.claude.com/docs/en/headless | Modo no interactivo (`claude -p`), exit codes, salida JSON, `total_cost_usd`, permisos en `-p`, `dontAsk`, `--bare` |
| https://code.claude.com/docs/en/agent-sdk/agent-loop | Subtypes del resultado (`error_max_turns`, `error_max_budget_usd`), "budget headroom" |
| https://code.claude.com/docs/en/agent-sdk/typescript | Campos de `SDKResultMessage` (`is_error`, `num_turns`, `total_cost_usd`, `permission_denials`) |
| https://code.claude.com/docs/en/github-actions | `claude_args`, `--max-turns` en Actions, timeouts, migración desde beta |
| https://code.claude.com/docs/en/permission-modes | Tabla de modos, en qué modo arranca `-p`, `dontAsk`, `bypassPermissions` |
| https://code.claude.com/docs/en/best-practices | "Run Claude from a script", tabla determinístico vs no determinístico |
| https://code.claude.com/docs/en/costs | Spend limits (Console / Team-Enterprise) |

## ¿Existe un flag de presupuesto? SÍ: `--max-budget-usd`

cli-reference, fila `--max-budget-usd`:
> "Stop the run once estimated spend on API calls reaches this amount (print mode only). Claude Code checks the cap against its client-side cost estimate, which can differ from your bill. Spend from subagents counts toward the cap. Spend can pass the cap, so leave headroom."

Ejemplo de la doc: `claude -p --max-budget-usd 5.00 "query"`.

agent-loop, "Budget headroom":
> "Claude Code compares spend with the max_budget_usd / maxBudgetUsd cap after model responses arrive, because each response's cost comes from the token usage the API returns with it. The response that reaches the cap still completes and counts toward total_cost_usd."

## Turnos: `--max-turns`

cli-reference:
> "Limit the number of agentic turns (print mode only). No limit by default."

agent-loop:
> "When either limit is hit, the SDK returns a ResultMessage with a corresponding error subtype (error_max_turns or error_max_budget_usd)."
> "Count each turn with tool calls, plus one for the final text-only response. Without that extra turn, the run ends with a ResultMessage of subtype error_max_turns and no final response."
> "The result field holds the final text output and is only present on the success variant, so always check the subtype before reading it."
> "All result subtypes carry total_cost_usd, usage, num_turns, and session_id so you can track cost and resume even after errors."

best-practices:
> "When a run finishes, Claude replies OK or FAIL, and a run that hits the turn limit exits with an error instead."
> Tabla: "How much it spends | Effort level, Claude's own pace | --max-turns or --max-budget-usd with -p, a spend limit you've set"

## Modo no interactivo

headless:
> "Add the -p (or --print) flag to any claude command to run it non-interactively."
> "Claude Code exits with code 0 on success and a non-zero code when the run fails, so your scripts can branch on the exit status."

Exam guide (research/exam-guide.md): "Running Claude Code in CI with the -p flag to prevent interactive input hangs".

## Salida

cli-reference: `--output-format` "Specify output format for print mode (options: text, json, stream-json)".

headless:
> "text (default): plain text output" · "json: structured JSON with result, session ID, and metadata" · "stream-json: newline-delimited JSON for real-time streaming"
> "With --output-format json, the response payload includes total_cost_usd and a per-model cost breakdown, so scripted callers can track spend without consulting the usage dashboard."
> "Use --output-format stream-json with --verbose and --include-partial-messages to receive tokens as they're generated."
> "The last line of the stream is a result message with the final response text, cost, and session metadata."
> jq: `claude -p "Summarize this project" --output-format json | jq -r '.result'`

typescript (`SDKResultMessage`, variante success): campos `subtype`, `is_error`, `num_turns`, `result`, `total_cost_usd`, `permission_denials`, `session_id`.

## Permisos en `-p`

headless:
> "In a Manual mode claude -p run, a call that needs approval is denied unless something approves it, such as a PermissionRequest hook or a --permission-prompt-tool. With Claude Code v2.1.302 or later, claude -p runs start in Manual mode when nothing sets a permission mode."
> "dontAsk: Claude Code denies every call that would otherwise prompt, which is useful for locked-down CI runs"
> "acceptEdits: Claude writes files without prompting, and Claude Code auto-approves common filesystem commands such as mkdir, touch, mv, and cp."
> "With --output-format stream-json, denials appear as permission_denied system messages, and the final result message lists them in permission_denials."
> "The trailing * enables prefix matching, so Bash(git diff *) allows any command starting with git diff. The space before * is important: without it, Bash(git diff*) would also match git diff-index."

cli-reference `--permission-mode`:
> "Accepts default, acceptEdits, plan, auto, dontAsk, bypassPermissions, or manual as an alias for default."

permission-modes, tabla:
> "dontAsk | File reads inside your working directories and pre-approved tools; anything that would prompt is denied ... | Locked-down CI and scripts"
> "bypassPermissions | Everything | Isolated containers and VMs only"
> "Deny rules block in every mode, including bypassPermissions."
> dontAsk: "Use this mode for CI pipelines or restricted environments where you pre-define what Claude may do; the session never waits for input."

best-practices:
> "--allowedTools pre-approves its tools, and --permission-mode dontAsk refuses anything else that would have prompted."
> Ejemplo: `claude --bare -p "..." --allowedTools "Read,Edit,Bash(git add *),Bash(git commit *)" --permission-mode dontAsk --max-turns 20`
> "Try it on three files first, see what goes wrong, fix the prompt, then run the rest."

## `--bare` (reproducibilidad en CI)

cli-reference: "Minimal mode: skip auto-discovery of hooks, skills, custom commands, subagents, installed plugins, MCP servers, auto memory, and CLAUDE.md so scripted calls start faster."

headless:
> "Bare mode is useful for CI and scripts where you need the same result on every machine."
> "Without --bare, a -p session runs the hooks in a project's .claude/settings.json and connects the servers in its .mcp.json, even in a folder you've never trusted."
> "Set ANTHROPIC_API_KEY before running it, because bare mode doesn't use your subscription login"

## GitHub Actions

github-actions:
> "The claude_args parameter accepts any Claude Code CLI argument"
> Ejemplo: `claude_args: "--max-turns 5 --model claude-sonnet-5 --mcp-config /path/to/config.json"`
> "Set --max-turns in claude_args to limit iterations" · "Set workflow-level timeouts to avoid runaway jobs" · "Use GitHub's concurrency controls to limit parallel runs"
> Upgrade from beta: "Move CLI options such as max_turns and model into claude_args."
> "Never commit API keys or OAuth tokens directly to your repository. Always store them as GitHub Secrets"
> "Automation mode: when the workflow provides a prompt input, Claude runs without waiting for a mention"

## Lo que NO encontré en la doc (no usar)

- No hay flag `--max-cost`, `--budget` ni `--timeout` en cli-reference. El único tope de gasto por corrida es `--max-budget-usd`.
- No hay setting `maxTurns` en settings.json documentado para el CLI; el límite de turnos es el flag `--max-turns` (o `max_turns`/`maxTurns` en el Agent SDK).
- La doc no lista el exit code exacto para `error_max_turns`; solo dice "non-zero" / "exits with an error".
- Detalle de versiones: que `-p` arranque en Manual es "v2.1.302 or later". Las preguntas no dependen de la versión.
