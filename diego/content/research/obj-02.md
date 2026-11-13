# Research — Objetivo 2 (retomar sesiones sin repetir trabajo)

Fecha de lectura: 2026-11-13. Páginas leídas completas en su versión Markdown (`<url>.md`) o como texto del HTML.

## URLs consultadas

- https://code.claude.com/docs/en/agent-sdk/sessions
- https://code.claude.com/docs/en/sessions
- https://code.claude.com/docs/en/cli-reference
- https://code.claude.com/docs/en/headless
- https://code.claude.com/docs/en/common-workflows
- https://code.claude.com/docs/en/commands
- https://code.claude.com/docs/en/best-practices
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- https://www.anthropic.com/engineering/multi-agent-research-system (redirige a /research/…)
- Guía del examen (PDF linkeado desde https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification), Task Statement 1.7

## Guía del examen (TS 1.7) — lo que piden

- "Named session resumption using --resume <session-name> to continue a specific prior conversation"
- "fork_session for creating independent branches from a shared analysis baseline to explore divergent approaches"
- "The importance of informing the agent about changes to previously analyzed files when resuming sessions after code modifications"
- "Why starting a new session with a structured summary is more reliable than resuming with stale tool results"
- "Choosing between session resumption (when prior context is mostly valid) and starting fresh with injected summaries (when prior tool results are stale)"
- "Informing a resumed session about specific file changes for targeted re-analysis rather than requiring full re-exploration"

## Agent SDK — sessions

- "A session is the conversation history the SDK accumulates while your agent works. It contains your prompt, every tool call the agent made, every tool result, and every response."
- "Returning to a session means the agent has full context from before: files it already read, analysis it already performed, decisions it already made."
- "Sessions persist the **conversation**, not the filesystem." (nota)
- Tabla: "Pick up where you left off after a process restart | `continue_conversation=True` (Python) / `continue: true` (TypeScript). Resumes the most recent session in the directory, no ID needed."
- "Resume a specific past session (not the most recent) | Capture the session ID and pass it to `resume`."
- "Try an alternative approach without losing the original | Fork the session."
- "Required when you have multiple sessions (for example, one per user in a multi-user app) or want to return to one that isn't the most recent."
- "Read it from the `session_id` field on the result message"
- "Follow up on a completed task. The agent already analyzed something; now you want it to act on that analysis without re-reading files."
- "Forking creates a new session that starts with a copy of the original's history but diverges from that point. The fork gets its own session ID; the original's ID and history stay unchanged."
- Python: `resume=session_id, fork_session=True`; TypeScript: `resume: sessionId, forkSession: true`.
- "Forking branches the conversation history, not the filesystem. If a forked agent edits files, those changes are real and visible to any session working in the same directory."
- "Session files are local to the machine that created them."
- "Capture the results you need (analysis output, decisions, file diffs) as application state and pass them into a fresh session's prompt. This is often more robust than shipping transcript files around."
- También: `sessionStore` / `session_store` adapter para resumir en otro host.

## Claude Code — Manage sessions

- Tabla: "`claude --continue` | Reopens the most recent session in the current directory"; "`claude --resume` | Opens the session picker"; "`claude --resume <name>` | Resumes the named session directly"; "`/resume` | Switches to a different session from inside an active session".
- "Interrupted tool calls: a tool that was still running when the previous process ended, for example in a crash, doesn't get rerun when you resume."
- "Not every configuration flag from the original launch is restored. If the session depended on `--mcp-config`, `--settings`, `--plugin-dir`, `--fallback-model`, or directories added with `--add-dir`, pass them again when you resume"
- Nombre: "At startup | `claude -n auth-refactor`"; "During a session | `/rename auth-refactor`".
- "Branching creates a copy of the conversation so far and switches you into it, leaving the original intact."
- "From the command line, combine `--continue` or `--resume` with `--fork-session`"
- "If you resume the same session in two terminals without forking, messages from both interleave into one transcript."
- "Claude Code leaves sessions created with `claude -p` or the Agent SDK out of the session picker and out of `claude --continue`. You can still resume one by passing its session ID to `claude --resume <session-id>`."

## CLI reference

- `--fork-session`: "When resuming, create a new session ID instead of reusing the original (use with `--resume` or `--continue`)"
- `--name`, `-n`: "Set a display name for the session, shown in `/resume` and the terminal title. You can resume a named session with `claude --resume <name>`."
- `--session-id`: "Use a specific session ID for the conversation (must be a valid UUID)"

## Headless

- `session_id=$(claude -p "Start a review" --output-format json | jq -r '.session_id')` y luego `claude -p "Continue that review" --resume "$session_id"`.

## Best practices (Claude Code)

- "`/clear` plus one new prompt that folds in what you learned works better almost every time."
- "`/rename oauth-migration` in the session names it, so that `claude --resume oauth-migration` from your shell picks it back up later, checkpoints included."

## Prompting best practices (platform)

- "Choose between starting fresh and compacting: When a context window is cleared, consider starting with a brand new context window rather than using compaction. Claude’s latest models are extremely effective at discovering state from the local filesystem."
- "Review progress.txt, tests.json, and the git logs."
- "Use git for state tracking: Git provides a log of what’s been done and checkpoints that can be restored."

## Multi-agent research system

- "When errors occur, we can't just restart from the beginning: restarts are expensive and frustrating for users. Instead, we built systems that can resume from where the agent was when the errors occurred."

## No respaldado textualmente

- Ninguna página de docs dice literal "los tool results quedan viejos (stale) después de un cambio de archivos". Se deriva de "Sessions persist the conversation, not the filesystem" + la guía del examen (TS 1.7), que sí lo dice. Las preguntas que dependen de esto citan la parte de docs y explican el razonamiento.
