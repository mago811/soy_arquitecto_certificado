# Research — Objetivo 9 (persistencia de estado en pipelines multiagente)

Fecha de lectura: 2026-11-13.

## URLs consultadas

- https://code.claude.com/docs/en/agent-sdk/sessions
- https://code.claude.com/docs/en/agent-sdk/subagents (sección Resume subagents)
- https://code.claude.com/docs/en/agent-sdk/file-checkpointing
- https://code.claude.com/docs/en/agent-sdk/python (opciones `resume`, `fork_session`, `max_turns`, `output_format`, `cwd`)
- https://code.claude.com/docs/en/sessions (Claude Code CLI: `--resume <name>`, `--fork-session`, qué restaura un resume)
- https://code.claude.com/docs/en/sub-agents (transcripts de subagentes)
- https://code.claude.com/docs/en/best-practices (`/rename` + `claude --resume <name>`)
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices (state management)
- https://www.anthropic.com/engineering/multi-agent-research-system
- Guía del examen (PDF; host no permitido por el validador)

## Guía del examen

- TS 5.4: "Structured state persistence for crash recovery: each agent exports state to a known location, and the coordinator loads a manifest on resume"
- TS 5.4: "Designing crash recovery using structured agent state exports (manifests) that the coordinator loads on resume and injects into agent prompts"
- TS 1.7: "fork_session for creating independent branches from a shared analysis baseline to explore divergent approaches"; "Why starting a new session with a structured summary is more reliable than resuming with stale tool results"

## Agent SDK — sessions

- "A session is the conversation history the SDK accumulates while your agent works. ... The SDK writes it to disk automatically so you can return to it later."
- "Sessions persist the **conversation**, not the filesystem. To snapshot and revert file changes the agent made, use file checkpointing."
- Tabla: "Pick up where you left off after a process restart | `continue_conversation=True` (Python) / `continue: true` (TypeScript). Resumes the most recent session in the directory, no ID needed." / "Resume a specific past session (not the most recent) | Capture the session ID and pass it to `resume`." / "Try an alternative approach without losing the original | Fork the session."
- "**Resume** takes a specific session ID. You track the ID. Required when you have multiple sessions (for example, one per user in a multi-user app) or want to return to one that isn't the most recent."
- "Read it from the `session_id` field on the result message ... which is present on every result regardless of success or error."
- "Recover from a limit. The first run ended with `error_max_turns` or `error_max_budget_usd` ...; resume with a higher limit."
- "Forking creates a new session that starts with a copy of the original's history but diverges from that point. The fork gets its own session ID; the original's ID and history stay unchanged."
- "Forking branches the conversation history, not the filesystem. If a forked agent edits files, those changes are real and visible to any session working in the same directory."
- "Session files are local to the machine that created them."
- "Attach a `sessionStore` / `session_store` adapter so the SDK mirrors transcripts to your own backend and another host can resume them."
- "Don't rely on session resume. Capture the results you need (analysis output, decisions, file diffs) as application state and pass them into a fresh session's prompt. This is often more robust than shipping transcript files around."
- Python: `resume=session_id, fork_session=True`; TypeScript: `resume`, `forkSession: true`.

## Agent SDK — subagents (resume)

- "A resumed subagent retains its full conversation history, including all previous tool calls, results, and reasoning."
- "Each `query()` call starts a new session by default, and you must resume the same session to access the subagent's transcript."
- "Subagent transcripts are stored in separate files and persist independently of the main conversation."
- `maxTurns`: "When the agent reaches the limit, Claude Code returns its output marked as partial, and you can resume the agent to continue."

## File checkpointing

- "File rewinding restores files on disk to a previous state. It does not rewind the conversation itself."
- "Subagent edits aren't tracked, while edits from a skill with `context: fork` running in the foreground are."
- Opción Python: `enable_file_checkpointing=True`; método `rewind_files()`.

## Claude Code — sessions

- `claude --resume <name>` "Resumes the named session directly"; nombre con `/rename`.
- "Interrupted tool calls: a tool that was still running when the previous process ended, for example in a crash, doesn't get rerun when you resume."
- "Background work: a background subagent, background Bash command, or workflow that ended with the previous process shows up in the resumed transcript as a note that it didn't finish."
- `--continue --fork-session` / `/branch`. "If you resume the same session in two terminals without forking, messages from both interleave into one transcript."

## Prompting best practices — state management

- "Use structured formats for state data: When tracking structured information (such as test results or task status), use JSON or other structured formats to make schema requirements explicit to Claude."
- "Use unstructured text for progress notes: Freeform progress notes work well for tracking general progress and context."
- "Use git for state tracking: Git provides a log of what’s been done and checkpoints that can be restored."
- "Claude’s latest models are extremely effective at discovering state from the local filesystem." / "Review progress.txt, tests.json, and the git logs."

## Post de ingeniería

- "When errors occur, we can't just restart from the beginning: restarts are expensive and frustrating for users. Instead, we built systems that can resume from where the agent was when the errors occurred."
- "We combine the adaptability of AI agents built on Claude with deterministic safeguards like retry logic and regular checkpoints."
- "The LeadResearcher begins by thinking through the approach and saving its plan to Memory to persist the context, since if the context window exceeds 200,000 tokens it will be truncated and it is important to retain the plan."
- "We implemented patterns where agents summarize completed work phases and store essential information in external memory before proceeding to new tasks."
- "Subagents call tools to store their work in external systems, then pass lightweight references back to the coordinator."

## Lo que NO encontré

- La doc no define un formato estándar de "manifest" ni un nombre de archivo: el manifiesto es un patrón (guía del examen), no una feature del SDK. En el lab lo armamos a mano (`state/manifest.json`).
- No existe un "checkpointing de conversación" automático aparte de las sesiones: file checkpointing solo cubre archivos.
