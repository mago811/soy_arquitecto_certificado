# Research — Objetivo 30 (bajar falsos positivos con convenciones persistentes)

Fecha de lectura: 2026-11-13. Páginas leídas en su versión Markdown (`<url>.md`).

## URLs consultadas

- https://code.claude.com/docs/en/code-review
- https://code.claude.com/docs/en/code-review-customize
- https://code.claude.com/docs/en/code-review-local
- https://code.claude.com/docs/en/github-actions
- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/headless
- https://code.claude.com/docs/en/best-practices
- Guía del examen: task 4.1 "Design prompts with explicit criteria to improve precision and reduce false positives" y 3.6 (CLAUDE.md en CI)

## Code Review: qué flaggea por defecto

- "By default, Code Review focuses on correctness: bugs that would break production, not formatting preferences or missing test coverage. To change what it flags, add guidance files to your repository." (code-review)
- "Which instructions it follows: `REVIEW.md` from the base or default branch and never from the pull request's own changes." (code-review)

## CLAUDE.md vs REVIEW.md (code-review-customize)

- "This is how you cut nit volume, stop comments on generated files, or add a rule your team cares about." 
- "`CLAUDE.md`: project instructions that Claude Code reads for every task, reviews included. Code Review reads them as project context and flags changes that violate them."
- "`REVIEW.md`: instructions for reviews alone. Use it to say what your team wants flagged, at what severity, and what to skip."
- "A review reads the `CLAUDE.md` at your repository root and the `CLAUDE.md` files in the parent directories of each changed file."
- "The agents that find issues and the agents that verify them receive its contents as your repository's review instructions, alongside Code Review's default review guidance."
- "The `/code-review` command, which you run inside a Claude Code session on your own machine, reads your `CLAUDE.md` files and not `REVIEW.md`. Put guidance you want applied in both places in `CLAUDE.md`, and keep `REVIEW.md` for rules specific to pull request review."
- "Comments on generated files or on what CI already checks: list paths and finding categories where Claude should skip findings. Common candidates are generated code, lockfiles, and vendored dependencies, along with anything your CI already enforces like linting or spellcheck."
- "For paths that warrant some review but not full scrutiny, set a higher bar instead: "in `scripts/`, only report if near-certain and severe.""
- "Findings that turn out to be wrong: require evidence before a class of finding is posted. For example, "behavior claims need a `file:line` citation in the source, not an inference from naming" cuts false positives that would otherwise cost the author a round trip."
- "Too many nits: cap how many 🟡 Nit comments a single review posts."
- "Keep `REVIEW.md` to instructions that change review behavior, and leave general project context in `CLAUDE.md`."
- "Code Review reads `REVIEW.md` from the pull request's base branch or from the default branch, never from the pull request's own changes. To change review behavior, merge the `REVIEW.md` change first."
- Con default branch protegida honra: "Lowering a finding's severity", "Excluding paths, files, or classes of issue", "Capping nit comments".
- "Write exclusions and Nit caps in `REVIEW.md` or a file beside it, not in an included skill."
- Tabla: si el default branch no está protegido y el base branch no tiene protección → lee solo el "Root file". Si no puede confirmar la protección → "None".

## /code-review local

- "Instructions: the review follows your `CLAUDE.md`, including in a non-interactive `-p` run. It doesn't read `REVIEW.md`." (code-review-local)
- "At `low`, the review reports the findings it's most confident in, so you see fewer false positives. From `medium` through `max`, the review broadens coverage." (code-review-local)
- "To give every review project rules to follow, add them to your `CLAUDE.md`." (code-review-local)

## GitHub Actions

- "Create a `CLAUDE.md` file in your repository root to define code style guidelines, review criteria, project-specific rules, and preferred patterns. Claude follows these guidelines when creating PRs and responding to requests." (github-actions)
- "Keep your `CLAUDE.md` concise, since Claude reads it on every run" (github-actions)
- `claude_args` acepta cualquier argumento de CLI; `custom_instructions` migra a `--append-system-prompt` (github-actions).

## --bare se saltea CLAUDE.md

- "Add `--bare` to reduce startup time by skipping auto-discovery of hooks, skills, custom commands, subagents, installed plugins, MCP servers, auto memory, and CLAUDE.md." (headless)
- En bare mode se pasa contexto con flags como `--append-system-prompt` (headless, tabla "To load | Use"; best-practices).

## Escribir criterios concretos

- "Write instructions that are concrete enough to verify" (memory)
- "The more specific and concise your instructions, the more consistently Claude follows them." (memory)
- "A reviewer that's asked to find problems will always find something." + "Don't drop the `skip style` part of that prompt." (best-practices)
