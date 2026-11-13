# Investigación — Objetivo 08: plan mode vs ejecución directa vs workflow multi-fase

Investigado el 13/11/2026. Páginas bajadas en Markdown (`<url>.md`) y leídas completas. Citas textuales (sin sintaxis de links).

## URLs leídas

| URL | Para qué |
|---|---|
| https://code.claude.com/docs/en/permission-modes | Plan mode: qué bloquea, cómo se aprueba, `defaultMode: plan`, plan en `-p` |
| https://code.claude.com/docs/en/common-workflows | "Plan before editing" |
| https://code.claude.com/docs/en/costs | "Use plan mode for complex tasks" |
| https://code.claude.com/docs/en/best-practices | Spec primero + sesión nueva, review en subagente fresco, "who has the last word" |
| https://code.claude.com/docs/en/commands | `/batch` (plan → aprobación → unidades en worktrees) |
| https://code.claude.com/docs/en/code-review | Code Review nunca aprueba ni bloquea |

## Plan mode

permission-modes, tabla:
> "plan | Reads, plus classifier-approved commands when auto mode is available | Exploring a codebase before changing it"

permission-modes, "Analyze before you edit with plan mode":
> "Plan mode tells Claude to research and propose changes without making them. Claude reads files, runs shell commands to explore, and writes a plan, but does not edit your source. Except in interactive terminal sessions with bypass permissions available, edits stay blocked until you approve the plan."
> "Enter plan mode by pressing Shift+Tab or prefixing a single prompt with /plan. You can also start in plan mode from the CLI: claude --permission-mode plan"

Aprobación:
> "Yes, and use auto mode: approve and start in auto mode." · "Yes, manually approve edits: approve and review each edit individually." · "No, keep planning: stay in plan mode and tell Claude what to change."
> "Approving a plan exits plan mode and switches the session to the permission mode each approve option describes, so Claude starts editing."
> "Press Ctrl+G to open the proposed plan in your default text editor and edit it directly before Claude proceeds."

Default de proyecto:
> "To make plan mode the default for a project's terminal sessions, set defaultMode to plan in .claude/settings.json"

Plan en `-p`:
> "Plan mode keeps its blocks wherever Claude Code runs without an interactive terminal, including non-interactive runs with -p, Agent SDK sessions, and conversations in the VS Code extension's chat panel."

common-workflows:
> "For changes you want to review before they touch disk, switch to plan mode. Claude reads files and proposes a plan but makes no edits until you approve."

costs:
> "Use plan mode for complex tasks: Press Shift+Tab to cycle to plan mode before implementation. Claude explores the codebase and proposes an approach for your approval, preventing expensive re-work when the initial direction is wrong."

## Ejecución directa

permission-modes tabla: "acceptEdits | Reads, file edits, and common filesystem commands (mkdir, touch, mv, cp, etc.) | Iterating on code you're reviewing"; "dontAsk ... | Locked-down CI and scripts"; "bypassPermissions | Everything | Isolated containers and VMs only".

headless: `claude -p "Apply the lint fixes" --permission-mode acceptEdits`

## Multi-fase

best-practices ("Brainstorm with Claude first"):
> "Once SPEC.md exists, start a fresh session to build from it, so the build begins with a clean context and a written definition of done."

best-practices ("Give Claude a check to run"):
> "By someone who didn't write the code: in the terminal, /code-review reviews the diff in a fresh subagent that never saw your conversation. It isn't swayed by the reasoning that produced the code."

best-practices ("Review against your spec"): ejemplo de prompt: "use a subagent to review the rate limiter diff against SPEC.md ..."

best-practices (script): "Try it on three files first, see what goes wrong, fix the prompt, then run the rest."

commands, `/batch`:
> "Orchestrate large-scale changes across a codebase in parallel. Researches the codebase, decomposes the work into 5 to 30 independent units, and presents a plan. Once approved, spawns one background subagent per unit in an isolated worktree. Each subagent implements its unit, runs tests, and opens a PR or reports what happened."

## Aprobación humana

best-practices tabla determinístico: "Who has the last word | Claude's summary of what it did | Branch protection, a person who approves the merge"

code-review:
> "A review never approves or blocks the pull request, so the decision to merge stays with your team."

best-practices: "If something has to happen every time, make it a hook, a deny rule, or a managed setting. CLAUDE.md is for guidelines, and Claude is allowed to decide a guideline doesn't apply."

Exam guide task 3.4: "Determine when to use plan mode vs direct execution".

## Lo que NO encontré

- La doc actual no tiene una regla explícita del tipo "usá ejecución directa para cambios de una línea". Lo más cercano: costs ("Use plan mode for complex tasks") y common-workflows ("For changes you want to review before they touch disk"). Las preguntas de "tarea chica → directo" se apoyan en esas frases por contraste; el verificador debería mirarlas con cuidado.
- No hay un "plan approval" automático en `-p`: la doc solo dice que plan mantiene sus bloqueos sin terminal interactiva.
