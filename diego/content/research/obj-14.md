# Research — Objetivo 14: `context: fork` en skills y slash commands

Fecha: 2026-11-13. Páginas bajadas en markdown crudo (`<url>.md`) para copiar citas textuales.

## URLs leídas

- https://code.claude.com/docs/en/skills (página "Extend Claude with skills")
- https://code.claude.com/docs/en/slash-commands → sirve el MISMO contenido que /skills (byte a byte). Los custom commands se fusionaron con skills.
- https://code.claude.com/docs/en/sub-agents (secciones "What loads at startup", "Fork the current conversation", "Run subagents in foreground or background")

## Citas textuales

### Commands = skills
- "**Custom commands have been merged into skills.** A file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the same way."
- "A [command file](#where-skills-live) in `.claude/commands/` accepts the same fields except `name` and `paths`."

### Frontmatter
- Tabla: "`context` | No | Set to `fork` to run in a forked subagent context."
- "`agent` | No | Which subagent type to use when `context: fork` is set."
- "`background` | No | Only applies with `context: fork`. Set to `false` to wait for the forked subagent's result in the turn that invoked the skill, instead of running it in the background. Default: `true`."
- "`allowed-tools` | No | Tools Claude can use without asking permission during the turn that invokes this skill. The grant clears when you send your next message."
- "`model` ... With `context: fork`, the value sets the forked subagent's model instead"
- "A field name must match the table exactly, hyphens included: Claude Code ignores a field it doesn't recognize without reporting an error."
- "Claude Code reads the frontmatter only when the opening `---` is the file's first line. Otherwise it treats the whole file, `---` markers included, as skill content."

### Run skills in a subagent
- "Add `context: fork` to your frontmatter when you want a skill to run in isolation. Claude Code starts a new subagent of the type set in the `agent` field and gives it the skill content as its prompt. The subagent doesn't see your conversation history, so the skill's instructions have to stand on their own."
- "Despite the name, a skill with `context: fork` doesn't run in a fork of the current conversation, which would hand the subagent everything you've discussed so far. When the task depends on that history, fork the conversation instead of using `context: fork`."
- "The forked subagent runs in the background: you keep working while it runs, and its result arrives in your conversation when it completes. Set `background: false` in the frontmatter to instead wait for the result in the turn that invoked the skill."
- "If your skill's steps depend on a tool outside that set, set `background: false` to keep the full tool set."
- "A forked skill that runs in the background applies its edits outside your session's checkpoints. After one, `/rewind` restores only the files Claude had already edited in your conversation."
- WARNING: "`context: fork` only makes sense for skills with explicit instructions. If your skill contains guidelines like \"use these API conventions\" without a task, the subagent receives the guidelines but no actionable prompt, and returns without meaningful output."
- "The built-in Explore and Plan agents start without CLAUDE.md and git status to keep their context small. Put everything the task needs in your SKILL.md. A forked skill using `agent: Explore` starts with that content and the agent's own system prompt, and none of your CLAUDE.md files."
- "The `agent` field determines the execution environment (model, tools, and permissions)"
- "Options include built-in agents (`Explore`, `Plan`, `general-purpose`) or any custom subagent from `.claude/agents/`. If omitted, uses `general-purpose`."
- "**Reference content** adds knowledge Claude applies to your current work. ... This content runs inline so Claude can use it alongside your conversation context."

### Pre-approve tools (allowed-tools NO restringe)
- "It does not restrict which tools are available: every tool remains callable, and your permission settings still govern tools that are not listed."

### Sub-agents (contexto)
- "Each subagent starts with a fresh, isolated context window. It doesn't see your conversation history, the skills you've already invoked, or the files Claude has already read."
- Fork de conversación: "You can start a fork yourself with `/subtask` followed by a task, whether or not fork mode is on."
- "A fork is a subagent that inherits the entire conversation so far instead of starting fresh."

## Cosas que NO encontré en la doc (no usar)
- Qué pasa si `context:` tiene un valor distinto de `fork` (p. ej. `forked`). La doc solo dice "Set to `fork`". No lo usé en preguntas.
- No existe un campo `isolation` en skills (ese campo es de subagentes: `isolation: worktree`).
