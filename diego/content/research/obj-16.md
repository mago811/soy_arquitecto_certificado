# Research — Objetivo 16 (mecanismos de configuración de Claude Code)

Fecha de lectura: 2026-11-13. Páginas leídas completas en su versión Markdown (`<url>.md`).

## URLs consultadas

- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/settings
- https://code.claude.com/docs/en/permissions
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/hooks-guide
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/features-overview
- https://code.claude.com/docs/en/commands

## CLAUDE.md (memory)

- "Both are loaded at the start of every conversation. Claude treats them as context, not enforced configuration. To block an action regardless of what Claude decides, use a PreToolUse hook instead." (memory)
- Tabla de ubicaciones (memory):
  - Managed policy: `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS), `/etc/claude-code/CLAUDE.md` (Linux/WSL), `C:\Program Files\ClaudeCode\CLAUDE.md` (Windows) — "Organization-wide instructions managed by IT/DevOps".
  - User: `~/.claude/CLAUDE.md` — "Personal preferences for all projects" — "Only you (all projects)".
  - Project: `./CLAUDE.md` or `./.claude/CLAUDE.md` — "Team-shared instructions for the project" — "Team members via source control".
  - Local: `./CLAUDE.local.md` — "Personal project-specific preferences; add to `.gitignore`" — "Only you (current project)".
- "For private per-project preferences that shouldn't be checked into version control, create a `CLAUDE.local.md` at the project root. It loads alongside `CLAUDE.md` and is treated the same way. Add `CLAUDE.local.md` to your `.gitignore` so it isn't committed." (memory)
- "Create this file and add instructions that apply to anyone working on the project: build and test commands, coding standards, architectural decisions, naming conventions, and common workflows." (memory)
- "All discovered files are concatenated into context rather than overriding each other." (memory)
- "Keep it to facts Claude should hold in every session: build commands, conventions, project layout, "always do X" rules. If an entry is a multi-step procedure or only matters for one part of the codebase, move it to a skill or a path-scoped rule instead." (memory)
- "target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence." (memory)
- "CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself. Claude reads it and tries to follow it, but there's no guarantee of strict compliance" (memory, troubleshooting)
- "If the instruction is something that must run at a specific point, such as before every commit or after each file edit, write it as a hook instead. Hooks execute as shell commands at fixed lifecycle events and apply regardless of what Claude decides to do." (memory)
- "Settings rules are enforced by the client regardless of what Claude decides to do. CLAUDE.md instructions shape Claude's behavior but are not a hard enforcement layer." (memory, sección managed)
- "Use the file for guidance, and enforce rules with managed settings such as `permissions.deny`." (memory)
- Verificar carga: "run `/context all` in a session and check the list under **Memory files**". "`/memory` command lists your CLAUDE.md, CLAUDE.local.md, and other memory file locations across user and project scopes."
- CLAUDE.md en subdirectorios: "Instead of loading them at launch, Claude Code loads each one once Claude reads, writes, or edits another file in that subdirectory."

## `.claude/rules/` (memory)

- "Rules without `paths` frontmatter are loaded at launch with the same priority as `.claude/CLAUDE.md`."
- "Rules can be scoped to specific files using YAML frontmatter with the `paths` field. These conditional rules only apply when Claude is working with files matching the specified patterns."
- "A path-scoped rule loads when Claude uses the Read, Write, or Edit tool on a matching file."
- "`paths` is the only field Claude Code reads from a rule; any other field is ignored without an error."
- "Personal rules in `~/.claude/rules/` apply to every project on your machine."
- Nota: "Rules load into context every session or when matching files are opened. For task-specific instructions that don't need to be in context all the time, use skills instead, which only load when you invoke them or when Claude determines they're relevant to your prompt."
- Ejemplo de patrón: `src/api/**/*.ts`; brace expansion `src/**/*.{ts,tsx}`.

## Skills (skills)

- "Create a skill when you keep pasting the same instructions, checklist, or multi-step procedure into chat, or when a section of CLAUDE.md has grown into a procedure rather than a fact. Unlike CLAUDE.md content, a skill's body loads only when it's used"
- Ubicaciones: Personal `~/.claude/skills/<skill-name>/SKILL.md` ("All your projects on this machine"); Project `.claude/skills/<skill-name>/SKILL.md` ("Commit it so your team gets it too"); Enterprise en el directorio de managed settings; Plugin.
- `disable-model-invocation: true`: "Claude can't invoke the skill on its own. Use this for workflows with side effects or that you want to control timing, like `/commit`, `/deploy`, or `/send-slack-message`."
- `user-invocable: false`: "Only Claude can invoke the skill."
- Tabla: default → "Description always in context, full skill loads when invoked"; `disable-model-invocation: true` → "Description not in context, full skill loads when invoked".
- `paths` también existe en frontmatter de skill: "When set, Claude loads the skill automatically only when working with files matching the patterns."
- "Claude Code watches skill directories for file changes ... If you create a top-level skills directory that didn't exist when the session started, run `/reload-skills`".
- `/skills`: "List available skills." (commands)

## Hooks (hooks-guide, hooks)

- "Hooks are user-defined shell commands. Claude Code runs them at specific points in its lifecycle, which gives you deterministic control: certain actions always happen rather than relying on the LLM to choose to run them." (hooks-guide)
- Ubicaciones (hooks-guide, Configure hook location): `~/.claude/settings.json` (todos tus proyectos), `.claude/settings.json` (proyecto, commiteable), `.claude/settings.local.json` (proyecto, no compartido), managed policy, plugin `hooks/hooks.json`, frontmatter de skill/subagente.
- Exit 2: "exit 2 = block the action"; "stderr becomes Claude's feedback". "if you exit 0 from a `PreToolUse` hook, the tool call still goes through the normal permission flow, because exit 0 doesn't approve it."
- Ejemplo oficial "Block edits to protected files": script `.claude/hooks/protect-files.sh`, `chmod +x`, registrado con `"PreToolUse"` + `"matcher": "Edit|Write"` y `"command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-files.sh"`.
- "The Bash examples on this page use `jq` for JSON parsing."
- "/hooks ... open a read-only browser for your configured hooks. The list labels each hook with where it comes from" (hooks)
- "Hooks merge: all registered hooks fire for their matching events regardless of source." (features-overview)

## Permissions / settings

- "Allow rules let Claude Code use the specified tool without manual approval. Ask rules prompt for confirmation ... Deny rules prevent Claude Code from using the specified tool."
- "Rules are evaluated in order: deny, then ask, then allow. The first match in that order determines the outcome, and rule specificity doesn't change the order."
- "Permission rules are enforced by Claude Code, not by the model. Instructions in your prompt or `CLAUDE.md` shape what Claude tries to do, but they don't change what Claude Code allows."
- "If a tool is denied at any level, no other level can allow it." / "if user settings allow a permission and project settings deny it, the deny rule blocks it."
- "For organizations that need centralized control, administrators deploy managed settings that user and project settings can't override"
- Precedencia de settings (settings): 1 Managed, 2 Command line (`--settings`), 3 Project local `.claude/settings.local.json`, 4 Shared project `.claude/settings.json`, 5 User `~/.claude/settings.json`.
- "When you set the same list key, such as `permissions.allow`, in more than one file, Claude Code combines the lists instead of picking one"
- "Commit `.claude/settings.json` so everyone who clones the repository gets the same permissions, hooks, and plugin settings. Each teammate can still override it for themselves in their own `.claude/settings.local.json`"
- settings.local.json: "The first time Claude Code writes the file in a git repository that doesn't already ignore it, it adds `**/.claude/settings.local.json` to your global git excludes file ... If you created the file by hand ... add it to `.gitignore` yourself."
- Read deny: "add a `Read` deny rule for its path, such as `Read(./.env)`". "A `Read` deny rule also blocks the Edit and Write tools on the same path". Límite: "They don't apply to ... arbitrary subprocesses that read or write files indirectly, like a Python or Node script ... For OS-level enforcement ... enable the sandbox."
- Workspace trust: "`permissions.allow` rules ... in a project's `.claude/settings.json` grant capability, so Claude Code applies them only after you accept the workspace trust dialog ... `deny` and `ask` rules aren't affected, since they only restrict."
- PreToolUse vs reglas: "PreToolUse hook decisions don't bypass permission rules. ... a matching deny rule blocks the call ... even when the hook returned "allow"" (permissions)
- "Claude Code watches your settings files and reloads them when they change, so it applies most edits to the running session without a restart, including edits to `permissions`, `hooks`" (settings)
- `/status` muestra `Setting sources`. `/permissions` "lists all permission rules and the `settings.json` file each rule comes from."

## Qué NO pude respaldar / cuidado

- La doc no dice que `/context all` liste las reglas con `paths` después de cargarlas; el lab verifica su efecto por comportamiento (y menciona el hook `InstructionsLoaded`, que la doc sugiere para depurar reglas path-specific, sin usarlo).
- Si una regla con `paths` se carga ANTES o DESPUÉS de un `Write` de un archivo nuevo no está explicitado; por eso el lab crea el archivo desde la shell y le pide a Claude que lo lea/edite.
